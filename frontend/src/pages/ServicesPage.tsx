import { useEffect, useMemo, useRef, useState } from "react";
import { servicesApi } from "../api/services";
import { Procedure, Service } from "../types";
import { DetailModal } from "../components/DetailModal";
import { Pagination } from "../components/Pagination";
import { ConfirmModal } from "../components/ConfirmModal";
import { ServiceForm } from "../components/forms/ServiceForm";
import { EntityHistory } from "../components/EntityHistory";
import { useAuth } from "../hooks/useAuth";
import { canDelete } from "../utils/roles";
import { lireSearchParam } from "../utils/url";
import { messageErreur } from "../utils/erreurs";
import { ErrorState } from "../components/ui/ErrorState";

const PAGE_SIZE = 10;

type ServiceFormData = Parameters<typeof servicesApi.create>[0];

/** Colonnes triables de la table. */
type TriCle = "nom" | "methode" | "controleur" | "procedures";

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 font-poppins text-sm text-[#0c1d31] dark:text-white/80">{value}</dd>
    </div>
  );
}

function ServiceDetail({ service }: { service: Service }) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    servicesApi
      .procedures(service.id)
      .then((p) => {
        if (!cancelled) setProcedures(p);
      })
      .catch(() => {
        if (!cancelled) setProcedures([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service.id]);

  return (
    <div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailField label="Nom" value={<span className="break-all font-mono">{service.nom}</span>} />
        <DetailField label="Méthode HTTP" value={service.methode_http || "—"} />
        <div className="sm:col-span-2">
          <DetailField
            label="URL"
            value={<span className="break-all font-mono">{service.url || "—"}</span>}
          />
        </div>
        <DetailField label="Contrôleur" value={<span className="break-all font-mono">{service.controleur || "—"}</span>} />
        <DetailField label="Entrée" value={service.input_desc || "—"} />
        <DetailField label="Sortie" value={service.output_desc || "—"} />
      </dl>

      {/* Où le service est utilisé : masques appelants + fonctionnalités. */}
      <div className="mt-5 border-t border-[#e6e8f5] pt-4 dark:border-white/10">
        <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
          Où le service est utilisé
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
              Masques ({service.masques.length})
            </p>
            {service.masques.length === 0 ? (
              <p className="mt-1.5 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                Aucun masque ne l'appelle.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {service.masques.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-full bg-[#e6e8f5] px-2.5 py-1 text-xs font-medium text-[#003049] dark:bg-white/10 dark:text-white"
                  >
                    {m.nom}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
              Fonctionnalités ({service.fonctionnalites.length})
            </p>
            {service.fonctionnalites.length === 0 ? (
              <p className="mt-1.5 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                Aucune fonctionnalité ne l'utilise.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {service.fonctionnalites.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-full bg-[#f1f3f9] px-2.5 py-1 text-xs font-medium text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]"
                  >
                    {f.nom}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {service.collection && Object.keys(service.collection).length > 0 && (
        <div className="mt-4">
          <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
            Collection
          </p>
          <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-[#f6f8fa] p-3 font-mono text-[11px] leading-relaxed text-[#525f6d] dark:bg-white/5 dark:text-white/60">
            {JSON.stringify(service.collection, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-5 border-t border-[#e6e8f5] pt-4 dark:border-white/10">
        <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
          Procédures stockées
        </p>
        {loading ? (
          <p className="mt-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">Chargement...</p>
        ) : procedures.length === 0 ? (
          <p className="mt-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
            Aucune procédure rattachée.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {procedures.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-[#e6e8f5] bg-white px-3 py-1.5 font-mono text-xs text-[#004a86] dark:border-white/10 dark:bg-white/5 dark:text-[#4aa1de]"
              >
                {p.nom}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const SearchIcon = () => (
  <svg className="h-5 w-5 text-[#525f6d] dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17 3a2.85 2.83 0 114.01 4L8 20l-4 1 1-4L17 3z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 7v5l4 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
  </svg>
);

/** Filtre déroulant, même style que le Journal des changements. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
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
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525f6d] dark:text-white/70"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/** Entête de colonne cliquable : affiche un chevron indiquant le tri actif. */
function ThTriable({
  label,
  cle,
  tri,
  onToggle,
}: {
  label: string;
  cle: TriCle;
  tri: { cle: TriCle; asc: boolean } | null;
  onToggle: (cle: TriCle) => void;
}) {
  const actif = tri?.cle === cle;
  return (
    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">
      <button
        type="button"
        onClick={() => onToggle(cle)}
        className={`inline-flex items-center gap-1 uppercase transition hover:text-[#004a86] dark:hover:text-white ${actif ? "text-[#004a86] dark:text-white" : ""}`}
        title={`Trier par ${label.toLowerCase()}`}
      >
        {label}
        <svg
          className={`h-3 w-3 transition-transform ${actif ? "opacity-100" : "opacity-30"} ${actif && !tri?.asc ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </th>
  );
}

const TableSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-[#e6e8f5] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131313]">
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-[#e6e8f5] dark:bg-white/10" />
      ))}
    </div>
  </div>
);

export function ServicesPage() {
  const { user } = useAuth();
  const peutSupprimer = canDelete(user?.role);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => lireSearchParam());
  const [detail, setDetail] = useState<Service | null>(null);
  const [historyService, setHistoryService] = useState<Service | null>(null);
  const [edit, setEdit] = useState<Service | null>(null);
  const [del, setDel] = useState<Service | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  // Filtre : méthode HTTP réellement utilisée par les services.
  const [filtreMethode, setFiltreMethode] = useState("");
  // Tri par colonne. null = ordre d'origine.
  const [tri, setTri] = useState<{ cle: TriCle; asc: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const t = useRef<number>();

  useEffect(() => setPage(1), [query, tri, filtreMethode]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const fetch = async () => {
    setLoadError(null);
    try {
      setServices(await servicesApi.list());
      setErr(null);
    } catch (e) {
      // Sans ce catch, un échec laissait un tableau vide, indiscernable
      // d'un référentiel réellement vide.
      setLoadError(messageErreur(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch();
  }, []);
  const filtered = useMemo(
    () =>
      services.filter((s) => {
        const q = query.toLowerCase();
        // Recherche élargie : nom, URL, contrôleur, entrée, sortie.
        const correspond =
          s.nom.toLowerCase().includes(q) ||
          (s.url || "").toLowerCase().includes(q) ||
          (s.controleur || "").toLowerCase().includes(q) ||
          (s.input_desc || "").toLowerCase().includes(q) ||
          (s.output_desc || "").toLowerCase().includes(q);
        if (!correspond) return false;
        if (filtreMethode && (s.methode_http || "") !== filtreMethode) return false;
        return true;
      }),
    [services, query, filtreMethode]
  );

  // Applique le tri choisi (sur la vue filtrée, avant pagination).
  const sorted = useMemo(() => {
    if (!tri) return filtered;
    const { cle, asc } = tri;
    const valeur = (s: Service) =>
      cle === "procedures"
        ? s.procedures.length
        : cle === "nom"
          ? s.nom
          : cle === "methode"
            ? s.methode_http ?? ""
            : s.controleur ?? "";
    return [...filtered].sort((a, b) => {
      const va = valeur(a);
      const vb = valeur(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "fr", { sensitivity: "base" });
      return asc ? cmp : -cmp;
    });
  }, [filtered, tri]);

  /** Méthodes HTTP réellement présentes dans les données (pour le filtre). */
  const methodesDisponibles = useMemo(
    () =>
      [...new Set(services.map((s) => s.methode_http).filter((m): m is string => !!m))].sort(),
    [services]
  );

  const filtresActifs = query !== "" || filtreMethode !== "";

  const pageItems = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [sorted.length, page]);

  /** Bascule le tri sur une colonne (asc → desc → aucun). */
  const basculerTri = (cle: TriCle) => {
    setTri((prec) => {
      if (!prec || prec.cle !== cle) return { cle, asc: true };
      if (prec.asc) return { cle, asc: false };
      return null;
    });
  };

  const show = (msg: string) => {
    setToast(msg);
    t.current = window.setTimeout(() => setToast(null), 3000);
  };

  const creer = async (data: ServiceFormData) => {
    setCreateErr(null);
    try {
      await servicesApi.create(data);
      setCreateOpen(false);
      show(`Service "${data.nom}" créé.`);
      await fetch();
    } catch (e: any) {
      setCreateErr(e?.message ?? "Création impossible");
      throw e;
    }
  };

  const modifier = async (data: ServiceFormData) => {
    if (!edit) return;
    setErr(null);
    try {
      await servicesApi.update(edit.id, data);
      setEdit(null);
      show(`Service "${data.nom}" modifié.`);
      await fetch();
    } catch (e: any) {
      setErr(e?.message ?? "Modification impossible");
      throw e;
    }
  };

  const supprimer = async () => {
    if (!del) return;
    try {
      await servicesApi.delete(del.id);
      show(`Service "${del.nom}" supprimé.`);
      setDel(null);
      await fetch();
    } catch (e: any) {
      throw new Error(e?.message ?? "Suppression impossible");
    }
  };

  /**
   * Exporte en CSV la vue filtrée (et triée), pas seulement la page courante.
   * Tout est côté client : les services sont déjà chargés en mémoire.
   */
  const exporterCsv = () => {
    if (sorted.length === 0 || exporting) return;
    setExporting(true);
    try {
      const lignes = [
        ["Nom", "Méthode", "URL", "Contrôleur", "Entrée", "Sortie", "Procédures", "Créé le", "Modifié le"],
        ...sorted.map((s) => [
          s.nom,
          s.methode_http ?? "",
          s.url ?? "",
          s.controleur ?? "",
          s.input_desc ?? "",
          s.output_desc ?? "",
          s.procedures.map((p) => p.nom).join(", "),
          formatDateCsv(s.created_at),
          formatDateCsv(s.updated_at),
        ]),
      ];
      const csv = lignes.map((l) => l.map(celluleCsv).join(";")).join("\r\n");
      // BOM UTF-8 : Excel affiche les accents ; « ; » : séparateur Excel FR.
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `services-techniques-${new Date().toISOString().slice(0, 10)}.csv`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      show("L'export CSV a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="font-poppins">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0c1d31] dark:text-white">Services techniques</h1>
        <p className="mt-1 text-sm text-[#0c1d31]/70 dark:text-white/60">
          Services appelés par les masques, avec leurs procédures stockées
        </p>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-transparent text-sm outline-none dark:text-white/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Tout effacer"
              aria-label="Tout effacer"
              className="shrink-0 rounded-full p-0.5 text-[#525f6d] hover:bg-black/5 hover:text-[#0c1d31] dark:text-white/50 dark:hover:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exporterCsv}
            disabled={sorted.length === 0 || exporting}
            className="flex h-[46px] items-center gap-2 rounded-xl border border-[#003049] px-5 text-sm font-semibold text-[#003049] transition hover:bg-[#e6e8f5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
          >
            <DownloadIcon />
            {exporting ? "Exportation…" : "Exporter CSV"}
          </button>
          <button
            onClick={() => {
              setCreateErr(null);
              setCreateOpen(true);
            }}
            className="flex h-[46px] items-center gap-2 rounded-xl bg-[#003049] px-5 text-sm font-semibold text-white hover:bg-[#00263a]"
          >
            <PlusIcon />
            Nouveau service
          </button>
        </div>
      </div>

      {/* Filtre : méthode HTTP. */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="w-[200px]">
          <FilterSelect
            label="Méthode HTTP"
            value={filtreMethode}
            onChange={setFiltreMethode}
            options={[
              { value: "", label: "Toutes les méthodes" },
              ...methodesDisponibles.map((m) => ({ value: m, label: m })),
            ]}
          />
        </div>
      </div>

      {/* Compteur de résultats : total et, si filtre, nombre filtré. */}
      {!loading && (
        <p className="mb-3 text-sm text-[#525f6d] dark:text-white/60">
          {filtresActifs ? (
            <>
              <span className="font-semibold text-[#0c1d31] dark:text-white">{sorted.length}</span>{" "}
              résultat{sorted.length > 1 ? "s" : ""} sur {services.length} service
              {services.length > 1 ? "s" : ""}
            </>
          ) : (
            <>
              <span className="font-semibold text-[#0c1d31] dark:text-white">{services.length}</span>{" "}
              service{services.length > 1 ? "s" : ""}
            </>
          )}
        </p>
      )}

      {loading ? (
        <TableSkeleton />
      ) : loadError ? (
        <ErrorState
          message="Impossible de charger les services."
          detail={loadError}
          onRetry={fetch}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e6e8f5] bg-white dark:border-white/10 dark:bg-[#131313]">
          <table className="min-w-full divide-y divide-[#e6e8f5] dark:divide-white/10">
            <thead className="bg-[#f6f8fa] dark:bg-white/5">
              <tr>
                <ThTriable label="Nom" cle="nom" tri={tri} onToggle={basculerTri} />
                <ThTriable label="Méthode" cle="methode" tri={tri} onToggle={basculerTri} />
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">URL</th>
                <ThTriable label="Contrôleur" cle="controleur" tri={tri} onToggle={basculerTri} />
                <ThTriable label="Procédures" cle="procedures" tri={tri} onToggle={basculerTri} />
                <th className="px-6 py-3 text-right text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e8f5] dark:divide-white/10">
              {pageItems.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setDetail(s)}
                  title="Voir le détail"
                  className="cursor-pointer hover:bg-[#f6f8fa]/60 dark:hover:bg-white/5"
                >
                  <td
                    className="max-w-[280px] truncate px-6 py-4 text-sm font-medium text-[#0c1d31] dark:text-white"
                    title={s.nom}
                  >
                    {s.nom}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs font-mono font-semibold text-[#004a86] dark:text-[#4aa1de]">
                    {s.methode_http || "—"}
                  </td>
                  <td
                    className="max-w-[280px] truncate px-6 py-4 font-mono text-sm text-[#525f6d] dark:text-white/60"
                    title={s.url || ""}
                  >
                    {s.url || "—"}
                  </td>
                  <td
                    className="max-w-[200px] truncate px-6 py-4 text-sm text-[#525f6d] dark:text-white/60"
                    title={s.controleur || ""}
                  >
                    {s.controleur || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {s.procedures.length === 0 ? (
                      <span className="text-[#8ea0b3] dark:text-white/30">Aucune</span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#e6e8f5] px-2.5 py-1 text-xs font-semibold text-[#003049] dark:bg-white/10 dark:text-white"
                        title={s.procedures.map((p) => p.nom).join(", ")}
                      >
                        {s.procedures.length}
                        <span className="font-normal">
                          procédure{s.procedures.length > 1 ? "s" : ""}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        title="Voir historique"
                        onClick={() => setHistoryService(s)}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                      >
                        <HistoryIcon />
                      </button>
                      <button
                        title="Modifier"
                        onClick={() => {
                          setErr(null);
                          setEdit(s);
                        }}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                      >
                        <PencilIcon />
                      </button>
                      {peutSupprimer && (
                        <button
                          title="Supprimer"
                          onClick={() => setDel(s)}
                          className="rounded-lg p-1.5 text-[#525f6d] hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#8ea0b3] dark:text-white/40">
                    Aucun service trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!loading && (
        <Pagination
          page={page}
          total={sorted.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? detail.nom : ""}
      >
        {detail && <ServiceDetail service={detail} />}
      </DetailModal>

      {createOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Nouveau service</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Le service sera créé seul. Tu pourras ensuite le rattacher à une fonctionnalité.
              </p>
            </div>
            {createErr && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {createErr}
              </p>
            )}
            <ServiceForm
              onSubmit={creer}
              onCancel={() => {
                setCreateOpen(false);
                setCreateErr(null);
              }}
            />
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Modifier le service</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La modification s'applique partout où le service est utilisé.
              </p>
            </div>
            {err && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {err}
              </p>
            )}
            <ServiceForm
              initialData={{
                nom: edit.nom,
                methode_http: edit.methode_http ?? "GET",
                url: edit.url ?? "",
                input_desc: edit.input_desc ?? "",
                output_desc: edit.output_desc ?? "",
                controleur: edit.controleur ?? "",
                collection: edit.collection ?? null,
              }}
              onSubmit={modifier}
              onCancel={() => {
                setEdit(null);
                setErr(null);
              }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={del !== null}
        title="Supprimer le service"
        message={
          del ? (
            <>
              Supprimer <span className="font-semibold">{del.nom}</span> ? Le service sera retiré
              de tous les masques et ses liens supprimés.
            </>
          ) : (
            ""
          )
        }
        onConfirm={supprimer}
        onCancel={() => setDel(null)}
      />

      <EntityHistory
        typeEntite="service"
        entiteId={historyService?.id ?? 0}
        title={historyService ? historyService.nom : ""}
        open={historyService !== null}
        onClose={() => setHistoryService(null)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] rounded-xl border border-[#26A69A]/50 bg-white px-5 py-3 text-sm text-[#0a7d74] shadow-2xl dark:bg-[#131313] dark:text-teal-300">
          {toast}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Export CSV                                                                 */
/* -------------------------------------------------------------------------- */

/** Échappe une cellule : guillemets doublés, tout entre guillemets. */
function celluleCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

/** Date ISO → jj/mm/aaaa hh:mm (plus compact pour un tableur). */
function formatDateCsv(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
