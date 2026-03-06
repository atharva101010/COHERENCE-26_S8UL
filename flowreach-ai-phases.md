# FlowReach AI — Phased Build Plan for Claude Opus 4.6

> **How to use this:** Copy each phase's prompt EXACTLY into Claude. Wait for it to finish and confirm it works before moving to the next phase. Never skip a phase.

---

## Rules Before Starting

- ✅ Run every phase to completion before starting the next
- ✅ Test each phase in browser before moving on
- ✅ If Claude stops mid-phase, say: *"Continue from where you left off"*
- ✅ If something breaks, say: *"Fix the error: [paste error]"*
- ❌ Never give Claude two phases at once
- ❌ Never accept code with `// TODO` or placeholder comments

---

## Project Stack (Tell Claude at the start of every session)

```
Frontend: React + Vite
UI: shadcn/ui + Tailwind CSS
Workflow Canvas: @xyflow/react
Charts: Recharts
Excel/CSV: SheetJS (xlsx)
Realtime: Socket.io-client
Backend: Node.js + Express
Database: SQLite (better-sqlite3)
AI: Groq SDK (llama-3.3-70b-versatile)
Realtime Server: Socket.io
Notifications: react-hot-toast
HTTP Client: axios
```

---

## Phase 0 — Bootstrap + Project Structure

**Estimated time: 20 min**
**Goal: Working Vite app + Express backend both running, SQLite DB initialized**

### What gets built:
- Vite + React frontend scaffolded
- Express backend with SQLite initialized with all 4 tables
- `.env` file structure
- CORS configured between frontend (port 5173) and backend (port 3001)
- Both servers running simultaneously with `concurrently`

### Prompt for Claude:

```
Build the complete project bootstrap for FlowReach AI, a lead outreach automation platform.

Create the following structure:

PROJECT ROOT:
- package.json (root, with concurrently to run both frontend and backend)
- .env.example

FRONTEND (in /frontend):
- Vite + React project
- Install: @xyflow/react, tailwindcss, @tailwindcss/vite, recharts, xlsx, socket.io-client, axios, react-hot-toast, react-router-dom, lucide-react
- tailwind.config.js configured
- src/index.css with Tailwind directives + CSS variables for the app theme (light theme, primary color #6366f1 indigo, use zinc for neutrals)
- src/main.jsx with BrowserRouter and Toaster from react-hot-toast
- src/App.jsx with placeholder text "FlowReach AI Loading..." just to confirm it works

BACKEND (in /backend):
- package.json with: express, better-sqlite3, socket.io, cors, nodemailer, groq-sdk, dotenv, multer
- server.js that:
  - loads dotenv
  - creates Express app on PORT 3001
  - configures CORS for http://localhost:5173
  - creates HTTP server and attaches Socket.io
  - initializes SQLite database (flowreach.db)
  - creates all 4 tables if they don't exist:

    leads table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      company TEXT,
      job_title TEXT,
      industry TEXT,
      company_size TEXT,
      pain_point TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    workflows table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      is_template INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

    executions table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER NOT NULL,
      workflow_name TEXT,
      lead_id INTEGER NOT NULL,
      lead_email TEXT,
      status TEXT DEFAULT 'pending',
      current_node_id TEXT,
      current_node_type TEXT,
      logs TEXT DEFAULT '[]',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME

    messages table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      execution_id INTEGER,
      channel TEXT DEFAULT 'email',
      subject TEXT,
      body TEXT,
      ai_generated INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP

    blacklist table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      reason TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP

    daily_send_counts table:
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(date)

  - adds a GET /health route that returns { status: 'ok', db: 'connected', timestamp: new Date() }
  - logs "FlowReach AI backend running on port 3001" on start

ROOT package.json scripts:
  "dev": "concurrently \"npm run dev --prefix frontend\" \"npm run dev --prefix backend\""
  "install:all": "npm install && npm install --prefix frontend && npm install --prefix backend"

backend/package.json scripts:
  "dev": "node --watch server.js"

Give me every file completely. No placeholders. No TODOs.
```

### ✅ Confirm before moving on:
- [ ] `npm run install:all` completes without errors
- [ ] `npm run dev` starts both servers
- [ ] `http://localhost:5173` shows "FlowReach AI Loading..."
- [ ] `http://localhost:3001/health` returns `{ status: 'ok' }`

---

## Phase 1 — App Shell: Layout, Sidebar, Routing

**Estimated time: 30 min**
**Goal: Full app layout with working navigation between 5 pages**

### What gets built:
- Persistent sidebar with navigation links
- Top header bar
- 5 page components (Dashboard, Leads, Workflows, Executions, Settings) — each with a title and placeholder content
- React Router routing between all pages
- Active link highlighting in sidebar

### Prompt for Claude:

```
Build the complete app shell for FlowReach AI. The frontend already exists at /frontend/src with React Router in main.jsx.

Build these files completely with no placeholders:

1. src/components/layout/Sidebar.jsx
   - Fixed left sidebar, 240px wide, white background, border-right zinc-200
   - App logo at top: rocket emoji + "FlowReach AI" in bold indigo text
   - Navigation links using react-router-dom NavLink:
     - /  → Dashboard (LayoutDashboard icon from lucide-react)
     - /leads → Leads (Users icon)
     - /workflows → Workflows (GitBranch icon)
     - /executions → Executions (Play icon)
     - /settings → Settings (Settings icon)
   - Active link: indigo-100 background, indigo-700 text, left border-2 border-indigo-600
   - Inactive: zinc-600 text, hover zinc-100 background
   - At bottom of sidebar: small text showing "FlowReach AI v1.0" in zinc-400

2. src/components/layout/Header.jsx
   - Full width top bar, height 56px, white background, border-bottom zinc-200
   - Left: current page name as h1 (large, bold, zinc-900)
   - Right: a badge showing "Demo Mode" in indigo, and a circle avatar placeholder with initials "NP"

3. src/components/layout/AppLayout.jsx
   - Wraps all pages
   - Renders Sidebar on left, Header on top, and {children} in main content area
   - Main content area: zinc-50 background, padding 24px, overflow-y auto
   - Full height layout (100vh)

4. src/pages/Dashboard.jsx
   - Just renders: <div><h2>Dashboard</h2><p>Analytics overview goes here</p></div>

5. src/pages/Leads.jsx
   - Just renders: <div><h2>Leads</h2><p>Lead management goes here</p></div>

6. src/pages/Workflows.jsx
   - Just renders: <div><h2>Workflows</h2><p>Workflow builder goes here</p></div>

7. src/pages/Executions.jsx
   - Just renders: <div><h2>Executions</h2><p>Execution history goes here</p></div>

8. src/pages/Settings.jsx
   - Just renders: <div><h2>Settings</h2><p>Settings go here</p></div>

9. src/App.jsx
   - Uses Routes and Route from react-router-dom
   - Wraps all routes in <AppLayout>
   - Route "/" → <Dashboard />
   - Route "/leads" → <Leads />
   - Route "/workflows" → <Workflows />
   - Route "/executions" → <Executions />
   - Route "/settings" → <Settings />

Give every file completely. No placeholders. Use only inline Tailwind classes, no custom CSS.
```

