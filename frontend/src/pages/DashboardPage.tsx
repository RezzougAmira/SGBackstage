import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stats, HISTORIQUE_ACTIONS, HISTORIQUE_ENTITES, HistoriqueEvent } from '../types';
import { searchApi } from '../api/search';
import { DashboardSkeleton } from '../components/ui/pageSkeletons';
import { useAuth } from '../hooks/useAuth';

type IconProps = { className?: string };

const DomainIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
  </svg>
);

const MasqueIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
  </svg>
);

const EtapeIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h12M3 18h7" />
  </svg>
);

const ProcedureIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v.038c0 .21-.014.416-.04.618-.073.578-.966.86-1.431.5A2.25 2.25 0 0 0 5.25 9c0 1.036 1.007 1.875 2.25 1.875.278 0 .544-.04.793-.115.474-.145 1.12.16 1.176.652.03.246.046.497.046.75s-.016.504-.046.75c-.057.492-.702.797-1.176.652a2.289 2.289 0 0 0-.793-.115c-1.243 0-2.25.84-2.25 1.875 0 .369.128.713.349 1.003.215.283.401.604.401.959" />
    <path d="M18.75 15.75v2.25a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-1.5" />
  </svg>
);

const ServiceIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const STAT_CARDS: { key: keyof Stats; label: string; icon: (p: IconProps) => JSX.Element; to?: string }[] = [
  { key: 'domaines', label: 'Domaines', icon: DomainIcon, to: '/domaines' },
  { key: 'processes', label: 'Processus', icon: EtapeIcon },
  { key: 'masques', label: 'Masques', icon: MasqueIcon, to: '/masques' },
  { key: 'services', label: 'Services', icon: ServiceIcon, to: '/services' },
  { key: 'procedures', label: 'Procédures stockées', icon: ProcedureIcon, to: '/procedures' },
];

/** Couleurs des segments/points par type d'action (même famille que les badges). */
const ACTION_DOT_COLORS: Record<string, string> = {
  creation: 'bg-teal-500',
  modification: 'bg-[#004a86]',
  suppression: 'bg-red-500',
  rattachement: 'bg-blue-400',
  detachement: 'bg-amber-500',
  reorder: 'bg-purple-500',
};

/** Mêmes couleurs en hexadécimal : les attributs SVG n'acceptent pas les classes. */
const COULEURS_ACTIONS_HEX: Record<string, string> = {
  creation: '#14b8a6',
  modification: '#004a86',
  suppression: '#ef4444',
  rattachement: '#60a5fa',
  detachement: '#f59e0b',
  reorder: '#a855f7',
};

/** Ordre d'affichage des actions, du plus courant au plus rare. */
const ACTION_ORDER = [
  'creation',
  'modification',
  'suppression',
  'rattachement',
  'detachement',
  'reorder',
] as const;

/** Libellés français de la légende. */
const ACTION_LIBELLES: Record<string, string> = {
  creation: 'Ajouts',
  modification: 'Modifications',
  suppression: 'Suppressions',
  rattachement: 'Rattachements',
  detachement: 'Détachements',
  reorder: 'Réordonnancements',
};

/** Libellé au singulier (le pluriel par défaut étant celui de ACTION_LIBELLES). */
const ACTION_LIBELLES_SINGULIER: Record<string, string> = {
  creation: 'Ajout',
  modification: 'Modification',
  suppression: 'Suppression',
  rattachement: 'Rattachement',
  detachement: 'Détachement',
  reorder: 'Réordonnancement',
};

/**
 * Verbes à la 3e personne du singulier, pour lire une action comme une phrase :
 * « a modifié Jean Dupont ». Il manquait ce maillon : sans le verbe, la liste
 * laissait croire que « Jean Dupont » était l'auteur, alors qu'il est l'objet.
 */
const ACTION_VERBES: Record<string, string> = {
  creation: 'a créé',
  modification: 'a modifié',
  suppression: 'a supprimé',
  rattachement: 'a rattaché',
  detachement: 'a détaché',
  reorder: 'a réordonné',
};

