import crypto from 'crypto';

/**
 * Parses raw text containing one or more unstructured messages
 * into structured message objects without mutating the original text.
 */
export function parseRawMessages(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // Split into raw message blocks while preserving lines and offsets
  const blocks = splitIntoBlocks(rawText);

  return blocks.map((block, index) => {
    return parseSingleBlock(block.raw, index + 1, block.lineStart, block.lineEnd, block.byteOffset);
  });
}

/**
 * Splits raw content into message blocks using multiple delimiter heuristics.
 * Handles:
 * 1. Explicit message headers (WhatsApp timestamps, Email headers, Notice headers, numbered messages)
 * 2. Consecutive compact messages without blank lines (e.g. WhatsApp logs)
 * 3. Blank-line separated blocks for mixed or unstructured messages
 */
function splitIntoBlocks(rawText) {
  const lines = rawText.split(/\r?\n/);
  const blocks = [];

  const delimiterPatterns = [
    // WhatsApp with bracket: [12/10/26, 10:15 AM] Sender: or [10:15 AM, 12/10/26] Sender:
    /^\[\s*(?:\d{1,4}[-/.])?\d{1,2}[-/.](?:\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*\]\s*[^:]+:/i,
    // WhatsApp without bracket: 12/10/26, 10:15 AM - Sender:
    /^(?:\d{1,4}[-/.])?\d{1,2}[-/.](?:\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*-\s*[^:]+:/i,
    // Email header start: From: Sender
    /^From:\s*[^<\n]+(?:<[^>\n]+>)?/i,
    // Explicit headers: Message 1:, --- Message 1 ---, [Message 1]
    /^(?:[-=*#~_]{2,}\s*)?(?:Message|Notice|Announcement|Email|Msg)\s*#?\s*\d+(?:\s*[-=*#~_]{2,})?:?/i,
    // Notice header: NOTICE #..., NOTICE:
    /^NOTICE(?:\s*#?\s*\d+)?:/i,
    // Explicit divider line: ---, ===, ___
    /^[-=*_]{3,}\s*$/
  ];

  function isMessageStart(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return delimiterPatterns.some(pattern => pattern.test(trimmed));
  }

  let currentBlockLines = [];
  let blockStartLine = 1;
  let blockByteOffset = 0;
  let currentByteOffset = 0;
  let consecutiveEmptyLines = 0;
  let inEmailHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isDivider = /^[-=*_]{3,}\s*$/.test(trimmed);
    const isStart = isMessageStart(line);

    if (/^From:\s*/i.test(trimmed)) {
      inEmailHeader = true;
    }

    if (trimmed === '') {
      consecutiveEmptyLines++;
      currentByteOffset += Buffer.byteLength(line, 'utf8') + 1;
      // If we are accumulating lines and hit an empty line
      if (currentBlockLines.length > 0) {
        currentBlockLines.push(line);
      }
      continue;
    }

    // A new message starts if:
    // 1. Explicit message start pattern is encountered and we already have a previous block
    // 2. OR, we had 1 or more empty lines separating blocks, unless we are in the middle of an email header
    const isBoundary = isStart || (consecutiveEmptyLines >= 1 && !inEmailHeader && currentBlockLines.length > 0);

    if (isBoundary && currentBlockLines.length > 0) {
      // Trim trailing empty lines from the current block
      while (currentBlockLines.length > 0 && currentBlockLines[currentBlockLines.length - 1].trim() === '') {
        currentBlockLines.pop();
      }

      if (currentBlockLines.length > 0) {
        const rawBlock = currentBlockLines.join('\n');
        // Do not add divider-only blocks
        if (!/^[-=*_]{3,}\s*$/.test(rawBlock.trim())) {
          blocks.push({
            raw: rawBlock,
            lineStart: blockStartLine,
            lineEnd: blockStartLine + currentBlockLines.length - 1,
            byteOffset: blockByteOffset
          });
        }
      }

      currentBlockLines = isDivider ? [] : [line];
      blockStartLine = i + 1;
      blockByteOffset = currentByteOffset;
      inEmailHeader = /^From:\s*/i.test(trimmed);
    } else {
      if (currentBlockLines.length === 0) {
        blockStartLine = i + 1;
        blockByteOffset = currentByteOffset;
      }
      if (!isDivider) {
        currentBlockLines.push(line);
      }
    }

    consecutiveEmptyLines = 0;
    currentByteOffset += Buffer.byteLength(line, 'utf8') + 1;
  }

  // Close final block
  while (currentBlockLines.length > 0 && currentBlockLines[currentBlockLines.length - 1].trim() === '') {
    currentBlockLines.pop();
  }

  if (currentBlockLines.length > 0) {
    const rawBlock = currentBlockLines.join('\n');
    if (!/^[-=*_]{3,}\s*$/.test(rawBlock.trim())) {
      blocks.push({
        raw: rawBlock,
        lineStart: blockStartLine,
        lineEnd: blockStartLine + currentBlockLines.length - 1,
        byteOffset: blockByteOffset
      });
    }
  }

  return blocks;
}

/**
 * Parses an individual message block, identifying sender, dates, subject and body.
 */
function parseSingleBlock(raw, index, lineStart, lineEnd, byteOffset) {
  // Stable ID derived from hash of the exact raw text
  const hash = crypto.createHash('sha256').update(raw.trim()).digest('hex').substring(0, 10);
  const id = `msg_${hash}`;

  let senderRaw = null;
  let dateRaw = null;
  let dateParsed = null;
  let subject = null;
  let body = raw;
  let format = 'unstructured';

  const lines = raw.split(/\r?\n/);
  const firstLine = lines[0] ? lines[0].trim() : '';

  // 1. Email Format detection
  if (/^From:/i.test(firstLine) || lines.some(l => /^From:/i.test(l))) {
    format = 'email';
    let bodyStartIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.trim() === '' && i > 0) {
        bodyStartIndex = i + 1;
        break;
      }
      const fromMatch = l.match(/^From:\s*(.*)/i);
      if (fromMatch) senderRaw = fromMatch[1].trim();

      const dateMatch = l.match(/^Date:\s*(.*)/i);
      if (dateMatch) {
        dateRaw = dateMatch[1].trim();
        dateParsed = tryParseDate(dateRaw);
      }

      const subjMatch = l.match(/^Subject:\s*(.*)/i);
      if (subjMatch) subject = subjMatch[1].trim();
    }

    body = lines.slice(bodyStartIndex).join('\n').trim();
    if (!body) body = raw;
  }
  // 2. WhatsApp Format with brackets: [12/10/2026, 10:15 AM] Sender: Message
  else if (/^\[(.*?)\]\s*([^:]+):\s*(.*)/s.test(raw)) {
    format = 'whatsapp';
    const match = raw.match(/^\[(.*?)\]\s*([^:]+):\s*(.*)/s);
    if (match) {
      dateRaw = match[1].trim();
      dateParsed = tryParseDate(dateRaw);
      senderRaw = match[2].trim();
      body = match[3].trim();
    }
  }
  // 3. WhatsApp Format with dash: 12/10/2026, 10:15 AM - Sender: Message
  else if (/^([^-]+)\s*-\s*([^:]+):\s*(.*)/s.test(raw)) {
    const match = raw.match(/^([^-]+)\s*-\s*([^:]+):\s*(.*)/s);
    const potentialDate = match[1].trim();
    const potentialSender = match[2].trim();
    const parsedD = tryParseDate(potentialDate);

    if (parsedD || /\d{1,2}:\d{2}/.test(potentialDate)) {
      format = 'whatsapp';
      dateRaw = potentialDate;
      dateParsed = parsedD;
      senderRaw = potentialSender;
      body = match[3].trim();
    }
  }
  // 4. Numbered message header: Message 1: Sender (Date) - Content
  else if (/^(?:Message|Notice|Announcement)\s*#?\s*\d+\s*[:\-]\s*(.*)/i.test(firstLine)) {
    format = 'notice';
    const headerMatch = firstLine.match(/^(?:Message|Notice|Announcement)\s*#?\s*\d+\s*[:\-]\s*(.*)/i);
    const restOfHeader = headerMatch ? headerMatch[1].trim() : '';

    const fromOnMatch = restOfHeader.match(/(?:From\s+)?([^(\n-]+?)(?:\s*(?:\(|on\s+)([^)\n]+)\)?)?$/i);
    if (fromOnMatch) {
      if (fromOnMatch[1]) senderRaw = fromOnMatch[1].trim();
      if (fromOnMatch[2]) {
        dateRaw = fromOnMatch[2].trim();
        dateParsed = tryParseDate(dateRaw);
      }
    }

    body = lines.slice(1).join('\n').trim() || restOfHeader;
  }

  return {
    id,
    index,
    senderRaw,
    dateRaw,
    dateParsed,
    subject,
    body,
    raw,
    format,
    position: {
      lineStart,
      lineEnd,
      byteOffset
    }
  };
}

/**
 * Attempts to parse diverse date formats into an ISO 8601 string.
 * Returns null if the date cannot be reliably determined without guessing.
 */
export function tryParseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const clean = dateStr.trim().replace(/^\[|\]$/g, '').trim();

  // 1. Direct standard Date parse
  const direct = Date.parse(clean);
  if (!isNaN(direct)) {
    return new Date(direct).toISOString();
  }

  // 2. Match DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY with optional time
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const parsed = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  return null;
}
