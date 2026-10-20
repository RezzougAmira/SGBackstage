import { useEffect, useMemo, useRef, useState } from "react";
import { masquesApi } from "../api/masques";
import { Masque } from "../types";
import { Modal } from "../components/Modal";
import { DetailModal } from "../components/DetailModal";
import { Pagination } from "../components/Pagination";
import { FonctionnalitesSection } from "../components/FonctionnalitesSection";
import { EntityHistory } from "../components/EntityHistory";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { useAuth } from "../hooks/useAuth";
import { canDelete } from "../utils/roles";

const PAGE_SIZE = 10;

const SearchIcon = () => (
  <svg className="h-5 w-5 text-[#525f6d] dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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

/** Pictogramme discret signalant qu'un masque possède une capture d'écran. */
const ImageIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 18 5-5 3.5 3.5L16 13l4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Filtre déroulant, même style que les autres pages. */
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

const TableSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-[#e6e8f5] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131313]">
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-[#e6e8f5] dark:bg-white/10" />
      ))}
    </div>
  </div>
);

function DetailImage({ imageKey }: { imageKey: string | null }) {
  const src = useProtectedImage(imageKey);
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Capture du masque"
      className="mt-4 max-h-[500px] w-full rounded-lg border border-[#e6e8f5] bg-white object-contain object-top dark:border-white/10 dark:bg-white/5"
    />
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 font-poppins text-sm text-[#0c1d31] dark:text-white/80">
        {value}
      </dd>
    </div>
  );
}

interface FormData {
  code: string;
  nom: string;
  description: string;
}

