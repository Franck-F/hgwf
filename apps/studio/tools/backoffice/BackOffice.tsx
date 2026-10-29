/**
 * Back-office HGWF — outil Studio fidèle à la maquette Back-office HGWF.dc.html.
 * Données stockées dans Sanity (demandeDevis, expedition, clientFiche,
 * conteneurOccasion, rotation, statsMensuelles), mutations via le client
 * authentifié du Studio.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useClient, useCurrentUser } from 'sanity';
import * as XLSX from 'xlsx';
import { STATUTS_DEMANDE } from '../../schemaTypes/backoffice/demandeDevis';
import { ETAPES_EXPEDITION } from '../../schemaTypes/backoffice/expedition';
import { STATUTS_CONTENEUR } from '../../schemaTypes/backoffice/conteneurOccasion';
import { construireDevisPdf, genererDevisPdf, lireDetail, messageLibre } from './devisPdf';
import {
  aUnMontant,
  calculerChiffrage,
  CHAMPS_FACTURATION,
  erreurSiret,
  euros,
  libelleMontant,
  lignesFacturation,
  lignesMontant,
  lireMontantSaisi,
  manquesFacturation,
  montantAnnonce,
  montantVersSaisie,
  pourcentage,
  TAUX_TVA,
  type Facturation,
} from './chiffrage';

// ── Palette HGWF ──────────────────────────────────────────────────────────────
const MARINE = '#12395B';
const CREME = '#FBF4E6';
const IVOIRE = '#FFFDF8';
const CIEL = '#4EA8DE';
const CORAIL = '#FF6F5E';
const OR = '#FFB23E';
const ENCRE = '#29638D';
const ROUGE = '#C24435';
const SANS = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'Space Mono', monospace";

// ── Types documents ───────────────────────────────────────────────────────────
// Le bloc facturation (champs plats facturation*) vit sur la demande : collecté
// à la validation du devis, relu par l'expédition via demandeRef.
type Demande = Facturation & {
  _id: string;
  // Révision chargée : l'enregistrement du panneau en dépend (ifRevisionId),
  // pour ne jamais écraser une saisie faite ailleurs depuis le chargement.
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  reference: string;
  clientNom?: string;
  email?: string;
  telephone?: string;
  preferenceContact?: string;
  contact?: string;
  typeEnvoi?: string;
  destination?: string;
  volume?: string;
  recueLe?: string;
  statut?: number;
  message?: string;
  // Chiffrage : montant HT en euros et taux en pourcentage (0 ou 20). TVA et
  // TTC se recalculent (calculerChiffrage), jamais stockés.
  montantHT?: number | null;
  tauxTVA?: number | null;
  // Ancienne chaîne libre (« 1 250 € ») des documents antérieurs au
  // 29/09/2026 : lue en secours, jamais réécrite ni convertie en TVA.
  montantDevis?: string;
  descriptionPrestation?: string;
  delaiEstime?: string;
  devisEnvoyeLe?: string;
  notes?: string;
  expeditionRef?: string;
  accuseReceptionLe?: string;
  devisEnvoyeA?: string;
  relanceEnvoyeeLe?: string;
};
type Expedition = {
  _id: string;
  _updatedAt?: string;
  reference: string;
  clientNom?: string;
  email?: string;
  telephone?: string;
  contact?: string;
  demandeRef?: string;
  trajet?: string;
  etape?: number;
  eta?: string;
  // ── Prise en charge (exploitation) ──────────────────────────────────────
  statutPriseEnCharge?: number;
  mode?: string;
  expediteurNom?: string;
  expediteurAdresse?: string;
  expediteurTel?: string;
  destinataireNom?: string;
  destinataireAdresse?: string;
  destinataireTel?: string;
  colisNombre?: number;
  colisPoids?: number;
  colisVolume?: number;
  colisNature?: string;
  valeurDeclaree?: number;
  reglementRecu?: boolean;
  derogationDepart?: boolean;
  derogationMotif?: string;
  numeroReservation?: string;
  numeroConteneur?: string;
  notesExploitation?: string;
  priseEnChargeLe?: string;
  derniereEtapeNotifiee?: number;
  derniereNotificationLe?: string;
};
type ClientFiche = {
  _id: string;
  nom: string;
  contact?: string;
  destination?: string;
  envois?: number;
  volume?: string;
};
type Conteneur = {
  _id: string;
  _updatedAt?: string;
  reference: string;
  taille?: string;
  etat?: string;
  lieu?: string;
  prix?: string;
  statut?: number;
};
type Rotation = { _id: string; nom: string; cloture?: string; depart?: string; remplissage?: number };
type Stats = {
  volumeMoisEnCours?: string;
  progression?: string;
  barres?: { mois?: string; valeur?: number }[];
};

type Vue = 'dashboard' | 'devis' | 'expeditions' | 'clients' | 'conteneurs';

// Action principale proposée pour chaque statut (index aligné sur STATUTS_DEMANDE).
const ACTIONS_DEMANDE = [
  'Prendre en charge',
  'Marquer devis envoyé',
  'Marquer acceptée',
  "Créer l'expédition",
  "Voir l'expédition",
  'Rouvrir la demande',
];
const ACTIONS_CONTENEUR = ['Réserver', 'Marquer vendu', 'Remettre en stock'];

// Prise en charge : états d'exploitation, distincts des étapes vues par le
// client. Les index sont stockés en base — ne jamais réordonner.
const STATUTS_PEC = ['À préparer', 'Prêt', 'Expédié', 'Livré', 'Incident', 'Annulé'] as const;
const TONES_PEC = [CORAIL, CIEL, MARINE, MARINE, ROUGE, ENCRE] as const;
const MODES_ENVOI = [
  'Groupage maritime',
  'Conteneur complet',
  'Fret aérien',
  'Véhicule',
  'Routier',
] as const;
const TITRES: Record<Vue, string> = {
  dashboard: 'Tableau de bord.',
  devis: 'Demandes de devis.',
  expeditions: 'Expéditions.',
  clients: 'Clients.',
  conteneurs: "Conteneurs d'occasion.",
};

// ── Styles réutilisés ─────────────────────────────────────────────────────────
const carte: CSSProperties = {
  border: `1px solid rgba(18,57,91,0.12)`,
  borderRadius: 20,
  background: IVOIRE,
};
const eyebrow: CSSProperties = {
  fontWeight: 500,
  fontSize: 10,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: ENCRE,
};
const champ: CSSProperties = {
  fontSize: 14,
  fontFamily: SANS,
  color: MARINE,
  background: IVOIRE,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1.5px solid rgba(18,57,91,0.2)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const boutonPlein: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: 'nowrap',
  background: CORAIL,
  color: CREME,
  border: 'none',
  borderRadius: 999,
  padding: '10px 22px',
  cursor: 'pointer',
};
const boutonContour: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: 'nowrap',
  border: `1.5px solid ${MARINE}`,
  color: MARINE,
  background: 'none',
  borderRadius: 999,
  padding: '10px 22px',
  cursor: 'pointer',
};
const boutonRond: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: '1px solid rgba(18,57,91,0.2)',
  background: 'none',
  cursor: 'pointer',
  color: MARINE,
};

const badgeBase: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  padding: '5px 10px',
  borderRadius: 999,
  justifySelf: 'start',
};
const BADGES_DEMANDE: CSSProperties[] = [
  { background: 'rgba(255,111,94,0.15)', color: ROUGE }, // Nouvelle
  { background: 'rgba(255,178,62,0.2)', color: '#8A5A10' }, // En cours
  { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' }, // Devis envoyé
  { background: 'rgba(18,57,91,0.12)', color: MARINE }, // Acceptée
  { background: MARINE, color: CREME }, // Convertie
  { background: 'rgba(18,57,91,0.06)', color: ENCRE, border: '1px solid rgba(18,57,91,0.15)' }, // Refusée
];
function badgeEtape(i: number): CSSProperties {
  return {
    ...badgeBase,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    ...(i === 4
      ? { background: MARINE, color: CREME }
      : i >= 2
        ? { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' }
        : { background: CREME, color: MARINE, border: '1px solid rgba(18,57,91,0.2)' }),
  };
}
const BADGES_CONTENEUR: CSSProperties[] = [
  { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' },
  { background: 'rgba(255,178,62,0.2)', color: '#8A5A10' },
  { background: MARINE, color: CREME },
];
const AVATARS = [CORAIL, CIEL, OR, MARINE];

function IconeExport() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function fmtQuand(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slug(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Bornage des index de statut/étape (les tableaux sont des tuples fixes).
const clampDemande = (i?: number) => Math.min(5, Math.max(0, i ?? 0)) as 0 | 1 | 2 | 3 | 4 | 5;
const clampEtape = (i?: number) => Math.min(4, Math.max(0, i ?? 0)) as 0 | 1 | 2 | 3 | 4;
const clampConteneur = (i?: number) => Math.min(2, Math.max(0, i ?? 0)) as 0 | 1 | 2;
const TONES_DEMANDE = [CORAIL, OR, CIEL, MARINE, MARINE, ENCRE] as const;

// Promesse du site : réponse sous 24–48 h. Au-delà de 48 h sans devis envoyé,
// la demande est signalée en retard.
const RETARD_MS = 48 * 3600 * 1000;
function enRetard(d: Demande): boolean {
  if ((d.statut ?? 0) > 1 || !d._createdAt) return false;
  return Date.now() - new Date(d._createdAt).getTime() > RETARD_MS;
}

const dateFR = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Moyens de contact d'une demande ou d'une expédition.
//
// Depuis le 18/09/2026 les documents portent « email » et « telephone ». Les
// plus anciens n'ont qu'une chaîne libre « mail · tél (préférence : X) » :
// elle sert de secours, jamais de source principale.
type AvecContact = { email?: string; telephone?: string; contact?: string };

function extraireEmail(contact?: string): string | null {
  return contact?.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
}
function extraireTel(contact?: string): string | null {
  const m = contact?.match(/(?:\+?\d[\d ().-]{7,})/)?.[0];
  return m ? m.replace(/[^\d+]/g, '') : null;
}
function emailDe(doc?: AvecContact | null): string | null {
  return doc?.email?.trim() || extraireEmail(doc?.contact);
}
function telDe(doc?: AvecContact | null): string | null {
  const brut = doc?.telephone?.trim();
  return brut ? brut.replace(/[^\d+]/g, '') : extraireTel(doc?.contact);
}

// ── Saisie du chiffrage et de la facturation ─────────────────────────────────
// Les champs du panneau restent des chaînes pendant la saisie. La saisie et la
// valeur enregistrée passent par les mêmes conversions : c'est ce qui permet
// de savoir s'il y a vraiment quelque chose à enregistrer (« 1 250 » face à
// 1250 n'est pas une modification).
type ChampFacturation = (typeof CHAMPS_FACTURATION)[number];
type FormFacturation = Record<ChampFacturation, string>;

// Taux enregistré → valeur du select. Attention au zéro : 0 % est le taux le
// plus courant, il doit donner « 0 », pas une chaîne vide.
function tauxVersSaisie(t?: number | null): string {
  return typeof t === 'number' && Number.isFinite(t) ? String(t) : '';
}
// Valeur du select → taux ; '' → undefined (aucun taux choisi).
function lireTauxSaisi(saisie: string): number | undefined {
  return saisie === '' ? undefined : Number(saisie);
}

function facturationVersForm(d?: Facturation | null): FormFacturation {
  return Object.fromEntries(CHAMPS_FACTURATION.map((c) => [c, d?.[c] ?? ''])) as FormFacturation;
}

// Formulaire → valeurs à enregistrer : texte rogné, ou undefined si vide (le
// champ sera alors retiré du document). SIRET et TVA intracommunautaire ne
// concernent que les professionnels : ignorés sinon, donc retirés du document
// si l'opérateur repasse le client en particulier.
function facturationDeSaisie(f: FormFacturation): Facturation {
  const texte = (v: string) => v.trim() || undefined;
  const pro = f.facturationType === 'professionnel';
  return {
    facturationType:
      f.facturationType === 'particulier' || f.facturationType === 'professionnel' ? f.facturationType : undefined,
    facturationNom: texte(f.facturationNom),
    facturationAdresse: texte(f.facturationAdresse),
    facturationCodePostal: texte(f.facturationCodePostal),
    facturationVille: texte(f.facturationVille),
    facturationPays: texte(f.facturationPays),
    // Identifiants stockés sans espaces : Henrri attend les chiffres collés.
    facturationSiret: pro ? texte(f.facturationSiret.replace(/\s/g, '')) : undefined,
    facturationTvaIntracom: pro ? texte(f.facturationTvaIntracom.replace(/\s/g, '').toUpperCase()) : undefined,
  };
}

// Types de client, dans l'ordre du select ; la valeur est celle stockée.
const TYPES_CLIENT = [
  { v: 'particulier', t: 'Particulier' },
  { v: 'professionnel', t: 'Professionnel' },
] as const;
const libelleTypeClient = (t?: string): string => TYPES_CLIENT.find((x) => x.v === t)?.t ?? '';

// Libellés des champs facturation dans les exports XLSX.
const LIBELLES_FACTURATION: Record<ChampFacturation, string> = {
  facturationType: 'Type de client',
  facturationNom: 'Nom ou raison sociale',
  facturationAdresse: 'Adresse de facturation',
  facturationCodePostal: 'Code postal',
  facturationVille: 'Ville',
  facturationPays: 'Pays',
  facturationSiret: 'SIRET',
  facturationTvaIntracom: 'TVA intracom.',
};

// Exports XLSX : montants en cellules numériques (le tableur peut les
// additionner), calculés comme partout ailleurs par calculerChiffrage ;
// cellules vides si le chiffrage est incomplet. L'ancienne chaîne montantDevis
// a sa propre colonne, en texte.
function cellulesMontant(d: Demande): (number | string)[] {
  const c = calculerChiffrage(d.montantHT, d.tauxTVA);
  return c ? [c.ht, c.taux, c.tva, c.ttc] : ['', '', '', ''];
}
// Dans l'ordre de CHAMPS_FACTURATION, comme les en-têtes. Même règle que le
// PDF et lignesFacturation : le SIRET et la TVA intracommunautaire d'un client
// qui n'est pas professionnel peuvent rester en base (le Studio les masque
// sans les effacer), mais ils ne partent pas dans l'export qui prépare la
// facture.
function cellulesFacturation(d: Demande): string[] {
  const f = facturationDeSaisie(facturationVersForm(d));
  return CHAMPS_FACTURATION.map((c) => (c === 'facturationType' ? libelleTypeClient(f[c]) : (f[c] ?? '')));
}

// Champs du panneau de traitement, enregistrés par un seul bouton.
type Traitement = Pick<Demande, 'montantHT' | 'tauxTVA' | 'descriptionPrestation' | 'delaiEstime' | 'notes'> &
  Facturation;
type CleTraitement = keyof Traitement;
// Pour nommer à l'opérateur ce qui est modifié, ou ce qui a changé ailleurs.
const LIBELLES_TRAITEMENT: Record<CleTraitement, string> = {
  montantHT: 'montant HT',
  tauxTVA: 'taux de TVA',
  descriptionPrestation: 'prestation',
  delaiEstime: 'délai estimé',
  notes: 'notes internes',
  facturationType: 'type de client',
  facturationNom: 'nom de facturation',
  facturationAdresse: 'adresse de facturation',
  facturationCodePostal: 'code postal',
  facturationVille: 'ville',
  facturationPays: 'pays',
  facturationSiret: 'SIRET',
  facturationTvaIntracom: 'TVA intracom.',
};

// Deux valeurs enregistrées identiques ? Un champ absent et une chaîne vide se
// valent ; un 0 reste distinct de l'absence (0 % est un taux).
const memeValeur = (a: unknown, b: unknown) => (a ?? '') === (b ?? '');

// Réponse 409 de Sanity : la révision attendue (ifRevisionId) n'est plus celle
// du document, quelqu'un l'a modifié entre-temps.
const estConflit = (e: unknown) => (e as { statusCode?: number } | null)?.statusCode === 409;

// Projection d'une demande, partagée par le chargement et les relectures.
const PROJECTION_DEMANDE = `{_id, _rev, _createdAt, _updatedAt, reference, clientNom, email, telephone, preferenceContact, contact, typeEnvoi, destination, volume, recueLe, statut, message, montantHT, tauxTVA, montantDevis, descriptionPrestation, delaiEstime, devisEnvoyeLe, notes, expeditionRef, accuseReceptionLe, devisEnvoyeA, relanceEnvoyeeLe, ${CHAMPS_FACTURATION.join(', ')}}`;

// ── Modèles de réponse ────────────────────────────────────────────────────────
// L'API du site range les détails structurés dans le message de la demande
// (« Colis : … », « Remarques colis : … », « Départ : … ») ; lireDetail et
// messageLibre (importés de devisPdf) les relisent pour composer le
// récapitulatif, partagé entre le message et le devis PDF.
// Réponse type au client : toutes les informations de sa demande, plus le
// montant s'il a été chiffré (sinon un espace à compléter avant l'envoi).
function templateReponse(d: Demande): string {
  const colis = lireDetail(d.message, 'Colis');
  const remarques = lireDetail(d.message, 'Remarques colis');
  const depart = lireDetail(d.message, 'Départ');
  const libre = messageLibre(d.message);

  const recap = [
    d.typeEnvoi ? `- Type d'envoi : ${d.typeEnvoi}` : null,
    d.destination ? `- Destination : ${d.destination}` : null,
    depart ? `- Port de départ : ${depart}` : null,
    d.volume ? `- Volume estimé : ${d.volume}` : null,
    colis ? `- Colis (L × l × H en cm × quantité) : ${colis}` : null,
    remarques ? `- Vos remarques : ${remarques}` : null,
    libre ? `- Votre message : ${libre}` : null,
  ].filter(Boolean);

  const proposition = [
    'Notre proposition :',
    d.descriptionPrestation ? `- Prestation : ${d.descriptionPrestation}` : null,
    `- Montant : ${libelleMontant(d) ?? '[montant à compléter]'}, valable trente jours`,
    d.delaiEstime ? `- Délai estimé : ${d.delaiEstime}` : null,
  ].filter(Boolean) as string[];

  return [
    `Bonjour${d.clientNom ? ` ${d.clientNom}` : ''},`,
    '',
    `Nous vous remercions pour votre demande de devis (référence ${d.reference}${d.recueLe ? `, reçue le ${d.recueLe}` : ''}).`,
    '',
    'Récapitulatif de votre demande :',
    ...recap,
    '',
    ...proposition,
    '',
    'Vous trouverez le devis détaillé en pièce jointe. Nous vous communiquerons les prochaines dates de départ dès votre accord.',
    '',
    'Nous restons à votre disposition pour toute précision ou ajustement.',
    '',
    'Bien cordialement,',
    "L'équipe HGWF Cargo",
    'contact@hgwf-cargo.fr · 09 62 03 80 13',
    'www.hgwf-cargo.fr',
  ].join('\n');
}

// ── Composant principal ───────────────────────────────────────────────────────
export function BackOffice() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const user = useCurrentUser();

  const [vue, setVue] = useState<Vue>('dashboard');
  const [recherche, setRecherche] = useState('');
  // Filtre principal des demandes : « Nouvelle » par défaut, le travail du jour.
  const [filtre, setFiltre] = useState(0);
  const [selection, setSelection] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [clients, setClients] = useState<ClientFiche[]>([]);
  const [conteneurs, setConteneurs] = useState<Conteneur[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [clientForm, setClientForm] = useState<(Partial<ClientFiche> & { envoisTexte?: string }) | null>(null);
  const [conteneurForm, setConteneurForm] = useState<Partial<Conteneur> | null>(null);
  // Champs de traitement du panneau détail (chiffrage, facturation, notes
  // internes) : repris automatiquement dans le message de réponse et le devis
  // PDF. Montant HT et taux restent des chaînes tant qu'on saisit — un champ
  // vide n'est pas un zéro, et 0 % est un taux à part entière.
  const [montantHTEdit, setMontantHTEdit] = useState('');
  const [tauxTVAEdit, setTauxTVAEdit] = useState('');
  const [facturationEdit, setFacturationEdit] = useState<FormFacturation>(() => facturationVersForm(null));
  const [descriptionEdit, setDescriptionEdit] = useState('');
  const [delaiEdit, setDelaiEdit] = useState('');
  const [notesEdit, setNotesEdit] = useState('');
  // Verrou d'écriture du chiffrage, et l'erreur éventuelle : elle reste
  // affichée jusqu'au prochain essai, puisqu'elle demande une action.
  const [traitementEnCours, setTraitementEnCours] = useState(false);
  const [traitementErreur, setTraitementErreur] = useState<string | null>(null);
  // Demande modifiée ailleurs depuis le chargement (Studio, autre onglet) :
  // l'enregistrement ou l'envoi a été refusé, l'opérateur doit la recharger.
  const [demandeARecharger, setDemandeARecharger] = useState<string | null>(null);
  // Vue expéditions : sélection, filtre d'étape et champs éditables.
  const [selectionExp, setSelectionExp] = useState<string | null>(null);
  const [filtreExp, setFiltreExp] = useState(-1);
  const [trajetEdit, setTrajetEdit] = useState('');
  const [etaEdit, setEtaEdit] = useState('');
  // Formulaire de prise en charge : un seul objet, remis à zéro quand on
  // change d'expédition. Les nombres restent des chaînes tant qu'on saisit —
  // un champ vide n'est pas un zéro.
  type FormPec = {
    mode: string;
    expediteurNom: string;
    expediteurAdresse: string;
    expediteurTel: string;
    destinataireNom: string;
    destinataireAdresse: string;
    destinataireTel: string;
    colisNombre: string;
    colisPoids: string;
    colisVolume: string;
    colisNature: string;
    valeurDeclaree: string;
    numeroReservation: string;
    numeroConteneur: string;
    notesExploitation: string;
    derogationMotif: string;
  };
  const FORM_PEC_VIDE: FormPec = {
    mode: '',
    expediteurNom: '',
    expediteurAdresse: '',
    expediteurTel: '',
    destinataireNom: '',
    destinataireAdresse: '',
    destinataireTel: '',
    colisNombre: '',
    colisPoids: '',
    colisVolume: '',
    colisNature: '',
    valeurDeclaree: '',
    numeroReservation: '',
    numeroConteneur: '',
    notesExploitation: '',
    derogationMotif: '',
  };
  const [pec, setPec] = useState<FormPec>(FORM_PEC_VIDE);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoiMessage, setEnvoiMessage] = useState<string | null>(null);
  // Le message de succès s'efface seul au bout de trois secondes. Les messages
  // d'erreur, eux, restent : ils demandent une action.
  useEffect(() => {
    // Les messages de succès sont préfixés d'une coche ; eux seuls s'effacent.
    if (!envoiMessage?.startsWith('✓')) return;
    const t = setTimeout(() => setEnvoiMessage(null), 3000);
    return () => clearTimeout(t);
  }, [envoiMessage]);

  // Confirmation générique. Toute action irréversible ou visible du client
  // passe par là : un e-mail parti ne se rattrape pas, et un clic de travers
  // dans une liste est vite arrivé.
  const [confirmation, setConfirmation] = useState<{
    titre: string;
    texte: string;
    libelle: string;
    danger?: boolean;
    action: () => void | Promise<void>;
  } | null>(null);

  // Fenêtre de relecture avant envoi. `null` = fermée.
  const [apercu, setApercu] = useState<{
    demande: Demande;
    destinataire: string;
    objet: string;
    texte: string;
  } | null>(null);
  // Verrou d'écriture : protège du double clic et des tentatives concurrentes.
  const [pecEnCours, setPecEnCours] = useState(false);

  const charger = useCallback(async () => {
    const data = await client.fetch<{
      demandes: Demande[];
      expeditions: Expedition[];
      clients: ClientFiche[];
      conteneurs: Conteneur[];
      rotations: Rotation[];
      stats: Stats | null;
    }>(`{
      "demandes": *[_type == "demandeDevis"] | order(_createdAt desc)${PROJECTION_DEMANDE},
      "expeditions": *[_type == "expedition"] | order(_updatedAt desc){_id, _updatedAt, reference, clientNom, email, telephone, contact, demandeRef, trajet, etape, eta, statutPriseEnCharge, mode, expediteurNom, expediteurAdresse, expediteurTel, destinataireNom, destinataireAdresse, destinataireTel, colisNombre, colisPoids, colisVolume, colisNature, valeurDeclaree, reglementRecu, derogationDepart, derogationMotif, numeroReservation, numeroConteneur, notesExploitation, priseEnChargeLe, derniereEtapeNotifiee, derniereNotificationLe},
      "clients": *[_type == "clientFiche"] | order(nom asc){_id, nom, contact, destination, envois, volume},
      "conteneurs": *[_type == "conteneurOccasion"] | order(reference asc){_id, _updatedAt, reference, taille, etat, lieu, prix, statut},
      "rotations": *[_type == "rotation"] | order(cloture asc){_id, nom, cloture, depart, remplissage},
      "stats": *[_type == "statsMensuelles"][0]{volumeMoisEnCours, progression, barres[]{mois, valeur}}
    }`);
    setDemandes(data.demandes);
    setExpeditions(data.expeditions);
    setClients(data.clients);
    setConteneurs(data.conteneurs);
    setRotations(data.rotations);
    setStats(data.stats);
    setChargement(false);
  }, [client]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Une seule demande, relue dans Sanity telle qu'elle est maintenant.
  const lireDemande = (id: string) => client.fetch<Demande | null>(`*[_id == $id][0]${PROJECTION_DEMANDE}`, { id });

  const q = recherche.trim().toLowerCase();

  // ── Dérivés ──
  // Ordre pipeline : les statuts à traiter d'abord (Nouvelle → …), puis les
  // demandes closes (converties, refusées) ; à statut égal, les plus récentes.
  const demandesFiltrees = demandes
    .filter((d) => filtre === -1 || (d.statut ?? 0) === filtre)
    .filter(
      (d) =>
        !q ||
        `${d.reference}${d.clientNom ?? ''}${d.destination ?? ''}${d.typeEnvoi ?? ''}`.toLowerCase().includes(q),
    )
    .sort(
      (a, b) =>
        (a.statut ?? 0) - (b.statut ?? 0) || (b._createdAt ?? '').localeCompare(a._createdAt ?? ''),
    );
  const sel = demandes.find((d) => d._id === selection) ?? demandesFiltrees[0] ?? demandes[0] ?? null;
  const selId = sel?._id ?? null;

  // Remplit le panneau de traitement depuis une demande enregistrée.
  // L'ancienne chaîne montantDevis n'est jamais reprise dans le champ : elle
  // n'a pas de taux, et la convertir inventerait une TVA.
  const remplirTraitement = (d: Demande | null) => {
    setMontantHTEdit(montantVersSaisie(d?.montantHT));
    setTauxTVAEdit(tauxVersSaisie(d?.tauxTVA));
    setFacturationEdit(facturationVersForm(d));
    setDescriptionEdit(d?.descriptionPrestation ?? '');
    setDelaiEdit(d?.delaiEstime ?? '');
    setNotesEdit(d?.notes ?? '');
    setTraitementErreur(null);
    setDemandeARecharger(null);
  };

  // À chaque changement de demande sélectionnée, resynchronise les champs de
  // traitement (sans écraser une saisie en cours sur la même demande). Une
  // saisie non enregistrée ne se perd pas en route : choisirDemande demande
  // confirmation avant de changer de demande.
  useEffect(() => {
    remplirTraitement(selId ? (demandes.find((x) => x._id === selId) ?? null) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  // Saisie convertie : montant (undefined si vide, NaN si illisible), taux et
  // facturation telles qu'elles seraient enregistrées.
  const montantSaisi = lireMontantSaisi(montantHTEdit);
  const montantIllisible = Number.isNaN(montantSaisi);
  const tauxSaisi = lireTauxSaisi(tauxTVAEdit);
  const chiffrageSaisi = calculerChiffrage(montantSaisi, tauxSaisi);
  const facturationSaisie = facturationDeSaisie(facturationEdit);
  const proSaisi = facturationEdit.facturationType === 'professionnel';
  // Le SIRET n'est contrôlé que s'il sera enregistré, donc pour un professionnel.
  // Avertissement seulement, comme dans le Studio : un numéro incomplet ne sert
  // qu'à la facture, il n'empêche ni d'enregistrer ni d'envoyer le devis.
  const siretInvalide = proSaisi ? erreurSiret(facturationEdit.facturationSiret) : null;

  // Montant HT et taux vont ensemble : l'un sans l'autre ne donne aucun
  // chiffrage, et sur un document antérieur au 29/09/2026 la règle de lecture
  // retomberait alors sur l'ancienne chaîne montantDevis, à l'insu de
  // l'opérateur qui vient de saisir un autre prix. Bloquant pour l'envoi, le
  // PDF et les modèles. Une saisie illisible a son propre message.
  const chiffrageIncomplet = !montantIllisible && (montantSaisi !== undefined) !== (tauxSaisi !== undefined);
  // L'ancienne chaîne, telle qu'elle partirait faute de chiffrage complet.
  const ancienMontant = sel?.montantDevis?.trim() || null;
  const messageIncomplet = chiffrageIncomplet
    ? `Montant HT et taux de TVA vont ensemble : ${montantSaisi !== undefined ? 'choisissez le taux' : 'saisissez le montant HT'}${
        ancienMontant ? `, sinon le devis reprendrait l’ancien montant « ${ancienMontant} »` : ''
      }.`
    : null;
  // aUnMontant refuse un devis à 0 € : on le dit, plutôt que de réclamer un
  // montant et un taux visiblement renseignés.
  const devisAZero = chiffrageSaisi !== null && chiffrageSaisi.ht === 0;
  // Saisie qui ferait partir autre chose que ce qui est affiché : le PDF, la
  // messagerie, WhatsApp et la copie du modèle attendent qu'elle soit corrigée.
  const raisonModelesBloques = montantIllisible
    ? 'Montant HT illisible : corrigez-le d’abord.'
    : messageIncomplet;

  // Valeurs du panneau telles qu'elles seraient enregistrées.
  const traitementSaisi: Traitement = {
    montantHT: montantSaisi,
    tauxTVA: tauxSaisi,
    ...facturationSaisie,
    descriptionPrestation: descriptionEdit,
    delaiEstime: delaiEdit,
    notes: notesEdit,
  };
  // Champs modifiés et non enregistrés : la valeur en base passe par la même
  // conversion que la saisie avant comparaison. Seuls ceux-là sont écrits (voir
  // enregistrerTraitement). Un montant illisible compte comme une modification
  // (le bouton apparaît, désactivé, avec l'erreur).
  const champsModifies: CleTraitement[] = (() => {
    if (!sel) return [];
    const facturationEnBase = facturationDeSaisie(facturationVersForm(sel));
    return [
      ...(Object.is(montantSaisi, lireMontantSaisi(montantVersSaisie(sel.montantHT))) ? [] : ['montantHT' as const]),
      ...(tauxTVAEdit === tauxVersSaisie(sel.tauxTVA) ? [] : ['tauxTVA' as const]),
      ...CHAMPS_FACTURATION.filter((c) => facturationSaisie[c] !== facturationEnBase[c]),
      ...(descriptionEdit === (sel.descriptionPrestation ?? '') ? [] : ['descriptionPrestation' as const]),
      ...(delaiEdit === (sel.delaiEstime ?? '') ? [] : ['delaiEstime' as const]),
      ...(notesEdit === (sel.notes ?? '') ? [] : ['notes' as const]),
    ];
  })();
  const traitementModifie = champsModifies.length > 0;
  // Écriture proposée : les champs modifiés, plus le ménage du SIRET et de la
  // TVA intracom. restés en base sur un client qui n'est pas professionnel (le
  // Studio les masque sans les effacer). Ce ménage seul ne compte pas comme une
  // modification : il accompagne le prochain enregistrement, sans bloquer
  // l'envoi d'une demande que l'opérateur n'a pas touchée.
  const traitementAEcrire = Object.fromEntries(
    [
      ...champsModifies,
      ...(proSaisi
        ? []
        : (['facturationSiret', 'facturationTvaIntracom'] as const).filter(
            (c) => !champsModifies.includes(c) && !!sel?.[c]?.trim(),
          )),
    ].map((k) => [k, traitementSaisi[k]]),
  ) as Partial<Traitement>;

  // Une saisie commencée sur la demande affichée par défaut (aucune choisie
  // dans la liste) la fixe : sinon un changement de filtre ou une recherche
  // ferait basculer le panneau sur une autre demande, et la saisie partirait
  // avec, sans confirmation.
  useEffect(() => {
    if (traitementModifie && selId && selection !== selId) setSelection(selId);
  }, [traitementModifie, selId, selection]);

  // Changer de demande remet le panneau à zéro : une saisie non enregistrée
  // passe d'abord par la fenêtre de confirmation. `ensuite` accompagne le
  // changement (bascule de vue depuis les expéditions ou les clients).
  const choisirDemande = (id: string, ensuite?: () => void) => {
    const changer = () => {
      setSelection(id);
      ensuite?.();
    };
    if (!sel || id === sel._id || !traitementModifie) return changer();
    setConfirmation({
      titre: 'Abandonner les modifications ?',
      texte: `Modifications non enregistrées sur ${sel.reference} (${champsModifies
        .map((k) => LIBELLES_TRAITEMENT[k])
        .join(', ')}) : elles seront perdues si vous ouvrez une autre demande.`,
      libelle: 'Abandonner',
      danger: true,
      action: changer,
    });
  };

  // La demande enrichie des saisies en cours : message, PDF et modèles
  // partent avec les dernières valeurs, même avant l'enregistrement. L'e-mail
  // via l'API, lui, est rédigé côté serveur depuis Sanity : il n'est proposé
  // qu'une fois tout enregistré (voir « Répondre au client »).
  // montantDevis reste celui du document (ancienne chaîne, lecture seule).
  const selPourEnvoi: Demande | null = sel
    ? {
        ...sel,
        ...facturationSaisie,
        // Une saisie illisible ne part jamais, pas même sous forme de NaN.
        montantHT: montantIllisible ? undefined : montantSaisi,
        tauxTVA: tauxSaisi,
        descriptionPrestation: descriptionEdit.trim() || undefined,
        delaiEstime: delaiEdit.trim() || undefined,
      }
    : null;

  // Ce qui empêche l'envoi du devis par e-mail, du plus fondamental au plus
  // simple : enregistrer ne règle ni un montant illisible, ni un chiffrage
  // incomplet, ni un devis à 0 €. null : rien ne bloque.
  const raisonEnvoiBloque = montantIllisible
    ? 'Montant HT illisible : corrigez-le avant d’envoyer.'
    : messageIncomplet
      ? messageIncomplet
      : devisAZero
        ? 'Un devis à 0 € ne peut pas partir : vérifiez le montant HT.'
        : traitementModifie
          ? 'Enregistrez d’abord : l’e-mail reprend les valeurs enregistrées.'
          : !aUnMontant(selPourEnvoi)
            ? 'Renseignez le montant HT et le taux de TVA ci-dessus : ils s’insèrent automatiquement dans le message et le PDF.'
            : null;

  const kpiNouvelles = demandes.filter((d) => (d.statut ?? 0) === 0).length;
  const kpiRetard = demandes.filter(enRetard).length;
  const kpiEnvoyes = demandes.filter((d) => d.statut === 2).length;
  const kpiEnMer = expeditions.filter((x) => x.etape === 2).length;

  // ── Expéditions : liste triée (en cours d'abord) et focus client ──
  const expeditionsFiltrees = expeditions
    .filter((x) => filtreExp === -1 || clampEtape(x.etape) === filtreExp)
    .filter(
      (x) =>
        !q ||
        `${x.reference}${x.clientNom ?? ''}${x.trajet ?? ''}${x.contact ?? ''}`.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const fa = clampEtape(a.etape) >= 4 ? 1 : 0;
      const fb = clampEtape(b.etape) >= 4 ? 1 : 0;
      return fa - fb || (b._updatedAt ?? '').localeCompare(a._updatedAt ?? '');
    });
  const selExp = expeditions.find((x) => x._id === selectionExp) ?? expeditionsFiltrees[0] ?? expeditions[0] ?? null;
  const selExpId = selExp?._id ?? null;

  useEffect(() => {
    const x = selExpId ? expeditions.find((e) => e._id === selExpId) : null;
    setTrajetEdit(x?.trajet ?? '');
    setEtaEdit(x?.eta ?? '');
    const nombre = (v?: number) => (v === undefined || v === null ? '' : String(v));
    setPec({
      mode: x?.mode ?? '',
      expediteurNom: x?.expediteurNom ?? '',
      expediteurAdresse: x?.expediteurAdresse ?? '',
      expediteurTel: x?.expediteurTel ?? '',
      // Par défaut le destinataire est le client : c'est le cas courant, et
      // cela évite de resaisir ce que le dossier sait déjà.
      destinataireNom: x?.destinataireNom ?? x?.clientNom ?? '',
      destinataireAdresse: x?.destinataireAdresse ?? '',
      destinataireTel: x?.destinataireTel ?? telDe(x) ?? '',
      colisNombre: nombre(x?.colisNombre),
      colisPoids: nombre(x?.colisPoids),
      colisVolume: nombre(x?.colisVolume),
      colisNature: x?.colisNature ?? '',
      valeurDeclaree: nombre(x?.valeurDeclaree),
      numeroReservation: x?.numeroReservation ?? '',
      numeroConteneur: x?.numeroConteneur ?? '',
      notesExploitation: x?.notesExploitation ?? '',
      derogationMotif: x?.derogationMotif ?? '',
    });
    setPecEnCours(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selExpId]);

  // Tout ce que l'on sait du client de l'expédition sélectionnée : sa fiche,
  // la demande de devis d'origine et ses autres expéditions.
  const emailExp = emailDe(selExp)?.toLowerCase() ?? null;
  const clientExp = selExp
    ? (clients.find(
        (c) =>
          (emailExp && (c.contact ?? '').toLowerCase().includes(emailExp)) ||
          (selExp.clientNom && c.nom.trim().toLowerCase() === selExp.clientNom.trim().toLowerCase()),
      ) ?? null)
    : null;
  const demandeExp = selExp
    ? (demandes.find((d) => d.reference === (selExp.demandeRef ?? selExp.reference)) ?? null)
    : null;
  const historiqueExp = selExp
    ? expeditions.filter(
        (x) =>
          x._id !== selExp._id &&
          ((emailExp && emailDe(x)?.toLowerCase() === emailExp) ||
            (!!selExp.clientNom && x.clientNom === selExp.clientNom)),
      )
    : [];

  const activite = useMemo(() => {
    const evts: { texte: string; quand?: string; tone: string }[] = [];
    for (const d of demandes) {
      evts.push({
        texte: `Demande ${d.reference} — ${d.clientNom ?? '?'}, ${d.typeEnvoi ?? 'envoi'} vers ${d.destination ?? '?'} (${STATUTS_DEMANDE[clampDemande(d.statut)].toLowerCase()}).`,
        quand: d._updatedAt,
        tone: TONES_DEMANDE[clampDemande(d.statut)],
      });
    }
    for (const x of expeditions) {
      evts.push({
        texte: `${x.reference} — ${ETAPES_EXPEDITION[clampEtape(x.etape)]} (${x.trajet ?? ''}).`,
        quand: x._updatedAt,
        tone: (x.etape ?? 0) >= 4 ? MARINE : CIEL,
      });
    }
    for (const k of conteneurs) {
      if ((k.statut ?? 0) > 0) {
        evts.push({
          texte: `Conteneur ${k.reference} ${STATUTS_CONTENEUR[clampConteneur(k.statut)].toLowerCase()} (${k.lieu ?? ''}).`,
          quand: k._updatedAt,
          tone: OR,
        });
      }
    }
    return evts.sort((a, b) => (b.quand ?? '').localeCompare(a.quand ?? '')).slice(0, 5);
  }, [demandes, expeditions, conteneurs]);

  // ── Mutations : cycle de vie d'une demande ──
  // Changement de statut direct (chips du panneau détail). Le passage à
  // « Devis envoyé » horodate l'envoi s'il ne l'est pas déjà.
  const changerStatut = async (d: Demande, statut: number) => {
    const patch: Partial<Demande> = { statut };
    if (statut === 2 && !d.devisEnvoyeLe) patch.devisEnvoyeLe = dateFR();
    setDemandes((prev) => prev.map((x) => (x._id === d._id ? { ...x, ...patch } : x)));
    const r = await client.patch(d._id).set(patch).commit();
    // Nouvelle révision : le prochain enregistrement du panneau part d'elle.
    setDemandes((prev) => prev.map((x) => (x._id === d._id ? { ...x, _rev: r._rev, _updatedAt: r._updatedAt } : x)));
  };

  // Relit une demande, la remplace dans la liste et, si elle est affichée,
  // repart de cette version dans le panneau (la saisie non enregistrée est
  // abandonnée : c'est le geste demandé).
  const rechargerDemande = async (id: string): Promise<Demande | null> => {
    const relue = await lireDemande(id);
    if (relue) {
      setDemandes((prev) => prev.map((x) => (x._id === id ? relue : x)));
      if (id === selId) remplirTraitement(relue);
    }
    return relue;
  };
  // Bouton « Recharger la demande », proposé après un enregistrement ou un
  // envoi refusé parce que la demande a changé ailleurs.
  const recharger = async (id: string) => {
    try {
      await rechargerDemande(id);
      setEnvoiMessage(null);
    } catch (e) {
      setTraitementErreur(`Rechargement impossible : ${e instanceof Error ? e.message : 'erreur inattendue'}`);
    }
  };

  // Enregistre les champs du panneau que l'opérateur a modifiés (chiffrage,
  // facturation, notes), et eux seuls : la page ne se recharge pas d'elle-même,
  // et réécrire un champ intact y remettrait la valeur du chargement par-dessus
  // une saisie faite entre-temps dans le Studio. Un champ vidé est retiré du
  // document : set({ x: undefined }) n'efface rien dans Sanity, et un montant
  // resté en base alors que l'opérateur l'a effacé repartirait dans le devis.
  //
  // L'écriture exige la révision chargée (ifRevisionId). Si la demande a changé
  // ailleurs, on la relit : quand aucun des champs à écrire n'a bougé (un
  // statut, un accusé, une relance), on écrit sur la nouvelle révision ;
  // sinon rien n'est écrit, et l'opérateur recharge la demande avant de
  // reprendre. L'état local n'est mis à jour qu'après l'écriture, pour ne
  // jamais afficher comme enregistré ce que la base a refusé.
  const enregistrerTraitement = async (d: Demande, ecriture: Partial<Traitement>) => {
    if (traitementEnCours) return;
    // Dernier rempart (le bouton est déjà désactivé) : NaN ne doit jamais
    // atteindre la base, où il deviendrait null.
    const illisible = (n?: number | null) => n != null && !Number.isFinite(n);
    if (illisible(ecriture.montantHT) || illisible(ecriture.tauxTVA)) {
      setTraitementErreur('Montant HT ou taux illisible : rien n’a été enregistré.');
      return;
    }
    setTraitementEnCours(true);
    setTraitementErreur(null);
    setDemandeARecharger(null);
    try {
      // Tri par == null, jamais par vérité : un taux de 0 % s'enregistre.
      const entrees = Object.entries(ecriture);
      const aEcrire = Object.fromEntries(entrees.filter(([, v]) => v != null));
      const aRetirer = entrees.filter(([, v]) => v == null).map(([k]) => k);
      const ecrire = (revision?: string) => {
        let patch = client.patch(d._id);
        if (revision) patch = patch.ifRevisionId(revision);
        if (Object.keys(aEcrire).length > 0) patch = patch.set(aEcrire);
        if (aRetirer.length > 0) patch = patch.unset(aRetirer);
        return patch.commit();
      };
      let base = d;
      let resultat;
      try {
        resultat = await ecrire(d._rev);
      } catch (e) {
        if (!estConflit(e)) throw e;
        const relue = await lireDemande(d._id);
        if (!relue) throw new Error('demande introuvable');
        const bouges = (Object.keys(ecriture) as CleTraitement[]).filter((k) => !memeValeur(relue[k], d[k]));
        if (bouges.length > 0) {
          setDemandeARecharger(d._id);
          setTraitementErreur(
            `Demande modifiée ailleurs depuis l’ouverture de la page (${bouges
              .map((k) => LIBELLES_TRAITEMENT[k])
              .join(', ')}) : rien n’a été enregistré. Rechargez-la pour repartir de la version enregistrée.`,
          );
          return;
        }
        base = relue;
        resultat = await ecrire(relue._rev);
      }
      const suivante: Record<string, unknown> = { ...base, ...aEcrire, _rev: resultat._rev, _updatedAt: resultat._updatedAt };
      for (const k of aRetirer) delete suivante[k];
      setDemandes((prev) => prev.map((x) => (x._id === d._id ? (suivante as Demande) : x)));
      // Écrite sur une révision plus récente : les champs que l'opérateur n'a
      // pas touchés ont pu changer ailleurs, le panneau repart de la version
      // enregistrée (sinon il les proposerait comme modifiés, à l'ancienne valeur).
      if (base !== d) remplirTraitement(suivante as Demande);
    } catch (e) {
      setTraitementErreur(`Enregistrement impossible : ${e instanceof Error ? e.message : 'erreur inattendue'}`);
    } finally {
      setTraitementEnCours(false);
    }
  };

  // Conversion d'une demande acceptée : crée l'expédition liée (même
  // référence, celle que le client suit sur la page Suivi), marque la demande
  // « Convertie », et crée ou incrémente la fiche client.
  const convertirEnExpedition = async (d: Demande) => {
    const id = `expedition-${slug(d.reference)}`;
    // Le port de départ vit dans le message (« Départ : Fos / Marseille »).
    const depart = d.message?.match(/Départ : (.+)/)?.[1]?.trim() || 'Le Havre';
    const nouvelle: Expedition = {
      _id: id,
      reference: d.reference,
      clientNom: d.clientNom,
      // Les notifications d'étape écrivent à cette adresse : elle est recopiée
      // explicitement, pas redevinée depuis la chaîne lisible.
      email: emailDe(d) ?? undefined,
      telephone: telDe(d) ?? undefined,
      contact: d.contact,
      // Chiffrage et facturation restent sur la demande, relue via demandeRef :
      // une copie ici divergerait à la première correction.
      demandeRef: d.reference,
      trajet: `${depart} → ${d.destination ?? ''}`,
      etape: 0,
      eta: 'À PLANIFIER',
    };
    await client.createIfNotExists({ ...nouvelle, _type: 'expedition' });
    setExpeditions((prev) => (prev.some((x) => x._id === id) ? prev : [nouvelle, ...prev]));

    setDemandes((prev) =>
      prev.map((x) => (x._id === d._id ? { ...x, statut: 4, expeditionRef: d.reference } : x)),
    );
    const r = await client.patch(d._id).set({ statut: 4, expeditionRef: d.reference }).commit();
    setDemandes((prev) => prev.map((x) => (x._id === d._id ? { ...x, _rev: r._rev, _updatedAt: r._updatedAt } : x)));

    // Fiche client : retrouvée par e-mail (le plus fiable) sinon par nom.
    const email = emailDe(d)?.toLowerCase();
    const nom = (d.clientNom ?? '').trim();
    const existante = clients.find(
      (c) =>
        (email && (c.contact ?? '').toLowerCase().includes(email)) ||
        (nom && c.nom.trim().toLowerCase() === nom.toLowerCase()),
    );
    if (existante) {
      const envois = (existante.envois ?? 0) + 1;
      const fiche = { envois, destination: d.destination ?? existante.destination };
      setClients((prev) => prev.map((c) => (c._id === existante._id ? { ...c, ...fiche } : c)));
      await client.patch(existante._id).set(fiche).commit();
    } else if (nom) {
      const fiche = {
        nom,
        contact: d.contact ?? '',
        destination: d.destination ?? '',
        envois: 1,
        volume: d.volume ?? '',
      };
      const cree = await client.create({ _type: 'clientFiche', ...fiche });
      setClients((prev) =>
        [...prev, { _id: cree._id, ...fiche }].sort((a, b) => a.nom.localeCompare(b.nom)),
      );
    }
    setSelectionExp(id);
    setVue('expeditions');
  };

  // Ouvre la vue expéditions sur l'expédition liée à une demande.
  const ouvrirExpedition = (reference?: string) => {
    const exp = expeditions.find((x) => x.reference === reference);
    if (exp) setSelectionExp(exp._id);
    setVue('expeditions');
  };

  // Action principale contextuelle du panneau détail.
  const actionPrincipale = async (d: Demande) => {
    const statut = clampDemande(d.statut);
    if (statut === 3) return convertirEnExpedition(d);
    if (statut === 4) return ouvrirExpedition(d.expeditionRef ?? d.reference);
    if (statut === 5) return changerStatut(d, 1);
    return changerStatut(d, statut + 1);
  };

  const bougerExpedition = async (x: Expedition, delta: 1 | -1) => {
    const etape = Math.max(0, Math.min(4, (x.etape ?? 0) + delta));
    setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, etape } : e)));
    await client.patch(x._id).set({ etape }).commit();
  };

  // Prévient le client de l'étape courante. L'API refuse de notifier deux fois
  // la même étape : une correction de saisie ne renverra pas de message.
  const notifierClientExpedition = async (x: Expedition) => {
    if (envoiEnCours) return;
    const cle = await obtenirCleApi();
    if (!cle) return;
    setEnvoiEnCours(true);
    setEnvoiMessage(null);
    try {
      const rep = await appelerApi('/api/envoi-expedition', cle, { reference: x.reference });
      if (!rep) return;
      const data = (await rep.json().catch(() => ({}))) as {
        ok?: boolean;
        erreur?: string;
        destinataire?: string;
        etape?: string;
        ignore?: boolean;
      };
      if (rep.status === 401) {
        localStorage.removeItem('hgwf-cle-api');
        setEnvoiMessage('Clé refusée. Relancez pour la saisir à nouveau.');
        return;
      }
      if (!rep.ok || !data.ok) {
        setEnvoiMessage(`Échec : ${data.erreur ?? 'erreur ' + rep.status}`);
        return;
      }
      setEnvoiMessage(
        data.ignore
          ? '✓ Client déjà prévenu de cette étape — aucun message renvoyé.'
          : `✓ Client prévenu (${data.etape}) — ${data.destinataire}.`,
      );
    } catch (e) {
      setEnvoiMessage(`Échec : ${e instanceof Error ? e.message : 'erreur inattendue'}`);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // Édition du trajet et de l'ETA depuis le panneau focus.
  const enregistrerExpedition = async (x: Expedition, trajet: string, eta: string) => {
    setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, trajet, eta } : e)));
    await client.patch(x._id).set({ trajet, eta }).commit();
  };

  // ── Envoi du devis par e-mail ─────────────────────────────────────────────
  // Le PDF est fabriqué ici, dans le navigateur, puis transmis à l'API qui
  // seule connaît la clé Resend. Le back-office n'envoie que la référence et
  // le fichier : le destinataire et le texte sont reconstruits côté serveur à
  // partir de Sanity, pour que cet appel ne puisse jamais servir de relais.
  //
  // La clé partagée est demandée une fois puis conservée dans le navigateur.
  // Ce n'est pas une authentification forte — c'est ce qui empêche un tiers
  // d'appeler l'endpoint. Le Studio exige déjà une connexion Sanity.
  // Étape 1 : on demande à l'API le message tel qu'il partirait, et on l'ouvre
  // dans une fenêtre de relecture. Le texte n'est pas rédigé ici : il vient du
  // serveur, seule source de la formulation, pour qu'aperçu et envoi ne
  // puissent pas diverger.
  //
  // Le PDF joint, lui, est construit ici, depuis la demande chargée dans la
  // page. Attendre l'enregistrement ne suffit pas à les accorder : si la
  // demande a changé ailleurs depuis le chargement (Studio, autre onglet),
  // l'e-mail reprendrait le nouveau montant et le PDF l'ancien. On relit donc
  // la demande avant l'aperçu et avant l'envoi, et on refuse en cas d'écart sur
  // ce que les deux affichent : montant, prestation, délai.
  const demandePerimee = async (d: Demande): Promise<boolean> => {
    const relue = await lireDemande(d._id);
    const texte = (v?: string) => (v ?? '').trim();
    return (
      !relue ||
      JSON.stringify(lignesMontant(relue)) !== JSON.stringify(lignesMontant(d)) ||
      texte(relue.descriptionPrestation) !== texte(d.descriptionPrestation) ||
      texte(relue.delaiEstime) !== texte(d.delaiEstime)
    );
  };
  const signalerDemandePerimee = (d: Demande) => {
    setDemandeARecharger(d._id);
    setEnvoiMessage(
      'Demande modifiée ailleurs depuis l’ouverture de la page : rechargez-la avant d’envoyer le devis, pour que l’e-mail et le PDF disent la même chose.',
    );
  };

  const ouvrirApercuDevis = async (d: Demande) => {
    if (envoiEnCours) return;
    const cle = await obtenirCleApi();
    if (!cle) return;
    setEnvoiEnCours(true);
    setEnvoiMessage(null);
    try {
      if (await demandePerimee(d)) {
        signalerDemandePerimee(d);
        return;
      }
      const rep = await appelerApi('/api/envoi-devis', cle, { reference: d.reference, apercu: true });
      if (!rep) return;
      const data = (await rep.json().catch(() => ({}))) as {
        ok?: boolean;
        erreur?: string;
        destinataire?: string;
        objet?: string;
        texte?: string;
      };
      if (rep.status === 401) {
        localStorage.removeItem('hgwf-cle-api');
        setEnvoiMessage('Clé refusée. Relancez pour la saisir à nouveau.');
        return;
      }
      if (!rep.ok || !data.ok) {
        setEnvoiMessage(`Aperçu impossible : ${data.erreur ?? 'erreur ' + rep.status}`);
        return;
      }
      setApercu({
        demande: d,
        destinataire: data.destinataire ?? '',
        objet: data.objet ?? '',
        texte: data.texte ?? '',
      });
    } catch (e) {
      setEnvoiMessage(`Aperçu impossible : ${e instanceof Error ? e.message : 'erreur inattendue'}`);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const obtenirCleApi = async (): Promise<string | null> => {
    let cle = localStorage.getItem('hgwf-cle-api');
    if (!cle) {
      cle = window.prompt("Clé d'envoi du back-office (demandée une seule fois) :");
      if (!cle) return null;
      localStorage.setItem('hgwf-cle-api', cle);
    }
    return cle;
  };

  const appelerApi = async (chemin: string, cle: string, corps: unknown) => {
    const api = process.env.SANITY_STUDIO_HGWF_API_URL;
    if (!api) {
      setEnvoiMessage("URL de l'API absente (SANITY_STUDIO_HGWF_API_URL).");
      return null;
    }
    return fetch(`${api}${chemin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hgwf-cle': cle },
      body: JSON.stringify(corps),
    });
  };

  // Étape 2 : envoi effectif, avec l'objet et le texte éventuellement retouchés.
  const envoyerDevisParEmail = async (d: Demande) => {
    if (envoiEnCours) return;
    // Même convention que sanity.config.ts : la CLI Sanity injecte les
    // variables préfixées SANITY_STUDIO_ dans process.env au build.
    const cle = await obtenirCleApi();
    if (!cle) return;

    setEnvoiEnCours(true);
    setEnvoiMessage(null);
    try {
      // Dernière relecture : la demande a pu changer pendant la relecture du message.
      if (await demandePerimee(d)) {
        setApercu(null);
        signalerDemandePerimee(d);
        return;
      }
      const doc = await construireDevisPdf(d);
      const pdfBase64 = (doc.output('datauristring') as string).split(',')[1] ?? '';
      const rep = await appelerApi('/api/envoi-devis', cle, {
        reference: d.reference,
        pdfBase64,
        objet: apercu?.objet,
        texte: apercu?.texte,
      });
      if (!rep) return;
      const data = (await rep.json().catch(() => ({}))) as { ok?: boolean; erreur?: string; destinataire?: string };
      if (rep.status === 401) {
        // Clé refusée : on l'oublie, pour que la prochaine tentative redemande.
        localStorage.removeItem('hgwf-cle-api');
        setEnvoiMessage('Clé refusée. Relancez pour la saisir à nouveau.');
        return;
      }
      if (!rep.ok || !data.ok) {
        setEnvoiMessage(`Échec de l'envoi : ${data.erreur ?? 'erreur ' + rep.status}`);
        return;
      }
      setEnvoiMessage(`✓ Devis envoyé à ${data.destinataire}.`);
      setApercu(null);
      // L'API vient d'horodater l'envoi dans la demande : on la relit, pour
      // l'encart de traçabilité et pour que le prochain enregistrement parte de
      // la bonne révision. Un échec de relecture n'annule pas l'envoi réussi.
      const aJour = (await rechargerDemande(d._id).catch(() => null)) ?? d;
      // L'envoi réussi fait avancer la demande : c'est le geste métier attendu.
      if (clampDemande(aJour.statut) < 2) await changerStatut(aJour, 2);
    } catch (e) {
      setEnvoiMessage(`Échec de l'envoi : ${e instanceof Error ? e.message : 'erreur inattendue'}`);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // ── Prise en charge ───────────────────────────────────────────────────────
  // Un nombre saisi vide reste vide : on n'écrit pas 0 à la place, sinon un
  // poids non renseigné deviendrait un poids nul, ce qui n'est pas la même
  // chose et fausserait les contrôles d'éligibilité.
  const nombreOuRien = (v: string): number | undefined => {
    const t = v.trim().replace(',', '.');
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const champsPec = (f: FormPec) => ({
    mode: f.mode || undefined,
    expediteurNom: f.expediteurNom.trim() || undefined,
    expediteurAdresse: f.expediteurAdresse.trim() || undefined,
    expediteurTel: f.expediteurTel.trim() || undefined,
    destinataireNom: f.destinataireNom.trim() || undefined,
    destinataireAdresse: f.destinataireAdresse.trim() || undefined,
    destinataireTel: f.destinataireTel.trim() || undefined,
    colisNombre: nombreOuRien(f.colisNombre),
    colisPoids: nombreOuRien(f.colisPoids),
    colisVolume: nombreOuRien(f.colisVolume),
    colisNature: f.colisNature.trim() || undefined,
    valeurDeclaree: nombreOuRien(f.valeurDeclaree),
    numeroReservation: f.numeroReservation.trim() || undefined,
    numeroConteneur: f.numeroConteneur.trim() || undefined,
    notesExploitation: f.notesExploitation.trim() || undefined,
    derogationMotif: f.derogationMotif.trim() || undefined,
  });

  const enregistrerPec = async (x: Expedition) => {
    if (pecEnCours) return;
    setPecEnCours(true);
    try {
      const champs = champsPec(pec);
      setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, ...champs } : e)));
      await client.patch(x._id).set(champs).commit();
    } finally {
      setPecEnCours(false);
    }
  };

  // Ce qui manque pour que le dossier puisse être déclaré prêt. La liste est
  // affichée telle quelle à l'opérateur : un bouton désactivé sans explication
  // est la première cause d'appel au support interne.
  const manquesPec = (f: FormPec): string[] => {
    const m: string[] = [];
    if (!f.expediteurAdresse.trim()) m.push("l'adresse d'enlèvement");
    if (!f.destinataireNom.trim()) m.push('le nom du destinataire');
    if (!f.destinataireAdresse.trim()) m.push("l'adresse de destination");
    if (!f.colisNature.trim()) m.push('la nature de la marchandise');
    if (nombreOuRien(f.colisNombre) === undefined) m.push('le nombre de colis');
    if (nombreOuRien(f.colisPoids) === undefined && nombreOuRien(f.colisVolume) === undefined) {
      m.push('le poids ou le volume');
    }
    if (!f.mode) m.push("le mode d'acheminement");
    return m;
  };

  // Passage « À préparer » → « Prêt ». Enregistre le formulaire au passage :
  // l'opérateur ne doit pas avoir à sauvegarder puis déclencher.
  const declencherPriseEnCharge = async (x: Expedition) => {
    if (pecEnCours || manquesPec(pec).length > 0) return;
    setPecEnCours(true);
    try {
      const champs = {
        ...champsPec(pec),
        statutPriseEnCharge: 1,
        priseEnChargeLe: x.priseEnChargeLe ?? dateFR(),
      };
      setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, ...champs } : e)));
      await client.patch(x._id).set(champs).commit();
    } finally {
      setPecEnCours(false);
    }
  };

  // Départ de la marchandise. Règle validée le 17/09/2026 : pas de départ sans
  // règlement, sauf dérogation explicite et motivée.
  const departAutorise = (x: Expedition, f: FormPec) =>
    x.reglementRecu === true || (x.derogationDepart === true && f.derogationMotif.trim().length > 0);

  const marquerExpedie = async (x: Expedition) => {
    if (pecEnCours || !departAutorise(x, pec)) return;
    setPecEnCours(true);
    try {
      const champs = { ...champsPec(pec), statutPriseEnCharge: 2 };
      setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, ...champs } : e)));
      await client.patch(x._id).set(champs).commit();
    } finally {
      setPecEnCours(false);
    }
  };

  // Bascules booléennes : écrites immédiatement, sans passer par le formulaire.
  const basculerPec = async (x: Expedition, cle: 'reglementRecu' | 'derogationDepart', valeur: boolean) => {
    setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, [cle]: valeur } : e)));
    await client.patch(x._id).set({ [cle]: valeur }).commit();
  };

  const changerStatutPec = async (x: Expedition, statut: number) => {
    setExpeditions((prev) =>
      prev.map((e) => (e._id === x._id ? { ...e, statutPriseEnCharge: statut } : e)),
    );
    await client.patch(x._id).set({ statutPriseEnCharge: statut }).commit();
  };

  const enregistrerClient = async () => {
    const f = clientForm;
    if (!f || !f.nom?.trim()) {
      setClientForm(null);
      return;
    }
    const fiche = {
      nom: f.nom.trim(),
      contact: f.contact ?? '',
      destination: f.destination ?? '',
      envois: parseInt(f.envoisTexte ?? '') || 0,
      volume: f.volume ?? '',
    };
    if (f._id) {
      await client.patch(f._id).set(fiche).commit();
      setClients((prev) => prev.map((c) => (c._id === f._id ? { ...c, ...fiche } : c)));
    } else {
      const cree = await client.create({ _type: 'clientFiche', ...fiche });
      setClients((prev) =>
        [...prev, { _id: cree._id, ...fiche }].sort((a, b) => a.nom.localeCompare(b.nom)),
      );
    }
    setClientForm(null);
  };

  const supprimerClient = async (c: ClientFiche) => {
    if (!window.confirm(`Supprimer la fiche client « ${c.nom} » ?`)) return;
    setClients((prev) => prev.filter((x) => x._id !== c._id));
    await client.delete(c._id);
  };

  const enregistrerConteneur = async () => {
    const f = conteneurForm;
    if (!f || !f.reference?.trim()) {
      setConteneurForm(null);
      return;
    }
    const fiche = {
      reference: f.reference.trim(),
      taille: f.taille ?? '',
      etat: f.etat ?? '',
      lieu: f.lieu ?? '',
      prix: f.prix ?? '',
    };
    if (f._id) {
      await client.patch(f._id).set(fiche).commit();
      setConteneurs((prev) => prev.map((k) => (k._id === f._id ? { ...k, ...fiche } : k)));
    } else {
      const cree = await client.create({ _type: 'conteneurOccasion', ...fiche, statut: 0 });
      setConteneurs((prev) => [...prev, { _id: cree._id, ...fiche, statut: 0 }]);
    }
    setConteneurForm(null);
  };

  const supprimerConteneur = async (k: Conteneur) => {
    if (!window.confirm(`Supprimer le conteneur « ${k.reference} » ?`)) return;
    setConteneurs((prev) => prev.filter((x) => x._id !== k._id));
    await client.delete(k._id);
  };

  const cyclerConteneur = async (k: Conteneur) => {
    const statut = ((k.statut ?? 0) + 1) % 3;
    setConteneurs((prev) => prev.map((c) => (c._id === k._id ? { ...c, statut } : c)));
    await client.patch(k._id).set({ statut }).commit();
  };

  // ── Exports XLSX ──
  const exporterTout = () => {
    // En-têtes et largeurs déclarés ensemble : une colonne ajoutée ne peut
    // plus décaler les largeurs des suivantes.
    const colonnes: [string, number][] = [
      ['Référence', 17],
      ['Client', 20],
      ['Contact', 32],
      ["Type d'envoi", 22],
      ['Destination', 16],
      ['Volume', 10],
      ['Reçue le', 12],
      ['Statut', 14],
      ['Montant HT', 12],
      ['TVA %', 7],
      ['TVA €', 11],
      ['Total TTC', 12],
      ['Montant (ancien)', 16],
      ['Prestation', 40],
      ['Délai estimé', 17],
      ['Devis envoyé le', 14],
      ['Expédition', 17],
      ...CHAMPS_FACTURATION.map((c): [string, number] => [
        `Facturation — ${LIBELLES_FACTURATION[c]}`,
        c === 'facturationAdresse' ? 36 : 18,
      ]),
      ['Message', 60],
      ['Notes internes', 40],
    ];
    const rows = [
      colonnes.map(([titre]) => titre),
      ...demandes.map((d) => [
        d.reference,
        d.clientNom ?? '',
        d.contact ?? '',
        d.typeEnvoi ?? '',
        d.destination ?? '',
        d.volume ?? '',
        d.recueLe ?? '',
        STATUTS_DEMANDE[clampDemande(d.statut)],
        ...cellulesMontant(d),
        d.montantDevis ?? '',
        d.descriptionPrestation ?? '',
        d.delaiEstime ?? '',
        d.devisEnvoyeLe ?? '',
        d.expeditionRef ?? '',
        ...cellulesFacturation(d),
        d.message ?? '',
        d.notes ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = colonnes.map(([, wch]) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demandes de devis');
    XLSX.writeFile(wb, 'HGWF-demandes-devis.xlsx');
  };

  const telechargerFiche = () => {
    if (!sel) return;
    const [ht, taux, tva, ttc] = cellulesMontant(sel);
    const facturation = cellulesFacturation(sel);
    const rows: (string | number | undefined)[][] = [
      ['FICHE DE DEVIS — HGWF CARGO', ''],
      ['Référence', sel.reference],
      ['Statut', STATUTS_DEMANDE[clampDemande(sel.statut)]],
      ['Client', sel.clientNom ?? ''],
      ['Contact', sel.contact ?? ''],
      ["Type d'envoi", sel.typeEnvoi ?? ''],
      ['Destination', sel.destination ?? ''],
      ['Volume estimé', sel.volume ?? ''],
      ['Reçue le', sel.recueLe ?? ''],
      ['Montant HT', ht],
      ['TVA %', taux],
      ['TVA €', tva],
      ['Total TTC', ttc],
      ['Montant (ancien)', sel.montantDevis ?? ''],
      ['Prestation', sel.descriptionPrestation ?? ''],
      ['Délai estimé', sel.delaiEstime ?? ''],
      ['Devis envoyé le', sel.devisEnvoyeLe ?? ''],
      ['Expédition liée', sel.expeditionRef ?? ''],
      ['Message', sel.message ?? ''],
      ['Notes internes', sel.notes ?? ''],
      ['', ''],
      ['FACTURATION', ''],
      ...CHAMPS_FACTURATION.map((c, i) => [LIBELLES_FACTURATION[c], facturation[i]]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devis');
    XLSX.writeFile(wb, `${sel.reference}.xlsx`);
  };

  // ── Rendu ──
  const menu: { id: Vue; label: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'devis', label: 'Demandes de devis', badge: kpiNouvelles ? String(kpiNouvelles) : undefined },
    { id: 'expeditions', label: 'Expéditions' },
    { id: 'clients', label: 'Clients' },
    { id: 'conteneurs', label: 'Conteneurs' },
  ];

  const prochaine = rotations[0];
  const initiale = (user?.name ?? 'H').charAt(0).toUpperCase();
  const aujourdHui = new Date()
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    .toUpperCase();

  const barres = stats?.barres ?? [];
  const maxBarre = Math.max(1, ...barres.map((b) => b.valeur ?? 0));

  return (
    <div style={{ fontFamily: SANS, color: MARINE, background: IVOIRE, minHeight: '100%', display: 'flex' }}>
      <style>
        {`@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap");`}
      </style>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: MARINE,
          color: CREME,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          padding: '24px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 22px' }}>
          <img
            src="/static/embleme.svg"
            width={42}
            height={42}
            alt="HGWF Cargo"
            style={{ borderRadius: '50%', boxShadow: '0 0 0 2px rgba(251,244,230,0.35)' }}
          />
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 17, lineHeight: 1 }}>HGWF</span>
            <span style={{ fontWeight: 500, fontSize: 8, letterSpacing: '0.42em', color: OR, textTransform: 'uppercase' }}>
              Back-office
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() => setVue(m.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 14,
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: vue === m.id ? 'rgba(251,244,230,0.14)' : 'none',
                color: vue === m.id ? CREME : 'rgba(251,244,230,0.7)',
              }}
            >
              <span>{m.label}</span>
              {m.badge && (
                <span style={{ fontFamily: MONO, fontSize: 11, background: CORAIL, color: CREME, borderRadius: 999, padding: '2px 8px' }}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prochaine && (
            <div
              style={{
                background: 'rgba(251,244,230,0.1)',
                border: '1px solid rgba(251,244,230,0.2)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: OR }}>
                Prochaine clôture
              </span>
              <span style={{ fontFamily: MONO, fontSize: 13 }}>{prochaine.nom.toUpperCase()}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: CIEL }}>
                CLÔTURE {prochaine.cloture} · DÉPART {prochaine.depart}
              </span>
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(251,244,230,0.18)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: CORAIL,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {initiale}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{user?.name ?? 'Équipe HGWF'}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{user?.roles?.[0]?.title ?? 'Équipe'}</span>
            </span>
          </div>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main style={{ flex: 1, minWidth: 0, padding: '28px 40px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 26, letterSpacing: '-0.03em' }}>{TITRES[vue]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher réf, client, destination…"
              style={{ ...champ, borderRadius: 999, padding: '10px 16px', width: 280 }}
            />
            <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{aujourdHui}</span>
          </div>
        </div>

        {chargement ? (
          <p style={{ margin: 0, color: ENCRE }}>Chargement…</p>
        ) : (
          <>
            {vue === 'dashboard' && (
              <VueDashboard
                kpiNouvelles={kpiNouvelles}
                kpiRetard={kpiRetard}
                kpiEnvoyes={kpiEnvoyes}
                kpiEnMer={kpiEnMer}
                stats={stats}
                barres={barres}
                maxBarre={maxBarre}
                activite={activite}
                rotations={rotations}
                allerDevis={(statutFiltre?: number) => {
                  if (statutFiltre !== undefined) setFiltre(statutFiltre);
                  setVue('devis');
                }}
                allerExp={() => setVue('expeditions')}
              />
            )}

            {vue === 'devis' && (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ label: 'Toutes', val: -1 }, ...STATUTS_DEMANDE.map((s, i) => ({ label: s, val: i }))].map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFiltre(f.val)}
                      style={{
                        fontFamily: SANS,
                        fontWeight: 500,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        borderRadius: 999,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        ...(filtre === f.val
                          ? { background: MARINE, color: CREME, border: `1.5px solid ${MARINE}` }
                          : { background: 'none', color: MARINE, border: '1.5px solid rgba(18,57,91,0.2)' }),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={exporterTout}
                    style={{ ...boutonPlein, display: 'inline-flex', alignItems: 'center', gap: 8, background: MARINE, fontSize: 13, padding: '10px 20px' }}
                  >
                    <IconeExport />
                    Exporter tout (XLSX)
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(430px,1fr))', gap: 20, alignItems: 'start' }}>
                  <div style={{ ...carte, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Demandes reçues.</h2>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{demandesFiltrees.length} DEMANDES</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(96px,110px) minmax(0,1.2fr) minmax(0,1fr) auto',
                        gap: 12,
                        padding: '10px 24px',
                        background: CREME,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: ENCRE,
                      }}
                    >
                      <span>Réf.</span>
                      <span>Client · envoi</span>
                      <span>Destination</span>
                      <span>Statut</span>
                    </div>
                    {demandesFiltrees.map((d) => (
                      <button
                        key={d._id}
                        onClick={() => choisirDemande(d._id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(96px,110px) minmax(0,1.2fr) minmax(0,1fr) auto',
                          gap: 12,
                          alignItems: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflowWrap: 'anywhere',
                          padding: '14px 24px',
                          border: 'none',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: MARINE,
                          textAlign: 'left',
                          background: sel?._id === d._id ? CREME : IVOIRE,
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 12 }}>{d.reference}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', minWidth: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{d.clientNom}</span>
                          <span style={{ fontSize: 12, color: ENCRE }}>
                            {d.typeEnvoi} · {d.volume}
                          </span>
                        </span>
                        <span style={{ fontSize: 13, textAlign: 'left', minWidth: 0 }}>{d.destination}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span style={{ ...badgeBase, ...BADGES_DEMANDE[clampDemande(d.statut)] }}>
                            {STATUTS_DEMANDE[clampDemande(d.statut)]}
                          </span>
                          {enRetard(d) && (
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: ROUGE }}>
                              ⚠ +48 H SANS DEVIS
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                    {!demandesFiltrees.length && (
                      <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune demande.</p>
                    )}
                  </div>

                  {sel && (
                    <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24, minWidth: 0 }}>
                      <span style={eyebrow}>Détail de la demande</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: MONO, fontSize: 18 }}>{sel.reference}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {enRetard(sel) && (
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: ROUGE }}>⚠ +48 H</span>
                          )}
                          <span style={{ ...badgeBase, ...BADGES_DEMANDE[clampDemande(sel.statut)] }}>
                            {STATUTS_DEMANDE[clampDemande(sel.statut)]}
                          </span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                        <LigneDetail libelle="Client" valeur={<b>{sel.clientNom}</b>} />
                        <LigneDetail
                          libelle="Contact"
                          valeur={<span style={{ fontFamily: MONO, fontSize: 12, overflowWrap: 'anywhere', textAlign: 'right' }}>{sel.contact}</span>}
                        />
                        <LigneDetail libelle="Envoi" valeur={<b>{sel.typeEnvoi}</b>} />
                        <LigneDetail libelle="Destination" valeur={<b>{sel.destination}</b>} />
                        <LigneDetail libelle="Volume estimé" valeur={<span style={{ fontFamily: MONO }}>{sel.volume}</span>} />
                        <LigneDetail libelle="Reçue le" valeur={<span style={{ fontFamily: MONO }}>{sel.recueLe}</span>} />
                        {sel.devisEnvoyeLe && (
                          <LigneDetail libelle="Devis envoyé le" valeur={<span style={{ fontFamily: MONO }}>{sel.devisEnvoyeLe}</span>} />
                        )}
                        {/* Facturation telle qu'enregistrée (la saisie en cours
                            est dans le panneau plus bas). */}
                        {lignesFacturation(sel).length > 0 && (
                          <LigneDetail
                            libelle="Facturation"
                            valeur={
                              <span style={{ fontSize: 13, textAlign: 'right', overflowWrap: 'anywhere' }}>
                                {lignesFacturation(sel).join(' · ')}
                              </span>
                            }
                          />
                        )}
                        {sel.expeditionRef && (
                          <LigneDetail
                            libelle="Expédition liée"
                            valeur={
                              <button
                                onClick={() => ouvrirExpedition(sel.expeditionRef)}
                                style={{ fontFamily: MONO, fontSize: 13, color: MARINE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                              >
                                {sel.expeditionRef}
                              </button>
                            }
                          />
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: ENCRE, background: CREME, borderRadius: 12, padding: '12px 14px', whiteSpace: 'pre-line' }}>
                        {sel.message}
                      </p>

                      {/* Statut : accès direct à chaque étape du cycle. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={eyebrow}>Statut</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {STATUTS_DEMANDE.map((s, i) => (
                            <button
                              key={s}
                              onClick={() => changerStatut(sel, i)}
                              style={{
                                fontFamily: SANS,
                                fontWeight: 500,
                                fontSize: 12,
                                borderRadius: 999,
                                padding: '6px 12px',
                                cursor: 'pointer',
                                ...(clampDemande(sel.statut) === i
                                  ? { background: MARINE, color: CREME, border: `1.5px solid ${MARINE}` }
                                  : { background: 'none', color: MARINE, border: '1.5px solid rgba(18,57,91,0.2)' }),
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Traitement : chiffrage repris automatiquement dans le
                          message de réponse et le devis PDF. Le montant se
                          saisit HT avec son taux ; TVA et TTC se calculent,
                          ils ne se saisissent jamais. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={eyebrow}>Chiffrage du devis</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Montant HT
                            <span style={{ position: 'relative', display: 'block' }}>
                              <input
                                inputMode="decimal"
                                placeholder="ex. 1 250,00"
                                value={montantHTEdit}
                                onChange={(e) => setMontantHTEdit(e.target.value)}
                                aria-invalid={montantIllisible}
                                style={{ ...champ, paddingRight: 54, ...(montantIllisible ? { borderColor: ROUGE } : {}) }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  right: 12,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: 12,
                                  color: ENCRE,
                                  pointerEvents: 'none',
                                }}
                              >
                                € HT
                              </span>
                            </span>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            TVA
                            <select value={tauxTVAEdit} onChange={(e) => setTauxTVAEdit(e.target.value)} style={champ}>
                              <option value="">Choisir…</option>
                              {/* Un taux enregistré hors liste reste affiché tel
                                  quel plutôt que de laisser croire à « Choisir… ». */}
                              {[...new Set([...TAUX_TVA, ...(tauxSaisi !== undefined && Number.isFinite(tauxSaisi) ? [tauxSaisi] : [])])].map((t) => (
                                <option key={t} value={String(t)}>
                                  {t === 0 ? `${pourcentage(t)} — transport lié à l’export` : pourcentage(t)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {montantIllisible && (
                          <span style={{ fontSize: 12, color: ROUGE, fontWeight: 600 }}>
                            Montant illisible : saisissez un nombre, par exemple 1 250,50.
                          </span>
                        )}
                        {chiffrageSaisi && (
                          <span style={{ fontFamily: MONO, fontSize: 12, color: MARINE, background: CREME, borderRadius: 10, padding: '8px 12px' }}>
                            TVA : {euros(chiffrageSaisi.tva)} · Total TTC : {euros(chiffrageSaisi.ttc)}
                          </span>
                        )}
                        {messageIncomplet && (
                          <span style={{ fontSize: 12, color: ROUGE, fontWeight: 600 }}>
                            {messageIncomplet} L’envoi, le PDF et les modèles restent bloqués d’ici là.
                          </span>
                        )}
                        {devisAZero && (
                          <span style={{ fontSize: 12, color: ROUGE, fontWeight: 600 }}>
                            Un devis à 0 € ne peut pas partir : vérifiez le montant HT.
                          </span>
                        )}
                        {/* Ancien document : la chaîne libre n'a pas de taux,
                            elle n'est donc jamais convertie automatiquement.
                            Elle reste ce qui part tant que la saisie ne donne
                            pas un chiffrage complet, enregistré ou non : la
                            condition porte sur la saisie, pas sur montantHT
                            seul, qu'un HT sans taux suffisait à masquer. */}
                        {ancienMontant && chiffrageSaisi === null && (
                          <span style={{ fontSize: 12, color: ENCRE }}>
                            Ancien montant saisi : « {ancienMontant} ». C’est lui qui figure sur le devis tant que le
                            montant HT et son taux ne sont pas tous deux renseignés : ressaisissez-le en HT avec son
                            taux.
                          </span>
                        )}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Délai estimé
                          <input placeholder="ex. 3 à 5 semaines" value={delaiEdit} onChange={(e) => setDelaiEdit(e.target.value)} style={champ} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Description de la prestation
                          <textarea
                            placeholder="ex. Groupage maritime Le Havre → Pointe-à-Pitre, enlèvement à domicile, dédouanement inclus…"
                            value={descriptionEdit}
                            onChange={(e) => setDescriptionEdit(e.target.value)}
                            rows={2}
                            style={{ ...champ, resize: 'vertical', fontFamily: SANS }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Notes internes (jamais transmises au client)
                          <textarea
                            placeholder="Relances, particularités, accords…"
                            value={notesEdit}
                            onChange={(e) => setNotesEdit(e.target.value)}
                            rows={2}
                            style={{ ...champ, resize: 'vertical', fontFamily: SANS }}
                          />
                        </label>
                      </div>

                      {/* Facturation : collectée ici, à la validation du devis,
                          jamais dans le formulaire public. Rien n'y est
                          obligatoire pour envoyer le devis ; la liste de ce qui
                          manque prépare seulement la facture. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={eyebrow}>Facturation</span>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Type de client
                          <select
                            value={facturationEdit.facturationType}
                            onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationType: e.target.value }))}
                            style={champ}
                          >
                            <option value="">Choisir…</option>
                            {TYPES_CLIENT.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          {proSaisi
                            ? 'Raison sociale'
                            : facturationEdit.facturationType === 'particulier'
                              ? 'Nom'
                              : 'Nom ou raison sociale'}
                          <input
                            placeholder={sel.clientNom ?? ''}
                            value={facturationEdit.facturationNom}
                            onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationNom: e.target.value }))}
                            style={champ}
                          />
                        </label>
                        {/* Le nom affiché en indication n'est pas une valeur :
                            il faut le reprendre explicitement. */}
                        {!facturationEdit.facturationNom.trim() && !!sel.clientNom?.trim() && (
                          <button
                            onClick={() => setFacturationEdit((f) => ({ ...f, facturationNom: sel.clientNom?.trim() ?? '' }))}
                            style={{ ...boutonContour, alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px' }}
                          >
                            Reprendre le nom du client
                          </button>
                        )}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Adresse
                          <textarea
                            placeholder="N° et rue, complément d’adresse"
                            value={facturationEdit.facturationAdresse}
                            onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationAdresse: e.target.value }))}
                            rows={2}
                            style={{ ...champ, resize: 'vertical', fontFamily: SANS }}
                          />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 8 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Code postal
                            <input
                              value={facturationEdit.facturationCodePostal}
                              onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationCodePostal: e.target.value }))}
                              style={champ}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Ville
                            <input
                              value={facturationEdit.facturationVille}
                              onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationVille: e.target.value }))}
                              style={champ}
                            />
                          </label>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Pays
                          {/* « ex. » : un « France » grisé passait pour une
                              valeur saisie, alors que le champ restait vide. */}
                          <input
                            placeholder="ex. France"
                            value={facturationEdit.facturationPays}
                            onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationPays: e.target.value }))}
                            style={champ}
                          />
                        </label>
                        {/* Le cas courant en un clic, mais saisi explicitement. */}
                        {!facturationEdit.facturationPays.trim() && (
                          <button
                            onClick={() => setFacturationEdit((f) => ({ ...f, facturationPays: 'France' }))}
                            style={{ ...boutonContour, alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px' }}
                          >
                            Indiquer France
                          </button>
                        )}
                        {proSaisi && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                              SIRET
                              <input
                                inputMode="numeric"
                                placeholder="14 chiffres"
                                value={facturationEdit.facturationSiret}
                                onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationSiret: e.target.value }))}
                                aria-invalid={siretInvalide !== null}
                                style={{ ...champ, ...(siretInvalide ? { borderColor: ROUGE } : {}) }}
                              />
                              {siretInvalide && (
                                <span style={{ fontSize: 11, color: ROUGE, fontWeight: 600 }}>
                                  {siretInvalide} : enregistré tel quel, à corriger avant de facturer.
                                </span>
                              )}
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                              TVA intracom.
                              <input
                                placeholder="ex. FR12345678901"
                                value={facturationEdit.facturationTvaIntracom}
                                onChange={(e) => setFacturationEdit((f) => ({ ...f, facturationTvaIntracom: e.target.value }))}
                                style={champ}
                              />
                            </label>
                          </div>
                        )}
                        {(manquesFacturation(facturationSaisie).length > 0 || siretInvalide) && (
                          <span style={{ fontSize: 11, color: ENCRE }}>
                            Pour facturer
                            {manquesFacturation(facturationSaisie).length > 0
                              ? `, il manque : ${manquesFacturation(facturationSaisie).join(', ')}`
                              : ''}
                            {siretInvalide ? `${manquesFacturation(facturationSaisie).length > 0 ? ' ;' : ' :'} SIRET à corriger` : ''}.
                            Rien de bloquant pour envoyer le devis.
                          </span>
                        )}
                      </div>

                      {/* Un seul enregistrement pour le chiffrage, la facturation
                          et les notes, proposé seulement s'il y a quelque chose
                          à écrire, et limité à ce qui a été modifié. Une saisie
                          illisible n'est jamais écrite ; un SIRET mal formé
                          l'est, tel quel, comme dans le Studio. */}
                      {traitementModifie && (
                        <button
                          onClick={() => enregistrerTraitement(sel, traitementAEcrire)}
                          disabled={traitementEnCours || montantIllisible}
                          title={
                            montantIllisible
                              ? 'Montant HT illisible : corrigez-le avant d’enregistrer'
                              : `Enregistre : ${champsModifies.map((k) => LIBELLES_TRAITEMENT[k]).join(', ')}`
                          }
                          style={{
                            ...boutonContour,
                            alignSelf: 'flex-start',
                            fontSize: 13,
                            padding: '8px 18px',
                            opacity: traitementEnCours || montantIllisible ? 0.45 : 1,
                            cursor: montantIllisible ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {traitementEnCours ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      )}
                      {traitementErreur && (
                        <span style={{ fontSize: 12, color: ROUGE, fontWeight: 600 }}>{traitementErreur}</span>
                      )}
                      {traitementErreur && demandeARecharger === sel._id && (
                        <button
                          onClick={() => recharger(sel._id)}
                          style={{ ...boutonContour, alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px', borderColor: ROUGE, color: ROUGE }}
                        >
                          Recharger la demande
                        </button>
                      )}

                      {/* Réponse au client : canaux séparés — e-mail via l'API,
                          messagerie, PDF, WhatsApp. PDF et modèles partent avec
                          la saisie ci-dessus, même non enregistrée, sauf si elle
                          ferait partir autre chose que ce qui est affiché
                          (raisonModelesBloques) ; l'e-mail est rédigé côté
                          serveur depuis Sanity, il attend donc l'enregistrement,
                          et relit la demande avant de partir (demandePerimee). */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={eyebrow}>Répondre au client</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {emailDe(sel) && selPourEnvoi && (
                            <button
                              onClick={() => ouvrirApercuDevis(selPourEnvoi)}
                              disabled={envoiEnCours || raisonEnvoiBloque !== null}
                              title={raisonEnvoiBloque ?? `Envoie le devis et le PDF à ${emailDe(sel)}`}
                              style={{
                                ...boutonPlein,
                                fontSize: 13,
                                padding: '8px 16px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                opacity: envoiEnCours || raisonEnvoiBloque !== null ? 0.45 : 1,
                                cursor: raisonEnvoiBloque === null ? 'pointer' : 'not-allowed',
                              }}
                            >
                              {envoiEnCours ? '⏳ Envoi…' : '✉ Envoyer le devis'}
                            </button>
                          )}
                          {/* Un lien sans href ne se suit pas : c'est ainsi
                              qu'on désactive les deux liens ci-dessous. */}
                          {emailDe(sel) && selPourEnvoi && (
                            <a
                              href={
                                raisonModelesBloques
                                  ? undefined
                                  : `mailto:${emailDe(sel)}?subject=${encodeURIComponent(`Votre devis HGWF Cargo · ${sel.reference}`)}&body=${encodeURIComponent(templateReponse(selPourEnvoi))}`
                              }
                              aria-disabled={raisonModelesBloques ? true : undefined}
                              style={{
                                ...boutonContour,
                                fontSize: 13,
                                padding: '8px 16px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                ...(raisonModelesBloques ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                              }}
                              title={
                                raisonModelesBloques ??
                                'Repli : ouvre votre messagerie avec le message pré-rempli, sans trace ni pièce jointe'
                              }
                            >
                              Ouvrir ma messagerie
                            </a>
                          )}
                          <button
                            onClick={() => selPourEnvoi && genererDevisPdf(selPourEnvoi)}
                            disabled={raisonModelesBloques !== null}
                            style={{
                              ...boutonContour,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 13,
                              padding: '8px 16px',
                              ...(raisonModelesBloques ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                            }}
                            title={raisonModelesBloques ?? 'Télécharger le devis PDF pré-rempli, à joindre au message'}
                          >
                            <IconeExport />
                            Devis PDF
                          </button>
                          {telDe(sel) && selPourEnvoi && (
                            <a
                              href={
                                raisonModelesBloques
                                  ? undefined
                                  : `https://wa.me/${telDe(sel)?.replace(/^\+/, '').replace(/^0/, '33')}?text=${encodeURIComponent(templateReponse(selPourEnvoi))}`
                              }
                              aria-disabled={raisonModelesBloques ? true : undefined}
                              title={raisonModelesBloques ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                ...boutonContour,
                                fontSize: 13,
                                padding: '8px 16px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                ...(raisonModelesBloques ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                              }}
                            >
                              ☎ WhatsApp (modèle pré-rempli)
                            </a>
                          )}
                          <button
                            onClick={() => selPourEnvoi && navigator.clipboard.writeText(templateReponse(selPourEnvoi))}
                            disabled={raisonModelesBloques !== null}
                            style={{
                              ...boutonContour,
                              fontSize: 13,
                              padding: '8px 16px',
                              ...(raisonModelesBloques ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                            }}
                            title={raisonModelesBloques ?? 'Copier le modèle de réponse dans le presse-papiers'}
                          >
                            ⧉ Copier le modèle
                          </button>
                        </div>
                        {/* Traçabilité : ce que le client a réellement reçu, et
                            quand. Sans cet encart, il fallait fouiller les
                            journaux du serveur pour le savoir. */}
                        <div
                          style={{
                            background: CREME,
                            borderRadius: 10,
                            padding: '8px 12px',
                            fontSize: 11,
                            color: ENCRE,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                          }}
                        >
                          <span>
                            Accusé de réception :{' '}
                            {sel.accuseReceptionLe ? (
                              <strong style={{ color: MARINE }}>envoyé le {sel.accuseReceptionLe}</strong>
                            ) : (
                              <span style={{ color: ROUGE }}>non envoyé</span>
                            )}
                          </span>
                          <span>
                            Devis :{' '}
                            {sel.devisEnvoyeLe ? (
                              <strong style={{ color: MARINE }}>
                                envoyé le {sel.devisEnvoyeLe}
                                {sel.devisEnvoyeA ? ` à ${sel.devisEnvoyeA}` : ''}
                              </strong>
                            ) : (
                              'pas encore envoyé'
                            )}
                          </span>
                          <span>
                            Relance automatique :{' '}
                            {sel.relanceEnvoyeeLe ? (
                              <strong style={{ color: MARINE }}>envoyée le {sel.relanceEnvoyeeLe}</strong>
                            ) : (
                              'aucune'
                            )}
                          </span>
                        </div>
                        {envoiMessage && (
                          <span
                            style={{
                              fontSize: 12,
                              color: envoiMessage.startsWith('✓') ? MARINE : ROUGE,
                              fontWeight: 600,
                            }}
                          >
                            {envoiMessage}
                          </span>
                        )}
                        {envoiMessage && !envoiMessage.startsWith('✓') && demandeARecharger === sel._id && (
                          <button
                            onClick={() => recharger(sel._id)}
                            style={{ ...boutonContour, alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px', borderColor: ROUGE, color: ROUGE }}
                          >
                            Recharger la demande
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: ENCRE }}>
                          « Envoyer le devis » part directement depuis contact@hgwf-cargo.fr, avec le PDF en pièce
                          jointe, et fait passer la demande à « Devis envoyé ».
                          {raisonEnvoiBloque ? ` ${raisonEnvoiBloque}` : null}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 14 }}>
                        <button onClick={() => actionPrincipale(sel)} style={{ ...boutonPlein, padding: '11px 22px' }}>
                          {ACTIONS_DEMANDE[clampDemande(sel.statut)]}
                        </button>
                        {clampDemande(sel.statut) <= 3 && (
                          <button
                            onClick={() => changerStatut(sel, 5)}
                            style={{ ...boutonContour, borderColor: 'rgba(255,111,94,0.5)', color: ROUGE, padding: '11px 18px' }}
                          >
                            Refuser / sans suite
                          </button>
                        )}
                        <button onClick={telechargerFiche} style={{ ...boutonContour, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px' }}>
                          <IconeExport />
                          Fiche XLSX
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {vue === 'expeditions' && (
              <>
                {/* Filtres par étape */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ label: 'Toutes', val: -1 }, ...ETAPES_EXPEDITION.map((s, i) => ({ label: s, val: i }))].map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFiltreExp(f.val)}
                      style={{
                        fontFamily: SANS,
                        fontWeight: 500,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        borderRadius: 999,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        ...(filtreExp === f.val
                          ? { background: MARINE, color: CREME, border: `1.5px solid ${MARINE}` }
                          : { background: 'none', color: MARINE, border: '1.5px solid rgba(18,57,91,0.2)' }),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(430px,1fr))', gap: 20, alignItems: 'start' }}>
                  {/* ── Liste des expéditions ── */}
                  <div style={{ ...carte, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Expéditions.</h2>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{expeditionsFiltrees.length} EXPÉDITIONS</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(110px,130px) minmax(0,1.3fr) auto',
                        gap: 12,
                        padding: '10px 24px',
                        background: CREME,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: ENCRE,
                      }}
                    >
                      <span>Réf. · client</span>
                      <span>Trajet · ETA</span>
                      <span>Étape</span>
                    </div>
                    {expeditionsFiltrees.map((x) => (
                      <button
                        key={x._id}
                        onClick={() => setSelectionExp(x._id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(110px,130px) minmax(0,1.3fr) auto',
                          gap: 12,
                          alignItems: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflowWrap: 'anywhere',
                          padding: '14px 24px',
                          border: 'none',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: MARINE,
                          textAlign: 'left',
                          background: selExp?._id === x._id ? CREME : IVOIRE,
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontFamily: MONO, fontSize: 12 }}>{x.reference}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{x.clientNom}</span>
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                          <span style={{ fontSize: 13 }}>{x.trajet}</span>
                          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {ETAPES_EXPEDITION.map((_, k) => (
                              <span
                                key={k}
                                style={{
                                  display: 'inline-block',
                                  width: 7 + k,
                                  height: 7 + k,
                                  borderRadius: '50%',
                                  ...(k < clampEtape(x.etape)
                                    ? { background: CIEL }
                                    : k === clampEtape(x.etape)
                                      ? { background: CORAIL }
                                      : { background: 'none', border: '1.5px solid rgba(18,57,91,0.25)' }),
                                }}
                              />
                            ))}
                            <span style={{ fontFamily: MONO, fontSize: 10, color: ENCRE, marginLeft: 4 }}>ETA {x.eta}</span>
                          </span>
                        </span>
                        <span style={badgeEtape(clampEtape(x.etape))}>{ETAPES_EXPEDITION[clampEtape(x.etape)]}</span>
                      </button>
                    ))}
                    {!expeditionsFiltrees.length && (
                      <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune expédition.</p>
                    )}
                  </div>

                  {/* ── Panneau focus : l'expédition et son client ── */}
                  {selExp && (
                    <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24, minWidth: 0 }}>
                      <span style={eyebrow}>Suivi de l'expédition</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: MONO, fontSize: 18 }}>{selExp.reference}</span>
                        <span style={badgeEtape(clampEtape(selExp.etape))}>{ETAPES_EXPEDITION[clampEtape(selExp.etape)]}</span>
                      </div>

                      {/* Timeline verticale des 5 étapes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {ETAPES_EXPEDITION.map((etapeLabel, k) => {
                          const fait = k < clampEtape(selExp.etape);
                          const actif = k === clampEtape(selExp.etape);
                          return (
                            <div key={etapeLabel} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                                <span
                                  style={{
                                    width: actif ? 14 : 10,
                                    height: actif ? 14 : 10,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    marginTop: 3,
                                    ...(fait
                                      ? { background: CIEL }
                                      : actif
                                        ? { background: CORAIL, boxShadow: '0 0 0 4px rgba(255,111,94,0.2)' }
                                        : { background: 'none', border: '1.5px solid rgba(18,57,91,0.3)', boxSizing: 'border-box' }),
                                  }}
                                />
                                {k < ETAPES_EXPEDITION.length - 1 && (
                                  <span style={{ width: 2, flex: 1, minHeight: 14, background: fait ? CIEL : 'rgba(18,57,91,0.15)' }} />
                                )}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  paddingBottom: 12,
                                  fontWeight: actif ? 700 : 400,
                                  color: fait || actif ? MARINE : ENCRE,
                                }}
                              >
                                {etapeLabel}
                                {actif && selExp.eta && (
                                  <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE, marginLeft: 8 }}>ETA {selExp.eta}</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {clampEtape(selExp.etape) > 0 && (
                          <button onClick={() => bougerExpedition(selExp, -1)} style={{ ...boutonContour, fontSize: 13, padding: '9px 18px' }}>
                            ← Étape précédente
                          </button>
                        )}
                        {clampEtape(selExp.etape) < 4 ? (
                          <>
                          <button
                            onClick={() =>
                              setConfirmation({
                                titre: 'Faire avancer l’expédition ?',
                                texte: `L’étape passera à « ${ETAPES_EXPEDITION[Math.min(4, clampEtape(selExp.etape) + 1)]} ». Le client verra ce changement sur la page de suivi. Prévenez-le ensuite par e-mail si nécessaire.`,
                                libelle: 'Faire avancer',
                                action: () => bougerExpedition(selExp, 1),
                              })
                            }
                            style={{ ...boutonPlein, background: MARINE, fontSize: 13, padding: '9px 18px' }}
                          >
                            Étape suivante →
                          </button>
                          <button
                            onClick={() =>
                              setConfirmation({
                                titre: 'Prévenir le client par e-mail ?',
                                texte: `Un message partira à ${emailDe(selExp) ?? 'son adresse'} pour l’étape « ${ETAPES_EXPEDITION[clampEtape(selExp.etape)]} ». Un e-mail envoyé ne se rattrape pas.`,
                                libelle: 'Envoyer',
                                action: () => notifierClientExpedition(selExp),
                              })
                            }
                            disabled={envoiEnCours || !emailDe(selExp)}
                            title={emailDe(selExp) ? undefined : 'Aucune adresse e-mail sur cette expédition'}
                            style={{
                              ...boutonContour,
                              fontSize: 13,
                              padding: '9px 18px',
                              opacity: envoiEnCours || !emailDe(selExp) ? 0.45 : 1,
                            }}
                          >
                            {envoiEnCours ? '⏳ Envoi…' : '✉ Prévenir le client'}
                          </button>
                          </>
                        ) : (
                          <span style={{ ...badgeBase, background: MARINE, color: CREME }}>Livré ✓</span>
                        )}
                      </div>

                      {/* Trajet & ETA éditables */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 14 }}>
                        <span style={eyebrow}>Trajet & ETA</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 8 }}>
                          <input placeholder="Trajet (ex. Le Havre → Pointe-à-Pitre)" value={trajetEdit} onChange={(e) => setTrajetEdit(e.target.value)} style={champ} />
                          <input placeholder="ETA (ex. 12/09/2026)" value={etaEdit} onChange={(e) => setEtaEdit(e.target.value)} style={champ} />
                        </div>
                        {(trajetEdit !== (selExp.trajet ?? '') || etaEdit !== (selExp.eta ?? '')) && (
                          <button
                            onClick={() => enregistrerExpedition(selExp, trajetEdit, etaEdit)}
                            style={{ ...boutonContour, alignSelf: 'flex-start', fontSize: 13, padding: '8px 18px' }}
                          >
                            Enregistrer
                          </button>
                        )}
                      </div>

                      {/* ── Prise en charge ─────────────────────────────────
                          Le dossier d'exploitation : qui expédie, vers qui,
                          quoi, et à quelles conditions la marchandise part.
                          Volontairement séparé des étapes vues par le client. */}
                      {(() => {
                        const statutPec = Math.min(5, Math.max(0, selExp.statutPriseEnCharge ?? 0));
                        const manques = manquesPec(pec);
                        const peutPartir = departAutorise(selExp, pec);
                        const ligne = (
                          libelle: string,
                          cle: keyof FormPec,
                          placeholder = '',
                          multi = false,
                        ) => (
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: ENCRE }}>{libelle}</span>
                            {multi ? (
                              <textarea
                                rows={2}
                                value={pec[cle]}
                                placeholder={placeholder}
                                onChange={(e) => setPec((p) => ({ ...p, [cle]: e.target.value }))}
                                style={{ ...champ, resize: 'vertical' }}
                              />
                            ) : (
                              <input
                                value={pec[cle]}
                                placeholder={placeholder}
                                onChange={(e) => setPec((p) => ({ ...p, [cle]: e.target.value }))}
                                style={champ}
                              />
                            )}
                          </label>
                        );
                        return (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                              borderTop: '1px solid rgba(18,57,91,0.1)',
                              paddingTop: 14,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={eyebrow}>Prise en charge</span>
                              <span style={{ ...badgeBase, background: TONES_PEC[statutPec], color: CREME }}>
                                {STATUTS_PEC[statutPec]}
                              </span>
                              {selExp.priseEnChargeLe && (
                                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>
                                  déclenchée le {selExp.priseEnChargeLe}
                                </span>
                              )}
                              {selExp.derniereNotificationLe && (
                                <span style={{ fontFamily: MONO, fontSize: 11, color: MARINE }}>
                                  client prévenu le {selExp.derniereNotificationLe}
                                  {typeof selExp.derniereEtapeNotifiee === 'number'
                                    ? ` (${ETAPES_EXPEDITION[clampEtape(selExp.derniereEtapeNotifiee)]})`
                                    : ''}
                                </span>
                              )}
                            </div>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: 11, color: ENCRE }}>Mode d’acheminement</span>
                              <select
                                value={pec.mode}
                                onChange={(e) => setPec((p) => ({ ...p, mode: e.target.value }))}
                                style={champ}
                              >
                                <option value="">— à choisir —</option>
                                {MODES_ENVOI.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                              {ligne('Expéditeur — nom', 'expediteurNom')}
                              {ligne('Expéditeur — téléphone', 'expediteurTel')}
                              {ligne('Adresse d’enlèvement', 'expediteurAdresse', 'Rue, code postal, ville, pays', true)}
                              {ligne('Destinataire — nom', 'destinataireNom')}
                              {ligne('Destinataire — téléphone', 'destinataireTel')}
                              {ligne('Adresse de destination', 'destinataireAdresse', 'Rue, code postal, ville, pays', true)}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                              {ligne('Nombre de colis', 'colisNombre', 'ex. 12')}
                              {ligne('Poids total (kg)', 'colisPoids', 'ex. 480')}
                              {ligne('Volume (m³)', 'colisVolume', 'ex. 3,5')}
                              {ligne('Valeur déclarée (€)', 'valeurDeclaree', 'ex. 4000')}
                            </div>
                            {ligne('Nature de la marchandise', 'colisNature', 'Effets personnels, mobilier, véhicule…', true)}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
                              {ligne('N° de réservation (booking)', 'numeroReservation', 'Saisi à la main')}
                              {ligne('N° de conteneur ou de LTA', 'numeroConteneur')}
                            </div>
                            {ligne('Notes d’exploitation', 'notesExploitation', 'Jamais visibles du client', true)}

                            {/* Condition de départ */}
                            <div style={{ background: CREME, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <input
                                  type="checkbox"
                                  checked={selExp.reglementRecu === true}
                                  onChange={(e) => basculerPec(selExp, 'reglementRecu', e.target.checked)}
                                />
                                Règlement reçu
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: ROUGE }}>
                                <input
                                  type="checkbox"
                                  checked={selExp.derogationDepart === true}
                                  onChange={(e) => basculerPec(selExp, 'derogationDepart', e.target.checked)}
                                />
                                Autoriser le départ sans règlement
                              </label>
                              {selExp.derogationDepart && ligne('Motif de la dérogation — obligatoire', 'derogationMotif', 'Qui autorise, et pourquoi')}
                              {!peutPartir && (
                                <span style={{ fontSize: 11, color: ENCRE }}>
                                  La marchandise ne part pas tant que le règlement n’est pas encaissé. Une dérogation
                                  reste possible, à condition d’être motivée.
                                </span>
                              )}
                            </div>

                            {manques.length > 0 && statutPec === 0 && (
                              <span style={{ fontSize: 11, color: ROUGE }}>
                                Pour déclencher la prise en charge, il manque : {manques.join(', ')}.
                              </span>
                            )}

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => enregistrerPec(selExp)}
                                disabled={pecEnCours}
                                style={{ ...boutonContour, fontSize: 13, padding: '9px 18px', opacity: pecEnCours ? 0.5 : 1 }}
                              >
                                {pecEnCours ? 'Enregistrement…' : 'Enregistrer'}
                              </button>
                              {statutPec === 0 && (
                                <button
                                  onClick={() =>
                                    setConfirmation({
                                      titre: 'Déclencher la prise en charge ?',
                                      texte: 'Le dossier passera à « Prêt » et la date sera horodatée. Cette action n’envoie pas de message au client.',
                                      libelle: 'Déclencher',
                                      action: () => declencherPriseEnCharge(selExp),
                                    })
                                  }
                                  disabled={pecEnCours || manques.length > 0}
                                  title={manques.length > 0 ? `Il manque : ${manques.join(', ')}` : undefined}
                                  style={{
                                    ...boutonPlein,
                                    fontSize: 13,
                                    padding: '9px 18px',
                                    opacity: pecEnCours || manques.length > 0 ? 0.45 : 1,
                                    cursor: manques.length > 0 ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Déclencher la prise en charge
                                </button>
                              )}
                              {statutPec === 1 && (
                                <button
                                  onClick={() =>
                                    setConfirmation({
                                      titre: 'Marquer le dossier expédié ?',
                                      texte: 'La marchandise est considérée comme partie. Vérifiez que le règlement est encaissé, ou que la dérogation est motivée.',
                                      libelle: 'Marquer expédié',
                                      action: () => marquerExpedie(selExp),
                                    })
                                  }
                                  disabled={pecEnCours || !peutPartir}
                                  title={peutPartir ? undefined : 'Règlement non encaissé et aucune dérogation motivée'}
                                  style={{
                                    ...boutonPlein,
                                    background: MARINE,
                                    fontSize: 13,
                                    padding: '9px 18px',
                                    opacity: pecEnCours || !peutPartir ? 0.45 : 1,
                                    cursor: peutPartir ? 'pointer' : 'not-allowed',
                                  }}
                                >
                                  Marquer expédié
                                </button>
                              )}
                              {statutPec < 4 && (
                                <button
                                  onClick={() => changerStatutPec(selExp, 4)}
                                  style={{ ...boutonContour, borderColor: 'rgba(255,111,94,0.5)', color: ROUGE, fontSize: 13, padding: '9px 18px' }}
                                >
                                  Signaler un incident
                                </button>
                              )}
                              {statutPec >= 4 && (
                                <button
                                  onClick={() => changerStatutPec(selExp, 0)}
                                  style={{ ...boutonContour, fontSize: 13, padding: '9px 18px' }}
                                >
                                  Reprendre le dossier
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Focus client ── */}
                      <div style={{ background: CREME, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <span style={eyebrow}>Client traité</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 16,
                              color: CREME,
                              flexShrink: 0,
                              background: AVATARS[(selExp.clientNom?.length ?? 0) % AVATARS.length],
                            }}
                          >
                            {(selExp.clientNom ?? '?').charAt(0).toUpperCase()}
                          </span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{selExp.clientNom ?? 'Client inconnu'}</span>
                            <span style={{ fontSize: 12, color: ENCRE }}>
                              {clientExp
                                ? `${clientExp.envois ?? 0} envoi${(clientExp.envois ?? 0) > 1 ? 's' : ''}${clientExp.destination ? ` · habituel : ${clientExp.destination}` : ''}${clientExp.volume ? ` · ${clientExp.volume}` : ''}`
                                : 'Pas encore de fiche client'}
                            </span>
                          </span>
                        </div>
                        {selExp.contact && (
                          <span style={{ fontFamily: MONO, fontSize: 12, overflowWrap: 'anywhere', color: MARINE }}>{selExp.contact}</span>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {emailDe(selExp) && (
                            <a
                              href={`mailto:${emailDe(selExp)}?subject=${encodeURIComponent(`Votre expédition HGWF Cargo · ${selExp.reference}`)}`}
                              style={{ ...boutonContour, fontSize: 12, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                            >
                              ✉ E-mail
                            </a>
                          )}
                          {telDe(selExp) && (
                            <a
                              href={`https://wa.me/${telDe(selExp)?.replace(/^\+/, '').replace(/^0/, '33')}?text=${encodeURIComponent(`Bonjour, au sujet de votre expédition HGWF Cargo ${selExp.reference} :`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ ...boutonContour, fontSize: 12, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                            >
                              ☎ WhatsApp / appeler
                            </a>
                          )}
                        </div>

                        {/* La demande d'origine, avec le chiffrage */}
                        {demandeExp && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(18,57,91,0.12)', paddingTop: 10, fontSize: 13 }}>
                            <LigneDetail
                              libelle="Demande d'origine"
                              valeur={
                                <button
                                  onClick={() => choisirDemande(demandeExp._id, () => setVue('devis'))}
                                  style={{ fontFamily: MONO, fontSize: 12, color: MARINE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                >
                                  {demandeExp.reference}
                                </button>
                              }
                            />
                            {demandeExp.typeEnvoi && <LigneDetail libelle="Envoi" valeur={<b>{demandeExp.typeEnvoi}</b>} />}
                            {demandeExp.volume && (
                              <LigneDetail libelle="Volume" valeur={<span style={{ fontFamily: MONO }}>{demandeExp.volume}</span>} />
                            )}
                            {montantAnnonce(demandeExp) !== null && (
                              <LigneDetail
                                libelle="Montant du devis"
                                valeur={<span style={{ fontFamily: MONO, color: CORAIL, fontWeight: 700 }}>{montantAnnonce(demandeExp)}</span>}
                              />
                            )}
                            {/* La facturation vit sur la demande : relue ici,
                                jamais recopiée sur l'expédition. */}
                            {lignesFacturation(demandeExp).length > 0 && (
                              <LigneDetail
                                libelle="Facturation"
                                valeur={
                                  <span style={{ fontSize: 12, textAlign: 'right', overflowWrap: 'anywhere' }}>
                                    {lignesFacturation(demandeExp).join(' · ')}
                                  </span>
                                }
                              />
                            )}
                            {demandeExp.notes && (
                              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: ENCRE }}>{demandeExp.notes}</p>
                            )}
                          </div>
                        )}

                        {/* Historique des autres expéditions du même client */}
                        {historiqueExp.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(18,57,91,0.12)', paddingTop: 10 }}>
                            <span style={{ ...eyebrow, fontSize: 9 }}>Autres expéditions de ce client</span>
                            {historiqueExp.map((h) => (
                              <button
                                key={h._id}
                                onClick={() => setSelectionExp(h._id)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  fontFamily: 'inherit',
                                  color: MARINE,
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontFamily: MONO, fontSize: 12 }}>{h.reference}</span>
                                <span style={{ fontSize: 12, color: ENCRE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {h.trajet}
                                </span>
                                <span style={{ ...badgeEtape(clampEtape(h.etape)), fontSize: 10, padding: '3px 8px' }}>
                                  {ETAPES_EXPEDITION[clampEtape(h.etape)]}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: ENCRE }}>
                  Chaque avancement met à jour le statut visible par le client sur la page Suivi.
                </p>
              </>
            )}

            {vue === 'clients' && (
              <>
                {/* Fiche client en pop-up : identité éditable, contact direct et
                    historique complet (demandes de devis + expéditions). */}
                {clientForm && (() => {
                  const emailFiche = extraireEmail(clientForm.contact)?.toLowerCase() ?? null;
                  const nomFiche = (clientForm.nom ?? '').trim().toLowerCase();
                  const correspond = (contact?: string, nom?: string) =>
                    (emailFiche && (contact ?? '').toLowerCase().includes(emailFiche)) ||
                    (!!nomFiche && (nom ?? '').trim().toLowerCase() === nomFiche);
                  const demandesClient = clientForm._id
                    ? demandes.filter((d) => correspond(d.contact, d.clientNom))
                    : [];
                  const expedsClient = clientForm._id
                    ? expeditions.filter((x) => correspond(x.contact, x.clientNom))
                    : [];
                  return (
                    <div
                      onClick={() => setClientForm(null)}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1200,
                        background: 'rgba(6,20,34,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={clientForm._id ? `Fiche client ${clientForm.nom ?? ''}` : 'Nouveau client'}
                        style={{
                          ...carte,
                          width: 'min(680px, 100%)',
                          maxHeight: '88vh',
                          overflowY: 'auto',
                          padding: 28,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                          boxShadow: '0 28px 80px rgba(6,20,34,0.45)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 18,
                              color: CREME,
                              flexShrink: 0,
                              background: AVATARS[(clientForm.nom?.length ?? 0) % AVATARS.length],
                            }}
                          >
                            {(clientForm.nom ?? '+').charAt(0).toUpperCase()}
                          </span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={eyebrow}>{clientForm._id ? 'Fiche client' : 'Nouveau client'}</span>
                            <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
                              {clientForm.nom || 'À nommer'}
                            </span>
                          </span>
                          <button
                            onClick={() => setClientForm(null)}
                            aria-label="Fermer"
                            style={{ ...boutonRond, marginLeft: 'auto', flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Nom
                            <input value={clientForm.nom ?? ''} onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })} style={champ} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Contact (mail · tél)
                            <input value={clientForm.contact ?? ''} onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })} style={champ} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Destination habituelle
                            <input value={clientForm.destination ?? ''} onChange={(e) => setClientForm({ ...clientForm, destination: e.target.value })} style={champ} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Nombre d'envois
                            <input value={clientForm.envoisTexte ?? ''} onChange={(e) => setClientForm({ ...clientForm, envoisTexte: e.target.value })} style={champ} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                            Volume cumulé
                            <input value={clientForm.volume ?? ''} onChange={(e) => setClientForm({ ...clientForm, volume: e.target.value })} style={champ} />
                          </label>
                        </div>

                        {/* Contact direct depuis la fiche */}
                        {(extraireEmail(clientForm.contact) || extraireTel(clientForm.contact)) && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {extraireEmail(clientForm.contact) && (
                              <a
                                href={`mailto:${extraireEmail(clientForm.contact)}`}
                                style={{ ...boutonContour, fontSize: 12, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                              >
                                ✉ E-mail
                              </a>
                            )}
                            {extraireTel(clientForm.contact) && (
                              <a
                                href={`https://wa.me/${extraireTel(clientForm.contact)?.replace(/^\+/, '').replace(/^0/, '33')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ ...boutonContour, fontSize: 12, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                              >
                                ☎ WhatsApp / appeler
                              </a>
                            )}
                          </div>
                        )}

                        {/* Historique : demandes de devis du client */}
                        {demandesClient.length > 0 && (
                          <div style={{ background: CREME, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span style={{ ...eyebrow, fontSize: 9 }}>Demandes de devis ({demandesClient.length})</span>
                            {demandesClient.map((d) => (
                              <button
                                key={d._id}
                                onClick={() =>
                                  choisirDemande(d._id, () => {
                                    setClientForm(null);
                                    setVue('devis');
                                  })
                                }
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  fontFamily: 'inherit',
                                  color: MARINE,
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontFamily: MONO, fontSize: 12 }}>{d.reference}</span>
                                <span style={{ fontSize: 12, color: ENCRE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {d.destination}
                                  {montantAnnonce(d) !== null ? ` · ${montantAnnonce(d)}` : ''}
                                </span>
                                <span style={{ ...badgeBase, fontSize: 10, padding: '3px 8px', ...BADGES_DEMANDE[clampDemande(d.statut)] }}>
                                  {STATUTS_DEMANDE[clampDemande(d.statut)]}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Historique : expéditions du client */}
                        {expedsClient.length > 0 && (
                          <div style={{ background: CREME, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span style={{ ...eyebrow, fontSize: 9 }}>Expéditions ({expedsClient.length})</span>
                            {expedsClient.map((x) => (
                              <button
                                key={x._id}
                                onClick={() => {
                                  setSelectionExp(x._id);
                                  setClientForm(null);
                                  setVue('expeditions');
                                }}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  fontFamily: 'inherit',
                                  color: MARINE,
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontFamily: MONO, fontSize: 12 }}>{x.reference}</span>
                                <span style={{ fontSize: 12, color: ENCRE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {x.trajet}
                                </span>
                                <span style={{ ...badgeEtape(clampEtape(x.etape)), fontSize: 10, padding: '3px 8px' }}>
                                  {ETAPES_EXPEDITION[clampEtape(x.etape)]}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 14 }}>
                          <button onClick={enregistrerClient} style={boutonPlein}>Enregistrer</button>
                          <button onClick={() => setClientForm(null)} style={boutonContour}>Annuler</button>
                          {clientForm._id && (
                            <button
                              onClick={() => {
                                const fiche = clients.find((c) => c._id === clientForm._id);
                                if (fiche) supprimerClient(fiche);
                                setClientForm(null);
                              }}
                              style={{ ...boutonContour, marginLeft: 'auto', borderColor: 'rgba(255,111,94,0.5)', color: ROUGE }}
                            >
                              Supprimer la fiche
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ ...carte, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Clients.</h2>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{clients.length} FICHES</span>
                      <button
                        onClick={() => setClientForm({ nom: '', contact: '', destination: '', envoisTexte: '', volume: '' })}
                        style={{ ...boutonPlein, fontSize: 13, padding: '9px 18px' }}
                      >
                        + Nouveau client
                      </button>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,1fr) auto auto auto',
                      gap: 12,
                      padding: '10px 24px',
                      background: CREME,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: ENCRE,
                    }}
                  >
                    <span>Client</span>
                    <span>Contact</span>
                    <span>Destination habituelle</span>
                    <span>Envois</span>
                    <span>Volume</span>
                    <span />
                  </div>
                  {clients
                    .filter((c) => !q || `${c.nom}${c.contact ?? ''}${c.destination ?? ''}`.toLowerCase().includes(q))
                    .map((c, i) => (
                      <div
                        key={c._id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,1fr) auto auto auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '14px 24px',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13,
                              color: CREME,
                              flexShrink: 0,
                              background: AVATARS[i % AVATARS.length],
                            }}
                          >
                            {c.nom.charAt(0)}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</span>
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 0, overflowWrap: 'anywhere' }}>{c.contact}</span>
                        <span style={{ fontSize: 13, minWidth: 0 }}>{c.destination}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, textAlign: 'right' }}>{c.envois}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: ENCRE, textAlign: 'right' }}>{c.volume}</span>
                        <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setClientForm({ ...c, envoisTexte: String(c.envois ?? 0) })}
                            aria-label="Modifier"
                            title="Modifier"
                            style={boutonRond}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => supprimerClient(c)}
                            aria-label="Supprimer"
                            title="Supprimer"
                            style={{ ...boutonRond, border: '1px solid rgba(255,111,94,0.4)', color: ROUGE }}
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                    ))}
                  {!clients.length && <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune fiche client.</p>}
                </div>
              </>
            )}

            {/* Confirmation : dernier filet avant une action qui part chez le
                client ou qui ne se défait pas. */}
            {confirmation && (
              <div
                onClick={() => setConfirmation(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1400,
                  background: 'rgba(6,20,34,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: IVOIRE,
                    borderRadius: 18,
                    padding: 24,
                    width: 'min(440px, 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 16, color: MARINE }}>{confirmation.titre}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: ENCRE }}>{confirmation.texte}</span>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setConfirmation(null)}
                      style={{ ...boutonContour, fontSize: 13, padding: '9px 18px' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        const agir = confirmation.action;
                        setConfirmation(null);
                        void agir();
                      }}
                      style={{
                        ...boutonPlein,
                        ...(confirmation.danger ? { background: ROUGE, color: CREME } : {}),
                        fontSize: 13,
                        padding: '9px 20px',
                      }}
                    >
                      {confirmation.libelle}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Relecture avant envoi : on voit ce qui part, on peut le
                retoucher, et l'envoi ne se déclenche qu'ici. Le destinataire
                est affiché mais non modifiable — il vient de la fiche, jamais
                d'une saisie. */}
            {apercu && (
              <div
                onClick={() => !envoiEnCours && setApercu(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1300,
                  background: 'rgba(6,20,34,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: IVOIRE,
                    borderRadius: 18,
                    padding: 24,
                    width: 'min(680px, 100%)',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 17, color: MARINE }}>Relire avant envoi</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{apercu.demande.reference}</span>
                  </div>

                  <div style={{ background: CREME, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: ENCRE }}>
                    <div>
                      <strong style={{ color: MARINE }}>De :</strong> contact@hgwf-cargo.fr
                    </div>
                    <div>
                      <strong style={{ color: MARINE }}>À :</strong> {apercu.destinataire}
                    </div>
                    <div>
                      <strong style={{ color: MARINE }}>Pièce jointe :</strong> Devis-{apercu.demande.reference}.pdf
                    </div>
                  </div>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                    Objet
                    <input
                      value={apercu.objet}
                      onChange={(e) => setApercu({ ...apercu, objet: e.target.value })}
                      style={champ}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                    Message
                    <textarea
                      value={apercu.texte}
                      onChange={(e) => setApercu({ ...apercu, texte: e.target.value })}
                      rows={16}
                      style={{ ...champ, resize: 'vertical', fontFamily: MONO, fontSize: 12, lineHeight: 1.6 }}
                    />
                  </label>

                  <span style={{ fontSize: 11, color: ENCRE }}>
                    Les lignes vides séparent les paragraphes de la version mise en forme. Le devis PDF est joint
                    automatiquement, et la demande passera à « Devis envoyé ».
                  </span>

                  {envoiMessage && (
                    <span style={{ fontSize: 12, color: envoiMessage.startsWith('✓') ? MARINE : ROUGE, fontWeight: 600 }}>
                      {envoiMessage}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setApercu(null)}
                      disabled={envoiEnCours}
                      style={{ ...boutonContour, fontSize: 13, padding: '9px 18px' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() =>
                        setConfirmation({
                          titre: 'Envoyer le devis maintenant ?',
                          texte: `Le message et le PDF partiront à ${apercu.destinataire}. Un e-mail envoyé ne se rattrape pas.`,
                          libelle: 'Envoyer',
                          action: () => envoyerDevisParEmail(apercu.demande),
                        })
                      }
                      disabled={envoiEnCours || !apercu.objet.trim() || !apercu.texte.trim()}
                      style={{
                        ...boutonPlein,
                        fontSize: 13,
                        padding: '9px 22px',
                        opacity: envoiEnCours || !apercu.objet.trim() || !apercu.texte.trim() ? 0.45 : 1,
                      }}
                    >
                      {envoiEnCours ? 'Envoi…' : 'Envoyer maintenant'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {vue === 'conteneurs' && (
              <>
                {/* Fiche conteneur en pop-up : champs étiquetés, tailles et états
                    proposés en liste pour éviter les saisies libres ambiguës. */}
                {conteneurForm && (
                  <div
                    onClick={() => setConteneurForm(null)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 1200,
                      background: 'rgba(6,20,34,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      role="dialog"
                      aria-modal="true"
                      aria-label={conteneurForm._id ? `Conteneur ${conteneurForm.reference ?? ''}` : 'Nouveau conteneur'}
                      style={{
                        ...carte,
                        width: 'min(560px, 100%)',
                        maxHeight: '88vh',
                        overflowY: 'auto',
                        padding: 28,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        boxShadow: '0 28px 80px rgba(6,20,34,0.45)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={eyebrow}>{conteneurForm._id ? 'Modifier le conteneur' : 'Nouveau conteneur'}</span>
                          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', fontFamily: MONO }}>
                            {conteneurForm.reference || 'Référence à saisir'}
                          </span>
                        </span>
                        <button
                          onClick={() => setConteneurForm(null)}
                          aria-label="Fermer"
                          style={{ ...boutonRond, marginLeft: 'auto', flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Référence (identifiant unique)
                          <input placeholder="ex. CTN-20-130" value={conteneurForm.reference ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, reference: e.target.value })} style={champ} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Taille
                          <select value={conteneurForm.taille ?? '20 pieds'} onChange={(e) => setConteneurForm({ ...conteneurForm, taille: e.target.value })} style={champ}>
                            {[...new Set(['20 pieds', '40 pieds', conteneurForm.taille ?? '20 pieds'])].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          État général
                          <select value={conteneurForm.etat ?? 'A'} onChange={(e) => setConteneurForm({ ...conteneurForm, etat: e.target.value })} style={champ}>
                            {[
                              { v: 'A', t: 'A · très bon état' },
                              { v: 'B', t: 'B · bon état' },
                              { v: 'C', t: 'C · état correct' },
                              ...(['A', 'B', 'C'].includes(conteneurForm.etat ?? 'A')
                                ? []
                                : [{ v: conteneurForm.etat as string, t: conteneurForm.etat as string }]),
                            ].map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Lieu de stockage
                          <input placeholder="ex. Dépôt Rosny-sous-Bois" value={conteneurForm.lieu ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, lieu: e.target.value })} style={champ} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: ENCRE }}>
                          Prix de vente
                          <input placeholder="ex. 1 450 €" value={conteneurForm.prix ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, prix: e.target.value })} style={champ} />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 14 }}>
                        <button onClick={enregistrerConteneur} style={boutonPlein}>Enregistrer</button>
                        <button onClick={() => setConteneurForm(null)} style={boutonContour}>Annuler</button>
                        {conteneurForm._id && (
                          <button
                            onClick={() => {
                              const fiche = conteneurs.find((k) => k._id === conteneurForm._id);
                              if (fiche) supprimerConteneur(fiche);
                              setConteneurForm(null);
                            }}
                            style={{ ...boutonContour, marginLeft: 'auto', borderColor: 'rgba(255,111,94,0.5)', color: ROUGE }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setConteneurForm({ reference: '', taille: '20 pieds', etat: 'A', lieu: 'Dépôt Rosny-sous-Bois', prix: '' })}
                    style={{ ...boutonPlein, fontSize: 13, padding: '9px 18px' }}
                  >
                    + Ajouter un conteneur
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                  {conteneurs
                    .filter((k) => !q || `${k.reference}${k.taille ?? ''}${k.lieu ?? ''}`.toLowerCase().includes(q))
                    .map((k) => (
                      <div key={k._id} style={{ ...carte, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: MONO, fontSize: 14 }}>{k.reference}</span>
                          <span style={{ ...badgeBase, padding: '4px 10px', ...BADGES_CONTENEUR[k.statut ?? 0] }}>
                            {STATUTS_CONTENEUR[k.statut ?? 0]}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>
                          {k.taille} · état {k.etat}
                        </span>
                        <span style={{ fontSize: 13, color: ENCRE }}>{k.lieu}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: MONO, fontSize: 18, color: CORAIL }}>{k.prix}</span>
                          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => setConteneurForm(k)} aria-label="Modifier" title="Modifier" style={boutonRond}>
                              ✎
                            </button>
                            <button
                              onClick={() => supprimerConteneur(k)}
                              aria-label="Supprimer"
                              title="Supprimer"
                              style={{ ...boutonRond, border: '1px solid rgba(255,111,94,0.4)', color: ROUGE }}
                            >
                              ✕
                            </button>
                            <button onClick={() => cyclerConteneur(k)} style={{ ...boutonContour, fontSize: 13, padding: '8px 16px' }}>
                              {ACTIONS_CONTENEUR[k.statut ?? 0]}
                            </button>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {!conteneurs.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Aucun conteneur en stock.</p>}
                <p style={{ margin: 0, fontSize: 12, color: ENCRE }}>
                  Stock « dernier voyage » — Disponible → Réservé → Vendu (cliquer pour changer l'état).
                </p>
              </>
            )}
          </>
        )}

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 12,
            color: ENCRE,
            borderTop: '1px solid rgba(18,57,91,0.1)',
            paddingTop: 16,
          }}
        >
          <span>Back-office HGWF Cargo.</span>
          <a href="https://www.hgwf-cargo.fr/fr/" target="_blank" rel="noreferrer" style={{ fontWeight: 500, textDecoration: 'underline', color: MARINE }}>
            Voir le site public
          </a>
        </div>
      </main>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────
function LigneDetail({ libelle, valeur }: { libelle: string; valeur: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: ENCRE, flexShrink: 0 }}>{libelle}</span>
      {valeur}
    </div>
  );
}

function VueDashboard({
  kpiNouvelles,
  kpiRetard,
  kpiEnvoyes,
  kpiEnMer,
  stats,
  barres,
  maxBarre,
  activite,
  rotations,
  allerDevis,
  allerExp,
}: {
  kpiNouvelles: number;
  kpiRetard: number;
  kpiEnvoyes: number;
  kpiEnMer: number;
  stats: Stats | null;
  barres: { mois?: string; valeur?: number }[];
  maxBarre: number;
  activite: { texte: string; quand?: string; tone: string }[];
  rotations: Rotation[];
  allerDevis: (statutFiltre?: number) => void;
  allerExp: () => void;
}) {
  const kpiStyle: CSSProperties = {
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: SANS,
    ...carte,
    borderRadius: 16,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
        <button onClick={() => allerDevis(0)} style={kpiStyle}>
          <span style={eyebrow}>Nouvelles demandes</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: CORAIL }}>{kpiNouvelles}</span>
          <span style={{ fontSize: 12, color: kpiRetard ? ROUGE : ENCRE, fontWeight: kpiRetard ? 700 : 400 }}>
            {kpiRetard ? `⚠ ${kpiRetard} en retard (+48 h)` : 'à traiter sous 24–48 h'}
          </span>
        </button>
        <button onClick={() => allerDevis(2)} style={kpiStyle}>
          <span style={eyebrow}>Devis envoyés</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: MARINE }}>{kpiEnvoyes}</span>
          <span style={{ fontSize: 12, color: ENCRE }}>en attente de réponse</span>
        </button>
        <button onClick={allerExp} style={kpiStyle}>
          <span style={eyebrow}>En mer</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: CIEL }}>{kpiEnMer}</span>
          <span style={{ fontSize: 12, color: ENCRE }}>conteneurs suivis</span>
        </button>
        <div style={{ ...kpiStyle, cursor: 'default', background: MARINE, border: 'none', color: CREME }}>
          <span style={{ ...eyebrow, color: OR }}>Volume expédié — mois en cours</span>
          <span style={{ fontFamily: MONO, fontSize: 30 }}>{stats?.volumeMoisEnCours ?? '—'}</span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>{stats?.progression ?? ''}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, alignItems: 'start' }}>
        <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Volumes expédiés (m³).</h2>
            <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{barres.length} DERNIERS MOIS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 160 }}>
            {barres.map((b, i) => (
              <div key={b.mois ?? i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{b.valeur}</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    maxWidth: 44,
                    borderRadius: '8px 8px 4px 4px',
                    height: Math.round(((b.valeur ?? 0) / maxBarre) * 96),
                    background: i === barres.length - 1 ? CORAIL : CIEL,
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{b.mois}</span>
              </div>
            ))}
            {!barres.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Renseignez les statistiques mensuelles.</p>}
          </div>
        </div>
        <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Activité récente.</h2>
          {activite.map((a) => (
            <div key={a.texte} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: '1px solid rgba(18,57,91,0.08)', paddingTop: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: a.tone }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>{a.texte}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{fmtQuand(a.quand)}</span>
              </span>
            </div>
          ))}
          {!activite.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Aucune activité pour l'instant.</p>}
        </div>
      </div>

      <div style={{ ...carte, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)' }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Prochaines rotations.</h2>
        </div>
        {rotations.map((r) => {
          const plein = (r.remplissage ?? 0) >= 75;
          return (
            <div
              key={r._id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) auto',
                gap: 14,
                alignItems: 'center',
                padding: '14px 24px',
                borderTop: '1px solid rgba(18,57,91,0.08)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{r.nom}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: CORAIL }}>CLÔTURE {r.cloture}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: ENCRE }}>DÉPART {r.depart}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  padding: '5px 12px',
                  borderRadius: 999,
                  ...(plein
                    ? { background: 'rgba(255,111,94,0.15)', color: ROUGE }
                    : { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' }),
                }}
              >
                {r.remplissage ?? 0} %
              </span>
            </div>
          );
        })}
        {!rotations.length && <p style={{ margin: 0, padding: '16px 24px', fontSize: 13, color: ENCRE }}>Aucune rotation planifiée.</p>}
      </div>
    </div>
  );
}
