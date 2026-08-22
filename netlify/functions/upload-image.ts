import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per afbeelding

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { imageBase64, filename, contentType } = JSON.parse(event.body || '{}');
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Geen afbeelding ontvangen.' }) };
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Deze afbeelding is groter dan 5MB. Kies een kleiner bestand of comprimeer de foto eerst.' })
      };
    }

    const store = getStore({
      name: 'story-images',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await store.set(id, buffer, {
      metadata: {
        contentType: contentType || 'image/jpeg',
        filename: filename || id
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, url: `/api/get-image?id=${id}` })
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het uploaden van de afbeelding.' })
    };
  }
};
