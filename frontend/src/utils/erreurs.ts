/**
 * Message lisible à partir d'une erreur quelconque.
 *
 * Le but est d'éviter deux extrêmes : afficher un écran vide quand quelque
 * chose échoue, et afficher un objet d'erreur brut incompréhensible. On
 * exploite le message fourni par l'API (nos erreurs métier sont rédigées en
 * français), et on retombe sur un texte générique sinon — en distinguant le
 * cas « serveur injoignable », fréquent avec un backend en veille.
 */
export function messageErreur(erreur: unknown): string {
  if (erreur instanceof Error) {
    const texte = erreur.message.trim();
    if (!texte) return "Une erreur inattendue est survenue.";
    // Le backend en veille (offre gratuite) met 30 à 60 s à répondre : le
    // dire explicitement évite de croire à une panne définitive.
    if (/failed to fetch|networkerror|load failed/i.test(texte)) {
      return "Serveur injoignable. Il est peut-être en cours de démarrage, réessayez dans un instant.";
    }
    return texte;
  }
  if (typeof erreur === "string" && erreur.trim()) return erreur;
  return "Une erreur inattendue est survenue.";
}
