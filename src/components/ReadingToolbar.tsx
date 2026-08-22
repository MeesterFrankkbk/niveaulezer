import React from 'react';
import { AccessibilitySettings } from '../types';
import { 
  Type, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square, 
  Sliders, 
  Eye, 
  Sparkles, 
  Check
} from 'lucide-react';
import { SpeechVoiceOption } from '../utils/speech';

interface ReadingToolbarProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  isPlayingAudio: boolean;
  isPausedAudio: boolean;
  onPlayAudio: () => void;
  onPauseAudio: () => void;
  onStopAudio: () => void;
  voices: SpeechVoiceOption[];
}

export const ReadingToolbar: React.FC<ReadingToolbarProps> = ({
  settings,
  onUpdateSettings,
  isPlayingAudio,
  isPausedAudio,
  onPlayAudio,
  onPauseAudio,
  onStopAudio,
  voices
}) => {
  const speeds = [
    { value: 0.6, label: '🐢 Erg traag' },
    { value: 0.8, label: '🐌 Rustig' },
    { value: 1.0, label: '🚶 Normaal' },
    { value: 1.2, label: '🐇 Vlot' },
    { value: 1.4, label: '🚀 Snel' },
  ];

  const fonts: Array<{ id: AccessibilitySettings['fontFamily']; label: string }> = [
    { id: 'lexend', label: 'Lexend (Vlotte lezers)' },
    { id: 'dyslexic', label: 'Dyslexie vriendelijk' },
    { id: 'comic', label: 'Comic Speels' },
    { id: 'atkinson', label: 'Atkinson Duidelijk' },
    { id: 'sans', label: 'Standaard' },
  ];

  const fontSizes: Array<{ id: AccessibilitySettings['fontSize']; label: string; size: string }> = [
    { id: 'sm', label: 'A', size: 'Klein (18px)' },
    { id: 'md', label: 'A', size: 'Normaal (22px)' },
    { id: 'lg', label: 'A', size: 'Groot (26px)' },
    { id: 'xl', label: 'A', size: 'Extra Groot (32px)' },
  ];

  const rulerColors: Array<{ id: AccessibilitySettings['rulerColor']; label: string; bg: string }> = [
    { id: 'yellow', label: 'Geel', bg: 'bg-amber-300' },
    { id: 'blue', label: 'Blauw', bg: 'bg-sky-300' },
    { id: 'green', label: 'Groen', bg: 'bg-emerald-300' },
    { id: 'peach', label: 'Perzik', bg: 'bg-orange-300' },
    { id: 'pink', label: 'Roze', bg: 'bg-rose-300' },
    { id: 'gray', label: 'Grijs', bg: 'bg-stone-300' },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-amber-200 sticky top-0 z-40 px-4 py-3 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Voorlezen / Spraak controls */}
        <div className="flex items-center flex-wrap gap-2">
          {!isPlayingAudio && !isPausedAudio ? (
            <button
              onClick={onPlayAudio}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm font-lexend cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Lees voor (Vlaams)</span>
            </button>
          ) : isPausedAudio ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onPlayAudio}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-sm text-xs font-lexend cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Verder</span>
              </button>
              <button
                onClick={onStopAudio}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs cursor-pointer"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onPauseAudio}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-sm text-xs font-lexend cursor-pointer animate-pulse"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pauze</span>
              </button>
              <button
                onClick={onStopAudio}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs cursor-pointer"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          )}

          {/* Snelheid kiezer */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-500 px-2 select-none hidden sm:inline">
              Tempo:
            </span>
            <select
              value={settings.audioSpeed}
              onChange={(e) => onUpdateSettings({ audioSpeed: parseFloat(e.target.value) })}
              className="bg-transparent text-xs font-bold text-stone-800 rounded-xl px-2 py-1 outline-hidden cursor-pointer"
            >
              {speeds.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stem kiezer indien meerdere stemmen */}
          {voices.length > 1 && (
            <div className="hidden lg:flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <select
                value={settings.selectedVoiceURI}
                onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value })}
                className="bg-transparent text-xs text-stone-800 rounded-xl px-2 py-1 outline-hidden cursor-pointer max-w-[140px] truncate"
              >
                {voices.map(v => (
                  <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Typography & Reading Aids */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Font Selector */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <Type className="w-3.5 h-3.5 text-stone-500 ml-1.5 mr-1" />
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value as any })}
              className="bg-transparent text-xs font-bold text-stone-800 rounded-xl px-1.5 py-1 outline-hidden cursor-pointer"
            >
              {fonts.map(f => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Selector (A- / A+) */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            {fontSizes.map((fs, idx) => (
              <button
                key={fs.id}
                onClick={() => onUpdateSettings({ fontSize: fs.id })}
                className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settings.fontSize === fs.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
                style={{ fontSize: idx === 0 ? '11px' : idx === 1 ? '13px' : idx === 2 ? '15px' : '17px' }}
                title={fs.size}
              >
                {fs.label}
              </button>
            ))}
          </div>

          {/* Lettergrepen splitsing toggle */}
          <button
            onClick={() => onUpdateSettings({ highlightSyllables: !settings.highlightSyllables })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
              settings.highlightSyllables
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
            }`}
            title="Splits woorden in lettergrepen (bijv. tuin·huis)"
          >
            <span className="font-mono text-amber-700 font-black">a·b</span>
            <span className="hidden sm:inline">Lettergrepen</span>
          </button>

          {/* Leesliniaal toggle & color */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <button
              onClick={() => onUpdateSettings({ readingRuler: !settings.readingRuler })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.readingRuler
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
              title="Zet de leesliniaal aan of uit"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Leesliniaal</span>
            </button>

            {settings.readingRuler && (
              <div className="flex items-center gap-1 pl-1.5 pr-1">
                {rulerColors.map(rc => (
                  <button
                    key={rc.id}
                    onClick={() => onUpdateSettings({ rulerColor: rc.id })}
                    className={`w-3.5 h-3.5 rounded-full ${rc.bg} transition-transform hover:scale-125 cursor-pointer ${
                      settings.rulerColor === rc.id ? 'ring-2 ring-amber-600 scale-110' : ''
                    }`}
                    title={rc.label}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
