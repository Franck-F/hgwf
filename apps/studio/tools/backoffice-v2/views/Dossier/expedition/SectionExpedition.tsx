/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Expédition » (4.3) : le suivi client (distinct de la phase) et le
 * règlement, gestes de tous les jours, en haut ; puis le détail de la prise en
 * charge (quatre blocs), ouvert seulement quand c'est l'action de la phase
 * (« À préparer ») et replié en une ligne de résumé sinon.
 * Visible dès « Accepté », ouverte dès « À préparer » : c'est `DossierPage` qui
 * décide de `ouverte` ; sans expédition, rien n'est rendu.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { SectionDossierProps } from '../../../domaine/contrats';
import { LIBELLES_PHASE, phaseDe } from '../../../domaine/phases';
import { ETAPES_EXPEDITION } from '../../../domaine/statuts';
import { Section } from '../../../ui';
import { BlocsPriseEnCharge } from './BlocsPriseEnCharge';
import { DepartReglement } from './DepartReglement';
import { SuiviClient } from './SuiviClient';

export interface SectionExpeditionProps extends SectionDossierProps {
  /** Transmis aux blocs : les champs requis vides passent en rouge (clic sur l'action bloquée). */
  afficherManques?: boolean;
}

export function SectionExpedition(props: SectionExpeditionProps): ReactElement | null {
  const { dossier, ouverte, onBasculer, lectureSeule, afficherManques } = props;
  const x = dossier.expedition;
  const [detailOuvert, setDetailOuvert] = useState<boolean | null>(null);
  if (!x) return null;
  const phase = phaseDe(dossier);
  // Ouvert d'office à préparer, ou quand on demande à voir ce qui manque ; le choix de l'équipe prime ensuite.
  const detail = detailOuvert ?? (phase === 'aPreparer' || afficherManques === true);
  const resumeDetail = [x.expediteurNom, x.destinataireNom, x.colisNature, x.mode]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join(' · ');
  const etape = typeof x.etape === 'number' ? ETAPES_EXPEDITION[x.etape] : undefined;
  // Fermée, la section résume la phase et l'étape vue par le client.
  const resume = `${LIBELLES_PHASE[phaseDe(dossier)]}${etape ? ` · suivi : ${etape}` : ''}`;
  return (
    <Section titre="Expédition" resume={resume} ouverte={ouverte} onBasculer={onBasculer}>
      <div className="bo-pile">
        <SuiviClient dossier={dossier} />
        <DepartReglement dossier={dossier} lectureSeule={lectureSeule} />
        <Section
          titre="Détail de la prise en charge"
          resume={resumeDetail || 'Expéditeur, destinataire, marchandise, transport'}
          ouverte={detail}
          onBasculer={() => setDetailOuvert(!detail)}
        >
          <BlocsPriseEnCharge {...props} afficherManques={afficherManques} />
        </Section>
      </div>
    </Section>
  );
}
