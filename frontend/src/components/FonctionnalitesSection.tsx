import { useEffect, useMemo, useState } from "react";
import { fonctionnalitesApi } from "../api/fonctionnalites";
import { servicesApi } from "../api/services";
import { proceduresApi } from "../api/procedures";
import { Fonctionnalite, Procedure, Service } from "../types";
import { ServiceForm } from "./forms/ServiceForm";
import { ProcedureForm } from "./forms/ProcedureForm";
import { ConfirmModal } from "./ConfirmModal";

type ServiceFormData = Parameters<typeof servicesApi.create>[0];

/**
 * Fonctionnalités d'un masque : ce que l'utilisateur peut faire (le bouton
 * « Rechercher », par exemple) et les services qui l'implémentent.
 *
 * La hiérarchie est : masque > fonctionnalité > service > procédure stockée.
 * Cliquer sur un service déplie ses détails techniques et ses procédures ;
 * cliquer sur une procédure montre sa description et les tables qu'elle touche.
 */
export function FonctionnalitesSection({ masqueId }: { masqueId: number }) {
  const [fonctionnalites, setFonctionnalites] = useState<Fonctionnalite[]>([]);
  const [tousServices, setTousServices] = useState<Service[]>([]);
  const [toutesProcedures, setToutesProcedures] = useState<Procedure[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Formulaire « Ajouter une fonctionnalité » : juste un titre.
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  // Service en cours d'ajout à une fonctionnalité.
  const [ajoutServicePour, setAjoutServicePour] = useState<number | null>(null);

  // Création d'un nouveau service (modale) : la fonctionnalité qui l'accueille.
  const [creationServicePour, setCreationServicePour] = useState<number | null>(null);
  const [erreurCreationService, setErreurCreationService] = useState<string | null>(null);

  // Retrait d'un service : détacher de la fonctionnalité seulement, ou
  // supprimer de toute la base. La décision est prise dans la modale.
  const [serviceARetirer, setServiceARetirer] = useState<{
    fonctionnaliteId: number;
    serviceId: number;
    serviceNom: string;
    fonctionnaliteTitre: string;
  } | null>(null);
  const [porteeService, setPorteeService] = useState<"detacher" | "supprimer">("detacher");

  // Retrait d'une procédure stockée : détacher du service seulement, ou
  // supprimer de toute la base. La décision est prise dans la modale.
  const [procedureARetirer, setProcedureARetirer] = useState<{
    serviceId: number;
    procedureId: number;
    procedureNom: string;
    serviceNom: string;
  } | null>(null);
  const [porteeProcedure, setPorteeProcedure] = useState<"detacher" | "supprimer">("detacher");

  // Modification d'un service ou d'une procédure stockée (formulaire prérempli).
  const [serviceEnEdition, setServiceEnEdition] = useState<{
    id: number;
    data: {
      nom: string;
      methode_http: string;
      url: string;
      input_desc: string;
      output_desc: string;
      controleur: string;
      modifie_bdd: boolean;
      collection?: Record<string, unknown> | null;
    };
  } | null>(null);
  const [erreurEditionService, setErreurEditionService] = useState<string | null>(null);
  const [procedureEnEdition, setProcedureEnEdition] = useState<{
    id: number;
    nom: string;
    description: string;
  } | null>(null);
  const [erreurEditionProcedure, setErreurEditionProcedure] = useState<string | null>(null);

  const modifierService = async (data: ServiceFormData) => {
    if (!serviceEnEdition) return;
    setErreurEditionService(null);
    try {
      await servicesApi.update(serviceEnEdition.id, data);
      setServiceEnEdition(null);
      await recharger();
    } catch (err: any) {
      setErreurEditionService(err?.message ?? "Modification impossible");
      throw err;
    }
  };

  const modifierProcedure = async (data: { nom: string; description?: string }) => {
    if (!procedureEnEdition) return;
    setErreurEditionProcedure(null);
    try {
      await proceduresApi.update(procedureEnEdition.id, data);
      setProcedureEnEdition(null);
      await recharger();
    } catch (err: any) {
      setErreurEditionProcedure(err?.message ?? "Modification impossible");
      throw err;
    }
  };

  // Service / procédure dépliés : vols à la (fonctionnalité, service) près,
  // pour ne pas s'entremêler lorsqu'un service est partagé.
  const [serviceOuvert, setServiceOuvert] = useState<string | null>(null);
  const [procedureOuverte, setProcedureOuverte] = useState<string | null>(null);

  // Panneau « Ajouter une procédure stockée » pour un service donné.
  const [ajoutProcedurePour, setAjoutProcedurePour] = useState<string | null>(null);
  const [procTitre, setProcTitre] = useState("");
  const [procDescription, setProcDescription] = useState("");
  const [creationProc, setCreationProc] = useState(false);

  const proceduresDisponiblesPour = (serviceId: number) => {
    const rattachees = fonctionnalites
      .flatMap((x) => x.services)
      .filter((x) => x.id === serviceId)
      .flatMap((x) => x.procedures);
    return toutesProcedures.filter((p) => !rattachees.some((r) => r.id === p.id));
  };

  const recharger = async () => {
    try {
      const [donnees, services, procedures] = await Promise.all([
        fonctionnalitesApi.listByMasque(masqueId),
        servicesApi.list(),
        proceduresApi.list(),
      ]);
      setFonctionnalites(donnees);
      setTousServices(services);
      setToutesProcedures(procedures);
      setErreur(null);
    } catch (e: any) {
      setErreur(e?.message ?? "Impossible de charger les fonctionnalités");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masqueId]);

  const ajouterFonctionnalite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setEnregistrement(true);
    setErreur(null);
    try {
      await fonctionnalitesApi.create(masqueId, { titre: titre.trim() });
      setTitre("");
      setAjoutOuvert(false);
      await recharger();
    } catch (err: any) {
      setErreur(err?.message ?? "Impossible de créer la fonctionnalité");
    } finally {
      setEnregistrement(false);
    }
  };

  const supprimerFonctionnalite = async (id: number) => {
    setErreur(null);
    try {
      await fonctionnalitesApi.delete(id);
      await recharger();
    } catch (err: any) {
      setErreur(err?.message ?? "Suppression impossible");
    }
  };

  const ajouterService = async (fonctionnaliteId: number, serviceId: number) => {
    setErreur(null);
    try {
      await fonctionnalitesApi.addService(fonctionnaliteId, serviceId);
      setAjoutServicePour(null);
      await recharger();
    } catch (err: any) {
      setErreur(err?.message ?? "Ajout du service impossible");
    }
  };

  // Confirmée depuis la modale : détache le service de la fonctionnalité
  // seulement, ou l'efface de toute la base. L'erreur remonte à la modale
  // (409 si une demande de changement cite le service) qui reste ouverte.
  const confirmerRetraitService = async () => {
    if (!serviceARetirer) return;
    const { fonctionnaliteId, serviceId } = serviceARetirer;
    try {
      if (porteeService === "detacher") {
        await fonctionnalitesApi.removeService(fonctionnaliteId, serviceId);
      } else {
        await servicesApi.delete(serviceId);
      }
    } catch (err: any) {
      throw new Error(err?.message ?? "Opération impossible");
    }
    setServiceOuvert(null);
    await recharger();
    setServiceARetirer(null);
  };

  // Créer un service puis le rattacher immédiatement à la fonctionnalité.
  // L'erreur reste affichée dans la modale (la formule garde la main) et ne
  // part pas en rejet non géré.
  const creerEtRattacherService = async (
    fonctionnaliteId: number,
    data: ServiceFormData,
  ) => {
    try {
      const service = await servicesApi.create(data);
      await fonctionnalitesApi.addService(fonctionnaliteId, service.id);
      setCreationServicePour(null);
      setErreurCreationService(null);
      setAjoutServicePour(null);
      await recharger();
    } catch (err: any) {
      setErreurCreationService(
        err?.message ?? "Création du service impossible",
      );
    }
  };

  const attacherProcedure = async (
    _fonctionnaliteId: number,
    serviceId: number,
    procedureId: number,
  ) => {
    setErreur(null);
    try {
      await servicesApi.attachProcedure(serviceId, procedureId);
      setAjoutProcedurePour(null);
      await recharger();
    } catch (err: any) {
      setErreur(err?.message ?? "Rattachement impossible");
    }
  };

  const creerProcedure = async (
    _fonctionnaliteId: number,
    serviceId: number,
  ) => {
    if (!procTitre.trim()) return;
    setCreationProc(true);
    setErreur(null);
    try {
      await servicesApi.createProcedure(serviceId, {
        nom: procTitre.trim(),
        description: procDescription.trim() || undefined,
      });
      setProcTitre("");
      setProcDescription("");
      setAjoutProcedurePour(null);
      await recharger();
    } catch (err: any) {
      setErreur(err?.message ?? "Création de la procédure impossible");
    } finally {
      setCreationProc(false);
    }
  };

  // Confirmée depuis la modale : détache la procédure du service seulement,
  // ou l'efface de toute la base. L'erreur remonte à la modale (409 si une
  // demande de changement la cite) qui reste ouverte.
  const confirmerRetraitProcedure = async () => {
    if (!procedureARetirer) return;
    const { serviceId, procedureId } = procedureARetirer;
    try {
      if (porteeProcedure === "detacher") {
        await servicesApi.detachProcedure(serviceId, procedureId);
      } else {
        await proceduresApi.delete(procedureId);
      }
    } catch (err: any) {
      throw new Error(err?.message ?? "Opération impossible");
    }
    setProcedureOuverte(null);
    await recharger();
    setProcedureARetirer(null);
  };

  // Chevron partagé : pivoté quand le bloc est ouvert.
  const Chevron = ({ ouvert }: { ouvert: boolean }) => (
    <svg
      className={`h-4 w-4 shrink-0 text-[#8ea0b3] transition-transform dark:text-white/40 ${
        ouvert ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const methodeCouleur = useMemo(
    () =>
      ({
        GET: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        POST: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        PATCH: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
        DELETE: "bg-red-500/10 text-red-700 dark:text-red-300",
      }) as Record<string, string>,
    [],
  );

  return (
    <div className="mt-6 border-t border-[#e6e8f5] pt-5 dark:border-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="font-poppins text-base font-bold text-[#0c1d31] dark:text-white">
            Fonctionnalités
          </h5>
          <p className="mt-0.5 font-poppins text-xs text-[#525f6d] dark:text-white/50">
            Une action offerte par ce masque (Rechercher, Exporter...) et les
            services qui la réalisent.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAjoutOuvert((v) => !v)}
          className="flex h-[40px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-4 font-poppins text-xs font-semibold text-white transition hover:bg-[#00263a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ajouter une fonctionnalité
        </button>
      </div>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {erreur}
        </p>
      )}

      {ajoutOuvert && (
        <form
          onSubmit={ajouterFonctionnalite}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-[#f6f8fa] p-4 dark:bg-white/5"
        >
          <label className="min-w-[220px] flex-1">
            <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
              Titre de la fonctionnalité
            </span>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex. Rechercher un client"
              autoFocus
              className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#0c1d31] placeholder:text-[#b6c0cc] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
            />
          </label>
          <button
            type="button"
            onClick={() => setAjoutOuvert(false)}
            className="h-[42px] rounded-lg border border-[#e6e8f5] px-5 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={enregistrement || !titre.trim()}
            className="h-[42px] rounded-lg bg-[#003049] px-5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a] disabled:opacity-50"
          >
            {enregistrement ? "Création..." : "Créer"}
          </button>
        </form>
      )}

      {chargement ? (
        <p className="py-4 text-center font-poppins text-sm text-[#8ea0b3]">
          Chargement des fonctionnalités...
        </p>
      ) : fonctionnalites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e6e8f5] py-8 text-center font-poppins text-sm text-[#8ea0b3] dark:border-white/10">
          Aucune fonctionnalité pour ce masque.
        </p>
      ) : (
        <ul className="space-y-3">
          {fonctionnalites.map((f) => {
            const servicesDisponibles = tousServices.filter(
              (s) => !f.services.some((fs) => fs.id === s.id),
            );
            return (
              <li
                key={f.id}
                className="rounded-xl border border-[#e6e8f5] bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h6 className="font-poppins text-base font-bold text-[#0c1d31] dark:text-white">
                      {f.titre}
                    </h6>
                    {f.description && (
                      <p className="mt-0.5 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                        {f.description}
                      </p>
                    )}
                  </div>
                  {/* Les deux boutons ont la même taille : largeur partagée
                      à parts égales (flex-1) dans un conteneur de largeur fixe. */}
                  <div className="flex w-[300px] shrink-0 items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAjoutServicePour(ajoutServicePour === f.id ? null : f.id)
                      }
                      className="flex flex-1 items-center justify-center whitespace-nowrap rounded-lg border border-[#e6e8f5] px-3 py-1.5 font-poppins text-xs font-semibold text-[#003049] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                      Ajouter un service
                    </button>
                    <button
                      type="button"
                      onClick={() => void supprimerFonctionnalite(f.id)}
                      className="flex flex-1 items-center justify-center whitespace-nowrap rounded-lg border border-red-200 px-3 py-1.5 font-poppins text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {ajoutServicePour === f.id && (
                  <div className="mt-3 rounded-lg bg-[#f6f8fa] p-3 dark:bg-white/5">
                    <p className="mb-2 font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                      Choisir un service existant
                    </p>
                    {servicesDisponibles.length === 0 ? (
                      <p className="font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                        Tous les services existants sont déjà rattachés.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {servicesDisponibles.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => void ajouterService(f.id, s.id)}
                            className="rounded-lg border border-[#e6e8f5] bg-white px-3 py-1.5 font-poppins text-xs text-[#0c1d31] transition hover:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                          >
                            {s.nom}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 border-t border-[#e6e8f5] pt-3 dark:border-white/10">
                      <p className="mb-2 font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                        Ou créer un nouveau service
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setErreurCreationService(null);
                          setCreationServicePour(f.id);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-[#003049] px-3 py-1.5 font-poppins text-xs font-semibold text-[#003049] transition hover:bg-[#003049] hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        Créer un nouveau service
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAjoutServicePour(null)}
                      className="mt-3 rounded-lg border border-[#e6e8f5] px-3 py-1.5 font-poppins text-xs font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {f.services.length === 0 ? (
                  <p className="mt-3 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                    Aucun service rattaché pour l&apos;instant.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {f.services.map((s) => {
                      const cleService = `${f.id}:${s.id}`;
                      const ouvert = serviceOuvert === cleService;
                      const disponibles = proceduresDisponiblesPour(s.id);
                      return (
                        <li
                          key={s.id}
                          className="rounded-lg border border-[#e6e8f5] bg-[#fbfbfe] dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex w-full items-center gap-2 px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setServiceOuvert(ouvert ? null : cleService)
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              {s.methode_http && (
                                <span
                                  className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    methodeCouleur[s.methode_http] ??
                                    "bg-[#e6e8f5] text-[#525f6d] dark:bg-white/10 dark:text-white/60"
                                  }`}
                                >
                                  {s.methode_http}
                                </span>
                              )}
                              <span className="truncate font-mono text-sm font-semibold text-[#0c1d31] dark:text-white">
                                {s.nom}
                              </span>
                              {s.url && (
                                <span className="hidden truncate font-mono text-[10px] text-[#8ea0b3] sm:inline dark:text-white/40">
                                  {s.url}
                                </span>
                              )}
                            </button>
                            <Chevron ouvert={ouvert} />
                            <button
                              type="button"
                              title="Modifier le service"
                              onClick={() => {
                                setErreurEditionService(null);
                                setServiceEnEdition({
                                  id: s.id,
                                  data: {
                                    nom: s.nom,
                                    methode_http: s.methode_http ?? "GET",
                                    url: s.url ?? "",
                                    input_desc: s.input_desc ?? "",
                                    output_desc: s.output_desc ?? "",
                                    controleur: s.controleur ?? "",
                                    modifie_bdd: s.modifie_bdd ?? false,
                                    collection: s.collection ?? null,
                                  },
                                });
                              }}
                              className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M17 3a2.85 2.83 0 114.01 4L8 20l-4 1 1-4L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Retirer le service"
                              onClick={() => {
                                setPorteeService("detacher");
                                setServiceARetirer({
                                  fonctionnaliteId: f.id,
                                  serviceId: s.id,
                                  serviceNom: s.nom,
                                  fonctionnaliteTitre: f.titre,
                                });
                              }}
                              className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>

                          {ouvert && (
                            <div className="border-t border-[#e6e8f5] px-3 pb-3 pt-3 dark:border-white/10">
                              <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                {s.input_desc && (
                                  <div>
                                    <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                      Entrée
                                    </dt>
                                    <dd className="font-poppins text-xs text-[#525f6d] dark:text-white/60">
                                      {s.input_desc}
                                    </dd>
                                  </div>
                                )}
                                {s.output_desc && (
                                  <div>
                                    <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                      Sortie
                                    </dt>
                                    <dd className="font-poppins text-xs text-[#525f6d] dark:text-white/60">
                                      {s.output_desc}
                                    </dd>
                                  </div>
                                )}
                                {s.controleur && (
                                  <div>
                                    <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                      Contrôleur
                                    </dt>
                                    <dd className="font-mono text-xs text-[#525f6d] dark:text-white/60">
                                      {s.controleur}
                                    </dd>
                                  </div>
                                )}
                                {s.modifie_bdd !== null &&
                                    s.modifie_bdd !== undefined && (
                                    <div>
                                      <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                        Modifie la base
                                      </dt>
                                      <dd
                                        className={`font-poppins text-xs font-semibold ${
                                          s.modifie_bdd
                                            ? "text-amber-600 dark:text-amber-300"
                                            : "text-emerald-600 dark:text-emerald-300"
                                        }`}
                                      >
                                        {s.modifie_bdd ? "Oui" : "Non"}
                                      </dd>
                                    </div>
                                  )}
                                {s.collection &&
                                  Object.keys(s.collection).length > 0 && (
                                    <div className="col-span-full">
                                      <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                        Collection
                                      </dt>
                                      <dd className="mt-1 rounded-lg bg-[#f6f8fa] p-2.5 font-mono text-[11px] leading-relaxed text-[#525f6d] dark:bg-white/5 dark:text-white/60">
                                        <pre className="whitespace-pre-wrap break-words">
                                          {JSON.stringify(s.collection, null, 2)}
                                        </pre>
                                      </dd>
                                    </div>
                                  )}
                              </dl>

                              <div className="mt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
                                    Procédures stockées
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAjoutProcedurePour(
                                        ajoutProcedurePour === cleService
                                          ? null
                                          : cleService,
                                      )
                                    }
                                    className="flex items-center gap-1.5 rounded-lg border border-[#e6e8f5] px-3 py-1.5 font-poppins text-xs font-semibold text-[#003049] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                    </svg>
                                    Ajouter une procédure stockée
                                  </button>
                                </div>

                                {ajoutProcedurePour === cleService && (
                                  <div className="mt-3 rounded-lg bg-[#f6f8fa] p-3 dark:bg-white/5">
                                    {disponibles.length === 0 ? (
                                      <p className="mb-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                                        Toutes les procédures existantes sont déjà
                                        rattachées à ce service.
                                      </p>
                                    ) : (
                                      <>
                                        <p className="mb-2 font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                          Choisir une procédure existante
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {disponibles.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              onClick={() =>
                                                void attacherProcedure(f.id, s.id, p.id)
                                              }
                                              className="rounded-lg border border-[#e6e8f5] bg-white px-3 py-1.5 font-mono text-xs text-[#0c1d31] transition hover:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                              {p.nom}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    <div className="mb-2 mt-3 border-t border-[#e6e8f5] pt-3 dark:border-white/10">
                                      <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                        Ou créer une nouvelle procédure
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-end gap-2">
                                        <label className="min-w-[180px] flex-1">
                                          <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                            Nom
                                          </span>
                                          <input
                                            value={procTitre}
                                            onChange={(e) => setProcTitre(e.target.value)}
                                            placeholder="Ex. SP_CALCUL_SOLDE"
                                            className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-mono text-xs text-[#0c1d31] placeholder:text-[#b6c0cc] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
                                          />
                                        </label>
                                        <label className="min-w-[220px] flex-1">
                                          <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                            Description
                                          </span>
                                          <input
                                            value={procDescription}
                                            onChange={(e) =>
                                              setProcDescription(e.target.value)
                                            }
                                            placeholder="Courte description (facultatif)"
                                            className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-xs text-[#0c1d31] placeholder:text-[#b6c0cc] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          disabled={creationProc || !procTitre.trim()}
                                          onClick={() => void creerProcedure(f.id, s.id)}
                                          className="h-[38px] rounded-lg bg-[#003049] px-4 font-poppins text-xs font-semibold text-white transition hover:bg-[#00263a] disabled:opacity-50"
                                        >
                                          {creationProc ? "Création..." : "Créer"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAjoutProcedurePour(null)}
                                          className="h-[38px] rounded-lg border border-[#e6e8f5] px-4 font-poppins text-xs font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                                        >
                                          Annuler
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {s.procedures.length === 0 ? (
                                  <p className="mt-2 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                                    Aucune procédure stockée.
                                  </p>
                                ) : (
                                  <ul className="mt-2 space-y-2">
                                    {s.procedures.map((p) => {
                                      const cleProcedure = `${f.id}:${s.id}:${p.id}`;
                                      const pOuverte = procedureOuverte === cleProcedure;
                                      return (
                                        <li
                                          key={p.id}
                                          className="rounded-md border border-[#e6e8f5] bg-white dark:border-white/10 dark:bg-white/5"
                                        >
                                          <div className="flex w-full items-center gap-2 px-3 py-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setProcedureOuverte(
                                                  pOuverte ? null : cleProcedure,
                                                )
                                              }
                                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                            >
                                              <span className="truncate font-mono text-xs font-bold text-[#004a86] dark:text-[#4aa1de]">
                                                {p.nom}
                                              </span>
                                            </button>
                                            <Chevron ouvert={pOuverte} />
                                            <button
                                              type="button"
                                              title="Modifier la procédure"
                                              onClick={() => {
                                                setErreurEditionProcedure(null);
                                                setProcedureEnEdition({
                                                  id: p.id,
                                                  nom: p.nom,
                                                  description: p.description ?? "",
                                                });
                                              }}
                                              className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                                            >
                                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M17 3a2.85 2.83 0 114.01 4L8 20l-4 1 1-4L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            </button>
                                            <button
                                              type="button"
                                              title="Retirer la procédure"
                                              onClick={() => {
                                                setPorteeProcedure("detacher");
                                                setProcedureARetirer({
                                                  serviceId: s.id,
                                                  procedureId: p.id,
                                                  procedureNom: p.nom,
                                                  serviceNom: s.nom,
                                                });
                                              }}
                                              className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
                                            >
                                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            </button>
                                          </div>
                                          {pOuverte && (
                                            <div className="border-t border-[#e6e8f5] px-3 pb-3 pt-2 dark:border-white/10">
                                              {p.description && (
                                                <p className="font-poppins text-xs text-[#525f6d] dark:text-white/60">
                                                  {p.description}
                                                </p>
                                              )}
                                              {p.tables.length > 0 && (
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                  <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                                                    Tables
                                                  </span>
                                                  {p.tables.map((t) => (
                                                    <span
                                                      key={t.id}
                                                      className="rounded-full bg-[#e6e8f5] px-2.5 py-0.5 font-mono text-[10px] text-[#004a86] dark:bg-white/10 dark:text-white"
                                                    >
                                                      {t.nom}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                              {!p.description && p.tables.length === 0 && (
                                                <p className="font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                                                  Aucun détail supplémentaire.
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Modale « nouveau service » : créée par la formule puis rattachée
          automatiquement à la fonctionnalité en cours. */}
      {creationServicePour !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">
                Nouveau service
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Le service sera créé puis automatiquement rattaché à cette
                fonctionnalité.
              </p>
            </div>

            {erreurCreationService && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {erreurCreationService}
              </p>
            )}

            <ServiceForm
              onSubmit={(data) => creerEtRattacherService(creationServicePour, data)}
              onCancel={() => {
                setCreationServicePour(null);
                setErreurCreationService(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modale « modifier un service » : formulaire prérempli. */}
      {serviceEnEdition && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">
                Modifier le service
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La modification s'applique partout où le service est utilisé.
              </p>
            </div>

            {erreurEditionService && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {erreurEditionService}
              </p>
            )}

            <ServiceForm
              initialData={serviceEnEdition.data}
              onSubmit={modifierService}
              onCancel={() => {
                setServiceEnEdition(null);
                setErreurEditionService(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modale « modifier une procédure stockée » : formulaire prérempli. */}
      {procedureEnEdition && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">
                Modifier la procédure
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La modification s'applique partout où la procédure est utilisée.
              </p>
            </div>

            {erreurEditionProcedure && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {erreurEditionProcedure}
              </p>
            )}

            <ProcedureForm
              initialData={{
                nom: procedureEnEdition.nom,
                description: procedureEnEdition.description,
              }}
              onSubmit={modifierProcedure}
              onCancel={() => {
                setProcedureEnEdition(null);
                setErreurEditionProcedure(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Retrait d'un service : détacher de cette fonctionnalité seulement,
          supprimer de toute la base, ou annuler. */}
      <ConfirmModal<"detacher" | "supprimer">
        isOpen={serviceARetirer !== null}
        title="Retirer le service"
        confirmLabel={porteeService === "detacher" ? "Retirer" : "Supprimer"}
        loadingLabel={porteeService === "detacher" ? "Retrait..." : "Suppression..."}
        message={
          <>
            <p className="font-semibold text-[#0A2540] dark:text-white">
              {serviceARetirer?.serviceNom}
            </p>
            <p className="mt-1 text-xs text-[#8ea0b3] dark:text-white/40">
              Fonctionnalité : « {serviceARetirer?.fonctionnaliteTitre} »
            </p>
          </>
        }
        radio={{
          label: "Portée du retrait",
          value: porteeService,
          onChange: setPorteeService,
          options: [
            {
              value: "detacher",
              label: "Le retirer de cette fonctionnalité seulement",
              description:
                "Le service reste dans la base : les autres fonctionnalités et masques qui l'appellent continuent de l'utiliser.",
            },
            {
              value: "supprimer",
              label: "Le supprimer définitivement de la base",
              description:
                "Le service est effacé partout (autres fonctionnalités, masques, liaisons procédures). S'il est cité par une demande de changement, la suppression sera refusée.",
            },
          ],
        }}
        onConfirm={confirmerRetraitService}
        onCancel={() => {
          setServiceARetirer(null);
          setPorteeService("detacher");
        }}
      />

      {/* Retrait d'une procédure stockée : détacher de ce service seulement,
          supprimer de toute la base, ou annuler. */}
      <ConfirmModal<"detacher" | "supprimer">
        isOpen={procedureARetirer !== null}
        title="Retirer la procédure"
        confirmLabel={porteeProcedure === "detacher" ? "Retirer" : "Supprimer"}
        loadingLabel={porteeProcedure === "detacher" ? "Retrait..." : "Suppression..."}
        message={
          <>
            <p className="font-semibold font-mono text-[11px] text-[#0A2540] dark:text-white">
              {procedureARetirer?.procedureNom}
            </p>
            <p className="mt-1 text-xs text-[#8ea0b3] dark:text-white/40">
              Service : « {procedureARetirer?.serviceNom} »
            </p>
          </>
        }
        radio={{
          label: "Portée du retrait",
          value: porteeProcedure,
          onChange: setPorteeProcedure,
          options: [
            {
              value: "detacher",
              label: "La retirer de ce service seulement",
              description:
                "La procédure reste dans la base : les autres services qui l'appellent continuent de l'utiliser.",
            },
            {
              value: "supprimer",
              label: "La supprimer définitivement de la base",
              description:
                "La procédure est effacée partout (autres services, masques, tables). Si elle est citée par une demande de changement, la suppression sera refusée.",
            },
          ],
        }}
        onConfirm={confirmerRetraitProcedure}
        onCancel={() => {
          setProcedureARetirer(null);
          setPorteeProcedure("detacher");
        }}
      />
    </div>
  );
}