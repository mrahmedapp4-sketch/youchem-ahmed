import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { ShieldCheck, ShieldAlert, Ban, ShieldOff, Trash2, UserRoundX, RefreshCw, Search, MonitorSmartphone, X } from 'lucide-react';

export function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [search, setSearch] = useState('');
  const [devicesModalStudent, setDevicesModalStudent] = useState<any | null>(null);
  const [devicesInput, setDevicesInput] = useState('1');
  const [savingDevices, setSavingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, lRes] = await Promise.all([fetch('/api/youchem/students'), fetch('/api/youchem/lessons')]);
      if (sRes.ok && lRes.ok) {
        setStudents(await sRes.json());
        const all = await lRes.json();
        setLessons(all);
        if (all.length > 0) setSelectedLessonId(all[0].id);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleToggleExempt = async (userId: string) => {
    if (!selectedLessonId) return alert('لازم تختار حصة الأول');
    try {
      const res = await fetch(`/api/youchem/students/${userId}/lessons/${selectedLessonId}/exempt`, { method: 'PATCH' });
      if (res.ok) fetchData();
    } catch { alert('في مشكلة'); }
  };

  const handleResetExam = async (userId: string) => {
    if (!selectedLessonId) return alert('لازم تختار حصة الأول');
    if (!confirm('هتخلي الطالب يعيد الامتحان من الأول. متأكد؟')) return;
    try {
      const res = await fetch(`/api/youchem/students/${userId}/lessons/${selectedLessonId}/reset-exam`, { method: 'PATCH' });
      if (res.ok) fetchData();
      else {
        const d = await res.json();
        alert(d.error || 'في مشكلة');
      }
    } catch { alert('في مشكلة'); }
  };

  const handleToggleBlock = async (userId: string) => {
    try {
      const res = await fetch(`/api/youchem/students/${userId}/block`, { method: 'PATCH' });
      if (res.ok) fetchData();
      else alert('في مشكلة');
    } catch { alert('في مشكلة'); }
  };

  const handleDeleteStudent = async (userId: string, name: string) => {
    if (!confirm(`متأكد إنك تمسح حساب "${name}" نهائياً؟ مش هيتراجع.`)) return;
    try {
      const res = await fetch(`/api/youchem/students/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('في مشكلة');
    } catch { alert('في مشكلة'); }
  };

  const handleUnlinkDevice = async (userId: string, name: string) => {
    if (!confirm(`تمسح ربط جهاز الطالب "${name}"؟ يقدر بعدها يدخل من أي جهاز.`)) return;
    try {
      const res = await fetch(`/api/youchem/students/${userId}/unlink-device`, { method: 'PATCH' });
      if (res.ok) fetchData();
      else alert('في مشكلة');
    } catch { alert('في مشكلة'); }
  };

  const openDevicesModal = (student: any) => {
    setDevicesModalStudent(student);
    setDevicesInput(String(student.maxDevices || 1));
    setDevicesError('');
  };

  const handleSaveMaxDevices = async (e: FormEvent) => {
    e.preventDefault();
    if (!devicesModalStudent) return;
    const parsed = Number(devicesInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      setDevicesError('اكتب رقم صحيح من 1 إلى 50');
      return;
    }
    setSavingDevices(true);
    setDevicesError('');
    try {
      const res = await fetch(`/api/youchem/students/${devicesModalStudent.id}/max-devices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDevices: parsed }),
      });
      if (res.ok) {
        setDevicesModalStudent(null);
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        setDevicesError(d.error || 'حصلت مشكلة أثناء الحفظ');
      }
    } catch {
      setDevicesError('تعذر الاتصال بالسيرفر');
    }
    setSavingDevices(false);
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s: any) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-bold text-slate-900">الطلاب المسجلين</h1>
        <p className="text-slate-500 text-sm mt-0.5">شوف الطلاب، واعمل إعفاء أو حظر للحساب والجهاز المرتبط به</p>
      </div>

      {/* Controls row */}
      <div className="neon-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الإيميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="neon-input w-full pr-9 pl-4 py-2 rounded-xl text-sm"
          />
        </div>
        {/* Lesson selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="font-semibold text-slate-700 text-sm whitespace-nowrap">الحصة للإعفاء / الإعادة:</label>
          <select
            value={selectedLessonId} onChange={e => setSelectedLessonId(e.target.value)}
            className="neon-input px-4 py-2 rounded-xl text-sm"
          >
            {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            {lessons.length === 0 && <option value="">مفيش حصص</option>}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="neon-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">بيتحمل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">الاسم</th>
                  <th className="px-5 py-3">الإيميل</th>
                  <th className="px-5 py-3">الصف</th>
                  <th className="px-5 py-3 text-center">الامتحان</th>
                  <th className="px-5 py-3 text-center">إدارة الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                    {students.length === 0 ? 'مفيش طلاب مسجلين لحد دلوقتي.' : 'مفيش نتائج للبحث ده.'}
                  </td></tr>
                )}
                {filteredStudents.map((student: any) => {
                  const accessForLesson = student.accesses?.find((a: any) => a.lessonId === selectedLessonId);
                  const isExempt = accessForLesson?.quizExempt || false;
                  const isBlocked = student.blocked || false;
                  const hasAccess = !!accessForLesson;
                  const maxDevices = student.maxDevices || 1;
                  const activeDevicesCount = student.activeDevicesCount ?? (student.deviceId ? 1 : 0);
                  const isBound = activeDevicesCount > 0;
                  return (
                    <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${isBlocked ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-4 font-bold text-slate-900 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          {student.name || 'مش معروف'}
                          {isBlocked && (
                            <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-medium">محظور</span>
                          )}
                          {isBound && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                maxDevices > 1
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {maxDevices > 1 ? `مقيد (${activeDevicesCount}/${maxDevices} أجهزة)` : 'مقيد بجهاز'}
                            </span>
                          )}
                          {!isBound && maxDevices > 1 && (
                            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                              متاح {maxDevices} أجهزة
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">{student.email}</td>
                      <td className="px-5 py-4 text-slate-500 text-sm">
                        {student.gradeLevel === '2nd_sec' ? 'تاني ثانوي' : student.gradeLevel === '3rd_sec' ? 'تالت ثانوي' : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* خليه يعدي (exempt) */}
                          <button
                            onClick={() => handleToggleExempt(student.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
                              isExempt
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isExempt
                              ? <><ShieldCheck className="w-3.5 h-3.5" /> خلّاه يعدي</>
                              : <><ShieldAlert className="w-3.5 h-3.5" /> خليه يعدي</>}
                          </button>
                          {/* يعيد المحاولة (retry exam) */}
                          {hasAccess && (
                            <button
                              onClick={() => handleResetExam(student.id)}
                              title="خلّي الطالب يعيد الامتحان من الأول"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> يعيد المحاولة
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openDevicesModal(student)}
                            title="تحديد عدد الأجهزة المتاحة للطالب"
                            aria-label="تحديد عدد الأجهزة المتاحة"
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
                              maxDevices > 1
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <MonitorSmartphone className="w-3.5 h-3.5" />
                            <span>{maxDevices}</span>
                          </button>
                          <button
                            onClick={() => handleToggleBlock(student.id)}
                            title={isBlocked ? 'الغي حظر الحساب والجهاز' : 'احظر الحساب والجهاز'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
                              isBlocked
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isBlocked ? <ShieldOff className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleUnlinkDevice(student.id, student.name)}
                            title="امسح ربط الجهاز واسمح بالدخول من جهاز آخر"
                            aria-label="امسح ربط الجهاز"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            title="امسح الحساب"
                            aria-label="امسح الحساب"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                          >
                            <UserRoundX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: set max allowed devices for student */}
      {devicesModalStudent && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !savingDevices && setDevicesModalStudent(null)}
        >
          <div className="neon-card p-6 rounded-2xl w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <MonitorSmartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">عدد الأجهزة المتاحة للطالب</h2>
                  <p className="text-xs text-slate-500 truncate max-w-[260px]">
                    {devicesModalStudent.name || 'مش معروف'} — {devicesModalStudent.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingDevices}
                onClick={() => setDevicesModalStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between">
              <span>الأجهزة المرتبطة حالياً:</span>
              <span className="font-bold text-slate-900">
                {devicesModalStudent.activeDevicesCount ?? (devicesModalStudent.deviceId ? 1 : 0)} من {devicesModalStudent.maxDevices || 1}
              </span>
            </div>

            <form onSubmit={handleSaveMaxDevices} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  اكتب عدد الأجهزة المتاحة
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  required
                  autoFocus
                  value={devicesInput}
                  onChange={(e) => setDevicesInput(e.target.value)}
                  className="neon-input w-full px-4 py-2.5 rounded-xl text-base font-bold text-center"
                  dir="ltr"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDevicesInput(String(preset))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        Number(devicesInput) === preset
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  الطالب يقدر يفتح حسابه من العدد ده من الأجهزة. لو قلّلت العدد عن الأجهزة المفتوحة حالياً، هيتم تسجيل خروج الأجهزة الزيادة تلقائياً.
                </p>
              </div>

              {devicesError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {devicesError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingDevices}
                  className="neon-btn flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  {savingDevices ? 'بيتحفظ...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  disabled={savingDevices}
                  onClick={() => setDevicesModalStudent(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
