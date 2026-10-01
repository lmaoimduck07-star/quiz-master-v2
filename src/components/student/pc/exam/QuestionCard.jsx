import React, { useState, useRef, useCallback } from 'react';
import { Flag, Check, GripVertical, ArrowRight, X } from 'lucide-react';
import { Card, CardContent } from '../../../common/Card';

// ── Nhãn loại câu hỏi ──────────────────────────────────────────────────────────
const TYPE_LABELS = {
  single:         '(Chọn 1 đáp án)',
  multiselect:    '(Chọn nhiều đáp án)',
  fill:           '(Điền đáp án)',
  truefalse:      '(Đúng / Sai)',
  multitruefalse: '(Đúng/Sai cho từng phát biểu)',
  order:          '(Sắp xếp thứ tự)',
  drag:           '(Ghép cặp kéo thả)',
  groupdrag:      '(Kéo thả phân loại nhóm)',
  clozedrag:      '(Kéo từ vào chỗ trống)',
};

// ── Chip kéo thả dùng chung ─────────────────────────────────────────────────────
const DRAG_CHIP_BASE = 'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-grab active:cursor-grabbing select-none transition-all';
const DRAG_CHIP_IDLE = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:border-brand-400';
const DRAG_CHIP_PLACED = 'bg-brand-50 dark:bg-brand-950/50 border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 shadow-sm';
const DROP_ZONE_IDLE = 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl min-h-[2.75rem] flex items-center justify-center text-xs text-slate-400 transition-all';
const DROP_ZONE_ACTIVE = 'border-brand-400 dark:border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-300/40';

