import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/rbac';
import {
  canPreviewReports,
  canSaveReports,
} from '@/lib/custom-query/access';
import { ReportingWorkbench } from '@/components/custom-query/reporting-workbench';

export const metadata = {
  title: 'Custom Reporting — WildTrack360',
};

export default async function ReportingPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');

  const role = await getUserRole(userId, orgId);
  if (!canPreviewReports(role)) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold">Custom Reporting</h1>
        <p className="text-muted-foreground">
          You don&apos;t have access to custom reporting. Ask a coordinator or
          admin if you need it.
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
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Custom Reporting</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Build lightweight, read-only reports with a small safe query language.
          Results stay within your organisation&apos;s data.
        </p>
      </div>

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
