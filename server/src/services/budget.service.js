/**
 * Deterministic Budget Calculation Engine (0 AI Model Calls)
 * Computes all figures using exact JavaScript arithmetic.
 */
export class BudgetService {
  /**
   * Calculates the itemized and aggregate event budget deterministically
   */
  calculateBudget({
    venue = {},
    food = {},
    judging = {},
    evidenceList = [],
    defaultCap = 250000
  } = {}) {
    // 1. Identify budget cap from evidence (if explicitly specified)
    let budgetCap = defaultCap;
    for (const e of evidenceList) {
      if ((e.area === 'budget' || e.area === 'general') && e.status === 'accepted') {
        if (typeof e.value === 'number' && e.value > 50000) {
          budgetCap = e.value;
          break;
        }
        // Match PKR patterns in claim text (e.g. 250k, 250,000, 3 lakh)
        const lakhMatch = e.claim.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
        if (lakhMatch) {
          budgetCap = parseFloat(lakhMatch[1]) * 100000;
          break;
        }
        const kMatch = e.claim.match(/(\d+)\s*k\s*(?:pkr|rs)?/i);
        if (kMatch) {
          budgetCap = parseInt(kMatch[1], 10) * 1000;
          break;
        }
      }
    }

    // 2. Compute approved itemized costs
    const venueCost = typeof venue.cost === 'number' ? venue.cost : 65000;
    const foodCost = typeof food.totalFoodCost === 'number' ? food.totalFoodCost : 102000;

    // Fixed / approved operational line items
    const avLogisticsCost = 25000;
    const prizesCost = 25000;

    const breakdown = [
      {
        category: 'Venue',
        item: `Hall Rental (${venue.name || 'Islamabad Venue'})`,
        amount: venueCost,
        calculation: 'Direct rental rate for 4-hour slot',
        status: 'approved'
      },
      {
        category: 'Food',
        item: `Catering (${food.orderHeadcount || 120} heads @ ${food.costPerHead || 850} PKR)`,
        amount: foodCost,
        calculation: `${food.orderHeadcount || 120} x ${food.costPerHead || 850}`,
        status: 'approved'
      },
      {
        category: 'Logistics',
        item: 'Audio-Visual, Sound System & Power Backup',
        amount: avLogisticsCost,
        calculation: 'Standard AV and networking package',
        status: 'approved'
      },
      {
        category: 'Prizes & Awards',
        item: 'Winner Shields, Certificates & Swag Pool',
        amount: prizesCost,
        calculation: 'Approved hackathon awards allocation',
        status: 'approved'
      }
    ];

    // Check for optional requested spending from evidence (e.g. DJ, luxury swag, extra banners)
    const optionalRequests = [];
    for (const e of evidenceList) {
      if (e.type === 'preference' || e.type === 'request') {
        if (/dj|music|extra swag|hoodies|drone|photographer/i.test(e.claim)) {
          optionalRequests.push({
            item: e.claim,
            source: e.source,
            status: 'unapproved_optional',
            estimatedAmount: 20000
          });
        }
      }
    }

    const totalAllocated = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const remainingBuffer = budgetCap - totalAllocated;
    const isWithinBudget = totalAllocated <= budgetCap;

    return {
      currency: 'PKR',
      budgetCap,
      totalAllocated,
      remainingBuffer,
      isWithinBudget,
      breakdown,
      optionalRequests,
      arithmeticDetails: {
        venueCost,
        foodCost,
        avLogisticsCost,
        prizesCost,
        totalAllocated
      }
    };
  }
}

export const budgetService = new BudgetService();
export default budgetService;
