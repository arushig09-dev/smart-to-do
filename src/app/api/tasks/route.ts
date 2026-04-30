import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestPriority } from "@/lib/priority";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "inbox";
  const q = searchParams.get("q") || "";
  const projectId = searchParams.get("projectId");
  const sectionId = searchParams.get("sectionId");
  const labelId = searchParams.get("labelId");
  const parentTaskId = searchParams.get("parentTaskId");

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q, mode: "insensitive" };

  if (projectId) where.projectId = parseInt(projectId, 10);
  if (sectionId) where.sectionId = parseInt(sectionId, 10);
  if (labelId) where.labels = { some: { labelId: parseInt(labelId, 10) } };
  if (parentTaskId) where.parentTaskId = parseInt(parentTaskId, 10);

  if (!projectId && !sectionId && !labelId && !parentTaskId) {
    if (view === "inbox") {
      where.status = "open";
    } else if (view === "upcoming") {
      where.status = "open";
      where.dueAt = { not: null };
    } else if (view === "today") {
      where.status = "open";
      where.isBlocked = false;
    }
  }

  let orderBy: Record<string, string>[] = [{ createdAt: "desc" }];
  if (view === "upcoming") orderBy = [{ dueAt: "asc" }];
  if (view === "today") orderBy = [{ priorityScore: "desc" }];
  if (projectId || sectionId) orderBy = [{ order: "asc" }, { createdAt: "asc" }];

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, emoji: true, color: true } },
      section: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      subtasks: { select: { id: true, title: true, status: true } },
    },
    orderBy,
    take: view === "today" ? 10 : 200,
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, notes, dueAt, manualPriority, isBlocked, projectId, sectionId, parentTaskId, labelIds } = body;

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
      projectId: projectId ? parseInt(projectId, 10) : null,
      sectionId: sectionId ? parseInt(sectionId, 10) : null,
      parentTaskId: parentTaskId ? parseInt(parentTaskId, 10) : null,
      labels: labelIds?.length
        ? { create: labelIds.map((id: number) => ({ labelId: id })) }
        : undefined,
    },
    include: {
      project: { select: { id: true, name: true, emoji: true } },
      section: { select: { id: true, name: true } },
      labels: { include: { label: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
