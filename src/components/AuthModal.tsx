import React, { useState } from 'react';
import { Lock, Shield, Sparkles, UserCheck, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  onGoogleSignIn: () => Promise<void>;
  onGuestSignIn: () => Promise<void>;
  authError: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
  authError
}) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      await onGoogleSignIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuest = async () => {
    setLoadingGuest(true);
    try {
      await onGuestSignIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 frosted-bg">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white p-8 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden">
        {/* Diamond Emblem */}
        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-300/50">
          <div className="w-6 h-6 bg-white rounded-xs rotate-45" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
          Welcome to MindSpace
        </h2>
        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
          Your private sanctuary for mindful reflection, cognitive clarity, and deep dialogue.
        </p>

        {authError && (
          <div className="p-3 mb-6 bg-red-50/90 border border-red-200 rounded-xl text-xs text-red-700 text-left">
            {authError}
          </div>
        )}

        <div className="space-y-3">
          {/* Google Sign In */}
          <button
            id="btn-signin-google"
            onClick={handleGoogle}
            disabled={loadingGoogle || loadingGuest}
            className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loadingGoogle ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Guest Reflection Mode */}
          <button
            id="btn-signin-guest"
            onClick={handleGuest}
            disabled={loadingGoogle || loadingGuest}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{loadingGuest ? 'Preparing Sandbox...' : 'Try Guest Reflection'}</span>
          </button>
        </div>

        {/* Security / Privacy Trust Guarantee */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Encrypted owner-bound Firestore isolation</span>
        </div>
      </div>
    </div>
  );
};
