/**
 * Conversion d'une demande acceptée en expédition (spécification 5.2) : UNE
 * transaction, donc atomique. V1 faisait quatre écritures séquentielles ; une
 * panne au milieu laissait une expédition sans demande convertie, ou l'inverse.
 *
 * La transaction contient :
 *   - `createIfNotExists` de l'expédition (id `expedition-<slug>`, idempotent) ;
 *   - le patch de la demande (champs du brouillon + statut 4 + `expeditionRef`)
 *     sous `ifRevisionId` ;
 *   - le patch de la fiche client existante (`envois` + 1) ou la création d'une
 *     nouvelle fiche.
 *
 * Rejouer ne double rien : une demande déjà au statut 4 ne réécrit ni
 * l'expédition ni le compteur `envois`, et un rejeu sur un dossier périmé
 * échoue en 409 (`ifRevisionId`) sans rien écrire.
 */
import { REQUETE_REFERENTIELS } from '../data/requetes';
import type { ContexteEcriture, Resultat, ResultatGeste } from '../domaine/contrats';
import { fusionner } from '../domaine/fusion';
import { manquesConversion } from '../domaine/manques';
import { extraireContact, normaliserNom } from '../domaine/rapprochement';
import { DEMANDE, ETAPE } from '../domaine/statuts';
import type { Brouillon, ClientFiche, Demande, Dossier } from '../domaine/types';
import { echec, preparerEcriture, proprietaire, relireRevision, traduireErreur } from './ecriture';

/** « DEV-2610-012 » devient « dev-2610-012 » : identifiant lisible et sûr. */
export const slug = (reference: string): string => reference.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const idExpedition = (reference: string): string => `expedition-${slug(reference)}`;

/** Fiche client existante : par e-mail (le plus fiable), sinon par nom normalisé, jamais par « contient ». */
export function trouverFicheClient(clients: ClientFiche[], demande: Demande): ClientFiche | undefined {
  const email = (demande.email?.trim() || extraireContact(demande.contact).email).toLowerCase();
  const nom = normaliserNom(demande.clientNom);
  return (
    (email ? clients.find((c) => extraireContact(c.contact).email.toLowerCase() === email) : undefined) ??
    (nom ? clients.find((c) => normaliserNom(c.nom) === nom) : undefined)
  );
}

async function lireClients(ctx: ContexteEcriture): Promise<ClientFiche[]> {
  const r = await ctx.client.fetch<{ clients?: ClientFiche[] } | null>(REQUETE_REFERENTIELS);
  return Array.isArray(r?.clients) ? r.clients : [];
}

export async function executerConversion(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
): Promise<Resultat<ResultatGeste>> {
  const demande = dossier.demande;
  if (!demande) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  // Rejeu : l'expédition existe déjà, il n'y a rien à refaire (ni à compter une seconde fois).
  if (demande.statut === DEMANDE.convertie) {
    return { ok: true, patchs: 0, rev: demande._rev, message: 'L’expédition existe déjà.', champsEnregistres: [] };
  }
  const effective = fusionner(demande, brouillon);
  const manques = manquesConversion(effective);
  if (manques.length) return echec('manques', `Il manque : ${manques.join(', ')}.`, manques);
  const reference = demande.reference?.trim();
  if (!reference) return echec('refus', 'Cette demande n’a pas de référence : l’expédition ne peut pas être créée.');

  // Seuls les champs de la demande partent dans son patch (les autres restent au brouillon).
  const champsDemande: Brouillon = {};
  for (const [champ, valeur] of Object.entries(brouillon)) if (proprietaire(champ, dossier) === 'demande') champsDemande[champ] = valeur;
  const prep = preparerEcriture(champsDemande, { statut: DEMANDE.convertie, expeditionRef: reference }, demande);
  if (!prep.ok) return prep;

  let clients: ClientFiche[];
  try {
    clients = await lireClients(ctx);
  } catch (e) {
    return traduireErreur(e);
  }

  // Le port de départ vit dans le message (« Départ : Fos / Marseille »).
  const depart = demande.message?.match(/Départ : (.+)/)?.[1]?.trim() || 'Le Havre';
  const email = demande.email?.trim() || extraireContact(demande.contact).email;
  const telephone = demande.telephone?.trim() || extraireContact(demande.contact).telephone;
  const expedition: Record<string, unknown> = {
    _id: idExpedition(reference),
    _type: 'expedition',
    reference,
    clientNom: demande.clientNom,
    // Les notifications d'étape écrivent à cette adresse : recopiée explicitement.
    ...(email ? { email } : {}),
    ...(telephone ? { telephone } : {}),
    ...(demande.contact ? { contact: demande.contact } : {}),
    // Chiffrage et facturation restent sur la demande, relue via demandeRef.
    demandeRef: reference,
    trajet: `${depart} → ${demande.destination ?? ''}`,
    etape: ETAPE.priseEnCharge,
    eta: 'À PLANIFIER',
  };

  const existante = trouverFicheClient(clients, demande);
  const nom = (demande.clientNom ?? '').trim();
  try {
    let tx = ctx.client
      .transaction()
      .createIfNotExists(expedition)
      .patch(demande._id, (p) => {
        let q = p.ifRevisionId(demande._rev);
        if (Object.keys(prep.set).length > 0) q = q.set(prep.set);
        if (prep.unset.length > 0) q = q.unset(prep.unset);
        return q;
      });
    if (existante) {
      tx = tx.patch(existante._id, (p) =>
        p
          .ifRevisionId(existante._rev)
          .set({ envois: (existante.envois ?? 0) + 1, destination: demande.destination ?? existante.destination ?? '' }),
      );
    } else if (nom) {
      tx = tx.create({
        _type: 'clientFiche',
        nom,
        contact: demande.contact ?? '',
        destination: demande.destination ?? '',
        envois: 1,
        volume: demande.volume ?? '',
      });
    }
    await tx.commit();
  } catch (e) {
    return traduireErreur(e);
  }

  // Une transaction ne rend pas les `_rev` : on les relit, et on les mémorise
  // (la demande ET l'expédition, qui entre dans le dossier) pour que la relecture
  // suivante ne soit pas prise pour le travail de quelqu'un d'autre.
  const rev = (await relireRevision(ctx, demande._id)) ?? demande._rev;
  await relireRevision(ctx, String(expedition._id));
  return {
    ok: true,
    patchs: 1,
    rev,
    message: `Expédition créée pour ${nom || 'le client'}.`,
    champsEnregistres: prep.enregistres,
  };
}
