import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EtapeDetail, EtapeImpact } from "../types";
import { processesApi } from "../api/processes";
import { etapesApi } from "../api/etapes";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { ProcessSchema } from "../components/ProcessSchema";
import { EtapeForm } from "../components/forms/EtapeForm";
import { ProcessDetailSkeleton } from "../components/ui/pageSkeletons";
import { useAuth } from "../hooks/useAuth";
import { canDelete } from "../utils/roles";
import { messageErreur } from "../utils/erreurs";
import { ErrorState } from "../components/ui/ErrorState";

interface ProcessState {
  nom?: string;
  description?: string;
  diagramme_url?: string | null;
}

function Chevron() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#8ea0b3]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const peutSupprimer = canDelete(user?.role);
  const location = useLocation();
  const navigate = useNavigate();
  const processState = (location.state as ProcessState | null) ?? null;

  const [etapes, setEtapes] = useState<EtapeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [etapeToDelete, setEtapeToDelete] = useState<EtapeDetail | null>(null);
  const [etapeImpact, setEtapeImpact] = useState<EtapeImpact | null>(null);
  const [supprimerMasques, setSupprimerMasques] = useState(false);
  const [analyseImpact, setAnalyseImpact] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fetchData = async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const processId = parseInt(id);
      const etapesResponse = await processesApi.listEtapes(processId, 1, 500);
      const details = await Promise.all(etapesResponse.items.map((e) => etapesApi.get(processId, e.id)));
      setEtapes(details);
    } catch (error) {
      // Sans ce catch, l'échec laissait une page sans étapes, indiscernable
      // d'un processus réellement vide.
      setLoadError(messageErreur(error));
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

  // Document Word du process (toutes ses étapes), assemblé côté serveur comme
  // celui d'une étape : on récupère le binaire puis on déclenche le téléchargement.
  const handleExportDocx = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const blob = await processesApi.exportDocx(parseInt(id));
      const url = URL.createObjectURL(blob);
      const nom = (processState?.nom || "process")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .toLowerCase();
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `process-${nom || "export"}.docx`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      showToast("Document Word du process généré.");
    } catch (error) {
      console.error("Erreur:", error);
      showToast("Export impossible.");
    } finally {
      setExporting(false);
    }
  };

  const handleCreateEtape = async (data: { nom: string; description?: string; ordre: number }) => {
    if (!id) return;
    const etape = await etapesApi.create(parseInt(id), data);
    await fetchData();
    setShowModal(false);
    showToast(`Étape "${etape.nom}" créée avec succès.`);
  };

  // Le détail d'une étape est une page à part entière : le processus garde la
  // vision d'ensemble (schéma + liste) et l'étape affiche ses masques.
  const openEtape = (etapeId: number) => {
    navigate(`/etapes/${etapeId}`, {
      state: { processNom: processState?.nom, processId: id ? parseInt(id) : undefined },
    });
  };

  // L'impact est demandé au clic : il dépend des partages, qui ont pu changer
  // depuis le chargement de la page.
  const askDeleteEtape = async (etape: EtapeDetail) => {
    setEtapeToDelete(etape);
    setSupprimerMasques(false);
    setEtapeImpact(null);
    setAnalyseImpact(true);
    try {
      setEtapeImpact(await etapesApi.impact(etape.id));
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setAnalyseImpact(false);
    }
  };

  const closeDeleteEtape = () => {
    setEtapeToDelete(null);
    setEtapeImpact(null);
    setSupprimerMasques(false);
  };

  // Si l'analyse d'impact échoue, on retombe sur les masques déjà chargés avec
  // l'étape : l'utilisateur doit toujours pouvoir trancher.
  const nbMasques =
    etapeImpact?.masques.length ?? etapeToDelete?.masques.length ?? 0;
  const impactIndisponible =
    !analyseImpact && etapeImpact === null && (etapeToDelete?.masques.length ?? 0) > 0;

  const handleDeleteEtape = async () => {
    if (!etapeToDelete || !id) return;
    const resultat = await etapesApi.delete(
      parseInt(id),
      etapeToDelete.id,
      supprimerMasques
    );
    closeDeleteEtape();
    await fetchData();

    const summarizes: string[] = [];
    if (resultat.masques.supprimes.length > 0) {
      summarizes.push(
        `${resultat.masques.supprimes.length} masque(s) effacé(s) définitivement`
      );
    }
    if (resultat.masques.conserves.length > 0) {
      summarizes.push(
        `${resultat.masques.conserves.length} masque(s) conservé(s)`
      );
    }
    showToast(
      summarizes.length > 0
        ? `Étape "${resultat.etape.nom}" supprimée — ${summarizes.join(", ")}.`
        : `Étape "${resultat.etape.nom}" supprimée.`
    );
  };

  const nextOrdre = etapes.reduce((max, e) => Math.max(max, e.ordre), 0) + 1;

  if (loading) {
    return <ProcessDetailSkeleton />;
  }

  if (loadError) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: "Métiers", path: "/domaines" },
            { label: processState?.nom || "Process" },
          ]}
        />
        <ErrorState
          message="Impossible de charger le processus."
          detail={loadError}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const diagrammeUrl = processState?.diagramme_url ?? null;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Métiers", path: "/domaines" },
          { label: processState?.nom || "Process" },
        ]}
      />

      {/* Titre */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
            {processState?.nom || "Process"}
          </h1>
          {processState?.description && (
            <p className="mt-1 max-w-2xl font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
              {processState.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={exporting}
            className="flex h-[46px] items-center gap-2 rounded-xl border border-[#003049] px-5 font-poppins text-sm font-semibold text-[#003049] transition hover:bg-[#e6e8f5] disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {exporting ? "Export..." : "Exporter process"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 py-3 font-poppins text-sm font-semibold text-white hover:bg-[#00263a]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nouvelle étape
          </button>
        </div>
      </div>

      {/* Zone schéma */}
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-poppins text-xl font-bold text-[#0c1d31] dark:text-white">
            Schéma du processus
          </h2>
          {diagrammeUrl && (
            <button
              type="button"
              onClick={() => setShowDiagram((v) => !v)}
              className="rounded-full border border-[#004a86] px-4 py-1.5 font-poppins text-xs font-medium text-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-[#4aa1de] dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
            >
              {showDiagram ? "Schéma auto-généré" : "Voir l'image importée"}
            </button>
          )}
        </div>

        {diagrammeUrl && showDiagram ? (
          <img
            src={diagrammeUrl}
            alt={`Schéma de ${processState?.nom ?? "processus"}`}
            className="mx-auto max-h-[420px] w-auto rounded-xl border border-[#e6e8f5] object-contain dark:border-white/10"
          />
        ) : (
          <ProcessSchema etapes={etapes} onSelectEtape={openEtape} />
        )}
      </section>

      {/* Liste des étapes */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <h2 className="mb-4 font-poppins text-xl font-bold text-[#0c1d31] dark:text-white">
          Étapes du processus
        </h2>

        {etapes.length === 0 ? (
          <p className="py-6 text-center font-poppins text-sm text-[#525f6d] dark:text-white/60">
            Aucune étape définie pour ce processus
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {etapes.map((etape) => (
              <li key={etape.id}>
                <Link
                  to={`/etapes/${etape.id}`}
                  state={{ processNom: processState?.nom, processId: id ? parseInt(id) : undefined }}
                  className="flex w-full items-center gap-4 rounded-xl border border-[#e6e8f5] px-4 py-3 transition hover:border-[#004a86] hover:bg-[#fbfbfe] hover:shadow-sm dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#004a86] font-poppins text-xs font-bold text-white">
                    {etape.ordre}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-poppins text-sm font-semibold text-[#0c1d31] dark:text-white">
                      {etape.nom}
                    </span>
                    {etape.description && (
                      <span className="mt-0.5 block truncate font-poppins text-xs text-[#525f6d] dark:text-white/60">
                        {etape.description}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                    {etape.masques.length} masque{etape.masques.length > 1 ? "s" : ""}
                  </span>
                  {peutSupprimer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        // Le bouton est imbriqué dans un <Link> : sans ces deux
                        // appels, le clic déclencherait aussi la navigation.
                        e.preventDefault();
                        e.stopPropagation();
                        askDeleteEtape(etape);
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showModal && (
        <EtapeForm
          defaultOrdre={nextOrdre}
          maxOrdre={nextOrdre}
          onSubmit={handleCreateEtape}
          onCancel={() => setShowModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={etapeToDelete !== null}
        title="Supprimer l'étape"
        message={
          <>
            <p>
              Êtes-vous sûr de vouloir supprimer l'étape{" "}
              <span className="font-semibold text-[#0A2540] dark:text-white">
                {etapeToDelete?.nom}
              </span>{" "}
              ?
            </p>

            {analyseImpact && (
              <p className="mt-2 text-xs text-[#8ea0b3]">Analyse de l'impact...</p>
            )}

            {impactIndisponible && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Détail des partages indisponible (backend à redémarrer ?).
              </p>
            )}

            {etapeImpact && etapeImpact.masques.length > 0 && (
              <div className="mt-3 rounded-lg bg-[#fbfbfe] p-3 text-xs dark:bg-white/5">
                <p className="font-semibold text-[#0A2540] dark:text-white">
                  {etapeImpact.masques.length} masque
                  {etapeImpact.masques.length > 1 ? "s" : ""} associé
                  {etapeImpact.masques.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {etapeImpact.masques.map((m) => (
                    <li key={m.id} className="flex flex-col">
                      <span className="font-mono font-semibold text-[#004a86] dark:text-[#4aa1de]">
                        {m.code}
                      </span>
                      {m.autres_etapes.length > 0 && (
                        <span className="text-[#a8741a]">
                          aussi utilisé dans {m.autres_etapes.join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!etapeImpact && nbMasques > 0 && (
              <p className="mt-3 font-semibold text-[#0A2540] dark:text-white">
                {nbMasques} masque{nbMasques > 1 ? "s" : ""} associé
                {nbMasques > 1 ? "s" : ""}
              </p>
            )}
          </>
        }
        checkbox={
          nbMasques > 0
            ? {
                label: `Supprimer aussi les ${nbMasques} masque(s) de la base`,
                description:
                  "Sinon, l'étape disparaît seule et les masques sont simplement retirés d'elle : ils restent disponibles pour d'autres étapes.",
                checked: supprimerMasques,
                onChange: setSupprimerMasques,
              }
            : undefined
        }
        onConfirm={handleDeleteEtape}
        onCancel={closeDeleteEtape}
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
