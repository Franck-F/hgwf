/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Menu « Autres actions » de l'en-tête (4.3) : tout le secondaire en un seul
 * endroit. Chaque entrée n'apparaît que dans les phases où elle a un sens ; les
 * gestes qui partent chez le client ou qui sont lourds de conséquence passent
 * par une confirmation nommée. « Exporter ce dossier » n'existe plus (doublon).
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useToasts } from '../../app/Contexte';
import { aUnMontant } from '../../domaine/chiffrage';
import { lireDate } from '../../domaine/echeances';
import { formaterDate } from '../../domaine/format';
import { fusionner } from '../../domaine/fusion';
import { phaseDe } from '../../domaine/phases';
import type { Dossier, Phase } from '../../domaine/types';
import { Confirmation, MenuActions } from '../../ui';
import type { ElementMenu } from '../../ui';
import { useContexteDossier } from './ContexteDossier';

type Demandee = 'renvoyer' | 'incident' | 'annuler';

const REFUSABLES: Phase[] = [
  'nouvelle',
  'aChiffrer',
  'reponseRecue',
  'devisPartiStatutACorriger',
  'devisEnvoye',
  'devisHorsOutil',
];
const EXPEDITION_EN_COURS: Phase[] = ['aPreparer', 'pret', 'enRoute'];

/** Le client a répondu à la demande de compléments : il n'y a pas encore de réponse notée. */
function reponseEnAttente(dossier: Dossier): boolean {
  const d = dossier.demande;
  if (!d?.complementDemandeLe) return false;
  const complement = lireDate(d.complementDemandeLe);
  const reponse = lireDate(d.reponseClientLe);
  return !reponse || !complement || reponse.getTime() <= complement.getTime();
}

export function MenuDossier({ dossier }: { dossier: Dossier }): ReactElement | null {
  const ctx = useContexteDossier();
  const toasts = useToasts();
  const [demandee, setDemandee] = useState<Demandee | null>(null);
  const phase = phaseDe(dossier);
  const d = dossier.demande;
  const nom = d?.clientNom || dossier.expedition?.clientNom || 'ce client';

  async function telechargerPdf(): Promise<void> {
    if (!d) return;
    try {
      // Chargé à la demande : jsPDF est lourd et inutile pour afficher la page.
      const { genererDevisPdf } = await import('../../pdf/devisPdf');
      await genererDevisPdf({ ...fusionner(d, ctx.brouillon), reference: d.reference ?? d._id });
    } catch {
      toasts.erreur('Le PDF n’a pas pu être créé. Réessayez.');
    }
  }

  const elements: ElementMenu[] = [];
  const ajouter = (e: ElementMenu): void => void elements.push(e);

  if (d) {
    const effective = fusionner(d, ctx.brouillon);
    ajouter({
      id: 'pdf',
      libelle: 'Télécharger le devis PDF',
      desactive: !aUnMontant(effective),
      onChoisir: () => void telechargerPdf(),
    });
  }
  if (phase === 'devisPartiStatutACorriger' || phase === 'devisEnvoye' || phase === 'devisHorsOutil') {
    ajouter({ id: 'renvoyer', libelle: 'Renvoyer le devis', onChoisir: () => setDemandee('renvoyer') });
  }
  if ((phase === 'aChiffrer' || phase === 'reponseRecue') && reponseEnAttente(dossier)) {
    ajouter({
      id: 'repondu',
      libelle: 'Le client a répondu',
      onChoisir: () => void ctx.lancer(() => ctx.secours.clientARepondu()),
    });
  }
  if (phase === 'enRoute') {
    ajouter({
      id: 'notifier',
      libelle: 'Prévenir le client de l’étape actuelle',
      onChoisir: () => ctx.ouvrirFenetre('notifier'),
    });
  }
  if (phase === 'aChiffrer' || phase === 'reponseRecue') {
    ajouter({ id: 'horsOutil', libelle: 'Devis envoyé hors outil', onChoisir: () => ctx.ouvrirFenetre('horsOutil') });
    ajouter({
      id: 'accepteOral',
      libelle: 'Le client a accepté',
      onChoisir: () => void ctx.lancer(() => ctx.secours.accepterSansDevis()),
    });
  }
  if (phase === 'enRoute') {
    ajouter({ id: 'corriger', libelle: 'Corriger l’étape du suivi', onChoisir: ctx.ouvrirCorrection });
  }
  if (EXPEDITION_EN_COURS.includes(phase)) {
    ajouter({ id: 'incident', libelle: 'Signaler un incident', onChoisir: () => setDemandee('incident') });
  }
  if (REFUSABLES.includes(phase)) {
    ajouter({ id: 'refus', libelle: 'Refuser / sans suite', danger: true, onChoisir: () => ctx.ouvrirFenetre('refus') });
  }
  if (EXPEDITION_EN_COURS.includes(phase) || phase === 'incident') {
    ajouter({ id: 'annuler', libelle: 'Annuler le dossier', danger: true, onChoisir: () => setDemandee('annuler') });
  }

  if (elements.length === 0) return null;

  const dateEnvoi = lireDate(d?.devisEnvoyeLe ?? d?.devisEnvoyeHorsOutilLe);
  const quand = dateEnvoi ? ` le ${formaterDate(dateEnvoi)}` : '';

  return (
    <>
      <MenuActions elements={elements} />
      {demandee === 'renvoyer' ? (
        <Confirmation
          titre="Renvoyer le devis ?"
          consequence={`Le client l’a déjà reçu${quand}. Un nouvel e-mail lui sera envoyé.`}
          verbe="Renvoyer"
          onAnnuler={() => setDemandee(null)}
          onConfirmer={() => {
            setDemandee(null);
            ctx.ouvrirFenetre('envoi');
          }}
        />
      ) : null}
      {demandee === 'incident' ? (
        <Confirmation
          titre="Signaler un incident ?"
          consequence={`Le dossier de ${nom} passe en incident. Vous pourrez le reprendre ensuite.`}
          verbe="Signaler l’incident"
          danger
          onAnnuler={() => setDemandee(null)}
          onConfirmer={() => {
            setDemandee(null);
            void ctx.lancer(() => ctx.secours.signalerIncident());
          }}
        />
      ) : null}
      {demandee === 'annuler' ? (
        <Confirmation
          titre="Annuler le dossier ?"
          consequence={`L’expédition de ${nom} est annulée. Vous pourrez la rouvrir plus tard.`}
          verbe="Annuler le dossier"
          danger
          onAnnuler={() => setDemandee(null)}
          onConfirmer={() => {
            setDemandee(null);
            void ctx.lancer(() => ctx.secours.annuler());
          }}
        />
      ) : null}
    </>
  );
}
