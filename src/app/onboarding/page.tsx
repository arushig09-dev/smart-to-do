"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClaroMark from "@/components/ClaroMark";
import { CLARO_BRAND } from "@/lib/themes";

// ─── Work personas ────────────────────────────────────────────────────────────
const WORK_PERSONAS = [
  {
    id: "maker",
    emoji: "🔨",
    title: "Maker",
    subtitle: "IC — Eng / Design / Data",
    vignette: "My best days are deep and focused. I track what I'm building, reviews I owe, and skills I'm picking up.",
  },
  {
    id: "strategist",
    emoji: "🗺️",
    title: "Strategist",
    subtitle: "PM / TPM / Ops",
    vignette: "My day is docs, decisions, and keeping people unblocked. I live in roadmaps, specs, and stakeholder comms.",
  },
  {
    id: "coach",
    emoji: "🧭",
    title: "Coach",
    subtitle: "Manager / Team Lead",
    vignette: "I measure success by my team's output. 1:1s, hiring, performance, and unblocking are my whole job.",
  },
  {
    id: "pioneer",
    emoji: "🚀",
    title: "Pioneer",
    subtitle: "Founder / Operator",
    vignette: "I wear every hat — product, sales, hiring, fundraising. It all lives in my head and I need it structured.",
  },
  {
    id: "explorer",
    emoji: "🌱",
    title: "Explorer",
    subtitle: "Student / Early Career",
    vignette: "Coursework, internships, job apps, and figuring it all out at once. Every deadline counts.",
  },
  {
    id: "default",
    emoji: "✏️",
    title: "Start fresh",
    subtitle: "Build your own",
    vignette: "I'll set up my own structure. Just give me the basics.",
  },
];

// ─── Personal tracks ──────────────────────────────────────────────────────────
const PERSONAL_TRACKS = [
  { id: "logistics", emoji: "🛒", label: "Day-to-day Logistics",  desc: "Groceries, errands, home tasks" },
  { id: "family",    emoji: "👨‍👩‍👧", label: "Family & Kids",        desc: "Parenting, appointments, family events" },
  { id: "health",    emoji: "💪", label: "Health & Wellness",      desc: "Fitness, nutrition, self-care" },
  { id: "finance",   emoji: "💰", label: "Finance",                desc: "Bills, taxes, big purchases" },
  { id: "learning",  emoji: "🎓", label: "Learning & Hobbies",     desc: "Courses, reading, personal goals" },
  { id: "social",    emoji: "🎉", label: "Social & Events",        desc: "Plans, birthdays, RSVPs" },
  { id: "travel",    emoji: "✈️", label: "Travel & Adventure",     desc: "Trips, packing, bucket list" },
];

export default function OnboardingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"work" | "personal">("work");
  const [workPersona, setWorkPersona] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(
    new Set(PERSONAL_TRACKS.map((t) => t.id)) // all selected by default
  );
  const [customTrack, setCustomTrack] = useState("");
  const [customTracks, setCustomTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: CLARO_BRAND.gradientTo, borderTopColor: "transparent" }} />
      </div>
    );
  }

  function toggleTrack(id: string) {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addCustomTrack() {
    const name = customTrack.trim();
    if (!name || customTracks.includes(name)) return;
    setCustomTracks((prev) => [...prev, name]);
    setCustomTrack("");
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workPersona: workPersona ?? "default",
          personalTracks: Array.from(selectedTracks),
          customTracks,
        }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        console.error("Onboarding API error", await res.text());
        router.push("/"); // fail-safe: still let them in
      }
    } catch {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <ClaroMark size={28} />
        <span className="font-bold text-zinc-900 dark:text-zinc-50 text-lg tracking-tight">Claro</span>
        <span className="ml-auto text-sm text-zinc-400">
          {step === "work" ? "Step 1 of 2" : "Step 2 of 2"}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-1 transition-all duration-500"
          style={{
            width: step === "work" ? "50%" : "100%",
            background: CLARO_BRAND.accentGradient,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 max-w-3xl mx-auto w-full">

        {/* ── Step 1: Work persona ─────────────────────────────────────────── */}
        {step === "work" && (
          <>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-1">
              How do you work?
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-8">
              We'll set up your Work projects to match your role.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              {WORK_PERSONAS.map((p) => {
                const selected = workPersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setWorkPersona(p.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span>
                      {selected && (
                        <span className="ml-auto text-indigo-500 text-lg">✓</span>
                      )}
                    </div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{p.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.subtitle}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1 italic">
                      "{p.vignette}"
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep("personal")}
              disabled={!workPersona}
              className="mt-8 px-8 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all"
              style={{ background: CLARO_BRAND.accentGradient }}
            >
              Next: Personal life →
            </button>
          </>
        )}

        {/* ── Step 2: Personal tracks ──────────────────────────────────────── */}
        {step === "personal" && (
          <>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-1">
              What's your life outside work?
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-2">
              Select all your life tracks — Claro builds a project for each one.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mb-8">
              All selected by default. Uncheck anything you don't need.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {PERSONAL_TRACKS.map((t) => {
                const selected = selectedTracks.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTrack(t.id)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 opacity-60"
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{t.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{t.desc}</p>
                    </div>
                    <span className={`text-lg flex-shrink-0 ${selected ? "text-indigo-500" : "text-zinc-300"}`}>
                      {selected ? "✓" : "○"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom track input */}
            <div className="w-full mt-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Add your own (optional)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTrack}
                  onChange={(e) => setCustomTrack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTrack()}
                  placeholder="e.g. Side Project, Dog, Volunteering…"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={addCustomTrack}
                  disabled={!customTrack.trim()}
                  className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-40 transition"
                  style={{ background: CLARO_BRAND.accentGradient }}
                >
                  Add
                </button>
              </div>
              {customTracks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {customTracks.map((name) => (
                    <span key={name}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                      📁 {name}
                      <button onClick={() => setCustomTracks((prev) => prev.filter((n) => n !== name))}
                        className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full mt-8 flex gap-3">
              <button
                onClick={() => setStep("work")}
                className="px-5 py-3 rounded-xl font-semibold text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading || selectedTracks.size === 0}
                className="flex-1 px-8 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{ background: CLARO_BRAND.accentGradient }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Set up my workspace →"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
