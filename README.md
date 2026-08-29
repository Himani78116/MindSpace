# MindSpace — AI Journaling & Reflection Sanctuary

MindSpace is a private, production-grade conversational AI journaling sanctuary built with **React**, **TypeScript**, **Tailwind CSS**, **Google Cloud Run**, **Firebase Authentication**, **Cloud Firestore**, and the **Gemini API** (`@google/genai`).

---

## 🏛️ System Architecture & Flow Diagrams

### 1. End-to-End System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT BROWSER                                        │
│  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │   React 18 + Vite UI    │   │  useMessages & useChat   │   │  Firebase Auth SDK    │  │
│  │ (Tailwind + Lucide)     │◄──┤   (SSE Stream Parser)    │   │  (Google / Guest)     │  │
│  └────────────┬────────────┘   └─────────────▲────────────┘   └───────────┬───────────┘  │
└───────────────┼──────────────────────────────┼────────────────────────────┼──────────────┘
                │ HTTP POST /api/journal/chat  │ Server-Sent Events (SSE)   │ Bearer ID Token
                ▼                              │                            ▼
┌──────────────────────────────────────────────┴───────────────────────────────────────────┐
│                              EXPRESS BACKEND (Cloud Run / Node.js)                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  API Gateway & Security Middleware (Bearer Auth Validation & Rate/Payload Guards)  │  │
│  └─────────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                        │                                                 │
│       ┌────────────────────────────────┴─────────────────────────────────┐               │
│       ▼                                                                  ▼               │
│  ┌────────────────────────────────────────┐                     ┌─────────────────────┐  │
│  │ Resilient Gemini Fallback Ladder Engine│                     │  Local Contextual   │  │
│  │  - gemini-3.1-flash-lite (Primary)     │                     │  Reflection Engine  │  │
│  │  - gemini-2.5-flash (High Availability)│───(On Total Outage)─│  (Offline Guarantee)│  │
│  │  - gemini-3.5-flash (Deep Reasoning)   │                     └─────────────────────┘  │
│  │  - gemini-3.7-flash (Pro Reasoning)    │                                              │
│  └──────────────────┬─────────────────────┘                                              │
└─────────────────────┼────────────────────────────────────────────────────────────────────┘
                      │ @google/genai SDK (GEMINI_API_KEY from Secret Manager)
                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             GOOGLE CLOUD PLATFORM & FIREBASE                             │
│  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌────────────────────┐  │
│  │   Google Gemini Models    │   │   Cloud Firestore DB      │   │   Secret Manager   │  │
│  │ (Flash / Flash-Lite / Pro)│   │ (Owner-Bound Isolated DB) │   │  (GEMINI_API_KEY)  │  │
│  └───────────────────────────┘   └───────────────────────────┘   └────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Conversational Reflection & Streaming Flow

```
User Types Reflection ───► UI Appends Optimistic Bubble ───► POST /api/journal/chat
                                                                     │
                                                   ┌─────────────────┴─────────────────┐
                                                   ▼                                   ▼
                                       Extract Session Context              Authorize Bearer Token
                                                   │                                   │
                                                   └─────────────────┬─────────────────┘
                                                                     ▼
                                                   Select Active Mode System Instruction
                                                   (Reflect, Brainstorm, Plan, Analyze, etc.)
                                                                     │
                                                                     ▼
                                                   Invoke Gemini with Fallback Ladder
                                                                     │
                                                   ┌─────────────────┴─────────────────┐
                                                   ▼ (Success)                         ▼ (API Quota/Error)
                                         Stream Chunks via SSE               Cascade to Next Model
                                                   │                                   │
                                                   ▼                                   ▼ (If All Exhausted)
                                         Progressive Typewriter              Stream Local Reflection
                                                   │                                   │
                                                   └─────────────────┬─────────────────┘
                                                                     ▼
                                                   Emit `done: true` & Persist Turn to Firestore
                                                                     │
                                                   ┌─────────────────┴─────────────────┐
                                                   ▼ (If 1st Message)                  ▼
                                         Auto-Generate 3-5 Word Title       Update Multi-Turn History
```

---

### 3. Data Isolation & Security Boundary

