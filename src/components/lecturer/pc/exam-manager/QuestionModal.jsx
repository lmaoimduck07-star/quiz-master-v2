import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon, Trash2, Plus, Pencil, Save, X, Check,
  AlertTriangle, ArrowUp, ArrowDown, HelpCircle
} from 'lucide-react';
import { Button } from '../../../common/Button';

const QUESTION_TYPES = [
  { id: 'single', label: 'Trắc nghiệm' },
  { id: 'multiselect', label: 'Nhiều đáp án' },
  { id: 'fill', label: 'Điền từ' },
  { id: 'truefalse', label: 'Đúng / Sai' },
  { id: 'multitruefalse', label: 'Đúng/Sai Nhiều Phát Biểu' },
  { id: 'drag', label: 'Ghép cặp 1-1' },
  { id: 'groupdrag', label: 'Phân loại Nhóm' },
  { id: 'clozedrag', label: 'Kéo vào Đoạn văn' },
  { id: 'order', label: 'Sắp xếp' },
];

// OptionEditRow được tách ra ngoài để tránh re-mount làm mất focus
const OptionEditRow = ({
  idx,
  borderClass,
  optImg,
  optionText,
  inputEl,
  onTextChange,
  onPaste,
  onImageClick,
  onRemoveOption,
  onRemoveImage
}) => {
  return (
    <div className={`border rounded-2xl mb-2.5 transition shadow-sm overflow-hidden ${borderClass}`}>
      <div className="flex items-center gap-3 p-3">
        {inputEl}
        <input
          type="text"
          className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 font-semibold text-sm"
          value={(optionText || '').replace(/<[^>]+>/g, '')}
          onChange={(e) => onTextChange(idx, e.target.value)}
          onPaste={(e) => onPaste(e, idx)}
          placeholder={`Nhập đáp án ${idx + 1}... (dán ảnh được)`}
        />
        <button
          type="button"
          title="Đính kèm ảnh cho đáp án này"
          onClick={() => onImageClick(idx)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition shrink-0"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemoveOption(idx)}
          title="Xóa đáp án này"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {optImg && (
        <div className="px-3 pb-3 flex items-start gap-3 border-t border-slate-100 dark:border-slate-800 pt-2 bg-slate-50/50 dark:bg-slate-900/50">
          <img
            src={optImg}
            alt={`Ảnh đáp án ${idx + 1}`}
            className="max-h-28 rounded-xl border border-slate-200 dark:border-slate-700 object-contain shadow-sm"
          />
          <button
            type="button"
            onClick={() => onRemoveImage(idx)}
            className="text-rose-500 hover:text-rose-600 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-lg transition mt-1 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Xóa ảnh
          </button>
        </div>
      )}
    </div>
  );
};

export function QuestionModal({ isOpen, onClose, onSave, editingQuestion, questionData }) {
  const targetData = editingQuestion || questionData;

  const defaultNewQuestion = () => ({
    type: 'single',
    question: '',
    content: '',
    options: ['', '', '', ''],
    optionImages: ['', '', '', ''],
    correct: 0,
    corrects: [0],
    answer: '',
    answers: [],
    pairs: [{ left: '', right: '' }, { left: '', right: '' }],
    groups: [{ name: 'Nhóm 1', items: [] }, { name: 'Nhóm 2', items: [] }],
    items: ['Mục 1', 'Mục 2', 'Mục 3'],
    statements: [{ text: 'Phát biểu 1', correct: true }, { text: 'Phát biểu 2', correct: false }],
    points: 1,
    image: '',
  });

  const [formData, setFormData] = useState(null);

  const questionFileRef = useRef(null);
  const optionFileRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      if (targetData) {
        const cloned = JSON.parse(JSON.stringify(targetData));
        if (cloned.content && !cloned.question) cloned.question = cloned.content;
        if (cloned.question && !cloned.content) cloned.content = cloned.question;
        if (cloned.options && !cloned.optionImages) {
          cloned.optionImages = cloned.options.map(() => '');
        }
        if (cloned.answer !== undefined && cloned.correct === undefined) {
          cloned.correct = cloned.answer;
        }
        if (cloned.correct !== undefined && cloned.answer === undefined) {
          cloned.answer = cloned.correct;
        }
        setFormData(cloned);
      } else {
        setFormData(defaultNewQuestion());
      }
    } else {
      setFormData(null);
    }
  }, [isOpen, targetData]);

  if (!isOpen || !formData) return null;

  // ─── ẢNH: UPLOAD + PASTE ────────────────────────────────────
  const readFileAsDataURL = (file, callback) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => callback(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleQuestionImageUpload = (e) => {
    if (e.target.files?.[0]) {
      readFileAsDataURL(e.target.files[0], (dataUrl) => {
        setFormData(prev => ({ ...prev, image: dataUrl }));
      });
    }
  };

  const handleOptionImageUpload = (e, idx) => {
    if (e.target.files?.[0]) {
      readFileAsDataURL(e.target.files[0], (dataUrl) => {
        setFormData(prev => {
          const imgs = [...(prev.optionImages || prev.options.map(() => ''))];
          imgs[idx] = dataUrl;
          return { ...prev, optionImages: imgs };
        });
      });
    }
  };

  const removeQuestionImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    if (questionFileRef.current) questionFileRef.current.value = '';
  };

  const removeOptionImage = (idx) => {
    setFormData(prev => {
      const imgs = [...(prev.optionImages || prev.options.map(() => ''))];
      imgs[idx] = '';
      return { ...prev, optionImages: imgs };
    });
    if (optionFileRefs.current[idx]) optionFileRefs.current[idx].value = '';
  };

  const handleQuestionPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        readFileAsDataURL(item.getAsFile(), (dataUrl) => {
          setFormData(prev => ({ ...prev, image: dataUrl }));
        });
        break;
      }
    }
  };

  const handleOptionPaste = (e, idx) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        readFileAsDataURL(item.getAsFile(), (dataUrl) => {
          setFormData(prev => {
            const imgs = [...(prev.optionImages || prev.options.map(() => ''))];
            imgs[idx] = dataUrl;
            return { ...prev, optionImages: imgs };
          });
        });
        break;
      }
    }
  };

  // ─── THAY ĐỔI DẠNG CÂU HỎI ─────────────────────────────────
  const handleTypeChange = (newType) => {
    if (newType === formData.type) return;
    if (window.confirm("⚠️ Đổi dạng câu hỏi sẽ làm mới các đáp án. Bạn chắc chứ?")) {
      const newForm = { ...formData, type: newType };
      if (newType === 'single') {
        newForm.options = ['', '', '', ''];
        newForm.optionImages = ['', '', '', ''];
        newForm.correct = 0;
      } else if (newType === 'multiselect') {
        newForm.options = ['', '', '', ''];
        newForm.optionImages = ['', '', '', ''];
        newForm.corrects = [0];
      } else if (newType === 'fill') {
        newForm.answer = '';
        if (!newForm.question.includes('___')) newForm.question += ' ___';
      } else if (newType === 'truefalse') {
        newForm.correct = true;
      } else if (newType === 'drag') {
        newForm.pairs = [{ left: '', right: '' }, { left: '', right: '' }];
      } else if (newType === 'groupdrag') {
        newForm.groups = [{ name: 'Nhóm 1', items: [] }, { name: 'Nhóm 2', items: [] }];
      } else if (newType === 'clozedrag') {
        newForm.answers = [];
        if (!newForm.question.includes('___')) newForm.question += ' ___';
      } else if (newType === 'order') {
        newForm.items = ['', '', ''];
      } else if (newType === 'multitruefalse') {
        newForm.statements = [{ text: '', correct: true }, { text: '', correct: false }];
      }
      setFormData(newForm);
    }
  };

  const handleOptionTextChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSingleCorrectChange = (index) => setFormData({ ...formData, correct: index, answer: index });

  const handleMultiCorrectChange = (index) => {
    let newCorrects = [...(formData.corrects || [])];
    if (newCorrects.includes(index)) {
      newCorrects = newCorrects.filter(i => i !== index);
    } else {
      newCorrects.push(index);
    }
    setFormData({ ...formData, corrects: newCorrects });
  };

  const addOption = () => setFormData({
    ...formData,
    options: [...formData.options, ''],
    optionImages: [...(formData.optionImages || formData.options.map(() => '')), '']
  });

  const removeOption = (index) => {
    if (formData.options.length <= 2) return alert("Cần ít nhất 2 đáp án! (Mã lỗi: QST-11)");
    const newOptions = [...formData.options]; newOptions.splice(index, 1);
    const newImages = [...(formData.optionImages || formData.options.map(() => ''))]; newImages.splice(index, 1);
    if (formData.type === 'single' && formData.correct === index) {
      setFormData({ ...formData, options: newOptions, optionImages: newImages, correct: 0, answer: 0 });
    } else if (formData.type === 'multiselect') {
      const newCorrects = (formData.corrects || []).filter(i => i !== index).map(i => i > index ? i - 1 : i);
      setFormData({ ...formData, options: newOptions, optionImages: newImages, corrects: newCorrects });
    } else {
      setFormData({ ...formData, options: newOptions, optionImages: newImages });
    }
  };

  // ─── SẮP XẾP THỨ TỰ (order) ─────────────────────────────────
  const moveOrderItem = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const arr = [...formData.items];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setFormData({ ...formData, items: arr });
  };

  const moveOrderUp = (idx) => { if (idx > 0) moveOrderItem(idx, idx - 1); };
  const moveOrderDown = (idx) => { if (idx < formData.items.length - 1) moveOrderItem(idx, idx + 1); };

  // ─── DYNAMIC RENDER THEO TỪNG DẠNG CÂU HỎI ─────────────────
  let dynamicBody = null;

  if (formData.type === 'single') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC ĐÁP ÁN (CHỌN Ô TRÒN LÀM ĐÁP ÁN ĐÚNG — CÓ THỂ THÊM ẢNH)
        </label>
        {formData.options.map((_, i) => (
          <input
            key={`file-${i}`}
            type="file"
            accept="image/*"
            className="hidden"
            ref={el => optionFileRefs.current[i] = el}
            onChange={(e) => handleOptionImageUpload(e, i)}
          />
        ))}
        {formData.options.map((opt, i) => (
          <OptionEditRow
            key={i}
            idx={i}
            borderClass={
              formData.correct === i
                ? 'border-2 border-emerald-500 bg-white dark:bg-slate-900'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }
            optionText={formData.options[i]}
            optImg={(formData.optionImages || [])[i]}
            onTextChange={handleOptionTextChange}
            onPaste={handleOptionPaste}
            onImageClick={(idx) => optionFileRefs.current[idx]?.click()}
            onRemoveOption={removeOption}
            onRemoveImage={removeOptionImage}
            inputEl={
              <button
                type="button"
                onClick={() => handleSingleCorrectChange(i)}
                className="shrink-0 cursor-pointer focus:outline-none"
                title="Chọn làm đáp án đúng"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  formData.correct === i
                    ? 'border-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}>
                  {formData.correct === i && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </button>
            }
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={addOption}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm đáp án nữa
        </Button>
      </div>
    );
  } else if (formData.type === 'multiselect') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC ĐÁP ÁN (CHỌN NHIỀU Ô VUÔNG LÀM ĐÁP ÁN ĐÚNG — CÓ THỂ THÊM ẢNH)
        </label>
        {formData.options.map((_, i) => (
          <input
            key={`file-${i}`}
            type="file"
            accept="image/*"
            className="hidden"
            ref={el => optionFileRefs.current[i] = el}
            onChange={(e) => handleOptionImageUpload(e, i)}
          />
        ))}
        {formData.options.map((opt, i) => {
          const isChecked = (formData.corrects || []).includes(i);
          return (
            <OptionEditRow
              key={i}
              idx={i}
              borderClass={
                isChecked
                  ? 'border-2 border-emerald-500 bg-white dark:bg-slate-900'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }
              optionText={formData.options[i]}
              optImg={(formData.optionImages || [])[i]}
              onTextChange={handleOptionTextChange}
              onPaste={handleOptionPaste}
              onImageClick={(idx) => optionFileRefs.current[idx]?.click()}
              onRemoveOption={removeOption}
              onRemoveImage={removeOptionImage}
              inputEl={
                <button
                  type="button"
                  onClick={() => handleMultiCorrectChange(i)}
                  className="shrink-0 cursor-pointer focus:outline-none"
                  title="Chọn làm đáp án đúng"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isChecked
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              }
            />
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={addOption}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm đáp án nữa
        </Button>
      </div>
    );
  } else if (formData.type === 'fill') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          ĐÁP ÁN ĐÚNG CẦN ĐIỀN
        </label>
        <input
          type="text"
          className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:border-brand-500 outline-none text-base font-bold text-brand-600 dark:text-brand-400 shadow-sm"
          value={formData.answer || ''}
          placeholder="Nhập từ hoặc cụm từ cần điền..."
          onChange={(e) => setFormData({ ...formData, answer: e.target.value, answers: [e.target.value] })}
        />
        <p className="text-xs text-slate-400">
          * Đảm bảo trong đề bài có ký hiệu <strong>___</strong> để biểu thị vị trí chỗ trống.
        </p>
      </div>
    );
  } else if (formData.type === 'truefalse') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          ĐÁP ÁN ĐÚNG CỦA MỆNH ĐỀ
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, correct: true, answer: true })}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-2 font-black text-base transition-all ${
              formData.correct === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-md scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-emerald-300'
            }`}
          >
            <span className="text-3xl">{formData.correct === true ? '✅' : '⬜'}</span>
            <span>ĐÚNG</span>
            {formData.correct === true && (
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full">
                Đáp án được chọn
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, correct: false, answer: false })}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-2 font-black text-base transition-all ${
              formData.correct === false
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-md scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-rose-300'
            }`}
          >
            <span className="text-3xl">{formData.correct === false ? '❌' : '⬜'}</span>
            <span>SAI</span>
            {formData.correct === false && (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-2.5 py-0.5 rounded-full">
                Đáp án được chọn
              </span>
            )}
          </button>
        </div>
      </div>
    );
  } else if (formData.type === 'multitruefalse') {
    const stmts = formData.statements || [];
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC PHÁT BIỂU (CHỌN ĐÚNG/SAI CHO TỪNG PHÁT BIỂU)
        </label>
        {stmts.map((stmt, i) => (
          <div key={i} className="flex gap-2.5 items-center p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="font-bold text-white bg-brand-600 w-6 h-6 flex items-center justify-center rounded-lg shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-1.5 bg-transparent outline-none font-semibold text-xs text-slate-800 dark:text-slate-100"
              placeholder={`Nội dung phát biểu ${i + 1}...`}
              value={stmt.text}
              onChange={(e) => {
                const arr = stmts.map(s => ({ ...s }));
                arr[i].text = e.target.value;
                setFormData({ ...formData, statements: arr });
              }}
            />
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  const arr = stmts.map(s => ({ ...s }));
                  arr[i].correct = true;
                  setFormData({ ...formData, statements: arr });
                }}
                className={`px-3 py-1.5 transition ${stmt.correct ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              >
                Đúng
              </button>
              <button
                type="button"
                onClick={() => {
                  const arr = stmts.map(s => ({ ...s }));
                  arr[i].correct = false;
                  setFormData({ ...formData, statements: arr });
                }}
                className={`px-3 py-1.5 transition ${!stmt.correct ? 'bg-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              >
                Sai
              </button>
            </div>
            {stmts.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  const arr = stmts.filter((_, idx) => idx !== i);
                  setFormData({ ...formData, statements: arr });
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {stmts.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormData({ ...formData, statements: [...stmts, { text: '', correct: true }] })}
            className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 font-bold rounded-xl text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" /> Thêm phát biểu
          </Button>
        )}
      </div>
    );
  } else if (formData.type === 'drag') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC CẶP GHÉP TƯƠNG ỨNG (VẾ TRÁI CỐ ĐỊNH, VẾ PHẢI KÉO THẢ)
        </label>
        {formData.pairs.map((p, i) => (
          <div key={i} className="flex gap-3">
            <input
              type="text"
              className="flex-1 p-3 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-brand-500 font-semibold text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder="Vế trái cố định..."
              value={p.left}
              onChange={(e) => {
                const arr = formData.pairs.map(x => ({ ...x }));
                arr[i].left = e.target.value;
                setFormData({ ...formData, pairs: arr });
              }}
            />
            <input
              type="text"
              className="flex-1 p-3 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm text-emerald-800 dark:text-emerald-300"
              placeholder="Vế phải (Kéo thả)..."
              value={p.right}
              onChange={(e) => {
                const arr = formData.pairs.map(x => ({ ...x }));
                arr[i].right = e.target.value;
                setFormData({ ...formData, pairs: arr });
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (formData.pairs.length > 2) {
                  const arr = [...formData.pairs];
                  arr.splice(i, 1);
                  setFormData({ ...formData, pairs: arr });
                } else {
                  alert('Cần tối thiểu 2 cặp! (Mã lỗi: QST-12)');
                }
              }}
              className="p-3 text-slate-400 hover:text-rose-500 rounded-2xl transition"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormData({ ...formData, pairs: [...formData.pairs, { left: '', right: '' }] })}
          className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm cặp nữa
        </Button>
      </div>
    );
  } else if (formData.type === 'groupdrag') {
    const groups = (formData.groups || []).map(g => ({
      name: g.name ?? g.groupName ?? '',
      items: Array.isArray(g.items) ? g.items : [],
    }));
    dynamicBody = (
      <div className="space-y-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC NHÓM PHÂN LOẠI (CHỈNH TÊN NHÓM VÀ DANH SÁCH ITEM)
        </label>
        {groups.map((g, gi) => (
          <div key={gi} className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-black text-white bg-brand-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
                {gi + 1}
              </span>
              <input
                type="text"
                className="flex-1 p-2.5 border border-brand-300 dark:border-brand-700 rounded-xl outline-none font-bold text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-900 text-sm"
                placeholder={`Tên nhóm ${gi + 1}...`}
                value={g.name}
                onChange={(e) => {
                  const arr = groups.map(x => ({ ...x, items: [...x.items] }));
                  arr[gi].name = e.target.value;
                  setFormData({ ...formData, groups: arr });
                }}
              />
              {groups.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const arr = groups.filter((_, i) => i !== gi);
                    setFormData({ ...formData, groups: arr });
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-2 pl-4">
              {g.items.map((item, ii) => (
                <div key={ii} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 w-4">{ii + 1}.</span>
                  <input
                    type="text"
                    className="flex-1 p-2 border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 rounded-xl outline-none font-semibold text-xs text-emerald-800 dark:text-emerald-300"
                    value={item}
                    placeholder="Nội dung item..."
                    onChange={(e) => {
                      const arr = groups.map(x => ({ ...x, items: [...x.items] }));
                      arr[gi].items[ii] = e.target.value;
                      setFormData({ ...formData, groups: arr });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const arr = groups.map(x => ({ ...x, items: [...x.items] }));
                      arr[gi].items.splice(ii, 1);
                      setFormData({ ...formData, groups: arr });
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const arr = groups.map(x => ({ ...x, items: [...x.items] }));
                  arr[gi].items.push('');
                  setFormData({ ...formData, groups: arr });
                }}
                className="text-emerald-600 dark:text-emerald-400 font-bold text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm item
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const arr = [...groups.map(x => ({ ...x, items: [...x.items] })), { name: '', items: [] }];
            setFormData({ ...formData, groups: arr });
          }}
          className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm nhóm mới
        </Button>
      </div>
    );
  } else if (formData.type === 'clozedrag') {
    const answers = formData.answers || [];
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          TỪ KHÓA ĐÁP ÁN (THEO THỨ TỰ [1][2][3] TRONG ĐỀ BÀI)
        </label>
        {answers.map((w, i) => (
          <div key={i} className="flex gap-2.5 items-center">
            <span className="font-bold text-white bg-teal-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-2.5 border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-xs text-teal-800 dark:text-teal-300"
              value={w}
              placeholder={`Từ điền vào chỗ ${i + 1}...`}
              onChange={(e) => {
                const arr = [...answers]; arr[i] = e.target.value;
                setFormData({ ...formData, answers: arr });
              }}
            />
            <button
              type="button"
              onClick={() => {
                const arr = answers.filter((_, idx) => idx !== i);
                setFormData({ ...formData, answers: arr });
              }}
              className="p-2 text-slate-400 hover:text-rose-500 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormData({ ...formData, answers: [...answers, ''] })}
          className="border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 hover:bg-teal-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm từ khóa
        </Button>
      </div>
    );
  } else if (formData.type === 'order') {
    dynamicBody = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          THỨ TỰ ĐÚNG (DÙNG NÚT ▲▼ ĐỂ ĐỔI THỨ TỰ CÁC MỤC)
        </label>
        {formData.items.map((item, i) => (
          <div key={i} className="flex gap-2.5 items-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="font-bold text-white bg-brand-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-2 bg-transparent outline-none font-semibold text-sm text-slate-800 dark:text-slate-100"
              value={item}
              placeholder={`Mục thứ ${i + 1}...`}
              onChange={(e) => {
                const arr = [...formData.items];
                arr[i] = e.target.value;
                setFormData({ ...formData, items: arr });
              }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveOrderUp(i)}
                disabled={i === 0}
                className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 font-bold rounded-lg transition"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveOrderDown(i)}
                disabled={i === formData.items.length - 1}
                className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 font-bold rounded-lg transition"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (formData.items.length > 2) {
                    const arr = [...formData.items];
                    arr.splice(i, 1);
                    setFormData({ ...formData, items: arr });
                  } else {
                    alert("Cần tối thiểu 2 mục (Mã lỗi: QST-10)");
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormData({ ...formData, items: [...formData.items, ''] })}
          className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm mục
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    const questionText = (formData.question || formData.content || '').trim();
    if (!questionText) {
      alert('Vui lòng nhập nội dung đề bài!');
      return;
    }

    if (formData.type === 'single') {
      const cleanOpts = (formData.options || []).map(o => String(o).trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        alert('Câu hỏi trắc nghiệm cần ít nhất 2 phương án!');
        return;
      }
    }

    if (formData.type === 'multiselect') {
      const cleanOpts = (formData.options || []).map(o => String(o).trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        alert('Câu hỏi trắc nghiệm cần ít nhất 2 phương án!');
        return;
      }
      if (!formData.corrects || formData.corrects.length === 0) {
        alert('Vui lòng chọn ít nhất 1 đáp án đúng!');
        return;
      }
    }

    if (formData.type === 'fill' && !(formData.answer || '').trim()) {
      alert('Vui lòng nhập đáp án cho câu hỏi điền từ!');
      return;
    }

    if (formData.type === 'drag') {
      if ((formData.pairs || []).some(p => !p.left.trim() && !p.right.trim())) {
        alert('⚠️ Mỗi dòng phải có ít nhất một trong hai vế (trái hoặc phải)!');
        return;
      }
      if ((formData.pairs || []).filter(p => p.right.trim()).length < 2) {
        alert('⚠️ Cần ít nhất 2 vế phải (đáp án) để kéo thả!');
        return;
      }
    }

    if (formData.type === 'groupdrag') {
      const gs = formData.groups || [];
      if (gs.length < 2) {
        alert('⚠️ Cần ít nhất 2 nhóm phân loại!');
        return;
      }
      if (gs.some(g => !(g.name ?? g.groupName ?? '').trim())) {
        alert('⚠️ Vui lòng nhập tên cho tất cả các nhóm!');
        return;
      }
    }

    const payload = {
      ...formData,
      content: questionText,
      question: questionText,
      points: parseFloat(formData.points) || 1,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {targetData ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}
            </h2>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-sm">
            <span className="tracking-wider uppercase">TRỌNG SỐ:</span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              className="w-14 p-1 text-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-7 overflow-y-auto flex-1 space-y-6">
          {/* Bảng chọn dạng câu hỏi (Tab Bar) */}
          <div className="bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center justify-center gap-1">
              {QUESTION_TYPES.map((t) => {
                const isActive = formData.type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeChange(t.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-white/40 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Nội dung câu hỏi & hình ảnh */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              NỘI DUNG CÂU HỎI & HÌNH ẢNH
            </label>
            <textarea
              className="w-full h-32 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:border-brand-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed resize-y shadow-sm"
              value={formData.question || formData.content || ''}
              onChange={(e) => setFormData({ ...formData, question: e.target.value, content: e.target.value })}
              onPaste={handleQuestionPaste}
              placeholder="Nhập nội dung đề bài... (dán ảnh được, Ctrl+V)"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => questionFileRef.current?.click()}
                icon={ImageIcon}
                className="text-xs text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 rounded-xl"
              >
                Đính kèm ảnh đề bài
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={questionFileRef}
                onChange={handleQuestionImageUpload}
              />
              {formData.image && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={removeQuestionImage}
                  icon={Trash2}
                  className="text-xs text-rose-500 border-rose-200 dark:border-rose-900 rounded-xl"
                >
                  Xóa ảnh
                </Button>
              )}
            </div>
            {formData.image && (
              <div className="mt-2 p-2 border border-slate-200 dark:border-slate-700 rounded-2xl inline-block bg-slate-50 dark:bg-slate-800/40">
                <img src={formData.image} alt="Ảnh đề bài" className="max-w-full max-h-56 rounded-xl object-contain" />
              </div>
            )}
          </div>

          {/* Section: Dynamic Body theo dạng câu hỏi */}
          {dynamicBody}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-7 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Hủy Bỏ
          </Button>
          <Button variant="primary" onClick={handleSave} icon={Save} className="rounded-xl">
            Lưu Lại Thay Đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
