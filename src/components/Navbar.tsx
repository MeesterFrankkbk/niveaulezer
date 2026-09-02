import React, { useState } from 'react';
import { BookOpen, Sparkles, User, Settings, ShieldCheck, Heart } from 'lucide-react';

interface NavbarProps {
  studentName: string;
  studentAvatar?: string;
  onUpdateStudentName: (name: string) => void;
  onOpenTeacherStudio: () => void;
  onSwitchStudent?: () => void;
  totalStoriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  studentName,
  studentAvatar,
  onUpdateStudentName,
  onOpenTeacherStudio,
  onSwitchStudent,
  totalStoriesCount
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateStudentName(tempName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <header className="bg-white border-b border-amber-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center text-xl shadow-sm border border-amber-300">
            📚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-stone-900 font-lexend tracking-tight">
                NiveauLezer
              </span>
            </div>
            <p className="text-[11px] text-amber-700 font-bold hidden md:block">
              Wie leest, groeit! • {totalStoriesCount} verhalen op jouw niveau
            </p>
          </div>
        </div>

        {/* Right Section: Student Switcher & Teacher Studio */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Student Profile Switcher */}
          {!isEditingName ? (
            <button
              onClick={() => {
                setTempName(studentName);
                setIsEditingName(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-xs font-bold text-amber-950 transition-colors cursor-pointer"
              title="Klik om je naam aan te passen"
            >
              <span className="text-base">
                {studentAvatar ? studentAvatar : (studentName[0] || '👦').toUpperCase()}
              </span>
              <span className="font-lexend font-extrabold">{studentName}</span>
            </button>
          ) : (
            <form onSubmit={handleSaveName} className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                autoFocus
                placeholder="Jouw voornaam..."
                className="w-28 p-1.5 bg-white border-2 border-amber-400 rounded-xl text-xs font-bold outline-hidden"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ✓
              </button>
            </form>
          )}

          {onSwitchStudent && (
            <button
              onClick={onSwitchStudent}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-stone-400 hover:text-stone-700 text-[11px] font-bold cursor-pointer"
              title="Andere leerling? Wissel van profiel"
            >
              Wissel leerling
            </button>
          )}

          {/* Teacher Studio Button */}
          <button
            onClick={onOpenTeacherStudio}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer font-lexend"
          >
            <span>👨‍🏫</span>
            <span className="hidden sm:inline">Meester Frank</span>
          </button>

        </div>

      </div>
    </header>
  );
};
