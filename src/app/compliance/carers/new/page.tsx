import { redirect } from 'next/navigation';

export default function NewCarerPage() {
  // Carers are now added by inviting them as Clerk org members
  redirect('/admin');
}
