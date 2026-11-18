# EventMind AI — API & CLI Contract

## 1. Overview
The EventMind AI processing engine can be invoked either via the command line interface (`npm run process`) or via the Express REST API powering the React frontend. Both interfaces share the exact same underlying processing pipeline, dependency graph, deterministic validator, and trace recorder.

---

## 2. CLI Contract

### 2.1. Command
```bash
npm run process [-- --file <path-to-messages-file> [--update]]
```

### 2.2. Options & Flags
- `--file <path>` (optional): Path to raw text file containing messages. Defaults to `data/messages.txt`.
- `--update` (optional): Run in incremental update mode against existing `output/plan.json` instead of full rebuild.
- `--model <name>` (optional): Override model configured in `.env`.

### 2.3. Standard Output (stdout)
The CLI outputs human-readable progress updates with strict telemetry formatting:
```
[EventMind AI] Starting execution...
[EventMind AI] Mode: INITIAL | File: data/messages.txt
[EventMind AI] Ingested 10 raw messages.
[AI Trace #1] [reading] Model: gemini-2.0-flash | In: 850 tok | Out: 320 tok | Latency: 1420ms
[EventMind AI] Detected 2 rejected/conflicting claims.
[PREDICTION] Affected areas: ['venue', 'schedule', 'food', 'judging']. Planned AI calls: 4
[AI Trace #2] [venue]    Model: gemini-2.0-flash | In: 620 tok | Out: 210 tok | Latency: 980ms
[AI Trace #3] [schedule] Model: gemini-2.0-flash | In: 710 tok | Out: 340 tok | Latency: 1150ms
[AI Trace #4] [food]     Model: gemini-2.0-flash | In: 580 tok | Out: 190 tok | Latency: 870ms
[AI Trace #5] [judging]  Model: gemini-2.0-flash | In: 640 tok | Out: 250 tok | Latency: 1020ms
[EventMind AI] Calculating deterministic budget (0 AI calls)...
[EventMind AI] Running deterministic validation engine (12 checks passed)...
[EventMind AI] Process completed successfully in 8.4s.
[EventMind AI] Total Model Calls: 5 | Total Tokens: 5,110 (In: 3,400, Out: 1,710)
[EventMind AI] Artifacts written to output/plan.json, output/trace.json, output/rejected.json
```

---

## 3. REST API Contract

Base URL: `http://localhost:3001/api`

