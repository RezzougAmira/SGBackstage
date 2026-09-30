import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Domaine, Process } from "../types";
import { domainesApi } from "../api/domaines";
import { processesApi } from "../api/processes";
import { Breadcrumb } from "../components/Breadcrumb";
import { ProcessForm } from "../components/forms/ProcessForm";
import { DomaineDetailSkeleton } from "../components/ui/pageSkeletons";

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg className="h-7 w-7 text-[#004a86]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="6" height="5" rx="1.5" />
      <rect x="15" y="15" width="6" height="5" rx="1.5" />
      <path d="M9 6.5h4a2 2 0 0 1 2 2v1M6 9v7a2 2 0 0 0 2 2h4" strokeLinecap="round" />
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

export function DomaineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [domaine, setDomaine] = useState<Domaine | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [domaineData, processesData] = await Promise.all([
        domainesApi.get(parseInt(id)),
        domainesApi.listProcesses(parseInt(id)),
      ]);
      setDomaine(domaineData);
      setProcesses(processesData);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const showToast = (message: string) => {
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  const handleCreateProcess = async (data: { nom: string; description?: string }) => {
    if (!id) return;
    const process = await processesApi.create(parseInt(id), data);
    await fetchData();
    setShowModal(false);
    showToast(`Process "${process.nom}" créé avec succès.`);
  };

  if (loading) {
    return <DomaineDetailSkeleton />;
  }

  if (!domaine) {
    return <div className="py-8 text-center">Domaine non trouvé</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Métiers", path: "/domaines" }, { label: domaine.nom }]} />

      {/* Titre */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
            {domaine.nom}
          </h1>
          {domaine.description && (
            <p className="mt-1 max-w-2xl font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
              {domaine.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 py-3 font-poppins text-sm font-semibold text-white hover:bg-[#00263a]"
        >
          <PlusIcon />
          Nouveau process
        </button>
      </div>

      {/* Liste des processus */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {processes.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-white py-10 text-center font-poppins text-sm text-[#525f6d] shadow-sm dark:bg-[#131313] dark:text-white/60">
            Aucun process pour ce domaine
          </div>
        ) : (
          processes.map((process) => (
            <article
              key={process.id}
              className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg dark:bg-[#131313]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#e6e8f5] dark:bg-white/10">
                  <ProcessIcon />
                </div>
                <div>
                  <h2 className="font-poppins text-[19px] font-bold text-[#071c38] dark:text-white">
                    {process.nom}
                  </h2>
                  <p className="mt-1 font-poppins text-[13px] text-[#071c38]/60 dark:text-gray-400">
                    {process.description || "Pas de description"}
                  </p>
                </div>
              </div>

              <CountBadge count={process.etape_count || 0} label="Étapes" />

              <Link
                to={`/processes/${process.id}`}
                state={{
                  nom: process.nom,
                  description: process.description,
                  diagramme_url: process.diagramme_url,
                }}
                className="mt-auto self-end rounded-full border border-[#004a86] px-5 py-2 font-poppins text-[13px] font-medium text-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-[#4aa1de] dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
              >
                Voir Plus
              </Link>
            </article>
          ))
        )}
      </div>

      {showModal && (
        <ProcessForm
          onSubmit={handleCreateProcess}
          onCancel={() => setShowModal(false)}
        />
      )}

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
