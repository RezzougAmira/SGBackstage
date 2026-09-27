import { useEffect, useState } from "react";
import { AttributForm, AttributDraft } from "./AttributForm";
import { domainesApi } from "../../api/domaines";
import type { Domaine } from "../../types";

interface TableFormProps {
  onSubmit: (data: {
    nom: string;
    schema?: string;
    description?: string;
    attributs: AttributDraft[];
  }) => Promise<void>;
  onCancel: () => void;
}

interface PendingAttribut extends AttributDraft {
  uid: number;
}

const labelClass = "mb-1 block text-sm font-normal text-gray-700 dark:text-gray-300";
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";

const btnNavy =
  "rounded-full bg-[#0A2540] px-5 py-2 text-xs font-semibold text-white hover:bg-[#14345c] disabled:opacity-50";
const btnRedOutline =
  "rounded-full border border-[#EF5350] bg-white px-5 py-2 text-xs font-semibold text-[#EF5350] hover:bg-red-50 dark:border-red-400/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10";
const btnTealOutline =
  "rounded-full border border-[#26A69A] bg-white px-5 py-2 text-xs font-semibold text-[#26A69A] hover:bg-teal-50 dark:border-teal-400/60 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-500/10";

/* Règles de nommage BDD : majuscules, lettres/chiffres/underscore, commence par une lettre */
const DB_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function TableForm({ onSubmit, onCancel }: TableFormProps) {
  const [nom, setNom] = useState("");
  const [nomError, setNomError] = useState("");
  const [schema, setSchema] = useState("");
  const [description, setDescription] = useState("");
  const [attributs, setAttributs] = useState<PendingAttribut[]>([]);
  const [showAttributModal, setShowAttributModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [domaineId, setDomaineId] = useState("");

  useEffect(() => {
    domainesApi.list().then(setDomaines).catch(() => setDomaines([]));
  }, []);

  const handleAddAttribut = (attr: AttributDraft) => {
    setAttributs((prev) => [...prev, { ...attr, uid: Date.now() + Math.random() }]);
    setShowAttributModal(false);
  };

  const handleChangeNom = (value: string) => {
    const upper = value.toUpperCase();
    setNom(upper);
    if (upper && !DB_NAME_PATTERN.test(upper)) {
      setNomError("Nom invalide : lettres majuscules, chiffres et _ uniquement, sans espaces (ex: CLIENT, COMPTE_OPERATION).");
    } else {
      setNomError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setNomError("Veuillez renseigner le nom de la table.");
      return;
    }
    if (!DB_NAME_PATTERN.test(nom)) {
      setNomError("Nom invalide : lettres majuscules, chiffres et _ uniquement, sans espaces (ex: CLIENT, COMPTE_OPERATION).");
      return;
    }
    setLoading(true);
    setSubmitError("");
    try {
      await onSubmit({ nom, schema, description: description || undefined, attributs });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div
          className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Ajouter une table</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Créer une nouvelle table dans la documentation technique du SGB
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <p className="mb-3 text-base font-bold text-[#004A86] dark:text-[#4aa1de]">
              Informations de la table
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Nom de la table</label>
                <input
                  className={`${inputClass} ${nomError ? "border-red-500 focus:border-red-500" : ""}`}
                  value={nom}
                  onChange={(e) => handleChangeNom(e.target.value)}
                  placeholder="Ex : CLIENT, COMPTE_OPERATION"
                />
                {nomError && (
                  <p className="mt-1 text-xs text-red-500">{nomError}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Schéma</label>
                <input className={inputClass} value={schema} onChange={(e) => setSchema(e.target.value)} placeholder="Ex : public" />
              </div>

              <div>
                <label className={labelClass}>Domaine</label>
                <select
                  className={inputClass}
                  value={domaineId}
                  onChange={(e) => setDomaineId(e.target.value)}
                >
                  <option value="">Choisir un domaine</option>
                  {domaines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez l'objectif de la table" />
              </div>
            </div>

            <p className="mb-3 mt-6 text-base font-bold text-[#004A86] dark:text-[#4aa1de]">
              Attributs
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Les attributs de cette table peuvent être ajoutés maintenant ou ultérieurement.
            </p>

            {attributs.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attributs.map((a) => (
                  <span
                    key={a.uid}
                    className="flex h-7 w-36 items-center justify-between gap-2 rounded-full bg-[#F4F5F7] px-3 text-xs text-[#0A2540] dark:bg-white/10 dark:text-white"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">{a.nom}</span>
                    <button
                      type="button"
                      aria-label={`Supprimer ${a.nom}`}
                      onClick={() => setAttributs((prev) => prev.filter((x) => x.uid !== a.uid))}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAttributModal(true)}
              className={btnNavy}
            >
              + Ajouter un attribut
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
              {submitError && (
                <p className="w-full text-xs text-red-500">{submitError}</p>
              )}
              <button type="button" onClick={onCancel} className={`${btnRedOutline} w-32`}>
                Annuler
              </button>
              <button type="submit" disabled={loading} className={`${btnTealOutline} w-32`}>
                {loading ? "Création..." : "Créer la table"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showAttributModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <AttributForm
            onAddAndReset={handleAddAttribut}
            onSubmit={handleAddAttribut}
            onCancel={() => setShowAttributModal(false)}
          />
        </div>
      )}
    </>
  );
}