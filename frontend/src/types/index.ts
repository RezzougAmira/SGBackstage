// Types TypeScript pour l'application

// ======================
// PAGINATION
// ======================
export interface PageParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ======================
// AUTH
// ======================
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  blocked?: number;
  avatar_key?: string | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

// ======================
// COUCHE MÉTIER
// ======================
export interface Domaine {
  id: number;
  nom: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  process_count?: number;
  masque_count?: number;
}

export interface Process {
  id: number;
  nom: string;
  description: string | null;
  diagramme_url: string | null;
  diagramme_type: string | null;
  domaine_id: number;
  created_at: string;
  updated_at: string;
  etape_count?: number;
}

export interface Etape {
  id: number;
  nom: string;
  description: string | null;
  ordre: number;
  process_id: number;
  created_at: string;
  updated_at: string;
}

export interface TableRef {
  id: number;
  nom: string;
}

export interface ProcedureRef {
  id: number;
  nom: string;
  description: string | null;
  tables: TableRef[];
}

export interface ServiceRef {
  id: number;
  nom: string;
  methode_http: string | null;
  url: string | null;
  input_desc: string | null;
  output_desc: string | null;
  procedures: ProcedureRef[];
}

export interface FonctionRef {
  id: number;
  nom: string;
  description: string | null;
  services: ServiceRef[];
}

export interface MasqueRef {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  image_key: string | null;
  fonctions: FonctionRef[];
}

export interface EtapeDetail extends Etape {
  process_nom?: string | null;
  masques: MasqueRef[];
}

// ======================
// SUPPRESSION ET IMPACT
// ======================
// Ce qu'un objet traîne derrière lui : les étapes qui le partagent.
export interface EtapeMasqueImpact {
  id: number;
  code: string;
  nom: string;
  etape_count: number;
  autres_etapes: string[];
  fonctions_count: number;
  services_count: number;
  procedures_count: number;
}

export interface EtapeImpact {
  masques: EtapeMasqueImpact[];
}

export interface MasqueServiceImpact {
  id: number;
  nom: string;
  masque_count: number;
  autres_masques: string[];
  procedures: string[];
}

export interface MasqueImpact {
  etapes: string[];
  services: MasqueServiceImpact[];
}

export interface SuppressionRapport {
  nom: string;
  supprimes: string[];
  conserves: string[];
}

export interface EtapeSuppressionResult {
  etape: SuppressionRapport;
  masques: SuppressionRapport;
}

export interface MasqueSuppressionResult {
  masque: SuppressionRapport;
  services: SuppressionRapport;
}

// ======================
// COUCHE TECHNIQUE
// ======================
export interface Masque {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  image_key: string | null;
  created_at: string;
  updated_at: string;
  /** Rattachements : étapes qui le portent, services appelés, fonctionnalités. */
  etapes: TableRef[];
  services: TableRef[];
  fonctionnalites: TableRef[];
}

export interface Service {
  id: number;
  nom: string;
  methode_http: string | null;
  url: string | null;
  input_desc: string | null;
  output_desc: string | null;
  controleur: string | null;
  collection: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  /** Rattachements : procédures invoquées, masques appelants, fonctionnalités. */
  procedures: TableRef[];
  masques: TableRef[];
  fonctionnalites: TableRef[];
}

export interface Procedure {
  id: number;
  nom: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  /** Services qui invoquent la procédure, et tables qu'elle touche. */
  services: TableRef[];
  tables: TableRef[];
}

export interface FonctionnaliteProcedure {
  id: number;
  nom: string;
  description: string | null;
  tables: TableRef[];
}

export interface FonctionnaliteService {
  id: number;
  nom: string;
  methode_http: string | null;
  url: string | null;
  input_desc: string | null;
  output_desc: string | null;
  controleur: string | null;
  collection: Record<string, unknown> | null;
  procedures: FonctionnaliteProcedure[];
}

