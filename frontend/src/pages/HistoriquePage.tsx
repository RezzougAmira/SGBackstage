import { useCallback, useEffect, useState } from 'react';
import { SkeletonTable } from '../components/ui/Skeleton';
import { historiqueApi } from '../api/historique';
import {
  HISTORIQUE_ACTIONS,
  HISTORIQUE_ENTITES,
  HistoriqueAction,
  HistoriqueEvent,
  HistoriqueTypeEntite,
} from '../types';

/* -------------------------------------------------------------------------- */
/*  Icônes (Heroicons, SVG inline)                                            */
/* -------------------------------------------------------------------------- */

function IconChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDoubleLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDoubleRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 17l5-5-5-5M13 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badges d'action                                                            */
/* -------------------------------------------------------------------------- */

const ACTION_BADGES: Record<string, string> = {
  creation: "bg-teal-100 text-teal-800",
  modification: "bg-[#e6e8f5] text-[#003049]",
  suppression: "bg-red-100 text-red-700",
  rattachement: "bg-blue-100 text-blue-700",
  detachement: "bg-amber-100 text-amber-700",
  reorder: "bg-purple-100 text-purple-700",
};

/* -------------------------------------------------------------------------- */
/*  Filtres (select stylisé, comme "Tables & Attributs")                       */
/* -------------------------------------------------------------------------- */

