import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (two levels up from server/src)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  gemmaModel: process.env.GEMMA_MODEL ?? 'gemma-4-26b-a4b-it',
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? 'gemini-3.8-flash',
  demoMode: process.env.NODE_ENV === 'test' || process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY,
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;

// Validate: never log the key
if (config.geminiApiKey) {
  console.log('[config] GEMINI_API_KEY loaded (hidden)');
} else {
  console.log('[config] GEMINI_API_KEY not set — running in DEMO MODE');
}
console.log(`[config] Model: ${config.gemmaModel}`);
console.log(`[config] Demo mode: ${config.demoMode}`);
