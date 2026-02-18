import { getSessionForPublicAccess } from '@/lib/pindrop';
import { PindropForm } from './pindrop-form';
import { ThankYouScreen } from './thank-you-screen';

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
    return <ThankYouScreen />;
  }

  return (
    <PindropForm
      sessionId={session.id}
      token={token}
      callerName={session.callerName}
      species={session.species}
      description={session.description}
    />
  );
}

function InvalidLink() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🔗</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Invalid Link
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        This link is invalid or has expired. Please contact the wildlife
        organisation for a new link.
      </p>
    </div>
  );
}
