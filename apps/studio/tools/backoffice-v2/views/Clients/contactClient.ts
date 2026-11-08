/**
 * Aides pures des vues Clients : lecture de la chaîne historique « mail · tél »,
 * synthèse d'un client à partir de ses dossiers, filtre de la liste.
 *
 * Les compteurs `envois` et `volume` de la fiche ne sont plus montrés (4.6) :
 * le nombre de dossiers et la date du dernier sont calculés depuis les dossiers.
 */
import { derniereActivite } from '../../domaine/priorites';
import { dossiersDuClient, extraireContact, normaliserNom, normaliserTelephone } from '../../domaine/rapprochement';
import type { ClientFiche, Dossier } from '../../domaine/types';

export interface SyntheseClient {
  client: ClientFiche;
  nom: string;
  email: string;
  telephone: string;
  dossiers: Dossier[];
  /** Dernière activité parmi ses dossiers, `null` s'il n'en a pas. */
  dernier: Date | null;
}

/** Reconstruit la chaîne « mail · tél » (la seule forme que le schéma connaît). */
export function assemblerContact(email: string, telephone: string): string {
  return [email.trim(), telephone.trim()].filter(Boolean).join(' · ');
}

export function synthese(client: ClientFiche, dossiers: Dossier[]): SyntheseClient {
  const { email, telephone } = extraireContact(client.contact);
  const siens = dossiersDuClient(client, dossiers);
  let dernier: Date | null = null;
  for (const d of siens) {
    const a = derniereActivite(d);
    if (a && (!dernier || a.getTime() > dernier.getTime())) dernier = a;
  }
  return { client, nom: client.nom?.trim() || 'Client sans nom', email, telephone, dossiers: siens, dernier };
}

/** Tri alphabétique sans accents ni casse. */
export function trierParNom(liste: SyntheseClient[]): SyntheseClient[] {
  return [...liste].sort((a, b) => normaliserNom(a.nom).localeCompare(normaliserNom(b.nom), 'fr'));
}

/**
 * Filtre local : nom, e-mail ou téléphone, insensible aux accents et à la
 * casse. Un téléphone saisi dans n'importe quelle forme (« 06 12… », « +33 6… »)
 * retrouve la fiche ; il faut au moins 4 chiffres pour ne pas tout faire
 * correspondre.
 */
export function filtrer(liste: SyntheseClient[], texte: string): SyntheseClient[] {
  const t = normaliserNom(texte);
  if (!t) return liste;
  const chiffres = texte.replace(/\D/g, '');
  return liste.filter((s) => {
    if (normaliserNom(s.nom).includes(t)) return true;
    if (s.email.toLowerCase().includes(t)) return true;
    if (chiffres.length >= 4) {
      const tel = normaliserTelephone(s.telephone);
      const saisi = normaliserTelephone(texte) || chiffres;
      return tel.includes(saisi);
    }
    return false;
  });
}
