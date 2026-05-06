import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

function todayStart(localDate?: string | null): Date {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return new Date(`${localDate}T00:00:00.000Z`);
  }
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function calcStreak(entries: { date: Date | string }[]): number {
  const dates = entries
    .map((e) => new Date(e.date).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  let streak = 0;
  let cursor = new Date().setHours(0, 0, 0, 0);

  for (const d of dates) {
    if (d === cursor) {
      streak++;
      cursor = cursor - 86400000;
    } else if (d === cursor - 86400000) {
      streak++;
      cursor = d - 86400000;
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const sectionId  = searchParams.get("sectionId");
  const projectId  = searchParams.get("projectId");
  const localDate  = searchParams.get("localDate"); // client's local YYYY-MM-DD

  const where: Record<string, unknown> = { isArchived: false, userId };
  if (sectionId) where.linkedSectionId = parseInt(sectionId, 10);
  if (projectId) where.linkedProjectId = parseInt(projectId, 10);

  const habits = await prisma.habit.findMany({
    where,
    include: {
      entries: {
        where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const withStreak = habits.map((h) => ({
    ...h,
    streak: calcStreak(h.entries),
    completedToday: h.entries.some(
      (e) => new Date(e.date).getTime() === todayStart(localDate).getTime()
    ),
  }));

  return NextResponse.json(withStreak);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const { name, emoji, color, targetDays, goal, daysOfWeek, linkedProjectId, linkedSectionId } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const habit = await prisma.habit.create({
    data: {
      name: name.trim(),
      emoji: emoji || null,
      color: color || "#059669",
      targetDays: targetDays ?? 7,
      goal: goal?.trim() || null,
      daysOfWeek: daysOfWeek || null,
      linkedProjectId: linkedProjectId || null,
      linkedSectionId: linkedSectionId || null,
      userId,
    },
    include: { entries: true },
  });

  return NextResponse.json({ ...habit, streak: 0, completedToday: false }, { status: 201 });
}
