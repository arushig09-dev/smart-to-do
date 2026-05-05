import { describe, it, expect, beforeEach, vi } from "vitest";
import { suggestPriority } from "@/lib/priority";

const FIXED_NOW = new Date("2026-01-15T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const recentlyUpdated = FIXED_NOW; // same as now → age = 0h → "recently updated" bonus (+3)
const oldUpdate = new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000); // 24h ago → no bonus

describe("suggestPriority — manual priority is authoritative", () => {
  it("P0 manual → score 100, priority P0", () => {
    const r = suggestPriority({ manualPriority: "P0", dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P0");
    expect(r.score).toBe(100);
    expect(r.reason).toMatch(/Manually set to P0/i);
  });

  it("P1 manual → score 60, priority P1", () => {
    const r = suggestPriority({ manualPriority: "P1", dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P1");
    expect(r.score).toBe(60);
  });

  it("P2 manual → score 30, priority P2", () => {
    const r = suggestPriority({ manualPriority: "P2", dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P2");
    expect(r.score).toBe(30);
  });

  it("manual priority ignores due date signals", () => {
    const overdue = new Date(FIXED_NOW.getTime() - 48 * 60 * 60 * 1000);
    const r = suggestPriority({ manualPriority: "P2", dueAt: overdue, isBlocked: false, updatedAt: oldUpdate });
    // Score stays at 30 despite overdue — manual wins
    expect(r.priority).toBe("P2");
    expect(r.score).toBe(30);
  });
});

describe("suggestPriority — derived from signals (no manual priority)", () => {
  it("overdue task → score 50 → P1", () => {
    const overdue = new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const r = suggestPriority({ manualPriority: null, dueAt: overdue, isBlocked: false, updatedAt: oldUpdate });
    expect(r.score).toBe(50);
    expect(r.priority).toBe("P1");
    expect(r.reason).toContain("Overdue");
  });

  it("due within 24h → score 35 → P2 (threshold for P1 is 40)", () => {
    const soon = new Date(FIXED_NOW.getTime() + 12 * 60 * 60 * 1000); // in 12h
    const r = suggestPriority({ manualPriority: null, dueAt: soon, isBlocked: false, updatedAt: oldUpdate });
    expect(r.score).toBe(35);
    expect(r.priority).toBe("P2"); // 35 < 40 threshold for P1
    expect(r.reason).toContain("Due in 24h");
  });

  it("due within 24h + recently updated → score 38 → P2", () => {
    const soon = new Date(FIXED_NOW.getTime() + 12 * 60 * 60 * 1000);
    const r = suggestPriority({ manualPriority: null, dueAt: soon, isBlocked: false, updatedAt: recentlyUpdated });
    expect(r.score).toBe(38); // 35 + 3 recency
    expect(r.priority).toBe("P2"); // still < 40
  });

  it("due in 3 days → score 20 → P2", () => {
    const d = new Date(FIXED_NOW.getTime() + 48 * 60 * 60 * 1000); // in 48h
    const r = suggestPriority({ manualPriority: null, dueAt: d, isBlocked: false, updatedAt: oldUpdate });
    expect(r.score).toBe(20);
    expect(r.priority).toBe("P2");
    expect(r.reason).toContain("Due in 3 days");
  });

  it("no due date, no recency → score 0 → P2, reason fallback", () => {
    const r = suggestPriority({ manualPriority: null, dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.score).toBe(0);
    expect(r.priority).toBe("P2");
    expect(r.reason).toBe("No strong signals");
  });

  it("recently updated (within 12h) adds +3 to score", () => {
    const r = suggestPriority({ manualPriority: null, dueAt: null, isBlocked: false, updatedAt: recentlyUpdated });
    expect(r.score).toBe(3);
    expect(r.reason).toContain("Recently updated");
  });
});

describe("suggestPriority — blocked flag", () => {
  it("blocked task gets -100 score → P2", () => {
    const r = suggestPriority({ manualPriority: null, dueAt: null, isBlocked: true, updatedAt: oldUpdate });
    expect(r.score).toBe(-100);
    expect(r.priority).toBe("P2");
    expect(r.reason).toContain("Blocked");
  });

  it("blocked + overdue still results in P2 (blocked penalty dominates)", () => {
    const overdue = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000);
    const r = suggestPriority({ manualPriority: null, dueAt: overdue, isBlocked: true, updatedAt: oldUpdate });
    // -100 + 50 = -50 → P2
    expect(r.score).toBe(-50);
    expect(r.priority).toBe("P2");
    expect(r.reason).toContain("Blocked");
    expect(r.reason).toContain("Overdue");
  });
});

describe("suggestPriority — score-to-priority thresholds", () => {
  it("score >= 80 → P0", () => {
    // Need manual P0 (score=100) or craft a scenario; overdue(50) + recently updated(3) = 53 < 80
    // Manual is the only way to get ≥80 via returned score
    const r = suggestPriority({ manualPriority: "P0", dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P0");
  });

  it("score 40–79 → P1", () => {
    const r = suggestPriority({ manualPriority: "P1", dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P1");
  });

  it("score < 40 → P2", () => {
    const r = suggestPriority({ manualPriority: null, dueAt: null, isBlocked: false, updatedAt: oldUpdate });
    expect(r.priority).toBe("P2");
  });
});
