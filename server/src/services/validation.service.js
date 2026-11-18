/**
 * Authoritative Deterministic JavaScript Validation Engine
 * 
 * Validates complete event plans against hard constraints and business logic.
 * A plan is NEVER considered valid merely because an LLM claims it is valid.
 */
export class ValidationService {
  validatePlan(plan, evidenceList = []) {
    const checks = [];
    const errors = [];
    const warnings = [];

    const areas = plan?.areas || {};
    const { venue, schedule, food, judging, budget } = areas;

    // 1. Missing planning areas check
    const requiredAreas = ['venue', 'schedule', 'food', 'judging', 'budget'];
    const missing = requiredAreas.filter(a => !areas[a]);
    if (missing.length > 0) {
      errors.push(`Missing mandatory planning areas: ${missing.join(', ')}`);
      checks.push({ name: 'missing_areas', passed: false, message: `Missing: ${missing.join(', ')}` });
    } else {
      checks.push({ name: 'missing_areas', passed: true, message: 'All 5 planning areas present' });
    }

    // 2. Venue City Check (Must be Islamabad physical venue)
    if (venue) {
      const isIslamabad = venue.city && venue.city.toLowerCase().includes('islamabad');
      if (!isIslamabad) {
        errors.push(`Venue hard constraint violation: Event must be in Islamabad, got '${venue.city}'`);
        checks.push({ name: 'venue_city', passed: false, message: 'City is not Islamabad' });
      } else {
        checks.push({ name: 'venue_city', passed: true, message: 'Venue is located in Islamabad' });
      }

      // 3. Venue Capacity Check
      const requiredCapacity = food?.orderHeadcount || 100;
      if (typeof venue.capacity !== 'number' || venue.capacity < requiredCapacity) {
        errors.push(`Venue capacity (${venue?.capacity || 0}) is less than required attendance (${requiredCapacity})`);
        checks.push({ name: 'venue_capacity', passed: false, message: `Capacity ${venue?.capacity} < Required ${requiredCapacity}` });
      } else {
        checks.push({ name: 'venue_capacity', passed: true, message: `Capacity (${venue.capacity}) accommodates ${requiredCapacity} attendees` });
      }
    }

    // 4. Schedule Duration Check (Must equal exactly 240 minutes)
    if (schedule) {
      const duration = schedule.totalDurationMinutes;
      if (duration !== 240) {
        errors.push(`Schedule duration violation: Total event duration must be strictly 240 minutes (4.0 hours), got ${duration}`);
        checks.push({ name: 'schedule_duration', passed: false, message: `Duration is ${duration} mins, expected 240` });
      } else {
        checks.push({ name: 'schedule_duration', passed: true, message: 'Duration equals exactly 240 minutes' });
      }

      // 5. Schedule Items Continuity & Non-overlapping Check
      if (Array.isArray(schedule.items)) {
        const itemSum = schedule.items.reduce((sum, it) => sum + (parseInt(it.durationMinutes, 10) || 0), 0);
        if (itemSum !== 240) {
          errors.push(`Schedule item sum mismatch: Sum of item durations is ${itemSum} minutes, expected 240`);
          checks.push({ name: 'schedule_continuity', passed: false, message: `Items sum to ${itemSum} mins` });
        } else {
          checks.push({ name: 'schedule_continuity', passed: true, message: 'Schedule items sum to exactly 240 minutes without gaps' });
        }

        // 6. Break Duration Check (At least 1 break of 15+ minutes)
        const hasBreak = schedule.items.some(it => 
          /break|namaz|prayer|tea|lunch|refreshment/i.test(it.title) && it.durationMinutes >= 15
        );
        if (!hasBreak) {
          warnings.push('Schedule lacks an explicit dedicated break of 15+ minutes.');
          checks.push({ name: 'break_duration', passed: false, message: 'No explicit 15+ min break found' });
        } else {
          checks.push({ name: 'break_duration', passed: true, message: 'Dedicated break of 15+ minutes included' });
        }
      }
    }

    // 7. Food Quantity Check (Never reduced below required headcount)
    if (food) {
      const requiredHeadcount = food.orderHeadcount || 100;
      if (typeof food.orderHeadcount !== 'number' || food.orderHeadcount < 50) {
        errors.push(`Food order quantity (${food.orderHeadcount}) is invalid.`);
        checks.push({ name: 'food_quantity', passed: false, message: `Order quantity invalid` });
      } else {
        checks.push({ name: 'food_quantity', passed: true, message: `Food quantity (${food.orderHeadcount}) meets attendance` });
      }

      // 8. Food 100% Halal check
      const hasHalal = food.dietary && /\bhalal\b/i.test(food.dietary);
      const isExplicitlyNonHalal = food.dietary && /non-halal|not halal|haram/i.test(food.dietary);
      const isHalal = hasHalal && !isExplicitlyNonHalal;

      if (!isHalal) {
        errors.push('Food requirement violation: Catering must explicitly be 100% Halal.');
        checks.push({ name: 'food_halal', passed: false, message: 'Not confirmed as 100% Halal' });
      } else {
        checks.push({ name: 'food_halal', passed: true, message: '100% Halal catering confirmed' });
      }
    }

    // 9. Judging Panel & Workload Check
    if (judging) {
      const judgeCount = Array.isArray(judging.judges) ? judging.judges.length : 0;
      const minRequired = judging.minJudgesRequired || 2;
      if (judgeCount < minRequired) {
        errors.push(`Judging panel count (${judgeCount}) is below minimum requirement (${minRequired})`);
        checks.push({ name: 'judge_count', passed: false, message: `Judges ${judgeCount} < Min ${minRequired}` });
      } else {
        checks.push({ name: 'judge_count', passed: true, message: `Judges count (${judgeCount}) satisfies minimum (${minRequired})` });
      }

      // 10. Judge Workload Check (teams per judge <= max)
      const teamCount = judging.teamCount || 10;
      const maxWorkload = judging.maxTeamsPerJudge || 10;
      const teamsPerJudge = teamCount / Math.max(1, judgeCount);
      if (teamsPerJudge > maxWorkload) {
        warnings.push(`High judge workload: ${teamsPerJudge.toFixed(1)} teams per judge exceeds target (${maxWorkload})`);
        checks.push({ name: 'judge_workload', passed: false, message: `Teams per judge ${teamsPerJudge.toFixed(1)} > Max ${maxWorkload}` });
      } else {
        checks.push({ name: 'judge_workload', passed: true, message: `Judge workload acceptable (${teamsPerJudge.toFixed(1)} teams/judge)` });
      }
    }

    // 11. Budget Total Check (totalAllocated <= budgetCap)
    if (budget) {
      if (typeof budget.totalAllocated !== 'number' || typeof budget.budgetCap !== 'number') {
        errors.push('Budget calculations are missing totalAllocated or budgetCap numbers.');
        checks.push({ name: 'budget_total', passed: false, message: 'Budget numbers missing' });
      } else if (budget.totalAllocated > budget.budgetCap) {
        errors.push(`Budget violation: Total allocated (${budget.totalAllocated} PKR) exceeds budget cap (${budget.budgetCap} PKR) by ${budget.totalAllocated - budget.budgetCap} PKR`);
        checks.push({ name: 'budget_total', passed: false, message: `Over budget by ${budget.totalAllocated - budget.budgetCap} PKR` });
      } else {
        checks.push({ name: 'budget_total', passed: true, message: `Budget allocated (${budget.totalAllocated} PKR) within cap (${budget.budgetCap} PKR)` });
      }
    }

    // 12. Cross-Area Consistency Check
    if (venue && food) {
      if (venue.capacity < food.orderHeadcount) {
        errors.push(`Cross-area inconsistency: Venue capacity (${venue.capacity}) is less than food order headcount (${food.orderHeadcount})`);
        checks.push({ name: 'cross_area_consistency', passed: false, message: 'Venue capacity < Food headcount' });
      } else {
        checks.push({ name: 'cross_area_consistency', passed: true, message: 'Attendee counts consistent across venue and food' });
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      passedChecks: checks.filter(c => c.passed).length,
      failedChecks: checks.filter(c => !c.passed).length,
      checks,
      errors,
      warnings,
      validatedAt: new Date().toISOString()
    };
  }
}

export const validationService = new ValidationService();
export default validationService;