export function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
  answer,
  onAnswerChange,
  isFlagged = false,
  onToggleFlag,
}) {
  if (!question) return null;

  const type = question.type || 'single';
  const options = question.options || [];
  const text = question.content || question.question || question.text || '';
  const image = question.image || null;

  // ── Drag state ────────────────────────────────────────────────────────────────
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const dragDataRef = useRef(null);

  // ── Handlers cơ bản ────────────────────────────────────────────────────────────

  // Single choice
  const handleSingleSelect = (idx) => {
    onAnswerChange(idx);
  };

  // Multiselect (checkbox)
  const handleMultiSelect = (idx) => {
    const current = Array.isArray(answer) ? [...answer] : [];
    const foundIdx = current.indexOf(idx);
    if (foundIdx > -1) {
      current.splice(foundIdx, 1);
    } else {
      current.push(idx);
    }
    onAnswerChange(current);
  };

  // Multi-truefalse: answer = { 0: true, 1: false, ... }
  const handleMultiTrueFalse = (stIdx, value) => {
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    current[stIdx] = value;
    onAnswerChange(current);
  };

  // Order: answer = [idx, idx, idx, ...]
  const handleOrderSwap = (fromIdx, toIdx) => {
    const items = question.items || [];
    const currentOrder = Array.isArray(answer) ? [...answer] : items.map((_, i) => i);
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= currentOrder.length || toIdx >= currentOrder.length) return;
    const tmp = currentOrder[fromIdx];
    currentOrder[fromIdx] = currentOrder[toIdx];
    currentOrder[toIdx] = tmp;
    onAnswerChange(currentOrder);
  };

  // ── HTML5 Drag & Drop Helpers ─────────────────────────────────────────────────
  const onDragStart = useCallback((e, data) => {
    dragDataRef.current = data;
    e.dataTransfer.effectAllowed = 'move';
    // Đặt ghost nhỏ gọn
    if (e.target) {
      e.dataTransfer.setDragImage(e.target, 20, 20);
    }
  }, []);

  const onDragOver = useCallback((e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  // ── Drag (ghép cặp): answer = { leftIdx: rightIdx, ... } ──────────────────────
  const handleDropDragPair = useCallback((e, leftIdx) => {
    e.preventDefault();
    setDragOverTarget(null);
    const data = dragDataRef.current;
    if (data?.type !== 'drag-right') return;
    const rightIdx = data.rightIdx;
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    // Nếu rightIdx đã được gán cho leftIdx khác, xóa nó
    Object.keys(current).forEach(k => {
      if (current[k] === rightIdx && Number(k) !== leftIdx) {
        delete current[k];
      }
    });
    current[leftIdx] = rightIdx;
    onAnswerChange({ ...current });
    dragDataRef.current = null;
  }, [answer, onAnswerChange]);

  const handleRemoveDragPair = useCallback((leftIdx) => {
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    delete current[leftIdx];
    onAnswerChange({ ...current });
  }, [answer, onAnswerChange]);

  // ── Group drag: answer = { itemText: groupIdx, ... } ──────────────────────────
  const handleDropGroupDrag = useCallback((e, groupIdx) => {
    e.preventDefault();
    setDragOverTarget(null);
    const data = dragDataRef.current;
    if (data?.type !== 'group-item') return;
    const itemText = data.itemText;
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    current[itemText] = groupIdx;
    onAnswerChange({ ...current });
    dragDataRef.current = null;
  }, [answer, onAnswerChange]);

  const handleRemoveGroupItem = useCallback((itemText) => {
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    delete current[itemText];
    onAnswerChange({ ...current });
  }, [answer, onAnswerChange]);

  // ── Cloze drag: answer = { blankIdx: wordText, ... } ──────────────────────────
  const handleDropCloze = useCallback((e, blankIdx) => {
    e.preventDefault();
    setDragOverTarget(null);
    const data = dragDataRef.current;
    if (data?.type !== 'cloze-word') return;
    const wordText = data.word;
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    // Nếu từ này đã được đặt ở chỗ trống khác, xóa nó
    Object.keys(current).forEach(k => {
      if (current[k] === wordText && Number(k) !== blankIdx) {
        delete current[k];
      }
    });
    current[blankIdx] = wordText;
    onAnswerChange({ ...current });
    dragDataRef.current = null;
  }, [answer, onAnswerChange]);

  const handleRemoveCloze = useCallback((blankIdx) => {
    const current = typeof answer === 'object' && answer !== null ? { ...answer } : {};
    delete current[blankIdx];
    onAnswerChange({ ...current });
  }, [answer, onAnswerChange]);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5 sm:p-7 space-y-5">
        {/* Top: Index & Flag button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-black text-xs">
              Câu {currentIndex + 1} / {totalQuestions}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {TYPE_LABELS[type] || '(Chọn 1 đáp án)'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleFlag}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              isFlagged
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
            <span>{isFlagged ? 'Đã cắm cờ' : 'Đặt cờ xem lại'}</span>
          </button>
        </div>

        {/* Question content */}
        <div className="space-y-4">
          <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
            {text}
          </div>

          {image && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-lg">
              <img src={image} alt="Câu hỏi" className="w-full object-contain max-h-72" />
            </div>
          )}
        </div>

        {/* ── RENDER OPTIONS THEO TỪNG LOẠI CÂU HỎI ───────────────────────── */}
        <div className="space-y-3 pt-2">

          {/* ─── 1. Single Choice ──────────────────────────────────────────── */}
          {type === 'single' && options.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : opt.text || opt;
                const isSelected = answer === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSingleSelect(idx)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-white shadow-sm ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm font-medium leading-normal flex-1">{optText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── 2. Multi-select (Checkbox) ────────────────────────────────── */}
          {type === 'multiselect' && options.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : opt.text || opt;
                const isSelected = Array.isArray(answer) && answer.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleMultiSelect(idx)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-white shadow-sm ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm font-medium leading-normal flex-1">{optText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── 3. True/False (Đúng / Sai đơn) ──────────────────────────── */}
          {type === 'truefalse' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 0, label: 'Đúng (True)' },
                { val: 1, label: 'Sai (False)' },
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onAnswerChange(item.val)}
                  className={`p-4 rounded-2xl border text-center font-bold text-sm transition ${
                    answer === item.val
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-600 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* ─── 4. Multi True/False (Đúng/Sai nhiều phát biểu) ───────────── */}
          {type === 'multitruefalse' && (question.statements || []).length > 0 && (
            <div className="space-y-2.5">
              {(question.statements || []).map((st, stIdx) => {
                const stText = typeof st === 'string' ? st : st.text || st;
                const currentVal = typeof answer === 'object' && answer !== null ? answer[stIdx] : undefined;
                return (
                  <div
                    key={stIdx}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-black flex items-center justify-center text-xs shrink-0 text-slate-500">
                        {stIdx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-normal">
                        {stText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMultiTrueFalse(stIdx, true)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          currentVal === true
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMultiTrueFalse(stIdx, false)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          currentVal === false
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Sai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── 5. Fill (Điền từ) ────────────────────────────────────────── */}
          {type === 'fill' && (
            <div className="pt-2">
              <input
                type="text"
                placeholder="Nhập câu trả lời của bạn..."
                value={answer || ''}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
              />
            </div>
          )}

          {/* ─── 6. Order (Sắp xếp thứ tự — kéo thả) ─────────────────────── */}
          {type === 'order' && (question.items || []).length > 0 && (() => {
            const items = question.items || [];
            const currentOrder = Array.isArray(answer) ? answer : items.map((_, i) => i);
            return (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium pb-1">
                  Kéo thả hoặc nhấn ▲ ▼ để sắp xếp thứ tự:
                </p>
                {currentOrder.map((itemIdx, posIdx) => (
                  <div
                    key={posIdx}
                    draggable
                    onDragStart={(e) => onDragStart(e, { type: 'order-item', fromPos: posIdx })}
                    onDragOver={(e) => onDragOver(e, `order-${posIdx}`)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverTarget(null);
                      const data = dragDataRef.current;
                      if (data?.type === 'order-item') {
                        handleOrderSwap(data.fromPos, posIdx);
                      }
                      dragDataRef.current = null;
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border bg-white dark:bg-slate-900/60 cursor-grab active:cursor-grabbing transition-all ${
                      dragOverTarget === `order-${posIdx}`
                        ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/40 shadow-md scale-[1.01]'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                    <span className="w-7 h-7 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-black flex items-center justify-center text-xs shrink-0">
                      {posIdx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex-1">
                      {items[itemIdx] || `Mục ${itemIdx + 1}`}
                    </span>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={posIdx === 0}
                        onClick={() => handleOrderSwap(posIdx, posIdx - 1)}
                        className="w-7 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-slate-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-[10px] font-black flex items-center justify-center"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={posIdx === currentOrder.length - 1}
                        onClick={() => handleOrderSwap(posIdx, posIdx + 1)}
                        className="w-7 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-slate-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-[10px] font-black flex items-center justify-center"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════
              7. DRAG — GHÉP CẶP KÉO THẢ
              Bên trái: các mục cố định (drop zone)
              Bên phải phía trên: ngân hàng mục cần ghép (draggable chips)
              ═══════════════════════════════════════════════════════════════════ */}
          {type === 'drag' && (question.pairs || []).length > 0 && (() => {
            const pairs = question.pairs || [];
            const leftItems = pairs.map(p => p.left);
            const rightItems = pairs.map(p => p.right);
            const currentPairs = typeof answer === 'object' && answer !== null ? answer : {};

            // Tìm các rightIdx đã được dùng
            const usedRightIdxs = new Set(Object.values(currentPairs).map(Number));

            return (
              <div className="space-y-4">
                {/* Ngân hàng đáp án — draggable chips */}
                <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    ✋ Kéo đáp án vào ô bên phải tương ứng:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rightItems.map((right, rIdx) => {
                      const isUsed = usedRightIdxs.has(rIdx);
                      return (
                        <span
                          key={rIdx}
                          draggable={!isUsed}
                          onDragStart={(e) => onDragStart(e, { type: 'drag-right', rightIdx: rIdx })}
                          className={`${DRAG_CHIP_BASE} ${isUsed
                            ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                            : DRAG_CHIP_IDLE
                          }`}
                        >
                          <GripVertical className="h-3.5 w-3.5 inline mr-1.5 text-slate-400" />
                          {right}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Vùng ghép cặp */}
                <div className="space-y-2.5">
                  {leftItems.map((left, leftIdx) => {
                    const pairedRightIdx = currentPairs[leftIdx];
                    const hasPair = pairedRightIdx !== undefined && pairedRightIdx !== null;
                    const isOver = dragOverTarget === `drag-left-${leftIdx}`;

                    return (
                      <div
                        key={leftIdx}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                      >
                        {/* Mục bên trái */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {left}
                          </span>
                        </div>

                        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />

                        {/* Drop zone bên phải */}
                        <div
                          onDragOver={(e) => onDragOver(e, `drag-left-${leftIdx}`)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => handleDropDragPair(e, leftIdx)}
                          className={`flex-1 min-w-[8rem] ${hasPair ? '' : `${DROP_ZONE_IDLE} ${isOver ? DROP_ZONE_ACTIVE : ''} px-3 py-2`}`}
                        >
                          {hasPair ? (
                            <div className={`${DRAG_CHIP_BASE} ${DRAG_CHIP_PLACED} flex items-center justify-between gap-2 cursor-default`}>
                              <span>{rightItems[pairedRightIdx]}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDragPair(leftIdx)}
                                className="w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-slate-400 hover:text-rose-500 flex items-center justify-center transition shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span>{isOver ? 'Thả vào đây ↓' : 'Kéo đáp án vào đây'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════
              8. GROUP DRAG — PHÂN LOẠI NHÓM KÉO THẢ
              Mục chưa phân loại: draggable chips phía trên
              Các nhóm: drop zones bên dưới, mỗi nhóm chứa các chip đã thả
              ═══════════════════════════════════════════════════════════════════ */}
          {type === 'groupdrag' && (question.groups || []).length > 0 && (() => {
            const groups = question.groups || [];
            // Thu thập tất cả items
            const allItems = [];
            groups.forEach((g) => {
              (g.items || []).forEach(item => {
                allItems.push(item);
              });
            });
            const currentMapping = typeof answer === 'object' && answer !== null ? answer : {};

            // Mục chưa được phân loại
            const unassignedItems = allItems.filter(item => currentMapping[item] === undefined);

            return (
              <div className="space-y-4">
                {/* Ngân hàng mục chưa phân loại */}
                <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    ✋ Kéo từng mục vào nhóm phù hợp:
                  </p>
                  <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                    {unassignedItems.length > 0 ? unassignedItems.map((item, idx) => (
                      <span
                        key={idx}
                        draggable
                        onDragStart={(e) => onDragStart(e, { type: 'group-item', itemText: item })}
                        className={`${DRAG_CHIP_BASE} ${DRAG_CHIP_IDLE}`}
                      >
                        <GripVertical className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                        {item}
                      </span>
                    )) : (
                      <span className="text-xs text-emerald-500 font-semibold italic py-2">
                        ✅ Tất cả mục đã được phân loại
                      </span>
                    )}
                  </div>
                </div>

                {/* Các nhóm — drop zones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groups.map((g, gIdx) => {
                    const isOver = dragOverTarget === `group-${gIdx}`;
                    const groupItems = allItems.filter(item => currentMapping[item] === gIdx);

                    return (
                      <div
                        key={gIdx}
                        onDragOver={(e) => onDragOver(e, `group-${gIdx}`)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => handleDropGroupDrag(e, gIdx)}
                        className={`rounded-2xl border-2 transition-all ${
                          isOver
                            ? 'border-brand-400 dark:border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        {/* Group header */}
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-2xl">
                          <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                            {g.name}
                          </span>
                        </div>

                        {/* Group content — items đã thả vào */}
                        <div className="p-3 min-h-[4rem] flex flex-wrap gap-2 content-start">
                          {groupItems.length > 0 ? groupItems.map((item, itemIdx) => (
                            <span
                              key={itemIdx}
                              draggable
                              onDragStart={(e) => onDragStart(e, { type: 'group-item', itemText: item })}
                              className={`${DRAG_CHIP_BASE} ${DRAG_CHIP_PLACED} flex items-center gap-1.5`}
                            >
                              {item}
                              <button
                                type="button"
                                onClick={() => handleRemoveGroupItem(item)}
                                className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-slate-400 hover:text-rose-500 flex items-center justify-center transition shrink-0"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          )) : (
                            <span className="text-xs text-slate-400 italic w-full text-center py-2">
                              {isOver ? '↓ Thả vào đây' : 'Kéo mục vào nhóm này'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════
              9. CLOZE DRAG — KÉO TỪ VÀO ĐOẠN VĂN
              Ngân hàng từ: draggable chips phía trên
              Chỗ trống: drop zones bên dưới
              ═══════════════════════════════════════════════════════════════════ */}
          {type === 'clozedrag' && (() => {
            const blanks = question.blanks || [];
            const wordBank = question.wordBank || question.words || [];
            const currentFills = typeof answer === 'object' && answer !== null ? answer : {};

            if (blanks.length === 0 && wordBank.length === 0) return null;

            // Từ đã được sử dụng
            const usedWords = new Set(Object.values(currentFills).filter(Boolean));

            return (
              <div className="space-y-4">
                {/* Ngân hàng từ — draggable */}
                {wordBank.length > 0 && (
                  <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      ✋ Kéo từ vào chỗ trống bên dưới:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {wordBank.map((word, wIdx) => {
                        const isUsed = usedWords.has(word);
                        return (
                          <span
                            key={wIdx}
                            draggable={!isUsed}
                            onDragStart={(e) => onDragStart(e, { type: 'cloze-word', word })}
                            className={`${DRAG_CHIP_BASE} ${isUsed
                              ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                              : DRAG_CHIP_IDLE
                            }`}
                          >
                            {!isUsed && <GripVertical className="h-3.5 w-3.5 inline mr-1 text-slate-400" />}
                            {word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chỗ trống — drop zones */}
                <div className="space-y-2.5">
                  {blanks.map((blank, bIdx) => {
                    const filledWord = currentFills[bIdx];
                    const hasFill = !!filledWord;
                    const isOver = dragOverTarget === `cloze-${bIdx}`;

                    return (
                      <div
                        key={bIdx}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                      >
                        <span className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xs shrink-0 border border-amber-200 dark:border-amber-800">
                          {bIdx + 1}
                        </span>

                        {blank.context && (
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex-1 min-w-0 font-medium">
                            {blank.context}
                          </span>
                        )}

                        {/* Drop zone */}
                        <div
                          onDragOver={(e) => onDragOver(e, `cloze-${bIdx}`)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => handleDropCloze(e, bIdx)}
                          className={`min-w-[8rem] ${hasFill ? '' : `${DROP_ZONE_IDLE} ${isOver ? DROP_ZONE_ACTIVE : ''} px-3 py-2`}`}
                        >
                          {hasFill ? (
                            <div className={`${DRAG_CHIP_BASE} ${DRAG_CHIP_PLACED} flex items-center justify-between gap-2 cursor-default`}>
                              <span>{filledWord}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCloze(bIdx)}
                                className="w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-slate-400 hover:text-rose-500 flex items-center justify-center transition shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span>{isOver ? 'Thả vào đây ↓' : '___________'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>
      </CardContent>
    </Card>
  );
}
