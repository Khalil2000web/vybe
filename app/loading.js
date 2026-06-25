function SkeletonLine({ className = "" }) {
  return <div className={`skeleton-shimmer rounded-full ${className}`} />;
}

function SkeletonBox({ className = "" }) {
  return <div className={`skeleton-shimmer rounded-[24px] ${className}`} />;
}

export default function Loading() {
  return (
    <main className="container-page">
      <section className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-3 w-36" />
          <SkeletonLine className="mt-3 h-8 w-52" />
        </div>

        <SkeletonBox className="h-11 w-24 rounded-full" />
      </section>

      <section className="card mb-5 p-4">
        <div className="flex gap-3">
          <SkeletonBox className="h-11 w-11 shrink-0 rounded-full" />

          <div className="flex-1">
            <SkeletonBox className="h-28 w-full" />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <SkeletonBox className="h-11 w-full rounded-full" />
              <SkeletonBox className="h-11 w-full rounded-full" />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <SkeletonBox className="h-11 w-28 rounded-full" />
              <SkeletonBox className="h-11 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {[1, 2, 3].map((item) => (
          <article key={item} className="card p-4">
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-11 w-11 rounded-full" />

              <div className="flex-1">
                <SkeletonLine className="h-4 w-36" />
                <SkeletonLine className="mt-2 h-3 w-24" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-4/5" />
            </div>

            <SkeletonBox className="mt-4 aspect-square w-full" />

            <div className="mt-4 flex gap-2">
              <SkeletonBox className="h-10 w-20 rounded-full" />
              <SkeletonBox className="h-10 w-24 rounded-full" />
              <SkeletonBox className="h-10 w-20 rounded-full" />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}