import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, Shuffle,
  HelpCircle, Check, X, BookOpen, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { loadSubjects, loadExams, loadQuestions } from '@/services/db/examService';
import { useAuth } from '@/context/AuthContext';
import { saveMistakes } from '@/utils/mistakeManager';

export default function InstantPractice() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    loadSubjects().then((subs) => {
      setSubjects(subs || []);
      if (subs?.length > 0) {
        setSelectedSubjectId(subs[0].id);
      }
    });
  }, []);

  const handleStartPractice = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    try {
      const exams = await loadExams(selectedSubjectId);
      const allQs = [];
      for (const ex of exams) {
        const qs = await loadQuestions(ex.id);
        if (qs?.length) {
          allQs.push(...qs.map((q) => ({ ...q, examId: ex.id })));
        }
      }

      // Shuffle questions
      const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, 30);
      setQuestions(shuffled);
      setCurrentIndex(0);
      setSelectedOption(null);
      setHasAnswered(false);
      setStats({ correct: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIdx) => {
    if (hasAnswered) return;
    setSelectedOption(optionIdx);
    setHasAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = Number(optionIdx) === Number(currentQ.correctAnswer);

    setStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    const uid = currentUser?.uid || currentUser?.id;
    if (!isCorrect && uid) {
      saveMistakes(uid, selectedSubjectId, [currentQ], currentQ.examId);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Header */}
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
              Luyện Tập Tốc Độ & Phản Hồi Tức Thì
            </span>
            <h1 className="text-base font-black text-slate-900 dark:text-white">
              Instant Practice
            </h1>
          </div>
        </div>

        {questions.length > 0 && (
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">
              Đúng: {stats.correct}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 dark:text-slate-300">
              Đã làm: {stats.total}
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {questions.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-lg text-center p-8 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
              <Shuffle className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Khởi tạo bài luyện tức thì
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Hệ thống sẽ lấy ngẫu nhiên các câu hỏi từ ngân hàng đề của môn học đã chọn. Sau mỗi câu chọn, đáp án đúng và giải thích sẽ hiện ra ngay lập tức.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
                Chọn môn học
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code || sub.id})
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                onClick={handleStartPractice}
                loading={loading}
                className="w-full mt-2"
                icon={Shuffle}
              >
                Bắt đầu luyện ngay
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
              <CardContent className="p-6 space-y-5">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">
                    Câu hỏi {currentIndex + 1} / {questions.length}
                  </span>
                  <Badge variant="brand">
                    {currentQ.type === 'multiselect' ? 'Chọn nhiều' : 'Chọn 1 đáp án'}
                  </Badge>
                </div>

                {/* Content */}
                <p className="font-bold text-base text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.content || currentQ.question || currentQ.text}
                </p>

                {/* Options */}
                <div className="space-y-2.5 pt-2">
                  {(currentQ.options || []).map((opt, idx) => {
                    const optText = typeof opt === 'string' ? opt : opt.text;
                    const isSelected = selectedOption === idx;
                    const isCorrect = Number(currentQ.correctAnswer) === idx;

                    let btnCls = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 text-slate-700 dark:text-slate-300';

                    if (hasAnswered) {
                      if (isCorrect) {
                        btnCls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold';
                      } else if (isSelected) {
                        btnCls = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold';
                      } else {
                        btnCls = 'border-slate-200 dark:border-slate-800 opacity-60 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={hasAnswered}
                        onClick={() => handleAnswer(idx)}
                        className={`w-full p-4 rounded-2xl border text-xs sm:text-sm text-left flex items-center justify-between transition-all ${btnCls}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 font-black flex items-center justify-center text-xs shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{optText}</span>
                        </div>

                        {hasAnswered && isCorrect && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 text-xs">
                            <Check className="h-4 w-4" /> Chính xác
                          </span>
                        )}
                        {hasAnswered && isSelected && !isCorrect && (
                          <span className="text-rose-500 font-black flex items-center gap-1 text-xs">
                            <X className="h-4 w-4" /> Sai
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {hasAnswered && currentQ.explanation && (
                  <div className="p-4 bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/60 rounded-2xl text-xs text-brand-900 dark:text-brand-200 mt-4 leading-relaxed">
                    <strong>Giải thích chi tiết: </strong> {currentQ.explanation}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Controls */}
            {hasAnswered && (
              <div className="flex justify-end">
                {currentIndex < questions.length - 1 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Câu tiếp theo
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => navigate('/client/dashboard')}>
                    Hoàn tất ôn luyện
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
