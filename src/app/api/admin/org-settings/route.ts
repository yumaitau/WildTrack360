import { NextResponse } from "next/server";
import { auth } from "@/lib/clerk-server";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/rbac";
import { sanitizePlainText } from "@/lib/sanitize";
import { route } from "@/lib/openapi/route";
import { getOrgSettingsContract, updateOrgSettingsContract } from "../openapi";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = route(getOrgSettingsContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(userId, orgId);
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.organisationSettings.findUnique({ where: { clerkOrganisationId: orgId } });
  return {
    data: settings ?? {
      clerkOrganisationId: orgId,
      orgShortCode: "ORG",
      animalIdTemplate: "{ORG_SHORT}-{YYYY}-{seq:4}",
      contactEmail: null,
      contactPhone: null,
      licenseNumber: null,
    },
  };
});

export const PATCH = route(updateOrgSettingsContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(userId, orgId);
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const {
    orgShortCode, animalIdTemplate, contactEmail, contactPhone,
    licenseNumber, legalName, abn, dgrEndorsed, donationThankYouMessage, membershipThankYouMessage,
  } = body as Record<string, unknown>;

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

  const normalisedEmail = normaliseOptional(contactEmail, "contactEmail");
  if (normalisedEmail instanceof Response) return normalisedEmail;
  if (normalisedEmail.value && normalisedEmail.value.length > 254) return NextResponse.json({ error: "Contact email is too long" }, { status: 400 });
  if (normalisedEmail.value && !EMAIL_PATTERN.test(normalisedEmail.value)) return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });

  const normalisedPhone = normaliseOptional(contactPhone, "contactPhone");
  if (normalisedPhone instanceof Response) return normalisedPhone;
  if (normalisedPhone.value && normalisedPhone.value.length > 30) return NextResponse.json({ error: "Contact phone is too long" }, { status: 400 });

  const normalisedLicense = normaliseOptional(licenseNumber, "licenseNumber");
  if (normalisedLicense instanceof Response) return normalisedLicense;
  if (normalisedLicense.value && normalisedLicense.value.length > 50) return NextResponse.json({ error: "Licence number is too long" }, { status: 400 });

  const normalisedLegalName = normaliseOptional(legalName, "legalName");
  if (normalisedLegalName instanceof Response) return normalisedLegalName;
  if (normalisedLegalName.value && normalisedLegalName.value.length > 200) return NextResponse.json({ error: "Legal name is too long" }, { status: 400 });

  const normalisedAbn = normaliseOptional(abn, "abn");
  if (normalisedAbn instanceof Response) return normalisedAbn;
  if (normalisedAbn.value && !/^\d{11}$/.test(normalisedAbn.value.replace(/\s/g, ""))) return NextResponse.json({ error: "ABN must be 11 digits" }, { status: 400 });

  if (dgrEndorsed != null && typeof dgrEndorsed !== "boolean") return NextResponse.json({ error: "Invalid DGR flag" }, { status: 400 });

  const normalisedDonationMsg = normaliseOptional(donationThankYouMessage, "donationThankYouMessage");
  if (normalisedDonationMsg instanceof Response) return normalisedDonationMsg;
  if (normalisedDonationMsg.value && normalisedDonationMsg.value.length > 1000) return NextResponse.json({ error: "Donation message is too long" }, { status: 400 });

  const normalisedMembershipMsg = normaliseOptional(membershipThankYouMessage, "membershipThankYouMessage");
  if (normalisedMembershipMsg instanceof Response) return normalisedMembershipMsg;
  if (normalisedMembershipMsg.value && normalisedMembershipMsg.value.length > 1000) return NextResponse.json({ error: "Membership message is too long" }, { status: 400 });

  const clean = (v: string | null, allowNewlines = false) =>
    v == null ? null : sanitizePlainText(v, { allowNewlines }) || null;

  const data: Record<string, string | boolean | null> = {};
  if (typeof orgShortCode === "string") data.orgShortCode = orgShortCode.trim();
  if (typeof animalIdTemplate === "string") data.animalIdTemplate = animalIdTemplate.trim();
  if (normalisedEmail.provided) data.contactEmail = clean(normalisedEmail.value);
  if (normalisedPhone.provided) data.contactPhone = clean(normalisedPhone.value);
  if (normalisedLicense.provided) data.licenseNumber = clean(normalisedLicense.value);
  if (normalisedLegalName.provided) data.legalName = clean(normalisedLegalName.value);
  if (normalisedAbn.provided) data.abn = normalisedAbn.value;
  if (typeof dgrEndorsed === "boolean") data.dgrEndorsed = dgrEndorsed;
  if (normalisedDonationMsg.provided) data.donationThankYouMessage = clean(normalisedDonationMsg.value, true);
  if (normalisedMembershipMsg.provided) data.membershipThankYouMessage = clean(normalisedMembershipMsg.value, true);

  const settings = await prisma.organisationSettings.upsert({
    where: { clerkOrganisationId: orgId },
    create: { clerkOrganisationId: orgId, ...data },
    update: data,
  });

  return { data: settings };
});

type NormalisedOptional = { provided: boolean; value: string | null };

function normaliseOptional(raw: unknown, field: string): NormalisedOptional | Response {
  if (raw === undefined) return { provided: false, value: null };
  if (raw === null) return { provided: true, value: null };
  if (typeof raw !== "string") return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
  const trimmed = raw.trim();
  return { provided: true, value: trimmed.length === 0 ? null : trimmed };
}
