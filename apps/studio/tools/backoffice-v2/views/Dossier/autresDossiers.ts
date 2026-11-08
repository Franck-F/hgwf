/**
 * Autres dossiers du même client, pour la colonne latérale (4.3).
 *
 * Même philosophie que `dossiersDuClient` : rapprochement fiable, jamais par
 * « contient ». Deux dossiers sont au même client s'ils partagent un e-mail
 * (minuscules), un téléphone (9 derniers chiffres) ou, à défaut de tout
 * contact commun, le même nom normalisé (sans accents ni casse).
 *
 * Fichier ajouté au lot 10.
 */
import {
  dossiersDuClient,
  emailsDuDossier,
  memeTelephone,
  nomsDuDossier,
  normaliserNom,
  telephonesDuDossier,
} from '../../domaine/rapprochement';
import type { ClientFiche, Dossier } from '../../domaine/types';

function memeClient(a: Dossier, b: Dossier): boolean {
  const emailsB = new Set(emailsDuDossier(b));
  if (emailsDuDossier(a).some((e) => emailsB.has(e))) return true;
  const telB = telephonesDuDossier(b);
  if (telephonesDuDossier(a).some((t) => telB.some((u) => memeTelephone(t, u)))) return true;
  // Sans contact de part et d'autre, seul le nom peut rapprocher.
  const aDesContacts = emailsDuDossier(a).length + telephonesDuDossier(a).length > 0;
  const bDesContacts = emailsB.size + telB.length > 0;
  if (aDesContacts && bDesContacts) return false;
  const nomsB = nomsDuDossier(b).map(normaliserNom).filter(Boolean);
  return nomsDuDossier(a)
    .map(normaliserNom)
    .some((n) => n !== '' && nomsB.includes(n));
}

/** Fiche client correspondant au dossier, ou `null`. */
export function ficheDuDossier(dossier: Dossier, clients: ClientFiche[]): ClientFiche | null {
  return clients.find((c) => dossiersDuClient(c, [dossier]).length > 0) ?? null;
}

/** Les autres dossiers du client (hors `dossier`), les plus récents d'abord, `limite` au plus. */
export function autresDossiers(dossier: Dossier, tous: Dossier[], limite = 3): Dossier[] {
  const date = (d: Dossier): number =>
    Date.parse(d.demande?._createdAt ?? d.expedition?._createdAt ?? '') || 0;
  return tous
    .filter((d) => d.id !== dossier.id && memeClient(dossier, d))
    .sort((a, b) => date(b) - date(a))
    .slice(0, limite);
}
