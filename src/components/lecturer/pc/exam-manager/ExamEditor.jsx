import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus, Upload, Trash2, Edit, CheckCircle, Check,
  Clock, Shield, Settings, Shuffle
} from 'lucide-react';
import { Button } from '../../../common/Button';
import { Card, CardContent } from '../../../common/Card';
import { Input } from '../../../common/Input';
import { QuestionModal } from './QuestionModal';
import { QuestionForms } from './QuestionForms';
import WordImportModal from './WordImportModal';
import { getExam, loadQuestions } from '../../../../services/db/examService';

const TYPE_LABELS = {
  single:           'Trắc nghiệm',
  multiselect:      'Nhiều đáp án',
  fill:             'Điền từ',
  truefalse:        'Đúng / Sai',
  multitruefalse:   'Đúng/Sai nhiều phát biểu',
  order:            'Sắp xếp',
  drag:             'Ghép cặp',
  groupdrag:        'Phân loại nhóm',
  clozedrag:        'Kéo vào đoạn văn',
};

export function ExamEditor({ subject, examId, onBack, onSaveExam }) {
  const [config, setConfig] = useState({
    title: `Đề thi - ${subject?.name || 'Môn học'}`,
    time: 15, // phút
    password: '',
    shuffleQ: true,
    shuffleA: true,
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isWordImportOpen, setIsWordImportOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  useEffect(() => {
    if (examId && examId !== 'new') {
      setLoading(true);
      async function fetchData() {
        try {
          const ex = await getExam(examId);
          if (ex) {
            setConfig(prev => ({
              ...prev,
              ...(ex.config || {}),
              title: ex.title || ex.config?.title || prev.title,
            }));
          }
          const qs = await loadQuestions(examId);
          if (qs) setQuestions(qs);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    }
  }, [examId]);

  const handleSave = () => {
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi!');
      return;
    }
    if (!config.title.trim()) {
      alert('Vui lòng nhập tiêu đề đề thi!');
      return;
    }
    onSaveExam(examId === 'new' ? null : examId, config, questions);
  };

  const handleAddQuestion = (newQ) => {
    if (editingQuestionIndex !== null) {
      const updated = [...questions];
      updated[editingQuestionIndex] = newQ;
      setQuestions(updated);
      setEditingQuestionIndex(null);
    } else {
      setQuestions([...questions, newQ]);
    }
  };

  const handleWordImport = (importedQs) => {
    if (importedQs && importedQs.length > 0) {
      setQuestions(prev => [...prev, ...importedQs]);
    }
  };

  const handleDeleteQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Modals */}
      <WordImportModal
        isOpen={isWordImportOpen}
        onClose={() => setIsWordImportOpen(false)}
        onImport={handleWordImport}
      />

      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestionIndex(null);
        }}
        onSave={handleAddQuestion}
        editingQuestion={editingQuestionIndex !== null ? questions[editingQuestionIndex] : null}
      />

      {/* Taskbar Cố Định 100% Trên Đỉnh Màn Hình (Fixed - Không bao giờ lăn đi khi cuộn) */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 shadow-sm flex items-center">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={onBack} icon={ArrowLeft} className="rounded-xl shrink-0">
              Quay lại
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                  {examId === 'new' ? 'Tạo Đề Thi Mới' : 'Biên Soạn Đề Thi'}
                </h2>
                <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full shrink-0">
                  {questions.length} câu
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{subject?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWordImportOpen(true)}
              icon={Upload}
              className="rounded-xl font-bold"
            >
              Import Word / AI
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              icon={Save}
              className="shadow-md rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white"
            >
              Lưu Đề Thi ({questions.length} câu)
            </Button>
          </div>
        </div>
      </header>

      {/* Vùng nội dung cuộn bên dưới - padding-top 20 để không bị che bởi fixed taskbar */}
      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Configuration Box */}
          <Card>
            <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Settings className="h-4 w-4 text-brand-600" />
            <span>Cấu hình đề thi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Tiêu đề đề thi *"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="VD: Đề thi giữa kỳ môn Lập trình Web..."
              />
            </div>

            <div>
              <Input
                label="Thời gian thi (phút)"
                type="number"
                value={config.time}
                onChange={(e) => setConfig({ ...config, time: parseInt(e.target.value, 10) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.shuffleQ}
                onChange={(e) => setConfig({ ...config, shuffleQ: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <Shuffle className="h-3.5 w-3.5" />
              <span>Xáo trộn thứ tự câu hỏi</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.shuffleA}
                onChange={(e) => setConfig({ ...config, shuffleA: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <Shuffle className="h-3.5 w-3.5" />
              <span>Xáo trộn đáp án</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Bảng nhập câu hỏi trực tiếp để thao tác nhanh & thuận tiện */}
      <QuestionForms onAddQuestion={handleAddQuestion} />

      {/* Questions Header */}
      <div className="flex justify-between items-center pt-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Ngân hàng câu hỏi trong đề ({questions.length})
        </h3>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingQuestionIndex(null);
              setIsQuestionModalOpen(true);
            }}
            icon={Plus}
          >
            Thêm câu hỏi thủ công
          </Button>
        </div>
      </div>

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-8">
          Chưa có câu hỏi nào. Bạn có thể nhấn <strong>Import Word / AI</strong> để tải file đề có sẵn hoặc <strong>Thêm câu hỏi thủ công</strong>.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const content = q.content || q.question || '';
            const opts = q.options || [];
            const ans = q.answer !== undefined ? q.answer : q.correct;
            const qType = q.type || 'single';
            const typeLabel = TYPE_LABELS[qType] || qType;

            return (
              <Card key={idx} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full">
                        {typeLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        • Trọng số: {q.points || 1}
                      </span>
                    </div>

                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed pl-8">
                      {content}
                    </p>

                    {q.image && (
                      <div className="pl-8 pt-1">
                        <img
                          src={q.image}
                          alt={`Ảnh câu ${idx + 1}`}
                          className="max-h-48 rounded-xl border border-slate-200 dark:border-slate-800 object-contain shadow-sm"
                        />
                      </div>
                    )}

                    {/* Render theo từng loại câu hỏi */}
                    {qType === 'single' && opts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-8 text-xs">
                        {opts.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              ans === oIdx
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                              <span className="truncate">{opt}</span>
                            </div>
                            {ans === oIdx && <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {qType === 'multiselect' && opts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-8 text-xs">
                        {opts.map((opt, oIdx) => {
                          const isCorrect = (q.corrects || []).includes(oIdx);
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                              {isCorrect && <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qType === 'fill' && (
                      <div className="pl-8 text-xs">
                        <span className="text-slate-400 font-semibold">Đáp án cần điền:</span>{' '}
                        <strong className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                          {q.answer || (q.answers || [])[0]}
                        </strong>
                      </div>
                    )}

                    {qType === 'truefalse' && (
                      <div className="pl-8 text-xs flex items-center gap-2">
                        <span className="text-slate-400 font-semibold">Đáp án:</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                          q.correct
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}>
                          {q.correct ? 'ĐÚNG' : 'SAI'}
                        </span>
                      </div>
                    )}

                    {qType === 'drag' && (q.pairs || []).length > 0 && (
                      <div className="pl-8 space-y-1 text-xs">
                        {(q.pairs || []).map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              {p.left}
                            </span>
                            <span className="text-slate-400 font-bold">➔</span>
                            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold">
                              {p.right}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {qType === 'groupdrag' && (q.groups || []).length > 0 && (
                      <div className="pl-8 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {(q.groups || []).map((g, gIdx) => (
                          <div key={gIdx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                            <div className="font-bold text-brand-600 dark:text-brand-400 text-[11px] border-b border-slate-200 dark:border-slate-700 pb-1">
                              {g.name}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(g.items || []).map((it, itIdx) => (
                                <span key={itIdx} className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px]">
                                  {it}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {qType === 'order' && (q.items || []).length > 0 && (
                      <div className="pl-8 space-y-1 text-xs">
                        {(q.items || []).map((it, itIdx) => (
                          <div key={itIdx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-[10px] flex items-center justify-center">
                              {itIdx + 1}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{it}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {qType === 'multitruefalse' && (q.statements || []).length > 0 && (
                      <div className="pl-8 space-y-1 text-xs">
                        {(q.statements || []).map((st, stIdx) => (
                          <div key={stIdx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                            <span className="text-slate-700 dark:text-slate-300">{st.text}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.correct
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}>
                              {st.correct ? 'Đúng' : 'Sai'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingQuestionIndex(idx);
                        setIsQuestionModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-brand-500 rounded-xl transition"
                      title="Sửa câu hỏi"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
