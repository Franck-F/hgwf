/**
 * Magasin unique des données (spécification 8.2) : chargé une fois, partagé
 * par toutes les vues (liste, recherche, compteurs clients, chiffres du mois).
 *
 * Écart assumé avec « contexte React » : le magasin est un objet unique du
 * module, branché sur React par `useSyncExternalStore`. Ainsi n'importe quelle
 * vue peut l'utiliser sans que la coque ait à monter un fournisseur, et tout
 * le monde lit la même copie. `MagasinProvider` reste disponible (il ne fait
 * que garder le magasin vivant tant que l'application est montée).
 *
 * Actualisation : abonnement `client.listen` quand il existe, relecture au
 * retour de focus de l'onglet et toutes les 60 s sinon (le faux client du
 * harnais n'a pas de `listen`). Tout est dans un `try/catch` : l'absence ou la
 * panne de l'écoute ne doit jamais casser l'écran.
 */
import { createElement, Fragment, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { ClientLike, Magasin, UseMagasin } from '../domaine/contrats';
import type { DonneesMagasin } from '../domaine/types';
import { ecritureEnCours } from './activite';
import { useClientSanity } from './client';
import { REQUETE_ECOUTE, REQUETE_MAGASIN } from './requetes';

export const DONNEES_VIDES: DonneesMagasin = {
  demandes: [],
  expeditions: [],
  clients: [],
  conteneurs: [],
  rotations: [],
  fiches: [],
};

const INTERVALLE_MS = 60_000;
const DELAI_ECOUTE_MS = 400;
/** On ne garde que les dernières révisions écrites ici : une relecture ne remonte jamais plus loin. */
const REVISIONS_MAX = 300;

const liste = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Une réponse partielle (ancien serveur, faux client) ne doit jamais casser l'écran. */
export function normaliserDonnees(brut: Partial<DonneesMagasin> | null | undefined): DonneesMagasin {
  return {
    demandes: liste(brut?.demandes),
    expeditions: liste(brut?.expeditions),
    clients: liste(brut?.clients),
    conteneurs: liste(brut?.conteneurs),
    rotations: liste(brut?.rotations),
    fiches: liste(brut?.fiches),
  };
}

export interface StoreMagasin {
  definirClient(client: ClientLike): void;
  abonner(ecouteur: () => void): () => void;
  instantane(): Magasin;
  recharger(): Promise<void>;
}

type Ecoute = { unsubscribe: () => void };

/** Fabrique d'un magasin. Exportée pour les tests ; l'application utilise `magasinGlobal`. */
export function creerMagasin(): StoreMagasin {
  let client: ClientLike | null = null;
  const abonnes = new Set<() => void>();
  const revisionsLocales = new Set<string>();
  let donnees: DonneesMagasin = DONNEES_VIDES;
  let chargement = true;
  let erreur: string | null = null;
  let enVol: Promise<void> | null = null;
  let relancer = false;
  let arretEnCours: (() => void) | null = null;

  const memoriserRevision = (rev: string): void => {
    if (!rev) return;
    revisionsLocales.add(rev);
    if (revisionsLocales.size > REVISIONS_MAX) {
      const premiere = revisionsLocales.values().next().value;
      if (premiere !== undefined) revisionsLocales.delete(premiere);
    }
  };

  async function lire(): Promise<void> {
    if (!client) return;
    try {
      const brut = await client.fetch<Partial<DonneesMagasin>>(REQUETE_MAGASIN);
      donnees = normaliserDonnees(brut);
      erreur = null;
    } catch (e) {
      // On garde les données déjà lues : une panne passagère n'efface pas l'écran.
      erreur = e instanceof Error && e.message ? e.message : 'Lecture impossible.';
    }
    chargement = false;
  }

  let instantaneCourant: Magasin;
  const fabriquerInstantane = (): Magasin => ({
    donnees,
    chargement,
    erreur,
    recharger,
    revisionsLocales,
    memoriserRevision,
  });

  const diffuser = (): void => {
    instantaneCourant = fabriquerInstantane();
    abonnes.forEach((fn) => fn());
  };

  /** Relecture complète. Si une lecture est déjà en vol, on en refait une juste après (elle a pu partir avant l'écriture). */
  async function recharger(): Promise<void> {
    if (enVol) {
      relancer = true;
      return enVol;
    }
    enVol = (async () => {
      do {
        relancer = false;
        await lire();
        diffuser();
      } while (relancer);
    })().finally(() => {
      enVol = null;
    });
    return enVol;
  }

  /** Relecture déclenchée toute seule (focus, minuteur, écoute) : jamais au milieu d'un de nos gestes. */
  const rechargerAuto = (): void => {
    if (ecritureEnCours()) return;
    void recharger();
  };

  function demarrer(): void {
    if (typeof window === 'undefined') return;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    let ecoute: Ecoute | null = null;

    const auFocus = (): void => {
      if (typeof document === 'undefined' || !document.hidden) rechargerAuto();
    };
    window.addEventListener('focus', auFocus);
    document.addEventListener('visibilitychange', auFocus);
    const intervalle = window.setInterval(() => {
      if (!document.hidden) rechargerAuto();
    }, INTERVALLE_MS);

    try {
      const ecouter = client?.listen as
        | ((q: string, p?: Record<string, unknown>, o?: Record<string, unknown>) => { subscribe: (o: unknown) => Ecoute })
        | undefined;
      if (ecouter && client) {
        // Pas le contenu des documents (inutile ici) : seulement le signal « quelque chose a changé ».
        const flux = ecouter.call(client, REQUETE_ECOUTE, {}, { includeResult: false, visibility: 'query' });
        ecoute = flux.subscribe({
          next: (evenement: unknown) => {
            if ((evenement as { type?: string } | null)?.type !== 'mutation') return;
            if (minuteur) clearTimeout(minuteur);
            minuteur = setTimeout(rechargerAuto, DELAI_ECOUTE_MS);
          },
          // L'écoute tombe : le focus et le minuteur prennent le relais.
          error: () => undefined,
        } as unknown);
      }
    } catch {
      ecoute = null;
    }

    arretEnCours = () => {
      window.removeEventListener('focus', auFocus);
      document.removeEventListener('visibilitychange', auFocus);
      window.clearInterval(intervalle);
      if (minuteur) clearTimeout(minuteur);
      try {
        ecoute?.unsubscribe();
      } catch {
        /* rien à faire */
      }
    };
  }

  instantaneCourant = fabriquerInstantane();

  return {
    definirClient(c) {
      client = c;
    },
    abonner(ecouteur) {
      abonnes.add(ecouteur);
      if (abonnes.size === 1) {
        demarrer();
        // Première lecture (ou lecture de rafraîchissement si le magasin a dormi).
        void recharger();
      }
      return () => {
        abonnes.delete(ecouteur);
        if (abonnes.size === 0) {
          arretEnCours?.();
          arretEnCours = null;
        }
      };
    },
    instantane: () => instantaneCourant,
    recharger,
  };
}

/** Le magasin de l'application : un seul pour tout l'outil. */
export const magasinGlobal: StoreMagasin = creerMagasin();

/** Données courantes sans passer par React (relectures juste après une écriture). */
export const lireDonneesMagasin = (): DonneesMagasin => magasinGlobal.instantane().donnees;

export const useMagasin: UseMagasin = () => {
  const client = useClientSanity();
  // Le client est stable pour une configuration donnée ; on retient le plus récent.
  magasinGlobal.definirClient(client);
  return useSyncExternalStore(magasinGlobal.abonner, magasinGlobal.instantane, magasinGlobal.instantane);
};

/** Optionnel : garde le magasin vivant (écoute, focus, minuteur) tant que l'application est montée. */
export function MagasinProvider({ children }: { children?: ReactNode }): ReactNode {
  useMagasin();
  useEffect(() => magasinGlobal.abonner(() => undefined), []);
  return createElement(Fragment, null, children);
}
