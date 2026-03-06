---
description: "Use when building FlowReach AI, a lead outreach workflow automation platform. Covers project structure, phased build process, tech stack, error handling, progress tracking, and coding standards for all frontend (React/Vite) and backend (Express/SQLite) work."
applyTo: "**"
---

# FlowReach AI — Master Build Instructions

## Identity

You are building **FlowReach AI**, a lead outreach workflow automation platform.
You are using **Claude Opus 4.6** as the AI model.

## Tech Stack

```
Frontend:       React + Vite (port 5173)
UI:             Tailwind CSS (light theme, indigo primary, zinc neutrals)
Icons:          lucide-react
Workflow:       @xyflow/react
Charts:         recharts
CSV/Excel:      xlsx (SheetJS)
Realtime FE:    socket.io-client
Notifications:  react-hot-toast
HTTP:           axios
Router:         react-router-dom

Backend:        Node.js + Express (port 3001)
Database:       SQLite via better-sqlite3
AI:             groq-sdk (model: llama-3.3-70b-versatile)
Realtime BE:    socket.io
Email:          nodemailer
```

## Phase Execution Rules

- Build **one phase at a time** — complete it fully before moving to the next.
- Start each phase by announcing: `"Starting Phase [N]: [Name]. I will now build: [list]"`
- End each phase by announcing: `"Phase [N] complete. Please test: [checklist]. Reply with ✅ to continue."`
- If user pastes an error: fix immediately, log to ERRORS.md, update PROGRESS.md, confirm fix.
- Never ask "should I continue?" — state what's next and wait for user to say "continue" or "next".
- Never start Phase N+1 until user confirms Phase N works.

## Progress Tracking

Maintain two files at the project root after every task:

### PROGRESS.md

```markdown
# FlowReach AI — Build Progress

Last Updated: [timestamp]
Current Phase: [phase number and name]
Overall Status: [X / 9 phases complete]

## ✅ Completed Tasks
- [x] Phase 0 — Task description

## 🔄 In Progress
- [ ] Phase N — Current task

## ⏳ Remaining Tasks
- [ ] Phase N — Upcoming task

## ❌ Errors Encountered
- Phase N: brief description → see ERRORS.md entry #N
```

### ERRORS.md

```markdown
# FlowReach AI — Error Log

## Error #N
Phase: N
Time: [timestamp]
Error Message: `exact error`
File: path/to/file
Cause: explanation
Fix Applied: what was done
Status: ✅ Resolved / ❌ Open
```

## Coding Standards

- **No placeholders** — never write `// TODO`, `// add logic here`, or fake return values.
- **No placeholder functions** that return hardcoded empty values (stub pages are the only exception).
- **Show exact install commands** when installing packages.
- **Every error gets logged** in ERRORS.md — no skipping.
- **Fix errors before moving on** — never skip a failed task.

## Error Handling Protocol

When any error occurs:

1. Stop immediately
2. Log to ERRORS.md with full error message, file, cause, and fix
3. Update PROGRESS.md — mark the task as errored
4. Apply the fix and show corrected code
5. Confirm: `"Error #N resolved. Continuing with [task name]"`

## Validation Checklist Per Phase

| Phase | Validation |
|-------|-----------|
| 0 | `curl http://localhost:3001/health` returns `{"status":"ok"}` |
| 1 | All 5 nav links work, active link highlighted, no console errors |
| 2 | Upload sample.csv, see 50 rows in table, status badges showing |
| 3 | Dashboard shows non-zero stats, charts render, no NaN values |
| 4 | 3 workflow templates load, nodes draggable, config panel opens on click |
| 5 | AI preview modal shows 3 different personalized emails |
| 6 | Execute workflow on 3 leads, Live Feed shows node transitions in real-time |
| 7 | Blacklist blocks email send (log it), daily limit counter shows in settings |
| 8 | `npm run seed` logs "✓ Seeded 50 leads", dashboard shows real chart data |
| 9 | Demo flow runs end-to-end without any crash or uncaught error |

## All 9 Phases (Master Task List)

### Phase 0 — Bootstrap + Project Structure
- Root package.json with concurrently script
- Scaffold Vite + React in /frontend with all dependencies
- Configure tailwind.config.js, set CSS variables (light theme, indigo primary)
- Create src/main.jsx with BrowserRouter + Toaster, placeholder App.jsx
- /backend with Express + CORS + Socket.io
- SQLite with 6 tables: leads, workflows, executions, messages, blacklist, daily_send_counts
- GET /health route, dev scripts, .env.example

### Phase 1 — App Shell: Layout, Sidebar, Routing
- Sidebar.jsx (5 nav links), Header.jsx, AppLayout.jsx
- 5 page stubs: Dashboard, Leads, Workflows, Executions, Settings
- App.jsx with all routes wrapped in AppLayout

### Phase 2 — Lead Import (CSV/Excel Upload)
- POST /api/leads/bulk, GET /api/leads
- LeadImport.jsx (3-step: drag-drop → column mapping → preview + import)
- LeadsTable.jsx with search + status badges
- Leads.jsx with two tabs (All Leads / Import)

### Phase 3 — Dashboard with Real Stats
- GET /api/stats/overview
- 4 stat cards, BarChart (leads by status), LineChart (messages last 7 days)
- Loading skeletons, 10-second auto-refresh

### Phase 4 — Visual Workflow Builder
- Full CRUD API for workflows + seed templates endpoint
- 7 node components: Start, AIGenerate, Email, Delay, Condition, UpdateLead, End
- NodeConfigPanel with all 7 node forms
- WorkflowBuilder with canvas + palette + config panel

### Phase 5 — AI Message Generation
- backend/ai.js with Groq SDK, POST /api/ai/generate, POST /api/ai/preview
- Fallback mock data when GROQ_API_KEY not set
- AIPreviewModal, "Preview AI Messages" button in NodeConfigPanel

### Phase 6 — Execution Engine + Real-time Streaming
- WorkflowExecutor class with methods for each node type
- Socket.io-based live logging
- POST /api/executions/run, GET /api/executions
- Live Feed tab + History tab in Executions.jsx
- Execute button + lead selection modal

### Phase 7 — Safety Controls + Settings
- Blacklist check + daily send limit in executor
- Settings API endpoints, Blacklist CRUD
- Settings.jsx with 3 sections, SafetyScore SVG gauge

### Phase 8 — Seed Data + Polish
- seed.js with 50 realistic leads + execution history + daily counts
- Skeleton components, system online/offline indicator
- Keyboard shortcuts (D/L/W/E) + help modal, refresh button, timestamps

### Phase 9 — Final Demo Hardening
- Error handling in executor, connect_error handling + offline banner
- Workflow validation before execution, Download Sample CSV button
- POST /api/seed/reset, Reset Demo Data button, full end-to-end check

## Start Command

When user says "start" or "begin":

```
Starting FlowReach AI build.

Creating PROGRESS.md and ERRORS.md first, then beginning Phase 0.

Phase 0: Bootstrap + Project Structure
I will create:
- Root package.json with concurrently
- /frontend Vite + React project with all dependencies
- /backend Node.js + Express with SQLite and all 6 tables
- .env.example

Building now...
```

Then build Phase 0 completely. Update PROGRESS.md after every file created.
