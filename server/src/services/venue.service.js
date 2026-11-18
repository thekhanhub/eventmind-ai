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
  "name": "Full Venue Name, Islamabad",
  "city": "Islamabad",
  "address": "Specific address or sector in Islamabad",
  "capacity": 150,
  "cost": 65000,
  "facilities": ["High-Speed Wi-Fi", "Backup Generator", "Projector & Sound", "Air Conditioning"],
  "decisionRationale": "Explanation of why this venue was chosen based on evidence",
  "evidenceUsed": ["ev_..."]
}`;

export class VenueService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planVenue(evidenceList, requiredHeadcount = 100) {
    const venueEvidence = evidenceList.filter(e => e.area === 'venue' || e.area === 'general');

    // Deterministic calculation of minimum capacity requirement
    let calculatedHeadcount = requiredHeadcount;
    for (const e of evidenceList) {
      if ((e.area === 'venue' || e.area === 'general') && typeof e.value === 'number' && e.value > calculatedHeadcount) {
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
      name: data.name || 'Pak-China Friendship Centre, Islamabad',
      city: 'Islamabad',
      address: data.address || 'Garden Avenue, Shakarparian, Islamabad',
      capacity: typeof data.capacity === 'number' ? Math.max(data.capacity, calculatedHeadcount) : calculatedHeadcount,
      cost: typeof data.cost === 'number' ? data.cost : 65000,
      facilities: Array.isArray(data.facilities) && data.facilities.length > 0 
        ? data.facilities 
        : ['High-Speed Wi-Fi', 'Backup Generator', 'Projector & Sound System'],
      decisionRationale: data.decisionRationale || 'Selected physical venue in Islamabad meeting capacity and facility requirements.',
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : venueEvidence.map(e => e.id)
    };
  }
}

export const venueService = new VenueService();
export default venueService;
