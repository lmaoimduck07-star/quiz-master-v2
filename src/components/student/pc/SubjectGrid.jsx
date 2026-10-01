import React from 'react';
import { BookOpen, ChevronRight, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../common/Card';

export function SubjectGrid({ subjects = [], selectedSubject, onSelectSubject }) {
  if (subjects.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        Chưa có môn học nào được công bố.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {subjects.map((sub) => {
        const isSelected = selectedSubject?.id === sub.id;

        return (
          <div
            key={sub.id}
            onClick={() => onSelectSubject(sub)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              isSelected
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm ring-1 ring-brand-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 transition ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 group-hover:bg-brand-100'
                }`}
              >
                <BookOpen className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {sub.name}
                </h4>
                <p className="text-[11px] font-mono text-slate-400 uppercase mt-0.5">
                  {sub.code || sub.id}
                </p>
              </div>
            </div>

            <ChevronRight
              className={`h-4 w-4 shrink-0 transition ${
                isSelected ? 'text-brand-600' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