### ✅ Confirm before moving on:
- [ ] Sidebar visible on left with all 5 nav items
- [ ] Clicking each nav item changes the page content
- [ ] Active link is highlighted
- [ ] Header shows correct page name

---

## Phase 2 — Lead Import (CSV/Excel Upload)

**Estimated time: 45 min**
**Goal: Full working CSV/Excel upload with column preview, mapping, and save to DB**

### What gets built:
- Drag-and-drop file upload zone
- SheetJS CSV/Excel parsing in browser
- Column mapping UI (user maps file columns to lead fields)
- Data preview table (first 10 rows)
- POST to backend to save leads
- Backend bulk insert endpoint with duplicate detection

### Prompt for Claude:

```
Build the complete lead import feature for FlowReach AI.

BACKEND — add to server.js:

POST /api/leads/bulk
- Accepts JSON body: { leads: [...] } where each lead has: first_name, last_name, email, company, job_title, industry, company_size, pain_point
- Validates that first_name, last_name, email exist for each lead — skip invalid rows
- Uses INSERT OR IGNORE to skip duplicates
- Returns { imported: number, skipped: number, total: number }

GET /api/leads
- Returns all leads from DB ordered by created_at DESC
- Returns array of lead objects

FRONTEND — build these files:

1. src/pages/Leads.jsx
   - Two tabs at top: "All Leads" and "Import Leads" using plain div tabs (not a library)
   - Default tab: "All Leads"
   - "All Leads" tab renders <LeadsTable />
   - "Import Leads" tab renders <LeadImport />

2. src/components/leads/LeadImport.jsx
   Complete multi-step import flow:

   STEP 1 — Upload File:
   - Large dashed border upload zone (zinc-200 border, zinc-50 background, rounded-xl)
   - Centered content: upload cloud icon (lucide), "Drop your CSV or Excel file here" in zinc-500, "or click to browse" link text in indigo-600
   - onClick opens file input (accept .csv, .xlsx, .xls)
   - onDrop also works
   - Parse file using SheetJS: import * as XLSX from 'xlsx'
   - Read file as binary, parse first sheet, convert to JSON array
   - After parsing: show file name, row count, and "Next: Map Columns" button in indigo

   STEP 2 — Map Columns:
   - Shows a grid of 9 field mapping rows
   - FlowReach fields: first_name (required), last_name (required), email (required), company, job_title, industry, company_size, pain_point
   - Each row: field label on left (with red asterisk if required), dropdown on right with all detected column names from the file + "-- skip this field --" option
   - Auto-detect: if file column name matches or contains the field name, pre-select it
   - "Preview Data" button at bottom → only enabled if all 3 required fields are mapped

   STEP 3 — Preview & Import:
   - Shows a table of first 10 rows using the mapped columns
   - Columns: First Name, Last Name, Email, Company, Job Title, Industry, Company Size, Pain Point
   - Below table: "Import [N] Leads" button in indigo, and "Back" button
   - On import click:
     - Map raw file rows to lead objects using the column mapping
     - POST to /api/leads/bulk
     - Show loading spinner on button
     - On success: show green success message "✓ Imported X leads, skipped Y duplicates"
     - Show "Go to Leads" button that switches to All Leads tab
   - Use react-hot-toast for success/error toasts

3. src/components/leads/LeadsTable.jsx
   - On mount: GET /api/leads
   - Show loading skeleton (5 rows of gray animated pulse) while fetching
   - Empty state: if no leads, show Users icon centered + "No leads yet" + "Import your first leads →" button that triggers tab switch (use a callback prop: onImportClick)
   - Table with columns: Name (first + last), Email, Company, Job Title, Industry, Company Size, Status, Imported
   - Status column: colored badge — new=blue, contacted=yellow, replied=green, converted=indigo, unsubscribed=red
   - "Imported" column: formatted date (e.g. "Mar 6")
   - Above table: search input (filters Name/Email/Company client-side), and total count "X leads"
   - Zebra striping on rows (even rows: zinc-50)
   - No pagination needed for now

Give every file completely. No placeholders. No TODOs. All error handling included.
```

### ✅ Confirm before moving on:
- [ ] File upload zone accepts drag-and-drop
- [ ] CSV parsing shows column mapping step
- [ ] Import saves to SQLite and shows success message
- [ ] All Leads tab shows imported leads in a table
- [ ] Search filters the table

---

## Phase 3 — Dashboard with Real Stats

**Estimated time: 30 min**
**Goal: Dashboard with live stat cards and charts pulling from real DB data**

### What gets built:
- 4 stat cards: Total Leads, Emails Sent, Active Workflows, Success Rate
- Bar chart: leads by status
- Line chart: messages sent over last 7 days
- All data from real backend endpoints

### Prompt for Claude:

```
Build the complete Dashboard page for FlowReach AI using real data from the backend.

BACKEND — add to server.js:

GET /api/stats/overview
- Query the DB and return:
  {
    total_leads: count of all leads,
    emails_sent: count of all messages,
    active_workflows: count of all workflows,
    success_rate: percentage of executions with status 'completed' (0 if none),
    leads_by_status: [{ status: 'new', count: N }, { status: 'contacted', count: N }, ...] — all 5 statuses even if 0,
    messages_last_7_days: [{ date: 'Mon', count: N }, ...] — last 7 days labels and counts from messages table by sent_at date
  }

FRONTEND:

1. src/pages/Dashboard.jsx
   Complete dashboard with:

   a) Stats row — 4 cards side by side (grid-cols-4 on desktop, grid-cols-2 on mobile)
      Each card (white bg, border zinc-200, rounded-xl, p-5):
      - Icon on top-left (colored background circle)
      - Metric value in large bold text
      - Label below in zinc-500
      - Subtle bottom trend text in zinc-400 ("Updated live")
      Cards:
      - Total Leads: Users icon, indigo
      - Emails Sent: Mail icon, green
      - Active Workflows: GitBranch icon, violet
      - Success Rate: TrendingUp icon, orange — shows as "X%"

   b) Charts row — 2 charts side by side (grid-cols-2)
      Left chart (white bg, border, rounded-xl, p-5):
      - Title: "Leads by Status"
      - Recharts BarChart with leads_by_status data
      - Each bar a different color: new=indigo, contacted=yellow, replied=green, converted=violet, unsubscribed=red
      - X axis: status, Y axis: count
      - Responsive container, height 240px

      Right chart (white bg, border, rounded-xl, p-5):
      - Title: "Messages Sent (Last 7 Days)"
      - Recharts LineChart with messages_last_7_days data
      - Single indigo line with dots
      - X axis: date label, Y axis: count
      - Responsive container, height 240px

   c) Data fetching:
      - useEffect on mount: fetch /api/stats/overview
      - Loading state: show skeleton placeholders (pulse animation) for cards and charts
      - Error state: show "Failed to load stats. Retry" button
      - Auto-refresh every 10 seconds using setInterval (clear on unmount)

Give every file completely. No placeholders.
```

### ✅ Confirm before moving on:
- [ ] Dashboard shows 4 stat cards with numbers from DB
- [ ] Bar chart shows lead status distribution
- [ ] Line chart shows messages over 7 days
- [ ] Stats auto-refresh every 10 seconds

---

## Phase 4 — Visual Workflow Builder

**Estimated time: 90 min**
**Goal: Full drag-and-drop workflow canvas with 7 node types, config panels, save/load, and 3 templates**

### What gets built:
- React Flow canvas with custom nodes
- Node palette sidebar (drag nodes onto canvas)
- Right-side config panel per node type
- Save workflow to backend
- Load existing workflows
- 3 pre-built templates inserted at startup

### Prompt for Claude:

```
Build the complete visual workflow builder for FlowReach AI using @xyflow/react.

BACKEND — add to server.js:

GET /api/workflows
- Returns all workflows ordered by created_at DESC

POST /api/workflows
- Body: { name, description, nodes, edges }
- nodes and edges stored as JSON strings
- Returns the created workflow with id

PUT /api/workflows/:id
- Body: { name, description, nodes, edges }
- Updates workflow, sets updated_at = CURRENT_TIMESTAMP
- Returns updated workflow

DELETE /api/workflows/:id
- Deletes workflow by id
- Returns { deleted: true }

POST /api/workflows/seed-templates
- If no workflows exist, insert these 3 templates:

Template 1 — "Cold Outreach Sequence":
  nodes: [
    { id: 'n1', type: 'startNode', position: {x:250,y:50}, data: { label:'Start', segment:'all' } },
    { id: 'n2', type: 'aiGenerateNode', position: {x:250,y:160}, data: { label:'AI Generate', tone:'professional', length:'medium', focus:'value_prop' } },
    { id: 'n3', type: 'emailNode', position: {x:250,y:280}, data: { label:'Send Email', subject:'{{ai_subject}}', body:'{{ai_body}}', use_ai:true } },
    { id: 'n4', type: 'delayNode', position: {x:250,y:400}, data: { label:'Wait 3 Days', min_hours:72, max_hours:96 } },
    { id: 'n5', type: 'conditionNode', position: {x:250,y:520}, data: { label:'Replied?', field:'status', operator:'eq', value:'replied' } },
    { id: 'n6', type: 'endNode', position: {x:100,y:640}, data: { label:'End (No Reply)', final_status:'no_reply' } },
    { id: 'n7', type: 'endNode', position: {x:400,y:640}, data: { label:'End (Replied)', final_status:'replied' } }
  ]
  edges: [
    {id:'e1',source:'n1',target:'n2'},{id:'e2',source:'n2',target:'n3'},
    {id:'e3',source:'n3',target:'n4'},{id:'e4',source:'n4',target:'n5'},
    {id:'e5',source:'n5',target:'n6',label:'No'},{id:'e6',source:'n5',target:'n7',label:'Yes'}
  ]

Template 2 — "Follow-Up Sequence":
  nodes: [
    { id:'n1',type:'startNode',position:{x:250,y:50},data:{label:'Start',segment:'contacted'} },
    { id:'n2',type:'delayNode',position:{x:250,y:160},data:{label:'Wait 2 Days',min_hours:48,max_hours:72} },
    { id:'n3',type:'aiGenerateNode',position:{x:250,y:280},data:{label:'AI Follow-up',tone:'casual',length:'short',focus:'pain_point'} },
    { id:'n4',type:'emailNode',position:{x:250,y:400},data:{label:'Send Follow-up',subject:'{{ai_subject}}',body:'{{ai_body}}',use_ai:true} },
    { id:'n5',type:'endNode',position:{x:250,y:520},data:{label:'End',final_status:'followed_up'} }
  ]
  edges: [{id:'e1',source:'n1',target:'n2'},{id:'e2',source:'n2',target:'n3'},{id:'e3',source:'n3',target:'n4'},{id:'e4',source:'n4',target:'n5'}]

Template 3 — "Re-engagement":
  nodes: [
    { id:'n1',type:'startNode',position:{x:250,y:50},data:{label:'Start',segment:'no_reply'} },
    { id:'n2',type:'aiGenerateNode',position:{x:250,y:160},data:{label:'AI Re-engage',tone:'friendly',length:'short',focus:'pain_point'} },
    { id:'n3',type:'emailNode',position:{x:250,y:280},data:{label:'Re-engagement Email',subject:'{{ai_subject}}',body:'{{ai_body}}',use_ai:true} },
    { id:'n4',type:'endNode',position:{x:250,y:400},data:{label:'End',final_status:'re_engaged'} }
  ]
  edges: [{id:'e1',source:'n1',target:'n2'},{id:'e2',source:'n2',target:'n3'},{id:'e3',source:'n3',target:'n4'}]

FRONTEND:

1. src/pages/Workflows.jsx
   - On mount: GET /api/workflows, then POST /api/workflows/seed-templates (to seed if empty), then GET again
   - Left panel (260px): list of all workflows as cards
     - Each card: workflow name, description, "Open" button, "Delete" button (with confirm)
     - "New Workflow" button at top → creates blank workflow and opens it
   - Right panel (flex-1): renders <WorkflowBuilder /> when a workflow is selected, else shows empty state with "Select or create a workflow"

2. src/components/workflow/WorkflowBuilder.jsx
   Props: workflow (object), onSave (callback)
   - Uses ReactFlow with these imports: ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState
   - Initializes nodes and edges from workflow.nodes and workflow.edges (parsed from JSON if string)
   - Canvas: white background, BackgroundVariant.Dots
   - Left palette panel (200px, border-right): title "Nodes", then draggable node type cards for:
     Start, AI Generate, Send Email, Smart Delay, Condition, Update Lead, End
     Each card: icon + name + small description, drag to add
   - onDrop handler: when node is dropped on canvas, add new node of that type with default data
   - onConnect handler: connects nodes using addEdge
   - Right config panel (240px, border-left): shows when a node is selected
     - Renders <NodeConfigPanel node={selectedNode} onChange={updateNodeData} />
   - Top toolbar: workflow name (editable input), "Save" button (indigo), "Back" button
   - onSave: PUT /api/workflows/:id with current nodes, edges, name
   - Show react-hot-toast on save success/failure

3. src/components/workflow/nodes/StartNode.jsx
   - Green border (border-green-400), white bg, rounded-xl, p-3, min-w 160px
   - Header: green dot + "Start" label
   - Body: small text showing data.segment or "All leads"
   - Only source handle (bottom, position Bottom)

4. src/components/workflow/nodes/AIGenerateNode.jsx
   - Violet border, white bg
   - Header: robot emoji + "AI Generate"
   - Body: shows tone, length as small pills
   - Target handle (top) + source handle (bottom)

5. src/components/workflow/nodes/EmailNode.jsx
   - Blue border, white bg
   - Header: mail emoji + "Send Email"
   - Body: shows subject (truncated to 30 chars) or "No subject"
   - Shows "AI" badge if use_ai is true
   - Target handle (top) + source handle (bottom)

6. src/components/workflow/nodes/DelayNode.jsx
   - Yellow/amber border, white bg
   - Header: clock emoji + "Smart Delay"
   - Body: shows "min_hours–max_hours hrs"
   - Target handle (top) + source handle (bottom)

7. src/components/workflow/nodes/ConditionNode.jsx
   - Orange border, white bg, diamond shape using CSS transform rotate(45deg) on border div
   - Header: arrows emoji + "Condition"
   - Body: shows "field operator value"
   - Target handle (top), two source handles: bottom-left (label "No"), bottom-right (label "Yes")

8. src/components/workflow/nodes/UpdateLeadNode.jsx
   - Teal border, white bg
   - Header: pencil emoji + "Update Lead"
   - Body: shows field and value
   - Target + source handles

9. src/components/workflow/nodes/EndNode.jsx
   - Red border, white bg
   - Header: stop emoji + "End"
   - Body: shows final_status
   - Only target handle (top)

10. src/components/workflow/NodeConfigPanel.jsx
    Props: node (selected node object), onChange(nodeId, newData)
    Renders different form fields based on node.type:

    startNode: text input for "Lead Segment" (label says which segment to target)
    
    aiGenerateNode:
      - Select for tone: professional, casual, friendly, urgent
      - Select for length: short, medium, long
      - Select for focus: value_prop, pain_point, social_proof
    
    emailNode:
      - Text input for subject (placeholder: "{{ai_subject}} or write your own")
      - Textarea for body (placeholder: "{{ai_body}} or write your own")
      - Checkbox: "Use AI generated content"
    
    delayNode:
      - Number input for min_hours (label: "Min Hours")
      - Number input for max_hours (label: "Max Hours")
      - Checkbox: "Business hours only"
    
    conditionNode:
      - Select for field: status, company_size, industry, job_title
      - Select for operator: eq, not_eq, contains
      - Text input for value
    
    updateLeadNode:
      - Select for field: status
      - Select for value (when field=status): new, contacted, replied, converted, unsubscribed
    
    endNode:
      - Text input for final_status (e.g. replied, no_reply, converted)

    All inputs call onChange(node.id, { ...node.data, [field]: value }) on change
    Panel title: node type name, close button (X) that deselects

Give every file completely. No placeholders. Import @xyflow/react styles in WorkflowBuilder.jsx: import '@xyflow/react/dist/style.css'
```

### ✅ Confirm before moving on:
- [ ] Workflows page shows 3 template cards
- [ ] Opening a workflow shows the React Flow canvas with nodes
- [ ] Can drag new nodes from palette onto canvas
- [ ] Clicking a node opens config panel on the right
- [ ] Save button persists changes to backend

---

## Phase 5 — AI Message Generation (Groq)

**Estimated time: 40 min**
**Goal: Working Groq AI endpoint + message preview UI that shows AI-generated emails per lead**

### What gets built:
- Groq SDK integration in backend
- AI generate endpoint that takes lead + config and returns subject + body
- Message preview modal showing AI output for 3 sample leads
- Loading states with streaming feel

