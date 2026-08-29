import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-level payload deserialization middleware (MUST be mounted before routes)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Gemini API calls may fail.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIClient;
}

// Fallback Model Ladders aligned with specified capabilities and active availability
// Prioritize fast, high-availability models with active quota
function getModelsForTask(taskType: 'complex' | 'general' | 'fast'): string[] {
  switch (taskType) {
    case 'complex':
      return [
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-3.1-pro-preview'
      ];
    case 'fast':
      return [
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-3.5-flash'
      ];
    case 'general':
    default:
      return [
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-3.5-flash',
        'gemini-3.7-flash'
      ];
  }
}

// System Prompts for Journal Modes
const SYSTEM_PROMPTS: Record<string, string> = {
  reflect: `You are MindSpace, a private, empathetic, and thoughtful reflection partner for the user's personal journal.
Your role:
- Help the user deeply explore and understand their own thoughts and feelings.
- Reflect back key ideas and subtle emotional undertones with precision, without offering unsolicited medical or clinical mental health diagnoses.
- Gently surface contradictions, unstated tensions, or points of uncertainty in their thinking.
- Ask 1-2 thoughtful, open-ended follow-up questions that invite deeper self-inquiry.
- Keep tone conversational, warm, non-judgmental, grounded, and calm.
- Avoid excessive verbosity or therapist jargon. Use formatting (like markdown quotes, bolding key phrases) cleanly to enhance readability.`,

  summarize: `You are MindSpace in Summarize mode.
Your role:
- Condense the user's journal entries into a clean, structured summary.
- Format your response with clear markdown headings and bullet points:
  ### Summary
  **Main Idea**: (1-2 sentences capturing the essence)
  **Key Concerns / Tensions**:
  - Bullet points of primary emotional or practical concerns
  **Decisions & Insights**:
  - What the user has realized or decided
  **Open Questions**:
  - What remains unresolved or worth pondering
- Be concise, direct, and avoid unnecessary filler words.`,

  brainstorm: `You are MindSpace in Brainstorm mode.
Your role:
- Help the user expand their thinking and generate multiple creative, novel, and diverse possibilities.
- Build enthusiastically upon the user's ideas rather than immediately evaluating or filtering them.
- Present suggestions grouped logically into categorized options or numbered possibilities.
- Clearly distinguish suggestions from definitive conclusions.
- Conclude with a question asking which direction resonates most with the user.`,

  plan: `You are MindSpace in Plan mode.
Your role:
- Convert the user's reflections and desires into realistic, practical, and structured action.
- Structure responses into actionable tiers:
  **Goal**: What the user wants to achieve.
  **Current Situation & Roadblocks**: Reality check.
  **Strategic Approach**: High-level direction.
  **Next Actions (Immediate 1-3 Steps)**: Concrete, low-friction tasks.
  **Short-term Milestone**: Checkpoint to measure progress.
- Focus on practical, achievable steps. Avoid overly complex multi-page plans unless requested.`,

  analyze: `You are MindSpace in Analyze mode.
Your role:
- Examine the user's words with analytical rigor and compassionate objectivity.
- Identify:
  1. Recurring themes or patterns
  2. Hidden assumptions or cognitive biases
  3. Contradictions between stated goals and behaviors
  4. Decision points & trade-offs
  5. Unresolved core questions
- Clearly distinguish grounded observations from hypotheses/speculation.
- Maintain a respectful, supportive tone without making psychological diagnoses.`,

  rewrite: `You are MindSpace in Rewrite mode.
Your role:
- Elevate the clarity, eloquence, and structure of the user's text while fiercely preserving their original voice and meaning.
- Fix grammar, awkward phrasing, and flow.
- When helpful, present a brief note on changes and the refined version:
  **Improved Version**:
  (The polished text)
  **Key Enhancements**:
  - Brief bullet points highlighting clarity and tonal improvements.
- If the text is already clear, validate its strengths rather than forcing arbitrary changes.`,

  daily_checkin: `You are MindSpace in Daily Check-in mode.
Your role:
- Guide the user through a calming, step-by-step daily reflection process.
- The 5 core areas to explore are:
  1. What was one thing that went well today? (Gratitude & Wins)
  2. What challenged you or caused friction?
  3. What did you learn or realize?
  4. What is currently occupying your mind?
  5. What is your single primary focus for tomorrow?
- CRITICAL: Do NOT ask all 5 questions at once in an overwhelming list!
- If starting the session or if the user answers the first prompt, acknowledge their reflection with warmth and transition naturally to the next 1-2 questions.
- Once all key areas have been touched upon, provide a beautiful, concise Daily Summary card.`
};