### 3.1. Health & Config Status
**`GET /api/health`**
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "model": "gemini-2.0-flash",
  "storage": {
    "planExists": true,
    "traceCount": 5,
    "rejectedCount": 2
  }
}
```

---

### 3.2. Initial Process Execution
**`POST /api/process/initial`**
- **Request Body**:
```json
{
  "rawText": "Raw text content of the messages...",
  "filePath": "optional/path/to/custom/messages.txt"
}
```
*Note: Either `rawText` or `filePath` can be supplied. If neither is supplied, it defaults to `data/messages.txt`.*

- **Response `200 OK`**:
```json
{
  "success": true,
  "executionMode": "INITIAL",
  "elapsedMs": 8420,
  "prediction": {
    "affectedAreas": ["venue", "schedule", "food", "judging"],
    "plannedModelCalls": 4
  },
  "tokenSummary": {
    "totalCalls": 5,
    "inputTokens": 3400,
    "outputTokens": 1710,
    "totalTokens": 5110
  },
  "plan": {
    "eventId": "evt_islamabad_m2m_001",
    "status": "VALID",
    "updatedAt": "2026-11-18T11:20:00.000Z",
    "areas": {
      "venue": {
        "name": "Pak-China Friendship Centre, Islamabad",
        "city": "Islamabad",
        "capacity": 150,
        "facilities": ["High-Speed Wi-Fi", "Backup Generator", "Projector & Sound", "Air Conditioning"],
        "cost": 65000,
        "constraintsSatisfied": true
      },
      "schedule": {
        "totalDurationMinutes": 240,
        "startTime": "14:00",
        "endTime": "18:00",
        "items": [
          { "time": "14:00 - 14:30", "durationMinutes": 30, "title": "Registration & Networking", "details": "Attendee badges and welcome kit distribution" },
          { "time": "14:30 - 15:00", "durationMinutes": 30, "title": "Opening Ceremony & Hackathon Kickoff", "details": "Keynote and problem statement release" },
          { "time": "15:00 - 16:30", "durationMinutes": 90, "title": "Sprint & Mentorship Session", "details": "Rapid prototyping with roaming mentors" },
          { "time": "16:30 - 17:30", "durationMinutes": 60, "title": "Project Pitches & Live Judging", "details": "Team presentations and live Q&A" },
          { "time": "17:30 - 18:00", "durationMinutes": 30, "title": "Scoring Tabulation & Awards Ceremony", "details": "Announcement of winners and closing remarks" }
        ]
      },
      "food": {
        "caterer": "Islamabad Gourmet Catering",
        "menuType": "Hi-Tea & Evening Refreshments",
        "headcount": 120,
        "dietary": "100% Halal; vegetarian options included",
        "items": ["Chicken Patties", "Vegetable Spring Rolls", "Sandwiches", "Gulab Jamun", "Karak Chai & Green Tea", "Mineral Water"],
        "costPerHead": 850,
        "totalFoodCost": 102000
      },
      "judging": {
        "judges": [
          { "name": "Dr. Sarah Khan", "domain": "AI / Machine Learning", "organization": "NUST" },
          { "name": "Taimur Malik", "domain": "Cloud & Scalability", "organization": "Tech Venture" }
        ],
        "rubric": [
          { "criterion": "Innovation & AI Depth", "weight": 35 },
          { "criterion": "Technical Execution", "weight": 30 },
          { "criterion": "Practical Viability", "weight": 20 },
          { "criterion": "Presentation & Q&A", "weight": 15 }
        ],
        "presentationFormat": {
          "totalTeams": 10,
          "minutesPerTeam": 5,
          "qaMinutesPerTeam": 2,
          "totalJudgingMinutes": 60
        }
      },
      "budget": {
        "currency": "PKR",
        "budgetCap": 250000,
        "totalAllocated": 217000,
        "remainingBuffer": 33000,
        "breakdown": [
          { "item": "Venue Booking & Facilities", "amount": 65000, "calculation": "Flat hall rental fee" },
          { "item": "Hi-Tea Catering", "amount": 102000, "calculation": "120 heads x 850 PKR" },
          { "item": "Audio-Visual & Backup Tech", "amount": 25000, "calculation": "Sound system, mics, backup router" },
          { "item": "Awards & Winner Prizes", "amount": 25000, "calculation": "Shields & prize pool" }
        ],
        "isWithinBudget": true
      }
    }
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

---

### 3.3. Incremental Update Execution
**`POST /api/process/update`**
- **Request Body**:
```json
{
  "newMessages": [
    {
      "id": "msg_011",
      "raw": "Namaz break add karni hai 15:45 pe 15 minutes ki, aur headcount 140 ho gayi hai."
    }
  ]
}
```

- **Update Constraints Enforced**:
  1. Maximum 5 model calls: 1 reading call + up to 4 area calls.
  2. Budget calculated deterministically in JS (0 calls).
  3. Execution completes in $\le 60$ seconds.
  4. Returns updated plan with mutated fields and version bump.

---

### 3.4. Retrieve Active Plan
**`GET /api/plan`**
- **Response `200 OK`**: Returns current `plan.json` object.

---

### 3.5. Retrieve Model Call Trace
**`GET /api/trace`**
- **Response `200 OK`**:
```json
{
  "totalCalls": 5,
  "totalInputTokens": 3400,
  "totalOutputTokens": 1710,
  "totalTokens": 5110,
  "trace": [
    {
      "callNumber": 1,
      "model": "gemini-2.0-flash",
      "areaTag": "reading",
      "timestamp": "2026-11-18T11:20:01.120Z",
      "latencyMs": 1420,
      "inputTokens": 850,
      "outputTokens": 320,
      "inputPayload": "Prompt containing raw messages...",
      "outputPayload": "Extracted facts and predicted affected areas JSON..."
    }
  ]
}
```

---

### 3.6. Retrieve Rejected & Contradictory Claims
**`GET /api/rejected`**
- **Response `200 OK`**:
```json
{
  "count": 2,
  "rejected": [
    {
      "messageId": "msg_004",
      "raw": "Event should be in Lahore at Expo Centre",
      "reason": "Hard constraint violation: Event must be a physical event in Islamabad.",
      "detectedAt": "2026-11-18T11:20:02.000Z",
      "area": "venue"
    },
    {
      "messageId": "msg_007",
      "raw": "We can stretch the schedule to 6 hours",
      "reason": "Schedule violation: Event duration is strictly 4 hours (240 minutes).",
      "detectedAt": "2026-11-18T11:20:02.000Z",
      "area": "schedule"
    }
  ]
}
```
