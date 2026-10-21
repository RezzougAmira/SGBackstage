/**
 * Message temporaire affiché en bas de l'écran.
 *
 * Remplace les `window.alert(...)` utilisés pour signaler un échec d'export :
 * un alert bloque toute l'interface, n'est pas stylable, et n'est pas annoncé
 * correctement par les lecteurs d'écran. Le toast est non bloquant, suit le
 * thème (clair/sombre) et reste accessible via `role="status"`.
 */

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  /** Efface le message après `duree` ms. Par défaut 3,5 s. */
  onClose: () => void;
  duree?: number;
  /** "erreur" colore le message en rouge ; "info" reste neutre. */
  variant?: "info" | "erreur";
};

export function Toast({ message, onClose, duree = 3500, variant = "info" }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const minuteur = window.setTimeout(onClose, duree);
    return () => window.clearTimeout(minuteur);
  }, [message, duree, onClose]);

  if (!message) return null;

  const couleur =
    variant === "erreur"
      ? "bg-red-600 text-white"
      : "bg-[#003049] text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 font-poppins text-sm shadow-lg ${couleur}`}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le message"
        className="ml-4 font-bold opacity-70 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
