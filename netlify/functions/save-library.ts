import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const MAX_BACKUPS = 15;

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

      // Automatic rolling backup: keep a timestamped snapshot of the story
      // library on every save, so a mistake never means starting from zero.
      try {
        const existingBackups = (await store.get('backups', { type: 'json' })) as
          { timestamp: string; count: number; stories: any[] }[] | null;
        const backups = Array.isArray(existingBackups) ? existingBackups : [];

        backups.unshift({
          timestamp: new Date().toISOString(),
          count: stories.length,
          stories
        });

        const trimmed = backups.slice(0, MAX_BACKUPS);
        await store.setJSON('backups', trimmed);
      } catch (backupError) {
        // A failed backup snapshot should never block the main save.
        console.error('Error writing automatic backup:', backupError);
      }
    }
    if (Array.isArray(results)) {
      await store.setJSON('results', results);

      // Same rolling backup safeguard for reading results.
      try {
        const existingResultBackups = (await store.get('resultsBackups', { type: 'json' })) as
          { timestamp: string; count: number; results: any[] }[] | null;
        const resultBackups = Array.isArray(existingResultBackups) ? existingResultBackups : [];

        resultBackups.unshift({
          timestamp: new Date().toISOString(),
          count: results.length,
          results
        });

        const trimmedResults = resultBackups.slice(0, MAX_BACKUPS);
        await store.setJSON('resultsBackups', trimmedResults);
      } catch (backupError) {
        console.error('Error writing automatic results backup:', backupError);
      }
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
