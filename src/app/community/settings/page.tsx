import { redirect } from 'next/navigation';

// Notifications is currently the only community settings surface; redirect the
// bare /community/settings (reachable via the breadcrumb) straight to it.
export default function CommunitySettingsIndex() {
  redirect('/community/settings/notifications');
}
