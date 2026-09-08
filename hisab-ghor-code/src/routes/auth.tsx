import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";
import logo from "@/assets/hisab-logo.png";
import { clearActiveShop } from "@/lib/shop";
import { base44 } from "@/api/base44Client";
import { endOfLocalDayAfterIso } from "@/lib/accountDates";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "লগইন | সহজ হিসাব ঘর" },
      { name: "description", content: "সহজ হিসাব ঘর অ্যাকাউন্টে লগইন করুন বা নতুন অ্যাকাউন্ট খুলুন।" },
      { property: "og:title", content: "লগইন | সহজ হিসাব ঘর" },
      {
        property: "og:description",
        content: "সহজ হিসাব ঘর অ্যাকাউন্টে লগইন করুন বা নতুন অ্যাকাউন্ট খুলুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!active || !userId) return;
      const { data: shops, error } = await supabase
        .from("shops")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if (!active) return;
      router.history.replace(!error && (shops?.length ?? 0) === 0 ? "/CreateShop" : "/SelectShop");
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          try {
            await base44.auth.updateMe({
              account_status: "trial",
              trial_end_date: endOfLocalDayAfterIso(7),
            });
          } catch {
            /* ignore */
          }
          clearActiveShop();
          toast.success("অ্যাকাউন্ট তৈরি হয়েছে");
          router.history.replace("/CreateShop");
        } else {
          toast.success("ইমেইল চেক করে অ্যাকাউন্ট নিশ্চিত করুন");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success("পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        clearActiveShop();
        router.history.replace("/SelectShop");
      }
    } catch (error) {
      toast.error((error as Error).message || "কিছু একটা সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    // Clear the previously selected shop before leaving for OAuth. A full-page
    // OAuth redirect does not return to this function, so doing this afterward
    // can leave another account's shop selected and send a new user to home.
    clearActiveShop();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      toast.error("গুগল দিয়ে লগইন করা যায়নি");
      return;
    }
    if (result.redirected) return;
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return;
    const { data: shops, error } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    router.history.replace(!error && (shops?.length ?? 0) === 0 ? "/CreateShop" : "/SelectShop");
  };

  const toggleMode = () => {
    setMode((prev) => {
      if (prev === "login") return "signup";
      return "login";
    });
    setForgotSent(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <img
            src={logo}
            alt="হিসাবঘর লোগো"
            width={512}
            height={512}
            className="h-20 w-20 rounded-full object-contain"
          />
          <h1 className="mt-4 text-center text-xl font-bold text-slate-900 dark:text-white">
            Welcome to হিসাবঘর
            <span className="block text-emerald-600">(HisabGhor)</span>
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === "login" && "Sign in to continue"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <button
            onClick={handleGoogle}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.1 14.7 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.7H12z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-400">OR</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Full name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="পুরো নাম"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {loading
                ? "অপেক্ষা করুন..."
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Sign up"
                    : "Send reset link"}
            </button>
          </form>

          {mode === "login" && (
            <button
              onClick={() => setMode("forgot")}
              className="mt-4 w-full text-center text-sm text-slate-500 hover:text-emerald-600 dark:text-slate-400"
            >
              Forgot password?
            </button>
          )}

          {mode === "forgot" && forgotSent && (
            <p className="mt-3 text-center text-sm text-emerald-600">
              ইমেইল চেক করুন। রিসেট লিংক পাঠানো হয়েছে।
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <button onClick={toggleMode} className="font-semibold text-emerald-600">
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

