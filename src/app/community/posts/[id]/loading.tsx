import { Skeleton } from '@/components/ui/skeleton';

export default function CommunityPostLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4 rounded-xl border bg-background p-6">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
