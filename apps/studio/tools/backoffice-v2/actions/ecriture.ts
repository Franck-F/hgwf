/**
 * Écriture dans Sanity (spécification 8.3) : le SEUL endroit qui construit un
 * patch.
 *
 * Règles tenues ici, pour tout l'outil :
 * - champs modifiés uniquement (le brouillon ne contient que cela) ;
 * - `unset` des champs vidés (`null` ou chaîne vide) : `set({x: undefined})`
 *   n'efface rien dans Sanity ;
 * - `ifRevisionId` TOUJOURS, y compris pour les expéditions et les clients ;
 * - un 409 devient `conflit`, rien n'est présenté comme enregistré ;
 * - jamais de `NaN` dans un patch ; montant HT et taux de TVA écrits ensemble
 *   ou pas du tout (jamais l'un sans l'autre) ;
 * - SIRET et TVA intracom ignorés si le client n'est pas professionnel ;
 * - aucune écriture sur un identifiant `system.*` ou `drafts.*` ;
 * - verrou anti double clic par document.
 */
import { avecVerrou } from '../data/activite';
import { REQUETE_DOSSIER } from '../data/requetes';
import type { ContexteEcriture, MotifEchec, PatchLike, Resultat } from '../domaine/contrats';
import type { Brouillon, Dossier } from '../domaine/types';
import { proprietaire, type CibleDocument } from './proprietaire';

export { CHAMPS_EXPEDITION, proprietaire, type CibleDocument } from './proprietaire';

export type Echec = Extract<Resultat, { ok: false }>;

export const echec = (motif: MotifEchec, message: string, manques?: string[]): Echec =>
  manques ? { ok: false, motif, message, manques } : { ok: false, motif, message };

export const MESSAGE_OCCUPE = 'Une écriture est déjà en cours sur ce dossier. Patientez un instant.';

// ── Erreurs ─────────────────────────────────────────────────────────────────

/** 409 de Sanity : la révision attendue n'est plus celle du document. */
export function estConflit(e: unknown): boolean {
  const err = e as { statusCode?: number; response?: { statusCode?: number } } | null;
  return err?.statusCode === 409 || err?.response?.statusCode === 409;
}

export function traduireErreur(e: unknown): Echec {
  if (estConflit(e)) {
    return echec(
      'conflit',
      'Ce dossier a été modifié par quelqu’un d’autre depuis son ouverture. Rien n’a été enregistré : rechargez-le puis recommencez.',
    );
  }
  const detail = e instanceof Error && e.message ? ` (${e.message})` : '';
  return echec('reseau', `L’enregistrement a échoué${detail}. Vos saisies sont conservées : réessayez.`);
}

/** Jamais d'écriture sur un document système ou un brouillon Sanity. */
export function identifiantInterdit(id: string): boolean {
  return !id || id.startsWith('system.') || id.startsWith('drafts.') || id.startsWith('_.');
}

// ── Préparation d'un patch ──────────────────────────────────────────────────

export interface Preparation {
  set: Record<string, unknown>;
  unset: string[];
  /** Champs du brouillon traités (écrits, ou volontairement ignorés) : à retirer du brouillon. */
  enregistres: string[];
}

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Transforme brouillon + compléments en `set` / `unset`. Pure : ne lit rien,
 * n'écrit rien. `document` (le document chargé) sert à vérifier les règles qui
 * portent sur l'état final (montant et taux). Une valeur `null` ou une chaîne
 * vide est un champ vidé.
 */
