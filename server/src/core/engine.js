import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { messageReader } from '../services/message-reader.service.js';
import { evidenceService } from '../services/evidence.service.js';

/**
 * Shared Processing Engine for EventMind AI
 * Invocable from both CLI (npm run process) and Express REST API.
 */
export async function processMessages({ filePath, rawText, isUpdate = false } = {}) {
  const targetPath = filePath || config.paths.messages;

  // Handle direct rawText payload (e.g. from UI input) vs file reading
  let readResult;
  if (rawText && typeof rawText === 'string') {
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error('Provided raw message text is empty.');
    }
    // Write temporarily or parse in-memory
    const { parseRawMessages } = await import('../utils/message-parser.js');
    const messages = parseRawMessages(rawText);
    readResult = {
      filePath: 'in-memory-input',
      rawContent: rawText,
      byteCount: Buffer.byteLength(rawText, 'utf8'),
      messages,
      newMessages: messages,
      existingMessages: []
    };
  } else {
    if (isUpdate) {
      readResult = messageReader.readDelta(targetPath);
    } else {
      const initial = messageReader.readMessages(targetPath);
      readResult = {
        ...initial,
        newMessages: initial.messages,
        existingMessages: []
      };
    }
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.paths.outputDir)) {
    fs.mkdirSync(config.paths.outputDir, { recursive: true });
  }

  // Register all parsed messages into the evidence service for provenance
  evidenceService.registerMessages(readResult.messages || readResult.allMessages);

  return {
    status: 'INGESTED',
    filePath: readResult.filePath,
    byteCount: readResult.byteCount,
    totalMessages: (readResult.messages || readResult.allMessages || []).length,
    newMessagesCount: readResult.newMessages ? readResult.newMessages.length : 0,
    existingMessagesCount: readResult.existingMessages ? readResult.existingMessages.length : 0,
    isUpdate,
    timestamp: new Date().toISOString()
  };
}
