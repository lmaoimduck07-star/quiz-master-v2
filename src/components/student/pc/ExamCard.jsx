import React from 'react';
import { Clock, FileText, Play, Lock } from 'lucide-react';
import { Card, CardContent } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';

export function ExamCard({ exam, onSelect }) {
  const isLocked = !!exam.isLocked;
  const timeMin = exam.config?.time || 15;
  const count = exam.questionCount || 0;
  const title = exam.title || exam.config?.title || 'Đề thi trắc nghiệm';

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {exam.code || exam.id}
            </span>
            {isLocked ? (
              <Badge variant="danger">Khóa</Badge>
            ) : (
              <Badge variant="success">Khả dụng</Badge>
            )}
          </div>

          <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
            {title}
          </h4>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium pt-1">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {count} câu hỏi
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeMin} phút
            </span>
          </div>
        </div>

        <Button
          variant={isLocked ? 'outline' : 'primary'}
          disabled={isLocked || count === 0}
          onClick={() => onSelect(exam)}
          icon={isLocked ? Lock : Play}
          className="w-full text-xs font-bold"
        >
          {isLocked ? 'Đề thi đang khóa' : count === 0 ? 'Chưa có câu hỏi' : 'Bắt đầu làm bài'}
        </Button>
      </CardContent>
    </Card>
  );
}
