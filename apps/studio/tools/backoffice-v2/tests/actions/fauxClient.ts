/**
 * Faux client Sanity et fausse API pour les tests des actions.
 *
 * Le faux client reproduit ce dont les règles de sûreté dépendent : une `_rev`
 * qui change à chaque écriture, `ifRevisionId` vérifié (409 sinon), une
 * transaction atomique (tout est vérifié avant d'écrire), et un journal d'une
 * entrée par appel mutant (une transaction = une entrée), comme le harnais.
 */
import type { ClientLike, ContexteEcriture, PatchLike, ReponseApi, Resultat, TransactionLike } from '../../domaine/contrats';
import type { Demande, Dossier, Expedition } from '../../domaine/types';

export type Doc = Record<string, unknown> & { _id: string; _type: string };

export interface Entree {
  op: 'patch' | 'create' | 'createIfNotExists' | 'delete' | 'transaction';
  id?: string;
  ifRevisionId?: string;
  set?: Record<string, unknown>;
  unset?: string[];
  inc?: Record<string, number>;
  doc?: Record<string, unknown>;
  ops?: Entree[];
}

interface Operation {
  kind: 'patch' | 'create' | 'createIfNotExists';
  id: string;
  rev?: string;
  set: Record<string, unknown>;
  unset: string[];
  inc: Record<string, number>;
  doc?: Doc;
}

let compteur = 0;
const nouvelleRev = (): string => `rev-${(compteur += 1)}`;

export class Erreur409 extends Error {
  statusCode = 409;
}

export interface FauxClient extends ClientLike {
  docs: Map<string, Doc>;
  journal: Entree[];
  /** Fait échouer l'écriture suivante (tous types) avec cette erreur. */
  echouerProchaine(erreur: Error): void;
  /** Modification « venue d'ailleurs » : change la `_rev` sans journal. */
  modifierAilleurs(id: string, champs: Record<string, unknown>): string;
  delete(id: string): Promise<unknown>;
}

const vide = (): Pick<Operation, 'set' | 'unset' | 'inc'> => ({ set: {}, unset: [], inc: {} });

