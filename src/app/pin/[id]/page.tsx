import { getSessionForPublicAccess } from '@/lib/pindrop';
import { PindropForm } from './pindrop-form';

interface PinPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function PinPage({ params, searchParams }: PinPageProps) {
  const { id } = await params;
  const { t: token } = await searchParams;

  if (!token) {
    return <InvalidLink />;
  }

  const session = await getSessionForPublicAccess(id, token);

  if (!session) {
    return <InvalidLink />;
  }

  if (session.status !== 'PENDING') {
    return <ThankYou />;
  }

  return (
    <PindropForm
      sessionId={session.id}
      token={token}
    />
  );
}

function InvalidLink() {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">&#128279;</div>
      <h1 className="text-2xl font-headline font-bold text-foreground mb-2">
        Invalid or Expired Link
      </h1>
      <p className="text-muted-foreground">
        This link is no longer valid. Please contact the wildlife organisation for a new link.
      </p>
    </div>
  );
}

function ThankYou() {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">&#9989;</div>
      <h1 className="text-2xl font-headline font-bold text-foreground mb-2">
        Already Submitted
      </h1>
      <p className="text-muted-foreground mb-4">
        Your location and details have already been submitted. Our team will review the information and follow up as needed.
      </p>
      <p className="text-sm text-muted-foreground">You can safely close this page.</p>
    </div>
  );
}
