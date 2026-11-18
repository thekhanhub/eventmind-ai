import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { DependencyService } from '../src/services/dependency.service.js';
import { ValidationService } from '../src/services/validation.service.js';
import { parseRawMessages } from '../src/utils/message-parser.js';

const testInputsDir = path.resolve('data/test_inputs');

const mockExistingPlan = {
  eventId: 'evt_test_001',
  status: 'VALID',
  areas: {
    venue: { name: 'Pak-China Centre', city: 'Islamabad', capacity: 150, cost: 65000 },
    schedule: { totalDurationMinutes: 240, startTime: '14:00', endTime: '18:00', items: [] },
    food: { orderHeadcount: 120, costPerHead: 850, totalFoodCost: 102000, dietary: '100% Halal' },
    judging: { judges: [{ name: 'J1' }, { name: 'J2' }], minJudgesRequired: 2, teamCount: 10 },
    budget: { budgetCap: 250000, totalAllocated: 217000, remainingBuffer: 33000, isWithinBudget: true }
  }
};

test('Practice Test 1: Cost correction triggers deterministic budget recalculation', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '01-cost-correction.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'food',
    claim: 'Hi-tea is 950 PKR per head instead of 850 PKR. Please update the budget.',
    value: 950,
    unit: 'PKR',
    type: 'correction',
    status: 'accepted'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.ok(deps.jsAffectedAreas.includes('budget'), 'Budget must be recalculated on price change');
  assert.ok(deps.aiAffectedAreas.includes('food'), 'Food service must be updated');
  assert.strictEqual(deps.aiAffectedAreas.length <= 4, true, 'AI calls must not exceed 4');
});

test('Practice Test 2: Insufficient food proposal is rejected and protects previous valid plan', () => {
  const validator = new ValidationService();
  const raw = fs.readFileSync(path.join(testInputsDir, '02-insufficient-food.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  // Candidate plan if invalid proposal was accepted (25 heads vs 120 required)
  const candidateInvalidPlan = {
    areas: {
      ...mockExistingPlan.areas,
      food: {
        orderHeadcount: 25, // Insufficient!
        dietary: '100% Halal'
      }
    }
  };

  const validation = validator.validatePlan(candidateInvalidPlan);
  assert.strictEqual(validation.isValid, false, 'Insufficient food order must fail validation');
  assert.ok(validation.errors.some(e => e.includes('Food order quantity')), 'Validation must flag invalid food quantity');
});

test('Practice Test 3: Irrelevant conversational message produces zero affected planning areas', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '03-irrelevant-message.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'general',
    claim: 'Anyone know if there is traffic on Islamabad expressway or cricket score?',
    type: 'irrelevant',
    status: 'irrelevant'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.strictEqual(deps.aiAffectedAreas.length, 0, 'Irrelevant messages must not trigger AI calls');
  assert.strictEqual(deps.jsAffectedAreas.length, 0, 'Irrelevant messages must not trigger JS recalculations');
});

test('Practice Test 4: New venue constraint triggers venue replanning', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '04-venue-constraint.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'venue',
    claim: 'The Islamabad hall must have a dedicated backup generator and minimum seating capacity of 160.',
    value: 160,
    unit: 'people',
    type: 'constraint',
    status: 'accepted'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.ok(deps.aiAffectedAreas.includes('venue'), 'Venue must be replanned');
  assert.ok(deps.jsAffectedAreas.includes('budget'), 'Budget must update with venue');
});

test('Practice Test 5: Scheduling restriction triggers schedule replanning', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '05-scheduling-restriction.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'schedule',
    claim: 'Asr namaz break must be allocated at 16:15 for 15 minutes.',
    value: 15,
    unit: 'minutes',
    type: 'constraint',
    status: 'accepted'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.ok(deps.aiAffectedAreas.includes('schedule'), 'Schedule must be replanned');
  assert.ok(deps.explanations.schedule.length > 0, 'Explanation must be provided');
});

test('Practice Test 6: Changed judge panel triggers judging replanning', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '06-judge-availability.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'judging',
    claim: 'We have added Engineer Bilal Ahmed as a 3rd judge for AI solutions.',
    type: 'availability',
    status: 'accepted'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.ok(deps.aiAffectedAreas.includes('judging'), 'Judging must be replanned');
});

test('Practice Test 7: Multi-area dependency (headcount increase to 140) propagates to food, venue, and budget', () => {
  const depService = new DependencyService();
  const raw = fs.readFileSync(path.join(testInputsDir, '07-multi-area-dependency.txt'), 'utf-8');
  const [msg] = parseRawMessages(raw);

  const claims = [{
    messageId: msg.id,
    area: 'general',
    claim: 'Final confirmed registrations have reached 140 attendees. Please adjust seating, catering, and budget.',
    value: 140,
    unit: 'attendees',
    type: 'fact',
    status: 'accepted'
  }];

  const deps = depService.calculateDependencies(claims, mockExistingPlan);
  assert.ok(deps.aiAffectedAreas.includes('food'), 'Food must be replanned for 140 attendees');
  assert.ok(deps.jsAffectedAreas.includes('budget'), 'Budget must recalculate catering costs');
  assert.strictEqual(deps.aiAffectedAreas.length <= 4, true, 'Must not exceed 4 area calls');
});
