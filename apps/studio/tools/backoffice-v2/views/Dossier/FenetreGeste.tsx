/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtres simples des gestes de secours (4.3) : « refus avec motif » et
 * « devis envoyé hors outil » (date, moyen). Chacune est tracée (date et
 * auteur écrits par le geste) et n'a qu'un bouton plein.
 *
 * La logique d'écriture vit dans `actions/` ; ici on ne fait que recueillir la
 * saisie et appeler le geste de secours du contexte (`secours`), puis fermer
 * si le geste a réussi. Un échec reste affiché par le toast d'erreur du
 * contexte et la fenêtre reste ouverte.
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import type { FenetreGesteProps } from '../../domaine/contrats';
import { fusionner } from '../../domaine/fusion';
import { manquesDevis } from '../../domaine/manques';
import type { MoyenHorsOutil, MotifRefus } from '../../domaine/types';
import { Bouton, DateChamp, Liste, Manques, Modale } from '../../ui';
import { useContexteDossier } from './ContexteDossier';

const MOTIFS: { valeur: MotifRefus; libelle: string }[] = [
  { valeur: 'prix', libelle: 'Prix trop élevé' },
  { valeur: 'delai', libelle: 'Délai trop long' },
  { valeur: 'autreTransporteur', libelle: 'Parti chez un autre transporteur' },
  { valeur: 'abandon', libelle: 'Projet abandonné' },
  { valeur: 'autre', libelle: 'Autre raison' },
];

const MOYENS: { valeur: MoyenHorsOutil; libelle: string }[] = [
  { valeur: 'whatsapp', libelle: 'WhatsApp' },
  { valeur: 'emailPersonnel', libelle: 'E-mail personnel' },
  { valeur: 'mainPropre', libelle: 'Remis en main propre' },
  { valeur: 'autre', libelle: 'Autre' },
];

const deuxChiffres = (n: number): string => String(n).padStart(2, '0');

/** « 2026-11-06 » (valeur du sélecteur de date) pour une date locale. */
function versIso(date: Date): string {
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** « 2026-11-06 » devient « 06/11/2026 », format de stockage des dates de l'outil. */
export function isoVersJourMoisAnnee(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function FenetreGeste({ dossier, fenetre, onFermer, onTermine }: FenetreGesteProps): ReactElement {
  return fenetre === 'refus' ? (
    <FenetreRefus dossier={dossier} onFermer={onFermer} onTermine={onTermine} />
  ) : (
    <FenetreHorsOutil dossier={dossier} onFermer={onFermer} onTermine={onTermine} />
  );
}

type Corps = Pick<FenetreGesteProps, 'dossier' | 'onFermer' | 'onTermine'>;

function FenetreRefus({ dossier, onFermer, onTermine }: Corps): ReactElement {
  const ctx = useContexteDossier();
  const [motif, setMotif] = useState<MotifRefus | ''>('');
  const [enCours, setEnCours] = useState(false);
  const idManques = useId();
  const nom = dossier.demande?.clientNom || dossier.expedition?.clientNom || 'ce client';
  const manques = motif === '' ? ['le motif'] : [];

  async function valider(): Promise<void> {
    if (motif === '' || enCours) return;
    setEnCours(true);
    try {
      const r = await ctx.lancer(() => ctx.secours.refuser(motif));
      if (r.ok) onTermine();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modale
      titre={`Classer le dossier de ${nom} sans suite`}
      onFermer={onFermer}
      empecherFermeture={motif !== ''}
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
            Classer sans suite
          </Bouton>
        </>
      }
    >
      <Liste
        etiquette="Motif"
        requis
        valeur={motif}
        vide="Choisir un motif…"
        options={MOTIFS.map((m) => ({ valeur: m.valeur, libelle: m.libelle }))}
        onChange={(v) => setMotif(MOTIFS.find((m) => m.valeur === v)?.valeur ?? '')}
      />
      <Manques manques={manques} id={idManques} />
    </Modale>
  );
}

function FenetreHorsOutil({ dossier, onFermer, onTermine }: Corps): ReactElement {
  const ctx = useContexteDossier();
  const [date, setDate] = useState(() => versIso(new Date()));
  const [moyen, setMoyen] = useState<MoyenHorsOutil | ''>('');
  const [enCours, setEnCours] = useState(false);
  const idManques = useId();

  // Le chiffrage doit exister (montant et taux) ; l'adresse e-mail n'est pas
  // nécessaire puisque rien ne part depuis l'outil.
  const effective = dossier.demande ? fusionner(dossier.demande, ctx.brouillon) : null;
  const manques = [
    ...(effective ? manquesDevis(effective).filter((m) => !m.includes('e-mail')) : ['la demande']),
    ...(isoVersJourMoisAnnee(date) === '' ? ['la date d’envoi'] : []),
    ...(moyen === '' ? ['le moyen utilisé'] : []),
  ];

  async function valider(): Promise<void> {
    if (moyen === '' || manques.length > 0 || enCours) return;
    setEnCours(true);
    try {
      const r = await ctx.lancer(() =>
        ctx.secours.devisHorsOutil({ date: isoVersJourMoisAnnee(date), moyen }),
      );
      if (r.ok) onTermine();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modale
      titre="Devis envoyé hors outil"
      onFermer={onFermer}
      empecherFermeture={moyen !== ''}
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
            Noter l’envoi
          </Bouton>
        </>
      }
    >
      <DateChamp etiquette="Date d’envoi" requis valeur={date} onChange={setDate} />
      <Liste
        etiquette="Moyen utilisé"
        requis
        valeur={moyen}
        vide="Choisir…"
        options={MOYENS.map((m) => ({ valeur: m.valeur, libelle: m.libelle }))}
        onChange={(v) => setMoyen(MOYENS.find((m) => m.valeur === v)?.valeur ?? '')}
      />
      <Manques manques={manques} id={idManques} />
    </Modale>
  );
}
