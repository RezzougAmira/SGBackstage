import { EtapeDetail } from "../types";
import { useProtectedImage } from "../hooks/useProtectedImage";

function MasqueImage({ imageKey }: { imageKey: string | null }) {
  const src = useProtectedImage(imageKey);

  if (!src) return null;

  return (
    <img
      src={src}
      alt="Capture du masque"
      className="mb-3 max-h-56 w-full rounded-lg border border-[#e6e8f5] bg-white object-contain object-top dark:border-white/10 dark:bg-white/5"
    />
  );
}

function MethodChip({ method }: { method: string | null }) {
  if (!method) return null;
  return (
    <span className="rounded bg-[#004a86]/10 px-2 py-0.5 font-poppins text-[10px] font-bold text-[#004a86] dark:bg-white/10 dark:text-[#4aa1de]">
      {method}
    </span>
  );
}

export function EtapeDetails({ etape }: { etape: EtapeDetail }) {
  const masques = etape.masques ?? [];
  if (masques.length === 0) {
    return (
      <p className="font-poppins text-xs text-[#525f6d] dark:text-white/50">
        Aucun masque associé à cette étape.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {masques.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-4 dark:border-white/10 dark:bg-white/5"
        >
          <MasqueImage imageKey={m.image_key} />

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-[#004a86] px-3 py-1 font-mono text-xs font-bold text-white">
              {m.code}
            </span>
            <h4 className="font-poppins text-sm font-semibold text-[#0c1d31] dark:text-white">
              {m.nom}
            </h4>
          </div>

          {m.description && (
            <p className="mt-2 font-poppins text-xs text-[#525f6d] dark:text-white/60">
              {m.description}
            </p>
          )}

          {m.services.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {m.services.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-[#e6e8f5] bg-white p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <MethodChip method={s.methode_http} />
                    <span className="font-mono text-xs font-semibold text-[#0c1d31] dark:text-white">
                      {s.nom}
                    </span>
                    {s.url && (
                      <span className="font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                        {s.url}
                      </span>
                    )}
                  </div>

                  {s.input_desc && (
                    <p className="mt-1 font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                      Entrée : {s.input_desc}
                    </p>
                  )}
                  {s.output_desc && (
                    <p className="font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                      Sortie : {s.output_desc}
                    </p>
                  )}

                  {s.procedures.map((p) => (
                    <div
                      key={p.id}
                      className="mt-2 border-t border-[#e6e8f5] pt-2 dark:border-white/10"
                    >
                      <p className="font-mono text-[11px] font-semibold text-[#004a86] dark:text-[#4aa1de]">
                        {p.nom}
                      </p>
                      {p.description && (
                        <p className="font-poppins text-[11px] text-[#525f6d] dark:text-white/50">
                          {p.description}
                        </p>
                      )}
                      {p.tables.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-poppins text-[10px] text-[#525f6d]/70 dark:text-white/40">
                            Tables :
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
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
