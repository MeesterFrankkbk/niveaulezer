import React, { useState, useEffect } from 'react';

export interface StudentProfile {
  voornaam: string;
  naam: string;
  klas: string;
  klasnummer: string;
  avatar: string;
  teachers: string[];
}

interface WelcomeScreenProps {
  initialProfile: StudentProfile | null;
  onComplete: (profile: StudentProfile) => void;
}

const AVATARS: string[] = [
  '🦁', '🐼', '🦊', '🐶', '🐱', '🐨',
  '🐸', '🦄', '🐵', '🐰', '🦉', '🐯',
  '🐳', '🦋', '🐢', '🐧', '🦖', '🐙',
  '⚡', '🔥', '🌟', '🎧', '🎮', '⚽',
];

const NO_AVATAR = '';

// Gedeelde leerkrachtenlijst (Google Apps Script, zelfde als Tafelbouwer).
// Geeft enkel naam + avatarnummer terug - e-mailadressen blijven veilig in
// het Google Sheet en komen nooit in deze app terecht.
export const TEACHERS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw_7-KlG3WL0_GsxOOBva9uBpLLcuHOiTbb5mGDhipemop6ihdADLW7k2YJHmu5ARbI/exec';
// Eigen tabblad voor deze app in het gedeelde Google Sheet - andere apps
// (zoals Tafelbouwer) gebruiken hun eigen tabblad en zien deze lijst niet.
export const TEACHERS_TAB = 'Niveaulezer';

interface TeacherOption { naam: string; avatar: number; }

const TEACHER_AVATARS: Record<number, string> = {
  1: '🦁', 2: '🐸', 3: '🐼', 4: '🦊', 5: '🐨', 6: '🐰',
  7: '🐢', 8: '🦉', 9: '🐝', 10: '🐬', 11: '🦄', 12: '🐙',
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialProfile, onComplete }) => {
  const [voornaam, setVoornaam] = useState(initialProfile?.voornaam ?? '');
  const [naam, setNaam] = useState(initialProfile?.naam ?? '');
  const [klas, setKlas] = useState(initialProfile?.klas ?? '');
  const [klasnummer, setKlasnummer] = useState(initialProfile?.klasnummer ?? '');
  const [avatar, setAvatar] = useState(initialProfile?.avatar ?? AVATARS[0]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(initialProfile?.teachers ?? []);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${TEACHERS_ENDPOINT}?tab=${encodeURIComponent(TEACHERS_TAB)}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length) setTeacherOptions(data);
      } catch (e) {
        // Geen verbinding of nog niet geconfigureerd: lijst blijft leeg,
        // de leerling kan wel gewoon starten (zie validatie hieronder).
      } finally {
        setTeachersLoading(false);
      }
    })();
  }, []);

  const toggleTeacher = (naamVal: string) => {
    setSelectedTeachers(prev =>
      prev.includes(naamVal) ? prev.filter(t => t !== naamVal) : [...prev, naamVal]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voornaam.trim() || !naam.trim() || !klas.trim() || !klasnummer.trim()) {
      setError('Vul alle velden in voor je begint.');
      return;
    }
    if (teacherOptions.length > 0 && selectedTeachers.length === 0) {
      setError('Kies minstens 1 leerkracht die jouw leesrapporten mag ontvangen.');
      return;
    }
    setError(null);
    onComplete({
      voornaam: voornaam.trim(),
      naam: naam.trim(),
      klas: klas.trim(),
      klasnummer: klasnummer.trim(),
      avatar,
      teachers: selectedTeachers,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100/60 flex flex-col items-center px-4 py-8">

      {/* Logos */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-6">
        <img
          src="/sta-logo.png"
          alt="Sint-Theresia Basisschool"
          className="h-24 sm:h-28 w-auto object-contain select-none"
        />
        <img
          src="/melk-logo.png"
          alt="MELK - Mijn Eigen Leer-Kracht"
          className="h-14 sm:h-16 w-auto object-contain select-none"
        />
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg border border-amber-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          {avatar ? (
            <div className="text-5xl mb-2">{avatar}</div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-stone-700 text-white flex items-center justify-center text-xl font-black font-lexend">
              {(voornaam[0] || '?').toUpperCase()}{(naam[0] || '').toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black font-lexend text-stone-900">Hallo! Wie ben jij?</h1>
          <p className="text-sm text-stone-500 mt-1">Vul je gegevens in om te starten met lezen.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 font-lexend">Voornaam</label>
              <input
                type="text"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                placeholder="bv. Milan"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 font-lexend">Naam</label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                placeholder="bv. Peeters"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 font-lexend">Klas</label>
              <input
                type="text"
                value={klas}
                onChange={(e) => setKlas(e.target.value)}
                className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                placeholder="bv. 5B"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 font-lexend">Klasnummer</label>
              <input
                type="text"
                value={klasnummer}
                onChange={(e) => setKlasnummer(e.target.value)}
                className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                placeholder="bv. 12"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-2 font-lexend">Kies jouw avatar (optioneel)</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`aspect-square rounded-2xl text-2xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                    avatar === a
                      ? 'border-amber-500 bg-amber-100 scale-105 shadow-xs'
                      : 'border-transparent bg-stone-50 hover:bg-amber-50'
                  }`}
                >
                  {a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAvatar(NO_AVATAR)}
                title="Geen avatar - toon mijn initialen"
                className={`aspect-square rounded-2xl text-[10px] font-bold flex items-center justify-center border-2 transition-all cursor-pointer leading-tight ${
                  avatar === NO_AVATAR
                    ? 'border-amber-500 bg-amber-100 scale-105 shadow-xs text-amber-900'
                    : 'border-transparent bg-stone-50 hover:bg-amber-50 text-stone-500'
                }`}
              >
                Geen<br />avatar
              </button>
            </div>
          </div>

          {!teachersLoading && teacherOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 font-lexend">
                Wie mag jouw leesrapporten ontvangen?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {teacherOptions.map((t) => (
                  <button
                    type="button"
                    key={t.naam}
                    onClick={() => toggleTeacher(t.naam)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      selectedTeachers.includes(t.naam)
                        ? 'border-amber-500 bg-amber-100 shadow-xs'
                        : 'border-transparent bg-stone-50 hover:bg-amber-50'
                    }`}
                  >
                    <span className="text-xl">{TEACHER_AVATARS[t.avatar] || '🦁'}</span>
                    <span className="text-xs font-bold text-stone-800">{t.naam}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">Je kan er meerdere kiezen.</p>
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black font-lexend rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Start met lezen! 🚀
          </button>
        </form>
      </div>
    </div>
  );
};
