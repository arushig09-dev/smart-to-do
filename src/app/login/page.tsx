"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClaroMark from "@/components/ClaroMark";
import { CLARO_BRAND } from "@/lib/themes";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS:   "An account with this email already exists. Sign in instead.",
  NO_USER:        "No account found with this email. Sign up instead.",
  BAD_PASSWORD:   "Incorrect password. Please try again.",
  GOOGLE_ACCOUNT: "This email is linked to Google sign-in. Use the Google button below.",
  OAuthAccountNotLinked: "This email is already registered. Sign in with the original method.",
  default:        "Something went wrong. Please try again.",
};

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [mode, setMode]           = useState<"signin" | "signup">("signin");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [googleAvail, setGoogleAvail] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p) => setGoogleAvail(!!p?.google))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email, password, name, action: mode, redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push("/");
    } else {
      const code = result?.error ?? "default";
      setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default);
      if (code === "EMAIL_EXISTS") setMode("signin");
      if (code === "NO_USER") setMode("signup");
    }
  };

  const handleGoogle = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel: brand ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: CLARO_BRAND.panelGradient }}
      >
        {/* Background mesh blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }} />
          <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #c4b5fd 0%, transparent 70%)" }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <ClaroMark size={40} />
          <span className="text-white text-2xl font-bold tracking-tight">Claro</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h1 className="text-white font-extrabold leading-none tracking-tight"
            style={{ fontSize: "clamp(42px, 5vw, 64px)" }}>
            Clear your mind.<br />
            <span style={{ color: "#a5b4fc" }}>Do what counts.</span>
          </h1>
          <p className="mt-6 text-indigo-300 text-base leading-relaxed max-w-xs">
            AI-powered task prioritisation that surfaces your most important work — and quietly handles the rest.
          </p>
        </div>

        {/* Bottom pill badges */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {["Smart priorities", "Habit tracking", "Project structure", "Works like magic"].map((tag) => (
            <span key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium text-indigo-200 border border-indigo-500/40 bg-indigo-900/30">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <ClaroMark size={32} />
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Claro</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {mode === "signin" ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
              {mode === "signin"
                ? "Sign in to your Claro workspace."
                : "Create your account. Free, always."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arushi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: CLARO_BRAND.accentGradient }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Google divider */}
          {googleAvail && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-xs text-zinc-400">or</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Mode toggle */}
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "signin" ? (
              <>
                New to Claro?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(""); }}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
