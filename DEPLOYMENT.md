# Déploiement (gratuit) — Netlify + Render + Supabase

Stack de production, 100 % gratuite :

| Partie | Hôte | Rôle |
|---|---|---|
| Frontend (React/Vite) | **Netlify** (plan Starter) | Hébergement statique + domaine `*.netlify.app` |
| Backend (FastAPI) | **Render** (plan Free) | API Python, migrations Alembic |
| Base de données | **Supabase** (plan Free) | PostgreSQL (500 Mo) — projet du développement réutilisé |
| Images de masques | **Supabase Storage** | Déjà utilisé en développement |

> **À savoir avant de commencer** — les limites du plan gratuit :
> - Le backend Render **dort après 15 min d'inactivité** : la première
>   requête ensuite met 30–60 s à répondre (réveil), puis tout est normal.
> - 750 heures d'instance par mois (largement suffisant pour un seul service).
> - Ne **pas** utiliser le Postgres gratuit de Render : il expire au bout de
>   30 jours. On utilise celui de Supabase, qui n'expire pas.
> - Supabase gratuit : 500 Mo de base, 1 Go de stockage, 2 projets maximum.
> - Netlify remplace Vercel : Vercel bloque la création de compte sur la
>   vérification par téléphone (certains numéros rejetés).

## URLs de production

| Service | URL |
|---|---|
| Site (frontend) | `https://sgbackstage.netlify.app` |
| API (backend) | `https://sgb-techtrace-api.onrender.com` |
| Swagger | `https://sgb-techtrace-api.onrender.com/docs` |
| Admin Netlify | `https://app.netlify.com/projects/sgbackstage` |

---

## Étape 0 — Comptes et dépôt GitHub

Comptes gratuits : [netlify.com](https://netlify.com), [render.com](https://render.com)
(la base Supabase du développement est réutilisée telle quelle).

Le dépôt GitHub `RezzougAmira/SGBackstage` doit contenir à la racine :
`render.yaml` (backend Render) et `netlify.toml` (build frontend).

## Étape 1 — Base de données (Supabase, projet dev réutilisé)

Pas de nouveau projet : on réutilise le projet Supabase du développement.
Récupérer dans `backend/.env` :
- `DATABASE_URL` — mais en prod, remplacer le port **5432** par le pooler
  « transaction » **6543** et ajouter `?sslmode=require` :
  ```
  postgresql://postgres.xxxxx:PASSWORD@aws-0.region.pooler.supabase.com:6543/postgres?sslmode=require
  ```
  (le port 5432 est en mode « session », déconseillé en production)
- `SUPABASE_URL` et `SUPABASE_KEY` (clé **service_role**) — identiques au dev.

Les migrations Alembic sont appliquées automatiquement à chaque démarrage
du backend Render (`alembic upgrade head` dans le `startCommand`) — inutile
de les lancer manuellement.

## Étape 2 — Backend sur Render

1. Dashboard Render → **New +** → **Blueprint** → connecter le repo GitHub.
2. Render détecte `render.yaml` à la racine : vérifier le service
   `sgb-techtrace-api`, puis **Apply**.
3. Dans l'onglet **Environment** du service, ajouter :
   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | URL Supabase de l'étape 1 (port 6543, avec `sslmode=require`) |
   | `SUPABASE_URL` | Identique au `.env` de développement |
   | `SUPABASE_KEY` | Idem — clé **service_role** |
   | `ALLOWED_ORIGINS` | `https://sgbackstage.netlify.app` (étape 5) |
   | `JWT_SECRET` | Généré automatiquement par Render |
   | `PYTHON_VERSION` | `3.12.7` (déjà dans le render.yaml) |
4. **Save** → le build démarre (~5-10 min). Vérifier l'API :
   `https://sgb-techtrace-api.onrender.com/docs` (Swagger) et
   `https://sgb-techtrace-api.onrender.com/api/stats` (doit retourner
   les compteurs — confirme que la base est joignable).

## Étape 3 — Frontend sur Netlify (CLI)

```powershell
npm install -g netlify-cli   # une seule fois
netlify login                # autorisation via le navigateur
netlify sites:create --name sgbackstage   # crée https://sgbackstage.netlify.app
```

Puis build **avec l'URL de l'API** (elle est gravée dans le JS au build) :

```powershell
$env:VITE_API_URL = "https://sgb-techtrace-api.onrender.com"
cd frontend
npm run build
cd ..
netlify deploy --dir=frontend/dist --prod
```

> Le `netlify.toml` à la racine configure le dossier `frontend`, la commande
> `npm run build`, la publication `dist/` et la redirection catch-all
> `/* → /index.html` (nécessaire pour les routes React type `/domaines/42`
> en accès direct). Sur Netlify, `.env` n'est pas lu : la variable
> `VITE_API_URL` doit être définie **avant** le build comme ci-dessus, ou
> déclarée dans le dashboard Netlify (Site configuration → Environment
> variables) si on branche le déploiement Git.

## Étape 4 — Relier le frontend au backend (CORS)

Le frontend et l'API sont sur des domaines différents : le navigateur impose
la règle CORS, l'API doit déclarer les origines autorisées.

1. Dashboard Render → service `sgb-techtrace-api` → onglet **Environment**.
2. Variable `ALLOWED_ORIGINS` = `https://sgbackstage.netlify.app` → **Save**
   (Render redéploie automatiquement, ~2 min).
3. Vérifier que l'API renvoie le header (PowerShell) :
   ```powershell
   (Invoke-WebRequest -Uri https://sgb-techtrace-api.onrender.com/api/stats `
     -Headers @{Origin="https://sgbackstage.netlify.app"}).Headers["Access-Control-Allow-Origin"]
   ```
   → doit afficher `https://sgbackstage.netlify.app`.
