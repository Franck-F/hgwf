# HGWF Cargo — Fondations techniques — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place un monorepo pnpm (frontend Next.js export statique + Studio Sanity) déployable sur OVH mutualisé, bilingue FR/EN, prêt à recevoir le design définitif.

**Architecture:** Next.js 16 en `output: 'export'` lit le contenu Sanity au build et génère un site 100% statique servi par OVH mutualisé. Le Studio Sanity (admin) est un paquet séparé hébergé gratuitement chez Sanity. GitHub Actions build + dépose les fichiers sur OVH par FTP ; un webhook Sanity redéclenche le build à chaque publication.

**Tech Stack:** pnpm workspace · Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS v4 · next-intl 4 · next-sanity / Sanity Studio v3 · `@sanity/document-internationalization` · Vitest · GitHub Actions + FTP-Deploy-Action.

## Global Constraints

- Node : `>=20` (CI sur Node 22 ; local Node 25 OK). Gestionnaire : **pnpm** uniquement.
- Frontend : **Next.js 16.2.4**, **React 19.2.4**, **Tailwind CSS v4**, **TypeScript 5 strict**. Aligné sur le projet AuditIQ existant.
- `apps/web/next.config.ts` DOIT contenir `output: 'export'`. **Aucune** route API, middleware, ni fonctionnalité runtime serveur dans `apps/web` (OVH mutualisé = pas de Node.js).
- i18n : locales `['fr', 'en']`, `defaultLocale: 'fr'`, préfixe d'URL toujours présent (`/fr/...`, `/en/...`). Pas de middleware (incompatible export statique).
- Images : `next/image` avec **loader Sanity CDN** custom (pas d'optimisation Next côté serveur).
- Sanity : i18n **niveau document** via `@sanity/document-internationalization`, langues `fr` / `en`.
- Secrets (Sanity projectId, FTP OVH, GitHub PAT) ne sont JAMAIS commités : `.env*` ignorés, valeurs via secrets CI.
- Commits : messages en français, terminés par `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## Structure des fichiers (cible)

```
hgwf-cargo/
├── package.json                      # racine, private, scripts workspace
├── pnpm-workspace.yaml               # apps/*, packages/*
├── .nvmrc                            # 22
├── .prettierrc.json                  # config Prettier partagée
├── tsconfig.base.json                # options TS strict partagées
├── README.md                         # prise en main
├── packages/shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts                  # locales, type Locale, isLocale()
├── apps/web/
│   ├── package.json
│   ├── next.config.ts                # output: 'export' + loader image
│   ├── tsconfig.json
│   ├── postcss.config.mjs            # @tailwindcss/postcss
│   ├── eslint.config.mjs
│   ├── vitest.config.ts
│   ├── .env.local.example
│   ├── messages/{fr,en}.json
│   └── src/
│       ├── i18n/{routing,request}.ts
│       ├── sanity/{client,image-loader,queries}.ts
│       ├── app/
│       │   ├── page.tsx              # redirection statique vers /fr
│       │   ├── layout.tsx            # <html> racine minimal
│       │   └── [locale]/
│       │       ├── layout.tsx        # provider next-intl + header/footer
│       │       └── page.tsx          # accueil de démonstration
│       └── components/{Header,Footer}.tsx
├── apps/studio/
│   ├── package.json
│   ├── sanity.config.ts              # plugins + document-internationalization
│   ├── sanity.cli.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── schemaTypes/
│       ├── index.ts
│       ├── singletons/{siteSettings,navigation,footer}.ts
│       ├── objects/{hero,blocServices,blocDestinations,blocConteneurs,bandeauCTA,faqSection,temoignages,texteRiche}.ts
│       └── documents/{page,service,destination,profil,faqItem,temoignage}.ts
└── .github/workflows/deploy.yml      # build + FTP OVH + repository_dispatch
```

---

## Prérequis manuels (à réaliser par l'utilisateur — nécessitent ses comptes)

Ces étapes ne sont pas automatisables par un agent car elles requièrent des identifiants. Le plan référence leurs résultats (env vars, secrets).

- **P1 — Projet Sanity :** créer un projet sur https://www.sanity.io/manage (ou `pnpm dlx sanity@latest login` puis init dans `apps/studio`). Récupérer `projectId` et créer un dataset `production`. → utilisé par `apps/studio/.env` et `apps/web/.env.local`.
- **P2 — Dépôt GitHub :** créer le dépôt distant et `git remote add origin …`.
- **P3 — Secrets GitHub** (Settings → Secrets → Actions) : `SANITY_PROJECT_ID`, `SANITY_DATASET`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR` (chemin OVH, ex. `/www/`).
- **P4 — Webhook Sanity** (après Task 7) : manage.sanity.io → API → Webhooks → POST vers l'API GitHub `repository_dispatch` avec un PAT (documenté dans le README).

> Le build et le `studio dev` fonctionnent en local dès que P1 fournit `projectId` + `dataset`. Sans P1, certaines étapes de vérification de contenu retournent un dataset vide (build OK quand même, contenu vide géré proprement).

---

## Task 1: Fondation monorepo + paquet partagé

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.prettierrc.json`, `tsconfig.base.json`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

**Interfaces:**
- Produces: paquet `@hgwf/shared` exportant `locales: readonly ['fr','en']`, `type Locale`, `defaultLocale: 'fr'`, `isLocale(value: string): value is Locale`.

- [ ] **Step 1: Créer `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Créer `.nvmrc`**

```
22
```

- [ ] **Step 3: Créer le `package.json` racine**

```json
{
  "name": "hgwf-cargo",
  "private": true,
  "packageManager": "pnpm@11.6.4",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:studio": "pnpm --filter studio dev",
    "build:web": "pnpm --filter web build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "prettier": "^3.4.2",
    "typescript": "^5"
  }
}
```

- [ ] **Step 4: Créer `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 5: Créer `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

- [ ] **Step 6: Créer `packages/shared/package.json`**

```json
{
  "name": "@hgwf/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "echo 'no lint for shared'",
    "test": "echo 'no tests for shared'"
  }
}
```

- [ ] **Step 7: Créer `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 8: Écrire le test (TDD) — sera relancé en Task 2 (vitest vit dans apps/web)**

Crée provisoirement le test dans le paquet web une fois vitest dispo (Task 2, Step de test). Pour l'instant, écris l'implémentation directement (logique triviale et typée). Fichier `packages/shared/src/index.ts` :

```ts
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
```

- [ ] **Step 9: Installer et vérifier le typecheck**

Run: `pnpm install && pnpm --filter @hgwf/shared typecheck`
Expected: install OK, `tsc --noEmit` sans erreur (exit 0).

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-workspace.yaml .nvmrc .prettierrc.json tsconfig.base.json packages/
git commit -m "$(printf 'chore: fondation monorepo pnpm + paquet @hgwf/shared (locales)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 2: `apps/web` — Next.js en export statique + Tailwind v4 + Vitest

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/next-env.d.ts` (généré), `apps/web/postcss.config.mjs`, `apps/web/eslint.config.mjs`, `apps/web/vitest.config.ts`
- Create: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: rien.
- Produces: app Next buildable en statique ; commande `pnpm --filter web build` → `apps/web/out/`.

- [ ] **Step 1: Créer `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hgwf/shared": "workspace:*",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Créer `apps/web/next.config.ts` (export statique)**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
```

> Le loader image Sanity sera ajouté à cette config en Task 6 (une fois le fichier loader créé). On ne le référence pas avant pour ne pas casser le build.

- [ ] **Step 3: Créer `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Créer `apps/web/postcss.config.mjs`**

```js
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};
export default config;
```

- [ ] **Step 5: Créer `apps/web/eslint.config.mjs`**

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [...compat.extends('next/core-web-vitals', 'next/typescript')];
export default eslintConfig;
```

