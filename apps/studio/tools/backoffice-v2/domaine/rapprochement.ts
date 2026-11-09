/**
 * Normalisation du téléphone (8.1) et rapprochement client / dossier (4.6).
 * Sert à la recherche globale, aux fiches clients et aux liens `tel:` / `wa.me`.
 */
import type { ClientFiche, Dossier } from './types';

/**
 * Chiffres seuls, sans préfixe `0033` ou `33` (suivi de 9 chiffres), sans `0`
 * initial. « 06 12 34 56 78 », « +33 6 12 34 56 78 » et « 0033612345678 »
 * donnent tous « 612345678 ». Chaîne vide si rien n'est lisible (« — »).
 */
export function normaliserTelephone(texte: string | null | undefined): string {
  if (typeof texte !== 'string') return '';
  let c = texte.replace(/\D/g, '');
  if (!c) return '';
  if (c.startsWith('0033') && c.length >= 13) c = c.slice(4);
  else if (c.startsWith('33') && c.length >= 11) c = c.slice(2);
  // « +33 (0)6 12… » : le 0 de confort après l'indicatif.
  if (c.startsWith('0')) c = c.slice(1);
  return c;
}

/** Égaux si leurs 9 derniers chiffres sont égaux et si les deux ont au moins 9 chiffres. */
export function memeTelephone(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normaliserTelephone(a);
  const nb = normaliserTelephone(b);
  if (na.length < 9 || nb.length < 9) return false;
  return na.slice(-9) === nb.slice(-9);
}

/** Minuscules, sans accents ni casse ni espaces en double. */
export function normaliserNom(texte: string | null | undefined): string {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Recherche fragmentaire sur une référence de devis, un nom client ou un e-mail,
 * sans dépendre d'un outil de recherche externe. Utilisé pour relier une réponse
 * Outlook à un dossier déjà existant ou à une fiche client.
 */
export function retrouverDossiersParReferenceOuClient(texte: string | null | undefined, dossiers: Dossier[]): Dossier[] {
  const requete = (texte ?? '').trim();
  if (!requete) return [];
  const cherche = normaliserNom(requete);
  const refRecherche = requete.toLowerCase();

  return dossiers.filter((d) => {
    const refs = [d.demande?.reference, d.expedition?.reference, d.expedition?.demandeRef].filter(Boolean) as string[];
    if (refs.some((ref) => {
      const n = normaliserNom(ref);
      return n && (n === cherche || n.includes(cherche) || cherche.includes(n));
    })) return true;
    if (refs.some((ref) => {
      const refLower = ref.toLowerCase();
      return refLower === refRecherche || refLower.includes(refRecherche) || refRecherche.includes(refLower);
    })) return true;

    const noms = nomsDuDossier(d).map(normaliserNom);
    if (noms.some((nom) => nom === cherche || nom.includes(cherche) || cherche.includes(nom))) return true;

    const emails = emailsDuDossier(d).map((email) => email.toLowerCase());
    return emails.some((email) => email === refRecherche || email.includes(refRecherche) || refRecherche.includes(email));
  });
}

export function retrouverFichesClientParNomOuEmail(texte: string | null | undefined, clients: ClientFiche[]): ClientFiche[] {
  const requete = (texte ?? '').trim();
  if (!requete) return [];
  const cherche = normaliserNom(requete);
  const refRecherche = requete.toLowerCase();

  return clients.filter((client) => {
    const nom = normaliserNom(client.nom);
    const email = extraireContact(client.contact).email.toLowerCase();
    if (nom && (nom === cherche || nom.includes(cherche) || cherche.includes(nom))) return true;
    if (email && (email === refRecherche || email.includes(refRecherche) || refRecherche.includes(email))) return true;
    return false;
  });
}

/** Extrait e-mail et téléphone de la chaîne historique « mail · tél ». */
export function extraireContact(contact: string | null | undefined): { email: string; telephone: string } {
  if (typeof contact !== 'string') return { email: '', telephone: '' };
  const email = contact.match(/[^\s·|,;<>]+@[^\s·|,;<>]+\.[^\s·|,;<>]+/)?.[0] ?? '';
  const sansEmail = email ? contact.replace(email, ' ') : contact;
  const telephone = sansEmail.match(/\+?\d[\d\s.()-]{7,}\d/)?.[0]?.trim() ?? '';
  return { email: email.trim(), telephone };
}

const minuscules = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** E-mails connus d'un dossier (demande, expédition, chaîne « mail · tél »), en minuscules. */
export function emailsDuDossier(dossier: Dossier): string[] {
  const liste = [
    dossier.demande?.email,
    dossier.expedition?.email,
    extraireContact(dossier.demande?.contact).email,
    extraireContact(dossier.expedition?.contact).email,
  ]
    .map(minuscules)
    .filter(Boolean);
  return [...new Set(liste)];
}

/** Téléphones connus d'un dossier (valeurs brutes, sans doublon exact). */
export function telephonesDuDossier(dossier: Dossier): string[] {
  const liste = [
    dossier.demande?.telephone,
    dossier.expedition?.telephone,
    extraireContact(dossier.demande?.contact).telephone,
    extraireContact(dossier.expedition?.contact).telephone,
  ]
    .map((t) => (t ?? '').trim())
    .filter(Boolean);
  return [...new Set(liste)];
}

/** Noms connus d'un dossier (client), sans doublon. */
export function nomsDuDossier(dossier: Dossier): string[] {
  const liste = [dossier.demande?.clientNom, dossier.expedition?.clientNom]
    .map((n) => (n ?? '').trim())
    .filter(Boolean);
  return [...new Set(liste)];
}

/**
 * Dossiers d'un client. Rapprochement fiable, jamais par « contient » :
 * si la fiche et le dossier ont chacun un e-mail, seuls les e-mails (en
 * minuscules) décident ; sinon, le nom normalisé (sans accents ni casse).
 */
export function dossiersDuClient(client: ClientFiche, dossiers: Dossier[]): Dossier[] {
  const emailClient = minuscules(extraireContact(client.contact).email);
  const nomClient = normaliserNom(client.nom);
  return dossiers.filter((d) => {
    const emails = emailsDuDossier(d);
    if (emailClient && emails.length > 0) return emails.includes(emailClient);
    if (!nomClient) return false;
    return nomsDuDossier(d).some((n) => normaliserNom(n) === nomClient);
  });
}

/** Numéro au format international sans « + » (« 33612345678 »), ou `null` si illisible. */
function internationalSansPlus(numero: string): string | null {
  const brut = numero.trim();
  const chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return null;
  if (brut.startsWith('+')) return chiffres;
  if (chiffres.startsWith('00')) return chiffres.slice(2);
  const n = normaliserTelephone(brut);
  // Numéro français de 9 chiffres significatifs.
  if (n.length === 9) return `33${n}`;
  return chiffres;
}

/** `tel:+33612345678`. */
export function lienTel(numero: string): string {
  const intl = internationalSansPlus(numero);
  return intl ? `tel:+${intl}` : 'tel:';
}

/** `https://wa.me/33612345678?text=…` */
export function lienWhatsApp(numero: string, message: string): string {
  const intl = internationalSansPlus(numero) ?? '';
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
