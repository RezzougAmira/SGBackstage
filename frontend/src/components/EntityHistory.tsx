import { useEffect, useMemo, useState } from "react";
import { historiqueApi } from "../api/historique";
import { HistoriqueEvent, HistoriqueFilters } from "../types";

interface EntityHistoryProps {
  typeEntite: "masque" | "service" | "procedure";
  entiteId: number;
  title: string;
  open: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  suppression: "Suppression",
  rattachement: "Rattachement",
  detachement: "Détachement",
  reorder: "Réordonnancement",
};

const CHAMPS_IGNORES = new Set(["created_at", "updated_at", "id", "impacts"]);

const LIBELLES: Record<string, string> = {
  nom: "Nom",
  code: "Code",
  description: "Description",
  url: "URL",
  methode_http: "Méthode HTTP",
  controleur: "Contrôleur",
  input_desc: "Entrée",
  output_desc: "Sortie",
  modifie_bdd: "Modifie la BDD",
  collection: "Collection",
  ordre: "Ordre",
  image_key: "Image",
};

function libelle(cle: string): string {
  return LIBELLES[cle] ?? cle;
}

function formatValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
  if (typeof valeur === "object") return JSON.stringify(valeur);
  return String(valeur);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString("fr-FR");
  } catch {
    return date;
  }
}

function renderDiff(event: HistoriqueEvent) {
  const avant = (event.avant ?? null) as Record<string, unknown> | null;
  const apres = (event.apres ?? null) as Record<string, unknown> | null;
  if (!avant && !apres) return null;

  // Champs réellement modifiés entre les deux captures (avant → après).
  const cles = new Set([...Object.keys(avant ?? {}), ...Object.keys(apres ?? {})]);
  const changements: [string, unknown, unknown][] = [];
  for (const cle of cles) {
    if (CHAMPS_IGNORES.has(cle)) continue;
    const a = avant ? avant[cle] : undefined;
    const b = apres ? apres[cle] : undefined;
    if (a !== b) changements.push([cle, a, b]);
  }

  if (changements.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg bg-[#f6f8fa] p-2 text-[11px] leading-relaxed text-[#525f6d] dark:bg-white/5 dark:text-white/60">
      <p className="mb-1 font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
        Ce qui a changé
      </p>
      <ul className="space-y-0.5">
        {changements.map(([cle, a, b]) => (
          <li key={cle} className="flex flex-wrap items-center gap-1">
            <span className="font-semibold text-[#0c1d31] dark:text-white/80">
              {libelle(cle)}
            </span>
            {apres && avant && (
              <>
                <span className="text-red-500 line-through">{formatValeur(a)}</span>
                <span className="text-[#8ea0b3]">→</span>
              </>
            )}
            <span className="text-teal-600 dark:text-teal-400">{formatValeur(b)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EntityHistory({
  typeEntite,
  entiteId,
  title,
  open,
  onClose,
}: EntityHistoryProps) {
  const [events, setEvents] = useState<HistoriqueEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Dossier Word (fiche + journal complet) : assemblé côté serveur, puis
  // téléchargé via une URL d'objet temporaire.
  const handleExportDossier = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await historiqueApi.exportDossier(typeEntite, entiteId);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `dossier-${title}.docx`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erreur:", e);
      window.alert("Le téléchargement du dossier a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  const filters = useMemo<HistoriqueFilters>(
    () => ({
      type_entite: typeEntite,
      entite_id: entiteId,
      par_page: 50,
    }),
    [typeEntite, entiteId]
  );

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await historiqueApi.list(filters);
        setEvents(res.evenements);
      } catch (e: any) {
        setError(e?.message ?? "Impossible de charger l'historique");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, filters]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="no-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-poppins text-xl font-bold text-[#0A2540] dark:text-white">
              Historique
            </h2>
            <p className="mt-1 font-poppins text-xs text-gray-500 dark:text-gray-400">
              {title} — {events.length} événement{events.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDossier}
              disabled={exporting}
              title="Télécharger la fiche et le journal complet de cet élément (Word)"
              className="flex items-center gap-1.5 rounded-lg border border-[#dcdce1] bg-white px-3 py-1.5 font-poppins text-xs font-semibold text-[#003049] transition hover:bg-[#e6e8f5] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
              </svg>
              {exporting ? "Génération…" : "Télécharger le dossier"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/50 dark:hover:bg-white/10"
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
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-8 text-center font-poppins text-sm text-[#8ea0b3] dark:text-white/40">
            Chargement de l'historique...
          </p>
        ) : events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e6e8f5] py-8 text-center font-poppins text-sm text-[#8ea0b3] dark:border-white/10">
            Aucun événement enregistré pour cet élément.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((evt) => {
              const auteur = evt.utilisateur?.name ?? "Système";
              return (
                <li
                  key={evt.id}
                  className="rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-poppins text-sm font-semibold text-[#0c1d31] dark:text-white">
                        {ACTION_LABELS[evt.action] ?? evt.action}
                      </p>
                      <p className="mt-0.5 font-poppins text-xs text-[#525f6d] dark:text-white/50">
                        Par {auteur} • {formatDate(evt.created_at)}
                      </p>
                    </div>
                    <span className="rounded bg-[#004a86]/10 px-2 py-0.5 font-poppins text-[10px] font-semibold uppercase tracking-wider text-[#004a86] dark:bg-white/10 dark:text-white/70">
                      {evt.type_entite}
                    </span>
                  </div>
                  {evt.nom_entite && (
                    <p className="mt-2 font-poppins text-xs text-[#0c1d31] dark:text-white">
                      {evt.nom_entite}
                    </p>
                  )}
                  {renderDiff(evt)}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
