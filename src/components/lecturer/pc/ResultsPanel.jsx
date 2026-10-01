import React, { useState, useMemo } from 'react';
import {
  BarChart3, Users, Trophy, TrendingUp, CheckCircle, Search, Clock,
  Eye, Edit3, Trash2, X, AlertTriangle, Check, CheckCircle2, XCircle,
  Filter, ArrowUpDown, ChevronDown, Save, HelpCircle, FileText, Sparkles,
  Copy, RotateCcw, Bell
} from 'lucide-react';
import { Card, CardContent } from '../../common/Card';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { ToastOverlay } from '../../common/Toast';
import { formatDateTime, formatSeconds } from '../../../utils/helpers';
import { deleteExamResult, updateExamResult } from '../../../services/db/sessionService';

// ── Helper: Hiển thị câu trả lời của học sinh theo từng dạng câu hỏi ──────────
function renderStudentAnswer(val, question) {
  if (val === undefined || val === null || val === '') {
    return <span className="text-slate-400 dark:text-slate-500 italic font-normal">Chưa trả lời</span>;
  }
  const type = question?.type || 'single';
  const options = question?.options || [];

  if (type === 'single') {
    const opt = options[val];
    const text = typeof opt === 'object' ? (opt.text || opt.content || JSON.stringify(opt)) : opt;
    return <span className="font-semibold text-slate-800 dark:text-slate-200">{text || `Lựa chọn ${Number(val) + 1}`}</span>;
  }

  if (type === 'multiselect' && Array.isArray(val)) {
    if (val.length === 0) return <span className="text-slate-400 dark:text-slate-500 italic">Chưa chọn đáp án nào</span>;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {val.map((idx, i) => {
          const opt = options[idx];
          const text = typeof opt === 'object' ? (opt.text || opt.content) : opt;
          return (
            <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {text || `Lựa chọn ${Number(idx) + 1}`}
            </span>
          );
        })}
      </div>
    );
  }

  if (type === 'truefalse') {
    const isTrue = Number(val) === 1;
    return (
      <span className={`font-bold ${isTrue ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
        {isTrue ? 'Đúng' : 'Sai'}
      </span>
    );
  }

  if (type === 'multitruefalse' && typeof val === 'object') {
    const statements = question?.statements || [];
    return (
      <div className="space-y-1.5 mt-1 text-xs">
        {statements.map((st, i) => (
          <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="truncate pr-2 text-slate-600 dark:text-slate-300">{st.text || `Phát biểu ${i + 1}`}</span>
            <span className={`font-black shrink-0 ${val[i] === true ? 'text-emerald-600 dark:text-emerald-400' : val[i] === false ? 'text-rose-500' : 'text-slate-400'}`}>
              {val[i] === true ? 'ĐÚNG' : val[i] === false ? 'SAI' : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'order' && Array.isArray(val)) {
    const items = question?.items || [];
    return (
      <ol className="list-decimal list-inside space-y-1 mt-1 text-xs">
        {val.map((itemIdx, pos) => (
          <li key={pos} className="font-semibold text-slate-700 dark:text-slate-200">
            {typeof items[itemIdx] === 'object' ? items[itemIdx]?.text : (items[itemIdx] || `Mục ${itemIdx + 1}`)}
          </li>
        ))}
      </ol>
    );
  }

  if (type === 'groupdrag' && typeof val === 'object') {
    const groups = question?.groups || [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
        {groups.map((g, gIdx) => {
          const itemsInGroup = Object.keys(val).filter(item => val[item] === gIdx);
          return (
            <div key={gIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                {g.name || `Nhóm ${gIdx + 1}`}:
              </span>
              {itemsInGroup.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {itemsInGroup.map((it, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-600">
                      {it}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic text-[11px]">Chưa xếp mục nào</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'drag' && typeof val === 'object') {
    const pairs = question?.pairs || [];
    return (
      <div className="space-y-1 mt-1 text-xs">
        {pairs.map((p, pIdx) => {
          const matchedRightIdx = val[pIdx];
          const matchedRight = pairs[matchedRightIdx]?.right || '—';
          return (
            <div key={pIdx} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <span className="font-medium text-slate-700 dark:text-slate-300">{p.left}</span>
              <span className="text-slate-400">→</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{matchedRight}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'clozedrag' && typeof val === 'object') {
    return (
      <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
        {Object.entries(val).map(([bIdx, word]) => (
          <span key={bIdx} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
            [Vị trí {Number(bIdx) + 1}]: {word}
          </span>
        ))}
      </div>
    );
  }

  if (typeof val === 'object') {
    return <span className="font-mono text-xs">{JSON.stringify(val)}</span>;
  }

  return <span className="font-semibold text-slate-800 dark:text-slate-200">{String(val)}</span>;
}

// ── Helper: Hiển thị đáp án đúng chuẩn ─────────────────────────────────────────
function renderCorrectAnswer(question) {
  if (!question) return '—';
  const type = question.type || 'single';
  const options = question.options || [];

  if (type === 'single') {
    const opt = options[question.correctAnswer];
    const text = typeof opt === 'object' ? (opt.text || opt.content) : opt;
    return text || `Đáp án ${Number(question.correctAnswer) + 1}`;
  }

  if (type === 'multiselect') {
    const correctArr = Array.isArray(question.correctAnswers)
      ? question.correctAnswers
      : Array.isArray(question.corrects) ? question.corrects : [question.correctAnswer];
    return correctArr.map(idx => {
      const opt = options[idx];
      return typeof opt === 'object' ? (opt.text || opt.content) : (opt || `Đáp án ${Number(idx) + 1}`);
    }).join(', ');
  }

  if (type === 'fill') {
    return question.correctAnswer || '—';
  }

  if (type === 'truefalse') {
    return Number(question.correctAnswer) === 1 ? 'Đúng' : 'Sai';
  }

  if (type === 'multitruefalse') {
    const statements = question.statements || [];
    return statements.map((st, i) => `${i + 1}. ${st.correct ? 'Đúng' : 'Sai'}`).join(' | ');
  }

  if (type === 'order') {
    const items = question.items || [];
    return items.map((it, i) => `${i + 1}. ${typeof it === 'object' ? it.text : it}`).join(' → ');
  }

  if (type === 'groupdrag') {
    const groups = question.groups || [];
    return groups.map(g => `${g.name}: [${(g.items || []).join(', ')}]`).join(' | ');
  }

  if (type === 'drag') {
    const pairs = question.pairs || [];
    return pairs.map(p => `${p.left} = ${p.right}`).join(' | ');
  }

  if (type === 'clozedrag') {
    const correctFills = question.correctFills || {};
    const blanks = question.blanks || [];
    if (Object.keys(correctFills).length > 0) {
      return Object.entries(correctFills).map(([k, v]) => `[${Number(k) + 1}]: ${v}`).join(', ');
    }
    return blanks.map((b, i) => `[${i + 1}]: ${b.answer}`).join(', ');
  }

  return question.correctAnswer !== undefined ? String(question.correctAnswer) : '—';
}

export function ResultsPanel({ examResults = [] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pass' | 'fail'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'score_high' | 'score_low'

  // Modals state
  const [viewingResult, setViewingResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [deletingResult, setDeletingResult] = useState(null);

  // Edit form state
  const [editScore, setEditScore] = useState(0);
  const [editCorrectCount, setEditCorrectCount] = useState(0);
  const [editTeacherNotes, setEditTeacherNotes] = useState('');
  const [editSubmitReason, setEditSubmitReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Question filter inside Detail Modal
  const [detailQuestionFilter, setDetailQuestionFilter] = useState('all'); // 'all' | 'correct' | 'wrong'

  // ── Overlay Notifications (Góc dưới cùng bên phải) ──────────────────────────
  const [toasts, setToasts] = useState([]);

  const notify = (type, message, title = '') => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [
      ...prev.slice(-3), // Giữ tối đa 4 thông báo đồng thời
      { id, type, message, title, duration: 4000 }
    ]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filter & Sort results
  const filteredResults = useMemo(() => {
    return examResults
      .filter(r => {
        // Text search
        const matchesSearch =
          (r.studentName || r.userId || r.uid || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.examTitle || r.title || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.subjectName || '').toLowerCase().includes(search.toLowerCase());

        // Status filter
        const score = r.score ?? 0;
        const matchesStatus =
          statusFilter === 'all' ? true :
          statusFilter === 'pass' ? score >= 5 :
          score < 5;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const tA = new Date(a.submittedAt?.toDate?.() || a.submittedAt || 0).getTime();
          const tB = new Date(b.submittedAt?.toDate?.() || b.submittedAt || 0).getTime();
          return tB - tA;
        }
        if (sortBy === 'oldest') {
          const tA = new Date(a.submittedAt?.toDate?.() || a.submittedAt || 0).getTime();
          const tB = new Date(b.submittedAt?.toDate?.() || b.submittedAt || 0).getTime();
          return tA - tB;
        }
        if (sortBy === 'score_high') {
          return (b.score || 0) - (a.score || 0);
        }
        if (sortBy === 'score_low') {
          return (a.score || 0) - (b.score || 0);
        }
        return 0;
      });
  }, [examResults, search, statusFilter, sortBy]);

  // Overall Statistics
  const totalStudents = new Set(examResults.map(r => r.uid || r.userId || r.studentName)).size;
  const avgScore = examResults.length > 0
    ? (examResults.reduce((sum, r) => sum + (r.score || 0), 0) / examResults.length).toFixed(1)
    : 0;
  const passCount = examResults.filter(r => (r.score || 0) >= 5).length;
  const passRate = examResults.length > 0 ? Math.round((passCount / examResults.length) * 100) : 0;

  // ── Thao tác 1: Mở xem chi tiết bài làm ─────────────────────────────────────
  const handleOpenView = (r) => {
    setViewingResult(r);
    setDetailQuestionFilter('all');
    notify(
      'view',
      `Đang xem chi tiết bài làm của ${r.studentName || 'sinh viên'} (Điểm: ${r.score ?? 0}/10)`,
      'Xem chi tiết kết quả'
    );
  };

  // ── Thao tác 2: Mở Modal chỉnh sửa ──────────────────────────────────────────
  const handleOpenEdit = (result) => {
    setEditingResult(result);
    setEditScore(result.score ?? 0);
    setEditCorrectCount(result.correctCount ?? 0);
    setEditTeacherNotes(result.teacherNotes || '');
    setEditSubmitReason(result.submitReason || 'Giảng viên đã phúc khảo / điều chỉnh');
    notify(
      'info',
      `Mở cửa sổ điều chỉnh điểm cho sinh viên ${result.studentName || 'sinh viên'}`,
      'Chỉnh sửa kết quả'
    );
  };

  // ── Thao tác 3: Lưu kết quả đã chỉnh sửa ────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingResult?.id) return;
    const scoreNum = Number(editScore);
    const correctNum = Number(editCorrectCount);

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      notify('warning', 'Điểm số phải là số từ 0.0 đến 10.0', 'Điểm không hợp lệ');
      return;
    }

    setIsSaving(true);
    try {
      const updatePayload = {
        score: scoreNum,
        correctCount: correctNum,
        teacherNotes: editTeacherNotes.trim(),
        submitReason: editSubmitReason.trim(),
      };

      const success = await updateExamResult(editingResult.id, updatePayload);
      if (success) {
        notify(
          'edit',
          `Đã cập nhật kết quả bài thi của ${editingResult.studentName || 'sinh viên'} thành công! Điểm mới: ${scoreNum.toFixed(1)}/10 (${correctNum} câu đúng)`,
          'Cập nhật thành công'
        );

        if (viewingResult?.id === editingResult.id) {
          setViewingResult(prev => ({ ...prev, ...updatePayload }));
        }
        setEditingResult(null);
      } else {
        notify('danger', 'Có lỗi xảy ra khi lưu kết quả vào máy chủ.', 'Lỗi cập nhật');
      }
    } catch (e) {
      console.error('Error updating exam result:', e);
      notify('danger', 'Lỗi: ' + e.message, 'Lỗi cập nhật');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Thao tác 4: Yêu cầu xóa kết quả ────────────────────────────────────────
  const handleOpenDelete = (r) => {
    setDeletingResult(r);
    notify(
      'warning',
      `Vui lòng xác nhận trước khi xóa vĩnh viễn kết quả bài thi của ${r.studentName || 'sinh viên'}`,
      'Yêu cầu xác nhận xóa'
    );
  };

  // ── Thao tác 5: Xác nhận xóa kết quả ───────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deletingResult?.id) return;
    setIsDeleting(true);
    try {
      const success = await deleteExamResult(deletingResult.id);
      if (success) {
        notify(
          'danger',
          `Đã xóa thành công bài thi của ${deletingResult.studentName || 'sinh viên'} khỏi hệ thống. Bảng điểm đã tự động cập nhật!`,
          'Đã xóa kết quả'
        );

        if (viewingResult?.id === deletingResult.id) {
          setViewingResult(null);
        }
        setDeletingResult(null);
      } else {
        notify('danger', 'Có lỗi xảy ra khi xóa kết quả thi.', 'Lỗi xóa kết quả');
      }
    } catch (e) {
      console.error('Error deleting exam result:', e);
      notify('danger', 'Lỗi xóa kết quả: ' + e.message, 'Lỗi xóa');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Thao tác 6: Sao chép tóm tắt kết quả vào clipboard ──────────────────────
  const handleCopySummary = (res) => {
    if (!res) return;
    const isPassed = (res.score ?? 0) >= 5;
    const summaryText = [
      `📊 KẾT QUẢ BÀI THI: ${res.examTitle || 'Bài thi'}`,
      `• Học sinh: ${res.studentName || '—'} (UID: ${res.uid || res.userId || '—'})`,
      `• Môn học: ${res.subjectName || '—'}`,
      `• Điểm số: ${res.score ?? 0}/10 [${isPassed ? 'ĐẠT' : 'CHƯA ĐẠT'}]`,
      `• Số câu đúng: ${res.correctCount ?? 0}/${res.totalQuestions ?? 0}`,
      `• Thời gian làm bài: ${formatSeconds(res.timeTaken)}`,
      `• Thời gian nộp: ${formatDateTime(res.submittedAt)}`,
      res.teacherNotes ? `• Ghi chú GV: ${res.teacherNotes}` : '',
    ].filter(Boolean).join('\n');

    try {
      navigator.clipboard?.writeText?.(summaryText);
      notify(
        'success',
        `Đã sao chép tóm tắt kết quả của ${res.studentName || 'sinh viên'} vào bộ nhớ tạm!`,
        'Sao chép thành công'
      );
    } catch (_) {
      notify('info', 'Không thể truy cập bộ nhớ tạm trên trình duyệt.', 'Thông báo');
    }
  };

  // ── Thao tác 7: Làm mới danh sách ──────────────────────────────────────────
  const handleRefresh = () => {
    notify(
      'info',
      `Đã làm mới dữ liệu bảng điểm (${examResults.length} bài thi được cập nhật)`,
      'Làm mới dữ liệu'
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Overlay Notifications (Cố định góc dưới cùng bên phải) ──────── */}
      <ToastOverlay toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Kết Quả & Báo Cáo Điểm Thi
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-12">
            Thống kê điểm số, xem chi tiết bài làm, chỉnh sửa và quản lý kết quả sinh viên
          </p>
        </div>

        {/* Search, Filters & Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, bài thi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              notify('info', `Đang lọc danh sách theo: ${e.target.value === 'pass' ? 'Chỉ đạt' : e.target.value === 'fail' ? 'Chưa đạt' : 'Tất cả'}`, 'Bộ lọc kết quả');
            }}
            className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">Tất cả kết quả</option>
            <option value="pass">Chỉ đạt (≥5đ)</option>
            <option value="fail">Chưa đạt (&lt;5đ)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="score_high">Điểm cao nhất</option>
            <option value="score_low">Điểm thấp nhất</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Làm mới dữ liệu điểm thi"
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-xs font-semibold transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Học sinh</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalStudents}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng lượt nộp</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{examResults.length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm trung bình</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{avgScore}/10</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ đạt (≥5đ)</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{passRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{passCount}/{examResults.length} lượt</p>
            </div>
            <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filteredResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {examResults.length === 0 ? 'Chưa có kết quả thi nào.' : 'Không tìm thấy kết quả phù hợp với bộ lọc.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Học sinh</th>
                  <th className="px-6 py-3.5">Đề thi</th>
                  <th className="px-6 py-3.5">Điểm</th>
                  <th className="px-6 py-3.5">Số câu đúng</th>
                  <th className="px-6 py-3.5">Thời gian nộp</th>
                  <th className="px-6 py-3.5">Kết quả</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredResults.map((r, i) => {
                  const score = r.score ?? 0;
                  const isPassed = score >= 5;

                  return (
                    <tr key={r.id || i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      {/* Học sinh */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {r.studentName || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.uid || r.userId || ''}
                        </div>
                      </td>

                      {/* Đề thi */}
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 max-w-xs">
                        <div className="truncate">{r.examTitle || r.title || '—'}</div>
                        {(r.isAbandoned || r.status === 'abandoned') && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-normal mt-0.5 truncate" title={r.submitReason || 'Bỏ thi giữa chừng'}>
                            ⚠️ {r.submitReason || 'Bỏ thi / Thoát trang'}
                          </div>
                        )}
                        {r.teacherNotes && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal mt-0.5 truncate">
                            📝 {r.teacherNotes}
                          </div>
                        )}
                      </td>

                      {/* Điểm số */}
                      <td className="px-6 py-4">
                        <span className={`text-base font-black ${isPassed && !r.isAbandoned && r.status !== 'abandoned' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {typeof score === 'number' ? score.toFixed(1) : score}
                        </span>
                        <span className="text-slate-400 text-xs">/10</span>
                      </td>

                      {/* Số câu đúng */}
                      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                        {r.correctCount ?? r.correct ?? '—'}/{r.totalQuestions ?? r.total ?? '—'}
                      </td>

                      {/* Thời gian nộp */}
                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(r.submittedAt)}
                        </div>
                      </td>

                      {/* Kết quả */}
                      <td className="px-6 py-4">
                        {r.isAbandoned || r.status === 'abandoned' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                            🚫 Bỏ thi
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPassed
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                          }`}>
                            {isPassed ? 'Đạt' : 'Chưa đạt'}
                          </span>
                        )}
                      </td>

                      {/* THAO TÁC: Xem | Sửa | Xóa */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            title="Xem chi tiết bài làm"
                            onClick={() => handleOpenView(r)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 dark:text-slate-400 dark:hover:text-brand-400 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Chỉnh sửa */}
                          <button
                            type="button"
                            title="Chỉnh sửa điểm / ghi chú"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 dark:text-slate-400 dark:hover:text-amber-400 transition"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            title="Xóa kết quả thi"
                            onClick={() => handleOpenDelete(r)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-slate-400 dark:hover:text-red-400 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 1: XEM CHI TIẾT KẾT QUẢ THI
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!viewingResult}
        onClose={() => setViewingResult(null)}
        title="Chi tiết bài làm sinh viên"
        maxWidth="max-w-4xl"
      >
        {viewingResult && (() => {
          const res = viewingResult;
          const score = res.score ?? 0;
          const isPassed = score >= 5;
          const questionDetails = res.questionDetails || [];
          const correctCount = res.correctCount ?? 0;
          const totalQuestions = res.totalQuestions || questionDetails.length || 0;
          const wrongCount = Math.max(0, totalQuestions - correctCount);

          // Lọc câu hỏi trong modal
          const filteredQuestions = questionDetails.filter(item => {
            if (detailQuestionFilter === 'correct') return item.isCorrect;
            if (detailQuestionFilter === 'wrong') return !item.isCorrect;
            return true;
          });

          return (
            <div className="space-y-6">
              {/* Header Info Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {res.studentName || 'Học sinh'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        UID: {res.uid || res.userId || '—'}
                      </span>
                      <span>•</span>
                      <span>Đề: <strong>{res.examTitle || 'Bài thi'}</strong></span>
                      {res.subjectName && (
                        <>
                          <span>•</span>
                          <span>Môn: <strong>{res.subjectName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges điểm số & nút Sao chép */}
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleCopySummary(res)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-xs font-semibold transition"
                      title="Sao chép tóm tắt kết quả"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Sao chép</span>
                    </button>

                    <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                          {typeof score === 'number' ? score.toFixed(1) : score}
                        </span>
                        <span className="text-xs text-slate-400">/10</span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPassed
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                      }`}>
                        {isPassed ? 'Đạt yêu cầu' : 'Chưa đạt yêu cầu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub details row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Số câu đúng:</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {correctCount} / {totalQuestions} câu
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Thời gian làm:</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {formatSeconds(res.timeTaken)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Thời gian nộp:</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {formatDateTime(res.submittedAt)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lý do nộp:</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-bold truncate block">
                      {res.submitReason || 'Chủ động nộp'}
                    </strong>
                  </div>
                </div>

                {/* Giảng viên nhận xét / ghi chú */}
                {res.teacherNotes && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold">📝 Ghi chú của giảng viên:</span> {res.teacherNotes}
                  </div>
                )}
              </div>

              {/* Chi tiết từng câu hỏi */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Danh sách câu hỏi & bài làm ({questionDetails.length} câu)
                  </h4>

                  {/* Filter tabs */}
                  {questionDetails.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setDetailQuestionFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          detailQuestionFilter === 'all'
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({questionDetails.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailQuestionFilter('correct')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          detailQuestionFilter === 'correct'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-slate-200'
                        }`}
                      >
                        Đúng ({correctCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailQuestionFilter('wrong')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          detailQuestionFilter === 'wrong'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-slate-200'
                        }`}
                      >
                        Sai ({wrongCount})
                      </button>
                    </div>
                  )}
                </div>

                {/* List questions */}
                {questionDetails.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <HelpCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Bản ghi này không lưu chi tiết từng câu hỏi (nộp từ phiên bản trước).
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tổng điểm đã chấm: <strong>{score}/10</strong> ({correctCount}/{totalQuestions} câu đúng).
                    </p>
                    {res.answers && Object.keys(res.answers).length > 0 && (
                      <div className="mt-4 text-left max-w-md mx-auto">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Các lựa chọn đã lưu:
                        </span>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono max-h-40 overflow-y-auto">
                          {Object.entries(res.answers).map(([qKey, aVal]) => (
                            <div key={qKey} className="py-0.5 flex justify-between border-b border-slate-100 dark:border-slate-800 last:border-none">
                              <span>Câu {Number(qKey) + 1}:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{JSON.stringify(aVal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredQuestions.map((item, idx) => {
                      const { question = {}, studentAnswer, isCorrect } = item;
                      const qText = question.content || question.question || question.text || `Câu hỏi ${idx + 1}`;
                      const qType = question.type || 'single';

                      return (
                        <div
                          key={question.id || idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                              : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80'
                          }`}
                        >
                          {/* Question header row */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 font-black text-xs text-slate-800 dark:text-slate-200">
                                Câu {idx + 1}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {qType}
                              </span>
                            </div>

                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" /> Đúng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
                                <XCircle className="h-4 w-4" /> Sai
                              </span>
                            )}
                          </div>

                          {/* Question Text */}
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed mb-3">
                            {qText}
                          </p>

                          {/* Question Image if present */}
                          {question.image && (
                            <div className="mb-3">
                              <img
                                src={question.image}
                                alt="Hình ảnh câu hỏi"
                                className="max-h-48 rounded-xl object-contain border border-slate-200 dark:border-slate-700"
                              />
                            </div>
                          )}

                          {/* Answers Comparison */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                            {/* Student Answer */}
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Câu trả lời của sinh viên:
                              </span>
                              <div>
                                {renderStudentAnswer(studentAnswer, question)}
                              </div>
                            </div>

                            {/* Correct Answer */}
                            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                Đáp án chính xác:
                              </span>
                              <div className="font-bold text-emerald-800 dark:text-emerald-200">
                                {renderCorrectAnswer(question)}
                              </div>
                            </div>
                          </div>

                          {/* Explanation if present */}
                          {question.explanation && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
                              <span className="font-bold">💡 Giải thích:</span> {question.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit3}
                    onClick={() => {
                      const curr = viewingResult;
                      setViewingResult(null);
                      handleOpenEdit(curr);
                    }}
                  >
                    Chỉnh sửa điểm
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => {
                      const curr = viewingResult;
                      setViewingResult(null);
                      handleOpenDelete(curr);
                    }}
                  >
                    Xóa kết quả
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingResult(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 2: CHỈNH SỬA KẾT QUẢ THI
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingResult}
        onClose={() => !isSaving && setEditingResult(null)}
        title="Chỉnh sửa kết quả bài thi"
        maxWidth="max-w-md"
      >
        {editingResult && (
          <div className="space-y-4">
            {/* Student context info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Học sinh:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{editingResult.studentName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đề thi:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{editingResult.examTitle || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tổng số câu:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{editingResult.totalQuestions || '—'} câu</span>
              </div>
            </div>

            {/* Score input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Điểm số (Thang 10) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">/ 10 điểm</span>
              </div>

              {/* Quick score presets */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">Chỉnh nhanh:</span>
                {[
                  { label: '+0.5', delta: 0.5 },
                  { label: '-0.5', delta: -0.5 },
                  { label: '5.0 (Đạt)', val: 5.0 },
                  { label: '10.0', val: 10.0 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (preset.val !== undefined) {
                        setEditScore(preset.val);
                      } else {
                        const cur = Number(editScore) || 0;
                        setEditScore(Math.min(10, Math.max(0, Number((cur + preset.delta).toFixed(1)))));
                      }
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Correct count input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Số câu đúng
              </label>
              <input
                type="number"
                min="0"
                max={editingResult.totalQuestions || 100}
                value={editCorrectCount}
                onChange={(e) => setEditCorrectCount(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Teacher Notes / Ghi chú phúc khảo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Ghi chú của giảng viên (Nhận xét / Phúc khảo)
              </label>
              <textarea
                rows={3}
                placeholder="VD: Đã phúc khảo câu 3 và cộng thêm 0.5 điểm..."
                value={editTeacherNotes}
                onChange={(e) => setEditTeacherNotes(e.target.value)}
                className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white leading-relaxed resize-none"
              />
            </div>

            {/* Submit reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Lý do cập nhật
              </label>
              <input
                type="text"
                placeholder="Giảng viên đã chấm lại"
                value={editSubmitReason}
                onChange={(e) => setEditSubmitReason(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSaving}
                onClick={() => setEditingResult(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                loading={isSaving}
                onClick={handleSaveEdit}
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: XÁC NHẬN XÓA KẾT QUẢ THI
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!deletingResult}
        onClose={() => !isDeleting && setDeletingResult(null)}
        title="Xác nhận xóa kết quả thi"
        maxWidth="max-w-md"
      >
        {deletingResult && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-xs text-rose-800 dark:text-rose-300">
                <p className="font-bold text-sm text-rose-900 dark:text-rose-200">
                  Hành động này không thể hoàn tác!
                </p>
                <p className="leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn kết quả bài thi này không? Bảng điểm và số liệu thống kê sẽ được tự động tính toán lại.
                </p>
              </div>
            </div>

            {/* Target details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Học sinh:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {deletingResult.studentName || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UID:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {deletingResult.uid || deletingResult.userId || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đề thi:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                  {deletingResult.examTitle || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Điểm số:</span>
                <span className="font-black text-rose-500">
                  {deletingResult.score ?? 0} / 10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian nộp:</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {formatDateTime(deletingResult.submittedAt)}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeletingResult(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={isDeleting}
                onClick={handleConfirmDelete}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
