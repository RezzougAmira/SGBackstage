import { useEffect, useId, useRef, useState } from "react";

export type SearchOption = {
  id: number;
  label: string;
  /** Ligne secondaire : URL, description… */
  meta?: string | null;
  /** Petite étiquette à gauche : méthode HTTP, par exemple. */
  badge?: string | null;
};

export type SearchPage = {
  items: SearchOption[];
  total: number;
  page: number;
  total_pages: number;
};

type Props = {
  placeholder: string;
  /** Recherche paginée côté serveur (q vide = première page alphabétique). */
  rechercher: (q: string, page: number) => Promise<SearchPage>;
  onSelect: (id: number) => void | Promise<void>;
  /** Identifiants déjà rattachés : masqués des résultats. */
  exclure?: number[];
  autoFocus?: boolean;
  className?: string;
  /** Titre de la fenêtre « Parcourir la liste complète ». */
  titre?: string;
};

/**
 * Combobox de recherche avec :
 * - résultats serveur (pas de chargement des 1000 lignes) ;
 * - debounce de 250 ms et protection contre les réponses obsolètes ;
 * - navigation clavier (↑ ↓, Entrée, Échap) ;
 * - parcours de la liste complète par défilement / « Afficher plus »,
 *   pour le cas où l'utilisateur ne connaît pas le nom exact.
 */
