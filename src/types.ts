export type JournalMode = 
  | 'reflect'
  | 'summarize'
  | 'brainstorm'
  | 'plan'
  | 'analyze'
  | 'rewrite'
  | 'daily_checkin';

export interface ModeConfig {
  id: JournalMode;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  prompts: string[];
  placeholder: string;
  accentColor: string;
}

export interface MessageVersion {
  id: string;
  content: string;
  timestamp: number;
  status: 'completed' | 'interrupted' | 'error';
}

export interface JournalMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: JournalMode;
  createdAt: number;
  updatedAt?: number;
  status?: 'completed' | 'interrupted' | 'error';
  versions?: MessageVersion[];
  activeVersionIndex?: number;
  edited?: boolean;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  mode: JournalMode;
  summary?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  archived?: boolean;
  tags?: string[];
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
}

export interface ChatStreamChunk {
  text?: string;
  done?: boolean;
  error?: string;
  interrupted?: boolean;
  fullText?: string;
}
