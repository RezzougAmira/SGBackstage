/**
 * Lecture d'un paramètre de l'URL pour pré-remplir un filtre.
 *
 * Utilisé par les pages liste (masques, services…) : la recherche globale
 * renvoie vers elles avec `?search=...` afin d'arriver directement sur
 * l'élément trouvé, plutôt que sur une route de détail inexistante.
 */
export function lireSearchParam(nom = "search"): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(nom) ?? "";
}
