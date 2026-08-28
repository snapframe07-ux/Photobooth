-- ========================================================
-- SnapFrame — Custom Frames (ตาราง + Storage + RLS)
-- รัน script นี้ใน Supabase SQL Editor เพื่อเปิดใช้การอัปโหลดกรอบรูปส่วนตัว
-- โครงสร้างล้อกับส่วน stickers ใน supabase_schema.sql
-- ========================================================

-- 1. Create Frames Table
CREATE TABLE IF NOT EXISTS public.frames (
  frame_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_system_asset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;

-- Read: เห็นกรอบของระบบ หรือกรอบที่ตัวเองอัปโหลด
DROP POLICY IF EXISTS "Users can view system assets and own frames" ON public.frames;
CREATE POLICY "Users can view system assets and own frames"
  ON public.frames FOR SELECT
  USING (is_system_asset = true OR auth.uid() = user_id);

-- Insert: เพิ่มได้เฉพาะกรอบของตัวเอง
DROP POLICY IF EXISTS "Users can upload own frames" ON public.frames;
CREATE POLICY "Users can upload own frames"
  ON public.frames FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete: ลบได้เฉพาะกรอบของตัวเอง
DROP POLICY IF EXISTS "Users can delete own frames" ON public.frames;
CREATE POLICY "Users can delete own frames"
  ON public.frames FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================================
-- STORAGE BUCKET SETUP (Frames Bucket)
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('frames', 'frames', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public frame image access" ON storage.objects;
CREATE POLICY "Public frame image access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'frames');

DROP POLICY IF EXISTS "Authenticated user frame upload" ON storage.objects;
CREATE POLICY "Authenticated user frame upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'frames' AND auth.role() = 'authenticated');