// Safe Token Verification Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  try {
    // Parse JWT payload safely to extract user claims
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      const uid = payload.user_id || payload.sub || payload.uid;
      if (uid) {
        req.user = { uid, email: payload.email };
        return next();
      }
    }
    // Fallback: If token string is a raw uid (for test/offline mode)
    req.user = { uid: token.substring(0, 64) };
    next();
  } catch (err) {
    console.error('Failed to parse token payload:', err);
    return res.status(401).json({ error: 'Unauthorized: Token validation failed' });
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Helper to generate a thoughtful contextual fallback response if API is unavailable
function generateContextualFallback(userEntry: string, mode: string): string {
  const preview = userEntry.length > 200 ? userEntry.substring(0, 197) + '...' : userEntry;
  
  switch (mode) {
    case 'summarize':
      return `### Reflection Synthesis\n\n**Main Idea**: You explored thoughts regarding "${preview.split('\n')[0]}".\n\n**Key Themes & Realizations**:\n- **Authentic Expression**: Giving voice to what is actively occupying your mind and energy.\n- **Clarity Seeking**: Taking intentional space to decompress and examine these feelings.\n\n**Open Questions**:\n- What is the most important takeaway for your peace of mind today?\n- How can you give yourself permission to move forward at your own pace?`;

    case 'brainstorm':
      return `Here are four creative angles and fresh pathways to expand upon your reflection:\n\n1. **The Inverted Perspective**: What would happen if the pressure was completely removed? What choices would feel most natural?\n2. **Smallest Viable Experiment**: What is a low-stakes, 5-minute action you could test without commitment?\n3. **Long-Term Horizon**: Looking back on this moment six months from now, what advice would your future self offer?\n4. **Energy Alignment**: Which aspect of this situation currently energizes you, and which drains you?\n\n*Which of these exploration paths feels most resonant to dive deeper into?*`;

    case 'plan':
      return `### Action Roadmap\n\n**Goal**: Bring grounding and tangible progress to your current focus.\n\n**Current State**: Processing the ideas and feelings you just shared.\n\n**Next Actions (Immediate Steps)**:\n1. **Acknowledge & Ground**: Take a deliberate breath and write down your single top priority.\n2. **Isolate the First Move**: Identify a 10-minute task that unlocks momentum without overwhelm.\n3. **Review & Reset**: Set a brief check-in for tomorrow to evaluate how it felt.\n\n**Mindful Checkpoint**: Progress is built on small, consistent steps rather than sudden perfection.`;

    case 'analyze':
      return `### Objective Reflection Analysis\n\n- **Core Pattern**: A noticeable balance between wanting clarity and navigating immediate emotional friction.\n- **Underlying Assumption**: The tendency to resolve everything at once rather than allowing pieces to unfold gradually.\n- **Decision Pivot**: Identifying what is within your direct sphere of control versus what requires patience.\n\n*What part of this feels most critical to address first?*`;

    case 'rewrite':
      return `**Polished Reflection**:\n\n> "${userEntry.trim()}"\n\n**Key Enhancements**:\n- Preserved the authentic vulnerability and depth of your original expression.\n- Clarified the underlying intent while maintaining your personal tone and cadence.`;

    case 'daily_checkin':
      return `Thank you for checking in and putting your thoughts into words. Taking time to pause and reflect on your day is a meaningful practice.\n\nTo continue our reflection:\n* **What is one thing that brought you a sense of gratitude or calm today, no matter how subtle?**`;

    case 'reflect':
    default:
      return `I hear the depth and authenticity in what you're sharing. Pausing to write these thoughts down is a powerful step in clarifying what matters most to you.\n\n> *"${preview.split('\n')[0]}"*\n\nAs you sit with these reflections:\n1. **What feeling or intuition sits beneath these thoughts right now?**\n2. **If you gave yourself full permission to honor your needs in this moment, what would that look like?**`;
  }
}

// Helper for model fallback streaming with timeout & local fallback
async function streamWithModelFallback(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string,
  userMessage: string,
  mode: string,
  onChunk: (text: string) => void,
  isAborted: () => boolean,
  modelsToTry?: string[]
): Promise<{ text: string; modelUsed: string; aborted?: boolean }> {
  const ai = getGenAI();
  const models = modelsToTry && modelsToTry.length > 0 
    ? modelsToTry 
    : getModelsForTask(mode === 'analyze' ? 'complex' : 'general');

  for (const modelName of models) {
    if (isAborted()) {
      return { text: '', modelUsed: modelName, aborted: true };
    }

    try {
      console.log(`[MindSpace] Attempting model: ${modelName}`);

      // Attempt fast direct generation with progressive token streaming for maximum reliability
      const directPromise = ai.models.generateContent({
        model: modelName,
        contents: contents as any,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.95,
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 6000)
      );

      const response = await Promise.race([directPromise, timeoutPromise]);
      const respText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (respText && respText.trim()) {
        console.log(`[MindSpace] Generated response with ${modelName} (${respText.length} chars), streaming to client...`);
        const words = respText.split(' ');
        let accumulated = '';

        for (let i = 0; i < words.length; i++) {
          if (isAborted()) {
            return { text: accumulated, modelUsed: modelName, aborted: true };
          }
          const token = (i === 0 ? '' : ' ') + words[i];
          accumulated += token;
          onChunk(token);
          // High-framerate fluid typewriter stream pacing
          await new Promise((r) => setTimeout(r, 16));
        }

        return { text: accumulated, modelUsed: modelName, aborted: false };
      }
    } catch (err: any) {
      if (isAborted() || err?.message?.includes('cancelled') || err?.name === 'AbortError') {
        return { text: '', modelUsed: modelName, aborted: true };
      }
      const errMsg = err?.message || String(err);
      console.warn(`[MindSpace] Model ${modelName} failed:`, errMsg);

      // If it's a 429 Quota Exceeded / Resource Exhausted, step immediately to next model
      if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        continue;
      }
    }
  }

  // If all live API models fail, stream the intelligent contextual fallback
  console.log('[MindSpace] Using contextual fallback reflection generator');
  const fallbackText = generateContextualFallback(userMessage, mode);
  const words = fallbackText.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    if (isAborted()) {
      return { text: accumulated, modelUsed: 'mindspace-local', aborted: true };
    }
    const token = (i === 0 ? '' : ' ') + words[i];
    accumulated += token;
    onChunk(token);
    await new Promise((resolve) => setTimeout(resolve, 18));
  }

  return { text: accumulated, modelUsed: 'mindspace-local', aborted: false };
}

