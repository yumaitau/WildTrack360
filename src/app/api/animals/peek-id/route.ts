import { NextResponse } from "next/server";
import { auth } from "@/lib/clerk-server";
import { peekAnimalId } from "@/lib/animalId/generate";
import { route } from "@/lib/openapi/route";
import { peekAnimalIdContract } from "../openapi";

export const GET = route(peekAnimalIdContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const species = query.species || undefined;
  const intakeDate = query.intakeDate || new Date().toISOString();

  const preview = await peekAnimalId(orgId, intakeDate, species);
  return { data: { preview } };
});
