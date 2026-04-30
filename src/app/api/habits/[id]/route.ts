import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji || null;
  if (body.color !== undefined) data.color = body.color;
  if (body.targetDays !== undefined) data.targetDays = body.targetDays;
  if (body.isArchived !== undefined) data.isArchived = !!body.isArchived;
  if (body.order !== undefined) data.order = body.order;

  const habit = await prisma.habit.update({ where: { id: habitId }, data });
  return NextResponse.json(habit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.habit.delete({ where: { id: habitId } });
  return NextResponse.json({ ok: true });
}
