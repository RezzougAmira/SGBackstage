import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Domaine } from "../types";
import { domainesApi } from "../api/domaines";
import { DomaineForm } from "../components/forms/DomaineForm";
import { ConfirmModal } from "../components/ConfirmModal";
import { DomainesSkeleton } from "../components/ui/pageSkeletons";
import { useAuth } from "../hooks/useAuth";
import { canDelete } from "../utils/roles";
import { messageErreur } from "../utils/erreurs";
import { ErrorState } from "../components/ui/ErrorState";

interface DomaineCard extends Domaine {
  processus: number;
  etapes: number;
  masques: number | string;
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0 text-[#525f6d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-7 w-7 text-[#004a86]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CountBadge({ count, label }: { count: number | string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-[#f6f8fa] px-3 py-1.5 text-[13px] text-[#071c38] dark:bg-white/10 dark:text-gray-200">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#004a86] text-[11px] font-semibold text-white">
        {count}
      </span>
      {label}
    </span>
  );
}

export function DomainesPage() {
  const { user } = useAuth();
  const peutSupprimer = canDelete(user?.role);
  const [domaines, setDomaines] = useState<DomaineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [domaineEnEdition, setDomaineEnEdition] = useState<DomaineCard | null>(null);
  const [domaineToDelete, setDomaineToDelete] = useState<DomaineCard | null>(null);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fetchDomaines = async () => {
    setLoadError(null);
    try {
      const response = await domainesApi.list(1, 500);
      const withCounts = await Promise.all(
        response.items.map(async (d) => {
          let etapes = 0;
          try {
            const processusResponse = await domainesApi.listProcesses(d.id, 1, 500);
            etapes = processusResponse.items.reduce((sum, p) => sum + (p.etape_count || 0), 0);
          } catch {
            etapes = 0;
          }
          return { ...d, processus: d.process_count || 0, etapes, masques: d.masque_count ?? "-" } as DomaineCard;
        })
      );
      setDomaines(withCounts);
    } catch (error) {
      // Sans ce catch, l'échec affichait des compteurs à zéro, indiscernables
      // de domaines réellement vides.
      setLoadError(messageErreur(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomaines();
  }, []);

  const filtered = useMemo(
    () =>
      domaines.filter((d) => d.nom.toLowerCase().includes(query.trim().toLowerCase())),
    [domaines, query]
  );

  const showToast = (message: string) => {
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (data: { nom: string; description?: string }) => {
    const domaine = await domainesApi.create(data);
    await fetchDomaines();
    setShowModal(false);
    showToast(`Domaine "${domaine.nom}" créé avec succès.`);
  };

  const handleEdit = async (data: { nom: string; description?: string }) => {
    if (!domaineEnEdition) return;
    await domainesApi.update(domaineEnEdition.id, data);
    await fetchDomaines();
    setDomaineEnEdition(null);
    showToast(`Domaine "${data.nom}" modifié avec succès.`);
  };

  const handleDelete = async () => {
    if (!domaineToDelete) return;
    await domainesApi.delete(domaineToDelete.id);
    setDomaineToDelete(null);
    await fetchDomaines();
    showToast(`Domaine "${domaineToDelete.nom}" supprimé.`);
  };

  if (loading) {
    return <DomainesSkeleton />;
  }

  if (loadError) {
    return (
      <div className="font-poppins">
        <div className="mb-6">
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
            Domaines
          </h1>
          <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
            Explorez et gérez les domaines métier
          </p>
        </div>
        <ErrorState
          message="Impossible de charger les domaines."
          detail={loadError}
          onRetry={fetchDomaines}
        />
      </div>
    );
  }

  return (
    <div className="font-poppins">
      {/* Titre */}
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          Domaines
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          Explorez et gérez les domaines métier
        </p>
      </div>

      {/* Barre de recherche + bouton nouveau domaine */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un domaine..."
            className="w-full bg-transparent font-poppins text-sm text-[#525f6d] placeholder:text-[#525f6d] outline-none dark:text-white/70"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 py-3 font-poppins text-sm font-semibold text-white hover:bg-[#00263a]"
        >
          <PlusIcon />
          Nouveau domaine
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {filtered.map((d) => (
          <article
            key={d.id}
            className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg dark:bg-[#131313]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#e6e8f5] dark:bg-white/10">
                <BuildingIcon />
              </div>
              <div>
                <h2 className="text-[19px] font-bold text-[#071c38] dark:text-white">
                  {d.nom}
                </h2>
                <p className="mt-1 text-[13px] text-[#071c38]/60 dark:text-gray-400">
                  {d.description}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title="Modifier le domaine"
                  onClick={() => setDomaineEnEdition(d)}
                  className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 3a2.85 2.83 0 114.01 4L8 20l-4 1 1-4L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {peutSupprimer && (
                  <button
                    type="button"
                    title="Supprimer le domaine"
                    onClick={() => setDomaineToDelete(d)}
                    className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[13px]">
              <CountBadge count={d.processus} label="Processus" />
              <CountBadge count={d.etapes} label="Étapes" />
              <CountBadge count={d.masques} label="Masques" />
            </div>

            <Link
              to={`/domaines/${d.id}`}
              className="mt-auto self-end rounded-full border border-[#004a86] px-5 py-2 text-[13px] font-medium text-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-[#4aa1de] dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
            >
              Voir Plus
            </Link>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-[14px] text-[#071c38]/50">
            Aucun domaine ne correspond à votre recherche.
          </p>
        )}
      </div>

      {showModal && (
        <DomaineForm
          onSubmit={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      )}

      {domaineEnEdition && (
        <DomaineForm
          key={domaineEnEdition.id}
          initialData={{
            nom: domaineEnEdition.nom,
            description: domaineEnEdition.description ?? "",
          }}
          submitLabel="Enregistrer"
          title="Modifier le domaine"
          subtitle="Mise à jour des informations du domaine"
          onSubmit={handleEdit}
          onCancel={() => setDomaineEnEdition(null)}
        />
      )}

      <ConfirmModal
        isOpen={domaineToDelete !== null}
        title="Supprimer le domaine"
        message={
          <>
            <p>
              Êtes-vous sûr de vouloir supprimer le domaine{" "}
              <span className="font-semibold text-[#0A2540] dark:text-white">
                {domaineToDelete?.nom}
              </span>{" "}
              ?
            </p>
            {domaineToDelete && (domaineToDelete.processus > 0 || domaineToDelete.etapes > 0) && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {domaineToDelete.processus} process
                {domaineToDelete.processus > 1 ? " le" : ""}
                {domaineToDelete.etapes > 0 && `${domaineToDelete.processus > 0 ? " et " : ""}${domaineToDelete.etapes} étape${domaineToDelete.etapes > 1 ? "s" : ""} en dépendent`}{" "}
                et seront supprimés avec lui.
              </p>
            )}
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDomaineToDelete(null)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl border border-[#26A69A]/50 bg-white px-5 py-3 text-sm font-medium text-[#0a7d74] shadow-2xl dark:bg-[#131313] dark:text-teal-300">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
