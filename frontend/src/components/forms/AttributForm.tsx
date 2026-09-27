import { useEffect, useState } from "react";
import { tablesApi } from "../../api/tables";
import { Table, Attribut } from "../../types";

/* Draft d'attribut collecté avant la création de la table */
export interface AttributDraft {
  nom: string;
  type: string;
  taille: string;
  nullable: boolean;
  cle: string;
  description: string;
  tableReferencee: string;
  attributReference: string;
}

const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#003049] dark:text-white";
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-[#F4F5F7] px-3 py-2 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";

const btnNavy =
  "rounded-full bg-[#0A2540] px-5 py-2 text-xs font-semibold text-white hover:bg-[#14345c] disabled:opacity-50";
const btnRedOutline =
  "rounded-full border border-[#EF5350] bg-white px-5 py-2 text-xs font-semibold text-[#EF5350] hover:bg-red-50 dark:border-red-400/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10";
const btnTealOutline =
  "rounded-full border border-[#26A69A] bg-white px-5 py-2 text-xs font-semibold text-[#26A69A] hover:bg-teal-50 dark:border-teal-400/60 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-500/10";

interface AttributFormProps {
  onAddAndReset: (attr: AttributDraft) => void;
  onSubmit: (attr: AttributDraft) => void;
  onCancel: () => void;
}

export function AttributForm({ onAddAndReset, onSubmit, onCancel }: AttributFormProps) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [taille, setTaille] = useState("");
  const [nullable, setNullable] = useState(false);
  const [cle, setCle] = useState("aucune");
  const [description, setDescription] = useState("");
  const [tableReferencee, setTableReferencee] = useState("");
  const [attributReference, setAttributReference] = useState("");

  const [tables, setTables] = useState<Table[]>([]);
  const [refAttributs, setRefAttributs] = useState<Attribut[]>([]);

  useEffect(() => {
    tablesApi
      .list()
      .then(setTables)
      .catch((err) => console.error("Erreur:", err));
  }, []);

  const handleTableReferencee = async (tableId: string) => {
    setTableReferencee(tableId);
    setAttributReference("");
    if (!tableId) {
      setRefAttributs([]);
      return;
    }
    try {
      const attrs = await tablesApi.listAttributs(parseInt(tableId));
      setRefAttributs(attrs);
    } catch (err) {
      console.error("Erreur:", err);
      setRefAttributs([]);
    }
  };

  const buildDraft = (): AttributDraft | null => {
    if (!nom.trim() || !type.trim()) {
      alert("Veuillez renseigner le nom et le type de l'attribut.");
      return null;
    }
    return {
      nom: nom.trim(),
      type: type.trim(),
      taille: taille.trim(),
      nullable,
      cle,
      description: description.trim(),
      tableReferencee,
      attributReference,
    };
  };

  const resetForm = () => {
    setNom("");
    setType("");
    setTaille("");
    setNullable(false);
    setCle("aucune");
    setDescription("");
    setTableReferencee("");
    setAttributReference("");
    setRefAttributs([]);
  };

  const handleAddAndReset = () => {
    const draft = buildDraft();
    if (!draft) return;
    onAddAndReset(draft);
    resetForm();
  };

  const handleSubmit = () => {
    const draft = buildDraft();
    if (!draft) return;
    onSubmit(draft);
  };

  return (
    <div className="no-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Nouvel attribut</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Caractériser l'attribut à ajouter
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer"
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Nom</label>
            <input className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : date_creation" />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Choisir le type</option>
              {[
                "VARCHAR",
                "CHAR",
                "TEXT",
                "INT",
                "BIGINT",
                "SMALLINT",
                "DECIMAL",
                "FLOAT",
                "DOUBLE",
                "DATE",
                "DATETIME",
                "TIMESTAMP",
                "TIME",
                "BOOLEAN",
                "BLOB",
                "JSON",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Taille</label>
            <input
              className={inputClass}
              value={taille}
              onChange={(e) => setTaille(e.target.value)}
              type="number"
              min={0}
              placeholder="Ex : 255"
            />
          </div>
          <div>
            <label className={labelClass}>Nullable</label>
            <div className="flex items-center gap-6 rounded-lg border border-gray-200 bg-[#F4F5F7] px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              {[
                { v: true, label: "Oui" },
                { v: false, label: "Non" },
              ].map((opt) => (
                <label key={opt.label} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="nullable"
                    checked={nullable === opt.v}
                    onChange={() => setNullable(opt.v)}
                    className="h-3.5 w-3.5 accent-[#0A2540]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Clé</label>
          <select className={inputClass} value={cle} onChange={(e) => setCle(e.target.value)}>
            <option value="aucune">Aucune</option>
            <option value="primaire">Clé primaire</option>
            <option value="etrangere">Clé étrangère</option>
          </select>
        </div>

        {/* Champ conditionnel : Clé étrangère (placé avant Description pour que le menu s'ouvre vers le bas) */}
        {cle === "etrangere" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Table référencée</label>
              <select
                className={inputClass}
                value={tableReferencee}
                onChange={(e) => handleTableReferencee(e.target.value)}
              >
                <option value="">Choisir la table cible</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Attribut référencé</label>
              <select
                className={inputClass}
                value={attributReference}
                onChange={(e) => setAttributReference(e.target.value)}
                disabled={!tableReferencee}
              >
                <option value="">Choisir l'attribut cible</option>
                {refAttributs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Description</label>
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez le rôle de cet attribut" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
        <button type="button" onClick={handleAddAndReset} className={btnNavy}>
          + Ajouter un attribut
        </button>
        <button type="button" onClick={onCancel} className={btnRedOutline}>
          Annuler
        </button>
        <button type="button" onClick={handleSubmit} className={btnTealOutline}>
          Ajouter
        </button>
      </div>
    </div>
  );
}