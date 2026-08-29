import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signInAsGuest, signOutUser } from '../lib/firebase';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: User | null) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || (fbUser.isAnonymous ? 'Mindful Guest' : 'MindSpace Journaler'),
          photoURL: fbUser.photoURL,
          isAnonymous: fbUser.isAnonymous,
        });
      } else {
        // Check if guest UID was previously created
        const savedGuestUid = localStorage.getItem('mindspace_guest_uid');
        if (savedGuestUid) {
          setUser({
            uid: savedGuestUid,
            displayName: 'Mindful Guest',
            isAnonymous: true,
          });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Auth state error:', error);
      setAuthError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setAuthError(err?.message || 'Failed to sign in with Google');
      throw err;
    }
  };

  const handleGuestSignIn = async () => {
    setAuthError(null);
    try {
      await signInAsGuest();
    } catch (err: any) {
      console.warn('Firebase Anonymous auth not enabled in Console or restricted. Switching to Local Secure Guest Mode:', err?.message || err);
      // Fallback: If Anonymous Authentication is restricted or disabled in Firebase project, generate client-side guest profile
      const localGuestId = `guest_${Math.random().toString(36).substring(2, 11)}`;
      const guestProfile: UserProfile = {
        uid: localGuestId,
        displayName: 'Mindful Guest',
        isAnonymous: true
      };
      setUser(guestProfile);
      localStorage.setItem('mindspace_guest_uid', localGuestId);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    localStorage.removeItem('mindspace_guest_uid');
    try {
      await signOutUser();
      setUser(null);
    } catch (err: any) {
      console.error('Sign Out failed:', err);
      setUser(null);
      setAuthError(err?.message || 'Failed to sign out');
    }
  };

  return {
    user,
    loading,
    authError,
    signInWithGoogle: handleGoogleSignIn,
    signInAsGuest: handleGuestSignIn,
    signOut: handleSignOut,
  };
}
