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
    const { rawContent, sourceUrl } = JSON.parse(event.body || '{}');
    if (!rawContent) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Geen inhoud opgegeven.' }) };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Hieronder staat de ruwe HTML of geëxporteerde tekst van een Hot Potatoes leesoefening van een klaswebsite.
Bron URL: ${sourceUrl || 'Onbekend'}

Inhoud:
"""
${String(rawContent).slice(0, 15000)}
"""

Extraheer en structureer deze leesoefening zorgvuldig:
1. Haal de titel van de leestekst eruit.
2. Haal de volledige leestekst eruit (schoongemaakt van HTML tags, netjes verdeeld in alinea's).
3. Bepaal het AVI niveau (Start, M3, E3, M4, E4, M5, E5, M6, E6, E7, Plus).
4. Haal alle meerkeuzevragen, de 4 antwoordopties, het juiste antwoord en de feedback/uitleg eruit.
5. Vind de moeilijke woorden en maak er kindvriendelijke definities met emoji en lettergrepen bij.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    return { statusCode: 200, body: JSON.stringify({ success: true, data: parsed }) };
  } catch (error: any) {
    console.error('Error parsing Hot Potatoes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het verwerken van de Hot Potatoes oefening.' })
    };
  }
};
