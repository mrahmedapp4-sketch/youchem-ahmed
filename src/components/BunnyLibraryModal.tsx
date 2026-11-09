import { useState, useEffect } from 'react';
import {
  Film,
  Search,
  X,
  Clock,
  Check,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
} from 'lucide-react';

interface BunnyVideoItem {
  guid: string;
  title: string;
  length: number;
  views: number;
  status: number;
  encodeProgress: number;
  dateUploaded: string;
  thumbnailUrl: string;
  embedUrl: string;
}

interface BunnyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: BunnyVideoItem) => void;
}

export function BunnyLibraryModal({ isOpen, onClose, onSelectVideo }: BunnyLibraryModalProps) {
  const [videos, setVideos] = useState<BunnyVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/youchem/bunny/videos?itemsPerPage=100');
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setVideos(data.items);
      } else {
        setError(data.error || 'تعذر تحميل مكتبة فيديوهات Bunny');
      }
    } catch (err: any) {
      setError('خطأ 404 الاتصال بسيرفر Bunny: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredVideos = videos.filter((v) =>
    (v.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}:${remainMins < 10 ? '0' : ''}${remainMins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="neon-card rounded-3xl w-full max-w-3xl p-6 sm:p-8 space-y-5 shadow-2xl my-8 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                مكتبة فيديوهات Bunny.net
                <span className="text-xs mr-2 font-normal text-slate-500">
                  ({videos.length} فيديو متوفر)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر أي فيديو تم رفعه سابقاً لإضافته مباشرة للحصة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في فيديوهات Bunny بالاسم..."
            className="neon-input w-full pr-10 pl-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        {/* Videos List Container */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
              <span className="text-sm">جاري تحميل الفيديوهات من Bunny...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-2xl text-sm space-y-2">
              <p>{error}</p>
              <button
                onClick={fetchVideos}
                className="neon-btn px-4 py-2 rounded-xl text-xs font-semibold"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center p-12 text-slate-400 text-sm">
              {searchQuery ? 'لا توجد نتائج تطابق بحثك.' : 'لا توجد فيديوهات في مكتبة Bunny.'}
            </div>
          ) : (
            filteredVideos.map((video) => (
              <div
                key={video.guid}
                className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/30 transition-all flex items-center justify-between gap-4 group"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {video.length > 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                        {formatDuration(video.length)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {video.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-mono text-[10px] text-slate-400">
                        {video.guid.slice(0, 8)}...
                      </span>
                      {video.views > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-400" />
                            {video.views} مشاهدة
                          </span>
                        </>
                      )}
                      {video.dateUploaded && (
                        <>
                          <span>•</span>
                          <span>{new Date(video.dateUploaded).toLocaleDateString('ar-EG')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectVideo(video);
                    onClose();
                  }}
                  className="neon-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>اختيار الحصة</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

