interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Fenêtre de consultation « détail » : plus large que la modale de
 * formulaire, elle défile en hauteur pour accueillir images et listes.
 *
 * L'empilement est volontairement bas (z-[55]) afin que les modales ouvertes
 * depuis le contenu (historique, édition d'un service...) passent au-dessus.
 */
export function DetailModal({ open, onClose, title, children }: DetailModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-[#131313]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e8f5] p-5 dark:border-white/10">
          <h2 className="font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/50 dark:hover:bg-white/10"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
