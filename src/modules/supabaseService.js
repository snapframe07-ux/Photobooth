/**
 * Supabase Service Module (SnapFrame)
 * Handles User Auth, Template CRUD & Sharing, and Sticker Storage using @supabase/supabase-js.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback warning if environment variables are not configured yet
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
      await supabase.from('users').upsert({
        user_id: data.user.id,
        email: data.user.email,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
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

    // Ensure user record exists
    if (data.user) {
      await supabase.from('users').upsert({
        user_id: data.user.id,
        email: data.user.email
      }, { onConflict: 'user_id' });
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
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, event);
    });
    return subscription;
  }

  /**
   * --- Template CRUD & Sharing Methods ---
   * Privacy Note: Saves ONLY design metadata (positions, scale, sticker/frame URLs).
   * NO webcam photo capture data is ever sent to Supabase.
   */

  async saveTemplate({ name, designData, coverImageUrl = null, isShared = false }) {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('กรุณาเข้าสู่ระบบเพื่อบันทึกและแชร์เทมเพลต');
    }

    if (!name || !name.trim()) {
      throw new Error('กรุณาระบุชื่อเทมเพลต');
    }

    // Clean designData to ensure zero photo captures are included
    const cleanedDesignData = {
      ...designData,
      layers: (designData.layers || []).map(layer => {
        // Strip out base layer image data / blobs
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

    if (error) throw new Error(`ไม่สามารถบันทึกเทมเพลตได้: ${error.message}`);
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

    if (error) throw new Error(`ไม่สามารถดึงข้อมูลเทมเพลตของคุณได้: ${error.message}`);
    return data || [];
  }

  async getSharedTemplates() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_shared', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`ไม่สามารถดึงเทมเพลตสาธารณะได้: ${error.message}`);
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

    if (error) throw new Error(`ไม่สามารถลบเทมเพลตได้: ${error.message}`);
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
      throw new Error(`อัปโหลดไฟล์สติกเกอร์ขัดข้อง: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('stickers')
      .getPublicUrl(filePath);

    // Save record to stickers table
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

    if (dbError) throw new Error(`บันทึกข้อมูลสติกเกอร์ขัดข้อง: ${dbError.message}`);
    return data;
  }

  async getStickers() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`ดึงข้อมูลสติกเกอร์ขัดข้อง: ${error.message}`);
    return data || [];
  }
}

export const supabaseService = new SupabaseService();