### Prompt for Claude:

```
Build the complete AI message generation feature for FlowReach AI using Groq.

BACKEND — create /backend/ai.js:

const Groq = require('groq-sdk');

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function generateOutreachMessage(lead, config) {
  const groq = createGroqClient();
  const prompt = `You are an expert B2B sales copywriter. Write a personalized cold outreach email.

Lead Information:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'Professional'}
- Company: ${lead.company || 'their company'}
- Industry: ${lead.industry || 'their industry'}
- Company Size: ${lead.company_size || 'unknown'}
- Pain Point: ${lead.pain_point || 'improving efficiency and growth'}

Requirements:
- Tone: ${config.tone || 'professional'}
- Length: ${config.length === 'short' ? '2-3 sentences' : config.length === 'long' ? '4-5 sentences' : '3-4 sentences'}
- Focus: ${config.focus === 'pain_point' ? 'address their specific pain point' : config.focus === 'social_proof' ? 'include a relevant success story' : 'highlight the core value proposition'}
- Start with the lead's first name
- Do NOT use "I hope this email finds you well" or similar clichés
- Be specific to their industry and role
- End with a clear single call-to-action

Respond with ONLY a valid JSON object, no markdown, no explanation:
{"subject": "subject line here", "body": "email body here"}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.75,
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { generateOutreachMessage };

BACKEND — add to server.js:

const { generateOutreachMessage } = require('./ai');

POST /api/ai/generate
- Body: { lead_id, tone, length, focus }
- Fetch lead from DB by lead_id
- If lead not found: return 404 { error: 'Lead not found' }
- Call generateOutreachMessage(lead, { tone, length, focus })
- Return { subject, body, lead_name: lead.first_name + ' ' + lead.last_name }

POST /api/ai/preview
- Body: { workflow_node_config: { tone, length, focus } }
- Fetch 3 random leads from DB
- If fewer than 3 leads exist, use however many there are
- Generate messages for each lead concurrently using Promise.all
- Return { previews: [{ lead: { first_name, last_name, company, job_title }, subject, body }] }
- If GROQ_API_KEY is not set: return mock data with 3 fake generated messages so the UI still works

FRONTEND:

1. src/components/workflow/AIPreviewModal.jsx
   Props: nodeConfig ({ tone, length, focus }), isOpen, onClose

   A full-screen modal overlay (fixed inset-0, bg-black/50, z-50):
   Inner panel: white, rounded-2xl, max-w-4xl, mx-auto, mt-16, max-h-[80vh], overflow-y-auto

   Header: "AI Message Previews" title, X close button, subtitle: "Generated using ${nodeConfig.tone} tone, ${nodeConfig.length} length"

   On open (useEffect when isOpen=true):
   - POST /api/ai/preview with the nodeConfig
   - Show 3 skeleton loading cards while fetching
   - On success: render 3 preview cards

   Each preview card (white bg, border zinc-200, rounded-xl, p-5, mb-4):
   - Top row: lead name bold + company in zinc-500, job title badge in indigo
   - Subject line section: label "Subject" in zinc-400 + subject text in zinc-800 font-medium
   - Body section: label "Body" in zinc-400 + body text in zinc-700, line-height relaxed
   - Bottom: small "AI Generated · llama-3.3-70b" tag in zinc-400

   Loading skeleton: 3 cards with animated pulse gray blocks for subject and body

   Error state: red border card with error message and "Retry" button

2. Update src/components/workflow/NodeConfigPanel.jsx
   For aiGenerateNode: add "Preview AI Messages" button (indigo outline) at the bottom of the config form
   Clicking it opens <AIPreviewModal nodeConfig={node.data} isOpen onClose />

Give every file completely. No placeholders. Handle JSON parse errors from Groq gracefully — if parse fails, retry once with a stricter prompt.
```

### ✅ Confirm before moving on:
- [ ] AI Generate node config panel has "Preview AI Messages" button
- [ ] Clicking opens modal with loading skeletons
- [ ] 3 personalized emails appear (different per lead)
- [ ] Each email references the lead's name, company, or role
- [ ] Modal closes cleanly

---

## Phase 6 — Execution Engine + Real-time Streaming

**Estimated time: 60 min**
**Goal: Full workflow execution with Socket.io live updates, execution log page, and lead status updates**

### What gets built:
- WorkflowExecutor class that walks node graph and executes each step
- Socket.io events streaming to frontend in real time
- Executions page showing live progress
- Lead status updates in DB during execution

### Prompt for Claude:

```
Build the complete workflow execution engine for FlowReach AI with real-time Socket.io streaming.

BACKEND — create /backend/executor.js:

Build a WorkflowExecutor class that takes (workflow, lead, db, socket, io):

constructor(workflow, lead, db, socket, io):
  - Parse workflow.nodes and workflow.edges from JSON if they are strings
  - Build nodeMap: Map from node.id to node object
  - Store edges as array
  - Store lead, db, io refs
  - Store executionId (set after creation)
  - Store logs: []

method log(message, level='info'):
  - Create entry: { timestamp: new Date().toISOString(), message, level, lead_email: this.lead.email }
  - Push to this.logs
  - io.emit('execution:log', { executionId: this.executionId, ...entry })
  - Update executions table: SET logs = JSON.stringify(this.logs) WHERE id = executionId

method emit(event, data):
  - io.emit(event, { executionId: this.executionId, lead_email: this.lead.email, ...data })

method getNextNodeId(currentNodeId, branch=null):
  - Find edge where source === currentNodeId
  - If branch is not null (for condition nodes): find edge where source === currentNodeId AND label === branch
  - Return edge.target or null

