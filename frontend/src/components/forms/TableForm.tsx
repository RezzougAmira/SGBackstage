import { useState } from 'react';

interface TableFormProps {
  initialData?: { nom: string; base_donnees: string; description: string };
  onSubmit: (data: { nom: string; base_donnees?: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

export function TableForm({ initialData, onSubmit, onCancel }: TableFormProps) {
  const [nom, setNom] = useState(initialData?.nom || '');
  const [baseDonnees, setBaseDonnees] = useState(initialData?.base_donnees || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        nom,
        base_donnees: baseDonnees || undefined,
        description: description || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="ex: CUSTOMER"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base de données
        </label>
        <input
          type="text"
          value={baseDonnees}
          onChange={(e) => setBaseDonnees(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ex: SGB_MAIN"
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
          placeholder="Description de la table..."
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
