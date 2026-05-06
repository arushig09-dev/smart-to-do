/** Reminder offset presets shown in dropdowns. */
export const REMINDER_PRESETS = [
  { value: "none", label: "No reminder" },
  { value: "at_due", label: "At time of due" },
  { value: "2h", label: "2 hours before" },
  { value: "1d", label: "1 day before" },
  { value: "2d", label: "2 days before" },
  { value: "1w", label: "1 week before" },
] as const;

export type ReminderOffset = (typeof REMINDER_PRESETS)[number]["value"];

const OFFSET_MS: Partial<Record<ReminderOffset, number>> = {
  at_due: 0,
  "2h": 2 * 3_600_000,
  "1d": 24 * 3_600_000,
  "2d": 48 * 3_600_000,
  "1w": 7 * 24 * 3_600_000,
};

/** Compute an absolute reminderAt ISO string from a due date + preset offset. */
export function computeReminderAt(dueIso: string | null, offset: ReminderOffset): string | null {
  if (!dueIso || offset === "none") return null;
  const due = new Date(dueIso).getTime();
  const ms = OFFSET_MS[offset] ?? 0;
  return new Date(due - ms).toISOString();
}

/** Reverse-compute which preset an existing reminderAt matches.
 *  Returns "none" if no reminder, "custom" if it doesn't match any preset. */
export function getReminderOffset(
  dueIso: string | null,
  reminderIso: string | null
): ReminderOffset | "custom" {
  if (!reminderIso) return "none";
  if (!dueIso) return "none";
  const due = new Date(dueIso).getTime();
  const rem = new Date(reminderIso).getTime();
  const diff = due - rem;
  for (const [key, ms] of Object.entries(OFFSET_MS) as [ReminderOffset, number][]) {
    if (diff === ms) return key;
  }
  return "custom";
}
