"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type HabitWithMeta = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  targetDays: number;
  streak: number;
  completedToday: boolean;
  entries: { id: number; date: string }[];
};

// ─── Goal hint library ────────────────────────────────────────────────────────
// Each entry has a label-style NLP prompt shown under the habit name as inspiration.

const HABIT_HINTS: Record<string, string> = {
  "Meditation":  "Do a 10-min mindfulness session on Calm every day",
  "Skincare":    "Complete AM & PM skincare routine every day",
  "Stretching":  "5–10 min morning stretch or yoga every day",
  "Hydration":   "Drink 8 glasses of water every day",
  "Steps":       "Hit 7,000+ steps outdoors every day",
  "Reading":     "Read 20 pages of a book every day",
  "Journaling":  "Write 3 things you're grateful for every night",
  "Exercise":    "30-min workout or walk — 5× per week",
  "Sleep":       "In bed by 10:30 PM every night",
  "No phone":    "No screens after 9 PM — every night",
  "Vitamins":    "Take vitamins with breakfast every morning",
  "Cooking":     "Cook one healthy meal at home every day",
  "Language":    "10-min Duolingo practice every day",
  "Gratitude":   "Text one person you appreciate — every day",
  "Cold shower": "Start with 30 seconds cold water every morning",
};

function getHint(name: string): string | null {
  const key = Object.keys(HABIT_HINTS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? HABIT_HINTS[key] : null;
}

// ─── Quick-start defaults ─────────────────────────────────────────────────────

const DEFAULT_HABITS = [
  { name: "Meditation", emoji: "🧘", color: "#059669", hint: HABIT_HINTS["Meditation"] },
  { name: "Skincare",   emoji: "💆", color: "#e879f9", hint: HABIT_HINTS["Skincare"] },
  { name: "Stretching", emoji: "🤸", color: "#f97316", hint: HABIT_HINTS["Stretching"] },
  { name: "Hydration",  emoji: "💧", color: "#38bdf8", hint: HABIT_HINTS["Hydration"] },
  { name: "Steps",      emoji: "👟", color: "#84cc16", hint: HABIT_HINTS["Steps"] },
  { name: "Reading",    emoji: "📚", color: "#a78bfa", hint: HABIT_HINTS["Reading"] },
  { name: "Journaling", emoji: "✍️", color: "#fb923c", hint: HABIT_HINTS["Journaling"] },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isSameDay(a: string, b: string) {
  return new Date(a).setHours(0, 0, 0, 0) === new Date(b).setHours(0, 0, 0, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HabitTracker() {
  const { theme } = useTheme();
  const [habits, setHabits] = useState<HabitWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const days = last7Days();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/habits");
    const data = await res.json();
    setHabits(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleLog(habitId: number) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completedToday: !h.completedToday,
              streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1,
            }
          : h
      )
    );
    await fetch(`/api/habits/${habitId}/log`, { method: "POST" });
    load();
  }

  async function addHabit() {
    if (!newName.trim()) return;
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji }),
    });
    setNewName("");
    setNewEmoji("⭐");
    setAdding(false);
    load();
  }

  async function addDefault(h: typeof DEFAULT_HABITS[0]) {
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: h.name, emoji: h.emoji, color: h.color }),
    });
    load();
  }

  async function deleteHabit(id: number) {
    if (!confirm("Delete this habit?")) return;
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    load();
  }

  const totalToday = habits.filter((h) => h.completedToday).length;
  const pct = habits.length > 0 ? Math.round((totalToday / habits.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-5 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span>🔥</span>
            <span>Your Habit Tracker</span>
          </h1>
          {habits.length > 0 && (
            <span className="text-sm text-zinc-400">
              {totalToday}/{habits.length} today
            </span>
          )}
        </div>
        {habits.length > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${theme.brand}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">{pct}% complete for today</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
        {loading ? (
          <p className="p-8 text-center text-zinc-400 text-sm">Loading habits…</p>
        ) : (
          <>
            {/* ── Week-grid column headers ── */}
            {habits.length > 0 && (
              <div className="px-6 pt-5 pb-2">
                <div className="flex items-center">
                  <div className="flex-1" />
                  <div className="flex gap-2">
                    {days.map((d) => (
                      <div
                        key={d}
                        className={`w-8 text-center text-[11px] font-medium ${
                          isToday(d) ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-400"
                        }`}
                      >
                        {dayLabel(d)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Habit rows ── */}
            <div className="px-6 space-y-1 pb-4">
              {habits.map((habit) => {
                const hint = getHint(habit.name);
                return (
                  <div
                    key={habit.id}
                    className="group flex items-center gap-3 py-3 border-b border-stone-50 dark:border-zinc-800/50 last:border-0"
                  >
                    {/* Today toggle button */}
                    <button
                      onClick={() => toggleLog(habit.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 text-base ${
                        habit.completedToday
                          ? "border-green-500 bg-green-500 scale-110"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-green-400 hover:scale-105"
                      }`}
                      title={habit.completedToday ? "Mark incomplete" : "Mark complete"}
                    >
                      {habit.completedToday ? (
                        <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-sm">{habit.emoji ?? "⭐"}</span>
                      )}
                    </button>

                    {/* Name + streak + NLP goal hint */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {habit.name}
                        </span>
                        {habit.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            🔥 {habit.streak}d
                          </span>
                        )}
                      </div>
                      {hint && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate" title={hint}>
                          {hint}
                        </p>
                      )}
                    </div>

                    {/* 7-day dot grid */}
                    <div className="flex gap-2 flex-shrink-0">
                      {days.map((d) => {
                        const done = habit.entries.some((e) => isSameDay(e.date, d));
                        const today = isToday(d);
                        return (
                          <div key={d} className="w-8 flex items-center justify-center">
                            <div
                              className={`w-5 h-5 rounded-full transition-all ${
                                done
                                  ? "bg-green-400 dark:bg-green-500"
                                  : today
                                  ? "border-2 border-stone-200 dark:border-zinc-700"
                                  : "bg-stone-100 dark:bg-zinc-800"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-all ml-1 flex-shrink-0"
                      title="Delete habit"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Add habit ── */}
            <div className="px-6 pb-6">
              {adding ? (
                <div className="flex gap-2 items-center mt-2">
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-12 text-center text-lg border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 py-1.5"
                    maxLength={2}
                  />
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addHabit();
                      if (e.key === "Escape") setAdding(false);
                    }}
                    placeholder="e.g. Meditation, Exercise, Sleep…"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={addHabit}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${theme.button}`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    className="text-sm text-zinc-400 hover:text-zinc-600 px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition mt-2"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add habit
                </button>
              )}

              {/* ── Quick-start chips with goal hints ── */}
              {habits.length === 0 && !adding && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                    Quick-start with popular habits
                  </p>
                  <div className="flex flex-col gap-2">
                    {DEFAULT_HABITS.map((h) => (
                      <button
                        key={h.name}
                        onClick={() => addDefault(h)}
                        className="flex items-start gap-3 px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition text-left group"
                      >
                        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{h.emoji}</span>
                        <div>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition">
                            {h.name}
                          </span>
                          {h.hint && (
                            <p className="text-[11px] text-zinc-400 mt-0.5">{h.hint}</p>
                          )}
                        </div>
                        <span className="ml-auto text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 transition text-xs mt-0.5 flex-shrink-0">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
