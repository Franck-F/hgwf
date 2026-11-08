/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Les champs de prise en charge, regroupés en quatre blocs lisibles :
 * Expéditeur, Destinataire, Marchandise, Transport (4.3). Les champs requis pour
 * « Déclencher la prise en charge » portent « requis » et passent en rouge
 * quand on les a quittés vides (ou dès que la page le demande par
 * `afficherManques`). La liste « Il manque » reste, elle, à côté du bouton.
 */
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { SectionDossierProps } from '../../../domaine/contrats';
import { MODES_ENVOI } from '../../../domaine/statuts';
import type { Expedition } from '../../../domaine/types';
import { Carte, Liste, Montant, Saisie, ZoneTexte } from '../../../ui';
import { nombreChamp, texteChamp } from '../devis/outilsVue';
import { ChampEta } from './ChampEta';

export interface BlocsPriseEnChargeProps extends SectionDossierProps {
  /** Vrai quand l'utilisateur a tenté d'avancer : tous les champs requis vides passent en rouge. */
  afficherManques?: boolean;
}

const A_RENSEIGNER = 'À renseigner';

export function BlocsPriseEnCharge({
  dossier,
  brouillon,
  modifier,
  lectureSeule,
  afficherManques = false,
}: BlocsPriseEnChargeProps): ReactElement | null {
  // Champs quittés au moins une fois : l'erreur n'apparaît pas pendant la première saisie.
  const [quittes, setQuittes] = useState<ReadonlySet<string>>(new Set());
  const x: Expedition | undefined = dossier.expedition;
  if (!x) return null;

  const texte = (c: string) => texteChamp(x, brouillon, c);
  const nombre = (c: string) => nombreChamp(x, brouillon, c);
  const saisir = (c: string) => (v: string) => modifier(c, v === '' ? null : v);
  const montrer = (c: string) => afficherManques || quittes.has(c);
  const erreurSi = (c: string, vide: boolean) => (vide && montrer(c) ? A_RENSEIGNER : undefined);
  const garde = (c: string, enfant: ReactNode): ReactElement => (
    <div onBlur={() => setQuittes((s) => new Set(s).add(c))}>{enfant}</div>
  );
  const poidsOuVolumeAbsent = nombre('colisPoids') === null && nombre('colisVolume') === null;

  return (
    <div className="bo-pile">
      <div className="bo-grille">
      <Carte titre="Expéditeur">
        <div className="bo-grille bo-grille--1">
          <Saisie etiquette="Nom" valeur={texte('expediteurNom')} onChange={saisir('expediteurNom')} lectureSeule={lectureSeule} />
          <Saisie etiquette="Téléphone" type="tel" valeur={texte('expediteurTel')} onChange={saisir('expediteurTel')} lectureSeule={lectureSeule} />
          {garde(
            'expediteurAdresse',
            <ZoneTexte
              etiquette="Adresse d’enlèvement"
              requis
              lignes={2}
              valeur={texte('expediteurAdresse')}
              onChange={saisir('expediteurAdresse')}
              lectureSeule={lectureSeule}
              erreur={erreurSi('expediteurAdresse', texte('expediteurAdresse').trim() === '')}
            />,
          )}
        </div>
      </Carte>
      <Carte titre="Destinataire">
        <div className="bo-grille bo-grille--1">
          {garde(
            'destinataireNom',
            <Saisie
              etiquette="Nom"
              requis
              valeur={texte('destinataireNom')}
              onChange={saisir('destinataireNom')}
              lectureSeule={lectureSeule}
              erreur={erreurSi('destinataireNom', texte('destinataireNom').trim() === '')}
            />,
          )}
          <Saisie etiquette="Téléphone" type="tel" valeur={texte('destinataireTel')} onChange={saisir('destinataireTel')} lectureSeule={lectureSeule} />
          {garde(
            'destinataireAdresse',
            <ZoneTexte
              etiquette="Adresse du destinataire"
              requis
              lignes={2}
              valeur={texte('destinataireAdresse')}
              onChange={saisir('destinataireAdresse')}
              lectureSeule={lectureSeule}
              erreur={erreurSi('destinataireAdresse', texte('destinataireAdresse').trim() === '')}
            />,
          )}
        </div>
      </Carte>
      </div>
      <Carte titre="Marchandise">
        <div className="bo-grille">
          {garde(
            'colisNombre',
            <Montant
              etiquette="Nombre de colis"
              unite="colis"
              requis
              valeur={nombre('colisNombre')}
              // Un nombre de colis est entier : une saisie décimale est arrondie sous les yeux de l'équipe.
              onChange={(v) => modifier('colisNombre', v === null ? null : Math.round(v))}
              lectureSeule={lectureSeule}
              erreur={erreurSi('colisNombre', nombre('colisNombre') === null)}
            />,
          )}
          {garde(
            'colisPoids',
            <Montant
              etiquette="Poids"
              unite="kg"
              requis
              valeur={nombre('colisPoids')}
              onChange={(v) => modifier('colisPoids', v)}
              lectureSeule={lectureSeule}
              aide="Poids ou volume : l’un des deux suffit."
              erreur={erreurSi('colisPoids', poidsOuVolumeAbsent)}
            />,
          )}
          <Montant etiquette="Volume" unite="m³" valeur={nombre('colisVolume')} onChange={(v) => modifier('colisVolume', v)} lectureSeule={lectureSeule} />
          <Montant etiquette="Valeur déclarée" valeur={nombre('valeurDeclaree')} onChange={(v) => modifier('valeurDeclaree', v)} lectureSeule={lectureSeule} />
          {garde(
            'colisNature',
            <Saisie
              etiquette="Nature de la marchandise"
              requis
              valeur={texte('colisNature')}
              onChange={saisir('colisNature')}
              lectureSeule={lectureSeule}
              erreur={erreurSi('colisNature', texte('colisNature').trim() === '')}
            />,
          )}
        </div>
      </Carte>
      <Carte titre="Transport">
        <div className="bo-grille">
          {garde(
            'mode',
            <Liste
              etiquette="Mode d’acheminement"
              requis
              vide="Choisir…"
              valeur={texte('mode')}
              options={MODES_ENVOI.map((m) => ({ valeur: m, libelle: m }))}
              onChange={saisir('mode')}
              lectureSeule={lectureSeule}
              erreur={erreurSi('mode', texte('mode').trim() === '')}
            />,
          )}
          <Saisie etiquette="N° de réservation" valeur={texte('numeroReservation')} onChange={saisir('numeroReservation')} lectureSeule={lectureSeule} />
          <Saisie etiquette="N° de conteneur / LTA" valeur={texte('numeroConteneur')} onChange={saisir('numeroConteneur')} lectureSeule={lectureSeule} />
          <Saisie etiquette="Trajet" valeur={texte('trajet')} onChange={saisir('trajet')} lectureSeule={lectureSeule} />
          <ChampEta valeur={texte('eta')} onChange={(v) => modifier('eta', v)} lectureSeule={lectureSeule} />
        </div>
        <ZoneTexte
          etiquette="Notes d’exploitation"
          lignes={3}
          valeur={texte('notesExploitation')}
          onChange={saisir('notesExploitation')}
          lectureSeule={lectureSeule}
        />
      </Carte>
    </div>
  );
}
