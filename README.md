# MindSpace — AI Journaling & Reflection Chat

MindSpace is a private, production-grade conversational AI journaling sanctuary built with React, Vite, Tailwind CSS, Google Cloud Run, Firebase Authentication, Cloud Firestore, and Gemini models.

---

## 🛡️ Agentic Threat Summary & Countermeasures

| Threat Zone | Identified Scenario Risk | Mitigating Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious payloads, payload overflows | Strict schema validation (`length <= 15000` chars), non-executable markdown rendering, and top-level JSON body parsing. |
| **2. Planning & Reasoning** | Clinical diagnostic overreach, hallucinated mental health advice | Tailored system instructions explicitly forbidding medical diagnoses, prioritizing open-ended mindful inquiries. |
| **3. Tool Execution / API** | API exhaustion, model downtime, latency spikes | Resilient Model Fallback Ladder (`gemini-2.5-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-2.5-pro`). |
| **4. Memory & State** | Cross-tenant data leaks, unauthorized message reads | Strict owner-bound path enforcement in `firestore.rules` (`/users/{userId}/*` restricted to `request.auth.uid == userId`) and server-side UID token verification. |
| **5. Inter-System Comm.** | Gemini API key exposure in browser clients | Zero-hardcoding hygiene; Gemini API key is isolated server-side and never exposed to the client bundle. |

---

## 📋 Features

- **7 Tailored Reflection Modes**:
  - 💭 **Reflect**: Empathetic tension exploration and open-ended follow-up questions.
  - 📝 **Summarize**: Distill stream-of-consciousness entries into key ideas, tensions, decisions, and open questions.
  - 💡 **Brainstorm**: Divergent creative ideation and exploration without premature judgment.
  - 🎯 **Plan**: Goal → Situation → Practical Approach → Immediate Next Actions.
  - 🔍 **Analyze**: Pattern and assumption detection without speculation or clinical claims.
  - ✨ **Rewrite**: Elevate clarity and structure while preserving your authentic voice.
  - 🧘 **Daily Check-in**: Mindful multi-turn 5-question evening or morning reflection.
- **Real-Time Streaming**: Server-Sent Events (SSE) streaming directly from backend Gemini proxy.
- **Stop & Interruption Handling**: Cancel generation at any time with graceful `interrupted` status preservation.
- **Regenerate & Versioning**: Re-run assistant turns with version switcher (`‹ 1/2 ›`).
- **Edit & Resend**: Truncate downstream messages and re-branch the reflection naturally.
- **Session Synthesis**: Executive reflection summary generation on demand.
- **Frosted Glass Aesthetic**: Calm, mindful, high-contrast UI with glassmorphism cards and typography.

---

## 🔒 Firestore Security Rules

Deploy the following security rules to protect user isolation:

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
- Google Cloud SDK (`gcloud` CLI) installed and authenticated.
- Enable Cloud Run, Secret Manager, and Firestore APIs:

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
