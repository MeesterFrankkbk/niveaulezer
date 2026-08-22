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

    // Strip <style>...</style> blocks: pure CSS, no content value, but often
    // the single biggest chunk of a Hot Potatoes export - removing it frees
    // up a lot of room so the actual reading text and questions (which can
    // sit far into the file, after all the styling and engine code) are
    // reliably included in what we send to the AI.
    const cleanedContent = String(rawContent).replace(/<style[\s\S]*?<\/style>/gi, '');

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Hieronder staat de ruwe HTML of geëxporteerde tekst van een Hot Potatoes leesoefening van een klaswebsite.
Bron URL: ${sourceUrl || 'Onbekend'}

Inhoud:
"""
${cleanedContent.slice(0, 60000)}
"""

Extraheer en structureer deze leesoefening zorgvuldig:
1. Haal de titel van de leestekst eruit.
2. Haal de volledige leestekst eruit (schoongemaakt van HTML tags, netjes verdeeld in alinea's). Deze staat soms pas een heel eind in het bestand, na alle stijl- en programmeercode - zoek er zeker naar in de volledige inhoud hierboven, niet enkel het begin.
3. Bepaal het AVI niveau (Start, M3, E3, M4, E4, M5, E5, M6, E6, E7, Plus).
4. Haal alle meerkeuzevragen en hun antwoordopties eruit uit de zichtbare tekst (bv. bij "QuestionText" en "MCAnswers"). Het juiste antwoord staat NIET zichtbaar aangeduid in de tekst zelf, maar in een JavaScript-datastructuur zoals "var I=new Array(); I[0][3][0]=new Array('antwoordtekst','',1,100,1);" - het cijfer 1 (in plaats van 0) op de derde positie van elk antwoord geeft aan dat dit het juiste antwoord is. Gebruik die structuur om het juiste antwoord met zekerheid te bepalen, niet een gok op basis van de inhoud.
5. Vind de moeilijke woorden en maak er kindvriendelijke definities met emoji en lettergrepen bij.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
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
