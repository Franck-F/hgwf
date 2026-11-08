/**
 * Historique reconstitué à partir des champs de trace existants (4.3, section
 * Historique) : pas de journal séparé à écrire.
 */
import { lireDate, texteAUneHeure } from './echeances';
import { formaterDate, formaterDateHeure } from './format';
import { ETAPES_EXPEDITION } from './statuts';
import type { Dossier, MoyenHorsOutil } from './types';

export interface EvenementHistorique {
  /** Date de l'événement ; `null` si la trace est illisible (affichée en fin). */
  date: Date | null;
  /** « 28/10/2026 à 14h02 » (sans heure si la trace n'en porte pas). */
  dateTexte: string;
  libelle: string;
  /** Auteur quand il est tracé (« Marie »). */
  auteur?: string;
}

const MOYENS: Record<MoyenHorsOutil, string> = {
  whatsapp: 'WhatsApp',
  emailPersonnel: 'e-mail personnel',
  mainPropre: 'remis en main propre',
  autre: 'autre moyen',
};

function evenement(source: string | undefined, libelle: string, auteur?: string): EvenementHistorique | null {
  if (!source || !source.trim()) return null;
  const date = lireDate(source);
  const dateTexte = date ? (texteAUneHeure(source) ? formaterDateHeure(date) : formaterDate(date)) : source.trim();
  return { date, dateTexte, libelle, ...(auteur ? { auteur } : {}) };
}

/** Du plus récent au plus ancien ; les traces illisibles à la fin. */
export function construireHistorique(dossier: Dossier): EvenementHistorique[] {
  const d = dossier.demande;
  const x = dossier.expedition;
  const liste: (EvenementHistorique | null)[] = [];

  if (d) {
    liste.push(
      evenement(d.recueLe ?? d._createdAt, d.sourceDemande === 'telephone' ? 'Demande reçue au téléphone' : 'Demande reçue'),
      evenement(d.accuseReceptionLe, 'Accusé de réception envoyé'),
      evenement(d.complementDemandeLe, `Compléments demandés${d.complementDemandeA ? ` à ${d.complementDemandeA}` : ''}`),
      evenement(d.reponseClientLe, 'Le client a répondu'),
      evenement(d.devisEnvoyeLe, `Devis envoyé${d.devisEnvoyeA ? ` à ${d.devisEnvoyeA}` : ''}`),
      evenement(
        d.devisEnvoyeHorsOutilLe,
        `Devis envoyé hors outil${d.devisEnvoyeHorsOutilMoyen ? ` (${MOYENS[d.devisEnvoyeHorsOutilMoyen]})` : ''}`,
        d.devisEnvoyeHorsOutilPar,
      ),
      evenement(d.relanceEnvoyeeLe, 'Relance automatique envoyée'),
      evenement(d.acceptationLe, 'Devis accepté par le client', d.acceptationPar),
    );
  }
  if (x) {
    const etape = x.derniereEtapeNotifiee;
    liste.push(
      evenement(x._createdAt, d ? 'Expédition créée' : 'Dossier créé'),
      evenement(x.priseEnChargeLe, 'Prise en charge déclenchée'),
      evenement(
        x.derniereNotificationLe,
        `Client prévenu${typeof etape === 'number' && ETAPES_EXPEDITION[etape] ? ` (${ETAPES_EXPEDITION[etape]})` : ''}`,
      ),
      evenement(x.reglementRecuLe, 'Règlement reçu'),
      evenement(x.derogationLe, 'Départ autorisé sans règlement', x.derogationPar),
    );
  }

  const evenements = liste.filter((e): e is EvenementHistorique => e !== null);
  return evenements.sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}
