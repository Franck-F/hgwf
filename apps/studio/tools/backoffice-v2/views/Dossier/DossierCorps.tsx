/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Page d'un dossier existant (4.3), rangée comme un dossier papier : en haut la
 * prochaine étape, puis les sous-dossiers (Infos, Échanges, Devis, Expédition,
 * Facturation, Historique) dont un seul est ouvert à la fois, à côté de la
 * colonne latérale (client, notes internes). Gère les états : chargement
 * (squelette), erreur de lecture, dossier introuvable, conflit, dossier clos.
 */
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import type { SectionDossierProps } from '../../domaine/contrats';
import { Bouton, EtatVide, Icone, SectionsFixes, Squelette } from '../../ui';
import { BarreEnregistrement } from './BarreEnregistrement';
import { ColonneLaterale } from './ColonneLaterale';
import { ContexteDossierReact } from './ContexteDossier';
import { SousDossiers, idOnglet, idPanneau } from './SousDossiers';
import type { IdSousDossier } from './rangement';
import { champsModifiesDossier } from '../../domaine/fusion';
import { libelleChamp } from './champsDossier';
import { BandeauReponse } from './BandeauReponse';
import { SectionDevis } from './devis/SectionDevis';
import { EnteteDossier } from './EnteteDossier';
import { SectionExpedition } from './expedition/SectionExpedition';
import { FenetresDossier } from './FenetresDossier';
import { ProchaineEtape } from './ProchaineEtape';
import { SectionDemande } from './SectionDemande';
import { SectionEchanges } from './SectionEchanges';
import { SectionFacturation } from './SectionFacturation';
import { SectionHistorique } from './SectionHistorique';
import { useGardeQuitter } from './useGardeQuitter';
import { usePageDossier } from './usePageDossier';

export function DossierCorps({ id }: { id: string }): ReactElement {
  const { naviguer } = useRoute();
  const racine = useRef<HTMLDivElement>(null);
  const p = usePageDossier(id, racine);
  const garde = useGardeQuitter(p.nbModifications > 0 && !p.enregistrement);

  if (p.erreur) {
    return (
      <div className="bo-page">
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <Icone nom="alerte" /> Impossible de charger ce dossier
          <span className="bo-espace" />
          <Bouton variante="secondaire" onClick={() => void p.recharger()}>
            Réessayer
          </Bouton>
        </div>
      </div>
    );
  }
  if (!p.dossier || !p.contexte || !p.action) {
    if (p.chargement) {
      return (
        <div className="bo-page" aria-busy="true">
          <Squelette forme="entete" />
          <Squelette forme="carte" />
        </div>
      );
    }
    return (
      <div className="bo-page">
        <EtatVide
          titre="Ce dossier n’existe plus"
          phrase="Il a peut-être été supprimé depuis le Studio."
          action={{ libelle: 'Retour aux dossiers', onClick: () => naviguer('/dossiers') }}
        />
      </div>
    );
  }

  const { dossier, brouillon, modifier } = p;
  // Dans un sous-dossier, la carte n'est plus repliable (`SectionsFixes`) : `ouverte` est toujours vrai.
  const section: SectionDossierProps = {
    dossier,
    brouillon,
    modifier,
    lectureSeule: p.lectureSeule,
    ouverte: true,
    onBasculer: () => undefined,
  };
  // Tous les panneaux restent montés (`hidden`) : une saisie en cours survit au changement de sous-dossier.
  const panneau = (id: IdSousDossier, contenu: ReactElement): ReactElement | null =>
    p.sousDossiers.some((s) => s.id === id) ? (
      <div role="tabpanel" id={idPanneau(id)} aria-labelledby={idOnglet(id)} hidden={p.onglet !== id} data-section={id}>
        {contenu}
      </div>
    ) : null;
  const modifiesLocalement = p.conflit ? champsModifiesDossier(dossier, brouillon).map(libelleChamp) : [];

  return (
    <ContexteDossierReact.Provider value={p.contexte}>
      <div className="bo-page" ref={racine}>
        <EnteteDossier dossier={dossier} />
        {p.conflit ? (
          <div className="bo-bandeau bo-bandeau--urgent" role="alert">
            <Icone nom="alerte" />
            <span>
              Ce dossier a été modifié par quelqu’un d’autre.
              {modifiesLocalement.length > 0
                ? ` Vos modifications non enregistrées sont conservées : ${modifiesLocalement.join(', ')}.`
                : ''}
            </span>
            <span className="bo-espace" />
            <Bouton variante="secondaire" onClick={() => void p.rechargerApresConflit()}>
              Recharger
            </Bouton>
          </div>
        ) : null}
        {p.onglet !== 'echanges' ? (
          <BandeauReponse dossier={dossier} onLire={() => p.contexte?.allerA('echanges')} />
        ) : null}
        <ProchaineEtape action={p.action} modifications={p.nbModifications > 0} />
        <SousDossiers liste={p.sousDossiers} choisi={p.onglet} onChoisir={p.choisirOnglet} />
        <div className="bo-dossier-grille">
          <SectionsFixes>
            <div className="bo-pile">
              {panneau('infos', <SectionDemande {...section} />)}
              {panneau('echanges', <SectionEchanges {...section} />)}
              {panneau('devis', <SectionDevis {...section} />)}
              {panneau('expedition', <SectionExpedition {...section} />)}
              {panneau('facturation', <SectionFacturation {...section} />)}
              {panneau('historique', <SectionHistorique {...section} />)}
            </div>
          </SectionsFixes>
          <ColonneLaterale dossier={dossier} brouillon={brouillon} modifier={modifier} />
        </div>
      </div>
      <BarreEnregistrement
        nbModifications={p.nbModifications}
        enregistrement={p.enregistrement}
        onAnnuler={p.annuler}
        onEnregistrer={() => void p.enregistrer()}
      />
      <FenetresDossier
        dossier={dossier}
        brouillon={brouillon}
        fenetre={p.fenetre}
        modeSuivi={p.action.id === 'marquerLivre' ? 'livrer' : 'avancer'}
        correction={p.correction}
        onFermer={p.fermerFenetre}
        onTermine={() => {
          p.fermerFenetre();
          void p.recharger();
        }}
      />
      {garde}
    </ContexteDossierReact.Provider>
  );
}