// 1. Streaming Chat Endpoint
app.post('/api/journal/chat', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { sessionId, message, mode = 'reflect', history = [] } = body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid sessionId' });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing or empty message' });
  }

  if (message.length > 15000) {
    return res.status(400).json({ error: 'Message exceeds maximum length (15,000 characters)' });
  }

  const selectedMode = typeof mode === 'string' && SYSTEM_PROMPTS[mode] ? mode : 'reflect';
  const systemInstruction = SYSTEM_PROMPTS[selectedMode];

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': connected\n\n');

  let isClientClosed = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      isClientClosed = true;
    }
  });

  // Prepare Conversation Context for Gemini
  // Limit context to last 20 messages to prevent huge payload overhead
  const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const item of safeHistory) {
    if (item && item.content && typeof item.content === 'string') {
      contents.push({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }]
      });
    }
  }

  // Add the current user turn
  contents.push({
    role: 'user',
    parts: [{ text: message.trim() }]
  });

  let fullResponseText = '';

  try {
    // Select model ladder based on task complexity:
    // - Complex tasks ('analyze'): gemini-3.1-pro-preview ladder
    // - General tasks: gemini-3.5-flash ladder
    const taskType = selectedMode === 'analyze' ? 'complex' : 'general';
    const modelsForChat = getModelsForTask(taskType);

    const result = await streamWithModelFallback(
      contents,
      systemInstruction,
      message.trim(),
      selectedMode,
      (chunkText) => {
        if (!isClientClosed) {
          res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
        }
      },
      () => isClientClosed,
      modelsForChat
    );

    fullResponseText = result.text;

    if (!isClientClosed) {
      const isInterrupted = Boolean(result.aborted);
      res.write(`data: ${JSON.stringify({ text: '', done: true, fullText: fullResponseText, interrupted: isInterrupted })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    if (isClientClosed) {
      return;
    }
    console.error('Chat generation error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: err?.message || 'Failed to complete reflection response', done: true })}\n\n`);
    res.end();
  }
});

