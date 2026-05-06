const WEEKDAYS: Record<string, number> = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0,
};

function nextWeekday(from: Date, targetDay: number): Date {
  const diff = (targetDay - from.getDay() + 7) % 7 || 7;
  const d = new Date(from);
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 0, 0);
  return d;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 0, 0);
  return out;
}

/** Last day of the current month. */
export function endOfMonth(from: Date = new Date()): Date {
  // Day 0 of next month = last day of current month
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Friday of the current week (or today if today IS Friday). */
export function thisWeekFriday(from: Date = new Date()): Date {
  const day = from.getDay(); // 0=Sun … 6=Sat
  const daysAway = day <= 5 ? 5 - day : 6; // Sat → next Fri in 6d
  const d = new Date(from);
  d.setDate(d.getDate() + daysAway);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Sunday of the current week (or today if today IS Sunday). */
export function thisWeekSunday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysAway = day === 0 ? 0 : 7 - day;
  const d = new Date(from);
  d.setDate(d.getDate() + daysAway);
  d.setHours(23, 59, 0, 0);
  return d;
}

export interface ParseResult {
  title: string;
  dueAt: Date | null;
  dueLabel: string | null;
  manualPriority: string | null;
  /** True when the phrase "this week" was detected — caller should adjust
   *  the date to Friday (Work) or Sunday (Personal) once the category is known. */
  isThisWeek: boolean;
}

export function parseTask(raw: string): ParseResult {
  const now = new Date();
  let text = raw.trim();
  let dueAt: Date | null = null;
  let dueLabel: string | null = null;
  let manualPriority: string | null = null;
  let isThisWeek = false;

  // Accept P0/P1/P2 shorthand OR "high"/"medium"/"low" (case-insensitive)
  text = text.replace(/\b[Pp][012]\b/, (m) => {
    manualPriority = m.toUpperCase();
    return "";
  });

  if (!manualPriority) {
    text = text.replace(/\b(high|urgent|critical)\s*(?:priority)?\b/i, () => {
      manualPriority = "P0";
      return "";
    });
  }
  if (!manualPriority) {
    text = text.replace(/\bmedium\s*(?:priority)?\b/i, () => {
      manualPriority = "P1";
      return "";
    });
  }
  if (!manualPriority) {
    text = text.replace(/\blow\s*(?:priority)?\b/i, () => {
      manualPriority = "P2";
      return "";
    });
  }

  text = text.replace(/\btoday\b/i, () => {
    dueAt = endOfDay(now);
    dueLabel = "Today";
    return "";
  });

  if (!dueAt) {
    text = text.replace(/\btonight\b/i, () => {
      const d = new Date(now);
      d.setHours(21, 0, 0, 0);
      dueAt = d;
      dueLabel = "Tonight";
      return "";
    });
  }

  if (!dueAt) {
    text = text.replace(/\btomorrow\b/i, () => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      dueAt = endOfDay(d);
      dueLabel = "Tomorrow";
      return "";
    });
  }

  if (!dueAt) {
    text = text.replace(/\bnext\s+(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i, (_, day) => {
      const wd = WEEKDAYS[day.toLowerCase()];
      if (wd !== undefined) {
        dueAt = nextWeekday(now, wd);
        dueLabel = `Next ${day.charAt(0).toUpperCase() + day.slice(1)}`;
      }
      return "";
    });
  }

  if (!dueAt) {
    text = text.replace(/\b(?:on\s+)?(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i, (_, day) => {
      const wd = WEEKDAYS[day.toLowerCase()];
      if (wd !== undefined) {
        dueAt = nextWeekday(now, wd);
        dueLabel = day.charAt(0).toUpperCase() + day.slice(1);
      }
      return "";
    });
  }

  if (!dueAt) {
    text = text.replace(/\bthis\s+week\b/i, () => {
      // Default to Friday; TaskList will override to Sunday if category is Personal
      dueAt = thisWeekFriday(now);
      dueLabel = "This Week";
      isThisWeek = true;
      return "";
    });
  }

  if (!dueAt) {
    // "end of month", "end of the month", "before end of month", "by month end", "EOM"
    text = text.replace(
      /\b(?:before\s+)?(?:end\s+of\s+(?:the\s+)?month|month[- ]?end|eom)\b/i,
      () => {
        dueAt = endOfMonth(now);
        dueLabel = "End of Month";
        return "";
      }
    );
  }

  if (!dueAt) {
    text = text.replace(/\bin\s+(\d+)\s+(day|week|hour)s?\b/i, (_, n, unit) => {
      const num = parseInt(n, 10);
      const d = new Date(now);
      if (unit.toLowerCase() === "day") d.setDate(d.getDate() + num);
      else if (unit.toLowerCase() === "week") d.setDate(d.getDate() + num * 7);
      else d.setHours(d.getHours() + num);
      dueAt = unit.toLowerCase() === "hour" ? d : endOfDay(d);
      dueLabel = `In ${num} ${unit}${num !== 1 ? "s" : ""}`;
      return "";
    });
  }

  text = text.replace(/\b(by|due)\s*$/i, "").replace(/\s{2,}/g, " ").trim();
  text = text.replace(/^[,.\-;:\s]+|[,.\-;:\s]+$/g, "");

  return { title: text || raw.trim(), dueAt, dueLabel, manualPriority, isThisWeek };
}
