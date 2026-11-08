/**
 * État et gestes de la page Dossier (lot 10), séparés du rendu pour tenir la
 * limite de taille des fichiers et pour que `DossierCorps` ne fasse qu'afficher.
 *
 * - `lancer` : exécute un geste, annonce le résultat (toast), vide le brouillon
 *   des champs enregistrés, relit le dossier, signale un conflit. Un verrou
 *   interdit deux gestes en même temps (double clic).
 * - `enregistrer` : écrit le brouillon (barre d'enregistrement).
 * - Sections : ouvertes selon la phase, repliables, `allerA` les ouvre et y défile.
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

const PHASES_CLOSES: Phase[] = ['livre', 'annule', 'sansSuite'];
const PHASES_DEVIS_OUVERT: Phase[] = [
  'aChiffrer',
  'reponseRecue',
  'devisPartiStatutACorriger',
  'devisEnvoye',
  'devisHorsOutil',
];
const PHASES_EXPEDITION_OUVERTE: Phase[] = ['accepte', 'aPreparer', 'pret', 'enRoute', 'incident'];

/** Section ouverte par défaut : celle de la phase courante (4.3). */
export function ouvertureParDefaut(nom: NomSection, phase: Phase): boolean {
  switch (nom) {
    case 'demande':
      return true;
    case 'devis':
      return PHASES_DEVIS_OUVERT.includes(phase);
    case 'expedition':
      return PHASES_EXPEDITION_OUVERTE.includes(phase);
    default:
      return false;
  }
}

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
  const [choisies, setChoisies] = useState<Partial<Record<NomSection, boolean>>>({});
  const occupe = useRef(false);

  const phase = dossier ? phaseDe(dossier) : null;
  const action = useMemo(() => (dossier ? actionPrincipale(dossier, brouillon) : null), [dossier, brouillon]);

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

  const estOuverte = (nom: NomSection): boolean => choisies[nom] ?? (phase ? ouvertureParDefaut(nom, phase) : false);
  const basculer = (nom: NomSection): void => setChoisies((c) => ({ ...c, [nom]: !estOuverte(nom) }));
  const allerA = useCallback(
    (nom: NomSection): void => {
      setChoisies((c) => ({ ...c, [nom]: true }));
      requestAnimationFrame(() => {
        racine.current?.querySelector(`[data-section="${nom}"]`)?.scrollIntoView?.({ block: 'start' });
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
    estOuverte,
    basculer,
  };
}
