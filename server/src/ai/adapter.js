import { GoogleGenAI } from '@google/genai';
import config from '../config.js';
import { tracer, ALLOWED_AREAS } from './tracer.js';

export class GeminiAdapter {
  constructor() {
    this.modelName = config.geminiModel;
    this.apiKey = config.geminiApiKey;
    this.client = null;

    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Refreshes client instance if environment or API key changed
   */
  refreshClient() {
    this.apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = config.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.client = null;
    }
  }

  /**
   * Sends actual content generation request to Gemini with strict telemetry logging
   */
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

    if (!this.client || !this.apiKey) {
      const errMessage = 'GEMINI_API_KEY is not configured in server environment or .env file.';
      tracer.recordCall({
        model: this.modelName,
        area,
        input: prompt,
        output: '',
        usageMetadata: null,
        status: 'error',
        warning: errMessage
      });
      throw new Error(errMessage);
    }

    const generationConfig = {
      temperature,
    };

    if (systemInstruction) {
      generationConfig.systemInstruction = systemInstruction;
    }

    if (responseJson) {
      generationConfig.responseMimeType = 'application/json';
    }

    // Wrap request with a strict timeout controller
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const callPromise = this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: generationConfig
      });

      const response = await Promise.race([callPromise, timeoutPromise]);

      const rawText = response.text || '';
      const usageMetadata = response.usageMetadata || null;
      const actualModel = response.modelVersion || this.modelName;

      // Truthfully record the actual call
      const traceEntry = tracer.recordCall({
        model: actualModel,
        area,
        input: prompt,
        output: rawText,
        usageMetadata,
        status: 'success'
      });

      let parsedData = null;
      if (responseJson && rawText) {
        try {
          parsedData = JSON.parse(rawText);
        } catch (jsonErr) {
          // If markdown-wrapped JSON was returned, strip fences
          const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
          parsedData = JSON.parse(cleaned);
        }
      }

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
      // Record failed model call truthfully in trace
      tracer.recordCall({
        model: this.modelName,
        area,
        input: prompt,
        output: err.message,
        usageMetadata: null,
        status: 'error',
        warning: `API Call Failed: ${err.message}`
      });

      // Enhance error with context
      if (err.status === 429 || err.message?.includes('429')) {
        throw new Error(`Gemini API Rate Limit Exceeded (429): ${err.message}`);
      }
      if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID')) {
        throw new Error(`Gemini Authentication Error: Verify GEMINI_API_KEY in .env. Details: ${err.message}`);
      }

      throw err;
    }
  }
}

export const aiAdapter = new GeminiAdapter();
export default aiAdapter;
