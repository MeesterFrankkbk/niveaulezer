import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { index } = JSON.parse(event.body || '{}');
    if (typeof index !== 'number') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Geen back-up gekozen.' }) };
    }

    const store = getStore({
      name: 'niveaulezer-data',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });

    const backups = (await store.get('backups', { type: 'json' })) as
      { timestamp: string; count: number; stories: any[] }[] | null;

    if (!backups || !backups[index]) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Deze back-up bestaat niet (meer).' }) };
    }

    const restoredStories = backups[index].stories;
    await store.setJSON('stories', restoredStories);

    return { statusCode: 200, body: JSON.stringify({ success: true, stories: restoredStories }) };
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het herstellen van de back-up.' })
    };
  }
};
