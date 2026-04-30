"use client";

import { useState, useRef } from "react";
import type { Task, Section, ActiveView } from "@/types";
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
// ORDER MATTERS — first match wins. Keep more-specific entries before
// general-purpose ones to avoid false positives (e.g. "goals" must not
// fire for "Career & Performance Goals"; "travel" must not fire for Admin).

const CONTEXT_EXAMPLES: { match: string[]; example: string }[] = [
  // ── Work ──────────────────────────────────────────────────────────────────
  // "goals"/"goal" intentionally omitted — they appear in Career sections too.
  { match: ["strategy", "roadmap", "okr", "vision"],
    example: "Finalize Q3 OKR review with team by Friday P1" },
  { match: ["deliverable", "spec", "shipped", "review", "hold"],
    example: "Ship onboarding redesign spec by Thursday P0" },
  { match: ["sprint", "execution", "eng", "handoff", "bug", "triage"],
    example: "Fix checkout bug today P0 #urgent" },
  { match: ["stakeholder", "alignment", "sync", "escalation", "follow"],
    example: "Follow up with design lead by tomorrow P1" },
  // "learning" omitted — it would catch "Learning & Personal Growth"
  { match: ["experiment", "data", "insight", "result"],
    example: "Analyze A/B test results by end of week P1" },
  { match: ["growth", "course", "upskill", "learn", "reading list", "explore"],
    example: "Start System Design course this week P2" },
  // "goal" omitted — caught below by the mental-load / career entry
  { match: ["career", "performance", "1:1", "feedback", "win"],
    example: "Prep 1:1 notes for Thursday P2" },
  // "social" and "event" omitted — both appear in personal Family & Social
  { match: ["culture", "shoutout", "hiring", "coffee chats"],
    example: "Send shoutout to Sarah for Q2 launch" },
  // "travel" omitted — it's in the dedicated travel entry below
  { match: ["admin", "ops", "expense", "vendor", "meeting prep"],
    example: "Submit Q2 expense report by Friday P1" },

  // ── Personal ──────────────────────────────────────────────────────────────
  { match: ["grocery", "logistics", "online order", "errand", "home supply"],
    example: "Restock diapers, formula & wipes tomorrow" },
  { match: ["baby", "parenting", "checkup", "gear", "childcare"],
    example: "Schedule 6-month checkup next Tuesday P1" },
  // "insurance" omitted — it belongs to finance context below
  { match: ["health", "medical", "appointment", "prescription"],
    example: "Book dentist appointment next week P1" },
  { match: ["fitness", "wellness", "workout", "nutrition", "sleep", "self-care"],
    example: "30-min run before work tomorrow" },
  // "social" and "event" omitted to avoid work-culture false positives
  { match: ["family", "birthday", "gift", "playdate", "friend"],
    example: "Order birthday gift for mum by this Friday" },
  { match: ["travel", "trip", "outing", "packing", "vacation"],
    example: "Book hotel for Portland trip by next Thursday P1" },
  { match: ["home", "house", "renovation", "repair", "contractor"],
    example: "Call plumber about kitchen leak tomorrow P0" },
  // "insurance" added here (finance-level)
  { match: ["finance", "bill", "tax", "subscription", "insurance", "budget"],
    example: "Pay Q2 estimated taxes by Apr 15 P0" },
  { match: ["book", "podcast", "reading", "on the list"],
    example: "Start Atomic Habits — aim to finish by month end" },
  { match: ["hobby", "creative", "art", "music"],
    example: "Practice guitar for 20 mins this evening" },
  // "long-term" and "goals" live here to catch Career + Mental Load sections
  { match: ["mental", "decide", "delegate", "long-term", "goal"],
    example: "Research preschool options by end of month P2" },
  { match: ["recipe", "meal", "cooking", "menu", "feeding"],
    example: "Try chicken tikka recipe this Sunday" },

  // ── Smart views ───────────────────────────────────────────────────────────
  { match: ["inbox"],                                  example: "Team sync with eng at 3pm today P1" },
  { match: ["today"],                                  example: "Review pull requests before 5pm P1" },
  { match: ["upcoming"],                               example: "Book dentist appointment next week" },
  { match: ["due this week", "due next week", "due in 30"], example: "Submit report by Friday P1" },
  { match: ["high priority"],                          example: "Fix critical bug in prod today P0" },

  // ── Generic section-name fallbacks ────────────────────────────────────────
  { match: ["this week", "in progress", "active"],     example: "Finish draft spec and share for review P1" },
  { match: ["next week", "backlog", "later"],           example: "Add dashboard export feature — start next sprint P2" },
  { match: ["blocked", "waiting", "needs input"],      example: "Unblock API design review with backend lead P0" },
  { match: ["done", "completed"],                       example: "Document retro learnings from last sprint" },
];

// Broad work-context detector for the last-resort fallback.
const WORK_CONTEXT_KEYWORDS = [
  "work", "sprint", "execution", "strategy", "roadmap", "product", "eng", "design",
  "launch", "stakeholder", "okr", "feature", "milestone", "q1", "q2", "q3", "q4",
  "planning", "meeting", "sync", "leadership", "deliverable", "spec",
];

