"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { suggestHabitLink, resolveLink, buildLinkOptions, type ResolvedLink } from "@/lib/habitLinks";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProject = { id: number; name: string; sections: { id: number; name: string }[] };

type HabitWithMeta = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  targetDays: number;
  goal: string | null;
  daysOfWeek: string | null;
  linkedProjectId: number | null;
  linkedSectionId: number | null;
  streak: number;
  completedToday: boolean;
  entries: { id: number; date: string }[];
};

type PendingHabit = {
  name: string;
  emoji: string;
  color: string;
  goal: string;
  targetDays: number;
  daysOfWeek: string;
  customDays: boolean;
  linkedProjectId: number | null;
  linkedSectionId: number | null;
  linkedLabel: string | null;
};

// ─── Habit goal library ───────────────────────────────────────────────────────

const HABIT_GOALS: Record<string, string> = {
  "Meditation":  "Do a 10-min mindfulness session every day",
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
  "Gratitude":   "Text one person you appreciate every day",
  "Cold shower": "Start with 30 seconds cold water every morning",
};

function getGoal(name: string): string {
  const key = Object.keys(HABIT_GOALS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? HABIT_GOALS[key] : `Track your ${name.toLowerCase()} habit`;
}

// ─── Quick-start defaults ─────────────────────────────────────────────────────

const DEFAULT_HABITS = [
  { name: "Meditation", emoji: "🧘", color: "#059669" },
  { name: "Skincare",   emoji: "💆", color: "#e879f9" },
  { name: "Stretching", emoji: "🤸", color: "#f97316" },
  { name: "Hydration",  emoji: "💧", color: "#38bdf8" },
  { name: "Steps",      emoji: "👟", color: "#84cc16" },
  { name: "Reading",    emoji: "📚", color: "#a78bfa" },
  { name: "Journaling", emoji: "✍️", color: "#fb923c" },
];

// ─── Frequency presets ────────────────────────────────────────────────────────

const FREQ_PRESETS = [
  { label: "Every day",       targetDays: 7, daysOfWeek: "0,1,2,3,4,5,6" },
  { label: "Weekdays",        targetDays: 5, daysOfWeek: "1,2,3,4,5" },
  { label: "3× per week",     targetDays: 3, daysOfWeek: "" },
  { label: "2× per week",     targetDays: 2, daysOfWeek: "" },
  { label: "Once a week",     targetDays: 1, daysOfWeek: "" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT  = ["S",   "M",   "T",   "W",   "T",   "F",   "S"];

// Default frequency based on habit name keywords
function defaultFreq(name: string): { targetDays: number; daysOfWeek: string } {
  const n = name.toLowerCase();
  if (n.includes("exercise") || n.includes("workout") || n.includes("gym") || n.includes("steps"))
    return { targetDays: 5, daysOfWeek: "1,2,3,4,5" };
  if (n.includes("weekend"))
    return { targetDays: 2, daysOfWeek: "0,6" };
  return { targetDays: 7, daysOfWeek: "0,1,2,3,4,5,6" };
}

function freqLabel(targetDays: number, daysOfWeek: string): string {
  const days = daysOfWeek ? daysOfWeek.split(",").filter(Boolean) : [];
  if (days.length === 7) return "Every day";
  if (days.length > 0) {
    const names = days.map((d) => DAY_LABELS[parseInt(d)]);
    if (names.length <= 3) return names.join(", ");
    return `${days.length} days / week`;
  }
  if (targetDays === 7) return "Every day";
  if (targetDays === 1) return "Once a week";
  return `${targetDays}× per week`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
// All week-day ISOs are stored as "YYYY-MM-DDT00:00:00.000Z" where the
// date part comes from the user's LOCAL calendar, NOT the UTC equivalent.
// This avoids timezone shift bugs (e.g. Pacific midnight = 07:00 UTC ≠ 00:00 UTC).

function localDateStr(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Represent a local calendar date as the sentinel "YYYY-MM-DDT00:00:00.000Z"
 *  so it matches the format stored by the log endpoint. */
function localMidnightUTC(d: Date): string {
  return `${localDateStr(d)}T00:00:00.000Z`;
}

// Compare date portions only (first 10 chars of ISO string)
function isToday(iso: string)  { return iso.slice(0, 10) === localDateStr(); }
function isFuture(iso: string) { return iso.slice(0, 10) > localDateStr(); }
function isSameDay(a: string, b: string) { return a.slice(0, 10) === b.slice(0, 10); }

function dayOfWeekIndex(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // local day index, no UTC shift
}

// ─── Week helpers (starts Monday) ────────────────────────────────────────────

// Returns Mon–Sun of the current ISO week as "YYYY-MM-DDT00:00:00.000Z" sentinels
function currentWeekDays(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun … 6=Sat
  // Monday of this week
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localMidnightUTC(d); // "YYYY-MM-DDT00:00:00.000Z" using LOCAL date
  });
}

// ─── Pending habit form ────────────────────────────────────────────────────────

function HabitSetupForm({
  initial,
  onConfirm,
  onCancel,
  userProjects,
}: {
  initial: Omit<PendingHabit, "customDays">;
  onConfirm: (h: Omit<PendingHabit, "customDays">) => void;
  onCancel: () => void;
  userProjects: UserProject[];
}) {
  const { theme } = useTheme();
  const [name, setName]       = useState(initial.name);
  const [emoji, setEmoji]     = useState(initial.emoji);
  const [goal, setGoal]       = useState(initial.goal);
  const [targetDays, setTD]   = useState(initial.targetDays);
  const [daysOfWeek, setDOW]  = useState(initial.daysOfWeek);
  const [showDays, setShowDays] = useState(initial.daysOfWeek !== "");
  const [linkedProjectId, setLinkedProjectId] = useState<number | null>(initial.linkedProjectId);
  const [linkedSectionId, setLinkedSectionId] = useState<number | null>(initial.linkedSectionId);
  const [linkedLabel, setLinkedLabel]         = useState<string | null>(initial.linkedLabel);
  const [showLinkPicker, setShowLinkPicker]   = useState(false);

  const linkOptions = buildLinkOptions(userProjects);

  // Auto-update link suggestion when name changes
  function handleNameChange(val: string) {
    setName(val);
    if (!goal || goal === initial.goal) setGoal(getGoal(val));
    if (!linkedSectionId) {
      const suggestion = suggestHabitLink(val);
      if (suggestion) {
        const resolved = resolveLink(suggestion, userProjects);
        if (resolved) {
          setLinkedProjectId(resolved.projectId);
          setLinkedSectionId(resolved.sectionId);
          setLinkedLabel(resolved.label);
        }
      }
    }
  }

  function applyLink(link: ResolvedLink | null) {
    setLinkedProjectId(link?.projectId ?? null);
    setLinkedSectionId(link?.sectionId ?? null);
    setLinkedLabel(link?.label ?? null);
    setShowLinkPicker(false);
  }

  function toggleDay(idx: number) {
    const set = new Set(daysOfWeek.split(",").filter(Boolean).map(Number));
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    const sorted = [...set].sort((a, b) => a - b).join(",");
    setDOW(sorted);
    setTD(set.size);
  }

  function selectPreset(p: typeof FREQ_PRESETS[0]) {
    setTD(p.targetDays);
    setDOW(p.daysOfWeek);
    setShowDays(p.daysOfWeek !== "");
  }

  const activeDays = new Set(daysOfWeek.split(",").filter(Boolean).map(Number));

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm({ name: name.trim(), emoji, color: initial.color, goal, targetDays, daysOfWeek,
                linkedProjectId, linkedSectionId, linkedLabel });
  }

  return (
    <div className={`rounded-2xl border ${theme.borderColor} ${theme.mainBg} p-4 mt-3 flex flex-col gap-4 shadow-sm`}>

      {/* Name + emoji */}
      <div className="flex gap-2 items-center">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-11 text-center text-lg border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 py-1.5"
          maxLength={2}
        />
        <input
          autoFocus
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Habit name…"
          className="flex-1 text-sm font-semibold px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Goal */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          placeholder="e.g. Drink 2l of water every day"
          className="text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-700 dark:text-zinc-300"
        />
      </div>

      {/* Frequency presets */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">How often?</label>
        <div className="flex flex-wrap gap-2">
          {FREQ_PRESETS.map((p) => {
            const active = p.targetDays === targetDays && p.daysOfWeek === daysOfWeek;
            return (
              <button
                key={p.label}
                onClick={() => selectPreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                  active
                    ? `${theme.button} border-transparent`
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowDays((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
              showDays
                ? `${theme.button} border-transparent`
                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Pick days
          </button>
        </div>

        {/* Day-of-week picker */}
        {showDays && (
          <div className="flex gap-1.5 mt-1">
            {DAY_LABELS.map((label, idx) => {
              // Re-order to start from Monday: Mon=1…Sun=0
              const dayIdx = idx === 0 ? 1 : idx === 6 ? 0 : idx + 1;
              const isActive = activeDays.has(dayIdx);
              return (
                <button
                  key={label}
                  onClick={() => toggleDay(dayIdx)}
                  title={DAY_LABELS[dayIdx]}
                  className={`w-9 h-9 rounded-full text-[11px] font-semibold border transition ${
                    isActive
                      ? `${theme.button} border-transparent`
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {DAY_SHORT[dayIdx]}
                </button>
              );
            })}
          </div>
        )}

        {/* Frequency summary */}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          Tracking: <span className="font-medium text-zinc-600 dark:text-zinc-400">
            {freqLabel(targetDays, daysOfWeek)}
          </span>
        </p>
      </div>

      {/* Link to section */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
          Link to section <span className="normal-case font-normal">(optional)</span>
        </label>
        {linkedSectionId ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300
              border border-emerald-200 dark:border-emerald-700">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {linkedLabel}
            </span>
            <button
              onClick={() => setShowLinkPicker((v) => !v)}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition"
            >
              Change
            </button>
            <button
              onClick={() => applyLink(null)}
              className="text-[11px] text-zinc-300 hover:text-red-400 transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLinkPicker((v) => !v)}
            className="self-start flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Link to a project section
          </button>
        )}

        {showLinkPicker && (
          <div className={`mt-1 rounded-xl border ${theme.borderColor} bg-white dark:bg-zinc-900 shadow-sm overflow-hidden`}>
            <button
              onClick={() => applyLink(null)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition border-b border-zinc-100 dark:border-zinc-800"
            >
              None
            </button>
            {linkOptions.map((opt) => (
              <button
                key={opt.sectionId}
                onClick={() => applyLink(opt)}
                className={`w-full text-left px-3 py-2 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  linkedSectionId === opt.sectionId
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={handleConfirm}
          disabled={!name.trim()}
          className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.button} disabled:opacity-50`}
        >
          Add habit
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function HabitTracker() {
  const { theme } = useTheme();
  const [habits, setHabits] = useState<HabitWithMeta[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingHabit, setPendingHabit] = useState<Omit<PendingHabit, "customDays"> | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const days = currentWeekDays(); // Mon–Sun of this week

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [habitsRes, projectsRes] = await Promise.all([
        fetch(`/api/habits?localDate=${localDateStr()}`),
        fetch("/api/projects"),
      ]);
      if (!habitsRes.ok) throw new Error("Failed");
      const [habitsData, projectsData] = await Promise.all([
        habitsRes.json(),
        projectsRes.ok ? projectsRes.json() : [],
      ]);
      setHabits(Array.isArray(habitsData) ? habitsData : []);
      setUserProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch {
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleLog(habitId: number) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, completedToday: !h.completedToday, streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1 }
          : h
      )
    );
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localDate: localDateStr() }),
    });
    load(true);
  }

  async function confirmAdd(h: Omit<PendingHabit, "customDays">) {
    setAddError(null);
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: h.name,
        emoji: h.emoji,
        color: h.color,
        goal: h.goal,
        targetDays: h.targetDays,
        daysOfWeek: h.daysOfWeek || null,
        linkedProjectId: h.linkedProjectId || null,
        linkedSectionId: h.linkedSectionId || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body?.error ?? "Failed to add habit. Please try again.");
      return;
    }
    setPendingHabit(null);
    load();
  }

  async function deleteHabit(id: number) {
    if (!confirm("Delete this habit?")) return;
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    load();
  }

  function startAddCustom() {
    setPendingHabit({
      name: "", emoji: "⭐", color: "#6366f1",
      goal: "",
      linkedProjectId: null, linkedSectionId: null, linkedLabel: null,
      ...defaultFreq(""),
    });
  }

  function startAddSuggested(h: typeof DEFAULT_HABITS[0]) {
    const freq = defaultFreq(h.name);
    const suggestion = suggestHabitLink(h.name);
    const resolved = suggestion ? resolveLink(suggestion, userProjects) : null;
    setPendingHabit({
      name: h.name, emoji: h.emoji, color: h.color,
      goal: getGoal(h.name),
      linkedProjectId: resolved?.projectId ?? null,
      linkedSectionId: resolved?.sectionId ?? null,
      linkedLabel: resolved?.label ?? null,
      ...freq,
    });
  }

  const totalToday = habits.filter((h) => h.completedToday).length;
  const pct = habits.length > 0 ? Math.round((totalToday / habits.length) * 100) : 0;

  // Week header: Mon Tue Wed Thu Fri Sat Sun
  const weekHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className={`px-4 sm:px-6 py-5 border-b ${theme.borderColor} ${theme.mainBg} flex-shrink-0`}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span>🎯</span>
            <span>Your Daily Habit Tracker</span>
          </h1>
          {habits.length > 0 && (
            <span className="text-sm text-zinc-400">{totalToday}/{habits.length} today</span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Tap the <span className="font-semibold text-zinc-500 dark:text-zinc-400">circle ○</span> next to a habit to mark it done for today.
          The weekly grid on the right tracks your streak — green dot means done.
        </p>
        {habits.length > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${theme.brand}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-zinc-400 mt-1">{pct}% complete for today</p>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${theme.mainBg}`}>
        {loading ? (
          <p className="p-8 text-center text-zinc-400 text-sm">Loading habits…</p>
        ) : (
          <>
            {/* ── Week column headers: Mon–Sun ── */}
            {habits.length > 0 && (
              <div className="px-4 sm:px-6 pt-5 pb-2">
                {/* Mirror the habit-row flex layout so columns line up exactly */}
                <div className="flex items-center gap-3">
                  <div className="w-9 flex-shrink-0" /> {/* spacer for toggle button */}
                  <div className="flex-1" />             {/* spacer for name */}
                  <div className="flex gap-2 flex-shrink-0">
                    {days.map((d, i) => (
                      <div
                        key={d}
                        className={`w-8 text-center text-[11px] font-medium ${
                          isToday(d)
                            ? "text-zinc-700 dark:text-zinc-200 font-semibold"
                            : isFuture(d)
                            ? "text-zinc-300 dark:text-zinc-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {weekHeaders[i]}
                      </div>
                    ))}
                  </div>
                  <div className="w-[13px] ml-1 flex-shrink-0" /> {/* spacer for delete button */}
                </div>
              </div>
            )}

            {/* ── Habit rows ── */}
            <div className="px-4 sm:px-6 space-y-1 pb-4">
              {habits.map((habit) => {
                const activeDaySet = habit.daysOfWeek
                  ? new Set(habit.daysOfWeek.split(",").filter(Boolean).map(Number))
                  : null;

                return (
                  <div
                    key={habit.id}
                    className="group flex items-center gap-3 py-3 border-b border-stone-50 dark:border-zinc-800/50 last:border-0"
                  >
                    {/* Today toggle — dashed border = incomplete, solid green = done */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => toggleLog(habit.id)}
                        className={`group/btn w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 text-base ${
                          habit.completedToday
                            ? "border-green-500 bg-green-500 scale-110"
                            : "border-dashed border-zinc-300 dark:border-zinc-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105"
                        }`}
                        title={habit.completedToday ? "Mark incomplete" : "Tap to mark done for today"}
                      >
                        {habit.completedToday ? (
                          <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="relative flex items-center justify-center w-full h-full">
                            <span className="group-hover/btn:opacity-0 transition-opacity duration-150 text-sm leading-none select-none">
                              {habit.emoji ?? "⭐"}
                            </span>
                            <svg viewBox="0 0 12 12" fill="none" className="absolute w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150">
                              <path d="M2 6l3 3 5-5" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                      {/* Label below circle */}
                      <span className={`text-[9px] font-medium leading-none transition-opacity duration-150 ${
                        habit.completedToday
                          ? "text-green-500 opacity-100"
                          : "text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100"
                      }`}>
                        {habit.completedToday ? "done ✓" : "mark done"}
                      </span>
                    </div>

                    {/* Name + goal + streak */}
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
                      {/* Change 1: "Goal:" prefix */}
                      {(habit.goal || HABIT_GOALS[habit.name]) && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate"
                           title={habit.goal || HABIT_GOALS[habit.name] || ""}>
                          <span className="font-semibold">Goal:</span>{" "}
                          {habit.goal || HABIT_GOALS[habit.name]}
                        </p>
                      )}
                      {/* Frequency pill */}
                      <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5">
                        {freqLabel(habit.targetDays, habit.daysOfWeek ?? "")}
                      </p>
                    </div>

                    {/* 7-day dot grid (Mon–Sun of current week) */}
                    <div className="flex gap-2 flex-shrink-0">
                      {days.map((d) => {
                        const done = habit.entries.some((e) => isSameDay(e.date, d));
                        const today = isToday(d);
                        const future = isFuture(d);
                        const dayIdx = dayOfWeekIndex(d);
                        const applicable = !activeDaySet || activeDaySet.has(dayIdx);

                        return (
                          <div key={d} className="w-8 flex items-center justify-center">
                            {!applicable ? (
                              // Day not in this habit's schedule
                              <div className="w-2 h-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                            ) : future ? (
                              // Future day
                              <div className="w-5 h-5 rounded-full border border-dashed border-zinc-200 dark:border-zinc-700" />
                            ) : done ? (
                              <div className="w-5 h-5 rounded-full bg-green-400 dark:bg-green-500" />
                            ) : today ? (
                              <div className="w-5 h-5 rounded-full border-2 border-stone-200 dark:border-zinc-700" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-800" />
                            )}
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

            {/* ── Add habit section ── */}
            <div className="px-4 sm:px-6 pb-6">
              {addError && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  {addError}
                </div>
              )}
              {pendingHabit ? (
                <HabitSetupForm
                  initial={pendingHabit}
                  onConfirm={confirmAdd}
                  onCancel={() => { setPendingHabit(null); setAddError(null); }}
                  userProjects={userProjects}
                />
              ) : (
                <button
                  onClick={startAddCustom}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition mt-2"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add habit
                </button>
              )}

              {/* ── Suggested habits (not yet tracked) ── */}
              {!pendingHabit && (() => {
                const suggested = DEFAULT_HABITS.filter(
                  (d) => !habits.some((h) => h.name.toLowerCase() === d.name.toLowerCase())
                );
                if (suggested.length === 0) return null;
                return (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                      Suggested habits
                    </p>
                    <div className="flex flex-col gap-2">
                      {suggested.map((h) => (
                        <button
                          key={h.name}
                          onClick={() => startAddSuggested(h)}
                          className="flex items-start gap-3 px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition text-left group"
                        >
                          <span className="text-lg leading-none mt-0.5 flex-shrink-0">{h.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition">
                              {h.name}
                            </span>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              <span className="font-semibold">Goal:</span> {getGoal(h.name)}
                            </p>
                          </div>
                          <span className="ml-auto text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 transition text-xs mt-0.5 flex-shrink-0">
                            + Add
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