/** Une fonctionnalité regroupe les services qui réalisent une même action
 *  (le bouton « Rechercher », par exemple), au sein d'un masque. */
export interface Fonctionnalite {
  id: number;
  titre: string;
  description: string | null;
  masque_id: number;
  ordre: number;
  services: FonctionnaliteService[];
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: number;
  nom: string;
  base_donnees: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  attribut_count?: number;
}

export interface Attribut {
  id: number;
  nom: string;
  type: string;
  table_id: number;
}

// ======================
// COUCHE TRAÇABILITÉ
// ======================
export interface Archive {
  id: number;
  identifiant: string;
  date_push: string;
}

export interface ArchiveDetail extends Archive {}

// ======================
// STATS & HISTORIQUE
// ======================
export interface Stats {
  domaines: number;
  processes: number;
  etapes: number;
  masques: number;
  fonctionnalites: number;
  services: number;
  procedures: number;
  utilisateurs: number;
  evenements: number;
  /** Activité des 14 derniers jours : détail par action déjà inclus. */
  activite_14j: (
    & { date: string; total: number }
    & Record<
      "creation" | "modification" | "suppression" | "rattachement" | "detachement" | "reorder",
      number
    >
  )[];
  repartition_par_type: {
    type_entite: string;
    creation: number;
    modification: number;
    suppression: number;
    rattachement: number;
    detachement: number;
    reorder: number;
    total: number;
  }[];
  top_contributeurs: { id: number; name: string; nb: number }[];
  evenements_recents: HistoriqueEvent[];
}

export type HistoriqueAction =
  | 'creation'
  | 'modification'
  | 'suppression'
  | 'rattachement'
  | 'detachement'
  | 'reorder';

export type HistoriqueTypeEntite =
  | 'domaine'
  | 'process'
  | 'etape'
  | 'masque'
  | 'fonctionnalite'
  | 'service'
  | 'procedure'
  | 'table'
  | 'attribut'
  | 'archive'
  | 'user';

export interface HistoriqueEvent {
  id: number;
  utilisateur: { id: number; name: string; avatar_key: string | null } | null;
  action: HistoriqueAction;
  type_entite: HistoriqueTypeEntite;
  entite_id: number | null;
  nom_entite: string | null;
  avant: Record<string, unknown> | null;
  apres: Record<string, unknown> | null;
  created_at: string;
}

export interface HistoriqueResponse {
  total: number;
  page: number;
  par_page: number;
  evenements: HistoriqueEvent[];
}

/** Utilisateur déjà présent dans le journal (source du filtre par utilisateur). */
export interface HistoriqueUtilisateur {
  id: number;
  name: string;
  avatar_key: string | null;
  evenements: number;
}

export interface HistoriqueFilters {
  action?: HistoriqueAction;
  type_entite?: HistoriqueTypeEntite;
  entite_id?: number;
  utilisateur_id?: number;
  depuis?: string;
  jusqua?: string;
  search?: string;
  page?: number;
  page_size?: number;  // Renommé de par_page pour cohérence avec le standard
}

export const HISTORIQUE_ACTIONS: Record<HistoriqueAction, string> = {
  creation: 'Ajout',
  modification: 'Modification',
  suppression: 'Suppression',
  rattachement: 'Rattachement',
  detachement: 'Détachement',
  reorder: 'Réordonnancement',
};

export const HISTORIQUE_ENTITES: Record<HistoriqueTypeEntite, string> = {
  domaine: 'Domaine',
  process: 'Processus',
  etape: 'Étape',
  masque: 'Masque',
  fonctionnalite: 'Fonctionnalité',
  service: 'Service',
  procedure: 'Procédure',
  table: 'Table',
  attribut: 'Attribut',
  archive: 'Archive',
  user: 'Utilisateur',
};

// ======================
// SEARCH
// ======================
export interface SearchResults {
  masques: { id: number; code: string; nom: string }[];
  services: { id: number; nom: string }[];
  tables: { id: number; nom: string }[];
}