export function SearchPicker({
  placeholder,
  rechercher,
  onSelect,
  exclure = [],
  autoFocus,
  className = "",
  titre = "Parcourir la liste",
}: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [vide, setVide] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actif, setActif] = useState(0);
  const [enCours, setEnCours] = useState(false);

  // Fenêtre « Parcourir la liste complète » : le cas où l'utilisateur ne
  // connaît pas le nom et veut voir tous les éléments, page par page.
  const [parcoursOuvert, setParcoursOuvert] = useState(false);
  const [pq, setPq] = useState("");
  const [pOptions, setPOptions] = useState<SearchOption[]>([]);
  const [pPage, setPPage] = useState(1);
  const [pTotal, setPTotal] = useState(0);
  const [pTotalPages, setPTotalPages] = useState(1);
  const [pChargement, setPChargement] = useState(false);
  const [pErreur, setPErreur] = useState<string | null>(null);
  const [pEnCours, setPEnCours] = useState(false);
  const pRequete = useRef(0);

  const conteneur = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const requete = useRef(0);
  const plusEnCours = useRef(false);
  const listeId = useId();

  // Fonctions et exclusions passées inline par le parent : on les garde dans
  // des refs pour ne pas relancer la recherche à chaque rendu.
  const rechercherRef = useRef(rechercher);
  useEffect(() => {
    rechercherRef.current = rechercher;
  });

  const exclureRef = useRef(exclure);
  useEffect(() => {
    exclureRef.current = exclure;
  });

  const cleExclusion = exclure.join(",");

  const charger = async (p: number, remplacer: boolean) => {
    // Génération de requête : toute réponse arrivée après un changement de
    // saisie est ignorée.
    const id = requete.current;
    if (remplacer) {
      setChargement(true);
      setErreur(null);
      setVide(null);
    } else {
      setChargementPlus(true);
    }

    try {
      const res = await rechercherRef.current(q.trim(), p);
      if (requete.current !== id) return;

      const exclus = new Set(exclureRef.current);
      const dispo = res.items.filter((o) => !exclus.has(o.id));

      setOptions((precedent) => {
        if (remplacer) return dispo;
        const connus = new Set(precedent.map((o) => o.id));
        return [...precedent, ...dispo.filter((o) => !connus.has(o.id))];
      });
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(Math.max(1, res.total_pages));
      setActif(0);

      if (remplacer) {
        if (dispo.length > 0) {
          setVide(null);
        } else if (res.total_pages > 1) {
          setVide(
            "Les premiers résultats sont déjà rattachés. Affichez plus ou affinez la recherche.",
          );
        } else if (res.total > 0) {
          setVide("Tous les résultats sont déjà rattachés. Affinez la recherche.");
        } else if (q.trim()) {
          setVide(`Aucun résultat pour « ${q.trim()} ».`);
        } else {
          setVide("Aucun élément disponible.");
        }
      }
    } catch (e) {
      if (requete.current !== id) return;
      setErreur(e instanceof Error ? e.message : "Recherche impossible.");
      if (remplacer) setOptions([]);
    } finally {
      if (requete.current === id) {
        setChargement(false);
        setChargementPlus(false);
      }
    }
  };

  // Le gestionnaire de défilement garde toujours la dernière version.
  const chargerRef = useRef(charger);
  useEffect(() => {
    chargerRef.current = charger;
  });

  // Nouvelle saisie / ouverture : on repart de la première page.
  useEffect(() => {
    if (!ouvert) return;
    requete.current += 1;
    const terme = q.trim();
    setOptions([]);
    setVide(null);
    setErreur(null);
    setChargement(true);
    setPage(1);
    setTotal(0);
    setTotalPages(1);
    setActif(0);
    plusEnCours.current = false;
    liste.current?.scrollTo({ top: 0 });

    // Immédiat à l'ouverture, 250 ms pendant la frappe.
    const timer = window.setTimeout(() => {
      void chargerRef.current(1, true);
    }, terme ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [q, ouvert, cleExclusion]);

  // Fermeture au clic extérieur (le champ garde le focus tant qu'on choisit).
  useEffect(() => {
    if (!ouvert) return;
    const surDocument = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", surDocument);
    return () => document.removeEventListener("mousedown", surDocument);
  }, [ouvert]);

  const chargerPlus = () => {
    if (chargement || plusEnCours.current || page >= totalPages) return;
    plusEnCours.current = true;
    void chargerRef.current(page + 1, false).finally(() => {
      plusEnCours.current = false;
    });
  };

  const choisir = async (o: SearchOption) => {
    if (enCours) return;
    setEnCours(true);
    try {
      await onSelect(o.id);
      setQ("");
      setOptions([]);
      setOuvert(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Rattachement impossible.");
    } finally {
      setEnCours(false);
    }
  };

  const surTouche = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOuvert(true);
      setActif((i) =>
        options.length === 0 ? 0 : Math.min(i + 1, options.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (ouvert && options[actif]) {
        e.preventDefault();
        void choisir(options[actif]);
      }
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  };

  const surDefilement = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) chargerPlus();
  };

  // ---- Fenêtre « Parcourir la liste complète » ----
  // Utile quand l'utilisateur ne connaît pas le nom : il voit tous les
  // éléments, page par page, avec une recherche et un compteur.
  useEffect(() => {
    if (!parcoursOuvert) return;
    const id = ++pRequete.current;
    const terme = pq.trim();
    setPChargement(true);
    setPErreur(null);

    const timer = window.setTimeout(async () => {
      try {
        const res = await rechercherRef.current(terme, 1);
        if (pRequete.current !== id) return;
        const exclus = new Set(exclureRef.current);
        setPOptions(res.items.filter((o) => !exclus.has(o.id)));
        setPPage(res.page);
        setPTotal(res.total);
        setPTotalPages(Math.max(1, res.total_pages));
      } catch (e) {
        if (pRequete.current !== id) return;
        setPErreur(e instanceof Error ? e.message : "Recherche impossible.");
        setPOptions([]);
      } finally {
        if (pRequete.current === id) setPChargement(false);
      }
    }, terme ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [pq, parcoursOuvert, cleExclusion]);

  // Échap ferme la fenêtre, et on bloque le défilement de la page derrière.
  useEffect(() => {
    if (!parcoursOuvert) return;
    const surToucheDocument = (e: KeyboardEvent) => {
      if (e.key === "Escape") setParcoursOuvert(false);
    };
    document.addEventListener("keydown", surToucheDocument);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surToucheDocument);
      document.body.style.overflow = ancien;
    };
  }, [parcoursOuvert]);

  const ouvrirParcours = () => {
    setOuvert(false);
    setPq("");
    setPPage(1);
    setPOptions([]);
    setPTotal(0);
    setPTotalPages(1);
    setPErreur(null);
    setParcoursOuvert(true);
  };

  const allerPage = async (p: number) => {
    if (p < 1 || p > pTotalPages || pChargement) return;
    const id = ++pRequete.current;
    setPChargement(true);
    setPErreur(null);
    try {
      const res = await rechercherRef.current(pq.trim(), p);
      if (pRequete.current !== id) return;
      const exclus = new Set(exclureRef.current);
      setPOptions(res.items.filter((o) => !exclus.has(o.id)));
      setPPage(res.page);
      setPTotal(res.total);
      setPTotalPages(Math.max(1, res.total_pages));
    } catch (e) {
      if (pRequete.current !== id) return;
      setPErreur(e instanceof Error ? e.message : "Recherche impossible.");
    } finally {
      if (pRequete.current === id) setPChargement(false);
    }
  };

  const choisirParcours = async (o: SearchOption) => {
    if (pEnCours) return;
    setPEnCours(true);
    try {
      await onSelect(o.id);
      setParcoursOuvert(false);
      setQ("");
      setOuvert(false);
    } catch (e) {
      setPErreur(e instanceof Error ? e.message : "Rattachement impossible.");
    } finally {
      setPEnCours(false);
    }
  };

  return (
    <div ref={conteneur} className={`relative ${className}`}>
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0b3] dark:text-white/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              d="m21 21-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOuvert(true);
            }}
            onFocus={() => setOuvert(true)}
            onKeyDown={surTouche}
            placeholder={placeholder}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={ouvert}
            aria-controls={listeId}
            aria-autocomplete="list"
            aria-activedescendant={
              ouvert && options[actif] ? `${listeId}-${options[actif].id}` : undefined
            }
            className="h-11 w-full rounded-xl border border-[#e6e8f5] bg-white pl-10 pr-10 font-poppins text-sm text-[#0c1d31] placeholder:text-[#8ea0b3] focus:border-[#003049] focus:outline-none focus:ring-2 focus:ring-[#003049]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/30"
          />
          {(chargement || enCours) && (
            <span
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#004a86]/20 border-t-[#004a86] dark:border-white/20 dark:border-t-white"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Accès direct à la liste complète : pour le cas « je ne connais
            pas le nom, je veux voir ce qui existe ». */}
        <button
          type="button"
          onClick={ouvrirParcours}
          title="Parcourir la liste complète"
          aria-label="Parcourir la liste complète"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#e6e8f5] bg-white px-3 font-poppins text-xs font-semibold text-[#004a86] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Liste</span>
        </button>
      </div>

      {ouvert && (
        <div
          ref={liste}
          id={listeId}
          role="listbox"
          onScroll={surDefilement}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[#e6e8f5] bg-white shadow-xl dark:border-white/10 dark:bg-[#131313]"
        >
          <div className="py-1">
            {erreur ? (
              <p className="px-3 py-2 font-poppins text-xs text-red-600 dark:text-red-300">
                {erreur}
              </p>
            ) : chargement && options.length === 0 ? (
              <p className="px-3 py-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                Recherche…
              </p>
            ) : vide ? (
              <p className="px-3 py-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                {vide}
              </p>
            ) : (
              options.map((o, i) => (
                <button
                  key={o.id}
                  id={`${listeId}-${o.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === actif}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => void choisir(o)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                    i === actif ? "bg-[#e6e8f5] dark:bg-white/10" : ""
                  }`}
                >
                  {o.badge && (
                    <span className="shrink-0 rounded bg-[#e6e8f5] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#004a86] dark:bg-white/10 dark:text-white">
                      {o.badge}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-semibold text-[#0c1d31] dark:text-white">
                      {o.label}
                    </span>
                    {o.meta && (
                      <span className="block truncate font-poppins text-[11px] text-[#8ea0b3] dark:text-white/40">
                        {o.meta}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-poppins text-[10px] font-semibold uppercase tracking-wider text-[#004a86] dark:text-[#4aa1de]">
                    Rattacher
                  </span>
                </button>
              ))
            )}
          </div>

          {(total > 0 || options.length > 0) && (
            <div className="sticky bottom-0 border-t border-[#e6e8f5] bg-white px-3 py-1.5 dark:border-white/10 dark:bg-[#131313]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-poppins text-[10px] text-[#8ea0b3] dark:text-white/40">
                  {options.length} affiché(s) sur {total}
                </span>
                {page < totalPages ? (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={chargerPlus}
                    disabled={chargementPlus}
                    className="font-poppins text-[10px] font-semibold text-[#004a86] hover:underline disabled:opacity-50 dark:text-[#4aa1de]"
                  >
                    {chargementPlus ? "Chargement…" : "Afficher plus"}
                  </button>
                ) : (
                  <span className="font-poppins text-[10px] text-[#8ea0b3] dark:text-white/40">
                    Fin de la liste
                  </span>
                )}
              </div>
              {options.length > 0 && (
                <p className="mt-0.5 font-poppins text-[10px] text-[#8ea0b3] dark:text-white/40">
                  ↑ ↓ pour naviguer · Entrée pour choisir
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {parcoursOuvert && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={titre}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setParcoursOuvert(false);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#131313]">
            <div className="flex items-start justify-between gap-3 border-b border-[#e6e8f5] px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                  {titre}
                </h3>
                <p className="mt-0.5 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                  Parcourez toute la liste ou recherchez par nom. Les éléments déjà
                  rattachés sont masqués.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setParcoursOuvert(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/60 dark:hover:bg-white/10"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="border-b border-[#e6e8f5] px-5 py-3 dark:border-white/10">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0b3] dark:text-white/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    d="m21 21-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  placeholder={placeholder}
                  className="h-11 w-full rounded-xl border border-[#e6e8f5] bg-white pl-10 pr-10 font-poppins text-sm text-[#0c1d31] placeholder:text-[#8ea0b3] focus:border-[#003049] focus:outline-none focus:ring-2 focus:ring-[#003049]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
                />
                {pChargement && (
                  <span
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#004a86]/20 border-t-[#004a86] dark:border-white/20 dark:border-t-white"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pErreur ? (
                <p className="px-5 py-4 font-poppins text-sm text-red-600 dark:text-red-300">
                  {pErreur}
                </p>
              ) : pChargement && pOptions.length === 0 ? (
                <p className="px-5 py-4 font-poppins text-sm text-[#8ea0b3] dark:text-white/40">
                  Recherche…
                </p>
              ) : pOptions.length === 0 ? (
                <p className="px-5 py-4 font-poppins text-sm text-[#8ea0b3] dark:text-white/40">
                  {pTotal === 0
                    ? pq.trim()
                      ? `Aucun résultat pour « ${pq.trim()} ».`
                      : "Tous les éléments sont déjà rattachés."
                    : "Les éléments de cette page sont déjà rattachés. Utilisez « Suivant » ou affinez la recherche."}
                </p>
              ) : (
                <ul className="divide-y divide-[#e6e8f5] dark:divide-white/10">
                  {pOptions.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => void choisirParcours(o)}
                        disabled={pEnCours}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-[#f6f8fa] disabled:opacity-50 dark:hover:bg-white/5"
                      >
                        {o.badge && (
                          <span className="shrink-0 rounded bg-[#e6e8f5] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#004a86] dark:bg-white/10 dark:text-white">
                            {o.badge}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-sm font-semibold text-[#0c1d31] dark:text-white">
                            {o.label}
                          </span>
                          {o.meta && (
                            <span className="block truncate font-poppins text-[11px] text-[#8ea0b3] dark:text-white/40">
                              {o.meta}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-poppins text-[10px] font-semibold uppercase tracking-wider text-[#004a86] dark:text-[#4aa1de]">
                          Rattacher
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e8f5] px-5 py-3 dark:border-white/10">
              <span className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
                {pTotal} résultat(s) · page {pPage} sur {pTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void allerPage(pPage - 1)}
                  disabled={pPage <= 1 || pChargement}
                  className="rounded-lg border border-[#e6e8f5] px-3 py-1.5 font-poppins text-xs font-semibold text-[#0c1d31] transition hover:bg-[#e6e8f5] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => void allerPage(pPage + 1)}
                  disabled={pPage >= pTotalPages || pChargement}
                  className="rounded-lg border border-[#e6e8f5] px-3 py-1.5 font-poppins text-xs font-semibold text-[#0c1d31] transition hover:bg-[#e6e8f5] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
