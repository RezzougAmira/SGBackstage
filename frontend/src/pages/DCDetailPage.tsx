import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DCDetail } from '../types';
import { dcApi } from '../api/dc';
import { Breadcrumb } from '../components/Breadcrumb';

export function DCDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dc, setDC] = useState<DCDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDC = async () => {
      if (!id) return;
      try {
        const data = await dcApi.get(parseInt(id));
        setDC(data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDC();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!dc) {
    return <div className="text-center py-8">DC non trouvée</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Demandes de changement', path: '/dcs' }, { label: dc.numero }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{dc.numero} — {dc.titre}</h1>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
          <span>Date : {new Date(dc.date).toLocaleDateString('fr-FR')}</span>
          {dc.archive_id && <span>Archive : {dc.archive_id}</span>}
        </div>
      </div>

      {dc.description && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-600">{dc.description}</p>
        </div>
      )}

      {/* Impact Explorer */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Impact technique</h2>
        <div className="space-y-4">
          {dc.masques.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Masques</h3>
              <div className="pl-4 space-y-2">
                {dc.masques.map((m, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      m.action === 'Ajouté' ? 'bg-green-100 text-green-800' :
                      m.action === 'Modifié' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {m.action}
                    </span>
                    <div>
                      <span className="font-medium">{m.code}</span> — {m.nom}
                      {m.details && <p className="text-sm text-gray-500">{m.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dc.services.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Services</h3>
              <div className="pl-4 space-y-2">
                {dc.services.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      s.action === 'Ajouté' ? 'bg-green-100 text-green-800' :
                      s.action === 'Modifié' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {s.action}
                    </span>
                    <div>
                      <span className="font-medium">{s.nom}</span>
                      {s.details && <p className="text-sm text-gray-500">{s.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dc.procedures.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Procédures stockées</h3>
              <div className="pl-4 space-y-2">
                {dc.procedures.map((p, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      p.action === 'Ajoutée' ? 'bg-green-100 text-green-800' :
                      p.action === 'Modifiée' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {p.action}
                    </span>
                    <div>
                      <span className="font-medium">{p.nom}</span>
                      {p.details && <p className="text-sm text-gray-500">{p.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dc.tables.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Tables</h3>
              <div className="pl-4 space-y-2">
                {dc.tables.map((t, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      t.action === 'Ajoutée' ? 'bg-green-100 text-green-800' :
                      t.action === 'Modifiée' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {t.action}
                    </span>
                    <div>
                      <span className="font-medium">{t.nom}</span>
                      {t.details && <p className="text-sm text-gray-500">{t.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dc.attributs.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Attributs</h3>
              <div className="pl-4 space-y-2">
                {dc.attributs.map((a, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      a.action === 'Ajouté' ? 'bg-green-100 text-green-800' :
                      a.action === 'Modifié' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {a.action}
                    </span>
                    <div>
                      <span className="font-medium">{a.nom}</span>
                      {a.details && <p className="text-sm text-gray-500">{a.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dc.masques.length === 0 && dc.services.length === 0 && dc.procedures.length === 0 && dc.tables.length === 0 && dc.attributs.length === 0 && (
            <p className="text-gray-500">Aucun impact technique documenté</p>
          )}
        </div>
      </div>
    </div>
  );
}
