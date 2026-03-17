"use client";

import {
  getRedirectResult,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {
      // User may have cancelled or error; onAuthStateChanged still runs
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        await signInWithRedirect(auth, googleProvider);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
