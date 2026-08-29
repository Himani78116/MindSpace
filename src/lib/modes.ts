import { JournalMode, ModeConfig } from '../types';

export const JOURNAL_MODES: Record<JournalMode, ModeConfig> = {
  reflect: {
    id: 'reflect',
    name: 'Reflect',
    emoji: '💭',
    tagline: 'Explore feelings, unearth tensions & gain clarity',
    description: 'Reflect back important ideas, identify underlying emotions without clinical diagnoses, highlight contradictions or uncertainties, and ask thoughtful follow-up questions to encourage deeper insight.',
    placeholder: 'Write freely about what is on your mind, what happened, or how you are feeling...',
    accentColor: 'bg-emerald-500',
    prompts: [
      'Something has been weighing on my mind lately...',
      'I am feeling conflicted between two choices...',
      'Today left me feeling drained and I want to understand why...',
      'I noticed a recurring emotional pattern in my work this week...'
    ]
  },
  summarize: {
    id: 'summarize',
    name: 'Summarize',
    emoji: '📝',
    tagline: 'Distill thoughts into clean, actionable takeaways',
    description: 'Condense your raw entries into concise, structured highlights: Main Idea, Key Concerns, Decisions Made, and Open Questions.',
    placeholder: 'Paste your rambling thoughts or stream of consciousness to distill...',
    accentColor: 'bg-blue-500',
    prompts: [
      'Here is everything that happened this week; help me summarize the core themes.',
      'Help me condense these scattered thoughts into 3 key takeaways.',
      'Summarize our meeting takeaways and my personal action items.',
      'Help me outline the main points of my career contemplation.'
    ]
  },
  brainstorm: {
    id: 'brainstorm',
    name: 'Brainstorm',
    emoji: '💡',
    tagline: 'Spark fresh directions, possibilities & ideas',
    description: 'Expand upon your seeds of thought, explore alternative perspectives, build novel connections, and avoid prematurely judging or filtering ideas.',
    placeholder: 'Share an idea, challenge, or topic you want to branch out on...',
    accentColor: 'bg-amber-500',
    prompts: [
      'I have an idea for a side project but don’t know where to start...',
      'Brainstorm creative ways to approach my current work roadblock.',
      'What are some non-obvious angles to look at this problem?',
      'Help me generate 5 distinct directions for my next learning goal.'
    ]
  },
  plan: {
    id: 'plan',
    name: 'Plan',
    emoji: '🎯',
    tagline: 'Convert reflections into structured, realistic steps',
    description: 'Transform broad intentions into Goal → Current Situation → Practical Approach → Next Actions → Immediate Milestone.',
    placeholder: 'State what you want to achieve or change...',
    accentColor: 'bg-indigo-500',
    prompts: [
      'Help me turn this vague ambition into a 2-week plan.',
      'I need a step-by-step roadmap to prepare for my upcoming presentation.',
      'How do I break down this overwhelming task into manageable pieces?',
      'Create a realistic schedule for my morning mindfulness routine.'
    ]
  },
  analyze: {
    id: 'analyze',
    name: 'Analyze',
    emoji: '🔍',
    tagline: 'Examine patterns, assumptions & decision criteria',
    description: 'Identify recurring patterns, contradictions, hidden assumptions, trade-offs, and critical decision points in your thoughts without speculation.',
    placeholder: 'Describe a situation, dilemma, or complex decision...',
    accentColor: 'bg-purple-500',
    prompts: [
      'Help me analyze why I keep procrastinating on this particular project.',
      'What hidden assumptions am I making in this decision?',
      'Analyze the pros and cons and potential second-order consequences.',
      'Help me evaluate whether this commitment aligns with my values.'
    ]
  },
  rewrite: {
    id: 'rewrite',
    name: 'Rewrite',
    emoji: '✨',
    tagline: 'Polish prose, elevate clarity & preserve authentic voice',
    description: 'Refine your drafts for elegance, rhythm, and clarity while protecting your personal voice and genuine intent.',
    placeholder: 'Draft your message, personal essay, or communication here...',
    accentColor: 'bg-rose-500',
    prompts: [
      'Help me express this difficult feedback kindly and clearly.',
      'Polish this journal entry into a thoughtful personal essay.',
      'Make this proposal concise and compelling without sounding stiff.',
      'Rewrite this reflection to capture my authentic sentiment better.'
    ]
  },
  daily_checkin: {
    id: 'daily_checkin',
    name: 'Daily Check-in',
    emoji: '🧘',
    tagline: 'A mindful 5-question evening or morning debrief',
    description: 'A calming multi-turn reflection guided step-by-step through: 1) What went well, 2) Challenges, 3) Learnings, 4) Current state of mind, 5) Tomorrow’s focus.',
    placeholder: 'Ready to check in on today? Say hello or share how your day started...',
    accentColor: 'bg-teal-500',
    prompts: [
      'Guide me through my evening daily check-in.',
      'Let’s do a quick morning alignment and mindset check.',
      'I had a whirlwind day; help me reflect on what went well and what challenged me.',
      'Walk me through the 5 daily reflection questions.'
    ]
  }
};

export const MODE_SYSTEM_PROMPTS: Record<JournalMode, string> = {
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
