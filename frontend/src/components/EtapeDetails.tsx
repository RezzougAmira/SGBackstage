import { EtapeDetail, MasqueRef } from "../types";
import { useProtectedImage } from "../hooks/useProtectedImage";

function MasqueImage({ imageKey }: { imageKey: string | null }) {
  const src = useProtectedImage(imageKey);

  if (!src) return null;

  return (
    <img
      src={src}
      alt="Capture du masque"
      className="mb-4 mt-6 max-h-[900px] w-full rounded-lg border border-[#e6e8f5] bg-white object-contain object-top dark:border-white/10 dark:bg-white/5"
    />
  );
}

function MethodChip({ method }: { method: string | null }) {
  if (!method) return null;
  return (
    <span className="rounded bg-[#004a86]/10 px-2.5 py-1 font-poppins text-xs font-bold text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]">
      {method}
    </span>
  );
}

interface EtapeDetailsProps {
  etape: EtapeDetail;
  onDeleteMasque: (masque: MasqueRef) => void;
}

export function EtapeDetails({ etape, onDeleteMasque }: EtapeDetailsProps) {
  const masques = etape.masques ?? [];
  if (masques.length === 0) {
    return (
      <p className="font-poppins text-sm text-[#525f6d] dark:text-white/50">
        Aucun masque associé à cette étape.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {masques.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-5 dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-[#004a86]/10 px-2.5 py-1 font-poppins text-xs font-bold text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]">
              {m.code}
            </span>
            <h4 className="font-poppins text-lg font-semibold text-[#0c1d31] dark:text-white">
              {m.nom}
            </h4>
            <button
              type="button"
              onClick={() => onDeleteMasque(m)}
              className="ml-auto shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {m.description && (
            <p className="mt-2 font-poppins text-sm text-[#525f6d] dark:text-white/60">
              {m.description}
            </p>
          )}

          <MasqueImage imageKey={m.image_key} />

          <div className="mt-6">
            <h5 className="font-poppins text-base font-bold text-[#0c1d31] dark:text-white">
              Les fonctions
            </h5>

            {m.fonctions.length === 0 ? (
              <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/40">
                Aucune fonction associée.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {m.fonctions.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-[#e6e8f5] bg-white p-5 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-[#004a86]/10 px-3 py-1 font-poppins text-xs font-bold text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]">
                        {f.nom}
                      </span>
                    </div>

                    {f.description && (
                      <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/60">
                        {f.description}
                      </p>
                    )}

                    <div className="mt-4">
                      <h6 className="font-poppins text-sm font-bold text-[#0c1d31] dark:text-white">
                        Les services
                      </h6>

                      {f.services.length === 0 ? (
                        <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/40">
                          Aucun service associé.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-3">
                          {f.services.map((s) => (
                            <div
                              key={s.id}
                              className="rounded-lg border border-[#e6e8f5] bg-[#fbfbfe] p-4 dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <MethodChip method={s.methode_http} />
                                <span className="font-mono text-sm font-semibold text-[#0c1d31] dark:text-white">
                                  {s.nom}
                                </span>
                                {s.url && (
                                  <span className="rounded-full bg-[#e6e8f5] px-2.5 py-0.5 font-mono text-[10px] text-[#525f6d] dark:bg-white/10 dark:text-white/60">
                                    {s.url}
                                  </span>
                                )}
                              </div>

                              {s.input_desc && (
                                <p className="mt-1.5 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                                  <span className="font-semibold">Entrée :</span> {s.input_desc}
                                </p>
                              )}
                              {s.output_desc && (
                                <p className="mt-1 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                                  <span className="font-semibold">Sortie :</span> {s.output_desc}
                                </p>
                              )}

                              <div className="mt-3">
                                <h6 className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
                                  Procédures stockées
                                </h6>

                                {s.procedures.length === 0 ? (
                                  <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/40">
                                    Aucune procédure stockée.
                                  </p>
                                ) : (
                                  <div className="mt-2 flex flex-col gap-2">
                                    {s.procedures.map((p) => (
                                      <div
                                        key={p.id}
                                        className="rounded-md border border-[#e6e8f5] bg-white p-3 dark:border-white/10 dark:bg-white/5"
                                      >
                                        <p className="font-mono text-xs font-bold text-[#004a86] dark:text-[#4aa1de]">
                                          {p.nom}
                                        </p>
                                        {p.description && (
                                          <p className="mt-1 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                                            {p.description}
                                          </p>
                                        )}
                                        {p.tables.length > 0 && (
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#525f6d]/70 dark:text-white/40">
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
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
