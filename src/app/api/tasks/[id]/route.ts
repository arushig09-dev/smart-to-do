import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestPriority } from "@/lib/priority";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = (body.title || "").trim();
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.manualPriority !== undefined) data.manualPriority = body.manualPriority || null;
  if (body.isBlocked !== undefined) data.isBlocked = !!body.isBlocked;
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "completed") data.completedAt = new Date();
    else data.completedAt = null;
  }

  const merged = {
    manualPriority: (data.manualPriority ?? existing.manualPriority) as string | null,
    dueAt: (data.dueAt ?? existing.dueAt) as Date | null,
    isBlocked: (data.isBlocked ?? existing.isBlocked) as boolean,
    updatedAt: new Date(),
  };

  const suggestion = suggestPriority(merged);
  data.suggestedPriority = suggestion.priority;
  data.priorityScore = suggestion.score;
  data.priorityReason = suggestion.reason;

  const task = await prisma.task.update({ where: { id: taskId }, data });
  return NextResponse.json(task);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
