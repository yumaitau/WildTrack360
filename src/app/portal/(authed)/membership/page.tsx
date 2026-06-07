import { MembershipPicker } from './membership-picker';

export default function MembershipPickerPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renew or join</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a membership tier. One-off tiers grant a year of membership; monthly and annual tiers renew automatically until you cancel.
        </p>
      </div>
      <MembershipPicker />
    </div>
  );
}
