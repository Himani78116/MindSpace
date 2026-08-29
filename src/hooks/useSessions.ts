import { useState, useEffect } from 'react';
import { 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  getSessionsCollection, 
  createSessionInFirestore, 
  updateSessionInFirestore, 
  deleteSessionInFirestore,
  auth
} from '../lib/firebase';
import { JournalMode, JournalSession } from '../types';

export function useSessions(userId: string | null | undefined) {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadLocalSessions = () => {
      try {
        const raw = localStorage.getItem(`mindspace_sessions_${userId}`);
        const loaded = raw ? JSON.parse(raw) : [];
        setSessions(loaded);
      } catch {
        setSessions([]);
      }
      setLoading(false);
    };

    // Load initial local state
    loadLocalSessions();

    // Listen to local storage events for cross-tab or component updates
    const handleStorageChange = () => {
      loadLocalSessions();
    };
    window.addEventListener('storage', handleStorageChange);

    let unsubscribe = () => {};
    if (auth.currentUser) {
      try {
        const sessionsQuery = query(
          getSessionsCollection(userId),
          orderBy('updatedAt', 'desc'),
          limit(100)
        );

        unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
          const loadedSessions: JournalSession[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as JournalSession;
            loadedSessions.push({
              ...data,
              id: doc.id
            });
          });
          setSessions(loadedSessions);
          setLoading(false);
        }, (err) => {
          console.warn('Firestore sessions subscription restricted, using local session state:', err?.message || err);
          loadLocalSessions();
        });
      } catch (err) {
        console.warn('Firestore query error:', err);
        loadLocalSessions();
      }
    }

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);

  const createSession = async (mode: JournalMode = 'reflect', customTitle?: string): Promise<JournalSession> => {
    if (!userId) throw new Error('User is not authenticated');

    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newSession: JournalSession = {
      id: newSessionId,
      userId,
      title: customTitle || 'New Reflection',
      mode,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    await createSessionInFirestore(userId, newSession);
    return newSession;
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    if (!userId) return;
    await updateSessionInFirestore(userId, sessionId, { title: title.trim() });
  };

  const updateSessionMode = async (sessionId: string, mode: JournalMode) => {
    if (!userId) return;
    await updateSessionInFirestore(userId, sessionId, { mode });
  };

  const updateSessionSummary = async (sessionId: string, summary: string) => {
    if (!userId) return;
    await updateSessionInFirestore(userId, sessionId, { summary });
  };

  const deleteSession = async (sessionId: string) => {
    if (!userId) return;
    await deleteSessionInFirestore(userId, sessionId);
  };

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSessionTitle,
    updateSessionMode,
    updateSessionSummary,
    deleteSession,
  };
}