export function creerFauxClient(initiaux: (Doc | Demande | Expedition)[]): FauxClient {
  const docs = new Map<string, Doc>();
  for (const brut of initiaux) {
    const d = brut as unknown as Doc;
    docs.set(d._id, { ...d, _rev: (d._rev as string) ?? nouvelleRev() });
  }
  const journal: Entree[] = [];
  let aEchouer: Error | null = null;

  const parType = (t: string) => [...docs.values()].filter((d) => d._type === t).map((d) => ({ ...d }));

  function lancerEchecInjecte(): void {
    if (aEchouer) {
      const e = aEchouer;
      aEchouer = null;
      throw e;
    }
  }

  function verifier(op: Operation): void {
    if (op.kind === 'patch') {
      const d = docs.get(op.id);
      if (!d) throw new Error(`document introuvable : ${op.id}`);
      if (op.rev !== undefined && d._rev !== op.rev) throw new Erreur409('revision mismatch');
    } else if (op.kind === 'create' && op.doc?._id && docs.has(op.doc._id)) {
      throw new Erreur409('existe déjà');
    }
  }

  function appliquer(op: Operation): { _id: string; _rev: string } {
    if (op.kind === 'patch') {
      const d = docs.get(op.id) as Doc;
      Object.assign(d, op.set);
      for (const c of op.unset) delete d[c];
      for (const [c, n] of Object.entries(op.inc)) d[c] = (Number(d[c]) || 0) + n;
      d._rev = nouvelleRev();
      return { _id: d._id, _rev: d._rev as string };
    }
    const doc = op.doc as Doc;
    const id = doc._id ?? `auto-${docs.size + 1}`;
    if (op.kind === 'createIfNotExists' && docs.has(id)) return { _id: id, _rev: docs.get(id)?._rev as string };
    const cree = { ...doc, _id: id, _rev: nouvelleRev() } as Doc;
    docs.set(id, cree);
    return { _id: id, _rev: cree._rev as string };
  }

  const entreeDe = (op: Operation): Entree =>
    op.kind === 'patch'
      ? {
          op: 'patch',
          id: op.id,
          ...(op.rev !== undefined ? { ifRevisionId: op.rev } : {}),
          set: op.set,
          unset: op.unset,
          inc: op.inc,
        }
      : { op: op.kind, id: op.doc?._id, doc: op.doc };

  function fabriquerPatch(id: string, enregistrer?: (op: Operation) => void): PatchLike {
    const op: Operation = { kind: 'patch', id, ...vide() };
    const p: PatchLike = {
      set: (c) => {
        op.set = { ...op.set, ...c };
        return p;
      },
      unset: (c) => {
        op.unset = [...op.unset, ...c];
        return p;
      },
      inc: (c) => {
        op.inc = { ...op.inc, ...c };
        return p;
      },
      ifRevisionId: (r) => {
        op.rev = r;
        return p;
      },
      commit: async () => {
        if (enregistrer) {
          enregistrer(op);
          return { _id: id, _rev: '' };
        }
        lancerEchecInjecte();
        verifier(op);
        const r = appliquer(op);
        journal.push(entreeDe(op));
        return r;
      },
    };
    return p;
  }

  async function creer(kind: 'create' | 'createIfNotExists', doc: Record<string, unknown>) {
    const op: Operation = { kind, id: String(doc._id ?? ''), ...vide(), doc: doc as Doc };
    lancerEchecInjecte();
    verifier(op);
    const r = appliquer(op);
    journal.push(entreeDe(op));
    return r;
  }

  const client: FauxClient = {
    docs,
    journal,
    echouerProchaine: (e) => {
      aEchouer = e;
    },
    modifierAilleurs: (id, champs) => {
      const d = docs.get(id) as Doc;
      Object.assign(d, champs);
      d._rev = nouvelleRev();
      return d._rev as string;
    },
    async fetch<T>(requete: string, params?: Record<string, unknown>): Promise<T> {
      // Réponses d'un dossier : par demande liée ou par référence (minuscules), comme la vraie requête.
      if (requete.includes('_type == "echange"') && params && 'references' in params) {
        const refs = (params.references as string[]) ?? [];
        return parType('echange')
          .filter(
            (e) =>
              (e.demande as { _ref?: string } | undefined)?._ref === params.demandeId ||
              refs.includes(String(e.reference ?? '').toLowerCase()),
          )
          .map((e) => ({ ...e, demandeId: (e.demande as { _ref?: string } | undefined)?._ref })) as T;
      }
      if (params && typeof params.id === 'string') {
        const d = docs.get(params.id);
        return (d ? { ...d } : null) as T;
      }
      if (requete.includes('"demandes"')) {
        return {
          demandes: parType('demandeDevis'),
          expeditions: parType('expedition'),
          clients: parType('clientFiche'),
          conteneurs: parType('conteneurOccasion'),
          rotations: parType('rotation'),
          fiches: parType('ficheService'),
          echanges: parType('echange').map((e) => ({ ...e, demandeId: (e.demande as { _ref?: string } | undefined)?._ref })),
        } as T;
      }
      return null as T;
    },
    async getDocument<T>(id: string) {
      const d = docs.get(id);
      return (d ? { ...d } : undefined) as T | undefined;
    },
    patch: (id) => fabriquerPatch(id),
    create: (doc) => creer('create', doc),
    createIfNotExists: (doc) => creer('createIfNotExists', doc),
    async delete(id) {
      docs.delete(id);
      journal.push({ op: 'delete', id });
      return {};
    },
    transaction(): TransactionLike {
      const ops: Operation[] = [];
      const tx: TransactionLike = {
        create: (doc) => {
          ops.push({ kind: 'create', id: String(doc._id ?? ''), ...vide(), doc: doc as Doc });
          return tx;
        },
        createIfNotExists: (doc) => {
          ops.push({ kind: 'createIfNotExists', id: String(doc._id), ...vide(), doc: doc as Doc });
          return tx;
        },
        patch: (id, f) => {
          void f(fabriquerPatch(id, (op) => ops.push(op))).commit();
          return tx;
        },
        commit: async () => {
          lancerEchecInjecte();
          // Atomique : tout est vérifié avant la première écriture.
          for (const op of ops) verifier(op);
          for (const op of ops) appliquer(op);
          journal.push({ op: 'transaction', ops: ops.map(entreeDe) });
          return {};
        },
      };
      return tx;
    },
  };
  return client;
}

export * from './outils';
