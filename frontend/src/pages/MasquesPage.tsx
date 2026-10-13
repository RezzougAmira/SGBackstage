import { useEffect, useMemo, useRef, useState } from "react";
import { masquesApi } from "../api/masques";
import { Masque } from "../types";
import { Modal } from "../components/Modal";
import { DetailModal } from "../components/DetailModal";
import { Pagination } from "../components/Pagination";
import { FonctionnalitesSection } from "../components/FonctionnalitesSection";
import { EntityHistory } from "../components/EntityHistory";
import { useProtectedImage } from "../hooks/useProtectedImage";

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
  const t = useRef<number>();

  useEffect(() => setPage(1), [query]);
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
        return (
          m.code.toLowerCase().includes(q) ||
          m.nom.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q)
        );
      }),
    [masques, query]
  );
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

  return (
    <div className="font-poppins">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0c1d31] dark:text-white">Masques</h1>
        <p className="mt-1 text-sm text-[#0c1d31]/70 dark:text-white/60">
          Écrans de l'application rattachés aux étapes, avec leurs fonctionnalités
        </p>
      </div>
      <div className="mb-8 flex flex-wrap justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-transparent text-sm outline-none dark:text-white/70"
          />
        </label>
        <button
          onClick={openC}
          className="flex h-[46px] items-center gap-2 rounded-xl bg-[#003049] px-5 text-sm font-semibold text-white hover:bg-[#00263a]"
        >
          <PlusIcon />
          Nouveau masque
        </button>
      </div>
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
                    {m.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#0c1d31] dark:text-white">{m.nom}</td>
                  <td className="max-w-md truncate px-6 py-4 text-sm text-[#525f6d] dark:text-white/60">
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
                    <button
                      title="Supprimer"
                      onClick={() => setDel(m)}
                      className="rounded-lg p-1.5 text-[#525f6d] hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                    >
                      <TrashIcon />
                    </button>
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
