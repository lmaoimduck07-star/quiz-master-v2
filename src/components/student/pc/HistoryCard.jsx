import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../../common/Card';
import { Button } from '../../common/Button';
import { formatDateTime } from '../../../utils/helpers';

export function HistoryCard({ result }) {
  const navigate = useNavigate();
  const isAbandoned = result.isAbandoned || result.status === 'abandoned';
  const score = result.score ?? 0;
  const isPassed = !isAbandoned && score >= 5;

  const handleReview = () => {
    navigate('/client/review', { state: { result } });
  };

  return (
    <Card className="hover:shadow-md transition">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
              isAbandoned
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs'
                : isPassed
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
            }`}
          >
            {isAbandoned ? '0.0' : (typeof score === 'number' ? score.toFixed(1) : score)}
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {result.examTitle || result.title || 'Bài thi trắc nghiệm'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-medium">
              {isAbandoned ? (
                <span className="text-rose-500 font-bold">🚫 Đã bỏ thi (Tải lại / thoát trang)</span>
              ) : (
                <span>{result.correctCount ?? 0}/{result.totalQuestions ?? 0} câu đúng</span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(result.submittedAt)}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReview}
          icon={ArrowRight}
          className="text-xs shrink-0"
        >
          Xem lại
        </Button>
      </CardContent>
    </Card>
  );
}
