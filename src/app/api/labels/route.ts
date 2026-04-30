import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const labels = await prisma.label.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, emoji, color } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const label = await prisma.label.create({
    data: { name: name.trim(), emoji: emoji || null, color: color || "#6366f1" },
  });

  return NextResponse.json(label, { status: 201 });
}
