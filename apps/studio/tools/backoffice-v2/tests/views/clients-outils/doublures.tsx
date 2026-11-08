/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Doublures communes aux tests d'interface du lot 13. Les hooks de données et
 * les verbes d'écriture sont remplacés : on vérifie ce que la vue demande
 * d'écrire (et à quel moment), pas la couche actions (lot 7).
 *
 * Chaque fichier de test déclare ses `vi.mock` (obligatoire : ils sont hissés)
 * en renvoyant les fabriques ci-dessous, qui lisent toutes le même objet `h`.
 */
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import type { ClientFiche, Conteneur, Rotation } from '../../../domaine/types';
import { GlobalStyle } from '../../../theme/GlobalStyle';

const ok = { ok: true as const };
const echec = (message: string, motif = 'conflit') => ({ ok: false as const, motif, message });
export { echec };

export const h = {
  naviguer: vi.fn(),
  succes: vi.fn(),
  erreur: vi.fn(),
  garde: { definir: vi.fn() },
  demanderCle: vi.fn(async () => true),
  oublier: vi.fn(),
  cle: { presente: false },
  recharger: vi.fn(async () => undefined),
  outils: { conteneurs: [] as unknown[], rotations: [] as unknown[], fiches: [] as unknown[], chargement: false, erreur: null as string | null },
  clients: { clients: [] as unknown[], chargement: false, erreur: null as string | null },
  dossiers: { dossiers: [] as unknown[], chargement: false, erreur: null as string | null },
  enregistrerConteneur: vi.fn(async (..._a: unknown[]) => ({ ...ok, id: 'k1' })),
  supprimerConteneur: vi.fn(async (..._a: unknown[]) => ok),
  enregistrerRotation: vi.fn(async (..._a: unknown[]) => ({ ...ok, id: 'r1' })),
  supprimerRotation: vi.fn(async (..._a: unknown[]) => ok),
  creerClient: vi.fn(async (..._a: unknown[]) => ({ ...ok, clientId: 'nouveau-client' })),
  modifierClient: vi.fn(async (..._a: unknown[]) => ({ ...ok, rev: 'r2' })),
  supprimerClient: vi.fn(async (..._a: unknown[]) => ok),
  exporterDossiers: vi.fn(async (..._a: unknown[]) => undefined),
};

export const contexte = () => ({
  useRoute: () => ({ chemin: '/', naviguer: h.naviguer, garde: h.garde }),
  useToasts: () => ({ succes: h.succes, erreur: h.erreur }),
  useCleApi: () => ({ presente: h.cle.presente, demanderCle: h.demanderCle, oublier: h.oublier }),
  useRacine: () => document.body,
});
export const donneesSanity = () => ({
  useClientSanity: () => ({}),
  useUtilisateur: () => ({ id: 'u1', nom: 'Marie' }),
});
export const magasin = () => ({ useMagasin: () => ({ memoriserRevision: vi.fn() }) });
export const envoi = () => ({ appelerApi: vi.fn() });
export const hookOutils = () => ({ useOutils: () => ({ ...h.outils, recharger: h.recharger }) });
export const hookClients = () => ({ useClients: () => ({ ...h.clients, recharger: h.recharger }) });
export const hookDossiers = () => ({ useDossiers: () => ({ ...h.dossiers, recharger: h.recharger }) });
export const actionsReferentiels = () => ({
  enregistrerConteneur: h.enregistrerConteneur,
  supprimerConteneur: h.supprimerConteneur,
  enregistrerRotation: h.enregistrerRotation,
  supprimerRotation: h.supprimerRotation,
});
export const actionsClients = () => ({
  creerClient: h.creerClient,
  modifierClient: h.modifierClient,
  supprimerClient: h.supprimerClient,
});
export const exportDossiers = () => ({ exporterDossiers: h.exporterDossiers });

export const conteneur = (extra: Partial<Conteneur> = {}): Conteneur => ({
  _id: 'k1',
  _rev: 'rk1',
  _type: 'conteneurOccasion',
  reference: 'CTN-20-130',
  taille: '20 pieds',
  etat: 'B',
  lieu: 'Rosny-sous-Bois',
  prix: '1 450 €',
  statut: 0,
  ...extra,
});

export const rotation = (extra: Partial<Rotation> = {}): Rotation => ({
  _id: 'rot1',
  _rev: 'rr1',
  _type: 'rotation',
  nom: 'Le Havre → Dakar',
  cloture: '14/11',
  depart: '18/11',
  remplissage: 40,
  ...extra,
});

export const client = (extra: Partial<ClientFiche> = {}): ClientFiche => ({
  _id: 'c1',
  _rev: 'rc1',
  _type: 'clientFiche',
  nom: 'Dupont',
  contact: 'dupont@example.fr · 06 12 34 56 78',
  destination: 'Dakar',
  ...extra,
});

export function monter(ui: ReactElement) {
  return render(
    <div className="bo-racine">
      <GlobalStyle />
      {ui}
    </div>,
  );
}

/** Boutons pleins visibles dans la page (hors fenêtre), comme le critère 10. */
export const boutonsPleins = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.bo-bouton--primaire')).filter((b) => !b.closest('[role="dialog"]'));

/** À appeler une fois par fichier de test : remet les doublures à zéro. */
export function installerCycle(): void {
  beforeEach(() => {
    vi.clearAllMocks();
    h.cle.presente = false;
    h.outils.conteneurs = [];
    h.outils.rotations = [];
    h.outils.fiches = [];
    h.outils.chargement = false;
    h.outils.erreur = null;
    h.clients.clients = [];
    h.clients.chargement = false;
    h.clients.erreur = null;
    h.dossiers.dossiers = [];
    h.dossiers.chargement = false;
    h.dossiers.erreur = null;
  });
  afterEach(() => cleanup());
}
