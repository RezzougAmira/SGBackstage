import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchResults } from '../types';
import { searchApi } from '../api/search';
import { Breadcrumb } from '../components/Breadcrumb';
import { SearchIdleHint, SearchSkeleton } from '../components/ui/pageSkeletons';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchApi.search(query);
      setResults(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Recherche' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recherche globale</h1>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un masque, service, table, DC..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </form>

      {loading && <SearchSkeleton />}

      {!loading && !results && <SearchIdleHint />}

      {!loading && results && (
        <div className="space-y-6">
          {results.masques.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Masques</h2>
              <div className="space-y-2">
                {results.masques.map((m) => (
                  <Link
                    key={m.id}
                    to={`/masques/${m.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-blue-600">{m.code}</span> — {m.nom}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.services.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Services</h2>
              <div className="space-y-2">
                {results.services.map((s) => (
                  <Link
                    key={s.id}
                    to={`/services/${s.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-blue-600">{s.nom}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.tables.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Tables</h2>
              <div className="space-y-2">
                {results.tables.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg">
                    <span className="font-medium text-blue-600">{t.nom}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.dcs.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Demandes de changement</h2>
              <div className="space-y-2">
                {results.dcs.map((dc) => (
                  <Link
                    key={dc.id}
                    to={`/dcs/${dc.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-blue-600">{dc.numero}</span> — {dc.titre}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.masques.length === 0 && results.services.length === 0 && results.tables.length === 0 && results.dcs.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Aucun résultat pour "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
