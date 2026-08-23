import React, { useState, useEffect, useRef } from 'react';
import { 
  Story, 
  AviLevel, 
  StudentResult, 
  AccessibilitySettings, 
  TeacherSettings 
} from './types';
import { DEFAULT_STORIES } from './data/defaultStories';
import { Navbar } from './components/Navbar';
import { StoryCard } from './components/StoryCard';
import { ReadingView } from './components/ReadingView';
import { QuizView } from './components/QuizView';
import { ReportModal } from './components/ReportModal';
import { TeacherStudio } from './components/TeacherStudio';
import { ReadingBuddy } from './components/ReadingBuddy';
import { WelcomeScreen, StudentProfile } from './components/WelcomeScreen';
import { TeacherPasswordGate } from './components/TeacherPasswordGate';
import { getAvailableDutchVoices, SpeechVoiceOption } from './utils/speech';
import { AVI_COLORS } from './utils/aviCalculator';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Filter, 
  HelpCircle, 
  Award, 
  Plus, 
  Layers,
  Heart,
  TrendingUp,
  Volume2
} from 'lucide-react';

const AVI_LEVEL_LIST: AviLevel[] = [
  'AVI Start',
  'M3',
  'E3',
  'M4',
  'E4',
  'M5',
  'E5',
  'M6',
  'E6',
  'E7',
  'Plus'
];

