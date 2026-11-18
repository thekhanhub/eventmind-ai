import express from 'express';
import fs from 'fs';
import config from '../config.js';
import { processMessages } from '../core/engine.js';

const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  let isDataEmpty = true;
  if (fs.existsSync(config.paths.messages)) {
    const content = fs.readFileSync(config.paths.messages, 'utf-8');
    isDataEmpty = content.trim().length === 0;
  }

  res.json({
    status: 'healthy',
    version: '1.0.0',
    model: config.geminiModel,
    serverTime: new Date().toISOString(),
    warnings: config.warnings,
    storage: {
      planExists: fs.existsSync(config.paths.plan),
      traceExists: fs.existsSync(config.paths.trace),
      rejectedExists: fs.existsSync(config.paths.rejected),
      messagesExists: fs.existsSync(config.paths.messages),
      messagesEmpty: isDataEmpty
    }
  });
});

// GET /api/plan
router.get('/plan', (req, res) => {
  if (!fs.existsSync(config.paths.plan)) {
    return res.status(404).json({ error: 'No plan generated yet. Run initial processing first.' });
  }
  try {
    const plan = JSON.parse(fs.readFileSync(config.paths.plan, 'utf-8'));
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read plan.json', details: err.message });
  }
});

// GET /api/trace
router.get('/trace', (req, res) => {
  if (!fs.existsSync(config.paths.trace)) {
    return res.json({ totalCalls: 0, totalTokens: 0, trace: [] });
  }
  try {
    const trace = JSON.parse(fs.readFileSync(config.paths.trace, 'utf-8'));
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read trace.json', details: err.message });
  }
});

// GET /api/rejected
router.get('/rejected', (req, res) => {
  if (!fs.existsSync(config.paths.rejected)) {
    return res.json({ count: 0, rejected: [] });
  }
  try {
    const rejected = JSON.parse(fs.readFileSync(config.paths.rejected, 'utf-8'));
    res.json(rejected);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read rejected.json', details: err.message });
  }
});

// POST /api/process/initial
router.post('/process/initial', async (req, res) => {
  try {
    const { rawText, filePath } = req.body || {};
    const result = await processMessages({ rawText, filePath, isUpdate: false });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/process/update
router.post('/process/update', async (req, res) => {
  try {
    const { rawText, filePath } = req.body || {};
    const result = await processMessages({ rawText, filePath, isUpdate: true });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
