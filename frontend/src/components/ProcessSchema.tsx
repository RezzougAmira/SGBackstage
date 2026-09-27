import { Etape } from '../types';

interface ProcessSchemaProps {
  etapes: Etape[];
  activeEtapeId?: number | null;
  onSelectEtape: (etapeId: number) => void;
}

export function ProcessSchema({ etapes, activeEtapeId, onSelectEtape }: ProcessSchemaProps) {
  if (etapes.length === 0) {
    return (
      <div className="py-8 text-center font-poppins text-sm text-[#525f6d] dark:text-white/50">
        Aucune étape définie pour ce processus
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-2 py-2">
        {etapes.map((etape, index) => {
          const isActive = etape.id === activeEtapeId;
          return (
            <div key={etape.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelectEtape(etape.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`group flex min-w-[150px] max-w-[220px] flex-col items-center gap-1 rounded-xl border px-4 py-3 text-center transition ${
                  isActive
                    ? 'border-[#004a86] bg-[#004a86] text-white shadow-md'
                    : 'border-[#e6e8f5] bg-white text-[#0c1d31] hover:border-[#004a86] hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white'
                }`}
              >
                <span
                  className={`font-poppins text-[10px] font-semibold uppercase tracking-wide ${
                    isActive ? 'text-white/70' : 'text-[#004a86] dark:text-[#4aa1de]'
                  }`}
                >
                  Étape {etape.ordre}
                </span>
                <span className="font-poppins text-sm font-semibold leading-tight">
                  {etape.nom}
                </span>
              </button>

              {index < etapes.length - 1 && (
                <svg
                  className="mx-1 h-5 w-5 shrink-0 text-[#004a86] dark:text-[#4aa1de]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
