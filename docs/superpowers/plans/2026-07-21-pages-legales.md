# Pages légales — plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**But :** doter le site de mentions légales exactes, d'une politique de confidentialité conforme au RGPD et de CGV de commissionnaire de transport, éditables depuis le Studio.

**Architecture :** un type de document Sanity unique `pageLegale` (titre, chapo, date de mise à jour, sections en texte riche), trois routes explicites qui partagent un même composant de rendu, et un rendu Portable Text réutilisable. Les contenus par défaut vivent dans le code pour que le site tienne sans Sanity, et un script de seed les pousse dans le dataset.

**Pile technique :** Next 16 (App Router, `output: 'export'`), next-intl, Sanity v3, Tailwind v4, vitest.

**Spec de référence :** `docs/superpowers/specs/2026-07-21-pages-legales-design.md`

## Contraintes globales

- Branche à créer depuis un `main` à jour, après le merge des PR #1, #2 et #3.
- Aucune nouvelle dépendance : `PortableText` est déjà exporté par `next-sanity`.
- Toute donnée non vérifiable reste un champ vide, et sa section ne s'affiche pas tant qu'il l'est. Ne jamais inventer une valeur légale.
- Textes en français, avec les guillemets « » et les espaces insécables du projet.
- Identité légale de référence, issue du registre (SIREN 940048051) : **HGWF CARGO**, SAS, siège **avenue Faidherbe, 93110 Rosny-sous-Bois**, RCS Bobigny 940 048 051, TVA FR18940048051, présidente **Marie Rioltha Bagassien**. Le capital social est inconnu et reste vide.
- Hébergeur : **OVH SAS, 2 rue Kellermann, 59100 Roubaix, +33 9 72 10 10 07**.
- Ne pas référencer la plateforme européenne de règlement en ligne des litiges : fermée le 20 juillet 2025.
- L'environnement vitest est `node` et aucune bibliothèque de test React n'est installée. Les tests unitaires portent donc sur les fonctions pures ; les composants sont vérifiés par le build et l'inspection de l'export statique. Ne pas introduire `@testing-library/react` pour ce lot.

---

### Tâche 1 : Utilitaires de contenu et rendu Portable Text

**Fichiers**
- Créer : `apps/web/src/components/legal/portable.ts`
- Créer : `apps/web/src/components/legal/portable.test.ts`
- Créer : `apps/web/src/components/legal/TexteRiche.tsx`

**Interfaces**
- Produit : `type Bloc`, `p(...parts: (string | Lien)[]): Bloc`, `titre3(texte: string): Bloc`, `liste(...items: string[]): Bloc[]`, `lien(texte: string, href: string): Lien`, et le composant `<TexteRiche blocs={...} />`.
- Consommé par : les tâches 4 à 8.

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/components/legal/portable.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { p, titre3, liste, lien } from './portable';

