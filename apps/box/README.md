# Box de stockage

Système de gestion des box, indépendant du site et du back-office fret.

Plan de construction et découpage en phases :
`~/Documents/Taylor/scale-up/specs/box-developpement.md`.

## État

**Phase 1 en cours** — inventaire et occupation. La base de données existe et ses
règles sont éprouvées ; l'interface reste à écrire.

## Base de données

| | |
|---|---|
| Hébergeur | Supabase |
| Projet | `hgwf-box` |
| Référence | `mgzuujkhjjdypgutgoss` |
| Région | `eu-west-3` (Paris) |
| Coût | 0 €/mois (offre gratuite) |

Les fichiers de `db/` sont la source de vérité du schéma. Ils ont été appliqués
dans l'ordre numérique. Toute évolution passe par un nouveau fichier numéroté,
jamais par une modification d'un fichier existant ni par la console.

### Deux règles vérifiées, pas seulement écrites

Testées le 18/09/2026 dans une transaction annulée :

- **un box ne peut pas être loué deux fois sur des périodes qui se chevauchent** —
  la base refuse l'insertion, l'interface n'a pas à y penser ;
- **le journal des mouvements ne se modifie pas** — toute mise à jour ou
  suppression lève une exception.

### Ce qu'il faut savoir avant d'y mettre de vrais contrats

L'offre gratuite de Supabase **ne fait aucune sauvegarde automatique** et met le
projet en pause après une semaine d'inactivité. C'est acceptable pour construire,
pas pour exploiter. Avant la mise en service : passer à l'offre payante, ou monter
un export nocturne sur le modèle de `.github/workflows/sauvegarde-sanity.yml`.

## Reste à faire pour la phase 1

1. Charger le parc réel : sites, catégories, tarifs, box.
2. Écrire l'interface : plan d'occupation, fiche box, fiche client, contrats.
3. Déployer sur `box.hgwf-cargo.fr`.