export function preparerEcriture(
  brouillon: Brouillon,
  supplements: Record<string, unknown> = {},
  document?: object,
): ({ ok: true } & Preparation) | Echec {
  const fusion: Record<string, unknown> = { ...brouillon, ...supplements };
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  for (const [champ, brut] of Object.entries(fusion)) {
    if (champ.startsWith('_')) return echec('refus', `Le champ « ${champ} » ne peut pas être écrit.`);
    if (typeof brut === 'number' && !Number.isFinite(brut)) {
      return echec('refus', 'Une valeur numérique est illisible : rien n’a été enregistré.');
    }
    const vide = brut === null || brut === undefined || (typeof brut === 'string' && brut.trim() === '');
    if (vide) {
      unset.push(champ);
    } else if (champ === 'ficheService' && typeof brut === 'string') {
      // Le brouillon ne porte que des valeurs simples : l'identifiant de la fiche devient une référence.
      set[champ] = { _type: 'reference', _ref: brut, _weak: true };
    } else if (typeof brut === 'string' || typeof brut === 'number' || typeof brut === 'boolean') {
      set[champ] = brut;
    } else {
      return echec('refus', `La valeur du champ « ${champ} » ne peut pas être écrite.`);
    }
  }

  const source = (document ?? {}) as Record<string, unknown>;
  const effectif = (champ: string): unknown =>
    champ in set ? set[champ] : unset.includes(champ) ? undefined : source[champ];

  // SIRET et TVA intracom n'ont de sens que pour un client professionnel.
  const typeConnu = 'facturationType' in fusion || 'facturationType' in source;
  if (typeConnu && effectif('facturationType') !== 'professionnel') {
    for (const champ of ['facturationSiret', 'facturationTvaIntracom']) {
      delete set[champ];
      const i = unset.indexOf(champ);
      if (i >= 0) unset.splice(i, 1);
    }
  }

  // Montant HT et taux vont ensemble : jamais l'un sans l'autre.
  const touche = ['montantHT', 'tauxTVA'].some((c) => c in set || unset.includes(c));
  if (touche && estNombre(effectif('montantHT')) !== estNombre(effectif('tauxTVA'))) {
    return echec('refus', 'Le montant HT et le taux de TVA vont ensemble : renseignez les deux, ou aucun des deux.');
  }

  return { ok: true, set, unset, enregistres: Object.keys(brouillon) };
}

function appliquerOperations(patch: PatchLike, prep: Preparation): PatchLike {
  let p = patch;
  if (Object.keys(prep.set).length > 0) p = p.set(prep.set);
  if (prep.unset.length > 0) p = p.unset(prep.unset);
  return p;
}

const rienAEcrire = (prep: Preparation): boolean => Object.keys(prep.set).length === 0 && prep.unset.length === 0;

/** Relit la révision d'un document (nécessaire après une transaction, qui ne renvoie pas les `_rev`). */
export async function relireRevision(ctx: ContexteEcriture, id: string): Promise<string | null> {
  try {
    const doc = await ctx.client.fetch<{ _rev?: string } | null>(REQUETE_DOSSIER, { id });
    const rev = doc?._rev ?? null;
    if (rev) ctx.memoriserRevision(rev);
    return rev;
  } catch {
    return null;
  }
}

// ── Écriture d'un document ──────────────────────────────────────────────────

async function ecrirePatchSansVerrou(
  ctx: ContexteEcriture,
  id: string,
  rev: string,
  brouillon: Brouillon,
  supplements: Record<string, unknown>,
  document?: object,
): Promise<Resultat<{ rev: string; champsEnregistres: string[] }>> {
  if (identifiantInterdit(id)) return echec('refus', 'Ce document ne peut pas être modifié depuis l’outil.');
  if (!rev) return echec('refus', 'La révision du document est inconnue : rechargez le dossier.');

  let reference = document;
  const fusion = { ...brouillon, ...supplements };
  // Un seul des deux champs du montant modifié : on lit l'autre pour vérifier le couple.
  if (!reference && ('montantHT' in fusion) !== ('tauxTVA' in fusion)) {
    try {
      reference = (await ctx.client.fetch<object | null>(REQUETE_DOSSIER, { id })) ?? undefined;
    } catch (e) {
      return traduireErreur(e);
    }
  }

  const prep = preparerEcriture(brouillon, supplements, reference);
  if (!prep.ok) return prep;
  if (rienAEcrire(prep)) return { ok: true, rev, champsEnregistres: prep.enregistres };

  try {
    const r = await appliquerOperations(ctx.client.patch(id).ifRevisionId(rev), prep).commit();
    ctx.memoriserRevision(r._rev);
    return { ok: true, rev: r._rev, champsEnregistres: prep.enregistres };
  } catch (e) {
    return traduireErreur(e);
  }
}

/**
 * Écrit un brouillon (et d'éventuels champs de trace) dans UN document, sous
 * `ifRevisionId`. `document` (facultatif) est le document chargé : il permet de
 * vérifier le couple montant / taux sans relire Sanity.
 */