```
[ UNTRUSTED USER INPUT ]
         │
         ▼
[ Client Validation ] ─────────► Enforce Character & Format Limits
         │
         ▼ (Over TLS HTTPS)
[ Cloud Run Express Server ] ──► Validates JWT / Bearer Token
         │                   ──► GEMINI_API_KEY Injected via Secret Manager (Never in Browser)
         ▼
[ Google Gemini Models ] ──────► System Instruction bounds AI from medical/clinical diagnosis
         │
         ▼
[ Cloud Firestore ] ───────────► `firestore.rules` enforces `request.auth.uid == userId`
                                 (Cross-tenant data access is cryptographically blocked)
```

---

## 🛡️ Agentic Threat Summary & Countermeasures

| Threat Zone | Identified Scenario Risk | Mitigating Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious payloads, payload overflows | Strict schema validation (`length <= 15000` chars), non-executable markdown rendering, and top-level JSON body parsing. |
| **2. Planning & Reasoning** | Clinical diagnostic overreach, hallucinated mental health advice | Tailored system instructions explicitly forbidding medical diagnoses, prioritizing open-ended mindful inquiries. |
| **3. Tool Execution / API** | API exhaustion, model downtime, latency spikes | Resilient Model Fallback Ladder (`gemini-3.1-flash-lite` → `gemini-2.5-flash` → `gemini-3.5-flash` → `gemini-3.7-flash` → Local Engine). |
| **4. Memory & State** | Cross-tenant data leaks, unauthorized message reads | Strict owner-bound path enforcement in `firestore.rules` (`/users/{userId}/*` restricted to `request.auth.uid == userId`) and server-side UID token verification. |
| **5. Inter-System Comm.** | Gemini API key exposure in browser clients | Zero-hardcoding hygiene; Gemini API key is isolated server-side and never exposed to the client bundle. |

---

## 💡 Implementation Pillars: Usability, Stability & Security

### 1. Usability: Intuitive Design, Accessibility & Seamless UX

MindSpace was engineered specifically to alleviate cognitive load and provide a serene, mindful reflection experience:

* **Distraction-Free Mindful Interface**:
  * Utilizes a calm, warm-neutral palette with glassmorphism visual depth (frosted glass panels, subtle border accents, and zero jarring neon gradients).
  * High-contrast typography pairing **Playfair Display** (for evocative titles and section anchors) with **Plus Jakarta Sans** (for optimal reading comfort across long journal entries).
* **Responsive Dual-Pane Architecture**:
  * **Desktop**: Collapsible sidebar with quick session switching, search filtering, and categorized session history.
  * **Mobile**: Full-screen distraction-free composer with touch-friendly drawer navigations (minimum 44px touch targets).
* **7 Adaptive Reflection Modes**:
  * Seamlessly toggle modes (💭 *Reflect*, 📝 *Summarize*, 💡 *Brainstorm*, 🎯 *Plan*, 🔍 *Analyze*, ✨ *Rewrite*, 🧘 *Daily Check-in*) to guide the AI's inquiry style without requiring manual prompt engineering.
* **Conversational Control & Branching**:
  * **Real-time SSE Streaming**: Progressive typewriter stream rendering provides immediate visual feedback.
  * **Interrupt & Stop**: 1-click stop button allows canceling generation mid-stream without UI freezing.
  * **Message Regeneration & Version Switcher**: Generate alternative responses for any turn and toggle between versions (`‹ 1/2 ›`).
  * **Edit & Resend**: Edit earlier reflections; downstream history is pruned and re-branched seamlessly.
  * **1-Click Copy & Markdown Rendering**: Rich formatting for quotes, lists, bold concepts, and clean copy-to-clipboard interactions.
* **Accessibility (WCAG AA Compliant)**:
  * Full keyboard navigability (Escape to close modals, Enter / Shift+Enter in composer, accessible tab indexing).
  * Explicit ARIA landmarks, roles, and live regions (`aria-live="polite"`) for streaming messages.
  * High-contrast text readability on both light and dark backgrounds.

---

### 2. Stability: Reliable, Bug-Free Prototype

Stability engineering ensures that MindSpace never crashes, loses user work, or hangs during network blips:

* **Resilient Gemini Fallback Ladder**:
  * Wrapped in an automated multi-tier fallback ladder (`gemini-3.1-flash-lite` → `gemini-2.5-flash` → `gemini-3.5-flash` → `gemini-3.7-flash`).
  * Catches HTTP `429 (Resource Exhausted)`, `503 (Unavailable)`, and timeout exceptions, immediately trying the next model in sequence without bubbling unhandled errors to the UI.
  * **Offline/Outage Guarantee**: If external APIs are unavailable or network connectivity fails, a smart local contextual reflection engine generates high-quality reflective inquiries.
