import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CallIntakeClient } from './call-intake-client';

export default async function CallIntakePage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  return <CallIntakeClient />;
}
