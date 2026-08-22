/**
 * Web Speech API Engine with special Flemish/Dutch voice prioritization and karaoke word tracking
 */

export interface SpeechVoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isFlemish: boolean;
  isDutch: boolean;
  label: string;
}

export function getAvailableDutchVoices(): SpeechVoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const dutchVoices = voices.filter(
    v => v.lang.startsWith('nl') || v.lang.includes('NL') || v.lang.includes('BE') || v.name.toLowerCase().includes('dutch') || v.name.toLowerCase().includes('vlaams') || v.name.toLowerCase().includes('belg')
  );

  // Map and sort so Flemish voices (nl-BE, Ellen, Bart, Lisa) appear first
  return dutchVoices.map(voice => {
    const isFlemish = voice.lang.toLowerCase().includes('be') || voice.name.toLowerCase().includes('vlaams') || voice.name.toLowerCase().includes('flemish') || voice.name.toLowerCase().includes('belg') || voice.name.toLowerCase().includes('ellen');
    const isDutch = voice.lang.toLowerCase().startsWith('nl');
    
    let label = `${voice.name} (${voice.lang})`;
    if (isFlemish) {
      label = `🇧🇪 ${voice.name} (Vlaams)`;
    } else if (isDutch) {
      label = `🇳🇱 ${voice.name} (Nederlands)`;
    }

    return {
      voice,
      name: voice.name,
      lang: voice.lang,
      isFlemish,
      isDutch,
      label
    };
  }).sort((a, b) => {
    if (a.isFlemish && !b.isFlemish) return -1;
    if (!a.isFlemish && b.isFlemish) return 1;
    return a.name.localeCompare(b.name);
  });
}

export interface SpeechPlaybackController {
  speak: (
    text: string,
    options: {
      speed?: number;
      voiceURI?: string;
      onWordBoundary?: (charIndex: number, charLength?: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  speakWord: (word: string, voiceURI?: string, speed?: number) => void;
}

export function createSpeechController(): SpeechPlaybackController {
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  return {
    speak(text, options) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options.onError?.('Spraaksynthese wordt niet ondersteund in deze browser.');
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.speed || 1.0;
      utterance.pitch = 1.05; // Friendly warm pitch for children

      const voices = getAvailableDutchVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (options.voiceURI) {
        chosenVoice = voices.find(v => v.voice.voiceURI === options.voiceURI)?.voice;
      }

      if (!chosenVoice) {
        // Prefer Flemish, then any Dutch
        chosenVoice = voices.find(v => v.isFlemish)?.voice || voices.find(v => v.isDutch)?.voice || voices[0]?.voice;
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = 'nl-BE';
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          options.onWordBoundary?.(event.charIndex, event.charLength);
        }
      };

      utterance.onend = () => {
        currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis error:', e);
          options.onError?.(e);
        }
        currentUtterance = null;
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    },

    pause() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    },

    resume() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    },

    stop() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
      }
    },

    speakWord(word: string, voiceURI?: string, speed: number = 0.9) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = speed;
      utterance.pitch = 1.1;

      const voices = getAvailableDutchVoices();
      let chosenVoice = voiceURI ? voices.find(v => v.voice.voiceURI === voiceURI)?.voice : undefined;
      if (!chosenVoice) {
        chosenVoice = voices.find(v => v.isFlemish)?.voice || voices.find(v => v.isDutch)?.voice || voices[0]?.voice;
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = 'nl-BE';
      }

      window.speechSynthesis.speak(utterance);
    }
  };
}
