import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseRawMessages, tryParseDate } from '../src/utils/message-parser.js';
import { MessageReaderService } from '../src/services/message-reader.service.js';
import { EvidenceService, VALID_AREAS, VALID_TYPES, VALID_STATUSES } from '../src/services/evidence.service.js';

test('Date Parser handles multiple common formats without guessing', () => {
  // ISO standard
  assert.strictEqual(tryParseDate('2026-10-15T14:30:00Z'), '2026-10-15T14:30:00.000Z');

  // DD/MM/YYYY with time
  const parsedDmy = tryParseDate('15/10/2026, 14:30');
  assert.ok(parsedDmy);
  assert.ok(parsedDmy.startsWith('2026-10-15'));

  // Written month format
  const parsedWritten = tryParseDate('15 Oct 2026 10:00:00');
  assert.ok(parsedWritten);

  // Invalid / gibberish date returns null (never guesses or invents)
  assert.strictEqual(tryParseDate('kal subah 10 baje'), null);
  assert.strictEqual(tryParseDate(''), null);
  assert.strictEqual(tryParseDate(null), null);
});

test('Message Parser extracts WhatsApp, Email, Notice, and Unstructured formats', () => {
  const sampleInput = `[12/10/2026, 10:15 AM] Lead Organizer: Team, we need a 4-hour venue in Islamabad with high-speed internet.

12/10/2026, 11:30 AM - Logistics Lead: Hall availability checked for 150 attendees. Budget ceiling is 250k PKR.

From: Catering Lead <food@event.org>
Date: 13 Oct 2026 09:00:00
Subject: Menu Update
Khanay ka intezam biryani aur hi-tea ka hoga. 100% Halal catering required.

Notice #1 - Organizing Team (14 Oct 2026)
Schedule must strictly be 4 hours. No extensions allowed.

Bhai match kis time shuru hoga? Anyone watching the cricket final?`;

  const messages = parseRawMessages(sampleInput);

  assert.strictEqual(messages.length, 5);

  // Message 1: WhatsApp with bracket
  assert.strictEqual(messages[0].format, 'whatsapp');
  assert.strictEqual(messages[0].senderRaw, 'Lead Organizer');
  assert.strictEqual(messages[0].dateRaw, '12/10/2026, 10:15 AM');
  assert.ok(messages[0].dateParsed);
  assert.strictEqual(messages[0].body, 'Team, we need a 4-hour venue in Islamabad with high-speed internet.');
  assert.ok(messages[0].id.startsWith('msg_'));
  assert.strictEqual(messages[0].position.lineStart, 1);

  // Message 2: WhatsApp with dash
  assert.strictEqual(messages[1].format, 'whatsapp');
  assert.strictEqual(messages[1].senderRaw, 'Logistics Lead');
  assert.ok(messages[1].body.includes('150 attendees'));

  // Message 3: Email with headers
  assert.strictEqual(messages[2].format, 'email');
  assert.ok(messages[2].senderRaw.includes('food@event.org'));
  assert.strictEqual(messages[2].subject, 'Menu Update');
  assert.ok(messages[2].body.includes('Khanay ka intezam'));

  // Message 4: Notice
  assert.strictEqual(messages[3].format, 'notice');
  assert.ok(messages[3].body.includes('strictly be 4 hours'));

  // Message 5: Unstructured casual / irrelevant
  assert.strictEqual(messages[4].format, 'unstructured');
  assert.ok(messages[4].body.includes('match kis time'));

  // Check all IDs are unique and stable
  const ids = new Set(messages.map(m => m.id));
  assert.strictEqual(ids.size, 5);
});

test('Message Parser preserves bilingual English and Roman Urdu without alterations', () => {
  const romanUrduText = `[14/10/2026, 16:00] Shah Zaib: Venue final ho gaya hai Islamabad mein. Bijli aur internet ka backup available hai.
Pehlay wala proposal cancel samjho.`;

  const parsed = parseRawMessages(romanUrduText);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].senderRaw, 'Shah Zaib');
  assert.strictEqual(parsed[0].raw, romanUrduText);
  assert.ok(parsed[0].body.includes('Venue final ho gaya hai'));
  assert.ok(parsed[0].body.includes('cancel samjho'));
});

