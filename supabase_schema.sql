-- ========================================================
-- SnapFrame Supabase Database Schema & RLS Security Policies
-- Execute this script in your Supabase SQL Editor
-- ========================================================

-- 1. Create Users Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  design_data JSONB NOT NULL,
  cover_image_url TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Stickers Table
CREATE TABLE IF NOT EXISTS public.stickers (
  sticker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_system_asset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- --- USERS TABLE POLICIES ---
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their profile on signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- --- TEMPLATES TABLE POLICIES ---
-- Read: Users can read their own templates OR templates that are marked as shared
CREATE POLICY "Users can read own or shared templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

-- Insert: Users can create templates assigned to themselves
CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update: Users can update only their own templates
CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete: Users can delete only their own templates
CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);

-- --- STICKERS TABLE POLICIES ---
-- Read: Users can view system stickers OR their own uploaded stickers
CREATE POLICY "Users can view system assets and own stickers"
  ON public.stickers FOR SELECT
  USING (is_system_asset = true OR auth.uid() = user_id);

-- Insert: Users can insert their own custom stickers
CREATE POLICY "Users can upload own stickers"
  ON public.stickers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete: Users can delete their own custom stickers
CREATE POLICY "Users can delete own stickers"
  ON public.stickers FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================================
-- STORAGE BUCKET SETUP (Stickers Bucket)
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public sticker image access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stickers');

CREATE POLICY "Authenticated user sticker upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stickers' AND auth.role() = 'authenticated');
