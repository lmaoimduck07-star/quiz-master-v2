import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Filter, RotateCcw,
  Trophy, Clock, Check, X, BookOpen, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { formatSeconds } from '@/utils/helpers';

export default function PracticeReview() {
  const navigate = useNavigate();
  const location = useLocation();

  const result = location.state?.result;
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'wrong'

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold mb-2">Không tìm thấy dữ liệu kết quả thi</h2>
        <p className="text-slate-400 text-xs mb-6 max-w-sm">
          Bài thi có thể chưa được hoàn tất hoặc dữ liệu đã hết hạn hiển thị.
        </p>
        <Button onClick={() => navigate('/client/dashboard')} variant="primary">
          Quay về Trang chủ
        </Button>
      </div>
    );
  }

  const {
    examTitle = 'Bài thi trắc nghiệm',
    score = 0,
    correctCount = 0,
    totalQuestions = 0,
    submitReason = 'Đã nộp bài',
    questionDetails = [],
    timeTaken = 0,
    mode = 'practice',
  } = result;

  const isPassed = score >= 5;
  const wrongCount = totalQuestions - correctCount;

  const filteredItems = questionDetails.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'wrong') return !item.isCorrect;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/client/dashboard')}
            icon={ArrowLeft}
          >
            Trang chủ
          </Button>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kết Quả & Xem Lại Bài Làm
            </span>
            <h1 className="text-base font-black text-slate-900 dark:text-white truncate">
              {examTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/client/dashboard')}
            icon={RotateCcw}
          >
            Làm bài khác
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Score Overview Banner */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div
                className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg ${
                  isPassed
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-rose-500 text-white shadow-rose-500/30'
                }`}
              >
                <span className="text-3xl leading-none">{typeof score === 'number' ? score.toFixed(1) : score}</span>
                <span className="text-[10px] uppercase font-bold opacity-80 mt-0.5">/ 10 điểm</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isPassed ? 'Chúc mừng bạn đã đạt!' : 'Chưa đạt yêu cầu!'}
                  </h2>
                  <Badge variant={isPassed ? 'success' : 'danger'}>
                    {isPassed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lý do nộp: {submitReason} • Chế độ: {mode === 'simulation' ? 'Khảo thí' : 'Luyện tập'}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6">
              <div className="text-center">
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {correctCount}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Câu đúng
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-rose-500">
                  {wrongCount}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Câu sai
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-blue-500 font-mono">
                  {formatSeconds(timeTaken)}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Thời gian
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Controls */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              Tất cả ({questionDetails.length})
            </Button>
            <Button
              variant={filter === 'correct' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('correct')}
              className="text-xs"
            >
              Câu đúng ({correctCount})
            </Button>
            <Button
              variant={filter === 'wrong' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('wrong')}
              className="text-xs text-rose-500"
            >
              Câu sai ({wrongCount})
            </Button>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Hiển thị {filteredItems.length} câu
          </span>
        </div>

        {/* Question Details List */}
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const { question = {}, studentAnswer, isCorrect } = item;
            const options = question.options || [];
            const qText = question.content || question.question || question.text || `Câu hỏi ${idx + 1}`;
            const correctAns = question.correctAnswer;

            return (
              <Card
                key={question.id || idx}
                className={`border-l-4 transition ${
                  isCorrect
                    ? 'border-l-emerald-500'
                    : 'border-l-rose-500'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Câu {idx + 1}
                      </span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Chính xác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
                          <XCircle className="h-4 w-4" /> Chưa chính xác
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                    {qText}
                  </p>

                  {/* Options List */}
                  {options.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {options.map((opt, optIdx) => {
                        const optText = typeof opt === 'string' ? opt : opt.text;
                        const isStudentChoice = Number(studentAnswer) === optIdx;
                        const isTheCorrectAnswer = Number(correctAns) === optIdx;

                        let optCls = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400';
                        if (isTheCorrectAnswer) {
                          optCls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold';
                        } else if (isStudentChoice && !isCorrect) {
                          optCls = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${optCls}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-white/80 dark:bg-slate-800 font-black flex items-center justify-center text-[11px] shrink-0 border border-slate-200 dark:border-slate-700">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{optText}</span>
                            </div>

                            <div>
                              {isTheCorrectAnswer && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                                  <Check className="h-3 w-3" /> Đáp án đúng
                                </span>
                              )}
                              {isStudentChoice && !isTheCorrectAnswer && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                                  <X className="h-3 w-3" /> Bạn đã chọn
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation if available */}
                  {question.explanation && (
                    <div className="p-3 bg-brand-50/60 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/60 rounded-xl text-xs text-brand-800 dark:text-brand-300">
                      <strong>Giải thích: </strong> {question.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
