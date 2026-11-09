import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  Key,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Maximize,
  Minimize,
} from 'lucide-react';
import { BunnyVideo } from '../components/BunnyVideo';
import { VideoWatermark } from '../components/VideoWatermark';
import { QuizAnswerReview } from '../components/QuizAnswerReview';
import { startPageTransition } from '../lib/viewTransitions';

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export function LessonView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<{ id?: string; name?: string; phone?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const quizFetchGeneration = useRef(0);

  const [code, setCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizLoadState, setQuizLoadState] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  const [quizLoadError, setQuizLoadError] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // When true, student dismissed the quiz with X — video stays accessible (unless locked)
  const [quizDismissed, setQuizDismissed] = useState(false);

  /* ── Keyboard navigation for Quiz ── */
  const [focusedQIdx, setFocusedQIdx] = useState(0);

  /* ── Fullscreen Support (persists watermark across fullscreen) ── */
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      const elem = videoContainerRef.current;
      if (!elem) return;

      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const fsElem = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(Boolean(fsElem));
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Listen for 'F' key to toggle fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Listen for Bunny player postMessage fullscreen triggers
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && (data.event === 'fullscreen' || data.event === 'requestFullscreen' || data.method === 'fullscreen')) {
          toggleFullscreen();
        }
      } catch {
        // Not a JSON message, ignore
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── Viewing-time heartbeat ────────────────────────────────────────────────
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accessRef = useRef<any>(null);
  accessRef.current = access;

  useEffect(() => {
    if (!id) return;
    heartbeatRef.current = setInterval(() => {
      const currentAccess = accessRef.current;
      if (!currentAccess) return;
      fetch('/api/student/lesson-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: id }),
      }).catch(() => {/* ignore network errors */});
    }, 60_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [id]);

  // ── Keyboard Shortcuts Security Blocking ───────────────────────────────────
  useEffect(() => {
    const handleSecurityKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect/Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('keydown', handleSecurityKeyDown);
    return () => {
      window.removeEventListener('keydown', handleSecurityKeyDown);
    };
  }, []);

  useEffect(() => {
    fetchLessonData();
  }, [id]);

  useEffect(() => {
    if (lesson && access && !access.quizPassed && !access.quizExempt) void fetchQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, access?.quizPassed, access?.quizExempt]);

  const fetchQuiz = async () => {
    const requestGeneration = ++quizFetchGeneration.current;
    setQuizLoadState('loading');
    setQuizLoadError('');
    try {
      const res = await fetch(`/api/student/quiz/${lesson.id}`);
      const data = await res.json();
      if (requestGeneration !== quizFetchGeneration.current) return;
      if (!res.ok) throw new Error(data.error || 'تعذر تحميل الامتحان');
      const qs = Array.isArray(data.questions) ? data.questions : [];
      setQuizQuestions(qs);
      setAnswers(Array(qs.length).fill(''));
      setFocusedQIdx(0);
      setQuizLoadState(qs.length ? 'ready' : 'missing');
    } catch (err: any) {
      if (requestGeneration !== quizFetchGeneration.current) return;
      console.error('Failed to load lesson quiz:', err);
      setQuizLoadError(err.message || 'تعذر تحميل الامتحان. حاول مرة أخرى.');
      setQuizLoadState('error');
    }
  };

  const fetchLessonData = async () => {
    quizFetchGeneration.current++;
    setLoading(true);
    setLesson(null);
    setAccess(null);
    setQuizResult(null);
    setQuizQuestions([]);
    setQuizLoadState('idle');
    setQuizDismissed(false);
    try {
      const res = await fetch('/api/student/lessons');
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          setStudentInfo(data.student);
        }
        const foundLesson = data.lessons?.find((l: any) => l.id === id);
        if (!foundLesson) { navigate('/student-dashboard'); return; }
        setLesson(foundLesson);
        const foundAccess = data.accesses?.find((a: any) => a.lessonId === id);
        setAccess(foundAccess);
        if (foundAccess?.quizScore !== undefined) {
          setQuizResult({ score: foundAccess.quizScore, total: foundAccess.quizTotal, passed: foundAccess.quizPassed, results: foundAccess.quizResults || [] });
        }
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Failed to load lesson:', err);
      navigate('/student-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCode = async (e: FormEvent) => {
    e.preventDefault();
    setValidatingCode(true);
    setCodeError('');
    try {
      const res = await fetch('/api/student/validate-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lesson.id, code }) });
      const data = await res.json();
      if (res.ok && data.success) { fetchLessonData(); }
      else { setCodeError(data.error || 'الكود غلط'); }
    } catch { setCodeError('في مشكلة'); }
    setValidatingCode(false);
  };

  const handleSubmitQuiz = async () => {
    if (answers.includes('')) return alert('لازم تجاوب على كل الأسئلة');
    setSubmittingQuiz(true);
    try {
      const res = await fetch('/api/student/submit-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lesson.id, answers }) });
      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        setAccess((current: any) => current ? {
          ...current,
          quizPassed: data.passed || current.quizPassed,
          quizScore: data.score,
          quizTotal: data.total,
          quizResults: data.results,
          quizSubmittedAt: data.submittedAt || new Date().toISOString(),
          quizAttempts: (current.quizAttempts || 0) + 1,
        } : current);
      } else {
        alert(data.error || 'تعذر تصحيح الامتحان');
      }
    } catch { alert('في مشكلة'); }
    setSubmittingQuiz(false);
  };

  const handleRetakeQuiz = () => {
    setQuizResult(null);
    setAnswers([]);
    setQuizDismissed(false);
    fetchQuiz();
  };

  const handleDismissQuiz = () => {
    setQuizDismissed(true);
  };

  /* ── Quiz keyboard navigation ── */
  useEffect(() => {
    if (quizQuestions.length === 0 || quizResult || quizDismissed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const LETTERS = ['A', 'B', 'C', 'D'];
        setAnswers(prev => {
          const cur = LETTERS.indexOf(prev[focusedQIdx] ?? '');
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = cur === -1 ? 0 : Math.max(0, Math.min(LETTERS.length - 1, cur + dir));
          const a = [...prev]; a[focusedQIdx] = LETTERS[next]; return a;
        });
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedQIdx(prev => Math.max(0, Math.min(quizQuestions.length - 1, prev + (e.key === 'ArrowDown' ? 1 : -1))));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [quizResult, quizQuestions.length, focusedQIdx, quizDismissed]);

  if (loading || !lesson) return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 lesson-page-enter">بيتحمل...</div>
  );

  // ── Derived state ──
  const isLessonLocked = false;
  const isVideoUnlocked = access && !isLessonLocked;
  const needsCode = !access;

  const showQuizSection = access && !access.quizExempt &&
    (quizResult || !access.quizPassed) &&
    (isLessonLocked || !quizDismissed);

  const extractYoutubeId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return m ? m[1] : url;
  };

  return (
    <div className="min-h-screen lesson-page-enter" dir="rtl">

      {/* ── Navbar ── */}
      <header className="neon-panel border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-20 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => startPageTransition(() => navigate('/student-dashboard'))}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200/80 dark:border-white/10 shrink-0"
            title="رجوع للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white line-clamp-1 text-sm leading-tight">{lesson.title}</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{lesson.platform}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">

        {/* ── Video Player Container ── */}
        <div
          ref={videoContainerRef}
          className="lesson-video-wrapper rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative select-none bg-black border border-slate-800 transition-all"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center">

            {/* Dynamic Floating Watermark - Persists in Fullscreen */}
            {isVideoUnlocked && (
              <VideoWatermark
                studentName={studentInfo?.name}
                studentPhone={studentInfo?.phone}
                studentId={studentInfo?.id}
              />
            )}

            {/* Video Iframe Stream */}
            {isVideoUnlocked ? (
              lesson.platform === 'youtube' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(lesson.videoUrl)}?rel=0`}
                  className="absolute inset-0 w-full h-full border-0"
                  title={lesson.title}
                />
              ) : lesson.platform === 'bunny' ? (
                <BunnyVideo
                  videoUrl={lesson.videoUrl}
                  title={lesson.title}
                  skipFromSeconds={lesson.skipFromSeconds}
                  skipToSeconds={lesson.skipToSeconds}
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <iframe
                  src={`https://player.vimeo.com/video/${lesson.videoUrl}?dnt=1`}
                  className="absolute inset-0 w-full h-full border-0"
                  title={lesson.title}
                />
              )
            ) : quizLoadState === 'loading' && access ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">الدرس اتفتح</h3>
                <p className="text-slate-400 max-w-sm text-sm">بيتجهز...</p>
              </div>
            ) : isLessonLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">الحصة مقفولة</h3>
                <p className="text-slate-400 max-w-sm text-sm">
                  جبت {access.quizScore}/{access.quizTotal} في الامتحان. اعمل إعادة الامتحان من تحت أو كلم مستر أحمد علشان يفتحهالك.
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">المحتوى مقفول</h3>
                <p className="text-slate-400 max-w-sm text-sm">حط الكود اللي معاك علشان تشوف الدرس.</p>
              </div>
            )}

            {/* Custom Fullscreen Control Button */}
            {isVideoUnlocked && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute bottom-3 left-3 z-40 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xl border border-white/20 active:scale-95"
                title={isFullscreen ? 'الخروج من الشاشة الكاملة (F)' : 'ملء الشاشة (F)'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-4 h-4 text-sky-400" />
                    <span>شاشة عادية</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-4 h-4 text-sky-400" />
                    <span>شاشة كاملة</span>
                  </>
                )}
              </button>
            )}

          </div>
        </div>

        {/* ── Code entry ── */}
        {needsCode && (
          <div className="neon-card p-8 rounded-2xl max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center mx-auto mb-5">
              <Key className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">كود الوصول</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">حط الكود اللي أخدته من مستر أحمد علشان تفتح الدرس.</p>
            <form onSubmit={handleValidateCode} className="space-y-3">
              <input
                type="text" required placeholder="YCH-XXXXXX"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="neon-input w-full px-4 py-3 rounded-xl text-center font-mono text-xl uppercase tracking-widest"
                dir="ltr"
              />
              {codeError && <p className="text-red-500 text-sm font-semibold">{codeError}</p>}
              <button type="submit" disabled={validatingCode} className="neon-btn w-full px-4 py-3 rounded-xl font-bold disabled:opacity-50">
                {validatingCode ? 'بيتحقق...' : 'فعّل الكود'}
              </button>
            </form>
          </div>
        )}

        {/* ── Quiz Section ── */}
        {showQuizSection && (
          <div className="neon-card p-4 sm:p-6 md:p-8 rounded-2xl">
            <div className="mb-5 pb-4 sm:mb-6 sm:pb-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">امتحان الدرس</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {isLessonLocked
                    ? 'الحصة مقفولة — اعمل إعادة الامتحان وجيب ٥/١٠ أو أكتر علشان تفتحها.'
                    : 'خد الامتحان علشان تثبت إنك فاهم الدرس.'}
                </p>
              </div>
              {!isLessonLocked && (
                <button
                  onClick={handleDismissQuiz}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                  title="تخطي الامتحان (الحصة تفضل مفتوحة)"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {quizResult ? (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border text-center ${quizResult.passed ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">درجتك في الامتحان</p>
                  <p className={`text-5xl font-extrabold ${quizResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {quizResult.score} / {quizResult.total}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">({Math.round((quizResult.score / quizResult.total) * 100)}%)</p>
                  <p className={`mt-3 font-bold ${quizResult.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                    {quizResult.passed ? 'مبروك! عدّيت الامتحان.' : 'لم تجتز الامتحان — الحصة تظل مفتوحة، وتقدر تعيد الامتحان.'}
                  </p>

                  {!quizResult.passed && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                        راجع التصحيح أو اعمل إعادة الامتحان — الحصة تظل مفتوحة
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button onClick={handleRetakeQuiz} className="neon-btn px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      إعادة الامتحان
                    </button>
                    {!isLessonLocked && (
                      <button onClick={handleDismissQuiz} className="px-6 py-3 rounded-xl font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-colors">
                        إغلاق ومتابعة الحصة
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-slate-900 dark:text-white">مراجعة الإجابات والتصحيح</h3>
                  {quizResult.results?.map((r: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl border-2 space-y-3 ${r.isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                      <div className="flex items-start gap-2">
                        {r.isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{r.question}</p>
                      </div>
                      {r.image && (
                        <div className="w-full max-w-md mx-auto aspect-video bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                          <img src={r.image} alt={`صورة السؤال ${idx + 1}`} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <QuizAnswerReview
                        options={r.options}
                        studentAnswer={r.studentAnswer}
                        correctAnswer={r.correctAnswer}
                        studentLabel="إجابة الطالب"
                        correctLabel="الإجابة الصحيحة"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : quizLoadState === 'loading' || quizLoadState === 'idle' ? (
              <div className="text-center p-8 text-slate-400">بيتحمل الامتحان...</div>
            ) : quizLoadState === 'error' ? (
              <div className="text-center p-8 space-y-4">
                <p className="text-red-600 text-sm font-semibold">{quizLoadError}</p>
                <button onClick={() => void fetchQuiz()} className="neon-btn px-5 py-2.5 rounded-xl font-bold">
                  حاول تحميل الامتحان تاني
                </button>
              </div>
            ) : quizLoadState === 'missing' ? (
              <div className="text-center p-8 text-slate-400">مفيش امتحان للدرس ده لسه.</div>
            ) : (
              <>
                <div className="space-y-6">
                  {quizQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => setFocusedQIdx(idx)}
                      className={`p-5 bg-slate-50 dark:bg-white/5 rounded-xl border-2 space-y-4 cursor-default transition-all ${focusedQIdx === idx ? 'border-indigo-400' : 'border-slate-200 dark:border-white/10'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{q.question}</p>
                      </div>
                      {q.image && (
                        <div className="w-full max-w-xl mx-auto aspect-video bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                          <img src={q.image} alt={`صورة السؤال ${idx + 1}`} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className={q.options?.some(Boolean) ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-4 gap-2'}>
                        {ANSWER_LETTERS.map((letter) => (
                          <button
                            key={letter} type="button"
                            onClick={() => { const a = [...answers]; a[idx] = letter; setAnswers(a); }}
                            className={`py-3 px-3 rounded-xl border-2 font-bold text-base transition-all min-h-[52px] active:scale-95 ${
                              answers[idx] === letter
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-300 active:bg-indigo-50'
                            } ${q.options?.some(Boolean) ? 'flex items-center gap-3 text-right' : ''}`}
                          >
                            <span className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">{letter}</span>
                            {q.options?.[ANSWER_LETTERS.indexOf(letter)] && <span className="text-sm font-medium leading-relaxed">{q.options[ANSWER_LETTERS.indexOf(letter)]}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 flex gap-3">
                  <button onClick={handleSubmitQuiz} disabled={submittingQuiz} className="neon-btn flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-50">
                    {submittingQuiz ? 'بيتبعت...' : 'سلّم الامتحان'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Quiz dismissed notice ── */}
        {access && quizDismissed && !isLessonLocked && !access.quizPassed && !access.quizExempt && quizLoadState !== 'missing' && (
          <div className="neon-card p-4 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">تخطيت الامتحان — الحصة مفتوحة. ممكن ترجعله في أي وقت.</p>
            <button
              onClick={() => setQuizDismissed(false)}
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              خد الامتحان
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
