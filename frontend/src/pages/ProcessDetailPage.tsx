import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Process, Etape, Domaine } from '../types';
import { processesApi } from '../api/processes';
import { domainesApi } from '../api/domaines';
import { Breadcrumb } from '../components/Breadcrumb';
import { ProcessSchema } from '../components/ProcessSchema';
import { Modal } from '../components/Modal';
import { EtapeForm } from '../components/forms/EtapeForm';

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [process, setProcess] = useState<Process | null>(null);
  const [domaine, setDomaine] = useState<Domaine | null>(null);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const etapesData = await processesApi.listEtapes(parseInt(id));
      setEtapes(etapesData);

      // Récupérer le process (on devrait avoir une API pour ça)
      // Pour l'instant, on utilise la liste des étapes pour déduire le process
      if (etapesData.length > 0) {
        const processId = etapesData[0].process_id;
        // On pourrait ajouter un endpoint GET /api/processes/:id
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateEtape = async (data: { nom: string; description?: string; ordre: number }) => {
    if (!id) return;
    await processesApi.listEtapes(parseInt(id));
    await fetchData();
    setShowModal(false);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Métiers', path: '/domaines' }, { label: 'Process' }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Process</h1>
          {process?.description && (
            <p className="text-gray-600 mt-1">{process.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Ajouter une étape
        </button>
      </div>

      {/* Schéma du process */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Schéma du process</h2>
        {id && <ProcessSchema processId={parseInt(id)} />}
      </div>

      {/* Liste des étapes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Étapes</h2>
        </div>
        <div className="divide-y">
          {etapes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Aucune étape définie
            </div>
          ) : (
            etapes.map((etape) => (
              <div key={etape.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Étape {etape.ordre}
                    </span>
                    <h3 className="text-lg font-medium">{etape.nom}</h3>
                    {etape.description && (
                      <p className="text-gray-600 text-sm mt-1">{etape.description}</p>
                    )}
                  </div>
                  <Link
                    to={`/etapes/${etape.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Voir →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle étape">
        <EtapeForm
          onSubmit={handleCreateEtape}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
