"use client";

import { useState, useRef } from "react";
import type { Task, Section, ActiveView, Project } from "@/types";
import type { CategorizeResult } from "@/app/api/categorize/route";
import { suggestPriority } from "@/lib/priority";
import HabitSummaryWidget from "./HabitSummaryWidget";
import TaskRow from "./TaskRow";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Smart sort ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

function smartSort(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Priority (P0 > P1 > P2 > none)
    const pa = PRIORITY_ORDER[a.suggestedPriority ?? a.manualPriority ?? ""] ?? 3;
    const pb = PRIORITY_ORDER[b.suggestedPriority ?? b.manualPriority ?? ""] ?? 3;
    if (pa !== pb) return pa - pb;
    // 2. Due date ascending (tasks with no due date go last)
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    // 3. Newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ─── Context-aware NLP examples ──────────────────────────────────────────────
//
// TWO-TIER STRUCTURE — section-specific entries come FIRST so they always
// win over broader project-level entries (first match wins).
// Context string passed in: "${projectName} ${sectionName}" (lowercased).

const CONTEXT_EXAMPLES: { match: string[]; example: string }[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — Section-specific (unique section names across the new structure)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Work › Planning ───────────────────────────────────────────────────────
  { match: ["goals & okr"],
    example: "Set Q3 OKR: grow MAU 15% — finalize with team by Friday medium" },
  { match: ["roadmap"],
    example: "Add dark mode to Q4 roadmap — high customer demand, low effort" },
  { match: ["backlog"],
    example: "Add search filter feature to backlog — revisit next sprint low" },
  { match: ["someday"],
    example: "Idea: build internal analytics dashboard — revisit if bandwidth allows" },

  // ── Work › Stakeholders ───────────────────────────────────────────────────
  { match: ["follow-ups"],
    example: "Follow up with design lead on nav redesign by tomorrow medium" },
  { match: ["waiting on"],
    example: "Waiting on legal review of ToS update — nudge if no reply by Thursday" },
  { match: ["to discuss"],
    example: "Add pipeline migration timeline to agenda for next data sync" },
  { match: ["escalations"],
    example: "Escalate delayed API delivery to VP Eng — resolve by Friday high" },

  // ── Work › Career ─────────────────────────────────────────────────────────
  { match: ["wins"],
    example: "Drove 12% engagement lift by launching search re-ranking feature" },
  { match: ["1:1 prep"],
    example: "Prep Q3 talking points: growth trajectory + promo timeline medium" },

  // ── Work › Admin ──────────────────────────────────────────────────────────
  { match: ["recurring"],
    example: "Submit weekly status update to leadership by Friday low" },
  { match: ["expenses & travel"],
    example: "Submit Q2 expense report before Friday deadline medium" },
  { match: ["meeting prep"],
    example: "Prep Q2 planning meeting agenda — share with team by Monday" },
  { match: ["vendor requests"],
    example: "Follow up on Figma renewal quote — due end of quarter medium" },

  // ── Personal › Day-to-day Logistics ──────────────────────────────────────
  { match: ["groceries & shopping"],
    example: "Pick up diapers, oat milk, and fresh produce tomorrow morning" },
  { match: ["home maintenance"],
    example: "Call plumber about kitchen leak — schedule for this week high" },
  { match: ["orders & returns"],
    example: "Return Amazon package by Thursday — print label first" },
  { match: ["other errands"],
    example: "Post office + pick up prescription tomorrow morning" },

  // ── Personal › Family & Kids ──────────────────────────────────────────────
  { match: ["baby & parenting"],
    example: "Interview nanny candidate Thursday at 2pm high" },
  { match: ["events & birthdays"],
    example: "Order birthday gift for mum — needs to arrive by Friday" },
  { match: ["playdates"],
    example: "Arrange playdate with Emma and baby Lily for Saturday low" },

  // ── Personal › Health & Wellness ─────────────────────────────────────────
  { match: ["fitness"],
    example: "30-min run before work tomorrow" },
  { match: ["nutrition"],
    example: "Meal prep overnight oats and salads for the week on Sunday" },
  { match: ["self-care"],
    example: "Book prenatal massage for next Saturday low" },

  // ── Personal › Finance ────────────────────────────────────────────────────
  { match: ["bills & subscriptions"],
    example: "Review and cancel unused subscriptions — could save $50/mo low" },
  { match: ["taxes & docs"],
    example: "Gather W2 + childcare receipts for tax filing — deadline Apr 15 high" },
  { match: ["insurance"],
    example: "Submit ER visit insurance claim — deadline April 30 high" },
  { match: ["big purchases"],
    example: "Research convertible car seat — decide before August trip low" },

  // ── Personal › Learning & Hobbies ────────────────────────────────────────
  { match: ["reading"],
    example: "Finish 'Atomic Habits' by end of month — 20 pages/day low" },
  { match: ["courses"],
    example: "Complete System Design module 3 — finish by Sunday low" },
  { match: ["hobbies"],
    example: "Practice guitar for 20 mins this evening low" },
  { match: ["personal goals"],
    example: "Return to work full-time by baby's first birthday — map out transition medium" },

  // ── Personal › Travel & Social ────────────────────────────────────────────
  { match: ["upcoming trips"],
    example: "Book hotel for Portland trip — confirm dates by next Thursday medium" },
  { match: ["trip planning"],
    example: "Research kid-friendly restaurants in Portland for August trip low" },
  { match: ["friends catch-ups"],
    example: "Text Sarah to schedule brunch catch-up this month" },
  { match: ["packing"],
    example: "Pack hospital bag — complete go-bag checklist by 36 weeks high" },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Project-level fallbacks (catches unlisted sections like
  // "appointments" which appears in both Family & Kids and Health & Wellness)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Work project fallbacks ────────────────────────────────────────────────
  { match: ["planning"],
    example: "Finalize Q3 OKR review with team by Friday medium" },
  { match: ["execution"],
    example: "Finish onboarding spec first draft by Thursday medium" },
  { match: ["stakeholders"],
    example: "Follow up with design lead by tomorrow medium" },
  { match: ["career"],
    example: "Prep 1:1 notes for Thursday — include promo progress low" },
  { match: ["admin"],
    example: "Submit Q2 expense report by Friday medium" },

  // ── Personal project fallbacks ────────────────────────────────────────────
  { match: ["day-to-day logistics", "logistics"],
    example: "Restock diapers, formula, and wipes tomorrow" },
  { match: ["family & kids"],
    example: "Schedule 6-month well-baby visit with Dr. Kim by Tuesday medium" },
  { match: ["health & wellness"],
    example: "Book dentist appointment for next week medium" },
  { match: ["finance"],
    example: "Pay Q2 estimated taxes by Apr 15 high" },
  { match: ["learning & hobbies"],
    example: "Start Atomic Habits — aim to finish by end of month" },
  { match: ["travel & social"],
    example: "Book hotel for Portland trip by next Thursday medium" },

  // ── Smart / flat views ────────────────────────────────────────────────────
  { match: ["your to-do", "to-do list", "todo"],
    example: "Review PRD draft and send to team by Thursday medium" },
  { match: ["inbox"],
    example: "Team sync with eng at 3pm today medium" },
  { match: ["today"],
    example: "Review pull requests before 5pm medium" },
  { match: ["upcoming"],
    example: "Book dentist appointment next week" },
  { match: ["due this week", "due next week", "due in 30"],
    example: "Submit report by Friday medium" },
  { match: ["high priority"],
    example: "Fix critical bug in prod today high" },

  // ── Generic section-name fallbacks ───────────────────────────────────────
  { match: ["this week", "in progress"],
    example: "Finish draft spec and share for review medium" },
  { match: ["blocked", "waiting"],
    example: "Unblock API design review — nudge backend lead today high" },
  { match: ["done", "completed"],
    example: "Document retro learnings from last sprint" },
  { match: ["goals"],
    example: "Target senior promotion by July — finalize development plan high" },
];

// Broad work-context detector for the last-resort fallback.
const WORK_CONTEXT_KEYWORDS = [
  "work", "execution", "planning", "stakeholders", "career", "admin",
  "roadmap", "okr", "feature", "milestone", "q1", "q2", "q3", "q4",
  "meeting", "sync", "leadership", "spec", "1:1", "wins",
];

function getContextExample(context: string): string {
  const lower = context.toLowerCase();
  for (const { match, example } of CONTEXT_EXAMPLES) {
    if (match.some((kw) => lower.includes(kw))) return example;
  }
  const isWorkContext = WORK_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw));
  return isWorkContext
    ? "Write PRD section on notification system by Thursday medium"
    : "Buy groceries and meal prep for the week";
}

