import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Languages, LoaderCircle, Moon, Sun, Sparkles } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { tr } from '../lib/translations';
import { useTheme } from '../context/ThemeContext';

export function TeacherLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setError('');
    setLoggingIn(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (res.ok) {
        navigate('/youchem');
      } else {
        setError(tr('errWrongPass', lang));
      }
    } catch (err) {
      setError((err as DOMException)?.name === 'AbortError'
        ? (lang === 'ar' ? 'الطلب أخد وقت طويل، حاول تاني.' : 'The request took too long. Please try again.')
        : tr('errConnection', lang));
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="neon-card p-8 sm:p-10 rounded-3xl w-full max-w-md relative z-10">

        {/* Top bar controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="glass-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>بوابة المعلم</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              aria-label={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              className="theme-toggle"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-2 bg-white/50 dark:bg-white/5"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="mx-auto mb-6 flex flex-col items-center justify-center">
          <div className="p-3 bg-gradient-to-tr from-sky-500/10 to-teal-500/10 rounded-2xl border border-sky-500/20 mb-3 shadow-inner">
            <img
              src="/logo.png"
              alt="يوكيم"
              className="h-16 w-auto object-contain transition-transform hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="h-16 w-32 bg-sky-500/10 rounded-xl hidden flex items-center justify-center font-bold text-sky-600">YouChem</div>
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 dark:text-white tracking-tight">{tr('teacherDashboard', lang)}</h1>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-1">{tr('platformName', lang)}</p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl mb-5 text-sm text-center font-medium animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {tr('passwordLabel', lang)}
            </label>
            <input
              type="password"
              required
              className="neon-input w-full px-4 py-3 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loggingIn} className="neon-btn w-full font-bold py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
            {loggingIn ? <LoaderCircle className="w-5 h-5 animate-spin" /> : tr('loginBtn', lang)}
          </button>
        </form>
      </div>
    </div>
  );
}
