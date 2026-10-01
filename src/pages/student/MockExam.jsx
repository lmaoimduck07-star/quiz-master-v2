import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Clock, ShieldAlert, AlertTriangle, ArrowLeft, ArrowRight,
  CheckCircle2, Play, Lock, Send, Sparkles, MessageSquare,
  XCircle, AlertOctagon, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { ExamHeader } from '@/components/student/pc/exam/ExamHeader';
import { QuestionCard } from '@/components/student/pc/exam/QuestionCard';
import { QuestionPalette } from '@/components/student/pc/exam/QuestionPalette';
import { ViolationModal } from '@/components/student/pc/exam/ViolationModal';
import { useAuth } from '@/context/AuthContext';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useSessionSync } from '@/hooks/useSessionSync';
import { useAnswerSync } from '@/hooks/useAnswerSync';
import { loadQuestions, getExam } from '@/services/db/examService';
import {
  createSession,
  heartbeat,
  recordViolation,
  submitSession,
  abandonSession
} from '@/services/db/sessionService';
import { saveMistakes } from '@/utils/mistakeManager';
import { formatDateTime } from '@/utils/helpers';

export default function MockExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { urlSessionId } = useParams(); // sessionId nhúng trong URL sau khi bắt đầu làm bài
  const { currentUser } = useAuth();

  const examData = location.state || {};
  const {
    examId,
    title = 'Bài thi trắc nghiệm',
    timeLimit = 15 * 60, // in seconds
    mode = 'practice',
    subjectName = '',
    subjectId = '',
  } = examData;

  const currentExamId = examId || examData?.id || '';
  const uid = currentUser?.uid || currentUser?.id || 'guest';
  // sessionStorage key: tồn tại trong tab, mất khi đóng tab / đóng trình duyệt
  const ssKey = urlSessionId ? `qm_started_${urlSessionId}` : null;

  const [questions, setQuestions] = useState(() => examData.questions || []);
  const [loadingQuestions, setLoadingQuestions] = useState(!examData.questions?.length);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [activeViolation, setActiveViolation] = useState(null);
  const [adminMessageModal, setAdminMessageModal] = useState(null);
  const [isTerminatedModal, setIsTerminatedModal] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  // Trạng thái bị khóa / bỏ thi do Reload hoặc thoát ra trái phép
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [abandonedData, setAbandonedData] = useState(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const isSubmittingRef = useRef(false);

  /**
   * 0. URL-based Session Reload Guard
   *
   * Logic:
   *  - Nếu URL có :urlSessionId → sinh viên đang hoặc đã từng ở trong phiên thi này.
   *  - sessionStorage.getItem(ssKey) được set khi sinh viên bấm "Bắt đầu làm bài".
   *  - Nếu F5 / back rồi vào lại URL → ssKey vẫn tồn tại trong sessionStorage (cùng tab)
   *    → detect reload → abandon session → hiển thị màn hình bị khóa.
   *  - Mỗi lần vào luyện tập MỚI từ dashboard → URL là /client/exam (không có urlSessionId)
   *    → không trigger guard → sinh viên thấy màn hình pre-start bình thường.
   */
  useEffect(() => {
    if (!urlSessionId || !uid) return;

    const wasStarted = sessionStorage.getItem(ssKey);
    if (!wasStarted) {
      // Sinh viên truy cập URL có sessionId nhưng chưa từng bắt đầu trong tab này
      // (ví dụ: copy URL sang tab khác, hoặc chuyển hướng từ dashboard đến đây lần đầu)
      // → Không làm gì thêm; component hiển thị pre-start screen bình thường.
      return;
    }

    // ssKey tồn tại → sinh viên đã bắt đầu làm bài trong tab này, nhưng React state reset
    // → đây là Reload / F5 / back-forward → coi như BỎ THI
    const reason = 'Thí sinh đã tải lại trang (Reload) hoặc thoát khỏi bài thi khi chưa bấm nộp bài';
    const abandonedInfo = {
      status: 'abandoned',
      sessionId: urlSessionId,
      examId: currentExamId,
      examTitle: title,
      subjectId,
      subjectName,
      mode,
      abandonedAt: Date.now(),
      reason,
    };

    // Xóa sessionStorage flag để không trigger lại lần sau
    sessionStorage.removeItem(ssKey);

    // Đồng bộ bỏ thi lên Firestore
    abandonSession(urlSessionId, reason, {
      uid,
      studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Học sinh',
      examId: currentExamId,
      examTitle: title,
      subjectId,
      subjectName,
      mode,
      totalQuestions: 0, // unknown at this point
    });

    setIsAbandoned(true);
    setAbandonedData(abandonedInfo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId]);

  // 1. Load questions if not passed in state
  useEffect(() => {
    if (questions.length === 0 && examId) {
      setLoadingQuestions(true);
      loadQuestions(examId)
        .then((qs) => {
          setQuestions(qs || []);
        })
        .finally(() => {
          setLoadingQuestions(false);
        });
    }
  }, [examId, questions.length]);

  // Answer sync hook (debounces 800ms to subcollection answers)
  const { syncAnswer, flushAnswer } = useAnswerSync(sessionId);

  // 2. Realtime Session Sync & Admin commands
  useSessionSync(sessionId, {
    onTerminated: () => {
      if (!isSubmittingRef.current) {
        setIsTerminatedModal(true);
        setTerminationReason('Giám thị đã khóa phiên thi của bạn từ xa.');
      }
    },
    onAdminMessage: (msg) => {
      setAdminMessageModal(msg);
    },
  });

  // 3. Heartbeat loop (every 10s)
  useEffect(() => {
    if (!sessionId || !hasStarted || isSubmittingRef.current) return;

    const timer = setInterval(() => {
      const currentAns = answersRef.current;
      const answeredGrid = {};
      questions.forEach((_, idx) => {
        const val = currentAns[idx];
        const hasAns = val !== undefined && val !== null && val !== '' &&
          !(Array.isArray(val) && val.length === 0) &&
          !(typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length === 0);
        if (hasAns) {
          answeredGrid[idx + 1] = 'answered';
        } else if (flagged[idx]) {
          answeredGrid[idx + 1] = 'flagged';
        }
      });

      const answeredCount = Object.keys(answeredGrid).filter(
        (k) => answeredGrid[k] === 'answered'
      ).length;

      heartbeat(sessionId, {
        timeLeft: timerHook.remaining,
        currentQuestion: currentIndex + 1,
        answeredCount,
        answeredGrid,
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [sessionId, hasStarted, questions, flagged, currentIndex]);

  // Submit Handler
  const executeSubmit = useCallback(
    async (reason = 'Chủ động nộp') => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const currentAnswers = answersRef.current;
      let correctCount = 0;
      const wrongQuestions = [];
      const questionDetails = [];

      questions.forEach((q, idx) => {
        const studentAns = currentAnswers[idx];
        let isCorrect = false;
        const qType = q.type || 'single';

        if (qType === 'multiselect') {
          const correctArr = Array.isArray(q.correctAnswers)
            ? q.correctAnswers
            : Array.isArray(q.corrects) ? q.corrects : [q.correctAnswer];
          const studentArr = Array.isArray(studentAns) ? studentAns : [];
          isCorrect =
            correctArr.length === studentArr.length &&
            correctArr.every((v) => studentArr.includes(v));
        } else if (qType === 'fill') {
          const expected = String(q.correctAnswer || '').trim().toLowerCase();
          const given = String(studentAns || '').trim().toLowerCase();
          isCorrect = expected === given;
        } else if (qType === 'truefalse') {
          isCorrect =
            studentAns !== undefined &&
            studentAns !== null &&
            Number(studentAns) === Number(q.correctAnswer);
        } else if (qType === 'multitruefalse') {
          // answer = { 0: true, 1: false, ... }, compare against q.statements[i].correct
          const statements = q.statements || [];
          if (typeof studentAns === 'object' && studentAns !== null && statements.length > 0) {
            isCorrect = statements.every((st, stIdx) => studentAns[stIdx] === !!st.correct);
          }
        } else if (qType === 'order') {
          // answer = [idx, idx, ...], correct order = [0, 1, 2, ...]
          const items = q.items || [];
          const correctOrder = items.map((_, i) => i);
          const studentOrder = Array.isArray(studentAns) ? studentAns : [];
          isCorrect =
            correctOrder.length === studentOrder.length &&
            correctOrder.every((v, i) => v === studentOrder[i]);
        } else if (qType === 'drag') {
          // answer = { leftIdx: rightIdx }, correct = pairs[i] -> i maps to i
          const pairs = q.pairs || [];
          if (typeof studentAns === 'object' && studentAns !== null && pairs.length > 0) {
            isCorrect = pairs.every((_, pIdx) => Number(studentAns[pIdx]) === pIdx);
          }
        } else if (qType === 'groupdrag') {
          // answer = { itemText: groupIdx }, verify each item is in correct group
          const groups = q.groups || [];
          if (typeof studentAns === 'object' && studentAns !== null && groups.length > 0) {
            let allMatch = true;
            groups.forEach((g, gIdx) => {
              (g.items || []).forEach(item => {
                if (studentAns[item] !== gIdx) allMatch = false;
              });
            });
            isCorrect = allMatch;
          }
        } else if (qType === 'clozedrag') {
          // answer = { blankIdx: wordText }, compare against q.correctFills or q.blanks[i].answer
          const blanks = q.blanks || [];
          const correctFills = q.correctFills || {};
          if (typeof studentAns === 'object' && studentAns !== null) {
            if (blanks.length > 0) {
              isCorrect = blanks.every((b, bIdx) => {
                const expected = (correctFills[bIdx] || b.answer || '').trim().toLowerCase();
                const given = (studentAns[bIdx] || '').trim().toLowerCase();
                return expected === given;
              });
            }
          }
        } else {
          // single choice (default)
          isCorrect =
            studentAns !== undefined &&
            studentAns !== null &&
            Number(studentAns) === Number(q.correctAnswer);
        }

        if (isCorrect) {
          correctCount++;
        } else {
          wrongQuestions.push({
            id: q.id || idx,
            examId,
            type: q.type || 'single',
            text: q.content || q.question || q.text || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            studentAnswer: studentAns,
          });
        }

        questionDetails.push({
          question: q,
          studentAnswer: studentAns,
          isCorrect,
        });
      });

      const totalQ = questions.length;
      const score = totalQ > 0 ? Number(((correctCount / totalQ) * 10).toFixed(1)) : 0;
      const uid = currentUser?.uid || currentUser?.id || 'guest';

      // Save wrong answers to notebook
      if (wrongQuestions.length > 0 && uid) {
        saveMistakes(uid, subjectId || 'general', wrongQuestions, examId);
      }

      const resultData = {
        uid,
        studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Học sinh',
        examId: examId || 'exam',
        examTitle: title,
        subjectId: subjectId || '',
        subjectName: subjectName || '',
        mode,
        score,
        correctCount,
        totalQuestions: totalQ,
        submitReason: reason,
        answers: currentAnswers,
        questionDetails,
        timeTaken: Math.max(0, timeLimit - timerHook.remaining),
      };

      // Update session in Firestore
      await submitSession(sessionId, resultData);

      // Giải phóng sessionStorage flag (nộp thành công)
      if (ssKey) sessionStorage.removeItem(ssKey);

      // Navigate to review
      navigate('/client/review', {
        state: { result: resultData },
        replace: true,
      });
    },
    [questions, currentExamId, title, subjectId, subjectName, mode, currentUser, timeLimit, sessionId, navigate, ssKey]
  );

  // ── Xử lý khi thí sinh chủ động thoát phòng thi khi chưa nộp bài ──────────
  const handleForfeitExam = useCallback(
    async (reason = 'Thí sinh chủ động thoát phòng thi khi chưa nộp bài') => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const abandonedInfo = {
        status: 'abandoned',
        sessionId,
        examId: currentExamId,
        examTitle: title,
        subjectId,
        subjectName,
        mode,
        abandonedAt: Date.now(),
        reason,
        totalQuestions: questions.length,
      };

      // Giải phóng sessionStorage flag
      if (ssKey) sessionStorage.removeItem(ssKey);

      await abandonSession(sessionId, reason, {
        uid,
        studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Học sinh',
        examId: currentExamId,
        examTitle: title,
        subjectId,
        subjectName,
        mode,
        totalQuestions: questions.length,
      });

      setIsAbandoned(true);
      setAbandonedData(abandonedInfo);
    },
    [sessionId, currentExamId, title, subjectId, subjectName, mode, questions.length, ssKey, uid, currentUser]
  );

  // ── Ngăn chặn reload và thoát trang ngoài ý muốn khi đang làm bài ─────────
  useEffect(() => {
    if (!hasStarted || isSubmitting) return;

    const handleBeforeUnload = (e) => {
      const message = 'CẢNH BÁO NGUY HIỂM: Nếu bạn tải lại trang (Reload/F5) hoặc đóng trình duyệt, bài thi sẽ bị hủy ngay lập tức và coi như BỎ THI (0.0 điểm)!';
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      const confirmLeave = window.confirm(
        'CẢNH BÁO BỎ THI:\nBạn đang trong quá trình làm bài. Nếu bạn quay lại hoặc rời khỏi trang này, bài làm sẽ bị HỦY ngay lập tức và coi như BỎ THI (0.0 điểm)!\n\nBạn có chắc chắn muốn bỏ thi không?'
      );
      if (confirmLeave) {
        handleForfeitExam('Thí sinh bấm Quay lại / Rời khỏi phòng thi');
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasStarted, isSubmitting, handleForfeitExam]);

  // 4. Timer hook
  const timerHook = useExamTimer(
    timeLimit,
    () => {
      executeSubmit('Hết giờ làm bài');
    },
    hasStarted && !isSubmitting
  );

  // 5. Anti-cheat hook
  const antiCheat = useAntiCheat({
    sessionId,
    enabled: hasStarted && mode === 'simulation' && !isSubmitting,
    onViolation: (violation) => {
      setActiveViolation(violation);
      if (sessionId) {
        recordViolation(sessionId, {
          type: violation.type,
          count: violation.count,
          reason: violation.message,
        });
      }
    },
    onAutoSubmit: (reason) => {
      executeSubmit(reason);
    },
  });

  // Start exam action
  const handleStartExam = async () => {
    const sId = await createSession({
      uid,
      studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Học sinh',
      examId: currentExamId,
      examTitle: title,
      subjectId,
      subjectName,
      mode,
      totalQuestions: questions.length,
      duration: timeLimit,
    });

    // Guard: nếu createSession thất bại hoàn toàn (null) → không tiếp tục
    if (!sId) {
      console.error('[MockExam] createSession returned null — cannot start exam');
      alert('Không thể tạo phiên thi. Vui lòng kiểm tra kết nối mạng và thử lại.');
      return;
    }

    // Đặt sessionStorage flag TRƯỚC khi update URL
    // → nếu F5 ngay sau đây, flag đã tồn tại → reload sẽ bị detect
    const newSsKey = `qm_started_${sId}`;
    sessionStorage.setItem(newSsKey, '1');

    // Cập nhật URL thành /client/exam/:sessionId mà không re-render toàn bộ component
    window.history.replaceState(null, '', `/client/exam/${sId}`);

    setSessionId(sId);
    setHasStarted(true);
  };

  // Change answer callback
  const handleAnswerChange = (val) => {
    setAnswers((prev) => {
      const next = { ...prev, [currentIndex]: val };
      return next;
    });

    const currentQ = questions[currentIndex];
    const qId = currentQ?.id || `q_${currentIndex}`;
    syncAnswer(qId, val);
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">Đang tải đề thi và câu hỏi...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Đề thi chưa có câu hỏi</h2>
          <p className="text-xs text-slate-400">
            Đề thi này chưa được nạp ngân hàng câu hỏi. Vui lòng liên hệ giảng viên hoặc chọn đề khác.
          </p>
          <Button onClick={() => navigate('/client/dashboard')} variant="outline">
            Quay về danh sách
          </Button>
        </div>
      </div>
    );
  }

  // ── Blocked Screen: Thí sinh đã bỏ thi / bị khóa do Reload hoặc Thoát ──
  if (isAbandoned) {
    const displayExamTitle = abandonedData?.examTitle || title || 'Đề thi trắc nghiệm';
    const displayReason = abandonedData?.reason || 'Thí sinh đã tải lại trang (Reload) hoặc thoát khỏi phòng thi khi chưa nộp bài.';
    const displayTime = abandonedData?.abandonedAt ? formatDateTime(abandonedData.abandonedAt) : 'Vừa xong';

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <Card className="max-w-xl w-full bg-slate-900/90 border border-rose-500/40 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-inner">
                <ShieldAlert className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertOctagon className="h-3.5 w-3.5" /> Khóa Quyền Truy Cập / Đã Bỏ Thi
              </span>
              <h2 className="text-2xl font-black text-white pt-1">
                Không Thể Tiếp Tục Bài Làm
              </h2>
              <p className="text-xs text-rose-300 font-semibold max-w-md mx-auto leading-relaxed">
                {displayReason}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Mã đề / Tên bài:</span>
                <span className="font-bold text-slate-200 truncate max-w-[240px]" title={displayExamTitle}>
                  {displayExamTitle}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Trạng thái ghi nhận:</span>
                <span className="font-black text-rose-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> BỎ THI (0.0 / 10 điểm)
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Hình thức làm bài:</span>
                <span className="font-semibold text-slate-300">
                  {mode === 'simulation' ? 'Khảo thí chính thức' : 'Luyện tập'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Thời điểm vi phạm:</span>
                <span className="font-mono text-slate-300">{displayTime}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-200/90 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Quy chế phòng thi & luyện tập nghiêm ngặt:
              </div>
              <p className="text-[11px] text-amber-200/80">
                Hệ thống chỉ công nhận bài làm khi thí sinh nhấn nút <strong>&quot;Nộp bài thi&quot;</strong> và nhận được phản hồi thành công từ máy chủ. Mọi hành vi <strong>tải lại trang (F5/Reload)</strong>, đổi tab trình duyệt hoặc thoát ra ngoài đều bị xem là bỏ thi và <strong>khóa vĩnh viễn quyền vào lại</strong> mã đề này.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => navigate('/client/dashboard')}
              className="w-full bg-rose-600 hover:bg-rose-700 font-bold py-3 text-sm shadow-lg shadow-rose-900/30"
            >
              Quay về Màn hình chính
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-start screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-inner">
              <Play className="h-8 w-8 ml-1" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                {mode === 'simulation' ? 'Chế độ Khảo thí (Anti-cheat)' : 'Chế độ Luyện tập tự do'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white pt-1">
                {title}
              </h2>
              {subjectName && (
                <p className="text-xs text-slate-500 font-medium">Học phần: {subjectName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Số lượng câu</div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {questions.length} câu
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Thời gian làm bài</div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {Math.round(timeLimit / 60)} phút
                </div>
              </div>
            </div>

            {/* Cảnh báo quy chế Chống Reload & Thoát dở dang */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-left text-xs space-y-1.5 text-amber-800 dark:text-amber-200 font-medium">
              <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Lưu ý quy chế làm bài nghiêm ngặt:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Tuyệt đối <strong>KHÔNG tải lại trang (Reload / F5)</strong> hoặc đóng trình duyệt sau khi đã bấm bắt đầu.</li>
                <li>Nếu thoát ra hoặc reload, hệ thống sẽ tự động coi như bạn <strong>BỎ THI (0.0 điểm)</strong> và <strong>KHÓA QUYỀN VÀO LẠI</strong>.</li>
                <li>Hệ thống <strong>CHỈ nhận bài thi</strong> khi bạn bấm nút <strong>&quot;Nộp bài thi&quot;</strong> và ghi nhận thành công!</li>
              </ul>
            </div>

            {mode === 'simulation' && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-left text-xs space-y-1 text-red-700 dark:text-red-300 font-medium">
                <div className="font-bold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4" /> Quy chế phòng thi mô phỏng:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Không được chuyển tab, thu nhỏ hoặc rời màn hình thi.</li>
                  <li>Mọi thao tác thoát màn hình sẽ bị ghi nhận vi phạm.</li>
                  <li>Vi phạm 3 lần sẽ tự động thu bài và khóa thi.</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/client/dashboard')}
                className="w-1/2"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleStartExam}
                className="w-1/2"
              >
                Bắt đầu làm bài
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValidAnswer = (val) => {
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return true;
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => isValidAnswer(answers[k])
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <ExamHeader
        title={title}
        subjectName={subjectName}
        formattedTime={timerHook.formattedTime}
        isWarning={timerHook.isWarning}
        isDanger={timerHook.isDanger}
        mode={mode}
        violationsCount={antiCheat.violationCount}
        onSubmit={() => setShowSubmitConfirm(true)}
        isSubmitting={isSubmitting}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-[90rem] mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24 flex flex-col lg:flex-row gap-6">
        {/* Left: Current Question Area */}
        <div className="flex-1">
          <QuestionCard
            question={questions[currentIndex]}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            answer={answers[currentIndex]}
            onAnswerChange={handleAnswerChange}
            isFlagged={!!flagged[currentIndex]}
            onToggleFlag={handleToggleFlag}
          />
        </div>

        {/* Right: Question Palette */}
        <div className="w-full lg:w-64 shrink-0">
          <QuestionPalette
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
            answers={answers}
            flagged={flagged}
          />
        </div>
      </main>

      {/* ── Bottom Navigation Taskbar (cố định dưới cùng) ─────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-[90rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            icon={ArrowLeft}
          >
            Câu trước
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              Câu {currentIndex + 1} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {questions.length}</span>
            </span>
          </div>

          {currentIndex < questions.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            >
              Câu tiếp theo <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => setShowSubmitConfirm(true)}
              icon={Send}
            >
              Nộp bài thi
            </Button>
          )}
        </div>
      </footer>

      {/* Confirmation Modal before Submit */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Xác nhận nộp bài thi"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
            Bạn đã hoàn thành <strong>{answeredCount}/{questions.length}</strong> câu hỏi.
            {answeredCount < questions.length && (
              <span className="block text-amber-600 dark:text-amber-400 font-semibold mt-1">
                ⚠️ Lưu ý: Vẫn còn {questions.length - answeredCount} câu chưa được trả lời!
              </span>
            )}
          </p>

          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              onClick={() => setShowSubmitConfirm(false)}
              className="w-1/2"
            >
              Làm tiếp
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              onClick={() => {
                setShowSubmitConfirm(false);
                executeSubmit('Chủ động nộp');
              }}
              className="w-1/2"
            >
              Nộp bài ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Violation Popup (Non-blocking Anti-cheat) */}
      <ViolationModal
        violation={activeViolation}
        onClose={() => setActiveViolation(null)}
      />

      {/* Admin Message Modal */}
      <Modal
        isOpen={!!adminMessageModal}
        onClose={() => setAdminMessageModal(null)}
        title="Tin nhắn từ Giám thị"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {adminMessageModal}
          </p>
          <Button variant="primary" onClick={() => setAdminMessageModal(null)} className="w-full">
            Đã nhận tin nhắn
          </Button>
        </div>
      </Modal>

      {/* Session Terminated by Admin */}
      <Modal
        isOpen={isTerminatedModal}
        onClose={() => navigate('/client/dashboard')}
        title="Phiên thi đã bị khóa"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 mx-auto flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {terminationReason || 'Giám thị đã khóa phiên thi của bạn.'}
          </p>
          <Button
            variant="danger"
            onClick={() => {
              executeSubmit('Bị giám thị khóa');
            }}
            className="w-full"
          >
            Xem kết quả và thoát
          </Button>
        </div>
      </Modal>
    </div>
  );
}
