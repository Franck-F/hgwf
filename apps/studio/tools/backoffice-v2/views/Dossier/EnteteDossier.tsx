/** @jsxRuntime automatic @jsxImportSource react */
/**
 * En-tête de la page Dossier (4.3) : retour, nom du client, référence, badge de
 * phase, âge, contacts, menu « Autres actions », bandeau d'incident ou de
 * clôture, et frise de phase.
 */
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { lireDate } from '../../domaine/echeances';
import { formaterDate, ilYa } from '../../domaine/format';
import { ETAPES_FRISE, LIBELLES_PHASE, TON_PHASE, phaseDe, positionFrise, tonFrise } from '../../domaine/phases';
import type { Dossier } from '../../domaine/types';
import { Badge, Bouton, Frise, Icone } from '../../ui';
import type { IconeNom, TonBadge } from '../../ui';
import { ContactsDossier } from './ContactsDossier';
import { MenuDossier } from './MenuDossier';

export interface EnteteDossierProps {
  dossier: Dossier;
}

// L'état n'est jamais porté par la couleur seule : chaque ton a son icône.
const ICONE_TON: Partial<Record<TonBadge, IconeNom>> = {
  urgent: 'alerte',
  attention: 'horloge',
  ok: 'coche',
};

export function EnteteDossier({ dossier }: EnteteDossierProps): ReactElement {
  const { naviguer } = useRoute();
  const phase = phaseDe(dossier);
  const d = dossier.demande;
  const x = dossier.expedition;
  const nom = d?.clientNom || x?.clientNom || 'Client sans nom';
  const reference = d?.reference ?? x?.reference ?? '';
  const secondeReference = d && x?.reference && x.reference !== d.reference ? x.reference : null;

  const recueLe = lireDate(d?.recueLe) ?? (d?._createdAt ? new Date(d._createdAt) : null);
  const age = recueLe && !Number.isNaN(recueLe.getTime()) ? `reçue ${ilYa(recueLe, new Date())}` : null;

  // La raison de l'incident est dans les notes d'exploitation : on la remonte ici, pas tout en bas de page.
  const notes = (x?.notesExploitation ?? '').trim();
  const motifIncident = notes.length > 160 ? `${notes.slice(0, 157).trimEnd()}…` : notes;

  const horsOutil =
    phase === 'devisHorsOutil' ? lireDate(d?.devisEnvoyeHorsOutilLe) : null;

  return (
    <header className="bo-pile">
      <div className="bo-rangee">
        <Bouton variante="discret" onClick={() => naviguer('/dossiers')}>
          ← Dossiers
        </Bouton>
      </div>
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">{nom}</h1>
        <Badge ton={TON_PHASE[phase]} icone={ICONE_TON[TON_PHASE[phase]]}>
          {LIBELLES_PHASE[phase]}
        </Badge>
        <span className="bo-secondaire">
          {[reference, secondeReference, age].filter(Boolean).join(' · ')}
          {horsOutil ? ` · devis envoyé hors outil, le ${formaterDate(horsOutil)}` : ''}
        </span>
        <span className="bo-espace" />
        <MenuDossier dossier={dossier} />
      </div>
      <ContactsDossier dossier={dossier} />
      {phase === 'incident' ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="status">
          <Icone nom="alerte" /> Incident signalé sur cette expédition
          {motifIncident ? <span className="bo-fort">{` : ${motifIncident}`}</span> : null}
        </div>
      ) : null}
      {phase === 'annule' || phase === 'sansSuite' ? (
        <div className="bo-bandeau bo-bandeau--neutre" role="status">
          {phase === 'annule' ? 'Dossier annulé' : 'Dossier classé sans suite'}
        </div>
      ) : null}
      <Frise etapes={ETAPES_FRISE} courante={positionFrise(dossier)} ton={tonFrise(phase)} />
    </header>
  );
}