function getContextExample(context: string): string {
  const lower = context.toLowerCase();
  for (const { match, example } of CONTEXT_EXAMPLES) {
    if (match.some((kw) => lower.includes(kw))) return example;
  }
  const isWorkContext = WORK_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw));
  return isWorkContext
    ? "Write PRD section on notification system by Thursday P1"
    : "Buy groceries and meal prep for the week";
}

// ─── NLP hint chips ──────────────────────────────────────────────────────────

const NLP_HINTS = [
  { icon: "📅", label: "date",       tip: "tomorrow · next week · by Friday" },
  { icon: "🔴", label: "P0 / P1 / P2", tip: "sets priority" },
  { icon: "🚫", label: "blocked",    tip: "marks task as waiting" },
];

// ─── AddTaskInline ────────────────────────────────────────────────────────────
//
// Idle  → hint chips + faint "+ Add" label always visible, no input shown.
// Active → full input with contextual placeholder + Add / Cancel buttons.
// Clicking a chip or the "+" button both expand to active state.

function AddTaskInline({
  onAdd,
  contextLabel,
  triggerLabel,
}: {
  onAdd: (title: string) => void;
  contextLabel: string;
  triggerLabel?: string;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const example = getContextExample(contextLabel);

  function expand() {
    setOpen(true);
    setTimeout(() => ref.current?.focus(), 50);
  }

  function submit() {
    const t = text.trim();
    if (t) {
      onAdd(t);
      setText("");
      setOpen(false);
    }
  }

  function cancel() {
    setOpen(false);
    setText("");
  }

  // ── Idle: hints are always on-screen ────────────────────────────────────
  if (!open) {
    return (
      <div className="px-4 py-2 flex items-center flex-wrap gap-x-3 gap-y-1.5">
        {/* "+ Add task" trigger */}
        <button
          onClick={expand}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="font-medium">{triggerLabel ?? "Add task"}</span>
        </button>

        {/* Hint chips — clicking any of them also opens the input */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {NLP_HINTS.map((h) => (
            <button
              key={h.label}
              onClick={expand}
              title={h.tip}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[11px] transition-colors cursor-pointer"
            >
              <span>{h.icon}</span>
              <span className="font-medium text-zinc-500 dark:text-zinc-400">{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Active: full input + buttons ─────────────────────────────────────────
  return (
    <div className="px-4 py-3 border-t border-stone-100 dark:border-zinc-800">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") cancel();
        }}
        onBlur={() => { if (!text.trim()) cancel(); }}
        placeholder={`e.g. "${example}"`}
        className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
      />

      {/* Hint chips (visible while typing as a reminder) */}
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

      {/* Action buttons */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={submit}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.button}`}
        >
          Add task
        </button>
        <button
          onClick={cancel}
          className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
        >
          Cancel
        </button>
      </div>
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
  selectedId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
}: {
  activeView: ActiveView;
  tasks: Task[];
  sections: Section[];
  selectedId: number | null;
  onSelectTask: (t: Task) => void;
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (title: string, sectionId?: number) => void;
}) {
  const isProjectView = activeView.type === "project";
  const showProject =
    activeView.type === "smartview" ||
    activeView.type === "inbox" ||
    activeView.type === "today" ||
    activeView.type === "upcoming";

  let headerTitle = "";
  let headerEmoji = "";
  if (activeView.type === "inbox") { headerTitle = "Inbox"; headerEmoji = "📥"; }
  else if (activeView.type === "today") { headerTitle = "Today"; headerEmoji = "☀️"; }
  else if (activeView.type === "upcoming") { headerTitle = "Upcoming"; headerEmoji = "📆"; }
  else if (activeView.type === "smartview") { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "🔖"; }
  else if (activeView.type === "project") { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "📋"; }

  // Context string passed to example generator
  const contextLabel = headerTitle.toLowerCase();

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
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
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

  // Flat view (inbox / today / upcoming / smart view)
  const label = activeView.type in VIEW_LABELS
    ? VIEW_LABELS[activeView.type as keyof typeof VIEW_LABELS]
    : headerTitle;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header emoji={headerEmoji} title={headerTitle} count={tasks.length} />
      <div className="px-6 py-3 border-b border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <AddTaskInline onAdd={(title) => onAddTask(title)} contextLabel={contextLabel} />
      </div>
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
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
  return (
    <div className="px-6 py-5 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
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
    <div className="px-6 pt-5 pb-1.5 flex items-center gap-2">
      <div className="h-px flex-1 bg-stone-100 dark:bg-zinc-800" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2">
        {name}
      </span>
      {count > 0 && (
        <span className="text-[11px] text-zinc-300 dark:text-zinc-600 font-medium">{count}</span>
      )}
      <div className="h-px flex-1 bg-stone-100 dark:bg-zinc-800" />
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
        <span className="italic text-zinc-500">"Review PRD by Friday P1"</span>
      </p>
    </div>
  );
}
