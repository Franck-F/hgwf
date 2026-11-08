/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre « Ajouter / Modifier une rotation ». Les dates se choisissent au
 * sélecteur et sont enregistrées en « JJ/MM » (le format stocké, sans année).
 * En modification, le sélecteur est pré-rempli avec la date lue par
 * `lireDatesRotation` : l'année n'est pas stockée, elle est déduite.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { enregistrerRotation } from '../../actions/referentiels';
import { useToasts } from '../../app/Contexte';
import { lireDatesRotation } from '../../domaine/format';
import type { Rotation } from '../../domaine/types';
import { Bouton, DateChamp, Modale, Saisie } from '../../ui';
import { useContexteEcriture } from './contexte';
import { erreursRotation, lireRemplissage, versChampDate, versJourMois } from './dates';
import type { ErreursRotation } from './dates';

interface Props {
  rotation?: Rotation;
  onFermer: () => void;
  onEnregistre: () => Promise<void> | void;
}

export function FormulaireRotation({ rotation, onFermer, onEnregistre }: Props): ReactElement {
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const lues = rotation ? lireDatesRotation(rotation, new Date()) : { cloture: null, depart: null };
  const [nom, setNom] = useState(rotation?.nom ?? '');
  const [cloture, setCloture] = useState(versChampDate(lues.cloture));
  const [depart, setDepart] = useState(versChampDate(lues.depart));
  const [remplissage, setRemplissage] = useState(rotation?.remplissage !== undefined ? String(rotation.remplissage) : '');
  const [erreurs, setErreurs] = useState<ErreursRotation>({});
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const saisie = nom !== (rotation?.nom ?? '') || cloture !== versChampDate(lues.cloture) || depart !== versChampDate(lues.depart);

  async function enregistrer(): Promise<void> {
    if (enCours) return;
    const trouvees = erreursRotation({ nom, cloture, depart, remplissage });
    setErreurs(trouvees);
    if (Object.keys(trouvees).length > 0) return;
    setErreur('');
    setEnCours(true);
    const r = await enregistrerRotation(ctx, {
      ...(rotation ? { _id: rotation._id, _rev: rotation._rev } : {}),
      _type: 'rotation',
      nom: nom.trim(),
      cloture: versJourMois(cloture),
      depart: versJourMois(depart),
      remplissage: lireRemplissage(remplissage),
    });
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return;
    }
    toasts.succes(rotation ? `Rotation ${nom.trim()} modifiée` : `Rotation ${nom.trim()} ajoutée`);
    await onEnregistre();
    onFermer();
  }

  return (
    <Modale
      titre={rotation ? 'Modifier la rotation' : 'Ajouter une rotation'}
      onFermer={onFermer}
      empecherFermeture={saisie}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton variante="primaire" chargement={enCours} onClick={() => void enregistrer()}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="bo-pile">
        <Saisie etiquette="Nom de la rotation" valeur={nom} onChange={setNom} requis erreur={erreurs.nom} placeholder="Le Havre → Dakar" />
        <div className="bo-grille">
          <DateChamp etiquette="Clôture" valeur={cloture} onChange={setCloture} requis erreur={erreurs.cloture} />
          <DateChamp etiquette="Départ" valeur={depart} onChange={setDepart} erreur={erreurs.depart} />
        </div>
        <Saisie etiquette="Remplissage (%)" valeur={remplissage} onChange={setRemplissage} erreur={erreurs.remplissage} placeholder="0" />
        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Modale>
  );
}
