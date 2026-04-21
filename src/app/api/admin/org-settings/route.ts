import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/rbac";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      contactEmail: null,
      contactPhone: null,
      licenseNumber: null,
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

  const { orgShortCode, animalIdTemplate, contactEmail, contactPhone, licenseNumber } =
    body as Record<string, unknown>;

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

  // Optional contact fields: allow "" (or null) to clear, validate format when present.
  const normalisedEmail = normaliseOptional(contactEmail, "contactEmail");
  if (normalisedEmail instanceof Response) return normalisedEmail;
  // Length cap must run before the regex to bound worst-case regex runtime (ReDoS defence).
  if (normalisedEmail.value && normalisedEmail.value.length > 254) {
    return NextResponse.json({ error: "Contact email is too long" }, { status: 400 });
  }
  if (normalisedEmail.value && !EMAIL_PATTERN.test(normalisedEmail.value)) {
    return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });
  }

  const normalisedPhone = normaliseOptional(contactPhone, "contactPhone");
  if (normalisedPhone instanceof Response) return normalisedPhone;
  if (normalisedPhone.value && normalisedPhone.value.length > 30) {
    return NextResponse.json({ error: "Contact phone is too long" }, { status: 400 });
  }

  const normalisedLicense = normaliseOptional(licenseNumber, "licenseNumber");
  if (normalisedLicense instanceof Response) return normalisedLicense;
  if (normalisedLicense.value && normalisedLicense.value.length > 50) {
    return NextResponse.json({ error: "Licence number is too long" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if (typeof orgShortCode === "string") data.orgShortCode = orgShortCode.trim();
  if (typeof animalIdTemplate === "string") data.animalIdTemplate = animalIdTemplate.trim();
  if (normalisedEmail.provided) data.contactEmail = normalisedEmail.value;
  if (normalisedPhone.provided) data.contactPhone = normalisedPhone.value;
  if (normalisedLicense.provided) data.licenseNumber = normalisedLicense.value;

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

type NormalisedOptional = { provided: boolean; value: string | null };

function normaliseOptional(raw: unknown, field: string): NormalisedOptional | Response {
  if (raw === undefined) return { provided: false, value: null };
  if (raw === null) return { provided: true, value: null };
  if (typeof raw !== "string") {
    return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
  }
  const trimmed = raw.trim();
  return { provided: true, value: trimmed.length === 0 ? null : trimmed };
}
