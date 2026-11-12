/**
 * Filtres de la liste des dossiers, à l'intérieur d'une vue : l'étape précise
 * du dossier (plus fine que la phase : « En attente du client » se distingue
 * de « À chiffrer »), le type d'envoi et un texte libre (client, référence,
 * destination, contact). Fonctions pures, sans React.
 */
import { complementEnAttente } from '../../domaine/complements';
import { phaseDe } from '../../domaine/phases';
import type { Dossier } from '../../domaine/types';

export type Etape =
  | 'nouvelle'
  | 'aChiffrer'
  | 'complements'
  | 'reponseRecue'
  | 'devisEnvoye'
  | 'accepte'
  | 'aPreparer'
  | 'pret'
  | 'enRoute'
  | 'incident'
  | 'livre'
  | 'annule'
  | 'sansSuite';

/** Ordre du parcours d'un dossier : c'est l'ordre des boutons de filtre. */
const ORDRE: Etape[] = [
  'nouvelle',
  'aChiffrer',
  'complements',
  'reponseRecue',
  'devisEnvoye',
  'accepte',
  'aPreparer',
  'pret',
  'enRoute',
  'incident',
  'livre',
  'annule',
  'sansSuite',
];

export const LIBELLES_ETAPE: Record<Etape, string> = {
  nouvelle: 'Nouvelles demandes',
  aChiffrer: 'À chiffrer',
  complements: 'En attente du client',
  reponseRecue: 'Réponse reçue',
  devisEnvoye: 'Devis envoyé',
  accepte: 'Acceptés, à lancer',
  aPreparer: 'À préparer',
  pret: 'Prêts à partir',
  enRoute: 'En route',
  incident: 'Incidents',
  livre: 'Livrés',
  annule: 'Annulés',
  sansSuite: 'Sans suite',
};

export const TOUTES = 'toutes';
export const TOUS = '';

export interface Filtres {
  texte: string;
  /** `TOUTES` ou une étape. */
  etape: Etape | typeof TOUTES;
  /** `TOUS` (chaîne vide) ou un type d'envoi tel qu'écrit dans les demandes. */
  typeEnvoi: string;
}

export const FILTRES_VIDES: Filtres = { texte: '', etape: TOUTES, typeEnvoi: TOUS };

/** Étape précise : « À chiffrer » dont les compléments sont demandés et sans réponse = « En attente du client ». */
export function etapeDe(dossier: Dossier): Etape {
  const phase = phaseDe(dossier);
  if (phase === 'aChiffrer' && complementEnAttente(dossier)) return 'complements';
  if (phase === 'devisPartiStatutACorriger' || phase === 'devisHorsOutil') return 'devisEnvoye';
  return phase;
}

/** Minuscules sans accents : « Lomé » se trouve en tapant « lome ». */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function typeEnvoiDe(dossier: Dossier): string {
  return (dossier.demande?.typeEnvoi ?? '').trim();
}

function texteDe(dossier: Dossier): string {
  const d = dossier.demande;
  const x = dossier.expedition;
  return normaliser(
    [
      d?.clientNom,
      d?.reference,
      d?.email,
      d?.telephone,
      d?.destination,
      d?.typeEnvoi,
      d?.volume,
      x?.clientNom,
      x?.reference,
      x?.trajet,
      x?.destinataireNom,
      x?.numeroConteneur,
      x?.numeroReservation,
    ]
      .filter((v): v is string => typeof v === 'string')
      .join(' '),
  );
}

/** Chaque mot tapé doit se trouver quelque part dans le dossier (« dupont dakar »). */
function correspondTexte(dossier: Dossier, texte: string): boolean {
  const mots = normaliser(texte).split(' ').filter(Boolean);
  if (mots.length === 0) return true;
  const contenu = texteDe(dossier);
  return mots.every((m) => contenu.includes(m));
}

/** Applique le texte et le type d'envoi (pas l'étape : ses compteurs en dépendent). */
export function filtrerSansEtape(dossiers: readonly Dossier[], f: Filtres): Dossier[] {
  return dossiers.filter(
    (d) => correspondTexte(d, f.texte) && (f.typeEnvoi === TOUS || normaliser(typeEnvoiDe(d)) === normaliser(f.typeEnvoi)),
  );
}

export function filtrer(dossiers: readonly Dossier[], f: Filtres): Dossier[] {
  const base = filtrerSansEtape(dossiers, f);
  return f.etape === TOUTES ? base : base.filter((d) => etapeDe(d) === f.etape);
}

/** Étapes présentes dans la liste, dans l'ordre du parcours, avec leur nombre. */
export function etapesPresentes(dossiers: readonly Dossier[]): { id: Etape; libelle: string; nombre: number }[] {
  const compte = new Map<Etape, number>();
  for (const d of dossiers) {
    const e = etapeDe(d);
    compte.set(e, (compte.get(e) ?? 0) + 1);
  }
  return ORDRE.filter((e) => compte.has(e)).map((e) => ({ id: e, libelle: LIBELLES_ETAPE[e], nombre: compte.get(e) ?? 0 }));
}

/** Types d'envoi présents (écritures voisines regroupées), du plus fréquent au plus rare. */
export function typesEnvoiPresents(dossiers: readonly Dossier[]): { valeur: string; nombre: number }[] {
  const groupes = new Map<string, { valeur: string; nombre: number }>();
  for (const d of dossiers) {
    const t = typeEnvoiDe(d);
    if (!t) continue;
    const cle = normaliser(t);
    const g = groupes.get(cle);
    if (g) g.nombre += 1;
    else groupes.set(cle, { valeur: t, nombre: 1 });
  }
  return [...groupes.values()].sort((a, b) => b.nombre - a.nombre || a.valeur.localeCompare(b.valeur, 'fr'));
}

export function filtresActifs(f: Filtres): boolean {
  return f.texte.trim() !== '' || f.etape !== TOUTES || f.typeEnvoi !== TOUS;
}
