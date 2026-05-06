import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { seedUserProjectsWithPersona } from "@/lib/userOnboarding";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const workPersona: string = body.workPersona ?? "default";
  const personalTracks: string[] = Array.isArray(body.personalTracks) ? body.personalTracks : [];
  const customTracks: string[] = Array.isArray(body.customTracks) ? body.customTracks : [];

  // Check not already onboarded
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.onboardingDone) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Save selections and seed projects
  await prisma.user.update({
    where: { id: userId },
    data: { workPersona, personalTracks, onboardingDone: true },
  });

  await seedUserProjectsWithPersona(userId, workPersona, personalTracks, customTracks);

  return NextResponse.json({ ok: true });
}
