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

Éprouvé le 19/09/2026 sur un projet jetable, avec la vraie archive de
production. Deux obstacles ont été trouvés à cette occasion, et le workflow
les corrige désormais dans le fichier lui-même.

```
-- 1. Repartir d'un schéma vide, sur le projet CIBLE
drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
```

```
# 2. Rejouer la sauvegarde
gunzip -c box.sql.gz | psql "<URI Session pooler du projet cible>"
```

Le dump est produit avec `--no-owner --no-privileges --inserts` : il ne dépend
pas des rôles du projet d'origine, et ses données sont en `INSERT`, donc
rejouables par un autre outil que `psql`.

> **Ce qu'il ne faut pas faire : supprimer `public` sans le recréer.** Sans ce
> schéma, PostgREST ne redémarre pas et la base devient injoignable par l'API —
> y compris pour la restauration elle-même.

> **Ne jamais restaurer par-dessus la base en service sans l'avoir exportée
> d'abord.** Le dump contient des `CREATE TABLE` : sur une base déjà peuplée, il
> échoue table par table et laisse un état partiel, ni l'ancien ni le nouveau.
> Restaurer se fait sur un projet vide, puis on bascule.

### Facturation

**Le système n'émet aucune facture**, et n'en émettra pas en phase 2 : il produit des
échéances de loyer internes, ce qui est autre chose.

Le raccordement à Henrri, envisagé le 18/09/2026, est **écarté pour le moment**
(décision du 19/09/2026). Qui facturera, et par quelle plateforme agréée à partir du
1er septembre 2027, reste à trancher — voir `scale-up/specs/box-developpement.md`,
section 5. La date est un butoir pour facturer une entreprise ; un particulier peut
être facturé sans.

## L'application

Next.js 16, rendu serveur, port 3002 en développement (`pnpm --filter box dev`).

| Écran | Rôle |
|---|---|
| `/connexion` | lien de connexion par e-mail, sans mot de passe |
| `/` | plan d'occupation : ce qui est libre, occupé, en maintenance |
| `/parametrage` | l'équipe déclare elle-même locaux, gabarits, tarifs et box |

**Aucune valeur du parc n'est écrite dans le code.** Tout se saisit depuis le
paramétrage et se corrige ensuite : le fichier `db/seed-parc.exemple.sql` ne
sert plus que de secours pour une reprise en masse.

### Deux aides à la saisie

**Décrire le parc en une phrase** (Gemini, `GEMINI_API_KEY`). L'utilisateur écrit
son entrepôt en français, l'assistance en tire une proposition structurée —
locaux, gabarits, tarifs, séries de box. Deux règles la gouvernent :

- elle **propose, elle n'écrit jamais**. La proposition s'affiche dans un tableau
  modifiable, et rien ne part en base sans un second clic ;
- tout ce qu'elle renvoie est **revalidé côté serveur** comme une saisie
  ordinaire. Une réponse de modèle n'est pas une source de confiance.

Un tarif absent du texte reste vide et surligné, jamais deviné. À l'application,
un code de box déjà pris est sauté, jamais écrasé. Sans clé configurée,
l'encart disparaît et le reste de l'application fonctionne à l'identique.

**Adresse complétée** par la Base Adresse Nationale (api-adresse.data.gouv.fr),
service public, gratuit, sans clé. Choisir une suggestion remplit aussi le code
postal et la ville. Volontairement pas d'IA ici : une adresse est un fait, et
une base officielle ne peut pas inventer une rue.

### Ouvrir un accès

Les comptes ne se créent pas depuis l'écran de connexion — sinon n'importe qui
s'inscrirait. Ajouter une personne : tableau de bord Supabase →
*Authentication* → *Users* → *Add user* → *Auto confirm user*.

L'envoi des liens passe par le serveur d'e-mail par défaut de Supabase, dont le
quota horaire est bas. Quand l'équipe dépassera quelques connexions par jour, le
brancher sur Resend, déjà en service pour le fret.

## Loyers dus (phase 2)

Le loyer est dû **d'avance** : le mois en cours est émis en entier dès son
premier jour, au prorata seulement si le contrat commence ou se termine dedans.

Le prorata se calcule sur les **jours réels du mois**, pas sur une base 30 : un
février entamé le 20 ne se facture pas comme un juillet entamé le 20. C'est de
là que vient l'essentiel des litiges sur une facture de self-stockage. Les jours
facturés sont stockés avec le montant — sans eux, un client qui conteste n'a
rien à vérifier.

Le calcul vit dans `src/lib/echeances.ts`, sans base ni horloge, pour rester
vérifiable à la main.

Trois règles tenues par la base :

- **un seul loyer vivant par période et par contrat** : relancer la génération
  ne crée jamais de doublon ;
- **un loyer émis ne se modifie plus** — on l'annule avec un motif écrit, et on
  régénère. L'index d'unicité est partiel pour que cette régénération soit
  possible ;
- **l'annulation laisse une trace** : rien n'est effacé.

Une échéance est un loyer **interne**, pas une facture au sens légal.

### Relance des impayés

Une relance part **5 jours après la fin de période**, **une seule fois par
loyer**, et uniquement sur un loyer encore dû. Un loyer encaissé ou annulé ne
relance personne.

L'horodatage est posé **même quand l'envoi échoue** : sinon une adresse qui
rejette nos messages serait relancée tous les jours, et c'est ainsi qu'on finit
en liste noire.

Le texte est procédural — une échéance qui est passée, pas une offre. C'est ce
qui le maintient du côté transactionnel plutôt que prospection.

Le même code sert au bouton de l'écran et à la route `/api/relances`, protégée
par `CRON_SECRET`. **Cette route n'est pas encore branchée** : l'application
n'est pas déployée, donc aucune tâche planifiée ne peut l'appeler. Aujourd'hui
la relance se déclenche à la main, et le bouton demande confirmation.

## Reste à faire

1. Déployer sur `box.hgwf-cargo.fr`, puis brancher la tâche planifiée.
2. Trancher qui facture, et par quelle plateforme agréée avant le 01/09/2027.
3. Activer la protection contre les mots de passe compromis dans Supabase
   (*Authentication → Policies*) — signalée par le linter depuis le passage au
   mot de passe.
