import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Search, Lock, MessageSquare, Eye, Trash2,
  Clock, ShieldAlert, CheckCircle, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import { Button } from '../../../common/Button';
import { Card, CardContent } from '../../../common/Card';
import { Badge } from '../../../common/Badge';
import { ActionModal } from './ActionModal';
import {
  subscribeAllSessions,
  terminateSession,
  sendAdminMessage,
  deleteSession
} from '../../../../services/db/sessionService';
import { formatSeconds } from '../../../../utils/helpers';

export function LiveMonitor() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionModal, setActionModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const unsub = subscribeAllSessions((list) => {
      setSessions(list || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleActionConfirm = async (type, session, extra) => {
    if (type === 'terminate') {
      await terminateSession(session.id);
      showToast(`🔒 Đã khóa bài thi của ${session.studentName || session.uid}`);
    } else if (type === 'sendMsg') {
      await sendAdminMessage(session.id, extra);
      showToast(`💬 Đã gửi cảnh báo đến ${session.studentName || session.uid}`);
    } else if (type === 'delete') {
      await deleteSession(session.id);
      showToast(`🗑️ Đã xóa thẻ phiên thi của ${session.studentName || session.uid}`);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const nameMatch = (s.studentName || s.uid || '').toLowerCase().includes(search.toLowerCase()) ||
                      (s.examTitle || '').toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;

    if (statusFilter === 'active') return s.status === 'active';
    if (statusFilter === 'warning') return (s.warningCount || 0) > 0 && s.status !== 'terminated' && s.status !== 'abandoned';
    if (statusFilter === 'submitted') return s.status === 'submitted';
    if (statusFilter === 'abandoned') return s.status === 'abandoned';
    if (statusFilter === 'terminated') return s.status === 'terminated';
    return true;
  });

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action modal */}
      <ActionModal
        modal={actionModal}
        onClose={() => setActionModal(null)}
        onConfirm={handleActionConfirm}
      />

      {/* Header bar - Nhỏ gọn, vừa vặn */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 px-5 py-3 rounded-2xl shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shrink-0">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Giám Sát Phòng Thi Trực Tuyến (Live Monitor)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Theo dõi tiến độ realtime, cảnh báo vi phạm và điều khiển từ xa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên thí sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live ({sessions.length})
          </span>
        </div>
      </div>

      {/* Quick filter buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full">
        {[
          { id: 'all', label: `Tất cả (${sessions.length})` },
          { id: 'active', label: `🟢 Đang thi (${sessions.filter(s => s.status === 'active').length})` },
          { id: 'warning', label: `⚠️ Có vi phạm (${sessions.filter(s => (s.warningCount || 0) > 0 && s.status !== 'terminated' && s.status !== 'abandoned').length})` },
          { id: 'submitted', label: `✅ Đã nộp (${sessions.filter(s => s.status === 'submitted').length})` },
          { id: 'abandoned', label: `🚫 Bỏ thi (${sessions.filter(s => s.status === 'abandoned').length})` },
          { id: 'terminated', label: `🔒 Đã khóa (${sessions.filter(s => s.status === 'terminated').length})` },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setStatusFilter(btn.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
              statusFilter === btn.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Sessions Grid / Empty State */}
      {loading ? (
        <div className="flex-1 min-h-[360px] text-center text-slate-400 font-medium text-xs flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl w-full">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
          Đang kết nối Realtime...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center text-center text-slate-400 font-medium text-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-8 w-full shadow-sm">
          <Activity className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Hiện không có phiên thi nào phù hợp với bộ lọc.</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            Khi thí sinh bắt đầu làm bài, trạng thái, tiến độ và cảnh báo chống gian lận sẽ hiển thị trực tiếp tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
          {filteredSessions.map((session) => {
            const studentName = session.studentName || session.uid || 'Thí sinh';
            const totalQ = session.totalQuestions || 1;
            const answered = session.answeredCount || 0;
            const percent = Math.min(100, Math.round((answered / totalQ) * 100));
            const warnings = session.warningCount || session.violations?.length || 0;
            const isTerminated = session.status === 'terminated';
            const isAbandoned = session.status === 'abandoned';
            const isSubmitted = session.status === 'submitted';

            return (
              <Card
                key={session.id}
                className={`transition-all hover:shadow-md ${
                  isTerminated || isAbandoned
                    ? 'border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/20'
                    : warnings > 0
                      ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20'
                      : isSubmitted
                        ? 'border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-5 space-y-3.5">
                  {/* Top: Student & Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {studentName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={session.examTitle}>
                        {session.examTitle || 'Bài thi'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isTerminated ? (
                        <Badge variant="danger">🔒 Đã khóa</Badge>
                      ) : isAbandoned ? (
                        <Badge variant="danger">🚫 Bỏ thi</Badge>
                      ) : isSubmitted ? (
                        <Badge variant="brand">✅ Đã nộp</Badge>
                      ) : warnings > 0 ? (
                        <Badge variant="warning">⚠️ Vi phạm ({warnings})</Badge>
                      ) : (
                        <Badge variant="success">🟢 Live</Badge>
                      )}
                    </div>
                  </div>

                  {/* Middle: Progress & Time */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">
                        {isSubmitted && session.finalScore != null ? (
                          <>Điểm: <strong className="text-brand-600 dark:text-brand-400 text-sm">{session.finalScore}/10</strong> ({session.finalCorrect}/{session.finalTotal} đúng)</>
                        ) : (
                          <>Đã làm: <strong className="text-brand-600 dark:text-brand-400">{answered}/{totalQ}</strong> ({percent}%)</>
                        )}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.timeLeft != null ? formatSeconds(session.timeLeft) : 'Tự do'}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSubmitted ? 'bg-purple-500' : isTerminated ? 'bg-red-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom: Action buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {/* 1. Xem trực tiếp */}
                    <button
                      onClick={() => navigate(`/admin/spectate/${session.id}`)}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Xem bài làm realtime"
                    >
                      <Eye className="h-3.5 w-3.5" /> Xem
                    </button>

                    {/* 2. Nhắn tin */}
                    <button
                      onClick={() => setActionModal({ type: 'sendMsg', session })}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                      title="Gửi tin nhắn cảnh báo"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Nhắn
                    </button>

                    {/* 3. Khóa */}
                    <button
                      onClick={() => setActionModal({ type: 'terminate', session })}
                      disabled={isTerminated || isSubmitted}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Khóa bài thi từ xa"
                    >
                      <Lock className="h-3.5 w-3.5" /> Khóa
                    </button>

                    {/* 4. Xóa */}
                    <button
                      onClick={() => setActionModal({ type: 'delete', session })}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Xóa thẻ phiên thi"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
