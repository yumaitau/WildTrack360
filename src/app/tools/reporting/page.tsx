import { auth } from '@/lib/clerk-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ChevronDown, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/rbac';
import { canPreviewReports, canSaveReports } from '@/lib/custom-query/access';
import { CUSTOM_QUERY_SOURCES } from '@/lib/custom-query/allowlist';
import { PREBUILT_CUSTOM_QUERIES } from '@/lib/custom-query/templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReportingWorkbench } from '@/components/custom-query/reporting-workbench';

export const metadata = {
  title: 'Custom Reporting — WildTrack360',
};

const QUERY_CLAUSES = [
  {
    label: 'Metric',
    text: 'Use count for rows, or sum <numericField> for numeric totals.',
  },
  {
    label: 'Source',
    text: 'Use from <source>. Sources are listed below and always stay inside your organisation data.',
  },
  {
    label: 'Date range',
    text: 'Add between YYYY-MM-DD and YYYY-MM-DD, or use the page date controls.',
  },
  {
    label: 'Filter',
    text: 'Add where <field> = <value>. Only equality filters are supported.',
  },
  {
    label: 'Breakdown',
    text: 'Add group by <field> for categories, or trend by <day/month field> for time series.',
  },
  {
    label: 'Output',
    text: 'Add limit N and chart number, table, bar, pie or line.',
  },
];

const CHEAT_SHEET_EXAMPLES = PREBUILT_CUSTOM_QUERIES.slice(0, 6);

export default async function ReportingPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');

  const role = await getUserRole(userId, orgId);
  if (!canPreviewReports(role)) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/tools">
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Custom Reporting</h1>
        <p className="text-muted-foreground">
          You don&apos;t have access to custom reporting. Ask a coordinator or admin if you need it.
        </p>
      </div>
    );
  }

  const saved = await prisma.savedReportQuery.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/tools">
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
        </Button>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Custom Reporting</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Build lightweight, read-only reports with a small safe query language. Results stay
            within your organisation&apos;s data.
          </p>
        </div>
      </div>

      <details className="group rounded-lg border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Query cheat sheet</h2>
            <p className="text-sm text-muted-foreground">
              Expand for query syntax, examples, Wally prompts, and available reporting fields.
            </p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-4 border-t p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Write one query per line. Queries are read-only and can only use the safe sources and
            fields listed here.
          </p>

          <div className="flex gap-3 rounded-md border bg-primary/5 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Ask Wally for help</h3>
              <p className="text-sm text-muted-foreground">
                You can ask Wally to turn a plain-English reporting question into a query and tell
                you whether that report is possible with the fields available here.
              </p>
              <p className="text-xs text-muted-foreground">
                Try: “Wally, make me a query for open incidents by type” or “Can I chart training
                hours by month?”
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2">
            <code className="break-words text-xs sm:text-sm">
              count from incidents where resolved = false group by severity chart bar
            </code>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {QUERY_CLAUSES.map((clause) => (
              <div key={clause.label} className="space-y-1">
                <h3 className="text-sm font-medium">{clause.label}</h3>
                <p className="text-sm text-muted-foreground">{clause.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Useful examples</h3>
              <div className="space-y-2">
                {CHEAT_SHEET_EXAMPLES.map((example) => (
                  <div key={example.id} className="rounded-md border bg-background p-3">
                    <div className="text-sm font-medium">{example.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{example.description}</p>
                    <code className="mt-2 block break-words rounded bg-muted px-2 py-1.5 text-xs">
                      {example.query}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Sources and fields</h3>
                <p className="text-xs text-muted-foreground">
                  Fields can be used in where, group by and trend by clauses. Fields marked sum can
                  also be used with sum.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(CUSTOM_QUERY_SOURCES).map(([name, source]) => {
                  const numericFields = new Set<string>(source.numericFields);

                  return (
                    <div key={name} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">{source.label}</h4>
                        <Badge variant="outline" className="font-mono">
                          {name}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{source.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {source.fields.map((field) => (
                          <Badge
                            key={field}
                            variant={numericFields.has(field) ? 'secondary' : 'outline'}
                            className="font-mono font-normal"
                          >
                            {field}
                            {numericFields.has(field) ? ' sum' : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </details>

      <ReportingWorkbench
        initialSaved={saved.map((q) => ({
          id: q.id,
          name: q.name,
          query: q.query,
          visualization: q.visualization,
          showOnDashboard: q.showOnDashboard,
          createdByUserId: q.createdByUserId,
        }))}
        canSave={canSaveReports(role)}
      />
    </div>
  );
}
