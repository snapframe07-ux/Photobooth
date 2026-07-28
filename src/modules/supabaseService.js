/**
 * Supabase Service Module (SnapFrame)
 * Handles User Auth, Template CRUD & Sharing, and Sticker Storage using @supabase/supabase-js.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Normalizes Supabase API Errors (e.g. missing table schema errors)
 */
function handleSupabaseError(error, defaultMsg) {
  if (!error) return;
  const msg = error.message || '';
  if (msg.includes('Could not find the table') || msg.includes('schema cache')) {
    return new Error("⚠️ ยังไม่ได้สร้างตารางในฐานข้อมูล Supabase (โปรดนำโค้ดจากไฟล์ supabase_schema.sql ไปรันใน Supabase SQL Editor)");
  }
  return new Error(`${defaultMsg}: ${msg}`);
}

export class SupabaseService {
  /**
   * --- Authentication Methods ---
   */
  async signUp(email, password) {
    if (!isSupabaseConfigured) {
      throw new Error('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env ก่อนใช้งาน');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw new Error(error.message);

    // Sync profile to public.users table
    if (data.user) {
      try {
        await supabase.from('users').upsert({
          user_id: data.user.id,
          email: data.user.email,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (_) {}
    }

    return data.user;
  }

  async signIn(email, password) {
    if (!isSupabaseConfigured) {
      throw new Error('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env ก่อนใช้งาน');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data.user) {
      try {
        await supabase.from('users').upsert({
          user_id: data.user.id,
          email: data.user.email
        }, { onConflict: 'user_id' });
      } catch (_) {}
    }

    return data.user;
  }

  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (_) {
      return null;
    }
  }

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, event);
      });
      return subscription;
    } catch (_) {
      return { unsubscribe: () => {} };
    }
  }

  /**
   * --- Template CRUD Methods ---
   */

  async saveTemplate({ name, designData, coverImageUrl = null, isShared = false }) {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('กรุณาเข้าสู่ระบบเพื่อบันทึกและแชร์เทมเพลต');
    }

    if (!name || !name.trim()) {
      throw new Error('กรุณาระบุชื่อเทมเพลต');
    }

    const cleanedDesignData = {
      ...designData,
      layers: (designData.layers || []).map(layer => {
        if (layer.type === 'base') {
          return {
            id: layer.id,
            type: 'base',
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            scale: layer.scale,
            rotation: layer.rotation
          };
        }
        return layer;
      })
    };

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: name.trim(),
        design_data: cleanedDesignData,
        cover_image_url: coverImageUrl,
        is_shared: Boolean(isShared),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw handleSupabaseError(error, 'ไม่สามารถบันทึกเทมเพลตได้');
    }
    return data;
  }

  async getMyTemplates() {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw handleSupabaseError(error, 'ไม่สามารถดึงข้อมูลเทมเพลตของคุณได้');
    }
    return data || [];
  }

  async getSharedTemplates() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_shared', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw handleSupabaseError(error, 'ไม่สามารถดึงเทมเพลตสาธารณะได้');
    }
    return data || [];
  }

  async deleteTemplate(templateId) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน');

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', user.id);

    if (error) {
      throw handleSupabaseError(error, 'ไม่สามารถลบเทมเพลตได้');
    }
  }

  /**
   * --- Sticker Storage Methods ---
   */
  async uploadSticker(file, name) {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนอัปโหลดสติกเกอร์ส่วนตัว');
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `stickers/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { error: uploadError } = await supabase
      .storage
      .from('stickers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw handleSupabaseError(uploadError, 'อัปโหลดไฟล์สติกเกอร์ขัดข้อง');
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('stickers')
      .getPublicUrl(filePath);

    const { data, error: dbError } = await supabase
      .from('stickers')
      .insert({
        user_id: user.id,
        name: name || file.name,
        image_url: publicUrl,
        is_system_asset: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      throw handleSupabaseError(dbError, 'บันทึกข้อมูลสติกเกอร์ขัดข้อง');
    }
    return data;
  }

  async getStickers() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw handleSupabaseError(error, 'ดึงข้อมูลสติกเกอร์ขัดข้อง');
    }
    return data || [];
  }
}

export const supabaseService = new SupabaseService();
