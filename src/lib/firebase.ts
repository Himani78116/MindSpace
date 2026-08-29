import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalMessage, JournalSession, UserProfile } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with custom database ID if present
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Utility: Strips any undefined fields from objects prior to Firestore operations
 * Prevents "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
      cleanObj[key] = sanitizeForFirestore(value);
    } else if (Array.isArray(value)) {
      cleanObj[key] = value.map(item => 
        item && typeof item === 'object' ? sanitizeForFirestore(item) : item
      ).filter(item => item !== undefined);
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj as T;
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Google popup sign-in failed, attempting anonymous fallback:', error);
    // Fallback if popup blocked in iframe sandbox
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      const anonResult = await signInAnonymously(auth);
      return anonResult.user;
    }
    throw error;
  }
}

export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

export async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(true);
  } catch (err) {
    console.error('Failed to retrieve fresh ID token:', err);
    return null;
  }
}

// Firestore Session Operations
export function getSessionsCollection(userId: string) {
  return collection(db, 'users', userId, 'sessions');
}

export function getSessionDoc(userId: string, sessionId: string) {
  return doc(db, 'users', userId, 'sessions', sessionId);
}

export function getMessagesCollection(userId: string, sessionId: string) {
  return collection(db, 'users', userId, 'sessions', sessionId, 'messages');
}

export function getMessageDoc(userId: string, sessionId: string, messageId: string) {
  return doc(db, 'users', userId, 'sessions', sessionId, 'messages', messageId);
}

// In-memory / local storage fallback stores for unauthenticated or restricted guest sessions
function getLocalGuestSessions(userId: string): JournalSession[] {
  try {
    const raw = localStorage.getItem(`mindspace_sessions_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGuestSessions(userId: string, sessions: JournalSession[]) {
  try {
    localStorage.setItem(`mindspace_sessions_${userId}`, JSON.stringify(sessions));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function getLocalGuestMessages(userId: string, sessionId: string): JournalMessage[] {
  try {
    const raw = localStorage.getItem(`mindspace_msgs_${userId}_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGuestMessages(userId: string, sessionId: string, msgs: JournalMessage[]) {
  try {
    localStorage.setItem(`mindspace_msgs_${userId}_${sessionId}`, JSON.stringify(msgs));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

export async function createSessionInFirestore(userId: string, session: JournalSession): Promise<void> {
  const cleanData = sanitizeForFirestore({
    ...session,
    createdAt: session.createdAt || Date.now(),
    updatedAt: session.updatedAt || Date.now()
  });

  try {
    if (auth.currentUser) {
      const sessionRef = getSessionDoc(userId, session.id);
      await setDoc(sessionRef, cleanData);
    }
  } catch (e) {
    console.warn('Firestore createSession fallback to local:', e);
  }

  // Always keep local updated
  const sessions = getLocalGuestSessions(userId);
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = { ...sessions[existingIndex], ...cleanData };
  } else {
    sessions.unshift(cleanData as JournalSession);
  }
  saveLocalGuestSessions(userId, sessions);
}

export async function updateSessionInFirestore(userId: string, sessionId: string, updates: Partial<JournalSession>): Promise<void> {
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now()
  });

  try {
    if (auth.currentUser) {
      const sessionRef = getSessionDoc(userId, sessionId);
      await updateDoc(sessionRef, cleanUpdates);
    }
  } catch (e) {
    console.warn('Firestore updateSession fallback to local:', e);
  }

  const sessions = getLocalGuestSessions(userId);
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...cleanUpdates };
    saveLocalGuestSessions(userId, sessions);
  }
}

export async function deleteSessionInFirestore(userId: string, sessionId: string): Promise<void> {
  try {
    if (auth.currentUser) {
      const sessionRef = getSessionDoc(userId, sessionId);
      await deleteDoc(sessionRef);
    }
  } catch (e) {
    console.warn('Firestore deleteSession fallback to local:', e);
  }

  const sessions = getLocalGuestSessions(userId).filter(s => s.id !== sessionId);
  saveLocalGuestSessions(userId, sessions);
  try {
    localStorage.removeItem(`mindspace_msgs_${userId}_${sessionId}`);
  } catch {}
}

export async function saveMessageInFirestore(userId: string, sessionId: string, message: JournalMessage): Promise<void> {
  const cleanMsg = sanitizeForFirestore({
    ...message,
    createdAt: message.createdAt || Date.now(),
    updatedAt: message.updatedAt || Date.now()
  });

  try {
    if (auth.currentUser) {
      const msgRef = getMessageDoc(userId, sessionId, message.id);
      await setDoc(msgRef, cleanMsg);
    }
  } catch (e) {
    console.warn('Firestore saveMessage fallback to local:', e);
  }

  const msgs = getLocalGuestMessages(userId, sessionId);
  const idx = msgs.findIndex(m => m.id === message.id);
  if (idx >= 0) {
    msgs[idx] = { ...msgs[idx], ...cleanMsg };
  } else {
    msgs.push(cleanMsg as JournalMessage);
  }
  saveLocalGuestMessages(userId, sessionId, msgs);
}

export async function updateMessageInFirestore(userId: string, sessionId: string, messageId: string, updates: Partial<JournalMessage>): Promise<void> {
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now()
  });

  try {
    if (auth.currentUser) {
      const msgRef = getMessageDoc(userId, sessionId, messageId);
      await updateDoc(msgRef, cleanUpdates);
    }
  } catch (e) {
    console.warn('Firestore updateMessage fallback to local:', e);
  }

  const msgs = getLocalGuestMessages(userId, sessionId);
  const idx = msgs.findIndex(m => m.id === messageId);
  if (idx >= 0) {
    msgs[idx] = { ...msgs[idx], ...cleanUpdates };
    saveLocalGuestMessages(userId, sessionId, msgs);
  }
}

export async function deleteMessageInFirestore(userId: string, sessionId: string, messageId: string): Promise<void> {
  try {
    if (auth.currentUser) {
      const msgRef = getMessageDoc(userId, sessionId, messageId);
      await deleteDoc(msgRef);
    }
  } catch (e) {
    console.warn('Firestore deleteMessage fallback to local:', e);
  }

  const msgs = getLocalGuestMessages(userId, sessionId).filter(m => m.id !== messageId);
  saveLocalGuestMessages(userId, sessionId, msgs);
}
