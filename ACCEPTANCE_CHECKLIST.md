# EventMind AI — Acceptance & Evaluation Checklist

This checklist directly aligns with the official Mind to Machine Hackathon judging rubric and the project's mandatory specifications.

---

## 1. Hackathon Scoring Rubric & Verification Matrix

| Category | Points | Acceptance Criteria | Verification Method | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Output Correctness** | **30** | Generates a fully valid, coherent 4-hour physical event plan for Islamabad covering all 5 pillars: Venue, Schedule, Food, Judging, and Budget. Schedule is exactly 240 mins. | Deterministic JS validation engine checks 12 hard assertions on output. | 🔲 Planned |
| **Catching Incorrect Messages** | **20** | Identifies irrelevant, outdated, or contradictory claims (e.g. wrong city, invalid times, exceeding budget, canceled requests) and logs clear explanations. | Automated check in `output/rejected.json` with explanation strings. | 🔲 Planned |
| **Understanding the Architecture** | **20** | Single unified repository, shared processing engine between CLI & UI, strict separation of AI reasoning vs. deterministic JS calculations, zero hardcoded facts. | Codebase inspection, single engine import in `backend/cli.js` & `backend/routes/api.js`. | 🔲 Planned |
| **Handling Changes** | **10** | Incremental update mechanism preserves previous state, recalculates only affected pillars, limits calls to $\le 5$, and finishes within 60s. | Update benchmark test comparing plan diffs and call counts. | 🔲 Planned |
| **User Interface** | **10** | Polished React + Tailwind dashboard displaying the 5 plan pillars, live truthful model call trace with token stats, and rejected message breakdown. | Visual & functional verification of web UI on `http://localhost:5173`. | 🔲 Planned |
| **Predicting Affected Areas** | **5** | Explicitly predicts and prints which pillars will be called before executing them (`[PREDICTION] Affected areas: [...]`). | CLI console logs and API response matching actual downstream calls. | 🔲 Planned |
| **Token Efficiency** | **5** | Concise prompts, structured JSON outputs, zero redundant model queries, deterministic JS budget. Total tokens aggregated and reported. | Telemetry logs verifying truthful token metrics. | 🔲 Planned |
| **Small-Model Bonus** | **10** | Uses exclusively models from the approved small-model list (e.g., `gemini-2.0-flash` or `gemini-1.5-flash`), with all constraints and validations passing. | Configuration check of `GEMINI_MODEL` and trace logs verifying exact model name. | 🔲 Planned |
| **TOTAL** | **110** | **Maximum Possible Score (including 10-point bonus)** | | 🔲 |

---

## 2. Mandatory Functional Assertions

### Ingestion & Input Handling
- [ ] Reads all raw messages from file exactly as provided without modification.
- [ ] No hardcoded sample-pack messages or domain facts in source code.
- [ ] Accepts English and Roman Urdu messages interchangeably.
- [ ] Processes messages through the exact same engine across CLI and Web UI.

### Truthful Model Call Trace
- [ ] Sequential call numbers (1, 2, 3...).
- [ ] Exact model name recorded for every call.
- [ ] One valid area tag per call: strictly `reading`, `venue`, `schedule`, `food`, `judging`, or `budget`.
- [ ] Actual prompt input payload recorded.
- [ ] Actual model output response recorded.
- [ ] Actual input token count and output token count recorded.
- [ ] Cumulative token usage displayed.
- [ ] Trace saved to `output/trace.json`.

### Plan Pillars & Hard Constraints
- [ ] **Venue**: Physical venue located in Islamabad with adequate capacity.
- [ ] **Schedule**: Exactly 240 minutes (4.0 hours), sequential, gap-free.
- [ ] **Food**: 100% Halal, headcount-aligned catering, aligned with schedule breaks.
- [ ] **Judging**: Defined criteria rubric, presentation + Q&A time breakdown per team.
- [ ] **Budget**: 100% deterministic calculation in JavaScript (0 AI calls), within budget cap.
- [ ] Final plan saved to `output/plan.json`.

### Incremental Updates
- [ ] Accepts new messages after the initial run.
- [ ] Uses 1 reading model call to analyze deltas and predict affected areas.
- [ ] Emits prediction log before executing area reasoners.
- [ ] Executes model calls only for affected areas (max 4 area calls).
- [ ] Total update model calls $\le 5$ (including reading).
- [ ] Update completion time $\le 60$ seconds.
- [ ] Initial completion time $\le 120$ seconds.

### Persistence & Storage
- [ ] Uses local JSON files (`output/plan.json`, `output/trace.json`, `output/rejected.json`).
- [ ] Zero database dependencies (No MongoDB or external DBs).
- [ ] Environment variables kept in `.env` (never committed).
