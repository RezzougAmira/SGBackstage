// Rôles applicatifs et droits d'interface.
//
// Ces helpers ne remplacent PAS l'autorisation serveur : ils servent seulement
// à masquer les actions interdites. Le backend refuse de toute façon l'appel
// (voir backend/app/utils/roles.py).

export type Role = "admin" | "editor" | "contributor";

export const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Administrateur",
    description: "Accès complet, y compris la gestion des utilisateurs.",
  },
  {
    value: "editor",
    label: "Développeur (modifie et supprime)",
    description: "Crée, modifie et supprime le référentiel.",
  },
  {
    value: "contributor",
    label: "Développeur (modifie sans supprimer)",
    description: "Crée et modifie le référentiel, mais ne peut rien supprimer.",
  },
];

/** Peut créer / modifier / rattacher / réordonner. */
export function canWrite(role?: string | null): boolean {
  return role === "admin" || role === "editor" || role === "contributor";
}

/** Peut supprimer une entité du référentiel. */
export function canDelete(role?: string | null): boolean {
  return role === "admin" || role === "editor";
}

/** Libellé court et lisible d'un rôle (pour l'affichage). */
export function roleLabel(role?: string | null): string {
  const found = ROLES.find((r) => r.value === role);
  return found ? found.label : role ?? "—";
}
