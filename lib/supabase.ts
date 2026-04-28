import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client — dùng trong client components (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — chỉ dùng trên server (API routes, server components)
// Có full access, bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Upload file ảnh lên Supabase Storage
 */
export async function uploadImage(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}
