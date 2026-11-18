import { test } from 'node:test';
import assert from 'node:assert';
import { BudgetService } from '../src/services/budget.service.js';
import { ValidationService } from '../src/services/validation.service.js';
import { ScheduleService } from '../src/services/schedule.service.js';

test('Schedule normalization deterministically guarantees exactly 240 minutes with no gaps', () => {
  const scheduleService = new ScheduleService();

  const customItems = [
    { durationMinutes: 30, title: 'Arrival & Registration', details: '' },
    { durationMinutes: 30, title: 'Keynote Briefing', details: '' },
    { durationMinutes: 60, title: 'Sprint Prototyping', details: '' }, // Sum is 120, needs 120 more
    { durationMinutes: 15, title: 'Tea Break', details: '' },
    { durationMinutes: 45, title: 'Judging & Pitches', details: '' }
  ];

  const normalized = scheduleService.normalizeScheduleTo240(customItems, '14:00', 45);

  const totalMinutes = normalized.reduce((acc, it) => acc + it.durationMinutes, 0);
  assert.strictEqual(totalMinutes, 240, 'Total schedule duration must equal 240 minutes');

  assert.strictEqual(normalized[0].time.startsWith('14:00'), true);
  assert.strictEqual(normalized[normalized.length - 1].time.endsWith('18:00'), true);

  // Ensure consecutive continuity (item i ends when item i+1 starts)
  for (let i = 0; i < normalized.length - 1; i++) {
    const currentEnd = normalized[i].time.split(' - ')[1];
    const nextStart = normalized[i + 1].time.split(' - ')[0];
    assert.strictEqual(currentEnd, nextStart, `Schedule gap detected between item ${i} and ${i + 1}`);
  }
});

test('Budget Engine performs deterministic arithmetic without AI model calls', () => {
  const budgetService = new BudgetService();

  const result = budgetService.calculateBudget({
    venue: { cost: 65000, name: 'Pak-China Centre' },
    food: { totalFoodCost: 102000, orderHeadcount: 120, costPerHead: 850 },
    judging: {},
    evidenceList: [
      { area: 'budget', claim: 'Total budget ceiling is 250k PKR', value: 250000, status: 'accepted' }
    ],
    defaultCap: 250000
  });

  assert.strictEqual(result.budgetCap, 250000);
  // 65000 (venue) + 102000 (food) + 25000 (AV) + 25000 (prizes) = 217000
  assert.strictEqual(result.totalAllocated, 217000);
  assert.strictEqual(result.remainingBuffer, 33000);
  assert.strictEqual(result.isWithinBudget, true);
  assert.strictEqual(result.breakdown.length, 4);
});

test('Deterministic Validator verifies all 12 hard assertions on valid plans', () => {
  const validator = new ValidationService();

  const validPlan = {
    areas: {
      venue: {
        name: 'Pak-China Friendship Centre',
        city: 'Islamabad',
        capacity: 150,
        cost: 65000
      },
      schedule: {
        totalDurationMinutes: 240,
        startTime: '14:00',
        endTime: '18:00',
        items: [
          { time: '14:00 - 14:30', durationMinutes: 30, title: 'Registration' },
          { time: '14:30 - 15:00', durationMinutes: 30, title: 'Opening' },
          { time: '15:00 - 16:15', durationMinutes: 75, title: 'Sprint' },
          { time: '16:15 - 16:30', durationMinutes: 15, title: 'Namaz & Tea Break' },
          { time: '16:30 - 17:30', durationMinutes: 60, title: 'Judging' },
          { time: '17:30 - 18:00', durationMinutes: 30, title: 'Closing' }
        ]
      },
      food: {
        caterer: 'Gourmet',
        orderHeadcount: 120,
        dietary: '100% Halal; vegetarian included',
        totalFoodCost: 102000,
        costPerHead: 850
      },
      judging: {
        judges: [{ name: 'J1' }, { name: 'J2' }],
        minJudgesRequired: 2,
        teamCount: 10,
        maxTeamsPerJudge: 10
      },
      budget: {
        budgetCap: 250000,
        totalAllocated: 217000
      }
    }
  };

  const validation = validator.validatePlan(validPlan);
  assert.strictEqual(validation.isValid, true, 'Valid plan must pass validation');
  assert.strictEqual(validation.errors.length, 0);
  assert.strictEqual(validation.passedChecks, 12);
});

test('Deterministic Validator catches violations (wrong city, duration != 240, over budget)', () => {
  const validator = new ValidationService();

  const invalidPlan = {
    areas: {
      venue: {
        name: 'Lahore Expo Centre',
        city: 'Lahore', // Violation: Not Islamabad
        capacity: 80 // Violation: Capacity 80 < Headcount 120
      },
      schedule: {
        totalDurationMinutes: 300, // Violation: 300 != 240
        items: [{ durationMinutes: 300, title: 'Hacking' }]
      },
      food: {
        orderHeadcount: 120,
        dietary: 'Non-Halal items', // Violation: Not Halal
        totalFoodCost: 150000
      },
      judging: {
        judges: [{ name: 'J1' }],
        minJudgesRequired: 3 // Violation: 1 judge < 3
      },
      budget: {
        budgetCap: 200000,
        totalAllocated: 280000 // Violation: Over budget
      }
    }
  };

  const validation = validator.validatePlan(invalidPlan);
  assert.strictEqual(validation.isValid, false, 'Invalid plan must fail validation');
  assert.ok(validation.errors.length >= 5, 'Must flag multiple hard constraint errors');

  // Verify specific error messages
  assert.ok(validation.errors.some(e => e.includes('Islamabad')));
  assert.ok(validation.errors.some(e => e.includes('240 minutes')));
  assert.ok(validation.errors.some(e => e.includes('Halal')));
  assert.ok(validation.errors.some(e => e.includes('exceeds budget cap')));
  assert.ok(validation.errors.some(e => e.includes('capacity')));
});
