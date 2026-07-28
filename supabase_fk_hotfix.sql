-- ========================================================
-- SnapFrame FK Hotfix
-- รัน script นี้ใน Supabase SQL Editor เพื่อแก้ปัญหา FK constraint
-- ========================================================

-- [Fix 1] สร้าง Function + Trigger auto-sync user ไปยัง public.users
-- เมื่อ user signup ผ่าน Supabase Auth จะ insert เข้า public.users อัตโนมัติ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger ถ้ามีอยู่แล้ว แล้วสร้างใหม่
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- [Fix 2] สำหรับ user ที่ login อยู่แล้วแต่ยังไม่มี record ใน public.users
-- ให้อนุญาต authenticated users INSERT row ของตัวเองได้
DROP POLICY IF EXISTS "Users can insert their profile on signup" ON public.users;
CREATE POLICY "Users can insert their profile on signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- [Fix 3] เพิ่ม policy ให้ UPDATE ข้อมูลของตัวเองได้ด้วย (สำหรับ upsert)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = user_id);
