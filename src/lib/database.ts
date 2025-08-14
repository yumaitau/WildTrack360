'server-only';

import { prisma } from './prisma';
import type { Animal, Record, Photo, Species, Carer, HygieneLog, IncidentReport, ReleaseChecklist, Asset } from '@prisma/client';

// Animal Management
export async function getAnimals(organizationId: string): Promise<Animal[]> {
	return await prisma.animal.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			carer: true,
			records: true,
			photos: true,
		},
		orderBy: {
			dateFound: 'desc',
		},
	});
}

export async function createAnimal(animalData: any): Promise<Animal> {
	// Convert empty string carerId to null
	const data = {
		...animalData,
		carerId: animalData.carerId || null
	};
	return await prisma.animal.create({
		data: data as any,
	});
}

export async function updateAnimal(id: string, animalData: any): Promise<Animal> {
	// Convert empty string carerId to null
	const data = {
		...animalData,
		carerId: animalData.carerId || null
	};
	return await prisma.animal.update({
		where: { id },
		data: data as any,
	});
}

export async function deleteAnimal(id: string): Promise<void> {
	await prisma.animal.delete({
		where: { id },
	});
}

// Record Management
export async function getRecords(organizationId: string): Promise<Record[]> {
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

export async function createRecord(recordData: any): Promise<Record> {
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

// Carer Management
export async function getCarers(organizationId: string): Promise<Carer[]> {
	return await prisma.carer.findMany({
		where: {
			clerkOrganizationId: organizationId,
		},
		include: {
			trainings: true,
		},
		orderBy: {
			name: 'asc',
		},
	});
}

export async function createCarer(carerData: any): Promise<Carer> {
	return await prisma.carer.create({
		data: carerData as any,
	});
}

export async function updateCarer(id: string, carerData: any): Promise<Carer> {
	return await prisma.carer.update({
		where: { id },
		data: carerData as any,
	});
}

export async function deleteCarer(id: string): Promise<void> {
	await prisma.carer.delete({
		where: { id },
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
