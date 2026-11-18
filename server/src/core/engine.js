import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { messageReader } from '../services/message-reader.service.js';
import { evidenceService } from '../services/evidence.service.js';
import { readingService } from '../services/reading.service.js';
import { venueService } from '../services/venue.service.js';
import { foodService } from '../services/food.service.js';
import { judgingService } from '../services/judging.service.js';
import { scheduleService } from '../services/schedule.service.js';
import { budgetService } from '../services/budget.service.js';
import { validationService } from '../services/validation.service.js';
import { dependencyService } from '../services/dependency.service.js';
import { tracer } from '../ai/tracer.js';

/**
 * Shared Core Processing Engine for EventMind AI
 * Supports both Initial Processing and Intelligent Incremental Updates.
 * The exact same CLI command ('npm run process') handles both modes automatically.
 */
export async function processMessages({ filePath, rawText, forceInitial = false } = {}) {
  const targetPath = filePath || config.paths.messages;

  // Detect whether an existing valid plan and history exist
  const existingPlan = loadExistingPlan();
  const history = messageReader.loadHistory();
  const isUpdateMode = !forceInitial && existingPlan && history.processedMessageIds.length > 0;

  console.log('====================================================');
  console.log(`  EventMind AI Processing Mode: ${isUpdateMode ? 'INCREMENTAL UPDATE' : 'INITIAL RUN'}`);
  console.log(`  Target Source: ${targetPath}`);
  console.log('====================================================');

  if (isUpdateMode) {
    return await executeIncrementalUpdate({ targetPath, rawText, existingPlan });
  } else {
    return await executeInitialRun({ targetPath, rawText });
  }
}

/**
 * 1. Initial Processing Run (1 reading call + 4 area calls)
 */
async function executeInitialRun({ targetPath, rawText }) {
  tracer.startNewRun(`run_init_${Date.now()}`);
  evidenceService.clear();

  let readResult;
  if (rawText && typeof rawText === 'string') {
    const { parseRawMessages } = await import('../utils/message-parser.js');
    const messages = parseRawMessages(rawText);
    readResult = { filePath: 'in-memory-input', messages, newMessages: messages, existingMessages: [] };
  } else {
    const initial = messageReader.readMessages(targetPath);
    readResult = { ...initial, newMessages: initial.messages, existingMessages: [] };
  }

  evidenceService.registerMessages(readResult.messages);

  console.log(`[EventMind AI] Ingested ${readResult.messages.length} raw messages.`);
  console.log('[EventMind AI] Executing Reading Model call...');

  // Call #1: Reading
  const readingResult = await readingService.analyzeMessages(readResult.newMessages, []);
  const acceptedEvidence = evidenceService.getAcceptedEvidence();

  console.log(`[PREDICTION] Initial affected areas: ['venue', 'schedule', 'food', 'judging']`);
  console.log('[EventMind AI] Executing initial planning calls...');

  // Call #2: Venue
  console.log('[EventMind AI] [venue] Planning physical Islamabad venue...');
  const venue = await venueService.planVenue(acceptedEvidence, 120);

  // Call #3: Food
  console.log('[EventMind AI] [food] Planning 100% Halal catering...');
  const food = await foodService.planFood(acceptedEvidence, venue.capacity || 120);

  // Call #4: Judging
  console.log('[EventMind AI] [judging] Planning judge allocations & rubric...');
  const judging = await judgingService.planJudging(acceptedEvidence, 10, 60);

  // Call #5: Schedule
  console.log('[EventMind AI] [schedule] Planning strictly 240-minute schedule...');
  const schedule = await scheduleService.planSchedule(acceptedEvidence, judging.totalJudgingMinutes || 60);

  // Deterministic JS Budget (0 AI calls)
  console.log('[EventMind AI] [budget] Calculating deterministic budget in JavaScript (0 AI calls)...');
  const budget = budgetService.calculateBudget({
    venue,
    food,
    judging,
    evidenceList: acceptedEvidence,
    defaultCap: 250000
  });

  const candidatePlan = buildPlanObject({
    runId: tracer.currentRunId,
    mode: 'INITIAL',
    venue,
    schedule,
    food,
    judging,
    budget,
    acceptedEvidence
  });

  // Authoritative JS Validation
  console.log('[EventMind AI] Running deterministic validation engine (12 checks)...');
  const validation = validationService.validatePlan(candidatePlan, acceptedEvidence);
  candidatePlan.validation = validation;
  candidatePlan.status = validation.isValid ? 'VALID' : 'INVALID';

  savePlanArtifacts(candidatePlan);
  messageReader.commitHistory(readResult.messages.map(m => m.id));

  const traceSummary = tracer.getSummary();
  console.log(`[EventMind AI] Initial Plan Complete! Status: ${candidatePlan.status}`);
  console.log(`[EventMind AI] Total Model Calls: ${traceSummary.totalCalls} | Total Tokens: ${traceSummary.totalTokens}`);

  return {
    success: validation.isValid,
    mode: 'INITIAL',
    plan: candidatePlan,
    validation,
    traceSummary
  };
}

