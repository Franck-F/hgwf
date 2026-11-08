/**
 * Table d'itinéraires. Fonctions pures : le chemin vient du routeur
 * (`app/routeur.ts`), jamais de `location`.
 *
 * `#/afaire`, `#/dossiers?vue=…`, `#/dossier/<id>`, `#/clients`,
 * `#/client/<id>`, `#/outils/<section>`.
 */
import type { SectionOutils, VueDossiers } from '../domaine/contrats';

export type Route =
  | { nom: 'afaire' }
  | { nom: 'dossiers'; vue: VueDossiers }
  | { nom: 'dossier'; id: string }
  | { nom: 'clients' }
  | { nom: 'client'; id: string }
  | { nom: 'outils'; section: SectionOutils }
  | { nom: 'introuvable' };

export const VUES_DOSSIERS: readonly VueDossiers[] = ['enCours', 'devis', 'expeditions', 'termines'];
export const SECTIONS_OUTILS: readonly SectionOutils[] = [
  'conteneurs',
  'rotations',
  'fiches',
  'chiffres',
  'export',
  'connexion',
];

/** Décode un segment sans jamais lever d'exception (un « % » isolé dans un identifiant). */
function decoder(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Analyse un chemin (avec ou sans « # » initial). Un chemin vide mène à l'accueil. */
export function analyserChemin(chemin: string): Route {
  const sansDiese = chemin.replace(/^#/, '');
  const coupure = sansDiese.indexOf('?');
  const base = coupure === -1 ? sansDiese : sansDiese.slice(0, coupure);
  const requete = new URLSearchParams(coupure === -1 ? '' : sansDiese.slice(coupure + 1));
  const segments = base.split('/').filter(Boolean).map(decoder);
  const [premier, second, ...reste] = segments;

  if (premier === undefined || (premier === 'afaire' && second === undefined)) return { nom: 'afaire' };
  if (reste.length > 0) return { nom: 'introuvable' };

  switch (premier) {
    case 'dossiers': {
      if (second !== undefined) return { nom: 'introuvable' };
      const vue = requete.get('vue');
      // Une vue inconnue retombe sur « En cours » : jamais de page vide piégeuse.
      return { nom: 'dossiers', vue: VUES_DOSSIERS.find((v) => v === vue) ?? 'enCours' };
    }
    case 'dossier':
      return second ? { nom: 'dossier', id: second } : { nom: 'introuvable' };
    case 'clients':
      return second === undefined ? { nom: 'clients' } : { nom: 'introuvable' };
    case 'client':
      return second ? { nom: 'client', id: second } : { nom: 'introuvable' };
    case 'outils': {
      if (second === undefined) return { nom: 'outils', section: 'conteneurs' };
      const section = SECTIONS_OUTILS.find((s) => s === second);
      return section ? { nom: 'outils', section } : { nom: 'introuvable' };
    }
    default:
      return { nom: 'introuvable' };
  }
}

/** Chemin canonique d'une route (inverse de `analyserChemin`). */
export function cheminDe(route: Route): string {
  switch (route.nom) {
    case 'afaire':
      return '/afaire';
    case 'dossiers':
      return route.vue === 'enCours' ? '/dossiers' : `/dossiers?vue=${route.vue}`;
    case 'dossier':
      return `/dossier/${encodeURIComponent(route.id)}`;
    case 'clients':
      return '/clients';
    case 'client':
      return `/client/${encodeURIComponent(route.id)}`;
    case 'outils':
      return `/outils/${route.section}`;
    case 'introuvable':
      return '/afaire';
  }
}

/** Entrée de la navigation latérale qui doit paraître active pour cette route. */
export type EntreeNavigation = 'afaire' | 'dossiers' | 'clients' | 'outils';

export function entreeActive(route: Route): EntreeNavigation | null {
  switch (route.nom) {
    case 'afaire':
      return 'afaire';
    case 'dossiers':
    case 'dossier':
      return 'dossiers';
    case 'clients':
    case 'client':
      return 'clients';
    case 'outils':
      return 'outils';
    case 'introuvable':
      return null;
  }
}
