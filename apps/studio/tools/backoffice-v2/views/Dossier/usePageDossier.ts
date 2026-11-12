/**
 * État et gestes de la page Dossier (lot 10), séparés du rendu pour tenir la
 * limite de taille des fichiers et pour que `DossierCorps` ne fasse qu'afficher.
 *
 * - `lancer` : exécute un geste, annonce le résultat (toast), vide le brouillon
 *   des champs enregistrés, relit le dossier, signale un conflit. Un verrou
 *   interdit deux gestes en même temps (double clic).
 * - `enregistrer` : écrit le brouillon (barre d'enregistrement).
 * - Sous-dossiers : un seul ouvert, celui de la phase à l'arrivée ; `allerA`
 *   ouvre celui d'une section et y défile.
 *
 * Fichier ajouté au lot 10.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useGestes } from '../../actions/gestes';
import { useToasts } from '../../app/Contexte';
import { useBrouillon } from '../../data/useBrouillon';
import { useDossier } from '../../data/useDossier';
import { actionPrincipale } from '../../domaine/actionPrincipale';
import type { FenetreDossier, Resultat, ResultatGeste } from '../../domaine/contrats';
import { champsModifiesDossier } from '../../domaine/fusion';
import { phaseDe } from '../../domaine/phases';
import type { Phase } from '../../domaine/types';
import { enregistrerBrouillon } from './enregistrement';
import { useContexteEcritureDossier } from './contexteEcriture';
import { texteEchec } from './ContexteDossier';
import type { ContexteVue, NomSection } from './ContexteDossier';
import { sousDossierDeSection, sousDossierParDefaut, sousDossiersDe } from './rangement';
import type { IdSousDossier } from './rangement';
import { idOnglet } from './SousDossiers';

const PHASES_CLOSES: Phase[] = ['livre', 'annule', 'sansSuite'];

const REFUS_EN_COURS: Resultat<ResultatGeste> = {
  ok: false,
  motif: 'refus',
  message: 'Une action est déjà en cours. Patientez un instant.',
};

export function usePageDossier(id: string, racine: RefObject<HTMLElement | null>) {
  const toasts = useToasts();
  const { dossier, chargement, erreur, conflit, recharger } = useDossier(id);
  const { brouillon, modifier, nbModifications, annuler, vider } = useBrouillon(dossier);
  const gestes = useGestes(dossier, brouillon);
  const ctxEcriture = useContexteEcritureDossier();

  const [fenetre, setFenetre] = useState<FenetreDossier | null>(null);
  const [correction, setCorrection] = useState(false);
  const [conflitLocal, setConflitLocal] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [ongletChoisi, setOngletChoisi] = useState<IdSousDossier | null>(null);
  const occupe = useRef(false);

  const phase = dossier ? phaseDe(dossier) : null;
  const action = useMemo(() => (dossier ? actionPrincipale(dossier, brouillon) : null), [dossier, brouillon]);
  const sousDossiers = useMemo(
    () => (dossier && phase ? sousDossiersDe(dossier, brouillon, phase) : []),
    [dossier, brouillon, phase],
  );
  const defaut = phase ? sousDossierParDefaut(phase, sousDossiers) : 'infos';
  // Le sous-dossier d'arrivée est retenu au premier chargement : lire une réponse
  // (qui éteint le signal) ne doit pas faire changer de sous-dossier sous les yeux.
  useEffect(() => {
    if (dossier && ongletChoisi === null) setOngletChoisi(defaut);
  }, [dossier, ongletChoisi, defaut]);
  // Un sous-dossier qui n'existe plus (dossier relu) retombe sur celui de la phase.
  const onglet = ongletChoisi && sousDossiers.some((s) => s.id === ongletChoisi) ? ongletChoisi : defaut;

  // Après une relecture, les champs du brouillon devenus identiques au dossier
  // enregistré (écrits par une fenêtre des lots 11 ou 12, qui ne vident pas le
  // brouillon eux-mêmes) en sortent. Les saisies encore différentes restent.
  useEffect(() => {
    if (!dossier) return;
    const modifies = champsModifiesDossier(dossier, brouillon);
    const aVider = Object.keys(brouillon).filter((c) => !modifies.includes(c));
    if (aVider.length > 0) vider(aVider);
    // Volontairement sur `dossier` seul : on réagit à une relecture, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier]);

  const lancer = useCallback(
    async (geste: () => Promise<Resultat<ResultatGeste>>): Promise<Resultat<ResultatGeste>> => {
      if (occupe.current) return REFUS_EN_COURS;
      occupe.current = true;
      try {
        const r = await geste();
        if (r.ok) {
          if (r.champsEnregistres?.length) vider(r.champsEnregistres);
          if (r.notificationEchouee) {
            toasts.erreur(`${r.message ?? 'Enregistré.'} Utilisez « Réessayer l’e-mail ».`);
          } else if (r.statutACorriger) {
            toasts.erreur(
              'Envoyé, mais le dossier n’a pas été mis à jour. Utilisez « Terminer l’enregistrement de l’envoi ».',
            );
          } else if (r.dejaPrevenu) {
            toasts.succes('Client déjà prévenu de cette étape.');
          } else {
            toasts.succes(r.message ?? 'Enregistré.');
          }
          await recharger();
        } else {
          if (r.motif === 'conflit') setConflitLocal(true);
          // Une écriture a pu partir avant l'échec (brouillon enregistré puis API en panne) : le brouillon
          // enregistré s'en va et le dossier est relu, sinon le clic suivant repartirait en faux conflit.
          if (r.champsEnregistres?.length) vider(r.champsEnregistres);
          toasts.erreur(texteEchec(r));
          if (r.ecritureFaite || r.motif === 'reseau') await recharger();
        }
        return r;
      } finally {
        occupe.current = false;
      }
    },
    [recharger, toasts, vider],
  );

  async function enregistrer(): Promise<void> {
    if (!dossier || occupe.current) return;
    occupe.current = true;
    setEnregistrement(true);
    try {
      const r = await enregistrerBrouillon(ctxEcriture, dossier, brouillon);
      if (r.ok) {
        vider(r.champsEnregistres);
        toasts.succes('Modifications enregistrées.');
        await recharger();
      } else {
        if (r.motif === 'conflit') setConflitLocal(true);
        // Brouillon conservé intact (5.5, n° 5) ; l'erreur reste jusqu'à fermeture.
        toasts.erreur(texteEchec(r));
        if (r.motif === 'reseau') await recharger();
      }
    } finally {
      occupe.current = false;
      setEnregistrement(false);
    }
  }

  async function rechargerApresConflit(): Promise<void> {
    setConflitLocal(false);
    await recharger();
  }

  const allerA = useCallback(
    (nom: NomSection): void => {
      const id = sousDossierDeSection(nom);
      setOngletChoisi(id);
      requestAnimationFrame(() => {
        racine.current?.querySelector(`#${idOnglet(id)}`)?.scrollIntoView?.({ block: 'start' });
      });
    },
    [racine],
  );

  const contexte: ContexteVue | null = dossier
    ? {
        ouvrirFenetre: setFenetre,
        executerAction: (idAction) => lancer(() => gestes.executerAction(idAction)),
        secours: gestes.secours,
        brouillon,
        lancer,
        allerA,
        ouvrirCorrection: () => setCorrection(true),
      }
    : null;

  return {
    dossier,
    chargement,
    erreur,
    conflit: conflit || conflitLocal,
    recharger,
    rechargerApresConflit,
    brouillon,
    modifier,
    nbModifications,
    annuler,
    enregistrer,
    enregistrement,
    action,
    phase,
    lectureSeule: phase !== null && PHASES_CLOSES.includes(phase),
    contexte,
    fenetre,
    correction,
    fermerFenetre: () => {
      setFenetre(null);
      setCorrection(false);
    },
    sousDossiers,
    onglet,
    choisirOnglet: setOngletChoisi,
  };
}
