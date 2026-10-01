import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Trash2, ArrowRight, Pencil } from 'lucide-react';
import { Button } from '../../../common/Button';
import { loadExams } from '../../../../services/db/examService';

export function SubjectCard({ subject, onDelete, onOpen, onUpdate }) {
  const [examsCount, setExamsCount] = useState(0);

  useEffect(() => {
    async function fetchCounts() {
      if (subject?.id) {
        const exams = await loadExams(subject.id);
        setExamsCount(exams.length);
      }
    }
    fetchCounts();
  }, [subject.id]);

  const handleRenameSubject = (e) => {
    e.stopPropagation();
    const newName = prompt('Nhập tên mới cho môn học này:', subject.name);
    if (newName !== null && newName.trim() !== '' && newName.trim() !== subject.name) {
      onUpdate({ ...subject, name: newName.trim() });
    }
  };

  return (
    <div className="relative flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition hover:shadow-md">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
          <BookOpen className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              {subject.name}
            </h3>
            {subject.code && (
              <span className="text-[10px] font-black font-mono bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800/50">
                {subject.code}
              </span>
            )}
            <button
              type="button"
              onClick={handleRenameSubject}
              className="text-slate-400 hover:text-brand-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Đổi tên môn học"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {examsCount} Đề thi trắc nghiệm
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="primary"
          onClick={() => onOpen(subject)}
          icon={ArrowRight}
          className="h-10 px-4 text-xs font-bold"
        >
          Quản lý đề thi
        </Button>

        <button
          onClick={() => onDelete(subject.id)}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
          title="Xóa môn học"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
