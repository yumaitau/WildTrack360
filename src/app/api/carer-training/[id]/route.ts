import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const training = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId || 'default-org'
      },
      include: {
        carer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json(training);
  } catch (error) {
    console.error('Error fetching carer training:', error);
    return NextResponse.json({ error: 'Failed to fetch training' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  
  try {
    // First, verify the training belongs to the user's organization
    const existingTraining = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId || 'default-org'
      }
    });

    if (!existingTraining) {
      return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    }
    
    // Update only allowed fields, prevent organization change
    const training = await prisma.carerTraining.update({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId || 'default-org' // Double-check in update
      },
      data: {
        courseName: body.courseName,
        provider: body.provider || null,
        date: body.date ? new Date(body.date) : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        certificateUrl: body.certificateUrl || null,
        certificateNumber: body.certificateNumber || null,
        trainingType: body.trainingType || null,
        trainingHours: body.trainingHours || null,
        notes: body.notes || null
      },
      include: {
        carer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(training);
  } catch (error) {
    console.error('Error updating carer training:', error);
    return NextResponse.json({ error: 'Failed to update training' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    // First, verify the training belongs to the user's organization
    const existingTraining = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId || 'default-org'
      }
    });

    if (!existingTraining) {
      return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    }
    
    await prisma.carerTraining.delete({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId || 'default-org' // Double-check in delete
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting carer training:', error);
    return NextResponse.json({ error: 'Failed to delete training' }, { status: 500 });
  }
}