method async executeNode(nodeId):
  - Get node from nodeMap
  - If not found: log 'Node not found', return
  - Update execution: SET current_node_id = nodeId, current_node_type = node.type
  - Emit 'node:enter': { nodeId, nodeType: node.type, nodeLabel: node.data.label }
  - log: 'Entering node: ' + node.data.label
  - Switch on node.type:
    - 'startNode': log 'Workflow started for lead', emit 'node:complete', get next, call executeNode
    - 'aiGenerateNode': call executeAIGenerate(node)
    - 'emailNode': call executeEmail(node)
    - 'delayNode': call executeDelay(node)
    - 'conditionNode': call executeCondition(node), return (condition handles branching itself)
    - 'updateLeadNode': call executeUpdateLead(node)
    - 'endNode': call executeEnd(node), return
    - default: log 'Unknown node type, skipping', get next, call executeNode

method async executeAIGenerate(node):
  - log: 'Generating AI message...'
  - emit 'node:processing': { message: 'Calling Groq AI...' }
  - const { generateOutreachMessage } = require('./ai')
  - Call generateOutreachMessage(this.lead, node.data)
  - Store result on this: this.aiSubject = result.subject, this.aiBody = result.body
  - log: 'AI message generated: ' + result.subject
  - emit 'node:complete': { message: 'AI message ready', subject: result.subject }
  - Get next node, call executeNode

method async executeEmail(node):
  - Resolve subject and body: if node.data.use_ai is true, use this.aiSubject / this.aiBody, else use node.data.subject / node.data.body
  - Replace {{first_name}} in subject/body with lead.first_name
  - Replace {{company}} with lead.company
  - log: 'Sending email to ' + this.lead.email
  - emit 'node:processing': { message: 'Sending email...' }
  - Insert into messages table: { lead_id, channel:'email', subject, body, ai_generated: node.data.use_ai ? 1 : 0, status:'sent', sent_at: CURRENT_TIMESTAMP }
  - Update lead status to 'contacted' if currently 'new'
  - log: 'Email sent successfully'
  - emit 'node:complete': { message: 'Email sent', to: this.lead.email }
  - Get next node, call executeNode

method async executeDelay(node):
  - const minMs = (node.data.min_hours || 0.02) * 60 * 60 * 1000  (in demo mode use 2 seconds minimum)
  - const maxMs = (node.data.max_hours || 0.05) * 60 * 60 * 1000
  - const demoDelay = Math.floor(Math.random() * 2000) + 1500  (1.5-3.5 seconds for demo)
  - log: 'Waiting (demo mode: ' + demoDelay + 'ms)'
  - emit 'node:processing': { message: 'Waiting...' }
  - await new Promise(resolve => setTimeout(resolve, demoDelay))
  - emit 'node:complete': { message: 'Delay complete' }
  - Get next node, call executeNode

method async executeCondition(node):
  - Evaluate: get lead[node.data.field] and compare to node.data.value using node.data.operator
  - Operators: 'eq' (===), 'not_eq' (!==), 'contains' (includes)
  - log: 'Condition: ' + node.data.field + ' ' + node.data.operator + ' ' + node.data.value + ' → ' + (result ? 'Yes' : 'No')
  - emit 'node:complete': { message: 'Condition evaluated', result: result ? 'Yes' : 'No' }
  - Get next node with branch (result ? 'Yes' : 'No')
  - If next node found: call executeNode(nextNodeId)

method async executeUpdateLead(node):
  - Update leads table: SET [node.data.field] = node.data.value WHERE id = lead.id
  - log: 'Updated lead ' + node.data.field + ' to ' + node.data.value
  - emit 'node:complete': { message: 'Lead updated' }
  - Get next node, call executeNode

method async executeEnd(node):
  - Update execution: SET status='completed', completed_at=CURRENT_TIMESTAMP
  - Update lead status if node.data.final_status is set
  - log: 'Workflow completed. Final status: ' + node.data.final_status
  - emit 'execution:complete': { final_status: node.data.final_status }

method async run():
  - Create execution record in DB: { workflow_id, workflow_name, lead_id, lead_email, status:'running', started_at: CURRENT_TIMESTAMP }
  - this.executionId = insertedId
  - emit 'execution:start': { workflowName: workflow.name, leadName: lead.first_name + ' ' + lead.last_name }
  - log: 'Execution started'
  - Find start node (type === 'startNode')
  - Try: await executeNode(startNode.id)
  - Catch error: log error.message, level='error', update execution status to 'failed', emit 'execution:error'

module.exports = WorkflowExecutor

BACKEND — add to server.js:

const WorkflowExecutor = require('./executor');

POST /api/executions/run
- Body: { workflow_id, lead_ids: [array of lead ids] }
- Fetch workflow from DB
- For each lead_id: fetch lead from DB, create WorkflowExecutor, call run() — run them sequentially (await each one)
- Do NOT await the whole thing in the response — start executions in background, return immediately:
  return res.json({ message: 'Execution started', count: lead_ids.length })
- Actually run: (async () => { for each lead, await executor.run() })()

GET /api/executions
- Returns all executions with columns: id, workflow_name, lead_email, status, current_node_type, started_at, completed_at
- Parse logs from JSON, return last 3 log entries as recent_logs
- Order by started_at DESC, limit 100

FRONTEND:

1. src/pages/Executions.jsx
   Two tabs: "Live Feed" and "History"

   Live Feed tab:
   - Connects to Socket.io on mount: const socket = io('http://localhost:3001')
   - Listens to: execution:start, execution:log, node:enter, node:processing, node:complete, execution:complete, execution:error
   - Maintains a state: events[] (max last 100 events, newest first)
   - Renders a live feed list (no auto-scroll needed, just render):
     Each event card (white bg, border-l-4 colored by level):
       - info: border-indigo-400
       - error: border-red-400
       - processing: border-yellow-400
       - complete: border-green-400
     Content: timestamp (HH:MM:SS), lead_email, message
   - If no events: "Waiting for executions... Run a workflow to see live updates here"
   - "Clear" button to empty the events array
   - Disconnect socket on unmount

   History tab:
   - GET /api/executions on mount
   - Table: Lead Email, Workflow, Status, Current Step, Started, Duration
   - Status badge: running=yellow+pulse animation, completed=green, failed=red, pending=zinc
   - Duration: calculate from started_at to completed_at, show in seconds
   - Auto-refresh every 5 seconds

