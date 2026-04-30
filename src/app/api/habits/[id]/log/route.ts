import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Toggle: if already logged today, delete it; otherwise create
  const existing = await prisma.habitEntry.findUnique({
    where: { habitId_date: { habitId, date: today } },
  });

  if (existing) {
    await prisma.habitEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ logged: false });
  }

  await prisma.habitEntry.create({ data: { habitId, date: today } });
  return NextResponse.json({ logged: true });
}
