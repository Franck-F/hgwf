/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Reprise d'un dossier en incident ou annulé (3.3). Trois choix : À préparer,
 * Prêt, Expédié. Le choix PROPOSÉ est `statutAvantIncident` s'il est présent ;
 * sinon AUCUN choix n'est présélectionné (jamais de défaut deviné) et le bouton
 * reste inactif, avec la raison écrite. Les garde-fous du statut visé
 * s'appliquent : « Prêt » exige les 7 manques levés, « Expédié » exige un
 * règlement ou une dérogation motivée.
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { reprendre } from '../../../actions/expedition';
import type { ReprisePanelProps } from '../../../domaine/contrats';
import { fusionner } from '../../../domaine/fusion';
import { manquesDepart, manquesPriseEnCharge } from '../../../domaine/manques';
import { phaseDe } from '../../../domaine/phases';
import { STATUTS_PRISE_EN_CHARGE } from '../../../domaine/statuts';
import type { Expedition } from '../../../domaine/types';
import { Bouton, Manques, Modale } from '../../../ui';
import { texteEchec } from '../ContexteDossier';
import { useContexteEcriture, useLanceur } from '../devis/outilsVue';

type Choix = 0 | 1 | 2;
const CHOIX: Choix[] = [0, 1, 2];

/** Statut proposé : seulement 0, 1 ou 2 (un dossier ne se « reprend » pas à Livré). */
function proposition(x: Expedition | undefined): Choix | null {
  const v = x?.statutAvantIncident;
  return v === 0 || v === 1 || v === 2 ? v : null;
}

export function ReprisePanel({ dossier, brouillon, onFermer, onTermine }: ReprisePanelProps): ReactElement | null {
  const ctx = useContexteEcriture();
  const lancer = useLanceur();
  const idManques = useId();
  const x = dossier.expedition;
  const propose = proposition(x);
  const [choix, setChoix] = useState<Choix | null>(propose);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!x) return null;

  const annule = phaseDe(dossier) === 'annule';
  const titre = annule ? 'Rouvrir le dossier' : 'Reprendre le dossier';
  const effective = fusionner(x, brouillon);
  // Ce qui manque pour le statut visé, évalué sur ce qui est à l'écran (5.5).
  const manques =
    choix === null
      ? ['le choix du statut de reprise']
      : choix === 1
        ? manquesPriseEnCharge(effective)
        : choix === 2
          ? manquesDepart(effective)
          : [];

  async function valider(): Promise<void> {
    if (enCours || manques.length > 0 || choix === null) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await lancer(() => reprendre(ctx, dossier, brouillon, choix));
      if (r.ok) onTermine();
      else setErreur(texteEchec(r));
    } finally {
      setEnCours(false);
    }
  }

  const pied = (
    <>
      <Bouton variante="discret" onClick={onFermer} desactive={enCours}>
        Annuler
      </Bouton>
      <Bouton
        variante="primaire"
        chargement={enCours}
        desactive={manques.length > 0}
        aria-describedby={manques.length > 0 ? idManques : undefined}
        onClick={() => void valider()}
      >
        {titre}
      </Bouton>
    </>
  );

  return (
    <Modale titre={titre} onFermer={onFermer} empecherFermeture={enCours} pied={pied}>
      <div className="bo-pile">
        <p>
          {propose === null
            ? 'L’état du dossier avant l’arrêt n’est pas connu. Choisissez où le reprendre.'
            : `Avant l’arrêt, le dossier était « ${STATUTS_PRISE_EN_CHARGE[propose]} ». Choisissez où le reprendre.`}
        </p>
        <div className="bo-pile" role="radiogroup" aria-label="Statut de reprise">
          {CHOIX.map((c) => (
            <label key={c} className="bo-tva-option">
              <input type="radio" name="statut-reprise" checked={choix === c} onChange={() => setChoix(c)} />
              <span>
                {STATUTS_PRISE_EN_CHARGE[c]}
                {propose === c ? ' (état avant l’arrêt)' : ''}
              </span>
            </label>
          ))}
        </div>
        <Manques manques={manques} id={idManques} />
        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Modale>
  );
}
