import { GoogleGenAI } from '@google/genai';
import config from '../config.js';
import { tracer, ALLOWED_AREAS } from './tracer.js';
import { getRemainingRuntimeMs } from './runtime-context.js';

export class GeminiAdapter {
  constructor() {
    this.modelName = config.geminiModel;
    this.apiKey = config.geminiApiKey;
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  refreshClient() {
    this.apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || config.geminiModel || 'gemini-3.8-flash';
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  /** Sends one real Gemini request and records the exact request, response, latency and provider token counts. */
  async callModel({
    systemInstruction = '',
    prompt,
    area,
    responseJson = true,
    temperature = 0.1,
    timeoutMs = 60000
  }) {
    if (!ALLOWED_AREAS.includes(area)) {
      throw new Error(`Area '${area}' is not an allowed area tag. Allowed: ${ALLOWED_AREAS.join(', ')}`);
    }

    this.refreshClient();

    const generationConfig = {};
    // Gemini 3 models no longer accept temperature/top_p/top_k sampling settings.
    if (!/^gemini-3(?:\.|$)/i.test(this.modelName)) {
      generationConfig.temperature = temperature;
    }
    if (systemInstruction) generationConfig.systemInstruction = systemInstruction;
    if (responseJson) generationConfig.responseMimeType = 'application/json';

    const requestInput = {
      model: this.modelName,
      contents: prompt,
      config: generationConfig
    };
    const startedAt = Date.now();

    if (!this.client || !this.apiKey) {
      const errMessage = 'GEMINI_API_KEY is not configured in server environment or .env file.';
      tracer.recordCall({
        model: this.modelName,
        area,
        input: requestInput,
        output: '',
        latencyMs: Date.now() - startedAt,
        status: 'error',
        warning: errMessage
      });
      throw new Error(errMessage);
    }

    const remainingMs = getRemainingRuntimeMs();
    if (remainingMs <= 0) {
      const errMessage = 'The processing runtime limit was reached before the Gemini request started.';
      tracer.recordCall({
        model: this.modelName,
        area,
        input: requestInput,
        output: '',
        latencyMs: Date.now() - startedAt,
        status: 'error',
        warning: errMessage
      });
      throw new Error(errMessage);
    }

    const effectiveTimeoutMs = Math.max(1, Math.min(timeoutMs, remainingMs));
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), effectiveTimeoutMs);
    let recorded = false;
    let rawText = '';
    let usageMetadata = null;

    const callWithRetry = async (retriesLeft = 2) => {
      try {
        return await this.client.models.generateContent({
          ...requestInput,
          abortSignal: abortController.signal
        });
      } catch (err) {
        const isTransient = err.status === 503 || err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.status === 429 || err.message?.includes('429');
        if (isTransient && retriesLeft > 0 && !abortController.signal.aborted) {
          console.warn(`[Gemini Adapter] Transient API response (${err.message || err.status}). Retrying in 2000ms (${retriesLeft} retries left)...`);
          await new Promise(r => setTimeout(r, 2000));
          return callWithRetry(retriesLeft - 1);
        }
        throw err;
      }
    };

    try {
      const response = await callWithRetry(2);

      rawText = response.text || '';
      usageMetadata = response.usageMetadata || null;
      const actualModel = response.modelVersion || this.modelName;
      let parsedData = null;

      if (responseJson && rawText) {
        try {
          parsedData = JSON.parse(rawText);
        } catch {
          const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
          try {
            parsedData = JSON.parse(cleaned);
          } catch {
            const parseError = new Error('Gemini returned a response that was not valid JSON.');
            tracer.recordCall({
              model: actualModel,
              area,
              input: requestInput,
              output: rawText,
              usageMetadata,
              latencyMs: Date.now() - startedAt,
              status: 'error',
              warning: parseError.message
            });
            recorded = true;
            throw parseError;
          }
        }
      }

      const traceEntry = tracer.recordCall({
        model: actualModel,
        area,
        input: requestInput,
        output: rawText,
        usageMetadata,
        latencyMs: Date.now() - startedAt,
        status: 'success'
      });
      recorded = true;

      return {
        success: true,
        text: rawText,
        data: parsedData,
        model: actualModel,
        traceEntry,
        usage: {
          inputTokens: traceEntry.inputTokens,
          outputTokens: traceEntry.outputTokens,
          totalTokens: traceEntry.totalTokens
        }
      };
    } catch (err) {
      if (!recorded) {
        const error = abortController.signal.aborted
          ? new Error(`Gemini request timed out after ${effectiveTimeoutMs}ms`)
          : err;
        tracer.recordCall({
          model: this.modelName,
          area,
          input: requestInput,
          output: error.message,
          latencyMs: Date.now() - startedAt,
          status: 'error',
          warning: `API call failed: ${error.message}`
        });
        err = error;
      }

      if (err.status === 429 || err.message?.includes('429')) {
        throw new Error(`Gemini API rate limit exceeded (429): ${err.message}`);
      }
      if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID')) {
        throw new Error(`Gemini authentication error: Verify GEMINI_API_KEY in .env. Details: ${err.message}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const aiAdapter = new GeminiAdapter();
export default aiAdapter;
