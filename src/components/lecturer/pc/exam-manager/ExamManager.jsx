import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, FileText, Clock, Play, Edit, Trash2, Lock, Unlock,
  CheckCircle, AlertTriangle
} from 'lucide-react';
import { Button } from '../../../common/Button';
import { Card, CardContent } from '../../../common/Card';
import { Badge } from '../../../common/Badge';
import {
  subscribeExams,
  deleteExam,
  saveExam
} from '../../../../services/db/examService';

export function ExamManager({ subject, onBack, onOpenEditor, onPlayExam }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subject?.id) return;
    const unsub = subscribeExams(subject.id, (list) => {
      setExams(list || []);
      setLoading(false);
    });
    return () => unsub();
  }, [subject?.id]);

  const handleDelete = async (examId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      await deleteExam(examId);
    }
  };

  const handleToggleLock = async (exam) => {
    const isLocked = !exam.isLocked;
    await saveExam({ ...exam, isLocked });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} icon={ArrowLeft}>
            Quay lại
          </Button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{subject?.name}</span>
              {subject?.code && (
                <span className="text-xs font-mono font-bold bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-lg">
                  {subject.code}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Danh sách các đề thi trắc nghiệm</p>
          </div>
        </div>

        <Button
          onClick={() => onOpenEditor('new')}
          icon={Plus}
          className="shadow-md"
        >
          Tạo Đề Thi Mới
        </Button>
      </div>

      {/* Exams list */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Đang tải danh sách đề thi...</div>
      ) : exams.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          Môn học này chưa có đề thi nào. Nhấn <strong>Tạo Đề Thi Mới</strong> để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => {
            const title = exam.title || exam.config?.title || 'Đề thi';
            const count = exam.questionCount || 0;
            const timeMin = exam.config?.time || 15;
            const isLocked = !!exam.isLocked;

            return (
              <Card key={exam.id} className="hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                        {title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                        <span>{exam.code || exam.id}</span>
                        <span>•</span>
                        <span>{count} câu hỏi</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeMin} phút
                        </span>
                      </div>
                    </div>

                    {isLocked ? (
                      <Badge variant="danger">Đã khóa</Badge>
                    ) : (
                      <Badge variant="success">Hoạt động</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onPlayExam && onPlayExam(exam.id)}
                        icon={Play}
                      >
                        Thi thử
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenEditor(exam.id)}
                        icon={Edit}
                      >
                        Soạn đề
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleLock(exam)}
                        className={`p-2 rounded-xl transition ${
                          isLocked ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isLocked ? 'Mở khóa đề thi' : 'Khóa đề thi'}
                      >
                        {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                        title="Xóa đề thi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
