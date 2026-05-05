"use client";

import { useState, useRef } from "react";
import type { Task, Section, ActiveView, Project } from "@/types";
import type { CategorizeResult } from "@/app/api/categorize/route";
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
  // TIER 1 — Section-specific entries (distinct sections needing unique hints)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Strategy & Roadmap sections ───────────────────────────────────────────
  { match: ["vision & goals"],      example: "Define 2026 product vision and north star metric by Q2  high" },
  { match: ["quarterly okr"],       example: "Finalize Q3 OKRs with team — first draft by Wednesday medium" },
  { match: ["feature backlog"],     example: "Add dark mode to backlog — low effort, high demand low" },
  { match: ["deprioritized"],       example: "Move search filters to deprioritized — revisit Q4" },

  // ── Execution & Sprints sections ──────────────────────────────────────────
  { match: ["eng handoffs", "eng handoff"], example: "Hand off notification service spec to backend eng by EOD medium" },
  { match: ["bug triage"],          example: "Triage critical crash on checkout — root cause by tomorrow high" },

  // ── Stakeholder & Alignment sections ─────────────────────────────────────
  { match: ["follow-ups needed"],   example: "Follow up with design lead on nav redesign by tomorrow medium" },
  { match: ["waiting on others"],   example: "Blocked on legal review of ToS update — nudge by Thursday medium" },
  { match: ["to sync"],             example: "Sync with data eng on pipeline migration timeline medium" },
  { match: ["escalations"],         example: "Escalate delayed API delivery to VP Eng — resolve by Friday  high" },

  // ── Data & Insights / Experiments sections ────────────────────────────────
  { match: ["results analyzed"],    example: "Write findings doc for checkout A/B test — due Friday medium" },
  { match: ["experiment learnings"], example: "Document learnings from notification XP for team wiki low" },
  { match: ["experiment planning"], example: "Define success metrics for checkout A/B test by Wednesday medium" },

  // ── Growth & Upskilling sections ──────────────────────────────────────────
  { match: ["currently learning"],  example: "Complete System Design module 3 — finish by Sunday low" },
  { match: ["to explore"],          example: "Explore LLM fine-tuning tools for upcoming feature spike low" },

  // ── Career & Performance sections (all distinct — must come before "career") ─
  { match: ["performance goals", "career & performance goals"],
    example: "Target L8 promotion by July 2026 cycle — finalize self-review  high" },
  { match: ["wins & impact", "impact log"],
    example: "Drove 12% engagement lift by launching search re-ranking feature" },
  { match: ["1:1 prep"],            example: "Prep Q3 talking points: growth trajectory + promo timeline medium" },
  { match: ["feedback to give", "feedback to get"],
    example: "Share structured promo doc feedback for Alex by Friday medium" },

  // ── Culture & Social sections ─────────────────────────────────────────────
  { match: ["team events"],         example: "Organize Q2 team offsite — book venue by April 20 medium" },
  { match: ["shoutouts"],           example: "Give shoutout to Alex for shipping feeds re-ranking on time" },
  { match: ["coffee chats"],        example: "Set up coffee chat with new PM Maria this week" },

  // ── Admin & Ops sections ──────────────────────────────────────────────────
  { match: ["recurring"],           example: "Submit weekly status update to leadership by Friday low" },
  { match: ["vendor requests"],     example: "Follow up on Figma renewal quote — due by EOQ medium" },
  { match: ["meeting prep"],        example: "Prep agenda for Q2 planning meeting by Monday medium" },

  // ── Daily Logistics sections ──────────────────────────────────────────────
  { match: ["groceries"],           example: "Pick up diapers, formula, and oat milk tomorrow morning" },
  { match: ["online orders & returns", "online orders"],
    example: "Return Amazon package by Thursday — print label first" },
  { match: ["home supplies"],       example: "Reorder paper towels, dish soap, and trash bags" },
  { match: ["errands"],             example: "Post office + pick up prescription tomorrow morning" },

  // ── Baby & Parenting sections ─────────────────────────────────────────────
  { match: ["gear & supplies"],     example: "Order convertible car seat before road trip next month medium" },
  { match: ["development & activities"],
    example: "Research Montessori playgroups near home by weekend low" },
  { match: ["childcare & care team", "care team"],
    example: "Interview nanny candidate on Thursday at 2pm  high" },

  // ── Health & Medical sections ─────────────────────────────────────────────
  { match: ["my appointments"],     example: "Book dentist appointment for next week medium" },
  { match: ["baby appointments"],   example: "Schedule 6-month well-baby visit with Dr. Kim by Tuesday medium" },
  { match: ["prescriptions & refills", "refills"],
    example: "Refill prenatal vitamins prescription before Thursday" },
  { match: ["insurance & claims"],  example: "Submit insurance claim for ER visit — deadline April 30  high" },

  // ── Fitness & Wellness sections ───────────────────────────────────────────
  { match: ["nutrition & meal prep"], example: "Meal prep overnight oats and salads for the week Sunday" },
  { match: ["sleep & recovery"],    example: "Set up white noise machine and blackout curtains this week low" },
  { match: ["self-care"],           example: "Book prenatal massage for next Saturday low" },

  // ── Family & Social sections ──────────────────────────────────────────────
  { match: ["family events"],       example: "Plan mum's birthday dinner — book restaurant by Friday" },
  { match: ["birthdays & gifts"],   example: "Order birthday gift for mum by this Friday" },
  { match: ["playdates"],           example: "Arrange playdate with Emma and baby Lily for Saturday low" },
  { match: ["friends catch-ups", "catch-ups"],
    example: "Text Sarah to schedule brunch catch-up this month" },

  // ── Home Upkeep & Maintenance sections ───────────────────────────────────
  { match: ["maintenance & repairs"],  example: "Call plumber about kitchen leak — schedule for this week  high" },
  { match: ["decor & furnishing"],     example: "Order new throw pillows and side table for living room low" },
  { match: ["service providers"],      example: "Save electrician contact — Mike at ABC Electric 555-0123" },
  { match: ["trip planning"],       example: "Research kid-friendly restaurants in Portland for August trip low" },
  { match: ["day outings"],         example: "Plan family picnic at the park this Sunday" },
  { match: ["packing lists"],       example: "Pack hospital bag — go-bag checklist by 36 weeks  high" },

  // ── Finance & Admin sections ──────────────────────────────────────────────
  { match: ["bills & subscriptions"], example: "Review and cancel unused subscriptions — save $50/mo low" },
  { match: ["taxes & documents"],   example: "Gather W2 + childcare receipts for tax filing by April 10  high" },
  { match: ["big purchases"],       example: "Research convertible car seat — buy before August trip low" },

  // ── Mental Load sections ──────────────────────────────────────────────────
  { match: ["things to decide"],    example: "Decide on preschool enrollment — application deadline March 15  high" },
  { match: ["research needed"],     example: "Research sleep training methods — summarize options by weekend low" },
  { match: ["delegatable"],         example: "Ask partner to call pediatrician to book vaccine appointment" },
  { match: ["long-term goals"],     example: "Return to work full-time by baby's first birthday — plan transition medium" },

  // ── Meal Planning sections ────────────────────────────────────────────────
  { match: ["quick & easy"],        example: "Try 15-min sheet pan salmon recipe this Tuesday" },
  { match: ["weekend cooking"],     example: "Make big batch of pasta sauce and freeze Sunday" },
  { match: ["baby-friendly"],       example: "Puree sweet potato and peas for baby's first solids this week" },
  { match: ["meal prep tasks"],     example: "Chop veggies and prep grain bowls for Monday–Wednesday" },
  { match: ["weekly menu"],         example: "Plan this week's dinners — grocery order by Sunday 6pm" },
  { match: ["today's log", "feeding schedule"],
    example: "Log morning nursing session — 7:30am, 15 min each side" },
  { match: ["introducing solids"],  example: "Introduce mashed avocado this week — watch for reactions" },

  // ── Learning & Personal Growth sub-project sections ───────────────────────
  { match: ["currently reading", "currently listening"],
    example: "Finish 'Atomic Habits' by end of month — 20 pages/day" },
  { match: ["on the list"],         example: "Add 'Designing Data-Intensive Applications' to reading list" },
  { match: ["finished this year"],  example: "Mark 'Essentialism' as done — write 3 key takeaways" },
  { match: ["want to try"],         example: "Try beginner pottery class — find workshops this month low" },
  { match: ["on pause"],            example: "Resume guitar practice after parental leave — restart in June low" },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Project-level (catches remaining sections not covered above)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Work ──────────────────────────────────────────────────────────────────
  { match: ["strategy", "roadmap", "okr", "vision"],
    example: "Finalize Q3 OKR review with team by Friday medium" },
  { match: ["deliverable", "spec", "shipped", "review", "hold"],
    example: "Ship onboarding redesign spec by Thursday  high" },
  { match: ["sprint", "execution", "eng", "handoff", "bug", "triage"],
    example: "Fix checkout bug today high" },
  { match: ["stakeholder", "alignment", "escalation", "follow"],
    example: "Follow up with design lead by tomorrow medium" },
  { match: ["experiment", "data", "insight", "result"],
    example: "Analyze A/B test results by end of week medium" },
  { match: ["growth", "course", "upskill", "learn", "reading list", "explore"],
    example: "Start System Design course this week low" },
  { match: ["career", "performance", "1:1", "feedback", "win"],
    example: "Prep 1:1 notes for Thursday low" },
  { match: ["culture", "shoutout", "hiring"],
    example: "Send shoutout to Sarah for shipping feeds re-ranking medium" },
  { match: ["admin", "ops", "expense", "vendor"],
    example: "Submit Q2 expense report by Friday medium" },

  // ── Personal ──────────────────────────────────────────────────────────────
  { match: ["grocery", "logistics", "online order", "errand", "home supply"],
    example: "Restock diapers, formula & wipes tomorrow" },
  { match: ["baby", "parenting", "checkup", "gear", "childcare"],
    example: "Schedule 6-month checkup next Tuesday medium" },
  { match: ["health", "medical", "appointment", "prescription"],
    example: "Book dentist appointment next week medium" },
  { match: ["fitness", "wellness", "workout", "nutrition", "sleep"],
    example: "30-min run before work tomorrow" },
  { match: ["family", "birthday", "gift", "playdate", "friend"],
    example: "Order birthday gift for mum by this Friday" },
  { match: ["travel", "trip", "outing", "packing", "vacation"],
    example: "Book hotel for Portland trip by next Thursday medium" },
  { match: ["home", "house", "upkeep", "renovation", "repair", "contractor"],
    example: "Call plumber about kitchen leak tomorrow  high" },
  { match: ["finance", "bill", "tax", "subscription", "insurance", "budget"],
    example: "Pay Q2 estimated taxes by Apr 15  high" },
  { match: ["book", "podcast", "reading"],
    example: "Start Atomic Habits — aim to finish by month end" },
  { match: ["hobby", "creative", "art", "music"],
    example: "Practice guitar for 20 mins this evening" },
  { match: ["mental", "decide", "delegate", "long-term", "goal"],
    example: "Research preschool options by end of month low" },
  { match: ["recipe", "meal", "cooking", "menu", "feeding"],
    example: "Try chicken tikka recipe this Sunday" },

  // ── Smart / flat views ────────────────────────────────────────────────────
  { match: ["your to-do", "to-do list", "todo"],
    example: "Review PRD draft and send to team by Thursday medium" },
  { match: ["inbox"],   example: "Team sync with eng at 3pm today medium" },
  { match: ["today"],   example: "Review pull requests before 5pm medium" },
  { match: ["upcoming"], example: "Book dentist appointment next week" },
  { match: ["due this week", "due next week", "due in 30"], example: "Submit report by Friday medium" },
  { match: ["high priority"], example: "Fix critical bug in prod today  high" },

  // ── Generic section-name fallbacks ────────────────────────────────────────
  { match: ["this week", "in progress", "active"], example: "Finish draft spec and share for review medium" },
  { match: ["next week", "backlog", "later"],       example: "Add dashboard export feature — start next sprint low" },
  { match: ["blocked", "waiting", "needs input"],  example: "Unblock API design review with backend lead  high" },
  { match: ["done", "completed"],                   example: "Document retro learnings from last sprint" },
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

