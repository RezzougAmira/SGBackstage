import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stats, DC, HISTORIQUE_ACTIONS, HISTORIQUE_ENTITES } from '../types';
import { searchApi } from '../api/search';
import { dcApi } from '../api/dc';
import { DashboardSkeleton } from '../components/ui/pageSkeletons';

const STAT_CARDS: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'domaines', label: 'Domaines', color: 'blue' },
  { key: 'processes', label: 'Processus', color: 'green' },
  { key: 'etapes', label: 'Étapes', color: 'purple' },
  { key: 'masques', label: 'Masques', color: 'orange' },
  { key: 'fonctionnalites', label: 'Fonctionnalités', color: 'pink' },
  { key: 'services', label: 'Services', color: 'red' },
  { key: 'procedures', label: 'Procédures', color: 'cyan' },
  { key: 'tables', label: 'Tables', color: 'teal' },
  { key: 'attributs', label: 'Attributs', color: 'indigo' },
  { key: 'dcs', label: 'Demandes de changement', color: 'amber' },
  { key: 'archives', label: 'Archives', color: 'slate' },
  { key: 'utilisateurs', label: 'Utilisateurs', color: 'lime' },
];

const ACTION_COLORS: Record<string, string> = {
  creation: 'bg-teal-100 text-teal-800',
  modification: 'bg-[#e6e8f5] text-[#060923]',
  suppression: 'bg-red-100 text-red-800',
  rattachement: 'bg-blue-100 text-blue-800',
  detachement: 'bg-amber-100 text-amber-800',
  reorder: 'bg-purple-100 text-purple-800',
};

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

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link
          to="/historique"
          className="inline-flex h-[42px] items-center rounded-xl border border-[#004a86]/20 px-5 text-sm font-medium text-[#004a86] transition hover:bg-[#004a86]/5"
        >
          Voir le journal des changements →
        </Link>
      </div>

      {/* Compteurs */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, color }) => (
          <StatCard key={key} label={label} value={stats[key] as number} color={color} />
        ))}
      </div>

      {/* Activité des 14 derniers jours — barres CSS natives */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activité des 14 derniers jours</h2>
          <span className="text-sm text-gray-500">
            {stats.evenements} événement{stats.evenements > 1 ? 's' : ''} au total
          </span>
        </div>
        <ActivityBars activite={stats.activite_14j} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Répartition par type d'entité */}
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <h2 className="mb-4 text-lg font-semibold">Répartition par type d'entité</h2>
          {stats.repartition_par_type.length === 0 ? (
            <EmptyHint>Pas encore d'événement journalisé.</EmptyHint>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.repartition_par_type.slice(0, 8).map((ligne) => (
                <li key={ligne.type_entite}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {HISTORIQUE_ENTITES[ligne.type_entite as keyof typeof HISTORIQUE_ENTITES] ?? ligne.type_entite}
                    </span>
                    <span className="text-gray-500">{ligne.total} événement{ligne.total > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-[#004a86]"
                      style={{ width: `${pct(ligne.total, stats.evenements)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top contributeurs */}
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <h2 className="mb-4 text-lg font-semibold">Top contributeurs</h2>
          {stats.top_contributeurs.length === 0 ? (
            <EmptyHint>Personne n'a encore contribué.</EmptyHint>
          ) : (
            <ol className="flex flex-col gap-3">
              {stats.top_contributeurs.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      i === 0 ? 'bg-[#004a86] text-white' : 'bg-[#e6e8f5] text-[#060923]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-gray-800">{c.name}</span>
                  <span className="text-sm text-gray-500">
                    {c.nb} événement{c.nb > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Derniers événements */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derniers événements</h2>
          <Link to="/historique" className="text-sm font-medium text-[#004a86] hover:underline">
            Tout le journal →
          </Link>
        </div>
        <div className="divide-y">
          {stats.evenements_recents.length === 0 ? (
            <div className="py-6 text-center text-gray-500">Aucun événement pour l'instant.</div>
          ) : (
            stats.evenements_recents.map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[evt.action] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {HISTORIQUE_ACTIONS[evt.action] ?? evt.action}
                </span>
                <span className="flex-1 truncate text-sm text-gray-800">
                  {evt.nom_entite ?? '—'}
                </span>
                <span className="hidden text-xs text-gray-500 sm:inline">
                  {HISTORIQUE_ENTITES[evt.type_entite] ?? evt.type_entite}
                </span>
                <span className="text-xs text-gray-400">
                  {evt.utilisateur?.name ?? 'Inconnu'} · {formatDate(evt.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* DC récentes */}
      <section className="rounded-2xl bg-white shadow-sm dark:bg-[#131313]">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Demandes de changement récentes</h2>
        </div>
        <div className="divide-y">
          {recentDCs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">Aucune DC récente</div>
          ) : (
            recentDCs.map((dc) => (
              <Link
                key={dc.id}
                to={`/dcs/${dc.id}`}
                className="block px-6 py-4 transition hover:bg-gray-50"
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
      </section>
    </div>
  );
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(3, Math.round((part / total) * 100));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Barres d'activité 14 jours : hauteur proportionnelle au total du jour. */
function ActivityBars({ activite }: { activite: { date: string; total: number }[] }) {
  const max = Math.max(1, ...activite.map((j) => j.total));
  return (
    <div className="flex items-end gap-2">
      {activite.map((jour) => (
        <div key={jour.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500">{jour.total || ''}</span>
          <div
            className="w-full rounded-t bg-[#004a86]/80 transition-all"
            style={{ height: `${Math.max(4, (jour.total / max) * 120)}px` }}
            title={`${jour.date} : ${jour.total} événement(s)`}
          />
          <span className="text-[10px] text-gray-400">
            {new Date(jour.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-gray-500">{children}</div>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600',
    red: 'bg-red-50 text-red-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    teal: 'bg-teal-50 text-teal-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
    lime: 'bg-lime-50 text-lime-600',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}