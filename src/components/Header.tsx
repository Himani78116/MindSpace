import React, { useState } from 'react';
import { 
  Menu, 
  Sparkles, 
  SlidersHorizontal, 
  Check, 
  Edit2, 
  ShieldCheck,
  Download
} from 'lucide-react';
import { JournalMode, JournalSession } from '../types';
import { JOURNAL_MODES } from '../lib/modes';

interface HeaderProps {
  currentSession: JournalSession | null;
  currentMode: JournalMode;
  onOpenModeSelector: () => void;
  onOpenSummaryModal: () => void;
  onRenameSession: (newTitle: string) => void;
  onToggleMobileSidebar: () => void;
  onExportSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSession,
  currentMode,
  onOpenModeSelector,
  onOpenSummaryModal,
  onRenameSession,
  onToggleMobileSidebar,
  onExportSession
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const modeConfig = JOURNAL_MODES[currentMode] || JOURNAL_MODES.reflect;

  const handleStartEditing = () => {
    setTitleDraft(currentSession?.title || 'New Reflection');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim() && currentSession) {
      onRenameSession(titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-18 flex items-center justify-between px-6 lg:px-8 border-b border-white/30 backdrop-blur-md bg-white/25 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Menu Button */}
        <button
          id="btn-mobile-sidebar"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:bg-white/50 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="font-bold text-sm lg:text-base text-slate-800 bg-white/80 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 bg-slate-800 text-white rounded-md hover:bg-slate-700 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 
                onClick={handleStartEditing}
                title="Click to rename"
                className="font-bold text-sm lg:text-base text-slate-800 truncate cursor-pointer hover:text-slate-600 transition-colors"
              >
                {currentSession?.title || 'New Reflection'}
              </h2>
              <button
                onClick={handleStartEditing}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${modeConfig.accentColor} animate-pulse`} />
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span>{modeConfig.emoji}</span>
              <span>{modeConfig.name} Mode Active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="btn-change-mode"
          onClick={onOpenModeSelector}
          className="px-3.5 py-1.5 rounded-full border border-slate-300/80 bg-white/40 hover:bg-white/70 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Change Mode</span>
          <span className="sm:hidden">Mode</span>
        </button>

        <button
          id="btn-open-summary"
          onClick={onOpenSummaryModal}
          className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-slate-800 shadow-sm border border-slate-200/80 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Summary</span>
        </button>
      </div>
    </header>
  );
};
