interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/**
 * Pagination côté client pour les tableaux de liste.
 * Affiche la plage visible et un ensemble de numéros de page autour de la page
 * courante. Ne rend rien s'il n'y a qu'une seule page.
 */
export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;

  const debut = (page - 1) * pageSize + 1;
  const fin = Math.min(page * pageSize, total);

  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const last = Math.min(totalPages, first + 4);
  const numeros: number[] = [];
  for (let i = first; i <= last; i++) numeros.push(i);

  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#e6e8f5] px-2 font-poppins text-xs font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-poppins">
      <p className="text-xs text-[#525f6d] dark:text-white/50">
        {debut}–{fin} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={btn}
        >
          Précédent
        </button>
        {numeros.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={
              n === page
                ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#003049] px-2 font-poppins text-xs font-semibold text-white"
                : btn
            }
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={btn}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
