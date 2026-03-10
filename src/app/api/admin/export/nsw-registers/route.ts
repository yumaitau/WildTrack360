import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import ExcelJS from 'exceljs'

const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString().split('T')[0] : '')

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  headerRow.alignment = { vertical: 'middle', wrapText: true }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsv).join(',')
  const dataLines = rows.map(row => row.map(escapeCsv).join(','))
  return [headerLine, ...dataLines].join('\n')
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:export_registers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const register = searchParams.get('register') || 'all' // transfers | permanent-care | all
  const format = searchParams.get('format') || 'csv' // csv | xlsx
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const dateFilter: Record<string, unknown> = {}
    if (startDate) {
      const parsed = new Date(startDate)
      if (isNaN(parsed.getTime())) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
      dateFilter.gte = parsed
    }
    if (endDate) {
      const parsed = new Date(endDate)
      if (isNaN(parsed.getTime())) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
      dateFilter.lte = parsed
    }

    const includeTransfers = register === 'transfers' || register === 'all'
    const includePermanentCare = register === 'permanent-care' || register === 'all'

    const [transfers, applications] = await Promise.all([
      includeTransfers
        ? prisma.animalTransfer.findMany({
            where: {
              clerkOrganizationId: orgId,
              ...(Object.keys(dateFilter).length > 0 ? { transferDate: dateFilter } : {}),
            },
            include: { animal: { select: { name: true, species: true, orgAnimalId: true } } },
            orderBy: { transferDate: 'desc' },
          })
        : Promise.resolve([]),
      includePermanentCare
        ? prisma.permanentCareApplication.findMany({
            where: {
              clerkOrganizationId: orgId,
              status: 'APPROVED',
              ...(Object.keys(dateFilter).length > 0 ? { npwsApprovalDate: dateFilter } : {}),
            },
            include: { animal: { select: { name: true, species: true, orgAnimalId: true, dateFound: true } } },
            orderBy: { npwsApprovalDate: 'desc' },
          })
        : Promise.resolve([]),
    ])

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'WildTrack360'
      workbook.created = new Date()

      if (includeTransfers) {
        const sheet = workbook.addWorksheet('Transfer Register')
        sheet.columns = [
          { header: 'Transfer Date', key: 'transferDate', width: 14 },
          { header: 'Animal Name', key: 'animalName', width: 18 },
          { header: 'Species', key: 'species', width: 18 },
          { header: 'Org Animal ID', key: 'orgAnimalId', width: 16 },
          { header: 'Transfer Type', key: 'transferType', width: 22 },
          { header: 'Reason', key: 'reason', width: 30 },
          { header: 'From', key: 'from', width: 20 },
          { header: 'To (Entity)', key: 'toEntity', width: 25 },
          { header: 'Entity Type', key: 'entityType', width: 16 },
          { header: 'Receiving Licence', key: 'licence', width: 20 },
          { header: 'Contact', key: 'contact', width: 25 },
          { header: 'Address', key: 'address', width: 35 },
          { header: 'Authorised By', key: 'authorisedBy', width: 20 },
          { header: 'Their Animal ID', key: 'theirAnimalId', width: 16 },
          { header: 'Notes', key: 'notes', width: 30 },
        ]
        for (const t of transfers) {
          sheet.addRow({
            transferDate: fmtDate(t.transferDate),
            animalName: t.animal.name,
            species: t.animal.species,
            orgAnimalId: t.animal.orgAnimalId || '',
            transferType: t.transferType,
            reason: t.reasonForTransfer,
            from: t.fromCarerId || '',
            toEntity: t.receivingEntity,
            entityType: t.receivingEntityType || '',
            licence: t.receivingLicense || '',
            contact: [t.receivingContactName, t.receivingContactPhone, t.receivingContactEmail].filter(Boolean).join(' | '),
            address: [t.receivingAddress, t.receivingSuburb, t.receivingState, t.receivingPostcode].filter(Boolean).join(', '),
            authorisedBy: t.transferAuthorizedBy || '',
            theirAnimalId: t.receivingOrgAnimalId || '',
            notes: t.transferNotes || '',
          })
        }
        styleHeaderRow(sheet)
      }

      if (includePermanentCare) {
        const sheet = workbook.addWorksheet('Permanent Care Register')
        sheet.columns = [
          { header: 'Animal Name', key: 'animalName', width: 18 },
          { header: 'Species', key: 'species', width: 18 },
          { header: 'Org Animal ID', key: 'orgAnimalId', width: 16 },
          { header: 'Date Found', key: 'dateFound', width: 14 },
          { header: 'NPWS Approval No.', key: 'approvalNumber', width: 20 },
          { header: 'Approval Date', key: 'approvalDate', width: 14 },
          { header: 'Category', key: 'category', width: 14 },
          { header: 'Non-Releasable Reason', key: 'reason', width: 35 },
          { header: 'Justification', key: 'justification', width: 35 },
          { header: 'Facility', key: 'facility', width: 25 },
          { header: 'Keeper', key: 'keeper', width: 20 },
          { header: 'Vet Name', key: 'vetName', width: 18 },
          { header: 'Vet Clinic', key: 'vetClinic', width: 18 },
          { header: 'Notes', key: 'notes', width: 30 },
        ]
        for (const app of applications) {
          sheet.addRow({
            animalName: app.animal.name,
            species: app.animal.species,
            orgAnimalId: app.animal.orgAnimalId || '',
            dateFound: fmtDate(app.animal.dateFound),
            approvalNumber: app.npwsApprovalNumber || '',
            approvalDate: fmtDate(app.npwsApprovalDate),
            category: app.category || '',
            reason: app.nonReleasableReasons,
            justification: app.euthanasiaJustification,
            facility: [app.facilityName, app.facilitySuburb].filter(Boolean).join(', '),
            keeper: app.keeperName || '',
            vetName: app.vetName || '',
            vetClinic: app.vetClinic || '',
            notes: app.notes || '',
          })
        }
        styleHeaderRow(sheet)
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const today = new Date().toISOString().split('T')[0]

      logAudit({
        userId, orgId, action: 'EXPORT', entity: 'NSWRegisterExport',
        metadata: { format: 'xlsx', register, transfers: transfers.length, applications: applications.length },
      })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="nsw-${register}-register-${today}.xlsx"`,
        },
      })
    }

    // CSV format
    let csvContent = ''

    if (includeTransfers && transfers.length > 0) {
      const headers = ['Transfer Date', 'Animal', 'Species', 'Org ID', 'Type', 'Reason', 'To', 'Entity Type', 'Licence', 'Contact', 'Address', 'Authorised By', 'Notes']
      const rows = transfers.map(t => [
        fmtDate(t.transferDate),
        t.animal.name,
        t.animal.species,
        t.animal.orgAnimalId || '',
        t.transferType,
        t.reasonForTransfer,
        t.receivingEntity,
        t.receivingEntityType || '',
        t.receivingLicense || '',
        [t.receivingContactName, t.receivingContactPhone].filter(Boolean).join(' '),
        [t.receivingAddress, t.receivingSuburb, t.receivingPostcode].filter(Boolean).join(', '),
        t.transferAuthorizedBy || '',
        t.transferNotes || '',
      ])
      csvContent += toCsv(headers, rows)
    }

    if (includePermanentCare && applications.length > 0) {
      if (csvContent) csvContent += '\n\n'
      const headers = ['Animal', 'Species', 'Org ID', 'Date Found', 'NPWS Approval No.', 'Approval Date', 'Category', 'Reason', 'Justification', 'Facility', 'Keeper', 'Vet']
      const rows = applications.map(app => [
        app.animal.name,
        app.animal.species,
        app.animal.orgAnimalId || '',
        fmtDate(app.animal.dateFound),
        app.npwsApprovalNumber || '',
        fmtDate(app.npwsApprovalDate),
        app.category || '',
        app.nonReleasableReasons,
        app.euthanasiaJustification,
        [app.facilityName, app.facilitySuburb].filter(Boolean).join(', '),
        app.keeperName || '',
        app.vetName || '',
      ])
      csvContent += toCsv(headers, rows)
    }

    const today = new Date().toISOString().split('T')[0]

    logAudit({
      userId, orgId, action: 'EXPORT', entity: 'NSWRegisterExport',
      metadata: { format: 'csv', register, transfers: transfers.length, applications: applications.length },
    })

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nsw-${register}-register-${today}.csv"`,
      },
    })
  } catch (err) {
    console.error('Error generating NSW register export:', err)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
