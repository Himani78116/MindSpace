import { useState, useEffect, useRef } from 'react';
import { 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  getMessagesCollection, 
  saveMessageInFirestore, 
  updateMessageInFirestore, 
  deleteMessageInFirestore, 
  getAuthToken,
  updateSessionInFirestore,
  auth
} from '../lib/firebase';
import { JournalMessage, JournalMode, MessageVersion } from '../types';

export function useMessages(
  userId: string | null | undefined, 
  sessionId: string | null | undefined, 
  currentMode: JournalMode = 'reflect',
  onSessionTitleGenerated?: (newTitle: string) => void
) {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [activeAssistantMsgId, setActiveAssistantMsgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const currentSessionIdRef = useRef<string | null>(sessionId);

  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Sync Messages from Firestore in Real-Time
  useEffect(() => {
    if (!userId || !sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadLocalMessages = () => {
      try {
        const raw = localStorage.getItem(`mindspace_msgs_${userId}_${sessionId}`);
        const loaded = raw ? JSON.parse(raw) : [];
        setMessages(loaded);
      } catch {
        setMessages([]);
      }
      setLoading(false);
    };

    // Load initial local messages
    loadLocalMessages();

    let unsubscribe = () => {};
    if (auth.currentUser) {
      try {
        const msgsQuery = query(
          getMessagesCollection(userId, sessionId),
          orderBy('createdAt', 'asc')
        );

        unsubscribe = onSnapshot(msgsQuery, (snapshot) => {
          const loaded: JournalMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as JournalMessage;
            loaded.push({
              ...data,
              id: docSnap.id,
            });
          });
          setMessages(loaded);
          setLoading(false);
        }, (err) => {
          console.warn('Firestore messages listener restricted, using local session state:', err?.message || err);
          loadLocalMessages();
        });
      } catch (err) {
        console.warn('Firestore query error:', err);
        loadLocalMessages();
      }
    }

    const prevSession = sessionId;
    return () => {
      unsubscribe();
      // Only abort if the user has navigated away to another session or logged out
      if (currentSessionIdRef.current !== prevSession && currentSessionIdRef.current !== null && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, sessionId]);

  // Helper to fetch SSE stream from server
  const executeStream = async (
    userMsgText: string,
    historyContext: JournalMessage[],
    assistantMsgId: string,
    modeToUse: JournalMode,
    isRegeneration: boolean = false,
    existingAssistantMsg?: JournalMessage,
    targetSessionId?: string
  ) => {
    const effectiveSessionId = targetSessionId || sessionId;
    if (!userId || !effectiveSessionId) return;

    setIsGenerating(true);
    setStreamingText('');
    setActiveAssistantMsgId(assistantMsgId);
    isStoppingRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    let isInterrupted = false;

    try {
      const idToken = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || userId || 'mindspace_user'}`
      };
      if (userId) {
        headers['x-guest-uid'] = userId;
      }

      // Execute fetch with abort resilience and retry
      let response: Response | null = null;
      let lastFetchError: any = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (controller.signal.aborted || isStoppingRef.current) {
          isInterrupted = true;
          break;
        }

        try {
          response = await fetch('/api/journal/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              sessionId: effectiveSessionId,
              message: userMsgText,
              mode: modeToUse,
              history: historyContext.map(m => ({
                role: m.role,
                content: m.content
              }))
            }),
            signal: controller.signal
          });

          if (response.ok) {
            lastFetchError = null;
            break;
          } else {
            const errJson = await response.json().catch(() => ({}));
            lastFetchError = new Error(errJson.error || `Server responded with status ${response.status}`);
          }
        } catch (fetchErr: any) {
          lastFetchError = fetchErr;
          if (controller.signal.aborted || isStoppingRef.current) {
            isInterrupted = true;
            break;
          }
          if (attempt === 0) {
            await new Promise(res => setTimeout(res, 300));
          }
        }
      }

      if (controller.signal.aborted || isStoppingRef.current) {
        isInterrupted = true;
      } else if (!response || !response.ok) {
        throw lastFetchError || new Error('Failed to reach reflection server');
      }

      if (response && response.body && !isInterrupted) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setStreamingText(accumulatedText);
                }
                if (parsed.interrupted) {
                  isInterrupted = true;
                }
                if (parsed.fullText) {
                  accumulatedText = parsed.fullText;
                  setStreamingText(accumulatedText);
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e;
                }
              }
            }
          }
        }
      }

      // Stream Finished
      const now = Date.now();
      const wasExplicitlyStopped = isStoppingRef.current;
      const status = wasExplicitlyStopped ? 'interrupted' : 'completed';

      if (!accumulatedText.trim() && !wasExplicitlyStopped) {
        throw new Error('Reflection service produced an empty response. Please try again.');
      }

      if (isRegeneration && existingAssistantMsg) {
        // Append version
        const newVersion: MessageVersion = {
          id: `v_${Date.now()}`,
          content: accumulatedText || (wasExplicitlyStopped ? '(Reflection stopped)' : 'MindSpace is listening.'),
          timestamp: now,
          status
        };
        const currentVersions = existingAssistantMsg.versions || [{
          id: 'v_orig',
          content: existingAssistantMsg.content,
          timestamp: existingAssistantMsg.createdAt,
          status: existingAssistantMsg.status || 'completed'
        }];
        const updatedVersions = [...currentVersions, newVersion];
        
        await updateMessageInFirestore(userId, effectiveSessionId, assistantMsgId, {
          content: accumulatedText || (wasExplicitlyStopped ? '(Reflection stopped)' : 'MindSpace is listening.'),
          status,
          versions: updatedVersions,
          activeVersionIndex: updatedVersions.length - 1,
          updatedAt: now
        });
      } else {
        // Save Assistant message to Firestore
        const assistantMessage: JournalMessage = {
          id: assistantMsgId,
          sessionId: effectiveSessionId,
          userId,
          role: 'assistant',
          content: accumulatedText || (wasExplicitlyStopped ? '(Reflection stopped)' : 'MindSpace is listening.'),
          mode: modeToUse,
          createdAt: now,
          updatedAt: now,
          status,
          versions: [{
            id: `v_${now}`,
            content: accumulatedText || (wasExplicitlyStopped ? '(Reflection stopped)' : 'MindSpace is listening.'),
            timestamp: now,
            status
          }],
          activeVersionIndex: 0
        };

        await saveMessageInFirestore(userId, effectiveSessionId, assistantMessage);
      }

      // Update session stats
      await updateSessionInFirestore(userId, effectiveSessionId, {
        updatedAt: now,
        messageCount: messages.length + (isRegeneration ? 0 : 2)
      });

    } catch (err: any) {
      const isAbort = 
        isStoppingRef.current ||
        err.name === 'AbortError' || 
        controller.signal.aborted ||
        Boolean(abortControllerRef.current?.signal.aborted) ||
        err?.message?.includes('cancelled') || 
        err?.message?.includes('aborted');

      if (isAbort && isStoppingRef.current) {
        // Handled as stopped by user
        const now = Date.now();
        if (accumulatedText) {
          const assistantMessage: JournalMessage = {
            id: assistantMsgId,
            sessionId: effectiveSessionId,
            userId,
            role: 'assistant',
            content: accumulatedText,
            mode: modeToUse,
            createdAt: now,
            updatedAt: now,
            status: 'interrupted'
          };
          await saveMessageInFirestore(userId, effectiveSessionId, assistantMessage);
        }
      } else if (!isAbort) {
        console.error('Generation failure:', err);
        const userFriendlyMsg = err.message || 'MindSpace reflection encountered a temporary connection issue.';
        setError(userFriendlyMsg);
        // Save error placeholder so user sees reflection issue with clear message
        const now = Date.now();
        const assistantMessage: JournalMessage = {
          id: assistantMsgId,
          sessionId: effectiveSessionId,
          userId,
          role: 'assistant',
          content: accumulatedText || `MindSpace was unable to complete the reflection (${userFriendlyMsg}). Your thoughts are safely saved.`,
          mode: modeToUse,
          createdAt: now,
          updatedAt: now,
          status: 'error'
        };
        await saveMessageInFirestore(userId, effectiveSessionId, assistantMessage);
      }
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      setActiveAssistantMsgId(null);
      isStoppingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // 1. Send User Message
  const sendMessage = async (text: string, modeOverride?: JournalMode, sessionIdOverride?: string) => {
    const targetSessionId = sessionIdOverride || sessionId;
    if (!userId || !targetSessionId || !text.trim() || isGenerating) return;

    const trimmed = text.trim();
    const modeToUse = modeOverride || currentMode;
    const now = Date.now();
    const userMsgId = `msg_user_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMsgId = `msg_asst_${now + 1}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Save User Message immediately
    const userMessage: JournalMessage = {
      id: userMsgId,
      sessionId: targetSessionId,
      userId,
      role: 'user',
      content: trimmed,
      createdAt: now,
      updatedAt: now,
      status: 'completed'
    };

    await saveMessageInFirestore(userId, targetSessionId, userMessage);

    // Auto-generate title if this is the first message
    if (messages.length === 0 && onSessionTitleGenerated) {
      generateTitleForSession(trimmed, modeToUse, targetSessionId);
    }

    // 2. Stream Assistant Response
    await executeStream(trimmed, messages, assistantMsgId, modeToUse, false, undefined, targetSessionId);
  };

  // Helper to auto-generate session title
  const generateTitleForSession = async (userEntry: string, mode: JournalMode, targetSessionId?: string) => {
    const effectiveSessionId = targetSessionId || sessionId;
    if (!userId || !effectiveSessionId) return;
    try {
      const idToken = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || userId || 'mindspace_user'}`
      };
      if (userId) headers['x-guest-uid'] = userId;

      const res = await fetch('/api/journal/title', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userEntry, mode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title && onSessionTitleGenerated) {
          onSessionTitleGenerated(data.title);
          await updateSessionInFirestore(userId, effectiveSessionId, { title: data.title });
        }
      }
    } catch (e) {
      console.warn('Auto title generation failed:', e);
    }
  };

  // 2. Regenerate Assistant Response
  const regenerateResponse = async (assistantMsgId: string) => {
    if (!userId || !sessionId || isGenerating) return;

    const targetIdx = messages.findIndex(m => m.id === assistantMsgId);
    if (targetIdx === -1) return;

    const targetAssistantMsg = messages[targetIdx];
    // Find preceding user message
    let precedingUserMsg: JournalMessage | null = null;
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        precedingUserMsg = messages[i];
        break;
      }
    }

    if (!precedingUserMsg) return;

    // Prior context is all messages before this assistant response
    const priorContext = messages.slice(0, targetIdx - 1);

    await executeStream(
      precedingUserMsg.content,
      priorContext,
      assistantMsgId,
      targetAssistantMsg.mode || currentMode,
      true,
      targetAssistantMsg
    );
  };

  // 3. Edit & Resend User Message
  const editAndResendMessage = async (userMsgId: string, newContent: string) => {
    if (!userId || !sessionId || !newContent.trim() || isGenerating) return;

    const targetIdx = messages.findIndex(m => m.id === userMsgId);
    if (targetIdx === -1) return;

    // Remove all downstream messages from Firestore
    const downstreamMessages = messages.slice(targetIdx + 1);
    for (const msg of downstreamMessages) {
      try {
        await deleteMessageInFirestore(userId, sessionId, msg.id);
      } catch (e) {
        console.error('Error deleting downstream message:', e);
      }
    }

    // Update the user message
    const now = Date.now();
    await updateMessageInFirestore(userId, sessionId, userMsgId, {
      content: newContent.trim(),
      updatedAt: now,
      edited: true
    });

    const priorContext = messages.slice(0, targetIdx);
    const assistantMsgId = `msg_asst_${now + 1}_${Math.random().toString(36).substring(2, 6)}`;

    // Execute new stream
    await executeStream(
      newContent.trim(),
      priorContext,
      assistantMsgId,
      currentMode,
      false
    );
  };

  // 4. Switch Version for Assistant Message
  const switchMessageVersion = async (messageId: string, versionIndex: number) => {
    if (!userId || !sessionId) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.versions || !msg.versions[versionIndex]) return;

    const selectedVer = msg.versions[versionIndex];
    await updateMessageInFirestore(userId, sessionId, messageId, {
      content: selectedVer.content,
      status: selectedVer.status,
      activeVersionIndex: versionIndex
    });
  };

  // 5. Stop Generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      isStoppingRef.current = true;
      abortControllerRef.current.abort();
    }
  };

  return {
    messages,
    loading,
    isGenerating,
    streamingText,
    activeAssistantMsgId,
    error,
    sendMessage,
    regenerateResponse,
    editAndResendMessage,
    switchMessageVersion,
    stopGeneration,
  };
}
