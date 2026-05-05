import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji || null;
  if (body.color !== undefined) data.color = body.color;
  if (body.targetDays !== undefined) data.targetDays = body.targetDays;
  if (body.goal !== undefined) data.goal = body.goal?.trim() || null;
  if (body.daysOfWeek !== undefined) data.daysOfWeek = body.daysOfWeek || null;
  if (body.linkedProjectId !== undefined) data.linkedProjectId = body.linkedProjectId || null;
  if (body.linkedSectionId !== undefined) data.linkedSectionId = body.linkedSectionId || null;
  if (body.isArchived !== undefined) data.isArchived = !!body.isArchived;
  if (body.order !== undefined) data.order = body.order;

  const habit = await prisma.habit.update({ where: { id: habitId, userId }, data });
  return NextResponse.json(habit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.habit.delete({ where: { id: habitId, userId } });
  return NextResponse.json({ ok: true });
}
