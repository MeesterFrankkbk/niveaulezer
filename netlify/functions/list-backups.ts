import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async () => {
  try {
    const store = getStore({
      name: 'niveaulezer-data',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });

    const backups = (await store.get('backups', { type: 'json' })) as
      { timestamp: string; count: number; stories: any[] }[] | null;

    // Only send timestamp + count for the list view - not the full content,
    // to keep this fast. The full snapshot is fetched only when restoring.
    const summary = (backups || []).map((b, index) => ({
      index,
      timestamp: b.timestamp,
      count: b.count
    }));

    return { statusCode: 200, body: JSON.stringify({ backups: summary }) };
  } catch (error: any) {
    console.error('Error listing backups:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Fout bij het ophalen van de back-ups.' })
    };
  }
};
