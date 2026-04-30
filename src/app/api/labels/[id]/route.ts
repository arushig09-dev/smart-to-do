import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const labelId = parseInt(id, 10);
  if (isNaN(labelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji || null;
  if (body.color !== undefined) data.color = body.color;

  const label = await prisma.label.update({ where: { id: labelId }, data });
  return NextResponse.json(label);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const labelId = parseInt(id, 10);
  if (isNaN(labelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.label.delete({ where: { id: labelId } });
  return NextResponse.json({ ok: true });
}
