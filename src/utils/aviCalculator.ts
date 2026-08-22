import { AviLevel } from '../types';

export interface ReadabilityMetrics {
  level: AviLevel;
  confidence: number;
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  avgWordLength: number;
  avgSentenceLength: number;
  complexWordsPercentage: number;
  readabilityScore: number;
  explanation: string;
}

/**
 * Syllable count using the exact same simple vowel-group method as the
 * AVI-analysetool (avi-analyse-tool.netlify.app), for consistent results
 * between the two tools.
 */
/**
 * Removes inline image markdown (![beschrijving](url)) from story text,
 * used before readability calculations, word counts, or text-to-speech,
 * so the syntax itself is never counted or read aloud.
 */
export function stripInlineImages(text: string): string {
  return text
    .split('\n\n')
    .filter(p => !/^!\[.*?\]\(\S+\)$/.test(p.trim()))
    .join('\n\n');
}

export function countDutchSyllables(word: string): number {
  const klinkerGroepen = word.toLowerCase().match(/[aeiouyàáâäèéêëìíîïòóôöùúûü]+/g);
  return Math.max(1, klinkerGroepen ? klinkerGroepen.length : 1);
}

/**
 * Breaks a Dutch word into readable syllables for beginners
 */
export function splitDutchSyllables(word: string): string {
  const clean = word.trim();
  if (clean.length <= 4) return clean;

  // Common Dutch prefixes and suffixes
  return clean
    .replace(/(be|ge|ver|ont|her)(?=[a-z]{3,})/gi, '$1·')
    .replace(/(heid|ing|lijk|baar|loos|vol|ster|end|erig|achtig)(?=\b|[.,!?])/gi, '·$1')
    .replace(/([aeiouyà-ÿ]{1,2})([bcdfghjklmnpqrstvwxz]{2})([aeiouyà-ÿ])/gi, '$1$2·$3')
    .replace(/([aeiouyà-ÿ]{1,2})([bcdfghjklmnpqrstvwxz])([aeiouyà-ÿ])/gi, '$1·$2$3')
    .replace(/··+/g, '·');
}

/**
 * Evaluates the Dutch AVI Reading Level for a given text using the
 * Leesindex A (formule van Brouwer): 195 - 2*(gem. zinslengte) - 66*(gem. lettergrepen/woord).
 * This mirrors the AVI-analysetool exactly (same formula, same syllable counting,
 * same reference table for oud niveau 5-9) so both tools agree.
 *
 * Below oud niveau 5 (score > 99, roughly AVI Start t.e.m. M5) and above oud
 * niveau 9 (score < 74, AVI Plus) the source tool has no validated reference
 * values either - those bands here are a reasonable extrapolation of the same
 * ~5-punten-per-niveau pattern, not an independently validated scale.
 */
