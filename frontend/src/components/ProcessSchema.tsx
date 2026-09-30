import { Etape } from '../types';

interface ProcessSchemaProps {
  etapes: Etape[];
  onSelectEtape: (etapeId: number) => void;
}

// Les deux extrémités du flux se distinguent par une couleur dédiée : vert pour
// le départ, rouge pour l'arrivée, les étapes restant en bleu.
const bubbleBase =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 px-2 text-center font-poppins text-[11px] font-bold uppercase leading-tight";
const bubbleStart = `${bubbleBase} border-[#26A69A] bg-[#E3F5EE] text-[#0a5d55]`;
const bubbleEnd = `${bubbleBase} border-[#EF5350] bg-[#FDECEA] text-[#a8322a]`;

function FlowChevron() {
  return (
    <svg
      className="mx-1.5 h-5 w-5 shrink-0 text-[#8ea0b3] dark:text-white/40"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ProcessSchema({ etapes, onSelectEtape }: ProcessSchemaProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex w-full flex-wrap items-stretch justify-center gap-y-5">
        {/* Bulle de début, toujours présente en tête de flux */}
        <div className="flex items-center">
          <span className={bubbleStart}>Début</span>
          <FlowChevron />
        </div>

        {etapes.map((etape) => (
          <div key={etape.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelectEtape(etape.id)}
              className="group flex w-[150px] flex-col items-center gap-1 rounded-xl border-2 border-[#A8CBEF] bg-[#E8F1FB] px-4 py-3 text-center text-[#0A2540] transition hover:border-[#004a86] hover:bg-[#D9EAFB] hover:shadow-md sm:w-[170px] lg:w-auto lg:min-w-[170px] lg:max-w-[220px]"
            >
              <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide opacity-60">
                Étape {etape.ordre}
              </span>
              <span className="font-poppins text-sm font-semibold leading-tight">
                {etape.nom}
              </span>
            </button>
            <FlowChevron />
          </div>
        ))}

        {/* Bulle de fin, toujours présente en fin de flux */}
        <div className="flex items-center">
          <span className={bubbleEnd}>Fin</span>
        </div>
      </div>

      {etapes.length === 0 && (
        <p className="mt-4 text-center font-poppins text-sm text-[#525f6d] dark:text-white/50">
          Aucune étape définie pour ce processus
        </p>
      )}
    </div>
  );
}
