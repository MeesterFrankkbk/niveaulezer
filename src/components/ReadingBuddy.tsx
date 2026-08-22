import React, { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, X } from 'lucide-react';

interface ReadingBuddyProps {
  studentName: string;
}

const BUDDY_QUOTES = [
  'Wie leest, groeit! Elke bladzijde maakt je sterker! 🌟',
  'Lezen is als een avontuur in je hoofd! 🚀',
  'Neem je tijd, elk woord telt! 📖',
  'Moeilijke woorden zijn net geheime schatten die je ontdekt! 💎',
  'Oefening baart kunst! Je leest al veel vlotter! 👏',
  'Tip: ontspan je schouders en lees rustig op jouw eigen tempo. 🌿',
];

export const ReadingBuddy: React.FC<ReadingBuddyProps> = ({ studentName }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % BUDDY_QUOTES.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-end gap-2 pointer-events-auto">
      {isOpen && (
        <div className="bg-white p-3.5 rounded-2xl rounded-br-none shadow-xl border-2 border-amber-300 max-w-xs text-xs text-stone-800 animate-in zoom-in-95 duration-200 relative mb-2">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-1 right-1 text-stone-400 hover:text-stone-700 p-0.5 rounded-full"
            aria-label="Sluiten"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 font-lexend mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Ollie de Leesbuddy
          </div>
          <p className="font-medium leading-relaxed">
            {BUDDY_QUOTES[quoteIndex]}
          </p>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-2xl shadow-lg border-2 border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
        title="Ollie de Leesbuddy"
      >
        🦉
      </button>
    </div>
  );
};