> Si `@eslint/eslintrc` manque, l'ajouter en devDependency. (eslint-config-next l'embarque généralement.)

- [ ] **Step 6: Créer `apps/web/src/app/globals.css` (Tailwind v4)**

```css
@import 'tailwindcss';
```

- [ ] **Step 7: Créer `apps/web/src/app/layout.tsx` (racine minimale)**

```tsx
import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

> La balise `<html>` est posée par le layout `[locale]` (Task 4) pour gérer l'attribut `lang`. Ce layout racine ne fait que charger le CSS global.

- [ ] **Step 8: Créer `apps/web/src/app/page.tsx` (redirection statique vers /fr)**

```tsx
export default function RootPage() {
  return (
    <html lang="fr">
      <head>
        <meta httpEquiv="refresh" content="0; url=/fr" />
        <link rel="canonical" href="/fr" />
      </head>
      <body>
        <p>
          Redirection vers <a href="/fr">/fr</a>…
        </p>
      </body>
    </html>
  );
}
```

> Pas de `redirect()` serveur (incompatible export statique sur OVH). On émet une page racine `index.html` avec meta-refresh vers la locale par défaut.

- [ ] **Step 9: Créer `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 10: Écrire le test du paquet partagé (TDD rétroactif)**

Create `apps/web/src/shared.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { isLocale, defaultLocale, locales } from '@hgwf/shared';

describe('@hgwf/shared locales', () => {
  it('reconnaît les locales valides', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });
  it('rejette les locales inconnues', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
  it('expose fr par défaut', () => {
    expect(defaultLocale).toBe('fr');
    expect(locales).toEqual(['fr', 'en']);
  });
});
```

