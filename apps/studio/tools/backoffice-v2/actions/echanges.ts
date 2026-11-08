/**
 * Réponses des clients : ce que l'équipe écrit sur un échange. Un seul geste,
 * « marquer comme lu » (`lu = true`), volontairement simple : pas de
 * `ifRevisionId`, car le document n'a que deux auteurs possibles (l'API qui le
 * crée une fois, l'équipe qui le lit) et poser `lu = true` deux fois ne change
 * rien. Aucun autre champ n'est jamais touché.
 */
import type { ContexteEcriture, Resultat, ResultatGeste } from '../domaine/contrats';
import { estNonLu } from '../domaine/echanges';
import type { Echange } from '../domaine/types';
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
