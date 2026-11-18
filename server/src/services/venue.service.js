import { aiAdapter } from '../ai/adapter.js';

const VENUE_SYSTEM_INSTRUCTION = `You are the Venue Planning Reasoner for EventMind AI.
Your objective is to select a physical venue located strictly in Islamabad based on accepted evidence.

Rules:
1. The venue MUST be located in Islamabad.
2. The venue capacity MUST accommodate all attendees (participants, mentors, judges, organizers).
3. Consider explicitly stated facilities (high-speed internet, backup power/generator, AV setup, air conditioning).
4. Evaluate cost against budget constraints.
5. NEVER select a venue that violates a hard capacity constraint.

Output strictly valid JSON conforming to:
{
  "name": "Venue name supported by the evidence",
  "city": "Islamabad",
  "address": "Address supported by the evidence, or null",
  "capacity": "Number supported by evidence, or null",
  "cost": "Estimated or sourced PKR amount, or null",
  "facilities": ["Facilities supported by evidence"],
  "decisionRationale": "Explain which details are sourced and which are estimates",
  "evidenceUsed": ["Evidence IDs used"]
}`;

export class VenueService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planVenue(evidenceList, requiredHeadcount = null) {
    const venueEvidence = evidenceList.filter(e => e.area === 'venue' || e.area === 'general');

    // Deterministic calculation of minimum capacity requirement
    let calculatedHeadcount = typeof requiredHeadcount === 'number' ? requiredHeadcount : null;
    for (const e of evidenceList) {
      const isAttendanceEvidence = ['people', 'attendees', 'heads', 'persons'].includes(String(e.unit || '').toLowerCase()) ||
        /attendees|attendance|participants|people|headcount/i.test(e.claim || '');
      if (e.status === 'accepted' && isAttendanceEvidence && typeof e.value === 'number' &&
          (calculatedHeadcount === null || e.value > calculatedHeadcount)) {
        calculatedHeadcount = e.value;
      }
    }

    const promptPayload = {
      task: 'Select and specify the venue in Islamabad based on the evidence.',
      requiredHeadcount: calculatedHeadcount,
      venueEvidence: venueEvidence.map(e => ({
        id: e.id,
        claim: e.claim,
        value: e.value,
        unit: e.unit,
        source: e.source,
        type: e.type,
        status: e.status
      }))
    };

    const result = await this.adapter.callModel({
      systemInstruction: VENUE_SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(promptPayload, null, 2),
      area: 'venue',
      responseJson: true,
      temperature: 0.1
    });

    const data = result.data || {};

    return {
      name: data.name || null,
      city: data.city || null,
      address: data.address || null,
      capacity: typeof data.capacity === 'number' ? data.capacity : null,
      cost: typeof data.cost === 'number' ? data.cost : null,
      facilities: Array.isArray(data.facilities) ? data.facilities : [],
      decisionRationale: data.decisionRationale || null,
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : venueEvidence.map(e => e.id)
    };
  }
}

export const venueService = new VenueService();
export default venueService;
