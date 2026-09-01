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

  // Bulk import (multiple Hot Potatoes files at once)
  interface BulkImportItem {
    id: string;
    fileName: string;
    rawContent: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    story?: Story;
    usedFallback?: boolean;
    errorMsg?: string;
    selected: boolean;
  }
  const [bulkItems, setBulkItems] = useState<BulkImportItem[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

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
  interface BackupSummary { index: number; timestamp: string; count: number; }
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleClearAllStories = () => {
    const confirmed = window.confirm(
      `Dit verwijdert al je ${stories.length} teksten in één keer. Er wordt automatisch nog een back-up van de huidige staat bewaard, maar doe dit alleen als je zeker bent. Doorgaan?`
    );
    if (!confirmed) return;
    onImportLibrary([]);
    setImportSuccess('Bibliotheek geleegd. Je kan nu opnieuw importeren.');
  };

  const handleLoadBackups = async () => {
    setIsLoadingBackups(true);
    setBackupError(null);
    try {
      const response = await fetch('/api/list-backups');
      if (!response.ok) throw new Error('Kon de back-ups niet ophalen.');
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (err: any) {
      setBackupError(err.message || 'Kon de back-ups niet ophalen.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async (index: number) => {
    const confirmed = window.confirm(
      'Dit vervangt je huidige volledige bibliotheek door deze oudere versie. Weet je het zeker?'
    );
    if (!confirmed) return;

    setIsRestoringBackup(true);
    setBackupError(null);
    try {
      const response = await fetch('/api/restore-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      if (!response.ok) throw new Error('Herstellen is mislukt.');
      const data = await response.json();
      if (Array.isArray(data.stories)) {
        onImportLibrary(data.stories);
        setImportSuccess(`Bibliotheek hersteld naar de versie van ${new Date(backups[index]?.timestamp).toLocaleString('nl-BE')}.`);
      }
    } catch (err: any) {
      setBackupError(err.message || 'Herstellen is mislukt.');
    } finally {
      setIsRestoringBackup(false);
    }
  };
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [genQuestionsError, setGenQuestionsError] = useState<string | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const coverImageFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Uploads a File to the upload-image function and returns the resulting URL
  const uploadImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, filename: file.name, contentType: file.type })
          });
          if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.error || 'Uploaden mislukt.');
          }
          const data = await response.json();
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
      reader.readAsDataURL(file);
    });
  };

  // Insert an inline image (uploaded via file picker) at the cursor position in the content textarea
  const handleInsertImageInText = () => {
    imageFileInputRef.current?.click();
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so selecting the same file again still fires onChange
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const url = await uploadImageFile(file);
      const alt = window.prompt('Korte beschrijving van de afbeelding (optioneel, voor leerlingen met een screenreader):') || '';
      const snippet = `\n\n![${alt.trim()}](${url})\n\n`;
      const textarea = contentTextareaRef.current;

      if (textarea) {
        const start = textarea.selectionStart ?? editorContent.length;
        const end = textarea.selectionEnd ?? editorContent.length;
        const newContent = editorContent.slice(0, start) + snippet + editorContent.slice(end);
        setEditorContent(newContent);
        requestAnimationFrame(() => {
          textarea.focus();
          const cursorPos = start + snippet.length;
          textarea.setSelectionRange(cursorPos, cursorPos);
        });
      } else {
        setEditorContent(prev => prev + snippet);
      }
    } catch (err: any) {
      setImageUploadError(err.message || 'Uploaden van de afbeelding is mislukt.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCoverImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const url = await uploadImageFile(file);
      setEditorImage(url);
    } catch (err: any) {
      setImageUploadError(err.message || 'Uploaden van de afbeelding is mislukt.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Ask AI to suggest comprehension questions + difficult words for the current text
  const [aiQuestionCount, setAiQuestionCount] = useState(5);

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
          existingQuestionCount: editorQuestions.length,
          questionCount: aiQuestionCount
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || 'Deze functie heeft een AI-server nodig die hier niet beschikbaar is.');
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

  // Bulk import: read selected files into the queue
  const handleBulkFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = '';
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawContent = String(reader.result || '');
        setBulkItems(prev => [...prev, {
          id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          rawContent,
          status: 'pending',
          selected: true
        }]);
      };
      reader.readAsText(file);
    });
  };

  const handleRemoveBulkItem = (id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleBulkItemSelected = (id: string) => {
    setBulkItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  // Process every pending item in the bulk queue, one at a time (sequential -
  // safer for the AI service than firing them all at once)
  const handleProcessBulkImport = async () => {
    setIsBulkProcessing(true);

    // Snapshot the current pending items to process, in order
    const pendingIds = bulkItems.filter(i => i.status === 'pending').map(i => i.id);

    for (const id of pendingIds) {
      setBulkItems(prev => prev.map(item => item.id === id ? { ...item, status: 'processing' } : item));

      const current = bulkItems.find(i => i.id === id);
      const rawContent = current?.rawContent || '';
      const fileName = current?.fileName || 'tekst';

      try {
        const response = await fetch('/api/parse-hotpotatoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawContent, sourceUrl: fileName })
        });

        if (!response.ok) throw new Error('AI-service niet beschikbaar.');

        const data = await response.json();
        if (!data.data) throw new Error('Geen bruikbare AI-respons.');

        const parsed = data.data;
        const newStory: Story = {
          id: `story-imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          code: parsed.code || `TK0${Math.floor(Math.random() * 9) + 1}-01`,
          title: parsed.title || fileName.replace(/\.(htm|html|txt)$/i, ''),
          level: (parsed.level as AviLevel) || 'M4',
          category: parsed.category || 'Niveaulezen',
          content: parsed.content || rawContent,
          image: parsed.image || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
          readingTimeMinutes: Math.max(1, Math.round((parsed.content?.split(/\s+/).length || 100) / 75)),
          wordCount: parsed.content?.split(/\s+/).length || 100,
          difficultWords: parsed.difficultWords || [],
          questions: parsed.questions || [],
          sourceUrl: fileName,
          createdDate: new Date().toISOString().split('T')[0]
        };

        setBulkItems(prev => prev.map(item => item.id === id ? { ...item, status: 'done', story: newStory } : item));
      } catch (err: any) {
        // Fallback: build a basic story from the raw text so nothing is lost,
        // same approach as the single-file import.
        const metrics = calculateAviLevel(rawContent);
        const fallbackStory: Story = {
          id: `story-imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          code: `TK02-01`,
          title: fileName.replace(/\.(htm|html|txt)$/i, '').replace(/-/g, ' '),
          level: metrics.level,
          category: 'Geïmporteerd',
          content: rawContent,
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
          sourceUrl: fileName,
          createdDate: new Date().toISOString().split('T')[0]
        };

        setBulkItems(prev => prev.map(item => item.id === id
          ? { ...item, status: 'done', story: fallbackStory, usedFallback: true, errorMsg: err.message }
          : item
        ));
      }
    }

    setIsBulkProcessing(false);
  };

  const handleSaveAllBulkItems = () => {
    const toSave = bulkItems.filter(i => i.status === 'done' && i.selected && i.story);
    toSave.forEach(item => {
      if (item.story) onSaveStory(item.story);
    });
    setBulkItems(prev => prev.filter(item => !(item.status === 'done' && item.selected)));
    setImportSuccess(`${toSave.length} teksten opgeslagen in de bibliotheek!`);
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
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || 'Deze functie heeft een AI-server nodig die hier niet beschikbaar is. Voeg zelf een tekst toe via "Handmatig invoeren".');
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

  // Bulk-add difficult words: one per line, format "woord: uitleg" with
  // optional " | voorbeeldzin | emoji" extras.
  const [bulkWordsText, setBulkWordsText] = useState('');
  const [bulkWordsMessage, setBulkWordsMessage] = useState<string | null>(null);

  const handleBulkAddWords = () => {
    const lines = bulkWordsText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: DifficultWord[] = [];
    let skipped = 0;

    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      const first = parts[0];
      const colonIdx = first.indexOf(':');
      if (colonIdx === -1) { skipped++; return; }

      const word = first.slice(0, colonIdx).trim();
      const definition = first.slice(colonIdx + 1).trim();
      if (!word || !definition) { skipped++; return; }

      parsed.push({
        word,
        definition,
        example: parts[1] || undefined,
        emoji: parts[2] || '📖',
        syllableSplit: parts[3] || undefined
      });
    });

    if (parsed.length === 0) {
      setBulkWordsMessage('Geen geldige regels herkend. Gebruik het formaat "woord: uitleg" per regel.');
      return;
    }

    setEditorDiffWords(prev => {
      const existingLower = new Set(prev.map(w => w.word.toLowerCase()));
      const filtered = parsed.filter(w => !existingLower.has(w.word.toLowerCase()));
      return [...prev, ...filtered];
    });

    const addedCount = parsed.length;
    setBulkWordsMessage(
      `${addedCount} woord(en) toegevoegd.${skipped > 0 ? ` ${skipped} regel(s) overgeslagen (verkeerd formaat).` : ''}`
    );
    setBulkWordsText('');
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

  // Bulk-add manual questions, pasted as text blocks separated by a blank line:
  //   Vraag: <question text>
  //   A) optie
  //   *B) juiste optie (marker "*" voor het juiste antwoord)
  //   C) optie
  //   D) optie
  //   Uitleg: <optional explanation>
  const [bulkQuestionsText, setBulkQuestionsText] = useState('');
  const [bulkQuestionsMessage, setBulkQuestionsMessage] = useState<string | null>(null);

  const handleBulkAddQuestions = () => {
    const blocks = bulkQuestionsText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const parsed: Question[] = [];
    let skipped = 0;

    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      let questionText = '';
      const options: string[] = [];
      let correctIndex = -1;
      let explanation = '';

      lines.forEach(line => {
        const optionMatch = line.match(/^\*?\s*[A-Da-d][\).]\s*(.+)$/);
        if (/^vraag\s*:/i.test(line)) {
          questionText = line.slice(line.indexOf(':') + 1).trim();
        } else if (/^uitleg\s*:/i.test(line)) {
          explanation = line.slice(line.indexOf(':') + 1).trim();
        } else if (optionMatch) {
          const isCorrect = line.trim().startsWith('*');
          options.push(optionMatch[1].trim());
          if (isCorrect) correctIndex = options.length - 1;
        } else if (!questionText) {
          questionText = line;
        }
      });

      if (!questionText || options.length < 2 || correctIndex === -1) {
        skipped++;
        return;
      }

      parsed.push({
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: questionText,
        options,
        correctIndex,
        explanation: explanation || 'Controleer het antwoord in de tekst.',
        type: 'comprehension'
      });
    });

    if (parsed.length === 0) {
      setBulkQuestionsMessage('Geen geldige vragen herkend. Controleer het formaat hieronder.');
      return;
    }

    setEditorQuestions(prev => [...prev, ...parsed]);
    setBulkQuestionsMessage(
      `${parsed.length} vra(a)g(en) toegevoegd.${skipped > 0 ? ` ${skipped} blok(ken) overgeslagen (verkeerd formaat of geen * bij het juiste antwoord).` : ''}`
    );
    setBulkQuestionsText('');
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
    e.target.value = '';
  };

  // Merge-import: adds only stories from the JSON file that aren't already
  // present (matched by id), instead of replacing the whole library. Used to
  // combine libraries from two devices that both gained unique content.
  const handleMergeImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const existingIds = new Set(stories.map(s => s.id));
            const newOnes: Story[] = parsed.filter((s: Story) => s && s.id && !existingIds.has(s.id));
            newOnes.forEach(s => onSaveStory(s));
            alert(`${newOnes.length} nieuwe tekst(en) toegevoegd (${parsed.length - newOnes.length} bestonden al en zijn overgeslagen). Je huidige teksten zijn niet aangeraakt.`);
          }
        } catch (err) {
          alert('Ongeldig JSON bestand.');
        }
      };
    }
    e.target.value = '';
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

              {/* Bulk import: multiple files at once */}
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                <h3 className="text-lg font-bold text-stone-900 font-lexend flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-amber-600" />
                  Bulk-import: meerdere teksten tegelijk
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  Kies meerdere .htm/.html/.txt bestanden tegelijk (bv. al je resterende Hot Potatoes-oefeningen). De AI verwerkt ze één voor één; je krijgt daarna een overzicht om te controleren voor je alles bewaart.
                </p>

                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  + Bestanden kiezen
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  multiple
                  accept=".htm,.html,.txt"
                  onChange={handleBulkFilesSelected}
                  className="hidden"
                />

                {bulkItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {bulkItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
                        {item.status === 'done' && (
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleBulkItemSelected(item.id)}
                            className="w-4 h-4 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {item.status === 'done' && item.story ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-stone-900 truncate">{item.story.title}</span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800">{item.story.level}</span>
                              {item.usedFallback && (
                                <span className="text-[10px] text-stone-500 italic">basisimport, controleer vragen</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-600 truncate block">{item.fileName}</span>
                          )}
                        </div>
                        <div className="shrink-0 text-xs">
                          {item.status === 'pending' && <span className="text-stone-400">Wacht...</span>}
                          {item.status === 'processing' && (
                            <span className="text-amber-600 flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Bezig...
                            </span>
                          )}
                          {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        </div>
                        <button
                          onClick={() => handleRemoveBulkItem(item.id)}
                          className="text-stone-400 hover:text-red-600 cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {bulkItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={handleProcessBulkImport}
                      disabled={isBulkProcessing || !bulkItems.some(i => i.status === 'pending')}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      {isBulkProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isBulkProcessing ? 'Bezig met verwerken...' : 'Verwerk alles met AI'}
                    </button>
                    <button
                      onClick={handleSaveAllBulkItems}
                      disabled={!bulkItems.some(i => i.status === 'done' && i.selected)}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Sla geselecteerde teksten op in bibliotheek
                    </button>
                  </div>
                )}
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
                      Omslagfoto (optioneel)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={editorImage}
                        onChange={(e) => setEditorImage(e.target.value)}
                        placeholder="https:// (of upload hiernaast)"
                        className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => coverImageFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-700 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                      >
                        📤 Upload
                      </button>
                      <input
                        ref={coverImageFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageFileSelected}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {imageUploadError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
                    {imageUploadError}
                  </p>
                )}

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
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 disabled:opacity-60 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {isUploadingImage ? '⏳ Bezig met uploaden...' : '🖼️ Afbeelding uploaden op cursorpositie'}
                    </button>
                    <span className="text-[11px] text-stone-400">Plaatst een nieuwe alinea met een afbeelding tussen de tekst.</span>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelected}
                      className="hidden"
                    />
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

                  {/* Bulk add difficult words */}
                  <details className="mt-4 group">
                    <summary className="text-xs font-bold text-amber-800 cursor-pointer select-none">
                      📋 Meerdere woorden tegelijk plakken
                    </summary>
                    <div className="mt-3 bg-white p-3 rounded-xl border border-dashed border-stone-300">
                      <p className="text-[11px] text-stone-500 mb-2">
                        Eén woord per regel, in dit formaat: <code className="bg-stone-100 px-1 py-0.5 rounded">woord: uitleg</code>.
                        Optioneel extra: <code className="bg-stone-100 px-1 py-0.5 rounded">woord: uitleg | voorbeeldzin | emoji</code>
                      </p>
                      <textarea
                        rows={5}
                        value={bulkWordsText}
                        onChange={(e) => setBulkWordsText(e.target.value)}
                        placeholder={'tuinhuis: een klein gebouwtje in de tuin\nverdwaasd: erg in de war, alsof je niet meer weet wat er gebeurt | Hij keek verdwaasd om zich heen. | 😵'}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleBulkAddWords}
                          className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Alles toevoegen
                        </button>
                        {bulkWordsMessage && (
                          <span className="text-[11px] text-stone-500">{bulkWordsMessage}</span>
                        )}
                      </div>
                    </div>
                  </details>
                </div>

                {/* Questions manager */}
                <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <span>Begripsvragen ({editorQuestions.length})</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-stone-500 font-bold">
                        Aantal:
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={aiQuestionCount}
                          onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
                          className="w-14 p-1.5 bg-white border border-stone-200 rounded-lg text-xs text-center"
                        />
                      </label>
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

                  {/* Bulk add questions */}
                  <details className="mt-4 group">
                    <summary className="text-xs font-bold text-amber-800 cursor-pointer select-none">
                      📋 Meerdere eigen vragen tegelijk plakken
                    </summary>
                    <div className="mt-3 bg-white p-3 rounded-xl border border-dashed border-stone-300">
                      <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                        Eén vraag per blok, gescheiden door een lege regel. Zet een <code className="bg-stone-100 px-1 py-0.5 rounded">*</code> vóór het juiste antwoord. "Uitleg:" is optioneel.
                      </p>
                      <textarea
                        rows={8}
                        value={bulkQuestionsText}
                        onChange={(e) => setBulkQuestionsText(e.target.value)}
                        placeholder={'Vraag: Waar verstopte de knuffelbeer zich?\nA) Onder het bed\n*B) In de kast\nC) In de tuin\nD) Op zolder\nUitleg: In de tekst staat dat hij in de kast lag.\n\nVraag: Hoe voelde het meisje zich toen ze de beer vond?\nA) Boos\n*B) Blij\nC) Bang\nD) Verdrietig'}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleBulkAddQuestions}
                          className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Alles toevoegen
                        </button>
                        {bulkQuestionsMessage && (
                          <span className="text-[11px] text-stone-500">{bulkQuestionsMessage}</span>
                        )}
                      </div>
                    </div>
                  </details>
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
              <div className="bg-white p-6 rounded-3xl border-2 border-amber-200">
                <h4 className="text-sm font-bold text-stone-900 font-lexend mb-2 flex items-center gap-1.5">
                  💾 Bibliotheek Backup & Delen (JSON)
                </h4>
                <p className="text-xs text-stone-600 mb-4">
                  Je bibliotheek wordt automatisch bewaard op de server, maar een eigen back-up blijft de veiligste gewoonte. Download regelmatig - zeker na een grote import - een kopie van alle {stories.length} teksten. Handig ook om te delen met collega-leerkrachten.
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
                    <span>Importeer JSON bestand (vervangt alles)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSONFile}
                      className="hidden"
                    />
                  </label>

                  <label className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Voeg toe uit JSON (samenvoegen)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleMergeImportJSONFile}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleClearAllStories}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ml-auto"
                  >
                    <X className="w-4 h-4" />
                    Verwijder alle teksten
                  </button>
                </div>
              </div>

              {/* Automatic server-side backups */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 mt-6">
                <h4 className="text-sm font-bold text-stone-900 font-lexend mb-2 flex items-center gap-1.5">
                  🕒 Automatische back-ups
                </h4>
                <p className="text-xs text-stone-600 mb-4">
                  Bij elke opslag bewaart de server automatisch een tijdgestempelde momentopname (tot de laatste 15). Mocht er ooit iets misgaan, kan je hier terug naar een vorige versie.
                </p>

                <button
                  onClick={handleLoadBackups}
                  disabled={isLoadingBackups}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  {isLoadingBackups ? 'Laden...' : 'Toon beschikbare back-ups'}
                </button>

                {backupError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">
                    {backupError}
                  </p>
                )}

                {backups.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {backups.map(b => (
                      <div key={b.index} className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
                        <div className="text-xs text-stone-700">
                          <span className="font-bold">{new Date(b.timestamp).toLocaleString('nl-BE')}</span>
                          <span className="text-stone-400"> — {b.count} teksten</span>
                        </div>
                        <button
                          onClick={() => handleRestoreBackup(b.index)}
                          disabled={isRestoringBackup}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-[11px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Herstel deze versie
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