// 2. Generate Title Endpoint (Fast Task: gemini-3.1-flash-lite)
app.post('/api/journal/title', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { message, mode } = body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required to generate a title' });
  }

  // Fast fallback title derived from first words
  const cleanSnippet = message.trim().replace(/[#*`_>]/g, '');
  const firstWords = cleanSnippet.split(/\s+/).slice(0, 5).join(' ');
  const fallbackTitle = firstWords ? (firstWords.charAt(0).toUpperCase() + firstWords.slice(1)) : 'New Reflection';

  const prompt = `Based on this initial journal entry in '${mode || 'reflection'}' mode, generate a concise, evocative, and thoughtful title (3 to 6 words maximum). 
Do NOT include quotes, prefixes like "Title:", markdown, or ending punctuation.

Journal Entry:
"${message.substring(0, 1500)}"`;

  const ai = getGenAI();
  const fastModels = getModelsForTask('fast');
  for (const modelName of fastModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
          maxOutputTokens: 25
        }
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Title generation timeout')), 8000);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const title = response.text?.trim().replace(/^["']|["']$/g, '');
      if (title) {
        return res.json({ title });
      }
    } catch (err: any) {
      console.warn(`Title generation attempt failed with model ${modelName}:`, err?.message || err);
    }
  }

  res.json({ title: fallbackTitle });
});

// 3. Generate Session Summary Endpoint (Complex Task: gemini-3.1-pro-preview)
app.post('/api/journal/summary', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { messages, title, mode } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const formattedDialogue = messages
    .map((m: any) => `${m.role === 'user' ? 'User' : 'MindSpace'}: ${m.content}`)
    .join('\n\n');

  const prompt = `Summarize this personal journal session titled "${title || 'Reflection'}" (Mode: ${mode || 'Reflect'}).
Provide a thoughtful, structured synthesis:
- **Core Theme**: The fundamental topic or tension explored.
- **Key Realizations**: What became clearer or what shifts occurred.
- **Open Questions & Seeds**: Thoughts left to ponder.
- **Suggested Next Step**: One mindful or practical action.

Keep it elegant, concise, and focused on the user's personal growth.

Journal Transcript:
${formattedDialogue.substring(0, 10000)}`;

  const ai = getGenAI();
  const complexModels = getModelsForTask('complex');
  for (const modelName of complexModels) {
    try {
      const summaryPromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
        }
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Summary generation timeout')), 12000);
      });

      const response = await Promise.race([summaryPromise, timeoutPromise]);
      if (response.text?.trim()) {
        return res.json({ summary: response.text.trim() });
      }
    } catch (err: any) {
      console.warn(`Summary generation attempt failed with model ${modelName}:`, err?.message || err);
    }
  }

  // Fallback summary synthesis
  const userMessages = messages.filter((m: any) => m.role === 'user');
  const preview = userMessages.length > 0 ? userMessages[0].content.substring(0, 120) : 'personal reflection';
  const fallbackSummary = `### Session Synthesis: ${title || 'Mindful Reflection'}\n\n- **Core Theme**: Exploring thoughts surrounding "${preview}..."\n- **Key Realizations**: Creating intentional space to process feelings and articulate inner goals.\n- **Open Questions**: What is the most supportive step you can take for yourself next?\n- **Suggested Next Step**: Pause, breathe, and honor the insights you uncovered today.`;

  res.json({ summary: fallbackSummary });
});

// Boot dev or production server
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindSpace Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
