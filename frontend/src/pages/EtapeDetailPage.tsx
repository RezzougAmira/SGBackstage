import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { etapesApi } from "../api/etapes";
import { EtapeDetail } from "../types";
import { Breadcrumb } from "../components/Breadcrumb";
import { EtapeDetails } from "../components/EtapeDetails";
import { DetailSkeleton } from "../components/ui/pageSkeletons";

export function EtapeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [etape, setEtape] = useState<EtapeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEtape = async () => {
      if (!id) return;
      try {
        const data = await etapesApi.getById(parseInt(id));
        setEtape(data);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEtape();
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!etape) {
    return <div className="py-8 text-center">Étape non trouvée</div>;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Métiers", path: "/domaines" },
          { label: "Étapes" },
          { label: etape.nom },
        ]}
      />

      {/* Titre */}
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          {etape.nom}
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          Détails de l'étape {etape.ordre} et masques associés
        </p>
      </div>

      {etape.description && (
        <p className="mb-6 max-w-2xl font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          {etape.description}
        </p>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <h2 className="mb-4 font-poppins text-xl font-bold text-[#0c1d31] dark:text-white">
          Masques associés
        </h2>
        <EtapeDetails etape={etape} />
      </div>
    </div>
  );
}