export function calculateAviLevel(text: string): ReadabilityMetrics {
  const cleanText = stripInlineImages(text).trim();
  if (!cleanText) {
    return {
      level: 'AVI Start',
      confidence: 100,
      wordCount: 0,
      sentenceCount: 0,
      characterCount: 0,
      avgWordLength: 0,
      avgSentenceLength: 0,
      complexWordsPercentage: 0,
      readabilityScore: 0,
      explanation: 'Geen tekst om te analyseren.'
    };
  }

  // Sentences and (raw, unstripped) words - same splitting as the AVI-analysetool
  const zinnen = cleanText.split(/[.!?]+/).map(z => z.trim()).filter(Boolean);
  const sentenceCount = Math.max(1, zinnen.length);
  const rawWoorden = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, rawWoorden.length);

  const avgSentenceLength = +(wordCount / sentenceCount).toFixed(1);

  // Syllables per word, using the cleaned word (letters + apostrophe/hyphen only)
  const cleanedWords = rawWoorden.map(w => w.replace(/[^\wàáâäèéêëìíîïòóôöùúûü'-]/gi, ''));
  const lettergrepenTotaal = cleanedWords.reduce((som, w) => som + countDutchSyllables(w), 0);
  const avgSyllablesPerWord = lettergrepenTotaal / wordCount;

  const characterCount = cleanedWords.reduce((acc, w) => acc + w.length, 0);
  const avgWordLength = +(characterCount / wordCount).toFixed(1);

  let complexWordCount = 0;
  cleanedWords.forEach(w => {
    if (w.length >= 8 || countDutchSyllables(w) >= 3) complexWordCount++;
  });
  const complexWordsPercentage = +((complexWordCount / wordCount) * 100).toFixed(1);

  // Leesindex A (formule van Brouwer) - identiek aan de AVI-analysetool
  const leesindexA = 195 - 2 * avgSentenceLength - 66 * avgSyllablesPerWord;

  let level: AviLevel;
  let explanation: string;

  if (leesindexA < 76) {
    level = 'Plus';
    explanation = 'Hoog niveau met veeleisende woordenschat en complexe tekstopbouw (Leesindex A < 76).';
  } else if (leesindexA < 84) {
    level = 'E7';
    explanation = 'Complexe teksten voor vlotte lezers met vaktaal en gelaagde thema\'s (komt overeen met oud AVI niveau 8-9).';
  } else if (leesindexA < 87) {
    level = 'E7';
    explanation = 'Gevorderde tekst, vergelijkbaar met het oude AVI niveau 7 (bovenkant).';
  } else if (leesindexA < 89) {
    level = 'E6';
    explanation = 'Gevorderde teksten met moeilijke termen en uitdagende grammaticale structuren (oud AVI niveau 7).';
  } else if (leesindexA < 94) {
    level = 'M6';
    explanation = 'Rijke woordenschat met langere zinnen en abstracte begrippen (oud AVI niveau 6).';
  } else if (leesindexA < 97) {
    level = 'E5';
    explanation = 'Gevarieerde zinsbouw met leenwoorden, figuurlijk taalgebruik en samengestelde zinnen (oud AVI niveau 5, onderkant).';
  } else if (leesindexA < 100) {
    level = 'M5';
    explanation = 'Complexere zinsbouw met bijzinnen en rijkere woordenschat (oud AVI niveau 5, bovenkant).';
  } else if (leesindexA < 103) {
    level = 'E4';
    explanation = 'Vlot leestempo met meerlettergrepige woorden en lichte leestekens. Buiten het gevalideerde bereik van de Leesindex A - richtinggevende schatting.';
  } else if (leesindexA < 106) {
    level = 'M4';
    explanation = 'Zinnen van gemiddeld 7-9 woorden, woorden met samengestelde klanken. Buiten het gevalideerde bereik van de Leesindex A - richtinggevende schatting.';
  } else if (leesindexA < 109) {
    level = 'E3';
    explanation = 'Korte zinnen met tweelettergrepige woorden. Buiten het gevalideerde bereik van de Leesindex A - richtinggevende schatting.';
  } else if (leesindexA < 112) {
    level = 'M3';
    explanation = 'Eenvoudige klankzuivere woorden en korte zinnen. Buiten het gevalideerde bereik van de Leesindex A - richtinggevende schatting.';
  } else {
    level = 'AVI Start';
    explanation = 'Korte eenlettergrepige woorden en zeer eenvoudige zinnen. Buiten het gevalideerde bereik van de Leesindex A - richtinggevende schatting.';
  }

  return {
    level,
    confidence: leesindexA >= 74 && leesindexA <= 99 ? 90 : 60,
    wordCount,
    sentenceCount,
    characterCount,
    avgWordLength,
    avgSentenceLength,
    complexWordsPercentage,
    readabilityScore: Math.round(leesindexA * 10) / 10,
    explanation
  };
}

export const AVI_COLORS: Record<AviLevel, { bg: string; text: string; border: string; badge: string; ring: string }> = {
  'AVI Start': { bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-500 text-white', ring: 'ring-emerald-400' },
  'M3': { bg: 'bg-teal-50 text-teal-800', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-500 text-white', ring: 'ring-teal-400' },
  'E3': { bg: 'bg-cyan-50 text-cyan-800', text: 'text-cyan-700', border: 'border-cyan-200', badge: 'bg-cyan-500 text-white', ring: 'ring-cyan-400' },
  'M4': { bg: 'bg-blue-50 text-blue-800', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500 text-white', ring: 'ring-blue-400' },
  'E4': { bg: 'bg-indigo-50 text-indigo-800', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-500 text-white', ring: 'ring-indigo-400' },
  'M5': { bg: 'bg-purple-50 text-purple-800', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-500 text-white', ring: 'ring-purple-400' },
  'E5': { bg: 'bg-fuchsia-50 text-fuchsia-800', text: 'text-fuchsia-700', border: 'border-fuchsia-200', badge: 'bg-fuchsia-500 text-white', ring: 'ring-fuchsia-400' },
  'M6': { bg: 'bg-amber-50 text-amber-800', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500 text-white', ring: 'ring-amber-400' },
  'E6': { bg: 'bg-orange-50 text-orange-800', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-500 text-white', ring: 'ring-orange-400' },
  'E7': { bg: 'bg-rose-50 text-rose-800', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-500 text-white', ring: 'ring-rose-400' },
  'Plus': { bg: 'bg-red-50 text-red-800', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-600 text-white', ring: 'ring-red-400' },
};
