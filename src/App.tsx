import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSessions } from './hooks/useSessions';
import { useMessages } from './hooks/useMessages';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MessageItem } from './components/MessageItem';
import { Composer } from './components/Composer';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { SummaryModal } from './components/SummaryModal';
import { AuthModal } from './components/AuthModal';
import { JournalMode, JournalSession } from './types';
import { JOURNAL_MODES } from './lib/modes';
import { Sparkles, MessageSquare, Compass, Shield, ArrowRight } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading, authError, signInWithGoogle, signInAsGuest, signOut } = useAuth();
  
  const { 
    sessions, 
    loading: sessionsLoading, 
    createSession, 
    updateSessionTitle, 
    updateSessionMode, 
    updateSessionSummary, 
    deleteSession 
  } = useSessions(user?.uid);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [promptToInject, setPromptToInject] = useState<string>('');

  const currentSession: JournalSession | null = 
    sessions.find(s => s.id === activeSessionId) || null;

  const currentMode: JournalMode = currentSession?.mode || 'reflect';

  // Automatically select the most recent session or create an initial one
  useEffect(() => {
    if (!sessionsLoading && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, sessionsLoading, activeSessionId]);

  const {
    messages,
    loading: messagesLoading,
    isGenerating,
    streamingText,
    activeAssistantMsgId,
    error: messagesError,
    sendMessage,
    regenerateResponse,
    editAndResendMessage,
    switchMessageVersion,
    stopGeneration,
  } = useMessages(
    user?.uid, 
    activeSessionId, 
    currentMode, 
    (newTitle) => {
      if (activeSessionId) {
        updateSessionTitle(activeSessionId, newTitle);
      }
    }
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isGenerating]);

  // Handle New Session Creation
  const handleNewSession = async (mode: JournalMode = 'reflect') => {
    if (!user) return null;
    try {
      const newSession = await createSession(mode, 'New Reflection');
      setActiveSessionId(newSession.id);
      return newSession;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  };

  const handleSelectMode = (mode: JournalMode) => {
    if (activeSessionId) {
      updateSessionMode(activeSessionId, mode);
    }
  };

  const handlePromptSelect = (prompt: string, mode?: JournalMode) => {
    if (mode && activeSessionId) {
      updateSessionMode(activeSessionId, mode);
    }
    setPromptToInject(prompt);
  };

  // If Auth is checking initial state
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center frosted-bg text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <div className="w-5 h-5 bg-white rounded-xs rotate-45" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Entering MindSpace...</p>
      </div>
    );
  }

  // If not logged in
  if (!user) {
    return (
      <AuthModal
        onGoogleSignIn={signInWithGoogle}
        onGuestSignIn={signInAsGuest}
        authError={authError}
      />
    );
  }

  const modeConfig = JOURNAL_MODES[currentMode] || JOURNAL_MODES.reflect;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-800 frosted-bg">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={() => handleNewSession(currentMode)}
        onDeleteSession={async (sessionId) => {
          await deleteSession(sessionId);
          if (activeSessionId === sessionId) {
            const remaining = sessions.filter(s => s.id !== sessionId);
            setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
          }
        }}
        onRenameSession={updateSessionTitle}
        user={user}
        onSignOut={signOut}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Journal Workspace */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          currentSession={currentSession}
          currentMode={currentMode}
          onOpenModeSelector={() => setIsModeSelectorOpen(true)}
          onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
          onRenameSession={(title) => {
            if (activeSessionId) updateSessionTitle(activeSessionId, title);
          }}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Message View Area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            {messagesError && (
              <div className="p-4 mb-6 bg-red-50/90 border border-red-200/80 rounded-2xl text-xs text-red-700 flex items-center justify-between shadow-xs">
                <span>{messagesError}</span>
              </div>
            )}

            {/* Empty State / Session Welcome */}
            {messages.length === 0 && !isGenerating && (
              <div className="py-12 lg:py-16 text-center max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-white/70 backdrop-blur-xl border border-white flex items-center justify-center mx-auto shadow-md">
                  <span className="text-3xl">{modeConfig.emoji}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {modeConfig.name} Mode
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    {modeConfig.tagline}
                  </p>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    {modeConfig.description}
                  </p>
                </div>

                {/* Mode Selector Chips */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Switch Mode
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {Object.values(JOURNAL_MODES).map((mode) => (
                      <button
                        key={mode.id}
                        id={`empty-mode-pill-${mode.id}`}
                        onClick={() => handleSelectMode(mode.id)}
                        className={`
                          px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border
                          ${mode.id === currentMode
                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                            : 'bg-white/50 hover:bg-white border-white/80 text-slate-700'
                          }
                        `}
                      >
                        <span>{mode.emoji}</span>
                        <span>{mode.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suggested Starters */}
                <div className="space-y-3 pt-4 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Suggested Reflection Starters
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {modeConfig.prompts.map((prompt, idx) => (
                      <div
                        key={idx}
                        onClick={() => handlePromptSelect(prompt)}
                        className="p-3.5 bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl transition-all cursor-pointer text-xs text-slate-700 font-medium shadow-2xs hover:shadow-xs group flex items-center justify-between gap-2"
                      >
                        <span className="leading-relaxed">"{prompt}"</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Render Chronological Messages */}
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onRegenerate={regenerateResponse}
                onEditAndResend={editAndResendMessage}
                onSwitchVersion={switchMessageVersion}
                isGenerating={isGenerating}
              />
            ))}

            {/* In-flight Active Stream Message */}
            {isGenerating && streamingText && (
              <MessageItem
                message={{
                  id: activeAssistantMsgId || 'streaming',
                  sessionId: activeSessionId || '',
                  userId: user.uid,
                  role: 'assistant',
                  content: streamingText,
                  mode: currentMode,
                  createdAt: Date.now(),
                  status: 'completed'
                }}
                isGenerating={true}
              />
            )}

            {/* Thinking Indicator */}
            {isGenerating && !streamingText && (
              <div className="flex items-center justify-center gap-3 py-6 animate-pulse">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-300" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/60 backdrop-blur-md rounded-full border border-white/80 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-slate-700 animate-ping" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    MindSpace is reflecting
                  </span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-300" />
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Composer Bottom Area */}
        <Composer
          currentMode={currentMode}
          onSendMessage={async (text) => {
            let sId = activeSessionId;
            if (!sId) {
              const newSession = await handleNewSession(currentMode);
              if (newSession) {
                sId = newSession.id;
              }
            }
            if (sId) {
              sendMessage(text, currentMode, sId);
            }
            setPromptToInject('');
          }}
          onStopGeneration={stopGeneration}
          isGenerating={isGenerating}
          onSelectMode={handleSelectMode}
          initialPrompt={promptToInject}
        />
      </main>

      {/* Mode Selector Modal */}
      <ModeSelectorModal
        isOpen={isModeSelectorOpen}
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        onClose={() => setIsModeSelectorOpen(false)}
      />

      {/* Summary Modal */}
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        session={currentSession}
        messages={messages}
        userId={user.uid}
        onSaveSummary={async (summaryText) => {
          if (activeSessionId) {
            await updateSessionSummary(activeSessionId, summaryText);
          }
        }}
      />
    </div>
  );
}