function AddTaskInline({
  onAdd,
  contextLabel,
  triggerLabel,
  showCategorize = false,
  projects = [],
}: {
  onAdd: (title: string, sectionId?: number, projectId?: number) => void;
  contextLabel: string;
  triggerLabel?: string;
  showCategorize?: boolean;
  projects?: Project[];
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [categorizing, setCategorizing] = useState(false);
  const [suggestion, setSuggestion] = useState<CategorizeResult | null>(null);
  const [selProjectId, setSelProjectId] = useState("");
  const [selSectionId, setSelSectionId] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const example = getContextExample(contextLabel);

  // Sections of the currently-selected project in the confirmation card
  const selProject = projects.find((p) => p.id.toString() === selProjectId);
  const selSections = selProject?.sections ?? [];

  function expand() {
    setOpen(true);
    setTimeout(() => ref.current?.focus(), 50);
  }

  function reset() {
    setOpen(false);
    setText("");
    setSuggestion(null);
    setSelProjectId("");
    setSelSectionId("");
  }

  async function submit() {
    const t = text.trim();
    if (!t) return;

    // When in a project view (showCategorize=false), add directly
    if (!showCategorize) {
      onAdd(t);
      reset();
      return;
    }

    // Attempt auto-categorization
    setCategorizing(true);
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const result: CategorizeResult | null = await res.json();
      if (result) {
        setSuggestion(result);
        setSelProjectId(result.projectId.toString());
        setSelSectionId(result.sectionId?.toString() ?? "");
      } else {
        // No match — add without project
        onAdd(t);
        reset();
      }
    } catch {
      onAdd(t);
      reset();
    } finally {
      setCategorizing(false);
    }
  }

  function confirmAdd() {
    const pid = selProjectId ? parseInt(selProjectId) : undefined;
    const sid = selSectionId ? parseInt(selSectionId) : undefined;
    onAdd(text.trim(), sid, pid);
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

  // ── Active: input + chips + buttons ─────────────────────────────────────
  return (
    <div className="px-4 py-3 border-t border-stone-100 dark:border-zinc-800">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !suggestion) submit();
          if (e.key === "Escape") reset();
        }}
        onBlur={() => { if (!text.trim() && !suggestion) reset(); }}
        placeholder={`e.g. "${example}"`}
        className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
      />

      {/* NLP hint chips */}
      {!suggestion && (
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
      )}

      {/* ── Auto-categorize confirmation card ── */}
      {suggestion && (
        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <span>📍</span> Suggested category
          </p>

          {/* Project dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400 w-14 flex-shrink-0">Project</label>
            <select
              value={selProjectId}
              onChange={(e) => {
                setSelProjectId(e.target.value);
                setSelSectionId("");
              }}
              className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.emoji ?? "📋"} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section dropdown — only shown when selected project has sections */}
          {selSections.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 dark:text-zinc-400 w-14 flex-shrink-0">Section</label>
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

          {/* Confirm + skip */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={confirmAdd}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.button}`}
            >
              Add task
            </button>
            <button
              onClick={skipProject}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition px-2 py-1.5"
            >
              Add without project
            </button>
          </div>
        </div>
      )}

      {/* Action buttons — shown when no confirmation card yet */}
      {!suggestion && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={submit}
            disabled={categorizing}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.button} disabled:opacity-60`}
          >
            {categorizing ? "Categorizing…" : "Add task"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
          >
            Cancel
          </button>
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
  onAddTask: (title: string, sectionId?: number, projectId?: number) => void;
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
              onAdd={(title, sectionId, projectId) => onAddTask(title, sectionId, projectId)}
              contextLabel="today"
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
              onAdd={(title, sectionId, projectId) => onAddTask(title, sectionId, projectId)}
              contextLabel="upcoming"
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
