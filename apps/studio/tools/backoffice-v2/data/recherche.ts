/**
 * Recherche globale (spécification 4.8) : fonction pure, testée seule.
 *
 * Cherche le nom, la référence (demande ET expédition), l'e-mail, le
 * téléphone, la destination et le numéro de conteneur ; insensible aux
 * accents et à la casse ; dans TOUS les dossiers, terminés compris. Les
 * téléphones passent par `normaliserTelephone` : « 06 12 34 56 78 »,
 * « +33 6 12 34 56 78 » et « 0033612345678 » se retrouvent mutuellement.
 */
import type { ResultatRecherche } from '../domaine/types';
import type { ClientFiche, Dossier } from '../domaine/types';
import {
  emailsDuDossier,
  extraireContact,
  memeTelephone,
  nomsDuDossier,
  normaliserNom,
  normaliserTelephone,
  telephonesDuDossier,
} from '../domaine/rapprochement';
import { derniereActivite } from '../domaine/priorites';

/** Nombre maximal de résultats par groupe. */
export const MAX_RESULTATS = 5;
/** Une recherche par numéro n'a de sens qu'à partir de quelques chiffres. */
const MIN_CHIFFRES = 4;

const SANS_RESULTAT: ResultatRecherche = { dossiers: [], clients: [] };

function jetons(texte: string): string[] {
  return normaliserNom(texte).split(' ').filter(Boolean);
}

/** Vrai si le numéro cherché (chiffres seuls, sans préfixe) est contenu dans le numéro, ou équivalent. */
function telephoneCorrespond(cherche: string, numero: string): boolean {
  if (memeTelephone(cherche, numero)) return true;
  const n = normaliserTelephone(numero);
  const c = normaliserTelephone(cherche);
  return c.length >= MIN_CHIFFRES && n.includes(c);
}

function detailDe(parts: (string | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(' · ');
}

function correspondDossier(d: Dossier, requete: string, mots: string[], parNumero: boolean): boolean {
  const x = d.expedition;
  const botte = normaliserNom(
    [
      ...nomsDuDossier(d),
      d.demande?.reference,
      x?.reference,
      ...emailsDuDossier(d),
      d.demande?.destination,
      x?.trajet,
      x?.numeroConteneur,
      x?.numeroReservation,
    ]
      .filter(Boolean)
      .join(' '),
  );
  if (mots.length > 0 && mots.every((m) => botte.includes(m))) return true;
  return parNumero && telephonesDuDossier(d).some((t) => telephoneCorrespond(requete, t));
}

function correspondClient(c: ClientFiche, requete: string, mots: string[], parNumero: boolean): boolean {
  const contact = extraireContact(c.contact);
  const botte = normaliserNom([c.nom, contact.email, c.destination].filter(Boolean).join(' '));
  if (mots.length > 0 && mots.every((m) => botte.includes(m))) return true;
  return parNumero && contact.telephone !== '' && telephoneCorrespond(requete, contact.telephone);
}

export function rechercher(texte: string, dossiers: Dossier[], clients: ClientFiche[]): ResultatRecherche {
  const requete = texte.trim();
  if (!requete) return SANS_RESULTAT;
  const mots = jetons(requete);
  // Une requête sans lettre et d'au moins 4 chiffres est lue comme un numéro de téléphone.
  const parNumero = !/[a-z]/i.test(requete) && normaliserTelephone(requete).length >= MIN_CHIFFRES;

  const trouves = dossiers
    .filter((d) => correspondDossier(d, requete, mots, parNumero))
    .sort((a, b) => (derniereActivite(b)?.getTime() ?? 0) - (derniereActivite(a)?.getTime() ?? 0))
    .slice(0, MAX_RESULTATS)
    .map((d) => ({
      dossierId: d.id,
      client: nomsDuDossier(d)[0] ?? 'Client sans nom',
      reference: d.demande?.reference ?? d.expedition?.reference ?? '',
      // La référence de l'expédition suit celle de la demande (3.1) : on la
      // cherche par ce numéro, il faut donc la voir dans le résultat.
      detail: detailDe([
        d.demande?.reference ?? d.expedition?.reference,
        d.demande?.reference && d.expedition?.reference !== d.demande.reference ? d.expedition?.reference : undefined,
        d.demande?.destination ?? d.expedition?.trajet,
      ]),
    }));

  const fiches = clients
    .filter((c) => correspondClient(c, requete, mots, parNumero))
    .slice(0, MAX_RESULTATS)
    .map((c) => ({
      clientId: c._id,
      nom: c.nom ?? 'Client sans nom',
      detail: detailDe([extraireContact(c.contact).email, extraireContact(c.contact).telephone, c.destination]),
    }));

  return { dossiers: trouves, clients: fiches };
}
