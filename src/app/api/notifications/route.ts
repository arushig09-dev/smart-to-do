import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const where = userId ? { userId: parseInt(userId, 10), isRead: false } : { isRead: false };

  const notifications = await prisma.notification.findMany({
    where,
    include: { task: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}
