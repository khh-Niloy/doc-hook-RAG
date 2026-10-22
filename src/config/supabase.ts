import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const supabaseUrl =
      process.env.SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_KEY ??
      process.env.SUPABASE_ANON_KEY!;

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
};

export const SUPABASE_BUCKET_NAME =
  process.env.SUPABASE_STORAGE_BUCKET ?? 'documents';

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