- [ ] **Step 11: Lancer le test**

Run: `pnpm --filter web test`
Expected: 3 tests PASS.

- [ ] **Step 12: Vérifier le build statique**

Run: `pnpm --filter web build`
Expected: build OK, dossier `apps/web/out/` créé contenant `index.html` (la page de redirection).

- [ ] **Step 13: Commit**

```bash
git add apps/web
git commit -m "$(printf 'feat(web): app Next.js export statique + Tailwind v4 + Vitest\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 3: i18n FR/EN (next-intl, rendu statique, sans middleware)

**Files:**
- Modify: `apps/web/package.json` (ajout `next-intl`)
- Create: `apps/web/src/i18n/routing.ts`, `apps/web/src/i18n/request.ts`
- Create: `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Create: `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `locales`, `defaultLocale`, `type Locale` de `@hgwf/shared`.
- Produces: routes statiques `/fr` et `/en` ; composants serveur utilisant `useTranslations`/`getTranslations`.

- [ ] **Step 1: Ajouter la dépendance**

Run: `pnpm --filter web add next-intl@^4.9.1`
Expected: ajout dans `apps/web/package.json` dependencies.

- [ ] **Step 2: Créer `apps/web/src/i18n/routing.ts`**

```ts
import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@hgwf/shared';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});
```

- [ ] **Step 3: Créer `apps/web/src/i18n/request.ts`**

```ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Brancher le plugin next-intl dans `next.config.ts`**

Modify `apps/web/next.config.ts` :

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export',
};

export default withNextIntl(nextConfig);
```

> Le loader image Sanity sera ajouté à cette config en Task 6 (Step dédié), une fois `src/sanity/image-loader.ts` créé.

- [ ] **Step 5: Créer les messages `apps/web/messages/fr.json`**

```json
{
  "Home": {
    "title": "HGWF Cargo — Transport de marchandises dans le monde entier",
    "tagline": "Votre partenaire de confiance pour le transport international de marchandises"
  },
  "Nav": { "home": "Accueil", "services": "Services", "destinations": "Destinations", "contact": "Contact" }
}
```

- [ ] **Step 6: Créer les messages `apps/web/messages/en.json`**

```json
{
  "Home": {
    "title": "HGWF Cargo — Worldwide freight forwarding",
    "tagline": "Your trusted partner for international freight"
  },
  "Nav": { "home": "Home", "services": "Services", "destinations": "Destinations", "contact": "Contact" }
}
```

- [ ] **Step 7: Créer `apps/web/src/app/[locale]/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Créer `apps/web/src/app/[locale]/page.tsx`**

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('tagline')}</p>
    </main>
  );
}
```

- [ ] **Step 9: Vérifier le build bilingue**

Run: `pnpm --filter web build`
Expected: build OK ; `apps/web/out/fr/index.html` et `apps/web/out/en/index.html` présents, plus `apps/web/out/index.html` (redirection).

Vérif rapide : `ls apps/web/out/fr apps/web/out/en` → chaque dossier contient un `index.html`.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "$(printf 'feat(web): i18n FR/EN statique avec next-intl (sans middleware)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 4: `apps/studio` — Sanity Studio + internationalisation document

**Files:**
- Create: `apps/studio/package.json`, `apps/studio/sanity.config.ts`, `apps/studio/sanity.cli.ts`, `apps/studio/tsconfig.json`, `apps/studio/.env.example`
- Create: `apps/studio/schemaTypes/index.ts` (vide au départ, rempli en Task 5)

**Interfaces:**
- Consumes: `projectId` / `dataset` via env (`SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`).
- Produces: Studio démarrable (`pnpm --filter studio dev`) et buildable (`pnpm --filter studio build`).

- [ ] **Step 1: Créer `apps/studio/package.json`**

```json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "sanity dev",
    "build": "sanity build",
    "deploy": "sanity deploy",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'studio lint via sanity'",
    "test": "echo 'no studio tests'"
  },
  "dependencies": {
    "@sanity/document-internationalization": "^3.3.0",
    "@sanity/vision": "^3",
    "react": "^19",
    "react-dom": "^19",
    "sanity": "^3",
    "styled-components": "^6"
  },
  "devDependencies": {
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Créer `apps/studio/.env.example`**

```
SANITY_STUDIO_PROJECT_ID=remplacer_par_projectId
SANITY_STUDIO_DATASET=production
```

> L'utilisateur copie ce fichier en `apps/studio/.env` avec les vraies valeurs (prérequis P1).

- [ ] **Step 3: Créer `apps/studio/sanity.cli.ts`**

```ts
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET,
  },
});
```

- [ ] **Step 4: Créer `apps/studio/sanity.config.ts`**

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { documentInternationalization } from '@sanity/document-internationalization';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

// Documents traduisibles (i18n niveau document)
const translatedTypes = ['page', 'service', 'destination', 'profil', 'faqItem', 'temoignage'];

export default defineConfig({
  name: 'hgwf-cargo',
  title: 'HGWF Cargo',
  projectId,
  dataset,
  plugins: [
    structureTool(),
    visionTool(),
    documentInternationalization({
      supportedLanguages: [
        { id: 'fr', title: 'Français' },
        { id: 'en', title: 'English' },
      ],
      schemaTypes: translatedTypes,
    }),
  ],
  schema: { types: schemaTypes },
});
```

- [ ] **Step 5: Créer `apps/studio/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "noEmit": true, "moduleResolution": "bundler" },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Créer `apps/studio/schemaTypes/index.ts` (provisoire vide)**

