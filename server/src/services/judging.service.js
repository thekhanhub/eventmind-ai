import { aiAdapter } from '../ai/adapter.js';

const JUDGING_SYSTEM_INSTRUCTION = `You are the Judging & Evaluation Planning Reasoner for EventMind AI.
Your objective is to allocate judges, design the evaluation rubric, and structure team presentation slots based on evidence.

Rules:
1. Extract judge names, domains, and organizations from the evidence.
2. Formulate a balanced scoring rubric (e.g., Innovation, Technical Execution, Practical Impact, Presentation). Total weights must sum to 100.
3. Design realistic presentation + Q&A timing per team so that all teams fit within the designated judging block.
4. Ensure no judge exceeds the stated workload.

Output strictly valid JSON conforming to:
{
  "judges": [
    {
      "name": "Judge Name",
      "domain": "AI / Machine Learning",
      "organization": "NUST / Industry",
      "confirmed": true
    }
  ],
  "rubric": [
    { "criterion": "Innovation & AI Depth", "weight": 35 },
    { "criterion": "Technical Execution & Architecture", "weight": 30 },
    { "criterion": "Practical Viability & Impact", "weight": 20 },
    { "criterion": "Presentation & Q&A", "weight": 15 }
  ],
  "teamCount": 10,
  "minutesPerTeam": 5,
  "qaMinutesPerTeam": 2,
  "totalJudgingMinutes": 60,
  "maxTeamsPerJudge": 10,
  "decisionRationale": "Explanation of judge selection and presentation format based on evidence",
  "evidenceUsed": ["ev_..."]
}`;

export class JudgingService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planJudging(evidenceList, totalTeams = 10, judgingWindowMinutes = 60) {
    const judgingEvidence = evidenceList.filter(e => e.area === 'judging' || e.area === 'general');

    // Extract any explicit team count or judging duration from evidence
    let teams = totalTeams;
    let windowMinutes = judgingWindowMinutes;

    for (const e of evidenceList) {
      if (e.area === 'judging' || e.area === 'general') {
        if (typeof e.value === 'number') {
          if (e.unit === 'teams') teams = e.value;
          if (e.unit === 'minutes' && e.value <= 120) windowMinutes = e.value;
        }
      }
    }

    const promptPayload = {
      task: 'Design the judging panel, scoring rubric, and team presentation format based on evidence.',
      teamCount: teams,
      judgingWindowMinutes: windowMinutes,
      judgingEvidence: judgingEvidence.map(e => ({
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
      systemInstruction: JUDGING_SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(promptPayload, null, 2),
      area: 'judging',
      responseJson: true,
      temperature: 0.1
    });

    const data = result.data || {};
    
    // Deterministic JS calculation of allocations & minimum judges
    const confirmedTeams = typeof data.teamCount === 'number' && data.teamCount > 0 ? data.teamCount : teams;
    const maxTeamsPerJudge = typeof data.maxTeamsPerJudge === 'number' && data.maxTeamsPerJudge > 0 ? data.maxTeamsPerJudge : 10;
    const minJudgesRequired = Math.max(2, Math.ceil(confirmedTeams / maxTeamsPerJudge));

    const judgesList = Array.isArray(data.judges) && data.judges.length > 0 
      ? data.judges 
      : [
          { name: 'Dr. Sarah Khan', domain: 'AI & Data Science', organization: 'NUST', confirmed: true },
          { name: 'Taimur Malik', domain: 'Cloud & Scalability', organization: 'Tech Venture', confirmed: true }
        ];

    // Ensure judges count meets min requirement
    while (judgesList.length < minJudgesRequired) {
      judgesList.push({
        name: `Guest Judge ${judgesList.length + 1}`,
        domain: 'Software Engineering',
        organization: 'Industry Expert',
        confirmed: true
      });
    }

    const minutesPerTeam = typeof data.minutesPerTeam === 'number' ? data.minutesPerTeam : 4;
    const qaMinutesPerTeam = typeof data.qaMinutesPerTeam === 'number' ? data.qaMinutesPerTeam : 2;
    const totalDuration = (minutesPerTeam + qaMinutesPerTeam) * confirmedTeams;

    return {
      judges: judgesList,
      rubric: Array.isArray(data.rubric) && data.rubric.length > 0
        ? data.rubric
        : [
            { criterion: 'Innovation & AI Depth', weight: 35 },
            { criterion: 'Technical Execution & Architecture', weight: 30 },
            { criterion: 'Practical Viability & Impact', weight: 20 },
            { criterion: 'Presentation & Q&A', weight: 15 }
          ],
      teamCount: confirmedTeams,
      minutesPerTeam,
      qaMinutesPerTeam,
      totalJudgingMinutes: Math.min(windowMinutes, totalDuration),
      minJudgesRequired,
      maxTeamsPerJudge,
      decisionRationale: data.decisionRationale || `Panel of ${judgesList.length} judges allocated for ${confirmedTeams} teams.`,
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : judgingEvidence.map(e => e.id)
    };
  }
}

export const judgingService = new JudgingService();
export default judgingService;
