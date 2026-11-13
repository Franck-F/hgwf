/**
 * Réponses des clients : ce que l'équipe écrit sur un échange. Un seul geste,
 * « marquer comme lu » (`lu = true`), volontairement simple : pas de
 * `ifRevisionId`, car le document n'a que deux auteurs possibles (l'API qui le
 * crée une fois, l'équipe qui le lit) et poser `lu = true` deux fois ne change
 * rien. Aucun autre champ n'est jamais touché.
 */
import type { ContexteEcriture, Resultat, ResultatGeste } from '../domaine/contrats';
import { echangeARelire, estNonLu } from '../domaine/echanges';
import type { Dossier, Echange } from '../domaine/types';
import { echec, identifiantInterdit, traduireErreur } from './ecriture';

export async function marquerEchangesLus(
  ctx: ContexteEcriture,
  echanges: Echange[],
): Promise<Resultat<ResultatGeste>> {
  const aLire = echanges.filter(estNonLu);
  if (aLire.length === 0) {
    return { ok: true, patchs: 0, message: 'Tout est déjà lu.', champsEnregistres: [] };
  }
  if (aLire.some((e) => identifiantInterdit(e._id) || e._type !== 'echange')) {
    return echec('refus', 'Ce document ne peut pas être modifié depuis l’outil.');
  }
  try {
    if (aLire.length === 1 && aLire[0]) {
      const r = await ctx.client.patch(aLire[0]._id).set({ lu: true }).commit();
      ctx.memoriserRevision(r._rev);
    } else {
      // Plusieurs réponses : tout ou rien, pour ne jamais laisser le fil à moitié lu.
      await aLire
        .reduce((tx, e) => tx.patch(e._id, (p) => p.set({ lu: true })), ctx.client.transaction())
        .commit();
    }
  } catch (e) {
    return traduireErreur(e);
  }
  const n = aLire.length;
  return {
    ok: true,
    patchs: 1,
    message: n > 1 ? `${n} réponses marquées comme lues.` : 'Réponse marquée comme lue.',
    champsEnregistres: [],
  };
}

/**
 * « Relire le message » : l'API va rechercher chez Resend le texte et les
 * pièces d'une réponse rangée vide, et refait la vérification de l'expéditeur.
 * Rien n'est écrit ici : c'est l'API qui met l'échange à jour.
 */
export async function relireEchange(ctx: ContexteEcriture, echange: Echange): Promise<Resultat<ResultatGeste>> {
  if (!echangeARelire(echange)) return echec('refus', 'Ce message n’a rien à relire.');
  const r = await ctx.appelerApi('/api/relire-echange', { echangeId: echange._id });
  if (!r.ok) return r;
  const c = r.reponse.corps;
  const pieces = typeof c.pieces === 'number' && c.pieces > 0 ? ` et ${c.pieces} pièce${c.pieces > 1 ? 's' : ''} jointe${c.pieces > 1 ? 's' : ''}` : '';
  const message = c.texte === false && !pieces ? 'Message relu : il ne contient pas de texte.' : `Message relu : texte${pieces} récupéré${pieces ? 's' : ''}.`;
  return { ok: true, patchs: 1, message, champsEnregistres: [] };
}

export interface SuggestionReponse {
  texte: string;
  /** D'après sa réponse, le devis peut maintenant être établi. */
  devisPossible: boolean;
  /** Ce qu'il manque encore pour chiffrer (pour l'équipe). */
  manques: string[];
}

/**
 * Réponse proposée par l'IA au message d'un client. Rien n'est écrit : le
 * texte revient dans la fenêtre « Répondre », l'équipe le relit et l'envoie.
 * L'API ne reçoit que des identifiants ; elle relit la demande et le message
 * dans Sanity et anonymise ce qui part chez le modèle.
 */
export async function suggererReponse(
  ctx: ContexteEcriture,
  dossier: Dossier,
  echange: Echange,
): Promise<Resultat<{ suggestion: SuggestionReponse }>> {
  const reference = dossier.demande?.reference;
  if (!reference) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  const r = await ctx.appelerApi('/api/suggestion-devis', {
    reference,
    champ: 'reponse',
    echangeId: echange._id,
    ficheId: dossier.demande?.ficheService?._ref,
  });
  if (!r.ok) return r;
  const s = (r.reponse.corps.suggestion ?? {}) as Record<string, unknown>;
  const texte = typeof s.texte === 'string' ? s.texte.trim() : '';
  if (!texte) return echec('refus', 'Aucune réponse n’a pu être proposée pour ce message.');
  const manques = Array.isArray(s.manques) ? s.manques.filter((m): m is string => typeof m === 'string') : [];
  return { ok: true, suggestion: { texte, devisPossible: s.devisPossible === true, manques } };
}

/**
 * Envoie la réponse de l'équipe au client. Le destinataire est relu par l'API
 * dans la demande (jamais pris ici) ; l'envoi est consigné dans le fil et le
 * message auquel on répond passe « lu ».
 */
export async function envoyerReponse(
  ctx: ContexteEcriture,
  dossier: Dossier,
  echange: Echange | null,
  saisie: { objet: string; texte: string },
): Promise<Resultat<ResultatGeste>> {
  const reference = dossier.demande?.reference;
  if (!reference) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  if (!saisie.objet.trim() || !saisie.texte.trim()) return echec('refus', 'L’objet et le message sont obligatoires.');
  const r = await ctx.appelerApi('/api/envoi-reponse', {
    reference,
    objet: saisie.objet.trim(),
    texte: saisie.texte.trim(),
    ...(echange ? { echangeId: echange._id } : {}),
    auteur: ctx.utilisateur.nom,
  });
  if (!r.ok) return r;
  const a = typeof r.reponse.corps.destinataire === 'string' ? r.reponse.corps.destinataire : 'le client';
  return { ok: true, patchs: 1, message: `Réponse envoyée à ${a}.`, champsEnregistres: [] };
}
