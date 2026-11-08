/**
 * « Il manque » (spécification 5.1) : fonctions pures qui renvoient des listes
 * de phrases courtes (« le montant HT »). Elles reçoivent toujours le document
 * EFFECTIF (enregistré + brouillon, par `fusionner`), jamais le document
 * enregistré seul : ce que l'utilisateur voit est ce qui est évalué.
 */
import { aUnMontant, calculerChiffrage } from './chiffrage';
import { DEMANDE } from './statuts';
import type { Demande, Expedition } from './types';

const estNombre = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const vide = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

/** Vrai dès qu'un début de chiffrage existe (HT, taux ou ancien montant texte). */
export function chiffrageAmorce(d: Demande): boolean {
  return estNombre(d.montantHT) || estNombre(d.tauxTVA) || !vide(d.montantDevis);
}

/**
 * Ce qui manque au chiffrage : montant HT, taux, montant à 0. Montant et taux
 * vont ensemble (jamais l'un sans l'autre) ; le zéro est une vraie valeur
 * (0 % de TVA) mais un devis à 0 € ne part pas.
 */
export function manquesMontant(d: Demande): string[] {
  const c = calculerChiffrage(d.montantHT, d.tauxTVA);
  if (c) return c.ht > 0 ? [] : ['un montant supérieur à 0 € (un devis à 0 € ne part pas)'];
  // Ancien document : la chaîne libre tient lieu de montant, jamais convertie.
  if (aUnMontant(d)) return [];
  const m: string[] = [];
  if (!estNombre(d.montantHT) || d.montantHT < 0) m.push('le montant HT');
  if (!estNombre(d.tauxTVA) || d.tauxTVA < 0) m.push('le taux de TVA');
  return m;
}

/** Montant HT ou taux absent, montant à 0, description vide, e-mail absent. */
export function manquesDevis(d: Demande): string[] {
  const m = manquesMontant(d);
  if (vide(d.descriptionPrestation)) m.push('la description de la prestation');
  if (vide(d.email)) m.push("l'adresse e-mail du client");
  return m;
}

/** La demande de compléments n'exige que de pouvoir écrire au client. */
export function manquesEnvoiComplement(d: Demande): string[] {
  return vide(d.email) ? ["l'adresse e-mail du client"] : [];
}

/**
 * Ce qui manque pour facturer. Les libellés sont ceux de la V1 : la liste
 * alimente `questionsFacturation` (messages.ts). Le pays « France » suggéré à
 * l'écran mais non enregistré compte comme manque : rien n'est écrit en douce.
 */
export function manquesFacturation(d: Demande): string[] {
  const m: string[] = [];
  const pro = d.facturationType === 'professionnel';
  if (!d.facturationType) m.push('type de client');
  if (vide(d.facturationNom)) m.push(pro ? 'raison sociale' : 'nom');
  if (vide(d.facturationAdresse)) m.push('adresse');
  if (vide(d.facturationCodePostal)) m.push('code postal');
  if (vide(d.facturationVille)) m.push('ville');
  if (vide(d.facturationPays)) m.push('pays');
  if (pro && vide(d.facturationSiret)) m.push('SIRET');
  return m;
}

/** Les 7 manques avant « Prêt » (repris tels quels de `manquesPec` de la V1). */
export function manquesPriseEnCharge(x: Expedition): string[] {
  const m: string[] = [];
  if (vide(x.expediteurAdresse)) m.push("l'adresse d'enlèvement");
  if (vide(x.destinataireNom)) m.push('le nom du destinataire');
  if (vide(x.destinataireAdresse)) m.push("l'adresse de destination");
  if (vide(x.colisNature)) m.push('la nature de la marchandise');
  if (!estNombre(x.colisNombre)) m.push('le nombre de colis');
  if (!estNombre(x.colisPoids) && !estNombre(x.colisVolume)) m.push('le poids ou le volume');
  if (vide(x.mode)) m.push("le mode d'acheminement");
  return m;
}

/** Départ autorisé : règlement reçu OU dérogation motivée. */
export function departAutorise(x: Expedition): boolean {
  if (x.reglementRecu === true) return true;
  return x.derogationDepart === true && !vide(x.derogationMotif);
}

/** Ce qui manque pour « Marquer expédié ». */
export function manquesDepart(x: Expedition): string[] {
  if (departAutorise(x)) return [];
  if (x.derogationDepart === true) return ['le motif de la dérogation de départ'];
  return ['le règlement reçu, ou une dérogation de départ motivée'];
}

/** Statut 3 (accepté) requis pour créer l'expédition. */
export function manquesConversion(d: Demande): string[] {
  return d.statut === DEMANDE.acceptee ? [] : ['que le client ait accepté le devis'];
}
