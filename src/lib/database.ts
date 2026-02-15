'server-only';

import { prisma } from './prisma';
import type { Animal, Record as PrismaRecord, Photo, Species, CarerProfile, HygieneLog, IncidentReport, ReleaseChecklist, Asset } from '@prisma/client';

// Animal Management
export async function getAnimals(organizationId: string): Promise<Animal[]> {
	return await prisma.animal.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			carer: true, // CarerProfile relation
			records: true,
			photos: true,
		},
		orderBy: {
			dateFound: 'desc',
		},
	});
}

// Allowlisted fields for animal create/update to prevent mass assignment
const ANIMAL_SAFE_FIELDS = [
	'name', 'species', 'sex', 'ageClass', 'age', 'dateOfBirth', 'status',
	'dateFound', 'dateReleased', 'outcomeDate', 'outcome', 'photo', 'notes',
	'rescueLocation', 'rescueCoordinates', 'rescueAddress', 'rescueSuburb',
	'rescuePostcode', 'releaseLocation', 'releaseCoordinates', 'releaseNotes',
	'releaseAddress', 'releaseSuburb', 'releasePostcode',
	'encounterType', 'initialWeightGrams', 'weightUnit', 'animalCondition',
	'pouchCondition', 'fate', 'markBandMicrochip', 'lifeStage',
	'carerId',
] as const;

function pickAnimalFields(data: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of ANIMAL_SAFE_FIELDS) {
		if (key in data) {
			result[key] = key === 'carerId' ? (data[key] || null) : data[key];
		}
	}
	return result;
}

export async function createAnimal(animalData: any): Promise<Animal> {
	const safeFields = pickAnimalFields(animalData);
	return await prisma.animal.create({
		data: {
			...safeFields,
			// These must come from server-side auth, never from the request body
			clerkUserId: animalData.clerkUserId,
			clerkOrganizationId: animalData.clerkOrganizationId,
		} as any,
	});
}

export async function updateAnimal(id: string, animalData: any): Promise<Animal> {
	const safeFields = pickAnimalFields(animalData);
	return await prisma.animal.update({
		where: { id },
		data: safeFields as any,
	});
}

export async function deleteAnimal(id: string, organizationId: string): Promise<void> {
	// Scope by orgId to prevent cross-tenant deletion
	const animal = await prisma.animal.findFirst({
		where: { id, clerkOrganizationId: organizationId },
	});
	if (!animal) {
		throw new Error('Animal not found');
	}
	await prisma.animal.delete({
		where: { id },
	});
}

// Record Management
export async function getRecords(organizationId: string): Promise<PrismaRecord[]> {
	return await prisma.record.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			animal: true,
		},
		orderBy: {
			date: 'desc',
		},
	});
}

export async function createRecord(recordData: any): Promise<PrismaRecord> {
	return await prisma.record.create({
		data: recordData as any,
	});
}

// Photo Management
export async function getPhotos(organizationId: string): Promise<Photo[]> {
	return await prisma.photo.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			animal: true,
		},
		orderBy: {
			date: 'desc',
		},
	});
}

export async function createPhoto(photoData: any): Promise<Photo> {
	return await prisma.photo.create({
		data: photoData as any,
	});
}

// Species Management
export async function getSpecies(organizationId: string): Promise<Species[]> {
	return await prisma.species.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		orderBy: {
			name: 'asc',
		},
	});
}

export async function createSpecies(speciesData: any): Promise<Species> {
	return await prisma.species.create({
		data: speciesData as any,
	});
}

export async function updateSpecies(id: string, speciesData: any): Promise<Species> {
	return await prisma.species.update({
		where: { id },
		data: speciesData as any,
	});
}

export async function deleteSpecies(id: string): Promise<void> {
	await prisma.species.delete({
		where: { id },
	});
}

// CarerProfile Management
export async function getCarerProfiles(organizationId: string): Promise<CarerProfile[]> {
	return await prisma.carerProfile.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			trainings: true,
		},
	});
}

export async function getCarerProfile(userId: string, organizationId: string): Promise<CarerProfile | null> {
	return await prisma.carerProfile.findFirst({
		where: { id: userId, clerkOrganizationId: organizationId },
		include: { trainings: true },
	});
}

export async function upsertCarerProfile(userId: string, orgId: string, data: any): Promise<CarerProfile> {
	return await prisma.carerProfile.upsert({
		where: { id: userId },
		create: {
			id: userId,
			clerkOrganizationId: orgId,
			specialties: data.specialties ?? [],
			...data,
		},
		update: data,
	});
}

// Compliance Management
export async function getHygieneLogs(organizationId: string): Promise<HygieneLog[]> {
	return await prisma.hygieneLog.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		orderBy: {
			date: 'desc',
		},
	});
}

export async function createHygieneLog(logData: any): Promise<HygieneLog> {
	return await prisma.hygieneLog.create({
		data: logData as any,
	});
}

export async function getIncidentReports(organizationId: string): Promise<IncidentReport[]> {
	return await prisma.incidentReport.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		orderBy: {
			date: 'desc',
		},
	});
}

export async function createIncidentReport(reportData: any): Promise<IncidentReport> {
	return await prisma.incidentReport.create({
		data: reportData as any,
	});
}

export async function getReleaseChecklists(organizationId: string): Promise<ReleaseChecklist[]> {
	return await prisma.releaseChecklist.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			animal: true,
		},
		orderBy: {
			releaseDate: 'desc',
		},
	});
}

export async function createReleaseChecklist(checklistData: any): Promise<ReleaseChecklist> {
	return await prisma.releaseChecklist.create({
		data: checklistData as any,
	});
}

// Asset Management
export async function getAssets(organizationId: string): Promise<Asset[]> {
	return await prisma.asset.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		orderBy: {
			name: 'asc',
		},
	});
}

export async function createAsset(assetData: any): Promise<Asset> {
	return await prisma.asset.create({
		data: assetData as any,
	});
}

export async function updateAsset(id: string, assetData: any): Promise<Asset> {
	return await prisma.asset.update({
		where: { id },
		data: assetData as any,
	});
}

export async function deleteAsset(id: string): Promise<void> {
	await prisma.asset.delete({
		where: { id },
	});
}

// Clerk User and Organization Management (no-op to match current schema)
export async function createOrUpdateClerkUser(_userData: any): Promise<void> {
	return;
}

export async function createOrUpdateClerkOrganization(_orgData: any): Promise<void> {
	return;
}
