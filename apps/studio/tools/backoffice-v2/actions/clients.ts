/**
 * Fiches clients (spécification 4.6). Toute écriture porte `ifRevisionId` ;
 * un 409 devient `conflit`. Les compteurs `envois` / `volume` ne sont plus
 * saisis ici : ils ne sont écrits qu'à la conversion.
 */
import type { ContexteEcriture, Resultat } from '../domaine/contrats';
import type { Brouillon, ClientFiche } from '../domaine/types';
import { echec, ecrirePatch, traduireErreur } from './ecriture';
import { supprimerDocument } from './suppression';

export type SaisieClient = Pick<ClientFiche, 'nom' | 'contact' | 'destination'>;

export async function creerClient(ctx: ContexteEcriture, saisie: SaisieClient): Promise<Resultat<{ clientId: string }>> {
  const nom = (saisie.nom ?? '').trim();
  if (!nom) return echec('manques', 'Il manque : le nom du client.', ['le nom du client']);
  const contact = saisie.contact?.trim();
  const destination = saisie.destination?.trim();
  try {
    const cree = await ctx.client.create({
      _type: 'clientFiche',
      nom,
      ...(contact ? { contact } : {}),
      ...(destination ? { destination } : {}),
      envois: 0,
    });
    ctx.memoriserRevision(cree._rev);
    return { ok: true, clientId: cree._id };
  } catch (e) {
    return traduireErreur(e);
  }
}

/** Seuls les champs réellement modifiés partent ; un champ vidé est effacé. */
export async function modifierClient(
  ctx: ContexteEcriture,
  client: ClientFiche,
  saisie: SaisieClient,
): Promise<Resultat<{ rev: string }>> {
  if (saisie.nom !== undefined && !saisie.nom.trim()) {
    return echec('manques', 'Il manque : le nom du client.', ['le nom du client']);
  }
  const modifs: Brouillon = {};
  for (const champ of ['nom', 'contact', 'destination'] as const) {
    const nouveau = saisie[champ];
    if (nouveau !== undefined && nouveau.trim() !== (client[champ] ?? '').trim()) modifs[champ] = nouveau.trim();
  }
  if (Object.keys(modifs).length === 0) return { ok: true, rev: client._rev };
  const r = await ecrirePatch(ctx, client._id, client._rev, modifs, {}, client);
  return r.ok ? { ok: true, rev: r.rev } : r;
}

export function supprimerClient(ctx: ContexteEcriture, client: ClientFiche): Promise<Resultat> {
  return supprimerDocument(ctx, client._id, client._rev);
}
