import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Domaine, Process } from '../types';
import { domainesApi } from '../api/domaines';
import { Breadcrumb } from '../components/Breadcrumb';
import { Modal } from '../components/Modal';
import { ProcessForm } from '../components/forms/ProcessForm';

export function DomaineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [domaine, setDomaine] = useState<Domaine | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [domaineData, processesData] = await Promise.all([
        domainesApi.get(parseInt(id)),
        domainesApi.listProcesses(parseInt(id)),
      ]);
      setDomaine(domaineData);
      setProcesses(processesData);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateProcess = async (data: { nom: string; description?: string }) => {
    if (!id) return;
    await domainesApi.listProcesses(parseInt(id));
    await fetchData();
    setShowModal(false);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!domaine) {
    return <div className="text-center py-8">Domaine non trouvé</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Métiers', path: '/domaines' }, { label: domaine.nom }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{domaine.nom}</h1>
          {domaine.description && (
            <p className="text-gray-600 mt-1">{domaine.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Ajouter un process
        </button>
      </div>

      <div className="space-y-4">
        {processes.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow text-gray-500">
            Aucun process pour ce domaine
          </div>
        ) : (
          processes.map((process) => (
            <Link
              key={process.id}
              to={`/processes/${process.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold mb-2">{process.nom}</h2>
              <p className="text-gray-600 text-sm mb-4">
                {process.description || 'Pas de description'}
              </p>
              <div className="text-sm text-gray-500">
                {process.etape_count || 0} étapes
              </div>
            </Link>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau process">
        <ProcessForm
          onSubmit={handleCreateProcess}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
