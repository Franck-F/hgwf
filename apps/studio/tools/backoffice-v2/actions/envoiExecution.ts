/**
 * Gestes qui passent par l'API d'envoi (spécification 4.4, 4.5, 5.5 n° 2) :
 * envoi du devis, demande de compléments, « Terminer l'enregistrement de
 * l'envoi », aperçu de l'e-mail, notification d'étape.
 *
 * Ce module n'importe PAS `gestes.ts` : c'est `appliquerGeste` qui l'appelle,
 * sous le verrou du dossier (d'où l'absence de verrou ici et l'usage de
 * `ecrireDossier`, qui n'en prend pas).
 *
 * Séquence de l'envoi du devis, en deux temps parce que l'API change la
 * révision de la demande :
 *   1. enregistrement du brouillon (un patch, sous `ifRevisionId`) ;
 *   2. relecture de la demande, refus si elle ne dit plus la même chose que
 *      le PDF (`demandePerimee`) ;
 *   3. appel de l'API (l'e-mail part, l'API écrit `devisEnvoyeLe`) ;
 *   4. relecture pour obtenir la `_rev` ACTUELLE, puis statut 2 sous
 *      `ifRevisionId`. Si ce second patch échoue, le dossier reste « Devis
 *      parti, statut à corriger » : `terminerEnvoi` le répare sans e-mail.
 */
import { REQUETE_DOSSIER, REQUETE_REFERENTIELS } from '../data/requetes';
import type { ApercuEnvoi, ContexteEcriture, Resultat, ResultatGeste } from '../domaine/contrats';
import { lignesMontant } from '../domaine/chiffrage';
import { ficheDe } from '../domaine/fiches';
import { formaterDateHeure } from '../domaine/format';
import { fusionner } from '../domaine/fusion';
import { manquesDevis, manquesEnvoiComplement, manquesFacturation } from '../domaine/manques';
import { messageComplements, questionsFacturation } from '../domaine/messages';
import { phaseDe } from '../domaine/phases';
import { extraireContact } from '../domaine/rapprochement';
import { DEMANDE } from '../domaine/statuts';
import type { Brouillon, Demande, Dossier, Fiche, Phase } from '../domaine/types';
import { MESSAGE_CLE_ABSENTE } from './cleApi';
import { echec, ecrireDossier, relireRevision, traduireErreur, type Echec } from './ecriture';

export type ModeEnvoi = 'devis' | 'complement';

const PHASES_ENVOI: Record<ModeEnvoi, Phase[]> = {
  // Renvoyer un devis déjà parti passe par le menu : mêmes phases, avec confirmation côté écran.
  devis: ['aChiffrer', 'reponseRecue', 'devisPartiStatutACorriger', 'devisEnvoye', 'devisHorsOutil'],
  complement: ['nouvelle', 'aChiffrer', 'reponseRecue'],
};

export const emailDe = (d: Demande): string => d.email?.trim() || extraireContact(d.contact).email;

/** Lit un document en entier (REQUETE_DOSSIER) ; lève si le réseau échoue (l'appelant traduit). */
export async function lireDocument<T extends object>(ctx: ContexteEcriture, id: string): Promise<T | null> {
  return (await ctx.client.fetch<T | null>(REQUETE_DOSSIER, { id })) ?? null;
}

/** Fiches services (non bloquant : sans elles, l'API et le message se rabattent sur leurs textes par défaut). */
export async function lireFiches(ctx: ContexteEcriture): Promise<Fiche[]> {
  try {
    const r = await ctx.client.fetch<{ fiches?: Fiche[] } | null>(REQUETE_REFERENTIELS);
    return Array.isArray(r?.fiches) ? r.fiches : [];
  } catch {
    return [];
  }
}

/** Le brouillon porte l'identifiant de la fiche (texte) ; le document, une référence. */
function ficheDeDemande(demande: Demande, fiches: Fiche[]): Fiche | null {
  const brut = demande.ficheService as unknown;
  const ref = typeof brut === 'string' ? { _ref: brut } : (demande.ficheService ?? null);
  return ficheDe({ typeEnvoi: demande.typeEnvoi, ficheService: ref }, fiches).fiche;
}

/**
 * Vrai si le document relu ne dit plus la même chose que le document de
 * référence sur ce que l'e-mail et le PDF affichent : montants, prestation,
 * délai. Attendre l'enregistrement ne suffit pas à les accorder (V1).
 */
