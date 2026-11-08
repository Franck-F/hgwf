/** @jsxRuntime automatic @jsxImportSource react */
/**
 * « Suivi client » : l'étape que le client voit sur la page de suivi (Pris en
 * charge, Au port du Havre, En mer, Port d'arrivée, Livré). C'est un bloc à
 * part, jamais mélangé au badge de phase (3.2). Lecture seule : l'étape se
 * change par la fenêtre « Faire avancer le suivi ».
 */
import type { ReactElement } from 'react';
import { lireDate } from '../../../domaine/echeances';
import { formaterDateHeure } from '../../../domaine/format';
import type { SectionDossierProps } from '../../../domaine/contrats';
import { ETAPES_EXPEDITION } from '../../../domaine/statuts';
import { Carte, Frise } from '../../../ui';

const ETAPES = ETAPES_EXPEDITION.map((libelle, i) => ({ id: String(i), libelle }));

/** « Prévenu le 01/11/2026 à 11h00 (En mer) », ou le constat qu'aucun e-mail n'est parti. */
function phrasePrevenu(notifiee: number | undefined, quand: string | undefined): string {
  if (typeof notifiee !== 'number') return 'Le client n’a pas encore été prévenu.';
  const date = lireDate(quand);
  const etape = ETAPES_EXPEDITION[notifiee] ?? '';
  return `Prévenu${date ? ` le ${formaterDateHeure(date)}` : ''}${etape ? ` (${etape})` : ''}`;
}

export function SuiviClient({ dossier }: Pick<SectionDossierProps, 'dossier'>): ReactElement | null {
  const x = dossier.expedition;
  if (!x) return null;
  const etape = typeof x.etape === 'number' ? x.etape : 0;
  return (
    <Carte titre="Suivi client">
      <div className="bo-pile">
        <Frise etapes={ETAPES} courante={String(etape)} />
        <p className="bo-secondaire">{phrasePrevenu(x.derniereEtapeNotifiee, x.derniereNotificationLe)}</p>
      </div>
    </Carte>
  );
}
