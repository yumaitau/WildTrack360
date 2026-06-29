import { NextResponse } from "next/server";
import { auth } from "@/lib/clerk-server";
import ExcelJS from "exceljs";
import { getEnrichedCarers } from "@/lib/carer-helpers";
import { type ActiveFilter, getLicenceStatus, type LicenceFilter } from "@/lib/carer-report-utils";
import { getUserRole, hasPermission } from "@/lib/rbac";
import type { EnrichedCarer } from "@/lib/types";
import { route } from "@/lib/openapi/route";
import { carerContactsReportContract } from "../openapi";

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function filterCarers(carers: EnrichedCarer[], active: ActiveFilter, specialty: string | null, licence: LicenceFilter) {
  return carers
    .filter((carer) => {
      if (active === "active" && !carer.active) return false;
      if (active === "inactive" && carer.active) return false;
      if (specialty && specialty !== "all" && !carer.specialties.includes(specialty)) return false;
      if (licence !== "all" && getLicenceStatus(carer.licenseExpiry) !== licence) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toRows(carers: EnrichedCarer[]) {
  return carers.map((carer) => ({
    name: carer.name, phone: carer.phone ?? "", email: carer.email,
    address: [carer.streetAddress, carer.suburb, carer.state, carer.postcode].filter(Boolean).join(", "),
    licenseNumber: carer.licenseNumber ?? "", licenseExpiry: formatDate(carer.licenseExpiry),
    licenceStatus: getLicenceStatus(carer.licenseExpiry), specialties: carer.specialties.join(", "),
    memberSince: formatDate(carer.memberSince), active: carer.active ? "Active" : "Inactive",
  }));
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  const safeText = text.replace(/^([\t\r\n]*)([=+\-@])/, "$1'$2");
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

export const GET = route(carerContactsReportContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, "user:manage") && !hasPermission(role, "carer:view_workload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = query.format === "csv" ? "csv" : "xlsx";
  const active = (query.active || "active") as ActiveFilter;
  const licence = (query.licence || "all") as LicenceFilter;
  const specialty = query.specialty ?? null;

  const carers = filterCarers(await getEnrichedCarers(orgId), active, specialty, licence);
  const rows = toRows(carers);
  const filenameDate = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const headers = ["Name", "Phone", "Email", "Address", "Licence Number", "Licence Expiry", "Licence Status", "Specialties", "Member Since", "Status"];
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => [row.name, row.phone, row.email, row.address, row.licenseNumber, row.licenseExpiry, row.licenceStatus, row.specialties, row.memberSince, row.active].map(csvEscape).join(",")),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="carer-contact-report-${filenameDate}.csv"`, "Cache-Control": "private, no-store" },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WildTrack360";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Carer Contacts");
  sheet.columns = [
    { header: "Name", key: "name", width: 24 }, { header: "Phone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 32 }, { header: "Address", key: "address", width: 44 },
    { header: "Licence Number", key: "licenseNumber", width: 20 }, { header: "Licence Expiry", key: "licenseExpiry", width: 16 },
    { header: "Licence Status", key: "licenceStatus", width: 16 }, { header: "Specialties", key: "specialties", width: 36 },
    { header: "Member Since", key: "memberSince", width: 16 }, { header: "Status", key: "active", width: 12 },
  ];
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { wrapText: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="carer-contact-report-${filenameDate}.xlsx"`, "Cache-Control": "private, no-store" },
  });
});
