import React, { useState, useEffect, useRef } from 'react';
import { Story, AccessibilitySettings, DifficultWord, StudentResult } from '../types';
import { ReadingToolbar } from './ReadingToolbar';
import { ReadingRuler } from './ReadingRuler';
import { WordPopupModal } from './WordPopupModal';
import { AudioRecorder } from './AudioRecorder';
import { createSpeechController, SpeechVoiceOption } from '../utils/speech';
import { splitDutchSyllables, stripInlineImages } from '../utils/aviCalculator';
import { AVI_COLORS } from '../utils/aviCalculator';
import { 
  Clock, 
  BookOpen, 
  HelpCircle, 
  CheckCircle, 
  Sparkles, 
  ArrowLeft, 
  Volume2, 
  Award,
  Zap
} from 'lucide-react';

interface ReadingViewProps {
  story: Story;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  voices: SpeechVoiceOption[];
  onFinishReading: (readingTimeSeconds: number, wordsRead: number, audioUrl?: string) => void;
  onBackToOverview: () => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  story,
  settings,
  onUpdateSettings,
  voices,
  onFinishReading,
  onBackToOverview
}) => {
  const [selectedWord, setSelectedWord] = useState<DifficultWord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState<number | null>(null);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | undefined>(undefined);

  const speechControllerRef = useRef(createSpeechController());
  const timerRef = useRef<number | null>(null);

  // Start reading timer
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setReadingSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechControllerRef.current.stop();
    };
  }, []);

  const handlePlayAudio = () => {
    if (isPausedAudio) {
      speechControllerRef.current.resume();
      setIsPausedAudio(false);
      setIsPlayingAudio(true);
      return;
    }

    setIsPlayingAudio(true);
    setIsPausedAudio(false);

    speechControllerRef.current.speak(stripInlineImages(story.content), {
      speed: settings.audioSpeed,
      voiceURI: settings.selectedVoiceURI,
      onWordBoundary: (charIndex) => {
        setSpokenCharIndex(charIndex);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
        setSpokenCharIndex(null);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
        setSpokenCharIndex(null);
      }
    });
  };

  const handlePauseAudio = () => {
    speechControllerRef.current.pause();
    setIsPausedAudio(true);
    setIsPlayingAudio(false);
  };

  const handleStopAudio = () => {
    speechControllerRef.current.stop();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setSpokenCharIndex(null);
  };

  // Find if a word matches a difficult word
  const matchDifficultWord = (cleanWord: string): DifficultWord | undefined => {
    const lower = cleanWord.toLowerCase().replace(/[.,!?;:"'()]/g, '');
    return story.difficultWords.find(dw => dw.word.toLowerCase() === lower);
  };

  // Font family css class mapper
  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'lexend': return 'font-lexend';
      case 'dyslexic': return 'font-dyslexic';
      case 'comic': return 'font-comic';
      case 'atkinson': return 'font-atkinson';
      default: return 'font-sans';
    }
  };

  // Font size css style
  const getFontSizeStyle = () => {
    switch (settings.fontSize) {
      case 'sm': return { fontSize: '18px', lineHeight: '1.7' };
      case 'md': return { fontSize: '22px', lineHeight: '1.8' };
      case 'lg': return { fontSize: '26px', lineHeight: '1.9' };
      case 'xl': return { fontSize: '32px', lineHeight: '2.0' };
      default: return { fontSize: '22px', lineHeight: '1.8' };
    }
  };

  // Render text paragraphs with interactive clickable words, karaoke boundaries,
  // and inline images (paragraphs written as ![beschrijving](url))
  const renderParagraphs = () => {
    const paragraphs = story.content.split('\n\n');
    let runningCharOffset = 0;
    const imageLineRegex = /^!\[(.*?)\]\((\S+)\)$/;

    return paragraphs.map((paragraph, pIdx) => {
      const trimmed = paragraph.trim();
      const imageMatch = trimmed.match(imageLineRegex);

      if (imageMatch) {
        const [, altText, imgUrl] = imageMatch;
        return (
          <figure key={pIdx} className="mb-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage({ url: imgUrl, alt: altText || story.title })}
              className="rounded-2xl overflow-hidden shadow-md bg-stone-100 border border-stone-200 cursor-zoom-in hover:opacity-90 transition-opacity"
              title="Klik om te vergroten"
            >
              <img
                src={imgUrl}
                alt={altText || story.title}
                referrerPolicy="no-referrer"
                className="max-w-[220px] sm:max-w-[280px] max-h-56 w-auto h-auto object-cover"
              />
            </button>
            {altText && (
              <figcaption className="text-center text-xs text-stone-500 mt-2 italic">{altText}</figcaption>
            )}
          </figure>
        );
      }

      const words = paragraph.split(/\s+/);
      const paragraphOffset = runningCharOffset;
      runningCharOffset += paragraph.length + 2;

      let currentWordOffset = paragraphOffset;

      return (
        <p key={pIdx} className="mb-6 leading-relaxed text-stone-800 tracking-normal transition-all">
          {words.map((word, wIdx) => {
            const wordStart = currentWordOffset;
            const wordEnd = wordStart + word.length;
            currentWordOffset += word.length + 1; // + space

            const isSpoken = spokenCharIndex !== null && spokenCharIndex >= wordStart && spokenCharIndex <= wordEnd;
            const diffWord = matchDifficultWord(word);

            let displayWord = word;
            if (settings.highlightSyllables && word.length > 4) {
              displayWord = splitDutchSyllables(word);
            }

            if (diffWord) {
              return (
                <span key={wIdx} className="inline-block mr-1.5 my-0.5">
                  <button
                    onClick={() => setSelectedWord(diffWord)}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isSpoken 
                        ? 'bg-amber-400 text-stone-950 scale-105 shadow-md ring-2 ring-amber-500 font-extrabold'
                        : 'bg-amber-100/90 text-amber-950 border border-amber-300/80 hover:bg-amber-200 hover:scale-105'
                    }`}
                    title={`Klik voor uitleg: ${diffWord.word}`}
                  >
                    <span>{displayWord}</span>
                    <span className="text-xs opacity-75">{diffWord.emoji || '💡'}</span>
                  </button>
                </span>
              );
            }

            return (
              <span
                key={wIdx}
                className={`inline-block mr-1.5 transition-all rounded-md px-1 ${
                  isSpoken
                    ? 'bg-amber-300 text-stone-950 font-bold scale-105 shadow-xs ring-2 ring-amber-400'
                    : ''
                }`}
              >
                {displayWord}
              </span>
            );
          })}
        </p>
      );
    });
  };

  const levelColor = AVI_COLORS[story.level] || AVI_COLORS['M4'];
  const minutes = Math.floor(readingSeconds / 60);
  const seconds = readingSeconds % 60;
  const wpm = readingSeconds > 5 ? Math.round((story.wordCount / readingSeconds) * 60) : 0;

  return (
    <div className="min-h-screen bg-stone-50/50 pb-24">
      {/* Reading Ruler Overlay */}
      <ReadingRuler
        enabled={settings.readingRuler}
        color={settings.rulerColor}
        height={settings.rulerHeight}
      />

      {/* Top Accessibility Toolbar */}
      <ReadingToolbar
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        isPlayingAudio={isPlayingAudio}
        isPausedAudio={isPausedAudio}
        onPlayAudio={handlePlayAudio}
        onPauseAudio={handlePauseAudio}
        onStopAudio={handleStopAudio}
        voices={voices}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Navigation & Story Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={onBackToOverview}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-2xl border border-stone-200 shadow-xs transition-colors cursor-pointer text-sm font-lexend"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar alle teksten
          </button>

          <div className="flex items-center gap-3">
            {/* Level Badge */}
            <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider ${levelColor.badge} shadow-xs font-lexend`}>
              Niveau {story.level}
            </span>

            {/* Reading Timer */}
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 shadow-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{minutes}:{seconds < 10 ? '0' : ''}{seconds}</span>
              {wpm > 0 && <span className="text-amber-700 font-bold ml-1">({wpm} wpm)</span>}
            </div>
          </div>
        </div>

        {/* Story Reading Canvas */}
        <article className="bg-white rounded-3xl p-6 sm:p-10 shadow-md border border-amber-100 relative overflow-hidden">
          
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-stone-100">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 font-lexend">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{story.code} • {story.category}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 font-lexend leading-tight tracking-tight">
              {story.title}
            </h1>
          </div>

          {/* Story Illustration */}
          {story.image && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-md max-h-80 w-full bg-stone-100 border border-stone-200">
              <img
                src={story.image}
                alt={story.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover max-h-80 hover:scale-102 transition-transform duration-500"
              />
            </div>
          )}

          {/* Reading Prompt Guide for Kids */}
          <div className="mb-6 p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span>
                Tik op de <strong className="text-amber-950 font-bold bg-amber-200/80 px-1.5 py-0.5 rounded-md">geel gemarkeerde woorden</strong> voor een eenvoudige uitleg en betekenis!
              </span>
            </div>
            <span className="hidden sm:inline text-stone-500 font-mono">
              {story.wordCount} woorden
            </span>
          </div>

          {/* Story Text Box with Selected Typography */}
          <div
            id="story-reading-content"
            className={`${getFontFamilyClass()} select-text`}
            style={getFontSizeStyle()}
          >
            {renderParagraphs()}
          </div>

          {/* Voice Audio Recorder */}
          <div className="mt-10 pt-8 border-t border-stone-100">
            <AudioRecorder
              onRecordingComplete={(audioUrl) => {
                setRecordedAudioUrl(audioUrl);
              }}
              existingAudioUrl={recordedAudioUrl}
            />
          </div>

          {/* Finished Reading CTA Button */}
          <div className="mt-10 pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-stone-600 font-medium text-center sm:text-left">
              Heb je de tekst goed gelezen? Beantwoord nu de begripsvragen!
            </div>
            <button
              onClick={() => onFinishReading(readingSeconds, story.wordCount, recordedAudioUrl)}
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-98 text-base font-lexend cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Klaar met lezen! Naar de vragen</span>
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>

        </article>

      </main>

      {/* Vocabulary Modal */}
      <WordPopupModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        voiceURI={settings.selectedVoiceURI}
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-stone-900/80 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-stone-700 shadow-lg cursor-pointer"
            aria-label="Sluiten"
          >
            ✕
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.alt}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain cursor-default"
          />
          {lightboxImage.alt && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/90 text-sm italic bg-stone-900/60 px-4 py-1.5 rounded-full">
              {lightboxImage.alt}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
