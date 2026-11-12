/**
 * Enregistrement automatique d'une fiche service.
 *
 * Chaque modification marque son champ « à enregistrer » ; l'écriture part
 * après une courte pause de frappe (800 ms) ou au départ du champ (`vider`), et
 * seuls les champs modifiés sont envoyés, sous `ifRevisionId`. Une seule
 * écriture à la fois : ce qui est saisi pendant une écriture part juste après.
 *
 * Modification venue d'ailleurs : si la fiche change côté Sanity (autre
 * personne, autre onglet), les champs que l'on n'est pas en train de modifier
 * sont mis à jour, les autres gardent la saisie en cours, et on prévient. Sur
 * un conflit (409), on relit la fiche, on prévient, et on rejoue UNE fois.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { lireFiche, modifierChampsFiche, type ModifsFiche } from '../../actions/fiches';
import type { Fiche } from '../../domaine/types';
import { useContexteEcriture } from './contexte';
import { depuisFiche, versValeur, type ChampEdition, type EtatFiche } from './fichesEdition';

export const DELAI_ENREGISTREMENT_MS = 800;

export type StatutFiche =
  | { type: 'repos' }
  | { type: 'attente' }
  | { type: 'cours' }
  | { type: 'ok'; heure: string }
  | { type: 'erreur'; message: string };

export const MESSAGE_AILLEURS = 'Cette fiche vient d’être modifiée par quelqu’un d’autre : elle a été rechargée.';

const deuxChiffres = (n: number): string => String(n).padStart(2, '0');
export const heureFr = (d: Date): string => `${deuxChiffres(d.getHours())}h${deuxChiffres(d.getMinutes())}`;

export function useEnregistrementFiche(fiche: Fiche, recharger: () => Promise<void> | void, delaiMs = DELAI_ENREGISTREMENT_MS) {
  const ctx = useContexteEcriture();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const rechargerRef = useRef(recharger);
  rechargerRef.current = recharger;

  const [etat, setEtat] = useState<EtatFiche>(() => depuisFiche(fiche));
  const [statut, setStatut] = useState<StatutFiche>({ type: 'repos' });
  const [erreurs, setErreurs] = useState<Partial<Record<ChampEdition, string>>>({});
  const [avertissement, setAvertissement] = useState('');

  const etatRef = useRef(etat);
  const revRef = useRef(fiche._rev);
  const revisionsEcrites = useRef(new Set<string>([fiche._rev]));
  const sales = useRef(new Set<ChampEdition>());
  const versions = useRef(new Map<ChampEdition, number>());
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVol = useRef(false);
  const relancer = useRef(false);
  const monte = useRef(true);
  const id = fiche._id;

  /** Reprend une version de la fiche venue d'ailleurs, sans toucher aux champs en cours de saisie. */
  const adopter = useCallback((f: Fiche): void => {
    revRef.current = f._rev;
    const frais = depuisFiche(f);
    const suivant = { ...etatRef.current } as Record<string, unknown>;
    for (const c of Object.keys(frais) as ChampEdition[]) if (!sales.current.has(c)) suivant[c] = frais[c];
    etatRef.current = suivant as unknown as EtatFiche;
    setEtat(etatRef.current);
  }, []);

  useEffect(() => {
    if (fiche._rev === revRef.current || revisionsEcrites.current.has(fiche._rev)) return;
    adopter(fiche);
    setAvertissement(MESSAGE_AILLEURS);
  }, [fiche, adopter]);

  const enregistrer = useCallback(async (): Promise<void> => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    if (enVol.current) {
      relancer.current = true;
      return;
    }
    if (sales.current.size === 0) return;
    enVol.current = true;
    try {
      do {
        relancer.current = false;
        const modifs: Record<string, unknown> = {};
        const refus: Partial<Record<ChampEdition, string>> = {};
        const instantane = new Map<ChampEdition, number>();
        for (const champ of sales.current) {
          const v = versValeur(champ, etatRef.current);
          if ('erreur' in v) refus[champ] = v.erreur;
          else {
            modifs[champ] = v.valeur;
            instantane.set(champ, versions.current.get(champ) ?? 0);
          }
        }
        // Un champ illisible n'est pas écrit : il reste signalé jusqu'à sa prochaine saisie.
        for (const champ of Object.keys(refus) as ChampEdition[]) sales.current.delete(champ);
        if (monte.current) {
          setErreurs((prev) => {
            const suite = { ...prev, ...refus };
            for (const champ of instantane.keys()) delete suite[champ];
            return suite;
          });
        }
        if (instantane.size === 0) {
          const premier = Object.values(refus)[0];
          if (monte.current) setStatut(premier ? { type: 'erreur', message: premier } : { type: 'repos' });
          break;
        }
        if (monte.current) setStatut({ type: 'cours' });

        let r = await modifierChampsFiche(ctxRef.current, id, revRef.current, modifs as ModifsFiche);
        if (!r.ok && r.motif === 'conflit') {
          const fraiche = await lireFiche(ctxRef.current, id);
          if (fraiche) {
            adopter(fraiche);
            if (monte.current) setAvertissement(MESSAGE_AILLEURS);
            r = await modifierChampsFiche(ctxRef.current, id, revRef.current, modifs as ModifsFiche);
          }
          void rechargerRef.current();
        }
        if (!r.ok) {
          if (monte.current) setStatut({ type: 'erreur', message: r.message });
          break;
        }
        revRef.current = r.rev;
        revisionsEcrites.current.add(r.rev);
        for (const [champ, version] of instantane) {
          if ((versions.current.get(champ) ?? 0) === version) sales.current.delete(champ);
        }
        if (monte.current) {
          setStatut(
            sales.current.size > 0 ? { type: 'attente' } : { type: 'ok', heure: heureFr(ctxRef.current.maintenant()) },
          );
        }
        void rechargerRef.current();
        // Une demande d'écriture arrivée pendant celle-ci (départ de champ, pause écoulée) repart tout de suite.
      } while (relancer.current);
    } finally {
      enVol.current = false;
    }
  }, [id, adopter]);

  const modifier = useCallback(
    <C extends ChampEdition>(champ: C, valeur: EtatFiche[C]): void => {
      etatRef.current = { ...etatRef.current, [champ]: valeur };
      setEtat(etatRef.current);
      sales.current.add(champ);
      versions.current.set(champ, (versions.current.get(champ) ?? 0) + 1);
      setErreurs((prev) => {
        if (!(champ in prev)) return prev;
        const suite = { ...prev };
        delete suite[champ];
        return suite;
      });
      setStatut({ type: 'attente' });
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => void enregistrer(), delaiMs);
    },
    [enregistrer, delaiMs],
  );

  /** Au départ d'un champ : on n'attend pas la fin de la pause. */
  const vider = useCallback((): void => {
    if (sales.current.size > 0) void enregistrer();
  }, [enregistrer]);

  // Fermeture de la fiche : ce qui reste à écrire part quand même.
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
      if (minuteur.current) clearTimeout(minuteur.current);
      if (sales.current.size > 0) void enregistrer();
    };
  }, [enregistrer]);

  /** Révision à utiliser pour une écriture faite hors de l'éditeur (retrait, suppression). */
  const revision = useCallback((): string => revRef.current, []);
  /** Une écriture faite hors de l'éditeur a produit cette révision : ce n'est pas une modification venue d'ailleurs. */
  const reconnaitre = useCallback((rev: string): void => {
    revRef.current = rev;
    revisionsEcrites.current.add(rev);
  }, []);
  /** La fiche n'existe plus : plus rien à écrire. */
  const abandonner = useCallback((): void => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    sales.current.clear();
  }, []);

  return {
    revision,
    reconnaitre,
    abandonner,
    etat,
    statut,
    erreurs,
    avertissement,
    modifier,
    vider,
    reessayer: vider,
    fermerAvertissement: () => setAvertissement(''),
  };
}
