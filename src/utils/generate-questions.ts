import type { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'GEMINI_API_KEY is niet ingesteld in de Netlify-omgevingsvariabelen.' })
    };
  }

  try {
    const { content, level, existingQuestionCount } = JSON.parse(event.body || '{}');
    if (!content || !String(content).trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Geen leestekst opgegeven.' }) };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Je bent een ervaren leerkracht Nederlands in het Vlaamse basisonderwijs, gespecialiseerd in begrijpend lezen.
Hieronder staat een leestekst op AVI-niveau "${level || 'onbekend'}". Er bestaan al ${existingQuestionCount || 0} vraag/vragen voor deze tekst.

Leestekst:
"""
${String(content).slice(0, 8000)}
"""

Maak hier zinvolle begripsvragen bij die echt over de inhoud van DEZE tekst gaan (geen algemene vragen):
1. 3 meerkeuzevragen (Hot Potatoes stijl): elk met 4 antwoordopties, het juiste antwoord (index 0-3) en een korte, vriendelijke uitleg/feedback waarom dat antwoord juist is.
2. 3-4 moeilijke of minder frequente woorden UIT DEZE TEKST, met een kindvriendelijke definitie, een voorbeeldzin, een passende emoji, en de opdeling in lettergrepen (met punt ertussen, bv. "won·der·baar·lijk").

Zorg dat de vragen een mix zijn van: 1 letterlijke vraag (staat letterlijk in de tekst), 1 begripsvraag (vraagt om iets te begrijpen/verbinden), en 1 vraag over woordbetekenis of gevoel/mening in de tekst.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctIndex', 'explanation']
              }
            }
          },
          required: ['difficultWords', 'questions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return { statusCode: 200, body: JSON.stringify({ success: true, data: parsed }) };
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het genereren van vragen.' })
    };
  }
};