export function ecrirePatch(
  ctx: ContexteEcriture,
  id: string,
  rev: string,
  brouillon: Brouillon,
  supplements: Record<string, unknown> = {},
  document?: object,
): Promise<Resultat<{ rev: string; champsEnregistres: string[] }>> {
  return avecVerrou(
    id,
    () => ecrirePatchSansVerrou(ctx, id, rev, brouillon, supplements, document),
    () => echec('refus', MESSAGE_OCCUPE),
  );
}

// ── Écriture d'un dossier (règle 5.5) ───────────────────────────────────────

export interface EcritureDossier {
  /** Nouvelle `_rev` du document visé par le geste. */
  rev: string;
  /** Nombre d'appels d'écriture (un patch, ou une transaction si les deux documents changent). */
  patchs: number;
  /** Champs du brouillon désormais traités. */
  champsEnregistres: string[];
}

/**
 * Écrit en UN appel les champs du brouillon ET les compléments du geste
 * (statut, traces) sur le document `cible`. Si le brouillon touche aussi
 * l'autre document du dossier, les deux patchs partent dans une transaction :
 * tout ou rien. Sans verrou : l'appelant (`appliquerGeste`) le tient déjà.
 */
export async function ecrireDossier(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
  cible: CibleDocument,
  supplements: Record<string, unknown>,
): Promise<Resultat<EcritureDossier>> {
  const docCible = cible === 'demande' ? dossier.demande : dossier.expedition;
  if (!docCible) return echec('refus', 'Le document à modifier est introuvable dans ce dossier.');
  const autre: CibleDocument = cible === 'demande' ? 'expedition' : 'demande';
  const docAutre = autre === 'demande' ? dossier.demande : dossier.expedition;

  const parts: Record<CibleDocument, Brouillon> = { demande: {}, expedition: {} };
  for (const [champ, valeur] of Object.entries(brouillon)) {
    const proprio = proprietaire(champ, dossier);
    // Un champ sans document pour l'accueillir reste dans le brouillon : on n'invente rien.
    if ((proprio === 'demande' ? dossier.demande : dossier.expedition) === undefined) continue;
    parts[proprio][champ] = valeur;
  }

  const prepCible = preparerEcriture(parts[cible], supplements, docCible);
  if (!prepCible.ok) return prepCible;
  let prepAutre: ({ ok: true } & Preparation) | null = null;
  if (docAutre && Object.keys(parts[autre]).length > 0) {
    const p = preparerEcriture(parts[autre], {}, docAutre);
    if (!p.ok) return p;
    prepAutre = p;
  }
  const champsEnregistres = [...prepCible.enregistres, ...(prepAutre?.enregistres ?? [])];
  for (const id of [docCible._id, docAutre?._id ?? '']) {
    if (id && identifiantInterdit(id)) return echec('refus', 'Ce document ne peut pas être modifié depuis l’outil.');
  }

  const ecritureAutre = prepAutre !== null && !rienAEcrire(prepAutre);
  if (rienAEcrire(prepCible) && !ecritureAutre) {
    return { ok: true, rev: docCible._rev, patchs: 0, champsEnregistres };
  }

  try {
    if (ecritureAutre && prepAutre && docAutre) {
      // Les deux documents changent : une transaction, annulée en bloc au moindre refus.
      await ctx.client
        .transaction()
        .patch(docCible._id, (p) => appliquerOperations(p.ifRevisionId(docCible._rev), prepCible))
        .patch(docAutre._id, (p) => appliquerOperations(p.ifRevisionId(docAutre._rev), prepAutre))
        .commit();
      const rev = (await relireRevision(ctx, docCible._id)) ?? docCible._rev;
      await relireRevision(ctx, docAutre._id);
      return { ok: true, rev, patchs: 1, champsEnregistres };
    }
    const r = await appliquerOperations(ctx.client.patch(docCible._id).ifRevisionId(docCible._rev), prepCible).commit();
    ctx.memoriserRevision(r._rev);
    return { ok: true, rev: r._rev, patchs: 1, champsEnregistres };
  } catch (e) {
    return traduireErreur(e);
  }
}
