import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import config from '../src/config.js';
import app from '../src/index.js';

test('Configuration loads with valid structure and paths', () => {
  assert.ok(config.port, 'Port must be defined');
  assert.ok(config.geminiModel, 'Gemini model must be defined');
  assert.strictEqual(typeof config.geminiModel, 'string');
  assert.ok(config.paths.messages, 'Messages path must be configured');
  assert.ok(config.paths.outputDir, 'Output directory path must be configured');
});

test('Placeholder data directory and messages file exist', () => {
  assert.ok(fs.existsSync(config.paths.messages), 'data/messages.txt must exist');
});

test('Express app exports valid request handler', () => {
  assert.strictEqual(typeof app, 'function', 'App must be an Express request handler function');
});

test('GET /api/health returns healthy status and metadata', async () => {
  let statusCode = 200;
  let responseData = null;

  const req = { 
    method: 'GET', 
    url: '/api/health',
    headers: {} 
  };
  const res = {
    statusCode: 200,
    setHeader: () => {},
    getHeader: () => {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    send(data) {
      responseData = data;
      return this;
    }
  };

  await new Promise((resolve) => {
    app.handle(req, res, () => resolve());
    if (responseData) resolve();
  });

  assert.strictEqual(statusCode, 200);
  assert.ok(responseData, 'Response data must not be empty');
  assert.strictEqual(responseData.status, 'healthy');
  assert.strictEqual(responseData.version, '1.0.0');
  assert.strictEqual(responseData.model, config.geminiModel);
  assert.strictEqual(typeof responseData.storage, 'object');
  assert.strictEqual(responseData.storage.messagesExists, true);
  assert.strictEqual(
    responseData.storage.messagesEmpty,
    fs.readFileSync(config.paths.messages, 'utf-8').trim().length === 0
  );
});
