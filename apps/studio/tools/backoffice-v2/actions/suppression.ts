/**
 * Suppression d'un document de référence (fiche client, conteneur, rotation).
 *
 * Le client minimal du contrat n'offre pas de suppression conditionnelle à une
 * révision : on relit le document et on refuse si sa `_rev` n'est plus celle que
 * l'écran a sous les yeux (quelqu'un l'a modifié entre-temps), puis on supprime.
 * Un document déjà supprimé est un succès : l'état voulu est atteint.
 */
import { avecVerrou } from '../data/activite';
import { REQUETE_DOSSIER } from '../data/requetes';
import type { ClientLike, ContexteEcriture, Resultat } from '../domaine/contrats';
import { echec, identifiantInterdit, MESSAGE_OCCUPE, traduireErreur } from './ecriture';

/** Le vrai client Sanity et le faux du harnais ont `delete` ; le contrat minimal ne le déclare pas. */
type ClientAvecSuppression = ClientLike & { delete?: (id: string) => Promise<unknown> };

export function supprimerDocument(ctx: ContexteEcriture, id: string, revVue: string): Promise<Resultat> {
  return avecVerrou(
    id,
    async (): Promise<Resultat> => {
      if (identifiantInterdit(id)) return echec('refus', 'Ce document ne peut pas être supprimé depuis l’outil.');
      const client = ctx.client as ClientAvecSuppression;
      if (!client.delete) return echec('refus', 'La suppression n’est pas disponible dans cet environnement.');
      try {
        const actuel = await client.fetch<{ _rev?: string } | null>(REQUETE_DOSSIER, { id });
        if (!actuel) return { ok: true };
        if (actuel._rev !== revVue) {
          return echec('conflit', 'Ce document a été modifié par quelqu’un d’autre. Rien n’a été supprimé : rechargez puis recommencez.');
        }
        await client.delete(id);
        return { ok: true };
      } catch (e) {
        return traduireErreur(e);
      }
    },
    () => echec('refus', MESSAGE_OCCUPE),
  );
}
