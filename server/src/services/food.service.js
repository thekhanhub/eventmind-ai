import { aiAdapter } from '../ai/adapter.js';

const FOOD_SYSTEM_INSTRUCTION = `You are the Catering & Food Planning Reasoner for EventMind AI.
Your objective is to plan refreshments or a meal for a 4-hour physical hackathon in Islamabad based on evidence.

Rules:
1. Determine order quantity from the required attendance. NEVER reduce order below required headcount.
2. The food MUST be 100% Halal. Include vegetarian options.
3. Align the menu type with the event window (e.g. Hi-Tea / Evening Refreshments, Lunch, or Dinner).
4. If no sourced price is provided, return a clearly identified estimate in PKR per head.
5. Provide a menu that reflects the evidence and event window; do not copy example menus.

Output strictly valid JSON conforming to:
{
  "caterer": "Caterer supported by the evidence, or null",
  "menuType": "Recommended meal or refreshments type",
  "items": ["Menu items supported by the event context"],
  "dietary": "Confirm 100% Halal and list any stated dietary accommodations",
  "costPerHead": null,
  "decisionRationale": "State whether the price is sourced or an estimate and explain the choice",
  "evidenceUsed": ["Evidence IDs used"]
}`;

export class FoodService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planFood(evidenceList, requiredHeadcount = null) {
    const foodEvidence = evidenceList.filter(e => e.area === 'food' || e.area === 'general');

    // Deterministic calculation of headcount from evidence
    let confirmedHeadcount = typeof requiredHeadcount === 'number' ? requiredHeadcount : null;
    for (const e of evidenceList) {
      const isHeadcount = ['people', 'attendees', 'heads', 'persons'].includes(String(e.unit || '').toLowerCase()) ||
        /attendees|attendance|participants|people|headcount/i.test(e.claim || '');
      if (e.status === 'accepted' && isHeadcount && typeof e.value === 'number' &&
          (confirmedHeadcount === null || e.value > confirmedHeadcount)) {
        confirmedHeadcount = e.value;
      }
    }

    const promptPayload = {
      task: 'Plan the catering menu, cost per head, and dietary specifications based on evidence.',
      requiredHeadcount: confirmedHeadcount,
      foodEvidence: foodEvidence.map(e => ({
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
      systemInstruction: FOOD_SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(promptPayload, null, 2),
      area: 'food',
      responseJson: true,
      temperature: 0.1
    });

    const data = result.data || {};
    const sourcedUnitCost = evidenceList.find(e => e.status === 'accepted' &&
      typeof e.value === 'number' && e.value > 0 &&
      (e.unit === 'PKR/head' || e.unit === 'PKR per head' ||
        (/food|catering|meal/i.test(e.claim || '') && /per head|each person/i.test(e.claim || ''))));
    const costPerHead = typeof data.costPerHead === 'number' && data.costPerHead > 0
      ? data.costPerHead
      : sourcedUnitCost?.value ?? null;
    
    // Deterministic JS calculation of total food cost (Never AI arithmetic)
    const totalFoodCost = typeof confirmedHeadcount === 'number' && typeof costPerHead === 'number'
      ? confirmedHeadcount * costPerHead
      : null;

    return {
      caterer: data.caterer || null,
      menuType: data.menuType || null,
      items: Array.isArray(data.items) ? data.items : [],
      dietary: data.dietary || null,
      orderHeadcount: confirmedHeadcount,
      costPerHead,
      totalFoodCost,
      decisionRationale: data.decisionRationale || null,
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : foodEvidence.map(e => e.id)
    };
  }
}

export const foodService = new FoodService();
export default foodService;
