import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Trash2, RotateCcw,
  Sparkles, Check, X, BookOpen, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { subscribeSubjects } from '@/services/db/examService';
import {
  getMistakes,
  removeMistakesByIds,
  clearSubjectMistakes,
  cleanupOrphanMistakes,
  clearAllMistakes
} from '@/utils/mistakeManager';

export default function MistakePractice() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const uid = currentUser?.uid || currentUser?.id;

  // Lắng nghe danh sách môn học còn tồn tại trong hệ thống để lọc và dọn dẹp câu sai mồ côi
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubSubj = subscribeSubjects((subjList) => {
      const activeSubjects = subjList || [];
      setSubjects(activeSubjects);
      const validSubjectIds = activeSubjects.map((s) => s.id);

      // Tự động quét và xóa sạch câu sai thuộc môn đã bị xóa khỏi hệ thống
      cleanupOrphanMistakes(validSubjectIds);

      // Chỉ lấy câu sai thuộc các môn ĐANG TỒN TẠI
      const list = getMistakes(uid, validSubjectIds);
      setMistakes(list || []);
      setLoading(false);
    });

    return () => unsubSubj();
  }, [uid]);

  const currentQ = mistakes[currentIndex];

  const handleAnswer = (optionIdx) => {
    if (hasAnswered || !currentQ) return;
    setSelectedOption(optionIdx);
    setHasAnswered(true);

    const isCorrect = Number(optionIdx) === Number(currentQ.correctAnswer);

    if (isCorrect && uid) {
      setResolvedCount((prev) => prev + 1);
      // Xóa câu này khỏi sổ tay
      removeMistakesByIds(uid, currentQ.subjectId, [currentQ.id], currentQ.examId);
    }
  };

  const handleNext = () => {
    const validSubjectIds = subjects.map((s) => s.id);
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      // Làm mới danh sách câu sai còn lại
      const updated = getMistakes(uid, validSubjectIds);
      setMistakes(updated || []);
      setCurrentIndex(0);
      setSelectedOption(null);
      setHasAnswered(false);
    }
  };

  // Bỏ qua và xóa câu sai hiện tại khỏi sổ tay
  const handleRemoveCurrent = () => {
    if (!currentQ || !uid) return;
    removeMistakesByIds(uid, currentQ.subjectId, [currentQ.id], currentQ.examId);
    const validSubjectIds = subjects.map((s) => s.id);
    const updated = getMistakes(uid, validSubjectIds);
    setMistakes(updated || []);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
    setSelectedOption(null);
    setHasAnswered(false);
  };

  // Xóa toàn bộ câu sai
  const handleClearAll = () => {
    if (!uid) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ câu sai trong sổ tay không?')) {
      clearAllMistakes(uid);
      setMistakes([]);
      setCurrentIndex(0);
      setSelectedOption(null);
      setHasAnswered(false);
    }
  };

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
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Sổ Tay Câu Sai
            </span>
            <h1 className="text-base font-black text-slate-900 dark:text-white">
              Ôn Luyện & Khắc Phục Câu Sai
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mistakes.length > 0 && (
            <>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl">
                Đã khắc phục: {resolvedCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                icon={Trash2}
              >
                Xóa tất cả
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">Đang tải và đồng bộ sổ tay câu sai...</p>
          </div>
        ) : mistakes.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-lg text-center p-12 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Sổ tay câu sai trống!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Tuyệt vời! Hiện tại bạn không có câu hỏi nào bị làm sai cần khắc phục (hoặc các câu sai thuộc môn đã bị xóa khỏi hệ thống). Hãy tiếp tục luyện tập các đề thi khác!
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => navigate('/client/dashboard')}
              className="mt-4"
            >
              Quay lại làm bài thi
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
              <CardContent className="p-6 space-y-5">
                {/* Header info */}
                <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">
                    Câu sai {currentIndex + 1} / {mistakes.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveCurrent}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition"
                    >
                      Bỏ qua câu này
                    </button>
                    <Badge variant="warning">
                      Cần khắc phục
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <p className="font-bold text-base text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.text || currentQ.content || currentQ.question}
                </p>

                {/* Options */}
                <div className="space-y-2.5 pt-2">
                  {(currentQ.options || []).map((opt, idx) => {
                    const optText = typeof opt === 'string' ? opt : opt.text;
                    const isSelected = selectedOption === idx;
                    const isCorrect = Number(currentQ.correctAnswer) === idx;

                    let btnCls = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 text-slate-700 dark:text-slate-300';

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
                            <Check className="h-4 w-4" /> Đã sửa đúng (+ xóa khỏi sổ)
                          </span>
                        )}
                        {hasAnswered && isSelected && !isCorrect && (
                          <span className="text-rose-500 font-black flex items-center gap-1 text-xs">
                            <X className="h-4 w-4" /> Vẫn chưa chính xác
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {hasAnswered && currentQ.explanation && (
                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 mt-4 leading-relaxed">
                    <strong>Giải thích chi tiết: </strong> {currentQ.explanation}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Controls */}
            {hasAnswered && (
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleNext}>
                  {currentIndex < mistakes.length - 1 ? 'Câu tiếp theo' : 'Hoàn tất lượt ôn'}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
