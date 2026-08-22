import React, { useState } from 'react';
import { Story, Question } from '../types';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Sparkles, 
  Award, 
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { AVI_COLORS } from '../utils/aviCalculator';

interface QuizViewProps {
  story: Story;
  readingTimeSeconds: number;
  recordedAudioUrl?: string;
  onCompleteQuiz: (score: number, correctCount: number, answers: Record<string, number>) => void;
  onReturnToReading: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  story,
  readingTimeSeconds,
  recordedAudioUrl,
  onCompleteQuiz,
  onReturnToReading
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [correctCount, setCorrectCount] = useState(0);

  const questions = story.questions;
  const currentQ = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;

    const isCorrect = selectedOption === currentQ.correctIndex;
    setIsAnswerSubmitted(true);

    const updatedAnswers = { ...answers, [currentQ.id || `q${currentQuestionIndex}`]: selectedOption };
    setAnswers(updatedAnswers);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      // Small celebratory confetti burst for correct answer
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // Safe fallback
      }
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      const finalCorrect = selectedOption === currentQ.correctIndex ? correctCount : correctCount;
      const score = Math.round((finalCorrect / questions.length) * 100);
      
      // Full confetti celebration for quiz completion!
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {}

      onCompleteQuiz(score, finalCorrect, answers);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    }
  };

  const levelColor = AVI_COLORS[story.level] || AVI_COLORS['M4'];

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-amber-100 relative">
        
        {/* Progress Bar & Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={onReturnToReading}
            className="text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer font-lexend"
          >
            <BookOpen className="w-4 h-4" />
            Tekst herlezen
          </button>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${levelColor.badge}`}>
              {story.level}
            </span>
            <span className="text-xs font-bold text-stone-600 font-mono">
              Vraag {currentQuestionIndex + 1} van {questions.length}
            </span>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-2.5 bg-stone-100 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Type Badge */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold font-lexend">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            {currentQ.type === 'vocabulary' ? 'Woordenschat & Betekenis' : 'Begrijpend Lezen'}
          </span>
        </div>

        {/* Question Title */}
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-lexend mb-6 leading-snug">
          {currentQ.question}
        </h2>

        {/* Multiple Choice Options */}
        <div className="space-y-3 mb-8">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let optionStyle = 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-amber-50/60 hover:border-amber-300';

            if (isAnswerSubmitted) {
              if (isCorrect) {
                optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400 font-bold';
              } else if (isSelected && !isCorrect) {
                optionStyle = 'bg-rose-50 border-rose-400 text-rose-950 opacity-80';
              } else {
                optionStyle = 'bg-stone-50 border-stone-200 text-stone-400 opacity-50';
              }
            } else if (isSelected) {
              optionStyle = 'bg-amber-100 border-amber-500 text-amber-950 ring-2 ring-amber-400 font-bold';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerSubmitted}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 font-mono transition-colors ${
                  isAnswerSubmitted && isCorrect
                    ? 'bg-emerald-500 text-white'
                    : isAnswerSubmitted && isSelected && !isCorrect
                    ? 'bg-rose-500 text-white'
                    : isSelected
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-base font-medium flex-1 pt-0.5">
                  {option}
                </span>
                {isAnswerSubmitted && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {isAnswerSubmitted && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Explanation Box */}
        {isAnswerSubmitted && (
          <div className={`p-4 rounded-2xl mb-6 border animate-in fade-in duration-200 ${
            selectedOption === currentQ.correctIndex
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 font-bold font-lexend mb-1 text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              {selectedOption === currentQ.correctIndex ? '🎉 Helemaal juist!' : '💡 Uitleg bij de tekst:'}
            </div>
            <p className="text-sm font-medium leading-relaxed">
              {currentQ.explanation}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          {!isAnswerSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              className={`px-8 py-3.5 rounded-2xl font-bold font-lexend transition-all text-sm sm:text-base cursor-pointer ${
                selectedOption !== null
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              Controleer antwoord
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold font-lexend rounded-2xl shadow-md transition-all active:scale-95 text-sm sm:text-base flex items-center gap-2 cursor-pointer"
            >
              <span>{isLastQuestion ? 'Bekijk mijn rapport & diploma 🏆' : 'Volgende vraag'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
