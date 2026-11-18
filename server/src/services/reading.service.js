import { aiAdapter } from '../ai/adapter.js';
import { evidenceService } from './evidence.service.js';

const READING_SYSTEM_INSTRUCTION = `You are the specialized Reading & Evidence Extraction Agent for EventMind AI (Mind to Machine Hackathon).
Your role is to strictly analyze raw event communication messages (in English and Roman Urdu) and extract structured evidence.
DO NOT CREATE THE COMPLETE FINAL EVENT PLAN.

Core Responsibilities:
1. Understand English and Roman Urdu (e.g., "khana", "biryani", "venue ka masla", "peshy", "waqt tabdeel", "budget barha do", "lakh", "peshy").
2. Extract facts, constraints, preferences, availability, and corrections.
3. Identify outdated information (earlier claims that were canceled or overridden by later authoritative messages).
4. Identify contradictory claims (claims conflicting with facts or hard constraints).
5. Identify irrelevant messages (chit-chat, sports scores, personal queries).
6. Identify potential incorrect information or hard-constraint violations (e.g. location outside Islamabad, extending beyond 4 hours).
7. Identify which of the 4 planning pillars are affected: "venue", "schedule", "food", "judging".
8. Return structured evidence with clear reasons.

Hard Event Constraints:
- Event MUST take place as a physical event in Islamabad.
- Total event duration MUST be strictly 4 hours (240 minutes).
- Catering MUST be 100% Halal.
- Budget calculations are deterministic and calculated in JavaScript.

Output Schema:
Respond with a strict JSON object conforming to this exact structure:
{
  "claims": [
    {
      "messageId": "string (matching source message id)",
      "area": "venue" | "schedule" | "food" | "judging" | "budget" | "general",
      "claim": "Clear concise statement of extracted claim",
      "value": number or null,
      "unit": string or null (e.g., "attendees", "minutes", "PKR", "people"),
      "source": "Sender name or role",
      "date": "Extracted date/time or null",
      "type": "fact" | "request" | "constraint" | "preference" | "availability" | "correction" | "irrelevant",
      "status": "accepted" | "superseded" | "rejected" | "uncertain" | "irrelevant",
      "confidence": number between 0.0 and 1.0,
      "reason": "Explanation if rejected, superseded, uncertain, or irrelevant; else null"
    }
  ],
  "rejectedClaims": [
    {
      "messageId": "string",
      "claim": "string",
      "reason": "Detailed explanation of why this claim is rejected, contradictory, or invalid"
    }
  ],
  "affectedAreas": ["venue", "schedule", "food", "judging"],
  "readingSummary": "Concise summary of findings from the messages"
}`;

export class ReadingService {
  constructor(adapter = aiAdapter, evidence = evidenceService) {
    this.adapter = adapter;
    this.evidence = evidence;
  }

  /**
   * Executes the reading call on target messages
   */
  async analyzeMessages(messages, existingEvidence = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        claims: [],
        rejectedClaims: [],
        affectedAreas: [],
        readingSummary: 'No messages provided to analyze.'
      };
    }

    const formattedMessages = messages.map(m => ({
      messageId: m.id,
      index: m.index,
      sender: m.senderRaw || 'Unknown',
      date: m.dateRaw || 'Unknown',
      format: m.format,
      text: m.body || m.raw
    }));

    const userPrompt = JSON.stringify({
      task: 'Analyze the following incoming messages, extract structured evidence claims, detect contradictions or invalid claims, and predict affected planning areas.',
      incomingMessages: formattedMessages,
      existingAcceptedEvidence: existingEvidence.map(e => ({
        id: e.id,
        area: e.area,
        claim: e.claim,
        status: e.status,
        source: e.source
      }))
    }, null, 2);

    const result = await this.adapter.callModel({
      systemInstruction: READING_SYSTEM_INSTRUCTION,
      prompt: userPrompt,
      area: 'reading',
      responseJson: true,
      temperature: 0.1
    });

    const parsed = result.data || {};
    const extractedClaims = Array.isArray(parsed.claims) ? parsed.claims : [];
    const rejectedClaims = Array.isArray(parsed.rejectedClaims) ? parsed.rejectedClaims : [];
    const affectedAreas = Array.isArray(parsed.affectedAreas) ? parsed.affectedAreas : [];
    const summary = parsed.readingSummary || '';

    // Register extracted claims into evidence service
    const registeredClaims = this.evidence.addClaims(extractedClaims);

    // Save evidence and rejected logs
    this.evidence.save();

    return {
      success: true,
      model: result.model,
      usage: result.usage,
      claims: registeredClaims,
      rejectedClaims,
      affectedAreas,
      summary
    };
  }
}

export const readingService = new ReadingService();
export default readingService;