/**
 * Libellé d'action accordé sur le nombre : « 1 suppression », « 3 suppressions ».
 * Évite le double pluriel (« suppressionss ») et le « 1 suppressions ».
 */
function libelleAction(action: string, nb: number): string {
  const mot = nb > 1 ? ACTION_LIBELLES[action] : ACTION_LIBELLES_SINGULIER[action];
  return (mot ?? ACTION_LIBELLES[action] ?? action).toLowerCase();
}

const MOIS_COURT = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « 7 octobre » — date lisible utilisée dans la liste des jours actifs. */
function dateLongue(iso: string): string {
  const [, mois, jour] = iso.slice(0, 10).split('-');
  return `${Number(jour)} ${MOIS_COURT[Number(mois) - 1]}`;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  // Calculés côté client — l'activité 14j renvoie déjà tout le détail.
  // ⚠️ Aucun pourcentage n'est calculé : la fenêtre de l'API est de 14 jours,
  // donc « la semaine précédente » n'est jamais complète et le taux serait faux.
  const joursActifs = stats.activite_14j.filter((j) => j.total > 0).reverse();

  // Idée 1 — Mon activité : les événements récents dont l'utilisateur
  // connecté est l'auteur (l'API renvoie désormais utilisateur_id).
  const monActivite = stats.evenements_recents
    .filter((evt) => user?.id != null && evt.utilisateur?.id === user.id)
    .slice(0, 6);

  const nomComplet = user?.name?.trim() ?? '';
  const dateDuJour = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0c1d31] dark:text-white">
          Bonjour {nomComplet || 'à vous'}
        </h1>
        <p className="mt-1 text-sm text-[#0c1d31]/70 dark:text-white/60">
          Bienvenue dans votre espace référentiel — {dateDuJour}
        </p>
      </div>

      {/* Compteurs */}
      <div className="mb-4 grid grid-cols-2 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS.map(({ key, label, icon, to }) => (
          <StatCard key={key} label={label} value={stats[key] as number} icon={icon} to={to} />
        ))}
      </div>

      {/* Activité des 14 derniers jours — courbe de tendance + jours actifs */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Activité des 14 derniers jours</h2>
          <span className="text-sm text-gray-500">
            {stats.evenements} événement{stats.evenements > 1 ? 's' : ''} réparti
            {stats.evenements > 1 ? 's' : ''} sur {joursActifs.length} jour
            {joursActifs.length > 1 ? 's' : ''}
          </span>
        </div>

        <Tendance activite={stats.activite_14j} />

        {joursActifs.length > 0 && (
          <ul className="mt-4 divide-y divide-[#e6e8f5] dark:divide-white/10">
            {joursActifs.map((jour) => (
              <li key={jour.date}>
                <Link
                  to={`/historique?depuis=${jour.date}T00:00:00&jusqua=${jour.date}T23:59:59`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 text-sm hover:bg-[#e6e8f5] dark:hover:bg-white/5"
                >
                  <span className="font-semibold capitalize text-[#0c1d31] dark:text-white">
                    {dateLongue(jour.date)}
                  </span>
                  <span className="text-gray-500">
                    {jour.total} événement{jour.total > 1 ? 's' : ''}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 sm:ml-auto">
                    {ACTION_ORDER.filter((a) => jour[a] > 0).map((a) => (
                      <span key={a} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${ACTION_DOT_COLORS[a]}`} />
                        {jour[a]} {libelleAction(a, jour[a])}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Répartition par type d'entité — ce qui a le plus bougé */}
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <h2 className="text-lg font-semibold">Ce qui a le plus bougé</h2>
          <p className="mb-4 mt-1 text-xs text-[#525f6d] dark:text-white/50">
            Nombre d'actions enregistrées sur chaque type d'objet.
          </p>
          {stats.repartition_par_type.length === 0 ? (
            <EmptyHint>Pas encore d'action journalisée.</EmptyHint>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.repartition_par_type.slice(0, 8).map((ligne) => (
                <li key={ligne.type_entite}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {HISTORIQUE_ENTITES[ligne.type_entite as keyof typeof HISTORIQUE_ENTITES] ?? ligne.type_entite}
                    </span>
                    <span className="text-gray-500">
                      {ligne.total} action{ligne.total > 1 ? 's' : ''}
                      <span className="ml-1.5 text-gray-400">
                        ({arrondiPct(ligne.total, stats.evenements)} %)
                      </span>
                    </span>
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

        {/* Top contributeurs — histogramme */}
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
          <h2 className="mb-4 text-lg font-semibold">Top contributeurs</h2>
          {stats.top_contributeurs.length === 0 ? (
            <EmptyHint>Personne n'a encore contribué.</EmptyHint>
          ) : (
            <TopContributeurs contributeurs={stats.top_contributeurs} />
          )}
        </section>

        {/* Répartition par type d'action — graphique circulaire */}
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313] lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold">Types d'action</h2>
          <p className="mb-4 mt-1 text-xs text-[#525f6d] dark:text-white/50">
            Part de chaque action (ajout, modification, suppression…) dans le total.
          </p>
          <RepartitionActions repartition={stats.repartition_par_type} total={stats.evenements} />
        </section>
      </div>

      {/* Mon activité : uniquement les événements de l'utilisateur connecté,
          filtrés côté client depuis les événements récents. */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mes dernières actions</h2>
          {monActivite.length > 0 && (
            <Link
              to={`/historique?utilisateur_id=${user?.id ?? ''}`}
              className="text-sm font-medium text-[#004a86] hover:underline"
            >
              Tout voir →
            </Link>
          )}
        </div>

        {monActivite.length === 0 ? (
          <EmptyHint>Vous n'avez rien modifié récemment.</EmptyHint>
        ) : (
          <ul className="divide-y divide-[#e6e8f5] dark:divide-white/10">
            {monActivite.map((evt) => (
              <li key={evt.id}>
                <LigneEvenement evt={evt} montrerAuteur={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Une ligne d'événement : pastille colorée, nom, action, date. */
function LigneEvenement({
  evt,
  montrerAuteur = true,
}: {
  evt: HistoriqueEvent;
  montrerAuteur?: boolean;
}) {
  return (
    <Link
      to={
        evt.entite_id != null
          ? `/historique?type_entite=${evt.type_entite}&entite_id=${evt.entite_id}`
          : '/historique'
      }
      className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-[#f6f8fa] dark:hover:bg-white/5"
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${ACTION_DOT_COLORS[evt.action as string] ?? 'bg-gray-400'}`}
        title={HISTORIQUE_ACTIONS[evt.action as keyof typeof HISTORIQUE_ACTIONS] ?? evt.action}
      />
      <span className="hidden shrink-0 text-xs font-medium text-[#525f6d] dark:text-white/50 sm:inline">
        {ACTION_VERBES[evt.action as string] ?? HISTORIQUE_ACTIONS[evt.action as keyof typeof HISTORIQUE_ACTIONS] ?? evt.action}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0c1d31] dark:text-white">
        {evt.nom_entite ?? '—'}
      </span>
      <span className="shrink-0 text-xs text-[#525f6d] dark:text-white/50">
        {HISTORIQUE_ENTITES[evt.type_entite as keyof typeof HISTORIQUE_ENTITES] ?? evt.type_entite}
      </span>
      <span className="shrink-0 text-xs text-gray-400">
        {montrerAuteur && `${evt.utilisateur?.name ?? 'Inconnu'} · `}
        {formatDate(evt.created_at)}
      </span>
    </Link>
  );
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(3, Math.round((part / total) * 100));
}

/**
 * Répartition par action : anneau (donut) SVG + légende avec pourcentages.
 * Les totaux par action sont agrégés côté client depuis repartition_par_type,
 * qui fournit déjà le détail par action — aucune requête supplémentaire.
 */
function RepartitionActions({
  repartition,
  total,
}: {
  repartition: Stats['repartition_par_type'];
  total: number;
}) {
  // Cumul de chaque action sur tous les types d'entité.
  const totaux: Record<string, number> = {};
  for (const type of repartition) {
    for (const action of ACTION_ORDER) {
      totaux[action] = (totaux[action] ?? 0) + type[action];
    }
  }

  const parts = ACTION_ORDER.filter((a) => (totaux[a] ?? 0) > 0).map((a) => ({
    action: a,
    valeur: totaux[a],
  }));

  if (parts.length === 0) {
    return <EmptyHint>Pas encore d'événement journalisé.</EmptyHint>;
  }

  const somme = parts.reduce((s, p) => s + p.valeur, 0) || total;

  // Donut dessiné avec des arcs SVG. Rayon et épaisseur fixes.
  const R = 70;
  const EPAISSEUR = 26;
  const CIRCONFERENCE = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <div className="relative shrink-0">
        <svg viewBox="0 0 200 200" className="h-[190px] w-[190px] -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={EPAISSEUR}
            className="text-[#f2f1f1] dark:text-white/5"
          />
          {parts.map((p) => {
            const longueur = (p.valeur / somme) * CIRCONFERENCE;
            const segment = (
              <circle
                key={p.action}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={COULEURS_ACTIONS_HEX[p.action]}
                strokeWidth={EPAISSEUR}
                strokeDasharray={`${longueur} ${CIRCONFERENCE - longueur}`}
                strokeDashoffset={-offset}
              >
                <title>
                  {ACTION_LIBELLES[p.action]} : {p.valeur} ({arrondiPct(p.valeur, somme)} %)
                </title>
              </circle>
            );
            offset += longueur;
            return segment;
          })}
        </svg>

        {/* Étiquette centrale */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none text-[#0c1d31] dark:text-white">
            {somme}
          </span>
          <span className="mt-1 text-[11px] text-[#525f6d] dark:text-white/50">
            événement{somme > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Légende avec pourcentages */}
      <ul className="flex w-full max-w-[280px] flex-col gap-2.5">
        {[...parts]
          .sort((a, b) => b.valeur - a.valeur)
          .map((p) => (
            <li
              key={p.action}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#f6f8fa] dark:hover:bg-white/5"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: COULEURS_ACTIONS_HEX[p.action] }}
              />
              <span className="flex-1 text-sm text-[#0c1d31] dark:text-white">
                {ACTION_LIBELLES[p.action]}
              </span>
              <span className="text-sm font-semibold text-[#0c1d31] dark:text-white">
                {arrondiPct(p.valeur, somme)} %
              </span>
              <span className="w-10 text-right text-xs text-gray-500">{p.valeur}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/** Pourcentage arrondi, en évitant les « 0 % » trompeurs sur une petite part. */
function arrondiPct(part: number, total: number): number {
  if (!total) return 0;
  const p = (part / total) * 100;
  if (p < 1) return Math.round(p * 10) / 10;
  return Math.round(p);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Courbe de tendance des 14 derniers jours (SVG pur, aucune dépendance).
 * Contrairement aux barres, elle ne « ment » pas quand une journée écrase
 * toutes les autres : on lit la forme de l'activité, pas des proportions.
 */
function Tendance({ activite }: { activite: Stats['activite_14j'] }) {
  if (activite.length === 0) {
    return <EmptyHint>Pas encore d'activité.</EmptyHint>;
  }

  // Repère de dessin (viewBox) — l'échelle réelle est gérée par le SVG.
  const L = 600;
  const H = 150;
  const PAD = 12;
  const max = Math.max(1, ...activite.map((j) => j.total));
  const pas = activite.length > 1 ? (L - PAD * 2) / (activite.length - 1) : 0;

  const points = activite.map((j, i) => ({
    x: PAD + i * pas,
    y: H - PAD - (j.total / max) * (H - PAD * 3), // marge en haut pour les points
    jour: j,
  }));

  const ligne = points.map((p) => `${p.x},${p.y}`).join(' ');
  const aire = `${PAD},${H - PAD} ${ligne} ${PAD + (activite.length - 1) * pas},${H - PAD}`;
  const dernier = points[points.length - 1];
  const maxPoint = points.find((p) => p.jour.total === max && max > 0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="h-[150px] w-full"
        role="img"
        aria-label="Courbe d'activité des 14 derniers jours"
      >
        <defs>
          <linearGradient id="aire-tendance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004a86" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#004a86" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ligne de base */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={L - PAD}
          y2={H - PAD}
          stroke="#e6e8f5"
          strokeWidth="1"
        />

        <polygon points={aire} fill="url(#aire-tendance)" />
        <polyline
          points={ligne}
          fill="none"
          stroke="#004a86"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Point du pic (le plus haut) et point du jour le plus récent */}
        {maxPoint && (
          <circle cx={maxPoint.x} cy={maxPoint.y} r="4" fill="#004a86">
            <title>
              {dateLongue(maxPoint.jour.date)} : {maxPoint.jour.total} événement(s)
            </title>
          </circle>
        )}
        <circle cx={dernier.x} cy={dernier.y} r="4" fill="#fff" stroke="#004a86" strokeWidth="2.5">
          <title>
            {dateLongue(dernier.jour.date)} : {dernier.jour.total} événement(s)
          </title>
        </circle>
      </svg>

      {/* Repères de dates sous la courbe */}
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span className="capitalize">{dateLongue(activite[0].date)}</span>
        {maxPoint && max > 0 && (
          <span className="capitalize text-[#004a86] dark:text-blue-300">
            Pic : {dateLongue(maxPoint.jour.date)} ({max})
          </span>
        )}
        <span className="capitalize">{dateLongue(activite[activite.length - 1].date)}</span>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-gray-500">{children}</div>;
}

/**
 * Top contributeurs en histogramme : une barre verticale par personne,
 * nom en dessous, valeur au-dessus. Le dégradé va du plus foncé (1er)
 * au plus clair (dernier), pour que le classement se lise sans les chiffres.
 */
function TopContributeurs({ contributeurs }: { contributeurs: Stats['top_contributeurs'] }) {
  const max = Math.max(1, ...contributeurs.map((c) => c.nb));
  const nb = contributeurs.length;

  // Dégradé : du bleu nuit plein (rang 1) au bleu très clair (dernier rang).
  const degrades = [
    'from-[#003049] to-[#004a86]',
    'from-[#004a86] to-[#4a8fc7]',
    'from-[#4a8fc7] to-[#87b9dd]',
    'from-[#87b9dd] to-[#b6d4ea]',
    'from-[#b6d4ea] to-[#d6e6f2]',
  ];

  return (
    <div className="flex items-end justify-around gap-3" style={{ height: 180 }}>
      {contributeurs.map((c, i) => {
        const hauteur = Math.max(6, (c.nb / max) * 100); // en %
        return (
          <div key={c.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-semibold text-[#0c1d31] dark:text-white">{c.nb}</span>
            <div
              className={`w-full max-w-[64px] rounded-t-lg bg-gradient-to-t ${
                degrades[i] ?? degrades[degrades.length - 1]
              }`}
              style={{ height: `${hauteur}%` }}
              title={`${c.name} : ${c.nb} événement(s)`}
            />
            <span
              className="w-full truncate text-center text-xs text-gray-500"
              title={c.name}
            >
              {c.name}
            </span>
          </div>
        );
      })}
      {nb === 0 && <EmptyHint>Personne n'a encore contribué.</EmptyHint>}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string;
  value: number;
  icon: (p: IconProps) => JSX.Element;
  to?: string;
}) {
  // Disposition « chiffre d'abord » : l'icône passe en discret à gauche et le
  // chiffre devient l'élément dominant à droite. La flèche ↗ n'apparaît qu'au
  // survol, et seulement pour les cartes réellement cliquables.
  const card = (
    <div className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-[#e6e8f5] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#003049]/30 hover:shadow-lg dark:border-white/10 dark:bg-[#131313] dark:hover:border-white/20">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003049] text-white shadow-md dark:bg-white/15">
        <Icon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold leading-none text-[#0c1d31] dark:text-white">{value}</div>
        <div className="mt-1.5 truncate text-sm text-[#525f6d] dark:text-white/50" title={label}>
          {label}
        </div>
      </div>

      {to && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 text-[#003049] opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full" title={`Voir ${label.toLowerCase()}`}>
      {card}
    </Link>
  ) : (
    card
  );
}