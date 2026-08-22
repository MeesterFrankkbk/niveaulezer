import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

const TEACHER_PASSWORD = 'STA leest!';

interface TeacherPasswordGateProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const TeacherPasswordGate: React.FC<TeacherPasswordGateProps> = ({ onSuccess, onClose }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === TEACHER_PASSWORD) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 cursor-pointer"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-black font-lexend text-center text-stone-900 mb-1">Meester Frank</h2>
        <p className="text-xs text-stone-500 text-center mb-5">Voer het wachtwoord in om het leerkrachtenpaneel te openen.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            autoFocus
            placeholder="Wachtwoord"
            className={`w-full p-3 bg-stone-50 border rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500 ${
              error ? 'border-red-400' : 'border-stone-200'
            }`}
          />
          {error && (
            <p className="text-xs font-bold text-red-600">Wachtwoord klopt niet. Probeer opnieuw.</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold font-lexend rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Openen
          </button>
        </form>
      </div>
    </div>
  );
};
