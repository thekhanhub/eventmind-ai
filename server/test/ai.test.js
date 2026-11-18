import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ModelTracer, ALLOWED_AREAS } from '../src/ai/tracer.js';
import { GeminiAdapter } from '../src/ai/adapter.js';
import config from '../src/config.js';

test('ModelTracer strictly enforces allowed area taxonomy', () => {
  const tmpTracePath = path.join(os.tmpdir(), `test-trace-${Date.now()}.json`);
  const tracer = new ModelTracer(tmpTracePath);

  // Allowed areas
  ALLOWED_AREAS.forEach(area => {
    const entry = tracer.recordCall({
      model: 'gemini-2.0-flash',
      area,
      input: 'Test input',
      output: 'Test output',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
    });
    assert.strictEqual(entry.area, area);
    assert.strictEqual(entry.status, 'success');
  });

  // Invalid area throws error
  assert.throws(() => {
    tracer.recordCall({
      model: 'gemini-2.0-flash',
      area: 'invalid_area',
      input: 'Test',
      output: 'Test'
    });
  }, /Invalid area tag/);

  // Clean up
  if (fs.existsSync(tmpTracePath)) fs.unlinkSync(tmpTracePath);
});

test('ModelTracer preserves token integrity without fabricating numbers', () => {
  const tmpTracePath = path.join(os.tmpdir(), `test-tokens-${Date.now()}.json`);
  const tracer = new ModelTracer(tmpTracePath);

  // Call 1: Real usage metadata provided
  const entry1 = tracer.recordCall({
    model: 'gemini-2.0-flash',
    area: 'reading',
    input: 'Input 1',
    output: 'Output 1',
    usageMetadata: {
      promptTokenCount: 120,
      candidatesTokenCount: 45,
      totalTokenCount: 165
    }
  });

  assert.strictEqual(entry1.inputTokens, 120);
  assert.strictEqual(entry1.outputTokens, 45);
  assert.strictEqual(entry1.totalTokens, 165);
  assert.strictEqual(entry1.callNumber, 1);

  // Call 2: Usage metadata missing (never fabricates estimates)
  const entry2 = tracer.recordCall({
    model: 'gemini-2.0-flash',
    area: 'venue',
    input: 'Input 2',
    output: 'Output 2',
    usageMetadata: null
  });

  assert.strictEqual(entry2.inputTokens, null);
  assert.strictEqual(entry2.outputTokens, null);
  assert.strictEqual(entry2.totalTokens, null);
  assert.ok(entry2.warning.includes('unavailable'));

  // Summary aggregates only real measured tokens
  const summary = tracer.getSummary();
  assert.strictEqual(summary.totalCalls, 2);
  assert.strictEqual(summary.totalInputTokens, 120);
  assert.strictEqual(summary.totalOutputTokens, 45);
  assert.strictEqual(summary.totalTokens, 165);

  // Clean up
  if (fs.existsSync(tmpTracePath)) fs.unlinkSync(tmpTracePath);
});

test('GeminiAdapter handles missing API key cleanly and logs error trace', async () => {
  const adapter = new GeminiAdapter();
  const originalConfigKey = config.geminiApiKey;
  const originalEnvKey = process.env.GEMINI_API_KEY;
  config.geminiApiKey = '';
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      async () => {
        await adapter.callModel({
          prompt: 'Hello',
          area: 'reading'
        });
      },
      /GEMINI_API_KEY is not configured/
    );
  } finally {
    config.geminiApiKey = originalConfigKey;
    if (originalEnvKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalEnvKey;
  }
});
