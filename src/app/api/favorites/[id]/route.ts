import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const favId = parseInt(id, 10);
  if (isNaN(favId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.favorite.delete({ where: { id: favId } });
  return NextResponse.json({ ok: true });
}
