import { useState, useRef, useCallback } from 'react';
import { analyzeWordFile, analyzeWordFileWithAI, analyzeImageFilesWithAI } from '../../../../utils/wordParser';
import { autoDetectMissingAnswersWithAI, hasGeminiApiKey, saveGeminiApiKey } from '../../../../utils/gemini';
import { Button } from '../../../common/Button';
import {
  Upload, ChevronRight, ChevronLeft, Check, Trash2,
  FileText, AlertTriangle, CheckSquare, Square, Loader2,
  BookOpen, X, FileWarning, Zap, Sparkles, Bot, Camera, Image as ImageIcon,
  ScanLine, Key, Eye, EyeOff
} from 'lucide-react';

const TYPE_LABELS = {
  single:           'Trắc nghiệm',
  multiselect:      'Nhiều đáp án',
  fill:             'Điền từ',
  truefalse:        'Đúng / Sai',
  multitruefalse:   'Đúng/Sai (nhiều phát biểu)',
  order:            'Sắp xếp',
  drag:             'Ghép cặp',
  groupdrag:        'Phân loại nhóm',
  clozedrag:        'Kéo vào đoạn văn',
};

const PART_COLORS = {
  1: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800',
  2: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
  3: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  4: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  5: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  6: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
};

// ─── SOURCE TABS: Word / Ảnh chụp ─────────────────────────────
const SOURCE_TABS = [
  { id: 'word',  label: 'File Word (.docx)', icon: FileText },
  { id: 'image', label: 'Ảnh Chụp / Scan',   icon: Camera },
];