// ─── NLP hint chips ──────────────────────────────────────────────────────────

const NLP_HINTS = [
  { icon: "📅", label: "date",       tip: "tomorrow · next week · by Friday" },
  { icon: "🔴", label: "high / medium / low", tip: "sets priority" },
  { icon: "🚫", label: "blocked",    tip: "marks task as waiting" },
];

// ─── AddTaskInline ────────────────────────────────────────────────────────────
//
// Idle  → hint chips + faint "+ Add" label always visible, no input shown.
// Active → full input with contextual placeholder + Add / Cancel buttons.
// Clicking a chip or the "+" button both expand to active state.

// ─── AddExtras — extra fields collected in the categorization card ────────────

export interface AddExtras {
  cleanTitle?: string;           // NLP-cleaned version of what the user typed
  dueAt?: string | null;         // ISO string or null
  manualPriority?: string | null; // "P0" | "P1" | "P2" | null
}

// ─── callCategorize helper ────────────────────────────────────────────────────

async function callCategorize(
  title: string,
  filterTopLevelId?: number
): Promise<CategorizeResult | null> {
  const res = await fetch("/api/categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, ...(filterTopLevelId !== undefined ? { filterTopLevelId } : {}) }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── AddTaskInline ────────────────────────────────────────────────────────────
//
// Step 0 (input)  → user types task title, hits Add task
// Step 1 (top)    → pick Work / Personal (or any top-level root project)
//                   pre-selected to the best suggestion
// Step 2 (detail) → sub-project + section + Priority chips + Due date picker
//                   Priority is auto-suggested (can be overridden)
//                   Due date is prominently shown even when blank
//
// Changing the top-level in step 1 triggers a fresh /api/categorize call with
// filterTopLevelId so the sub-section suggestion always reflects the chosen area.

type CategStep = "input" | "step1" | "step2";

const PRIORITY_LABELS: Record<string, { label: string; dot: string }> = {
  P0: { label: "High",   dot: "🔴" },
  P1: { label: "Medium", dot: "🟡" },
  P2: { label: "Low",    dot: "🟢" },
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
}

function toIsoMidnight(dateInput: string): string | null {
  if (!dateInput) return null;
  return new Date(dateInput + "T23:59:00").toISOString();
}

function AddTaskInline({
  onAdd,
  contextLabel,
  triggerLabel,
  showCategorize = false,
  projects = [],
}: {
  onAdd: (title: string, sectionId?: number, projectId?: number, extras?: AddExtras) => void;
  contextLabel: string;
  triggerLabel?: string;
  showCategorize?: boolean;
  projects?: Project[];
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [categorizing, setCategorizing] = useState(false);
  const [step, setStep] = useState<CategStep>("input");

  // Categorization state
  const [selTopLevelId, setSelTopLevelId] = useState("");
  const [selProjectId, setSelProjectId] = useState("");
  const [selSectionId, setSelSectionId] = useState("");

  // NLP parse results
  const [cleanTitle, setCleanTitle] = useState("");
  const [selDueAt, setSelDueAt] = useState("");         // yyyy-MM-dd for <input type=date>
  const [selPriority, setSelPriority] = useState("");   // "P0" | "P1" | "P2"
  const [autoReason, setAutoReason] = useState("");
  const [priorityWasAuto, setPriorityWasAuto] = useState(false);

  const ref = useRef<HTMLInputElement>(null);
  const example = getContextExample(contextLabel);

  // Top-level projects (parentId === null)
  const topLevelProjects = projects.filter((p) => p.parentId === null);

  // Sub-projects under the currently selected top-level
  const subProjects = selTopLevelId
    ? projects.filter((p) => p.parentId === parseInt(selTopLevelId))
    : [];

  // Sections of the currently-selected sub-project
  const selProject = projects.find((p) => p.id.toString() === selProjectId);
  const selSections = selProject?.sections ?? [];

  function expand() {
    setOpen(true);
    setTimeout(() => ref.current?.focus(), 50);
  }

  function reset() {
    setOpen(false);
    setText("");
    setStep("input");
    setSelTopLevelId("");
    setSelProjectId("");
    setSelSectionId("");
    setCleanTitle("");
    setSelDueAt("");
    setSelPriority("");
    setAutoReason("");
    setPriorityWasAuto(false);
  }

  // ── Called when user submits the input (step 0 → step 1 or step 2) ───────
  async function submit() {
    const t = text.trim();
    if (!t) return;

    // Direct add in project view — no categorization, but we still want priority/date
    // For simplicity, direct adds skip the wizard and parse server-side as before
    if (!showCategorize) {
      onAdd(t);
      reset();
      return;
    }

    setCategorizing(true);
    try {
      // Run NLP parse and categorize in parallel
      const [parseData, categorizeData] = await Promise.all([
        fetch(`/api/parse?text=${encodeURIComponent(t)}`)
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({})),
        callCategorize(t),
      ]);

      // NLP results
      const pTitle: string = parseData.title ?? t;
      const pDueAt: string | null = parseData.dueAt ?? null;   // ISO string from server
      const pPriority: string | null = parseData.manualPriority ?? null;

      setCleanTitle(pTitle);
      setSelDueAt(toDateInputValue(pDueAt));

      // Auto-suggest priority if the user didn't type one
      const suggestion = suggestPriority({
        manualPriority: pPriority,
        dueAt: pDueAt ? new Date(pDueAt) : null,
        isBlocked: false,
        updatedAt: new Date(),
      });
      setSelPriority(suggestion.priority);
      setAutoReason(suggestion.reason);
      setPriorityWasAuto(!pPriority);

      // Categorization results
      if (categorizeData) {
        setSelTopLevelId(categorizeData.topLevelProjectId.toString());
        setSelProjectId(categorizeData.projectId.toString());
        setSelSectionId(categorizeData.sectionId?.toString() ?? "");
        setStep("step1");
      } else {
        // No project match — skip step 1, go straight to step 2 for priority/date
        setStep("step2");
      }
    } catch {
      onAdd(t);
      reset();
    } finally {
      setCategorizing(false);
    }
  }

  // ── Pick top-level project in step 1 ─────────────────────────────────────
  async function pickTopLevel(topId: string) {
    const prev = selTopLevelId;
    setSelTopLevelId(topId);

    if (topId === prev) {
      setStep("step2");
      return;
    }

    // Re-suggest sub-section within the new top-level
    setCategorizing(true);
    try {
      const result = await callCategorize(cleanTitle || text.trim(), parseInt(topId));
      if (result) {
        setSelProjectId(result.projectId.toString());
        setSelSectionId(result.sectionId?.toString() ?? "");
      } else {
        const firstSub = projects.find((p) => p.parentId === parseInt(topId));
        setSelProjectId(firstSub?.id.toString() ?? "");
        setSelSectionId("");
      }
    } catch {
      const firstSub = projects.find((p) => p.parentId === parseInt(topId));
      setSelProjectId(firstSub?.id.toString() ?? "");
      setSelSectionId("");
    } finally {
      setCategorizing(false);
    }
    setStep("step2");
  }

  function confirmAdd() {
    const pid = selProjectId ? parseInt(selProjectId) : undefined;
    const sid = selSectionId ? parseInt(selSectionId) : undefined;
    onAdd(cleanTitle || text.trim(), sid, pid, {
      cleanTitle: cleanTitle || undefined,
      dueAt: toIsoMidnight(selDueAt),
      manualPriority: selPriority || null,
    });
    reset();
  }

  function skipProject() {
    onAdd(text.trim());
    reset();
  }

  // ── Idle: show "+ Add task" trigger ─────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={expand}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors group text-left"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="font-medium text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0">
          {triggerLabel ?? "Add task"}
        </span>
        <span className="text-zinc-300 dark:text-zinc-600 text-[12px] italic truncate group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors ml-1">
          e.g. "{example}"
        </span>
      </button>
    );
  }

  // ── Active wrapper ────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-3 border-t border-stone-100 dark:border-zinc-800">

      {/* ── Step 0: task input ────────────────────────────────────────── */}
      {step === "input" && (
        <>
          <input
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") reset();
            }}
            onBlur={() => { if (!text.trim()) reset(); }}
            placeholder={`e.g. "${example}"`}
            className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 mr-0.5">Type naturally:</span>
            {NLP_HINTS.map((h) => (
              <span
                key={h.label}
                title={h.tip}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-700 text-[11px] cursor-default"
              >
                <span>{h.icon}</span>
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{h.label}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={submit}
              disabled={categorizing}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.button} disabled:opacity-60`}
            >
              {categorizing ? "Analyzing…" : "Add task"}
            </button>
            <button
              onClick={reset}
              className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* ── Step 1: pick Work / Personal ─────────────────────────────── */}
      {step === "step1" && (
        <div className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">"{cleanTitle || text.trim()}"</span>
          </p>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
              <span>📂</span> Step 1 of 2 — Work or Personal?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {topLevelProjects.map((p) => {
                const isSelected = selTopLevelId === p.id.toString();
                return (
                  <button
                    key={p.id}
                    onClick={() => pickTopLevel(p.id.toString())}
                    disabled={categorizing}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium
                      ${isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "border-zinc-200 dark:border-zinc-600 hover:border-indigo-300 dark:hover:border-indigo-600 text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-700/50"
                      } disabled:opacity-60`}
                  >
                    <span className="text-xl">{p.emoji ?? "📋"}</span>
                    <span className="text-xs">{p.name}</span>
                    {isSelected && <span className="text-[10px] text-indigo-500">suggested ✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={skipProject}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition px-2 py-1.5"
            >
              Add without project
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: sub-project + section + priority + due date ───────── */}
      {step === "step2" && (
        <div className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-3">

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <span>📍</span> {selTopLevelId ? "Step 2 of 2 — Details" : "Task details"}
            </p>
            {selTopLevelId && (
              <button
                onClick={() => setStep("step1")}
                className="text-[11px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-0.5"
              >
                ← {topLevelProjects.find((p) => p.id.toString() === selTopLevelId)?.emoji ?? ""}{" "}
                {topLevelProjects.find((p) => p.id.toString() === selTopLevelId)?.name ?? "Back"}
              </button>
            )}
          </div>

          {categorizing ? (
            <p className="text-xs text-zinc-400 py-2 text-center">Finding best section…</p>
          ) : (
            <div className="space-y-2.5">

              {/* Sub-project + section — only shown when a top-level was chosen */}
              {selTopLevelId && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 w-16 flex-shrink-0">Project</label>
                    <select
                      value={selProjectId}
                      onChange={(e) => { setSelProjectId(e.target.value); setSelSectionId(""); }}
                      className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">No sub-project</option>
                      {subProjects.map((p) => (
                        <option key={p.id} value={p.id.toString()}>
                          {p.emoji ?? "📋"} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selSections.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 w-16 flex-shrink-0">Section</label>
                      <select
                        value={selSectionId}
                        onChange={(e) => setSelSectionId(e.target.value)}
                        className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">No section</option>
                        {selSections.map((s) => (
                          <option key={s.id} value={s.id.toString()}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="border-t border-zinc-200 dark:border-zinc-700" />
                </>
              )}

              {/* ── Priority ── */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    🎯 Priority
                  </label>
                  {priorityWasAuto && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                      auto · {autoReason}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(["P0", "P1", "P2"] as const).map((p) => {
                    const { label, dot } = PRIORITY_LABELS[p];
                    const isActive = selPriority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setSelPriority(p)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-medium transition-all
                          ${isActive
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            : "border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-500"
                          }`}
                      >
                        <span>{dot}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Due date ── */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  📅 Due date
                  {!selDueAt && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium animate-pulse">
                      not set — add one?
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={selDueAt}
                  onChange={(e) => setSelDueAt(e.target.value)}
                  className={`w-full text-sm px-3 py-2 rounded-lg border-2 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                    ${selDueAt
                      ? "border-zinc-200 dark:border-zinc-600"
                      : "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/10"
                    }`}
                />
              </div>

            </div>
          )}

          {/* Confirm + skip */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={confirmAdd}
              disabled={categorizing}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.button} disabled:opacity-60`}
            >
              Add task
            </button>
            <button
              onClick={skipProject}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition px-2 py-1.5"
            >
              Add without details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TaskList ─────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<string, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
};

export default function TaskList({
  activeView,
  tasks,
  sections,
  projects = [],
  selectedId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
}: {
  activeView: ActiveView;
  tasks: Task[];
  sections: Section[];
  projects?: Project[];
  selectedId: number | null;
  onSelectTask: (t: Task) => void;
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (title: string, sectionId?: number, projectId?: number, extras?: AddExtras) => void;
}) {
  const { theme } = useTheme();
  const isProjectView = activeView.type === "project";
  const showProject =
    activeView.type === "smartview" ||
    activeView.type === "inbox" ||
    activeView.type === "today" ||
    activeView.type === "upcoming" ||
    activeView.type === "todo";

  let headerTitle = "";
  let headerEmoji = "";
  if (activeView.type === "todo")     { headerTitle = "Your To-do List"; headerEmoji = "✅"; }
  else if (activeView.type === "inbox")    { headerTitle = "Inbox"; headerEmoji = "📥"; }
  else if (activeView.type === "today")    { headerTitle = "Today"; headerEmoji = "☀️"; }
  else if (activeView.type === "upcoming") { headerTitle = "Upcoming"; headerEmoji = "📆"; }
  else if (activeView.type === "smartview") { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "🔖"; }
  else if (activeView.type === "project")   { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "📋"; }

  // Context string passed to example generator
  const contextLabel = headerTitle.toLowerCase();

  // ── "Your To-do List" view: split tasks into Today / Upcoming ───────────
  if (activeView.type === "todo") {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayTasks  = smartSort(tasks.filter((t) => t.dueAt && new Date(t.dueAt) <= endOfToday));
    const upcomingTasks = smartSort(tasks.filter((t) => !t.dueAt || new Date(t.dueAt) > endOfToday));

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header emoji={headerEmoji} title={headerTitle} count={tasks.length} />
        <div className={`flex-1 overflow-y-auto ${theme.mainBg}`}>
          {/* ── Today ── */}
          <div className="mb-2">
            <SectionHeader name="Today" count={todayTasks.length} />
            {todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} isSelected={selectedId === t.id}
                onSelect={() => onSelectTask(t)} onComplete={() => onCompleteTask(t.id)}
                onDelete={() => onDeleteTask(t.id)} showProject />
            ))}
            <AddTaskInline
              onAdd={(title, sectionId, projectId, extras) => onAddTask(title, sectionId, projectId, extras)}              contextLabel="today"
              triggerLabel="Add for today"
              showCategorize
              projects={projects}
            />
          </div>

          {/* ── Upcoming ── */}
          <div className="mb-2">
            <SectionHeader name="Upcoming" count={upcomingTasks.length} />
            {upcomingTasks.map((t) => (
              <TaskRow key={t.id} task={t} isSelected={selectedId === t.id}
                onSelect={() => onSelectTask(t)} onComplete={() => onCompleteTask(t.id)}
                onDelete={() => onDeleteTask(t.id)} showProject />
            ))}
            <AddTaskInline
              onAdd={(title, sectionId, projectId, extras) => onAddTask(title, sectionId, projectId, extras)}              contextLabel="upcoming"
              triggerLabel="Add upcoming task"
              showCategorize
              projects={projects}
            />
          </div>

          {tasks.length === 0 && (
            <EmptyState label="Your To-do List" />
          )}
        </div>
      </div>
    );
  }

  // ── Project view with sections ───────────────────────────────────────────
  if (isProjectView && sections.length > 0) {
    const sorted = smartSort(tasks);
    const sectionMap = new Map<number, Task[]>();
    const unsectioned: Task[] = [];
    sections.forEach((s) => sectionMap.set(s.id, []));
    sorted.forEach((t) => {
      if (t.sectionId && sectionMap.has(t.sectionId)) {
        sectionMap.get(t.sectionId)!.push(t);
      } else {
        unsectioned.push(t);
      }
    });

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header emoji={headerEmoji} title={headerTitle} count={tasks.length} />
        <div className={`flex-1 overflow-y-auto ${theme.mainBg}`}>
          {unsectioned.length > 0 && (
            <div className="mb-2">
              {unsectioned.map((t) => (
                <TaskRow key={t.id} task={t} isSelected={selectedId === t.id}
                  onSelect={() => onSelectTask(t)} onComplete={() => onCompleteTask(t.id)}
                  onDelete={() => onDeleteTask(t.id)} showProject={false} />
              ))}
            </div>
          )}

          {sections.map((sec) => {
            const secTasks = sectionMap.get(sec.id) ?? [];
            return (
              <div key={sec.id} className="mb-2">
                <SectionHeader name={sec.name} count={secTasks.length} />
                <HabitSummaryWidget sectionId={sec.id} />
                {secTasks.map((t) => (
                  <TaskRow key={t.id} task={t} isSelected={selectedId === t.id}
                    onSelect={() => onSelectTask(t)} onComplete={() => onCompleteTask(t.id)}
                    onDelete={() => onDeleteTask(t.id)} showProject={false} />
                ))}
                <AddTaskInline
                  onAdd={(title) => onAddTask(title, sec.id)}
                  contextLabel={`${headerTitle} ${sec.name}`}
                  triggerLabel={`Add to ${sec.name}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Flat view (inbox / today / upcoming / smart view) ────────────────────
  const label = activeView.type in VIEW_LABELS
    ? VIEW_LABELS[activeView.type as keyof typeof VIEW_LABELS]
    : headerTitle;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header emoji={headerEmoji} title={headerTitle} count={tasks.length} />
      <div className={`px-4 sm:px-6 py-3 border-b ${theme.borderColor} ${theme.mainBg}`}>
        <AddTaskInline onAdd={(title) => onAddTask(title)} contextLabel={contextLabel} />
      </div>
      <div className={`flex-1 overflow-y-auto ${theme.mainBg}`}>
        {tasks.length === 0 ? (
          <EmptyState label={label} />
        ) : (
          smartSort(tasks).map((t) => (
            <TaskRow key={t.id} task={t} isSelected={selectedId === t.id}
              onSelect={() => onSelectTask(t)} onComplete={() => onCompleteTask(t.id)}
              onDelete={() => onDeleteTask(t.id)} showProject={showProject} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ emoji, title, count }: { emoji: string; title: string; count: number }) {
  const { theme } = useTheme();
  return (
    <div className={`px-4 sm:px-6 py-5 border-b ${theme.borderColor} ${theme.mainBg} flex-shrink-0`}>
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <span className="text-2xl">{emoji}</span>
          <span>{title}</span>
        </h1>
        {count > 0 && (
          <span className="text-sm text-zinc-400 font-normal">{count} task{count !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ name, count }: { name: string; count: number }) {
  return (
    <div className="px-4 sm:px-6 pt-5 pb-1.5 flex items-center gap-2">
      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2">
        {name}
      </span>
      {count > 0 && (
        <span className="text-[11px] text-zinc-300 dark:text-zinc-600 font-medium">{count}</span>
      )}
      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="text-5xl mb-4">✨</div>
      <p className="text-base font-medium text-zinc-500 dark:text-zinc-400">
        {label === "Today" ? "You're all caught up for today" :
         label === "Inbox" ? "Your inbox is clear" :
         `Nothing in ${label} yet`}
      </p>
      <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
        Add a task above — type naturally, like{" "}
        <span className="italic text-zinc-500">"Review PRD by Friday medium"</span>
      </p>
    </div>
  );
}
