import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import ExcelJS from 'exceljs'

// Helper formatters
const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString() : '')
const fmtJson = (j: unknown) => (j ? JSON.stringify(j) : '')
const fmtArr = (a: string[] | null | undefined) => (a ? a.join(', ') : '')
const fmtBool = (b: boolean) => (b ? 'Yes' : 'No')

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
	const headerRow = sheet.getRow(1)
	headerRow.font = { bold: true }
	headerRow.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FFE8F5E9' },
	}
	headerRow.alignment = { vertical: 'middle', wrapText: true }
	sheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: sheet.columnCount },
	}
}

export async function GET() {
	const { userId, orgId } = await auth()
	if (!userId)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	if (!orgId)
		return NextResponse.json(
			{ error: 'Organization ID is required' },
			{ status: 400 }
		)

	const role = await getUserRole(userId, orgId)
	if (role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}

	try {
		// Query all org-scoped tables in parallel
		const [
			animals,
			records,
			species,
			carerProfiles,
			carerTrainings,
			hygieneLogs,
			incidentReports,
			releaseChecklists,
			assets,
			preservedSpecimens,
			orgMembers,
			speciesGroups,
			auditLogs,
		] = await Promise.all([
			prisma.animal.findMany({
				where: { clerkOrganizationId: orgId },
				include: { carer: true },
				orderBy: { createdAt: 'desc' },
			}),
			prisma.record.findMany({
				where: { clerkOrganizationId: orgId },
				include: { animal: { select: { name: true, species: true } } },
				orderBy: { date: 'desc' },
			}),
			prisma.species.findMany({
				where: { clerkOrganizationId: orgId },
				orderBy: { name: 'asc' },
			}),
			prisma.carerProfile.findMany({
				where: { clerkOrganizationId: orgId },
				orderBy: { createdAt: 'desc' },
			}),
			prisma.carerTraining.findMany({
				where: { clerkOrganizationId: orgId },
				orderBy: { date: 'desc' },
			}),
			prisma.hygieneLog.findMany({
				where: { clerkOrganizationId: orgId },
				orderBy: { date: 'desc' },
			}),
			prisma.incidentReport.findMany({
				where: { clerkOrganizationId: orgId },
				include: { animal: { select: { name: true } } },
				orderBy: { date: 'desc' },
			}),
			prisma.releaseChecklist.findMany({
				where: { clerkOrganizationId: orgId },
				include: { animal: { select: { name: true, species: true } } },
				orderBy: { releaseDate: 'desc' },
			}),
			prisma.asset.findMany({
				where: { clerkOrganizationId: orgId },
				orderBy: { createdAt: 'desc' },
			}),
			prisma.preservedSpecimen.findMany({
				where: { clerkOrganizationId: orgId },
				include: { animal: { select: { name: true } } },
				orderBy: { createdAt: 'desc' },
			}),
			prisma.orgMember.findMany({
				where: { orgId },
				include: {
					speciesAssignments: { include: { speciesGroup: true } },
				},
				orderBy: { createdAt: 'asc' },
			}),
			prisma.speciesGroup.findMany({
				where: { orgId },
				include: {
					coordinators: { include: { orgMember: true } },
				},
				orderBy: { name: 'asc' },
			}),
			prisma.auditLog.findMany({
				where: { orgId },
				orderBy: { createdAt: 'desc' },
				take: 10000,
			}),
		])

		const workbook = new ExcelJS.Workbook()
		workbook.creator = 'WildTrack360'
		workbook.created = new Date()

		// ── 1. Animals ──────────────────────────────────────────────────────
		const animalsSheet = workbook.addWorksheet('Animals')
		animalsSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Name', key: 'name', width: 20 },
			{ header: 'Species', key: 'species', width: 20 },
			{ header: 'Sex', key: 'sex', width: 10 },
			{ header: 'Age Class', key: 'ageClass', width: 12 },
			{ header: 'Age', key: 'age', width: 10 },
			{ header: 'Date of Birth', key: 'dateOfBirth', width: 18 },
			{ header: 'Status', key: 'status', width: 18 },
			{ header: 'Date Found', key: 'dateFound', width: 18 },
			{ header: 'Date Released', key: 'dateReleased', width: 18 },
			{ header: 'Outcome Date', key: 'outcomeDate', width: 18 },
			{ header: 'Outcome', key: 'outcome', width: 16 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Rescue Location', key: 'rescueLocation', width: 25 },
			{ header: 'Rescue Address', key: 'rescueAddress', width: 25 },
			{ header: 'Rescue Suburb', key: 'rescueSuburb', width: 15 },
			{ header: 'Rescue Postcode', key: 'rescuePostcode', width: 12 },
			{ header: 'Rescue Coordinates', key: 'rescueCoordinates', width: 22 },
			{ header: 'Release Location', key: 'releaseLocation', width: 25 },
			{ header: 'Release Address', key: 'releaseAddress', width: 25 },
			{ header: 'Release Suburb', key: 'releaseSuburb', width: 15 },
			{ header: 'Release Postcode', key: 'releasePostcode', width: 12 },
			{ header: 'Release Coordinates', key: 'releaseCoordinates', width: 22 },
			{ header: 'Release Notes', key: 'releaseNotes', width: 25 },
			{ header: 'Encounter Type', key: 'encounterType', width: 16 },
			{ header: 'Initial Weight (g)', key: 'initialWeightGrams', width: 16 },
			{ header: 'Weight Unit', key: 'weightUnit', width: 10 },
			{ header: 'Animal Condition', key: 'animalCondition', width: 16 },
			{ header: 'Pouch Condition', key: 'pouchCondition', width: 16 },
			{ header: 'Fate', key: 'fate', width: 14 },
			{ header: 'Mark/Band/Microchip', key: 'markBandMicrochip', width: 22 },
			{ header: 'Life Stage', key: 'lifeStage', width: 14 },
			{ header: 'Carer ID', key: 'carerId', width: 28 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const a of animals) {
			animalsSheet.addRow({
				id: a.id,
				name: a.name,
				species: a.species,
				sex: a.sex || '',
				ageClass: a.ageClass || '',
				age: a.age || '',
				dateOfBirth: fmtDate(a.dateOfBirth),
				status: a.status,
				dateFound: fmtDate(a.dateFound),
				dateReleased: fmtDate(a.dateReleased),
				outcomeDate: fmtDate(a.outcomeDate),
				outcome: a.outcome || '',
				notes: a.notes || '',
				rescueLocation: a.rescueLocation || '',
				rescueAddress: a.rescueAddress || '',
				rescueSuburb: a.rescueSuburb || '',
				rescuePostcode: a.rescuePostcode || '',
				rescueCoordinates: fmtJson(a.rescueCoordinates),
				releaseLocation: a.releaseLocation || '',
				releaseAddress: a.releaseAddress || '',
				releaseSuburb: a.releaseSuburb || '',
				releasePostcode: a.releasePostcode || '',
				releaseCoordinates: fmtJson(a.releaseCoordinates),
				releaseNotes: a.releaseNotes || '',
				encounterType: a.encounterType || '',
				initialWeightGrams: a.initialWeightGrams ?? '',
				weightUnit: a.weightUnit || '',
				animalCondition: a.animalCondition || '',
				pouchCondition: a.pouchCondition || '',
				fate: a.fate || '',
				markBandMicrochip: a.markBandMicrochip || '',
				lifeStage: a.lifeStage || '',
				carerId: a.carerId || '',
				createdAt: fmtDate(a.createdAt),
				updatedAt: fmtDate(a.updatedAt),
			})
		}
		styleHeaderRow(animalsSheet)

		// ── 2. Records ──────────────────────────────────────────────────────
		const recordsSheet = workbook.addWorksheet('Records')
		recordsSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Type', key: 'type', width: 14 },
			{ header: 'Date', key: 'date', width: 18 },
			{ header: 'Description', key: 'description', width: 40 },
			{ header: 'Location', key: 'location', width: 20 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Animal ID', key: 'animalId', width: 28 },
			{ header: 'Animal Name', key: 'animalName', width: 20 },
			{ header: 'Animal Species', key: 'animalSpecies', width: 20 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const r of records) {
			recordsSheet.addRow({
				id: r.id,
				type: r.type,
				date: fmtDate(r.date),
				description: r.description,
				location: r.location || '',
				notes: r.notes || '',
				animalId: r.animalId,
				animalName: r.animal.name,
				animalSpecies: r.animal.species,
				createdAt: fmtDate(r.createdAt),
				updatedAt: fmtDate(r.updatedAt),
			})
		}
		styleHeaderRow(recordsSheet)

		// ── 3. Species ──────────────────────────────────────────────────────
		const speciesSheet = workbook.addWorksheet('Species')
		speciesSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Name', key: 'name', width: 22 },
			{ header: 'Scientific Name', key: 'scientificName', width: 25 },
			{ header: 'Type', key: 'type', width: 14 },
			{ header: 'Description', key: 'description', width: 35 },
			{ header: 'Care Requirements', key: 'careRequirements', width: 35 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const s of species) {
			speciesSheet.addRow({
				id: s.id,
				name: s.name,
				scientificName: s.scientificName || '',
				type: s.type || '',
				description: s.description || '',
				careRequirements: s.careRequirements || '',
				createdAt: fmtDate(s.createdAt),
				updatedAt: fmtDate(s.updatedAt),
			})
		}
		styleHeaderRow(speciesSheet)

		// ── 5. Carer Profiles ───────────────────────────────────────────────
		const carersSheet = workbook.addWorksheet('Carer Profiles')
		carersSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Phone', key: 'phone', width: 16 },
			{ header: 'License Number', key: 'licenseNumber', width: 18 },
			{ header: 'License Expiry', key: 'licenseExpiry', width: 18 },
			{ header: 'Jurisdiction', key: 'jurisdiction', width: 14 },
			{ header: 'Specialties', key: 'specialties', width: 30 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Active', key: 'active', width: 10 },
			{ header: 'Street Address', key: 'streetAddress', width: 25 },
			{ header: 'Suburb', key: 'suburb', width: 16 },
			{ header: 'State', key: 'state', width: 10 },
			{ header: 'Postcode', key: 'postcode', width: 10 },
			{ header: 'Executive Position', key: 'executivePosition', width: 20 },
			{ header: 'Species Coordinator For', key: 'speciesCoordinatorFor', width: 22 },
			{ header: 'Rehabilitates Koala', key: 'rehabilitatesKoala', width: 18 },
			{ header: 'Rehabilitates Flying Fox', key: 'rehabilitatesFlyingFox', width: 22 },
			{ header: 'Rehabilitates Bird of Prey', key: 'rehabilitatesBirdOfPrey', width: 24 },
			{ header: 'Member Since', key: 'memberSince', width: 18 },
			{ header: 'Training Level', key: 'trainingLevel', width: 16 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const c of carerProfiles) {
			carersSheet.addRow({
				id: c.id,
				phone: c.phone || '',
				licenseNumber: c.licenseNumber || '',
				licenseExpiry: fmtDate(c.licenseExpiry),
				jurisdiction: c.jurisdiction || '',
				specialties: fmtArr(c.specialties),
				notes: c.notes || '',
				active: fmtBool(c.active),
				streetAddress: c.streetAddress || '',
				suburb: c.suburb || '',
				state: c.state || '',
				postcode: c.postcode || '',
				executivePosition: c.executivePosition || '',
				speciesCoordinatorFor: c.speciesCoordinatorFor || '',
				rehabilitatesKoala: fmtBool(c.rehabilitatesKoala),
				rehabilitatesFlyingFox: fmtBool(c.rehabilitatesFlyingFox),
				rehabilitatesBirdOfPrey: fmtBool(c.rehabilitatesBirdOfPrey),
				memberSince: fmtDate(c.memberSince),
				trainingLevel: c.trainingLevel || '',
				createdAt: fmtDate(c.createdAt),
				updatedAt: fmtDate(c.updatedAt),
			})
		}
		styleHeaderRow(carersSheet)

		// ── 6. Carer Training ───────────────────────────────────────────────
		const trainingSheet = workbook.addWorksheet('Carer Training')
		trainingSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Carer ID', key: 'carerId', width: 28 },
			{ header: 'Course Name', key: 'courseName', width: 25 },
			{ header: 'Provider', key: 'provider', width: 22 },
			{ header: 'Date', key: 'date', width: 18 },
			{ header: 'Expiry Date', key: 'expiryDate', width: 18 },
			{ header: 'Certificate URL', key: 'certificateUrl', width: 30 },
			{ header: 'Certificate Number', key: 'certificateNumber', width: 20 },
			{ header: 'Training Type', key: 'trainingType', width: 16 },
			{ header: 'Training Hours', key: 'trainingHours', width: 14 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const t of carerTrainings) {
			trainingSheet.addRow({
				id: t.id,
				carerId: t.carerId,
				courseName: t.courseName,
				provider: t.provider || '',
				date: fmtDate(t.date),
				expiryDate: fmtDate(t.expiryDate),
				certificateUrl: t.certificateUrl || '',
				certificateNumber: t.certificateNumber || '',
				trainingType: t.trainingType || '',
				trainingHours: t.trainingHours ?? '',
				notes: t.notes || '',
				createdAt: fmtDate(t.createdAt),
				updatedAt: fmtDate(t.updatedAt),
			})
		}
		styleHeaderRow(trainingSheet)

		// ── 7. Hygiene Logs ─────────────────────────────────────────────────
		const hygieneSheet = workbook.addWorksheet('Hygiene Logs')
		hygieneSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Date', key: 'date', width: 18 },
			{ header: 'Type', key: 'type', width: 16 },
			{ header: 'Description', key: 'description', width: 35 },
			{ header: 'Completed', key: 'completed', width: 12 },
			{ header: 'Enclosure Cleaned', key: 'enclosureCleaned', width: 18 },
			{ header: 'PPE Used', key: 'ppeUsed', width: 12 },
			{ header: 'Handwash Available', key: 'handwashAvailable', width: 18 },
			{ header: 'Feeding Bowls Disinfected', key: 'feedingBowlsDisinfected', width: 24 },
			{ header: 'Quarantine Signs Present', key: 'quarantineSignsPresent', width: 24 },
			{ header: 'Carer ID', key: 'carerId', width: 28 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Photos', key: 'photos', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const h of hygieneLogs) {
			hygieneSheet.addRow({
				id: h.id,
				date: fmtDate(h.date),
				type: h.type,
				description: h.description,
				completed: fmtBool(h.completed),
				enclosureCleaned: fmtBool(h.enclosureCleaned),
				ppeUsed: fmtBool(h.ppeUsed),
				handwashAvailable: fmtBool(h.handwashAvailable),
				feedingBowlsDisinfected: fmtBool(h.feedingBowlsDisinfected),
				quarantineSignsPresent: fmtBool(h.quarantineSignsPresent),
				carerId: h.carerId,
				notes: h.notes || '',
				photos: fmtJson(h.photos),
				createdAt: fmtDate(h.createdAt),
				updatedAt: fmtDate(h.updatedAt),
			})
		}
		styleHeaderRow(hygieneSheet)

		// ── 8. Incident Reports ─────────────────────────────────────────────
		const incidentsSheet = workbook.addWorksheet('Incident Reports')
		incidentsSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Date', key: 'date', width: 18 },
			{ header: 'Type', key: 'type', width: 16 },
			{ header: 'Description', key: 'description', width: 40 },
			{ header: 'Severity', key: 'severity', width: 12 },
			{ header: 'Resolved', key: 'resolved', width: 10 },
			{ header: 'Resolution', key: 'resolution', width: 30 },
			{ header: 'Person Involved', key: 'personInvolved', width: 20 },
			{ header: 'Reported To', key: 'reportedTo', width: 20 },
			{ header: 'Action Taken', key: 'actionTaken', width: 30 },
			{ header: 'Location', key: 'location', width: 20 },
			{ header: 'Animal ID', key: 'animalId', width: 28 },
			{ header: 'Animal Name', key: 'animalName', width: 20 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Attachments', key: 'attachments', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const i of incidentReports) {
			incidentsSheet.addRow({
				id: i.id,
				date: fmtDate(i.date),
				type: i.type,
				description: i.description,
				severity: i.severity,
				resolved: fmtBool(i.resolved),
				resolution: i.resolution || '',
				personInvolved: i.personInvolved || '',
				reportedTo: i.reportedTo || '',
				actionTaken: i.actionTaken || '',
				location: i.location || '',
				animalId: i.animalId || '',
				animalName: i.animal?.name || '',
				notes: i.notes || '',
				attachments: fmtJson(i.attachments),
				createdAt: fmtDate(i.createdAt),
				updatedAt: fmtDate(i.updatedAt),
			})
		}
		styleHeaderRow(incidentsSheet)

		// ── 9. Release Checklists ───────────────────────────────────────────
		const releaseSheet = workbook.addWorksheet('Release Checklists')
		releaseSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Release Date', key: 'releaseDate', width: 18 },
			{ header: 'Animal ID', key: 'animalId', width: 28 },
			{ header: 'Animal Name', key: 'animalName', width: 20 },
			{ header: 'Animal Species', key: 'animalSpecies', width: 20 },
			{ header: 'Release Location', key: 'releaseLocation', width: 25 },
			{ header: 'Release Coordinates', key: 'releaseCoordinates', width: 22 },
			{ header: 'Within 10km', key: 'within10km', width: 12 },
			{ header: 'Release Type', key: 'releaseType', width: 14 },
			{ header: 'Fitness Indicators', key: 'fitnessIndicators', width: 30 },
			{ header: 'Vet Sign Off', key: 'vetSignOff', width: 25 },
			{ header: 'Photos', key: 'photos', width: 30 },
			{ header: 'Completed', key: 'completed', width: 12 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const rc of releaseChecklists) {
			releaseSheet.addRow({
				id: rc.id,
				releaseDate: fmtDate(rc.releaseDate),
				animalId: rc.animalId,
				animalName: rc.animal.name,
				animalSpecies: rc.animal.species,
				releaseLocation: rc.releaseLocation,
				releaseCoordinates: fmtJson(rc.releaseCoordinates),
				within10km: fmtBool(rc.within10km),
				releaseType: rc.releaseType,
				fitnessIndicators: fmtArr(rc.fitnessIndicators),
				vetSignOff: fmtJson(rc.vetSignOff),
				photos: fmtJson(rc.photos),
				completed: fmtBool(rc.completed),
				notes: rc.notes || '',
				createdAt: fmtDate(rc.createdAt),
				updatedAt: fmtDate(rc.updatedAt),
			})
		}
		styleHeaderRow(releaseSheet)

		// ── 10. Assets ──────────────────────────────────────────────────────
		const assetsSheet = workbook.addWorksheet('Assets')
		assetsSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Name', key: 'name', width: 22 },
			{ header: 'Type', key: 'type', width: 16 },
			{ header: 'Description', key: 'description', width: 30 },
			{ header: 'Status', key: 'status', width: 14 },
			{ header: 'Location', key: 'location', width: 20 },
			{ header: 'Assigned To', key: 'assignedTo', width: 20 },
			{ header: 'Purchase Date', key: 'purchaseDate', width: 18 },
			{ header: 'Last Maintenance', key: 'lastMaintenance', width: 18 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const a of assets) {
			assetsSheet.addRow({
				id: a.id,
				name: a.name,
				type: a.type,
				description: a.description || '',
				status: a.status,
				location: a.location || '',
				assignedTo: a.assignedTo || '',
				purchaseDate: fmtDate(a.purchaseDate),
				lastMaintenance: fmtDate(a.lastMaintenance),
				notes: a.notes || '',
				createdAt: fmtDate(a.createdAt),
				updatedAt: fmtDate(a.updatedAt),
			})
		}
		styleHeaderRow(assetsSheet)

		// ── 10. Preserved Specimens ─────────────────────────────────────────
		const specimensSheet = workbook.addWorksheet('Preserved Specimens')
		specimensSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Animal ID', key: 'animalId', width: 28 },
			{ header: 'Animal Name', key: 'animalName', width: 20 },
			{ header: 'Species', key: 'species', width: 20 },
			{ header: 'Register Reference Number', key: 'registerReferenceNumber', width: 24 },
			{ header: 'Specimen Description', key: 'specimenDescription', width: 30 },
			{ header: 'Preservation Method', key: 'preservationMethod', width: 20 },
			{ header: 'Preservation Date', key: 'preservationDate', width: 18 },
			{ header: 'Facility Name', key: 'facilityName', width: 25 },
			{ header: 'Facility License', key: 'facilityLicense', width: 18 },
			{ header: 'Storage Address', key: 'storageAddress', width: 25 },
			{ header: 'Storage Suburb', key: 'storageSuburb', width: 16 },
			{ header: 'Storage State', key: 'storageState', width: 12 },
			{ header: 'Storage Postcode', key: 'storagePostcode', width: 14 },
			{ header: 'Scientific Purpose', key: 'scientificPurpose', width: 22 },
			{ header: 'Authorized By', key: 'authorizedBy', width: 20 },
			{ header: 'Notes', key: 'notes', width: 30 },
			{ header: 'Photos', key: 'photos', width: 30 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const ps of preservedSpecimens) {
			specimensSheet.addRow({
				id: ps.id,
				animalId: ps.animalId || '',
				animalName: ps.animal?.name || '',
				species: ps.species,
				registerReferenceNumber: ps.registerReferenceNumber,
				specimenDescription: ps.specimenDescription,
				preservationMethod: ps.preservationMethod || '',
				preservationDate: fmtDate(ps.preservationDate),
				facilityName: ps.facilityName,
				facilityLicense: ps.facilityLicense || '',
				storageAddress: ps.storageAddress,
				storageSuburb: ps.storageSuburb,
				storageState: ps.storageState,
				storagePostcode: ps.storagePostcode,
				scientificPurpose: ps.scientificPurpose || '',
				authorizedBy: ps.authorizedBy || '',
				notes: ps.notes || '',
				photos: fmtJson(ps.photos),
				createdAt: fmtDate(ps.createdAt),
				updatedAt: fmtDate(ps.updatedAt),
			})
		}
		styleHeaderRow(specimensSheet)

		// ── 14. Organisation Members ────────────────────────────────────────
		const membersSheet = workbook.addWorksheet('Organisation Members')
		membersSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'User ID', key: 'userId', width: 32 },
			{ header: 'Role', key: 'role', width: 14 },
			{ header: 'Species Group Assignments', key: 'speciesAssignments', width: 40 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const m of orgMembers) {
			membersSheet.addRow({
				id: m.id,
				userId: m.userId,
				role: m.role,
				speciesAssignments: m.speciesAssignments
					.map((sa) => sa.speciesGroup.name)
					.join(', '),
				createdAt: fmtDate(m.createdAt),
				updatedAt: fmtDate(m.updatedAt),
			})
		}
		styleHeaderRow(membersSheet)

		// ── 15. Species Groups ──────────────────────────────────────────────
		const groupsSheet = workbook.addWorksheet('Species Groups')
		groupsSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'Slug', key: 'slug', width: 18 },
			{ header: 'Name', key: 'name', width: 22 },
			{ header: 'Description', key: 'description', width: 30 },
			{ header: 'Species Names', key: 'speciesNames', width: 40 },
			{ header: 'Coordinators', key: 'coordinators', width: 40 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
			{ header: 'Updated At', key: 'updatedAt', width: 22 },
		]
		for (const sg of speciesGroups) {
			groupsSheet.addRow({
				id: sg.id,
				slug: sg.slug,
				name: sg.name,
				description: sg.description || '',
				speciesNames: fmtArr(sg.speciesNames),
				coordinators: sg.coordinators
					.map((c) => c.orgMember.userId)
					.join(', '),
				createdAt: fmtDate(sg.createdAt),
				updatedAt: fmtDate(sg.updatedAt),
			})
		}
		styleHeaderRow(groupsSheet)

		// ── 16. Audit Logs ──────────────────────────────────────────────────
		const auditSheet = workbook.addWorksheet('Audit Logs')
		auditSheet.columns = [
			{ header: 'ID', key: 'id', width: 28 },
			{ header: 'User ID', key: 'userId', width: 32 },
			{ header: 'User Name', key: 'userName', width: 20 },
			{ header: 'User Email', key: 'userEmail', width: 25 },
			{ header: 'Action', key: 'action', width: 14 },
			{ header: 'Entity', key: 'entity', width: 20 },
			{ header: 'Entity ID', key: 'entityId', width: 28 },
			{ header: 'Metadata', key: 'metadata', width: 50 },
			{ header: 'Created At', key: 'createdAt', width: 22 },
		]
		for (const al of auditLogs) {
			auditSheet.addRow({
				id: al.id,
				userId: al.userId,
				userName: al.userName || '',
				userEmail: al.userEmail || '',
				action: al.action,
				entity: al.entity,
				entityId: al.entityId || '',
				metadata: fmtJson(al.metadata),
				createdAt: fmtDate(al.createdAt),
			})
		}
		styleHeaderRow(auditSheet)

		// Generate the Excel buffer
		const buffer = await workbook.xlsx.writeBuffer()

		// Log the export action
		logAudit({
			userId,
			orgId,
			action: 'CREATE',
			entity: 'DataExport',
			metadata: {
				format: 'xlsx',
				tables: 13,
				rowCounts: {
					animals: animals.length,
					records: records.length,
					species: species.length,
					carerProfiles: carerProfiles.length,
					carerTrainings: carerTrainings.length,
					hygieneLogs: hygieneLogs.length,
					incidentReports: incidentReports.length,
					releaseChecklists: releaseChecklists.length,
					assets: assets.length,
					preservedSpecimens: preservedSpecimens.length,
					orgMembers: orgMembers.length,
					speciesGroups: speciesGroups.length,
					auditLogs: auditLogs.length,
				},
			},
		})

		const today = new Date().toISOString().split('T')[0]
		const filename = `wildtrack360-export-${today}.xlsx`

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	} catch (err) {
		console.error('Error generating data export:', err)
		return NextResponse.json(
			{ error: 'Failed to generate data export' },
			{ status: 500 }
		)
	}
}
