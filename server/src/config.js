import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });

/**
 * Validates and exposes system environment configuration
 */
export function validateConfig() {
  const warnings = [];

  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not defined in .env. AI processing calls will require an active key.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const port = parseInt(process.env.PORT, 10) || 3001;
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  return {
    rootDir,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: model,
    port,
    clientOrigin,
    warnings,
    paths: {
      messages: path.join(rootDir, 'data', 'messages.txt'),
      outputDir: path.join(rootDir, 'output'),
      plan: path.join(rootDir, 'output', 'plan.json'),
      trace: path.join(rootDir, 'output', 'trace.json'),
      rejected: path.join(rootDir, 'output', 'rejected.json'),
      evidence: path.join(rootDir, 'output', 'evidence.json'),
      history: path.join(rootDir, 'output', 'history.json'),
    }
  };
}

export const config = validateConfig();
export default config;
