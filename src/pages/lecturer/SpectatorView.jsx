import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, Eye, AlertTriangle,
  ArrowLeft, Loader2, Wifi, WifiOff, Target, Activity
} from 'lucide-react';
import { subscribeSingleSession } from '@/services/db/sessionService';
import { formatSeconds } from '@/utils/helpers';

const getCachedSession = (sessionId) => {
  try {
    const raw = sessionStorage.getItem(`qm_spec_${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function SpectatorView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(() => getCachedSession(sessionId));
  const [loading, setLoading] = useState(() => !getCachedSession(sessionId));
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const unsub = subscribeSingleSession(sessionId, (data) => {
      if (data) {
        setSession(data);
        setNotFound(false);
        try {
          sessionStorage.setItem(`qm_spec_${sessionId}`, JSON.stringify(data));
        } catch {}
      } else {
        if (!session) setNotFound(true);
      }
      setLoading(false);
      setLastUpdated(new Date());
    });

    return () => unsub();
  }, [sessionId]);

  const isDisconnected = session?.lastHeartbeatAt?.toDate
    ? (Date.now() - session.lastHeartbeatAt.toDate().getTime()) > 30000
    : session?.lastHeartbeatAt
      ? (Date.now() - new Date(session.lastHeartbeatAt).getTime()) > 30000
      : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
          <p className="font-bold text-slate-400">
            Đang kết nối giám sát phiên thi <code className="text-blue-400 font-mono">{sessionId}</code>...
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold mb-2">Không tìm thấy phiên thi</h2>
        <p className="text-slate-400 text-sm mb-4">
          Mã phiên <code className="text-amber-400 font-mono">{sessionId}</code> không tồn tại hoặc đã kết thúc.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="font-bold text-sm text-blue-400 hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
      </div>
    );
  }

  const answeredGrid = session.answeredGrid || {};
  const totalQ = session.totalQuestions || 0;
  const answeredCount = session.answeredCount || 0;
  const warnings = session.warningCount || (session.violations?.length || 0);
  const percent = totalQ > 0 ? Math.min(100, Math.round((answeredCount / totalQ) * 100)) : 0;
  const isTerminated = session.status === 'terminated';
  const isSubmitted = session.status === 'submitted';

  const statusLabel = isTerminated
    ? { text: '🔒 Đã khóa', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/40' }
    : isSubmitted
      ? { text: '✅ Đã nộp', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/40' }
      : isDisconnected
        ? { text: '📡 Mất kết nối', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40' }
        : { text: '🟢 Đang làm bài', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Spectator Top Banner */}
      <div className="bg-blue-950/80 border-b border-blue-800/60 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-300 font-black text-sm">
            <Eye className="h-5 w-5 animate-pulse" />
            <span>GIÁM THỊ XEM TRỰC TIẾP (SPECTATOR)</span>
          </div>
          <span className="text-[10px] font-bold bg-blue-900/60 border border-blue-700/50 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Chỉ xem (Read-Only)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            {isDisconnected
              ? <WifiOff className="h-3.5 w-3.5 text-slate-500" />
              : <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            }
            {lastUpdated
              ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN')}`
              : 'Đang đồng bộ...'
            }
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-5 max-w-5xl mx-auto w-full">
        {/* Session Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row gap-5 justify-between shadow-xl">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black text-white">
                {session.studentName || session.userId || 'Học sinh'}
              </h1>
              <span className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-0.5 rounded-full ${statusLabel.cls}`}>
                {statusLabel.text}
              </span>
              {warnings > 0 && (
                <span className="text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> {warnings} vi phạm
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm font-medium truncate">{session.examTitle || 'Bài thi'}</p>
            <p className="text-xs font-mono text-slate-500">
              Mã phiên: <span className="text-slate-400">{sessionId}</span>
            </p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-3xl font-black text-blue-400 font-mono">{formatSeconds(session.timeLeft)}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" /> Thời gian còn
              </div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">{answeredCount}<span className="text-slate-600 text-xl">/{totalQ}</span></div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Câu đã làm</div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <div className="text-3xl font-black text-amber-400">{warnings}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 flex items-center gap-1 justify-center">
                <ShieldAlert className="h-3 w-3" /> Cảnh báo
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-400">Tiến độ bài thi</span>
            <span className={`font-black ${percent >= 80 ? 'text-emerald-400' : percent >= 40 ? 'text-blue-400' : 'text-slate-400'}`}>
              {percent}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background: percent >= 80
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : percent >= 40
                    ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                    : 'linear-gradient(90deg, #475569, #64748b)'
              }}
            />
          </div>
          {session.currentQuestion && (
            <p className="text-xs text-slate-500 font-medium">
              Thí sinh đang xem câu số <strong className="text-blue-400">#{session.currentQuestion}</strong>
            </p>
          )}
        </div>

        {/* Answer Grid */}
        {totalQ > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Ma Trận Câu Hỏi ({totalQ} câu)
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalQ }, (_, i) => {
                const q = i + 1;
                const status = answeredGrid[q];
                const isCurrent = session.currentQuestion === q;
                let cls = 'bg-slate-800/80 border-slate-700/60 text-slate-500';
                if (status === 'answered') cls = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 font-bold';
                if (status === 'flagged')  cls = 'bg-amber-500/20 border-amber-500/60 text-amber-400 font-bold';
                if (isCurrent) cls = 'bg-blue-500/30 border-blue-400 text-blue-300 font-black ring-2 ring-blue-400/40 scale-105';
                return (
                  <div
                    key={q}
                    className={`w-9 h-9 rounded-xl border text-xs flex items-center justify-center transition-all ${cls}`}
                  >
                    {q}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-5 text-xs font-semibold text-slate-400 pt-2 border-t border-slate-800 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block" /> Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50 inline-block" /> Đã cắm cờ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-400 ring-1 ring-blue-400/30 inline-block" /> Đang xem
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" /> Chưa trả lời
              </span>
            </div>
          </div>
        )}

        {/* Violations / Action logs */}
        {session.violations?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Lịch Sử Vi Phạm Quy Chế ({session.violations.length})
            </h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {session.violations.map((v, i) => (
                <div key={i} className="flex gap-3 text-xs py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 font-mono shrink-0">
                    {v.time || (v.timestamp ? new Date(v.timestamp).toLocaleTimeString('vi-VN') : '—')}
                  </span>
                  <span className="text-rose-300 font-medium">{v.type || v.reason || 'Vi phạm phát hiện bởi Anti-Cheat'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
