import fs from 'fs';
import path from 'path';
import config from '../config.js';

/**
 * Shared Processing Engine for EventMind AI
 * Invocable from both CLI (npm run process) and Express REST API.
 */
export async function processMessages({ filePath, rawText, isUpdate = false } = {}) {
  const targetPath = filePath || config.paths.messages;

  let content = rawText;
  if (!content) {
    if (!fs.existsSync(targetPath)) {
      throw new Error(
        `Target messages file not found at: ${targetPath}\n` +
        `Please copy the organizer's exact message file into 'data/messages.txt'.`
      );
    }
    content = fs.readFileSync(targetPath, 'utf-8');
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error(
      `Input messages file at '${targetPath}' is empty.\n` +
      `ACTION REQUIRED: Please copy the organizer's exact original messages into 'data/messages.txt' and rerun 'npm run process'.`
    );
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.paths.outputDir)) {
    fs.mkdirSync(config.paths.outputDir, { recursive: true });
  }

  // Phase 1 engine scaffolding; full pipeline (Reading -> Area reasoners -> Budget -> Validation) lands in Phase 2
  return {
    status: 'READY_FOR_PHASE_2',
    targetPath,
    messageBytes: Buffer.byteLength(content, 'utf8'),
    isUpdate,
    timestamp: new Date().toISOString()
  };
}
