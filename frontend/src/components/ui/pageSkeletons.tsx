import { Skeleton, SkeletonCardGrid, SkeletonCircle, SkeletonTable, SkeletonText, SkeletonTitle } from './Skeleton';

/** Fil d'Ariane de la page détail. */
export function SkeletonBreadcrumb() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-3" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-3" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Tableau de bord : compteurs, activité, contributions, événements. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[42px] w-64 rounded-xl" />
      </div>

      {/* Compteurs (12) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-lg" />
        ))}
      </div>

      {/* Activité 14 jours */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <Skeleton className="mb-6 h-5 w-64" />
        <div className="flex items-end gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className={`flex-1 rounded-t ${i % 3 === 0 ? 'h-24' : 'h-16'}`} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <Skeleton className="mb-4 h-5 w-56" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-5 w-full rounded-full" />
          ))}
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <Skeleton className="mb-4 h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <SkeletonCircle size="h-8 w-8" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </section>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <Skeleton className="mb-4 h-5 w-44" />
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm dark:bg-[#131313]">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-60" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Liste de domaines : grille de cartes. */
export function DomainesSkeleton() {
  return (
    <div>
      <SkeletonTitle />
      <SkeletonCardGrid count={6} />
    </div>
  );
}

/** Détail d'un domaine : titre, puis cartes processus. */
export function DomaineDetailSkeleton() {
  return (
    <div>
      <SkeletonBreadcrumb />
      <SkeletonTitle />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#131313]">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Détail d'un processus : schéma horizontal cliquable puis liste des étapes.
 * Reproduit exactement la géométrie réelle pour que la page ne bouge pas
 * quand les données arrivent.
 */
export function ProcessDetailSkeleton() {
  return (
    <div>
      <SkeletonBreadcrumb />

      {/* Titre + action */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[46px] w-40 rounded-xl" />
      </div>

      {/* Zone schéma */}
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="flex min-w-max items-center gap-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-[74px] w-[180px] rounded-xl" />
              {i < 2 && <Skeleton className="mx-1 h-5 w-5 rounded" />}
            </div>
          ))}
        </div>
      </section>

      {/* Liste des étapes */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <Skeleton className="mb-4 h-6 w-48" />
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 rounded-xl border border-[#e6e8f5] px-4 py-3 dark:border-white/10">
              <SkeletonCircle size="h-9 w-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-3 w-12" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Détail générique : étape, demande de changement, table. */
export function DetailSkeleton() {
  return (
    <div>
      <SkeletonBreadcrumb />
      <SkeletonTitle />
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <Skeleton className="mb-4 h-6 w-40" />
        <SkeletonText lines={3} />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Liste de demandes de changement. */
export function DCListSkeleton() {
  return (
    <div>
      <SkeletonTitle />
      <SkeletonTable rows={6} columns={5} />
    </div>
  );
}

/** Page tables / attributs : grande table dense. */
export function TablesSkeleton() {
  return (
    <div>
      <SkeletonTitle />
      <div className="mb-4 flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-56 rounded-xl" />
        ))}
      </div>
      <SkeletonTable rows={10} columns={6} />
    </div>
  );
}

/** Résultats de recherche : la requête est déjà rendue, seuls les résultats chargent. */
export function SearchSkeleton() {
  return (
    <div>
      <SkeletonTitle />
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}

/** Résultats de recherche vides : message normal, pas un squelette. */
export function SearchIdleHint() {
  return (
    <div className="rounded-2xl border border-dashed border-[#e6e8f5] py-16 text-center dark:border-white/10">
      <p className="font-poppins text-sm text-[#525f6d] dark:text-white/60">
        Saisissez un terme pour lancer la recherche.
      </p>
    </div>
  );
}