/**
 * 2. Intelligent Incremental Replanning Run (1 reading call + max 4 affected area calls)
 */
async function executeIncrementalUpdate({ targetPath, rawText, existingPlan }) {
  const updateRunId = `update_${Date.now()}`;
  tracer.startNewRun(updateRunId);

  // Load existing evidence ledger
  evidenceService.load();

  let deltaResult;
  if (rawText && typeof rawText === 'string') {
    const { parseRawMessages } = await import('../utils/message-parser.js');
    const messages = parseRawMessages(rawText);
    const history = messageReader.loadHistory();
    const knownSet = new Set(history.processedMessageIds);
    const newMessages = messages.filter(m => !knownSet.has(m.id));
    deltaResult = { messages, newMessages, existingMessages: messages.filter(m => knownSet.has(m.id)) };
  } else {
    deltaResult = messageReader.readDelta(targetPath);
  }

  if (deltaResult.newMessages.length === 0) {
    console.log('[EventMind AI] No new messages detected since last run. Active plan is up to date.');
    return {
      success: true,
      mode: 'NO_OP_UP_TO_DATE',
      plan: existingPlan,
      validation: existingPlan.validation,
      traceSummary: tracer.getSummary()
    };
  }

  console.log(`[EventMind AI] Detected ${deltaResult.newMessages.length} newly appended message(s).`);
  evidenceService.registerMessages(deltaResult.newMessages);

  // Call #1: Reading on new messages only
  console.log('[EventMind AI] Executing Reading Model call on new messages...');
  const priorAcceptedEvidence = evidenceService.getAcceptedEvidence();
  const readingResult = await readingService.analyzeMessages(deltaResult.newMessages, priorAcceptedEvidence);

  // Calculate Dependency Closure using JavaScript
  const dependencyAnalysis = dependencyService.calculateDependencies(readingResult.claims, existingPlan);
  const { aiAffectedAreas, jsAffectedAreas, explanations } = dependencyAnalysis;

  // Print required PREDICTION OUTPUT before executing area calls
  console.log('\n====================================================');
  console.log(`Run: ${updateRunId}`);
  console.log('Reading: completed (Call #1)');
  console.log('Predicted area calls:');
  if (aiAffectedAreas.length === 0) {
    console.log('  (No AI area calls needed - all areas unaffected)');
  } else {
    aiAffectedAreas.forEach(area => {
      console.log(`  - ${area} (Reason: ${explanations[area] || 'Direct or propagated dependency'})`);
    });
  }
  if (jsAffectedAreas.includes('budget')) {
    console.log('  - budget (Deterministic JavaScript calculation - 0 AI calls)');
  }
  console.log(`Total Planned AI Calls: ${1 + aiAffectedAreas.length} (Strict limit <= 5)`);
  console.log('====================================================\n');

  // Selective Replanning: Clone previous areas, only recalculate affected areas
  const currentAreas = { ...existingPlan.areas };
  const updatedEvidence = evidenceService.getAcceptedEvidence();

  // Selective Call: Venue
  if (aiAffectedAreas.includes('venue')) {
    console.log('[EventMind AI] [venue] Recalculating venue...');
    currentAreas.venue = await venueService.planVenue(updatedEvidence, currentAreas.food?.orderHeadcount || 120);
  }

  // Selective Call: Food
  if (aiAffectedAreas.includes('food')) {
    console.log('[EventMind AI] [food] Recalculating food...');
    currentAreas.food = await foodService.planFood(updatedEvidence, currentAreas.venue?.capacity || 120);
  }

  // Selective Call: Judging
  if (aiAffectedAreas.includes('judging')) {
    console.log('[EventMind AI] [judging] Recalculating judging...');
    currentAreas.judging = await judgingService.planJudging(updatedEvidence, currentAreas.judging?.teamCount || 10, 60);
  }

  // Selective Call: Schedule
  if (aiAffectedAreas.includes('schedule')) {
    console.log('[EventMind AI] [schedule] Recalculating schedule...');
    currentAreas.schedule = await scheduleService.planSchedule(updatedEvidence, currentAreas.judging?.totalJudgingMinutes || 60);
  }

  // Deterministic JS Budget Recalculation (0 AI calls)
  if (jsAffectedAreas.includes('budget') || aiAffectedAreas.length > 0) {
    console.log('[EventMind AI] [budget] Recalculating deterministic budget...');
    currentAreas.budget = budgetService.calculateBudget({
      venue: currentAreas.venue,
      food: currentAreas.food,
      judging: currentAreas.judging,
      evidenceList: updatedEvidence,
      defaultCap: existingPlan.areas?.budget?.budgetCap || 250000
    });
  }

  const candidatePlan = buildPlanObject({
    runId: updateRunId,
    mode: 'UPDATE',
    venue: currentAreas.venue,
    schedule: currentAreas.schedule,
    food: currentAreas.food,
    judging: currentAreas.judging,
    budget: currentAreas.budget,
    acceptedEvidence: updatedEvidence,
    prediction: {
      aiAffectedAreas,
      jsAffectedAreas,
      explanations
    }
  });

  // Authoritative Deterministic Validation
  console.log('[EventMind AI] Validating complete updated plan (12 checks)...');
  const validation = validationService.validatePlan(candidatePlan, updatedEvidence);
  candidatePlan.validation = validation;

  // INVALID UPDATE PROTECTION
  if (!validation.isValid) {
    console.error('\n[INVALID UPDATE REJECTED] New information would make the event plan invalid!');
    console.error(`Validation Failures (${validation.errors.length}):`);
    validation.errors.forEach(e => console.error(`  ✖ ${e}`));
    console.log('\n[Protection Engaged] Preserving previous valid plan. Rejecting invalid proposal.');

    // Record rejected update in rejected.json
    recordFailedUpdate({
      updateRunId,
      errors: validation.errors,
      claims: readingResult.claims
    });

    return {
      success: false,
      mode: 'UPDATE_REJECTED',
      preservedPlan: existingPlan,
      attemptedPlan: candidatePlan,
      validation,
      traceSummary: tracer.getSummary()
    };
  }

  // Update passed validation: Publish updated plan and commit history
  candidatePlan.status = 'VALID';
  savePlanArtifacts(candidatePlan);
  messageReader.commitHistory(deltaResult.newMessages.map(m => m.id));

  const traceSummary = tracer.getSummary();
  console.log(`[EventMind AI] Incremental Update Complete! Overall Status: ${candidatePlan.status}`);
  console.log(`[EventMind AI] Model Calls Used: ${traceSummary.totalCalls} (Limit <= 5) | Total Tokens: ${traceSummary.totalTokens}`);

  return {
    success: true,
    mode: 'UPDATE_APPLIED',
    plan: candidatePlan,
    validation,
    traceSummary
  };
}

