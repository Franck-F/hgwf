/**
 * Seule source de rédaction côté Studio (spécification 5.3) : message WhatsApp,
 * demande de compléments, questions de facturation, « Copier pour la facture ».
 * Le texte d'e-mail reste construit par l'API.
 *
 * Fusionne `messageDemandeInfos` et `messageDemandeComplement` de la V1
 * (quasi identiques) en une seule fonction.
 */
import {
  calculerChiffrage,
  euros,
  lignesFacturation,
  MENTION_EXONERATION,
  pourcentage,
} from './chiffrage';
import type { Demande, Fiche } from './types';

/** Premier mot d'un nom complet (« Martin Dupont » devient « Martin »). Brut : préférer `appelClient`. */
export function prenomDe(nom: string | null | undefined): string {
  return (nom ?? '').trim().split(/\s+/)[0] ?? '';
}

// Mots qui trahissent une raison sociale : « Garage Factice », « Les Jardins Fictifs »…
const MOTS_ENTREPRISE = new Set([
  'sarl', 'sas', 'sasu', 'eurl', 'sa', 'snc', 'scop', 'sci', 'ets', 'etablissements', 'societe', 'entreprise', 'cabinet',
  'garage', 'transport', 'transports', 'boutique', 'restaurant', 'cafe', 'hotel', 'auto', 'services', 'service', 'groupe',
  'compagnie', 'atelier', 'maison', 'agence', 'association', 'studio', 'import', 'export', 'logistique', 'cargo', 'express',
  'les', 'le', 'la', 'l', 'au', 'aux', 'chez', 'et', 'fils', 'freres', 'test',
]);
const sansAccent = (m: string) => m.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Vrai si le nom a l'allure d'une personne (« Martin Dupont »), faux pour une raison sociale. */
function ressembleAUnePersonne(nom: string): boolean {
  const mots = nom.trim().split(/\s+/);
  if (mots.length < 2 || mots.length > 3) return false;
  return mots.every((m) => /^\p{Lu}[\p{L}'’-]*$/u.test(m) && !MOTS_ENTREPRISE.has(sansAccent(m).replace(/['’].*$/, '')));
}

/**
 * Comment s'adresser au client : son prénom pour un particulier, son nom complet
 * pour une société (« Garage Factice SARL », jamais « Garage »). Sans type connu,
 * le prénom n'est utilisé que si le nom ressemble à celui d'une personne.
 */
export function appelClient(nom: string | null | undefined, type?: string | null): string {
  const complet = (nom ?? '').trim();
  if (!complet) return '';
  if (type === 'professionnel') return complet;
  if (type === 'particulier') return prenomDe(complet);
  return ressembleAUnePersonne(complet) ? prenomDe(complet) : complet;
}

const salutation = (nom: string | null | undefined, type?: string | null) => {
  const appel = appelClient(nom, type);
  return `Bonjour${appel ? ` ${appel}` : ''},`;
};

const SIGNATURE = ["L'équipe HGWF Cargo", 'contact@hgwf-cargo.fr · 09 62 03 80 13'];

/** Message court pré-rempli du lien `wa.me`. */
export function messageWhatsApp(demande: Demande): string {
  const ref = demande.reference ? ` (référence ${demande.reference})` : '';
  return `${salutation(demande.clientNom, demande.facturationType)} c'est HGWF Cargo, au sujet de votre demande de devis${ref}.`;
}

/**
 * Demande de compléments au client. `manques` = les questions à poser, une par
 * ligne. Sans question, les informations à obtenir de la fiche service servent
 * de base ; à défaut, une ligne à compléter. Les lignes « - question » sont
 * mises en valeur dans la version HTML de l'e-mail (apps/api/src/email.js) :
 * ne pas changer ce format sans l'y répercuter.
 */
export function messageComplements(demande: Demande, manques: string[], fiche?: Fiche | null): string {
  const propres = manques.map((q) => q.trim()).filter(Boolean);
  const defaut = (fiche?.infosAObtenir ?? []).map((q) => q.trim()).filter(Boolean);
  const lignes = propres.length ? propres : defaut.length ? defaut : ['[précisez ici l’information attendue]'];
  const ref = demande.reference ?? '';
  return [
    salutation(demande.clientNom, demande.facturationType),
    '',
    `Merci pour votre demande de devis${ref ? ` (référence ${ref})` : ''}. Pour vous établir un prix exact, pourriez-vous nous préciser :`,
    ...lignes.map((q) => `- ${q}`),
    '',
    'Dès réception de ces éléments, nous vous adressons votre devis.',
    '',
    'Bien cordialement,',
    ...SIGNATURE,
  ].join('\n');
}

/**
 * Questions à poser au client pour compléter sa facturation, d'après la liste
 * de `manquesFacturation`. Formulées pour le client.
 */
export function questionsFacturation(manques: string[]): string[] {
  const q: string[] = [];
  if (manques.includes('type de client')) q.push('Le devis est-il à établir au nom d’un particulier ou d’une société ?');
  if (manques.includes('raison sociale')) q.push('Quelle est la raison sociale de votre société ?');
  if (['adresse', 'code postal', 'ville', 'pays'].some((m) => manques.includes(m))) {
    q.push('Quelle est votre adresse de facturation complète (adresse, code postal, ville, pays) ?');
  }
  if (manques.includes('SIRET')) q.push('Quel est le numéro SIRET de votre société ?');
  return q;
}

/**
 * « Copier pour la facture » : client, adresse, SIRET, désignation, HT, TVA,
 * TTC et mention d'exonération. Texte brut, sans lien avec Henrri.
 */
export function texteCopieFacture(demande: Demande): string {
  const lignes: string[] = [];
  const adresse = lignesFacturation(demande);
  lignes.push(...(adresse.length ? adresse : [demande.clientNom ?? '']));
  if (demande.reference) lignes.push('', `Référence du devis : ${demande.reference}`);
  if (demande.numeroFacture) lignes.push(`Numéro de facture : ${demande.numeroFacture}`);
  const designation = (demande.descriptionPrestation ?? '').trim();
  if (designation) lignes.push('', 'Désignation :', designation);
  const c = calculerChiffrage(demande.montantHT, demande.tauxTVA);
  if (c) {
    lignes.push(
      '',
      `Montant HT : ${euros(c.ht)}`,
      `TVA ${pourcentage(c.taux)} : ${euros(c.tva)}`,
      `Total TTC : ${euros(c.ttc)}`,
    );
    if (c.taux === 0) lignes.push('', MENTION_EXONERATION);
  } else if (demande.montantDevis?.trim()) {
    lignes.push('', `Montant : ${demande.montantDevis.trim()}`);
  }
  return lignes.join('\n').trim();
}
