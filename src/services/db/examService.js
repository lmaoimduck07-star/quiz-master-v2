/**
 * examService.js — CRUD chuẩn hóa cho Subjects, Exams, Questions
 */
import {
  collection, doc,
  getDocs, getDoc,
  setDoc, updateDoc, deleteDoc,
  query, where, writeBatch, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { sanitize, chunkArray, batchWrite, nowISO, dbError, serverTimestamp } from './baseService';
import { deleteMistakesBySubject, cleanupOrphanMistakes } from '../../utils/mistakeManager';

const SUBJECTS_COL = 'subjectsV2';
const EXAMS_COL = 'examsV2';

// ── Sinh mã môn học từ tên ────────────────────────────────────────────────────
export function generateSubjectCode(name) {
  const clean = (name || 'MON')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean);
  if (clean.length === 1) return clean[0].slice(0, 6).toUpperCase();
  return clean.map(w => w[0].toUpperCase()).join('').slice(0, 6);
}

// ── Sinh ExamID chuẩn: `[mã_môn]_bai_[01..99]` ──────────────────────────────
export async function generateExamId(subjectId, subjectCode) {
  const existingExams = await loadExams(subjectId);
  const usedNums = new Set(
    existingExams
      .map(e => {
        const m = e.id?.match(/_bai_(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(n => n !== null)
  );
  let num = 1;
  while (usedNums.has(num)) num++;
  const padded = String(num).padStart(2, '0');
  const codePrefix = (subjectCode || 'MON').toLowerCase();
  return `${codePrefix}_bai_${padded}`;
}

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
export async function loadSubjects() {
  try {
    const snap = await getDocs(collection(db, SUBJECTS_COL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    dbError('Exam', 'loadSubjects', e);
    return [];
  }
}

export async function getSubject(subjectId) {
  try {
    const snap = await getDoc(doc(db, SUBJECTS_COL, subjectId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    dbError('Exam', 'getSubject', e);
    return null;
  }
}

export async function saveSubject(subject) {
  try {
    const id = subject.id || doc(collection(db, SUBJECTS_COL)).id;
    const safe = sanitize({
      ...subject,
      id,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, SUBJECTS_COL, id), safe, { merge: true });
    return id;
  } catch (e) {
    dbError('Exam', 'saveSubject', e);
    return null;
  }
}

export async function deleteSubject(subjectId) {
  try {
    // 1. Cascade delete tất cả đề thi có subjectId này
    const exams = await loadExams(subjectId);
    for (const exam of exams) {
      await deleteExam(exam.id);
    }

    // Quét thêm toàn bộ đề thi để đảm bảo không bỏ sót đề nào có subjectId này
    const allExams = await loadAllExams();
    for (const e of allExams) {
      if (e.subjectId === subjectId) {
        await deleteExam(e.id);
      }
    }

    // 2. Xóa document môn học khỏi subjectsV2
    await deleteDoc(doc(db, SUBJECTS_COL, subjectId));

    // 3. Xóa toàn bộ câu hỏi sai thuộc môn này khỏi Sổ tay câu sai (localStorage) của tất cả user
    deleteMistakesBySubject(subjectId);

    // 4. Quét dọn triệt để mọi đề thi/câu hỏi mồ côi còn sót lại trong database
    await cleanupOrphanExamsAndQuestions();

    return true;
  } catch (e) {
    dbError('Exam', 'deleteSubject', e);
    return false;
  }
}

/**
 * Dọn dẹp triệt để Database:
 * Môn nào KHÔNG tồn tại trong hệ thống (SUBJECTS_COL), thì các câu hỏi và đề thi
 * thuộc môn đó phải bị xóa hoàn toàn ra khỏi database (EXAMS_COL & questions subcollection).
 * Đồng thời dọn sạch các câu sai thuộc môn đã xóa khỏi Sổ tay câu sai (localStorage).
 */
export async function cleanupOrphanExamsAndQuestions() {
  try {
    // 1. Lấy danh sách ID các môn học đang tồn tại thực tế
    const subSnap = await getDocs(collection(db, SUBJECTS_COL));
    const validSubjectIds = new Set(subSnap.docs.map(d => d.id));

    // 2. Lấy toàn bộ đề thi trong database
    const examSnap = await getDocs(collection(db, EXAMS_COL));
    let deletedExams = 0;
    let deletedQuestions = 0;

    for (const examDoc of examSnap.docs) {
      const examData = examDoc.data();
      const examSubjId = examData.subjectId;

      // Nếu đề thi không có subjectId hoặc subjectId không thuộc danh sách môn hợp lệ
      if (!examSubjId || !validSubjectIds.has(examSubjId)) {
        const examId = examDoc.id;

        // Xóa sạch subcollection questions của đề thi này
        try {
          const qSnap = await getDocs(collection(db, EXAMS_COL, examId, 'questions'));
          if (!qSnap.empty) {
            const deleteOps = qSnap.docs.map(qd => batch => batch.delete(qd.ref));
            await batchWrite(deleteOps);
            deletedQuestions += qSnap.size;
          }
        } catch (_) {}

        // Xóa document đề thi khỏi examsV2
        await deleteDoc(doc(db, EXAMS_COL, examId));
        deletedExams++;
      }
    }

    // 3. Dọn dẹp các câu sai trong Sổ tay câu sai (localStorage) của các môn đã xóa
    cleanupOrphanMistakes(Array.from(validSubjectIds));

    return {
      deletedExams,
      deletedQuestions,
      validSubjects: validSubjectIds.size,
    };
  } catch (e) {
    dbError('Exam', 'cleanupOrphanExamsAndQuestions', e);
    return null;
  }
}

export function subscribeSubjects(callback) {
  return onSnapshot(
    collection(db, SUBJECTS_COL),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => {
      dbError('Exam', 'subscribeSubjects', err);
      callback([]);
    }
  );
}

// ── EXAMS ─────────────────────────────────────────────────────────────────────
export async function loadExams(subjectId) {
  try {
    const q = query(collection(db, EXAMS_COL), where('subjectId', '==', subjectId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    dbError('Exam', 'loadExams', e);
    return [];
  }
}

export async function loadAllExams() {
  try {
    const snap = await getDocs(collection(db, EXAMS_COL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    dbError('Exam', 'loadAllExams', e);
    return [];
  }
}

export async function getExam(examId) {
  try {
    const snap = await getDoc(doc(db, EXAMS_COL, examId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    dbError('Exam', 'getExam', e);
    return null;
  }
}

export async function saveExam(exam) {
  try {
    const id = exam.id;
    if (!id) throw new Error('Exam ID is required');
    const safe = sanitize({
      ...exam,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, EXAMS_COL, id), safe, { merge: true });
    return id;
  } catch (e) {
    dbError('Exam', 'saveExam', e);
    return null;
  }
}

export async function deleteExam(examId) {
  try {
    // Xóa questions subcollection
    const qSnap = await getDocs(collection(db, EXAMS_COL, examId, 'questions'));
    const deleteOps = qSnap.docs.map(d => batch => batch.delete(d.ref));
    deleteOps.push(batch => batch.delete(doc(db, EXAMS_COL, examId)));
    await batchWrite(deleteOps);
    return true;
  } catch (e) {
    dbError('Exam', 'deleteExam', e);
    return false;
  }
}

export function subscribeExams(subjectId, callback) {
  let q;
  if (subjectId) {
    q = query(collection(db, EXAMS_COL), where('subjectId', '==', subjectId));
  } else {
    q = collection(db, EXAMS_COL);
  }
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => {
      dbError('Exam', 'subscribeExams', err);
      callback([]);
    }
  );
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────
export async function loadQuestions(examId) {
  try {
    const snap = await getDocs(collection(db, EXAMS_COL, examId, 'questions'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    dbError('Exam', 'loadQuestions', e);
    return [];
  }
}

export async function saveQuestion(examId, question) {
  try {
    const id = question.id || doc(collection(db, EXAMS_COL, examId, 'questions')).id;
    const safe = sanitize({ ...question, id });
    await setDoc(doc(db, EXAMS_COL, examId, 'questions', id), safe, { merge: true });
    return id;
  } catch (e) {
    dbError('Exam', 'saveQuestion', e);
    return null;
  }
}

export async function saveBulkQuestions(examId, questions) {
  try {
    // 1. Xóa questions cũ
    const oldSnap = await getDocs(collection(db, EXAMS_COL, examId, 'questions'));
    const deleteOps = oldSnap.docs.map(d => batch => batch.delete(d.ref));
    await batchWrite(deleteOps);

    // 2. Ghi questions mới
    const addOps = questions.map((q, idx) => {
      const qId = q.id ? String(q.id) : `q_${String(idx + 1).padStart(3, '0')}`;
      const safe = sanitize({ ...q, id: qId });
      return batch => batch.set(doc(db, EXAMS_COL, examId, 'questions', qId), safe);
    });
    await batchWrite(addOps);

    // 3. Cập nhật questionCount trong Exam
    await updateDoc(doc(db, EXAMS_COL, examId), {
      questionCount: questions.length,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    dbError('Exam', 'saveBulkQuestions', e);
    return false;
  }
}

export const saveQuestions = saveBulkQuestions;


export async function deleteQuestion(examId, questionId) {
  try {
    await deleteDoc(doc(db, EXAMS_COL, examId, 'questions', questionId));
    // Giảm questionCount
    const examDoc = await getExam(examId);
    if (examDoc && examDoc.questionCount > 0) {
      await updateDoc(doc(db, EXAMS_COL, examId), {
        questionCount: examDoc.questionCount - 1
      });
    }
    return true;
  } catch (e) {
    dbError('Exam', 'deleteQuestion', e);
    return false;
  }
}

// ── Chuẩn hóa toàn bộ ExamID trong Firestore ──────────────────────────────────
export async function normalizeAllExamIds() {
  try {
    const subSnap = await getDocs(collection(db, SUBJECTS_COL));
    const subjectCodeMap = new Map();

    for (const d of subSnap.docs) {
      const data = d.data();
      let code = data.code;
      if (!code?.trim()) {
        code = generateSubjectCode(data.name);
        await setDoc(doc(db, SUBJECTS_COL, d.id), { code }, { merge: true });
      }
      subjectCodeMap.set(d.id, code.toLowerCase());
    }

    const examSnap = await getDocs(collection(db, EXAMS_COL));
    let fixed = 0;
    let ghostDeleted = 0;
    const counterMap = new Map();

    const standardExams = [];
    const randomExams = [];
    for (const d of examSnap.docs) {
      if (/^[a-z0-9]+_bai_\d{2,3}$/.test(d.id)) standardExams.push(d);
      else randomExams.push(d);
    }

    for (const d of standardExams) {
      const data = d.data();
      const m = d.id.match(/_bai_(\d+)$/);
      if (m) {
        const subjId = data.subjectId;
        const num = parseInt(m[1], 10);
        const current = counterMap.get(subjId) || new Set();
        current.add(num);
        counterMap.set(subjId, current);
      }
    }

    for (const d of randomExams) {
      const data = d.data();
      const subjId = data.subjectId;

      if (!subjId || !data.title) {
        try {
          const ghostQSnap = await getDocs(collection(db, EXAMS_COL, d.id, 'questions'));
          if (!ghostQSnap.empty) {
            const ghostBatch = writeBatch(db);
            ghostQSnap.docs.forEach(qDoc => ghostBatch.delete(qDoc.ref));
            await ghostBatch.commit();
          }
          await deleteDoc(doc(db, EXAMS_COL, d.id));
          ghostDeleted++;
        } catch (_) {}
        continue;
      }

      const subjCode = subjectCodeMap.get(subjId) || 'mon';
      const used = counterMap.get(subjId) || new Set();
      let num = 1;
      while (used.has(num)) num++;
      used.add(num);
      counterMap.set(subjId, used);

      const newId = `${subjCode}_bai_${String(num).padStart(2, '0')}`;
      const newCode = `${subjCode.toUpperCase()}_BAI_${String(num).padStart(2, '0')}`;

      const oldQSnap = await getDocs(collection(db, EXAMS_COL, d.id, 'questions'));

      await setDoc(doc(db, EXAMS_COL, newId), sanitize({
        ...data,
        id: newId,
        code: data.code || newCode,
        subjectCode: subjCode.toUpperCase(),
        normalizedAt: nowISO(),
      }));

      if (!oldQSnap.empty) {
        const copyBatch = writeBatch(db);
        const delBatch = writeBatch(db);
        oldQSnap.docs.forEach(qDoc => {
          copyBatch.set(doc(db, EXAMS_COL, newId, 'questions', qDoc.id), qDoc.data());
          delBatch.delete(qDoc.ref);
        });
        await copyBatch.commit();
        await delBatch.commit();
      }

      await deleteDoc(doc(db, EXAMS_COL, d.id));
      fixed++;
    }

    return { fixed, ghostDeleted, total: examSnap.size };
  } catch (e) {
    dbError('Exam', 'normalizeAllExamIds', e);
    return null;
  }
}