* **Lifecycle Stream Connection Integrity**:
  * Express streaming routes attach listener `res.on('close')` guarded with `!res.writableEnded`, preventing premature stream cancellation while ensuring proper cleanup of disconnected sockets.
  * Guarantees `res.end()` executes in all error and completion paths to eliminate hanging HTTP connections.
* **Strict Payload Hygiene & Undefined-Stripping**:
  * A centralized `cleanFirestoreData` utility strips all `undefined` values from payloads before invoking Firestore `setDoc`/`updateDoc`, preventing Firestore SDK serialization crashes.
* **Defensive Ingestion & Top-Level Middleware**:
  * Node.js backend registers JSON body decoders before route handlers and uses null-safe destructuring (`req.body || {}`) across all endpoints.
* **Guaranteed Persistence & Error Recovery**:
  * Optimistic UI updates are coupled with Firestore confirmation. If a persistence write fails, the UI surfaces an accessible error banner with a "Retry Save" action without clearing the user's composer buffer.

---

### 3. Security: Data Protection, Authentication & Secure Infrastructure

* **Zero-Hardcoding Hygiene**:
  * **No API Keys in Client Bundles**: All Gemini API calls are strictly brokered through backend Express routes (`/api/journal/*`).
  * Credentials are read dynamically from runtime environment variables or Google Cloud Secret Manager.
* **Owner-Bound Firestore Security**:
  * Database security rules (`firestore.rules`) enforce strict authorization (`request.auth.uid == userId`). Users cannot read, write, or query documents belonging to any other user.
* **Authentication Integrity**:
  * Firebase Authentication manages identity through federated Google Sign-In and anonymous guest sessions.
  * Server-side API routes validate the `Authorization: Bearer <token>` header to prevent unauthenticated access.
* **OWASP LLM Application Security**:
  * **Prompt Injection Defense (LLM01/LLM02)**: User text is passed strictly as data contents to the Gemini API, never concatenated into raw system instructions.
  * **Output Sanitization (LLM05)**: AI responses are safely rendered using structured React components with HTML escaping to prevent XSS.

---

## 📁 Repository Structure

```
├── .env.example              # Template for environment variables (GEMINI_API_KEY, etc.)
├── firestore.rules           # Secure owner-bound Firestore security rules
├── index.html                # Entry HTML with metadata, fonts & viewport configuration
├── metadata.json             # AI Studio applet metadata & major capabilities
├── package.json              # Dependencies and build scripts
├── server.ts                 # Full-stack Express server + Gemini streaming proxy
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite bundler configuration
│
└── src/
    ├── main.tsx              # React application root entry point
    ├── App.tsx               # Primary application orchestrator & layout
    ├── index.css             # Tailwind CSS global styles
    ├── types.ts              # Core TypeScript interfaces (Message, Session, Mode, etc.)
    │
    ├── components/
    │   ├── AuthModal.tsx     # Sign-in & guest authentication dialog
    │   ├── ChatArea.tsx      # Multi-turn streaming reflection chat feed
    │   ├── ChatHeader.tsx    # Header with title editing, mode picker, and synthesis
    │   ├── ChatInput.tsx     # Mindful composer with multi-line input & mode starters
    │   ├── MessageItem.tsx   # Message card with markdown, versioning & edit controls
    │   ├── ModeSelector.tsx  # 7-mode reflection strategy picker modal
    │   ├── Sidebar.tsx       # Session list, search, stats, and user profile drawer
    │   └── SummaryModal.tsx  # Executive reflection synthesis & takeaway modal
    │
    ├── hooks/
    │   ├── useAuth.ts        # Firebase Auth state listener and login handlers
    │   ├── useMessages.ts    # Real-time Firestore message sync, SSE stream & editing
    │   └── useSessions.ts    # Real-time Firestore session management & auto-naming
    │
    └── lib/
        ├── firebase.ts       # Firebase app, auth, and Firestore client initialization
        └── firestoreUtils.ts # Undefined-stripping sanitizer & database helpers
```

---

## 💻 Local Development & Testing Guide

### 1. Prerequisites
* **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
* **npm**: `v9.0.0` or higher
* **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <REPO_URL>
   cd mindspace-journal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   # Gemini API Key (Required for server-side generation)
   GEMINI_API_KEY=your_actual_gemini_api_key_here

   # Optional client-side Firebase config (defaults to project configuration)
   # VITE_FIREBASE_API_KEY=...
   # VITE_FIREBASE_PROJECT_ID=...
   ```

4. **Start the local full-stack development server**:
   ```bash
   npm run dev
   ```
   The app will start at `http://localhost:3000`.

