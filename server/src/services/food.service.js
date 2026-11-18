import { aiAdapter } from '../ai/adapter.js';

const FOOD_SYSTEM_INSTRUCTION = `You are the Catering & Food Planning Reasoner for EventMind AI.
Your objective is to plan refreshments or a meal for a 4-hour physical hackathon in Islamabad based on evidence.

Rules:
1. Determine order quantity from the required attendance. NEVER reduce order below required headcount.
2. The food MUST be 100% Halal. Include vegetarian options.
3. Align the menu type with the event window (e.g. Hi-Tea / Evening Refreshments, Lunch, or Dinner).
4. Extract or specify realistic cost per head in PKR.
5. Provide an itemized menu list matching Pakistani catering standards (e.g. patties, samosas/spring rolls, sandwiches, sweets, tea/green tea).

Output strictly valid JSON conforming to:
{
  "caterer": "Caterer Name, Islamabad",
  "menuType": "Hi-Tea & Refreshments" | "Lunch" | "Dinner",
  "items": ["Chicken Patties", "Vegetable Spring Rolls", "Sandwiches", "Gulab Jamun", "Karak Chai & Green Tea", "Mineral Water"],
  "dietary": "100% Halal; vegetarian options included",
  "costPerHead": 850,
  "decisionRationale": "Explanation of menu choice and quantities based on evidence",
  "evidenceUsed": ["ev_..."]
}`;

export class FoodService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planFood(evidenceList, requiredHeadcount = 100) {
    const foodEvidence = evidenceList.filter(e => e.area === 'food' || e.area === 'general');

    // Deterministic calculation of headcount from evidence
    let confirmedHeadcount = requiredHeadcount;
    for (const e of evidenceList) {
      if ((e.area === 'food' || e.area === 'venue' || e.area === 'general') && typeof e.value === 'number') {
        if (e.unit === 'people' || e.unit === 'attendees' || e.unit === 'heads' || e.unit === 'persons') {
          confirmedHeadcount = Math.max(confirmedHeadcount, e.value);
        }
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
    const costPerHead = typeof data.costPerHead === 'number' && data.costPerHead > 0 ? data.costPerHead : 850;
    
    // Deterministic JS calculation of total food cost (Never AI arithmetic)
    const totalFoodCost = confirmedHeadcount * costPerHead;

    return {
      caterer: data.caterer || 'Islamabad Gourmet Catering',
      menuType: data.menuType || 'Hi-Tea & Evening Refreshments',
      items: Array.isArray(data.items) && data.items.length > 0 
        ? data.items 
        : ['Chicken Patties', 'Vegetable Spring Rolls', 'Club Sandwiches', 'Gulab Jamun', 'Karak Chai & Green Tea', 'Mineral Water'],
      dietary: data.dietary || '100% Halal; vegetarian options included',
      orderHeadcount: confirmedHeadcount,
      costPerHead,
      totalFoodCost,
      decisionRationale: data.decisionRationale || `Catering planned for ${confirmedHeadcount} attendees at ${costPerHead} PKR per head.`,
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : foodEvidence.map(e => e.id)
    };
  }
}

export const foodService = new FoodService();
export default foodService;