export default function App() {
  // Stories state with local persistence
  const [stories, setStories] = useState<Story[]>(() => {
    const saved = localStorage.getItem('niveaulezer_stories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_STORIES;
  });

  // Results state
  const [results, setResults] = useState<StudentResult[]>(() => {
    const saved = localStorage.getItem('niveaulezer_results');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Teacher settings
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettings>(() => {
    const saved = localStorage.getItem('niveaulezer_teacher_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      teacherName: 'Meester Frank',
      teacherEmail: 'meesterfrank.kbk@gmail.com',
      schoolName: 'Basisschool',
      className: '4de leerjaar'
    };
  });

  // Student profile (voornaam, naam, klas, klasnummer, avatar) - filled in on the welcome screen
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem('niveaulezer_student_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const studentName = studentProfile?.voornaam || '';

  const handleUpdateStudentName = (name: string) => {
    setStudentProfile(prev => prev ? { ...prev, voornaam: name } : prev);
  };

  // Teacher panel password gate
  const [isTeacherGateOpen, setIsTeacherGateOpen] = useState(false);

  // Accessibility Settings
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    fontFamily: 'lexend',
    fontSize: 'md',
    lineSpacing: 'relaxed',
    readingRuler: false,
    rulerColor: 'yellow',
    rulerHeight: 48,
    highlightSyllables: false,
    audioSpeed: 1.0,
    selectedVoiceURI: '',
    highContrast: false,
    bgColor: 'cream'
  });

  // Navigation / View state
  const [currentView, setCurrentView] = useState<'overview' | 'reading' | 'quiz'>('overview');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [activeReportResult, setActiveReportResult] = useState<StudentResult | null>(null);
  const [isTeacherStudioOpen, setIsTeacherStudioOpen] = useState(false);

  // Filter states
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active reading metrics tracking
  const [readingSession, setReadingSession] = useState<{
    durationSeconds: number;
    wordsRead: number;
    audioUrl?: string;
  }>({ durationSeconds: 0, wordsRead: 0 });

  // Voices
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);

  // Initialize Web Speech voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const dutchVoices = getAvailableDutchVoices();
      setVoices(dutchVoices);
      if (dutchVoices.length > 0 && !accessibilitySettings.selectedVoiceURI) {
        setAccessibilitySettings(prev => ({
          ...prev,
          selectedVoiceURI: dutchVoices[0].voice.voiceURI
        }));
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load the library from the server on startup - this is now the source of
  // truth. localStorage is kept only as an instant-loading placeholder and an
  // offline fallback; we never let it silently overwrite server data.
  const hasLoadedFromServerRef = useRef(false);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(true);
  const [librarySyncError, setLibrarySyncError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/load-library');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.stories) && data.stories.length > 0) {
            setStories(data.stories);
            localStorage.setItem('niveaulezer_stories', JSON.stringify(data.stories));
          }
          if (Array.isArray(data.results)) {
            setResults(data.results);
            localStorage.setItem('niveaulezer_results', JSON.stringify(data.results));
          }
        } else {
          setLibrarySyncError('Kon de bibliotheek niet laden van de server - je ziet momenteel enkel de lokale versie op dit toestel.');
        }
      } catch (e) {
        setLibrarySyncError('Geen verbinding met de server - je ziet momenteel enkel de lokale versie op dit toestel.');
      } finally {
        hasLoadedFromServerRef.current = true;
        setIsSyncingLibrary(false);
      }
    })();
  }, []);

  // Save stories to localStorage (fast local cache) and to the server
  // (source of truth, shared across devices/browsers) - server sync is only
  // enabled after the initial server load above has completed, so a stale
  // local snapshot can never overwrite good server data on startup.
  useEffect(() => {
    localStorage.setItem('niveaulezer_stories', JSON.stringify(stories));
    if (hasLoadedFromServerRef.current) {
      fetch('/api/save-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stories })
      }).catch(() => setLibrarySyncError('Kon de bibliotheek niet naar de server opslaan - probeer het later opnieuw of maak een JSON-back-up.'));
    }
  }, [stories]);

  // Save results to localStorage and the server (same safeguard as above)
  useEffect(() => {
    localStorage.setItem('niveaulezer_results', JSON.stringify(results));
    if (hasLoadedFromServerRef.current) {
      fetch('/api/save-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      }).catch(() => setLibrarySyncError('Kon de resultaten niet naar de server opslaan - probeer het later opnieuw.'));
    }
  }, [results]);

  // Save teacher settings to localStorage
  useEffect(() => {
    localStorage.setItem('niveaulezer_teacher_settings', JSON.stringify(teacherSettings));
  }, [teacherSettings]);

  // Save student profile
  useEffect(() => {
    if (studentProfile) {
      localStorage.setItem('niveaulezer_student_profile', JSON.stringify(studentProfile));
    }
  }, [studentProfile]);

  const handleUpdateAccessibility = (newSettings: Partial<AccessibilitySettings>) => {
    setAccessibilitySettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setCurrentView('reading');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishReading = (readingTimeSeconds: number, wordsRead: number, audioUrl?: string) => {
    setReadingSession({
      durationSeconds: Math.max(5, readingTimeSeconds),
      wordsRead,
      audioUrl
    });
    setCurrentView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteQuiz = (score: number, correctCount: number, answers: Record<string, number>) => {
    if (!selectedStory) return;

    const wpm = readingSession.durationSeconds > 5 
      ? Math.round((selectedStory.wordCount / readingSession.durationSeconds) * 60)
      : 80;

    // Generate positive growth feedback and tips
    let positiveFeedback = `Geweldige prestatie, ${studentName}! Je hebt de tekst "${selectedStory.title}" met veel aandacht gelezen en ${correctCount} van de ${selectedStory.questions.length} vragen correct beantwoord!`;
    const growthTips: string[] = [];

    if (score === 100) {
      positiveFeedback += ' Je behaalde een perfecte score van 100%! Je bent een echte leeskampioen!';
      growthTips.push('Je bent helemaal klaar voor een volgend AVI-niveau!');
      growthTips.push('Blijf elke dag 15 minuten lezen om je woordenschat rijk te houden.');
    } else if (score >= 60) {
      positiveFeedback += ' Heel knap doorgezet! Je begrijpt de kern van het verhaal al erg goed.';
      growthTips.push('Kijk bij twijfel even terug in de alinea waar het antwoord verstopt zit.');
      growthTips.push('Oefen met het hardop voorlezen met intonatie bij punten en komma\'s.');
    } else {
      positiveFeedback += ' Goed geprobeerd! Lezen is een spier die groeit door veel te oefenen.';
      growthTips.push('Gebruik de voorleesknop om mee te luisteren terwijl je meeleest.');
      growthTips.push('Klik op de gele woorden voor extra uitleg over moeilijke begrippen.');
    }

    const newResult: StudentResult = {
      id: `result-${Date.now()}`,
      studentName,
      storyId: selectedStory.id,
      storyTitle: selectedStory.title,
      storyCode: selectedStory.code,
      level: selectedStory.level,
      date: new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }),
      durationSeconds: readingSession.durationSeconds,
      wordsRead: selectedStory.wordCount,
      wpm,
      score,
      correctAnswersCount: correctCount,
      totalQuestions: selectedStory.questions.length,
      answers,
      audioBlobUrl: readingSession.audioUrl,
      hasAudioRecording: !!readingSession.audioUrl,
      positiveFeedback,
      growthTips,
      badge: score >= 80 ? 'Goud' : score >= 60 ? 'Zilver' : 'Brons'
    };

    setResults(prev => [newResult, ...prev]);
    setActiveReportResult(newResult);
  };

  const handleSaveStory = (storyToSave: Story) => {
    setStories(prev => {
      const idx = prev.findIndex(s => s.id === storyToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = storyToSave;
        return copy;
      }
      return [storyToSave, ...prev];
    });
  };

  const handleDeleteStory = (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
  };

  const handleImportLibrary = (importedStories: Story[]) => {
    setStories(importedStories);
  };

  // Filtered stories
  const filteredStories = stories.filter(story => {
    const matchesLevel = selectedLevelFilter === 'ALL' || story.level === selectedLevelFilter;
    const matchesSearch = !searchQuery.trim() || 
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Show the welcome screen until the student has filled in their profile
  if (!studentProfile) {
    return (
      <WelcomeScreen
        initialProfile={null}
        onComplete={(profile) => setStudentProfile(profile)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 font-sans flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        studentName={studentName}
        studentAvatar={studentProfile.avatar}
        onUpdateStudentName={handleUpdateStudentName}
        onOpenTeacherStudio={() => setIsTeacherGateOpen(true)}
        onSwitchStudent={() => setStudentProfile(null)}
        totalStoriesCount={stories.length}
      />

      {/* Library sync warning - only shown if server sync actually fails */}
      {librarySyncError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-3">
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3">
            <span>⚠️ {librarySyncError}</span>
            <button
              onClick={() => setLibrarySyncError(null)}
              className="shrink-0 text-red-400 hover:text-red-700 cursor-pointer"
              aria-label="Sluiten"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {currentView === 'overview' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
          
          {/* Pedagogical Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-3xl p-6 sm:p-10 text-white shadow-lg mb-8 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider mb-3 font-lexend backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Niveaulezen • Stap voor stap groeien</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-lexend leading-tight tracking-tight mb-3">
                Kies een verhaal op jouw niveau! 🚀
              </h1>
              <p className="text-amber-950 text-sm sm:text-base font-medium leading-relaxed">
                Lezen is als sporten voor je hersenen. Kies een tekst die goed bij jou past: niet te makkelijk, niet te moeilijk, maar precies goed!
              </p>
            </div>
            {/* Mascot visual */}
            <div className="hidden lg:block absolute right-8 bottom-0 text-9xl transform translate-y-4 select-none opacity-90">
              🦉
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="space-y-4 mb-8">
            
            {/* Search and Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Level Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedLevelFilter('ALL')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold font-lexend transition-all shrink-0 cursor-pointer ${
                    selectedLevelFilter === 'ALL'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-amber-100 border border-stone-200'
                  }`}
                >
                  Alle Niveaus ({stories.length})
                </button>

                {AVI_LEVEL_LIST.map(lvl => {
                  const count = stories.filter(s => s.level === lvl).length;
                  const isSelected = selectedLevelFilter === lvl;
                  const levelColor = AVI_COLORS[lvl];

                  return (
                    <button
                      key={lvl}
                      onClick={() => setSelectedLevelFilter(lvl)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider font-lexend transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? `${levelColor.badge} shadow-xs ring-2 ring-amber-400`
                          : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      <span>{lvl}</span>
                      {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72 sm:ml-auto">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Zoek titel, code of trefwoord..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>

            </div>

          </div>

          {/* Stories Grid */}
          {filteredStories.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-lg font-bold text-stone-800 font-lexend">Geen teksten gevonden</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Er zijn geen verhalen die overeenkomen met je zoekopdracht of gekozen niveau.
              </p>
              <button
                onClick={() => {
                  setSelectedLevelFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold font-lexend cursor-pointer"
              >
                Toon alle verhalen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.map(story => {
                const latestResult = results.find(r => r.storyId === story.id && r.studentName === studentName);
                return (
                  <StoryCard
                    key={story.id}
                    story={story}
                    latestResult={latestResult}
                    onSelectStory={handleSelectStory}
                  />
                );
              })}
            </div>
          )}

        </main>
      )}

      {currentView === 'reading' && selectedStory && (
        <ReadingView
          story={selectedStory}
          settings={accessibilitySettings}
          onUpdateSettings={handleUpdateAccessibility}
          voices={voices}
          onFinishReading={handleFinishReading}
          onBackToOverview={() => setCurrentView('overview')}
        />
      )}

      {currentView === 'quiz' && selectedStory && (
        <QuizView
          story={selectedStory}
          readingTimeSeconds={readingSession.durationSeconds}
          recordedAudioUrl={readingSession.audioUrl}
          onCompleteQuiz={handleCompleteQuiz}
          onReturnToReading={() => setCurrentView('reading')}
        />
      )}

      {/* Growth Report & Diploma Modal */}
      {activeReportResult && (
        <ReportModal
          result={activeReportResult}
          teacherSettings={teacherSettings}
          onClose={() => setActiveReportResult(null)}
          onSelectNewStory={() => {
            setActiveReportResult(null);
            setCurrentView('overview');
          }}
          onRetryStory={() => {
            setActiveReportResult(null);
            setCurrentView('reading');
          }}
        />
      )}

      {/* Teacher Panel Password Gate */}
      {isTeacherGateOpen && (
        <TeacherPasswordGate
          onSuccess={() => {
            setIsTeacherGateOpen(false);
            setIsTeacherStudioOpen(true);
          }}
          onClose={() => setIsTeacherGateOpen(false)}
        />
      )}

      {/* Teacher Management Studio (Meester Frank) */}
      {isTeacherStudioOpen && (
        <TeacherStudio
          stories={stories}
          results={results}
          teacherSettings={teacherSettings}
          onUpdateTeacherSettings={setTeacherSettings}
          onSaveStory={handleSaveStory}
          onDeleteStory={handleDeleteStory}
          onImportLibrary={handleImportLibrary}
          onClose={() => setIsTeacherStudioOpen(false)}
        />
      )}

      {/* Friendly Reading Mascot */}
      <ReadingBuddy studentName={studentName} />

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-stone-200 bg-white text-center text-xs text-stone-500 font-medium">
        <p>
          NiveauLezer
        </p>
      </footer>

    </div>
  );
}
