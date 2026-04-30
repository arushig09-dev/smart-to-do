import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji || null;
  if (body.color !== undefined) data.color = body.color;
  if (body.isFavorite !== undefined) data.isFavorite = !!body.isFavorite;
  if (body.isArchived !== undefined) data.isArchived = !!body.isArchived;
  if (body.order !== undefined) data.order = body.order;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;

  const project = await prisma.project.update({ where: { id: projectId }, data });
  return NextResponse.json(project);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ ok: true });
}
