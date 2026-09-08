import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "পাসওয়ার্ড রিসেট | সহজ হিসাব ঘর" },
      { name: "description", content: "সহজ হিসাব ঘর অ্যাকাউন্টের পাসওয়ার্ড রিসেট করুন।" },
      { property: "og:title", content: "পাসওয়ার্ড রিসেট | সহজ হিসাব ঘর" },
      { property: "og:description", content: "সহজ হিসাব ঘর অ্যাকাউন্টের পাসওয়ার্ড রিসেট করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type !== "recovery" || !accessToken) {
      setError("এই লিংকটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।");
      setReady(false);
      return;
    }

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      })
      .then(({ error }) => {
        if (error) {
          setError("সেশন সেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        } else {
          setReady(true);
        }
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("দুটি পাসওয়ার্ড মিলছে না");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message || "পাসওয়ার্ড আপডেট করা যায়নি");
      return;
    }

    toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
    router.history.replace("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
        <h1 className="text-center text-2xl font-bold text-emerald-600">সহজ হিসাব ঘর</h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          নতুন পাসওয়ার্ড সেট করুন
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="নতুন পাসওয়ার্ড"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "অপেক্ষা করুন..." : "পাসওয়ার্ড আপডেট করুন"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