export function demandePerimee(relue: Demande, reference: Demande): boolean {
  const t = (v?: string) => (v ?? '').trim();
  return (
    JSON.stringify(lignesMontant(relue)) !== JSON.stringify(lignesMontant(reference)) ||
    t(relue.descriptionPrestation) !== t(reference.descriptionPrestation) ||
    t(relue.delaiEstime) !== t(reference.delaiEstime)
  );
}

const MESSAGE_PERIME =
  'La demande a été modifiée ailleurs depuis l’ouverture de la page. Rechargez-la avant d’envoyer, pour que l’e-mail et le PDF disent la même chose.';

/** PDF du devis (ou devis provisoire) en base64. Chargé à la demande : jsPDF pèse lourd. */
async function pdfBase64(demande: Demande): Promise<string> {
  const { construireDevisPdf } = await import('../pdf/devisPdf');
  const doc = await construireDevisPdf({ ...demande, reference: demande.reference ?? '' });
  return (doc.output('datauristring') as string).split(',')[1] ?? '';
}

const texteDe = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Texte par défaut d'une demande de compléments (rédigé ici : il dépend des questions à poser). */
function modeleComplement(demande: Demande, fiche: Fiche | null): { objet: string; message: string } {
  const questions = questionsFacturation(manquesFacturation(demande));
  return {
    objet: `Votre demande de devis HGWF Cargo · ${demande.reference ?? ''} — quelques précisions`,
    message: messageComplements(demande, questions, fiche),
  };
}

// ── Aperçu ──────────────────────────────────────────────────────────────────

/**
 * Aperçu de l'e-mail. `dossier` peut porter un document « effectif » (brouillon
 * fusionné) : le texte du devis est construit par l'API à partir de ce qui est
 * ENREGISTRÉ. Si l'écran dit autre chose, on refuse plutôt que de montrer un
 * message dont les montants ne sont pas ceux du PDF.
 */
export async function executerApercu(
  ctx: ContexteEcriture,
  dossier: Dossier,
  mode: ModeEnvoi,
): Promise<Resultat<{ apercu: ApercuEnvoi }>> {
  const demande = dossier.demande;
  if (!demande) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  const a = emailDe(demande);
  if (!a) return echec('manques', 'Il manque l’adresse e-mail du client.', ["l'adresse e-mail du client"]);
  const de = 'L’équipe HGWF Cargo';
  const reference = demande.reference ?? '';

  if (mode === 'complement') {
    const modele = modeleComplement(demande, ficheDeDemande(demande, await lireFiches(ctx)));
    return { ok: true, apercu: { de, a, pieceJointe: `Devis-provisoire-${reference}.pdf`, ...modele } };
  }

  const manques = manquesDevis(demande);
  if (manques.length) return echec('manques', `Il manque : ${manques.join(', ')}.`, manques);
  let relue: Demande | null;
  try {
    relue = await lireDocument<Demande>(ctx, demande._id);
  } catch (e) {
    return traduireErreur(e);
  }
  if (!relue) return echec('perime', 'Cette demande n’existe plus.');
  if (demandePerimee(relue, demande)) {
    return relue._rev === demande._rev
      ? echec('refus', 'Enregistrez d’abord les modifications du devis, puis rouvrez cette fenêtre : le message en dépend.')
      : echec('perime', MESSAGE_PERIME);
  }
  const ficheId = ficheDeDemande(demande, await lireFiches(ctx))?._id;
  const r = await ctx.appelerApi('/api/envoi-devis', { reference, apercu: true, ficheId });
  if (!r.ok) return r;
  const c = r.reponse.corps;
  return {
    ok: true,
    apercu: { de, a: texteDe(c.destinataire) || a, pieceJointe: `Devis-${reference}.pdf`, objet: texteDe(c.objet), message: texteDe(c.texte) },
  };
}

// ── Envoi du devis et des compléments ───────────────────────────────────────

