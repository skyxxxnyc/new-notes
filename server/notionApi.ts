import express from 'express';
import { createClient } from "@supabase/supabase-js";
import { notionService } from '../src/services/notionService';
import { importDatabase } from './dbUtils';

const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "");

const router = express.Router();

// Helper to get access token
const getAccessToken = async (userId: string) => {
  const { data, error } = await supabase.from('notion_integrations').select('access_token').eq('user_id', userId).single();
  if (error || !data) throw new Error('Notion integration not found');
  return data.access_token;
};

router.get('/databases', async (req: any, res) => {
  try {
    const accessToken = await getAccessToken(req.user.id);
    const databases = await notionService.getDatabases(accessToken);
    res.json(databases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', async (req: any, res) => {
  const { databaseId } = req.body;
  try {
    const accessToken = await getAccessToken(req.user.id);
    const pages = await notionService.getPagesInDatabase(databaseId, accessToken);
    
    // Transform Notion pages to match local format
    const importedPages = pages.map((page: any) => ({
      id: page.id,
      title: page.properties.Name.title[0].text.content,
      content: '', // Notion content is complex, simplifying for now
      properties: JSON.stringify(page.properties),
    }));

    const newDb = await importDatabase({ name: 'Notion Import', icon: 'Database' }, importedPages, req.user.id);
    res.json(newDb);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/export', async (req: any, res) => {
  const { databaseId, title, content } = req.body;
  try {
    const accessToken = await getAccessToken(req.user.id);
    const result = await notionService.createPageInNotion(databaseId, title, content, accessToken);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
