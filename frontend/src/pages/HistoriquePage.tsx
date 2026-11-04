import { useCallback, useEffect, useState } from 'react';
import { SkeletonTable } from '../components/ui/Skeleton';
import { historiqueApi } from '../api/historique';
import { messageErreur } from '../utils/erreurs';
import { ErrorInline } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';
import {
  HISTORIQUE_ACTIONS,
  HISTORIQUE_ENTITES,
  HistoriqueAction,
  HistoriqueEvent,
  HistoriqueTypeEntite,
  HistoriqueUtilisateur,
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

export function HistoriquePage() {
  const [evenements, setEvenements] = useState<HistoriqueEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [parPage, setParPage] = useState(25);
  const [action, setAction] = useState<HistoriqueAction | "">("");
  const [typeEntite, setTypeEntite] = useState<HistoriqueTypeEntite | "">("");
  const [utilisateurId, setUtilisateurId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [utilisateurs, setUtilisateurs] = useState<HistoriqueUtilisateur[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deplie, setDeplie] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Filtre « historique d'un élément » lancé depuis le détail d'une ligne.
  const [entiteFiltre, setEntiteFiltre] = useState<{ id: number; nom: string } | null>(null);

  // Source du filtre par utilisateur : les comptes déjà présents dans le
  // journal (la route est ouverte à tous les rôles, pas /api/auth/users).
  useEffect(() => {
    historiqueApi
      .utilisateurs()
      .then(setUtilisateurs)
      .catch(() => setUtilisateurs([]));
  }, []);

  /** Filtres courants, partagés par l'affichage et l'export CSV. */
  const filtresBase = () => ({
    action: action || undefined,
    type_entite: typeEntite || undefined,
    entite_id: entiteFiltre?.id,
    utilisateur_id: utilisateurId ? Number(utilisateurId) : undefined,
    // Le backend travaille en ISO : « jusqua » à minuit exclurait la
    // dernière journée entière, on prend donc la fin de journée.
    depuis: dateDebut ? `${dateDebut}T00:00:00` : undefined,
    jusqua: dateFin ? `${dateFin}T23:59:59` : undefined,
    search: debouncedSearch || undefined,
  });

  const charger = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await historiqueApi.list({ ...filtresBase(), page, page_size: parPage });
      setEvenements(data.evenements);
      setTotal(data.total);
    } catch (error) {
      // Sans ce catch, l'échec affichait un journal vide, indiscernable
      // d'un historique réellement sans événement.
      setLoadError(messageErreur(error));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, typeEntite, entiteFiltre, utilisateurId, dateDebut, dateFin, page, parPage, debouncedSearch]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const clearAll = () => {
    setAction("");
    setTypeEntite("");
    setEntiteFiltre(null);
    setUtilisateurId("");
    setDateDebut("");
    setDateFin("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const filtresActifs = Boolean(
    action || typeEntite || entiteFiltre || utilisateurId || dateDebut || dateFin || debouncedSearch,
  );

  /** Posé depuis le détail d'une ligne : ne garde que cet élément. */
  const filtrerParEntite = (evt: HistoriqueEvent) => {
    if (evt.entite_id == null) return;
    setEntiteFiltre({ id: evt.entite_id, nom: evt.nom_entite ?? `#${evt.entite_id}` });
    setTypeEntite(evt.type_entite);
    setPage(1);
    setDeplie(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Exporte en CSV la vue filtrée — toutes les lignes filtrées, pas seulement
   * la page courante. Tout se passe côté client : on boucle sur la pagination
   * existante (max 200 par requête, plafond backend) puis on génère le Blob.
   */
  const exporterCsv = async () => {
    if (total === 0 || exporting) return;
    setExporting(true);
    try {
      const premier = await historiqueApi.list({ ...filtresBase(), page: 1, page_size: 200 });
      let tous = premier.evenements;
      const nbPages = Math.ceil(premier.total / 200);
      for (let p = 2; p <= nbPages; p++) {
        const suite = await historiqueApi.list({ ...filtresBase(), page: p, page_size: 200 });
        tous = tous.concat(suite.evenements);
      }

      const lignesCsv = [
        ["Date", "Utilisateur", "Action", "Type", "Element", "Modifications"],
        ...tous.map((e) => [
          formatDateCsv(e.created_at),
          e.utilisateur?.name ?? "—",
          HISTORIQUE_ACTIONS[e.action] ?? e.action,
          HISTORIQUE_ENTITES[e.type_entite] ?? e.type_entite,
          e.nom_entite ?? "—",
          resumeModifs(e),
        ]),
      ];
      const csv = lignesCsv.map((l) => l.map(celluleCsv).join(";")).join("\r\n");
      // BOM UTF-8 : Excel affiche les accents ; « ; » : séparateur Excel FR.
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `journal-changements-${new Date().toISOString().slice(0, 10)}.csv`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      setToast("L'export CSV a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / parPage));

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

      {/* Barre de recherche — même style pilule que les autres pages */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <svg
            className="h-5 w-5 shrink-0 text-[#525f6d] dark:text-white/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élément, un utilisateur..."
            className="w-full bg-transparent font-poppins text-sm text-[#525f6d] placeholder:text-[#525f6d] outline-none dark:text-white/70"
          />
        </label>

        <button
          type="button"
          onClick={exporterCsv}
          disabled={total === 0 || exporting}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
          {exporting ? "Exportation…" : "Exporter CSV"}
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-6">
        {entiteFiltre && (
          <button
            type="button"
            onClick={() => {
              setEntiteFiltre(null);
              setTypeEntite("");
              setPage(1);
            }}
            title="Retirer le filtre élément"
            className="flex items-center gap-2 rounded-full border border-[#003049] bg-[#e6e8f5] px-4 py-2.5 font-poppins text-xs font-semibold text-[#003049] hover:bg-[#dbe0f2] dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          >
            Élément : {entiteFiltre.nom}
            <span aria-hidden="true">✕</span>
          </button>
        )}
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
        <div className="w-[200px]">
          <FilterSelect
            label="Utilisateur"
            value={utilisateurId}
            onChange={(v) => {
              setUtilisateurId(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Tous les utilisateurs" },
              ...utilisateurs.map((u) => ({
                value: String(u.id),
                label: `${u.name} (${u.evenements})`,
              })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-poppins text-[10px] font-bold uppercase text-[#0c1d31] dark:text-white">
            Période
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPage(1);
              }}
              aria-label="Date de début"
              className="rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-3 py-2.5 font-poppins text-[13px] text-[#525f6d] outline-none dark:bg-white/5 dark:text-white/70"
            />
            <span className="font-poppins text-xs text-[#525f6d] dark:text-white/50">au</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setPage(1);
              }}
              aria-label="Date de fin"
              className="rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-3 py-2.5 font-poppins text-[13px] text-[#525f6d] outline-none dark:bg-white/5 dark:text-white/70"
            />
          </div>
        </div>

        {filtresActifs && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto flex items-center justify-center rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-4 py-2.5 font-poppins text-sm text-[#525f6d] hover:bg-white dark:bg-white/5 dark:text-white/70"
          >
            Tout effacer
          </button>
        )}
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
                {loadError ? (
                  <tr>
                    <td colSpan={6}>
                      <ErrorInline
                        message="Impossible de charger le journal."
                        onRetry={charger}
                      />
                    </td>
                  </tr>
                ) : (
                  <>
                    {evenements.map((evt, i) => (
                      <EventRows
                        key={evt.id}
                        evt={evt}
                        zebra={i % 2 === 1}
                        deplie={deplie === evt.id}
                        onToggle={() => setDeplie(deplie === evt.id ? null : evt.id)}
                        onFiltrerEntite={filtrerParEntite}
                        onToast={setToast}
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
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 font-poppins text-xs text-[#003049]/90 dark:text-white/70">
            <p>
              {total === 0
                ? "0 événement"
                : `${((page - 1) * parPage + 1)
                    .toString()
                    .padStart(2, "0")}-${Math.min(page * parPage, total)
                    .toString()
                    .padStart(2, "0")} sur ${total} événements`}
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

              {/* Fenêtre glissante de 5 numéros (comme le composant
                  Pagination) : des milliers d'événements ne doivent pas
                  générer des centaines de boutons. */}
              {(() => {
                const première = Math.max(1, Math.min(page - 2, totalPages - 4));
                const dernière = Math.min(totalPages, première + 4);
                const pages: (number | "…")[] = [];
                if (première > 1) pages.push(1);
                if (première > 2) pages.push("…");
                for (let p = première; p <= dernière; p++) pages.push(p);
                if (dernière < totalPages - 1) pages.push("…");
                if (dernière < totalPages) pages.push(totalPages);

                return pages.map((item, idx) =>
                  item === "…" ? (
                    <span
                      key={`gap-${idx}`}
                      className="px-1 font-medium text-[#003049]/50 dark:text-white/40"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`h-7 w-7 rounded-md font-medium ${
                        item === page
                          ? "bg-[#003049] text-white"
                          : "text-[#003049] hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                );
              })()}

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

            <div className="flex items-center gap-2 lowercase">
              <div className="relative">
                <select
                  value={parPage}
                  onChange={(e) => {
                    setParPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none rounded-md border border-[#003049] bg-transparent px-3 py-1.5 pr-6 text-xs font-medium text-[#003049] outline-none dark:border-white/40 dark:text-white"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" />
              </div>
              <span>éléments par Page</span>
            </div>
          </div>
        </>
      )}
       <Toast message={toast} onClose={() => setToast(null)} variant="erreur" />
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
  onFiltrerEntite,
  onToast,
}: {
  evt: HistoriqueEvent;
  zebra: boolean;
  deplie: boolean;
  onToggle: () => void;
  onFiltrerEntite: (evt: HistoriqueEvent) => void;
  onToast?: (msg: string) => void;
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
            <DetailEvent evt={evt} onFiltrerEntite={() => onFiltrerEntite(evt)} onToast={onToast} />
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Détail avant/après                                                         */
/* -------------------------------------------------------------------------- */

function DetailEvent({
  evt,
  onFiltrerEntite,
  onToast,
}: {
  evt: HistoriqueEvent;
  onFiltrerEntite?: () => void;
  onToast?: (msg: string) => void;
}) {
  // Bascule « seulement les changements » : par défaut, tous les champs
  // restent visibles (comportement historique).
  const [seulementChanges, setSeulementChanges] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Le dossier Word (fiche + journal) n'est proposé que pour les types
  // pour lesquels l'API sait reconstituer une fiche.
  const exportable =
    evt.entite_id != null &&
    (evt.type_entite === "masque" ||
      evt.type_entite === "service" ||
      evt.type_entite === "procedure");

  // Document assemblé côté serveur : on récupère le binaire puis on
  // déclenche le téléchargement via une URL d'objet temporaire.
  const handleExportDossier = async () => {
    if (evt.entite_id == null || exporting) return;
    setExporting(true);
    try {
      const blob = await historiqueApi.exportDossier(evt.type_entite, evt.entite_id);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `dossier-${evt.nom_entite ?? evt.type_entite}.docx`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur:", error);
      onToast?.("Le téléchargement du dossier a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  const avant = evt.avant ?? {};
  const apres = evt.apres ?? {};
  const champs: [string, unknown][] = [];

  for (const cle of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (cle === "impacts") continue;
    // Comparaison PROFONDE : les objets/tableaux venant du JSON sont toujours
    // deux instances distinctes, « !== » les déclarerait toujours modifiés
    // (faux positifs du type « Fonctionnalités: 3,7 → 3,7 »).
    if (JSON.stringify(avant[cle]) !== JSON.stringify(apres[cle])) {
      champs.push([cle, apres[cle]]);
    }
  }

  const modifs = evt.action === "modification" ? champs : [];

  // Surlignage : réservé aux modifications, sinon toute la ligne serait
  // colorée (création = tout vert, suppression = tout rouge).
  const changes =
    evt.action === "modification" ? new Set(champs.map(([cle]) => cle)) : new Set<string>();

  const nbChamps = new Set(
    [...Object.keys(avant), ...Object.keys(apres)].filter((cle) => cle !== "impacts"),
  ).size;
  // La bascule n'a de sens que s'il y a des champs modifiés ET d'autres cachés.
  const basculeDispo = champs.length > 0 && nbChamps > champs.length;

  return (
    <div className="rounded-xl border border-[#dcdce1] bg-white p-4 font-poppins dark:bg-[#131313]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onFiltrerEntite && evt.entite_id != null && evt.nom_entite && (
            <button
              type="button"
              onClick={onFiltrerEntite}
              className="flex items-center gap-1.5 rounded-lg border border-[#dcdce1] bg-white px-3 py-1.5 text-xs font-semibold text-[#003049] hover:bg-[#e6e8f5] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              Historique de « {evt.nom_entite} »
            </button>
          )}
          {exportable && (
            <button
              type="button"
              onClick={handleExportDossier}
              disabled={exporting}
              title="Télécharger la fiche et le journal complet de cet élément (Word)"
              className="flex items-center gap-1.5 rounded-lg border border-[#dcdce1] bg-white px-3 py-1.5 text-xs font-semibold text-[#003049] hover:bg-[#e6e8f5] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
              </svg>
              {exporting ? "Génération…" : "Télécharger le dossier"}
            </button>
          )}
        </div>

        {basculeDispo && (
          <button
            type="button"
            onClick={() => setSeulementChanges((v) => !v)}
            className="rounded-lg border border-[#dcdce1] bg-white px-3 py-1.5 text-xs font-semibold text-[#525f6d] hover:bg-[#e6e8f5] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            {seulementChanges
              ? `Afficher tous les champs (${nbChamps})`
              : `Afficher seulement les changements (${champs.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {evt.avant && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-500">
              Avant
            </h3>
            <SnapTable
              data={evt.avant}
              changes={changes}
              ton="avant"
              seulementChanges={seulementChanges}
            />
          </div>
        )}
        {evt.apres && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600">
              Après
            </h3>
            <SnapTable
              data={evt.apres}
              changes={changes}
              ton="apres"
              seulementChanges={seulementChanges}
            />
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
                      {valeurLisible(avant[cle])}
                      <span className="mx-2 text-[#9d9999]">→</span>
                      {valeurLisible(valeur)}
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

function SnapTable({
  data,
  changes,
  ton,
  seulementChanges = false,
}: {
  data: Record<string, unknown>;
  changes?: Set<string>;
  ton?: "avant" | "apres";
  seulementChanges?: boolean;
}) {
  const lignes = Object.entries(data).filter(
    ([cle]) => cle !== "impacts" && (!seulementChanges || changes?.has(cle)),
  );
  if (lignes.length === 0) {
    return <p className="text-sm text-[#9d9999]">—</p>;
  }
  // Surlignage d'un champ modifié : rouge côté Avant, vert côté Après.
  const surligne =
    ton === "avant"
      ? "bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-300"
      : "bg-green-50 text-green-900 dark:bg-green-500/10 dark:text-green-300";
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {lignes.map(([cle, valeur]) => {
        const change = changes?.has(cle);
        return (
          <div key={cle} className="contents">
            <dt
              className={`rounded px-1.5 ${change ? surligne : "text-[#9d9999]"}`}
            >
              {libelle(cle)}
            </dt>
            <dd
              className={`truncate rounded px-1.5 ${
                change ? `${surligne} font-semibold` : "text-[#003049] dark:text-white"
              }`}
              title={valeurLisible(valeur)}
            >
              {valeurLisible(valeur)}
            </dd>
          </div>
        );
      })}
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
    collection: "Collection",
    ordre: "Ordre",
    numero: "N°",
    etape_id: "Étape",
    process_id: "Processus",
    masque_id: "Masque",
    fonctionnalite_id: "Fonctionnalité",
    service_id: "Service",
    procedure_id: "Procédure",
    table_id: "Table",
    utilisateur_id: "Utilisateur",
    base_donnees: "Base de données",
    type: "Type",
    role: "Rôle",
    blocked: "Bloqué",
    email: "Email",
    password: "Mot de passe",
    mot_de_passe: "Mot de passe",
    avatar_key: "Photo",
    image_key: "Image du masque",
    diagramme_url: "Diagramme",
    diagramme_type: "Type de diagramme",
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

/* -------------------------------------------------------------------------- */
/*  Export CSV                                                                 */
/* -------------------------------------------------------------------------- */

/** Échappe une cellule : guillemets doublés, tout entre guillemets. */
function celluleCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

/** Date ISO → jj/mm/aaaa hh:mm (convention plus compacte pour un tableur). */
function formatDateCsv(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valeur de snapshot lisible dans une cellule CSV. */
function valeurLisible(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Résumé « Champ: avant → après » d'une modification (vide sinon). */
function resumeModifs(evt: HistoriqueEvent): string {
  if (evt.action !== "modification") return "";
  const avant = evt.avant ?? {};
  const apres = evt.apres ?? {};
  const parties: string[] = [];
  for (const cle of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (cle === "impacts") continue;
    if (JSON.stringify(avant[cle]) !== JSON.stringify(apres[cle])) {
      parties.push(`${libelle(cle)} : ${valeurLisible(avant[cle])} → ${valeurLisible(apres[cle])}`);
    }
  }
  return parties.join(" | ");
}