// Types TypeScript pour l'application

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
// Ce qu'un objet traîne derrière lui : les étapes qui le partagent et les
// demandes de changement qui le citent. Un objet cité par une DC ne peut pas
// être effacé, sinon l'historique de traçabilité disparaît.
export interface EtapeMasqueImpact {
  id: number;
  code: string;
  nom: string;
  etape_count: number;
  autres_etapes: string[];
  dcs: string[];
  fonctions_count: number;
  services_count: number;
  procedures_count: number;
}

export interface EtapeImpact {
  dcs: string[];
  masques: EtapeMasqueImpact[];
}

export interface MasqueServiceImpact {
  id: number;
  nom: string;
  masque_count: number;
  autres_masques: string[];
  dcs: string[];
  procedures: string[];
}

export interface MasqueImpact {
  dcs: string[];
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
}

export interface Service {
  id: number;
  nom: string;
  methode_http: string | null;
  url: string | null;
  input_desc: string | null;
  output_desc: string | null;
  controleur: string | null;
  modifie_bdd: boolean;
  created_at: string;
  updated_at: string;
}

export interface Procedure {
  id: number;
  nom: string;
  description: string | null;
  created_at: string;
  updated_at: string;
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
  modifie_bdd: boolean | null;
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
export interface DC {
  id: number;
  numero: string;
  titre: string;
  description: string | null;
  date: string;
  auteur_id: number | null;
  etape_id: number | null;
  archive_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DCDetail extends DC {
  masques: DCMasque[];
  services: DCService[];
  procedures: DCProcedure[];
  tables: DCTable[];
  attributs: DCAttribut[];
}

export interface DCMasque {
  masque_id: number;
  code: string | null;
  nom: string | null;
  action: string;
  details: string | null;
}

export interface DCService {
  service_id: number;
  nom: string | null;
  action: string;
  details: string | null;
}

export interface DCProcedure {
  procedure_id: number;
  nom: string | null;
  action: string;
  details: string | null;
}

export interface DCTable {
  table_id: number;
  nom: string | null;
  action: string;
  details: string | null;
}

export interface DCAttribut {
  attribut_id: number;
  nom: string | null;
  action: string;
  details: string | null;
}

export interface Archive {
  id: number;
  identifiant: string;
  date_push: string;
}

export interface ArchiveDetail extends Archive {
  dcs: DC[];
}

// ======================
// STATS
// ======================
export interface Stats {
  domaines: number;
  processes: number;
  etapes: number;
  masques: number;
  services: number;
  tables: number;
  dcs: number;
}

// ======================
// SEARCH
// ======================
export interface SearchResults {
  masques: { id: number; code: string; nom: string }[];
  services: { id: number; nom: string }[];
  tables: { id: number; nom: string }[];
  dcs: { id: number; numero: string; titre: string }[];
}
