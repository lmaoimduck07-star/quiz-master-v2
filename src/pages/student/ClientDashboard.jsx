import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, Trophy, CheckCircle, LogOut, Sun, Moon,
  Shuffle, AlertCircle, FileText, ArrowRight, Sparkles, Filter, Shield
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SubjectGrid } from '@/components/student/pc/SubjectGrid';
import { ExamCard } from '@/components/student/pc/ExamCard';
import { HistoryCard } from '@/components/student/pc/HistoryCard';
import { PracticeModeModal } from '@/components/student/pc/PracticeModeModal';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { subscribeSubjects, loadExams } from '@/services/db/examService';
import { subscribeExamResults } from '@/services/db/sessionService';
import { getMistakes } from '@/utils/mistakeManager';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile, activeRole, setActiveRole, isAdmin, isLecturer, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();


  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [examResults, setExamResults] = useState([]);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubSubj = subscribeSubjects((list) => {
      const activeSubjects = list || [];
      setSubjects(activeSubjects);
      setLoading(false);

      // Cập nhật lại câu sai: chỉ giữ và đếm câu sai thuộc các môn đang tồn tại
      const validSubjectIds = activeSubjects.map((s) => s.id);
      if (currentUser?.uid || currentUser?.id) {
        const uid = currentUser.uid || currentUser.id;
        const validMistakes = getMistakes(uid, validSubjectIds);
        setMistakeCount(validMistakes?.length || 0);
      }

      // Auto select first subject if none selected
      setSelectedSubject((prev) => {
        if (prev && activeSubjects.some((s) => s.id === prev.id)) return prev;
        return activeSubjects[0] || null;
      });
    });

    return () => unsubSubj();
  }, [currentUser]);

  // Subscribe to user exam results
  useEffect(() => {
    if (!currentUser?.uid && !currentUser?.id) return;
    const uid = currentUser.uid || currentUser.id;
    const unsubRes = subscribeExamResults(uid, (list) => {
      setExamResults(list || []);
    });

    const validSubjectIds = subjects.map((s) => s.id);
    const userMistakes = getMistakes(uid, validSubjectIds.length > 0 ? validSubjectIds : null);
    setMistakeCount(userMistakes?.length || 0);

    return () => unsubRes();
  }, [currentUser, subjects]);

  // Load exams when selectedSubject changes
  useEffect(() => {
    if (!selectedSubject?.id) {
      setExams([]);
      return;
    }

    setLoadingExams(true);
    loadExams(selectedSubject.id)
      .then((list) => {
        setExams(list || []);
      })
      .finally(() => {
        setLoadingExams(false);
      });
  }, [selectedSubject]);

  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setIsModeModalOpen(true);
  };

  const handleStartExam = (mode) => {
    if (!selectedExam) return;
    setIsModeModalOpen(false);

    navigate('/client/exam', {
      state: {
        examId: selectedExam.id,
        title: selectedExam.title || selectedExam.config?.title || 'Bài thi trắc nghiệm',
        timeLimit: (selectedExam.config?.time || 15) * 60,
        mode: mode || 'practice',
        subjectName: selectedSubject?.name || '',
        subjectId: selectedSubject?.id || '',
      },
    });
  };

  const handleLogout = async () => {
    navigate('/login', { replace: true });
    await logout();
  };

  // Stats calculation
  const totalAttempts = examResults.length;
  const avgScore = totalAttempts > 0
    ? (examResults.reduce((acc, cur) => acc + (cur.score || 0), 0) / totalAttempts).toFixed(1)
    : '0.0';
  const passCount = examResults.filter((r) => (r.score || 0) >= 5).length;
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                Quiz Master
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  v2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Cổng Thi Trắc Nghiệm Trực Tuyến</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Chuyển nhanh phân hệ nếu tài khoản có role tương ứng */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveRole('Admin');
                  navigate('/admin/dashboard');
                }}
                icon={Shield}
                className="text-xs border-purple-400/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold"
              >
                Vào Quản Trị
              </Button>
            )}

            {isLecturer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveRole('Lecturer');
                  navigate('/lecturer/dashboard');
                }}
                icon={BookOpen}
                className="text-xs border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold"
              >
                Vào Giảng Dạy
              </Button>
            )}

            {mistakeCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/client/mistake-practice')}
                icon={AlertCircle}
                className="hidden sm:inline-flex text-xs border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400"
              >
                Ôn câu sai ({mistakeCount})
              </Button>
            )}

            <button
              onClick={toggleTheme}
              title={`Chuyển sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Thí sinh'}
                </div>
                <div className="text-[10px] text-slate-400">{activeRole || 'Học sinh'}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Welcome Banner & Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white border-0 shadow-xl shadow-brand-500/10">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Chúc bạn thi tốt!
                </span>
                <h2 className="text-2xl font-black text-white">
                  Chào mừng, {currentUser?.displayName || 'Thí sinh'}!
                </h2>
                <p className="text-xs text-white/80 mt-1 max-w-md leading-relaxed">
                  Lựa chọn học phần và bộ đề bên dưới để bắt đầu luyện tập hoặc tham gia kỳ thi kiểm tra trực tuyến.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/client/instant-practice')}
                  icon={Shuffle}
                  className="bg-white text-brand-700 hover:bg-slate-100 font-bold text-xs"
                >
                  Luyện đề tốc độ
                </Button>
                {mistakeCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/client/mistake-practice')}
                    icon={AlertCircle}
                    className="bg-amber-400/20 text-amber-100 hover:bg-amber-400/30 font-bold text-xs border border-amber-300/30"
                  >
                    Khắc phục {mistakeCount} câu sai
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{avgScore}</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Điểm trung bình</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Đạt {passRate}% (≥5đ)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{totalAttempts}</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Tổng lượt làm bài</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  {passCount} lần đạt
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Subjects Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              Danh Mục Môn Học
            </h3>
            <span className="text-xs text-slate-400">{subjects.length} môn học</span>
          </div>

          <SubjectGrid
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSelectSubject={(subj) => setSelectedSubject(subj)}
          />
        </div>

        {/* Section 2: Exams in Selected Subject */}
        {selectedSubject && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Danh Sách Đề Thi — {selectedSubject.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chọn đề thi để kiểm tra kiến thức
                </p>
              </div>
              <Badge variant="primary">{exams.length} đề thi</Badge>
            </div>

            {loadingExams ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Đang tải danh sách đề thi...
              </div>
            ) : exams.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                Môn học này hiện chưa có đề thi nào được kích hoạt.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onSelect={handleSelectExam}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Recent Exam History */}
        {examResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Lịch Sử Làm Bài Gần Đây
              </h3>
              <span className="text-xs text-slate-400">{examResults.length} bài thi</span>
            </div>

            <div className="space-y-2.5">
              {examResults.slice(0, 5).map((result) => (
                <HistoryCard key={result.id || result.submittedAt} result={result} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Practice Mode Choice Modal */}
      <PracticeModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        exam={selectedExam}
        onSelectMode={handleStartExam}
      />
    </div>
  );
}