export default function WordImportModal({ isOpen, onClose, onImport }) {
  const [step,          setStep]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [fileName,      setFileName]      = useState('');
  const [analysisData,  setAnalysisData]  = useState(null);
  const [selected,      setSelected]      = useState({});
  const [preview,       setPreview]       = useState([]);
  const [dragOver,      setDragOver]      = useState(false);

  // Word import state
  const [importMode,    setImportMode]    = useState('fast');
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiProgress,    setAiProgress]    = useState({ done: 0, total: 0 });

  // Image import state
  const [sourceTab,     setSourceTab]     = useState('word');
  const [imageFiles,    setImageFiles]    = useState([]);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [imageLoading,  setImageLoading]  = useState(false);
  const [imageProgress, setImageProgress] = useState({ done: 0, total: 0 });

  // Shared fix state
  const [aiFixLoading,  setAiFixLoading]  = useState(false);
  const [aiFixProgress, setAiFixProgress] = useState({ done: 0, total: 0 });
  const [loadingMsg,    setLoadingMsg]    = useState('');

  // Inline API Key input
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  const fileRef  = useRef(null);
  const imageRef = useRef(null);

  function reset() {
    setStep(1); setLoading(false); setError('');
    setFileName(''); setAnalysisData(null);
    setSelected({}); setPreview([]); setDragOver(false);
    setAiLoading(false); setAiProgress({ done: 0, total: 0 });
    setImageFiles([]); setImageLoading(false); setImageProgress({ done: 0, total: 0 });
    setAiFixLoading(false); setAiFixProgress({ done: 0, total: 0 });
    setLoadingMsg('');
    setShowApiKeyPrompt(false);
  }

  function handleClose() { reset(); onClose(); }

  // ─── WORD FILE PROCESSING ────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.docx')) {
      setError('Vui lòng chọn file .docx hợp lệ.'); return;
    }
    setFileName(file.name); setError('');

    if (importMode === 'ai') {
      if (!hasGeminiApiKey()) {
        setShowApiKeyPrompt(true);
        setError('Vui lòng nhập API Key Gemini để bắt đầu sử dụng chế độ AI. (Mã lỗi: SYS-02)');
        return;
      }
      setAiLoading(true);
      setAiProgress({ done: 0, total: 1 });
      setLoadingMsg('🤖 AI đang phân tích file Word...');
      try {
        const data = await analyzeWordFileWithAI(file, (done, total) => {
          setAiProgress({ done, total: total || 1 });
          setLoadingMsg(`AI đang xử lý... (${done}/${total} phần)`);
        });
        setAnalysisData(data);
        setSelected({});
        setStep(2);
      } catch (e) {
        console.error(e);
        const msg = e.message || '';
        if (msg.includes('SYS-02') || msg.includes('API Key') || msg.includes('API_KEY') || msg.includes('UNAUTHENTICATED') || msg.includes('401')) {
          setShowApiKeyPrompt(true);
        }
        setError(msg || 'Không thể phân tích file bằng AI. Hãy kiểm tra lại API Key hoặc dùng Import Nhanh. (Mã lỗi: WI-02)');
      } finally {
        setAiLoading(false);
        setLoadingMsg('');
      }
    } else {
      setLoading(true);
      setLoadingMsg('Đang phân tích file...');
      try {
        const data = await analyzeWordFile(file);
        setAnalysisData(data);
        const initSel = {};
        (data.sections || []).forEach(s => { initSel[s.key] = true; });
        setSelected(initSel);
        setStep(2);
      } catch (e) {
        console.error(e);
        setError('Không thể đọc file. Hãy kiểm tra lại định dạng .docx. (Mã lỗi: WI-01)');
      } finally {
        setLoading(false);
        setLoadingMsg('');
      }
    }
  }, [importMode]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  // ─── IMAGE FILE PROCESSING ───────────────────────────────────
  function handleImageSelect(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f =>
      /\.(png|jpe?g|webp)$/i.test(f.name) || /^image\//i.test(f.type)
    );
    if (validFiles.length === 0) {
      setError('Chỉ hỗ trợ file ảnh PNG, JPG, JPEG, WebP.'); return;
    }
    setError('');
    setImageFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newFiles = validFiles.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newFiles];
    });
  }

  function removeImageFile(idx) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function processImageFiles() {
    if (imageFiles.length === 0) {
      setError('Chưa chọn ảnh nào.'); return;
    }
    if (!hasGeminiApiKey()) {
      setShowApiKeyPrompt(true);
      setError('Vui lòng nhập API Key Gemini để sử dụng AI Vision nhận diện ảnh. (Mã lỗi: SYS-02)');
      return;
    }
    setImageLoading(true);
    setImageProgress({ done: 0, total: imageFiles.length });
    setLoadingMsg(`🔍 AI Vision đang đọc ${imageFiles.length} trang đề thi...`);
    setError('');
    try {
      const data = await analyzeImageFilesWithAI(imageFiles, (done, total) => {
        setImageProgress({ done, total: total || 1 });
        setLoadingMsg(`AI Vision đang đọc trang ${done + 1}/${total}...`);
      });
      setAnalysisData(data);
      setFileName(`${imageFiles.length} ảnh chụp đề thi`);
      setSelected({});
      setStep(2);
    } catch (e) {
      console.error(e);
      const msg = e.message || '';
      if (msg.includes('SYS-02') || msg.includes('API Key') || msg.includes('API_KEY') || msg.includes('UNAUTHENTICATED') || msg.includes('401')) {
        setShowApiKeyPrompt(true);
      }
      setError(msg || 'AI Vision không thể nhận diện đề thi. Hãy thử ảnh rõ nét hơn hoặc kiểm tra API Key. (Mã lỗi: WI-03)');
    } finally {
      setImageLoading(false);
      setLoadingMsg('');
    }
  }

  // ─── STEP 2 / 3 LOGIC ───────────────────────────────────────
  function toggleSection(key) {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function selectAll()   { const s = {}; (analysisData?.sections || []).forEach(sec => { s[sec.key] = true; }); setSelected(s); }
  function deselectAll() { setSelected({}); }

  function goToPreview() {
    const qs = [];
    if (analysisData?.format === 'ai' || analysisData?.format === 'image_ai') {
      qs.push(...(analysisData?.questions || []));
    } else {
      (analysisData?.sections || []).forEach(sec => {
        if (selected[sec.key]) qs.push(...sec.questions);
      });
      if (analysisData?.format === 'classic') qs.push(...(analysisData?.questions || []));
    }
    if (qs.length === 0) { setError('Không tìm thấy câu hỏi nào để import.'); return; }
    setError('');
    setPreview(qs.map((q, i) => ({ ...q, _previewId: i })));
    setStep(3);
  }

  function removeQuestion(id) {
    setPreview(prev => prev.filter(q => q._previewId !== id));
  }

  function handleConfirmImport() {
    if (preview.length === 0) return;
    const clean = preview.map(({ _bai, _part, _previewId, _needsReview, ...rest }) => rest);
    onImport(clean);
    handleClose();
  }

  async function handleAIFixReview() {
    const reviewItems = preview.filter(q => q._needsReview);
    if (reviewItems.length === 0) return;
    if (!hasGeminiApiKey()) {
      setShowApiKeyPrompt(true);
      setError('Chưa cấu hình API Key Gemini. (Mã lỗi: SYS-02)');
      return;
    }
    setAiFixLoading(true);
    setAiFixProgress({ done: 0, total: reviewItems.length });
    setError('');
    try {
      const fixed = await autoDetectMissingAnswersWithAI(reviewItems, (done, total) => {
        setAiFixProgress({ done, total: total || 1 });
      });
      const fixedMap = {};
      reviewItems.forEach((q, i) => { fixedMap[q._previewId] = fixed[i]; });
      setPreview(prev => prev.map(q =>
        fixedMap[q._previewId] ? { ...fixedMap[q._previewId], _previewId: q._previewId } : q
      ));
    } catch (e) {
      console.error(e);
      const msg = e.message || '';
      if (msg.includes('SYS-02') || msg.includes('API Key') || msg.includes('API_KEY') || msg.includes('UNAUTHENTICATED') || msg.includes('401')) {
        setShowApiKeyPrompt(true);
      }
      setError(msg || 'AI gặp lỗi khi sửa đáp án. Vui lòng thử lại. (Mã lỗi: A01)');
    } finally {
      setAiFixLoading(false);
    }
  }

  const reviewCount   = preview.filter(q => q._needsReview).length;
  const selectedCount = analysisData?.format === 'ai' || analysisData?.format === 'image_ai'
    ? (analysisData?.questions?.length || 0)
    : analysisData?.format === 'classic'
      ? (analysisData?.questions?.length || 0)
      : (analysisData?.sections || []).filter(s => selected[s.key]).reduce((sum, s) => sum + s.questions.length, 0);

  const isWordLoading  = loading || aiLoading;

  if (!isOpen) return null;

  const aiProgressPct      = aiProgress.total > 0 ? Math.round((aiProgress.done / aiProgress.total) * 100) : 0;
  const imageProgressPct   = imageProgress.total > 0 ? Math.round((imageProgress.done / imageProgress.total) * 100) : 0;
  const aiFixProgressPct   = aiFixProgress.total > 0 ? Math.round((aiFixProgress.done / aiFixProgress.total) * 100) : 0;

  const getSubtitle = () => {
    if (step === 2) return 'Chọn nội dung muốn import';
    if (step === 3) return 'Xem trước & xác nhận';
    return sourceTab === 'image' ? 'Tải lên ảnh chụp / scan đề thi' : 'Tải lên file .docx';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">

        {/* ─── HEADER ─── */}
        <div className={`flex items-center gap-4 px-7 py-5 text-white ${
          sourceTab === 'image' && step === 1
            ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600'
            : 'bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600'
        }`}>
          <div className="bg-white/20 rounded-2xl p-2.5 shrink-0">
            {sourceTab === 'image' && step === 1 ? <ScanLine className="h-6 w-6 text-white" /> : <Sparkles className="h-6 w-6 text-white" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">✨ Nhận Diện Đề Thi AI</h2>
            <p className="text-white/80 text-xs mt-0.5">{getSubtitle()}</p>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
                step === s ? 'bg-white text-brand-700 shadow-md' : step > s ? 'bg-white/40 text-white' : 'bg-white/20 text-white/50'
              }`}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
            ))}
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white p-1 rounded-lg transition ml-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── BODY ─── */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          {/* Inline API Key Prompt nếu chưa có key hoặc muốn đổi */}
          {showApiKeyPrompt && (
            <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-violet-800 dark:text-violet-300 font-bold text-xs">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-violet-600" />
                  <span>Nhập API Key Gemini để sử dụng tính năng AI (Lưu tại trình duyệt):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyPrompt(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Dán mã API Key của bạn (AIzaSy...)"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-violet-300 dark:border-violet-800 rounded-xl font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (tempApiKey.trim()) {
                      saveGeminiApiKey(tempApiKey.trim());
                      setShowApiKeyPrompt(false);
                      setError('');
                    }
                  }}
                >
                  Lưu & Sử dụng
                </Button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 1 ══════════ */}
          {step === 1 && (
            <div className="space-y-5">
              {/* SOURCE TABS */}
              <div className="flex rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm p-1 bg-slate-100 dark:bg-slate-800">
                {SOURCE_TABS.map((tab) => {
                  const isActive = sourceTab === tab.id;
                  const Icon = tab.icon;
                  const activeClass = tab.id === 'image'
                    ? 'bg-fuchsia-600 text-white shadow-sm'
                    : 'bg-brand-600 text-white shadow-sm';

                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setSourceTab(tab.id); setError(''); setImageFiles([]); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? activeClass
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ─── WORD TAB ─── */}
              {sourceTab === 'word' && (
                <div className="space-y-4">
                  {/* Word mode toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-1 bg-slate-100 dark:bg-slate-800">
                    <button
                      onClick={() => setImportMode('fast')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        importMode === 'fast'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      ⚡ Import Nhanh (Quy tắc OOXML)
                    </button>
                    <button
                      onClick={() => {
                        setImportMode('ai');
                        if (!hasGeminiApiKey()) setShowApiKeyPrompt(true);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        importMode === 'ai'
                          ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      🤖 Import Thông Minh (Gemini AI)
                    </button>
                  </div>

                  {importMode === 'ai' && (
                    <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                      <div className="flex gap-3">
                        <Bot className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-violet-800 dark:text-violet-300">
                          <p className="font-bold mb-0.5">Bóc tách thông minh bằng Gemini AI</p>
                          <p className="text-violet-600 dark:text-violet-400">
                            Nhận diện câu hỏi ngay cả khi file Word không tuân chuẩn. Yêu cầu API Key Gemini đã được cấu hình.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKeyPrompt(p => !p)}
                        className="text-xs font-bold text-violet-700 dark:text-violet-300 underline shrink-0 hover:text-violet-900"
                      >
                        {showApiKeyPrompt ? 'Đóng' : 'Cấu hình Key'}
                      </button>
                    </div>
                  )}

                  {/* Word Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => !isWordLoading && fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                      dragOver
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 scale-[1.01]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {isWordLoading ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className={`h-12 w-12 animate-spin ${aiLoading ? 'text-violet-500' : 'text-brand-500'}`} />
                        <p className={`font-bold text-base ${aiLoading ? 'text-violet-600 dark:text-violet-400' : 'text-brand-600 dark:text-brand-400'}`}>
                          {loadingMsg || 'Đang phân tích file...'}
                        </p>
                        {aiLoading && aiProgress.total > 1 && (
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-xs text-violet-600 dark:text-violet-400 font-semibold">
                              <span>Xử lý phần {aiProgress.done}/{aiProgress.total}</span>
                              <span>{aiProgressPct}%</span>
                            </div>
                            <div className="w-full bg-violet-100 dark:bg-violet-950 rounded-full h-2">
                              <div
                                className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${aiProgressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className={`p-4 rounded-2xl shadow-inner ${
                          importMode === 'ai'
                            ? 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950 dark:to-purple-950 text-violet-600 dark:text-violet-400'
                            : 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400'
                        }`}>
                          {importMode === 'ai' ? <Sparkles className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            Kéo thả file .docx vào đây
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">hoặc nhấn để duyệt file từ máy tính</p>
                        </div>
                        <Button size="sm" variant={importMode === 'ai' ? 'primary' : 'outline'} className="mt-1">
                          Chọn file .docx
                        </Button>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={(e) => processFile(e.target.files[0])} />

                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex gap-3">
                    <BookOpen className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 dark:text-blue-300">
                      <p className="font-bold mb-1">Định dạng hỗ trợ:</p>
                      <ul className="space-y-0.5 text-blue-600 dark:text-blue-400">
                        <li>• <strong>Ngoại Ngữ 4</strong>: Tự động nhận diện BAI / Part 1–6, 6 dạng bài</li>
                        <li>• <strong>Định dạng chuẩn</strong>: Câu 1:, Câu 2:, đáp án in đậm / Đáp án:</li>
                        <li>• <strong>AI (Thông minh)</strong>: Mọi định dạng — AI tự nhận diện cấu trúc</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── IMAGE TAB ─── */}
              {sourceTab === 'image' && (
                <div className="space-y-4">
                  <div className="bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-200 dark:border-fuchsia-900 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex gap-3">
                      <ScanLine className="h-5 w-5 text-fuchsia-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-fuchsia-800 dark:text-fuchsia-300">
                        <p className="font-bold mb-0.5">AI Vision — Bóc tách từ ảnh chụp đề thi</p>
                        <p className="text-fuchsia-700 dark:text-fuchsia-400">
                          Chụp ảnh đề thi giấy / file scan hoặc screenshot → AI tự động OCR và nhận diện 9 dạng câu hỏi. Yêu cầu API Key Gemini.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPrompt(p => !p)}
                      className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 underline shrink-0 hover:text-fuchsia-900"
                    >
                      {showApiKeyPrompt ? 'Đóng' : 'Cấu hình Key'}
                    </button>
                  </div>

                  {/* Image Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                    onDragLeave={() => setImageDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setImageDragOver(false); handleImageSelect(e.dataTransfer.files); }}
                    onClick={() => !imageLoading && imageRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                      imageDragOver
                        ? 'border-fuchsia-500 bg-fuchsia-50/60 dark:bg-fuchsia-950/40 scale-[1.01]'
                        : imageFiles.length > 0
                          ? 'border-fuchsia-300 dark:border-fuchsia-800 bg-fuchsia-50/30 dark:bg-fuchsia-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-fuchsia-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {imageLoading ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="relative">
                          <ScanLine className="h-12 w-12 text-fuchsia-500 animate-pulse" />
                          <Loader2 className="h-6 w-6 text-fuchsia-600 animate-spin absolute -right-2 -bottom-2" />
                        </div>
                        <p className="font-bold text-base text-fuchsia-600 dark:text-fuchsia-400">
                          {loadingMsg || 'AI Vision đang quét ảnh...'}
                        </p>
                        {imageProgress.total > 0 && (
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-xs text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                              <span>Trang {imageProgress.done + 1}/{imageProgress.total}</span>
                              <span>{imageProgressPct}%</span>
                            </div>
                            <div className="w-full bg-fuchsia-100 dark:bg-fuchsia-950 rounded-full h-2">
                              <div
                                className="bg-fuchsia-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(imageProgressPct, 5)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : imageFiles.length > 0 ? (
                      <div className="w-full space-y-3">
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 w-full">
                          {imageFiles.slice(0, 7).map((f, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={URL.createObjectURL(f)}
                                alt={f.name}
                                className="w-full h-20 object-cover rounded-xl border-2 border-fuchsia-200 dark:border-fuchsia-800 shadow-sm"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); removeImageFile(i); }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <p className="text-[10px] text-slate-500 truncate mt-1">{f.name}</p>
                            </div>
                          ))}
                          {imageFiles.length > 7 && (
                            <div className="w-full h-20 rounded-xl border-2 border-dashed border-fuchsia-300 dark:border-fuchsia-800 flex items-center justify-center">
                              <span className="text-fuchsia-600 dark:text-fuchsia-400 font-black text-sm">
                                +{imageFiles.length - 7}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-fuchsia-700 dark:text-fuchsia-300 font-bold">
                            Đã chọn {imageFiles.length} trang ảnh
                          </span>
                          <span className="text-slate-400 text-[11px]">Nhấn hoặc kéo thêm ảnh</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-100 to-purple-100 dark:from-fuchsia-950 dark:to-purple-950 text-fuchsia-600 dark:text-fuchsia-400 shadow-inner">
                          <Camera className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            Kéo thả ảnh đề thi vào đây
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, JPEG, WebP — chọn nhiều ảnh cùng lúc</p>
                        </div>
                        <Button size="sm" variant="primary" className="mt-1 bg-fuchsia-600 hover:bg-fuchsia-700">
                          <ImageIcon className="h-4 w-4 mr-1.5" /> Chọn ảnh đề thi
                        </Button>
                      </>
                    )}
                  </div>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageSelect(e.target.files)}
                  />

                  {imageFiles.length > 0 && !imageLoading && (
                    <button
                      onClick={processImageFiles}
                      className="w-full py-3 rounded-2xl font-black text-white shadow-lg shadow-fuchsia-600/30 transition flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:opacity-95 cursor-pointer"
                    >
                      <ScanLine className="h-4 w-4" />
                      Bắt Đầu Nhận Diện AI Vision ({imageFiles.length} trang)
                    </button>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      <p className="font-bold mb-1">Mẹo để AI nhận diện chính xác:</p>
                      <ul className="space-y-0.5 text-amber-700 dark:text-amber-400">
                        <li>• Chụp ảnh đề thi thẳng góc, đủ sáng, không bị mờ hoặc nghiêng nhiều</li>
                        <li>• Mỗi file ảnh là 1 trang đề thi (tránh chụp nhiều trang trên 1 ảnh)</li>
                        <li>• Sắp xếp ảnh theo đúng thứ tự trang trước khi nhận diện</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-700 dark:text-red-300">
                  <div className="flex items-start gap-3">
                    <FileWarning className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold">{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyPrompt(true)}
                    className="text-xs font-bold text-red-800 dark:text-red-200 underline shrink-0 hover:opacity-80 ml-2"
                  >
                    Đổi API Key
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════ STEP 2: SELECT SECTIONS / FORMAT ══════════ */}
          {step === 2 && analysisData && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                {analysisData.format === 'image_ai' ? (
                  <Camera className="h-5 w-5 text-fuchsia-500 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-slate-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{fileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tổng: <strong>{analysisData.questions?.length ?? 0}</strong> câu hỏi • Phương thức:{' '}
                    <span className={`font-bold ${
                      analysisData.format === 'image_ai'   ? 'text-fuchsia-600 dark:text-fuchsia-400' :
                      analysisData.format === 'ngoaingu4'  ? 'text-indigo-600 dark:text-indigo-400' :
                      analysisData.format === 'ai'         ? 'text-violet-600 dark:text-violet-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {analysisData.format === 'image_ai'  ? '📷 AI Vision (Ảnh chụp)'
                       : analysisData.format === 'ngoaingu4' ? '✅ Ngoại Ngữ 4'
                       : analysisData.format === 'ai'        ? '🤖 AI (Gemini Word)'
                       : '✅ Định dạng chuẩn'}
                    </span>
                  </p>
                </div>
              </div>

              {(analysisData.format === 'ai' || analysisData.format === 'image_ai') && (
                <div className="text-center py-10 text-slate-500 space-y-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    analysisData.format === 'image_ai' ? 'bg-fuchsia-100 dark:bg-fuchsia-950/60' : 'bg-violet-100 dark:bg-violet-950/60'
                  }`}>
                    {analysisData.format === 'image_ai' ? (
                      <Camera className="h-8 w-8 text-fuchsia-600" />
                    ) : (
                      <Sparkles className="h-8 w-8 text-violet-500" />
                    )}
                  </div>
                  <p className="font-black text-slate-700 dark:text-slate-200 text-lg">
                    {analysisData.format === 'image_ai' ? '📷' : '🤖'} AI đã bóc tách {analysisData.questions.length} câu hỏi
                  </p>
                  <p className="text-xs text-slate-400">
                    Nhấn <strong>Tiếp theo</strong> để xem trước và xác nhận trước khi import vào đề thi.
                  </p>
                </div>
              )}

              {analysisData.format === 'classic' && (
                <div className="text-center py-10 text-slate-500 space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="font-black text-slate-700 dark:text-slate-200 text-lg">
                    Phát hiện {analysisData.questions.length} câu hỏi
                  </p>
                  <p className="text-xs text-slate-400">
                    Định dạng chuẩn không cần chọn phần riêng. Nhấn <strong>Tiếp theo</strong> để xem trước.
                  </p>
                </div>
              )}

              {analysisData.format === 'ngoaingu4' && analysisData.sections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-700 dark:text-slate-200">
                      Chọn Bài / Part muốn import
                    </h3>
                    <div className="flex gap-3 text-xs">
                      <button onClick={selectAll} className="font-bold text-brand-600 hover:underline flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" /> Chọn tất cả
                      </button>
                      <button onClick={deselectAll} className="font-bold text-slate-400 hover:underline flex items-center gap-1">
                        <Square className="h-3.5 w-3.5" /> Bỏ hết
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const baiMap = new Map();
                    analysisData.sections.forEach(s => {
                      if (!baiMap.has(s.bai)) baiMap.set(s.bai, []);
                      baiMap.get(s.bai).push(s);
                    });
                    return Array.from(baiMap.entries()).map(([bai, sections]) => (
                      <div key={bai} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-500" />
                          <span className="font-black text-slate-800 dark:text-slate-100 text-xs">{bai}</span>
                          <span className="text-[11px] text-slate-400 ml-auto">
                            {sections.reduce((s, sec) => s + sec.questions.length, 0)} câu
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-800">
                          {sections.map(sec => {
                            const isChecked = !!selected[sec.key];
                            const partColor = PART_COLORS[sec.part] || 'bg-slate-100 text-slate-600 border-slate-300';
                            return (
                              <button
                                key={sec.key}
                                onClick={() => toggleSection(sec.key)}
                                className="bg-white dark:bg-slate-900 p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition ${
                                  isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 dark:border-slate-700'
                                }`}>
                                  {isChecked && <Check className="h-3 w-3" />}
                                </div>
                                <div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${partColor}`}>
                                    Part {sec.part}
                                  </span>
                                  <p className="text-[11px] text-slate-400 mt-1">{sec.questions.length} câu</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ══════════ STEP 3: PREVIEW & CONFIRM ══════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className={`flex items-start justify-between gap-3 p-4 rounded-2xl border ${
                reviewCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {reviewCount > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    ) : (
                      <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                    )}
                    <p className={`font-bold text-xs sm:text-sm ${
                      reviewCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {preview.length} câu hỏi sẵn sàng import
                      {reviewCount > 0 && ` • ⚠️ ${reviewCount} câu cần kiểm tra lại đáp án`}
                    </p>
                  </div>
                  {reviewCount > 0 && !aiFixLoading && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Các câu đánh dấu ⚠️ chưa xác định được đáp án đúng. Dùng AI sửa tự động hoặc sửa thủ công sau khi import.
                    </p>
                  )}
                </div>

                {reviewCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAIFixReview}
                    disabled={aiFixLoading}
                    className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm"
                  >
                    {aiFixLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                    {aiFixLoading ? 'AI đang sửa...' : `AI sửa ${reviewCount} câu`}
                  </Button>
                )}
              </div>

              {aiFixLoading && (
                <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-violet-600 dark:text-violet-400 font-semibold">
                    <span>AI đang suy luận đáp án... ({aiFixProgress.done}/{aiFixProgress.total} câu)</span>
                    <span>{aiFixProgressPct}%</span>
                  </div>
                  <div className="w-full bg-violet-100 dark:bg-violet-950 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${aiFixProgressPct > 0 ? aiFixProgressPct : 10}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {preview.map((q, idx) => {
                  const typeLabel = TYPE_LABELS[q.type] || q.type;
                  const partColor = PART_COLORS[q._part] || 'bg-slate-100 text-slate-600 border-slate-300';

                  return (
                    <div
                      key={q._previewId}
                      className={`flex items-start gap-3 p-4 rounded-2xl border transition group ${
                        q._needsReview
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="text-slate-400 font-black text-xs w-6 shrink-0 mt-0.5">{idx + 1}</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {q._bai && <span className="text-[11px] text-slate-400 font-semibold">{q._bai}</span>}
                          {q._part && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${partColor}`}>
                              Part {q._part}
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
                            {typeLabel}
                          </span>
                          {q._needsReview && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Cần review
                            </span>
                          )}
                        </div>

                        <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed line-clamp-2">
                          {q.question || q.content}
                        </p>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                          {q.type === 'single'         && q.options && <>Đúng: <strong className="text-emerald-600 dark:text-emerald-400">{q.options[q.correct]}</strong></>}
                          {q.type === 'multiselect'    && <>{(q.corrects||[]).length} đáp án đúng</>}
                          {q.type === 'fill'           && <>Đáp án: <strong className="text-emerald-600 dark:text-emerald-400">{q.answer}</strong></>}
                          {q.type === 'truefalse'      && <>Đáp án: <strong className="text-emerald-600 dark:text-emerald-400">{q.correct ? 'Đúng' : 'Sai'}</strong></>}
                          {q.type === 'multitruefalse' && <>{(q.statements||[]).length} phát biểu — {(q.statements||[]).filter(s=>s.correct).length} Đúng / {(q.statements||[]).filter(s=>!s.correct).length} Sai</>}
                          {q.type === 'drag'           && <>{(q.pairs||[]).length} cặp ghép</>}
                          {q.type === 'groupdrag'      && <>{(q.groups||[]).length} nhóm</>}
                          {q.type === 'order'          && <>{(q.items||[]).length} mục sắp xếp</>}
                          {q.type === 'clozedrag'      && <>{(q.answers||[]).length} chỗ trống</>}
                        </div>
                      </div>

                      <button
                        onClick={() => removeQuestion(q._previewId)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition shrink-0 p-1"
                        title="Xóa câu này khỏi danh sách"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {preview.length === 0 && (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Trash2 className="h-10 w-10 mx-auto opacity-30" />
                  <p className="font-bold text-sm">Không còn câu hỏi nào.</p>
                  <p className="text-xs">Quay lại để chọn lại.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            {step === 1 && <Button variant="outline" onClick={handleClose}>Hủy</Button>}
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => { setError(''); setStep(s => s - 1); }}
                icon={ChevronLeft}
              >
                Quay lại
              </Button>
            )}
          </div>
          <div>
            {step === 2 && (
              <Button onClick={goToPreview} icon={ChevronRight}>
                Xem trước ({selectedCount} câu)
              </Button>
            )}
            {step === 3 && (
              <Button
                variant="success"
                onClick={handleConfirmImport}
                disabled={preview.length === 0 || aiFixLoading}
                icon={Check}
              >
                Nhập vào đề ({preview.length} câu)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
