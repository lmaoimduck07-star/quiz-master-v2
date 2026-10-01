import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, Activity, LogOut, Sun, Moon,
  GraduationCap, Menu, X, ChevronRight, Shield
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useDevice } from '@/hooks/useDevice';
import { SubjectManager } from '@/components/lecturer/pc/exam-manager/SubjectManager';
import { ExamManager } from '@/components/lecturer/pc/exam-manager/ExamManager';
import { ExamEditor } from '@/components/lecturer/pc/exam-manager/ExamEditor';
import { ResultsPanel } from '@/components/lecturer/pc/ResultsPanel';
import { LiveMonitorStandby } from '@/components/lecturer/pc/LiveMonitorStandby';
import { LecturerMobileBlock } from '@/components/lecturer/mobile/LecturerMobileBlock';
import {
  subscribeSubjects,
  saveSubject,
  deleteSubject,
  loadExams,
  saveExam,
  saveQuestions,
  generateExamId,
  cleanupOrphanExamsAndQuestions
} from '@/services/db/examService';
import { subscribeExamResults } from '@/services/db/sessionService';

const NAV_ITEMS = [
  { id: 'subjects', label: 'Môn Học & Đề Thi', icon: BookOpen, desc: 'Ngân hàng câu hỏi & bộ đề' },
  { id: 'results', label: 'Kết Quả Thi', icon: BarChart3, desc: 'Bảng điểm & thống kê bài thi' },
  { id: 'live_monitor', label: 'Live Monitor', icon: Activity, desc: 'Giám sát trực tiếp (Standby)' },
];

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile, activeRole, setActiveRole, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobile } = useDevice();


  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If actual mobile device, show block
  if (isMobile) {
    return <LecturerMobileBlock />;
  }

  useEffect(() => {
    // Tự động kiểm tra và dọn dẹp các đề thi/câu hỏi mồ côi nếu môn học tương ứng không còn tồn tại
    cleanupOrphanExamsAndQuestions().catch(() => {});

    setLoading(true);
    const unsubSubj = subscribeSubjects((list) => {
      setSubjects(list || []);
      setCurrentSubject((prev) => {
        if (!prev?.id) return null;
        return list.find((s) => s.id === prev.id) || null;
      });
      setLoading(false);
    });

    const unsubResults = subscribeExamResults(null, (res) => {
      setExamResults(res || []);
    });

    return () => {
      unsubSubj();
      unsubResults();
    };
  }, []);

  const handleLogout = async () => {
    navigate('/login', { replace: true });
    await logout();
  };

  // CRUD Subjects
  const handleAddSubject = async (newSubj) => {
    await saveSubject(newSubj);
  };

  const handleDeleteSubject = async (subjId) => {
    await deleteSubject(subjId);
    if (currentSubject?.id === subjId) setCurrentSubject(null);
  };

  const handleUpdateSubject = async (subj) => {
    await saveSubject(subj);
  };

  // CRUD Exams
  const handleSaveExam = async (examId, config, questions) => {
    if (!currentSubject) return;

    const subjCode = currentSubject.code || 'MON';
    let newExamId = examId;
    let examCode = config.code;

    if (!examId || examId === 'new') {
      newExamId = await generateExamId(currentSubject.id, subjCode);
      const padded = newExamId.split('_bai_')[1] || '01';
      examCode = config.code || `${subjCode}_BAI_${padded}`;
    } else {
      examCode = config.code || examId.toUpperCase();
    }

    const newExam = {
      id: newExamId,
      subjectId: currentSubject.id,
      subjectCode: subjCode,
      code: examCode,
      title: config.title || 'Đề thi trắc nghiệm',
      config,
      totalQuestions: questions?.length || 0,
      updatedAt: new Date().toISOString(),
    };

    await saveExam(newExam);
    if (questions && questions.length > 0) {
      await saveQuestions(newExamId, questions);
    }
    setEditingExamId(null);
  };

  const handlePlayExam = async (examId) => {
    const exams = await loadExams(currentSubject.id);
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;

    navigate('/client/exam', {
      state: {
        examId: exam.id,
        title: exam.config?.title || exam.title,
        timeLimit: exam.config?.time ? exam.config.time * 60 : 15 * 60,
        mode: 'practice',
        subjectName: currentSubject.name,
      },
    });
  };

  // Render content of Subjects tab
  const renderSubjectsContent = () => {
    if (editingExamId !== null && currentSubject) {
      return (
        <ExamEditor
          subject={currentSubject}
          examId={editingExamId === 'new' ? null : editingExamId}
          onBack={() => setEditingExamId(null)}
          onSaveExam={handleSaveExam}
        />
      );
    }

    if (currentSubject) {
      return (
        <ExamManager
          subject={currentSubject}
          onBack={() => setCurrentSubject(null)}
          onOpenEditor={(id) => setEditingExamId(id || 'new')}
          onPlayExam={handlePlayExam}
        />
      );
    }

    return (
      <SubjectManager
        subjects={subjects}
        onAddSubject={handleAddSubject}
        onDeleteSubject={handleDeleteSubject}
        onUpdateSubject={handleUpdateSubject}
        onOpenSubject={(subj) => setCurrentSubject(subj)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Sidebar Desktop */}
      {editingExamId === null && (
        <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
          {/* Brand header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Quiz Master
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Lecturer
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bảng Điều Khiển Giảng Viên</p>
              </div>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Phân Hệ Giảng Viên
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'subjects' && editingExamId !== null) {
                      setEditingExamId(null);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-sm leading-tight">{item.label}</div>
                    <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User Card & Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'G'}
              </div>
              <div className="truncate flex-1">
                <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Giảng viên'}
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {activeRole || 'Giảng viên'}
                </div>
              </div>
              <button
                onClick={toggleTheme}
                title={`Chuyển sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

          {/* Quick Role Switchers */}
          <div className="space-y-1.5 mb-3">
            <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chuyển đổi phân hệ
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveRole('Admin');
                  navigate('/admin/dashboard');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Trung Tâm Quản Trị (Admin)</span>
              </button>
            )}
            <button
              onClick={() => {
                setActiveRole('Student');
                navigate('/client/dashboard');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span>Giao Diện Học Sinh</span>
            </button>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            icon={LogOut}
            className="w-full justify-center text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            Đăng Xuất
          </Button>
        </div>
      </aside>
    )}

    {/* Main Content Body */}
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
            GV
          </div>
          <span className="font-black text-slate-900 dark:text-white text-sm">Bảng Giảng Viên</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === item.id
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveRole('Admin');
                  navigate('/admin/dashboard');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <Shield className="h-4 w-4" /> Trung tâm Quản trị (Admin)
              </button>
            )}
            <button
              onClick={() => {
                setActiveRole('Student');
                navigate('/client/dashboard');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30"
            >
              <GraduationCap className="h-4 w-4" /> Giao diện Học sinh
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      )}

        {/* Dynamic Tab Views */}
        {activeTab === 'subjects' && editingExamId !== null && currentSubject ? (
          <div className="flex-1 overflow-y-auto">
            <ExamEditor
              subject={currentSubject}
              examId={editingExamId === 'new' ? null : editingExamId}
              onBack={() => setEditingExamId(null)}
              onSaveExam={handleSaveExam}
            />
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {activeTab === 'subjects' && renderSubjectsContent()}
            {activeTab === 'results' && <ResultsPanel examResults={examResults} />}
            {activeTab === 'live_monitor' && <LiveMonitorStandby />}
          </div>
        )}
      </main>
    </div>
  );
}
