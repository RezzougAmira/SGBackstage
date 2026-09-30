import { useRef, useState } from "react";
import { uploadApi } from "../../api/upload";
import { useProtectedImage } from "../../hooks/useProtectedImage";

export interface MasqueFormData {
  code: string;
  nom: string;
  description?: string;
  image_key: string | null;
  service?: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
  };
}

interface MasqueFormProps {
  initialData?: {
    code: string;
    nom: string;
    description?: string;
    image_key?: string | null;
  };
  submitLabel?: string;
  onSubmit: (data: MasqueFormData) => Promise<void>;
  onCancel: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const METHODES = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const CODE_LENGTH = 6;

const labelClass = "mb-1 block text-sm font-normal text-gray-700 dark:text-gray-300";
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";
const sectionClass = "mb-3 text-base font-bold text-[#004A86] dark:text-[#4aa1de]";

const btnRedOutline =
  "rounded-full border border-[#EF5350] bg-white px-5 py-2 text-xs font-semibold text-[#EF5350] hover:bg-red-50 dark:border-red-400/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10";
const btnTealOutline =
  "rounded-full border border-[#26A69A] bg-white px-5 py-2 text-xs font-semibold text-[#26A69A] hover:bg-teal-50 dark:border-teal-400/60 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-500/10";

export function MasqueForm({
  initialData,
  submitLabel = "Enregistrer",
  onSubmit,
  onCancel,
}: MasqueFormProps) {
  const [code, setCode] = useState(initialData?.code ?? "");
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageKey, setImageKey] = useState<string | null>(initialData?.image_key ?? null);
  const [withService, setWithService] = useState(false);
  const [serviceNom, setServiceNom] = useState("");
  const [methode, setMethode] = useState("POST");
  const [url, setUrl] = useState("");
  const [inputDesc, setInputDesc] = useState("");
  const [outputDesc, setOutputDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState("");
  const [nomError, setNomError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewSrc = useProtectedImage(imageKey);

  // Clés envoyées pendant cette session et pas encore enregistrées en base.
  // Si le formulaire est annulé, elles sont supprimées du bucket.
  const pendingUploads = useRef<string[]>([]);

  const discardUpload = async (key: string | null) => {
    if (!key) return;
    pendingUploads.current = pendingUploads.current.filter((k) => k !== key);
    try {
      await uploadApi.remove(key);
    } catch {
      // Le fichier reste orphelin : on ne bloque pas l'utilisateur pour autant.
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Format non accepté. Utilisez PNG, JPEG, GIF ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Image trop volumineuse. Maximum : 10 Mo.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadApi.upload(file);
      // Le fichier précédent n'est supprimé que s'il vient de cette session :
      // une image déjà enregistrée en base reste en place jusqu'à la validation.
      const previous = imageKey;
      setImageKey(result.key);
      pendingUploads.current.push(result.key);
      if (previous && previous !== initialData?.image_key) {
        await discardUpload(previous);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const previous = imageKey;
    setImageKey(null);
    if (previous && previous !== initialData?.image_key) {
      await discardUpload(previous);
    }
  };

  const handleCancel = async () => {
    const orphans = [...pendingUploads.current];
    pendingUploads.current = [];
    await Promise.all(orphans.map((key) => uploadApi.remove(key).catch(() => undefined)));
    onCancel();
  };

  const codeErrorMessage = (value: string) => {
    if (!value) return "Veuillez renseigner le code du masque.";
    if (value.length !== CODE_LENGTH) {
      return `Le code doit comporter exactement ${CODE_LENGTH} caractères (ex : CE2100).`;
    }
    if (!/^[A-Z0-9]{6}$/.test(value)) {
      return "Le code n'accepte que des lettres et des chiffres, sans espace.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const codeTrim = code.trim();
    const nomTrim = nom.trim();
    if (codeErrorMessage(codeTrim)) {
      setCodeError(codeErrorMessage(codeTrim));
      return;
    }
    if (!nomTrim) {
      setNomError("Veuillez renseigner le nom du masque.");
      return;
    }
    if (withService && !serviceNom.trim()) {
      setServiceError("Indiquez le nom du service appelé, ou décochez la case.");
      return;
    }

    setLoading(true);
    setSubmitError("");
    try {
      await onSubmit({
        code: codeTrim,
        nom: nomTrim,
        description: description.trim() || undefined,
        image_key: imageKey,
        service: withService
          ? {
              nom: serviceNom.trim(),
              methode_http: methode,
              url: url.trim() || undefined,
              input_desc: inputDesc.trim() || undefined,
              output_desc: outputDesc.trim() || undefined,
            }
          : undefined,
      });
      // Les images sont désormais rattachées au masque : plus rien à nettoyer.
      pendingUploads.current = [];
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue.");
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
          <h2 className="text-xl font-bold text-[#0A2540] dark:text-white">Ajouter un masque</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Écran de l'étape, capture associée et service appelé
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <p className={sectionClass}>Informations du masque</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Code du masque</label>
              <input
                className={`${inputClass} ${codeError ? "border-red-500 focus:border-red-500" : ""}`}
                value={code}
                onChange={(e) => {
                  // Saisie forcée : majuscules et suppression des caractères
                  // qui ne peuvent pas faire partie d'un code de référence.
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  setCode(value);
                  if (codeError) setCodeError(codeErrorMessage(value));
                }}
                placeholder="CE2100"
              />
              {codeError && <p className="mt-1 text-xs text-red-500">{codeError}</p>}
            </div>

            <div>
              <label className={labelClass}>Nom du masque</label>
              <input
                className={`${inputClass} ${nomError ? "border-red-500 focus:border-red-500" : ""}`}
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (nomError) setNomError("");
                }}
                placeholder="Ex : Écran de saisie de la facture"
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
                placeholder="Ce que permet cet écran"
              />
            </div>

            <div>
              <label className={labelClass}>Capture du masque</label>

              {imageKey && (
                <div className="mb-2 flex items-start gap-3">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Aperçu du masque"
                      className="max-h-40 rounded-lg border border-gray-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-400">
                      Chargement...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Retirer
                  </button>
                </div>
              )}

              {/* Le champ fichier natif affiche « Aucun fichier sélectionné »
                  dans la locale du navigateur : il est masqué derrière un
                  bouton pour garder la mise en page du formulaire. */}
              <div className="flex flex-wrap items-center gap-3">
                <label
                  className={`cursor-pointer rounded-full bg-[#004A86] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#003a68] ${
                    uploading ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {uploading ? "Envoi en cours..." : "Choisir une image"}
                  <input
                    type="file"
                    accept={ACCEPTED.join(",")}
                    disabled={uploading}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setFileName(file?.name ?? null);
                      handleFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {fileName && (
                  <span className="truncate font-mono text-xs text-gray-600 dark:text-gray-300">
                    {fileName}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                PNG, JPEG, GIF ou WEBP — 10 Mo maximum.
              </p>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
          </div>

          <p className={`${sectionClass} mt-7`}>Service appelé par le masque</p>

          <label className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={withService}
              onChange={(e) => {
                setWithService(e.target.checked);
                if (serviceError) setServiceError("");
              }}
              className="h-4 w-4 rounded border-gray-300 text-[#004A86] focus:ring-[#004A86]"
            />
            Ce masque appelle un service
          </label>

          {withService && (
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Nom du service</label>
                <input
                  className={`${inputClass} ${serviceError ? "border-red-500 focus:border-red-500" : ""}`}
                  value={serviceNom}
                  onChange={(e) => setServiceNom(e.target.value)}
                  placeholder="Ex : CreerFacture"
                />
                {serviceError && <p className="mt-1 text-xs text-red-500">{serviceError}</p>}
              </div>

              <div className="grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <label className={labelClass}>Méthode</label>
                  <select
                    className={inputClass}
                    value={methode}
                    onChange={(e) => setMethode(e.target.value)}
                  >
                    {METHODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>URL</label>
                  <input
                    className={inputClass}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/api/factures"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Données en entrée</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={inputDesc}
                  onChange={(e) => setInputDesc(e.target.value)}
                  placeholder="Paramètres envoyés au service"
                />
              </div>

              <div>
                <label className={labelClass}>Données en sortie</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={outputDesc}
                  onChange={(e) => setOutputDesc(e.target.value)}
                  placeholder="Ce que le service renvoie"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
            {submitError && <p className="w-full text-xs text-red-500">{submitError}</p>}
            <button type="button" onClick={handleCancel} className={`${btnRedOutline} w-32`}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className={`${btnTealOutline} w-40`}
            >
              {loading ? "Création..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
