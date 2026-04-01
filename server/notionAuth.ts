import express from 'express';
import axios from 'axios';
import { supabase } from './supabase';

const router = express.Router();

const getNotionToken = async () => {
  try {
    const { data, error } = await supabase
      .from('app_notion_config')
      .select('token')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error("Notion integration is not configured. Please connect your Notion account.");
      }
      if (error.code === '42P01' || error.message?.includes('relation "app_notion_config" does not exist')) {
        throw new Error("Notion integration is not configured. Please connect your Notion account.");
      }
      if (error.message && error.message.includes('<html>')) {
        throw new Error("Database is temporarily unavailable. Please try again later.");
      }
      throw new Error(`Failed to retrieve token: ${error.message}`);
    }
    
    if (!data || !data.token) {
      throw new Error("Notion token not found. Please connect your Notion account.");
    }
    
    return data.token;
  } catch (err: any) {
    if (err.message && err.message.includes('<html>')) {
      throw new Error("Database is temporarily unavailable. Please try again later.");
    }
    throw err;
  }
};

router.post('/token', async (req: any, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Fetch existing config
    const { data: existing } = await supabase.from('app_notion_config').select('id').limit(1).maybeSingle();
    
    let error;
    if (existing) {
      const { error: updateError } = await supabase.from('app_notion_config').update({ token }).eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('app_notion_config').insert({ token });
      error = insertError;
    }

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "app_notion_config" does not exist')) {
        return res.status(500).json({ 
          error: 'The app_notion_config table does not exist in your Supabase database. Please run the SQL migration to create it.' 
        });
      }
      if (error.message && error.message.includes('<html>')) {
        return res.status(500).json({ 
          error: 'Database is temporarily unavailable. Please try again later.' 
        });
      }
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving Notion token:', error);
    if (error.message && error.message.includes('<html>')) {
      return res.status(500).json({ error: 'Database is temporarily unavailable. Please try again later.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/token', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    res.json({ token });
  } catch (error: any) {
    if (error.message.includes("Notion integration is not configured") || error.message.includes("Notion token not found")) {
      res.json({ token: null });
    } else {
      console.error('Supabase error retrieving Notion token:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

router.post('/proxy/search', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    const response = await axios.post('https://api.notion.com/v1/search', req.body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Notion Search Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

router.get('/proxy/databases/:id', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    const response = await axios.get(`https://api.notion.com/v1/databases/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Notion DB Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

router.post('/proxy/databases/:id/query', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    const response = await axios.post(`https://api.notion.com/v1/databases/${req.params.id}/query`, req.body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Notion Query Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

router.get('/proxy/pages/:id', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    const response = await axios.get(`https://api.notion.com/v1/pages/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Notion Page Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

router.get('/proxy/blocks/:id/children', async (req: any, res) => {
  try {
    const token = await getNotionToken();
    const response = await axios.get(`https://api.notion.com/v1/blocks/${req.params.id}/children`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Notion Blocks Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

export default router;

