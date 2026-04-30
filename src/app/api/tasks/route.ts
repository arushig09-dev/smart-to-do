import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestPriority } from "@/lib/priority";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "inbox";
  const q = searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q };

  if (view === "inbox") {
    where.status = "open";
  } else if (view === "upcoming") {
    where.status = "open";
    where.dueAt = { not: null };
  } else if (view === "today") {
    where.status = "open";
    where.isBlocked = false;
  }

  let orderBy: Record<string, string>[] = [{ createdAt: "desc" }];
  if (view === "upcoming") orderBy = [{ dueAt: "asc" }];
  if (view === "today") orderBy = [{ priorityScore: "desc" }];

  let tasks = await prisma.task.findMany({
    where,
    orderBy,
    take: view === "today" ? 10 : 100,
  });

  if (view === "today") {
    tasks = tasks.sort((a, b) => (b.priorityScore ?? -999) - (a.priorityScore ?? -999));
  }

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, notes, dueAt, manualPriority, isBlocked } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const now = new Date();
  const suggestion = suggestPriority({
    manualPriority: manualPriority || null,
    dueAt: dueAt ? new Date(dueAt) : null,
    isBlocked: !!isBlocked,
    updatedAt: now,
  });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      notes: notes || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      manualPriority: manualPriority || null,
      isBlocked: !!isBlocked,
      suggestedPriority: suggestion.priority,
      priorityScore: suggestion.score,
      priorityReason: suggestion.reason,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