---

### 3. Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Express server with Vite middleware in development mode on port 3000. |
| `npm run build` | Compiles Vite frontend to `dist/` and bundles `server.ts` into `dist/server.cjs` via `esbuild`. |
| `npm run start` | Runs the compiled production server (`node dist/server.cjs`). |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) to verify zero syntax/type errors. |

---

### 4. Direct API Endpoint Testing via `curl`

You can verify the backend endpoints independently using `curl`:

#### A. Health Check
```bash
curl http://localhost:3000/api/health
# Output: {"status":"ok","timestamp":"..."}
```

#### B. Streaming Reflection Chat (`/api/journal/chat`)
```bash
curl -N -X POST http://localhost:3000/api/journal/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_user_id" \
  -d '{
    "sessionId": "test_session_1",
    "message": "I am feeling overwhelmed with my current priorities.",
    "mode": "reflect",
    "history": []
  }'
```

#### C. Smart Title Auto-Generation (`/api/journal/title`)
```bash
curl -X POST http://localhost:3000/api/journal/title \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_user_id" \
  -d '{
    "message": "Today I spent time in nature and felt deeply calm.",
    "mode": "reflect"
  }'
# Output: {"title":"Finding Stillness in Nature"}
```

#### D. Session Synthesis Summary (`/api/journal/summary`)
```bash
curl -X POST http://localhost:3000/api/journal/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_user_id" \
  -d '{
    "messages": [
      {"role": "user", "text": "I need to set better boundaries at work."},
      {"role": "assistant", "text": "What does a healthy boundary look like for you?"}
    ],
    "mode": "reflect"
  }'
```

---

## 🔒 Firestore Security Rules

Deploy the following security rules to Cloud Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /{allChildren=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Google Cloud Run Deployment & Secret Management

### 1. Prerequisites
* Google Cloud SDK (`gcloud` CLI) installed and authenticated.
* Enable Cloud Run, Secret Manager, and Firestore APIs:

```bash
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
```

### 2. Secret Manager Configuration

Store the `GEMINI_API_KEY` securely in Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run runtime service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Cloud Run

Deploy the container to Cloud Run with Secret Manager environment injection:

```bash
gcloud run deploy mindspace-journal \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 4. Campaign Verification Binding

Apply the mandatory challenge label:

```bash
gcloud run services update mindspace-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-east1
```

---

## 🧪 Functional Walkthrough & Test Suite

| Test ID | Area | Interaction Flow | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-01** | Authentication | Click **"Continue with Google"** or **"Try Guest Reflection"** | User profile initializes; authenticated state unlocks the main journal workspace. |
| **TC-02** | Session Creation | Click **"+ New Journal"** in sidebar | Fresh session initializes with default "Reflect" mode and prompts empty state. |
| **TC-03** | Mode Switching | Click **"Change Mode"** in header and select **"💡 Brainstorm"** | Mode changes; header badge updates and composer suggests brainstorming starters. |
| **TC-04** | Streaming Chat | Type a message and press **Enter** | User message bubble appears immediately; Gemini thinking indicator pulses; response streams in real time. |
| **TC-05** | Auto-Naming | Send first message in a new session | Backend analyzes entry and automatically renames session from "New Reflection" to an evocative 3-5 word title. |
| **TC-06** | Stop Generation | Send a long prompt and immediately click **"Stop"** (square icon) | Generation stream terminates immediately; message is marked as stopped without UI freeze. |
| **TC-07** | Copy Message | Click **"Copy"** on Gemini assistant message | Text copied to clipboard; badge indicates "Copied". |
| **TC-08** | Regenerate | Click **"Regenerate"** on Gemini assistant message | Gemini generates a new response for the same turn; version indicator allows toggling between versions (`1/2`). |
| **TC-09** | Edit & Resend | Hover over user message, click **"Edit"**, update text, and click **"Save & Resend"** | Downstream messages are removed; edited text is saved; Gemini produces new contextual response. |
| **TC-10** | Session Summary | Click **"Summary"** button in header | Modal opens; Gemini analyzes the dialogue and outputs structured Core Theme, Realizations, and Next Actions. |
| **TC-11** | Session Persistence | Refresh browser or switch between multiple sessions in the sidebar | All messages, versions, timestamps, and metadata are restored in real time from Firestore. |

