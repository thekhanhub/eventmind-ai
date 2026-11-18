import { aiAdapter } from '../ai/adapter.js';

const SCHEDULE_SYSTEM_INSTRUCTION = `You are the Schedule Planning Reasoner for EventMind AI.
Your objective is to construct a continuous, chronological, strictly 4-hour (240 minutes) physical event schedule for Islamabad.

Rules:
1. Total duration of all schedule items MUST SUM TO EXACTLY 240 MINUTES.
2. Ensure items are sequential with NO overlaps and NO unallocated gaps.
3. Include required components:
   - Arrival / Registration & Check-in
   - Opening Ceremony & Keynote / Problem Statement Briefing
   - Sprint / Working & Mentorship Session
   - Required break (e.g. Prayer / Namaz & Tea Refreshments)
   - Project Pitching & Live Judging
   - Score Tabulation & Awards Ceremony
4. Use the start time from evidence if explicitly provided (e.g., "14:00" or "2:00 PM"); otherwise default to "14:00".

Output strictly valid JSON conforming to:
{
  "startTime": "14:00",
  "endTime": "18:00",
  "totalDurationMinutes": 240,
  "items": [
    {
      "time": "14:00 - 14:30",
      "durationMinutes": 30,
      "title": "Registration & Check-In",
      "details": "Attendee badge collection and welcome kit distribution"
    },
    {
      "time": "14:30 - 15:00",
      "durationMinutes": 30,
      "title": "Opening Ceremony & Briefing",
      "details": "Welcome remarks and hackathon challenge release"
    },
    {
      "time": "15:00 - 16:15",
      "durationMinutes": 75,
      "title": "Sprint & Mentorship Session",
      "details": "Rapid prototyping with roaming mentor support"
    },
    {
      "time": "16:15 - 16:30",
      "durationMinutes": 15,
      "title": "Namaz & Refreshments Break",
      "details": "Tea and evening snacks"
    },
    {
      "time": "16:30 - 17:30",
      "durationMinutes": 60,
      "title": "Project Pitches & Judging",
      "details": "Team presentations and live judge Q&A"
    },
    {
      "time": "17:30 - 18:00",
      "durationMinutes": 30,
      "title": "Award Ceremony & Closing",
      "details": "Announcement of winners, trophy distribution, and closing remarks"
    }
  ],
  "decisionRationale": "Explanation of timeline and activity distribution based on evidence",
  "evidenceUsed": ["ev_..."]
}`;

export class ScheduleService {
  constructor(adapter = aiAdapter) {
    this.adapter = adapter;
  }

  async planSchedule(evidenceList, judgingMinutes = 60) {
    const scheduleEvidence = evidenceList.filter(e => e.area === 'schedule' || e.area === 'general');

    // Detect if evidence has an explicit start time (e.g. "14:00", "2:00 PM", "9:00 AM", etc.)
    let explicitStartTime = '14:00';
    for (const e of evidenceList) {
      if (e.area === 'schedule') {
        const timeMatch = e.claim.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (timeMatch) {
          explicitStartTime = timeMatch[0];
          break;
        }
      }
    }

    const promptPayload = {
      task: 'Construct a valid 4-hour (240 minutes) gap-free chronological schedule.',
      preferredStartTime: explicitStartTime,
      judgingDurationMinutes: judgingMinutes,
      scheduleEvidence: scheduleEvidence.map(e => ({
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
      systemInstruction: SCHEDULE_SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(promptPayload, null, 2),
      area: 'schedule',
      responseJson: true,
      temperature: 0.1
    });

    const data = result.data || {};
    let items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];

    // Deterministic JS Schedule Sanitization & Strict 240-minute verification
    items = this.normalizeScheduleTo240(items, explicitStartTime, judgingMinutes);

    return {
      startTime: items[0].time.split(' - ')[0],
      endTime: items[items.length - 1].time.split(' - ')[1],
      totalDurationMinutes: 240,
      items,
      decisionRationale: data.decisionRationale || 'Constructed gap-free 4-hour (240 minutes) schedule meeting all activity constraints.',
      evidenceUsed: Array.isArray(data.evidenceUsed) ? data.evidenceUsed : scheduleEvidence.map(e => e.id)
    };
  }

  /**
   * Deterministically ensures that schedule items sum to exactly 240 minutes,
   * are chronological, and have no overlaps or dead space.
   */
  normalizeScheduleTo240(items, startTimeStr = '14:00', judgingMinutes = 60) {
    const fallbackTemplate = [
      { durationMinutes: 30, title: 'Registration & Check-In', details: 'Attendee badge collection and welcome kit distribution' },
      { durationMinutes: 30, title: 'Opening Ceremony & Briefing', details: 'Welcome remarks and hackathon challenge release' },
      { durationMinutes: 75, title: 'Sprint & Mentorship Session', details: 'Rapid prototyping with roaming mentor support' },
      { durationMinutes: 15, title: 'Namaz & Refreshments Break', details: 'Tea and evening snacks' },
      { durationMinutes: judgingMinutes, title: 'Project Pitches & Judging', details: 'Team presentations and live judge Q&A' },
      { durationMinutes: 90 - judgingMinutes, title: 'Award Ceremony & Closing', details: 'Announcement of winners and closing remarks' }
    ];

    let candidate = items.length >= 4 ? items : fallbackTemplate;

    // Check sum
    let currentSum = candidate.reduce((acc, it) => acc + (parseInt(it.durationMinutes, 10) || 0), 0);
    if (currentSum !== 240) {
      // Scale or adjust the largest flexible session (e.g. Sprint) to make sum exactly 240
      const diff = 240 - currentSum;
      const sprintIdx = candidate.findIndex(it => it.title.toLowerCase().includes('sprint') || it.title.toLowerCase().includes('work'));
      if (sprintIdx >= 0) {
        candidate[sprintIdx].durationMinutes = Math.max(30, candidate[sprintIdx].durationMinutes + diff);
      } else {
        candidate[candidate.length - 1].durationMinutes += diff;
      }
    }

    // Build exact chronological start and end times
    let [startHour, startMin] = startTimeStr.split(':').map(v => parseInt(v, 10) || 0);
    let currentTotalMinutes = startHour * 60 + startMin;

    return candidate.map(it => {
      const dur = parseInt(it.durationMinutes, 10) || 30;
      const fromMinutes = currentTotalMinutes;
      const toMinutes = currentTotalMinutes + dur;
      currentTotalMinutes = toMinutes;

      const formatTime = (totalM) => {
        const h = Math.floor(totalM / 60) % 24;
        const m = totalM % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      return {
        time: `${formatTime(fromMinutes)} - ${formatTime(toMinutes)}`,
        durationMinutes: dur,
        title: it.title,
        details: it.details || ''
      };
    });
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;
