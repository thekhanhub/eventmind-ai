# EventMind AI

**AI-powered, constraint-aware event planning agent for the Mind to Machine Hackathon.**

EventMind AI synthesizes unstructured English and Roman Urdu messages (emails, WhatsApp chats, announcements) to generate a valid, deterministic **4-hour physical event plan for Islamabad** covering **Venue**, **Schedule**, **Food**, **Judging**, and **Budget**.

---

## Architecture Principles

- **One Repository & One Package Strategy**: Unified root with standard npm workspaces (`server` and `client`).
- **Shared Processing Engine**: The exact same processing logic, validation rules, and AI calls are invoked by both the CLI (`npm run process`) and the React dashboard.
- **Strict Separation of Concerns**:
  - **AI (Gemini)**: Natural language & Roman Urdu understanding, fact extraction, constraint identification, contradiction detection, and creative pillar synthesis.
  - **JavaScript**: Arithmetic, budget calculations, duration checks, judge slot allocations, and 100% deterministic constraint validation.
- **Truthful Model Trace**: Every single model call is logged with sequential call number, exact model name, area tag, actual input/output payloads, and real token counts.
- **No Database Dependencies**: Fully local JSON file persistence (`output/plan.json`, `output/trace.json`, `output/rejected.json`).

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher (v24.x tested and supported)
- **npm**: v10.x or v11.x

### 2. Installation
Clone the repository and install all dependencies from the root:
```bash
npm install
```
*(On Windows systems where PowerShell script execution is restricted, run `npm.cmd install`)*

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate `.env` with your Google AI Studio Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```
> [!NOTE]
> EventMind AI uses official small models (such as `gemini-2.0-flash` or `gemini-1.5-flash`), optimizing token efficiency and qualifying for the 10-point hackathon bonus.

### 4. Input Messages File
Place the organizer's original text file at:
```
data/messages.txt
```
*(If the file is empty, `npm run process` will notify you and prompt you to copy the organizer's messages before processing).*

---

## Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both the Express backend (`localhost:3001`) and Vite React frontend (`localhost:5173`) concurrently. |
| `npm run process` | Executes the shared CLI processing engine against `data/messages.txt`. |
| `npm run build` | Builds the production bundle of the React client. |
| `npm test` | Runs the automated backend test suite using native Node.js test runner. |

---

## Directory Layout

```
eventmind-ai/
├── package.json               # Root scripts & workspaces definition
├── .env.example               # Environment variables template
├── .gitignore
├── README.md                  # This file
├── PROJECT_SPEC.md            # System specifications & domain rules
├── API_CONTRACT.md            # API endpoints & CLI specification
├── ACCEPTANCE_CHECKLIST.md    # 110-point evaluation matrix
├── data/
│   └── messages.txt           # Organizer raw messages input file (placeholder)
├── output/                    # Generated artifacts (plan.json, trace.json, rejected.json)
├── server/                    # Node.js + Express backend (ES Modules)
│   ├── src/
│   │   ├── config.js          # Environment config & path resolver
│   │   ├── index.js           # Express app & health endpoint
│   │   ├── cli.js             # Standalone CLI runner for npm run process
│   │   ├── core/
│   │   │   └── engine.js      # Shared processing engine
│   │   └── routes/
│   │       └── api.js         # REST endpoints for dashboard
│   └── test/
│       └── health.test.js     # Health & configuration tests
└── client/                    # React + Vite + Tailwind CSS frontend
    ├── src/
    │   ├── App.jsx            # React dashboard shell
    │   ├── services/api.js    # Axios backend client
    │   └── index.css          # Tailwind CSS styles
    ├── tailwind.config.js
    └── vite.config.js
```
