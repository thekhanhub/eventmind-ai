import fs from 'fs';
import path from 'path';
import config from '../config.js';

export const ALLOWED_AREAS = ['reading', 'venue', 'schedule', 'food', 'judging', 'budget'];

export class ModelTracer {
  constructor(tracePath = config.paths.trace) {
    this.tracePath = tracePath;
    this.entries = [];
    this.currentRunId = `run_${Date.now()}`;
    this.callCounter = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalTokens = 0;
  }

  /**
   * Resets trace for a new execution run while maintaining runId
   */
  startNewRun(customRunId = null) {
    this.currentRunId = customRunId || `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.callCounter = 0;
    this.entries = [];
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalTokens = 0;
  }

  /**
   * Records a truthful model call entry.
   * Uses real provider-reported token metadata. Never fabricates token numbers.
   */
  recordCall({
    model,
    area,
    input,
    output,
    latencyMs = null,
    usageMetadata = null,
    status = 'success',
    warning = null
  }) {
    if (!ALLOWED_AREAS.includes(area)) {
      throw new Error(`Invalid area tag: '${area}'. Allowed areas: ${ALLOWED_AREAS.join(', ')}`);
    }

    this.callCounter += 1;

    let inputTokens = null;
    let outputTokens = null;
    let callTotalTokens = null;
    let tokenWarning = warning;

    // Strict token integrity: only real provider metadata
    if (usageMetadata && typeof usageMetadata === 'object') {
      if (typeof usageMetadata.promptTokenCount === 'number') {
        inputTokens = usageMetadata.promptTokenCount;
      }
      if (typeof usageMetadata.candidatesTokenCount === 'number') {
        outputTokens = usageMetadata.candidatesTokenCount;
      }
      if (typeof usageMetadata.totalTokenCount === 'number') {
        callTotalTokens = usageMetadata.totalTokenCount;
      } else if (inputTokens !== null && outputTokens !== null) {
        callTotalTokens = inputTokens + outputTokens;
      }
    }

    if (inputTokens === null || outputTokens === null) {
      tokenWarning = tokenWarning 
        ? `${tokenWarning}; Provider token usage metadata was unavailable.` 
        : 'Provider token usage metadata was unavailable.';
    } else {
      this.totalInputTokens += inputTokens;
      this.totalOutputTokens += outputTokens;
      this.totalTokens += callTotalTokens || (inputTokens + outputTokens);
    }

    const entry = {
      callNumber: this.callCounter,
      runId: this.currentRunId,
      model: model || config.geminiModel,
      area,
      input: typeof input === 'string' ? input : JSON.stringify(input, null, 2),
      output: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
      inputTokens,
      outputTokens,
      totalTokens: callTotalTokens,
      status,
      latencyMs,
      timestamp: new Date().toISOString()
    };

    if (tokenWarning) {
      entry.warning = tokenWarning;
    }

    this.entries.push(entry);
    this.save();
    return entry;
  }

  /**
   * Returns complete telemetry and call history
   */
  getSummary() {
    return {
      runId: this.currentRunId,
      totalCalls: this.entries.length,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalTokens: this.totalTokens,
      entries: [...this.entries]
    };
  }

  /**
   * Persists trace to output/trace.json
   */
  save(customPath = null) {
    const targetPath = customPath || this.tracePath;
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      runId: this.currentRunId,
      updatedAt: new Date().toISOString(),
      totalCalls: this.entries.length,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalTokens: this.totalTokens,
      trace: this.entries
    };

    fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf-8');
    return payload;
  }

  /**
   * Loads trace from disk
   */
  load(customPath = null) {
    const targetPath = customPath || this.tracePath;
    if (!fs.existsSync(targetPath)) return false;

    try {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      this.currentRunId = data.runId || this.currentRunId;
      this.entries = Array.isArray(data.trace) ? data.trace : [];
      this.callCounter = this.entries.length;
      this.totalInputTokens = data.totalInputTokens || 0;
      this.totalOutputTokens = data.totalOutputTokens || 0;
      this.totalTokens = data.totalTokens || 0;
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    this.entries = [];
    this.callCounter = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalTokens = 0;
  }
}

export const tracer = new ModelTracer();
export default tracer;
