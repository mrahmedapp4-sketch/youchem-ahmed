import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  Sparkles,
  Play,
  Copy,
  Check,
} from 'lucide-react';

interface BunnyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoUploaded: (result: {
    title: string;
    videoUrl: string;
    guid: string;
    thumbnailUrl: string;
    gradeLevel: string;
  }) => void;
}

export function BunnyUploadModal({ isOpen, onClose, onVideoUploaded }: BunnyUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('2nd_sec');
  const [isDragging, setIsDragging] = useState(false);

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedMB, setUploadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(0);
  const [speedMBs, setSpeedMBs] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedResult, setUploadedResult] = useState<{
    guid: string;
    embedUrl: string;
    thumbnailUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    if (xhrRef.current && uploading) {
      xhrRef.current.abort();
    }
    setFile(null);
    setTitle('');
    setUploading(false);
    setProgress(0);
    setUploadedMB(0);
    setTotalMB(0);
    setSpeedMBs(0);
    setEtaSeconds(null);
    setStatusText('');
    setErrorMessage('');
    setUploadedResult(null);
  };

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('video/') && !selectedFile.name.match(/\.(mp4|mov|mkv|webm|avi|m4v)$/i)) {
      setErrorMessage('من فضلك اختر ملف فيديو صالح (MP4, MKV, MOV, WebM)');
      return;
    }
    setFile(selectedFile);
    setErrorMessage('');
    // Auto-generate a clean title from file name
    const cleanTitle = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!title.trim()) {
      setTitle(cleanTitle);
    }
  };

  const startUpload = async () => {
    if (!file) {
      setErrorMessage('من فضلك اختر ملف فيديو أولاً');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('من فضلك اكتب عنواناً للحصة / الفيديو');
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorMessage('');
    setStatusText('جاري إنشاء سجل الفيديو على Bunny.net...');

    try {
      // Step 1: Create video record on Bunny Stream
      const createRes = await fetch('/api/youchem/bunny/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.guid) {
        throw new Error(createData.error || 'فشل في إنشاء الفيديو على خوادم Bunny');
      }

      const { guid, embedUrl, thumbnailUrl, directUploadUrl, accessKey } = createData;
      setStatusText('جاري رفع الفيديو إلى خوادم Bunny...');
      setTotalMB(Math.round((file.size / (1024 * 1024)) * 10) / 10);

      // Step 2: Upload file binary directly to Bunny using XMLHttpRequest with live progress
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      lastTimeRef.current = Date.now();
      lastLoadedRef.current = 0;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
          setUploadedMB(Math.round((e.loaded / (1024 * 1024)) * 10) / 10);
          setTotalMB(Math.round((e.total / (1024 * 1024)) * 10) / 10);

          // Speed & ETA calculation every 500ms
          const now = Date.now();
          const timeDiff = (now - lastTimeRef.current) / 1000;
          if (timeDiff >= 0.5) {
            const bytesDiff = e.loaded - lastLoadedRef.current;
            const currentSpeedMBs = bytesDiff / (1024 * 1024) / timeDiff;
            setSpeedMBs(Math.round(currentSpeedMBs * 10) / 10);

            const remainingBytes = e.total - e.loaded;
            if (currentSpeedMBs > 0) {
              const secondsLeft = Math.round(remainingBytes / (currentSpeedMBs * 1024 * 1024));
              setEtaSeconds(secondsLeft);
            }

            lastTimeRef.current = now;
            lastLoadedRef.current = e.loaded;
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          setStatusText('تم الرفع بنجاح! جاري معالجة الفيديو بجودة عالية...');
          setUploadedResult({ guid, embedUrl, thumbnailUrl });
          setUploading(false);
        } else {
          // If direct upload was blocked by ad-blocker or CORS, try proxy fallback
          fallbackProxyUpload(guid, embedUrl, thumbnailUrl);
        }
      };

      xhr.onerror = () => {
        // Fallback to server proxy upload
        fallbackProxyUpload(guid, embedUrl, thumbnailUrl);
      };

      xhr.open('PUT', directUploadUrl);
      xhr.setRequestHeader('AccessKey', accessKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(file);
    } catch (err: any) {
      setUploading(false);
      setErrorMessage(err.message || 'حدث خطأ أثناء رفع الفيديو');
    }
  };

  const fallbackProxyUpload = (guid: string, embedUrl: string, thumbnailUrl: string) => {
    if (!file) return;
    setStatusText('جاري إعادة المحاولة عبر الموزع الداخلي...');

    const proxyXhr = new XMLHttpRequest();
    xhrRef.current = proxyXhr;

    proxyXhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(percent);
        setUploadedMB(Math.round((e.loaded / (1024 * 1024)) * 10) / 10);
      }
    };

    proxyXhr.onload = () => {
      if (proxyXhr.status >= 200 && proxyXhr.status < 300) {
        setProgress(100);
        setStatusText('تم الرفع بنجاح!');
        setUploadedResult({ guid, embedUrl, thumbnailUrl });
        setUploading(false);
      } else {
        setUploading(false);
        setErrorMessage('فشل في رفع الفيديو إلى خوادم Bunny');
      }
    };

    proxyXhr.onerror = () => {
      setUploading(false);
      setErrorMessage('تعذر الاتصال بخوادم الرفع');
    };

    proxyXhr.open('PUT', `/api/youchem/bunny/upload-proxy/${guid}`);
    proxyXhr.setRequestHeader('Content-Type', 'application/octet-stream');
    proxyXhr.send(file);
  };

  const handleApplyToLesson = () => {
    if (!uploadedResult) return;
    onVideoUploaded({
      title: title.trim(),
      videoUrl: uploadedResult.embedUrl,
      guid: uploadedResult.guid,
      thumbnailUrl: uploadedResult.thumbnailUrl,
      gradeLevel,
    });
    onClose();
  };

  const handleCopyLink = () => {
    if (!uploadedResult) return;
    navigator.clipboard.writeText(uploadedResult.embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatEta = (sec: number | null) => {
    if (sec === null || sec <= 0) return 'لحظات...';
    if (sec < 60) return `${sec} ثانية`;
    const min = Math.floor(sec / 60);
    const remainSec = sec % 60;
    return `${min} دقيقة ${remainSec > 0 ? `و ${remainSec} ثانية` : ''}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={uploading ? undefined : onClose}
    >
      <div
        className="neon-card rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 relative"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                رفع فيديو جديد إلى Bunny.net
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-200">
                  سريع ومحمي
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                الرفع يتم مباشرة إلى مكتبة فيديوهات مستر أحمد المشفرة
              </p>
            </div>
          </div>
          {!uploading && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Success View */}
        {uploadedResult ? (
          <div className="space-y-5 py-3">
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">تم رفع الفيديو بنجاح على Bunny!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                تم حفظ الفيديو في المكتبة وتوليد رابط التضمين المشفر للحصة.
              </p>
              <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 flex items-center justify-between gap-2 text-xs font-mono" dir="ltr">
                <span className="truncate text-slate-700 select-all">{uploadedResult.embedUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-sans text-xs transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleApplyToLesson}
                className="neon-btn flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Sparkles className="w-4 h-4" />
                استخدام الفيديو وإضافته كحصة الآن
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          /* Form & Upload View */
          <div className="space-y-4">
            {/* File Dropzone */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleFileSelect(droppedFile);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50/50 scale-[1.01]'
                    : 'border-slate-200 hover:border-orange-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  accept="video/*,.mkv,.mp4,.mov,.webm"
                  className="hidden"
                  id="bunny-file-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                <label htmlFor="bunny-file-input" className="cursor-pointer space-y-3 block">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100 shadow-inner">
                    <FileVideo className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      اضغط لاختيار فيديو من جهازك أو اسحبه إلى هنا
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      يدعم ملفات MP4, MKV, MOV, WebM بأعلى دقة
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              /* Selected file summary */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" />
                        {Math.round((file.size / (1024 * 1024)) * 10) / 10} MB
                      </span>
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="تغيير الملف"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Inputs: Title & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">عنوان الحصة / الفيديو</label>
                <input
                  type="text"
                  required
                  disabled={uploading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الباب الثالث - الدرس الثاني (الاتزان الكيميائي)"
                  className="neon-input w-full px-3.5 py-2.5 rounded-xl text-sm disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">الصف الدراسي</label>
                <select
                  disabled={uploading}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="neon-input w-full px-3 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  <option value="2nd_sec">تاني ثانوي</option>
                  <option value="3rd_sec">تالت ثانوي</option>
                </select>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    {statusText}
                  </span>
                  <span className="text-orange-700 font-mono text-sm">{progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Live Stats */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    تم رفع: <strong className="text-slate-800">{uploadedMB} MB</strong> من {totalMB} MB
                  </span>
                  {speedMBs > 0 && (
                    <span>
                      السرعة: <strong className="text-slate-800">{speedMBs} MB/s</strong>
                    </span>
                  )}
                  {etaSeconds !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      الوقت المتبقي: <strong className="text-slate-800">{formatEta(etaSeconds)}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={startUpload}
                disabled={uploading || !file || !title.trim()}
                className="neon-btn px-7 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-500/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    بدء الرفع لـ Bunny
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

