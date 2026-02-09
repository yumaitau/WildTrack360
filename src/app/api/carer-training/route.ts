import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const carerId = searchParams.get('carerId');
  const orgId = searchParams.get('orgId') || activeOrgId || 'default-org';
  
  try {
    const whereClause: any = { clerkOrganizationId: orgId };
    if (carerId) {
      whereClause.carerId = carerId;
    }
    
    const trainings = await prisma.carerTraining.findMany({
      where: whereClause,
      include: {
        carer: {
          select: {
            id: true,
          }
        }
      },
      orderBy: [
        { expiryDate: 'asc' },
        { date: 'desc' }
      ]
    });
    
    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching carer trainings:', error);
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  const orgId = body.clerkOrganizationId || activeOrgId || 'default-org';
  
  try {
    const training = await prisma.carerTraining.create({
      data: {
        carerId: body.carerId,
        courseName: body.courseName,
        provider: body.provider || null,
        date: new Date(body.date),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        certificateUrl: body.certificateUrl || null,
        notes: body.notes || null,
        clerkUserId: userId,
        clerkOrganizationId: orgId
      },
      include: {
        carer: {
          select: {
            id: true,
          }
        }
      }
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    console.error('Error creating carer training:', error);
    return NextResponse.json({ error: 'Failed to create training' }, { status: 500 });
  }
}