import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Etape, Masque } from '../types';
import { Breadcrumb } from '../components/Breadcrumb';

export function EtapeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [etape, setEtape] = useState<Etape | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEtape = async () => {
      if (!id) return;
      try {
        // On devrait avoir un endpoint GET /api/etapes/:id
        // Pour l'instant, on simule
        setLoading(false);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    fetchEtape();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Métiers', path: '/domaines' }, { label: 'Étape' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Détail de l'étape</h1>
        <p className="text-gray-600 mt-1">
          consultation des informations de l'étape et des masques associés
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Informations</h2>
          <p className="text-gray-600">
            Cette page affichera les détails de l'étape, sa description, et la liste des masques associés.
          </p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Masques associés</h2>
          <p className="text-gray-500">
            Les masques liés à cette étape seront affichés ici.
          </p>
        </div>
      </div>
    </div>
  );
}
