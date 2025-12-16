"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/types";

type AuthState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function fetchMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    loading: true,
    userId: null,
    email: null,
    profile: null,
  });

  const refresh = React.useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setState({ loading: false, userId: null, email: null, profile: null });
      return;
    }
    const profile = await fetchMyProfile();
    // If disabled, sign out immediately.
    if (profile?.is_disabled) {
      await supabase.auth.signOut();
      setState({ loading: false, userId: null, email: null, profile: null });
      return;
    }
    setState({ loading: false, userId: session.user.id, email: session.user.email ?? null, profile });
  }, []);

  React.useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refresh(); });
    return () => { sub.subscription.unsubscribe(); };
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    await refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
