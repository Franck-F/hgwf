/** @jsxRuntime automatic @jsxImportSource react */
/**
 * « Corriger l'étape du suivi » (menu, 4.5). Remplace le bouton « Étape
 * précédente » sans garde de la V1 : on choisit l'étape juste, la fenêtre dit
 * que le client verra le changement, et rien n'est envoyé au client.
 * Atteindre « Livré » passe par « Marquer livré », jamais par ici (une seule
 * fonction écrit l'étape 4).
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { ETAPES_EXPEDITION, ETAPE } from '../../domaine/statuts';
import type { Dossier } from '../../domaine/types';
import { Bouton, Liste, Manques, Modale } from '../../ui';
import { useContexteDossier } from './ContexteDossier';

export interface FenetreCorrectionProps {
  dossier: Dossier;
  onFermer: () => void;
  onTermine: () => void;
}

export function FenetreCorrection({ dossier, onFermer, onTermine }: FenetreCorrectionProps): ReactElement {
  const ctx = useContexteDossier();
  const actuelle = dossier.expedition?.etape ?? ETAPE.priseEnCharge;
  const [choix, setChoix] = useState<string>('');
  const [enCours, setEnCours] = useState(false);
  const idManques = useId();

  // Les étapes avant « Livré » seulement : voir l'en-tête du fichier.
  const options = ETAPES_EXPEDITION.map((libelle, i) => ({ valeur: String(i), libelle }))
    .filter((o) => Number(o.valeur) < ETAPE.livre);
  const manques = choix === '' ? ['l’étape à rétablir'] : Number(choix) === actuelle ? ['une étape différente de l’actuelle'] : [];

  async function valider(): Promise<void> {
    if (manques.length > 0 || enCours) return;
    setEnCours(true);
    try {
      const r = await ctx.lancer(() => ctx.secours.corrigerEtape(Number(choix)));
      if (r.ok) onTermine();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modale
      titre="Corriger l’étape du suivi"
      onFermer={onFermer}
      empecherFermeture={choix !== ''}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            variante="primaire"
            desactive={manques.length > 0}
            chargement={enCours}
            aria-describedby={manques.length > 0 ? idManques : undefined}
            onClick={() => void valider()}
          >
            Corriger l’étape
          </Bouton>
        </>
      }
    >
      <p>
        Étape actuelle : <span className="bo-fort">{ETAPES_EXPEDITION[actuelle] ?? 'inconnue'}</span>. Le client voit le
        changement sur sa page de suivi. Aucun e-mail n’est envoyé.
      </p>
      <Liste
        etiquette="Étape à rétablir"
        requis
        valeur={choix}
        vide="Choisir…"
        options={options}
        onChange={setChoix}
      />
      <Manques manques={manques} id={idManques} />
    </Modale>
  );
}
