import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Returns the numeric userId from the JWT session, or a 401 response. */
export async function requireUserId(): Promise<
  { userId: number; error: null } | { userId: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: parseInt(session.user.id, 10), error: null };
}
