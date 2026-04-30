import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestPriority } from "@/lib/priority";

export async function POST(
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

  const suggestion = suggestPriority({
    manualPriority: existing.manualPriority,
    dueAt: existing.dueAt,
    isBlocked: existing.isBlocked,
    updatedAt: new Date(),
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "completed",
      completedAt: new Date(),
      suggestedPriority: suggestion.priority,
      priorityScore: suggestion.score,
      priorityReason: suggestion.reason,
    },
  });

  return NextResponse.json(task);
}
