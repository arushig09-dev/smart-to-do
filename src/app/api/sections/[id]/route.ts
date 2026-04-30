import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sectionId = parseInt(id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.order !== undefined) data.order = body.order;

  const section = await prisma.section.update({ where: { id: sectionId }, data });
  return NextResponse.json(section);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sectionId = parseInt(id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.section.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}
