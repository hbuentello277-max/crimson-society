type SkeletonProps = {
  className?: string;
};

function Bone({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export function FeedPostSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.025] p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-3 w-32 rounded-full" />
          <Bone className="h-2 w-44 rounded-full" />
        </div>
      </div>
      <Bone className="mt-4 aspect-square w-full rounded-xl" />
      <div className="mt-4 flex gap-4">
        <Bone className="h-3 w-16 rounded-full" />
        <Bone className="h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardFeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <FeedPostSkeleton key={`feed-skeleton-${index}`} />
      ))}
    </div>
  );
}

export function DashboardMeetsMapSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <Bone className="h-56 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Bone className="h-3 w-36 rounded-full" />
        <Bone className="h-6 w-48 rounded-full" />
        <Bone className="h-3 w-56 max-w-full rounded-full" />
      </div>
    </div>
  );
}

export function DashboardMeetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-3">
        <Bone className="h-16 w-16 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-4 w-40 max-w-full rounded-full" />
          <Bone className="h-3 w-52 max-w-full rounded-full" />
          <Bone className="h-3 w-32 max-w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ShopCatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`shop-skeleton-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <Bone className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Bone className="h-3 w-20 rounded-full" />
            <Bone className="h-4 w-full rounded-full" />
            <Bone className="h-3 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MeetsListSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`meet-skeleton-${index}`}
          className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]"
        >
          <Bone className="h-40 w-full rounded-none sm:hidden" />
          <div className="grid gap-0 p-4 sm:grid-cols-[144px_1fr]">
            <Bone className="hidden h-28 rounded-lg sm:block" />
            <div className="space-y-3">
              <Bone className="h-3 w-28 rounded-full" />
              <Bone className="h-8 w-48 max-w-full rounded-full" />
              <Bone className="h-3 w-36 rounded-full" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxTabSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`inbox-skeleton-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <Bone className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3 w-32 rounded-full" />
            <Bone className="h-3 w-full max-w-xs rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfilePostsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {Array.from({ length: 9 }).map((_, index) => (
        <Bone key={`profile-post-skeleton-${index}`} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  );
}