4. Ouvrir `https://sgbackstage.netlify.app` : la page de connexion fonctionne.

> Sans cette étape, le site charge mais **tout login échoue** : l'API rejette
> les requêtes venant d'une origine non déclarée.

## Étape 5 — Comptes utilisateurs

La base de production est celle du développement (projet Supabase réutilisé) :
les comptes existants (dont l'admin) fonctionnent déjà sur le site déployé.

Pour un **nouveau** compte :
1. `POST /api/auth/register` (Swagger `/docs` ou la page d'inscription).
2. Dans Supabase → **SQL Editor** pour promouvoir admin :
   ```sql
   update users set role = 'admin' where email = 'mon.email@agb.com';
   ```

---

## Mises à jour futures

| Quoi modifier | Procédure |
|---|---|
| **Backend** | `git push` sur `main` → Render redéploie automatiquement (migrations rejouées au démarrage) |
| **Frontend** | Re-build + `netlify deploy --dir=frontend/dist --prod` (voir étape 3) |

Pour de l'auto-déploiement du frontend : dans le dashboard Netlify →
*Site configuration → Build & deploy → connecter le repo GitHub*, root
directory `frontend`, et déclarer la variable d'environnement de build
`VITE_API_URL=https://sgb-techtrace-api.onrender.com` (le `netlify.toml`
fournit déjà le reste de la config).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Le site charge mais le login (et tout appel API) échoue | `ALLOWED_ORIGINS` sur Render ne contient pas exactement `https://sgbackstage.netlify.app` (sans `/` final) |
| Première requête très lente (~1 min) | Normal : le service gratuit se réveille après 15 min d'inactivité |
| Erreur 500 « server closed the connection » | `DATABASE_URL` sans `?sslmode=require`, port 5432 au lieu de 6543, ou URL du pooler local (`localhost`) collée par erreur |
| 404 sur une route React type `/domaines/42` au refresh | Redirection SPA manquante — vérifier `netlify.toml` (catch-all `/* → /index.html`) |
| Images de masques non affichées | `SUPABASE_KEY` n'est pas la clé **service_role** |
| `VITE_API_URL` ignorée en prod | Variable définie après le build, ou site déployé sans `$env:VITE_API_URL` devant `npm run build` |
| `pip install` échoue sur Render | `PYTHON_VERSION` mal défini dans `render.yaml` — mettre une version 3.12.x exacte disponible sur Render |