```ts
import type { SchemaTypeDefinition } from 'sanity';

export const schemaTypes: SchemaTypeDefinition[] = [];
```

- [ ] **Step 7: Installer**

Run: `pnpm install`
Expected: dépendances Sanity installées sans erreur.

- [ ] **Step 8: Vérifier le typecheck du Studio**

Run: `pnpm --filter studio typecheck`
Expected: `tsc --noEmit` exit 0.

> Le `sanity build` complet nécessite `projectId` (P1). Si `.env` est présent : `pnpm --filter studio build` doit réussir et produire `apps/studio/dist`. Sinon, s'en tenir au typecheck à ce stade.

- [ ] **Step 9: Commit**

```bash
git add apps/studio
git commit -m "$(printf 'feat(studio): Sanity Studio + plugin document-internationalization FR/EN\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 5: Schémas de contenu Sanity

**Files:**
- Create: `apps/studio/schemaTypes/objects/{hero,blocServices,blocDestinations,blocConteneurs,bandeauCTA,faqSection,temoignages,texteRiche}.ts`
- Create: `apps/studio/schemaTypes/documents/{page,service,destination,profil,faqItem,temoignage}.ts`
- Create: `apps/studio/schemaTypes/singletons/{siteSettings,navigation,footer}.ts`
- Modify: `apps/studio/schemaTypes/index.ts`

**Interfaces:**
- Consumes: rien (schémas autonomes).
- Produces: `schemaTypes` exporte tous les types ; `page` possède un champ `pageBuilder` (array des objects blocs) et un champ `slug`. Tous les documents traduisibles ont un champ caché `language` (géré par le plugin).

- [ ] **Step 1: Bloc `texteRiche` — `objects/texteRiche.ts`**

```ts
import { defineType } from 'sanity';