export async function executerEnvoi(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
  mode: ModeEnvoi,
  saisie: { objet?: string; message?: string },
): Promise<Resultat<ResultatGeste>> {
  const demande = dossier.demande;
  if (!demande) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  if (!PHASES_ENVOI[mode].includes(phaseDe(dossier))) {
    return echec('refus', 'Cet envoi n’est pas possible dans l’état actuel du dossier. Rechargez-le.');
  }
  // Garde-fous évalués sur ce qui est à l'écran (règle 5.5 n° 1).
  const effective = fusionner(demande, brouillon);
  const manques = mode === 'devis' ? manquesDevis(effective) : manquesEnvoiComplement(effective);
  if (manques.length) return echec('manques', `Il manque : ${manques.join(', ')}.`, manques);

  // Sans clé, on la réclame AVANT d'écrire le brouillon : sinon l'écriture change la révision et le
  // rejeu après saisie de la clé repart avec l'ancienne (faux « modifié par quelqu'un d'autre »).
  if (ctx.cleDisponible && !ctx.cleDisponible()) return echec('cle', MESSAGE_CLE_ABSENTE);

  // 1. Le brouillon d'abord : c'est le devis qui partira.
  const ecrit = await ecrireDossier(ctx, dossier, brouillon, 'demande', {});
  if (!ecrit.ok) return ecrit;
  // Dès ici le dossier en mémoire est périmé : tout échec le dit (relecture, brouillon vidé, pas de rejeu).
  const apresEcriture = (e: Echec): Echec =>
    ecrit.patchs > 0 ? { ...e, ecritureFaite: true, champsEnregistres: ecrit.champsEnregistres } : e;

  // 2. La demande relue doit dire la même chose que le PDF.
  let relue: Demande | null;
  try {
    relue = await lireDocument<Demande>(ctx, demande._id);
  } catch (e) {
    return apresEcriture(traduireErreur(e));
  }
  if (!relue) return apresEcriture(echec('perime', 'Cette demande n’existe plus.'));
  if (demandePerimee(relue, effective)) return apresEcriture(echec('perime', MESSAGE_PERIME));

  // 3. L'e-mail. Le destinataire n'est jamais pris dans le corps : l'API le relit dans Sanity.
  const fiche = ficheDeDemande(relue, await lireFiches(ctx));
  const modele = mode === 'complement' ? modeleComplement(relue, fiche) : null;
  const objet = saisie.objet?.trim() || modele?.objet;
  const texte = saisie.message?.trim() || modele?.message;
  let pdf: string;
  try {
    pdf = await pdfBase64(relue);
  } catch {
    return apresEcriture(echec('refus', 'Le PDF du devis n’a pas pu être généré : rien n’a été envoyé.'));
  }
  const corps =
    mode === 'devis'
      ? { reference: relue.reference, ficheId: fiche?._id, pdfBase64: pdf, objet, texte }
      : { reference: relue.reference, objet, texte, pdfBase64: pdf };
  const reponse = await ctx.appelerApi(mode === 'devis' ? '/api/envoi-devis' : '/api/envoi-complement', corps);
  let destinataire: string;
  if (reponse.ok) {
    destinataire = texteDe(reponse.reponse.corps.destinataire) || emailDe(relue);
  } else if (reponse.motif !== 'reseau') {
    return apresEcriture(reponse);
  } else {
    // Échec ambigu (coupure, délai dépassé) : l'e-mail a pu partir. On relit la demande avant de rendre
    // la main, pour ne jamais laisser « Envoyer » actif sur un message déjà parti (pas de double envoi).
    const verdict = await envoiDejaParti(ctx, relue, mode);
    if (verdict === 'parti') {
      destinataire = emailDe(relue);
    } else {
      const doute =
        verdict === 'inconnu'
          ? ' Le message est peut-être déjà parti : vérifiez dans le dossier (ou la boîte d’envoi) avant de renvoyer.'
          : '';
      return apresEcriture({ ...reponse, message: `${reponse.message}${doute}` });
    }
  }
  const base = { champsEnregistres: ecrit.champsEnregistres };

  if (mode === 'complement') {
    // L'API a posé statut 1 et la trace : on mémorise sa révision pour ne pas la prendre pour un conflit.
    const rev = (await relireRevision(ctx, demande._id)) ?? ecrit.rev;
    return { ok: true, patchs: ecrit.patchs, rev, message: `Demande de compléments envoyée à ${destinataire}.`, ...base };
  }

  // 4. Statut 2 : sur la révision RELUE après l'envoi, jamais sur celle d'avant l'appel.
  const apres = await poserStatutEnvoye(ctx, dossier, destinataire);
  if (apres.ok) {
    return { ok: true, patchs: ecrit.patchs + apres.patchs, rev: apres.rev, message: `Devis envoyé à ${destinataire}.`, ...base };
  }
  return {
    ok: true,
    patchs: ecrit.patchs,
    rev: ecrit.rev,
    statutACorriger: true,
    message: `Devis envoyé à ${destinataire}, mais le statut n’a pas pu être mis à jour. Utilisez « Terminer l’enregistrement de l’envoi » : aucun e-mail ne sera renvoyé.`,
    ...base,
  };
}

