import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '../../../common/Button';
import { Input } from '../../../common/Input';
import { SubjectCard } from './SubjectCard';
import { generateSubjectCode } from '../../../../services/db/examService';

export function SubjectManager({ subjects, onAddSubject, onDeleteSubject, onOpenSubject, onUpdateSubject }) {
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');

  const handleCreate = () => {
    if (!subName.trim()) {
      alert('Vui lòng nhập tên môn học!');
      return;
    }

    const finalCode = subCode.trim() ? subCode.trim().toUpperCase() : generateSubjectCode(subName);

    onAddSubject({
      id: 'sub_' + finalCode.toLowerCase(),
      code: finalCode,
      name: subName.trim(),
      isCompleted: false,
    });

    setSubName('');
    setSubCode('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Banner */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-4 rounded-3xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 mb-2">
          <BookOpen className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          QUẢN LÝ HỌC PHẦN & ĐỀ THI
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md">
          Toàn quyền khởi tạo môn học, cấu hình bộ đề và nhập ngân hàng câu hỏi
        </p>
      </div>

      {/* Tạo môn mới */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Nhập tên môn học mới (VD: Lập trình Web, Hệ điều hành...)"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="h-11"
          />
          <Input
            type="text"
            placeholder={`Mã môn (${generateSubjectCode(subName) || 'TỰ ĐỘNG'})`}
            value={subCode}
            onChange={(e) => setSubCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="sm:w-44 h-11 uppercase font-mono font-bold"
          />
        </div>

        <Button
          onClick={handleCreate}
          icon={Plus}
          className="h-11 w-full sm:w-auto px-6 whitespace-nowrap"
        >
          Thêm Môn
        </Button>
      </div>

      {/* Danh sách môn học */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Danh sách môn học ({subjects.length})
          </h3>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs font-semibold">
            Chưa có môn học nào. Nhập tên môn học phía trên để bắt đầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {subjects.map((sub) => (
              <SubjectCard
                key={sub.id}
                subject={sub}
                onDelete={onDeleteSubject}
                onOpen={onOpenSubject}
                onUpdate={onUpdateSubject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
