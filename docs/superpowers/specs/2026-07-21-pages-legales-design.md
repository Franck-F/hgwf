# Pages légales — mentions, confidentialité, CGV

État : validé, prêt pour le plan d'implémentation
Date : 21 juillet 2026

## Contexte

Le site collecte des données personnelles depuis sa mise en ligne sans en informer les visiteurs. Un audit de l'existant a révélé quatre écarts, dont deux qui ne relèvent pas de la rédaction mais de la conformité.

**Ce qui existe.** Une page `/[locale]/mentions-legales/` alimentée par le schéma `pageMentions`, quatre sections (éditeur, immatriculation, direction, contact), et un lien unique en pied de page.

**Écart 1 — identité légale inexacte.** Les mentions publiées annoncent « HGWF SOLUTIONS TRANSPORTS LOGISTIQUES, 29 avenue Nollet, 93420 Villepinte ». Le registre public (API Recherche d'entreprises, SIREN 940048051) donne : **HGWF CARGO, SAS**, siège **avenue Faidherbe, 93110 Rosny-sous-Bois**, active depuis le 1er février 2025, NAF 49.41B, présidente Marie Rioltha Bagassien (Exantus). L'établissement de Villepinte existe sous ce SIREN mais il est **fermé depuis le 1er décembre 2025**, et aucune société « HGWF Solutions Transports Logistiques » n'apparaît au registre. Le RCS et le numéro de TVA affichés sont, eux, exacts.

Cette identité erronée figure à deux endroits, qu'il faudra corriger tous les deux : le contenu par défaut codé dans `page.tsx`, et le document `pageMentions-fr` du dataset `production`.

**Écart 2 — aucune information sur les données personnelles.** Les formulaires Contact et Devis collectent nom, e-mail, téléphone, message et détails d'expédition, transmis par l'API au dataset Sanity `operations`. Aucune mention de finalité, de base légale, de durée de conservation ni de droits. L'API conserve en outre les adresses IP en mémoire pour la limitation de débit.

**Écart 3 — transfert hors UE non déclaré.** Le projet Sanity `b5xsqdjy` ne déclare aucune résidence de données : il est sur l'hébergement par défaut, aux États-Unis. Les données personnelles des demandes de devis quittent donc l'Union sans que la garantie de transfert soit documentée.

**Écart 4 — ni CGV ni conditions de transport**, pour une activité de commissionnaire de transport où la responsabilité sur la marchandise est le sujet central.

**Ce qui n'est pas un problème.** Le site ne dépose aucun cookie : pas de traceur dans le code, ni `localStorage`, ni `document.cookie`, et aucun `Set-Cookie` en production. Aucun bandeau de consentement n'est donc requis aujourd'hui.

## Objectifs

1. Rendre le site conforme à la LCEN, au RGPD et aux obligations d'information du code de la consommation.
2. Rendre les textes éditables par le client depuis le Studio, sans intervention de développeur.
3. Ne rien affirmer de faux : toute donnée non vérifiable reste un champ vide, et la section ne s'affiche pas tant qu'il l'est.

## Non-objectifs

- Bandeau de consentement actif (aucun traceur à couvrir — composant livré dormant).
- Page CGU distincte.
- Traduction anglaise des CGV.
- Registre des traitements et analyse d'impact, qui relèvent du client et non du site.

## Architecture

### Schéma `pageLegale`

Un type de document unique, dataset `production`, traduisible FR/EN via `documentInternationalization`.

| Champ | Type | Rôle |
|---|---|---|
| `titre` | string | Titre affiché en `h1` |
| `slug` | slug | Liaison document ↔ route |
| `eyebrow` | string | Surtitre |
| `chapo` | text | Préambule |
| `dateMaj` | date | « Dernière mise à jour », attendue sur une politique de confidentialité |
| `sections[]` | array | `{ titre, ancre, corps: texteRiche }` |
| `seoTitre`, `seoDescription` | string, text | Métadonnées |
| `language` | string | Masqué, géré par l'i18n |

Trois documents épinglés dans la structure du Studio sous une entrée « Pages légales » : `pageLegale-mentions-fr`, `pageLegale-confidentialite-fr`, `pageLegale-cgv-fr`, plus les traductions EN des deux premiers.

**Sort de `pageMentions`.** Un document `pageMentions-fr` **existe en production**, créé le 12 juillet 2026, avec les quatre sections en texte brut et l'identité erronée décrite plus haut (vérifié par requête sur le dataset public). Il n'y a pas de version EN.

La bascule est donc une vraie migration, et non une recréation :

1. Le script convertit `pageMentions-fr` en `pageLegale-mentions-fr` — les `corps` en texte brut deviennent des blocs Portable Text, un paragraphe par ligne, et les champs `eyebrow`, `titrePage`, `seoTitre`, `seoDescription` sont repris tels quels.
2. Le contenu de la section « Éditeur du site » est **remplacé** par l'identité du registre, pas migré : c'est précisément la donnée fausse à corriger.
3. L'ancien document n'est supprimé qu'après vérification que le nouveau se lit correctement ; le script affiche un plan avant d'écrire et exige une confirmation explicite pour la suppression.
4. Le schéma `pageMentions` n'est retiré du Studio qu'une fois la migration passée en production.

**Lecture côté site.** Une requête unique `getPageLegale(slug, locale)` dans `src/sanity/queries.ts`, sur le modèle des requêtes existantes.

### Routes

`/[locale]/mentions-legales/` (existante, bascule sur le nouveau type), `/[locale]/confidentialite/`, `/[locale]/cgv/`. Chaque route est un fichier d'une quinzaine de lignes : métadonnées et appel du rendu commun. Pas de route attrape-tout, pour éviter tout conflit en export statique.

Les cookies sont une **section ancrée** de la politique de confidentialité (`/fr/confidentialite/#cookies`), pas une page : le site ne dépose aucun cookie, et le bandeau dormant pointera vers cette ancre le jour où il s'active.

### Composants

`src/components/legal/PageLegale.tsx` — ossature partagée : en-tête marine, date de mise à jour, sommaire d'ancres à partir de quatre sections, colonne de prose à `max-w-[72ch]`. Le rendu actuel affiche les sections en `font-mono` : correct pour quatre lignes d'adresse, illisible pour trois pages de CGV. Il passe en typographie de lecture.

`src/components/legal/TexteRiche.tsx` — rendu Portable Text : paragraphes, titres de niveau 3, listes ordonnées et non ordonnées, liens internes et externes, gras. Le schéma `texteRiche` existe depuis l'origine du projet sans qu'aucune page ne l'affiche ; ce composant comble ce manque et resservira ailleurs.

### Contenus par défaut

Comme le reste du site, chaque page porte un `DEFAUT` en dur pour fonctionner sans Sanity. Les textes juridiques vivent donc dans le code au format Portable Text, écrits via trois utilitaires (`p()`, `liste()`, `lien()`) pour rester lisibles en relecture plutôt que noyés sous les `_type` et `children`.

`apps/studio/scripts/seed-pages-legales.ts` pousse ces contenus dans Sanity, sur le modèle de `seed-site.ts`, pour que le client édite depuis une base remplie.

### Langues

Mentions légales et politique de confidentialité en FR et EN — le site est bilingue et l'information doit être compréhensible par le visiteur. CGV en FR uniquement, avec la mention « seule la version française fait foi » : traduire des conditions de transport crée une seconde version susceptible de diverger de celle qui engage.

## Contenu des documents

### Mentions légales

Éditeur (dénomination, forme, capital, siège, RCS, TVA, e-mail, téléphone) · directeur de la publication · hébergeur **OVH SAS, 2 rue Kellermann, 59100 Roubaix, +33 9 72 10 10 07** (établi par résolution DNS : `hgwf-cargo.fr` → 188.165.53.185, plage OVH) · activité réglementée (NAF 49.41B, registre électronique national des transporteurs, n° de licence) · assurance RC professionnelle et couverture géographique · médiateur de la consommation, obligatoire au titre de l'art. L.612-1 du code de la consommation dès lors que le site s'adresse explicitement aux particuliers · propriété intellectuelle et crédits photo.

Le lien vers la plateforme européenne de règlement en ligne des litiges est **volontairement omis** : la Commission l'a fermée le 20 juillet 2025. Elle figure encore dans quantité de mentions légales et enverrait les clients vers une page morte.

### Politique de confidentialité

Structure imposée par l'art. 13 du RGPD.

| Traitement | Base légale | Données | Conservation |
|---|---|---|---|
| Demande de devis | Mesures précontractuelles (6.1.b) | Identité, coordonnées, détails d'expédition | 3 ans après le dernier contact (norme CNIL prospects) |
| Formulaire de contact | Intérêt légitime (6.1.f) | Identité, coordonnées, message | 3 ans |
| Suivi d'expédition | Exécution du contrat (6.1.b) | Référence, statut, coordonnées | Contrat + 5 ans (L.110-4 c. com.) ; 10 ans pour les pièces comptables (L.123-22) |
| Limitation de débit de l'API | Intérêt légitime (sécurité) | Adresse IP | En mémoire, non persistée |

Puis : destinataires (personnel HGWF, Sanity comme sous-traitant, OVH, transporteurs et agents portuaires pour l'exécution) · **transfert hors UE** vers l'hébergement Sanity aux États-Unis, avec sa garantie · droits d'accès, rectification, effacement, limitation, opposition et portabilité, modalités d'exercice et délai d'un mois · réclamation auprès de la CNIL avec ses coordonnées · absence de décision automatisée et de profilage · mesures de sécurité (TLS, dataset privé, jeton d'écriture côté serveur uniquement) · section ancrée « Cookies » décrivant l'état réel : aucun traceur, aucun cookie déposé, et consentement préalable si une mesure d'audience est ajoutée.

### CGV et conditions de transport

Champ d'application et qualité de commissionnaire de transport · devis (validité, prix HT, exclusion des droits et taxes à destination) · obligations du client (exactitude de la déclaration, emballage, marchandises interdites et dangereuses) · délais indicatifs et non garantis · responsabilité par renvoi au contrat type de commission de transport (décret n° 2013-293) et aux conventions applicables — CMR pour la route, Règles de La Haye-Visby pour le maritime, Convention de Montréal pour l'aérien — avec leurs limitations d'indemnité · assurance ad valorem facultative et recommandation d'assurer · paiement, pénalités de retard et indemnité forfaitaire de 40 € (L.441-10 c. com.) · privilège et droit de rétention du commissionnaire (L.132-2 c. com.) · délais de réclamation et prescription annale · dispositions consommateurs · droit français et juridiction compétente.

## Dispositif complémentaire

**Formulaires.** Une ligne d'information sous le bouton d'envoi de Contact et de Devis : finalité des données et lien vers la politique. **Pas de case à cocher** : la base légale est l'exécution de mesures précontractuelles, pas le consentement. Une case laisserait croire à un consentement révocable et travestirait la base légale réelle. Elle ne serait nécessaire que pour de la prospection commerciale, absente du projet.

**Pied de page.** Le schéma `footer` n'expose qu'un couple `mentionsLibelle` / `mentionsHref`. Il est généralisé en `liensLegaux[]`, avec repli sur l'ancien champ tant que le tableau est vide, pour qu'un Studio non mis à jour ne produise pas un pied de page sans lien légal.

**Bandeau dormant.** `src/components/ConsentementCookies.tsx`, piloté par `NEXT_PUBLIC_CONSENTEMENT_COOKIES`, absent par défaut : le composant ne rend rien tant que la variable n'est pas posée. Choix mémorisé en `localStorage`, refus par défaut, aucun traceur chargé avant acceptation. La décision d'affichage est isolée dans une fonction pure testable.

## Données à compléter par le client

Champs livrés vides, avec consigne dans le Studio ; la section ne s'affiche pas tant qu'ils le sont.

1. Capital social (absent des données ouvertes).
2. Confirmation de la dénomination **HGWF CARGO** et du siège **Rosny-sous-Bois**, ou explicitation d'une enseigne commerciale distincte.
3. Numéro d'inscription au registre électronique national des entreprises de transport par route, et licence.
4. Assureur RC professionnelle, numéro de police, étendue géographique.
5. Médiateur de la consommation retenu, et ses coordonnées.
6. Adresse de contact pour l'exercice des droits RGPD (par défaut `contact@hgwf-cargo.fr`).

## Points à faire valider par un juriste

1. Articulation des limitations d'indemnité des CGV avec la police RC réellement souscrite.
2. Exclusion du droit de rétractation pour les contrats de transport à date ou période déterminée (art. L.221-28 c. conso.), qui dépend des modalités de vente.
3. Garantie encadrant le transfert de données vers l'hébergement Sanity aux États-Unis : clauses contractuelles types ou Data Privacy Framework, selon le contrat de sous-traitance Sanity en vigueur.
4. Durées de conservation retenues, au regard des pratiques réelles de l'entreprise.

## Vérifications

- `pnpm typecheck`, `pnpm build` et `pnpm test` passent sur `apps/web` et `apps/studio`.
- Les trois pages sont émises dans l'export statique pour les deux langues.
- Les liens légaux du pied de page répondent en 200 sur le build servi localement.
- Hiérarchie des titres `h1 → h2 → h3` cohérente, ancres fonctionnelles.
- Confirmation de la région d'hébergement du dataset auprès de Sanity, avant publication de la politique.

## Séquencement

Ce travail s'appuie sur le schéma `pageLegale` dans `apps/studio`, donc sur la PR #2. La branche part d'un `main` à jour après le merge des PR #1, #2 et #3, pour que la PR des pages légales n'embarque pas les 3 704 lignes de la PR #2 et reste relisible.
