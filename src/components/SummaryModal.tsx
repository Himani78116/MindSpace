import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCw, 
  Save, 
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { JournalMessage, JournalMode, JournalSession } from '../types';
import { getAuthToken } from '../lib/firebase';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: JournalSession | null;
  messages: JournalMessage[];
  userId: string | null;
  onSaveSummary: (summary: string) => Promise<void>;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  session,
  messages,
  userId,
  onSaveSummary
}) => {
  const [summary, setSummary] = useState<string>(session?.summary || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    if (!userId || !session || messages.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setSaved(false);

    try {
      const idToken = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || userId || 'mindspace_user'}`
      };
      if (userId) headers['x-guest-uid'] = userId;

      const res = await fetch('/api/journal/summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: session.title,
          mode: session.mode,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate summary');
      }

      const data = await res.json();
      setSummary(data.summary);
      await onSaveSummary(data.summary);
      setSaved(true);
    } catch (err: any) {
      console.error('Summary error:', err);
      setError(err.message || 'Could not generate reflection summary.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-2xl p-6 lg:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 tracking-tight">Journal Synthesis</h3>
              <p className="text-xs text-slate-500">Distilled takeaways & realizations from "{session?.title}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {isGenerating ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-sm text-slate-800">Synthesizing your journal reflections...</p>
              <p className="text-xs text-slate-500">Extracting core themes, breakthroughs, and open questions.</p>
            </div>
          ) : summary ? (
            <div className="prose prose-slate prose-sm max-w-none text-slate-700 bg-white/60 p-6 rounded-2xl border border-white/80 shadow-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <p className="font-semibold text-sm text-slate-800">No summary generated yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {messages.length === 0 
                    ? 'Write some reflections in this journal first to generate an insightful summary.'
                    : 'MindSpace can analyze all turns in this reflection to distill your key breakthroughs and open seeds.'
                  }
                </p>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={handleGenerateSummary}
                  className="px-5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Generate Synthesis</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {summary && !isGenerating && (
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateSummary}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved to journal
                </span>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
