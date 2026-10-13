import { useState } from "react";
import { EtapeDetail, MasqueRef } from "../types";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { FonctionnalitesSection } from "./FonctionnalitesSection";
import { EntityHistory } from "./EntityHistory";

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

interface EtapeDetailsProps {
  etape: EtapeDetail;
  onDeleteMasque: (masque: MasqueRef) => void;
  onEditMasque?: (masque: MasqueRef) => void;
}

export function EtapeDetails({ etape, onDeleteMasque, onEditMasque }: EtapeDetailsProps) {
  const masques = etape.masques ?? [];
  const [historyMasque, setHistoryMasque] = useState<MasqueRef | null>(null);
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
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="Historique du masque"
                onClick={() => setHistoryMasque(m)}
                className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e6e8f5] hover:text-[#003049] dark:text-white/50 dark:hover:bg-white/10"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {onEditMasque && (
                <button
                  type="button"
                  title="Modifier le masque"
                  onClick={() => onEditMasque(m)}
                  className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e0f2f1] hover:text-[#26A69A] dark:text-white/50 dark:hover:bg-teal-500/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 3a2.85 2.83 0 114.01 4L8 20l-4 1 1-4L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                title="Retirer le masque"
                onClick={() => onDeleteMasque(m)}
                className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {m.description && (
            <p className="mt-2 font-poppins text-sm text-[#525f6d] dark:text-white/60">
              {m.description}
            </p>
          )}

          <MasqueImage imageKey={m.image_key} />

          {/* Les fonctionnalités vivent dans le masque : ce qu'on peut faire
              sur cet écran, les services qui le réalisent, puis leurs
              procédures stockées. */}
          <FonctionnalitesSection masqueId={m.id} />
        </div>
      ))}
      {historyMasque && (
        <EntityHistory
          typeEntite="masque"
          entiteId={historyMasque.id}
          title={`${historyMasque.code} — ${historyMasque.nom}`}
          open={true}
          onClose={() => setHistoryMasque(null)}
        />
      )}
    </div>
  );
}
