import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, 
  Check, 
  RotateCw, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  PauseCircle,
  Sparkles
} from 'lucide-react';
import { JournalMessage, JournalMode } from '../types';
import { JOURNAL_MODES } from '../lib/modes';
import { formatMessageTime } from '../utils/date';

interface MessageItemProps {
  message: JournalMessage;
  onRegenerate?: (messageId: string) => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onSwitchVersion?: (messageId: string, versionIndex: number) => void;
  isGenerating?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onEditAndResend,
  onSwitchVersion,
  isGenerating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const modeConfig = message.mode ? JOURNAL_MODES[message.mode] : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleSaveEdit = () => {
    if (editDraft.trim() && onEditAndResend) {
      onEditAndResend(message.id, editDraft.trim());
      setIsEditing(false);
    }
  };

  // Render User Message
  if (isUser) {
    return (
      <div className="flex justify-end group my-4">
        <div className="max-w-[85%] sm:max-w-[70%] bg-slate-800 text-white p-5 rounded-2xl rounded-tr-none shadow-xl transition-all relative">
          {isEditing ? (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Editing Entry</p>
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={4}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editDraft.trim() || isGenerating}
                  className="px-3.5 py-1 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                {message.content}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditDraft(message.content);
                      setIsEditing(true);
                    }}
                    disabled={isGenerating}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-0"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  {message.edited && (
                    <span className="text-[10px] text-slate-500 italic">(edited)</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {formatMessageTime(message.createdAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render Assistant Message
  const versions = message.versions || [];
  const currentVersionIdx = message.activeVersionIndex ?? (versions.length > 0 ? versions.length - 1 : 0);
  const isInterrupted = message.status === 'interrupted';
  const isError = message.status === 'error';

  return (
    <div className="flex justify-start gap-3.5 my-5">
      {/* Emblem */}
      <div className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-lg flex items-center justify-center border border-white/60 shrink-0 shadow-xs mt-1">
        <div className="w-3 h-3 bg-slate-800 rounded-xs" />
      </div>

      <div className="max-w-[88%] sm:max-w-[78%] bg-white/70 backdrop-blur-md border border-white/80 p-6 rounded-3xl rounded-tl-none shadow-sm relative transition-all">
        {/* Mode Tag if distinct */}
        {modeConfig && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>{modeConfig.emoji}</span>
            <span>{modeConfig.name} Reflection</span>
          </div>
        )}

        {/* Status Indicators */}
        {isInterrupted && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-amber-800 text-[11px] font-medium w-fit">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Generation stopped by user</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-red-50 border border-red-200/60 rounded-lg text-red-800 text-[11px] font-medium w-fit">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Reflection generation failed</span>
          </div>
        )}

        {/* Markdown Rendered Content */}
        <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed space-y-3 font-normal">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: ({ children }) => (
                <blockquote className="font-serif italic text-base sm:text-lg text-slate-700 border-l-2 border-slate-400 pl-4 my-3 bg-white/40 py-1.5 rounded-r-lg">
                  {children}
                </blockquote>
              ),
              h1: ({ children }) => (
                <h1 className="text-base font-bold text-slate-900 tracking-tight mt-4 mb-2 pb-1 border-b border-slate-200/60">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-bold text-slate-900 tracking-tight mt-3 mb-1.5">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-3 mb-1">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-4 space-y-1 my-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-4 space-y-1 my-2">
                  {children}
                </ol>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {children}
                  </code>
                ) : (
                  <pre className="font-mono text-xs p-3 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto my-2">
                    <code>{children}</code>
                  </pre>
                );
              },
              p: ({ children }) => (
                <p className="text-sm text-slate-700 leading-relaxed my-1.5">
                  {children}
                </p>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Assistant Action Bar */}
        <div className="mt-5 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {onRegenerate && (
              <button
                id={`btn-regenerate-${message.id}`}
                onClick={() => onRegenerate(message.id)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            )}

            <button
              id={`btn-copy-${message.id}`}
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Version Switcher if multiple versions exist */}
            {versions.length > 1 && onSwitchVersion && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                <button
                  disabled={currentVersionIdx === 0 || isGenerating}
                  onClick={() => onSwitchVersion(message.id, currentVersionIdx - 1)}
                  className="hover:text-slate-900 disabled:opacity-30 cursor-pointer p-0.5"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{currentVersionIdx + 1} of {versions.length}</span>
                <button
                  disabled={currentVersionIdx === versions.length - 1 || isGenerating}
                  onClick={() => onSwitchVersion(message.id, currentVersionIdx + 1)}
                  className="hover:text-slate-900 disabled:opacity-30 cursor-pointer p-0.5"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400 font-mono">
              MindSpace • {formatMessageTime(message.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
