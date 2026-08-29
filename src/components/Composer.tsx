import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square, 
  Sparkles, 
  CornerDownLeft, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { JournalMode } from '../types';
import { JOURNAL_MODES } from '../lib/modes';

interface ComposerProps {
  currentMode: JournalMode;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  onSelectMode?: (mode: JournalMode) => void;
  initialPrompt?: string;
}

export const Composer: React.FC<ComposerProps> = ({
  currentMode,
  onSendMessage,
  onStopGeneration,
  isGenerating,
  onSelectMode,
  initialPrompt
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modeConfig = JOURNAL_MODES[currentMode] || JOURNAL_MODES.reflect;

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 220);
      textareaRef.current.style.height = `${Math.max(newHeight, 52)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="p-4 lg:p-8 pt-0 max-w-4xl mx-auto w-full">
      <div className="relative">
        {/* Floating Quick Mode Starter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
          {modeConfig.prompts.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handlePromptClick(prompt)}
              className="px-3 py-1 bg-white/50 border border-white/70 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-700 hover:bg-white/80 hover:text-slate-900 transition-all truncate shrink-0 shadow-2xs cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Glassmorphic Input Container */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white p-2 rounded-3xl lg:rounded-[2.5rem] shadow-xl flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-slate-300 focus-within:bg-white/90">
          <div className="flex-1 px-3 py-1">
            <textarea
              ref={textareaRef}
              id="composer-textarea"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modeConfig.placeholder}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm leading-relaxed text-slate-800 placeholder-slate-400 resize-none py-2 max-h-56"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 p-1 shrink-0">
            {isGenerating ? (
              <button
                id="btn-stop-generation"
                type="button"
                onClick={onStopGeneration}
                title="Stop generation"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 transition-all shadow-xs cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                id="btn-send-message"
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                title="Send reflection (Enter)"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-slate-800 transition-transform active:scale-95 shadow-md shadow-slate-300/40 cursor-pointer"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Privacy & Helper Tip */}
        <div className="flex items-center justify-between mt-2.5 px-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Private Firestore storage • Locked to your account</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 bg-white/60 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Enter ↵</kbd> to reflect</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.5 bg-white/60 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Shift + Enter</kbd> for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};
