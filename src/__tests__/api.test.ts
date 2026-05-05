/**
 * API route tests — verifies that:
 * 1. Every protected route returns 401 when the user is not authenticated
 * 2. Authenticated routes scope data to the logged-in userId
 * 3. Our bug fix: categorize scopes projects to the current user's userId
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock requireUserId ────────────────────────────────────────────────────────

const mockRequireUserId = vi.fn();

vi.mock("@/lib/requireUser", () => ({
  requireUserId: () => mockRequireUserId(),
}));

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  task: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  habit: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  habitEntry: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  section: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// ── Mock suggestPriority ──────────────────────────────────────────────────────

vi.mock("@/lib/priority", () => ({
  suggestPriority: vi.fn().mockReturnValue({ priority: "P2", score: 0, reason: "mock" }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: object, searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/test");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function authed(userId = 1) {
  mockRequireUserId.mockResolvedValue({ userId, error: null });
}

function notAuthed() {
  const { NextResponse } = require("next/server");
  mockRequireUserId.mockResolvedValue({
    userId: null,
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// /api/tasks
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { GET } = await import("@/app/api/tasks/route");
    const res = await GET(makeRequest("GET", undefined, { view: "todo" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and filters tasks by userId", async () => {
    authed(7);
    mockPrisma.task.findMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/tasks/route");
    const res = await GET(makeRequest("GET", undefined, { view: "todo" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) })
    );
  });
});

describe("POST /api/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { POST } = await import("@/app/api/tasks/route");
    const res = await POST(makeRequest("POST", { title: "Test task" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    authed(7);
    const { POST } = await import("@/app/api/tasks/route");
    const res = await POST(makeRequest("POST", { title: "" }));
    expect(res.status).toBe(400);
  });

  it("creates task with the logged-in userId", async () => {
    authed(7);
    mockPrisma.task.create.mockResolvedValue({ id: 1, title: "Test task", userId: 7 });
    const { POST } = await import("@/app/api/tasks/route");
    const res = await POST(makeRequest("POST", { title: "Test task" }));
    expect(res.status).toBe(201);
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 7 }),
      })
    );
  });

  it("does NOT include another user's projectId in the create call if none sent", async () => {
    authed(7);
    mockPrisma.task.create.mockResolvedValue({ id: 1, title: "Clean desk", userId: 7 });
    const { POST } = await import("@/app/api/tasks/route");
    await POST(makeRequest("POST", { title: "Clean desk" })); // no projectId sent
    const createCall = mockPrisma.task.create.mock.calls[0][0];
    expect(createCall.data.projectId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// /api/categorize  — THE CRITICAL BUG FIX TEST
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/categorize", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { POST } = await import("@/app/api/categorize/route");
    const res = await POST(makeRequest("POST", { title: "Buy groceries" }));
    expect(res.status).toBe(401);
  });

  it("scopes project lookup to the logged-in userId — not all users", async () => {
    authed(42);
    mockPrisma.project.findMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/categorize/route");
    await POST(makeRequest("POST", { title: "Buy groceries" }));

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 42 }),
      })
    );
  });

  it("returns null when title is empty", async () => {
    authed(1);
    const { POST } = await import("@/app/api/categorize/route");
    const res = await POST(makeRequest("POST", { title: "" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns a suggestion only from the user's own projects", async () => {
    authed(5);
    // Simulate user 5's projects — a Fitness project with matching section
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: 999, name: "Fitness & Wellness", userId: 5, isArchived: false,
        sections: [{ id: 8888, name: "Workouts", order: 0 }],
      },
    ]);
    const { POST } = await import("@/app/api/categorize/route");
    const res = await POST(makeRequest("POST", { title: "gym workout" }));
    const data = await res.json();
    // Must return the user's actual project/section IDs, not any hardcoded values
    expect(data.projectId).toBe(999);
    expect(data.sectionId).toBe(8888);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// /api/habits
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/habits", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { GET } = await import("@/app/api/habits/route");
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("filters habits by userId", async () => {
    authed(3);
    mockPrisma.habit.findMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/habits/route");
    await GET(makeRequest("GET"));
    expect(mockPrisma.habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 3 }),
      })
    );
  });
});

describe("POST /api/habits", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { POST } = await import("@/app/api/habits/route");
    const res = await POST(makeRequest("POST", { name: "Meditation" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when habit name is empty", async () => {
    authed(3);
    const { POST } = await import("@/app/api/habits/route");
    const res = await POST(makeRequest("POST", { name: "" }));
    expect(res.status).toBe(400);
  });

  it("creates habit with logged-in userId", async () => {
    authed(3);
    mockPrisma.habit.create.mockResolvedValue({
      id: 1, name: "Meditation", userId: 3, entries: [],
    });
    const { POST } = await import("@/app/api/habits/route");
    const res = await POST(makeRequest("POST", { name: "Meditation" }));
    expect(res.status).toBe(201);
    expect(mockPrisma.habit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 3, name: "Meditation" }),
      })
    );
  });

  it("passes linkedProjectId / linkedSectionId as null when omitted", async () => {
    authed(3);
    mockPrisma.habit.create.mockResolvedValue({ id: 1, name: "Meditation", userId: 3, entries: [] });
    const { POST } = await import("@/app/api/habits/route");
    await POST(makeRequest("POST", { name: "Meditation" }));
    const data = mockPrisma.habit.create.mock.calls[0][0].data;
    expect(data.linkedProjectId).toBeNull();
    expect(data.linkedSectionId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// /api/sections
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/sections", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { GET } = await import("@/app/api/sections/route");
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("scopes sections to the authenticated user's projects", async () => {
    authed(8);
    mockPrisma.section.findMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/sections/route");
    await GET(makeRequest("GET", undefined, { projectId: "55" }));
    expect(mockPrisma.section.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project: { userId: 8 } }),
      })
    );
  });
});

describe("POST /api/sections", () => {
  it("returns 401 when not authenticated", async () => {
    notAuthed();
    const { POST } = await import("@/app/api/sections/route");
    const res = await POST(makeRequest("POST", { name: "New Section", projectId: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 404 if project does not belong to the user", async () => {
    authed(8);
    // findUnique returns null → project not owned by user 8
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/sections/route");
    const res = await POST(makeRequest("POST", { name: "Section", projectId: 1 }));
    expect(res.status).toBe(404);
  });

  it("creates section when project is owned by the user", async () => {
    authed(8);
    mockPrisma.project.findUnique.mockResolvedValue({ id: 1, userId: 8, name: "Work" });
    mockPrisma.section.create.mockResolvedValue({ id: 99, name: "New Section", projectId: 1 });
    const { POST } = await import("@/app/api/sections/route");
    const res = await POST(makeRequest("POST", { name: "New Section", projectId: 1 }));
    expect(res.status).toBe(201);
    // Verify ownership check used the correct userId
    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, userId: 8 } })
    );
  });
});
