# SGB TechTrace

**Plateforme web de documentation technique et de traçabilité des évolutions du système SGB**

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
9. [Plan de développement](#9-plan-de-développement)
10. [Installation et démarrage](#10-installation-et-démarrage)
11. [Données de démonstration](#11-données-de-démonstration)
12. [Perspectives](#12-perspectives)

---

## 1. Contexte et problématique

### Le SGB

Le département Développement d'AGB maintient le **SGB** (Système de Gestion Bancaire), une application desktop développée en C# selon une architecture client/serveur (pattern MVVM). Le SGB gère l'ensemble des opérations bancaires internes : ouverture de comptes, opérations de crédit, monétique, commerce, compensation, etc.

### L'organisation

Le département Développement est organisé en **services internes**, chacun dédié à un domaine fonctionnel du SGB (Monétique, Commerce, BI, Crédit, Compensation, Clientèle...). Chaque domaine dispose de **processus** métier (ex. ouverture de compte), eux-mêmes découpés en **étapes**. Chaque étape s'appuie sur un ou plusieurs **masques** (écrans C# identifiés par un code, ex. `CE2100`).

### Le problème

Les évolutions du SGB sont pilotées par des **demandes de changement (DC)** envoyées par les équipes métier. Le problème central est :

> **Le code du SGB n'est documenté nulle part de façon fiable et exploitable.**

- Les documents Word existants sont trop longs et mal structurés pour être consultés
- Une première tentative de documentation « par masque » s'est révélée peu utile (suppose de déjà connaître le code)
- La connaissance repose presque entièrement sur la mémoire des développeurs
- Le départ d'un développeur expérimenté = perte de connaissance opérationnelle
- Un nouveau développeur met beaucoup de temps à devenir autonome

### La solution

Créer une plateforme web qui documente le code du SGB de façon dynamique et centralisée, en connectant trois couches :

```
COUCHE MÉTIER              COUCHE TECHNIQUE           COUCHE TRAÇABILITÉ
(Domaine/Process/Étape)    (Masque/Service/Procédure)  (Demande de changement)
        │                          │                           │
        │         ┌────────────────┤                           │
        │         │                │                           │
        └─────────┴─── DC ────────┴───────────────────────────┘
```

- **Couche métier** : documente le contexte (quel domaine, quel process, quelle étape)
- **Couche technique** : documente le code (quel masque, quel service, quelle procédure, quelle table, quels attributs)
- **Couche traçabilité** : connecte les deux via les DC, en enregistrant ce qui a été modifié, quand, par qui, et dans quel archivage

---

## 2. Objectifs du projet

### Objectifs fonctionnels

- Centraliser la documentation technique du SGB dans une application web vivante
- Permettre une navigation à deux niveaux : par le métier et par le code
- Tracer l'historique complet des demandes de changement
- Rendre consultable l'impact de chaque modification sur l'ensemble du système
- Faciliter l'intégration de nouveaux développeurs
- Réduire la dépendance à la mémoire individuelle des développeurs

### Objectifs techniques

- Concevoir un modèle de données couvrant les trois couches (métier, technique, traçabilité)
- Développer une API REST complète et documentée
- Créer une interface web intuitive et responsive
- Implémenter un Impact Explorer comme fonctionnalité centrale
- Maintenir la cohérence entre le vocabulaire métier et la structure technique

---

## 3. Stack technique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Frontend | React + TypeScript + Vite | Rapidité de développement, typage fort |
| UI | Tailwind CSS | Style cohérent, peu de boilerplate |
| Backend | FastAPI (Python) | API rapide, Swagger auto-généré |
| ORM | SQLAlchemy | Standard Python, relations N:N natives |
| Migrations | Alembic | Gestion des évolutions de schéma |
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
│   │   ├── main.py                # Point d'entrée FastAPI
│   │   ├── config.py              # Configuration (DATABASE_URL, JWT_SECRET, etc.)
│   │   ├── database.py            # Connexion SQLAlchemy
│   │   ├── models/                # Modèles ORM (SQLAlchemy)
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # Base = declarative_base()
│   │   │   ├── user.py
│   │   │   ├── domaine.py
│   │   │   ├── process.py
│   │   │   ├── etape.py
│   │   │   ├── masque.py
│   │   │   ├── service.py
│   │   │   ├── procedure.py
│   │   │   ├── table.py
│   │   │   ├── attribut.py
│   │   │   ├── dc.py
│   │   │   └── archive.py
│   │   ├── schemas/               # Pydantic schemas (validation des entrées/sorties)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── domaine.py
│   │   │   ├── process.py
│   │   │   ├── etape.py
│   │   │   ├── masque.py
│   │   │   ├── service.py
│   │   │   ├── procedure.py
│   │   │   ├── table.py
│   │   │   ├── attribut.py
│   │   │   ├── dc.py
│   │   │   └── archive.py
│   │   ├── routers/               # Routes API
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── domaines.py
│   │   │   ├── processes.py
│   │   │   ├── etapes.py
│   │   │   ├── masques.py
│   │   │   ├── services.py
│   │   │   ├── procedures.py
│   │   │   ├── tables.py
│   │   │   ├── attributs.py
│   │   │   ├── dcs.py
│   │   │   ├── archives.py
│   │   │   └── search.py
│   │   └── utils/
│   │       ├── auth.py            # JWT + bcrypt
│   │       └── deps.py            # Dependencies (get_db, get_current_user)
│   ├── seed.py                    # Script de seed
│   ├── requirements.txt
│   └── alembic/                   # Migrations
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                # Routeur principal
│   │   ├── api/                   # Fonctions API
│   │   │   ├── client.ts          # Instance fetch avec token
│   │   │   ├── auth.ts
│   │   │   ├── domaines.ts
│   │   │   ├── processes.ts
│   │   │   ├── etapes.ts
│   │   │   ├── masques.ts
│   │   │   ├── services.ts
│   │   │   ├── procedures.ts
│   │   │   ├── tables.ts
│   │   │   ├── attributs.ts
│   │   │   ├── dc.ts
│   │   │   └── archives.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx         # Sidebar + header
│   │   │   ├── Sidebar.tsx        # Navigation arborescente
│   │   │   ├── Breadcrumb.tsx     # Fil d'Ariane
│   │   │   ├── ProcessSchema.tsx  # Schéma visuel auto-généré
│   │   │   ├── ImpactExplorer.tsx # Vue arborescente de l'impact
│   │   │   ├── Modal.tsx
│   │   │   └── forms/
│   │   │       ├── DomaineForm.tsx
│   │   │       ├── ProcessForm.tsx
│   │   │       ├── EtapeForm.tsx
│   │   │       ├── MasqueForm.tsx
│   │   │       ├── ServiceForm.tsx
│   │   │       ├── ProcedureForm.tsx
│   │   │       ├── TableForm.tsx
│   │   │       ├── AttributForm.tsx
│   │   │       └── DCForm.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DomainesPage.tsx
│   │   │   ├── DomaineDetailPage.tsx
│   │   │   ├── ProcessDetailPage.tsx
│   │   │   ├── EtapeDetailPage.tsx
│   │   │   ├── MasquesPage.tsx
│   │   │   ├── MasqueDetailPage.tsx
│   │   │   ├── TablesPage.tsx
│   │   │   ├── TableDetailPage.tsx
│   │   │   ├── DCListPage.tsx
│   │   │   ├── DCDetailPage.tsx
│   │   │   ├── DCCreatePage.tsx
│   │   │   ├── ArchivesPage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useApi.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── helpers.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
└── README.md
```

---

## 5. Modèle de données

### Schéma relationnel

#### Couche métier

```
Domaine (1) ──── (N) Process
Process (1) ──── (N) Étape
```

#### Couche technique

```
Étape (N) ←──→ Masque          [table de liaison: etape_masques]
Masque (N) ←──→ Service        [table de liaison: masque_services]
Service (N) ←──→ Procédure     [table de liaison: service_procedures]
Procédure (N) ←──→ Table       [table de liaison: procedure_tables]
Table (1) ──── (N) Attribut
```

#### Couche traçabilité

```
User (1) ──── (N) DC
DC (N) ←──→ Masque             [table de liaison: dc_masques, portant action + details]
DC (N) ←──→ Service            [table de liaison: dc_services]
DC (N) ←──→ Procédure          [table de liaison: dc_procedures]
DC (N) ←──→ Table              [table de liaison: dc_tables]
DC (N) ←──→ Attribut           [table de liaison: dc_attributs]
Archive (1) ──── (N) DC
```

### Tables SQL

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
    modifie_bdd BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE masque_services (
    id SERIAL PRIMARY KEY,
    masque_id INT REFERENCES masques(id) ON DELETE CASCADE,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(masque_id, service_id)
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
-- COUCHE TRAÇABILITÉ
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'developer',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE archives (
    id SERIAL PRIMARY KEY,
    identifiant VARCHAR(50) UNIQUE NOT NULL,
    date_push TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dcs (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT NOW(),
    auteur_id INT REFERENCES users(id),
    etape_id INT REFERENCES etapes(id),
    archive_id INT REFERENCES archives(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dc_masques (
    id SERIAL PRIMARY KEY,
    dc_id INT REFERENCES dcs(id) ON DELETE CASCADE,
    masque_id INT REFERENCES masques(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT
);

CREATE TABLE dc_services (
    id SERIAL PRIMARY KEY,
    dc_id INT REFERENCES dcs(id) ON DELETE CASCADE,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT
);

CREATE TABLE dc_procedures (
    id SERIAL PRIMARY KEY,
    dc_id INT REFERENCES dcs(id) ON DELETE CASCADE,
    procedure_id INT REFERENCES procedures_stockees(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT
);

CREATE TABLE dc_tables (
    id SERIAL PRIMARY KEY,
    dc_id INT REFERENCES dcs(id) ON DELETE CASCADE,
    table_id INT REFERENCES tables_info(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT
);

CREATE TABLE dc_attributs (
    id SERIAL PRIMARY KEY,
    dc_id INT REFERENCES dcs(id) ON DELETE CASCADE,
    attribut_id INT REFERENCES attributs(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT
);
```

---

## 6. Fonctionnalités

### Fonctionnalités Core

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| F1 | Authentification | Login email + mot de passe, JWT, session sécurisée |
| F2 | Dashboard | Vue d'ensemble avec compteurs et activité récente |
| F3 | Navigation métier | Arborescence dépliable Domaine → Process → Étape |
| F4 | Schéma de process | Flux visuel auto-généré des étapes (boîtes cliquables + flèches) |
| F5 | Fiche masque | Détail d'un masque avec services, procédures, tables, attributs |
| F6 | Création de DC | Formulaire par sections (contexte métier + impacts techniques) |
| F7 | Impact Explorer | Vue arborescente de tous les éléments impactés par une DC |
| F8 | Historique par élément | Pour tout élément, lister toutes les DC qui l'ont modifié |
| F9 | Recherche globale | Recherche par code masque, nom service, numéro DC, etc. |

### Fonctionnalités avancées

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| F10 | Archivage | Rattacher une DC à un identifiant d'archivage (push de déploiement) |
| F11 | Réordonnancement | Modifier l'ordre des étapes (boutons haut/bas ou glisser-déposer) |
| F12 | Import initial | Charger une première liste de domaines/process si fournie par AGB |

### Cascade technique (logique métier)

```
Masque (toujours requis)
  └── Service ? (optionnel — un masque peut n'avoir aucun service listé)
        └── Modifie la BDD ? (case à cocher)
              ├── OUI → Procédure stockée (requise) → Table(s) → Attribut(s)
              └── NON → le formulaire s'arrête ici
```

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
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Domaines │ │ Process  │ │ Étapes   │ │ Masques  │   │
│  │    7     │ │   18     │ │   45     │ │   120    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Services │ │ Tables   │ │ DC       │                 │
│  │    85    │ │    60    │ │   230    │                 │
│  └──────────┘ └──────────┘ └──────────┘                 │
│                                                          │
│  Activité récente                                        │
│  ─────────────────────────────────────────────────────── │
│  DC-1501  Ajouter bouton export  Commerce  il y a 2h    │
│  DC-1500  Type client            Commerce  il y a 1j    │
│  CE2100   Modifié par DC-1500              il y a 1j    │
└──────────────────────────────────────────────────────────┘
```

### Demandes de changement — Liste

```
┌──────────────────────────────────────────────────────────┐
│  Demandes de changement              [+ Nouvelle DC]    │
│                                                          │
│  Rechercher : [DC-1500 ou mot-clé...]                   │
│                                                          │
│  N°       Titre                    Date       Archive    │
│  ─────────────────────────────────────────────────────── │
│  DC-1501  Ajouter export PDF       15/09/26   1501      │
│  DC-1500  Type client ouverture    14/09/26   1500      │
│  DC-1499  Modifier seuil crédit    12/09/26   —         │
│  DC-1498  Corriger validation      10/09/26   1500      │
└──────────────────────────────────────────────────────────┘
```

### Création de DC — Formulaire par sections

```
┌──────────────────────────────────────────────────────────┐
│  Nouvelle demande de changement                          │
│                                                          │
│  ── Informations générales ───────────────────────────── │
│  Numéro :    [DC-1502          ]                         │
│  Titre :     [Ajouter export PDF]                        │
│  Description:[Ajouter un bouton d'export PDF sur l'écran]│
│                                                          │
│  ── Contexte métier ──────────────────────────────────── │
│  Domaine  :  [ Commerce        ▼]                        │
│  Processus:  [ Ouverture de compte ▼]                    │
│  Étape    :  [ Saisie des informations ▼]                │
│                                                          │
│  ── Masques impactés ─────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐     │
│  │ [✓] CE2100 — Écran saisie client  Action: Modifié│    │
│  │     Détails: [Ajout bouton export en haut]      │     │
│  │ [+ Ajouter un masque]                           │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ── Services impactés ────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐     │
│  │ [✓] ExportService  Action: Ajouté               │     │
│  │     Détails: [Nouveau service d'export PDF]     │     │
│  │ [+ Ajouter un service]                          │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ── Procédures stockées ──────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐     │
│  │ [✓] SP_EXPORT_PDF  Action: Ajoutée              │     │
│  │     Détails: [Génère le PDF des données client] │     │
│  │ [+ Ajouter une procédure]                       │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ── Tables impactées ─────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐     │
│  │ [✓] EXPORT_LOG  Action: Ajoutée                 │     │
│  │     Détails: [Journal des exports réalisés]     │     │
│  │ [+ Ajouter une table]                           │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ── Attributs impactés ───────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Table: EXPORT_LOG                                │     │
│  │ [✓] EXPORT_DATE  Type: date   Action: Ajouté   │     │
│  │ [✓] EXPORT_USER  Type: texte  Action: Ajouté   │     │
│  │ [+ Ajouter un attribut]                         │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  Archivage : [1502 ▼]  (optionnel, rempli après push)   │
│                                                          │
│              [Annuler]  [Enregistrer la DC]              │
└──────────────────────────────────────────────────────────┘
```

### Détail DC + Impact Explorer

```
┌──────────────────────────────────────────────────────────┐
│  DC-1500 — Ajouter le type de client                     │
│                                                          │
│  Date : 14/09/26   Auteur : Jean Dupont   Archive : 1500│
│  Description : Ajout du champ CUSTOMER_TYPE pour         │
│  distinguer particulier / entreprise                     │
│                                                          │
│  ── Contexte métier ──────────────────────────────────── │
│  Commerce → Ouverture de compte → Saisie informations    │
│                                                          │
│  ── Impact technique (arborescence) ──────────────────── │
│                                                          │
│  CE2100 (Modifié)                                        │
│    └── CustomerService (Modifié)                         │
│          └── SP_CREATE_CUSTOMER (Modifiée)               │
│                └── CUSTOMER (Modifiée)                   │
│                      └── CUSTOMER_TYPE (Ajouté)          │
│                                                          │
│  ── Liste plate ──────────────────────────────────────── │
│                                                          │
│  Élément                Type        Action     Détails   │
│  ─────────────────────────────────────────────────────── │
│  CE2100                 Masque      Modifié    [voir]    │
│  CustomerService        Service     Modifié    [voir]    │
│  SP_CREATE_CUSTOMER     Procédure   Modifiée   [voir]    │
│  CUSTOMER               Table       Modifiée   [voir]    │
│  CUSTOMER_TYPE          Attribut    Ajouté     [voir]    │
│                                                          │
│              [Modifier]  [Archiver]                      │
└──────────────────────────────────────────────────────────┘
```

### Fiche Masque (clic sur CE2100)

```
┌──────────────────────────────────────────────────────────┐
│  CE2100 — Écran de saisie client                         │
│                                                          │
│  Contexte métier                                         │
│    Commerce → Ouverture de compte → Saisie informations  │
│    Commerce → Modification client → Mise à jour          │
│                                                          │
│  Services utilisés                                       │
│    → CustomerService (GET, POST)                         │
│    → ValidationService (POST)                            │
│                                                          │
│  Historique des modifications                            │
│  ─────────────────────────────────────────────────────── │
│  DC-1500  Type client           14/09/26  [voir]         │
│  DC-1432  Ajouter bouton export 01/09/26  [voir]         │
│  DC-1278  Modifier validation   15/08/26  [voir]         │
└──────────────────────────────────────────────────────────┘
```

### Sidebar

```
┌────────────────────────────┐
│ SGB TechTrace              │
│                            │
│  ● Dashboard               │
│                            │
│  ● Demandes de changement  │
│                            │
│  ● Métiers                 │
│     ├ Commerce             │
│     │  ├ Ouverture compte  │
│     │  └ Modification      │
│     ├ Crédit               │
│     └ ...                  │
│                            │
│  ● Historique              │
│                            │
│  ● Recherche               │
└────────────────────────────┘
```

---

## 8. API REST

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion, retourne JWT |
| POST | `/api/auth/register` | Inscription |

### Domaines

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/domaines` | Liste des domaines (avec compteur de process) |
| GET | `/api/domaines/{id}` | Détail d'un domaine + ses process |
| POST | `/api/domaines` | Créer un domaine |
| PUT | `/api/domaines/{id}` | Modifier un domaine |
| DELETE | `/api/domaines/{id}` | Supprimer un domaine |

### Processes

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
| GET | `/api/processes/{process_id}/etapes` | Étapes d'un process (triées par ordre) |
| GET | `/api/etapes/{id}` | Détail d'une étape + masques associés |
| POST | `/api/processes/{process_id}/etapes` | Créer une étape |
| PUT | `/api/etapes/{id}` | Modifier une étape |
| DELETE | `/api/etapes/{id}` | Supprimer une étape |
| PUT | `/api/etapes/{id}/reorder` | Réordonner les étapes |

### Masques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/masques` | Liste (avec recherche par code ?search=CE2100) |
| GET | `/api/masques/{id}` | Détail + services + historique DC |
| POST | `/api/masques` | Créer un masque |
| PUT | `/api/masques/{id}` | Modifier un masque |
| DELETE | `/api/masques/{id}` | Supprimer un masque |

### Services

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/services` | Liste |
| GET | `/api/services/{id}` | Détail + procédures |
| POST | `/api/services` | Créer un service |
| PUT | `/api/services/{id}` | Modifier un service |
| DELETE | `/api/services/{id}` | Supprimer un service |

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
| GET | `/api/tables/{id}` | Détail + attributs + historique DC |
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

### Demandes de changement

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dcs` | Liste des DC |
| GET | `/api/dcs/{id}` | Détail DC + Impact Explorer |
| POST | `/api/dcs` | Créer une DC avec impacts |
| PUT | `/api/dcs/{id}` | Modifier une DC |
| DELETE | `/api/dcs/{id}` | Supprimer une DC |
| POST | `/api/dcs/{id}/archive` | Archiver une DC |

### Archives

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/archives` | Liste des archivages |
| GET | `/api/archives/{id}` | Détail d'un archivage + DC incluses |

### Recherche

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/search?q=...` | Recherche globale (masques, services, tables, DC) |

### Statistiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/stats` | Compteurs pour le dashboard |

---

## 9. Plan de développement

| Semaine | Jours | Tâches |
|---------|-------|--------|
| **S1** | J1-J2 | Setup projet, schema complet, configuration FastAPI + PostgreSQL |
| **S1** | J3-J5 | Backend : auth JWT + tous les endpoints CRUD |
| **S2** | J6-J7 | Frontend : Layout + Sidebar + Login + Dashboard |
| **S2** | J8-J10 | Pages métier : Domaines, Process (avec schéma auto-généré), Étapes |
| **S3** | J11-J12 | Pages technique : Masques, Services, Tables, Attributs |
| **S3** | J13-J15 | DC : création avec formulaire par sections + Impact Explorer |
| **S4** | J16-J17 | Historique par élément + recherche globale |
| **S4** | J18-J19 | Seed réaliste + polish UI + responsive |
| **S4** | J20 | Préparation soutenance + démo |

---

## 10. Installation et démarrage

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

# Créer les tables
alembic upgrade head

# Peupler les données de démo
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

## 11. Données de démonstration

Le script `seed.py` peuple la base avec des données fictives mais réalistes pour la démonstration.

### Domaines de démo

| Domaine | Description |
|---------|-------------|
| Commerce | Gestion des opérations commerciales |
| Crédit | Gestion des crédits et prêts |
| Monétique | Opérations de carte bancaire |
| Clientèle | Gestion des informations clients |
| Compensation | Opérations de compensation interbancaire |

### Processus de démo (exemple Commerce)

| Processus | Étapes |
|-----------|--------|
| Ouverture de compte | 1. Saisie des informations → 2. Vérification identité → 3. Validation → 4. Confirmation |
| Modification client | 1. Consultation → 2. Modification → 3. Validation |
| Clôture de compte | 1. Demande → 2. Vérification soldes → 3. Clôture → 4. Confirmation |

### Attribution de démo

| Masque | Services | Procédures | Tables |
|--------|----------|------------|--------|
| CE2100 | CustomerService, ValidationService | SP_CREATE_CUSTOMER | CUSTOMER, ACCOUNT |
| CE2200 | AccountService | SP_CREATE_ACCOUNT | ACCOUNT, ACCOUNT_TYPE |
| CE2300 | TransferService | SP_EXECUTE_TRANSFER | TRANSFER, ACCOUNT |

---

## 12. Perspectives

### Court terme (fin de stage)

- Compléter toutes les pages CRUD
- Optimiser l'Impact Explorer
- Améliorer la recherche globale
- Préparer la démo de soutenance

### Moyen terme

- Import/export de données
- Statistiques avancées (nombre de DC par domaine, tendances)
- Intégration à l'Active Directory pour l'authentification
- Notification des modifications en temps réel

### Long terme

- Assistant IA pour suggerer le contexte métier et les éléments techniques à partir d'une description de DC
- Migration vers .NET si maintenance par l'équipe existante
- Intégration avec les outils de CI/CD pour tracer les déploiements

---

## Équipe

- **Développeur** : [Votre nom]
- **Encadrant** : [Nom de l'encadrante AGB]
- **Période** : [Dates du stage]
- **Entreprise** : AGB — Département Développement

---

## Licence

Projet interne AGB — Usage exclusivement interne.
