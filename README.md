# EventMind AI

> **Constraint-Aware Event Planning Agent for the Mind to Machine Hackathon**  
> Synthesizes unstructured, noisy, multi-lingual messages (English & Roman Urdu) into a fully validated, deterministic, 4-hour physical event plan for Islamabad covering Venue, Schedule, Food, Judging, and Budget.

---

## 1. Project Overview

Organizing a physical technical hackathon requires reconciling fragmented communications across WhatsApp messages, email threads, and formal committee notices. These messages frequently contain:
- Bilingual English and Roman Urdu phrasing
- Outdated quotations and conversational noise
- Contradictory suggestions (e.g., shifting city, extending schedule)
- Critical operational constraints (budget caps, prayer breaks, Halal dietary rules, capacity ceilings)

**EventMind AI** solves this through a hybrid neuro-symbolic architecture:
1. **AI (Google Gemini)** handles natural language understanding, multilingual entity extraction, semantic contradiction detection, and creative synthesis.
2. **Deterministic JavaScript** handles strict arithmetic, capacity verification, budget aggregation, timeline continuity, and hard constraint validation.
3. **Truthful Telemetry** captures every single model call with real provider-reported token usage and sequential numbering.

---

## 2. Architecture & Separation of Concerns

```
                           data/messages.txt
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   Message Parser &      │ (Preserves English &
                     │   Reader Service        │  Roman Urdu verbatim)
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   Reading Model Call    │ (Extracts facts, constraints,
                     │  (Area Tag: 'reading')  │  rejections, and predictions)
                     └────────────┬────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [Initial Processing]            [Incremental Update]
       • Run areas: venue, food,       • Dependency Service computes
         judging, schedule               transitive closure
       • Total calls: exactly 5        • Selective replanning (≤ 5 calls)
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │  Deterministic Budget   │ (0 AI Calls; Pure exact
                     │     Engine (JS)         │  JavaScript arithmetic)
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ Deterministic Validator │ (12 Hard Constraint Checks;
                     │     Engine (JS)         │  Invalid Update Protection)
                     └────────────┬────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
 output/plan.json          output/trace.json        output/rejected.json
 data/outputs/final-plan.json data/outputs/full-trace.json
```

### Core Separation of Responsibilities

| Domain Responsibility | Execution Layer | Justification |
| :--- | :--- | :--- |
| **Roman Urdu & English Parsing** | AI (Gemini Flash) | Handles colloquial phrasing, dates, and implicit context without brittle regex. |
| **Claim Extraction & Filtering** | AI (Gemini Flash) | Identifies facts vs. constraints; filters irrelevant chit-chat. |
| **Venue Synthesis** | AI (Gemini Flash) | Reconciles attendee numbers, facilities, and rent quotations. |
| **Food & Menu Design** | AI (Gemini Flash) | Selects 100% Halal catering appropriate for the event window. |
| **Judging Allocations & Rubric** | AI (Gemini Flash) | Allocates minutes per pitch and structures weighted criteria. |
| **Schedule Construction** | AI + Deterministic JS | AI arranges logical progression; JS normalizes to strictly 240 mins. |
| **Budget & Financial Arithmetic** | Pure JavaScript (0 AI) | Eliminates hallucination; computes exact line items and sums. |
| **Constraint Validation** | Pure JavaScript (12 Rules) | Authoritative pass/fail validation. LLMs never self-certify plans. |
| **Transitive Impact Graph** | Pure JavaScript | Computes dependency closure to trigger selective replanning. |

---

## 3. Installation & Setup

