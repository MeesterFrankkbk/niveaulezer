import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { stories, results } = JSON.parse(event.body || '{}');

    const store = getStore({
      name: 'niveaulezer-data',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });

    if (Array.isArray(stories)) {
      await store.setJSON('stories', stories);
    }
    if (Array.isArray(results)) {
      await store.setJSON('results', results);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, storiesCount: stories?.length ?? null, resultsCount: results?.length ?? null })
    };
  } catch (error: any) {
    console.error('Error saving library:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het opslaan van de bibliotheek.' })
    };
  }
};
