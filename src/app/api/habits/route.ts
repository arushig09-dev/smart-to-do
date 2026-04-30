import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
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
      // allow yesterday to count if today not yet logged
      streak++;
      cursor = d - 86400000;
    } else {
      break;
    }
  }
  return streak;
}

export async function GET() {
  const habits = await prisma.habit.findMany({
    where: { isArchived: false },
    include: {
      entries: {
        where: {
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const withStreak = habits.map((h) => ({
    ...h,
    streak: calcStreak(h.entries),
    completedToday: h.entries.some(
      (e) => new Date(e.date).setHours(0, 0, 0, 0) === todayStart().getTime()
    ),
  }));

  return NextResponse.json(withStreak);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, emoji, color, targetDays } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const habit = await prisma.habit.create({
    data: {
      name: name.trim(),
      emoji: emoji || null,
      color: color || "#059669",
      targetDays: targetDays ?? 7,
    },
    include: { entries: true },
  });

  return NextResponse.json({ ...habit, streak: 0, completedToday: false }, { status: 201 });
}
