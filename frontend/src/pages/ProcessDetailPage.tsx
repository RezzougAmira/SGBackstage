import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { EtapeDetail, MasqueRef, ServiceRef } from "../types";
import { processesApi } from "../api/processes";
import { etapesApi } from "../api/etapes";
import { masquesApi } from "../api/masques";
import { Breadcrumb } from "../components/Breadcrumb";
import { ProcessSchema } from "../components/ProcessSchema";
import { Modal } from "../components/Modal";
import { EtapeForm } from "../components/forms/EtapeForm";
import { MasqueForm } from "../components/forms/MasqueForm";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { ProcessDetailSkeleton } from "../components/ui/pageSkeletons";

interface ProcessState {
  nom?: string;
  description?: string;
  diagramme_url?: string | null;
}

function MethodChip({ method }: { method: string | null }) {
  if (!method) return null;
  return (
    <span className="rounded bg-[#004a86]/10 px-2 py-0.5 font-poppins text-[10px] font-bold text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]">
      {method}
    </span>
  );
}

function MasqueThumbnail({ imageKey, className }: { imageKey: string | null; className: string }) {
  const src = useProtectedImage(imageKey);

  if (src) {
    return (
      <img
        src={src}
        alt="Capture du masque"
        className={`${className} bg-[#f6f8fa] object-contain object-top dark:bg-white/5`}
      />
    );
  }

  // L'image existe en base mais n'est pas encore récupérée : on occupe la zone
  // avec un squelette plutôt que d'afficher un texte qui clignote.
  if (imageKey) {
    return <div className={`skeleton ${className}`} aria-label="Chargement de l'image" />;
  }

  return (
    <div
      className={`${className} flex flex-col items-center justify-center gap-1 bg-[#f6f8fa] text-[#8ea0b3] dark:bg-white/5 dark:text-white/30`}
    >
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"
        />
      </svg>
      <span className="font-poppins text-[10px]">Aucune image</span>
    </div>
  );
}

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const processState = (location.state as ProcessState | null) ?? null;

  const [etapes, setEtapes] = useState<EtapeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [etapeId, setEtapeId] = useState<number | null>(null);
  const [masqueId, setMasqueId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [editingMasque, setEditingMasque] = useState<MasqueRef | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const processId = parseInt(id);
      const etapesData = await processesApi.listEtapes(processId);
      const details = await Promise.all(etapesData.map((e) => etapesApi.get(processId, e.id)));
      setEtapes(details);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const currentEtape = useMemo(
    () => etapes.find((e) => e.id === etapeId) ?? null,
    [etapes, etapeId]
  );
  const currentMasque: MasqueRef | null =
    currentEtape?.masques.find((m) => m.id === masqueId) ?? null;
  const currentService: ServiceRef | null =
    currentMasque?.services.find((s) => s.id === serviceId) ?? null;

  const selectEtape = (nextEtapeId: number) => {
    setEtapeId(nextEtapeId);
    setMasqueId(null);
    setServiceId(null);
  };

  const selectMasque = (nextMasqueId: number) => {
    setMasqueId(nextMasqueId);
    setServiceId(null);
  };

  if (loading) {
    return <ProcessDetailSkeleton />;
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
          <ProcessSchema etapes={etapes} activeEtapeId={etapeId} onSelectEtape={selectEtape} />
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
            {etapes.map((etape) => {
              const isOpen = etape.id === etapeId;
              return (
                <li key={etape.id}>
                  <button
                    type="button"
                    onClick={() => (isOpen ? setEtapeId(null) : selectEtape(etape.id))}
                    aria-expanded={isOpen}
                    className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
                      isOpen
                        ? "border-[#004a86] bg-[#004a86]/5"
                        : "border-[#e6e8f5] hover:border-[#004a86] hover:bg-[#fbfbfe] dark:border-white/10 dark:hover:bg-white/5"
                    }`}
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
                    <svg
                      className={`h-4 w-4 shrink-0 text-[#004a86] transition-transform dark:text-[#4aa1de] ${
                        isOpen ? "rotate-90" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Drill-down */}
      {currentEtape && (
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          {/* Fil dAriane du drill-down */}
          <nav className="mb-5 flex flex-wrap items-center gap-2 font-poppins text-xs">
            <button
              type="button"
              onClick={() => {
                setEtapeId(null);
                setMasqueId(null);
                setServiceId(null);
              }}
              className="text-[#004a86] hover:underline dark:text-[#4aa1de]"
            >
              {processState?.nom || "Process"}
            </button>
            <Chevron />
            <span className={currentMasque ? "text-[#004a86] hover:underline dark:text-[#4aa1de]" : "font-semibold text-[#0c1d31] dark:text-white"}>
              <button type="button" onClick={() => { setMasqueId(null); setServiceId(null); }} className="flex items-center gap-2">
                Étape {currentEtape.ordre} — {currentEtape.nom}
              </button>
            </span>
            {currentMasque && (
              <>
                <Chevron />
                <span className={currentService ? "text-[#004a86] hover:underline dark:text-[#4aa1de]" : "font-semibold text-[#0c1d31] dark:text-white"}>
                  <button type="button" onClick={() => setServiceId(null)} className="flex items-center gap-2">
                    <span className="font-mono">{currentMasque.code}</span>
                  </button>
                </span>
              </>
            )}
            {currentService && (
              <>
                <Chevron />
                <span className="font-mono font-semibold text-[#0c1d31] dark:text-white">
                  {currentService.nom}
                </span>
              </>
            )}
          </nav>

          {/* NIVEAU 1 — ÉTAPE : liste des masques */}
          {!currentMasque && (
            <div>
              {currentEtape.description && (
                <p className="mb-5 max-w-3xl font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
                  {currentEtape.description}
                </p>
              )}

              <h3 className="mb-3 font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                Masques de l'étape
              </h3>

              {currentEtape.masques.length === 0 ? (
                <p className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
                  Aucun masque associé à cette étape.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {currentEtape.masques.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMasque(m.id)}
                      className="group flex flex-col overflow-hidden rounded-xl border border-[#e6e8f5] text-left transition hover:border-[#004a86] hover:shadow-md dark:border-white/10"
                    >
                      <MasqueThumbnail imageKey={m.image_key} className="h-40 w-full border-b border-[#e6e8f5] dark:border-white/10" />
                      <div className="flex flex-1 flex-col gap-1.5 p-4">
                        <span className="self-start rounded-lg bg-[#004a86] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                          {m.code}
                        </span>
                        <span className="font-poppins text-sm font-semibold text-[#0c1d31] dark:text-white">
                          {m.nom}
                        </span>
                        {m.description && (
                          <span className="font-poppins text-xs text-[#525f6d] dark:text-white/60">
                            {m.description}
                          </span>
                        )}
                        <span className="mt-auto pt-2 font-poppins text-[11px] font-medium text-[#004a86] group-hover:underline dark:text-[#4aa1de]">
                          {m.services.length} service{m.services.length > 1 ? "s" : ""} — voir le détail
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NIVEAU 2 — MASQUE : image + services */}
          {currentMasque && !currentService && (
            <div>
              <div className="mb-6 grid gap-6 lg:grid-cols-[320px_1fr]">
                <MasqueThumbnail
                  imageKey={currentMasque.image_key}
                  className="h-56 w-full rounded-xl border border-[#e6e8f5] dark:border-white/10"
                />
                <div>
                  <span className="inline-block rounded-lg bg-[#004a86] px-3 py-1 font-mono text-xs font-bold text-white">
                    {currentMasque.code}
                  </span>
                  <h3 className="mt-2 font-poppins text-xl font-bold text-[#0c1d31] dark:text-white">
                    {currentMasque.nom}
                  </h3>
                  {currentMasque.description && (
                    <p className="mt-2 max-w-2xl font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
                      {currentMasque.description}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingMasque(currentMasque)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#004a86] px-4 py-1.5 font-poppins text-xs font-medium text-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-[#4aa1de] dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                    {currentMasque.image_key ? "Modifier le masque" : "Ajouter une image"}
                  </button>
                </div>
              </div>

              <h3 className="mb-3 font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                Services utilisés par ce masque
              </h3>

              {currentMasque.services.length === 0 ? (
                <p className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
                  Aucun service rattaché à ce masque.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {currentMasque.services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e6e8f5] px-4 py-3 text-left transition hover:border-[#004a86] hover:bg-[#fbfbfe] hover:shadow-sm dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <MethodChip method={s.methode_http} />
                      <span className="font-mono text-sm font-semibold text-[#0c1d31] dark:text-white">
                        {s.nom}
                      </span>
                      {s.url && (
                        <span className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
                          {s.url}
                        </span>
                      )}
                      <span className="ml-auto font-poppins text-[11px] font-medium text-[#004a86] dark:text-[#4aa1de]">
                        {s.procedures.length} procédure{s.procedures.length > 1 ? "s" : ""} —
                        voir le détail
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NIVEAU 3 — SERVICE : procédures stockées + tables */}
          {currentService && (
            <div>
              <div className="mb-5 rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center gap-3">
                  <MethodChip method={currentService.methode_http} />
                  <span className="font-mono text-base font-bold text-[#0c1d31] dark:text-white">
                    {currentService.nom}
                  </span>
                  {currentService.url && (
                    <span className="font-mono text-xs text-[#525f6d] dark:text-white/50">
                      {currentService.url}
                    </span>
                  )}
                </div>
                {currentService.input_desc && (
                  <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/60">
                    <span className="font-semibold">Entrée :</span> {currentService.input_desc}
                  </p>
                )}
                {currentService.output_desc && (
                  <p className="font-poppins text-xs text-[#525f6d] dark:text-white/60">
                    <span className="font-semibold">Sortie :</span> {currentService.output_desc}
                  </p>
                )}
              </div>

              <h3 className="mb-3 font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                Procédures stockées
              </h3>

              {currentService.procedures.length === 0 ? (
                <p className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
                  Ce service n'appelle aucune procédure stockée.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {currentService.procedures.map((p) => (
                    <article
                      key={p.id}
                      className="rounded-xl border border-[#e6e8f5] p-4 dark:border-white/10"
                    >
                      <p className="font-mono text-sm font-bold text-[#004a86] dark:text-[#4aa1de]">
                        {p.nom}
                      </p>
                      {p.description && (
                        <p className="mt-1 font-poppins text-xs text-[#525f6d] dark:text-white/60">
                          {p.description}
                        </p>
                      )}

                      <div className="mt-3">
                        <p className="mb-1.5 font-poppins text-[10px] font-semibold uppercase tracking-wide text-[#525f6d] dark:text-white/40">
                          Tables utilisées
                        </p>
                        {p.tables.length === 0 ? (
                          <p className="font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                            Aucune table rattachée.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {p.tables.map((t) => (
                              <Link
                                key={t.id}
                                to={`/tables/${t.id}`}
                                className="rounded-full border border-[#e6e8f5] bg-white px-3 py-1 font-mono text-[11px] text-[#004a86] transition hover:border-[#004a86] hover:bg-[#004a86] hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-[#4aa1de] dark:hover:bg-[#4aa1de] dark:hover:text-white"
                              >
                                {t.nom}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle étape">
        <EtapeForm
          onSubmit={async () => {
            await fetchData();
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      <Modal
        isOpen={editingMasque !== null}
        onClose={() => setEditingMasque(null)}
        title={`Masque ${editingMasque?.code ?? ""}`}
      >
        {editingMasque && (
          <MasqueForm
            initialData={{
              code: editingMasque.code,
              nom: editingMasque.nom,
              description: editingMasque.description ?? undefined,
              image_key: editingMasque.image_key,
            }}
            onSubmit={async (data) => {
              await masquesApi.update(editingMasque.id, data);
              await fetchData();
              setEditingMasque(null);
            }}
            onCancel={() => setEditingMasque(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className="h-3 w-3 text-[#8ea0b3]"
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
