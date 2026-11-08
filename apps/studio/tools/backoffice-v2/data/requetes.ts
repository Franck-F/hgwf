/**
 * Requêtes GROQ du back-office V2 (spécification 8.2).
 *
 * La lecture de la liste est UNE SEULE requête agrégée qui renvoie un objet
 * `{ "demandes", "expeditions", "clients", "conteneurs", "rotations", "fiches" }`
 * (clés nommées entre guillemets) : liste, recherche, compteurs clients et
 * chiffres du mois partent donc de la même lecture et ne peuvent pas diverger.
 * Le faux client du harnais reconnaît cette requête à la présence de la clé
 * `"demandes"` ; les requêtes annexes ci-dessous gardent donc la même
 * enveloppe quand elles doivent y répondre.
 */
import { PROJECTION_FICHE } from '../domaine/fiches';

/**
 * Projection légère des demandes pour les listes : on laisse de côté le
 * message du client, les notes internes et le détail de facturation (lus à
 * l'ouverture du dossier, par `REQUETE_DOSSIER`).
 */
const CHAMPS_DEMANDE_LISTE = [
  '_id',
  '_type',
  '_rev',
  '_createdAt',
  '_updatedAt',
  'reference',
  'clientNom',
  'email',
  'telephone',
  'preferenceContact',
  'contact',
  'typeEnvoi',
  'ficheService',
  'destination',
  'volume',
  'recueLe',
  'statut',
  'montantHT',
  'tauxTVA',
  'montantDevis',
  'descriptionPrestation',
  'delaiEstime',
  'devisEnvoyeLe',
  'devisEnvoyeA',
  'accuseReceptionLe',
  'relanceEnvoyeeLe',
  'complementDemandeLe',
  'complementDemandeA',
  'expeditionRef',
  // Champs ajoutés par la V2 (section 11) : absents des anciens documents.
  'reponseClientLe',
  'acceptationLe',
  'acceptationPar',
  'devisEnvoyeHorsOutilLe',
  'devisEnvoyeHorsOutilPar',
  'devisEnvoyeHorsOutilMoyen',
  'sourceDemande',
  'motifRefus',
  'numeroFacture',
].join(', ');

export const REQUETE_MAGASIN = `{
  "demandes": *[_type == "demandeDevis"] | order(_createdAt desc){${CHAMPS_DEMANDE_LISTE}},
  "expeditions": *[_type == "expedition"] | order(_updatedAt desc),
  "clients": *[_type == "clientFiche"] | order(nom asc),
  "conteneurs": *[_type == "conteneurOccasion"] | order(reference asc),
  "rotations": *[_type == "rotation"],
  "fiches": *[_type == "ficheService" && actif != false] | order(ordre asc)${PROJECTION_FICHE}
}`;

/** Détail complet d'un dossier, lu à l'ouverture (`params.id`). Un document, tous ses champs. */
export const REQUETE_DOSSIER = '*[_id == $id][0]';

/**
 * Clients et fiches services seuls, sous la même enveloppe que la requête du
 * magasin (clés `"demandes"` vide, `"clients"`, `"fiches"`). Sert à la
 * conversion (retrouver la fiche du client) et à l'envoi (fiche du service)
 * sans recharger tous les dossiers.
 */
export const REQUETE_REFERENTIELS = `{
  "demandes": [],
  "clients": *[_type == "clientFiche"] | order(nom asc),
  "fiches": *[_type == "ficheService" && actif != false] | order(ordre asc)${PROJECTION_FICHE}
}`;

/** Références existantes, pour numéroter un dossier saisi à la main (même enveloppe). */
export const REQUETE_REFERENCES = '{"demandes": *[_type == "demandeDevis"]{reference}}';

/** Types de documents dont une modification déclenche une relecture (écoute en direct). */
export const REQUETE_ECOUTE =
  '*[_type in ["demandeDevis", "expedition", "clientFiche", "conteneurOccasion", "rotation", "ficheService"]]';
