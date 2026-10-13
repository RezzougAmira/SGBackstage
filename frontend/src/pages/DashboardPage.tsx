import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stats, HISTORIQUE_ACTIONS, HISTORIQUE_ENTITES } from '../types';
import { searchApi } from '../api/search';
import { DashboardSkeleton } from '../components/ui/pageSkeletons';

type IconProps = { className?: string };

const DomainIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
    <path d="M13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
    <path d="M3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Z" />
    <path d="M13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

const MasqueIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
  </svg>
);

const FonctionIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
  </svg>
);

const ServiceIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const STAT_CARDS: { key: keyof Stats; label: string; icon: (p: IconProps) => JSX.Element; gradient: string; to?: string }[] = [
  { key: 'domaines', label: 'Domaines', icon: DomainIcon, gradient: 'from-blue-500 to-blue-700', to: '/domaines' },
  { key: 'masques', label: 'Masques', icon: MasqueIcon, gradient: 'from-orange-400 to-amber-600', to: '/masques' },
  { key: 'fonctionnalites', label: 'Fonctionnalités', icon: FonctionIcon, gradient: 'from-pink-500 to-rose-600' },
  { key: 'services', label: 'Services', icon: ServiceIcon, gradient: 'from-red-500 to-rose-700', to: '/services' },
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await searchApi.getStats();
        setStats(statsData);
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
      </div>

      {/* Compteurs */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon, gradient, to }) => (
          <StatCard key={key} label={label} value={stats[key] as number} icon={icon} gradient={gradient} to={to} />
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

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  to,
}: {
  label: string;
  value: number;
  icon: (p: IconProps) => JSX.Element;
  gradient: string;
  to?: string;
}) {
  const card = (
    <div className="group relative overflow-hidden rounded-2xl border border-[#e6e8f5] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#131313]">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 transition-transform duration-200 group-hover:scale-125`} />
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
        <Icon />
      </div>
      <div className="mt-4 text-2xl font-bold leading-none text-[#0c1d31] dark:text-white">{value}</div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-[#525f6d] dark:text-white/50">
        {label}
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}