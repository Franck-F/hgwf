# Spec — Fondations techniques de la refonte HGWF Cargo

> **Date :** 2026-06-25
> **Statut :** validé (design) — en attente de relecture utilisateur avant plan d'implémentation
> **Périmètre :** poser les bases de développement. Le design définitif (direction artistique) et les contenus réels viendront ensuite.

---

## 1. Contexte

Refonte du site de **HGWF SOLUTIONS TRANSPORTS LOGISTIQUES** (nom commercial **HGWF Cargo**), commissionnaire de transport international (fret maritime / aérien / terrestre, déménagement outre-mer, vente de conteneurs d'occasion). Site actuel : WordPress basique (`https://www.hgwf-cargo.fr/`). Le contenu et l'audit existants sont synthétisés dans `refonte-hgwf-cargo.md`.

Cibles : particuliers/expatriés, militaires & fonctionnaires en mutation outre-mer, professionnels (B2B), acheteurs de conteneurs. Destinations clés : Pacifique (Nouvelle-Calédonie, Wallis-et-Futuna, Tahiti…), Caraïbes & Guyane, Afrique.

## 2. Objectif de ce livrable

Mettre en place une **base de développement complète et déployable** (sans la couche visuelle finale) :
solution intermédiaire alliant **performances élevées** (Next.js, rendu statique) et **simplicité d'usage** (admin Sanity hébergé gratuitement, hébergement OVH existant conservé, zéro maintenance serveur).

## 3. Décisions d'architecture (validées)

| Sujet | Décision | Raison |
|---|---|---|
| Hébergement cible | **OVH mutualisé** (pas de Node.js) | Existant conservé, aucun coût supplémentaire |
| Rendu | **Site statique** — Next.js `output: 'export'` | Compatible mutualisé, rapide, excellent SEO, sécurisé |
| CMS / admin | **Sanity** (Studio v3), hébergé **gratuitement chez Sanity** (`*.sanity.studio`) | Zéro maintenance serveur côté client |
| Structure | **Monorepo pnpm** : `apps/web` + `apps/studio` | Schémas/types partagés, un seul dépôt |
| i18n | **FR + EN actifs dès le départ**, `next-intl`, routes préfixées `/fr` `/en` | Destinations anglophones (Australie, NZ, Fidji) |
| i18n Sanity | **Niveau document** (`@sanity/document-internationalization`) | Pages FR/EN liées, modèle clair |
| Déploiement | **GitHub Actions → FTP/SFTP OVH** ; **webhook Sanity** déclenche le rebuild à chaque publication | Re-publication automatique du contenu |

## 4. Architecture (flux)

```
Sanity Studio (apps/studio, *.sanity.studio, admin gratuit)
   │  publish → webhook
   ▼
GitHub Actions (build + déploiement)
   │  lit le contenu Sanity au build (GROQ)
   │  next build → export statique (out/)
   │  FTP/SFTP
   ▼
OVH mutualisé (fichiers statiques HTML/CSS/JS servis au visiteur)
```

Le contenu Sanity est **figé au build**. Toute modification publiée dans le Studio déclenche un rebuild + redéploiement automatique. OVH ne sert que des fichiers statiques.

## 5. Structure du monorepo

```
hgwf-cargo/
├── apps/
│   ├── web/                      # Next.js 16 — App Router, export statique → OVH
│   │   ├── src/app/[locale]/     # routes localisées FR/EN
│   │   ├── src/sanity/           # client Sanity, requêtes GROQ, loader image CDN
│   │   ├── src/i18n/             # configuration next-intl
│   │   ├── src/components/       # layout neutre (header, footer, page type)
│   │   └── next.config.ts        # output: 'export'
│   └── studio/                   # Sanity Studio → *.sanity.studio
│       ├── schemaTypes/          # schémas = source de vérité du contenu
│       └── sanity.config.ts      # + plugin document-internationalization
├── packages/
│   └── shared/                   # types TS partagés (locales, slugs, helpers)
├── .github/workflows/            # CI : build + déploiement FTP OVH
├── docs/superpowers/specs/       # specs de conception
├── pnpm-workspace.yaml
├── package.json
└── README.md                     # prise en main (dev, build, déploiement)
```

## 6. Stack technique (aligné sur le projet AuditIQ existant)

| Élément | Choix |
|---|---|
| Framework | Next.js 16 (App Router), `output: 'export'` |
| UI | React 19, Tailwind CSS v4 |
| Langage | TypeScript 5 (mode strict) |
| i18n | next-intl (routes `/fr`, `/en`) |
| CMS | Sanity Studio v3 + `@sanity/document-internationalization` |
| Lint / format | ESLint (config Next) + Prettier |
| Gestionnaire de paquets | pnpm (workspace) |
| Images | `next/image` + loader **Sanity CDN** (transformations à la volée, compatible export statique) |

## 7. Modélisation de contenu Sanity

Issue de `refonte-hgwf-cargo.md`. Tout est **bilingue FR/EN** (niveau document).

- **Singletons** : `siteSettings` (raison sociale, adresses siège Villepinte / centre logistique Rosny, téléphones + WhatsApp, email, réseaux sociaux, délai de réponse), `navigation`, `footer`.
- **Page builder (blocs réutilisables)** : `hero`, `blocServices`, `blocDestinations`, `blocConteneurs`, `bandeauCTA`, `temoignages`, `faqSection`, `texteRiche`.
- **Documents structurés** :
  - `service` — maritime (LCL/FCL/RO-RO), aérien, terrestre/enlèvement, vente de conteneurs.
  - `destination` — Pacifique, Caraïbes & Guyane, Afrique & Océan Indien (fort levier SEO local, ex. délais de livraison par destination).
  - `profil` — particulier, militaire/fonctionnaire, professionnel.
  - `faqItem`, `temoignage`.
- **SEO** : champs meta (title, description) par document ; prévoir balisage Schema.org (LocalBusiness, FAQPage) côté `web` ultérieurement.

## 8. Périmètre des fondations (ce livrable)

**Inclus :**
1. Monorepo pnpm + configurations (TS strict, ESLint, Prettier, Tailwind v4).
2. `apps/web` : Next.js en export statique, routing i18n FR/EN, layout neutre (header/footer/page type), connexion Sanity (client + GROQ + loader image), `generateStaticParams` pour les routes dynamiques.
3. `apps/studio` : Sanity Studio configuré, schémas de contenu ci-dessus, internationalisation document-level.
4. `packages/shared` : types et constantes partagés.
5. CI/CD GitHub Actions : build + déploiement FTP/SFTP vers OVH ; déclenchement par webhook Sanity (`repository_dispatch`).
6. README de prise en main (dev local, variables d'environnement, build, déploiement).
7. Build statique fonctionnel de bout en bout (avec contenu de démonstration minimal).

**Exclu (phase design ultérieure) :**
- Direction artistique (une des 4 pistes : escale / grand-large / module / trajectoire).
- Composants visuels finalisés, animations, charte.
- Saisie des contenus réels.
- Formulaire de devis abouti.

## 9. Points à trancher au moment du design (non bloquants ici)

- **Formulaire de devis** : un site statique sur OVH mutualisé n'a pas de route API serveur. Prévoir un envoi vers un **endpoint externe configurable** (ex. Web3Forms / Formspree gratuit, ou fonction serverless). Démarrage possible via **WhatsApp click-to-chat + mailto** (déjà prévus dans le contenu actuel).
- **Suivi d'expédition**, **calculateur de volume m³**, **tableau des dates de départ** : fonctionnalités listées comme prioritaires dans l'audit, à concevoir après les fondations.
- **Pages légales** (mentions légales, CGV, politique de confidentialité / RGPD) : à rédiger et intégrer (modèle de contenu prévu).

## 10. Risques & points de vigilance

- **Export statique + formulaires** : aucune logique serveur sur OVH → toute interactivité backend passe par un service tiers. Acté (§9).
- **Webhook → rebuild** : latence entre publication et mise en ligne = durée du build CI (acceptable pour un site de contenu). À documenter pour le client.
- **Deux adresses** (siège Villepinte vs centre logistique Rosny) : bien expliciter dans `siteSettings` et l'UI.
- **Optimisation images** : `next/image` en export statique nécessite un loader externe → loader Sanity CDN retenu (pas d'optimisation Next côté serveur).
- **Cohérence avec AuditIQ** : reprendre les versions et conventions (Next 16, React 19, Tailwind v4, pnpm) pour limiter la divergence d'outillage.

## 11. Critères de succès du livrable

- `pnpm install` puis `pnpm --filter web build` produit un dossier `out/` statique sans erreur.
- Les routes `/fr` et `/en` sont générées et naviguables.
- Le Studio Sanity démarre en local (`pnpm --filter studio dev`) et expose les schémas.
- Le pipeline GitHub Actions est en place (build + étape de déploiement FTP paramétrée par secrets).
- README permettant à un dev de reprendre le projet sans contexte oral.
