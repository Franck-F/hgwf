/** Fausse API, contexte d'écriture et fabriques de documents pour les tests des actions. */
import type { ClientLike, ContexteEcriture, ReponseApi, Resultat } from '../../domaine/contrats';
import type { Demande, Dossier, Expedition } from '../../domaine/types';
import type { FauxClient } from './fauxClient';

// ── Fausse API ──────────────────────────────────────────────────────────────

export interface AppelApi {
  route: string;
  corps: Record<string, unknown>;
}

export type GestionnaireApi = (route: string, corps: Record<string, unknown>) => Resultat<{ reponse: ReponseApi }>;

export const repOk = (corps: Record<string, unknown> = {}): Resultat<{ reponse: ReponseApi }> => ({
  ok: true,
  reponse: { ok: true, statut: 200, corps: { ok: true, ...corps } },
});

export interface FausseApi {
  appels: AppelApi[];
  appeler: ContexteEcriture['appelerApi'];
}

export function creerFausseApi(gestionnaire: GestionnaireApi = () => repOk()): FausseApi {
  const appels: AppelApi[] = [];
  return {
    appels,
    appeler: async (route, corps) => {
      appels.push({ route, corps });
      return gestionnaire(route, corps);
    },
  };
}

// ── Contexte et fabriques de documents ──────────────────────────────────────

export const MAINTENANT_TEST = new Date(2026, 10, 6, 9, 0);

export function creerContexte(client: ClientLike, api: FausseApi = creerFausseApi()) {
  const revisions: string[] = [];
  const ctx: ContexteEcriture = {
    client,
    utilisateur: { id: 'u1', nom: 'Marie' },
    maintenant: () => MAINTENANT_TEST,
    memoriserRevision: (r) => revisions.push(r),
    appelerApi: api.appeler,
  };
  return { ctx, revisions, api };
}

export const demandeDoc = (extra: Partial<Demande> = {}): Demande =>
  ({
    _id: 'demande-1',
    _type: 'demandeDevis',
    _rev: 'r-demande-1',
    reference: 'DEV-2610-014',
    clientNom: 'Martin Dupont',
    email: 'martin@example.fr',
    statut: 1,
    recueLe: '05/11/2026 à 10h00',
    ...extra,
  }) as Demande;

export const expeditionDoc = (extra: Partial<Expedition> = {}): Expedition =>
  ({
    _id: 'expedition-dev-2610-014',
    _type: 'expedition',
    _rev: 'r-exp-1',
    reference: 'DEV-2610-014',
    clientNom: 'Martin Dupont',
    statutPriseEnCharge: 0,
    etape: 0,
    ...extra,
  }) as Expedition;

/** Dossier tel que l'écran le tient : copie des documents du faux client. */
export function dossierDe(client: FauxClient, demandeId: string | null, expeditionId?: string): Dossier {
  const demande = demandeId ? (client.docs.get(demandeId) as unknown as Demande) : undefined;
  const expedition = expeditionId ? (client.docs.get(expeditionId) as unknown as Expedition) : undefined;
  return {
    id: demande?._id ?? expedition?._id ?? '',
    ...(demande ? { demande: { ...demande } } : {}),
    ...(expedition ? { expedition: { ...expedition } } : {}),
  };
}

/** Les 7 champs qui lèvent les manques de la prise en charge. */
export const PEC_COMPLETE = {
  expediteurAdresse: '12 rue du Port, Le Havre',
  destinataireNom: 'Awa Diop',
  destinataireAdresse: 'Dakar, Plateau',
  colisNature: 'Effets personnels',
  colisNombre: 12,
  colisPoids: 480,
  mode: 'Groupage maritime',
};
