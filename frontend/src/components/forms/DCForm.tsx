import { useState, useEffect } from 'react';
import { Masque, Service, Procedure, Table, Attribut } from '../../types';
import { masquesApi } from '../../api/masques';
import { servicesApi } from '../../api/services';
import { proceduresApi } from '../../api/procedures';
import { tablesApi } from '../../api/tables';

interface DCFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface SelectedItem {
  id: number;
  action: string;
  details: string;
}

export function DCForm({ onSubmit, onCancel }: DCFormProps) {
  const [numero, setNumero] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');

  // Données disponibles
  const [masques, setMasques] = useState<Masque[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [attributs] = useState<Attribut[]>([]);

  // Éléments sélectionnés
  const [selectedMasques, setSelectedMasques] = useState<SelectedItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedItem[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedItem[]>([]);
  const [selectedTables, setSelectedTables] = useState<SelectedItem[]>([]);
  const [selectedAttributs, setSelectedAttributs] = useState<SelectedItem[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [masquesData, servicesData, proceduresData, tablesData] = await Promise.all([
          masquesApi.list(),
          servicesApi.list(),
          proceduresApi.list(),
          tablesApi.list(),
        ]);
        setMasques(masquesData);
        setServices(servicesData);
        setProcedures(proceduresData);
        setTables(tablesData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    fetchData();
  }, []);

  const handleSelectItem = (
    type: 'masques' | 'services' | 'procedures' | 'tables' | 'attributs',
    id: number
  ) => {
    const setter = {
      masques: setSelectedMasques,
      services: setSelectedServices,
      procedures: setSelectedProcedures,
      tables: setSelectedTables,
      attributs: setSelectedAttributs,
    }[type];

    setter((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, action: 'Modifié', details: '' }];
    });
  };

  const handleUpdateDetails = (
    type: 'masques' | 'services' | 'procedures' | 'tables' | 'attributs',
    id: number,
    details: string
  ) => {
    const setter = {
      masques: setSelectedMasques,
      services: setSelectedServices,
      procedures: setSelectedProcedures,
      tables: setSelectedTables,
      attributs: setSelectedAttributs,
    }[type];

    setter((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, details } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        numero,
        titre,
        description: description || undefined,
        masques: selectedMasques.map((m) => ({
          masque_id: m.id,
          action: m.action,
          details: m.details || undefined,
        })),
        services: selectedServices.map((s) => ({
          service_id: s.id,
          action: s.action,
          details: s.details || undefined,
        })),
        procedures: selectedProcedures.map((p) => ({
          procedure_id: p.id,
          action: p.action,
          details: p.details || undefined,
        })),
        tables: selectedTables.map((t) => ({
          table_id: t.id,
          action: t.action,
          details: t.details || undefined,
        })),
        attributs: selectedAttributs.map((a) => ({
          attribut_id: a.id,
          action: a.action,
          details: a.details || undefined,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations générales */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Informations générales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro *
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: DC-1500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: Ajouter type client"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Description de la demande de changement..."
          />
        </div>
      </div>

      {/* Masques */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Masques impactés</h3>
        <div className="space-y-2">
          {masques.map((masque) => (
            <div key={masque.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedMasques.some((m) => m.id === masque.id)}
                onChange={() => handleSelectItem('masques', masque.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">{masque.code}</span> — {masque.nom}
                {selectedMasques.some((m) => m.id === masque.id) && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedMasques.find((m) => m.id === masque.id)?.action || 'Modifié'}
                      onChange={(e) => {
                        const newSelected = selectedMasques.map((m) =>
                          m.id === masque.id ? { ...m, action: e.target.value } : m
                        );
                        setSelectedMasques(newSelected);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="Modifié">Modifié</option>
                      <option value="Ajouté">Ajouté</option>
                      <option value="Supprimé">Supprimé</option>
                    </select>
                    <input
                      type="text"
                      value={selectedMasques.find((m) => m.id === masque.id)?.details || ''}
                      onChange={(e) => handleUpdateDetails('masques', masque.id, e.target.value)}
                      placeholder="Détails du changement..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Services impactés</h3>
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedServices.some((s) => s.id === service.id)}
                onChange={() => handleSelectItem('services', service.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">{service.nom}</span>
                {selectedServices.some((s) => s.id === service.id) && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedServices.find((s) => s.id === service.id)?.action || 'Modifié'}
                      onChange={(e) => {
                        const newSelected = selectedServices.map((s) =>
                          s.id === service.id ? { ...s, action: e.target.value } : s
                        );
                        setSelectedServices(newSelected);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="Modifié">Modifié</option>
                      <option value="Ajouté">Ajouté</option>
                      <option value="Supprimé">Supprimé</option>
                    </select>
                    <input
                      type="text"
                      value={selectedServices.find((s) => s.id === service.id)?.details || ''}
                      onChange={(e) => handleUpdateDetails('services', service.id, e.target.value)}
                      placeholder="Détails du changement..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Procédures */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Procédures stockées</h3>
        <div className="space-y-2">
          {procedures.map((procedure) => (
            <div key={procedure.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedProcedures.some((p) => p.id === procedure.id)}
                onChange={() => handleSelectItem('procedures', procedure.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">{procedure.nom}</span>
                {selectedProcedures.some((p) => p.id === procedure.id) && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedProcedures.find((p) => p.id === procedure.id)?.action || 'Modifié'}
                      onChange={(e) => {
                        const newSelected = selectedProcedures.map((p) =>
                          p.id === procedure.id ? { ...p, action: e.target.value } : p
                        );
                        setSelectedProcedures(newSelected);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="Modifiée">Modifiée</option>
                      <option value="Ajoutée">Ajoutée</option>
                      <option value="Supprimée">Supprimée</option>
                    </select>
                    <input
                      type="text"
                      value={selectedProcedures.find((p) => p.id === procedure.id)?.details || ''}
                      onChange={(e) => handleUpdateDetails('procedures', procedure.id, e.target.value)}
                      placeholder="Détails du changement..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tables */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Tables impactées</h3>
        <div className="space-y-2">
          {tables.map((table) => (
            <div key={table.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedTables.some((t) => t.id === table.id)}
                onChange={() => handleSelectItem('tables', table.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">{table.nom}</span>
                {selectedTables.some((t) => t.id === table.id) && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedTables.find((t) => t.id === table.id)?.action || 'Modifiée'}
                      onChange={(e) => {
                        const newSelected = selectedTables.map((t) =>
                          t.id === table.id ? { ...t, action: e.target.value } : t
                        );
                        setSelectedTables(newSelected);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="Modifiée">Modifiée</option>
                      <option value="Ajoutée">Ajoutée</option>
                      <option value="Supprimée">Supprimée</option>
                    </select>
                    <input
                      type="text"
                      value={selectedTables.find((t) => t.id === table.id)?.details || ''}
                      onChange={(e) => handleUpdateDetails('tables', table.id, e.target.value)}
                      placeholder="Détails du changement..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attributs */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium mb-4">Attributs impactés</h3>
        <div className="space-y-2">
          {attributs.map((attribut) => (
            <div key={attribut.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedAttributs.some((a) => a.id === attribut.id)}
                onChange={() => handleSelectItem('attributs', attribut.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">{attribut.nom}</span> ({attribut.type})
                {selectedAttributs.some((a) => a.id === attribut.id) && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedAttributs.find((a) => a.id === attribut.id)?.action || 'Modifié'}
                      onChange={(e) => {
                        const newSelected = selectedAttributs.map((a) =>
                          a.id === attribut.id ? { ...a, action: e.target.value } : a
                        );
                        setSelectedAttributs(newSelected);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="Modifié">Modifié</option>
                      <option value="Ajouté">Ajouté</option>
                      <option value="Supprimé">Supprimé</option>
                    </select>
                    <input
                      type="text"
                      value={selectedAttributs.find((a) => a.id === attribut.id)?.details || ''}
                      onChange={(e) => handleUpdateDetails('attributs', attribut.id, e.target.value)}
                      placeholder="Détails du changement..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons */}
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
          {loading ? 'Enregistrement...' : 'Enregistrer la DC'}
        </button>
      </div>
    </form>
  );
}