export const texteRiche = defineType({
  name: 'texteRiche',
  title: 'Texte riche',
  type: 'object',
  fields: [{ name: 'contenu', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }],
  preview: { prepare: () => ({ title: 'Texte riche' }) },
});
```

- [ ] **Step 2: Bloc `hero` — `objects/hero.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sousTitre', title: 'Sous-titre', type: 'text', rows: 2 }),
    defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'cta', title: 'Texte du bouton', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'Lien du bouton', type: 'string' }),
  ],
  preview: { select: { title: 'titre' }, prepare: ({ title }) => ({ title: `Hero — ${title ?? ''}` }) },
});
```

- [ ] **Step 3: Bloc `blocServices` — `objects/blocServices.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const blocServices = defineType({
  name: 'blocServices',
  title: 'Bloc services',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre de section', type: 'string' }),
    defineField({
      name: 'services',
      title: 'Services mis en avant',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc services' }) },
});
```

- [ ] **Step 4: Bloc `blocDestinations` — `objects/blocDestinations.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const blocDestinations = defineType({
  name: 'blocDestinations',
  title: 'Bloc destinations',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre de section', type: 'string' }),
    defineField({
      name: 'destinations',
      title: 'Destinations mises en avant',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'destination' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc destinations' }) },
});
```

- [ ] **Step 5: Bloc `blocConteneurs` — `objects/blocConteneurs.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const blocConteneurs = defineType({
  name: 'blocConteneurs',
  title: 'Bloc vente de conteneurs',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({
      name: 'formats',
      title: 'Formats disponibles',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: ['20 pieds', '40 pieds'] },
    }),
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
  ],
  preview: { prepare: () => ({ title: 'Bloc conteneurs' }) },
});
```

- [ ] **Step 6: Bloc `bandeauCTA` — `objects/bandeauCTA.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const bandeauCTA = defineType({
  name: 'bandeauCTA',
  title: 'Bandeau CTA',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'texteBouton', title: 'Texte du bouton', type: 'string' }),
    defineField({ name: 'lien', title: 'Lien', type: 'string' }),
  ],
  preview: { select: { title: 'titre' }, prepare: ({ title }) => ({ title: `CTA — ${title ?? ''}` }) },
});
```

- [ ] **Step 7: Bloc `faqSection` — `objects/faqSection.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const faqSection = defineType({
  name: 'faqSection',
  title: 'Section FAQ',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'faqItem' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Section FAQ' }) },
});
```

- [ ] **Step 8: Bloc `temoignages` — `objects/temoignages.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const temoignages = defineType({
  name: 'temoignagesBloc',
  title: 'Bloc témoignages',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Témoignages',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'temoignage' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc témoignages' }) },
});
```

- [ ] **Step 9: Document `faqItem` — `documents/faqItem.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'reponse', title: 'Réponse', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'question', subtitle: 'language' } },
});
```

- [ ] **Step 10: Document `temoignage` — `documents/temoignage.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const temoignage = defineType({
  name: 'temoignage',
  title: 'Témoignage',
  type: 'document',
  fields: [
    defineField({ name: 'auteur', title: 'Auteur', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', title: 'Rôle / profil', type: 'string' }),
    defineField({ name: 'citation', title: 'Citation', type: 'text', rows: 3 }),
    defineField({ name: 'note', title: 'Note (1-5)', type: 'number', validation: (r) => r.min(1).max(5) }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'auteur', subtitle: 'role' } },
});
```

- [ ] **Step 11: Document `service` — `documents/service.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({ name: 'resume', title: 'Résumé', type: 'text', rows: 3 }),
    defineField({ name: 'icone', title: 'Icône', type: 'image' }),
    defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
```

- [ ] **Step 12: Document `destination` — `documents/destination.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const destination = defineType({
  name: 'destination',
  title: 'Destination',
  type: 'document',
  fields: [
    defineField({ name: 'nom', title: 'Nom', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'nom' }, validation: (r) => r.required() }),
    defineField({
      name: 'zone',
      title: 'Zone',
      type: 'string',
      options: { list: ['Pacifique', 'Caraïbes & Guyane', 'Afrique & Océan Indien'] },
    }),
    defineField({ name: 'delaiMoyen', title: 'Délai moyen', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'nom', subtitle: 'zone' } },
});
```

- [ ] **Step 13: Document `profil` — `documents/profil.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const profil = defineType({
  name: 'profil',
  title: 'Profil / persona',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({ name: 'accroche', title: 'Accroche', type: 'text', rows: 2 }),
    defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
```

- [ ] **Step 14: Document `page` (page builder) — `documents/page.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({
      name: 'pageBuilder',
      title: 'Contenu de la page',
      type: 'array',
      of: [
        { type: 'hero' },
        { type: 'blocServices' },
        { type: 'blocDestinations' },
        { type: 'blocConteneurs' },
        { type: 'faqSection' },
        { type: 'temoignagesBloc' },
        { type: 'bandeauCTA' },
        { type: 'texteRiche' },
      ],
    }),
    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2 }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
```

- [ ] **Step 15: Singleton `siteSettings` — `singletons/siteSettings.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Paramètres du site',
  type: 'document',
  fields: [
    defineField({ name: 'raisonSociale', title: 'Raison sociale', type: 'string' }),
    defineField({ name: 'nomCommercial', title: 'Nom commercial', type: 'string' }),
    defineField({ name: 'baseline', title: 'Baseline', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({
      name: 'telephones',
      title: 'Téléphones (WhatsApp)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'contact', title: 'Contact', type: 'string' },
            { name: 'numero', title: 'Numéro', type: 'string' },
          ],
        },
      ],
    }),
    defineField({ name: 'adresseSiege', title: 'Adresse siège social', type: 'text', rows: 2 }),
    defineField({ name: 'adresseLogistique', title: 'Centre logistique', type: 'text', rows: 2 }),
    defineField({
      name: 'reseaux',
      title: 'Réseaux sociaux',
      type: 'object',
      fields: [
        { name: 'facebook', title: 'Facebook', type: 'url' },
        { name: 'instagram', title: 'Instagram', type: 'url' },
        { name: 'tiktok', title: 'TikTok', type: 'url' },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Paramètres du site' }) },
});
```

> `siteSettings`, `navigation`, `footer` ne sont PAS dans `translatedTypes` (Task 4) : coordonnées identiques FR/EN. Les libellés traduisibles vivront dans les messages next-intl côté web.

- [ ] **Step 16: Singletons `navigation` et `footer` — `singletons/navigation.ts`, `singletons/footer.ts`**

`singletons/navigation.ts` :

```ts
import { defineType, defineField } from 'sanity';

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'liens',
      title: 'Liens du menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'libelleFr', title: 'Libellé FR', type: 'string' },
            { name: 'libelleEn', title: 'Libellé EN', type: 'string' },
            { name: 'href', title: 'Lien', type: 'string' },
          ],
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Navigation' }) },
});
```

`singletons/footer.ts` :

```ts
import { defineType, defineField } from 'sanity';

export const footer = defineType({
  name: 'footer',
  title: 'Pied de page',
  type: 'document',
  fields: [
    defineField({ name: 'texteFr', title: 'Texte FR', type: 'text', rows: 2 }),
    defineField({ name: 'texteEn', title: 'Texte EN', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Pied de page' }) },
});
```

- [ ] **Step 17: Agréger dans `schemaTypes/index.ts`**

```ts
import type { SchemaTypeDefinition } from 'sanity';

import { siteSettings } from './singletons/siteSettings';
import { navigation } from './singletons/navigation';
import { footer } from './singletons/footer';

import { hero } from './objects/hero';
import { blocServices } from './objects/blocServices';
import { blocDestinations } from './objects/blocDestinations';
import { blocConteneurs } from './objects/blocConteneurs';
import { bandeauCTA } from './objects/bandeauCTA';
import { faqSection } from './objects/faqSection';
import { temoignages } from './objects/temoignages';
import { texteRiche } from './objects/texteRiche';

import { page } from './documents/page';
import { service } from './documents/service';
import { destination } from './documents/destination';
import { profil } from './documents/profil';
import { faqItem } from './documents/faqItem';
import { temoignage } from './documents/temoignage';

export const schemaTypes: SchemaTypeDefinition[] = [
  // singletons
  siteSettings,
  navigation,
  footer,
  // objects (blocs)
  hero,
  blocServices,
  blocDestinations,
  blocConteneurs,
  bandeauCTA,
  faqSection,
  temoignages,
  texteRiche,
  // documents
  page,
  service,
  destination,
  profil,
  faqItem,
  temoignage,
];
```

- [ ] **Step 18: Vérifier le typecheck + (si P1) build**

Run: `pnpm --filter studio typecheck`
Expected: exit 0, aucun type manquant (toutes les références `service`/`destination`/`faqItem`/`temoignage` existent).

Si `.env` présent : `pnpm --filter studio build` → `apps/studio/dist` produit sans erreur de schéma.

- [ ] **Step 19: Commit**

```bash
git add apps/studio
git commit -m "$(printf 'feat(studio): schemas de contenu (services, destinations, FAQ, blocs, settings)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 6: Intégration web ↔ Sanity (client, loader image, requêtes, routes dynamiques)

**Files:**
- Modify: `apps/web/package.json` (ajout `next-sanity`, `@sanity/image-url`)
- Create: `apps/web/src/sanity/client.ts`, `apps/web/src/sanity/image-loader.ts`, `apps/web/src/sanity/queries.ts`
- Create: `apps/web/src/sanity/image-loader.test.ts`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/src/app/[locale]/services/[slug]/page.tsx`
- Modify: `apps/web/src/components/Header.tsx`, `apps/web/src/components/Footer.tsx`, `apps/web/src/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: client Sanity ; `type Locale` de `@hgwf/shared`.
- Produces: `sanityClient`, `imageLoader({src,width,quality})`, `urlForImage(source)`, fonctions `getServiceSlugs(locale)`, `getService(locale, slug)`. Routes `/fr/services/[slug]` et `/en/services/[slug]` générées via `generateStaticParams`.

- [ ] **Step 1: Ajouter les dépendances**

Run: `pnpm --filter web add next-sanity @sanity/image-url`
Expected: ajout dans dependencies.

- [ ] **Step 2: Créer `apps/web/.env.local.example`**

```
NEXT_PUBLIC_SANITY_PROJECT_ID=remplacer_par_projectId
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
```

> L'utilisateur copie en `apps/web/.env.local` (prérequis P1).

- [ ] **Step 3: Créer `apps/web/src/sanity/client.ts`**

```ts
import { createClient } from 'next-sanity';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01';

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // build-time : on veut le contenu publié le plus frais
});
```

- [ ] **Step 4: Écrire le test du loader image (TDD) — `apps/web/src/sanity/image-loader.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import imageLoader from './image-loader';

describe('imageLoader (Sanity CDN)', () => {
  it('ajoute width, quality et auto=format à une URL Sanity', () => {
    const url = imageLoader({
      src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg',
      width: 800,
      quality: 70,
    });
    expect(url).toContain('w=800');
    expect(url).toContain('q=70');
    expect(url).toContain('auto=format');
  });

  it('utilise quality 75 par défaut', () => {
    const url = imageLoader({ src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg', width: 400 });
    expect(url).toContain('q=75');
  });

  it('préserve les paramètres existants (ex. hotspot rect)', () => {
    const url = imageLoader({ src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg?rect=0,0,100,100', width: 400 });
    expect(url).toContain('rect=0,0,100,100');
    expect(url).toContain('w=400');
  });
});
```

- [ ] **Step 5: Lancer le test (doit échouer)**

Run: `pnpm --filter web test -- image-loader`
Expected: FAIL — `image-loader` introuvable / export par défaut absent.

- [ ] **Step 6: Implémenter `apps/web/src/sanity/image-loader.ts`**

```ts
type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const url = new URL(src);
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality ?? 75));
  url.searchParams.set('auto', 'format');
  return url.toString();
}
```

- [ ] **Step 7: Lancer le test (doit passer)**

Run: `pnpm --filter web test -- image-loader`
Expected: 3 tests PASS.

- [ ] **Step 8: Créer `apps/web/src/sanity/queries.ts`**

```ts
import { groq } from 'next-sanity';
import { sanityClient } from './client';
import type { Locale } from '@hgwf/shared';

export type ServiceSummary = { slug: string; titre: string; resume: string | null };

const SERVICE_SLUGS = groq`*[_type == "service" && language == $locale && defined(slug.current)].slug.current`;
const SERVICE_BY_SLUG = groq`*[_type == "service" && language == $locale && slug.current == $slug][0]{
  "slug": slug.current, titre, resume
}`;

export async function getServiceSlugs(locale: Locale): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return [];
  return sanityClient.fetch<string[]>(SERVICE_SLUGS, { locale });
}

export async function getService(locale: Locale, slug: string): Promise<ServiceSummary | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  return sanityClient.fetch<ServiceSummary | null>(SERVICE_BY_SLUG, { locale, slug });
}
```

> Garde défensive : sans `projectId` configuré (P1 non fait), les requêtes renvoient des valeurs vides et le build reste vert.

- [ ] **Step 9: Créer la route dynamique `apps/web/src/app/[locale]/services/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@hgwf/shared';
import { getServiceSlugs, getService } from '@/sanity/queries';
import { routing } from '@/i18n/routing';

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const slugs = await getServiceSlugs(locale);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export const dynamicParams = false;

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const service = await getService(locale, slug);
  if (!service) notFound();
  return (
    <main>
      <h1>{service.titre}</h1>
      {service.resume ? <p>{service.resume}</p> : null}
    </main>
  );
}
```

> `dynamicParams = false` : seules les routes connues au build existent (cohérent avec l'export statique). Dataset vide → zéro route service générée, build OK.

- [ ] **Step 10: Créer les composants `Header` et `Footer`**

`apps/web/src/components/Header.tsx` :

```tsx
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('Nav');
  return (
    <header>
      <nav aria-label="Navigation principale">
        <Link href="/">{t('home')}</Link>
        <Link href="/services">{t('services')}</Link>
        <Link href="/destinations">{t('destinations')}</Link>
        <Link href="/contact">{t('contact')}</Link>
      </nav>
    </header>
  );
}
```

`apps/web/src/components/Footer.tsx` :

```tsx
export function Footer() {
  return (
    <footer>
      <p>© HGWF SOLUTIONS TRANSPORTS LOGISTIQUES — HGWF Cargo</p>
    </footer>
  );
}
```

- [ ] **Step 11: Créer le helper de navigation localisée `apps/web/src/i18n/navigation.ts`**

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 12: Brancher Header/Footer dans le layout `[locale]`**

Modify `apps/web/src/app/[locale]/layout.tsx` — remplacer le `<body>` :

```tsx
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
// …
      <body>
        <NextIntlClientProvider>
          <Header />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
```

- [ ] **Step 13: Activer le loader image Sanity dans `next.config.ts`**

Maintenant que `src/sanity/image-loader.ts` existe, ajouter le bloc `images` à `apps/web/next.config.ts` :

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './src/sanity/image-loader.ts',
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 14: Vérifier tests + build**

Run: `pnpm --filter web test && pnpm --filter web build`
Expected: tests PASS ; build OK ; `apps/web/out/fr/` et `apps/web/out/en/` présents. Si `.env.local` (P1) configuré avec des services publiés, des routes `out/fr/services/<slug>/index.html` apparaissent ; sinon aucune (normal).

- [ ] **Step 15: Commit**

```bash
git add apps/web
git commit -m "$(printf 'feat(web): integration Sanity (client, loader image CDN, routes services dynamiques)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 7: CI/CD — GitHub Actions build + déploiement FTP OVH + webhook Sanity

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: secrets GitHub (P3). Produces: déploiement automatique de `apps/web/out/` vers OVH.

- [ ] **Step 1: Créer `.github/workflows/deploy.yml`**

```yaml
name: Build & Deploy (OVH)

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [sanity-publish]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build (export statique)
        run: pnpm --filter web build
        env:
          NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID }}
          NEXT_PUBLIC_SANITY_DATASET: ${{ secrets.SANITY_DATASET }}
          NEXT_PUBLIC_SANITY_API_VERSION: '2024-10-01'

      - name: Déploiement FTP vers OVH
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./apps/web/out/
          server-dir: ${{ secrets.FTP_SERVER_DIR }}
```

- [ ] **Step 2: Vérifier la validité YAML**

Run (si `actionlint` ou `yamllint` dispo) : `npx --yes yaml-lint .github/workflows/deploy.yml`
Expected: YAML valide. Sinon, vérification visuelle de l'indentation.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "$(printf 'ci: build export statique + deploiement FTP OVH + trigger webhook Sanity\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

> Activation réelle : prérequis P2 (dépôt), P3 (secrets), P4 (webhook Sanity → `repository_dispatch` type `sanity-publish`). Documenté dans le README (Task 8).

---

## Task 8: README de prise en main

**Files:**
- Create/replace: `README.md`

**Interfaces:** documentation seule.

- [ ] **Step 1: Écrire `README.md`**

````markdown
# HGWF Cargo — Site web

Monorepo de la refonte du site HGWF Cargo. Frontend **Next.js** exporté en statique vers **OVH mutualisé**, administré via **Sanity Studio** (hébergé gratuitement par Sanity).

## Structure

- `apps/web` — frontend Next.js 16 (export statique) → OVH
- `apps/studio` — Sanity Studio (admin) → `*.sanity.studio`
- `packages/shared` — types/constantes partagés (locales)

## Prérequis

- Node `>=20` (voir `.nvmrc`), `pnpm` (`corepack enable`)
- Un projet Sanity (projectId + dataset `production`)

## Installation

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # renseigner projectId
cp apps/studio/.env.example apps/studio/.env          # renseigner projectId
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

## Déploiement

- **Frontend** : push sur `main` → GitHub Actions build + dépose `apps/web/out/` sur OVH par FTP.
  Secrets requis : `SANITY_PROJECT_ID`, `SANITY_DATASET`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.
- **Studio** : `pnpm --filter studio deploy` → publie sur `https://<nom>.sanity.studio`.

## Re-publication automatique (webhook Sanity)

manage.sanity.io → API → Webhooks → créer un webhook **on publish** :
- URL : `https://api.github.com/repos/<owner>/<repo>/dispatches`
- Méthode : `POST`
- Headers : `Authorization: Bearer <GITHUB_PAT>`, `Accept: application/vnd.github+json`
- Body : `{ "event_type": "sanity-publish" }`

Chaque publication relance le build + déploiement.

## Architecture

Le contenu Sanity est lu **au build**. OVH ne sert que des fichiers statiques (pas de Node.js). Toute interactivité backend (formulaire de devis…) passe par un service externe — voir la spec `docs/superpowers/specs/2026-06-25-hgwf-cargo-foundations-design.md`.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(printf 'docs: README de prise en main (dev, build, deploiement, webhook)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Notes de fin

- À l'issue de ce plan : `pnpm install` + `pnpm build:web` produisent un site statique bilingue déployable ; le Studio démarre et expose les schémas ; la CI est prête (secrets à fournir).
- **Phase suivante (hors plan)** : direction artistique (1 des 4 pistes), composants visuels, saisie de contenu réel, formulaire de devis (endpoint externe), pages légales/RGPD, balisage Schema.org, fonctionnalités avancées (suivi, calculateur m³, dates de départ).
