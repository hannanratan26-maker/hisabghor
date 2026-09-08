import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "hisabghor_email_confirmed_at";
const CHALLENGE_KEY = "hisabghor_email_confirmation_challenge";

/**
 * Sends a confirmation link to the given email using the built-in
 * authentication email system. Clicking the link confirms the action.
 */
export async function requestEmailConfirmation(email) {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error("Authentication required");

  // A newly requested link replaces every previous confirmation link for
  // this user, so an older email can no longer complete the verification.
  const { error: deleteError } = await supabase
    .from("email_confirmation_challenges")
    .delete()
    .eq("user_id", authData.user.id);
  if (deleteError) throw deleteError;

  const { data: challenge, error: challengeError } = await supabase
    .from("email_confirmation_challenges")
    .insert({ user_id: authData.user.id })
    .select("id")
    .single();
  if (challengeError) throw challengeError;

  try {
    localStorage.setItem(CHALLENGE_KEY, challenge.id);
  } catch {
    /* ignore */
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/confirm-email?challenge=${encodeURIComponent(challenge.id)}`,
    },
  });
  if (error) throw error;
  return Date.now();
}

/** Called on app load: records that the confirmation link was clicked. */
export async function captureEmailConfirmationFromUrl() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get("email_confirmed") !== "1") return false;
  const challengeId = url.searchParams.get("challenge");
  if (challengeId) {
    const { error } = await supabase
      .from("email_confirmation_challenges")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", challengeId);
    if (error) return false;
  }
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  url.searchParams.delete("email_confirmed");
  url.searchParams.delete("challenge");
  window.history.replaceState({}, "", url.pathname + url.search);
  return true;
}

/** True once the user clicked the confirmation link (after `sentAt`). */
export function useEmailConfirmed(active, sentAt) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!active) {
      setConfirmed(false);
      return;
    }
    const check = async () => {
      let v = 0;
      let challengeId = "";
      try {
        v = Number(localStorage.getItem(KEY) || 0);
        challengeId = localStorage.getItem(CHALLENGE_KEY) || "";
      } catch {
        /* ignore */
      }
      if (v && (!sentAt || v >= sentAt - 2000)) {
        setConfirmed(true);
        return;
      }
      if (!challengeId) return;
      const { data } = await supabase
        .from("email_confirmation_challenges")
        .select("confirmed_at, expires_at")
        .eq("id", challengeId)
        .maybeSingle();
      if (data?.confirmed_at && new Date(data.expires_at).getTime() > Date.now()) {
        setConfirmed(true);
      }
    };
    check();
    const id = setInterval(check, 1500);
    window.addEventListener("storage", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [active, sentAt]);

  return confirmed;
}

export function clearEmailConfirmation() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(CHALLENGE_KEY);
  } catch {
    /* ignore */
  }
}
