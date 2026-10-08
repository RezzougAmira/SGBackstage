import { useState } from 'react';

interface ProcedureFormProps {
  initialData?: { nom: string; description: string };
  onSubmit: (data: { nom: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

const labelClass = "mb-1 block text-sm font-normal text-gray-700 dark:text-gray-300";
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";
const sectionClass = "mb-3 text-base font-bold text-[#004A86] dark:text-[#4aa1de]";

const btnRedOutline =
  "rounded-full border border-[#EF5350] bg-white px-5 py-2 text-xs font-semibold text-[#EF5350] hover:bg-red-50 dark:border-red-400/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10";
const btnTealOutline =
  "rounded-full border border-[#26A69A] bg-white px-5 py-2 text-xs font-semibold text-[#26A69A] hover:bg-teal-50 dark:border-teal-400/60 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-500/10";

export function ProcedureForm({ initialData, onSubmit, onCancel }: ProcedureFormProps) {
  const [nom, setNom] = useState(initialData?.nom || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ nom, description: description || undefined });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className={sectionClass}>Informations de la procédure</p>

      <div>
        <label className={labelClass}>Nom *</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          className={inputClass}
          placeholder="ex: SP_CREATE_CUSTOMER"
        />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Description de la procédure..."
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={`${btnRedOutline} w-32`}>
          Annuler
        </button>
        <button type="submit" disabled={loading} className={`${btnTealOutline} w-32`}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}