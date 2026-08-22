import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set. AI features will use client heuristics.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

/**
 * AI Endpoint: Analyze Dutch text for AVI Reading Level, difficult words with definitions, and questions
 */
app.post('/api/analyze-text', async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Tekst is verplicht.' });
      return;
    }

    const ai = getAI();
    if (!ai) {
      // Fallback: heuristic analysis if no key
      res.json({
        success: true,
        aiUsed: false,
        fallbackMessage: 'Standaard analyse gebruikt.'
      });
      return;
    }

    const prompt = `Je bent een ervaren Vlaamse leerkracht basisonderwijs en expert in niveaulezen (AVI-systeem Vlaanderen & Nederland).
Analyseer de volgende Nederlandse leestekst voor kinderen:
Titel: ${title || 'Onbekend'}
Tekst:
"""
${text}
"""

Voer een grondige analyse uit:
1. Bepaal het exacte AVI-leesniveau (Kies strikt uit: 'AVI Start', 'M3', 'E3', 'M4', 'E4', 'M5', 'E5', 'M6', 'E6', 'E7', 'Plus').
2. Geef een korte, bemoedigende toelichting op het niveau.
3. Selecteer 3 tot 5 moeilijke of interessante woorden uit de tekst. Geef voor elk woord een uiterst eenvoudige en heldere kindvriendelijke definitie (1 zin), een voorbeeldzin, een passend emoji icoon, en de lettergrepen splitsing (bijv. "tuin·huis").
4. Maak 3 meerkeuzevragen in Hot Potatoes stijl: 2 tekstbegripsvragen en 1 woordenschatvraag. Elke vraag moet 4 opties hebben, een correctIndex (0, 1, 2 of 3), en een vriendelijke uitleg.
5. Bepaal een passende categorie (bijv. 'Avontuur', 'Dieren', 'School', 'Humor', 'Fantasie', 'Wetenschap').`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            level: {
              type: Type.STRING,
              description: "Het AVI niveau: 'AVI Start', 'M3', 'E3', 'M4', 'E4', 'M5', 'E5', 'M6', 'E6', 'E7', of 'Plus'"
            },
            levelExplanation: {
              type: Type.STRING,
              description: "Toelichting waarom deze tekst op dit niveau past."
            },
            category: {
              type: Type.STRING,
              description: "Korte categorie naam"
            },
            difficultWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  example: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  syllableSplit: { type: Type.STRING }
                },
                required: ['word', 'definition']
              }
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctIndex', 'explanation']
              }
            }
          },
          required: ['level', 'levelExplanation', 'category', 'difficultWords', 'questions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      aiUsed: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error analyzing text:', error);
    res.status(500).json({ error: error.message || 'Fout bij analyseren van tekst.' });
  }
});

/**
 * AI Endpoint: Generate a new level-appropriate reading story
 */
app.post('/api/generate-story', async (req, res) => {
  try {
    const { level, theme, extraPrompt } = req.body;
    const ai = getAI();
    if (!ai) {
      res.status(400).json({ error: 'Gemini API key is niet geconfigureerd.' });
      return;
    }

    const prompt = `Je bent een bekroonde Vlaamse kinderboekenauteur en onderwijzer.
Schrijf een fantastisch, spannend of grappig kinderverhaal speciaal geschreven op het AVI-niveau: "${level || 'M4'}".
Thema: "${theme || 'Avontuur en vriendschap'}".
${extraPrompt ? `Extra wensen van de leerkracht: "${extraPrompt}"` : ''}

Richtlijnen voor AVI-niveaus:
- AVI Start/M3: Zeer korte zinnen (3-5 woorden), eenlettergrepige klankzuivere woorden, herhaling.
- E3/M4: Zinnen van 6-8 woorden, bekende samengestelde woorden.
- E4/M5: Zinnen van 8-12 woorden, rijke beschrijvingen, enkele langere woorden.
- E5/M6: Gevarieerde zinsbouw, bijzinnen, levendige dialogen en humor.
- E6/E7/Plus: Uitdagende woordenschat, diepere verhaallijn en thema's.

Genereer:
1. Een pakkende titel.
2. Een verhaaltje van ongeveer 100-250 woorden (passend bij het niveau).
3. 3-4 moeilijke woorden met eenvoudige uitleg, voorbeeldzin, emoji en lettergrepen.
4. 3 meerkeuzevragen (Hot Potatoes stijl) met 4 opties, het juiste antwoord (0-3) en vriendelijke feedback.
5. Een passende Unsplash keyword zoekterm voor een illustratie.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            content: { type: Type.STRING },
            imageKeyword: { type: Type.STRING },
            difficultWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  example: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  syllableSplit: { type: Type.STRING }
                },
                required: ['word', 'definition']
              }
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctIndex', 'explanation']
              }
            }
          },
          required: ['title', 'category', 'content', 'difficultWords', 'questions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error generating story:', error);
    res.status(500).json({ error: error.message || 'Fout bij het genereren van het verhaal.' });
  }
});

/**
 * AI Endpoint: Parse Hot Potatoes raw exercise HTML/text
 */
app.post('/api/parse-hotpotatoes', async (req, res) => {
  try {
    const { rawContent, sourceUrl } = req.body;
    if (!rawContent) {
      res.status(400).json({ error: 'Geen inhoud opgegeven.' });
      return;
    }

    const ai = getAI();
    if (!ai) {
      res.status(400).json({ error: 'Gemini API is nodig voor slimme Hot Potatoes extractie.' });
      return;
    }

    const prompt = `Hieronder staat de ruwe HTML of geëxporteerde tekst van een Hot Potatoes leesoefening van een klaswebsite.
Bron URL: ${sourceUrl || 'Onbekend'}

Inhoud:
"""
${rawContent.slice(0, 15000)}
"""

Extraheer en structureer deze leesoefening zorgvuldig:
1. Haal de titel van de leestekst eruit.
2. Haal de volledige leestekst eruit (schoongemaakt van HTML tags, netjes verdeeld in alinea's).
3. Bepaal het AVI niveau (Start, M3, E3, M4, E4, M5, E5, M6, E6, E7, Plus).
4. Haal alle meerkeuzevragen, de 4 antwoordopties, het juiste antwoord en de feedback/uitleg eruit.
5. Vind de moeilijke woorden en maak er kindvriendelijke definities met emoji en lettergrepen bij.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            level: { type: Type.STRING },
            category: { type: Type.STRING },
            content: { type: Type.STRING },
            difficultWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  example: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  syllableSplit: { type: Type.STRING }
                },
                required: ['word', 'definition']
              }
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctIndex', 'explanation']
              }
            }
          },
          required: ['title', 'level', 'content', 'difficultWords', 'questions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error parsing Hot Potatoes:', error);
    res.status(500).json({ error: error.message || 'Fout bij het verwerken van de Hot Potatoes oefening.' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NiveauLezer server draait op poort ${PORT}`);
  });
}

startServer();