function buildPlanObject({ runId, mode, venue, schedule, food, judging, budget, acceptedEvidence, prediction = null }) {
  return {
    eventId: `evt_islamabad_${Date.now()}`,
    runId,
    mode,
    status: 'PENDING_VALIDATION',
    updatedAt: new Date().toISOString(),
    prediction,
    areas: {
      venue,
      schedule,
      food,
      judging,
      budget
    },
    evidenceReferences: acceptedEvidence.map(e => e.id),
    decisions: [
      { area: 'venue', decision: venue?.name, rationale: venue?.decisionRationale },
      { area: 'schedule', decision: `${schedule?.totalDurationMinutes} mins (${schedule?.startTime} - ${schedule?.endTime})`, rationale: schedule?.decisionRationale },
      { area: 'food', decision: `${food?.menuType} for ${food?.orderHeadcount} heads`, rationale: food?.decisionRationale },
      { area: 'judging', decision: `${judging?.judges?.length} judges for ${judging?.teamCount} teams`, rationale: judging?.decisionRationale },
      { area: 'budget', decision: `${budget?.totalAllocated} PKR of ${budget?.budgetCap} PKR cap`, rationale: budget?.isWithinBudget ? 'Within budget cap' : 'Budget cap exceeded' }
    ],
    rejectedClaims: evidenceService.getRejectedEvidence()
  };
}

function savePlanArtifacts(plan) {
  // Save to data/outputs/final-plan.json
  const legacyDir = path.join(config.rootDir, 'data', 'outputs');
  if (!fs.existsSync(legacyDir)) {
    fs.mkdirSync(legacyDir, { recursive: true });
  }
  fs.writeFileSync(path.join(legacyDir, 'final-plan.json'), JSON.stringify(plan, null, 2), 'utf-8');

  // Save to output/plan.json
  if (!fs.existsSync(config.paths.outputDir)) {
    fs.mkdirSync(config.paths.outputDir, { recursive: true });
  }
  fs.writeFileSync(config.paths.plan, JSON.stringify(plan, null, 2), 'utf-8');
}

function loadExistingPlan() {
  if (fs.existsSync(config.paths.plan)) {
    try {
      const data = JSON.parse(fs.readFileSync(config.paths.plan, 'utf-8'));
      if (data && data.areas && data.status === 'VALID') {
        return data;
      }
    } catch {}
  }
  return null;
}

function recordFailedUpdate({ updateRunId, errors, claims }) {
  try {
    let existing = { count: 0, rejected: [] };
    if (fs.existsSync(config.paths.rejected)) {
      existing = JSON.parse(fs.readFileSync(config.paths.rejected, 'utf-8'));
    }
    const newRejections = (claims || []).map(c => ({
      updateRunId,
      claimId: c.id,
      messageId: c.messageId,
      claim: c.claim,
      source: c.source,
      reason: `Validation Failure: ${errors.join('; ')}`
    }));
    existing.rejected.push(...newRejections);
    existing.count = existing.rejected.length;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(config.paths.rejected, JSON.stringify(existing, null, 2), 'utf-8');
  } catch {}
}
