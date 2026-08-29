import React from 'react';
import { X, Check, Compass } from 'lucide-react';
import { JournalMode } from '../types';
import { JOURNAL_MODES } from '../lib/modes';

interface ModeSelectorModalProps {
  isOpen: boolean;
  currentMode: JournalMode;
  onSelectMode: (mode: JournalMode) => void;
  onClose: () => void;
}

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  currentMode,
  onSelectMode,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-2xl p-6 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 tracking-tight">Choose Reflection Mode</h3>
              <p className="text-xs text-slate-500">Each mode tunes Gemini’s guidance and cognitive lens.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {Object.values(JOURNAL_MODES).map((mode) => {
            const isSelected = mode.id === currentMode;

            return (
              <div
                key={mode.id}
                id={`mode-card-${mode.id}`}
                onClick={() => {
                  onSelectMode(mode.id);
                  onClose();
                }}
                className={`
                  relative p-4 rounded-2xl border transition-all cursor-pointer text-left
                  ${isSelected
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-[1.01]'
                    : 'bg-white/70 hover:bg-white border-slate-200/70 hover:border-slate-300 text-slate-800 shadow-xs'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{mode.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm">{mode.name}</h4>
                      <p className={`text-[11px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {mode.tagline}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className={`text-xs leading-relaxed mt-2 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                  {mode.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
          <span>You can switch modes anytime during a reflection session.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