2. Update src/pages/Workflows.jsx
   When a workflow is open, add an "Execute Workflow" button in the builder toolbar (green button)
   Clicking opens an execution modal:
   - Fetch all leads (GET /api/leads)
   - Show list with checkboxes (max 10 selectable for demo, warn if more selected)
   - "Run for X leads" button that calls POST /api/executions/run
   - On success: navigate to /executions and show the Live Feed tab
   - Use react-hot-toast for feedback

Give every file completely. No placeholders.
```

### ✅ Confirm before moving on:
- [ ] Can click Execute on a workflow, select leads, run
- [ ] Executions page Live Feed shows events appearing in real-time
- [ ] Each node transition is logged with timestamp
- [ ] Execution completes and shows "completed" in History tab
- [ ] Lead status in DB changes to "contacted" after email node

---

## Phase 7 — Safety Controls + Settings Page

**Estimated time: 35 min**
**Goal: Daily send limits, blacklist management, safety score display, and settings page**

### What gets built:
- Daily send limit enforcement in executor
- Blacklist check before email sends
- Safety score calculator per workflow
- Settings page with configurable limits

### Prompt for Claude:

```
Build the complete safety controls system for FlowReach AI.

BACKEND — add to server.js:

GET /api/settings
- Return hardcoded defaults (or from a simple key-value table if you want)
- Return: { daily_send_limit: 50, min_delay_seconds: 45, max_delay_seconds: 180, business_hours_only: false, business_hours_start: 9, business_hours_end: 18 }

GET /api/blacklist
- Returns all entries from blacklist table

POST /api/blacklist
- Body: { email, reason }
- Insert into blacklist (INSERT OR IGNORE)
- Returns { added: true }

DELETE /api/blacklist/:email
- Delete from blacklist where email = :email
- Returns { removed: true }

GET /api/stats/daily-sends
- Query daily_send_counts for today's date (YYYY-MM-DD)
- Return { date: today, count: N, limit: 50, remaining: 50-N }

BACKEND — update /backend/executor.js:

In executeEmail method, before inserting message:
1. Check blacklist: SELECT * FROM blacklist WHERE email = ? using this.lead.email
   - If found: log 'Lead is blacklisted, skipping email', emit 'node:complete' with message 'Skipped (blacklisted)', get next node and continue (do NOT send)
2. Check daily send count:
   - SELECT count FROM daily_send_counts WHERE date = today
   - If count >= 50: log 'Daily send limit reached, pausing', emit 'execution:error' with message 'Daily send limit of 50 reached', update execution status to 'paused', STOP (do not get next node)
   - Otherwise: INSERT OR REPLACE into daily_send_counts with incremented count

FRONTEND:

