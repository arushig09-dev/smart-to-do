import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseTask } from "@/lib/nlp";

// Pin "now" so date assertions are deterministic
const FIXED_NOW = new Date("2026-01-15T10:00:00.000Z"); // Thursday Jan 15 2026 (UTC)

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper: local end-of-day offset from the fixed date
function eod(daysOffset = 0): Date {
  const d = new Date(FIXED_NOW);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(23, 59, 0, 0);
  return d;
}

describe("parseTask — title cleaning", () => {
  it("returns raw text untouched when no metadata is present", () => {
    const r = parseTask("Buy groceries");
    expect(r.title).toBe("Buy groceries");
    expect(r.dueAt).toBeNull();
    expect(r.manualPriority).toBeNull();
  });

  it("trims leading/trailing whitespace", () => {
    expect(parseTask("  Call dentist  ").title).toBe("Call dentist");
  });

  it("collapses double spaces left after keyword removal", () => {
    const r = parseTask("Submit report today high");
    expect(r.title).not.toMatch(/\s{2,}/);
  });

  it("strips trailing 'by' / 'due' artifact", () => {
    const r = parseTask("File taxes by");
    expect(r.title).toBe("File taxes");
  });
});

describe("parseTask — priority parsing", () => {
  it("detects P0 shorthand (case-insensitive)", () => {
    expect(parseTask("Fix bug P0").manualPriority).toBe("P0");
    expect(parseTask("Fix bug p0").manualPriority).toBe("P0");
  });

  it("detects P1 shorthand", () => {
    expect(parseTask("Review PR P1").manualPriority).toBe("P1");
  });

  it("detects P2 shorthand", () => {
    expect(parseTask("Read book P2").manualPriority).toBe("P2");
  });

  it("maps 'high' to P0", () => {
    expect(parseTask("Send email high").manualPriority).toBe("P0");
  });

  it("maps 'urgent' to P0", () => {
    expect(parseTask("urgent meeting").manualPriority).toBe("P0");
  });

  it("maps 'critical' to P0", () => {
    expect(parseTask("critical bug fix").manualPriority).toBe("P0");
  });

  it("maps 'medium' to P1", () => {
    expect(parseTask("Schedule interview medium").manualPriority).toBe("P1");
  });

  it("maps 'low' to P2", () => {
    expect(parseTask("Clean desk low").manualPriority).toBe("P2");
  });

  it("first match wins — 'urgent' beats 'low' when both appear", () => {
    // 'urgent' is parsed before 'low' in the code
    expect(parseTask("urgent errand low").manualPriority).toBe("P0");
  });

  it("removes priority keyword from the title", () => {
    const r = parseTask("Submit report high");
    expect(r.title).toBe("Submit report");
    expect(r.manualPriority).toBe("P0");
  });
});

describe("parseTask — due date: today / tonight / tomorrow", () => {
  it("sets dueAt to end of today for 'today'", () => {
    const r = parseTask("Call mom today");
    expect(r.dueAt).toEqual(eod(0));
    expect(r.dueLabel).toBe("Today");
    expect(r.title).toBe("Call mom");
  });

  it("sets dueAt to 21:00 today for 'tonight'", () => {
    const r = parseTask("Water plants tonight");
    const expected = new Date(FIXED_NOW);
    expected.setHours(21, 0, 0, 0);
    expect(r.dueAt).toEqual(expected);
    expect(r.dueLabel).toBe("Tonight");
  });

  it("sets dueAt to end of tomorrow for 'tomorrow'", () => {
    const r = parseTask("Pack bag tomorrow");
    expect(r.dueAt).toEqual(eod(1));
    expect(r.dueLabel).toBe("Tomorrow");
    expect(r.title).toBe("Pack bag");
  });
});

describe("parseTask — due date: relative days/weeks", () => {
  it("'in 3 days' → 3 days from now, end-of-day", () => {
    const r = parseTask("Submit report in 3 days");
    expect(r.dueAt).toEqual(eod(3));
    expect(r.dueLabel).toBe("In 3 days");
  });

  it("'in 1 week' → 7 days from now, end-of-day", () => {
    const r = parseTask("Renew passport in 1 week");
    expect(r.dueAt).toEqual(eod(7));
    expect(r.dueLabel).toBe("In 1 week");
  });
});

describe("parseTask — due date: weekday names", () => {
  it("'on Friday' sets next Friday", () => {
    // Fixed: Thursday Jan 15. Next Friday = Jan 16.
    const r = parseTask("Send invoice on Friday");
    const expected = new Date(FIXED_NOW);
    expected.setDate(expected.getDate() + 1); // +1 day → Friday Jan 16
    expected.setHours(23, 59, 0, 0);
    expect(r.dueAt).toEqual(expected);
  });

  it("'next Monday' is always at least 1 day ahead", () => {
    const r = parseTask("Start project next Monday");
    // Fixed: Thursday. Next Monday = 4 days forward (Jan 19)
    const expected = new Date(FIXED_NOW);
    expected.setDate(expected.getDate() + 4);
    expected.setHours(23, 59, 0, 0);
    expect(r.dueAt).toEqual(expected);
  });
});

describe("parseTask — combined metadata", () => {
  it("parses both due date and priority together", () => {
    const r = parseTask("File Q2 expenses by Friday high");
    expect(r.manualPriority).toBe("P0");
    expect(r.dueAt).not.toBeNull();
    expect(r.title).toBe("File Q2 expenses");
  });

  it("handles P-shorthand + tomorrow", () => {
    const r = parseTask("Review PR P1 tomorrow");
    expect(r.manualPriority).toBe("P1");
    expect(r.dueAt).toEqual(eod(1));
    expect(r.title).toBe("Review PR");
  });
});