test('Evidence Service enforces strict schema and status transitions', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-test-'));
  const storagePath = path.join(tmpDir, 'evidence.json');
  const rejectedPath = path.join(tmpDir, 'rejected.json');

  const evidence = new EvidenceService(storagePath, rejectedPath);

  // 1. Add valid accepted claims across areas
  const claims = evidence.addClaims([
    {
      messageId: 'msg_001',
      area: 'venue',
      claim: 'Event must be a physical gathering in Islamabad with 150 capacity',
      value: 150,
      unit: 'people',
      source: 'Lead Organizer',
      date: '2026-10-12T10:15:00.000Z',
      type: 'constraint',
      status: 'accepted',
      confidence: 0.95
    },
    {
      messageId: 'msg_001',
      area: 'schedule',
      claim: 'Event duration is strictly 4 hours (240 minutes)',
      value: 240,
      unit: 'minutes',
      source: 'Lead Organizer',
      date: '2026-10-12T10:15:00.000Z',
      type: 'constraint',
      status: 'accepted',
      confidence: 1.0
    },
    {
      messageId: 'msg_002',
      area: 'food',
      claim: 'Hi-tea and dinner with 100% Halal catering',
      value: null,
      unit: null,
      source: 'Catering Lead',
      type: 'request',
      status: 'accepted',
      confidence: 0.9
    },
    {
      messageId: 'msg_003',
      area: 'venue',
      claim: 'We could move the event to Lahore Expo Centre',
      source: 'Participant query',
      type: 'preference',
      status: 'rejected',
      reason: 'Violates hard constraint: Must be in Islamabad'
    },
    {
      messageId: 'msg_004',
      area: 'general',
      claim: 'Anyone watching the cricket match tonight?',
      source: 'Anonymous',
      type: 'irrelevant',
      status: 'irrelevant',
      reason: 'Unrelated conversational chit-chat'
    },
    {
      messageId: 'msg_005',
      area: 'judging',
      claim: 'Maybe 3 judges or maybe 5, not confirmed yet',
      source: 'Mentor',
      type: 'availability',
      status: 'uncertain',
      confidence: 0.4,
      reason: 'Unconfirmed participant speculation'
    }
  ]);

  assert.strictEqual(claims.length, 6);

  // 2. Query by status
  const accepted = evidence.getAcceptedEvidence();
  assert.strictEqual(accepted.length, 3);

  const rejected = evidence.getRejectedEvidence();
  assert.strictEqual(rejected.length, 2); // 1 rejected + 1 irrelevant

  const uncertain = evidence.getUncertainEvidence();
  assert.strictEqual(uncertain.length, 1);

  // 3. Status transition: Supersede an earlier claim
  const venueClaim = evidence.getAcceptedEvidence('venue')[0];
  evidence.updateClaimStatus(venueClaim.id, 'superseded', 'Overridden by later authoritative lead update');

  const updatedVenue = evidence.getAcceptedEvidence('venue');
  assert.strictEqual(updatedVenue.length, 0);

  // 4. Persistence to JSON
  evidence.save();
  assert.ok(fs.existsSync(storagePath));
  assert.ok(fs.existsSync(rejectedPath));

  const savedData = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
  assert.strictEqual(savedData.totalClaims, 6);

  const savedRejected = JSON.parse(fs.readFileSync(rejectedPath, 'utf-8'));
  assert.strictEqual(savedRejected.count, 2);

  // 5. Reload into new instance
  const reloaded = new EvidenceService(storagePath, rejectedPath);
  assert.ok(reloaded.load());
  assert.strictEqual(reloaded.claims.size, 6);
  assert.strictEqual(reloaded.getRejectedEvidence().length, 2);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Message Reader detects newly appended messages without re-reading history', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-test-'));
  const msgFile = path.join(tmpDir, 'messages.txt');
  const histFile = path.join(tmpDir, 'history.json');

  const reader = new MessageReaderService(msgFile, histFile);

  // 1. Initial 2 messages written
  const initialContent = `[12/10/2026, 10:00] Asif: Venue is Islamabad.

[12/10/2026, 11:00] Uzair: Schedule is 4 hours.`;

  fs.writeFileSync(msgFile, initialContent, 'utf-8');

  const run1 = reader.readDelta();
  assert.strictEqual(run1.totalCount, 2);
  assert.strictEqual(run1.newCount, 2);
  assert.strictEqual(run1.existingCount, 0);

  // Commit history
  reader.commitHistory(run1.newMessages.map(m => m.id));

  // 2. Append 1 new message to the existing file
  const appendedContent = initialContent + `\n\n[12/10/2026, 12:00] Shah Zaib: Catering budget is 100k PKR.`;
  fs.writeFileSync(msgFile, appendedContent, 'utf-8');

  const run2 = reader.readDelta();
  assert.strictEqual(run2.totalCount, 3);
  assert.strictEqual(run2.existingCount, 2);
  assert.strictEqual(run2.newCount, 1);
  assert.strictEqual(run2.newMessages[0].senderRaw, 'Shah Zaib');

  // Verify non-destructive reading
  const finalFileContent = fs.readFileSync(msgFile, 'utf-8');
  assert.strictEqual(finalFileContent, appendedContent);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
