import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SkeletonTable } from '../components/ui/Skeleton';
import { historiqueApi } from '../api/historique';
import {
  HISTORIQUE_ACTIONS,
  HISTORIQUE_ENTITES,
  HistoriqueAction,
  HistoriqueEvent,
  HistoriqueTypeEntite,
} from '../types';

const ACTION_COLORS: Record<string, string> = {
  creation: 'bg-teal-100 text-teal-800',
  modification: 'bg-[#e6e8f5] text-[#060923]',
  suppression: 'bg-red-100 text-red-800',
  rattachement: 'bg-blue-100 text-blue-800',
  detachement: 'bg-amber-100 text-amber-800',
  reorder: 'bg-purple-100 text-purple-800',
};

const PAR_PAGE = 25;

export function HistoriquePage() {
  const [evenements, setEvenements] = useState<HistoriqueEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<HistoriqueAction | ''>('');
  const [typeEntite, setTypeEntite] = useState<HistoriqueTypeEntite | ''>('');
  const [deplie, setDeplie] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historiqueApi.list({
        action: action || undefined,
        type_entite: typeEntite || undefined,
        page,
        par_page: PAR_PAGE,
      });
      setEvenements(data.evenements);
      setTotal(data.total);
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, typeEntite, page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const reinitialiser = () => {
    setAction('');
    setTypeEntite('');
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  return (
    <div>
      <Breadcrumb items={[{ label: 'Historique' }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Journal des changements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Qui, quand, sur quoi, et ce qui a changé — dans tout le référentiel.
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value as HistoriqueAction | '');
            setPage(1);
          }}
          className="h-[42px] rounded-xl border border-[#e6e8f5] bg-white px-3 text-sm text-gray-700 focus:border-[#0A2540] focus:outline-none"
        >
          <option value="">Toutes les actions</option>
          {(Object.keys(HISTORIQUE_ACTIONS) as HistoriqueAction[]).map((a) => (
            <option key={a} value={a}>
              {HISTORIQUE_ACTIONS[a]}
            </option>
          ))}
        </select>

        <select
          value={typeEntite}
          onChange={(e) => {
            setTypeEntite(e.target.value as HistoriqueTypeEntite | '');
            setPage(1);
          }}
          className="h-[42px] rounded-xl border border-[#e6e8f5] bg-white px-3 text-sm text-gray-700 focus:border-[#0A2540] focus:outline-none"
        >
          <option value="">Tous les types</option>
          {(Object.keys(HISTORIQUE_ENTITES) as HistoriqueTypeEntite[]).map((t) => (
            <option key={t} value={t}>
              {HISTORIQUE_ENTITES[t]}
            </option>
          ))}
        </select>

        {(action || typeEntite) && (
          <button
            type="button"
            onClick={reinitialiser}
            className="h-[42px] rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Réinitialiser
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {total} événement{total > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <SkeletonTable rows={12} columns={5} />
      ) : evenements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e6e8f5] py-16 text-center">
          <p className="text-sm text-gray-500">Aucun événement ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#131313]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Élément
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {evenements.map((evt) => (
                  <EventRows
                    key={evt.id}
                    evt={evt}
                    deplie={deplie === evt.id}
                    onToggle={() => setDeplie(deplie === evt.id ? null : evt.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-5 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-[38px] rounded-xl border border-[#e6e8f5] px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-500">
              Page {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="h-[38px] rounded-xl border border-[#e6e8f5] px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Une ligne + la ligne de détail dépliée (diff avant/après) sous la table. */
function EventRows({
  evt,
  deplie,
  onToggle,
}: {
  evt: HistoriqueEvent;
  deplie: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer transition hover:bg-gray-50 ${deplie ? 'bg-gray-50' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3.5">
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${deplie ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </td>
        <td className="px-4 py-3.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[evt.action] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {HISTORIQUE_ACTIONS[evt.action] ?? evt.action}
          </span>
        </td>
        <td className="px-4 py-3.5 font-medium text-gray-800">
          {evt.nom_entite ?? '—'}
        </td>
        <td className="px-4 py-3.5 text-sm text-gray-500">
          {HISTORIQUE_ENTITES[evt.type_entite] ?? evt.type_entite}
        </td>
        <td className="px-4 py-3.5 text-sm text-gray-600">
          {evt.utilisateur?.name ?? 'Inconnu'}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500">
          {formatDate(evt.created_at)}
        </td>
      </tr>
      {deplie && (
        <tr className="bg-gray-50/70">
          <td colSpan={6} className="px-6 pb-5 pt-1">
            <DetailEvent evt={evt} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Contenu déplié : le détail avant/après issu des captures JSON. */
function DetailEvent({ evt }: { evt: HistoriqueEvent }) {
  const avant = evt.avant ?? {};
  const apres = evt.apres ?? {};
  const champs: [string, unknown][] = [];

  for (const cle of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (cle === 'impacts') continue;
    if (avant[cle] !== apres[cle]) {
      champs.push([cle, apres[cle]]);
    }
  }

  // Pour une modification, on préfère lister ce qui a réellement changé.
  const modifs = evt.action === 'modification' ? champs : [];

  return (
    <div className="rounded-xl border border-[#e6e8f5] bg-white p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {evt.avant && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-500">
              Avant
            </h3>
            <SnapTable data={evt.avant} />
          </div>
        )}
        {evt.apres && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600">
              Après
            </h3>
            <SnapTable data={evt.apres} />
          </div>
        )}
      </div>

      {evt.action === 'modification' && modifs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Modifications détaillées
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {modifs.map(([cle, valeur]) => (
                  <tr key={cle} className="border-t border-[#e6e8f5]">
                    <td className="w-40 py-1.5 pr-3 font-medium text-gray-700">{libelle(cle)}</td>
                    <td className="py-1.5 text-gray-600">
                      {avant[cle] === undefined ? '—' : String(avant[cle])}
                      <span className="mx-2 text-gray-400">→</span>
                      {String(valeur ?? '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SnapTable({ data }: { data: Record<string, unknown> }) {
  const lignes = Object.entries(data).filter(([cle]) => cle !== 'impacts');
  if (lignes.length === 0) {
    return <p className="text-sm text-gray-400">—</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {lignes.map(([cle, valeur]) => (
        <div key={cle} className="contents">
          <dt className="text-gray-500">{libelle(cle)}</dt>
          <dd className="truncate text-gray-800" title={String(valeur ?? '')}>
            {valeur === null || valeur === undefined ? '—' : String(valeur)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function libelle(cle: string): string {
  const libelles: Record<string, string> = {
    id: 'Id',
    nom: 'Nom',
    code: 'Code',
    titre: 'Titre',
    description: 'Description',
    url: 'URL',
    methode_http: 'Méthode HTTP',
    controleur: 'Contrôleur',
    input_desc: 'Entrée',
    output_desc: 'Sortie',
    modifie_bdd: 'Modifie la BDD',
    ordre: 'Ordre',
    numero: 'N°',
    etape_id: 'Étape',
    process_id: 'Processus',
    masque_id: 'Masque',
    base_donnees: 'Base de données',
    type: 'Type',
    role: 'Rôle',
    blocked: 'Bloqué',
    email: 'Email',
    created_at: 'Créé le',
    updated_at: 'Modifié le',
  };
  return libelles[cle] ?? cle;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}