import { useState } from "react";

interface DomaineFormProps {
  onSubmit: (data: { nom: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

const labelClass = "mb-1 block text-sm font-normal text-gray-700 dark:text-gray-300";
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";

const btnRedOutline =
  "rounded-full border border-[#EF5350] bg-white px-5 py-2 text-xs font-semibold text-[#EF5350] hover:bg-red-50 dark:border-red-400/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10";
const btnTealOutline =
  "rounded-full border border-[#26A69A] bg-white px-5 py-2 text-xs font-semibold text-[#26A69A] hover:bg-teal-50 dark:border-teal-400/60 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-500/10";

export function DomaineForm({ onSubmit, onCancel }: DomaineFormProps) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [nomError, setNomError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNom = (value: string) => {
    setNom(value);
    if (nomError) {
      setNomError(value.trim() ? "" : "Veuillez renseigner le nom du domaine.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setNomError("Veuillez renseigner le nom du domaine.");
      return;
    }
    setLoading(true);
    setSubmitError("");
    try {
      await onSubmit({ nom: nom.trim(), description: description.trim() || undefined });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="no-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Ajouter un domaine</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Créer un nouveau domaine métier dans la documentation du SGB
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="mb-3 text-base font-bold text-[#004A86] dark:text-[#4aa1de]">
            Informations du domaine
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Nom du domaine</label>
              <input
                className={`${inputClass} ${nomError ? "border-red-500 focus:border-red-500" : ""}`}
                value={nom}
                onChange={(e) => handleNom(e.target.value)}
                placeholder="Ex : Commerce extérieur, Monétique, Crédits"
              />
              {nomError && <p className="mt-1 text-xs text-red-500">{nomError}</p>}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le périmètre du domaine"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
            {submitError && <p className="w-full text-xs text-red-500">{submitError}</p>}
            <button type="button" onClick={onCancel} className={`${btnRedOutline} w-32`}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className={`${btnTealOutline} w-32`}>
              {loading ? "Création..." : "Créer le domaine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