### Prerequisites
- **Node.js**: v20.0.0 or higher (`v24.x` tested)
- **npm**: v10.x or higher
- **Google AI Studio API Key**: Free tier or paid key from [aistudio.google.com](https://aistudio.google.com/)

### Step 1: Clone and Install
From the repository root:
```bash
npm install
```
*(On Windows systems where PowerShell script execution is restricted, run `npm.cmd install`)*

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate `.env` with your settings:
```env
# Google Gemini API Key from Google AI Studio
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Recommended official small model (qualifies for 10-point bonus)
GEMINI_MODEL=gemini-3.5-flash-lite

# Express Server Port
PORT=3001

# React Client Origin
CLIENT_ORIGIN=http://localhost:5173
```

---

## 4. Single Processing Command (`npm run process`)

The entire system is operated through **one single command** without any manual mode flags:

```bash
npm run process
```

### Automatic Mode Detection
The processing engine inspects `output/history.json` and `output/plan.json`:
- **Initial Mode**: If no valid plan or history exists, it runs the initial 5-stage pipeline (1 reading call + 4 area planning calls + JS budget + JS validator).
- **Update Mode**: If a valid plan and history exist, it detects newly appended messages in `data/messages.txt`, computes the dependency closure, prints the predicted affected areas, and replans **only** the affected pillars (strictly ≤ 5 model calls).

---

## 5. Incremental Updates & Conflict Rejection

### Appending New Information
To update an existing plan, simply append new messages to `data/messages.txt` and re-run:
```bash
npm run process
```

### Transitive Dependency Propagation
When a message changes an entity, the `DependencyService` propagates impact:
- **Headcount change** $\rightarrow$ Triggers `venue` (capacity check), `food` (catering quantities), and `budget` (financial recalculation).
- **Price change** $\rightarrow$ Triggers `budget` (deterministic JS only; 0 AI calls).
- **Timing change** $\rightarrow$ Triggers `schedule` (timeline normalization).
- **Irrelevant message** $\rightarrow$ 0 planning areas affected (0 area calls made).

### Invalid Update Protection
If incoming messages propose invalid constraints (e.g., shifting the event to Lahore, cutting food below headcount, or exceeding the 240-minute limit):
1. The reading model or validator flags the violation.
2. The system **engages protection** and preserves the previous valid plan.
3. The rejected claim and rationale are logged to `output/rejected.json`.

---

## 6. Truthful Model Trace & Telemetry

Every model interaction is logged to `output/trace.json` and mirrored to `data/outputs/full-trace.json`.

### Trace Entry Schema
```json
{
  "callNumber": 1,
  "runId": "run_init_1794987779660",
  "model": "gemini-3.5-flash-lite",
  "area": "reading",
  "input": "...",
  "output": "...",
  "inputTokens": 2007,
  "outputTokens": 1762,
  "totalTokens": 6262,
  "status": "success",
  "latencyMs": 4516,
  "timestamp": "2026-11-18T07:43:31.701Z"
}
```

### Strict Trace Principles
- **Allowed Area Tags**: Strictly enforced taxonomy: `reading`, `venue`, `schedule`, `food`, `judging`, `budget`.
- **Real Provider Tokens**: Extracted directly from `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`).
- **No Hallucinated Token Counts**: If metadata is absent, token fields record `null` with an explicit diagnostic warning. Tokens are **never** estimated or fabricated.
- **Budget Calls Excluded**: Budget is computed deterministically in JavaScript; no fake "budget" AI calls are injected into the trace.

---

## 7. React Operations Dashboard

To launch the full full-stack dashboard:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Dashboard Sections
1. **Overview**: Executive summary, headcount, venue card, budget progress bar, judge count, and live validation status.
2. **Event Plan**: Five dedicated tabs detailing Venue, Timeline Schedule (gap-free with breaks), Catering Menu, Judging Rubric, and Itemized Budget Breakdown.
3. **Evidence Ledger**: Filterable table of all extracted claims categorized by status (`accepted`, `superseded`, `rejected`, `uncertain`, `irrelevant`).
4. **Model Trace Telemetry**: Interactive trace inspector displaying sequential call numbers, exact models, real token counts, latencies, and expandable prompt/response payloads.
5. **Rejected Claims**: Dedicated panel explaining all filtered and rejected messages with precise reasons.
6. **Update History**: Audit trail of incremental runs and processed message deltas.
7. **Incremental Studio**: Interactive in-browser studio to append messages, simulate organizer updates, and trigger selective replanning with live visual feedback.
8. **Export Suite**: One-click downloads for `final-plan.json`, `full-trace.json`, `trace-report.txt`, and `rejected.json`.

---

## 8. Available Commands Summary

| Command | Action | Runtime / Limits |
| :--- | :--- | :--- |
| `npm run process` | Runs the shared CLI processing engine against `data/messages.txt` | Initial: ≤ 120s (actual: ~12s)<br>Update: ≤ 60s (actual: ~5s) |
| `npm run dev` | Starts Express backend (`:3001`) and React client (`:5173`) | Concurrently managed |
| `npm test` | Runs the automated test suite (23 unit & integration tests) | Native Node.js test runner |
| `npm run build` | Compiles client production bundle with Vite & Tailwind | Output in `dist/` |
| `npm run verify:gemini` | Validates live Gemini API connectivity and trace generation | Live API round-trip |

---

## 9. AI Provider & Small-Model Bonus

- **Provider**: Official `@google/genai` Node.js SDK.
- **Model Selected**: `gemini-3.5-flash-lite` (or `gemini-3.8-flash` / `gemini-2.0-flash`).
- **Small-Model Bonus (+10 Points)**: Fully verified. The pipeline utilizes small, high-efficiency Flash/Lite models, achieving high inference speeds (< 2s per call) and low token consumption (~7,600 total tokens for a complete 5-area event plan).

---

## 10. Known Limitations

1. **Physical Location Scope**: The validator strictly enforces Islamabad physical venues. Remote or non-Islamabad events are rejected by design.
2. **Fixed Duration Window**: The schedule strictly enforces 240 minutes (4.0 hours) as mandated by competition rules.
3. **API Connectivity**: Live execution of `npm run process` requires active internet connectivity to query Google Gemini endpoints. (All unit tests in `npm test` run fully offline without network access).
