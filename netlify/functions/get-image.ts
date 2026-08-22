import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'Ontbrekende afbeelding-id.' };
  }

  try {
    const store = getStore('story-images');
    const result = await store.getWithMetadata(id, { type: 'arrayBuffer' });

    if (!result || !result.data) {
      return { statusCode: 404, body: 'Afbeelding niet gevonden.' };
    }

    const contentType = (result.metadata?.contentType as string) || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: Buffer.from(result.data as ArrayBuffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error: any) {
    console.error('Error fetching image:', error);
    return { statusCode: 500, body: 'Fout bij het ophalen van de afbeelding.' };
  }
};
