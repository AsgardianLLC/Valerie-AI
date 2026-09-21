import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { checkUsage } from "@/lib/rateLimit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await checkUsage(user.id, user.email);
  return NextResponse.json(usage);
}
