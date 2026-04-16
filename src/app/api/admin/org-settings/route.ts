import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/rbac";

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(userId, orgId);
  if (role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });

  return NextResponse.json(
    settings ?? {
      clerkOrganisationId: orgId,
      orgShortCode: "ORG",
      animalIdTemplate: "{ORG_SHORT}-{YYYY}-{seq:4}",
    }
  );
}

export async function PATCH(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(userId, orgId);
  if (role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { orgShortCode, animalIdTemplate } = body as Record<string, unknown>;

  // Basic validation — reject non-strings, empty strings, and oversized values
  if (orgShortCode != null) {
    if (typeof orgShortCode !== "string" || orgShortCode.trim().length === 0 || orgShortCode.length > 20) {
      return NextResponse.json({ error: "Invalid org short code" }, { status: 400 });
    }
  }
  if (animalIdTemplate != null) {
    if (typeof animalIdTemplate !== "string" || animalIdTemplate.trim().length === 0 || animalIdTemplate.length > 100) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
  }

  const data: Record<string, string> = {};
  if (typeof orgShortCode === "string") data.orgShortCode = orgShortCode.trim();
  if (typeof animalIdTemplate === "string") data.animalIdTemplate = animalIdTemplate.trim();

  const settings = await prisma.organisationSettings.upsert({
    where: { clerkOrganisationId: orgId },
    create: {
      clerkOrganisationId: orgId,
      ...data,
    },
    update: data,
  });

  return NextResponse.json(settings);
}
