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
          placeholder="ex: CustomerService"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Méthode HTTP
          </label>
          <select
            value={methodeHttp}
            onChange={(e) => setMethodeHttp(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ex: /api/customers"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Input
          </label>
          <input
            type="text"
            value={inputDesc}
            onChange={(e) => setInputDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ex: ID client"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Output
          </label>
          <input
            type="text"
            value={outputDesc}
            onChange={(e) => setOutputDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ex: Informations client"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contrôleur
        </label>
        <input
          type="text"
          value={controleur}
          onChange={(e) => setControleur(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ex: CustomerController"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="modifie_bdd"
          checked={modifieBdd}
          onChange={(e) => setModifieBdd(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="modifie_bdd" className="ml-2 text-sm text-gray-700">
          Ce service modifie la base de données
        </label>
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
