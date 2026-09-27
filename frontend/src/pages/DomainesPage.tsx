import { useEffect, useMemo, useState } from "react";
import { Domaine } from "../types";
import { domainesApi } from "../api/domaines";
import { Modal } from "../components/Modal";
import { DomaineForm } from "../components/forms/DomaineForm";
import { DomainesSkeleton } from "../components/ui/pageSkeletons";

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
  const [domaines, setDomaines] = useState<DomaineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");

  const fetchDomaines = async () => {
    try {
      const data = await domainesApi.list();
      const withCounts = await Promise.all(
        data.map(async (d) => {
          let etapes = 0;
          try {
            const processus = await domainesApi.listProcesses(d.id);
            etapes = processus.reduce((sum, p) => sum + (p.etape_count || 0), 0);
          } catch {
            etapes = 0;
          }
          return { ...d, processus: d.process_count || 0, etapes, masques: d.masque_count ?? "-" } as DomaineCard;
        })
      );
      setDomaines(withCounts);
    } catch (error) {
      console.error("Erreur:", error);
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

  const handleCreate = async (data: { nom: string; description?: string }) => {
    await domainesApi.create(data);
    await fetchDomaines();
    setShowModal(false);
  };

  if (loading) {
    return <DomainesSkeleton />;
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
            </div>

            <div className="flex flex-wrap gap-3 text-[13px]">
              <CountBadge count={d.processus} label="Processus" />
              <CountBadge count={d.etapes} label="Étapes" />
              <CountBadge count={d.masques} label="Masques" />
            </div>

            <a
              href={`/domaines/${d.id}`}
              className="mt-auto self-end rounded-full border border-[#004a86] px-5 py-2 text-[13px] font-medium text-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-[#4aa1de] dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
            >
              Voir Plus
            </a>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-[14px] text-[#071c38]/50">
            Aucun domaine ne correspond à votre recherche.
          </p>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau domaine">
        <DomaineForm
          onSubmit={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}