import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Etape } from '../types';
import { processesApi } from '../api/processes';

interface ProcessSchemaProps {
  processId: number;
}

export function ProcessSchema({ processId }: ProcessSchemaProps) {
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEtapes = async () => {
      try {
        const data = await processesApi.listEtapes(processId);
        setEtapes(data);
      } catch (error) {
        console.error('Erreur lors du chargement des étapes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEtapes();
  }, [processId]);

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  if (etapes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune étape définie pour ce processus
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-4 py-4 overflow-x-auto">
      {etapes.map((etape, index) => (
        <div key={etape.id} className="flex items-center">
          <Link
            to={`/etapes/${etape.id}`}
            className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition text-center min-w-[150px]"
          >
            <div className="text-sm font-medium text-gray-800">{etape.nom}</div>
            <div className="text-xs text-gray-500 mt-1">Étape {etape.ordre}</div>
          </Link>
          {index < etapes.length - 1 && (
            <div className="flex-shrink-0 mx-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
