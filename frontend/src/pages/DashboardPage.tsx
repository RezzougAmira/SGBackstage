import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stats } from '../types';
import { searchApi } from '../api/search';
import { dcApi } from '../api/dc';
import { DC } from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDCs, setRecentDCs] = useState<DC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, dcsData] = await Promise.all([
          searchApi.getStats(),
          dcApi.list(),
        ]);
        setStats(statsData);
        setRecentDCs(dcsData.slice(0, 5));
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

      {/* Compteurs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Domaines" value={stats.domaines} color="blue" />
          <StatCard label="Process" value={stats.processes} color="green" />
          <StatCard label="Étapes" value={stats.etapes} color="purple" />
          <StatCard label="Masques" value={stats.masques} color="orange" />
          <StatCard label="Services" value={stats.services} color="red" />
          <StatCard label="Tables" value={stats.tables} color="teal" />
          <StatCard label="DC" value={stats.dcs} color="indigo" />
        </div>
      )}

      {/* Activité récente */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Activité récente</h2>
        </div>
        <div className="divide-y">
          {recentDCs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Aucune activité récente
            </div>
          ) : (
            recentDCs.map((dc) => (
              <Link
                key={dc.id}
                to={`/dcs/${dc.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-blue-600">{dc.numero}</span>
                    <span className="ml-3 text-gray-800">{dc.titre}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(dc.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
