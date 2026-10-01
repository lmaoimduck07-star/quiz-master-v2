import React from 'react';
import { Clock, Shield, AlertTriangle, Send, LogOut } from 'lucide-react';
import { Button } from '../../../common/Button';
import { Badge } from '../../../common/Badge';

export function ExamHeader({
  title,
  subjectName,
  formattedTime,
  isWarning,
  isDanger,
  mode = 'practice',
  violationsCount = 0,
  onSubmit,
  isSubmitting = false
}) {
  const isSimulation = mode === 'simulation';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-sm flex items-center justify-between transition-colors">
      {/* Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-slate-900 dark:text-white truncate">
              {title || 'Phòng Thi Trực Tuyến'}
            </h1>
            {isSimulation ? (
              <Badge variant="danger" className="shrink-0">
                🎯 Khảo thí (Anti-cheat)
              </Badge>
            ) : (
              <Badge variant="brand" className="shrink-0">
                📚 Luyện tập
              </Badge>
            )}
          </div>
          {subjectName && (
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              Học phần: {subjectName}
            </p>
          )}
        </div>
      </div>

      {/* Center: Timer */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-mono font-black text-base shadow-inner transition-colors ${
            isDanger
              ? 'bg-red-500 text-white border-red-600 animate-pulse'
              : isWarning
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>{formattedTime}</span>
        </div>

        {/* Violations badge if simulation */}
        {isSimulation && violationsCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>Vi phạm: {violationsCount}/3</span>
          </div>
        )}
      </div>

      {/* Right: Submit button */}
      <div>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={isSubmitting}
          icon={Send}
          className="shadow-md shadow-brand-500/20"
        >
          Nộp Bài
        </Button>
      </div>
    </header>
  );
}
