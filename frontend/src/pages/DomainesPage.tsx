import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Domaine } from '../types';
import { domainesApi } from '../api/domaines';
import { Breadcrumb } from '../components/Breadcrumb';
import { Modal } from '../components/Modal';
import { DomaineForm } from '../components/forms/DomaineForm';

export function DomainesPage() {
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDomaines = async () => {
    try {
      const data = await domainesApi.list();
      setDomaines(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomaines();
  }, []);

  const handleCreate = async (data: { nom: string; description?: string }) => {
    await domainesApi.create(data);
    await fetchDomaines();
    setShowModal(false);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Métiers' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Domaines</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Ajouter un domaine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {domaines.map((domaine) => (
          <Link
            key={domaine.id}
            to={`/domaines/${domaine.id}`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">{domaine.nom}</h2>
            <p className="text-gray-600 text-sm mb-4">
              {domaine.description || 'Pas de description'}
            </p>
            <div className="text-sm text-gray-500">
              {domaine.process_count || 0} process
            </div>
          </Link>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau domaine">
        <DomaineForm
          onSubmit={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