export function MasquesPage() {
  const { user } = useAuth();
  const peutSupprimer = canDelete(user?.role);
  const [masques, setMasques] = useState<Masque[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<Masque | null>(null);
  const [del, setDel] = useState<Masque | null>(null);
  const [detail, setDetail] = useState<Masque | null>(null);
  const [historyMasque, setHistoryMasque] = useState<Masque | null>(null);
  const [form, setForm] = useState<FormData>({ code: "", nom: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  // Filtre : étape qui porte le masque.
  const [filtreEtape, setFiltreEtape] = useState("");
  const t = useRef<number>();

  useEffect(() => setPage(1), [query, filtreEtape]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const fetch = async () => {
    try {
      setMasques(await masquesApi.list());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch();
  }, []);
  const filtered = useMemo(
    () =>
      masques.filter((m) => {
        const q = query.toLowerCase();
        const correspond =
          m.code.toLowerCase().includes(q) ||
          m.nom.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q);
        if (!correspond) return false;
        if (filtreEtape && !m.etapes.some((e) => String(e.id) === filtreEtape)) return false;
        return true;
      }),
    [masques, query, filtreEtape]
  );

  /** Étapes réellement présentes dans les données (pour le filtre). */
  const etapesDisponibles = useMemo(() => {
    const parId = new Map<number, string>();
    masques.forEach((m) => m.etapes.forEach((e) => parId.set(e.id, e.nom)));
    return [...parId.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
  }, [masques]);

  const filtresActifs = query !== "" || filtreEtape !== "";

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page]);
  const show = (msg: string) => {
    setToast(msg);
    t.current = window.setTimeout(() => setToast(null), 3000);
  };
  const openC = () => {
    setEdit(null);
    setForm({ code: "", nom: "", description: "" });
    setShowModal(true);
    setErr(null);
  };
  const openE = (m: Masque) => {
    setEdit(m);
    setForm({ code: m.code, nom: m.nom, description: m.description || "" });
    setShowModal(true);
    setErr(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      if (edit) {
        await masquesApi.update(edit.id, {
          code: form.code.toUpperCase(),
          nom: form.nom,
          description: form.description || undefined,
        });
        show(`Masque "${form.nom}" modifié.`);
      } else {
        await masquesApi.create({
          code: form.code.toUpperCase(),
          nom: form.nom,
          description: form.description || undefined,
        });
        show(`Masque "${form.nom}" créé.`);
      }
      setShowModal(false);
      await fetch();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };
  const delOk = async () => {
    if (!del) return;
    try {
      await masquesApi.delete(del.id);
      setDel(null);
      show(`Masque "${del.nom}" supprimé.`);
      await fetch();
    } catch (e: any) {
      show(e?.message || "Impossible");
    }
  };

  /**
   * Exporte en CSV la vue filtrée, pas seulement la page courante.
   * Les masques sont déjà chargés en mémoire.
   */
  const exporterCsv = () => {
    if (filtered.length === 0 || exporting) return;
    setExporting(true);
    try {
      const lignes = [
        [
          "Code",
          "Nom",
          "Description",
          "Étapes",
          "Services",
          "Fonctionnalités",
          "Image",
          "Créé le",
          "Modifié le",
        ],
        ...filtered.map((m) => [
          m.code,
          m.nom,
          m.description ?? "",
          m.etapes.map((e) => e.nom).join(", "),
          m.services.map((s) => s.nom).join(", "),
          m.fonctionnalites.map((f) => f.nom).join(", "),
          m.image_key ? "Oui" : "Non",
          formatDateCsv(m.created_at),
          formatDateCsv(m.updated_at),
        ]),
      ];
      const csv = lignes.map((l) => l.map(celluleCsv).join(";")).join("\r\n");
      // BOM UTF-8 : Excel affiche les accents ; « ; » : séparateur Excel FR.
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `masques-${new Date().toISOString().slice(0, 10)}.csv`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      window.alert("L'export CSV a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="font-poppins">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0c1d31] dark:text-white">Masques</h1>
        <p className="mt-1 text-sm text-[#0c1d31]/70 dark:text-white/60">
          Écrans de l'application rattachés aux étapes, avec leurs fonctionnalités
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
            disabled={filtered.length === 0 || exporting}
            className="flex h-[46px] items-center gap-2 rounded-xl border border-[#003049] px-5 text-sm font-semibold text-[#003049] transition hover:bg-[#e6e8f5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
          >
            <DownloadIcon />
            {exporting ? "Exportation…" : "Exporter CSV"}
          </button>
          <button
            onClick={openC}
            className="flex h-[46px] items-center gap-2 rounded-xl bg-[#003049] px-5 text-sm font-semibold text-white hover:bg-[#00263a]"
          >
            <PlusIcon />
            Nouveau masque
          </button>
        </div>
      </div>

      {/* Filtre : étape qui porte le masque. */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="w-[240px]">
          <FilterSelect
            label="Étape"
            value={filtreEtape}
            onChange={setFiltreEtape}
            options={[
              { value: "", label: "Toutes les étapes" },
              ...etapesDisponibles.map((e) => ({ value: String(e.id), label: e.nom })),
            ]}
          />
        </div>
      </div>

      {/* Compteur de résultats : total et, si filtre, nombre filtré. */}
      {!loading && (
        <p className="mb-3 text-sm text-[#525f6d] dark:text-white/60">
          {filtresActifs ? (
            <>
              <span className="font-semibold text-[#0c1d31] dark:text-white">{filtered.length}</span>{" "}
              résultat{filtered.length > 1 ? "s" : ""} sur {masques.length} masque
              {masques.length > 1 ? "s" : ""}
            </>
          ) : (
            <>
              <span className="font-semibold text-[#0c1d31] dark:text-white">{masques.length}</span>{" "}
              masque{masques.length > 1 ? "s" : ""}
            </>
          )}
        </p>
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e6e8f5] bg-white dark:border-white/10 dark:bg-[#131313]">
          <table className="min-w-full divide-y divide-[#e6e8f5] dark:divide-white/10">
            <thead className="bg-[#f6f8fa] dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Description</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e8f5] dark:divide-white/10">
              {pageItems.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setDetail(m)}
                  title="Voir le détail"
                  className="cursor-pointer hover:bg-[#f6f8fa]/60 dark:hover:bg-white/5"
                >
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-[#004a86] dark:text-[#4aa1de]">
                    <span className="inline-flex items-center gap-2">
                      {m.code}
                      {m.image_key && (
                        <span
                          className="text-[#8ea0b3] dark:text-white/40"
                          title="Ce masque possède une capture d'écran"
                          aria-label="Ce masque possède une capture d'écran"
                        >
                          <ImageIcon />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#0c1d31] dark:text-white">{m.nom}</td>
                  <td
                    className="max-w-md truncate px-6 py-4 text-sm text-[#525f6d] dark:text-white/60"
                    title={m.description || ""}
                  >
                    {m.description || "—"}
                  </td>
                  <td className="flex justify-end gap-1 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="Voir historique"
                      onClick={() => setHistoryMasque(m)}
                      className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                    >
                      <HistoryIcon />
                    </button>
                    <button
                      title="Modifier"
                      onClick={() => openE(m)}
                      className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                    >
                      <PencilIcon />
                    </button>
                    {peutSupprimer && (
                      <button
                        title="Supprimer"
                        onClick={() => setDel(m)}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-[#8ea0b3] dark:text-white/40">
                    Aucun masque trouvé.
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
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={edit ? "Modifier le masque" : "Nouveau masque"}>
        <form onSubmit={submit} className="space-y-4">
          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {err}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 6) }))}
              required
              className="w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Nom</label>
            <input
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              required
              className="w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-[#e6e8f5] px-5 py-2 text-sm font-semibold dark:border-white/10 dark:text-white/70"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#003049] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
      {del && (
        <Modal isOpen onClose={() => setDel(null)} title="Supprimer le masque">
          <p className="text-sm dark:text-white/60">
            Supprimer <span className="font-semibold">{del.code} — {del.nom}</span> ?
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDel(null)}
              className="rounded-lg border border-[#e6e8f5] px-5 py-2 text-sm font-semibold dark:border-white/10 dark:text-white/70"
            >
              Annuler
            </button>
            <button onClick={delOk} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white">
              Supprimer
            </button>
          </div>
        </Modal>
      )}
      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} — ${detail.nom}` : ""}
      >
        {detail && (
          <div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailField
                label="Code"
                value={<span className="font-mono">{detail.code}</span>}
              />
              <DetailField label="Nom" value={detail.nom} />
              <div className="sm:col-span-2">
                <DetailField label="Description" value={detail.description || "—"} />
              </div>
              <DetailField
                label="Créé le"
                value={new Date(detail.created_at).toLocaleString("fr-FR")}
              />
              <DetailField
                label="Modifié le"
                value={new Date(detail.updated_at).toLocaleString("fr-FR")}
              />
            </dl>

            <DetailImage imageKey={detail.image_key} />

            {/* Où le masque est utilisé : étapes qui le portent + services appelés. */}
            <div className="mt-5 border-t border-[#e6e8f5] pt-4 dark:border-white/10">
              <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
                Où le masque est utilisé
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Étapes ({detail.etapes.length})
                  </p>
                  {detail.etapes.length === 0 ? (
                    <p className="mt-1.5 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                      Ce masque n'est rattaché à aucune étape.
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {detail.etapes.map((e) => (
                        <li
                          key={e.id}
                          className="rounded-full bg-[#e6e8f5] px-2.5 py-1 text-xs font-medium text-[#003049] dark:bg-white/10 dark:text-white"
                        >
                          {e.nom}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Services appelés ({detail.services.length})
                  </p>
                  {detail.services.length === 0 ? (
                    <p className="mt-1.5 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                      Aucun service n'est appelé par ce masque.
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {detail.services.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-full bg-[#f1f3f9] px-2.5 py-1 text-xs font-medium text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]"
                        >
                          {s.nom}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <FonctionnalitesSection masqueId={detail.id} />
          </div>
        )}
      </DetailModal>
      <EntityHistory
        typeEntite="masque"
        entiteId={historyMasque?.id ?? 0}
        title={historyMasque ? `${historyMasque.code} — ${historyMasque.nom}` : ""}
        open={historyMasque !== null}
        onClose={() => setHistoryMasque(null)}
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
