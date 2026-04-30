import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FilterJson = {
  dueBefore?: string;
  dueAfter?: string;
  status?: string;
  priority?: string[];
  groupBy?: string;
};

function resolveDateBound(value: string): Date {
  const now = new Date();
  if (value === "endOfWeek") {
    const d = new Date(now);
    d.setDate(now.getDate() + (7 - now.getDay()));
    d.setHours(23, 59, 59, 999);
    return d;
  }
  if (value === "endOfNextWeek") {
    const d = new Date(now);
    d.setDate(now.getDate() + (14 - now.getDay()));
    d.setHours(23, 59, 59, 999);
    return d;
  }
  if (value === "30days") {
    const d = new Date(now);
    d.setDate(now.getDate() + 30);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return new Date(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewId = parseInt(id, 10);
  if (isNaN(viewId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const view = await prisma.smartView.findUnique({ where: { id: viewId } });
  if (!view) return NextResponse.json({ error: "View not found" }, { status: 404 });

  const filter = view.filterJson as FilterJson;
  const where: Record<string, unknown> = {};

  if (filter.status) where.status = filter.status;

  if (filter.priority) {
    where.suggestedPriority = { in: filter.priority };
  }

  const dueFilter: Record<string, unknown> = {};
  if (filter.dueBefore) dueFilter.lte = resolveDateBound(filter.dueBefore);
  if (filter.dueAfter) dueFilter.gte = resolveDateBound(filter.dueAfter);
  if (Object.keys(dueFilter).length > 0) {
    where.dueAt = dueFilter;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, emoji: true, color: true } },
      section: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      subtasks: { select: { id: true, title: true, status: true } },
    },
    orderBy: [{ dueAt: "asc" }, { priorityScore: "desc" }],
    take: 200,
  });

  // Group by work vs personal based on top-level project ancestry
  if (filter.groupBy === "project") {
    const grouped: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      const bucket = task.project?.name ?? "Inbox";
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(task);
    }
    return NextResponse.json({ view, grouped, tasks });
  }

  return NextResponse.json({ view, tasks });
}
