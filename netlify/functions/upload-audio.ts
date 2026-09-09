import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB per opname

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { audioBase64, contentType } = JSON.parse(event.body || '{}');
    if (!audioBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Geen opname ontvangen.' }) };
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Deze opname is groter dan 15MB.' })
      };
    }

    const store = getStore({
      name: 'student-recordings',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await store.set(id, buffer, {
      metadata: { contentType: contentType || 'audio/webm' }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, url: `/api/get-audio?id=${id}` })
    };
  } catch (error: any) {
    console.error('Error uploading audio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het uploaden van de opname.' })
    };
  }
};
