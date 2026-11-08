/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Deux aides déterministes du devis (4.3), jamais écrites d'office :
 * « Appliquer la grille » (montant) et « Proposer un délai » (prochaine clôture).
 * Chacune montre sa proposition dans une petite carte avec « Utiliser » /
 * « Ignorer ». Aucun appel d'IA, aucun prix inventé : sans prix de grille, sans
 * volume lisible ou sans rotation à venir, l'aide n'est pas affichée.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useMagasin } from '../../../data/magasin';
import { ficheDe } from '../../../domaine/fiches';
import { appliquerGrille, proposerDelai } from '../../../domaine/suggestions';
import type { Dossier } from '../../../domaine/types';
import { Bouton } from '../../../ui';

export interface AidesDevisProps {
  dossier: Dossier;
  onUtiliserMontant: (montantHT: number) => void;
  onUtiliserDelai: (delai: string) => void;
  /**
   * Quelle aide afficher. Chaque aide se place sous son champ (montant, délai) ;
   * absent = les deux, l'une après l'autre.
   */
  champ?: 'montant' | 'delai';
}

function CartePropositionAide({
  titre,
  texte,
  onUtiliser,
  onIgnorer,
}: {
  titre: string;
  texte: string;
  onUtiliser: () => void;
  onIgnorer: () => void;
}): ReactElement {
  return (
    <div className="bo-bandeau bo-bandeau--info" role="group" aria-label={titre}>
      <span>{texte}</span>
      <span className="bo-rangee bo-espace">
        <Bouton variante="secondaire" taille="s" onClick={onUtiliser}>
          Utiliser
        </Bouton>
        <Bouton variante="discret" taille="s" onClick={onIgnorer}>
          Ignorer
        </Bouton>
      </span>
    </div>
  );
}

export function AidesDevis({ dossier, onUtiliserMontant, onUtiliserDelai, champ }: AidesDevisProps): ReactElement | null {
  const { donnees } = useMagasin();
  const demande = dossier.demande;
  // Proposition affichée : `null` = l'aide est repliée (bouton seul).
  const [ouverte, setOuverte] = useState<'montant' | 'delai' | null>(null);

  const grille = useMemo(() => {
    if (!demande) return null;
    return appliquerGrille(demande, ficheDe(demande, donnees.fiches).fiche);
  }, [demande, donnees.fiches]);
  // « Maintenant » est celui de l'horloge du navigateur (fixée par le harnais).
  const delai = useMemo(() => proposerDelai(donnees.rotations, new Date()), [donnees.rotations]);

  const voirMontant = champ !== 'delai' && grille !== null;
  const voirDelai = champ !== 'montant' && delai !== null;
  if (!voirMontant && !voirDelai) return null;

  return (
    <div className="bo-pile">
      {voirMontant && grille ? (
        <>
          <div>
            <Bouton variante="discret" taille="s" onClick={() => setOuverte('montant')}>
              Appliquer la grille
            </Bouton>
          </div>
          {ouverte === 'montant' ? (
            <CartePropositionAide
              titre="Proposition de la grille"
              texte={grille.detail}
              onUtiliser={() => {
                onUtiliserMontant(grille.montantHT);
                setOuverte(null);
              }}
              onIgnorer={() => setOuverte(null)}
            />
          ) : null}
        </>
      ) : null}
      {voirDelai && delai ? (
        <>
          <div>
            <Bouton variante="discret" taille="s" onClick={() => setOuverte('delai')}>
              Proposer un délai
            </Bouton>
          </div>
          {ouverte === 'delai' ? (
            <CartePropositionAide
              titre="Proposition de délai"
              texte={delai.texte}
              onUtiliser={() => {
                onUtiliserDelai(delai.texte);
                setOuverte(null);
              }}
              onIgnorer={() => setOuverte(null)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
