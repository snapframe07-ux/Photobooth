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

-- Delete: ต้องมี policy นี้ ไฟล์ใน bucket ถึงจะถูกลบตอนผู้ใช้กดลบกรอบ
-- ถ้าไม่มี จะลบได้แค่แถวใน DB ส่วนไฟล์จะค้างเป็นขยะใน bucket
DROP POLICY IF EXISTS "Authenticated user frame delete" ON storage.objects;
CREATE POLICY "Authenticated user frame delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'frames' AND auth.role() = 'authenticated');

-- ========================================================
-- หมายเหตุ: bucket 'stickers' (สร้างไว้ใน supabase_schema.sql) ก็ไม่มี policy DELETE
-- ถ้าต้องการให้ลบไฟล์สติกเกอร์ได้จริงด้วย ให้รันเพิ่ม:
--
--   CREATE POLICY "Authenticated user sticker delete"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'stickers' AND auth.role() = 'authenticated');
-- ========================================================
