# HGWF Cargo — Site web

Monorepo de la refonte du site HGWF Cargo. Frontend **Next.js** exporté en statique vers **OVH mutualisé**, administré via **Sanity Studio** (hébergé gratuitement par Sanity).

## Structure

- `apps/web` — frontend Next.js 16 (export statique) → OVH
- `apps/studio` — Sanity Studio (admin) → `*.sanity.studio`
- `packages/shared` — types/constantes partagés (locales FR/EN)

## Prérequis

- Node `>=20` (voir `.nvmrc` : 22). pnpm via Corepack : `corepack enable` (la version est épinglée par le champ `packageManager` de `package.json`).
- Un projet Sanity (`projectId` + dataset `production`).

## Installation

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # renseigner le projectId
cp apps/studio/.env.example apps/studio/.env          # renseigner le projectId
```

## Développement

```bash
pnpm dev:web      # http://localhost:3000
pnpm dev:studio   # http://localhost:3333
```

## Build & qualité

```bash
pnpm build:web    # génère apps/web/out (statique)
pnpm typecheck
pnpm lint
pnpm test
```

> ⚠️ **Le build statique nécessite un projet Sanity connecté avec au moins un `service` publié.**
> La route `/[locale]/services/[slug]` est générée via `generateStaticParams`, et sous
> `output: 'export'` Next.js refuse une route dynamique sans aucun paramètre. Renseigne donc
> `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` dans `apps/web/.env.local`
> (et en CI via les secrets) et publie au moins un service avant de lancer `pnpm build:web`.

## Déploiement

- **Frontend** : push sur `main` → GitHub Actions build + dépose `apps/web/out/` sur OVH par FTP.
  Secrets requis (Settings → Secrets → Actions) :
  `SANITY_PROJECT_ID`, `SANITY_DATASET`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.
- **Studio** : `pnpm --filter studio deploy` → publie sur `https://<nom>.sanity.studio`.

## Re-publication automatique (webhook Sanity)

manage.sanity.io → API → Webhooks → créer un webhook **on publish** :

- URL : `https://api.github.com/repos/<owner>/<repo>/dispatches`
- Méthode : `POST`
- Headers : `Authorization: Bearer <GITHUB_PAT>` *(PAT classique avec scope `repo`, ou fine-grained avec `contents: write`)*, `Accept: application/vnd.github+json`, `Content-Type: application/json`
- Body : `{ "event_type": "sanity-publish" }`

Chaque publication relance le build + déploiement.

## Architecture

Le contenu Sanity est lu **au build**. OVH ne sert que des fichiers statiques (pas de Node.js).
Toute interactivité backend (formulaire de devis…) passera par un service externe — voir la spec
`docs/superpowers/specs/2026-06-25-hgwf-cargo-foundations-design.md` et le plan
`docs/superpowers/plans/2026-06-25-hgwf-cargo-foundations.md`.
