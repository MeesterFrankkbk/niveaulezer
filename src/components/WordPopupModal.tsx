import React from 'react';
import { DifficultWord } from '../types';
import { Volume2, X, Sparkles, BookOpen } from 'lucide-react';
import { createSpeechController } from '../utils/speech';

interface WordPopupModalProps {
  word: DifficultWord | null;
  onClose: () => void;
  voiceURI?: string;
}

export const WordPopupModal: React.FC<WordPopupModalProps> = ({ word, onClose, voiceURI }) => {
  if (!word) return null;

  const speech = createSpeechController();

  const handlePronounce = () => {
    speech.speakWord(word.word, voiceURI, 0.85);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-200 animate-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          aria-label="Sluiten"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Word Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-inner border border-amber-200 shrink-0">
            {word.emoji || '📖'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-stone-900 font-lexend capitalize">
                {word.word}
              </h3>
              <button
                onClick={handlePronounce}
                className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-transform active:scale-95 shadow-sm cursor-pointer"
                title="Beluister de uitspraak"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {word.syllableSplit && (
              <p className="text-sm font-semibold text-amber-700 mt-0.5 tracking-wider font-mono">
                {word.syllableSplit}
              </p>
            )}
          </div>
        </div>

        {/* Word Explanation */}
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Wat betekent dit?
            </div>
            <p className="text-stone-800 text-base leading-relaxed font-medium">
              {word.definition}
            </p>
          </div>

          {word.example && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 uppercase tracking-wide mb-1">
                <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                Voorbeeldzin
              </div>
              <p className="text-stone-700 text-sm italic">
                "{word.example}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer text-center font-lexend"
          >
            Ik snap het! 👍
          </button>
        </div>
      </div>
    </div>
  );
};
