/**
 * Affichage d'une erreur de chargement, à la place d'un écran vide.
 *
 * Pourquoi ce composant existe : la majorité des pages se contentaient d'un
 * `console.error(...)` en cas d'échec réseau ou serveur. L'utilisateur voyait
 * alors une page blanche ou des compteurs à zéro, sans savoir si l'erreur
 * venait de lui, de sa connexion ou du serveur — et sans moyen de réessayer.
 * Ici, le message est à l'écran, explicite, et le bouton « Réessayer » évite
 * d'avoir à recharger toute la page.
 */

type ErrorStateProps = {
  /** Message affiché. Par défaut, une formulation neutre. */
  message?: string;
  /** Détail technique (ex. le message de l'exception), affiché en petit. */
  detail?: string;
  /** Recharge les données. Le bouton n'apparaît que si la fonction est fournie. */
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  message = "Impossible de charger les données.",
  detail,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20 ${className}`}
    >
      <p className="font-poppins text-sm font-medium text-red-800 dark:text-red-300">
        {message}
      </p>
      {detail && (
        <p className="mt-2 font-poppins text-xs text-red-600/80 dark:text-red-400/70">
          {detail}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 font-poppins text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/30"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

/**
 * Message d'erreur inséré dans une liste (tableau, journal) : version compacte
 * d'ErrorState, sans cadre, pour ne pas casser la mise en page du tableau.
 */
export function ErrorInline({
  message = "Erreur de chargement.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-3 px-4 py-8"
    >
      <span className="font-poppins text-sm text-red-700 dark:text-red-400">
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-poppins text-sm font-medium text-[#00707a] underline hover:no-underline dark:text-[#3fc6cf]"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
