import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Flag, MapPinOff, ShieldCheck, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community guidelines · WildTrack360' };

export default async function CommunityGuidelinesPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  return (
    <article className="mx-auto max-w-3xl space-y-8 rounded-xl border bg-background px-6 py-8 sm:px-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
          <Link href="/community">
            <ArrowLeft /> Community
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-sage" />
          <h1 className="text-2xl font-bold">Community guidelines</h1>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Community is a verified cross-organisation space for respectful, useful ranger knowledge.
          These guidelines apply to posts, comments and chats.
        </p>
      </div>
      <section>
        <h2 className="text-lg font-semibold">Share practical knowledge with care</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Discuss field methods, equipment, training, reporting and ranger experiences. Give enough
          context to be useful, but remove personal information, confidential records and exact
          sensitive locations.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/50 p-4">
          <MapPinOff className="h-5 w-5 text-ochre" />
          <h3 className="mt-2 text-sm font-semibold">Protect place</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Do not share precise nest, rescue, release, threatened-species or culturally restricted
            locations.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <Siren className="h-5 w-5 text-rust" />
          <h3 className="mt-2 text-sm font-semibold">Not for emergencies</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Use your organisation&apos;s established emergency, incident and command channels.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <Flag className="h-5 w-5 text-sage" />
          <h3 className="mt-2 text-sm font-semibold">Report concerns</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Report content at the point you see it. Reporter identity stays confidential.
          </p>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Moderation and appeals</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Wally checks every new or edited contribution using dedicated Amazon Bedrock moderation.
          Ambiguous ranger-domain content is routed to people rather than automatically removed.
          Automated holds are reversible, permanent account action requires human confirmation, and
          moderation decisions can be appealed.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Treat people respectfully</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Disagreement is welcome. Harassment, hate, threats, sexual content, impersonation, spam,
          report brigading and sharing another person&apos;s private information are not.
        </p>
      </section>
    </article>
  );
}