1. src/pages/Settings.jsx
   Full settings page with 3 sections:

   Section 1 — Safety Controls (white card, border, rounded-xl, p-6, mb-4):
   - Title: "Safety & Throttling" with Shield icon
   - "Daily Send Limit" — number input, current value fetched from /api/stats/daily-sends, shows "X / 50 sent today" progress bar (green if under 80%, yellow if 80-95%, red if 95%+)
   - "Min Delay" and "Max Delay" — shown as static values (45s and 180s) with note "Randomized per action"
   - "Business Hours Only" — toggle switch (disabled for now, just visual)

   Section 2 — Blacklist Management (white card):
   - Title: "Email Blacklist" with Ban icon
   - Input field + "Add to Blacklist" button — POST /api/blacklist
   - Table of blacklisted emails: email, reason, added date, Remove button (DELETE /api/blacklist/:email)
   - Fetches GET /api/blacklist on mount and after add/remove

   Section 3 — Groq API Status (white card):
   - Title: "AI Configuration" with Zap icon
   - Shows whether GROQ_API_KEY is set: GET /api/ai/status endpoint (add to backend: returns { configured: !!process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' })
   - Green "Connected" badge or red "Not configured" badge
   - Note: "Using Groq free tier — up to 14,400 requests/day"

2. src/components/workflow/SafetyScore.jsx
   Props: workflow (object with nodes and edges)

   Calculates a safety score 0–100:
   - +25 points if workflow has at least one delayNode
   - +25 points if any delayNode has min_hours >= 0.01 (we're using demo mode)
   - +25 points if workflow has an endNode
   - +25 points if workflow has fewer than 10 nodes (not overly aggressive)
   Score: sum of matching criteria

   Renders:
   - Circular gauge using SVG strokeDashoffset (circle, r=30, stroke representing score)
   - Color: green if >=75, yellow if >=50, red if <50
   - Score number in center
   - Label "Safety Score" below
   - Small text: "Based on delays, limits, and flow complexity"

3. Add <SafetyScore workflow={selectedWorkflow} /> to WorkflowBuilder.jsx toolbar (between Save and Execute buttons)

Give every file completely. No placeholders.
```

### ✅ Confirm before moving on:
- [ ] Settings page shows daily send usage with progress bar
- [ ] Can add/remove emails from blacklist
- [ ] Groq API status shows configured/not configured
- [ ] Safety Score gauge appears in workflow builder toolbar

---

## Phase 8 — Seed Data + Final Polish

**Estimated time: 40 min**
**Goal: Demo-ready seed data, loading states, empty states, and visual polish throughout**

### What gets built:
- Seed script with 50 realistic leads + execution history
- Global loading and empty states
- Toast notifications polished
- Minor visual fixes across all pages

### Prompt for Claude:

```
Build the final seed data script and polish for FlowReach AI.

BACKEND — create /backend/seed.js:

A standalone script (run with: node backend/seed.js) that:

1. Clears existing data: DELETE FROM messages; DELETE FROM executions; DELETE FROM leads; DELETE FROM daily_send_counts;
   (Keep workflows and blacklist as-is)

2. Inserts exactly 50 leads with this data (hardcoded array — all real-looking fake data):
   Use these industries: SaaS, FinTech, HealthTech, E-commerce, EdTech, Logistics, Marketing, Consulting
   Use these company sizes: 1-10, 11-50, 51-200, 200+
   Use these job titles: CEO, CTO, VP of Sales, Head of Marketing, Product Manager, Founder, Director of Operations
   Use these pain points: scaling customer acquisition, reducing churn, automating manual processes, improving team productivity, cutting operational costs
   
   Create 50 leads distributed across industries and company sizes. Make names realistic (mix of common names).
   Statuses: first 20 = 'new', next 15 = 'contacted', next 10 = 'replied', last 5 = 'converted'

3. Inserts execution history: for the 15 'contacted' leads + 10 'replied' leads + 5 'converted' leads:
   - Create execution records with status='completed'
   - started_at: random date within last 7 days
   - completed_at: started_at + random(60-300) seconds
   - workflow_name: 'Cold Outreach Sequence'
   - Insert a corresponding message for each (fake subject/body — about 2 sentences)

4. Inserts daily_send_counts for last 7 days:
   - Today: count 12
   - Yesterday: count 31
   - 2 days ago: count 27
   - 3 days ago: count 19
   - 4 days ago: count 44
   - 5 days ago: count 8
   - 6 days ago: count 22

5. Log: "✓ Seeded 50 leads, X executions, X messages"

Add to root package.json scripts:
  "seed": "node backend/seed.js"

FRONTEND POLISH — update these files:

1. src/components/ui/Skeleton.jsx (create this):
   A reusable skeleton component:
   - <Skeleton className="" /> renders an animated pulse gray div
   - <SkeletonText lines={3} /> renders N lines of skeleton text (last line 60% width)
   - <SkeletonCard /> renders a card-shaped skeleton (white bg, border, rounded-xl, p-5, with a SkeletonText inside)

2. Update src/components/leads/LeadsTable.jsx:
   - Replace any TODO loading state with: 5 <SkeletonCard /> components in a stack
   - Add a subtle "Refresh" button (icon button, RefreshCw icon) in top-right that re-fetches leads
   - Show total count as "50 leads" with a zinc-400 font

3. Update src/pages/Dashboard.jsx:
   - Replace any TODO states with proper Skeleton cards during load
   - Add a last-updated timestamp under the charts: "Last updated X seconds ago" (update every second)

4. src/components/layout/Sidebar.jsx — add at the very bottom before the version text:
   A small status indicator: green dot + "System online" if backend is reachable (ping /health), red dot + "Offline" if not. Check every 30 seconds.

5. Update src/App.jsx:
   - Add a global keyboard shortcut: pressing '?' shows a small modal with keyboard shortcuts:
     - Go to Dashboard: D
     - Go to Leads: L
     - Go to Workflows: W
     - Go to Executions: E
   - Implement with useEffect on keydown
   - The shortcuts actually navigate to those routes

Give every file completely. No placeholders.
```

### ✅ Confirm before moving on:
- [ ] `npm run seed` runs without errors and logs success
- [ ] Dashboard shows real numbers (50 total, charts have data)
- [ ] Leads table shows 50 leads with mixed statuses
- [ ] System online indicator in sidebar
- [ ] Keyboard shortcuts work (D, L, W, E)

---

## Phase 9 — Final Demo Preparation

**Estimated time: 20 min**
**Goal: App is demo-ready, all edge cases handled, demo flow rehearsed**

### Prompt for Claude:

```
Final hardening pass for FlowReach AI before demo. Fix these specific things:

1. In backend/executor.js — wrap the entire run() method in try/catch. If any unhandled error occurs, log it, update execution status to 'failed', and emit 'execution:error' with the error message. Never let the server crash.

2. In frontend src/pages/Executions.jsx — the socket.io connection should handle 'connect_error' event and show a yellow banner: "Live feed disconnected — refresh to reconnect". Remove it when connection is restored.

3. In frontend src/components/workflow/WorkflowBuilder.jsx — before executing, validate: the workflow must have exactly one startNode and exactly one or more endNodes. If not, show a toast error: "Workflow must have a Start node and at least one End node" and prevent execution.

4. In frontend src/pages/Leads.jsx — the import tab should show a "Download Sample CSV" link that triggers a download of a CSV file with 5 sample rows using the correct column names (first_name, last_name, email, company, job_title, industry, company_size, pain_point). Generate this as a Blob in the browser.

5. In backend/server.js — add a GET /api/ai/status route that returns:
   { configured: !!process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }

6. Add a "Reset Demo Data" button to Settings.jsx (red, outlined) that calls a new backend endpoint:
   POST /api/seed/reset — which runs the same logic as seed.js but as an API call. Returns { ok: true }. After it completes, show toast "Demo data reset successfully" and the button re-enables.

Give every file completely. No placeholders.
```

### ✅ Final checklist before demo:
- [ ] `npm run seed` — fresh data
- [ ] Open http://localhost:5173 — dashboard loads with stats
- [ ] Upload the sample CSV from Leads → Import
- [ ] Open "Cold Outreach Sequence" workflow
- [ ] Click AI Generate node → Preview Messages → see 3 personalized emails
- [ ] Click Execute → select 5 leads → watch Live Feed
- [ ] Check leads table — some now show "contacted"
- [ ] Show Settings page with Safety Score and API status
- [ ] Record 60-second screen recording as backup

---

## Quick Reference

### Start the app
```bash
npm run install:all   # first time only
npm run seed          # populate demo data
npm run dev           # start both servers
```

### If Groq is down (fallback)
Change model in `backend/ai.js` to use Hugging Face:
```bash
npm install @huggingface/inference --prefix backend
```
```js
const { HfInference } = require('@huggingface/inference');
// Use: mistralai/Mistral-7B-Instruct-v0.2
// Free at: huggingface.co/settings/tokens
```

### Emergency: simulate execution without backend
In `WorkflowBuilder.jsx` execute button handler, replace the API call with a `setTimeout` loop that emits fake socket events client-side. 60 lines of code, looks identical.

### Environment variables needed
```
GROQ_API_KEY=        # console.groq.com — free signup
GMAIL_USER=          # optional, for real email sending
GMAIL_APP_PASSWORD=  # optional
PORT=3001
```

---

*FlowReach AI — Phase-by-phase. Ship it. Win it. 🏆*
