import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Key, Layers, Upload, FileQuestion, FileText, Users, Mail, Menu, X, LogOut, FolderOpen, Settings, Sun, Moon, Folder, ClipboardCheck, ListChecks, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/youchem/upload', label: 'إدارة الفيديوهات', icon: Upload },
  { path: '/youchem/codes', label: 'الأكواد', icon: Key },
  { path: '/youchem/multi-codes', label: 'الأكواد المتعددة', icon: Layers },
  { path: '/youchem/promo-code', label: 'Promo Code', icon: Sparkles },
  { path: '/youchem/quizzes', label: 'الامتحانات', icon: FileQuestion },
  { path: '/youchem/grades', label: 'درجات الامتحان', icon: ClipboardCheck },
  { path: '/youchem/quiz-grades', label: 'درجات الكويزات', icon: ListChecks },
  { path: '/youchem/homework', label: 'الواجبات', icon: FileText },
  { path: '/youchem/files', label: 'الملفات', icon: Folder },
  { path: '/youchem/students', label: 'الطلاب', icon: Users },
  { path: '/youchem/emails', label: 'الإيميلات', icon: Mail },
  { path: '/youchem/student-files', label: 'ملفات الطلاب', icon: FolderOpen },
  { path: '/youchem/settings', label: 'الإعدادات', icon: Settings },
];

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await fetch('/api/teacher/logout', { method: 'POST' });
    navigate('/youchem/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-[#090d16]" dir="rtl">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 neon-panel border-l border-slate-200/80 dark:border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>

        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="YouChem"
              className="h-11 w-auto object-contain transition-transform hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">YouChem</span>
              <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">لوحة المدرس</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/10 to-teal-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 neon-panel border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-slate-200/80 dark:border-white/10"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                م
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:block text-xs">مستر أحمد</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
