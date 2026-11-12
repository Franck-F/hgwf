/**
 * Fiches services modifiables dans le back-office (Outils > Fiches services).
 *
 * Toute écriture porte `ifRevisionId` ; un 409 devient `conflit`. Les champs
 * vidés (texte vide, liste vide, `null`) sont effacés (`unset`). Contrairement
 * aux autres actions, une fiche porte des listes (chaînes, lignes de tarif,
 * délais) : le patch est donc construit ici plutôt que par `preparerEcriture`,
 * qui ne connaît que les valeurs simples. Verrou anti double écriture par fiche.
 *
 * Suppression : la référence `demandeDevis.ficheService` est FAIBLE (Sanity ne
 * bloque donc jamais la suppression). On la refuse quand même tant que des
 * demandes s'y rattachent : l'ancien devis garderait sa fiche ; on propose
 * alors de la retirer (`actif = false`), ce qui la conserve pour l'historique.
 */
import { avecVerrou } from '../data/activite';
import type { ContexteEcriture, Resultat } from '../domaine/contrats';
import type { Fiche } from '../domaine/types';
import { echec, identifiantInterdit, MESSAGE_OCCUPE, traduireErreur } from './ecriture';
import { supprimerDocument } from './suppression';

/** Champs d'une fiche que l'éditeur peut écrire (rien d'autre ne part). */
export const CHAMPS_FICHE = [
  'titre',
  'ordre',
  'actif',
  'libellesFormulaire',
  'resume',
  'methodeTarif',
  'grille',
  'fraisAnnexes',
  'tauxTVADefaut',
  'delais',
  'inclus',
  'nonInclus',
  'documents',
  'infosAObtenir',
  'vigilance',
  'modeleDescription',
  'modeleMessage',
  'modeleNote',
  'aCompleter',
] as const;

export type ChampFiche = (typeof CHAMPS_FICHE)[number];
export type ValeurFiche = string | number | boolean | null | undefined | unknown[];
export type ModifsFiche = Partial<Record<ChampFiche, ValeurFiche>>;

const estVide = (v: ValeurFiche): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Comme `traduireErreur`, avec un message de conflit qui parle de la fiche. */
function erreurFiche(e: unknown) {
  const r = traduireErreur(e);
  return r.motif === 'conflit'
    ? echec('conflit', 'Cette fiche a été modifiée par quelqu’un d’autre depuis son ouverture.')
    : r;
}

const MSG_TITRE = 'Il manque : le nom du service.';

/** Écrit un ou plusieurs champs d'une fiche, sous `ifRevisionId`. */
export function modifierChampsFiche(
  ctx: ContexteEcriture,
  id: string,
  rev: string,
  modifs: ModifsFiche,
): Promise<Resultat<{ rev: string }>> {
  return avecVerrou(
    id,
    async (): Promise<Resultat<{ rev: string }>> => {
      if (identifiantInterdit(id)) return echec('refus', 'Cette fiche ne peut pas être modifiée depuis l’outil.');
      if (!rev) return echec('refus', 'La révision de la fiche est inconnue : rechargez la page.');
      const set: Record<string, unknown> = {};
      const unset: string[] = [];
      for (const [champ, valeur] of Object.entries(modifs) as [string, ValeurFiche][]) {
        if (!(CHAMPS_FICHE as readonly string[]).includes(champ)) {
          return echec('refus', `Le champ « ${champ} » ne peut pas être écrit.`);
        }
        if (typeof valeur === 'number' && !Number.isFinite(valeur)) {
          return echec('refus', 'Une valeur numérique est illisible : rien n’a été enregistré.');
        }
        if (champ === 'titre' && estVide(valeur)) return echec('manques', MSG_TITRE, ['le nom du service']);
        if (estVide(valeur)) unset.push(champ);
        else set[champ] = valeur;
      }
      if (Object.keys(set).length === 0 && unset.length === 0) return { ok: true, rev };
      try {
        let patch = ctx.client.patch(id).ifRevisionId(rev);
        if (Object.keys(set).length > 0) patch = patch.set(set);
        if (unset.length > 0) patch = patch.unset(unset);
        const r = await patch.commit();
        ctx.memoriserRevision(r._rev);
        return { ok: true, rev: r._rev };
      } catch (e) {
        return erreurFiche(e);
      }
    },
    () => echec('refus', MESSAGE_OCCUPE),
  );
}

