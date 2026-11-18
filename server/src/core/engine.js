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
import { tracer } from '../ai/tracer.js';

/**
 * Shared Core Processing Engine for EventMind AI
 * Generates a validated 4-hour physical event plan for Islamabad
 * using exactly 1 reading call and 4 area calls (budget is deterministic JS).
 */
export async function processMessages({ filePath, rawText, isUpdate = false } = {}) {
  const targetPath = filePath || config.paths.messages;

  // 1. Ingestion
  let readResult;
  if (rawText && typeof rawText === 'string') {
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error('Provided raw message text is empty.');
    }
    const { parseRawMessages } = await import('../utils/message-parser.js');
    const messages = parseRawMessages(rawText);
    readResult = {
      filePath: 'in-memory-input',
      rawContent: rawText,
      byteCount: Buffer.byteLength(rawText, 'utf8'),
      messages,
      newMessages: messages,
      existingMessages: []
    };
  } else {
    if (isUpdate) {
      readResult = messageReader.readDelta(targetPath);
    } else {
      const initial = messageReader.readMessages(targetPath);
      readResult = {
        ...initial,
        newMessages: initial.messages,
        existingMessages: []
      };
    }
  }

  // Register raw messages for provenance
  evidenceService.registerMessages(readResult.messages || readResult.allMessages);

  // 2. Reading Model Call (Call #1)
  console.log(`[EventMind AI] Executing Reading Model call on ${readResult.newMessages.length} messages...`);
  const acceptedPriorEvidence = evidenceService.getAcceptedEvidence();
  const readingResult = await readingService.analyzeMessages(readResult.newMessages, acceptedPriorEvidence);

  const acceptedEvidence = evidenceService.getAcceptedEvidence();
  console.log(`[EventMind AI] Extracted ${readingResult.claims.length} claims (${acceptedEvidence.length} accepted).`);
  console.log(`[PREDICTION] Affected areas: ${JSON.stringify(readingResult.affectedAreas || ['venue', 'schedule', 'food', 'judging'])}`);

  // 3. Area Model Calls (Calls #2, #3, #4, #5)
  // Venue Planning (Call #2)
  console.log('[EventMind AI] Planning Venue (Islamabad physical location)...');
  const venue = await venueService.planVenue(acceptedEvidence, 120);

  // Food Planning (Call #3)
  console.log('[EventMind AI] Planning Food (100% Halal catering)...');
  const food = await foodService.planFood(acceptedEvidence, venue.capacity || 120);

  // Judging Planning (Call #4)
  console.log('[EventMind AI] Planning Judging panel & evaluation rubric...');
  const judging = await judgingService.planJudging(acceptedEvidence, 10, 60);

  // Schedule Planning (Call #5)
  console.log('[EventMind AI] Planning Schedule (strictly 4 hours / 240 minutes)...');
  const schedule = await scheduleService.planSchedule(acceptedEvidence, judging.totalJudgingMinutes || 60);

  // 4. Deterministic JavaScript Budget Calculation (0 Model Calls)
  console.log('[EventMind AI] Calculating Budget deterministically in JavaScript (0 AI calls)...');
  const budget = budgetService.calculateBudget({
    venue,
    food,
    judging,
    evidenceList: acceptedEvidence,
    defaultCap: 250000
  });

  // Assemble full candidate plan
  const candidatePlan = {
    eventId: `evt_islamabad_${Date.now()}`,
    status: 'PENDING_VALIDATION',
    updatedAt: new Date().toISOString(),
    areas: {
      venue,
      schedule,
      food,
      judging,
      budget
    },
    evidenceReferences: acceptedEvidence.map(e => e.id),
    decisions: [
      { area: 'venue', decision: venue.name, rationale: venue.decisionRationale },
      { area: 'schedule', decision: `${schedule.totalDurationMinutes} mins (${schedule.startTime} - ${schedule.endTime})`, rationale: schedule.decisionRationale },
      { area: 'food', decision: `${food.menuType} for ${food.orderHeadcount} heads`, rationale: food.decisionRationale },
      { area: 'judging', decision: `${judging.judges.length} judges for ${judging.teamCount} teams`, rationale: judging.decisionRationale },
      { area: 'budget', decision: `${budget.totalAllocated} PKR allocated of ${budget.budgetCap} PKR cap`, rationale: budget.isWithinBudget ? 'Within budget cap' : 'Budget cap exceeded' }
    ],
    rejectedClaims: evidenceService.getRejectedEvidence()
  };

  // 5. Authoritative Deterministic JavaScript Validation
  console.log('[EventMind AI] Running deterministic validation engine (12 checks)...');
  const validation = validationService.validatePlan(candidatePlan, acceptedEvidence);
  candidatePlan.validation = validation;
  candidatePlan.status = validation.isValid ? 'VALID' : 'INVALID';

  // 6. Save Plan Artifacts
  // Save to data/outputs/final-plan.json (as explicitly requested by user)
  const legacyOutputDir = path.join(config.rootDir, 'data', 'outputs');
  if (!fs.existsSync(legacyOutputDir)) {
    fs.mkdirSync(legacyOutputDir, { recursive: true });
  }
  const finalPlanPath = path.join(legacyOutputDir, 'final-plan.json');
  fs.writeFileSync(finalPlanPath, JSON.stringify(candidatePlan, null, 2), 'utf-8');

  // Also save to output/plan.json for API routes
  if (!fs.existsSync(config.paths.outputDir)) {
    fs.mkdirSync(config.paths.outputDir, { recursive: true });
  }
  fs.writeFileSync(config.paths.plan, JSON.stringify(candidatePlan, null, 2), 'utf-8');

  // Commit processed messages to history
  if (readResult.newMessages && readResult.newMessages.length > 0) {
    messageReader.commitHistory(readResult.newMessages.map(m => m.id));
  }

  // Capture telemetry
  const traceSummary = tracer.getSummary();

  console.log(`[EventMind AI] Processing Complete! Overall Status: ${candidatePlan.status}`);
  console.log(`[EventMind AI] Total Model Calls: ${traceSummary.totalCalls} | Total Tokens: ${traceSummary.totalTokens}`);
  console.log(`[EventMind AI] Saved final plan to: ${finalPlanPath}`);

  return {
    success: true,
    plan: candidatePlan,
    validation,
    tokenSummary: {
      totalCalls: traceSummary.totalCalls,
      totalInputTokens: traceSummary.totalInputTokens,
      totalOutputTokens: traceSummary.totalOutputTokens,
      totalTokens: traceSummary.totalTokens
    },
    finalPlanPath
  };
}
