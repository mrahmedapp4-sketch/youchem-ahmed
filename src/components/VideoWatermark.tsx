import { useEffect, useState } from 'react';

interface VideoWatermarkProps {
  studentName?: string;
  studentPhone?: string;
  studentId?: string;
}

const POSITIONS = [
  { top: '12%', left: '8%', transform: 'translate(0, 0)' },
  { top: '15%', right: '10%', left: 'auto', transform: 'translate(0, 0)' },
  { bottom: '15%', left: '12%', top: 'auto', transform: 'translate(0, 0)' },
  { bottom: '18%', right: '12%', top: 'auto', left: 'auto', transform: 'translate(0, 0)' },
  { top: '48%', left: '50%', transform: 'translate(-50%, -50%)' },
  { top: '30%', left: '35%', transform: 'translate(0, 0)' },
  { top: '65%', right: '25%', left: 'auto', transform: 'translate(0, 0)' },
];

export function VideoWatermark({ studentName, studentPhone, studentId }: VideoWatermarkProps) {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    // Change position smoothly every 10 seconds to random spots
    const interval = setInterval(() => {
      setPosIndex((prev) => {
        let next = Math.floor(Math.random() * POSITIONS.length);
        if (next === prev) next = (prev + 1) % POSITIONS.length;
        return next;
      });
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  const displayName = studentName || 'طالب منصة YouChem';
  const displayPhone = studentPhone ? ` • ${studentPhone}` : '';
  const currentPos = POSITIONS[posIndex];

  return (
    <div
      className="absolute z-30 pointer-events-none select-none transition-all duration-1000 ease-in-out"
      style={{
        ...currentPos,
        maxWidth: '85%',
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 backdrop-blur-[2px] border border-white/10 text-white/45 text-[11px] sm:text-xs font-mono font-medium shadow-sm tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse shrink-0" />
        <span className="truncate max-w-[240px]">
          {displayName}
          {displayPhone}
        </span>
        <span className="text-[10px] text-white/30 hidden sm:inline">| YouChem</span>
      </div>
    </div>
  );
}

