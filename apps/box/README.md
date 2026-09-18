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

### Sauvegardes

L'offre gratuite de Supabase ne fait aucune sauvegarde automatique. Décision du
18/09/2026 : on reste sur l'offre gratuite et `.github/workflows/sauvegarde-box.yml`
exporte la base chaque nuit à 03h20 UTC — schéma `public` complet, archive déposée
en pièce jointe du run, 90 jours de rétention.

Non couvert : les comptes d'accès, gérés par Supabase Auth dans le schéma `auth`.
Ils se recréent en quelques minutes ; des contrats, non.

Le workflow a besoin du secret GitHub `BOX_DB_URL` : la chaîne de connexion
**Session pooler** affichée par le bouton *Connect* du tableau de bord Supabase.
Le pooler de session est indispensable — la connexion directe n'est joignable qu'en
IPv6, et les machines GitHub n'ont que de l'IPv4.

### Restaurer

```
gunzip -c box.sql.gz | psql "<URI Session pooler du projet cible>"
```

Le dump est produit avec `--no-owner --no-privileges` : il se restaure sur
n'importe quel projet Supabase, sans dépendre des rôles de celui d'origine.

> **Ne jamais restaurer par-dessus la base en service sans l'avoir exportée
> d'abord.** Le dump contient des `CREATE TABLE` : sur une base déjà peuplée, il
> échoue table par table et laisse un état partiel, ni l'ancien ni le nouveau.
> Restaurer se fait sur un projet vide, puis on bascule.

### Facturation

Décision du 18/09/2026 : **le système box n'émet pas de factures.** Il produit des
échéances de loyer ; les factures qui doivent légalement en être sont émises depuis
Henrri. Une seule série de numérotation, donc pas de comptabilité incohérente.

## Reste à faire pour la phase 1

1. Charger le parc réel : sites, catégories, tarifs, box.
2. Écrire l'interface : plan d'occupation, fiche box, fiche client, contrats.
3. Déployer sur `box.hgwf-cargo.fr`.
