import { useState } from 'react';

interface ServiceFormProps {
  initialData?: {
    nom: string;
    methode_http: string;
    url: string;
    input_desc: string;
    output_desc: string;
    controleur: string;
    modifie_bdd: boolean;
  };
  onSubmit: (data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    modifie_bdd?: boolean;
  }) => Promise<void>;
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

export function ServiceForm({ initialData, onSubmit, onCancel }: ServiceFormProps) {
  const [nom, setNom] = useState(initialData?.nom || '');
  const [methodeHttp, setMethodeHttp] = useState(initialData?.methode_http || 'GET');
  const [url, setUrl] = useState(initialData?.url || '');
  const [inputDesc, setInputDesc] = useState(initialData?.input_desc || '');
  const [outputDesc, setOutputDesc] = useState(initialData?.output_desc || '');
  const [controleur, setControleur] = useState(initialData?.controleur || '');
  const [modifieBdd, setModifieBdd] = useState(initialData?.modifie_bdd || false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        nom,
        methode_http: methodeHttp || undefined,
        url: url || undefined,
        input_desc: inputDesc || undefined,
        output_desc: outputDesc || undefined,
        controleur: controleur || undefined,
        modifie_bdd: modifieBdd,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <p className={`${sectionClass} col-span-2`}>Informations du service</p>

      <div>
        <label className={labelClass}>Nom *</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          className={inputClass}
          placeholder="ex: CustomerService"
        />
      </div>
      <div>
        <label className={labelClass}>Méthode HTTP</label>
        <select
          value={methodeHttp}
          onChange={(e) => setMethodeHttp(e.target.value)}
          className={inputClass}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={inputClass}
          placeholder="ex: /api/customers"
        />
      </div>
      <div>
        <label className={labelClass}>Contrôleur</label>
        <input
          type="text"
          value={controleur}
          onChange={(e) => setControleur(e.target.value)}
          className={inputClass}
          placeholder="ex: CustomerController"
        />
      </div>
      <div>
        <label className={labelClass}>Input</label>
        <input
          type="text"
          value={inputDesc}
          onChange={(e) => setInputDesc(e.target.value)}
          className={inputClass}
          placeholder="ex: ID client"
        />
      </div>
      <div>
        <label className={labelClass}>Output</label>
        <input
          type="text"
          value={outputDesc}
          onChange={(e) => setOutputDesc(e.target.value)}
          className={inputClass}
          placeholder="ex: Informations client"
        />
      </div>
      <div className="col-span-2 flex items-center">
        <input
          type="checkbox"
          id="modifie_bdd"
          checked={modifieBdd}
          onChange={(e) => setModifieBdd(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[#004A86] focus:ring-[#004A86]"
        />
        <label htmlFor="modifie_bdd" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Ce service modifie la base de données
        </label>
      </div>
      <div className="col-span-2 mt-2 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
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