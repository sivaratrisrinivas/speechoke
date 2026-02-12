import path from 'path';
import * as fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const isPlaceholderKey = (key?: string | null): boolean => {
  if (!key) return true;
  const normalized = key.trim().toLowerCase();
  return normalized.includes('placeholder') || normalized.includes('appi_key');
};

const readGeminiKey = (filePath: string): string | undefined => {
  if (!fs.existsSync(filePath)) return undefined;
  const content = fs.readFileSync(filePath, 'utf-8');
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('GEMINI_API_KEY='));
  if (!line) return undefined;
  return line.slice('GEMINI_API_KEY='.length).trim();
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const mergedKey = env.GEMINI_API_KEY;
    const keyFromDotEnv = readGeminiKey(path.resolve(__dirname, '.env'));
    const effectiveKey =
      !isPlaceholderKey(mergedKey) ? mergedKey :
      !isPlaceholderKey(keyFromDotEnv) ? keyFromDotEnv :
      undefined;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(effectiveKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(effectiveKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