describe('portable', () => {
  it('construit un paragraphe de texte simple', () => {
    const bloc = p('Bonjour');
    expect(bloc._type).toBe('block');
    expect(bloc.style).toBe('normal');
    expect(bloc.children).toEqual([{ _type: 'span', _key: expect.any(String), text: 'Bonjour', marks: [] }]);
    expect(bloc.markDefs).toEqual([]);
  });

  it('construit un paragraphe contenant un lien', () => {
    const bloc = p('Écrivez à ', lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'), '.');
    expect(bloc.markDefs).toHaveLength(1);
    expect(bloc.markDefs[0]!._type).toBe('link');
    expect(bloc.markDefs[0]!.href).toBe('mailto:contact@hgwf-cargo.fr');
    expect(bloc.children.map((c) => c.text)).toEqual(['Écrivez à ', 'contact@hgwf-cargo.fr', '.']);
    expect(bloc.children[1]!.marks).toEqual([bloc.markDefs[0]!._key]);
  });

  it('construit un titre de niveau 3', () => {
    expect(titre3('Vos droits').style).toBe('h3');
  });

  it('construit une liste à puces', () => {
    const blocs = liste('Accès', 'Rectification');
    expect(blocs).toHaveLength(2);
    expect(blocs[0]!.listItem).toBe('bullet');
    expect(blocs[1]!.children[0]!.text).toBe('Rectification');
  });

  it('donne une clé unique à chaque bloc', () => {
    const cles = [p('a'), p('b'), ...liste('c', 'd')].map((b) => b._key);
    expect(new Set(cles).size).toBe(4);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

```bash
cd apps/web && pnpm vitest run src/components/legal/portable.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "./portable"`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

`apps/web/src/components/legal/portable.ts` :

```ts
// Fabriques de blocs Portable Text, pour écrire les contenus légaux par défaut
// sans les noyer sous les `_type` et `children`.

export type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
export type MarkDef = { _type: 'link'; _key: string; href: string };
export type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h3';
  listItem?: 'bullet' | 'number';
  level?: number;
  children: Span[];
  markDefs: MarkDef[];
};
export type Lien = { texte: string; href: string };

let compteur = 0;
const cle = (prefixe: string) => `${prefixe}-${(compteur += 1).toString(36)}`;

export function lien(texte: string, href: string): Lien {
  return { texte, href };
}

function bloc(style: Bloc['style'], parts: (string | Lien)[], listItem?: Bloc['listItem']): Bloc {
  const markDefs: MarkDef[] = [];
  const children = parts.map((part) => {
    if (typeof part === 'string') return { _type: 'span' as const, _key: cle('s'), text: part, marks: [] };
    const def: MarkDef = { _type: 'link', _key: cle('m'), href: part.href };
    markDefs.push(def);
    return { _type: 'span' as const, _key: cle('s'), text: part.texte, marks: [def._key] };
  });
  return {
    _type: 'block',
    _key: cle('b'),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    children,
    markDefs,
  };
}

export const p = (...parts: (string | Lien)[]): Bloc => bloc('normal', parts);
export const titre3 = (texte: string): Bloc => bloc('h3', [texte]);
export const liste = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'bullet'));
export const listeNum = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'number'));
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

```bash
cd apps/web && pnpm vitest run src/components/legal/portable.test.ts
```

Attendu : 5 tests passés.

- [ ] **Étape 5 : écrire le composant de rendu**

`apps/web/src/components/legal/TexteRiche.tsx` :

```tsx
import { PortableText } from 'next-sanity';
import { Link } from '@/i18n/navigation';
import type { Bloc } from './portable';

const composants = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="m-0 text-[15px] leading-[1.65] text-encre-douce">{children}</p>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="m-0 mt-2 text-base font-bold text-marine">{children}</h3>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.65] text-encre-douce">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.65] text-encre-douce">
        {children}
      </ol>
    ),
  },
  listItem: { bullet: ({ children }: { children?: React.ReactNode }) => <li>{children}</li> },
  marks: {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-marine">{children}</strong>
    ),
    link: ({ value, children }: { value?: { href?: string }; children?: React.ReactNode }) => {
      const href = value?.href ?? '#';
      const externe = /^(https?:|mailto:|tel:)/.test(href);
      if (externe) {
        return (
          <a href={href} className="font-medium text-corail underline hover:text-corail-fonce" rel="noreferrer">
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className="font-medium text-corail underline hover:text-corail-fonce">
          {children}
        </Link>
      );
    },
  },
};

export function TexteRiche({ blocs }: { blocs: Bloc[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <PortableText value={blocs} components={composants} />
    </div>
  );
}
```

- [ ] **Étape 6 : vérifier le typage**

```bash
cd apps/web && pnpm typecheck
```

Attendu : aucune sortie.

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/components/legal/
git commit -m "feat(web): rendu Portable Text et fabriques de blocs pour les pages légales"
```

---

### Tâche 2 : Schéma Sanity `pageLegale`

**Fichiers**
- Créer : `apps/studio/schemaTypes/documents/pageLegale.ts`
- Modifier : `apps/studio/schemaTypes/index.ts`
- Modifier : `apps/studio/sanity.config.ts`

**Interfaces**
- Produit : le type de document `pageLegale`, avec les champs `titre`, `slug`, `eyebrow`, `titrePage`, `chapo`, `dateMaj`, `sections[]{titre, ancre, corps}`, `seoTitre`, `seoDescription`, `language`.
- Consommé par : les tâches 3, 8 et 9.

- [ ] **Étape 1 : créer le schéma**

`apps/studio/schemaTypes/documents/pageLegale.ts` :

```ts
import { defineType, defineField } from 'sanity';

export const pageLegale = defineType({
  name: 'pageLegale',
  title: 'Page légale',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre interne', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Identifiant de page',
      type: 'slug',
      options: { source: 'titre' },
      description: 'mentions-legales, confidentialite ou cgv — doit correspondre à la route du site.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
    defineField({ name: 'titrePage', title: 'Titre affiché', type: 'string' }),
    defineField({ name: 'chapo', title: 'Préambule', type: 'text', rows: 3 }),
    defineField({
      name: 'dateMaj',
      title: 'Dernière mise à jour',
      type: 'date',
      description: 'Affichée en haut de page. À changer à chaque modification du texte.',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'ancre',
              title: 'Ancre',
              type: 'slug',
              options: { source: 'titre' },
              description: 'Permet de lier directement cette section (ex. #cookies).',
            }),
            defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
          ],
          preview: { select: { title: 'titre' } },
        },
      ],
    }),
    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2 }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
```

- [ ] **Étape 2 : déclarer le type**

Dans `apps/studio/schemaTypes/index.ts`, ajouter l'import auprès des autres documents et l'entrée dans `schemaTypes` :

```ts
import { pageLegale } from './documents/pageLegale';
```

puis, dans le tableau `schemaTypes`, juste après `pageMentions` :

```ts
  pageLegale,
```

- [ ] **Étape 3 : ajouter l'entrée « Pages légales » dans la structure du Studio**

Dans `apps/studio/sanity.config.ts`, ajouter après la constante `pagesFixes` :

```ts
// Pages légales, épinglées sur leur document FR.
const pagesLegales = [
  { titre: 'Mentions légales', id: 'pageLegale-mentions-fr', icon: BookIcon },
  { titre: 'Politique de confidentialité', id: 'pageLegale-confidentialite-fr', icon: BookIcon },
  { titre: 'CGV', id: 'pageLegale-cgv-fr', icon: BookIcon },
];
```

puis, dans `structureContenu`, insérer cette entrée juste avant le `S.divider()` qui précède « Contenus » :

```ts
      S.listItem()
        .title('Pages légales')
        .id('pagesLegales')
        .icon(BookIcon)
        .child(
          S.list()
            .title('Pages légales')
            .items(
              pagesLegales.map((p) =>
                S.listItem()
                  .title(p.titre)
                  .id(p.id)
                  .icon(p.icon)
                  .child(S.document().schemaType('pageLegale').documentId(p.id).title(p.titre)),
              ),
            ),
        ),
```

Retirer `{ titre: 'Mentions légales', type: 'pageMentions', id: 'pageMentions-fr', icon: BookIcon }` du tableau `pagesFixes` : la page légale la remplace dans le menu. Le schéma `pageMentions`, lui, reste déclaré jusqu'à la tâche 11.

- [ ] **Étape 4 : ajouter `pageLegale` aux types traduisibles**

Dans `apps/studio/sanity.config.ts`, ajouter `'pageLegale'` au tableau `translatedTypes`, et une entrée dans `mainDocuments` du `presentationTool` :

```ts
            { route: '/:locale/mentions-legales/', filter: `_type == "pageLegale" && slug.current == "mentions-legales" && language == $locale` },
            { route: '/:locale/confidentialite/', filter: `_type == "pageLegale" && slug.current == "confidentialite" && language == $locale` },
            { route: '/:locale/cgv/', filter: `_type == "pageLegale" && slug.current == "cgv" && language == $locale` },
```

- [ ] **Étape 5 : vérifier**

```bash
cd apps/studio && pnpm typecheck && pnpm build
```

Attendu : typecheck sans sortie, build « ✓ Build Sanity Studio ».

- [ ] **Étape 6 : commit**

```bash
git add apps/studio/schemaTypes/documents/pageLegale.ts apps/studio/schemaTypes/index.ts apps/studio/sanity.config.ts
git commit -m "feat(studio): schéma pageLegale et entrée « Pages légales » dans la structure"
```

---

### Tâche 3 : Requête `getPageLegale`

**Fichiers**
- Modifier : `apps/web/src/sanity/queries.ts`

**Interfaces**
- Consomme : le type `pageLegale` de la tâche 2.
- Produit : `type PageLegaleData` et `getPageLegale(locale: Locale, slug: string): Promise<PageLegaleData | null>`.

- [ ] **Étape 1 : ajouter le type et la requête**

Dans `apps/web/src/sanity/queries.ts`, juste après la section « Page Mentions légales » :

```ts
// ── Pages légales ────────────────────────────────────────────────────────────

export type PageLegaleData = {
  eyebrow?: string | null;
  titrePage?: string | null;
  chapo?: string | null;
  dateMaj?: string | null;
  sections?: { titre?: string | null; ancre?: string | null; corps?: unknown[] | null }[] | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_LEGALE = groq`*[_type == "pageLegale" && slug.current == $slug && language == $locale][0]{
  eyebrow, titrePage, chapo, dateMaj,
  sections[]{titre, "ancre": ancre.current, corps},
  seoTitre, seoDescription
}`;

export async function getPageLegale(locale: Locale, slug: string): Promise<PageLegaleData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageLegaleData | null>(PAGE_LEGALE, { locale, slug });
}
```

- [ ] **Étape 2 : vérifier**

```bash
cd apps/web && pnpm typecheck
```

Attendu : aucune sortie.

- [ ] **Étape 3 : commit**

```bash
git add apps/web/src/sanity/queries.ts
git commit -m "feat(web): requête getPageLegale"
```

---

### Tâche 4 : Ossature de rendu `PageLegale`

**Fichiers**
- Créer : `apps/web/src/components/legal/PageLegale.tsx`

**Interfaces**
- Consomme : `TexteRiche` et `Bloc` (tâche 1).
- Produit : `type SectionLegale = { titre: string; ancre: string; corps: Bloc[] }`, `type ContenuLegal = { eyebrow: string; titrePage: string; chapo: string; dateMaj: string; sections: SectionLegale[] }`, et `<PageLegale contenu={...} />`.
- Consommé par : les tâches 5, 6, 7.

- [ ] **Étape 1 : créer le composant**

`apps/web/src/components/legal/PageLegale.tsx` :

```tsx
import { TexteRiche } from './TexteRiche';
import type { Bloc } from './portable';

export type SectionLegale = { titre: string; ancre: string; corps: Bloc[] };

export type ContenuLegal = {
  eyebrow: string;
  titrePage: string;
  chapo: string;
  dateMaj: string;
  sections: SectionLegale[];
};

function formaterDate(iso: string, locale: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function PageLegale({ contenu, locale }: { contenu: ContenuLegal; locale: string }) {
  const { eyebrow, titrePage, chapo, dateMaj, sections } = contenu;
  const sommaire = sections.length >= 4;
  const dateLisible = formaterDate(dateMaj, locale);

  return (
    <main>
      <header className="bg-marine">
        <div className="hero-entree mx-auto flex max-w-[860px] flex-col gap-4 px-5 pt-32 pb-16 sm:px-8 sm:pt-[150px] text-creme">
          <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{eyebrow}</span>
          <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
            {titrePage}
          </h1>
          {chapo && <p className="m-0 max-w-[62ch] text-[15px] leading-[1.6] text-creme/85">{chapo}</p>}
          {dateLisible && (
            <span className="font-mono text-xs text-creme/60">
              {locale === 'en' ? 'Last updated' : 'Dernière mise à jour'} : {dateLisible}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-5 pt-14 pb-22 sm:px-8">
        {sommaire && (
          <nav aria-label={locale === 'en' ? 'Contents' : 'Sommaire'} className="mb-12 rounded-[18px] border border-marine/12 bg-creme p-6">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {sections.map((s) => (
                <li key={s.ancre}>
                  <a href={`#${s.ancre}`} className="text-sm font-medium text-marine underline-offset-2 hover:underline">
                    {s.titre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.ancre} id={s.ancre} className="flex scroll-mt-28 flex-col gap-3">
              <h2 className="m-0 text-xl font-bold tracking-[-0.02em] text-marine md:text-2xl">{s.titre}</h2>
              <TexteRiche blocs={s.corps} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Étape 2 : vérifier**

```bash
cd apps/web && pnpm typecheck
```

Attendu : aucune sortie.

- [ ] **Étape 3 : commit**

```bash
git add apps/web/src/components/legal/PageLegale.tsx
git commit -m "feat(web): ossature de rendu des pages légales"
```

---

### Tâche 5 : Mentions légales — contenu et bascule de la route

**Fichiers**
- Créer : `apps/web/src/content/legal/mentions.ts`
- Créer : `apps/web/src/content/legal/fusion.ts`
- Créer : `apps/web/src/content/legal/fusion.test.ts`
- Modifier : `apps/web/src/app/[locale]/mentions-legales/page.tsx` (remplacement complet)

**Interfaces**
- Consomme : `p`, `titre3`, `liste`, `lien` (tâche 1) ; `ContenuLegal` (tâche 4) ; `getPageLegale` (tâche 3).
- Produit : `MENTIONS_FR: ContenuLegal`, et `fusionner(defaut: ContenuLegal, data: PageLegaleData | null): ContenuLegal`.
- Consommé par : les tâches 6, 7, 8.

- [ ] **Étape 1 : écrire le test de fusion qui échoue**

`apps/web/src/content/legal/fusion.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { fusionner } from './fusion';
import type { ContenuLegal } from '@/components/legal/PageLegale';

const DEFAUT: ContenuLegal = {
  eyebrow: 'Informations légales',
  titrePage: 'Mentions légales.',
  chapo: 'Chapô par défaut',
  dateMaj: '2026-07-21',
  sections: [{ titre: 'Éditeur', ancre: 'editeur', corps: [] }],
};

describe('fusionner', () => {
  it('renvoie le contenu par défaut quand Sanity ne répond rien', () => {
    expect(fusionner(DEFAUT, null)).toEqual(DEFAUT);
  });

  it('laisse la valeur par défaut quand le champ Sanity est vide', () => {
    expect(fusionner(DEFAUT, { titrePage: '' }).titrePage).toBe('Mentions légales.');
  });

  it('remplace les champs fournis par Sanity', () => {
    expect(fusionner(DEFAUT, { titrePage: 'Autre titre' }).titrePage).toBe('Autre titre');
  });

  it('ignore les sections Sanity sans corps, pour ne jamais afficher une section vide', () => {
    const r = fusionner(DEFAUT, {
      sections: [
        { titre: 'Remplie', ancre: 'remplie', corps: [{ _type: 'block' }] },
        { titre: 'Vide', ancre: 'vide', corps: [] },
      ],
    });
    expect(r.sections.map((s) => s.titre)).toEqual(['Remplie']);
  });

  it('garde les sections par défaut si Sanity n’en fournit aucune exploitable', () => {
    expect(fusionner(DEFAUT, { sections: [] }).sections).toEqual(DEFAUT.sections);
  });

  it('replie l’ancre sur un slug du titre quand elle manque', () => {
    const r = fusionner(DEFAUT, { sections: [{ titre: 'Vos droits RGPD', corps: [{ _type: 'block' }] }] });
    expect(r.sections[0]!.ancre).toBe('vos-droits-rgpd');
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

```bash
cd apps/web && pnpm vitest run src/content/legal/fusion.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "./fusion"`.

- [ ] **Étape 3 : écrire la fusion**

`apps/web/src/content/legal/fusion.ts` :

```ts
import type { ContenuLegal, SectionLegale } from '@/components/legal/PageLegale';
import type { PageLegaleData } from '@/sanity/queries';
import type { Bloc } from '@/components/legal/portable';

function ancrer(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Une section Sanity sans corps ne doit jamais s'afficher : c'est la règle qui
// garantit qu'une donnée légale non renseignée reste absente plutôt que fausse.
function sectionsUtiles(data: PageLegaleData | null): SectionLegale[] {
  const brutes = data?.sections ?? [];
  return brutes
    .filter((s) => s?.titre && Array.isArray(s.corps) && s.corps.length > 0)
    .map((s) => ({
      titre: s.titre as string,
      ancre: s.ancre || ancrer(s.titre as string),
      corps: s.corps as Bloc[],
    }));
}

export function fusionner(defaut: ContenuLegal, data: PageLegaleData | null): ContenuLegal {
  const sections = sectionsUtiles(data);
  return {
    eyebrow: data?.eyebrow || defaut.eyebrow,
    titrePage: data?.titrePage || defaut.titrePage,
    chapo: data?.chapo || defaut.chapo,
    dateMaj: data?.dateMaj || defaut.dateMaj,
    sections: sections.length > 0 ? sections : defaut.sections,
  };
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

```bash
cd apps/web && pnpm vitest run src/content/legal/fusion.test.ts
```

Attendu : 6 tests passés.

- [ ] **Étape 5 : écrire le contenu des mentions légales**

`apps/web/src/content/legal/mentions.ts` :

```ts
import { p, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

// Identité issue du registre du commerce (SIREN 940048051), à confirmer par la
// dirigeante avant publication. Les valeurs inconnues sont volontairement
// absentes : une mention légale fausse est pire qu'une mention incomplète.
export const MENTIONS_FR: ContenuLegal = {
  eyebrow: 'Informations légales',
  titrePage: 'Mentions légales.',
  chapo:
    'Informations relatives à l’éditeur du site hgwf-cargo.fr et à son hébergeur, conformément à la loi pour la confiance dans l’économie numérique.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Éditeur du site',
      ancre: 'editeur',
      corps: [
        p('HGWF CARGO, société par actions simplifiée.'),
        p('Siège social : avenue Faidherbe, 93110 Rosny-sous-Bois, France.'),
        p('Adresse logistique : 10 rue Diderot, 93110 Rosny-sous-Bois.'),
        p(
          'Courriel : ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' — Téléphone : ',
          lien('+33 6 27 05 69 34', 'tel:+33627056934'),
          '.',
        ),
      ],
    },
    {
      titre: 'Immatriculation',
      ancre: 'immatriculation',
      corps: [
        p('Registre du commerce et des sociétés de Bobigny, sous le numéro 940 048 051.'),
        p('Numéro de TVA intracommunautaire : FR18940048051.'),
        p('Code d’activité : 49.41B — transport routier de fret.'),
      ],
    },
    {
      titre: 'Direction de la publication',
      ancre: 'direction',
      corps: [p('Directrice de la publication : Marie Rioltha Bagassien, présidente.')],
    },
    {
      titre: 'Hébergement',
      ancre: 'hebergement',
      corps: [
        p('Le site est hébergé par OVH SAS.'),
        p('2 rue Kellermann, 59100 Roubaix, France.'),
        p('Téléphone : ', lien('+33 9 72 10 10 07', 'tel:+33972101007'), '.'),
      ],
    },
    {
      titre: 'Propriété intellectuelle',
      ancre: 'propriete-intellectuelle',
      corps: [
        p(
          'L’ensemble des contenus de ce site — textes, images, identité visuelle, logos — est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.',
        ),
      ],
    },
    {
      titre: 'Données personnelles',
      ancre: 'donnees-personnelles',
      corps: [
        p(
          'Le traitement des données collectées sur ce site est décrit dans notre ',
          lien('politique de confidentialité', '/confidentialite'),
          '.',
        ),
      ],
    },
  ],
};

// Sections dont les données manquent. À réintégrer dans MENTIONS_FR.sections dès
// que le client fournit les valeurs — voir la spec, « Données à compléter ».
export const MENTIONS_A_COMPLETER = [
  'Capital social de la SAS',
  'Numéro d’inscription au registre électronique national des entreprises de transport par route, et licence',
  'Assureur en responsabilité civile professionnelle, numéro de police et étendue géographique',
  'Médiateur de la consommation retenu et ses coordonnées (obligatoire, art. L.612-1 du code de la consommation)',
];
```

- [ ] **Étape 6 : remplacer la route**

`apps/web/src/app/[locale]/mentions-legales/page.tsx`, contenu intégral :

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageLegale } from '@/sanity/queries';
import { PageLegale } from '@/components/legal/PageLegale';
import { fusionner } from '@/content/legal/fusion';
import { MENTIONS_FR } from '@/content/legal/mentions';

export { generateStaticParams } from '@/i18n/staticParams';

const SLUG = 'mentions-legales';
const SEO = {
  titre: 'Mentions légales — HGWF Cargo',
  description: 'Mentions légales du site HGWF Cargo — éditeur, immatriculation et hébergeur.',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return {
    title: data?.seoTitre || SEO.titre,
    description: data?.seoDescription || SEO.description,
  };
}

export default async function MentionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return <PageLegale contenu={fusionner(MENTIONS_FR, data)} locale={locale} />;
}
```

- [ ] **Étape 7 : vérifier**

```bash
cd apps/web && pnpm typecheck && pnpm vitest run && pnpm build
```

Attendu : typecheck muet, tests passés, build réussi.

- [ ] **Étape 8 : vérifier le rendu réel**

```bash
grep -o 'avenue Faidherbe' apps/web/out/fr/mentions-legales/index.html
grep -c 'Villepinte' apps/web/out/fr/mentions-legales/index.html
```

Attendu : la première commande affiche `avenue Faidherbe` ; la seconde affiche `0`.

- [ ] **Étape 9 : commit**

```bash
git add apps/web/src/content/legal/ "apps/web/src/app/[locale]/mentions-legales/page.tsx"
git commit -m "feat(web): mentions légales conformes, identité alignée sur le registre"
```

---

### Tâche 6 : Politique de confidentialité

**Fichiers**
- Créer : `apps/web/src/content/legal/confidentialite.ts`
- Créer : `apps/web/src/app/[locale]/confidentialite/page.tsx`

**Interfaces**
- Consomme : `p`, `titre3`, `liste`, `lien`, `ContenuLegal`, `fusionner`, `getPageLegale`.
- Produit : `CONFIDENTIALITE_FR: ContenuLegal`.

- [ ] **Étape 1 : écrire le contenu**

`apps/web/src/content/legal/confidentialite.ts` :

```ts
import { p, titre3, liste, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

export const CONFIDENTIALITE_FR: ContenuLegal = {
  eyebrow: 'Protection des données',
  titrePage: 'Politique de confidentialité.',
  chapo:
    'Cette politique décrit les données personnelles que nous collectons sur ce site, pourquoi nous les traitons, combien de temps nous les conservons et les droits dont vous disposez.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Responsable du traitement',
      ancre: 'responsable',
      corps: [
        p(
          'HGWF CARGO, société par actions simplifiée, siège avenue Faidherbe, 93110 Rosny-sous-Bois, immatriculée au RCS de Bobigny sous le numéro 940 048 051.',
        ),
        p(
          'Pour toute question relative à vos données : ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Données collectées et finalités',
      ancre: 'finalites',
      corps: [
        p('Nous ne collectons que les données que vous nous transmettez volontairement.'),
        titre3('Demande de devis'),
        p(
          'Nom, courriel, téléphone, destination, port de départ, dimensions et nombre de colis, message libre. Ces données servent à établir votre devis et à vous répondre. Base légale : l’exécution de mesures précontractuelles prises à votre demande. Conservation : trois ans à compter du dernier contact.',
        ),
        titre3('Formulaire de contact'),
        p(
          'Nom, courriel, téléphone, objet et message. Ces données servent à traiter votre demande. Base légale : notre intérêt légitime à répondre aux sollicitations qui nous sont adressées. Conservation : trois ans à compter du dernier contact.',
        ),
        titre3('Suivi d’expédition'),
        p(
          'Référence de dossier ou numéro de conteneur, statut, position et coordonnées liées au dossier. Base légale : l’exécution du contrat de transport. Conservation : durée du contrat, puis cinq ans au titre de la prescription commerciale, et dix ans pour les pièces comptables.',
        ),
        titre3('Sécurité du service'),
        p(
          'Votre adresse IP est utilisée pour limiter le nombre de requêtes envoyées à nos formulaires et prévenir les abus. Base légale : notre intérêt légitime à protéger le service. Cette donnée reste en mémoire vive et n’est pas enregistrée.',
        ),
      ],
    },
    {
      titre: 'Destinataires',
      ancre: 'destinataires',
      corps: [
        p('Vos données sont accessibles aux seules personnes qui en ont besoin :'),
        ...liste(
          'le personnel de HGWF Cargo chargé du commerce et de l’exploitation',
          'nos prestataires techniques, qui agissent comme sous-traitants et n’utilisent vos données que sur nos instructions',
          'nos transporteurs, agents portuaires et déclarants en douane, lorsque l’exécution de votre expédition l’exige',
        ),
        p('Vos données ne sont ni vendues, ni louées, ni transmises à des fins publicitaires.'),
      ],
    },
    {
      titre: 'Transfert hors Union européenne',
      ancre: 'transferts',
      corps: [
        p(
          'Les demandes que vous nous adressez sont enregistrées dans notre outil de gestion de contenu Sanity, dont les serveurs sont situés aux États-Unis. Ce transfert est encadré par les garanties prévues au chapitre V du RGPD, décrites dans l’accord de sous-traitance conclu avec ce prestataire.',
        ),
        p(
          'Vous pouvez obtenir communication de ces garanties en nous écrivant à ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Vos droits',
      ancre: 'vos-droits',
      corps: [
        p('Vous disposez, sur les données qui vous concernent, des droits suivants :'),
        ...liste(
          'droit d’accès : obtenir une copie des données que nous détenons sur vous',
          'droit de rectification : faire corriger une information inexacte',
          'droit à l’effacement, lorsque la conservation n’est plus justifiée',
          'droit à la limitation du traitement',
          'droit d’opposition, notamment aux traitements fondés sur notre intérêt légitime',
          'droit à la portabilité des données que vous nous avez fournies',
        ),
        p(
          'Pour les exercer, écrivez à ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' en précisant votre demande. Nous répondons dans un délai d’un mois, qui peut être prolongé de deux mois si la demande est complexe — nous vous en informerions alors.',
        ),
        p(
          'Si notre réponse ne vous satisfait pas, vous pouvez saisir la Commission nationale de l’informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou déposer une plainte sur ',
          lien('cnil.fr', 'https://www.cnil.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Cookies',
      ancre: 'cookies',
      corps: [
        p(
          'Ce site ne dépose aucun cookie et n’utilise aucun traceur : ni mesure d’audience, ni pixel publicitaire, ni bouton de réseau social embarqué. Aucun consentement ne vous est donc demandé, et aucune information n’est stockée dans votre navigateur.',
        ),
        p(
          'Si nous ajoutions un jour un outil de mesure d’audience, un bandeau vous permettrait de l’accepter ou de le refuser avant tout dépôt, et cette page serait mise à jour en conséquence.',
        ),
      ],
    },
    {
      titre: 'Sécurité',
      ancre: 'securite',
      corps: [
        p(
          'Les échanges avec ce site sont chiffrés en transit. Les demandes sont enregistrées dans un espace privé, distinct du contenu public du site, et les accès en écriture sont limités à nos serveurs. Nous ne prenons aucune décision automatisée produisant des effets juridiques à votre égard, et ne réalisons aucun profilage.',
        ),
      ],
    },
  ],
};
```

- [ ] **Étape 2 : créer la route**

`apps/web/src/app/[locale]/confidentialite/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageLegale } from '@/sanity/queries';
import { PageLegale } from '@/components/legal/PageLegale';
import { fusionner } from '@/content/legal/fusion';
import { CONFIDENTIALITE_FR } from '@/content/legal/confidentialite';

export { generateStaticParams } from '@/i18n/staticParams';

const SLUG = 'confidentialite';
const SEO = {
  titre: 'Politique de confidentialité — HGWF Cargo',
  description:
    'Données personnelles collectées sur le site HGWF Cargo : finalités, bases légales, durées de conservation et exercice de vos droits.',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return {
    title: data?.seoTitre || SEO.titre,
    description: data?.seoDescription || SEO.description,
  };
}

export default async function ConfidentialitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return <PageLegale contenu={fusionner(CONFIDENTIALITE_FR, data)} locale={locale} />;
}
```

- [ ] **Étape 3 : vérifier**

```bash
cd apps/web && pnpm typecheck && pnpm build
grep -o 'id="cookies"' apps/web/out/fr/confidentialite/index.html
```

Attendu : build réussi, et l'ancre `id="cookies"` présente.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/src/content/legal/confidentialite.ts "apps/web/src/app/[locale]/confidentialite/page.tsx"
git commit -m "feat(web): politique de confidentialité"
```

---

### Tâche 7 : CGV et conditions de transport

**Fichiers**
- Créer : `apps/web/src/content/legal/cgv.ts`
- Créer : `apps/web/src/app/[locale]/cgv/page.tsx`

**Interfaces**
- Produit : `CGV_FR: ContenuLegal`.

- [ ] **Étape 1 : écrire le contenu**

`apps/web/src/content/legal/cgv.ts` — sections, dans l'ordre, avec pour chacune le texte complet :

```ts
import { p, liste, listeNum, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

export const CGV_FR: ContenuLegal = {
  eyebrow: 'Conditions générales',
  titrePage: 'Conditions générales de vente.',
  chapo:
    'Ces conditions régissent les prestations d’organisation de transport et de logistique réalisées par HGWF Cargo. Elles s’appliquent à toute commande, sauf convention écrite contraire.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Champ d’application',
      ancre: 'champ-application',
      corps: [
        p(
          'HGWF Cargo intervient en qualité de commissionnaire de transport : nous organisons librement, pour votre compte et en notre nom, l’acheminement de vos marchandises par les moyens de notre choix. Nous ne réalisons pas nous-mêmes le transport principal.',
        ),
        p(
          'Toute commande emporte acceptation sans réserve des présentes conditions, qui prévalent sur les conditions d’achat du client, sauf accord écrit de notre part.',
        ),
      ],
    },
    {
      titre: 'Devis et commande',
      ancre: 'devis',
      corps: [
        p(
          'Nos devis sont établis sur la base des informations que vous nous communiquez et sont valables trente jours, sauf mention contraire. Les prix s’entendent hors taxes.',
        ),
        p('Sauf indication expresse au devis, ne sont pas compris :'),
        ...liste(
          'les droits de douane, taxes et redevances exigibles à destination',
          'les frais de stationnement, de magasinage ou d’immobilisation non imputables à HGWF Cargo',
          'les prestations de manutention exceptionnelle non prévues à la commande',
        ),
        p(
          'Toute modification des caractéristiques de l’envoi — poids, dimensions, nature, destination — entraîne la révision du prix.',
        ),
      ],
    },
    {
      titre: 'Obligations du client',
      ancre: 'obligations-client',
      corps: [
        p('Vous vous engagez à :'),
        ...listeNum(
          'déclarer avec exactitude la nature, le poids, les dimensions et la valeur des marchandises',
          'assurer un emballage adapté au mode de transport et à la durée d’acheminement',
          'fournir en temps utile les documents nécessaires au transport et au dédouanement',
          'nous signaler toute marchandise dangereuse, réglementée ou de valeur',
        ),
        p(
          'Sont exclus du transport, sauf accord écrit préalable : les espèces, métaux et pierres précieuses, les objets d’art, les armes, les stupéfiants, les animaux vivants, les denrées périssables non réfrigérées et toute marchandise dont la circulation est interdite. Une déclaration inexacte engage votre responsabilité pour l’ensemble des conséquences qui en découlent.',
        ),
      ],
    },
    {
      titre: 'Délais',
      ancre: 'delais',
      corps: [
        p(
          'Les délais annoncés, y compris ceux figurant sur ce site, sont donnés à titre indicatif. Ils dépendent des rotations maritimes, des conditions météorologiques, des opérations portuaires et des contrôles douaniers, qui échappent à notre maîtrise.',
        ),
        p(
          'Un dépassement de délai n’ouvre pas droit à indemnité, ni à l’annulation de la commande, sauf engagement écrit exprès de notre part sur une date garantie.',
        ),
      ],
    },
    {
      titre: 'Responsabilité',
      ancre: 'responsabilite',
      corps: [
        p(
          'Notre responsabilité de commissionnaire s’exerce dans les limites fixées par le contrat type de commission de transport annexé au décret n° 2013-293 du 5 avril 2013, applicable à défaut de convention écrite contraire.',
        ),
        p(
          'La responsabilité du fait des transporteurs substitués est en outre limitée par les conventions applicables au mode d’acheminement employé :',
        ),
        ...liste(
          'transport routier international : Convention de Genève du 19 mai 1956, dite CMR',
          'transport maritime : Convention de Bruxelles de 1924 et ses protocoles, dites Règles de La Haye-Visby',
          'transport aérien : Convention de Montréal du 28 mai 1999',
        ),
        p(
          'En toute hypothèse, notre indemnisation ne peut excéder celle que nous pouvons obtenir du transporteur substitué, dans la limite des plafonds légaux applicables. Les dommages immatériels et pertes d’exploitation ne sont pas indemnisés.',
        ),
      ],
    },
    {
      titre: 'Assurance des marchandises',
      ancre: 'assurance',
      corps: [
        p(
          'Les limitations d’indemnité rappelées ci-dessus sont souvent très inférieures à la valeur réelle des marchandises. Nous vous recommandons de souscrire une assurance ad valorem.',
        ),
        p(
          'Cette assurance n’est jamais souscrite d’office : elle doit faire l’objet d’une demande écrite de votre part, précisant la nature et la valeur à assurer, avant l’enlèvement.',
        ),
      ],
    },
    {
      titre: 'Paiement',
      ancre: 'paiement',
      corps: [
        p(
          'Sauf convention particulière, nos prestations sont payables à réception de facture. Aucun escompte n’est accordé pour paiement anticipé.',
        ),
        p(
          'Tout retard de paiement entraîne de plein droit des pénalités calculées au taux d’intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de dix points, ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 €, conformément à l’article L.441-10 du code de commerce.',
        ),
        p(
          'Conformément à l’article L.132-2 du code de commerce, nous disposons d’un privilège et d’un droit de rétention sur les marchandises pour les créances nées à leur occasion.',
        ),
      ],
    },
    {
      titre: 'Réclamations',
      ancre: 'reclamations',
      corps: [
        p(
          'Toute avarie ou perte partielle doit faire l’objet de réserves précises et motivées à la livraison, confirmées au transporteur et à nous-mêmes par écrit dans les trois jours ouvrables suivant la réception. À défaut, la marchandise est réputée livrée conforme.',
        ),
        p(
          'Les actions nées du contrat de commission de transport se prescrivent par un an à compter de la livraison, ou de la date à laquelle elle aurait dû intervenir.',
        ),
      ],
    },
    {
      titre: 'Clients particuliers',
      ancre: 'consommateurs',
      corps: [
        p(
          'Les présentes conditions ne privent le client consommateur d’aucun des droits que lui reconnaît le code de la consommation, notamment en matière de garanties légales.',
        ),
        p(
          'En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation, après nous avoir adressé une réclamation écrite. Les coordonnées du médiateur figurent dans nos ',
          lien('mentions légales', '/mentions-legales'),
          '.',
        ),
      ],
    },
    {
      titre: 'Droit applicable',
      ancre: 'droit-applicable',
      corps: [
        p(
          'Les présentes conditions sont soumises au droit français. Seule la version française fait foi, toute traduction étant fournie à titre d’information.',
        ),
        p(
          'À défaut de résolution amiable, les litiges relèvent de la compétence du tribunal de commerce de Bobigny pour les clients professionnels. Pour les clients consommateurs, les règles légales de compétence s’appliquent.',
        ),
      ],
    },
  ],
};
```

- [ ] **Étape 2 : créer la route**

`apps/web/src/app/[locale]/cgv/page.tsx`, contenu intégral :

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageLegale } from '@/sanity/queries';
import { PageLegale } from '@/components/legal/PageLegale';
import { fusionner } from '@/content/legal/fusion';
import { CGV_FR } from '@/content/legal/cgv';

export { generateStaticParams } from '@/i18n/staticParams';

const SLUG = 'cgv';
const SEO = {
  titre: 'Conditions générales de vente — HGWF Cargo',
  description:
    'Conditions générales de vente et d’organisation de transport de HGWF Cargo : devis, délais, responsabilité, assurance et paiement.',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return {
    title: data?.seoTitre || SEO.titre,
    description: data?.seoDescription || SEO.description,
  };
}

export default async function CgvPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getPageLegale(resolveLocale(locale), SLUG);
  return <PageLegale contenu={fusionner(CGV_FR, data)} locale={locale} />;
}
```

- [ ] **Étape 3 : vérifier**

```bash
cd apps/web && pnpm typecheck && pnpm build
ls apps/web/out/fr/cgv/index.html apps/web/out/en/cgv/index.html
```

Attendu : les deux fichiers existent.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/src/content/legal/cgv.ts "apps/web/src/app/[locale]/cgv/page.tsx"
git commit -m "feat(web): conditions générales de vente"
```

---

### Tâche 8 : Versions anglaises des mentions et de la confidentialité

**Fichiers**
- Créer : `apps/web/src/content/legal/mentions.en.ts`
- Créer : `apps/web/src/content/legal/confidentialite.en.ts`
- Créer : `apps/web/src/content/legal/index.ts`
- Modifier : `apps/web/src/app/[locale]/mentions-legales/page.tsx`
- Modifier : `apps/web/src/app/[locale]/confidentialite/page.tsx`
- Modifier : `apps/web/src/app/[locale]/cgv/page.tsx`

**Interfaces**
- Produit : `contenuLegal(slug: 'mentions-legales' | 'confidentialite' | 'cgv', locale: Locale): ContenuLegal`.

- [ ] **Étape 1 : traduire les deux documents**

Reprendre `MENTIONS_FR` et `CONFIDENTIALITE_FR` paragraphe par paragraphe en anglais britannique, en conservant **strictement les mêmes ancres** : elles servent de liens permanents et ne doivent pas varier d'une langue à l'autre. Dénominations sociales, adresses et numéros d'immatriculation ne se traduisent pas.

`MENTIONS_EN` — `eyebrow: 'Legal information'`, `titrePage: 'Legal notice.'`, `dateMaj: '2026-07-21'`, et les six sections dans le même ordre :

| ancre | titre EN |
|---|---|
| `editeur` | Publisher |
| `immatriculation` | Company registration |
| `direction` | Publication director |
| `hebergement` | Hosting |
| `propriete-intellectuelle` | Intellectual property |
| `donnees-personnelles` | Personal data |

`CONFIDENTIALITE_EN` — `eyebrow: 'Data protection'`, `titrePage: 'Privacy policy.'`, et les sept sections :

| ancre | titre EN |
|---|---|
| `responsable` | Data controller |
| `finalites` | Data collected and purposes |
| `destinataires` | Recipients |
| `transferts` | Transfers outside the European Union |
| `vos-droits` | Your rights |
| `cookies` | Cookies |
| `securite` | Security |

Dans la version anglaise, les sous-titres de la section `finalites` deviennent : Quote request, Contact form, Shipment tracking, Service security. Les durées de conservation et bases légales sont identiques — ce sont les mêmes traitements.

- [ ] **Étape 2 : écrire le sélecteur**

`apps/web/src/content/legal/index.ts` :

```ts
import type { Locale } from '@hgwf/shared';
import type { ContenuLegal } from '@/components/legal/PageLegale';
import { MENTIONS_FR } from './mentions';
import { MENTIONS_EN } from './mentions.en';
import { CONFIDENTIALITE_FR } from './confidentialite';
import { CONFIDENTIALITE_EN } from './confidentialite.en';
import { CGV_FR } from './cgv';

export type SlugLegal = 'mentions-legales' | 'confidentialite' | 'cgv';

// Les CGV ne sont pas traduites : seule la version française engage. Servir une
// traduction créerait une seconde version susceptible de diverger.
const CONTENUS: Record<SlugLegal, { fr: ContenuLegal; en: ContenuLegal }> = {
  'mentions-legales': { fr: MENTIONS_FR, en: MENTIONS_EN },
  confidentialite: { fr: CONFIDENTIALITE_FR, en: CONFIDENTIALITE_EN },
  cgv: { fr: CGV_FR, en: CGV_FR },
};

export function contenuLegal(slug: SlugLegal, locale: Locale): ContenuLegal {
  return CONTENUS[slug][locale === 'en' ? 'en' : 'fr'];
}
```

- [ ] **Étape 3 : brancher les trois routes**

Dans chacune des trois pages, remplacer l'import du contenu par `import { contenuLegal } from '@/content/legal';` et l'appel de rendu par :

```tsx
return <PageLegale contenu={fusionner(contenuLegal(SLUG, resolveLocale(locale)), data)} locale={locale} />;
```

en typant `const SLUG = 'mentions-legales' as const;` (respectivement `'confidentialite'`, `'cgv'`).

Ajouter dans la page CGV, en tête de la première section, un paragraphe visible en anglais uniquement : « Only the French version of these terms is legally binding. »

- [ ] **Étape 4 : vérifier**

```bash
cd apps/web && pnpm typecheck && pnpm build
grep -o 'Legal notice' apps/web/out/en/mentions-legales/index.html | head -1
grep -o 'Only the French version' apps/web/out/en/cgv/index.html | head -1
```

Attendu : les deux chaînes sont trouvées.

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/content/legal/ "apps/web/src/app/[locale]"
git commit -m "feat(web): versions anglaises des mentions légales et de la confidentialité"
```

---

### Tâche 9 : Pied de page — liens légaux et correction de la ligne légale

**Fichiers**
- Modifier : `apps/studio/schemaTypes/singletons/footer.ts`
- Modifier : `apps/web/src/sanity/queries.ts`
- Modifier : `apps/web/src/components/Footer.tsx`

**Interfaces**
- Consomme : `FooterData` (existant).
- Produit : `FooterData.liensLegaux?: LienNav[] | null`.

**Contexte à connaître.** Le champ `ligneLegale` du document `footer` en production contient 1 095 caractères invisibles — espaces de largeur nulle U+200B, U+200C, U+200D et U+FEFF — pour 125 caractères visibles. Ils sont servis sur chaque page. La correction du contenu se fait en tâche 10 ; ici on protège le rendu.

- [ ] **Étape 1 : écrire le test de nettoyage qui échoue**

Créer `apps/web/src/components/footer.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { nettoyerInvisibles } from './nettoyerInvisibles';

describe('nettoyerInvisibles', () => {
  it('retire les espaces de largeur nulle', () => {
    expect(nettoyerInvisibles('HGWF​‌‍﻿CARGO')).toBe('HGWFCARGO');
  });

  it('laisse le texte normal intact, sauts de ligne compris', () => {
    expect(nettoyerInvisibles('A · B\nC')).toBe('A · B\nC');
  });

  it('tolère une valeur vide', () => {
    expect(nettoyerInvisibles('')).toBe('');
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

```bash
cd apps/web && pnpm vitest run src/components/footer.test.ts
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Étape 3 : écrire la fonction**

`apps/web/src/components/nettoyerInvisibles.ts` :

```ts
// Le champ `ligneLegale` du CMS a été collé depuis une source qui y a laissé un
// millier de caractères de largeur nulle. On nettoie au rendu pour que le
// problème ne réapparaisse pas au prochain copier-coller.
const INVISIBLES = /[​-‏⁠-⁯﻿]/g;

export function nettoyerInvisibles(texte: string): string {
  return texte.replace(INVISIBLES, '');
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

```bash
cd apps/web && pnpm vitest run src/components/footer.test.ts
```

Attendu : 3 tests passés.

- [ ] **Étape 5 : ajouter `liensLegaux` au schéma**

Dans `apps/studio/schemaTypes/singletons/footer.ts`, avant les trois champs `mentions*`, ajouter :

```ts
    defineField({
      name: 'liensLegaux',
      title: 'Liens légaux (bas de page)',
      type: 'array',
      description: 'Remplace le lien unique « Mentions légales » dès qu’au moins une entrée est renseignée.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'libelleFr', title: 'Libellé FR', type: 'string' },
            { name: 'libelleEn', title: 'Libellé EN', type: 'string' },
            { name: 'href', title: 'Lien', type: 'string' },
          ],
          preview: { select: { title: 'libelleFr', subtitle: 'href' } },
        },
      ],
    }),
```

et marquer les trois champs `mentionsLibelleFr`, `mentionsLibelleEn`, `mentionsHref` d'une `description: 'Ancien champ, conservé comme repli. Utiliser « Liens légaux ».'`.

- [ ] **Étape 6 : exposer le champ dans la requête**

Dans `apps/web/src/sanity/queries.ts`, ajouter à `FooterData` :

```ts
  liensLegaux?: LienNav[] | null;
```

et dans la requête `FOOTER`, ajouter `liensLegaux[]{libelleFr, libelleEn, href},` avant `copyrightFr`.

- [ ] **Étape 7 : afficher les liens et nettoyer la ligne légale**

Dans `apps/web/src/components/Footer.tsx` :

remplacer la ligne 77 par

```tsx
  const ligneLegale = nettoyerInvisibles(footer?.ligneLegale ?? LIGNE_LEGALE_DEFAUT);
```

en important `import { nettoyerInvisibles } from './nettoyerInvisibles';`.

Remplacer le bloc `mentionsLibelle` / `mentionsHref` (lignes 82 à 86) par :

```tsx
  const LIENS_LEGAUX_DEFAUT = [
    { fr: 'Mentions légales', en: 'Legal notice', href: '/mentions-legales' },
    { fr: 'Politique de confidentialité', en: 'Privacy policy', href: '/confidentialite' },
    { fr: 'CGV', en: 'Terms of sale', href: '/cgv' },
  ];

  const liensLegaux = footer?.liensLegaux?.length
    ? footer.liensLegaux.map((l) => ({
        libelle: (en ? l.libelleEn : l.libelleFr) ?? l.libelleFr ?? '',
        href: l.href ?? '/',
      }))
    : LIENS_LEGAUX_DEFAUT.map((l) => ({ libelle: en ? l.en : l.fr, href: l.href }));
```

et remplacer le `<Link>` unique des lignes 153-155 par :

```tsx
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0">
            {liensLegaux.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-creme/55 transition hover:text-or">
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
```

- [ ] **Étape 8 : vérifier**

```bash
cd apps/web && pnpm typecheck && pnpm vitest run && pnpm build
grep -c 'confidentialite' apps/web/out/fr/index.html
```

Attendu : au moins 1.

- [ ] **Étape 9 : commit**

```bash
git add apps/studio/schemaTypes/singletons/footer.ts apps/web/src/sanity/queries.ts apps/web/src/components/
git commit -m "feat(web): liens légaux en pied de page et nettoyage des caractères invisibles"
```

---

### Tâche 10 : Correction des données Sanity — identité et migration des mentions

**Fichiers**
- Créer : `apps/studio/scripts/corriger-identite.ts`
- Créer : `apps/studio/scripts/migrer-pages-legales.ts`
- Modifier : `apps/studio/scripts/seed-site.ts`

**Contexte.** Trois documents de production portent l'identité erronée : `siteSettings` (`raisonSociale`, `adresseSiege`), `footer` (`ligneLegale`) et `pageMentions-fr`. Les scripts s'exécutent par `npx sanity exec scripts/<nom>.ts --with-user-token`.

- [ ] **Étape 1 : écrire le script de correction d'identité**

`apps/studio/scripts/corriger-identite.ts` :

```ts
/**
 * Aligne l'identité légale des documents de production sur le registre du
 * commerce (SIREN 940048051) et purge les caractères invisibles de la ligne
 * légale du pied de page.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-identite.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const INVISIBLES = /[​-‏⁠-⁯﻿]/g;

const RAISON_SOCIALE = 'HGWF CARGO';
const ADRESSE_SIEGE = 'Avenue Faidherbe, 93110 Rosny-sous-Bois';
const LIGNE_LEGALE =
  'HGWF CARGO · AVENUE FAIDHERBE\n93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051';

async function main() {
  const avant = await client.fetch<{ ligneLegale?: string } | null>('*[_id == "footer"][0]{ligneLegale}');
  const invisibles = (avant?.ligneLegale ?? '').match(INVISIBLES)?.length ?? 0;
  console.log(`ligneLegale : ${invisibles} caractères invisibles à retirer`);

  await client.patch('siteSettings').set({ raisonSociale: RAISON_SOCIALE, adresseSiege: ADRESSE_SIEGE }).commit();
  console.log('  ✓ siteSettings (raisonSociale, adresseSiege)');

  await client.patch('footer').set({ ligneLegale: LIGNE_LEGALE }).commit();
  console.log('  ✓ footer (ligneLegale)');

  console.log('Correction terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

- [ ] **Étape 2 : exécuter et vérifier**

```bash
cd apps/studio && npx sanity exec scripts/corriger-identite.ts --with-user-token
curl -s --get "https://b5xsqdjy.api.sanity.io/v2021-06-07/data/query/production" \
  --data-urlencode 'query=*[_id=="siteSettings"][0]{raisonSociale,adresseSiege}'
```

Attendu : `HGWF CARGO` et l'adresse de Rosny-sous-Bois.

- [ ] **Étape 3 : écrire le script de migration**

`apps/studio/scripts/migrer-pages-legales.ts` :

```ts
/**
 * Migre pageMentions-fr vers pageLegale-mentions-fr.
 *
 * La section « Éditeur du site » n'est pas reprise : son contenu est erroné
 * (dénomination absente du RCS, établissement fermé en décembre 2025). Elle est
 * remplacée par l'identité du registre.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/migrer-pages-legales.ts --with-user-token   # plan seul
 *   CONFIRMER=1 npx sanity exec scripts/migrer-pages-legales.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const SOURCE = 'pageMentions-fr';
const CIBLE = 'pageLegale-mentions-fr';

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal';
  children: { _type: 'span'; _key: string; text: string; marks: string[] }[];
  markDefs: never[];
};

// Une ligne de texte brut devient un paragraphe. Les lignes vides sont ignorées.
function enBlocs(texte: string): Bloc[] {
  return texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((ligne) => ({
      _type: 'block' as const,
      _key: cle('b'),
      style: 'normal' as const,
      children: [{ _type: 'span' as const, _key: cle('s'), text: ligne, marks: [] }],
      markDefs: [],
    }));
}

const EDITEUR_CORRIGE = enBlocs(
  [
    'HGWF CARGO, société par actions simplifiée.',
    'Siège social : avenue Faidherbe, 93110 Rosny-sous-Bois, France.',
    'Adresse logistique : 10 rue Diderot, 93110 Rosny-sous-Bois.',
    'Courriel : contact@hgwf-cargo.fr — Téléphone : +33 6 27 05 69 34.',
  ].join('\n'),
);

const ancrer = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  const source = await client.fetch<{
    eyebrow?: string;
    titrePage?: string;
    seoTitre?: string;
    seoDescription?: string;
    sections?: { titre?: string; corps?: string }[];
  } | null>(`*[_id == $id][0]`, { id: SOURCE });

  if (!source) {
    console.error(`${SOURCE} est introuvable — rien à migrer. Utiliser seed-pages-legales.ts à la place.`);
    process.exit(1);
  }

  const existante = await client.fetch<{ _id: string } | null>(`*[_id == $id][0]{_id}`, { id: CIBLE });
  if (existante) {
    console.error(`${CIBLE} existe déjà. Supprimer ce document avant de relancer la migration.`);
    process.exit(1);
  }

  const sections = (source.sections ?? []).map((s) => {
    const titre = s.titre ?? '';
    const remplace = titre.toLowerCase().startsWith('éditeur');
    return {
      _key: cle('sec'),
      titre,
      ancre: { _type: 'slug' as const, current: ancrer(titre) },
      corps: remplace ? EDITEUR_CORRIGE : enBlocs(s.corps ?? ''),
      _remplace: remplace,
    };
  });

  console.log(`Plan de migration ${SOURCE} → ${CIBLE}`);
  sections.forEach((s) => {
    const marque = s._remplace ? 'REMPLACÉE (identité corrigée)' : 'reprise';
    console.log(`  · ${s.titre} — ${marque}, ${s.corps.length} paragraphe(s)`);
  });

  if (process.env.CONFIRMER !== '1') {
    console.log('\nSimulation uniquement. Relancer avec CONFIRMER=1 pour écrire.');
    return;
  }

  await client.create({
    _id: CIBLE,
    _type: 'pageLegale',
    titre: 'Mentions légales',
    slug: { _type: 'slug', current: 'mentions-legales' },
    language: 'fr',
    eyebrow: source.eyebrow ?? 'Informations légales',
    titrePage: source.titrePage ?? 'Mentions légales.',
    dateMaj: new Date().toISOString().slice(0, 10),
    seoTitre: source.seoTitre ?? 'Mentions légales — HGWF Cargo',
    seoDescription:
      source.seoDescription ?? 'Mentions légales du site HGWF Cargo — éditeur, immatriculation et hébergeur.',
    sections: sections.map(({ _remplace, ...s }) => s),
  });

  console.log(`\n  ✓ ${CIBLE} créé. ${SOURCE} est conservé : le supprimer en tâche 11, après vérification en ligne.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

- [ ] **Étape 4 : exécuter en simulation puis pour de vrai**

```bash
cd apps/studio && npx sanity exec scripts/migrer-pages-legales.ts --with-user-token
CONFIRMER=1 npx sanity exec scripts/migrer-pages-legales.ts --with-user-token
```

Attendu : le premier appel affiche le plan sans écrire ; le second confirme la création de `pageLegale-mentions-fr`.

- [ ] **Étape 5 : corriger le seed**

Dans `apps/studio/scripts/seed-site.ts`, remplacer dans le bloc `siteSettings` :

```ts
    raisonSociale: 'HGWF CARGO',
```

et

```ts
    adresseSiege: 'Avenue Faidherbe, 93110 Rosny-sous-Bois',
```

et dans le bloc `footer`, remplacer les trois champs `mentions*` par le tableau `liensLegaux` correspondant aux trois pages.

- [ ] **Étape 6 : commit**

```bash
git add apps/studio/scripts/
git commit -m "fix(studio): aligne l'identité légale sur le registre et migre les mentions vers pageLegale"
```

---

### Tâche 11 : Seed des pages légales et retrait de `pageMentions`

**Fichiers**
- Créer : `apps/studio/scripts/seed-pages-legales.ts`
- Supprimer : `apps/studio/schemaTypes/documents/pageMentions.ts`
- Modifier : `apps/studio/schemaTypes/index.ts`
- Modifier : `apps/web/src/sanity/queries.ts`

- [ ] **Étape 1 : écrire le seed**

`apps/studio/scripts/seed-pages-legales.ts` :

```ts
/**
 * Crée les pages légales absentes du dataset, à partir des mêmes textes que les
 * contenus par défaut du site.
 *
 * createIfNotExists et non createOrReplace : le script ne doit jamais écraser
 * une modification faite par le client dans le Studio.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/seed-pages-legales.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

const p = (texte: string) => ({
  _type: 'block',
  _key: cle('b'),
  style: 'normal',
  children: [{ _type: 'span', _key: cle('s'), text: texte, marks: [] }],
  markDefs: [],
});

const section = (titre: string, ancre: string, lignes: string[]) => ({
  _key: cle('sec'),
  titre,
  ancre: { _type: 'slug', current: ancre },
  corps: lignes.map(p),
});

// Recopier ici, section par section, les textes de
// apps/web/src/content/legal/{confidentialite,cgv,mentions.en,confidentialite.en}.ts
const DOCUMENTS = [
  {
    _id: 'pageLegale-confidentialite-fr',
    language: 'fr',
    slug: 'confidentialite',
    titre: 'Politique de confidentialité',
    eyebrow: 'Protection des données',
    titrePage: 'Politique de confidentialité.',
    sections: [section('Responsable du traitement', 'responsable', ['…'])],
  },
  // pageLegale-cgv-fr, pageLegale-mentions-en, pageLegale-confidentialite-en
];

async function main() {
  for (const d of DOCUMENTS) {
    const { _id, slug, language, ...reste } = d;
    const res = await client.createIfNotExists({
      _id,
      _type: 'pageLegale',
      slug: { _type: 'slug', current: slug },
      language,
      dateMaj: '2026-07-21',
      ...reste,
    });
    console.log(`  ✓ ${res._id}`);
  }
  console.log('Seed des pages légales terminé.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

Les `'…'` sont à remplacer par les textes réels : ce sont exactement ceux écrits aux tâches 6, 7 et 8, à recopier ligne par ligne. Le script est volontairement du texte brut converti en paragraphes — les liens et listes se saisissent ensuite dans le Studio si le client le souhaite, la version du code restant la référence.

- [ ] **Étape 2 : exécuter**

```bash
cd apps/studio && npx sanity exec scripts/seed-pages-legales.ts --with-user-token
```

Attendu : quatre documents créés.

- [ ] **Étape 3 : vérifier en ligne avant de supprimer quoi que ce soit**

```bash
cd apps/web && pnpm build
grep -o 'avenue Faidherbe' apps/web/out/fr/mentions-legales/index.html
```

Attendu : la chaîne est présente, servie depuis Sanity.

- [ ] **Étape 4 : retirer l'ancien type**

Supprimer `apps/studio/schemaTypes/documents/pageMentions.ts`, retirer son import et son entrée dans `apps/studio/schemaTypes/index.ts`, puis supprimer `PageMentionsData`, `PAGE_MENTIONS` et `getPageMentions` de `apps/web/src/sanity/queries.ts`.

Supprimer enfin le document devenu orphelin :

```bash
cd apps/studio && npx sanity documents delete pageMentions-fr --dataset production
```

- [ ] **Étape 5 : vérifier**

```bash
cd apps/studio && pnpm typecheck && pnpm build
cd ../web && pnpm typecheck && pnpm build && pnpm vitest run
```

Attendu : tout passe.

- [ ] **Étape 6 : commit**

```bash
git add -A apps/studio apps/web/src/sanity/queries.ts
git commit -m "chore(studio): retire le schéma pageMentions, remplacé par pageLegale"
```

---

### Tâche 12 : Information RGPD sous les formulaires

**Fichiers**
- Modifier : `apps/web/src/components/contact/ContactForm.tsx`
- Modifier : `apps/web/src/components/devis/DevisForm.tsx`

- [ ] **Étape 1 : ajouter la mention au formulaire de contact**

Juste après le bouton d'envoi, insérer :

```tsx
        <p className="m-0 text-xs leading-[1.5] text-encre-douce">
          Les informations recueillies servent uniquement à traiter votre demande. Elles sont conservées trois ans
          et ne sont jamais cédées. Vous disposez d’un droit d’accès, de rectification et d’effacement — voir notre{' '}
          <Link href="/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
```

en s'assurant que `Link` est importé depuis `@/i18n/navigation`.

- [ ] **Étape 2 : ajouter la mention au formulaire de devis**

Même paragraphe, sous le bouton d'envoi de la dernière étape, avec « votre demande de devis » à la place de « votre demande ».

Ne pas ajouter de case à cocher : la base légale est l'exécution de mesures précontractuelles, pas le consentement.

- [ ] **Étape 3 : vérifier**

```bash
cd apps/web && pnpm build
grep -c 'politique de confidentialité' apps/web/out/fr/contact/index.html apps/web/out/fr/devis/index.html
```

Attendu : au moins 1 pour chaque fichier.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/src/components/contact/ContactForm.tsx apps/web/src/components/devis/DevisForm.tsx
git commit -m "feat(web): information RGPD sous les formulaires contact et devis"
```

---

### Tâche 13 : Bandeau de consentement dormant

**Fichiers**
- Créer : `apps/web/src/components/consentement/decision.ts`
- Créer : `apps/web/src/components/consentement/decision.test.ts`
- Créer : `apps/web/src/components/consentement/ConsentementCookies.tsx`
- Modifier : `apps/web/src/app/[locale]/layout.tsx`

**Interfaces**
- Produit : `doitAfficher(actif: boolean, choix: string | null): boolean`, `<ConsentementCookies />`.

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/components/consentement/decision.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { doitAfficher } from './decision';

describe('doitAfficher', () => {
  it('reste invisible tant que le dispositif est inactif', () => {
    expect(doitAfficher(false, null)).toBe(false);
    expect(doitAfficher(false, 'refuse')).toBe(false);
  });

  it('s’affiche une fois actif si aucun choix n’a été fait', () => {
    expect(doitAfficher(true, null)).toBe(true);
  });

  it('disparaît une fois le choix enregistré', () => {
    expect(doitAfficher(true, 'accepte')).toBe(false);
    expect(doitAfficher(true, 'refuse')).toBe(false);
  });

  it('s’affiche de nouveau si la valeur stockée est inexploitable', () => {
    expect(doitAfficher(true, 'n’importe quoi')).toBe(true);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

```bash
cd apps/web && pnpm vitest run src/components/consentement/decision.test.ts
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Étape 3 : écrire la décision**

`apps/web/src/components/consentement/decision.ts` :

```ts
export const CLE_STOCKAGE = 'hgwf-consentement';
export type Choix = 'accepte' | 'refuse';

export function doitAfficher(actif: boolean, choix: string | null): boolean {
  if (!actif) return false;
  return choix !== 'accepte' && choix !== 'refuse';
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

```bash
cd apps/web && pnpm vitest run src/components/consentement/decision.test.ts
```

Attendu : 4 tests passés.

- [ ] **Étape 5 : écrire le composant**

`apps/web/src/components/consentement/ConsentementCookies.tsx` :

```tsx
'use client';

import { useEffect, useState } from 'react';
import { CLE_STOCKAGE, doitAfficher, type Choix } from './decision';

// Dispositif dormant : sans NEXT_PUBLIC_CONSENTEMENT_COOKIES=1, ce composant ne
// rend rien. Le site ne dépose aujourd'hui aucun cookie — demander un
// consentement sans objet nuirait à l'expérience sans rien apporter.
const ACTIF = process.env.NEXT_PUBLIC_CONSENTEMENT_COOKIES === '1';

export function ConsentementCookies({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const en = locale === 'en';

  useEffect(() => {
    if (!ACTIF) return;
    let choix: string | null = null;
    try {
      choix = window.localStorage.getItem(CLE_STOCKAGE);
    } catch {
      // Navigation privée ou stockage bloqué : on affiche le bandeau.
    }
    setVisible(doitAfficher(ACTIF, choix));
  }, []);

  if (!ACTIF || !visible) return null;

  const enregistrer = (choix: Choix) => {
    try {
      window.localStorage.setItem(CLE_STOCKAGE, choix);
    } catch {
      // Sans stockage, le choix vaut pour la session en cours.
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={en ? 'Cookie consent' : 'Consentement aux cookies'}
      className="fixed inset-x-3 bottom-3 z-70 mx-auto max-w-[560px] rounded-[18px] border border-marine/20 bg-creme p-5 shadow-lg"
    >
      <p className="m-0 text-sm leading-[1.55] text-encre-douce">
        {en
          ? 'We use measurement cookies to understand how the site is used. You can refuse them without affecting your browsing.'
          : 'Nous utilisons des cookies de mesure d’audience pour comprendre l’usage du site. Vous pouvez les refuser sans que cela change votre navigation.'}{' '}
        <a href={`/${locale}/confidentialite/#cookies`} className="font-medium text-corail underline">
          {en ? 'Learn more' : 'En savoir plus'}
        </a>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => enregistrer('refuse')}
          className="presse w-full rounded-full border-[1.5px] border-marine px-6 py-2.5 text-sm font-medium text-marine hover:bg-marine hover:text-creme sm:w-auto"
        >
          {en ? 'Refuse all' : 'Tout refuser'}
        </button>
        <button
          type="button"
          onClick={() => enregistrer('accepte')}
          className="presse w-full rounded-full border-[1.5px] border-marine bg-marine px-6 py-2.5 text-sm font-medium text-creme hover:bg-marine-fonce sm:w-auto"
        >
          {en ? 'Accept all' : 'Tout accepter'}
        </button>
      </div>
    </div>
  );
}
```

Les deux boutons ont volontairement le même encombrement et la même hiérarchie visuelle : un refus plus discret que l'acceptation constitue une « boîte noire » que la CNIL sanctionne.

- [ ] **Étape 6 : monter le composant**

Dans `apps/web/src/app/[locale]/layout.tsx`, importer `import { ConsentementCookies } from '@/components/consentement/ConsentementCookies';` et l'insérer juste après `<Footer locale={locale} />` :

```tsx
          <ConsentementCookies locale={locale} />
```

- [ ] **Étape 7 : vérifier qu'il reste bien invisible par défaut**

```bash
cd apps/web && pnpm build
grep -c 'hgwf-consentement' apps/web/out/fr/index.html
```

Attendu : `0` — sans la variable d'environnement, le bandeau ne doit rien produire.

- [ ] **Étape 8 : commit**

```bash
git add apps/web/src/components/consentement/ "apps/web/src/app/[locale]/layout.tsx"
git commit -m "feat(web): bandeau de consentement dormant, activable par variable d'environnement"
```

---

### Tâche 14 : Vérification d'ensemble

**Fichiers** : aucun. Cette tâche valide le lot.

- [ ] **Étape 1 : chaîne complète**

```bash
cd apps/web && pnpm typecheck && pnpm vitest run && pnpm build
cd ../studio && pnpm typecheck && pnpm build
```

Attendu : tout passe.

- [ ] **Étape 2 : les six pages sont émises**

```bash
ls apps/web/out/{fr,en}/{mentions-legales,confidentialite,cgv}/index.html
```

Attendu : six fichiers.

- [ ] **Étape 3 : les liens du pied de page répondent**

```bash
cd apps/web/out && npx --yes serve -l 4321 . &
sleep 5
for p in mentions-legales confidentialite cgv; do
  echo -n "$p : "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4321/fr/$p/"
done
```

Attendu : trois fois `200`. Penser à arrêter le serveur ensuite, y compris le processus `serve` enfant.

- [ ] **Étape 4 : plus aucune trace de l'identité erronée**

```bash
grep -ril "SOLUTIONS TRANSPORTS LOGISTIQUES\|Villepinte" apps/web/out apps/web/src apps/studio | grep -v node_modules
```

Attendu : aucune sortie.

- [ ] **Étape 5 : hiérarchie des titres et ancres**

```bash
grep -o '<h[123]' apps/web/out/fr/confidentialite/index.html | sort | uniq -c
grep -o 'id="[a-z-]*"' apps/web/out/fr/confidentialite/index.html | head
```

Attendu : un seul `<h1`, des `<h2` pour les sections, des `<h3` dans les corps ; les ancres correspondent aux entrées du sommaire.

- [ ] **Étape 6 : commit final et PR**

```bash
git add -A
git commit -m "chore: vérifications du lot pages légales"
gh pr create --base main --head feat/pages-legales --title "feat: mentions légales, politique de confidentialité et CGV"
```

Le corps de la PR doit lister : les quatre écarts corrigés, les six données à obtenir du client, les quatre points à faire valider par un juriste, et le fait que la politique de confidentialité ne doit pas être publiée avant confirmation de la région d'hébergement Sanity.

---

## Après le plan

Trois choses restent à la charge du client, et aucune n'est bloquante pour l'implémentation :

1. Fournir les six données manquantes listées dans la spec.
2. Faire valider les CGV et la clause de transfert hors UE.
3. Confirmer la dénomination et l'adresse du siège.
