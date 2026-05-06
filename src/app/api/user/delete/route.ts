import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  // Delete all user-owned data in dependency order
  await prisma.$transaction([
    prisma.categoryCorrection.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.favorite.deleteMany({ where: { userId } }),
    prisma.smartView.deleteMany({ where: { userId } }),
    prisma.label.deleteMany({ where: { userId } }),
    prisma.recipe.deleteMany({ where: { userId } }),
    prisma.babyFeedLog.deleteMany({ where: { userId } }),
    prisma.habitEntry.deleteMany({ where: { userId } }),
    prisma.habit.deleteMany({ where: { userId } }),
    // Clear subtask parent references before deleting tasks
    prisma.task.updateMany({ where: { userId }, data: { parentTaskId: null } }),
    prisma.taskLabel.deleteMany({ where: { task: { userId } } }),
    prisma.task.deleteMany({ where: { userId } }),
    // Projects / sections
    prisma.section.deleteMany({ where: { project: { userId } } }),
    prisma.project.deleteMany({ where: { userId } }),
    // User record last
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
