/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre « Ajouter / Modifier un conteneur ». Les quatre listes reprennent les
 * choix de V1 ; une valeur ancienne hors liste est conservée comme option, pour
 * qu'ouvrir la fenêtre n'écrase rien.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { enregistrerConteneur } from '../../actions/referentiels';
import { useToasts } from '../../app/Contexte';
import type { Conteneur } from '../../domaine/types';
import { Bouton, Liste, Modale, Saisie } from '../../ui';
import type { OptionListe } from '../../ui';
import { useContexteEcriture } from './contexte';

const TAILLES = ['20 pieds', '40 pieds'];
const ETATS: OptionListe[] = [
  { valeur: 'A', libelle: 'A · très bon état' },
  { valeur: 'B', libelle: 'B · bon état' },
  { valeur: 'C', libelle: 'C · état correct' },
];

function avecValeurActuelle(options: OptionListe[], actuelle: string): OptionListe[] {
  return !actuelle || options.some((o) => o.valeur === actuelle) ? options : [...options, { valeur: actuelle, libelle: actuelle }];
}

interface Props {
  /** Conteneur à modifier ; absent = création. */
  conteneur?: Conteneur;
  onFermer: () => void;
  onEnregistre: () => Promise<void> | void;
}

export function FormulaireConteneur({ conteneur, onFermer, onEnregistre }: Props): ReactElement {
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const [reference, setReference] = useState(conteneur?.reference ?? '');
  const [taille, setTaille] = useState(conteneur?.taille ?? TAILLES[0]!);
  const [etat, setEtat] = useState(conteneur?.etat ?? 'A');
  const [lieu, setLieu] = useState(conteneur?.lieu ?? '');
  const [prix, setPrix] = useState(conteneur?.prix ?? '');
  const [erreurReference, setErreurReference] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const modifie =
    reference !== (conteneur?.reference ?? '') || lieu !== (conteneur?.lieu ?? '') || prix !== (conteneur?.prix ?? '');

  async function enregistrer(): Promise<void> {
    if (enCours) return;
    if (!reference.trim()) {
      setErreurReference('Indiquez la référence (par exemple CTN-20-130).');
      return;
    }
    setErreurReference('');
    setErreur('');
    setEnCours(true);
    const r = await enregistrerConteneur(ctx, {
      ...(conteneur ? { _id: conteneur._id, _rev: conteneur._rev, statut: conteneur.statut } : { statut: 0 }),
      _type: 'conteneurOccasion',
      reference: reference.trim(),
      taille,
      etat,
      lieu: lieu.trim(),
      prix: prix.trim(),
    });
    setEnCours(false);
    if (!r.ok) {
      // L'erreur reste dans la fenêtre, qui garde les saisies.
      setErreur(r.message);
      return;
    }
    toasts.succes(conteneur ? `Conteneur ${reference.trim()} modifié` : `Conteneur ${reference.trim()} ajouté`);
    await onEnregistre();
    onFermer();
  }

  return (
    <Modale
      titre={conteneur ? 'Modifier le conteneur' : 'Ajouter un conteneur'}
      onFermer={onFermer}
      empecherFermeture={modifie}
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
        <Saisie etiquette="Référence" valeur={reference} onChange={setReference} requis erreur={erreurReference} placeholder="CTN-20-130" />
        <div className="bo-grille">
          <Liste
            etiquette="Taille"
            valeur={taille}
            onChange={setTaille}
            options={avecValeurActuelle(TAILLES.map((t) => ({ valeur: t, libelle: t })), taille)}
          />
          <Liste etiquette="État général" valeur={etat} onChange={setEtat} options={avecValeurActuelle(ETATS, etat)} />
        </div>
        <Saisie etiquette="Lieu de stockage" valeur={lieu} onChange={setLieu} placeholder="Dépôt de Rosny-sous-Bois" />
        <Saisie etiquette="Prix affiché" valeur={prix} onChange={setPrix} placeholder="1 450 €" />
        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Modale>
  );
}
