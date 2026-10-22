import dotenv from 'dotenv';
dotenv.config();

interface IEnvVars {
  PORT: string;
  NODE_ENV: 'development' | 'production';
  MONGODB_URI: string;
  EMBEDDING_API_URL: string;
  RERANKER_API_URL: string;
  GEMINI_API_KEY: string;
  REDIS_URL: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;
  CORS_ORIGIN: string;
}

const loadEnvVars = (): IEnvVars => {
  const requiredEnvVar: string[] = [
    'PORT',
    'NODE_ENV',
    'MONGODB_URI',
    'EMBEDDING_API_URL',
    'RERANKER_API_URL',
    'GEMINI_API_KEY',
    'REDIS_URL',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_STORAGE_BUCKET',
    'CORS_ORIGIN',
  ];

  requiredEnvVar.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`env not found error -> ${key}`);
    }
  });

  return {
    PORT: process.env.PORT as string,
    NODE_ENV: process.env.NODE_ENV as 'development' | 'production',
    MONGODB_URI: process.env.MONGODB_URI as string,
    EMBEDDING_API_URL: process.env.EMBEDDING_API_URL as string,
    RERANKER_API_URL: process.env.RERANKER_API_URL as string,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,
    REDIS_URL: process.env.REDIS_URL as string,
    SUPABASE_URL: process.env.SUPABASE_URL as string,
    SUPABASE_KEY: process.env.SUPABASE_KEY as string,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET as string,
    CORS_ORIGIN: process.env.CORS_ORIGIN as string,
  };
};

export const envVars = loadEnvVars();
