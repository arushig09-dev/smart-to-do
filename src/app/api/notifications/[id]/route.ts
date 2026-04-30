import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifId = parseInt(id, 10);
  if (isNaN(notifId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const notification = await prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true },
  });

  return NextResponse.json(notification);
}