/** Un seul champ (cas courant : un champ texte quitté). */
export function modifierChampFiche(
  ctx: ContexteEcriture,
  fiche: Pick<Fiche, '_id' | '_rev'>,
  champ: ChampFiche,
  valeur: ValeurFiche,
): Promise<Resultat<{ rev: string }>> {
  return modifierChampsFiche(ctx, fiche._id, fiche._rev, { [champ]: valeur });
}

/** Crée une fiche vide (active) : seul le nom du service est obligatoire. */
export async function creerFiche(
  ctx: ContexteEcriture,
  saisie: { titre: string; ordre?: number },
): Promise<Resultat<{ ficheId: string; rev: string }>> {
  const titre = (saisie.titre ?? '').trim();
  if (!titre) return echec('manques', MSG_TITRE, ['le nom du service']);
  try {
    const cree = await ctx.client.create({
      _type: 'ficheService',
      titre,
      actif: true,
      ...(typeof saisie.ordre === 'number' && Number.isFinite(saisie.ordre) ? { ordre: saisie.ordre } : {}),
    });
    ctx.memoriserRevision(cree._rev);
    return { ok: true, ficheId: cree._id, rev: cree._rev };
  } catch (e) {
    return erreurFiche(e);
  }
}

/** Relit une fiche (même inactive) : sert à repartir de la dernière version après un conflit. */
export async function lireFiche(ctx: ContexteEcriture, id: string): Promise<Fiche | null> {
  try {
    return (await ctx.client.getDocument<Fiche>(id)) ?? null;
  } catch {
    return null;
  }
}

/** Nombre de demandes rattachées à la fiche à la main (référence `ficheService`). */
export async function nombreDemandesLiees(ctx: ContexteEcriture, ficheId: string): Promise<number> {
  try {
    const n = await ctx.client.fetch<number | null>('count(*[_type == "demandeDevis" && ficheService._ref == $ficheId])', {
      ficheId,
    });
    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Supprime la fiche, sauf si des demandes s'y rattachent : il faut alors la retirer. */
export async function supprimerFiche(ctx: ContexteEcriture, fiche: Pick<Fiche, '_id' | '_rev'>): Promise<Resultat> {
  const liees = await nombreDemandesLiees(ctx, fiche._id);
  if (liees > 0) {
    return echec(
      'refus',
      `Cette fiche est utilisée par ${liees} ${liees > 1 ? 'demandes' : 'demande'} : elle ne peut pas être supprimée. Retirez-la : elle ne sera plus proposée, mais restera disponible pour les anciens devis.`,
    );
  }
  return supprimerDocument(ctx, fiche._id, fiche._rev);
}

/** Retire la fiche des choix (`actif = false`) ou la réactive. Les anciens devis la gardent. */
export function definirFicheActive(
  ctx: ContexteEcriture,
  fiche: Pick<Fiche, '_id' | '_rev'>,
  actif: boolean,
): Promise<Resultat<{ rev: string }>> {
  return modifierChampFiche(ctx, fiche, 'actif', actif);
}

export const retirerFiche = (ctx: ContexteEcriture, fiche: Pick<Fiche, '_id' | '_rev'>) =>
  definirFicheActive(ctx, fiche, false);
export const reactiverFiche = (ctx: ContexteEcriture, fiche: Pick<Fiche, '_id' | '_rev'>) =>
  definirFicheActive(ctx, fiche, true);
