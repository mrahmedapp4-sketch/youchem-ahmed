import { useEffect, useState } from 'react';

interface VideoWatermarkProps {
  studentName?: string;
  studentPhone?: string;
  studentId?: string;
}

// Distributed positions across video frame to prevent cropping while avoiding UI controls
const POSITIONS = [
  { top: '10%', left: '8%', right: 'auto', bottom: 'auto' },
  { top: '12%', right: '10%', left: 'auto', bottom: 'auto' },
  { bottom: '16%', left: '10%', top: 'auto', right: 'auto' },
  { bottom: '18%', right: '12%', top: 'auto', left: 'auto' },
  { top: '44%', left: '36%', right: 'auto', bottom: 'auto' },
  { top: '24%', left: '26%', right: 'auto', bottom: 'auto' },
  { top: '58%', right: '18%', left: 'auto', bottom: 'auto' },
  { bottom: '28%', left: '22%', top: 'auto', right: 'auto' },
];

export function VideoWatermark({ studentName, studentPhone }: VideoWatermarkProps) {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    // Change position smoothly every 12 seconds to prevent screen recording crops
    const interval = setInterval(() => {
      setPosIndex((prev) => {
        let next = Math.floor(Math.random() * POSITIONS.length);
        if (next === prev) next = (prev + 1) % POSITIONS.length;
        return next;
      });
    }, 12_000);

    return () => clearInterval(interval);
  }, []);

  const displayName = studentName || 'طالب منصة YouChem';
  const displayPhone = studentPhone ? ` • ${studentPhone}` : '';
  const currentPos = POSITIONS[posIndex];

  return (
    <div
      className="absolute z-50 pointer-events-none select-none transition-all duration-700 ease-out"
      style={{
        ...currentPos,
        maxWidth: '85%',
        willChange: 'top, left, right, bottom',
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-white/45 text-[11px] sm:text-xs font-mono font-medium shadow-sm tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 shrink-0" />
        <span className="truncate max-w-[220px] sm:max-w-xs">
          {displayName}
          {displayPhone}
        </span>
        <span className="text-[10px] text-white/30 font-medium hidden sm:inline">| YouChem</span>
      </div>
    </div>
  );
}
