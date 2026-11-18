import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { parseRawMessages } from '../utils/message-parser.js';

export class MessageReaderService {
  constructor(filePath = config.paths.messages, historyPath = config.paths.history) {
    this.filePath = filePath;
    this.historyPath = historyPath;
  }

  /**
   * Reads raw source file and parses all messages into structured records.
   * Preserves exact original content without altering the source file.
   */
  readMessages(customPath = null) {
    const target = customPath || this.filePath;

    if (!fs.existsSync(target)) {
      throw new Error(`Target message file does not exist at: ${target}`);
    }

    const rawContent = fs.readFileSync(target, 'utf-8');
    const trimmed = rawContent.trim();
    if (!trimmed) {
      throw new Error(
        `Target message file at '${target}' is empty.\n` +
        `ACTION REQUIRED: Please copy the organizer's original messages into this file.`
      );
    }

    const messages = parseRawMessages(rawContent);
    return {
      filePath: target,
      rawContent,
      byteCount: Buffer.byteLength(rawContent, 'utf8'),
      messages
    };
  }

  /**
   * Reads messages and identifies newly appended messages compared to existing history.
   * Enables incremental updates without re-processing known historical messages.
   */
  readDelta(customPath = null) {
    const { messages, rawContent, byteCount } = this.readMessages(customPath);
    const history = this.loadHistory();

    const knownIdSet = new Set(history.processedMessageIds || []);
    const newMessages = [];
    const existingMessages = [];

    for (const msg of messages) {
      if (knownIdSet.has(msg.id)) {
        existingMessages.push(msg);
      } else {
        newMessages.push(msg);
      }
    }

    return {
      filePath: customPath || this.filePath,
      totalCount: messages.length,
      existingCount: existingMessages.length,
      newCount: newMessages.length,
      allMessages: messages,
      newMessages,
      existingMessages
    };
  }

  /**
   * Loads processing history from persistent JSON storage.
   */
  loadHistory() {
    if (!fs.existsSync(this.historyPath)) {
      return {
        lastProcessedAt: null,
        processedMessageIds: [],
        messageCount: 0
      };
    }

    try {
      const data = fs.readFileSync(this.historyPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        lastProcessedAt: null,
        processedMessageIds: [],
        messageCount: 0
      };
    }
  }

  /**
   * Commits processed message IDs to history to prevent duplicate processing.
   */
  commitHistory(messageIds) {
    const history = this.loadHistory();
    const idSet = new Set(history.processedMessageIds);

    messageIds.forEach(id => idSet.add(id));

    const updated = {
      lastProcessedAt: new Date().toISOString(),
      processedMessageIds: Array.from(idSet),
      messageCount: idSet.size
    };

    if (!fs.existsSync(path.dirname(this.historyPath))) {
      fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
    }

    fs.writeFileSync(this.historyPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }
}

export const messageReader = new MessageReaderService();
export default messageReader;