/**
 * Après un échec ambigu de l'API : la demande relue porte-t-elle la trace de l'envoi (date posée
 * ou changée) ? `inconnu` si la relecture elle-même échoue.
 */
async function envoiDejaParti(ctx: ContexteEcriture, avant: Demande, mode: ModeEnvoi): Promise<'parti' | 'absent' | 'inconnu'> {
  try {
    const apres = await lireDocument<Demande>(ctx, avant._id);
    if (!apres) return 'inconnu';
    const trace = mode === 'devis' ? 'devisEnvoyeLe' : 'complementDemandeLe';
    return apres[trace] && apres[trace] !== avant[trace] ? 'parti' : 'absent';
  } catch {
    return 'inconnu';
  }
}

/** Second temps de l'envoi : relecture de la `_rev`, puis statut 2 sous `ifRevisionId`. Un seul essai. */
async function poserStatutEnvoye(
  ctx: ContexteEcriture,
  dossier: Dossier,
  destinataire: string,
): Promise<Resultat<{ rev: string; patchs: number }>> {
  const demande = dossier.demande;
  if (!demande) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  let relue: Demande | null;
  try {
    relue = await lireDocument<Demande>(ctx, demande._id);
  } catch (e) {
    return traduireErreur(e);
  }
  if (!relue) return echec('reseau', 'La demande est introuvable après l’envoi.');
  // Renvoi d'un devis déjà enregistré : rien à écrire.
  if ((relue.statut ?? 0) >= DEMANDE.devisEnvoye) {
    ctx.memoriserRevision(relue._rev);
    return { ok: true, rev: relue._rev, patchs: 0 };
  }
  const supplements: Record<string, unknown> = { statut: DEMANDE.devisEnvoye };
  // L'API écrit ces deux champs sans garantie (elle ignore l'échec) : s'ils manquent, on les pose.
  if (!relue.devisEnvoyeLe) {
    supplements.devisEnvoyeLe = formaterDateHeure(ctx.maintenant());
    supplements.devisEnvoyeA = destinataire;
  }
  const e = await ecrireDossier(ctx, { ...dossier, demande: relue }, {}, 'demande', supplements);
  return e.ok ? { ok: true, rev: e.rev, patchs: e.patchs } : e;
}

// ── Terminer l'enregistrement de l'envoi (aucun e-mail) ─────────────────────

export async function executerTerminerEnvoi(ctx: ContexteEcriture, dossier: Dossier): Promise<Resultat<ResultatGeste>> {
  const demande = dossier.demande;
  if (!demande) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  // Un 409 (l'API vient d'écrire) : on relit et on recommence UNE fois.
  for (let essai = 0; essai < 2; essai += 1) {
    let relue: Demande | null;
    try {
      relue = await lireDocument<Demande>(ctx, demande._id);
    } catch (e) {
      return traduireErreur(e);
    }
    if (!relue) return echec('perime', 'Cette demande n’existe plus.');
    // Rejoué : déjà fait, un seul patch effectif au total.
    if ((relue.statut ?? 0) >= DEMANDE.devisEnvoye) {
      ctx.memoriserRevision(relue._rev);
      return { ok: true, patchs: 0, rev: relue._rev, message: 'L’envoi du devis était déjà enregistré.', champsEnregistres: [] };
    }
    if (relue.statut !== DEMANDE.enCours || !relue.devisEnvoyeLe) {
      return echec('refus', 'Aucun envoi de devis n’est enregistré sur cette demande : il n’y a rien à terminer.');
    }
    const e = await ecrireDossier(ctx, { ...dossier, demande: relue }, {}, 'demande', { statut: DEMANDE.devisEnvoye });
    if (e.ok) {
      return { ok: true, patchs: e.patchs, rev: e.rev, message: 'Envoi du devis enregistré.', champsEnregistres: [] };
    }
    if (e.motif !== 'conflit') return e;
  }
  return echec('conflit', 'La demande continue d’être modifiée ailleurs. Rechargez le dossier puis réessayez : aucun e-mail ne sera renvoyé.');
}
