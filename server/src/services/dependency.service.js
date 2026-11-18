/**
 * Dependency Graph & Impact Propagation Engine
 * 
 * Computes the transitive dependency closure to determine which planning areas
 * are truly affected by newly ingested claims.
 */
export class DependencyService {
  /**
   * Calculates affected planning areas and provides human-readable explanations.
   */
  calculateDependencies(newClaims = [], existingPlan = null) {
    const aiAreas = new Set();
    const jsAreas = new Set();
    const explanations = {};

    if (!Array.isArray(newClaims) || newClaims.length === 0) {
      return {
        aiAffectedAreas: [],
        jsAffectedAreas: [],
        explanations: {},
        summary: 'No new claims to propagate.'
      };
    }

    // 1. Direct Area Impacts from newly extracted claims
    for (const c of newClaims) {
      if (c.status === 'rejected' || c.status === 'irrelevant') {
        continue; // Discarded claims don't trigger replanning
      }

      const area = c.area;
      if (['venue', 'schedule', 'food', 'judging'].includes(area)) {
        aiAreas.add(area);
        if (!explanations[area]) {
          explanations[area] = `Directly affected by claim: "${c.claim}"`;
        }
      }

      if (area === 'budget') {
        jsAreas.add('budget');
        if (!explanations.budget) {
          explanations.budget = `Directly affected by budget claim: "${c.claim}"`;
        }
      }
    }

    // 2. Transitive Dependency Propagation
    for (const c of newClaims) {
      if (c.status === 'rejected' || c.status === 'irrelevant') continue;

      const claimText = (c.claim || '').toLowerCase();
      const isHeadcount = /headcount|attendance|attendees|participants|people|capacity|heads/i.test(claimText) || 
                          c.unit === 'people' || c.unit === 'attendees' || c.unit === 'heads';
      
      const isTimeChange = /time|timing|hour|duration|namaz|prayer|break|delay|start|pitch|minutes/i.test(claimText) ||
                           c.unit === 'minutes' || c.unit === 'hours';

      const isCostChange = /cost|price|budget|pkr|rs|kharcha|fee|rate|lakh/i.test(claimText) ||
                           c.unit === 'PKR';

      const isJudgeChange = /judge|judging|panel|mentor|rubric|evaluat/i.test(claimText);

      // Rule A: Headcount change propagates to Food, Venue, and Budget
      if (isHeadcount) {
        aiAreas.add('food');
        explanations.food = explanations.food || 'Headcount adjustment requires catering quantity recalculation.';
        
        jsAreas.add('budget');
        explanations.budget = explanations.budget || 'Headcount adjustment affects total catering expenditure.';

        if (existingPlan?.areas?.venue) {
          const newCount = typeof c.value === 'number' ? c.value : 0;
          if (newCount > (existingPlan.areas.venue.capacity || 0)) {
            aiAreas.add('venue');
            explanations.venue = `New headcount (${newCount}) exceeds current venue capacity (${existingPlan.areas.venue.capacity}).`;
          }
        }
      }

      // Rule B: Venue change propagates to Budget (rent)
      if (c.area === 'venue' || /venue|hall|location/i.test(claimText)) {
        jsAreas.add('budget');
        explanations.budget = explanations.budget || 'Venue modification affects hall rental costs.';
      }

      // Rule C: Judging window change propagates to Schedule
      if (isJudgeChange && isTimeChange) {
        aiAreas.add('schedule');
        explanations.schedule = explanations.schedule || 'Judging session duration update requires schedule adjustment.';
      }

      // Rule D: Break or session time change propagates to Schedule
      if (isTimeChange) {
        aiAreas.add('schedule');
        explanations.schedule = explanations.schedule || 'Time or break adjustment requires schedule reallocation.';
      }

      // Rule E: Any cost change propagates to Budget
      if (isCostChange || aiAreas.has('food') || aiAreas.has('venue')) {
        jsAreas.add('budget');
        explanations.budget = explanations.budget || 'Expense adjustment requires budget recalculation.';
      }
    }

    // Limit AI calls to max 4 area calls
    const aiAffectedAreas = Array.from(aiAreas).slice(0, 4);
    const jsAffectedAreas = Array.from(jsAreas);

    return {
      aiAffectedAreas,
      jsAffectedAreas,
      explanations,
      summary: `Identified ${aiAffectedAreas.length} AI area call(s) and ${jsAffectedAreas.length} deterministic JS call(s).`
    };
  }
}

export const dependencyService = new DependencyService();
export default dependencyService;
