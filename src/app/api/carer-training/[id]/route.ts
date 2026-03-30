import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const training = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
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
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  
  try {
    // First, verify the training belongs to the user's organization
    const existingTraining = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId
      }
    });

    if (!existingTraining) {
      return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    }
    
    // Update only allowed fields present in body, prevent organization change
    const data: Record<string, unknown> = {};
    if ('courseName' in body) data.courseName = body.courseName;
    if ('provider' in body) data.provider = body.provider || null;
    if ('date' in body) data.date = body.date ? new Date(body.date) : undefined;
    if ('expiryDate' in body) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if ('certificateUrl' in body) data.certificateUrl = body.certificateUrl || null;
    if ('certificateNumber' in body) data.certificateNumber = body.certificateNumber || null;
    if ('trainingType' in body) data.trainingType = body.trainingType || null;
    if ('trainingHours' in body) data.trainingHours = body.trainingHours || null;
    if ('notes' in body) data.notes = body.notes || null;

    const training = await prisma.carerTraining.update({
      where: {
        id: params.id,
        clerkOrganizationId: orgId
      },
      data,
      include: {
        carer: {
          select: {
            id: true,
          }
        }
      }
    });

    logAudit({ userId, orgId: orgId, action: 'UPDATE', entity: 'CarerTraining', entityId: params.id, metadata: { fields: Object.keys(body) } });
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
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    // First, verify the training belongs to the user's organization
    const existingTraining = await prisma.carerTraining.findFirst({
      where: { 
        id: params.id,
        clerkOrganizationId: orgId
      }
    });

    if (!existingTraining) {
      return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    }
    
    await prisma.carerTraining.delete({
      where: {
        id: params.id,
        clerkOrganizationId: orgId // Double-check in delete
      }
    });

    logAudit({ userId, orgId: orgId, action: 'DELETE', entity: 'CarerTraining', entityId: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting carer training:', error);
    return NextResponse.json({ error: 'Failed to delete training' }, { status: 500 });
  }
}