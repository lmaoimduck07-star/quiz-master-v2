import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { BookOpen, ShieldAlert, Sparkles, Clock, Check } from 'lucide-react';

export function PracticeModeModal({ isOpen, onClose, exam, onSelectMode }) {
  if (!exam) return null;

  const durationMin = exam.config?.time || 15;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn chế độ bắt đầu thi"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Bài thi: <strong className="text-slate-800 dark:text-slate-200">{exam.title || exam.config?.title}</strong> ({exam.questionCount || 0} câu hỏi)
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Mode 1: Luyện tập tự do */}
          <div
            onClick={() => onSelectMode('practice')}
            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 transition">
                  Luyện Tập Tự Do
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                Phù hợp ôn tập
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-10 leading-relaxed">
              Không yêu cầu toàn màn hình, không kích hoạt anti-cheat. Tự do ôn luyện theo tốc độ của bạn.
            </p>
          </div>

          {/* Mode 2: Thi mô phỏng (Simulation) */}
          <div
            onClick={() => onSelectMode('simulation')}
            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-500 cursor-pointer transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 transition">
                  Thi Mô Phỏng (Simulation)
                </span>
              </div>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                Chuẩn phòng thi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-10 leading-relaxed">
              Bắt buộc toàn màn hình, đếm ngược {durationMin} phút, bật hệ thống giám sát chống gian lận. Rời tab quá 3 lần sẽ tự động nộp bài.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
