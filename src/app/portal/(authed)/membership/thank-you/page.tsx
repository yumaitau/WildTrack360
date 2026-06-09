import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function MembershipThankYouPage() {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-full bg-emerald-500/10 p-3 w-fit text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle>Membership activated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground text-center">
          <p>
            Thanks for joining. Your membership will appear on your dashboard once your payment is confirmed.
          </p>
          <Link href="/portal">
            <Button variant="outline" className="w-full">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
