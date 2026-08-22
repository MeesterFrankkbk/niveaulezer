export type AviLevel = 
  | 'AVI Start' 
  | 'M3' 
  | 'E3' 
  | 'M4' 
  | 'E4' 
  | 'M5' 
  | 'E5' 
  | 'M6' 
  | 'E6' 
  | 'E7' 
  | 'Plus';

export interface DifficultWord {
  word: string;
  definition: string;
  example?: string;
  emoji?: string;
  syllableSplit?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type: 'comprehension' | 'vocabulary';
}

export interface Story {
  id: string;
  code: string; // e.g. "TK02-01"
  title: string;
  level: AviLevel;
  category: string;
  content: string;
  image?: string;
  readingTimeMinutes: number;
  wordCount: number;
  difficultWords: DifficultWord[];
  questions: Question[];
  author?: string;
  sourceUrl?: string;
  createdDate: string;
  themeColor?: string;
}

export interface StudentResult {
  id: string;
  studentName: string;
  storyId: string;
  storyTitle: string;
  storyCode: string;
  level: AviLevel;
  date: string;
  durationSeconds: number;
  wordsRead: number;
  wpm: number; // Words per minute
  score: number; // Percentage
  correctAnswersCount: number;
  totalQuestions: number;
  answers: Record<string, number>;
  audioBlobUrl?: string;
  hasAudioRecording: boolean;
  positiveFeedback: string;
  growthTips: string[];
  badge: string;
  teacherNotes?: string;
}

export interface AccessibilitySettings {
  fontFamily: 'lexend' | 'dyslexic' | 'comic' | 'atkinson' | 'sans';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  readingRuler: boolean;
  rulerColor: 'yellow' | 'blue' | 'green' | 'peach' | 'pink' | 'gray';
  rulerHeight: number;
  highlightSyllables: boolean;
  audioSpeed: number; // 0.6 to 1.4
  selectedVoiceURI: string;
  highContrast: boolean;
  bgColor: 'cream' | 'white' | 'sepia' | 'mint' | 'sky';
}

export interface TeacherSettings {
  teacherName: string;
  teacherEmail: string;
  schoolName: string;
  className: string;
}
