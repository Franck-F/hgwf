/**
 * Export Excel de TOUS les dossiers (4.7) : une ligne par dossier, sans choix de
 * période. La bibliothèque `xlsx` est lourde : elle n'est chargée qu'au clic
 * (`import()` dynamique), jamais avec l'outil.
 *
 * Les montants sont des cellules numériques (le tableur peut les additionner),
 * calculées comme partout par `calculerChiffrage` ; vides si le chiffrage est
 * incomplet. L'ancien montant texte garde sa propre colonne et n'est jamais
 * converti. Les dates sont celles de l'API (« 28/10/2026 »), jamais en ISO.
 */
import { CHAMPS_FACTURATION, calculerChiffrage } from '../../domaine/chiffrage';
import { LIBELLES_PHASE, phaseDe } from '../../domaine/phases';
import { ETAPES_EXPEDITION, STATUTS_PRISE_EN_CHARGE } from '../../domaine/statuts';
import type { Demande, Dossier } from '../../domaine/types';

type Cellule = string | number;
type Colonne = [titre: string, largeur: number];

const LIBELLES_FACTURATION: Record<(typeof CHAMPS_FACTURATION)[number], string> = {
  facturationType: 'Type de client',
  facturationNom: 'Nom ou raison sociale',
  facturationAdresse: 'Adresse de facturation',
  facturationCodePostal: 'Code postal',
  facturationVille: 'Ville',
  facturationPays: 'Pays',
  facturationSiret: 'SIRET',
  facturationTvaIntracom: 'TVA intracom.',
};

/** En-têtes et largeurs déclarés ensemble : une colonne ajoutée ne décale pas les autres. */
export const COLONNES: Colonne[] = [
  ['Référence', 17],
  ['Client', 22],
  ['Contact', 32],
  ["Type d'envoi", 22],
  ['Destination', 16],
  ['Volume', 10],
  ['Reçue le', 12],
  ['Phase', 24],
  ['Montant HT', 12],
  ['TVA %', 7],
  ['TVA €', 11],
  ['Total TTC', 12],
  ['Montant (ancien)', 16],
  ['Prestation', 40],
  ['Délai estimé', 17],
  ['Devis envoyé le', 16],
  ['Accepté le', 14],
  ['Référence expédition', 20],
  ['Étape du suivi', 18],
  ['Prise en charge', 16],
  ['Arrivée estimée', 16],
  ['N° de conteneur ou LTA', 22],
  ...CHAMPS_FACTURATION.map((c): Colonne => [`Facturation, ${LIBELLES_FACTURATION[c]}`, c === 'facturationAdresse' ? 36 : 18]),
  ['N° de facture', 16],
  ['Message', 60],
  ['Notes internes', 40],
];

function cellulesMontant(d: Demande | undefined): Cellule[] {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA);
  return c ? [c.ht, c.taux, c.tva, c.ttc] : ['', '', '', ''];
}

/**
 * Même règle que le PDF : le SIRET et la TVA intracommunautaire d'un client qui
 * n'est pas professionnel peuvent rester en base, mais ne partent pas dans un
 * export qui prépare la facture.
 */
function cellulesFacturation(d: Demande | undefined): Cellule[] {
  const pro = d?.facturationType === 'professionnel';
  return CHAMPS_FACTURATION.map((c) => {
    if (c === 'facturationType') {
      return d?.facturationType === 'professionnel' ? 'Professionnel' : d?.facturationType === 'particulier' ? 'Particulier' : '';
    }
    if ((c === 'facturationSiret' || c === 'facturationTvaIntracom') && !pro) return '';
    return d?.[c] ?? '';
  });
}

function devisEnvoyeLe(d: Demande | undefined): string {
  if (d?.devisEnvoyeLe) return d.devisEnvoyeLe;
  return d?.devisEnvoyeHorsOutilLe ? `${d.devisEnvoyeHorsOutilLe} (hors outil)` : '';
}

const libelleIndex = (liste: readonly string[], i: number | undefined): string =>
  typeof i === 'number' && liste[i] !== undefined ? liste[i] : '';

export function ligneDossier(dossier: Dossier): Cellule[] {
  const d = dossier.demande;
  const x = dossier.expedition;
  return [
    d?.reference ?? x?.reference ?? '',
    d?.clientNom ?? x?.clientNom ?? '',
    d?.contact ?? x?.contact ?? '',
    d?.typeEnvoi ?? x?.mode ?? '',
    d?.destination ?? '',
    d?.volume ?? '',
    d?.recueLe ?? '',
    LIBELLES_PHASE[phaseDe(dossier)],
    ...cellulesMontant(d),
    d?.montantDevis ?? '',
    d?.descriptionPrestation ?? '',
    d?.delaiEstime ?? '',
    devisEnvoyeLe(d),
    d?.acceptationLe ?? '',
    x?.reference ?? d?.expeditionRef ?? '',
    x ? libelleIndex(ETAPES_EXPEDITION, x.etape) : '',
    x ? libelleIndex(STATUTS_PRISE_EN_CHARGE, x.statutPriseEnCharge) : '',
    x?.eta ?? '',
    x?.numeroConteneur ?? '',
    ...cellulesFacturation(d),
    d?.numeroFacture ?? '',
    d?.message ?? '',
    d?.notes ?? '',
  ];
}

/** En-têtes puis une ligne par dossier, les références les plus récentes d'abord. */
export function construireFeuille(dossiers: Dossier[]): Cellule[][] {
  const tries = [...dossiers].sort((a, b) =>
    String(b.demande?.reference ?? b.expedition?.reference ?? '').localeCompare(
      String(a.demande?.reference ?? a.expedition?.reference ?? ''),
    ),
  );
  return [COLONNES.map(([titre]) => titre), ...tries.map(ligneDossier)];
}

/** « 2026-11-06 » pour le nom du fichier (le fichier seul porte une date ISO). */
function jourPourFichier(maintenant: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
}

export async function exporterDossiers(dossiers: Dossier[]): Promise<void> {
  const XLSX = await import('xlsx');
  const feuille = XLSX.utils.aoa_to_sheet(construireFeuille(dossiers));
  feuille['!cols'] = COLONNES.map(([, wch]) => ({ wch }));
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Dossiers');
  XLSX.writeFile(classeur, `HGWF-dossiers-${jourPourFichier(new Date())}.xlsx`);
}
