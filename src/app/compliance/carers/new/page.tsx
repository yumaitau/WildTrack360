import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CarerManagement } from '@/app/admin/carer-management';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NewCarerPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/compliance/carers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Carers
          </Button>
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">Carer Management</h1>
      <CarerManagement initialCarers={[]} />
    </div>
  );
}