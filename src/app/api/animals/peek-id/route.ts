import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { peekAnimalId } from "@/lib/animalId/generate";

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const species = searchParams.get("species") || undefined;
  const intakeDate = searchParams.get("intakeDate") || new Date().toISOString();

  const preview = await peekAnimalId(orgId, intakeDate, species);
  return NextResponse.json({ preview });
}
