import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { etapesApi } from "../api/etapes";
import { masquesApi } from "../api/masques";
import { EtapeDetail, MasqueImpact, MasqueRef } from "../types";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { EtapeDetails } from "../components/EtapeDetails";
import { MasqueForm, MasqueFormData } from "../components/forms/MasqueForm";
import { DetailSkeleton } from "../components/ui/pageSkeletons";

interface EtapePageState {
  processNom?: string;
  processId?: number;
}

export function EtapeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const pageState = (location.state as EtapePageState | null) ?? null;
  const [etape, setEtape] = useState<EtapeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMasqueForm, setShowMasqueForm] = useState(false);
  const [masqueEnEdition, setMasqueEnEdition] = useState<MasqueRef | null>(null);
  const [masqueToDelete, setMasqueToDelete] = useState<MasqueRef | null>(null);
  const [masqueImpact, setMasqueImpact] = useState<MasqueImpact | null>(null);
  const [portee, setPortee] = useState<"detacher" | "supprimer">("detacher");
  const [supprimerServices, setSupprimerServices] = useState(false);
  const [analyseImpact, setAnalyseImpact] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fetchEtape = async (etapeId: number) => {
    try {
      const data = await etapesApi.getById(etapeId);
      setEtape(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchEtape(parseInt(id));
  }, [id]);

  const showToast = (message: string) => {
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  const handleCreateMasque = async (data: MasqueFormData) => {
    if (!id) return;
    const masque = await masquesApi.createForEtape(parseInt(id), data);
    await fetchEtape(parseInt(id));
    setShowMasqueForm(false);
    showToast(`Masque "${masque.nom}" ajouté à l'étape.`);
  };

  const handleEditMasque = async (data: MasqueFormData) => {
    if (!masqueEnEdition || !id) return;
    const masque = await masquesApi.update(masqueEnEdition.id, {
      code: data.code,
      nom: data.nom,
      description: data.description,
      image_key: data.image_key,
    });
    const etapeId = parseInt(id);
    setMasqueEnEdition(null);
    await fetchEtape(etapeId);
    showToast(`Masque "${masque.nom}" modifié.`);
  };

  // Deux façons de retirer un masque, très différentes en conséquences :
  // « sortir » ne touche qu'au lien avec cette étape, « supprimer » efface le
  // masque de la base, donc de toutes les étapes où il est utilisé. C'est à
  // l'utilisateur de choisir, d'où l'analyse d'impact affichée en dessous.
  const askDeleteMasque = async (masque: MasqueRef) => {
    setMasqueToDelete(masque);
    setMasqueImpact(null);
    setPortee("detacher");
    setSupprimerServices(false);
    setAnalyseImpact(true);
    try {
      setMasqueImpact(await masquesApi.impact(masque.id));
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setAnalyseImpact(false);
    }
  };

  const closeDeleteMasque = () => {
    setMasqueToDelete(null);
    setMasqueImpact(null);
    setPortee("detacher");
    setSupprimerServices(false);
  };

  // Si l'analyse d'impact échoue, on retombe sur les fonctions déjà chargées
  // avec le masque : l'utilisateur doit toujours pouvoir trancher.
  const nbServices =
    masqueImpact?.services.length ?? masqueToDelete?.fonctions.length ?? 0;
  const impactIndisponible =
    !analyseImpact &&
    masqueImpact === null &&
    (masqueToDelete?.fonctions.length ?? 0) > 0;

  const handleDeleteMasque = async () => {
    if (!masqueToDelete || !id) return;
    const etapeId = parseInt(id);

    if (portee === "detacher") {
      await etapesApi.detachMasque(etapeId, masqueToDelete.id);
      closeDeleteMasque();
      await fetchEtape(etapeId);
      showToast(`Masque "${masqueToDelete.nom}" retiré de l'étape.`);
      return;
    }

    const resultat = await masquesApi.delete(masqueToDelete.id, supprimerServices);
    closeDeleteMasque();
    await fetchEtape(etapeId);

    const resumes: string[] = [];
    if (resultat.services.supprimes.length > 0) {
      resumes.push(`${resultat.services.supprimes.length} élément(s) effacé(s)`);
    }
    if (resultat.services.conserves.length > 0) {
      resumes.push(`${resultat.services.conserves.length} conservé(s)`);
    }
    showToast(
      resumes.length > 0
        ? `Masque "${resultat.masque.nom}" supprimé — ${resumes.join(", ")}.`
        : `Masque "${resultat.masque.nom}" supprimé.`
    );
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!etape) {
    return <div className="py-8 text-center">Étape non trouvée</div>;
  }

  // Le nom du processus vient de l'API : il reste affiché après un
  // rechargement direct de l'URL, où l'état du routeur est perdu.
  const processNom = etape.process_nom || pageState?.processNom || "Process";
  const processId = etape.process_id;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Métiers", path: "/domaines" },
          ...(processId
            ? [{ label: processNom || "Process", path: `/processes/${processId}` }]
            : []),
          { label: etape.nom },

        ]}
      />

      {/* Titre unique : l'étape, son rang et le processus de rattachement */}
      <div className="mb-6">
        <h1 className="font-poppins text-2xl font-bold leading-snug tracking-tight text-[#0c1d31] dark:text-white lg:text-3xl">
          Etape {String(etape.ordre).padStart(2, '0')} : {etape.nom}
        </h1>
      </div>

      {/* Barre de recherche + bouton ajouter */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <svg className="h-5 w-5 text-[#525f6d] dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un masque..."
            className="w-full bg-transparent font-poppins text-sm text-[#525f6d] placeholder:text-[#525f6d] outline-none dark:text-white/70"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowMasqueForm(true)}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a]"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ajouter un masque
        </button>
      </div>

      <div className="mt-20 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-poppins text-xl font-bold text-[#0c1d31] dark:text-white">
            Masques associés
          </h2>
          <span className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
            {etape.masques.length} masque{etape.masques.length > 1 ? "s" : ""}
          </span>
        </div>
        <EtapeDetails
          etape={{
            ...etape,
            masques: etape.masques.filter(
              (m) =>
                m.code.toLowerCase().includes(search.toLowerCase()) ||
                m.nom.toLowerCase().includes(search.toLowerCase())
            ),
          }}
          onDeleteMasque={askDeleteMasque}
          onEditMasque={setMasqueEnEdition}
        />
      </div>

      <ConfirmModal
        isOpen={masqueToDelete !== null}
        title="Retirer le masque"
        confirmLabel={portee === "detacher" ? "Retirer" : "Supprimer"}
        message={
          <>
            <p>
              Que faire du masque{" "}
              <span className="font-semibold text-[#0A2540] dark:text-white">
                {masqueToDelete?.nom}
              </span>{" "}
              ({masqueToDelete?.code}) ?
            </p>

            {analyseImpact && (
              <p className="mt-2 text-xs text-[#8ea0b3]">Analyse de l'impact...</p>
            )}

            {masqueImpact && masqueImpact.dcs.length > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                Suppression impossible : ce masque est cité par{" "}
                {masqueImpact.dcs.length} demande(s) de changement (
                {masqueImpact.dcs.join(", ")}). Vous pouvez néanmoins le retirer
                de cette étape.
              </p>
            )}

            {masqueImpact && portee === "supprimer" && (
              <div className="mt-3 rounded-lg bg-[#fbfbfe] p-3 text-xs dark:bg-white/5">
                {masqueImpact.etapes.length > 0 && (
                  <p className="text-[#a8741a]">
                    Il sera effacé de {masqueImpact.etapes.length} étape(s) :{" "}
                    {masqueImpact.etapes.join(", ")}
                  </p>
                )}
                {masqueImpact.services.length > 0 && (
                  <p className="mt-1">
                    Services appelés :{" "}
                    {masqueImpact.services.map((s) => s.nom).join(", ")}
                  </p>
                )}
                {masqueImpact.services
                  .filter((s) => s.autres_masques.length > 0)
                  .map((s) => (
                    <p key={s.id} className="mt-1 text-[#a8741a]">
                      {s.nom} reste appelé par {s.autres_masques.join(", ")} — il
                      sera conservé
                    </p>
                  ))}
              </div>
            )}

            {impactIndisponible && portee === "supprimer" && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Détail des services indisponible (backend à redémarrer ?). Les
                services cités par une demande de changement resteront malgré
                tout protégés.
              </p>
            )}
          </>
        }
        radio={{
          label: "Portée de la suppression",
          value: portee,
          onChange: (v) => {
            setPortee(v);
            setSupprimerServices(false);
          },
          options: [
            {
              value: "detacher",
              label: "Le retirer de cette étape seulement",
              description:
                "Le masque reste dans la base et continue d'exister dans les autres étapes.",
            },
            {
              value: "supprimer",
              label: "Le supprimer définitivement de la base",
              description:
                "Le masque est effacé de toutes les étapes. S'il est cité par une demande de changement, la suppression sera refusée.",
            },
          ],
        }}
        radio2={
          portee === "supprimer" && nbServices > 0
            ? {
                label: "Et les services et procédures associés ?",
                value: supprimerServices ? "supprimer" : "conserver",
                onChange: (v) => setSupprimerServices(v === "supprimer"),
                options: [
                  {
                    value: "conserver",
                    label: "Les conserver dans la base",
                    description:
                      "Ils restent utilisables par les autres masques et fonctionnalités.",
                  },
                  {
                    value: "supprimer",
                    label: "Les supprimer aussi de la base",
                    description:
                      "Seuls ceux qui ne servent qu'ici et qui ne sont cités par aucune demande de changement sont effacés.",
                  },
                ],
              }
            : undefined
        }
        onConfirm={handleDeleteMasque}
        onCancel={closeDeleteMasque}
      />

      {showMasqueForm && (
        <MasqueForm
          submitLabel="Créer le masque"
          onSubmit={handleCreateMasque}
          onCancel={() => setShowMasqueForm(false)}
        />
      )}

      {masqueEnEdition && (
        <MasqueForm
          key={masqueEnEdition.id}
          initialData={{
            code: masqueEnEdition.code,
            nom: masqueEnEdition.nom,
            description: masqueEnEdition.description ?? "",
            image_key: masqueEnEdition.image_key,
          }}
          submitLabel="Enregistrer"
          title="Modifier le masque"
          subtitle="Mise à jour des informations du masque"
          onSubmit={handleEditMasque}
          onCancel={() => setMasqueEnEdition(null)}
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