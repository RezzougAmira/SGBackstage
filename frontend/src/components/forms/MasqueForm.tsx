import { useRef, useState } from 'react';
import { uploadApi } from '../../api/upload';
import { useProtectedImage } from '../../hooks/useProtectedImage';

interface MasqueFormProps {
  initialData?: { code: string; nom: string; description?: string; image_key?: string | null };
  onSubmit: (data: { code: string; nom: string; description?: string; image_key: string | null }) => Promise<void>;
  onCancel: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export function MasqueForm({ initialData, onSubmit, onCancel }: MasqueFormProps) {
  const [code, setCode] = useState(initialData?.code || '');
  const [nom, setNom] = useState(initialData?.nom || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageKey, setImageKey] = useState<string | null>(initialData?.image_key ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError('Format non accepté. Utilisez PNG, JPEG, GIF ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Image trop volumineuse. Maximum : 10 Mo.');
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

  const handleRemove = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ code, nom, description: description || undefined, image_key: imageKey });
      // Les images sont désormais rattachées au masque : plus rien à nettoyer.
      pendingUploads.current = [];
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Code *
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ex: CE2100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom *
        </label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ex: Écran saisie client"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Description du masque..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image du masque
        </label>

        {imageKey && (
          <div className="mb-2 flex items-start gap-3">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Aperçu du masque"
                className="max-h-40 rounded-lg border border-gray-300 object-contain"
              />
            ) : (
              <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-gray-300 text-xs text-gray-400">
                Chargement...
              </div>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              Retirer
            </button>
          </div>
        )}

        <input
          type="file"
          accept={ACCEPTED.join(',')}
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50"
        />

        <p className="mt-1 text-xs text-gray-500">
          {uploading ? 'Envoi en cours...' : 'PNG, JPEG, GIF ou WEBP — 10 Mo maximum.'}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
