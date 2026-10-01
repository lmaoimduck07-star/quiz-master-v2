import React from 'react';
import { Card, CardContent } from '../../../common/Card';
import { Flag } from 'lucide-react';

export function QuestionPalette({
  totalQuestions,
  currentIndex,
  onSelectQuestion,
  answers = {},
  flagged = {},
}) {
  const isValidAnswer = (val) => {
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return true;
  };

  const answeredCount = Object.keys(answers).filter(k => isValidAnswer(answers[k])).length;

  return (
    <Card className="shadow-sm sticky top-20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Câu hỏi
          </h4>
          <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
            {answeredCount}/{totalQuestions} đã làm
          </span>
        </div>

        {/* Grid numbers */}
        <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto p-1">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const isCurrent = currentIndex === i;
            const isAnswered = isValidAnswer(answers[i]);
            const isFlag = !!flagged[i];

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectQuestion(i)}
                className={`relative h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'ring-2 ring-brand-500 ring-offset-1 bg-brand-600 text-white shadow-sm'
                    : isAnswered
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{i + 1}</span>
                {isFlag && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
            <span>Đã làm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700 shrink-0" />
            <span>Chưa làm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md ring-2 ring-brand-500 bg-brand-600 shrink-0" />
            <span>Đang chọn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
            <span>Đặt cờ</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
