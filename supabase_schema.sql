-- Kai Database Schema (Updated with all features)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Chats table (updated with bookmarks)
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    is_bookmarked BOOLEAN DEFAULT false,
    shared_link UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add shared_link column if it doesn't exist (for existing databases)
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS shared_link UUID DEFAULT NULL;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT false;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "Anyone can view shared chats" ON public.chats;

CREATE POLICY "Users can view their own chats" ON public.chats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared chats" ON public.chats
    FOR SELECT USING (shared_link IS NOT NULL);

-- 2. Documents table (vector embeddings)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Feedback table (thumbs up/down)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    message_index INTEGER,
    rating TEXT CHECK (rating IN ('up', 'down')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, chat_id, message_index)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.feedback;

CREATE POLICY "Users can view their own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Usage stats table
CREATE TABLE IF NOT EXISTS public.usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    total_queries INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_searches INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_stats;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_stats;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_stats;

CREATE POLICY "Users can view their own usage" ON public.usage_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON public.usage_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON public.usage_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Enable RLS on messages table (safe to run even if table doesn't exist)
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON public.chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_bookmarked ON public.chats(user_id, is_bookmarked);
CREATE INDEX IF NOT EXISTS idx_chats_shared ON public.chats(shared_link);
CREATE INDEX IF NOT EXISTS idx_feedback_chat_id ON public.feedback(chat_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON public.usage_stats(user_id, date);
