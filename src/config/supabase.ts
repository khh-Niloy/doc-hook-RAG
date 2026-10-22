import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envVars } from './envVars';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_KEY);
  }

  return supabaseClient;
};

export const SUPABASE_BUCKET_NAME = envVars.SUPABASE_STORAGE_BUCKET;

export async function uploadFileToSupabase(
  file: Express.Multer.File,
): Promise<{ fileUrl: string; path: string }> {
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_BUCKET_NAME;

  const fileExt = file.originalname.split('.').pop() || '';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanBaseName = file.originalname
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  const storagePath = `${timestamp}-${cleanBaseName}-${randomSuffix}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    fileUrl: publicUrlData.publicUrl,
    path: storagePath,
  };
}
