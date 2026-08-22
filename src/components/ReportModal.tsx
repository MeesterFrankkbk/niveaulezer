import React, { useRef } from 'react';
import { StudentResult, TeacherSettings } from '../types';
import { 
  Award, 
  Sparkles, 
  CheckCircle, 
  Mail, 
  Printer, 
  RotateCcw, 
  Clock, 
  Zap, 
  Heart, 
  BookOpen, 
  Volume2,
  Share2,
  Check
} from 'lucide-react';
import { AVI_COLORS } from '../utils/aviCalculator';

interface ReportModalProps {
  result: StudentResult;
  teacherSettings: TeacherSettings;
  onClose: () => void;
  onSelectNewStory: () => void;
  onRetryStory: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  result,
  teacherSettings,
  onClose,
  onSelectNewStory,
  onRetryStory
}) => {
  const [copied, setCopied] = React.useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const levelColor = AVI_COLORS[result.level] || AVI_COLORS['M4'];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // Generate mailto link for sending results directly to teacher
  const handleEmailTeacher = () => {
    const subject = encodeURIComponent(`Leesrapport ${result.studentName}: ${result.storyTitle} (${result.level})`);
    
    const body = encodeURIComponent(
`Beste ${teacherSettings.teacherName || 'leerkracht'},

Hier zijn de leesprestaties van ${result.studentName}:

📖 Tekst: ${result.storyTitle} (${result.storyCode})
🎯 AVI-niveau: ${result.level}
📅 Datum: ${result.date}

⏱️ Leestijd: ${formatTime(result.durationSeconds)}
⚡ Leessnelheid: ${result.wpm} woorden per minuut (WPM)
🏆 Begrip & Woordenschat: ${result.score}% (${result.correctAnswersCount}/${result.totalQuestions} vragen juist)

🌟 Positieve feedback:
${result.positiveFeedback}

🌱 Groeipunten & tips:
${result.growthTips.map(t => `- ${t}`).join('\n')}

Met vriendelijke groetjes,
${result.studentName}
(Gemaakt via NiveauLezer)
`
    );

    const email = teacherSettings.teacherEmail || 'meesterfrank.kbk@gmail.com';
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyReport = () => {
    const text = `Leesrapport voor ${result.studentName}\nTekst: ${result.storyTitle} (${result.level})\nScore: ${result.score}% (${result.correctAnswersCount}/${result.totalQuestions})\nLeessnelheid: ${result.wpm} WPM\nFeedback: ${result.positiveFeedback}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 py-8">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Certificate / Report Card Header */}
        <div ref={printableRef} className="p-6 sm:p-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 text-4xl shadow-inner border-2 border-amber-300 mb-3 animate-bounce">
              {result.score >= 80 ? '🏆' : result.score >= 60 ? '🌟' : '👏'}
            </div>
            
            <div className="text-xs font-black tracking-widest uppercase text-amber-800 font-lexend mb-1">
              Officieel Leesdiploma & Voortgang
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 font-lexend">
              Geweldig gelezen, {result.studentName}! 🎉
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              {result.storyTitle} • <span className="font-bold">{result.date}</span>
            </p>
          </div>

          {/* Stats Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            
            {/* Score */}
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-center">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">Begrip</div>
              <div className="text-2xl font-black text-amber-800 font-lexend mt-0.5">{result.score}%</div>
              <div className="text-[11px] text-amber-700 font-medium">{result.correctAnswersCount}/{result.totalQuestions} vragen</div>
            </div>

            {/* Level */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-center">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">AVI Niveau</div>
              <div className={`text-xl font-black ${levelColor.text} font-lexend mt-1`}>{result.level}</div>
              <div className="text-[11px] text-stone-500 font-medium">Doel bereikt</div>
            </div>

            {/* WPM Speed */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-center">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">Tempo</div>
              <div className="text-xl font-black text-stone-800 font-lexend mt-1">{result.wpm}</div>
              <div className="text-[11px] text-stone-500 font-medium">woorden/min</div>
            </div>

            {/* Time */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-center">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">Leestijd</div>
              <div className="text-xl font-black text-stone-800 font-lexend mt-1">{formatTime(result.durationSeconds)}</div>
              <div className="text-[11px] text-stone-500 font-medium">{result.wordsRead} woorden</div>
            </div>

          </div>

          {/* Audio Recording Replay */}
          {result.audioBlobUrl && (
            <div className="mb-6 p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 font-lexend">Jouw opgenomen leesstem</div>
                  <div className="text-xs text-amber-700">Beluister hoe vlot je het verhaal voorlas</div>
                </div>
              </div>
              <audio controls src={result.audioBlobUrl} className="h-9 max-w-[200px]" />
            </div>
          )}

          {/* Positive Compliment Box */}
          <div className="mb-6 p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 font-lexend mb-1.5">
              <Heart className="w-4 h-4 text-emerald-600 fill-current" />
              Compliment van de leerkracht
            </div>
            <p className="text-sm font-medium text-emerald-950 leading-relaxed">
              "{result.positiveFeedback}"
            </p>
          </div>

          {/* Growth Tips for Future */}
          {result.growthTips && result.growthTips.length > 0 && (
            <div className="mb-8 p-5 bg-sky-50 rounded-2xl border border-sky-200">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-800 font-lexend mb-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Tips om nog verder te groeien 🌱
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-sky-950 font-medium">
                {result.growthTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons: Email, Print, Share */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            
            {/* Direct Email to Teacher Button */}
            <button
              onClick={handleEmailTeacher}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 text-base font-lexend cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              <span>Mail resultaten naar {teacherSettings.teacherName || 'meester Frank'}</span>
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              
              <button
                onClick={handlePrint}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print diploma
              </button>

              <button
                onClick={handleCopyReport}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Gekopieerd!' : 'Kopieer tekst'}
              </button>

              <button
                onClick={onRetryStory}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer col-span-2 sm:col-span-1"
              >
                <RotateCcw className="w-4 h-4" />
                Opnieuw oefenen
              </button>

            </div>

            <div className="pt-3">
              <button
                onClick={onSelectNewStory}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-all active:scale-98 text-sm font-lexend cursor-pointer"
              >
                Kies een ander leuk verhaal 📚
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
