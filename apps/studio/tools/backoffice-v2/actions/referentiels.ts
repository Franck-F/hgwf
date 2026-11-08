/**
 * Stock de conteneurs et rotations (spécification 4.7). Création, modification
 * sous `ifRevisionId`, suppression. Un champ à `undefined` n'est pas touché ;
 * une chaîne vide est effacée.
 */
import type { ContexteEcriture, Resultat } from '../domaine/contrats';
import type { Brouillon, Conteneur, Rotation } from '../domaine/types';
import { echec, ecrirePatch, traduireErreur } from './ecriture';
import { supprimerDocument } from './suppression';

type Saisie = Partial<Conteneur> | Partial<Rotation>;

/** Champs de contenu d'une saisie : ni identité, ni révision, ni `undefined`. */
function champsDe(saisie: Saisie): Brouillon {
  const champs: Brouillon = {};
  for (const [champ, valeur] of Object.entries(saisie)) {
    if (champ.startsWith('_') || valeur === undefined) continue;
    if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean' || valeur === null) {
      champs[champ] = valeur;
    }
  }
  return champs;
}

async function enregistrer(
  ctx: ContexteEcriture,
  type: 'conteneurOccasion' | 'rotation',
  saisie: Saisie,
): Promise<Resultat<{ id: string }>> {
  const champs = champsDe(saisie);
  if (saisie._id) {
    if (!saisie._rev) return echec('refus', 'La révision du document est inconnue : rechargez la liste.');
    const r = await ecrirePatch(ctx, saisie._id, saisie._rev, champs, {}, saisie);
    return r.ok ? { ok: true, id: saisie._id } : r;
  }
  // Création : un document vide n'a pas de sens, et jamais de NaN (même garde que les patchs).
  const valeurs = Object.values(champs).filter((v) => v !== null && v !== '');
  if (valeurs.length === 0) return echec('manques', 'Rien à enregistrer : renseignez au moins un champ.');
  if (valeurs.some((v) => typeof v === 'number' && !Number.isFinite(v))) {
    return echec('refus', 'Une valeur numérique est illisible : rien n’a été enregistré.');
  }
  const doc: Record<string, unknown> = { _type: type };
  for (const [champ, valeur] of Object.entries(champs)) if (valeur !== null && valeur !== '') doc[champ] = valeur;
  try {
    const cree = await ctx.client.create(doc);
    ctx.memoriserRevision(cree._rev);
    return { ok: true, id: cree._id };
  } catch (e) {
    return traduireErreur(e);
  }
}

export const enregistrerConteneur = (ctx: ContexteEcriture, conteneur: Partial<Conteneur>): Promise<Resultat<{ id: string }>> =>
  enregistrer(ctx, 'conteneurOccasion', conteneur);

export const supprimerConteneur = (ctx: ContexteEcriture, conteneur: Conteneur): Promise<Resultat> =>
  supprimerDocument(ctx, conteneur._id, conteneur._rev);

export const enregistrerRotation = (ctx: ContexteEcriture, rotation: Partial<Rotation>): Promise<Resultat<{ id: string }>> =>
  enregistrer(ctx, 'rotation', rotation);

export const supprimerRotation = (ctx: ContexteEcriture, rotation: Rotation): Promise<Resultat> =>
  supprimerDocument(ctx, rotation._id, rotation._rev);
