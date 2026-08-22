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
    const { level, theme, extraPrompt } = JSON.parse(event.body || '{}');
    const ai = new GoogleGenAI({ apiKey });

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
      model: 'gemini-2.5-flash',
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
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    return { statusCode: 200, body: JSON.stringify({ success: true, data: parsed }) };
  } catch (error: any) {
    console.error('Error generating story:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het genereren van het verhaal.' })
    };
  }
};
