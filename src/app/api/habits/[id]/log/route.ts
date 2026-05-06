import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireUserId();
  if (error) {
    console.error("[habit log] requireUserId failed");
    return error;
  }

  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { localDate } = body as { localDate?: string };
  console.log(`[habit log] userId=${userId} habitId=${habitId} localDate=${localDate}`);
  const today = localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ? new Date(`${localDate}T00:00:00.000Z`)
    : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();

  const existing = await prisma.habitEntry.findUnique({
    where: { habitId_date: { habitId, date: today } },
  });

  if (existing) {
    await prisma.habitEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ logged: false });
  }

  try {
    await prisma.habitEntry.create({ data: { habitId, date: today, userId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[habit log] create failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ logged: true });
}
