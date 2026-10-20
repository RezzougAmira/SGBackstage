# Déploiement (gratuit) — Vercel + Render + Supabase

Stack de production, 100 % gratuite :

| Partie | Hôte | Rôle |
|---|---|---|
| Frontend (React/Vite) | **Vercel** (plan Hobby) | Hébergement statique + domaine `*.vercel.app` |
| Backend (FastAPI) | **Render** (plan Free) | API Python, migrations Alembic |
| Base de données | **Supabase** (plan Free) | PostgreSQL (500 Mo) |
| Images de masques | **Supabase Storage** | Déjà utilisé en développement |

> **À savoir avant de commencer** — les limites du plan gratuit :
> - Le backend Render **dort après 15 min d'inactivité** : la première
>   requête ensuite met 30–60 s à répondre (réveil), puis tout est normal.
> - 750 heures d'instance par mois (largement suffisant pour un seul service).
> - Ne **pas** utiliser le Postgres gratuit de Render : il expire au bout de
>   30 jours. On utilise celui de Supabase, qui n'expire pas.
> - Supabase gratuit : 500 Mo de base, 1 Go de stockage, 2 projets maximum.

---

## Étape 0 — Comptes et dépôt GitHub

Créer les comptes gratuits (avec l'adresse e-mail professionnelle) :
[vercel.com](https://vercel.com), [render.com](https://render.com),
[supabase.com](https://supabase.com) (probablement déjà fait pour Storage).

Pousser le projet sur GitHub (le dépôt doit contenir `render.yaml` à la
racine, ainsi que `backend/` et `frontend/`).

## Étape 1 — Base de données de production (Supabase)

1. Dans le dashboard Supabase : **New project** (ex. `sgb-techtrace-prod`).
2. Noter le **password** de la base à la création (ou le régénérer dans
   *Settings > Database*).
3. Récupérer l'URL de connexion : **Settings > Database > Connection string**
   → onglet **URI** (ou *Session pooler*, port **6543**, IPv4). Elle ressemble à :
   ```
   postgresql://postgres.xxxxx:PASSWORD@aws-0.region.pooler.supabase.com:6543/postgres
   ```
   Ajouter `?sslmode=require` en fin d'URL si ce n'est pas déjà le cas.
4. Appliquer les migrations Alembic depuis le poste de développement :
   ```powershell
   cd backend
   $env:DATABASE_URL = "postgresql://...copiée ci-dessus...?sslmode=require"
   python -m alembic upgrade head
   ```
   (Render les refera de toute façon à chaque démarrage — c'est idempotent.)

## Étape 2 — Backend sur Render

1. Dashboard Render → **New +** → **Blueprint** → connecter le repo GitHub.
2. Render détecte `render.yaml` à la racine : vérifier le service
   `sgb-techtrace-api`, puis **Apply**.
3. Dans l'onglet **Environment** du service, renseigner :
   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | URL Supabase de l'étape 1 (avec `sslmode=require`) |
   | `SUPABASE_URL` | Identique au `.env` de développement |
   | `SUPABASE_KEY` | Idem — clé **service_role** |
   | `ALLOWED_ORIGINS` | Vide pour l'instant (remplie à l'étape 4) |
   | `JWT_SECRET` | Déjà généré automatiquement par Render |
4. **Save** → le build démarre. Quand il se termine, ouvrir
   `https://sgb-techtrace-api.onrender.com/docs` : la page Swagger doit
   s'afficher. L'API est en ligne.

## Étape 3 — Frontend sur Vercel

1. [vercel.com/new](https://vercel.com/new) → importer le repo GitHub.
2. Vercel détecte Vite. Renseigner :
   | Réglage | Valeur |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Environment Variables** | `VITE_API_URL` = `https://sgb-techtrace-api.onrender.com` |
3. **Deploy**. Le site est en ligne sur `https://<projet>.vercel.app`
   (le `vercel.json` présent garantit que les routes React type
   `/profil` fonctionnent en accès direct).

## Étape 4 — Relier le frontend au backend (CORS)

1. Copier l'URL Vercel (ex. `https://sgb-techtrace.vercel.app`).
2. Sur Render, dans *Environment* du service API :
   `ALLOWED_ORIGINS=https://sgb-techtrace.vercel.app` → **Save**
   (Render redéploie automatiquement).
3. Ouvrir le site Vercel → la page de connexion doit fonctionner.

## Étape 5 — Créer le premier compte admin

Le base de production est vide. Créer un compte puis le promouvoir :

1. Sur le site déployé, passer par l'inscription si elle est exposée, ou
   créer le compte via l'API : `POST /api/auth/register`
   (curl ou la page Swagger `/docs`).
2. Dans Supabase → **SQL Editor** :
   ```sql
   update users set role = 'admin' where email = 'mon.email@agb.com';
   ```

---

## Mises à jour futures

`git push` sur la branche principale suffit : Vercel **et** Render
redéploient automatiquement le frontend et l'API (les migrations Alembic
sont rejouées au démarrage du backend).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Le site charge mais tout appel API échoue (erreur CORS) | `ALLOWED_ORIGINS` sur Render ne contient pas (ou contient avec `/` final) l'URL Vercel |
| Première requête très lente (~1 min) | Normal : le service gratuit se réveille après 15 min d'inactivité |
| Erreur 500 « server closed the connection » | `DATABASE_URL` sans `?sslmode=require`, ou URL du pooler local (`localhost`) collée par erreur |
| Images de masques non affichées | `SUPABASE_KEY` n'est pas la clé **service_role** |
| `pip install` échoue sur Render | `PYTHON_VERSION` mal défini dans `render.yaml` — mettre une version 3.12.x exacte disponible sur Render |
