"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setError("Firebase Authentication did not respond. Check .env.local and Email/Password Auth in Firebase.");
      setLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        window.clearTimeout(timeout);
        setUser(nextUser);
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        window.clearTimeout(timeout);
        setUser(null);
        setError(nextError.message);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, error }), [error, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
