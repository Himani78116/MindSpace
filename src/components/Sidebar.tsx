import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  LogOut, 
  Lock, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { JournalSession, JournalMode, UserProfile } from '../types';
import { JOURNAL_MODES } from '../lib/modes';
import { formatFriendlyDate, groupSessionsByDate } from '../utils/date';

interface SidebarProps {
  sessions: JournalSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  user: UserProfile | null;
  onSignOut: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  user,
  onSignOut,
  isMobileOpen,
  onCloseMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.summary && s.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const grouped = groupSessionsByDate(filteredSessions);

  const startEditing = (s: JournalSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitle(s.title);
  };

  const saveEditing = (sessionId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const confirmDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setSessionToDelete(null);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'MS';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 flex flex-col 
        backdrop-blur-xl bg-white/50 border-r border-white/40 p-5
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-sm">
              <div className="w-3.5 h-3.5 bg-white rounded-xs rotate-45" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-800 flex items-center gap-1.5">
                MINDSPACE
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">AI Reflection Studio</p>
            </div>
          </div>
          {isMobileOpen && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* New Journal Button */}
        <button
          id="btn-new-journal"
          onClick={() => {
            onNewSession();
            if (isMobileOpen) onCloseMobile();
          }}
          className="w-full py-3 px-4 bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 mb-4 hover:bg-slate-700 active:scale-[0.98] transition-all shadow-lg shadow-slate-300/50 font-medium text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal</span>
        </button>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-sessions"
            type="text"
            placeholder="Search reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/50 border border-white/60 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 backdrop-blur-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sessions List */}
        <nav className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-5">
          {sessions.length === 0 ? (
            <div className="text-center py-10 px-3">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-slate-600">No reflections yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Start your first reflection to cultivate clarity.</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">No journals match "{searchQuery}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 px-1">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((s) => {
                      const isActive = s.id === currentSessionId;
                      const modeConfig = JOURNAL_MODES[s.mode] || JOURNAL_MODES.reflect;
                      const isEditing = editingSessionId === s.id;

                      return (
                        <div
                          key={s.id}
                          id={`session-item-${s.id}`}
                          onClick={() => {
                            if (!isEditing) {
                              onSelectSession(s.id);
                              if (isMobileOpen) onCloseMobile();
                            }
                          }}
                          className={`
                            group relative p-3 rounded-xl transition-all cursor-pointer border
                            ${isActive 
                              ? 'bg-white/80 border-white/80 shadow-sm text-slate-900' 
                              : 'bg-white/30 border-transparent hover:bg-white/50 text-slate-700'
                            }
                          `}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing(s.id);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                                className="flex-1 text-xs font-semibold px-2 py-1 bg-white rounded border border-slate-300 focus:outline-none"
                              />
                              <button 
                                onClick={(e) => saveEditing(s.id, e)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={cancelEditing}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-xs truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {s.title || 'Untitled Reflection'}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                  <span>{modeConfig.emoji}</span>
                                  <span>{modeConfig.name}</span>
                                  <span>•</span>
                                  <span>{formatFriendlyDate(s.updatedAt || s.createdAt)}</span>
                                </div>
                              </div>

                              {/* Hover actions */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  title="Rename session"
                                  onClick={(e) => startEditing(s, e)}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  title="Delete session"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete(s.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Delete Confirmation Modal inline */}
                          {sessionToDelete === s.id && (
                            <div 
                              className="mt-2 p-2 bg-red-50/90 border border-red-200/80 rounded-lg text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-red-800 text-[11px] font-medium mb-2">Delete this reflection?</p>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete(null);
                                  }}
                                  className="px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => confirmDelete(s.id, e)}
                                  className="px-2 py-0.5 text-[10px] bg-red-600 text-white font-medium rounded hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </nav>

        {/* User Account Footer */}
        <div className="mt-auto pt-4 border-t border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-white/60 object-cover shrink-0" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700">
                  {getInitials(user?.displayName || null, user?.email || null)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.displayName || (user?.isAnonymous ? 'Guest Journaler' : 'MindSpace User')}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Private Storage</span>
                </div>
              </div>
            </div>

            <button
              title="Sign Out"
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
