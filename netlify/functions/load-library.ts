import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async () => {
  try {
    const store = getStore({
      name: 'niveaulezer-data',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });

    const stories = await store.get('stories', { type: 'json' });
    const results = await store.get('results', { type: 'json' });

    return {
      statusCode: 200,
      body: JSON.stringify({ stories: stories || null, results: results || null })
    };
  } catch (error: any) {
    console.error('Error loading library:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het laden van de bibliotheek.' })
    };
  }
};
