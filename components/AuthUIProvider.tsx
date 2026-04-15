"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthUIContextValue = {
  user: User | null;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  openLogin: () => void;
  closeLogin: () => void;
};

const AuthUIContext = createContext<AuthUIContextValue | null>(null);

export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setLoginOpen(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthUIContextValue>(
    () => ({
      user,
      loginOpen,
      setLoginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
    }),
    [user, loginOpen],
  );

  return <AuthUIContext.Provider value={value}>{children}</AuthUIContext.Provider>;
}

export function useAuthUI() {
  const ctx = useContext(AuthUIContext);
  if (!ctx) throw new Error("useAuthUI must be used within AuthUIProvider");
  return ctx;
}

