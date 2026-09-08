import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHALLENGE_KEY = "hisabghor_email_confirmation_challenge";
const KEY = "hisabghor_email_confirmed_at";
const AUTH_USER_CACHE_KEY = "hisab-ghor:auth-user";

function hadExistingLoginBeforeConfirmation() {
  try {
    return Boolean(window.sessionStorage.getItem(AUTH_USER_CACHE_KEY));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/confirm-email")({
  head: () => ({
    meta: [
      { title: "ইমেইল নিশ্চিতকরণ | সহজ হিসাব ঘর" },
      { name: "description", content: "সহজ হিসাব ঘর অ্যাকাউন্টের ইমেইল নিশ্চিত করুন।" },
      { property: "og:title", content: "ইমেইল নিশ্চিতকরণ | সহজ হিসাব ঘর" },
      { property: "og:description", content: "সহজ হিসাব ঘর অ্যাকাউন্টের ইমেইল নিশ্চিত করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  // Read this during the first render, before AuthContext can cache the session
  // that the confirmation link itself may have just created.
  const [hadExistingLogin] = useState(hadExistingLoginBeforeConfirmation);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const url = new URL(window.location.href);
      const challengeId = url.searchParams.get("challenge") || "";

      let localChallenge = "";
      try {
        localChallenge = localStorage.getItem(CHALLENGE_KEY) || "";
      } catch {
        /* ignore */
      }

      if (!challengeId) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { data: confirmedChallenge, error } = await supabase
        .from("email_confirmation_challenges")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("id", challengeId)
        .is("confirmed_at", null)
        .select("id")
        .maybeSingle();

      if (error || !confirmedChallenge) {
        if (!cancelled) setStatus("error");
        return;
      }

      const sameBrowser = localChallenge === challengeId;
      if (sameBrowser || hadExistingLogin) {
        try {
          localStorage.setItem(KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      } else {
        // No session existed before opening the link, so remove only the
        // temporary session created by the confirmation link.
        await supabase.auth.signOut({ scope: "local" });
      }

      if (!cancelled) setStatus("done");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hadExistingLogin]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-slate-800">
        <h1 className="text-xl font-bold text-emerald-600">সহজ হিসাব ঘর</h1>
        {status === "working" && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">নিশ্চিত করা হচ্ছে...</p>
        )}
        {status === "done" && (
          <>
            <p className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">
              ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              এখন অ্যাপে ফিরে গিয়ে কাজটি সম্পন্ন করুন।
            </p>
          </>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">
            এই লিংকটির মেয়াদ শেষ হয়ে গেছে। নতুন লিংক দিয়ে ভেরিফিকেশন সম্পূর্ণ করুন।
          </p>
        )}
      </div>
    </div>
  );
}
