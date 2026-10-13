import { useEffect, useMemo, useRef, useState } from "react";
import { proceduresApi } from "../api/procedures";
import { Procedure } from "../types";
import { DetailModal } from "../components/DetailModal";
import { Pagination } from "../components/Pagination";
import { ConfirmModal } from "../components/ConfirmModal";
import { ProcedureForm } from "../components/forms/ProcedureForm";
import { EntityHistory } from "../components/EntityHistory";

const PAGE_SIZE = 10;

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

const TableSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-[#e6e8f5] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131313]">
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-[#e6e8f5] dark:bg-white/10" />
      ))}
    </div>
  </div>
);

export function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Procedure | null>(null);
  const [historyProcedure, setHistoryProcedure] = useState<Procedure | null>(null);
  const [edit, setEdit] = useState<Procedure | null>(null);
  const [del, setDel] = useState<Procedure | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const t = useRef<number>();

  useEffect(() => setPage(1), [query]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const fetch = async () => {
    try {
      setProcedures(await proceduresApi.list());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch();
  }, []);
  const filtered = useMemo(
    () =>
      procedures.filter((p) => {
        const q = query.toLowerCase();
        return p.nom.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      }),
    [procedures, query]
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

  const creer = async (data: { nom: string; description?: string }) => {
    setCreateErr(null);
    try {
      await proceduresApi.create(data);
      setCreateOpen(false);
      show(`Procédure "${data.nom}" créée.`);
      await fetch();
    } catch (e: any) {
      setCreateErr(e?.message ?? "Création impossible");
      throw e;
    }
  };

  const modifier = async (data: { nom: string; description?: string }) => {
    if (!edit) return;
    setErr(null);
    try {
      await proceduresApi.update(edit.id, data);
      setEdit(null);
      show(`Procédure "${data.nom}" modifiée.`);
      await fetch();
    } catch (e: any) {
      setErr(e?.message ?? "Modification impossible");
      throw e;
    }
  };

  const supprimer = async () => {
    if (!del) return;
    try {
      await proceduresApi.delete(del.id);
      show(`Procédure "${del.nom}" supprimée.`);
      setDel(null);
      await fetch();
    } catch (e: any) {
      throw new Error(e?.message ?? "Suppression impossible");
    }
  };

  

  return (
    <div className="font-poppins">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0c1d31] dark:text-white">Procédures stockées</h1>
        <p className="mt-1 text-sm text-[#0c1d31]/70 dark:text-white/60">
          Opérations en base invoquées par les services
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
          onClick={() => {
            setCreateErr(null);
            setCreateOpen(true);
          }}
          className="flex h-[46px] items-center gap-2 rounded-xl bg-[#003049] px-5 text-sm font-semibold text-white hover:bg-[#00263a]"
        >
          <PlusIcon />
          Nouvelle procédure
        </button>
      </div>
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e6e8f5] bg-white dark:border-white/10 dark:bg-[#131313]">
          <table className="min-w-full divide-y divide-[#e6e8f5] dark:divide-white/10">
            <thead className="bg-[#f6f8fa] dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Description</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase text-[#8ea0b3] dark:text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e8f5] dark:divide-white/10">
              {pageItems.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setDetail(p)}
                  title="Voir le détail"
                  className="cursor-pointer hover:bg-[#f6f8fa]/60 dark:hover:bg-white/5"
                >
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-[#004a86] dark:text-[#4aa1de]">
                    {p.nom}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#525f6d] dark:text-white/60">{p.description || "—"}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        title="Voir historique"
                        onClick={() => setHistoryProcedure(p)}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                      >
                        <HistoryIcon />
                      </button>
                      <button
                        title="Modifier"
                        onClick={() => {
                          setErr(null);
                          setEdit(p);
                        }}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={() => setDel(p)}
                        className="rounded-lg p-1.5 text-[#525f6d] hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-[#8ea0b3] dark:text-white/40">
                    Aucune procédure trouvée.
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
      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? detail.nom : ""}
      >
        {detail && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DetailField label="Nom" value={<span className="font-mono">{detail.nom}</span>} />
            </div>
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
        )}
      </DetailModal>

      {createOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Nouvelle procédure</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La procédure sera créée seule. Tu pourras ensuite la rattacher à un service.
              </p>
            </div>
            {createErr && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {createErr}
              </p>
            )}
            <ProcedureForm
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
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Modifier la procédure</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La modification s'applique partout où la procédure est utilisée.
              </p>
            </div>
            {err && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {err}
              </p>
            )}
            <ProcedureForm
              initialData={{ nom: edit.nom, description: edit.description ?? "" }}
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
        title="Supprimer la procédure"
        message={
          del ? (
            <>
              Supprimer <span className="font-semibold">{del.nom}</span> ? La procédure sera
              détachée des services qui l'utilisent puis supprimée.
            </>
          ) : (
            ""
          )
        }
        onConfirm={supprimer}
        onCancel={() => setDel(null)}
      />

      <EntityHistory
        typeEntite="procedure"
        entiteId={historyProcedure?.id ?? 0}
        title={historyProcedure ? historyProcedure.nom : ""}
        open={historyProcedure !== null}
        onClose={() => setHistoryProcedure(null)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] rounded-xl border border-[#26A69A]/50 bg-white px-5 py-3 text-sm text-[#0a7d74] shadow-2xl dark:bg-[#131313] dark:text-teal-300">
          {toast}
        </div>
      )}
    </div>
  );
}
