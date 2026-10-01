/**
 * sessionService.js — Quản lý phiên thi Realtime (active_sessionsV2)
 *
 * Changelog (rewrite):
 *  - createSession(): dedup — trả về sessionId cũ nếu đã có session active cho uid+examId.
 *  - heartbeat(): retry 1 lần sau 1s nếu updateDoc thất bại.
 *  - recordViolation(): dùng increment(1) thay vì ghi đè warningCount.
 *  - subscribeAllSessions(): thêm tham số activeOnly (mặc định true) — query 'active' only.
 *  - submitSession() + abandonSession(): dùng helper nội bộ _writeExamResult() chung.
 *  - cleanStaleSessions(): tách 2 query riêng — active sessions stale + ended sessions cũ — thay vì full scan.
 *  - deleteSession(): explicit batch ops (không còn dùng wrapper arrow function).
 *  - saveAnswer(): offline queue — nếu Firestore write thất bại, lưu vào localStorage và flush sau.
 */
import {
  collection, doc,
  getDocs, getDoc,
  setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, arrayUnion, addDoc,
  increment, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { sanitize, batchWrite, dbError, serverTimestamp } from './baseService';

const SESSIONS_COL = 'active_sessionsV2';
const RESULTS_COL = 'examResults';

// ─── Offline answer queue (flush khi có kết nối lại) ────────────────────────
const OFFLINE_QUEUE_KEY = 'qm_answer_offline_queue';

function _enqueueOffline(sessionId, questionId, value) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    // Ghi đè nếu cùng sessionId + questionId đã có trong queue
    const existingIdx = queue.findIndex(
      (e) => e.sessionId === sessionId && e.questionId === questionId,
    );
    const entry = { sessionId, questionId, value, ts: Date.now() };
    if (existingIdx >= 0) {
      queue[existingIdx] = entry;
    } else {
      queue.push(entry);
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

async function _flushOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue.length) return;

    const remaining = [];
    for (const entry of queue) {
      try {
        const answerRef = doc(
          db,
          SESSIONS_COL,
          entry.sessionId,
          'answers',
          String(entry.questionId),
        );
        await setDoc(
          answerRef,
          {
            questionId: String(entry.questionId),
            value: entry.value === undefined ? null : entry.value,
            answeredAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (_) {
        remaining.push(entry);
      }
    }

    if (remaining.length) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  } catch (_) {}
}

// Tự flush mỗi lần tab online lại
if (typeof window !== 'undefined') {
  window.addEventListener('online', _flushOfflineQueue, { passive: true });
}

// ─── Private helper: ghi kết quả vào examResults ────────────────────────────
async function _writeExamResult(resultData) {
  const safeResult = sanitize({
    ...resultData,
    submittedAt: serverTimestamp(),
  });
  const resultRef = await addDoc(collection(db, RESULTS_COL), safeResult);
  return resultRef.id;
}

// ─── Private helper: retry một lần sau delay ms ──────────────────────────────
async function _withRetry(fn, delay = 1000) {
  try {
    return await fn();
  } catch (firstErr) {
    await new Promise((r) => setTimeout(r, delay));
    return await fn(); // ném lỗi ra ngoài nếu lần 2 vẫn thất bại
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tạo phiên thi mới.
 * Dedup: nếu đã có session 'active' cho uid + examId với heartbeat gần đây (< 5 phút), trả về sessionId cũ.
 * Nếu session đó đã stale (> 5 phút không heartbeat), xóa nó và tạo mới.
 * Dùng single-field query (uid only) + in-memory filter để tránh yêu cầu Firestore composite index.
 */
export async function createSession({
  uid,
  studentName,
  examId,
  examTitle,
  subjectId,
  subjectName,
  mode = 'practice',
  totalQuestions = 0,
  duration = 0,
}) {
  try {
    // ── Kiểm tra dedup: single-field query (không cần composite index) ───────
    if (uid && examId) {
      try {
        const FRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 phút
        const dupQ = query(
          collection(db, SESSIONS_COL),
          where('uid', '==', uid),
          limit(20), // giới hạn để tránh đọc quá nhiều docs
        );
        const dupSnap = await getDocs(dupQ);
        const now = Date.now();

        for (const d of dupSnap.docs) {
          const data = d.data();
          if (data.examId !== examId || data.status !== 'active') continue;

          const lastHb =
            data.lastHeartbeatAt?.toDate?.()?.getTime() ||
            data.startedAt?.toDate?.()?.getTime() ||
            0;
          const age = now - lastHb;

          if (age <= FRESH_THRESHOLD_MS) {
            // Session đang thực sự hoạt động → trả về sessionId cũ
            return d.id;
          } else {
            // Session stale → xóa và tiếp tục tạo mới
            await deleteSession(d.id);
          }
        }
      } catch (dedupErr) {
        // Dedup thất bại không chặn việc tạo session mới
        dbError('Session', 'createSession/dedup', dedupErr);
      }
    }

    const sessionRef = doc(collection(db, SESSIONS_COL));
    const sessionId = sessionRef.id;

    const sessionData = sanitize({
      id: sessionId,
      uid,
      studentName: studentName || 'Học sinh',
      examId,
      examTitle: examTitle || 'Bài thi',
      subjectId: subjectId || '',
      subjectName: subjectName || '',
      mode, // 'practice' | 'simulation'
      status: 'active', // 'active' | 'submitted' | 'terminated' | 'abandoned'
      currentQuestion: 1,
      totalQuestions,
      answeredCount: 0,
      answeredGrid: {},
      violations: [],
      warningCount: 0,
      duration,
      timeLeft: duration,
      adminMessage: null,
      adminMessageTime: null,
      startedAt: serverTimestamp(),
      lastHeartbeatAt: serverTimestamp(),
    });

    await setDoc(sessionRef, sessionData);
    return sessionId;
  } catch (e) {
    dbError('Session', 'createSession', e);
    return null;
  }
}

/**
 * Lắng nghe phiên thi của chính mình hoặc giám sát 1 phiên cụ thể (Student / Spectator).
 */
export function subscribeMySession(sessionId, callback) {
  if (!sessionId) return () => {};
  return onSnapshot(
    doc(db, SESSIONS_COL, sessionId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (err) => {
      dbError('Session', 'subscribeMySession', err);
      callback(null);
    },
  );
}

export const subscribeSingleSession = subscribeMySession;

/**
 * Lắng nghe phiên thi (Admin / Lecturer Spectator).
 * @param {function} callback  - Hàm nhận danh sách sessions.
 * @param {boolean}  activeOnly - false (mặc định): lấy toàn bộ sessions (backward compat với LiveMonitor).
 *                                true: chỉ lấy sessions đang 'active' (dùng khi cần filter nhẹ hơn).
 */
export function subscribeAllSessions(callback, activeOnly = false) {
  const ref = activeOnly
    ? query(collection(db, SESSIONS_COL), where('status', '==', 'active'))
    : collection(db, SESSIONS_COL);

  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    },
    (err) => {
      dbError('Session', 'subscribeAllSessions', err);
      callback([]);
    },
  );
}

/**
 * Heartbeat định kỳ (mỗi 10s).
 * Cập nhật timeLeft, currentQuestion, answeredCount, answeredGrid.
 * Tự động retry 1 lần sau 1s nếu thất bại lần đầu.
 */
export async function heartbeat(sessionId, { timeLeft, currentQuestion, answeredCount, answeredGrid }) {
  if (!sessionId) return;

  const updatePayload = {
    lastHeartbeatAt: serverTimestamp(),
  };
  if (timeLeft !== undefined) updatePayload.timeLeft = timeLeft;
  if (currentQuestion !== undefined) updatePayload.currentQuestion = currentQuestion;
  if (answeredCount !== undefined) updatePayload.answeredCount = answeredCount;
  if (answeredGrid !== undefined) updatePayload.answeredGrid = answeredGrid;

  try {
    await _withRetry(() => updateDoc(doc(db, SESSIONS_COL, sessionId), updatePayload));
  } catch (e) {
    // Không log nếu session đã bị xóa / kết thúc
    if (!e.message?.includes('not-found')) {
      dbError('Session', 'heartbeat', e);
    }
  }
}

/**
 * Lưu câu trả lời vào subcollection `answers`.
 * Nếu Firestore write thất bại (offline / network drop), tự động đưa vào offline queue và
 * flush lại khi trình duyệt online lại.
 */
export async function saveAnswer(sessionId, questionId, value) {
  if (!sessionId || !questionId) return;

  // Flush offline queue (nếu có entries còn tồn đọng)
  _flushOfflineQueue();

  try {
    const answerRef = doc(db, SESSIONS_COL, sessionId, 'answers', String(questionId));
    await setDoc(
      answerRef,
      {
        questionId: String(questionId),
        value: value === undefined ? null : value,
        answeredAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    // Lưu offline queue thay vì mất câu trả lời
    _enqueueOffline(sessionId, questionId, value);
    dbError('Session', 'saveAnswer (queued offline)', e);
  }
}

/**
 * Ghi nhận vi phạm chống gian lận.
 * Dùng increment(1) để tích lũy warningCount thay vì ghi đè.
 */
export async function recordViolation(sessionId, { type, count }) {
  if (!sessionId) return;
  try {
    const violationEntry = {
      type: type || 'unknown',
      count: count || 1,
      timestamp: new Date().toISOString(),
    };
    await updateDoc(doc(db, SESSIONS_COL, sessionId), {
      violations: arrayUnion(violationEntry),
      warningCount: increment(1),      // ← tích lũy, không ghi đè
      lastHeartbeatAt: serverTimestamp(),
    });
  } catch (e) {
    dbError('Session', 'recordViolation', e);
  }
}

/**
 * Nộp bài thi: Lưu vào `examResults`, cập nhật trạng thái session.
 * Dùng _writeExamResult() chung với abandonSession().
 */
export async function submitSession(sessionId, resultData) {
  try {
    // 1. Lưu kết quả thi vào examResults
    const resultId = await _writeExamResult(resultData);

    // 2. Cập nhật session sang submitted
    if (sessionId) {
      try {
        await updateDoc(doc(db, SESSIONS_COL, sessionId), {
          status: 'submitted',
          finalScore: resultData.score,
          finalCorrect: resultData.correctCount,
          finalTotal: resultData.totalQuestions,
          submitReason: resultData.submitReason || 'Chủ động nộp',
          submittedAt: serverTimestamp(),
        });
      } catch (_) {}
    }

    return resultId;
  } catch (e) {
    dbError('Session', 'submitSession', e);
    return null;
  }
}

/**
 * Khóa phiên thi từ xa (Admin action).
 */
export async function terminateSession(sessionId) {
  if (!sessionId) return false;
  try {
    await updateDoc(doc(db, SESSIONS_COL, sessionId), {
      status: 'terminated',
      terminatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    dbError('Session', 'terminateSession', e);
    return false;
  }
}

/**
 * Đánh dấu phiên thi là bỏ thi (do thoát ra hoặc reload trang khi chưa nộp).
 * Ghi nhận kết quả 0 điểm vào examResults dùng _writeExamResult() chung.
 *
 * @param {string} sessionId - ID phiên thi trên Firestore (có thể null).
 * @param {string} reason    - Lý do bỏ thi.
 * @param {object} extraData - Thông tin bổ sung để ghi examResults (uid, examId, ...).
 */
export async function abandonSession(
  sessionId,
  reason = 'Thí sinh tải lại trang hoặc thoát khỏi phòng thi (Bỏ thi)',
  extraData = {},
) {
  try {
    // 1. Cập nhật trạng thái session (nếu có)
    if (sessionId) {
      try {
        await updateDoc(doc(db, SESSIONS_COL, sessionId), {
          status: 'abandoned',
          finalScore: 0.0,
          finalCorrect: 0,
          finalTotal: extraData.totalQuestions || 0,
          submitReason: reason,
          abandonedAt: serverTimestamp(),
        });
      } catch (_) {}
    }

    // 2. Ghi nhận vào examResults nếu có đủ thông tin
    if (extraData && (extraData.uid || extraData.examId)) {
      try {
        await _writeExamResult({
          uid: extraData.uid || 'guest',
          studentName: extraData.studentName || 'Học sinh',
          examId: extraData.examId || 'exam',
          examTitle: extraData.examTitle || 'Bài thi',
          subjectId: extraData.subjectId || '',
          subjectName: extraData.subjectName || '',
          mode: extraData.mode || 'practice',
          score: 0.0,
          correctCount: 0,
          totalQuestions: extraData.totalQuestions || 0,
          submitReason: reason,
          isAbandoned: true,
          status: 'abandoned',
          answers: {},
          questionDetails: [],
          timeTaken: 0,
        });
      } catch (_) {}
    }

    return true;
  } catch (e) {
    dbError('Session', 'abandonSession', e);
    return false;
  }
}

/**
 * Gửi tin nhắn cảnh báo từ Admin tới màn hình thí sinh.
 */
export async function sendAdminMessage(sessionId, message) {
  if (!sessionId || !message) return false;
  try {
    await updateDoc(doc(db, SESSIONS_COL, sessionId), {
      adminMessage: message,
      adminMessageTime: new Date().toISOString(),
    });
    return true;
  } catch (e) {
    dbError('Session', 'sendAdminMessage', e);
    return false;
  }
}

/**
 * Xóa hoàn toàn một phiên thi (bao gồm subcollection answers).
 * Sử dụng explicit batch ops thay vì wrapper arrow functions.
 */
export async function deleteSession(sessionId) {
  if (!sessionId) return false;
  try {
    const answersSnap = await getDocs(collection(db, SESSIONS_COL, sessionId, 'answers'));

    // Gom tất cả refs cần xóa (answers + bản thân session doc)
    const allRefs = [
      ...answersSnap.docs.map((d) => d.ref),
      doc(db, SESSIONS_COL, sessionId),
    ];

    // Chia thành batch ops rõ ràng
    const deleteOps = allRefs.map((ref) => (batch) => batch.delete(ref));
    await batchWrite(deleteOps);
    return true;
  } catch (e) {
    dbError('Session', 'deleteSession', e);
    return false;
  }
}

/**
 * Lắng nghe kết quả thi (Exam Results).
 */
export function subscribeExamResults(userId, callback) {
  const ref = userId
    ? query(collection(db, RESULTS_COL), where('uid', '==', userId))
    : collection(db, RESULTS_COL);

  return onSnapshot(
    ref,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      dbError('Session', 'subscribeExamResults', err);
      callback([]);
    },
  );
}

/**
 * Xóa một kết quả thi khỏi examResults.
 */
export async function deleteExamResult(resultId) {
  if (!resultId) return false;
  try {
    await deleteDoc(doc(db, RESULTS_COL, resultId));
    return true;
  } catch (e) {
    dbError('Session', 'deleteExamResult', e);
    return false;
  }
}

/**
 * Cập nhật điểm số hoặc thông tin kết quả thi.
 */
export async function updateExamResult(resultId, updateData) {
  if (!resultId) return false;
  try {
    const safeData = sanitize({
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, RESULTS_COL, resultId), safeData);
    return true;
  } catch (e) {
    dbError('Session', 'updateExamResult', e);
    return false;
  }
}

/**
 * Lấy chi tiết 1 kết quả thi.
 */
export async function getExamResult(resultId) {
  if (!resultId) return null;
  try {
    const snap = await getDoc(doc(db, RESULTS_COL, resultId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (e) {
    dbError('Session', 'getExamResult', e);
    return null;
  }
}

/**
 * Dọn dẹp sessions stale — tách làm 2 query riêng biệt thay vì full collection scan:
 *
 *  1. Active sessions không có heartbeat > 45 phút → deleteSession().
 *  2. Ended sessions (submitted / terminated / abandoned) đã kết thúc > 24h → deleteSession().
 *
 * Cả hai query đều có giới hạn 200 docs mỗi lần chạy để tránh timeout.
 */
export async function cleanStaleSessions() {
  const now = Date.now();
  const STALE_MS = 45 * 60 * 1000;      // 45 phút
  const ENDED_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
  const BATCH_LIMIT = 200;

  try {
    // ── 1. Active sessions không heartbeat (stale) ────────────────────────
    const activeSnap = await getDocs(
      query(
        collection(db, SESSIONS_COL),
        where('status', '==', 'active'),
        limit(BATCH_LIMIT),
      ),
    );

    for (const docSnap of activeSnap.docs) {
      const data = docSnap.data();
      const lastHb =
        data.lastHeartbeatAt?.toDate?.()?.getTime() ||
        data.startedAt?.toDate?.()?.getTime() ||
        0;

      if (now - lastHb > STALE_MS) {
        await deleteSession(docSnap.id);
      }
    }

    // ── 2. Ended sessions cũ (submitted / terminated / abandoned > 24h) ───
    const endedStatuses = ['submitted', 'terminated', 'abandoned'];

    for (const status of endedStatuses) {
      const endedSnap = await getDocs(
        query(
          collection(db, SESSIONS_COL),
          where('status', '==', status),
          limit(BATCH_LIMIT),
        ),
      );

      for (const docSnap of endedSnap.docs) {
        const data = docSnap.data();
        // Lấy timestamp kết thúc (bất kỳ field nào đã được set)
        const endedAt =
          data.submittedAt?.toDate?.()?.getTime() ||
          data.terminatedAt?.toDate?.()?.getTime() ||
          data.abandonedAt?.toDate?.()?.getTime() ||
          data.lastHeartbeatAt?.toDate?.()?.getTime() ||
          0;

        if (now - endedAt > ENDED_TTL_MS) {
          await deleteSession(docSnap.id);
        }
      }
    }
  } catch (e) {
    dbError('Session', 'cleanStaleSessions', e);
  }
}
