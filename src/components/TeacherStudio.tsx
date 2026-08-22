import React, { useState, useRef } from 'react';
import { Story, AviLevel, TeacherSettings, StudentResult, DifficultWord, Question } from '../types';
import { calculateAviLevel, AVI_COLORS, stripInlineImages } from '../utils/aviCalculator';
import { 
  Plus, 
  Sparkles, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  BookOpen, 
  Layers, 
  Settings, 
  Users, 
  Link as LinkIcon, 
  Save, 
  X, 
  AlertCircle, 
  Check,
  RefreshCw,
  Search,
  ExternalLink,
  Volume2
} from 'lucide-react';

interface TeacherStudioProps {
  stories: Story[];
  results: StudentResult[];
  teacherSettings: TeacherSettings;
  onUpdateTeacherSettings: (settings: TeacherSettings) => void;
  onSaveStory: (story: Story) => void;
  onDeleteStory: (storyId: string) => void;
  onImportLibrary: (stories: Story[]) => void;
  onClose: () => void;
}

export const TeacherStudio: React.FC<TeacherStudioProps> = ({
  stories,
  results,
  teacherSettings,
  onUpdateTeacherSettings,
  onSaveStory,
  onDeleteStory,
  onImportLibrary,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'generator' | 'editor' | 'results' | 'settings'>('import');
  
  // Import tab state
  const [importUrl, setImportUrl] = useState('');
  const [importRawText, setImportRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // AI Generator state
  const [genLevel, setGenLevel] = useState<AviLevel>('M4');
  const [genTheme, setGenTheme] = useState('Avontuur en vriendschap');
  const [genExtraPrompt, setGenExtraPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Manual Editor state
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorCode, setEditorCode] = useState('');
  const [editorCategory, setEditorCategory] = useState('Avontuur');
  const [editorContent, setEditorContent] = useState('');
  const [editorImage, setEditorImage] = useState('');
  const [editorLevel, setEditorLevel] = useState<AviLevel>('M4');
  const [editorDiffWords, setEditorDiffWords] = useState<DifficultWord[]>([]);
  const [editorQuestions, setEditorQuestions] = useState<Question[]>([]);
  const [newWord, setNewWord] = useState({ word: '', definition: '', example: '', emoji: '📖' });
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [genQuestionsError, setGenQuestionsError] = useState<string | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert an inline image (![beschrijving](url)) at the cursor position in the content textarea
  const handleInsertImageInText = () => {
    const url = window.prompt('Plak hier de link (URL) van de afbeelding:');
    if (!url || !url.trim()) return;
    const alt = window.prompt('Korte beschrijving van de afbeelding (optioneel, voor leerlingen met een screenreader):') || '';

    const snippet = `\n\n![${alt.trim()}](${url.trim()})\n\n`;
    const textarea = contentTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart ?? editorContent.length;
      const end = textarea.selectionEnd ?? editorContent.length;
      const newContent = editorContent.slice(0, start) + snippet + editorContent.slice(end);
      setEditorContent(newContent);
      // Restore focus and cursor position after the inserted snippet
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + snippet.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    } else {
      setEditorContent(prev => prev + snippet);
    }
  };

  // Ask AI to suggest comprehension questions + difficult words for the current text
  const handleGenerateQuestionsForText = async () => {
    if (!editorContent.trim()) {
      setGenQuestionsError('Voeg eerst een leestekst toe voor je vragen laat genereren.');
      return;
    }

    setIsGeneratingQuestions(true);
    setGenQuestionsError(null);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: stripInlineImages(editorContent),
          level: editorLevel,
          existingQuestionCount: editorQuestions.length
        })
      });

      if (!response.ok) {
        throw new Error('Deze functie heeft een AI-server nodig die hier niet beschikbaar is.');
      }

      const data = await response.json();
      if (data.data) {
        const suggested = data.data;
        const newQuestions: Question[] = (suggested.questions || []).map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          type: (q.type === 'vocabulary' ? 'vocabulary' : 'comprehension') as 'comprehension' | 'vocabulary'
        }));
        setEditorQuestions(prev => [...prev, ...newQuestions]);

        const newWords: DifficultWord[] = (suggested.difficultWords || []).map((w: any) => ({
          word: w.word,
          definition: w.definition,
          example: w.example,
          emoji: w.emoji,
          syllableSplit: w.syllableSplit
        }));
        // Avoid adding duplicate words that are already in the list
        setEditorDiffWords(prev => {
          const existingLower = new Set(prev.map(w => w.word.toLowerCase()));
          const filtered = newWords.filter(w => !existingLower.has(w.word.toLowerCase()));
          return [...prev, ...filtered];
        });
      } else {
        throw new Error('Geen bruikbare AI-respons ontvangen.');
      }
    } catch (err: any) {
      setGenQuestionsError(err.message || 'Fout bij het genereren van vragen. Voeg zelf vragen toe hieronder.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Settings tab state
  const [teacherName, setTeacherName] = useState(teacherSettings.teacherName);
  const [teacherEmail, setTeacherEmail] = useState(teacherSettings.teacherEmail);
  const [schoolName, setSchoolName] = useState(teacherSettings.schoolName);
  const [className, setClassName] = useState(teacherSettings.className);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const aviLevels: AviLevel[] = ['AVI Start', 'M3', 'E3', 'M4', 'E4', 'M5', 'E5', 'M6', 'E6', 'E7', 'Plus'];

  // Quick live readability calculation
  const liveMetrics = calculateAviLevel(editorContent);

  // Import Hot Potatoes
  const handleImportHotPotatoes = async () => {
    if (!importRawText.trim() && !importUrl.trim()) {
      setImportError('Voer een URL of de tekst/HTML van de Hot Potatoes oefening in.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      let contentToParse = importRawText;
      let detectedTitle = '';

      if (importUrl.includes('smijneigenleerkrachtta')) {
        // Extract title from URL slug if provided
        const slug = importUrl.split('/').pop() || '';
        detectedTitle = slug.replace(/^tk\d+-\d+-/, '').replace(/-/g, ' ');
      }

      const response = await fetch('/api/parse-hotpotatoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: contentToParse || `Titel: ${detectedTitle}\nLink: ${importUrl}`,
          sourceUrl: importUrl
        })
      });

      if (!response.ok) {
        throw new Error('Fout bij verwerken via AI service.');
      }

      const data = await response.json();
      if (data.data) {
        const parsed = data.data;
        const newStory: Story = {
          id: `story-imported-${Date.now()}`,
          code: parsed.code || `TK0${Math.floor(Math.random() * 9) + 1}-01`,
          title: parsed.title || detectedTitle || 'Geïmporteerde tekst',
          level: (parsed.level as AviLevel) || 'M4',
          category: parsed.category || 'Niveaulezen',
          content: parsed.content || importRawText,
          image: parsed.image || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
          readingTimeMinutes: Math.max(1, Math.round((parsed.content?.split(/\s+/).length || 100) / 75)),
          wordCount: parsed.content?.split(/\s+/).length || 100,
          difficultWords: parsed.difficultWords || [],
          questions: parsed.questions || [],
          sourceUrl: importUrl,
          createdDate: new Date().toISOString().split('T')[0]
        };

        onSaveStory(newStory);
        setImportSuccess(`Tekst "${newStory.title}" (${newStory.level}) succesvol geïmporteerd!`);
        setImportRawText('');
        setImportUrl('');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      // Fallback: create from raw text directly
      const metrics = calculateAviLevel(importRawText);
      const fallbackStory: Story = {
        id: `story-imported-${Date.now()}`,
        code: `TK02-01`,
        title: importUrl.split('/').pop()?.replace(/-/g, ' ') || 'Nieuwe Leesoefening',
        level: metrics.level,
        category: 'Geïmporteerd',
        content: importRawText,
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
        readingTimeMinutes: Math.max(1, Math.round(metrics.wordCount / 75)),
        wordCount: metrics.wordCount,
        difficultWords: [
          { word: 'voorbeeld', definition: 'Iets wat laat zien hoe het moet.', emoji: '📖' }
        ],
        questions: [
          {
            id: 'q1',
            question: 'Waarover gaat deze tekst?',
            options: ['Over het hoofdthema in het verhaal', 'Over een kasteel', 'Over de school', 'Over sport'],
            correctIndex: 0,
            explanation: 'Het juiste antwoord vind je in het begin van de tekst.',
            type: 'comprehension'
          }
        ],
        sourceUrl: importUrl,
        createdDate: new Date().toISOString().split('T')[0]
      };
      onSaveStory(fallbackStory);
      setImportSuccess(`Tekst opgeslagen als niveau ${metrics.level} (basisimport, zonder AI). Pas de moeilijke woorden en vragen zeker nog aan via "Handmatig invoeren".`);
    } finally {
      setIsImporting(false);
    }
  };

  // Generate Story with AI
  const handleGenerateStory = async () => {
    setIsGenerating(true);
    setGenError(null);

    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: genLevel,
          theme: genTheme,
          extraPrompt: genExtraPrompt
        })
      });

      if (!response.ok) {
        throw new Error('Deze functie heeft een AI-server nodig die hier niet beschikbaar is. Voeg zelf een tekst toe via "Handmatig invoeren".');
      }

      const data = await response.json();
      if (data.data) {
        const gen = data.data;
        const newStory: Story = {
          id: `story-ai-${Date.now()}`,
          code: `TK-AI-${Math.floor(Math.random() * 90) + 10}`,
          title: gen.title,
          level: genLevel,
          category: gen.category || genTheme,
          content: gen.content,
          image: `https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80`,
          readingTimeMinutes: Math.max(1, Math.round(gen.content.split(/\s+/).length / 70)),
          wordCount: gen.content.split(/\s+/).length,
          difficultWords: gen.difficultWords || [],
          questions: gen.questions || [],
          createdDate: new Date().toISOString().split('T')[0]
        };

        onSaveStory(newStory);
        // Open in editor for teacher to review
        openInEditor(newStory);
      }
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'Kon verhaal niet genereren met AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const openInEditor = (story?: Story) => {
    if (story) {
      setEditingStory(story);
      setEditorTitle(story.title);
      setEditorCode(story.code);
      setEditorCategory(story.category);
      setEditorContent(story.content);
      setEditorImage(story.image || '');
      setEditorLevel(story.level);
      setEditorDiffWords(story.difficultWords || []);
      setEditorQuestions(story.questions || []);
    } else {
      setEditingStory(null);
      setEditorTitle('');
      setEditorCode(`TK0${Math.floor(Math.random() * 5) + 1}-01`);
      setEditorCategory('Avontuur');
      setEditorContent('');
      setEditorImage('https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80');
      setEditorLevel('M4');
      setEditorDiffWords([]);
      setEditorQuestions([]);
    }
    setActiveTab('editor');
  };

  const handleSaveEditorStory = () => {
    if (!editorTitle.trim() || !editorContent.trim()) {
      alert('Titel en inhoud zijn verplicht.');
      return;
    }

    const storyToSave: Story = {
      id: editingStory?.id || `story-${Date.now()}`,
      code: editorCode.trim() || 'TK01-01',
      title: editorTitle.trim(),
      level: editorLevel,
      category: editorCategory.trim() || 'Algemeen',
      content: editorContent.trim(),
      image: editorImage.trim() || undefined,
      readingTimeMinutes: Math.max(1, Math.round(stripInlineImages(editorContent).split(/\s+/).filter(Boolean).length / 75)),
      wordCount: stripInlineImages(editorContent).split(/\s+/).filter(Boolean).length,
      difficultWords: editorDiffWords,
      questions: editorQuestions,
      createdDate: editingStory?.createdDate || new Date().toISOString().split('T')[0]
    };

    onSaveStory(storyToSave);
    alert('Tekst succesvol opgeslagen in de bibliotheek!');
  };

  const handleAddDifficultWord = () => {
    if (!newWord.word.trim() || !newWord.definition.trim()) return;
    setEditorDiffWords(prev => [...prev, { ...newWord }]);
    setNewWord({ word: '', definition: '', example: '', emoji: '📖' });
  };

  const handleRemoveDifficultWord = (index: number) => {
    setEditorDiffWords(prev => prev.filter((_, i) => i !== index));
  };

  // Manual question form + handlers
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: ''
  });

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim() || newQuestion.options.some(o => !o.trim())) return;
    setEditorQuestions(prev => [...prev, {
      id: `q-${Date.now()}`,
      question: newQuestion.question.trim(),
      options: newQuestion.options.map(o => o.trim()),
      correctIndex: newQuestion.correctIndex,
      explanation: newQuestion.explanation.trim(),
      type: 'comprehension'
    }]);
    setNewQuestion({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
  };

  const handleRemoveQuestion = (id: string) => {
    setEditorQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSaveSettings = () => {
    onUpdateTeacherSettings({
      teacherName,
      teacherEmail,
      schoolName,
      className
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "niveaulezen-verhalen-bibliotheek.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportLibrary(parsed);
            alert(`${parsed.length} teksten succesvol geïmporteerd!`);
          }
        } catch (err) {
          alert('Ongeldig JSON bestand.');
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 py-8">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="p-6 bg-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-lexend">
                Leerkrachten & Beheer Studio
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Nieuwe teksten toevoegen, Hot Potatoes importeren en leerlingen opvolgen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-2 p-3 bg-stone-100 border-b border-stone-200 overflow-x-auto text-xs sm:text-sm font-bold font-lexend shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'import' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-amber-600" />
            Hot Potatoes Importer
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'generator' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            AI Verhalenmaker
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'editor' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Plus className="w-4 h-4 text-amber-600" />
            Teksteditor
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'results' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4 text-amber-600" />
            Leesresultaten ({results.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-600" />
            Instellingen
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-50/40">
          
          {/* TAB 1: HOT POTATOES IMPORTER */}
          {activeTab === 'import' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                <h3 className="text-lg font-bold text-stone-900 font-lexend flex items-center gap-2 mb-2">
                  <LinkIcon className="w-5 h-5 text-amber-600" />
                  Importeer Hot Potatoes Oefeningen
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  Plak een link naar jouw klaswebsite (bijv. van <em>smijneigenleerkrachtta</em>) of plak rechtstreeks de tekst of broncode van een Hot Potatoes oefening. Het systeem haalt de leestekst eruit, berekent het AVI-niveau en zet de meerkeuzevragen klaar!
                </p>

                {importError && (
                  <div className="p-3 mb-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {importError}
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-bold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {importSuccess}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Link naar oefening (Google Sites / Klaswebsite)
                    </label>
                    <input
                      type="url"
                      placeholder="https://sites.google.com/view/smijneigenleerkrachtta/taal/niveaulezen/..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="text-center text-xs font-bold text-stone-400">OF</div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Plak leestekst of Hot Potatoes HTML / broncode
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Plak hier de leestekst, vragen en antwoorden van de oefening..."
                      value={importRawText}
                      onChange={(e) => setImportRawText(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleImportHotPotatoes}
                      disabled={isImporting}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 text-sm font-lexend flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{isImporting ? 'Verwerken met AI...' : 'Verwerk & Importeer Oefening'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preloaded links info */}
              <div className="bg-amber-50/60 p-5 rounded-3xl border border-amber-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 font-lexend">
                  Reeds geïnstalleerde reeksen in deze app:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK02-01: De plank in het tuinhuis (M4)</div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK02-10: De schreeuw van de slang (E4)</div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK03-01: De rookwolk boven de haven (M5)</div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK03-10: Koning Kwibus (E5)</div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK04-01: De sportdag die bijna misliep (M6)</div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">✅ TK04-03: Het buitengewone recept (E6)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI STORY GENERATOR */}
          {activeTab === 'generator' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                <h3 className="text-lg font-bold text-stone-900 font-lexend flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Genereer een Nieuw Verhaal op Maat
                </h3>
                <p className="text-xs text-stone-600 mb-6">
                  Selecteer het gewenste AVI-niveau en een thema. De AI maakt een compleet verhaaltje met 3-4 moeilijke woorden (met uitleg) en meerkeuzevragen!
                </p>

                {genError && (
                  <div className="p-3 mb-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {genError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                      Kies het AVI-leesniveau
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {aviLevels.map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setGenLevel(lvl)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-lexend transition-all cursor-pointer ${
                            genLevel === lvl
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Thema
                    </label>
                    <input
                      type="text"
                      value={genTheme}
                      onChange={(e) => setGenTheme(e.target.value)}
                      placeholder="bijv. Dieren in het bos, Ruimtevaart, Ridders, Schoolreisje..."
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Extra wensen of specifieke woorden (optioneel)
                    </label>
                    <textarea
                      rows={2}
                      value={genExtraPrompt}
                      onChange={(e) => setGenExtraPrompt(e.target.value)}
                      placeholder="bijv. Laat de hoofdrolspeler Milan heten en gebruik het woord 'telescoop'..."
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateStory}
                      disabled={isGenerating}
                      className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 text-sm font-lexend flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{isGenerating ? 'Verhaal wordt geschreven...' : 'Schrijf verhaal met AI'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL STORY EDITOR */}
          {activeTab === 'editor' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
                  <h3 className="text-lg font-bold text-stone-900 font-lexend flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-amber-600" />
                    {editingStory ? `Bewerk: ${editingStory.title}` : 'Nieuwe Leestekst Toevoegen'}
                  </h3>

                  {/* Live Readability Metric */}
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl">
                    <span className="text-xs text-amber-800 font-medium">Berekend niveau:</span>
                    <span className="px-2 py-0.5 bg-amber-500 text-white font-black rounded-lg text-xs font-lexend">
                      {liveMetrics.level}
                    </span>
                  </div>
                </div>

                {/* Existing story picker: load any story from the library into the editor */}
                <div className="mb-6 pb-6 border-b border-stone-100">
                  <label className="block text-xs font-bold text-stone-600 mb-2 font-lexend">
                    Bestaande tekst bewerken (bv. geïmporteerd of AI-gegenereerd)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingStory?.id || ''}
                      onChange={(e) => {
                        const chosen = stories.find(s => s.id === e.target.value);
                        if (chosen) openInEditor(chosen);
                      }}
                      className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">— Kies een tekst uit je bibliotheek —</option>
                      {[...stories]
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.level}{s.code ? ` · ${s.code}` : ''})
                          </option>
                        ))}
                    </select>
                    {editingStory && (
                      <button
                        type="button"
                        onClick={() => openInEditor()}
                        className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                      >
                        + Nieuwe tekst starten
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Code / Kenmerk
                    </label>
                    <input
                      type="text"
                      value={editorCode}
                      onChange={(e) => setEditorCode(e.target.value)}
                      placeholder="TK02-01"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Titel van de tekst
                    </label>
                    <input
                      type="text"
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      placeholder="bijv. De plank in het tuinhuis"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      AVI Niveau
                    </label>
                    <select
                      value={editorLevel}
                      onChange={(e) => setEditorLevel(e.target.value as AviLevel)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold"
                    >
                      {aviLevels.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Afbeelding URL (optioneel)
                    </label>
                    <input
                      type="url"
                      value={editorImage}
                      onChange={(e) => setEditorImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Leestekst ({liveMetrics.wordCount} woorden)</span>
                    <span className="text-[11px] text-stone-500 font-normal">
                      Gem. zinslengte: {liveMetrics.avgSentenceLength} woorden
                    </span>
                  </label>
                  <textarea
                    ref={contentTextareaRef}
                    rows={8}
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Typ hier de leestekst..."
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm leading-relaxed outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleInsertImageInText}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      🖼️ Afbeelding invoegen op cursorpositie
                    </button>
                    <span className="text-[11px] text-stone-400">Plaatst een nieuwe alinea met een afbeelding tussen de tekst.</span>
                  </div>
                </div>

                {/* Difficult words manager */}
                <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3 flex items-center gap-1.5">
                    <span>Moeilijke Woorden & Popups ({editorDiffWords.length})</span>
                  </h4>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {editorDiffWords.map((dw, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-300 text-xs shadow-2xs">
                        <span className="text-sm">{dw.emoji || '📖'}</span>
                        <span className="font-bold text-amber-950">{dw.word}</span>
                        <span className="text-stone-500 truncate max-w-[120px]">({dw.definition})</span>
                        <button
                          onClick={() => handleRemoveDifficultWord(idx)}
                          className="text-stone-400 hover:text-red-600 ml-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Woord (bijv. tuinhuis)"
                      value={newWord.word}
                      onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                      className="p-2 bg-white border border-stone-200 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Kindvriendelijke uitleg..."
                      value={newWord.definition}
                      onChange={(e) => setNewWord({ ...newWord, definition: e.target.value })}
                      className="p-2 bg-white border border-stone-200 rounded-xl text-xs sm:col-span-2"
                    />
                    <button
                      onClick={handleAddDifficultWord}
                      className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer"
                    >
                      + Woord toevoegen
                    </button>
                  </div>
                </div>

                {/* Questions manager */}
                <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <span>Begripsvragen ({editorQuestions.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleGenerateQuestionsForText}
                      disabled={isGeneratingQuestions}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Bezig met genereren...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Genereer vragen met AI
                        </>
                      )}
                    </button>
                  </div>

                  {genQuestionsError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                      {genQuestionsError}
                    </p>
                  )}

                  <p className="text-[11px] text-stone-500 mb-3">
                    De AI stelt vragen en antwoorden voor op basis van de leestekst hierboven - controleer en pas ze gerust aan voor je opslaat.
                  </p>

                  <div className="space-y-3 mb-4">
                    {editorQuestions.map((q, qIdx) => (
                      <div key={q.id} className="bg-white p-3 rounded-xl border border-stone-200">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-stone-900">{qIdx + 1}. {q.question}</p>
                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-stone-400 hover:text-red-600 cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                                oIdx === q.correctIndex
                                  ? 'bg-green-50 border-green-300 text-green-800 font-bold'
                                  : 'bg-stone-50 border-stone-200 text-stone-600'
                              }`}
                            >
                              {oIdx === q.correctIndex ? '✓ ' : ''}{opt}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-[11px] text-stone-500 mt-2 italic">💡 {q.explanation}</p>
                        )}
                      </div>
                    ))}
                    {editorQuestions.length === 0 && (
                      <p className="text-xs text-stone-400 italic">Nog geen vragen. Gebruik de AI-knop hierboven, of voeg er hieronder zelf een toe.</p>
                    )}
                  </div>

                  {/* Manual question add form */}
                  <div className="bg-white p-3 rounded-xl border border-dashed border-stone-300 space-y-2">
                    <input
                      type="text"
                      placeholder="Nieuwe vraag..."
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {newQuestion.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={newQuestion.correctIndex === oIdx}
                            onChange={() => setNewQuestion({ ...newQuestion, correctIndex: oIdx })}
                            title="Markeer als juist antwoord"
                          />
                          <input
                            type="text"
                            placeholder={`Optie ${oIdx + 1}${oIdx === newQuestion.correctIndex ? ' (juist)' : ''}`}
                            value={opt}
                            onChange={(e) => {
                              const opts = [...newQuestion.options];
                              opts[oIdx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: opts });
                            }}
                            className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Uitleg/feedback bij het juiste antwoord (optioneel)"
                      value={newQuestion.explanation}
                      onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    />
                    <button
                      onClick={handleAddQuestion}
                      className="px-3 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      + Vraag toevoegen
                    </button>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                  {editingStory && (
                    <button
                      onClick={() => {
                        if (confirm('Weet je zeker dat je deze tekst wilt verwijderen?')) {
                          onDeleteStory(editingStory.id);
                          openInEditor();
                        }
                      }}
                      className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Verwijder tekst
                    </button>
                  )}

                  <button
                    onClick={handleSaveEditorStory}
                    className="ml-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-md transition-all active:scale-95 text-sm font-lexend flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Tekst opslaan in bibliotheek</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: STUDENT RESULTS LOG */}
          {activeTab === 'results' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-stone-900 font-lexend">
                  Overzicht Leesresultaten van de Klas
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  {results.length} voltooide leesbeurten
                </span>
              </div>

              {results.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl text-center border border-stone-200">
                  <div className="text-4xl mb-2">📖</div>
                  <h4 className="text-base font-bold text-stone-800 font-lexend">Nog geen resultaten geregistreerd</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Zodra leerlingen een tekst lezen en de vragen beantwoorden, verschijnen hun WPM, score en opnames hier.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((res) => (
                    <div key={res.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm font-lexend">
                            {res.studentName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
                            {res.level}
                          </span>
                          <span className="text-xs text-stone-400 font-mono">
                            {res.date}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-1">
                          {res.storyTitle} ({res.storyCode})
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono font-bold">
                        <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          {res.score}% Begrip
                        </div>
                        <div className="text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                          {res.wpm} WPM
                        </div>
                        {res.audioBlobUrl && (
                          <audio controls src={res.audioBlobUrl} className="h-8 max-w-[140px]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                <h3 className="text-lg font-bold text-stone-900 font-lexend mb-4">
                  Leerkracht & School Gegevens
                </h3>

                {settingsSaved && (
                  <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Instellingen opgeslagen!
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Naam leerkracht
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="bijv. Meester Frank"
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      E-mailadres voor leesrapporten
                    </label>
                    <input
                      type="email"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="meesterfrank.kbk@gmail.com"
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-mono"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Hier naartoe kunnen leerlingen met 1 klik hun diploma en resultaten mailen.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        School
                      </label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="bijv. Vrije Basisschool"
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Klas
                      </label>
                      <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="bijv. 4de leerjaar"
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveSettings}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-sm text-sm font-lexend cursor-pointer"
                    >
                      Instellingen Opslaan
                    </button>
                  </div>
                </div>
              </div>

              {/* Library Backup & JSON Export */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200">
                <h4 className="text-sm font-bold text-stone-900 font-lexend mb-2">
                  Bibliotheek Backup & Delen (JSON)
                </h4>
                <p className="text-xs text-stone-600 mb-4">
                  Exporteer alle {stories.length} verhalen naar een JSON-bestand om te delen met collega-leerkrachten of bewaar een backup.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportJSON}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON Bibliotheek ({stories.length} teksten)
                  </button>

                  <label className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Importeer JSON bestand</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSONFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
