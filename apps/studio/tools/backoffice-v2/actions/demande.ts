/**
 * Verbes métier de la demande. Les gestes qui changent le statut passent par
 * `appliquerGeste` (règle 5.5). `creerDossierManuel` crée une demande reçue au
 * téléphone ; `clientAReponduAuxComplements` note une réponse, sans statut.
 */
import { avecVerrou } from '../data/activite';
import { REQUETE_REFERENCES } from '../data/requetes';
import type { ContexteEcriture, Resultat, VerbesActions } from '../domaine/contrats';
import { formaterDateHeure } from '../domaine/format';
import { DEMANDE } from '../domaine/statuts';
import { echec, MESSAGE_OCCUPE, traduireErreur } from './ecriture';
import { executerClientARepondu } from './notifications';
import { appliquerGeste } from './gestes';

export const prendreEnCharge: VerbesActions['prendreEnCharge'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'prendreEnCharge' });

export const accepter: VerbesActions['accepter'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'accepter' });

export const accepterSansDevis: VerbesActions['accepterSansDevis'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'accepterSansDevis' });

export const devisHorsOutil: VerbesActions['devisHorsOutil'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'devisHorsOutil', ...saisie });

export const complementHorsOutil: VerbesActions['complementHorsOutil'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'complementHorsOutil', ...saisie });

export const refuser: VerbesActions['refuser'] = (ctx, dossier, motif) =>
  appliquerGeste(ctx, dossier, {}, { type: 'refuser', motif });

export const rouvrir: VerbesActions['rouvrir'] = (ctx, dossier) =>
  appliquerGeste(ctx, dossier, {}, { type: 'rouvrir' });

export const clientAReponduAuxComplements: VerbesActions['clientAReponduAuxComplements'] = (ctx, demande) =>
  executerClientARepondu(ctx, demande);

// ── Nouveau dossier saisi à la main ─────────────────────────────────────────

/** Nombre de références successives essayées avant d'abandonner (collisions avec des créations simultanées). */
const ESSAIS_REFERENCE = 5;

const deuxChiffres = (n: number): string => String(n).padStart(2, '0');

/**
 * Référence « DEV-AAMM-NNN » : la séquence continue celle des références du
 * mois déjà présentes (les références du site, d'un autre format, sont ignorées).
 */
export function genererReference(existantes: (string | undefined)[], maintenant: Date): string {
  const prefixe = `DEV-${deuxChiffres(maintenant.getFullYear() % 100)}${deuxChiffres(maintenant.getMonth() + 1)}-`;
  let max = 0;
  for (const ref of existantes) {
    const m = ref?.trim().match(/^DEV-(\d{4})-(\d{3,})$/);
    if (m && `DEV-${m[1]}-` === prefixe) max = Math.max(max, Number(m[2]));
  }
  return `${prefixe}${String(max + 1).padStart(3, '0')}`;
}

/** Identifiant dérivé de la référence : rejouer la création ne crée pas un second dossier. */
export const idDemandeManuelle = (reference: string): string => `demande-${reference.toLowerCase()}`;

/**
 * Demande reçue au téléphone : statut 1 (elle est déjà prise en charge),
 * `sourceDemande: 'telephone'`, aucun accusé de réception, aucun appel d'API.
 */
export const creerDossierManuel: VerbesActions['creerDossierManuel'] = (ctx, saisie) =>
  avecVerrou('nouveau-dossier', () => creer(ctx, saisie), () => echec('refus', MESSAGE_OCCUPE));

async function creer(
  ctx: ContexteEcriture,
  saisie: Parameters<VerbesActions['creerDossierManuel']>[1],
): Promise<Resultat<{ dossierId: string }>> {
  const nom = saisie.clientNom.trim();
  const email = saisie.email?.trim() ?? '';
  const telephone = saisie.telephone?.trim() ?? '';
  const manques: string[] = [];
  if (!nom) manques.push('le nom du client');
  if (!email && !telephone) manques.push('un téléphone ou une adresse e-mail');
  if (!saisie.typeEnvoi.trim()) manques.push("le type d'envoi");
  if (!saisie.destination.trim()) manques.push('la destination');
  if (manques.length) return echec('manques', `Il manque : ${manques.join(', ')}.`, manques);

  try {
    const lu = await ctx.client.fetch<{ demandes?: { reference?: string }[] } | null>(REQUETE_REFERENCES);
    const connues = (lu?.demandes ?? []).map((d) => d.reference);
    const volume = saisie.volume?.trim();
    const message = saisie.message?.trim();
    const contenu = {
      clientNom: nom,
      ...(email ? { email } : {}),
      ...(telephone ? { telephone } : {}),
      contact: [email, telephone].filter(Boolean).join(' · '),
      typeEnvoi: saisie.typeEnvoi.trim(),
      destination: saisie.destination.trim(),
      ...(volume ? { volume } : {}),
      ...(message ? { message } : {}),
    };
    // La lecture des références n'est pas transactionnelle : deux personnes qui créent à quelques secondes
    // d'écart calculent la même référence. `createIfNotExists` rend alors le document de l'autre SANS
    // erreur : on compare son contenu à notre saisie et, s'il diffère, on prend la référence suivante.
    for (let essai = 0; essai < ESSAIS_REFERENCE; essai += 1) {
      const reference = genererReference(connues, ctx.maintenant());
      const cree = await ctx.client.createIfNotExists({
        _id: idDemandeManuelle(reference),
        _type: 'demandeDevis',
        reference,
        ...contenu,
        statut: DEMANDE.enCours,
        recueLe: formaterDateHeure(ctx.maintenant()),
        sourceDemande: 'telephone',
      });
      // Le client Sanity rend le document entier ; à défaut (réponse partielle), on le relit.
      let rendu = cree as unknown as Record<string, unknown>;
      if (!('clientNom' in rendu)) rendu = ((await ctx.client.getDocument<Record<string, unknown>>(cree._id)) ?? rendu) as Record<string, unknown>;
      // Notre saisie : le dossier est le nôtre (création, ou rejeu de la même saisie après une coupure).
      const identique = Object.entries(contenu).every(([champ, valeur]) => rendu[champ] === valeur);
      if (identique) {
        ctx.memoriserRevision(cree._rev);
        return { ok: true, dossierId: cree._id };
      }
      connues.push(reference);
    }
    return echec('conflit', 'Plusieurs dossiers viennent d’être créés en même temps. Réessayez dans un instant.');
  } catch (e) {
    return traduireErreur(e);
  }
}
