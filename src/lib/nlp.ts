import * as chrono from "chrono-node";

// ─── Date helpers (exported for Work/Personal due-date adjustment) ──────────

export function thisWeekFriday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysAway = day <= 5 ? 5 - day : 6; // Sat → next Fri
  const d = new Date(from);
  d.setDate(d.getDate() + daysAway);
  d.setHours(23, 59, 0, 0);
  return d;
}

export function thisWeekSunday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysAway = day === 0 ? 0 : 7 - day;
  const d = new Date(from);
  d.setDate(d.getDate() + daysAway);
  d.setHours(23, 59, 0, 0);
  return d;
}

export function thisWeekSaturday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysAway = day === 6 ? 0 : 6 - day;
  const d = new Date(from);
  d.setDate(d.getDate() + daysAway);
  d.setHours(23, 59, 0, 0);
  return d;
}

export function endOfMonth(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  d.setHours(23, 59, 0, 0);
  return d;
}

function endOfNextMonth(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth() + 2, 0);
  d.setHours(23, 59, 0, 0);
  return d;
}

function endOfQuarter(from: Date): Date {
  const month = from.getMonth();
  const qEnd = Math.floor(month / 3) * 3 + 2; // last month of this quarter (0-indexed)
  const d = new Date(from.getFullYear(), qEnd + 1, 0);
  d.setHours(23, 59, 0, 0);
  return d;
}

// ─── Custom patterns chrono-node doesn't cover ───────────────────────────────
// Checked in order before handing off to chrono-node.
const CUSTOM_PATTERNS: Array<{
  regex: RegExp;
  resolve: (now: Date) => Date;
  label: string;
  isThisWeek?: boolean;
}> = [
  // End of day / close of business
  {
    regex: /\b(?:by\s+)?(?:eod|end\s+of\s+(?:the\s+)?day|cob|close\s+of\s+business|end\s+of\s+business)\b/i,
    resolve: (now) => { const d = new Date(now); d.setHours(17, 0, 0, 0); return d; },
    label: "EOD",
  },
  // End of next month
  {
    regex: /\bend\s+of\s+next\s+month\b/i,
    resolve: endOfNextMonth,
    label: "End of Next Month",
  },
  // End of quarter
  {
    regex: /\b(?:end\s+of\s+(?:the\s+)?quarter|eoq|end\s+of\s+q[1-4])\b/i,
    resolve: endOfQuarter,
    label: "End of Quarter",
  },
  // End of month (before end-of-next-month so it matches last)
  {
    regex: /\b(?:before\s+)?(?:end\s+of\s+(?:the\s+)?month|month[- ]?end|eom)\b/i,
    resolve: endOfMonth,
    label: "End of Month",
  },
  // Next week (Friday of next week)
  {
    regex: /\bnext\s+week\b/i,
    resolve: (now) => {
      const d = new Date(now);
      // Jump to next Monday, then to Friday (+4)
      const daysToMonday = (8 - now.getDay()) % 7 || 7;
      d.setDate(d.getDate() + daysToMonday + 4);
      d.setHours(23, 59, 0, 0);
      return d;
    },
    label: "Next Week",
  },
  // This weekend → Saturday
  {
    regex: /\b(?:this\s+)?weekend\b/i,
    resolve: thisWeekSaturday,
    label: "This Weekend",
  },
  // This week → Friday (caller overrides to Sunday for Personal)
  {
    regex: /\bthis\s+week\b/i,
    resolve: thisWeekFriday,
    label: "This Week",
    isThisWeek: true,
  },
];

// ─── ParseResult ─────────────────────────────────────────────────────────────

export interface ParseResult {
  title: string;
  dueAt: Date | null;
  dueLabel: string | null;
  manualPriority: string | null;
  /** True when "this week" was detected — caller adjusts to Fri (Work) / Sun (Personal). */
  isThisWeek: boolean;
}

// ─── parseTask ────────────────────────────────────────────────────────────────
// 1. Strip priority markers.
// 2. Try custom date patterns (chrono-node doesn't handle well).
// 3. Fall back to chrono-node for everything else (explicit dates, "in 3 days", etc.)
// 4. Clean title of leftover prepositions / punctuation.

export function parseTask(raw: string, referenceDate: Date = new Date()): ParseResult {
  let text = raw.trim();
  let dueAt: Date | null = null;
  let dueLabel: string | null = null;
  let manualPriority: string | null = null;
  let isThisWeek = false;

  // ── Priority ────────────────────────────────────────────────────────────
  text = text.replace(/\b[Pp][012]\b/, (m) => { manualPriority = m.toUpperCase(); return ""; });
  if (!manualPriority)
    text = text.replace(/\b(high|urgent|critical)\s*(?:priority)?\b/i, () => { manualPriority = "P0"; return ""; });
  if (!manualPriority)
    text = text.replace(/\bmedium\s*(?:priority)?\b/i, () => { manualPriority = "P1"; return ""; });
  if (!manualPriority)
    text = text.replace(/\blow\s*(?:priority)?\b/i, () => { manualPriority = "P2"; return ""; });

  // ── Custom patterns ──────────────────────────────────────────────────────
  for (const pat of CUSTOM_PATTERNS) {
    const m = text.match(pat.regex);
    if (m) {
      dueAt = pat.resolve(referenceDate);
      dueLabel = pat.label;
      isThisWeek = pat.isThisWeek ?? false;
      text = text.replace(pat.regex, "");
      break;
    }
  }

  // ── chrono-node fallback ─────────────────────────────────────────────────
  if (!dueAt) {
    const results = chrono.parse(text, { instant: referenceDate, timezone: "UTC" });
    if (results.length > 0) {
      const r = results[0];
      dueAt = r.date();
      dueAt.setHours(23, 59, 0, 0); // normalise to end-of-day
      dueLabel = r.text;
      text = text.slice(0, r.index) + text.slice(r.index + r.text.length);
    }
  }

  // ── Clean title ──────────────────────────────────────────────────────────
  text = text
    .replace(/\b(by|due|for|on|at|in|before|from|before\s+the)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  text = text.replace(/^[,.\-;:\s]+|[,.\-;:\s]+$/g, "");

  return { title: text || raw.trim(), dueAt, dueLabel, manualPriority, isThisWeek };
}
