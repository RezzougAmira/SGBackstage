# SGBackstage

**Plateforme web de documentation technique du système SGB**

---

## Table des matières

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Objectifs du projet](#2-objectifs-du-projet)
3. [Stack technique](#3-stack-technique)
4. [Architecture du projet](#4-architecture-du-projet)
5. [Modèle de données](#5-modèle-de-données)
6. [Fonctionnalités](#6-fonctionnalités)
7. [Pages et interfaces](#7-pages-et-interfaces)
8. [API REST](#8-api-rest)
9. [Installation et démarrage](#9-installation-et-démarrage)
10. [Données de démonstration](#10-données-de-démonstration)
11. [Perspectives](#11-perspectives)

---

## 1. Contexte et problématique

### Le SGB

Le département Développement d'AGB maintient le **SGB** (Système de Gestion Bancaire), une application desktop développée en C# selon une architecture client/serveur (pattern MVVM). Le SGB gère l'ensemble des opérations bancaires internes : ouverture de comptes, opérations de crédit, monétique, commerce, compensation, etc.

### L'organisation

Le département Développement est organisé en **services internes**, chacun dédié à un domaine fonctionnel du SGB (Monétique, Commerce, BI, Crédit, Compensation, Clientèle...). Chaque domaine dispose de **processus** métier (ex. ouverture de compte), eux-mêmes découpés en **étapes**. Chaque étape s'appuie sur un ou plusieurs **masques** (écrans C# identifiés par un code, ex. `CE2100`).

### Le problème

> **Le code du SGB n'est documenté nulle part de façon fiable et exploitable.**

- Les documents Word existants sont trop longs et mal structurés pour être consultés
- Une première tentative de documentation « par masque » s'est révélée peu utile (suppose de déjà connaître le code)
- La connaissance repose presque entièrement sur la mémoire des développeurs
- Le départ d'un développeur expérimenté = perte de connaissance opérationnelle
- Un nouveau développeur met beaucoup de temps à devenir autonome

### La solution

Créer une plateforme web qui documente le code du SGB de façon dynamique et centralisée, en connectant le contexte métier à la structure technique :

```
COUCHE MÉTIER          COUCHE TECHNIQUE                 TRAÇABILITÉ
(Domaine/Process/      (Masque/Fonctionnalité/          (journal des changements
 Étape)                 Service/Procédure/Table/         + archivages)
         │                       │                            │
         └───────────────┬───────┘                            │
                         │                                    │
                    Étape ←→ Masque                    Historique
```

- **Couche métier** : documente le contexte (quel domaine, quel process, quelle étape)
- **Couche technique** : documente le code (quel masque, quelle fonctionnalité, quel service, quelle procédure, quelle table, quels attributs)
- **Traçabilité** : un journal d'audit enregistre qui a créé, modifié, supprimé, rattaché ou détaché un élément, avec un instantané avant/après

---

## 2. Objectifs du projet

### Objectifs fonctionnels

- Centraliser la documentation technique du SGB dans une application web vivante
- Permettre une navigation à deux niveaux : par le métier (domaines/process/étapes) et par le code (masques/services/procédures/tables)
- Afficher pour chaque étape les masques, leurs fonctionnalités et les services qui les implémentent
- Tracer chaque modification dans un **journal d'audit** consultable et filtrable
- Prévenir les erreurs de suppression grâce à une **analyse d'impact** des objets partagés
- Faciliter l'intégration de nouveaux développeurs
- Réduire la dépendance à la mémoire individuelle des développeurs

### Objectifs techniques

- Concevoir un modèle de données couvrant les deux couches (métier et technique) et le journal
- Développer une API REST complète et documentée (Swagger auto-généré)
- Créer une interface web intuitive et responsive
- Implémenter une suppression raisonnée : chaque objet partagé est conservé tant qu'un autre le référence
- Maintenir la cohérence entre le vocabulaire métier et la structure technique

---

## 3. Stack technique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Frontend | React + TypeScript + Vite | Rapidité de développement, typage fort |
| UI | Tailwind CSS | Style cohérent, peu de boilerplate |
| Backend | FastAPI (Python) | API rapide, Swagger auto-généré |
| ORM | SQLAlchemy | Standard Python, relations N:N natives |
| Validation | Pydantic | Intégré nativement à FastAPI |
| Base de données | PostgreSQL | Robuste, compatible environnement bancaire |
| Authentification | JWT | Simple, sans état, rapide à implémenter |
| Documentation API | Swagger/OpenAPI | Auto-généré par FastAPI |

---

## 4. Architecture du projet

```
sgb-techtrace/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # Point d'entrée FastAPI (routes + patche de schéma)
│   │   ├── config.py              # Configuration (DATABASE_URL, JWT_SECRET, etc.)
│   │   ├── database.py            # Connexion SQLAlchemy
│   │   ├── models/                # Modèles ORM (SQLAlchemy)
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # Base = declarative_base()
│   │   │   ├── user.py
│   │   │   ├── domaine.py
│   │   │   ├── process.py
│   │   │   ├── etape.py
│   │   │   ├── masque.py          # Masque + liaison EtapeMasque
│   │   │   ├── service.py         # Service + liaison MasqueService
│   │   │   ├── fonctionnalite.py  # Fonctionnalite + liaison FonctionnaliteService
│   │   │   ├── procedure.py       # ProcedureStockee + liaison ServiceProcedure
│   │   │   ├── table.py           # TableInfo + liaison ProcedureTable
│   │   │   ├── attribut.py
│   │   │   ├── archive.py
│   │   │   └── historique.py      # Journal d'audit
│   │   ├── schemas/               # Pydantic schemas (validation des entrées/sorties)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── domaine.py
│   │   │   ├── process.py
│   │   │   ├── etape.py
│   │   │   ├── masque.py
│   │   │   ├── service.py
│   │   │   ├── fonctionnalite.py
│   │   │   ├── procedure.py
│   │   │   ├── table.py
│   │   │   ├── attribut.py
│   │   │   └── archive.py
│   │   ├── routers/               # Routes API
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Connexion, inscription, gestion utilisateurs
│   │   │   ├── domaines.py
│   │   │   ├── processes.py
│   │   │   ├── etapes.py
│   │   │   ├── masques.py
│   │   │   ├── services.py
│   │   │   ├── fonctionnalites.py
│   │   │   ├── procedures.py
│   │   │   ├── tables.py
│   │   │   ├── attributs.py
│   │   │   ├── archives.py
│   │   │   ├── historique.py
│   │   │   ├── search.py
│   │   │   └── upload.py          # Médias (avatars, images de masque, diagrammes)
│   │   └── utils/
│   │       ├── auth.py            # JWT + bcrypt
│   │       ├── deps.py            # Dependencies (get_db, get_current_user)
│   │       ├── historique.py      # Snapshot/diff + écriture du journal
│   │       ├── impact.py          # Analyse d'impact avant suppression
│   │       └── storage.py         # Stockage des fichiers
│   ├── seed.py                    # Script de seed de démonstration
│   ├── probe_fonc.py              # Vérification isolée des fonctionnalités
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                # Routeur principal
    │   ├── types/index.ts         # Types TypeScript partagés
    │   ├── api/                   # Fonctions API
    │   │   ├── client.ts          # Instance fetch avec token
    │   │   ├── auth.ts
    │   │   ├── domaines.ts
    │   │   ├── processes.ts
    │   │   ├── etapes.ts
    │   │   ├── masques.ts
    │   │   ├── services.ts
    │   │   ├── fonctionnalites.ts
    │   │   ├── procedures.ts
    │   │   ├── tables.ts
    │   │   ├── attributs.ts
    │   │   ├── archives.ts
    │   │   ├── historique.ts
    │   │   ├── search.ts
    │   │   └── upload.ts
    │   ├── components/
    │   │   ├── AppLayout.tsx      # Sidebar + header
    │   │   ├── Breadcrumb.tsx     # Fil d'Ariane
    │   │   ├── ConfirmModal.tsx   # Modale de confirmation (avec radios)
    │   │   ├── Modal.tsx
    │   │   ├── ProcessSchema.tsx  # Schéma auto-généré des étapes
    │   │   ├── EtapeDetails.tsx   # Liste des masques d'une étape
    │   │   ├── FonctionnalitesSection.tsx  # Fonctionnalités + services d'un masque
    │   │   ├── forms/             # DomaineForm, ProcessForm, EtapeForm,
    │   │   │                      # MasqueForm, ServiceForm, ProcedureForm
    │   │   └── ui/                # Skeleton, pageSkeletons
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── DomainesPage.tsx
    │   │   ├── DomaineDetailPage.tsx
    │   │   ├── ProcessDetailPage.tsx
    │   │   ├── EtapeDetailPage.tsx
    │   │   ├── SearchPage.tsx
    │   │   ├── HistoriquePage.tsx
    │   │   ├── ProfilePage.tsx    # Administration des utilisateurs (admin)
    │   │   ├── MonProfilPage.tsx
    │   │   └── NotFoundPage.tsx
    │   └── hooks/
    │       ├── useAuth.tsx
    │       ├── useApi.ts
    │       └── useProtectedImage.ts
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── tailwind.config.js
```

---

## 5. Modèle de données

### Schéma relationnel

#### Couche métier

```
Domaine (1) ──── (N) Process
Process (1) ──── (N) Étape          [ordre = position dans le flux]
```

#### Couche technique

```
Étape        (N) ←──→ Masque      [table de liaison: etape_masques]
Masque       (1) ──── (N) Fonctionnalité
Fonctionnalité (N) ←──→ Service   [table de liaison: fonctionnalite_services]
Masque       (N) ←──→ Service     [table de liaison: masque_services]
Service      (N) ←──→ Procédure   [table de liaison: service_procedures]
Procédure    (N) ←──→ Table       [table de liaison: procedure_tables]
Table        (1) ──── (N) Attribut
```

> Une **fonctionnalité** regroupe les services qui réalisent une même action
> offerte par un masque (le bouton « Rechercher », par exemple).

#### Traçabilité

```
User (1) ──── (N) Historique       [actions: création, modification, suppression,
                                    rattachement, détachement, réordonnancement]
Archive (1)   (N) — identifiant de livraison/push (référence externe)
```

### Tables SQL (extrait)

```sql
-- ============================================
-- COUCHE MÉTIER
-- ============================================

CREATE TABLE domaines (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    diagramme_url VARCHAR,
    diagramme_type VARCHAR,
    domaine_id INT REFERENCES domaines(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nom, domaine_id)
);

CREATE TABLE etapes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    ordre INT NOT NULL,
    process_id INT REFERENCES processes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(process_id, ordre)
);

-- ============================================
-- COUCHE TECHNIQUE
-- ============================================

CREATE TABLE masques (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    image_key VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE etape_masques (
    id SERIAL PRIMARY KEY,
    etape_id INT REFERENCES etapes(id) ON DELETE CASCADE,
    masque_id INT REFERENCES masques(id) ON DELETE CASCADE,
    UNIQUE(etape_id, masque_id)
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    methode_http VARCHAR(10),
    url VARCHAR(500),
    input_desc TEXT,
    output_desc TEXT,
    controleur VARCHAR(255),
    collection JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE masque_services (
    id SERIAL PRIMARY KEY,
    masque_id INT REFERENCES masques(id) ON DELETE CASCADE,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(masque_id, service_id)
);

CREATE TABLE fonctionnalites (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    masque_id INT REFERENCES masques(id) ON DELETE CASCADE,
    ordre INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE fonctionnalite_services (
    id SERIAL PRIMARY KEY,
    fonctionnalite_id INT REFERENCES fonctionnalites(id) ON DELETE CASCADE,
    service_id INT REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE procedures_stockees (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_procedures (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    procedure_id INT REFERENCES procedures_stockees(id) ON DELETE CASCADE,
    UNIQUE(service_id, procedure_id)
);

CREATE TABLE tables_info (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    base_donnees VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nom, base_donnees)
);

CREATE TABLE procedure_tables (
    id SERIAL PRIMARY KEY,
    procedure_id INT REFERENCES procedures_stockees(id) ON DELETE CASCADE,
    table_id INT REFERENCES tables_info(id) ON DELETE CASCADE,
    UNIQUE(procedure_id, table_id)
);

CREATE TABLE attributs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    table_id INT REFERENCES tables_info(id) ON DELETE CASCADE,
    UNIQUE(nom, table_id)
);

-- ============================================
-- TRAÇABILITÉ
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'developer',
    avatar_key VARCHAR,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE archives (
    id SERIAL PRIMARY KEY,
    identifiant VARCHAR(50) UNIQUE NOT NULL,
    date_push TIMESTAMP DEFAULT NOW()
);

CREATE TABLE historique (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL,
    type_entite VARCHAR(30) NOT NULL,
    entite_id INTEGER,
    nom_entite VARCHAR(255),
    avant JSONB,
    apres JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## 6. Fonctionnalités

### Fonctionnalités Core

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| F1 | Authentification | Login email + mot de passe, JWT, session sécurisée |
| F2 | Dashboard | Vue d'ensemble : compteurs, activité 14 jours, top contributeurs |
| F3 | Navigation métier | Domaine → Process → Étape → Masques |
| F4 | Schéma de process | Flux visuel auto-généré des étapes (boîtes cliquables + flèches) |
| F5 | Fiche étape | Masques associés, avec leurs fonctionnalités, services, procédures, tables et attributs |
| F6 | Recherche globale | Par code masque, nom service, nom table |
| F7 | Journal d'audit | Historique filtrable/paginé de toutes les actions, avec détail avant/après |
| F8 | Suppression raisonnée | Analyse d'impact : un objet partagé n'est effacé que s'il ne sert qu'ici |
| F9 | Réordonnancement | Modifier l'ordre des étapes |

### Fonctionnalités avancées

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| F10 | Médias | Image de masque, diagramme de process, avatar utilisateur |
| F11 | Archivage | Identifiant d'archivage d'une livraison (push de déploiement) |
| F12 | Administration | Liste des utilisateurs, blocage/déblocage (réservé admin) |

### Cascade technique (logique métier)

```
Masque (toujours requis)
  ├── Fonctionnalité(s) : une action offerte (Rechercher, Exporter...)
  │     └── Service(s) qui l'implémentent
  └── Service ? (optionnel — un masque peut n'avoir aucun service listé)
        └── Procédure stockée → Table(s) → Attribut(s)
```

### Suppression raisonnée (analyse d'impact)

Le référentiel est un graphe de tables de jointure : un masque peut être porté
par plusieurs étapes, un service appelé par plusieurs masques, une procédure par
plusieurs services. Avant toute suppression, l'API calcule l'impact :

- une **étape** supprimée par défaut ne supprime pas ses masques (partage possible) ;
- un **masque** supprimé ne supprime ses services que sur demande explicite, et
  uniquement ceux qui ne servent qu'ici ;
- un **service** n'emporte ses procédures que si nul autre service ne les appelle ;
- la suppression est **refusée** si l'objet est encore utilisé ailleurs ;
- à chaque suppression, le journal conserve un instantané « avant » de l'objet.

---

## 7. Pages et interfaces

### Login

- Champ email + mot de passe
- Bouton "Se connecter"
- Redirection vers Dashboard si JWT valide

### Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  Tableau de bord                                         │
│                                                          │
│  Domaines  Processus  Étapes  Masques  Fonctionnalités  │
│  Services  Procédures Tables  Attributs Archives Users   │
│                                                          │
│  Activité des 14 derniers jours                          │
│  ▄ ▄▄ █ ▄▄▄ ██ ▄█ ▄▄ ███ ...                            │
│                                                          │
│  Répartition par type d'entité    Top contributeurs      │
│  Derniers événements du journal                         │
└──────────────────────────────────────────────────────────┘
```

### Domaines (liste + fiche)

- Cartes de domaines avec nombre de process
- Création/modification via formulaire
- Suppression avec confirmation du périmètre (process + étapes emportés)

### Process détaillé

- Schéma visuel des étapes (boîtes cliquables, flèches)
- Liste des étapes avec leur ordre (réordonnancement)
- Ajout/édition/suppression d'étapes

### Fiche Étape

```
Étape : "Saisie des informations" (Ouverture de compte, étape 1)
├── Masque CE2100 — Écran de saisie client
│     ├── Fonctionnalité "Saisir un client"
│     │     ├── CustomerService (GET /api/customers)
│     │     │     └── procedures: SP_CREATE_CUSTOMER → CUSTOMER (id, nom...)
│     │     └── ValidationService (POST /api/validate), modifie BDD = non
│     └── Fonctionnalité "Modifier un client"
│           └── CustomerService (PUT)
└── ...
```

### Recherche globale

- Champ de recherche unique (masques, services, tables)
- Résultats groupés par type d'entité

### Journal d'audit (Historique)

- Ligne du temps des événements (création, modification, suppression, rattachement, détachement, réordonnancement)
- Filtres par type d'entité, action, utilisateur et période
- Pagination, détail « avant »/« après » des modifications

### Administration (Utilisateurs)

- Liste des comptes, création d'utilisateur
- Blocage/déblocage d'un compte (réservé au rôle admin)

---

## 8. API REST

Toutes les routes sont préfixées par `/api` et la majorité exigent un JWT
(header `Authorization: Bearer <token>`).

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion, retourne le JWT |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/auth/me` | Profil de l'utilisateur connecté |
| GET | `/api/auth/users` | Liste des utilisateurs (admin) |
| POST | `/api/auth/users` | Créer un utilisateur (admin) |
| POST | `/api/auth/users/{id}/block` | Bloquer un utilisateur (admin) |
| POST | `/api/auth/users/{id}/unblock` | Débloquer un utilisateur (admin) |

### Domaines

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/domaines` | Liste des domaines |
| GET | `/api/domaines/{id}` | Détail d'un domaine + ses process |
| POST | `/api/domaines` | Créer un domaine |
| PUT | `/api/domaines/{id}` | Modifier un domaine |
| DELETE | `/api/domaines/{id}` | Supprimer un domaine |

### Processus

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/domaines/{domaine_id}/processes` | Process d'un domaine |
| GET | `/api/processes/{id}` | Détail d'un process + ses étapes |
| POST | `/api/domaines/{domaine_id}/processes` | Créer un process |
| PUT | `/api/processes/{id}` | Modifier un process |
| DELETE | `/api/processes/{id}` | Supprimer un process |

### Étapes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/processes/{process_id}/etapes` | Étapes d'un process (par ordre) |
| GET | `/api/etapes/{id}` | Détail d'une étape + masques |
| GET | `/api/etapes/{id}/impact` | Analyse d'impact avant suppression |
| POST | `/api/processes/{process_id}/etapes` | Créer une étape |
| PUT | `/api/etapes/{id}` | Modifier une étape |
| PUT | `/api/etapes/reorder` | Réordonner les étapes |
| DELETE | `/api/etapes/{id}` | Supprimer une étape (avec ou sans masques) |

### Masques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/masques?search=` | Liste des masques |
| GET | `/api/masques/{id}` | Détail d'un masque |
| GET | `/api/masques/{id}/impact` | Analyse d'impact avant suppression |
| POST | `/api/masques` | Créer un masque |
| POST | `/api/etapes/{etape_id}/masques` | Créer un masque + le rattacher à une étape |
| PUT | `/api/masques/{id}` | Modifier un masque |
| DELETE | `/api/masques/{id}` | Supprimer un masque (avec ou sans services) |

### Services

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/services` | Liste |
| GET | `/api/services/{id}` | Détail + procédures |
| POST | `/api/services` | Créer un service |
| PUT | `/api/services/{id}` | Modifier un service |
| DELETE | `/api/services/{id}` | Supprimer un service |
| POST | `/api/services/{id}/assign-masque/{masque_id}` | Rattacher à un masque |
| GET | `/api/services/{id}/procedures` | Procédures d'un service |
| POST | `/api/services/{id}/procedures` | Créer une procédure + la rattacher |
| POST | `/api/services/{id}/procedures/{procedure_id}` | Rattacher une procédure existante |
| DELETE | `/api/services/{id}/procedures/{procedure_id}` | Détacher (sans supprimer) |

### Fonctionnalités

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/fonctionnalites/masque/{masque_id}` | Fonctionnalités d'un masque |
| GET | `/api/fonctionnalites/{id}` | Détail + services |
| POST | `/api/fonctionnalites/masque/{masque_id}` | Créer une fonctionnalité |
| DELETE | `/api/fonctionnalites/{id}` | Supprimer (conserve services/procédures) |
| POST | `/api/fonctionnalites/{id}/services/{service_id}` | Rattacher un service |
| DELETE | `/api/fonctionnalites/{id}/services/{service_id}` | Détacher un service |

### Procédures stockées

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/procedures` | Liste |
| GET | `/api/procedures/{id}` | Détail + tables |
| POST | `/api/procedures` | Créer une procédure |
| PUT | `/api/procedures/{id}` | Modifier une procédure |
| DELETE | `/api/procedures/{id}` | Supprimer une procédure |

### Tables

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tables` | Liste |
| GET | `/api/tables/{id}` | Détail + attributs |
| POST | `/api/tables` | Créer une table |
| PUT | `/api/tables/{id}` | Modifier une table |
| DELETE | `/api/tables/{id}` | Supprimer une table |

### Attributs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tables/{table_id}/attributs` | Attributs d'une table |
| POST | `/api/tables/{table_id}/attributs` | Ajouter un attribut |
| PUT | `/api/attributs/{id}` | Modifier un attribut |
| DELETE | `/api/attributs/{id}` | Supprimer un attribut |

### Archives, Recherche, Statistiques, Journal

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/archives` | Liste des archivages |
| GET | `/api/archives/{id}` | Détail d'un archivage |
| POST | `/api/archives` | Créer un identifiant d'archivage |
| GET | `/api/search?q=` | Recherche globale (masques, services, tables) |
| GET | `/api/stats` | Compteurs pour le tableau de bord |
| GET | `/api/historique` | Journal d'audit (filtres + pagination) |

### Médias

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/upload` | Upload d'un fichier (image/avatar/diagramme) |
| GET | `/api/upload/{key}` | Récupérer un fichier |
| DELETE | `/api/upload/` | Supprimer un fichier |

> La documentation interactive est disponible sur `/docs` (Swagger UI).

---

## 9. Installation et démarrage

### Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- pip
- npm

### Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer la base de données
# Créer un fichier .env avec :
# DATABASE_URL=postgresql://user:password@localhost:5432/sgb_techtrace
# JWT_SECRET=votre_cle_secrete
# JWT_ALGORITHM=HS256

# Créer les tables et appliquer les patches de schéma
python -c "from app.main import app"

# (Optionnel) Peupler les données de démo
python seed.py

# Lancer le serveur
uvicorn app.main:app --reload --port 3001
```

L'API est disponible sur `http://localhost:3001`
La documentation Swagger est disponible sur `http://localhost:3001/docs`

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application est disponible sur `http://localhost:5173`

---

## 10. Données de démonstration

Le script `seed.py` peuple la base avec des données fictives mais réalistes pour
la démonstration. Si la base contient déjà des données, le seed est annulé.

### Domaines de démo

| Domaine | Description |
|---------|-------------|
| Commerce extérieur | Opérations et échanges relatifs au commerce extérieur |
| Télécompense | Télécompensation et échanges interbancaires |
| Monétique | Cartes bancaires et paiement électronique |
| CRM | Gestion de la relation client |
| BI | Business Intelligence et reporting |
| Crédits | Cycle de vie des crédits et échéanciers |

### Processus de démo (exemple Commerce)

| Processus | Étapes |
|-----------|--------|
| Ouverture de compte | 1. Saisie → 2. Vérification identité → 3. Validation → 4. Confirmation |
| Modification client | 1. Consultation → 2. Modification → 3. Validation modification |
| Clôture de compte | 1. Demande → 2. Vérification soldes → 3. Clôture |

### Attribution de démo

| Masque | Services | Procédures | Tables |
|--------|----------|------------|--------|
| CE2100 | CustomerService, ValidationService | SP_CREATE_CUSTOMER, SP_UPDATE_CUSTOMER | CUSTOMER |
| CE2200 | AccountService | SP_CREATE_ACCOUNT | ACCOUNT |
| CE2300 | TransferService | SP_EXECUTE_TRANSFER | TRANSFER, ACCOUNT |

---

## 11. Perspectives

### Court terme

- Compléter les pages CRUD restantes
- Améliorer la recherche globale (filtres, surlignage)
- Optimiser l'analyse d'impact (arbres de dépendances visuels)
- Préparer la démo de soutenance

### Moyen terme

- Import/export de données
- Statistiques avancées (activité par domaine, tendances)
- Intégration à l'Active Directory pour l'authentification
- Notification des modifications en temps réel

### Long terme

- Assistant IA pour suggérer les éléments techniques à documenter
- Migration vers .NET si maintenance par l'équipe existante
- Intégration avec les outils de CI/CD pour tracer les livraisons

---

## Équipe

- **Développeur** : REZZOUG AMIRA
- **Encadrant** :
- **Période** : 13 SEP - 13 OCT
- **Entreprise** : AGB — Département Développement

---

## Licence

Projet interne AGB — Usage exclusivement interne.