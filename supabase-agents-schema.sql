-- Run this SQL in your Supabase SQL Editor to create the app_agents table

CREATE TABLE IF NOT EXISTS public.app_notion_config (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for app_notion_config
ALTER TABLE public.app_notion_config ENABLE ROW LEVEL SECURITY;

-- Create policy for app_notion_config
CREATE POLICY "Allow authenticated users to read and update notion config" ON public.app_notion_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row if it doesn't exist
INSERT INTO public.app_notion_config (id, token)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.app_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  instructions TEXT,
  knowledge_sources JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_agent_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.app_agent_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent chats"
  ON public.app_agent_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent chats"
  ON public.app_agent_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent chats"
  ON public.app_agent_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent chats"
  ON public.app_agent_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies
CREATE POLICY "Users can view their own agents"
  ON public.app_agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents"
  ON public.app_agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON public.app_agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON public.app_agents FOR DELETE
  USING (auth.uid() = user_id);
