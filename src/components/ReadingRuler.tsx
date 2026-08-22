import React, { useEffect, useState } from 'react';

interface ReadingRulerProps {
  enabled: boolean;
  color: 'yellow' | 'blue' | 'green' | 'peach' | 'pink' | 'gray';
  height: number;
}

const COLOR_MAP = {
  yellow: 'bg-amber-300/30 border-amber-400',
  blue: 'bg-sky-300/30 border-sky-400',
  green: 'bg-emerald-300/30 border-emerald-400',
  peach: 'bg-orange-300/30 border-orange-400',
  pink: 'bg-rose-300/30 border-rose-400',
  gray: 'bg-stone-400/25 border-stone-500',
};

export const ReadingRuler: React.FC<ReadingRulerProps> = ({ enabled, color, height = 48 }) => {
  const [mouseY, setMouseY] = useState(250);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setMouseY(e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      id="reading-ruler-overlay"
      className="fixed inset-x-0 pointer-events-none z-30 transition-transform duration-75 ease-out"
      style={{
        top: 0,
        transform: `translateY(${mouseY - height / 2}px)`,
        height: `${height}px`,
      }}
    >
      <div className={`w-full h-full ${COLOR_MAP[color]} border-y-2 border-dashed shadow-sm backdrop-blur-[0.5px]`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600/75 select-none bg-white/60 px-1.5 py-0.5 rounded">
            Leesliniaal
          </span>
          <span className="text-[10px] text-stone-500/75 select-none">
            Beweeg je muis om te focussen
          </span>
        </div>
      </div>
    </div>
  );
};
