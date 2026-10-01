import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon, Trash2, Plus, HelpCircle, Check, X,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '../../../common/Button';

// ─── Component hàng đáp án tách biệt để giữ focus khi gõ ──────
const OptionRow = ({
  idx,
  isChecked,
  inputEl,
  borderClass,
  option,
  onTextChange,
  onPaste,
  onImageClick,
  onRemoveOption,
  onRemoveImage,
  fileInputRef,
  onImageUpload,
}) => (
  <div className={`border rounded-2xl mb-2.5 transition shadow-sm overflow-hidden ${borderClass}`}>
    <div className="flex items-center gap-3 p-3">
      {inputEl}
      <input
        type="text"
        className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 font-semibold text-sm"
        placeholder={`Nhập đáp án ${idx + 1}... (dán ảnh được)`}
        value={option?.text || ''}
        onPaste={(e) => onPaste(e, idx)}
        onChange={(e) => onTextChange(idx, e.target.value)}
      />
      <button
        type="button"
        title="Đính kèm ảnh cho đáp án này"
        onClick={() => onImageClick(idx)}
        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition shrink-0"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => onImageUpload(e, idx)}
      />
      <button
        type="button"
        onClick={() => onRemoveOption(idx)}
        title="Xóa đáp án này"
        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>

    {option?.image && (
      <div className="px-3 pb-3 flex items-start gap-3 border-t border-slate-100 dark:border-slate-800 pt-2 bg-slate-50/50 dark:bg-slate-900/50">
        <img
          src={option.image}
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

const TABS = [
  { id: 'single', label: 'Trắc nghiệm' },
  { id: 'multiselect', label: 'Nhiều đáp án' },
  { id: 'fill', label: 'Điền từ' },
  { id: 'truefalse', label: 'Đúng / Sai' },
  { id: 'multitruefalse', label: 'Đúng/Sai Nhiều Phát Biểu' },
  { id: 'drag', label: 'Ghép cặp 1-1' },
  { id: 'groupdrag', label: 'Phân loại Nhóm' },
  { id: 'clozedrag', label: 'Kéo vào Đoạn văn' },
  { id: 'order', label: 'Sắp xếp' }
];

export function QuestionForms({ onAddQuestion }) {
  const [currentType, setCurrentType] = useState('single');
  const [points, setPoints] = useState(1);
  const [qText, setQText] = useState('');
  const [imageBox, setImageBox] = useState('');
  const fileInputRef = useRef(null);

  // Đáp án trắc nghiệm: { text, image }
  const [options, setOptions] = useState([
    { text: '', image: '' },
    { text: '', image: '' },
    { text: '', image: '' },
    { text: '', image: '' }
  ]);
  const [singleCorrect, setSingleCorrect] = useState(0);
  const [multiCorrects, setMultiCorrects] = useState([0]);

  const [fillAnswer, setFillAnswer] = useState('');
  const [tfCorrect, setTfCorrect] = useState(true);
  const [pairs, setPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
  const [groups, setGroups] = useState([{ name: '', itemsStr: '' }, { name: '', itemsStr: '' }]);
  const [clozeWords, setClozeWords] = useState(['', '']);
  const [orderItems, setOrderItems] = useState(['', '', '']);
  const [mtfStatements, setMtfStatements] = useState([
    { text: '', correct: true },
    { text: '', correct: false },
  ]);

  const optionFileRefs = useRef([]);

  // ─── XỬ LÝ ẢNH ĐỀ BÀI ──────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageBox(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQuestionPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (ev) => setImageBox(ev.target.result);
        reader.readAsDataURL(item.getAsFile());
        break;
      }
    }
  };

  const removeImage = () => {
    setImageBox('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── XỬ LÝ ẢNH ĐÁP ÁN ─────────────────────────────────────────
  const handleOptionImageUpload = (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newOpts = [...options];
      newOpts[idx] = { ...newOpts[idx], image: ev.target.result };
      setOptions(newOpts);
    };
    reader.readAsDataURL(file);
  };

  const handleOptionPaste = (e, idx) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newOpts = [...options];
          newOpts[idx] = { ...newOpts[idx], image: ev.target.result };
          setOptions(newOpts);
        };
        reader.readAsDataURL(item.getAsFile());
        break;
      }
    }
  };

  const removeOptionImage = (idx) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], image: '' };
    setOptions(newOpts);
    if (optionFileRefs.current[idx]) optionFileRefs.current[idx].value = '';
  };

  const handleOptionTextChange = (idx, text) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], text };
    setOptions(newOpts);
  };

  const handleRemoveOption = (idx) => {
    if (options.length > 2) {
      const newOpts = [...options];
      newOpts.splice(idx, 1);
      setOptions(newOpts);
      if (singleCorrect === idx) setSingleCorrect(0);
      else if (singleCorrect > idx) setSingleCorrect(p => p - 1);
      setMultiCorrects(prev => prev.filter(x => x !== idx).map(x => (x > idx ? x - 1 : x)));
    } else {
      alert('Cần tối thiểu 2 đáp án! (Mã lỗi: QST-11)');
    }
  };

  // ─── ĐƯA CÂU HỎI VÀO ĐỀ ────────────────────────────────────────
  const handleSaveQuestion = () => {
    if (!qText.trim() && !imageBox) {
      alert('⚠️ Vui lòng nhập nội dung đề bài hoặc đính kèm ảnh!');
      return;
    }

    let newQuestion = {
      id: Date.now().toString(),
      type: currentType,
      points: parseFloat(points) || 1,
      question: qText.trim(),
      content: qText.trim(),
      image: imageBox,
    };

    if (currentType === 'single') {
      const validOptions = options.map(o => o.text.trim()).filter((t, i) => t !== '' || options[i].image);
      if (validOptions.length < 2) {
        alert('⚠️ Cần ít nhất 2 đáp án! (Mã lỗi: QST-01)');
        return;
      }
      newQuestion.options = options.map(o => o.text.trim());
      newQuestion.optionImages = options.map(o => o.image || '');
      newQuestion.answer = singleCorrect;
      newQuestion.correct = singleCorrect;
    } else if (currentType === 'multiselect') {
      const validOptions = options.map(o => o.text.trim()).filter((t, i) => t !== '' || options[i].image);
      if (validOptions.length < 2) {
        alert('⚠️ Cần ít nhất 2 đáp án! (Mã lỗi: QST-02)');
        return;
      }
      if (multiCorrects.length === 0) {
        alert('⚠️ Phải chọn ít nhất 1 đáp án đúng! (Mã lỗi: QST-03)');
        return;
      }
      newQuestion.options = options.map(o => o.text.trim());
      newQuestion.optionImages = options.map(o => o.image || '');
      newQuestion.corrects = multiCorrects;
    } else if (currentType === 'fill') {
      if (!fillAnswer.trim()) {
        alert('⚠️ Chưa nhập đáp án đúng! (Mã lỗi: QST-04)');
        return;
      }
      newQuestion.answer = fillAnswer.trim();
      newQuestion.answers = [fillAnswer.trim()];
    } else if (currentType === 'truefalse') {
      newQuestion.correct = tfCorrect;
      newQuestion.answer = tfCorrect;
    } else if (currentType === 'drag') {
      const validPairs = pairs.filter(p => p.left.trim() !== '' || p.right.trim() !== '');
      if (validPairs.length < 2) {
        alert('⚠️ Cần ít nhất 2 cặp ghép! (Mã lỗi: QST-05)');
        return;
      }
      newQuestion.pairs = validPairs.map(p => ({ left: p.left.trim(), right: p.right.trim() }));
    } else if (currentType === 'groupdrag') {
      const validGroups = groups.filter(g => g.name.trim() !== '');
      if (validGroups.length < 2) {
        alert('⚠️ Cần ít nhất 2 nhóm! (Mã lỗi: QST-06)');
        return;
      }
      newQuestion.groups = validGroups.map(g => ({
        name: g.name.trim(),
        items: g.itemsStr.split(',').map(s => s.trim()).filter(Boolean)
      }));
    } else if (currentType === 'clozedrag') {
      const validWords = clozeWords.map(w => w.trim()).filter(Boolean);
      if (validWords.length === 0) {
        alert('⚠️ Chưa nhập từ khóa đáp án! (Mã lỗi: QST-07)');
        return;
      }
      newQuestion.answers = validWords;
    } else if (currentType === 'order') {
      const validItems = orderItems.map(i => i.trim()).filter(Boolean);
      if (validItems.length < 2) {
        alert('⚠️ Cần ít nhất 2 mục! (Mã lỗi: QST-08)');
        return;
      }
      newQuestion.items = validItems;
    } else if (currentType === 'multitruefalse') {
      const validStmts = mtfStatements.filter(s => s.text.trim() !== '');
      if (validStmts.length < 2) {
        alert('⚠️ Cần ít nhất 2 phát biểu! (Mã lỗi: QST-12)');
        return;
      }
      newQuestion.statements = validStmts.map(s => ({ text: s.text.trim(), correct: s.correct }));
    }

    onAddQuestion(newQuestion);

    // Reset form sạch sẽ để nhập câu tiếp theo ngay lập tức
    setQText('');
    removeImage();
    setOptions([
      { text: '', image: '' },
      { text: '', image: '' },
      { text: '', image: '' },
      { text: '', image: '' }
    ]);
    setSingleCorrect(0);
    setMultiCorrects([0]);
    setFillAnswer('');
    setPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setGroups([{ name: '', itemsStr: '' }, { name: '', itemsStr: '' }]);
    setClozeWords(['', '']);
    setOrderItems(['', '', '']);
    setMtfStatements([
      { text: '', correct: true },
      { text: '', correct: false }
    ]);
  };

  // ─── DYNAMIC FORM CHO TỪNG LOẠI CÂU HỎI ──────────────────────
  let dynamicForm = null;

  if (currentType === 'single') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC ĐÁP ÁN (CHỌN Ô TRÒN LÀM ĐÁP ÁN ĐÚNG — CÓ THỂ THÊM ẢNH)
        </label>
        {options.map((opt, i) => (
          <OptionRow
            key={i}
            idx={i}
            option={opt}
            isChecked={singleCorrect === i}
            borderClass={
              singleCorrect === i
                ? 'border-2 border-emerald-500 bg-white dark:bg-slate-900'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }
            inputEl={
              <button
                type="button"
                onClick={() => setSingleCorrect(i)}
                className="shrink-0 cursor-pointer focus:outline-none"
                title="Chọn làm đáp án đúng"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  singleCorrect === i
                    ? 'border-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}>
                  {singleCorrect === i && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </button>
            }
            onTextChange={handleOptionTextChange}
            onPaste={handleOptionPaste}
            onImageClick={(idx) => optionFileRefs.current[idx]?.click()}
            onRemoveOption={handleRemoveOption}
            onRemoveImage={removeOptionImage}
            fileInputRef={(el) => (optionFileRefs.current[i] = el)}
            onImageUpload={handleOptionImageUpload}
          />
        ))}
        <Button
          type="button"
          onClick={() => setOptions([...options, { text: '', image: '' }])}
          variant="outline"
          size="sm"
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm đáp án nữa
        </Button>
      </div>
    );
  } else if (currentType === 'multiselect') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC ĐÁP ÁN (CHỌN NHIỀU Ô VUÔNG LÀM ĐÁP ÁN ĐÚNG — CÓ THỂ THÊM ẢNH)
        </label>
        {options.map((opt, i) => {
          const isChecked = multiCorrects.includes(i);
          return (
            <OptionRow
              key={i}
              idx={i}
              option={opt}
              isChecked={isChecked}
              borderClass={
                isChecked
                  ? 'border-2 border-emerald-500 bg-white dark:bg-slate-900'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }
              inputEl={
                <button
                  type="button"
                  onClick={() => {
                    let newArr = [...multiCorrects];
                    if (newArr.includes(i)) newArr = newArr.filter(x => x !== i);
                    else newArr.push(i);
                    setMultiCorrects(newArr);
                  }}
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
              onTextChange={handleOptionTextChange}
              onPaste={handleOptionPaste}
              onImageClick={(idx) => optionFileRefs.current[idx]?.click()}
              onRemoveOption={handleRemoveOption}
              onRemoveImage={removeOptionImage}
              fileInputRef={(el) => (optionFileRefs.current[i] = el)}
              onImageUpload={handleOptionImageUpload}
            />
          );
        })}
        <Button
          type="button"
          onClick={() => setOptions([...options, { text: '', image: '' }])}
          variant="outline"
          size="sm"
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm đáp án nữa
        </Button>
      </div>
    );
  } else if (currentType === 'fill') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          ĐÁP ÁN ĐÚNG CẦN ĐIỀN
        </label>
        <input
          type="text"
          className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:border-indigo-500 outline-none text-base font-bold text-indigo-600 dark:text-indigo-400 shadow-sm"
          placeholder="Nhập từ hoặc cụm từ cần điền..."
          value={fillAnswer}
          onChange={(e) => setFillAnswer(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          * Đảm bảo trong đề bài có ký hiệu <strong>___</strong> để biểu thị vị trí chỗ trống.
        </p>
      </div>
    );
  } else if (currentType === 'truefalse') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          ĐÁP ÁN ĐÚNG CỦA MỆNH ĐỀ
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTfCorrect(true)}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-2 font-black text-base transition-all ${
              tfCorrect === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-md scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-emerald-300'
            }`}
          >
            <span className="text-3xl">{tfCorrect === true ? '✅' : '⬜'}</span>
            <span>ĐÚNG</span>
            {tfCorrect === true && (
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full">
                Đáp án được chọn
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTfCorrect(false)}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-2 font-black text-base transition-all ${
              tfCorrect === false
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-md scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-rose-300'
            }`}
          >
            <span className="text-3xl">{tfCorrect === false ? '❌' : '⬜'}</span>
            <span>SAI</span>
            {tfCorrect === false && (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-2.5 py-0.5 rounded-full">
                Đáp án được chọn
              </span>
            )}
          </button>
        </div>
      </div>
    );
  } else if (currentType === 'multitruefalse') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC PHÁT BIỂU (TỐI ĐA 4) — CHỌN ĐÚNG/SAI CHO MỖI PHÁT BIỂU
        </label>
        {mtfStatements.map((stmt, i) => (
          <div key={i} className="flex gap-2.5 items-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="font-bold text-white bg-teal-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-2 bg-transparent outline-none font-semibold text-sm text-slate-800 dark:text-slate-100"
              placeholder={`Nội dung phát biểu ${i + 1}...`}
              value={stmt.text}
              onChange={(e) => {
                const arr = [...mtfStatements];
                arr[i] = { ...arr[i], text: e.target.value };
                setMtfStatements(arr);
              }}
            />
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  const arr = [...mtfStatements];
                  arr[i] = { ...arr[i], correct: true };
                  setMtfStatements(arr);
                }}
                className={`px-3 py-1.5 transition ${stmt.correct ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              >
                Đúng
              </button>
              <button
                type="button"
                onClick={() => {
                  const arr = [...mtfStatements];
                  arr[i] = { ...arr[i], correct: false };
                  setMtfStatements(arr);
                }}
                className={`px-3 py-1.5 transition ${!stmt.correct ? 'bg-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              >
                Sai
              </button>
            </div>
            {mtfStatements.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  const arr = mtfStatements.filter((_, idx) => idx !== i);
                  setMtfStatements(arr);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {mtfStatements.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMtfStatements([...mtfStatements, { text: '', correct: true }])}
            className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" /> Thêm phát biểu
          </Button>
        )}
      </div>
    );
  } else if (currentType === 'drag') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CÁC CẶP GHÉP TƯƠNG ỨNG (VẾ TRÁI CỐ ĐỊNH, VẾ PHẢI KÉO THẢ)
        </label>
        {pairs.map((p, i) => (
          <div key={i} className="flex gap-3">
            <input
              type="text"
              className="flex-1 p-3 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 font-semibold text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder="Vế trái cố định..."
              value={p.left}
              onChange={(e) => {
                let arr = [...pairs];
                arr[i].left = e.target.value;
                setPairs(arr);
              }}
            />
            <input
              type="text"
              className="flex-1 p-3 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm text-emerald-800 dark:text-emerald-300"
              placeholder="Vế phải (Kéo thả)..."
              value={p.right}
              onChange={(e) => {
                let arr = [...pairs];
                arr[i].right = e.target.value;
                setPairs(arr);
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (pairs.length > 2) {
                  let arr = [...pairs];
                  arr.splice(i, 1);
                  setPairs(arr);
                } else alert('Cần tối thiểu 2 cặp! (Mã lỗi: QST-12)');
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
          onClick={() => setPairs([...pairs, { left: '', right: '' }])}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm cặp nữa
        </Button>
      </div>
    );
  } else if (currentType === 'groupdrag') {
    dynamicForm = (
      <div className="space-y-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          TẠO CÁC NHÓM VÀ TỪ KHÓA
        </label>
        {groups.map((g, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-black text-white bg-indigo-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
                {i + 1}
              </span>
              <input
                type="text"
                className="flex-1 p-2.5 border border-indigo-300 dark:border-indigo-700 rounded-xl outline-none font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 text-sm"
                placeholder={`Tên nhóm ${i + 1}...`}
                value={g.name}
                onChange={(e) => {
                  let arr = [...groups];
                  arr[i].name = e.target.value;
                  setGroups(arr);
                }}
              />
              {groups.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    let arr = [...groups];
                    arr.splice(i, 1);
                    setGroups(arr);
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 font-medium resize-y bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm"
              rows="2"
              placeholder="Các từ khóa thuộc nhóm này (Cách nhau bằng dấu phẩy)..."
              value={g.itemsStr}
              onChange={(e) => {
                let arr = [...groups];
                arr[i].itemsStr = e.target.value;
                setGroups(arr);
              }}
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGroups([...groups, { name: '', itemsStr: '' }])}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm nhóm mới
        </Button>
      </div>
    );
  } else if (currentType === 'clozedrag') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          TỪ KHÓA ĐÁP ÁN (THEO THỨ TỰ DẤU ___)
        </label>
        {clozeWords.map((w, i) => (
          <div key={i} className="flex gap-2.5 items-center">
            <span className="font-bold text-white bg-teal-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-2.5 border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-xs text-teal-800 dark:text-teal-300"
              placeholder={`Từ điền vào chỗ ${i + 1}...`}
              value={w}
              onChange={(e) => {
                let arr = [...clozeWords];
                arr[i] = e.target.value;
                setClozeWords(arr);
              }}
            />
            <button
              type="button"
              onClick={() => {
                let arr = [...clozeWords];
                arr.splice(i, 1);
                setClozeWords(arr);
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
          onClick={() => setClozeWords([...clozeWords, ''])}
          className="border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 hover:bg-teal-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm từ khóa
        </Button>
      </div>
    );
  } else if (currentType === 'order') {
    dynamicForm = (
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          SẮP XẾP TỪ / CÂU (NHẬP THEO ĐÚNG THỨ TỰ)
        </label>
        {orderItems.map((item, i) => (
          <div key={i} className="flex gap-2.5 items-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="font-bold text-white bg-indigo-600 w-7 h-7 flex items-center justify-center rounded-xl shrink-0 text-xs">
              {i + 1}
            </span>
            <input
              type="text"
              className="flex-1 p-2 bg-transparent outline-none font-semibold text-sm text-slate-800 dark:text-slate-100"
              placeholder={`Nội dung mục số ${i + 1}...`}
              value={item}
              onChange={(e) => {
                let arr = [...orderItems];
                arr[i] = e.target.value;
                setOrderItems(arr);
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (orderItems.length > 2) {
                  let arr = [...orderItems];
                  arr.splice(i, 1);
                  setOrderItems(arr);
                } else alert('Cần tối thiểu 2 mục! (Mã lỗi: QST-10)');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrderItems([...orderItems, ''])}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Thêm mục
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Thêm Câu Hỏi Mới
          </h2>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-sm">
          <span className="tracking-wider uppercase">TRỌNG SỐ:</span>
          <input
            type="number"
            min="0.25"
            step="0.25"
            className="w-14 p-1 text-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            value={points}
            onChange={(e) => setPoints(parseFloat(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* Bảng chọn dạng câu hỏi (Tab Bar) */}
      <div className="bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center justify-center gap-1">
          {TABS.map((t) => {
            const isActive = currentType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrentType(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
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
          className="w-full h-32 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:border-indigo-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed resize-y shadow-sm"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          onPaste={handleQuestionPaste}
          placeholder="Nhập nội dung đề bài... (dán ảnh được, Ctrl+V)"
        />
        {(currentType === 'fill' || currentType === 'clozedrag') && (
          <p className="text-amber-600 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800 inline-block">
            * Dùng 3 dấu gạch dưới <code className="bg-amber-200 dark:bg-amber-900 px-1 rounded text-amber-800 dark:text-amber-300">___</code> để biểu thị vị trí chỗ trống.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            icon={ImageIcon}
            className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 rounded-xl"
          >
            Đính kèm ảnh đề bài
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          {imageBox && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={removeImage}
              icon={Trash2}
              className="text-xs text-rose-500 border-rose-200 dark:border-rose-900 rounded-xl"
            >
              Xóa ảnh
            </Button>
          )}
        </div>
        {imageBox && (
          <div className="mt-2 p-2 border border-slate-200 dark:border-slate-700 rounded-2xl inline-block bg-slate-50 dark:bg-slate-800/40">
            <img src={imageBox} alt="Ảnh đề bài" className="max-w-full max-h-56 rounded-xl object-contain" />
          </div>
        )}
      </div>

      {/* Section: Dynamic Body theo dạng câu hỏi */}
      {dynamicForm}

      {/* Bottom Action: Đưa câu hỏi vào đề */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Button
          type="button"
          onClick={handleSaveQuestion}
          className="font-bold py-3 px-6 rounded-2xl shadow-md text-sm gap-2"
        >
          <Check className="h-5 w-5" /> Đưa Câu Hỏi Vào Đề
        </Button>
      </div>
    </div>
  );
}