interface FilterOption {
  value: string;
  label: string;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-poppins text-[10px] font-bold uppercase text-[#0c1d31] dark:text-white">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-3 py-2.5 pr-8 font-poppins text-[13px] text-[#525f6d] outline-none dark:bg-white/5 dark:text-white/70"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525f6d] dark:text-white/70" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page "Journal des changements"                                             */
/* -------------------------------------------------------------------------- */

const PAR_PAGE = 25;

export function HistoriquePage() {
  const [evenements, setEvenements] = useState<HistoriqueEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<HistoriqueAction | "">("");
  const [typeEntite, setTypeEntite] = useState<HistoriqueTypeEntite | "">("");
  const [deplie, setDeplie] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historiqueApi.list({
        action: action || undefined,
        type_entite: typeEntite || undefined,
        page,
        par_page: PAR_PAGE,
      });
      setEvenements(data.evenements);
      setTotal(data.total);
    } catch (error) {
      console.error("Erreur lors du chargement du journal:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, typeEntite, page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const clearAll = () => {
    setAction("");
    setTypeEntite("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  return (
    <div>
      {/* Titre */}
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          Journal des changements
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          Qui, quand, sur quoi, et ce qui a changé — dans tout le référentiel
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-6">
        <div className="w-[200px]">
          <FilterSelect
            label="Action"
            value={action}
            onChange={(v) => {
              setAction(v as HistoriqueAction | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "Toutes les actions" },
              ...(Object.keys(HISTORIQUE_ACTIONS) as HistoriqueAction[]).map((a) => ({
                value: a,
                label: HISTORIQUE_ACTIONS[a],
              })),
            ]}
          />
        </div>
        <div className="w-[180px]">
          <FilterSelect
            label="Type"
            value={typeEntite}
            onChange={(v) => {
              setTypeEntite(v as HistoriqueTypeEntite | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "Tous les types" },
              ...(Object.keys(HISTORIQUE_ENTITES) as HistoriqueTypeEntite[]).map((t) => ({
                value: t,
                label: HISTORIQUE_ENTITES[t],
              })),
            ]}
          />
        </div>

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto flex items-center justify-center rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-4 py-2.5 font-poppins text-sm text-[#525f6d] hover:bg-white dark:bg-white/5 dark:text-white/70"
        >
          Clear All
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={12} columns={6} />
      ) : (
        <>
          {/* Tableau */}
          <div className="overflow-x-auto rounded-xl border border-[#dcdce1] bg-[#fafafa] shadow-md dark:border-white/10 dark:bg-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#dcdce1] dark:border-white/10">
                  <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                    Action
                  </th>
                  <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                    Élément
                  </th>
                  <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                    Type
                  </th>
                  <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                    Utilisateur
                  </th>
                  <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                    Date
                  </th>
                  <th className="px-8 py-4" />
                </tr>
              </thead>
              <tbody>
                {evenements.map((evt, i) => (
                  <EventRows
                    key={evt.id}
                    evt={evt}
                    zebra={i % 2 === 1}
                    deplie={deplie === evt.id}
                    onToggle={() => setDeplie(deplie === evt.id ? null : evt.id)}
                  />
                ))}

                {evenements.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-10 text-center font-poppins text-sm text-[#525f6d] dark:text-white/60"
                    >
                      Aucun événement ne correspond à votre recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 font-poppins text-xs text-[#003049]/90 dark:text-white/70">
            <p>
              {total === 0
                ? "0 événements"
                : `${((page - 1) * PAR_PAGE + 1)
                    .toString()
                    .padStart(2, "0")}-${Math.min(page * PAR_PAGE, total)
                    .toString()
                    .padStart(2, "0")} par ${total} événements`}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded-md p-1.5 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                title="Première page"
              >
                <IconChevronDoubleLeft />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md p-1.5 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                title="Page précédente"
              >
                <IconChevronLeft />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-md font-medium ${
                    p === page
                      ? "bg-[#003049] text-white"
                      : "text-[#003049] hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                title="Page suivante"
              >
                <IconChevronRight />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                title="Dernière page"
              >
                <IconChevronDoubleRight />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ligne d'événement + ligne de détail dépliée                                */
/* -------------------------------------------------------------------------- */

function EventRows({
  evt,
  zebra,
  deplie,
  onToggle,
}: {
  evt: HistoriqueEvent;
  zebra: boolean;
  deplie: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-[#dcdce1] last:border-none hover:bg-[#e6e8f5] dark:border-white/10 dark:hover:bg-white/10 ${
          deplie ? "bg-[#e6e8f5] dark:bg-white/10" : zebra ? "dark:bg-white/5" : ""
        }`}
      >
        <td className="px-5 py-3.5">
          <span
            className={`inline-block rounded-full px-3 py-1 font-poppins text-xs font-semibold ${
              ACTION_BADGES[evt.action] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {HISTORIQUE_ACTIONS[evt.action] ?? evt.action}
          </span>
        </td>
        <td className="px-5 py-3.5 font-poppins text-sm font-medium text-[#003049] dark:text-white">
          {evt.nom_entite ?? "—"}
        </td>
        <td className="px-5 py-3.5 font-poppins text-sm text-[#525f6d] dark:text-white/60">
          {HISTORIQUE_ENTITES[evt.type_entite] ?? evt.type_entite}
        </td>
        <td className="px-5 py-3.5 font-poppins text-sm text-[#003049] dark:text-white">
          {evt.utilisateur?.name ?? "Inconnu"}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 font-poppins text-sm text-[#525f6d] dark:text-white/60">
          {formatDate(evt.created_at)}
        </td>
        <td className="px-8 py-3.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            title={deplie ? "Masquer le détail" : "Voir le détail"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#003049] transition-transform hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          >
            <IconChevronDown className={`h-4 w-4 ${deplie ? "rotate-180" : ""}`} />
          </button>
        </td>
      </tr>
      {deplie && (
        <tr className="border-b border-[#dcdce1] border-[#dcdce1] last:border-none bg-[#f2f1f1] dark:border-white/10 dark:bg-white/5">
          <td colSpan={6} className="px-6 pb-5 pt-2">
            <DetailEvent evt={evt} />
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Détail avant/après                                                         */
/* -------------------------------------------------------------------------- */

function DetailEvent({ evt }: { evt: HistoriqueEvent }) {
  const avant = evt.avant ?? {};
  const apres = evt.apres ?? {};
  const champs: [string, unknown][] = [];

  for (const cle of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (cle === "impacts") continue;
    if (avant[cle] !== apres[cle]) {
      champs.push([cle, apres[cle]]);
    }
  }

  const modifs = evt.action === "modification" ? champs : [];

  return (
    <div className="rounded-xl border border-[#dcdce1] bg-white p-4 font-poppins dark:bg-[#131313]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {evt.avant && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-500">
              Avant
            </h3>
            <SnapTable data={evt.avant} />
          </div>
        )}
        {evt.apres && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600">
              Après
            </h3>
            <SnapTable data={evt.apres} />
          </div>
        )}
      </div>

      {evt.action === "modification" && modifs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#9d9999]">
            Modifications détaillées
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {modifs.map(([cle, valeur]) => (
                  <tr key={cle} className="border-t border-[#dcdce1] dark:border-white/10">
                    <td className="w-40 py-1.5 pr-3 font-medium text-[#525f6d] dark:text-white/70">
                      {libelle(cle)}
                    </td>
                    <td className="py-1.5 text-[#003049] dark:text-white">
                      {avant[cle] === undefined ? "—" : String(avant[cle])}
                      <span className="mx-2 text-[#9d9999]">→</span>
                      {String(valeur ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SnapTable({ data }: { data: Record<string, unknown> }) {
  const lignes = Object.entries(data).filter(([cle]) => cle !== "impacts");
  if (lignes.length === 0) {
    return <p className="text-sm text-[#9d9999]">—</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {lignes.map(([cle, valeur]) => (
        <div key={cle} className="contents">
          <dt className="text-[#9d9999]">{libelle(cle)}</dt>
          <dd className="truncate text-[#003049] dark:text-white" title={String(valeur ?? "")}>
            {valeur === null || valeur === undefined ? "—" : String(valeur)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function libelle(cle: string): string {
  const libelles: Record<string, string> = {
    id: "Id",
    nom: "Nom",
    code: "Code",
    titre: "Titre",
    description: "Description",
    url: "URL",
    methode_http: "Méthode HTTP",
    controleur: "Contrôleur",
    input_desc: "Entrée",
    output_desc: "Sortie",
    modifie_bdd: "Modifie la BDD",
    ordre: "Ordre",
    numero: "N°",
    etape_id: "Étape",
    process_id: "Processus",
    masque_id: "Masque",
    base_donnees: "Base de données",
    type: "Type",
    role: "Rôle",
    blocked: "Bloqué",
    email: "Email",
    created_at: "Créé le",
    updated_at: "Modifié le",
  };
  return libelles[cle] ?? cle;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}