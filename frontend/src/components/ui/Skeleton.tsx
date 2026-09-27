interface SkeletonProps {
  className?: string;
}

/** Bloc de base. Utiliser la classe .skeleton pour l'effet de balayage. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} />;
}

interface SkeletonTextProps {
  /** Nombre de lignes. */
  lines?: number;
  className?: string;
}

/** Paragraphe de lignes de largeurs variables, comme un vrai bloc de texte. */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  const widths = ['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-2/3', 'w-10/12', 'w-full', 'w-3/4'];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  size?: string;
  className?: string;
}

export function SkeletonCircle({ size = 'h-10 w-10', className = '' }: SkeletonCircleProps) {
  return <div className={`skeleton shrink-0 rounded-full ${size} ${className}`} />;
}

/** Titre de page : la ligne de gras la plus large, puis la ligne de sous-titre. */
export function SkeletonTitle({ className = '' }: SkeletonProps) {
  return (
    <div className={`mb-6 space-y-2 ${className}`}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

/** Grille de cartes, pour les pages à contenu répétitif. */
export function SkeletonCardGrid({
  count = 6,
  columns = 'sm:grid-cols-2 lg:grid-cols-3',
  className = '',
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#131313]"
        >
          <div className="flex items-center gap-3">
            <SkeletonCircle size="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/** Tableau : en-tête + lignes, avec un décalage aléatoire pour éviter l'effet mécanique. */
export function SkeletonTable({
  rows = 8,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#131313] ${className}`}
    >
      <div className="grid gap-4 border-b px-6 py-4 dark:border-[#2e2e2e]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      <div className="divide-y dark:divide-[#2e2e2e]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid items-center gap-4 px-6 py-4" style={{ animationDelay: `${r * 60}ms` }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-3 ${c === 0 ? 'w-3/4' : c === columns - 1 ? 'w-1/2' : 'w-full'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Panneau d'attente plein écran, utilisé pendant la revalidation du token. */
export function FullScreenSkeleton() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] p-8 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center gap-4">
          <SkeletonCircle size="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
