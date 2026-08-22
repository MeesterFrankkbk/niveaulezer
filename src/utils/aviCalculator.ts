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
 * Calculates syllables count approximately for Dutch words
 */
export function countDutchSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
  if (cleanWord.length <= 3) return 1;

  // Dutch vowel diphthongs and clusters
  const diphthongs = /(aa|ee|oo|uu|ie|oe|ij|ei|ui|ou|au|aai|oei|ooi|eeu|ieu)/g;
  const singleVowels = /[aeiouyà-ÿ]/g;

  // Replace diphthongs with single placeholder
  const reduced = cleanWord.replace(diphthongs, 'X');
  const matches = reduced.match(singleVowels);
  const diphthongMatches = cleanWord.match(diphthongs);

  const count = (matches ? matches.length : 0) + (diphthongMatches ? diphthongMatches.length : 0);
  return Math.max(1, count);
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
 * Evaluates the Dutch AVI Reading Level for a given text
 */
export function calculateAviLevel(text: string): ReadabilityMetrics {
  const cleanText = text.trim();
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

  // Extract sentences
  const sentences = cleanText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // Extract words
  const words = cleanText
    .split(/\s+/)
    .map(w => w.replace(/[^\w\sà-ÿ-]/g, '').trim())
    .filter(w => w.length > 0);
  const wordCount = Math.max(1, words.length);

  const characterCount = words.reduce((acc, w) => acc + w.length, 0);
  const avgWordLength = +(characterCount / wordCount).toFixed(1);
  const avgSentenceLength = +(wordCount / sentenceCount).toFixed(1);

  // Count complex words (>= 3 syllables or >= 8 letters)
  let complexWordCount = 0;
  words.forEach(w => {
    if (w.length >= 8 || countDutchSyllables(w) >= 3) {
      complexWordCount++;
    }
  });

  const complexWordsPercentage = +((complexWordCount / wordCount) * 100).toFixed(1);

  // AVI scoring metric based on Flemish/Dutch Cito scale
  // Combined factor: avg sentence length + (avg word length * 2) + (complex percentage * 0.1)
  const metric = avgSentenceLength * 0.45 + avgWordLength * 2.8 + complexWordsPercentage * 0.15;

  let level: AviLevel = 'M4';
  let explanation = '';

  if (metric < 14) {
    level = 'AVI Start';
    explanation = 'Korte eenlettergrepige woorden en zeer eenvoudige zinnen. Ideaal voor startende lezers.';
  } else if (metric < 16) {
    level = 'M3';
    explanation = 'Eenvoudige klankzuivere woorden en korte zinnen van 4-6 woorden.';
  } else if (metric < 18) {
    level = 'E3';
    explanation = 'Korte zinnen met tweelettergrepige woorden en bekende lettercombinaties.';
  } else if (metric < 20) {
    level = 'M4';
    explanation = 'Zinnen van gemiddeld 7-9 woorden. Woorden met samengestelde klanken en voorvoegsels.';
  } else if (metric < 22) {
    level = 'E4';
    explanation = 'Vlot leestempo met meerlettergrepige woorden en lichte leestekens.';
  } else if (metric < 24.5) {
    level = 'M5';
    explanation = 'Complexere zinsbouw met bijzinnen en rijkere woordenschat.';
  } else if (metric < 27) {
    level = 'E5';
    explanation = 'Gevarieerde zinsbouw met leenwoorden, figuurlijk taalgebruik en samengestelde zinnen.';
  } else if (metric < 29.5) {
    level = 'M6';
    explanation = 'Rijke woordenschat met langere zinnen en abstracte begrippen.';
  } else if (metric < 32) {
    level = 'E6';
    explanation = 'Gevorderde teksten met moeilijke termen en uitdagende grammaticale structuren.';
  } else if (metric < 35) {
    level = 'E7';
    explanation = 'Complexe teksten voor vlotte lezers met vaktaal en gelaagde thema\'s.';
  } else {
    level = 'Plus';
    explanation = 'Hoog niveau met veeleisende woordenschat en complexe tekstopbouw.';
  }

  return {
    level,
    confidence: 90,
    wordCount,
    sentenceCount,
    characterCount,
    avgWordLength,
    avgSentenceLength,
    complexWordsPercentage,
    readabilityScore: Math.round(metric * 10) / 10,
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
