/**
 * Fiches services : passage entre le document Sanity et l'état du formulaire
 * (module pur). Tout est du texte dans le formulaire ; la conversion en liste,
 * en nombre ou en lignes de tarif se fait ici, à l'enregistrement, avec un
 * message précis quand une valeur est illisible.
 */
import type { ChampFiche } from '../../actions/fiches';
import type { Fiche } from '../../domaine/types';

export type Ligne = { _key: string } & Record<string, string>;

export const CHAMPS_TEXTE = ['titre', 'resume', 'methodeTarif', 'modeleDescription', 'modeleMessage', 'modeleNote'] as const;
export const CHAMPS_LISTE = [
  'libellesFormulaire',
  'inclus',
  'nonInclus',
  'documents',
  'infosAObtenir',
  'vigilance',
  'aCompleter',
] as const;
export const CHAMPS_LIGNES = ['grille', 'fraisAnnexes', 'delais'] as const;

export type ChampEdition = (typeof CHAMPS_TEXTE)[number] | (typeof CHAMPS_LISTE)[number] | (typeof CHAMPS_LIGNES)[number] | 'ordre' | 'tauxTVADefaut';

export type EtatFiche = {
  [C in (typeof CHAMPS_TEXTE)[number] | (typeof CHAMPS_LISTE)[number] | 'ordre' | 'tauxTVADefaut']: string;
} & { [C in (typeof CHAMPS_LIGNES)[number]]: Ligne[] };

/** Colonnes de chaque tableau de lignes (clé du champ Sanity, libellé, nombre ou texte). */
export type Colonne = { cle: string; libelle: string; nombre?: boolean };
export const COLONNES_TARIF: Colonne[] = [
  { cle: 'designation', libelle: 'Désignation' },
  { cle: 'unite', libelle: 'Unité' },
  { cle: 'prixHT', libelle: 'Prix HT (€)', nombre: true },
  { cle: 'note', libelle: 'Précision' },
];
export const COLONNES_DELAIS: Colonne[] = [
  { cle: 'zone', libelle: 'Zone / destination' },
  { cle: 'delai', libelle: 'Délai' },
];
const COLONNES: Record<(typeof CHAMPS_LIGNES)[number], { colonnes: Colonne[]; type: string }> = {
  grille: { colonnes: COLONNES_TARIF, type: 'ligneTarif' },
  fraisAnnexes: { colonnes: COLONNES_TARIF, type: 'ligneTarif' },
  delais: { colonnes: COLONNES_DELAIS, type: 'delaiZone' },
};

let compteurCle = 0;
export const nouvelleCle = (): string => `l${Date.now().toString(36)}${(compteurCle += 1).toString(36)}`;

export const ligneVide = (colonnes: Colonne[]): Ligne =>
  Object.fromEntries([['_key', nouvelleCle()], ...colonnes.map((c) => [c.cle, ''])]) as Ligne;

const enTexte = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v).replace('.', ',') : '');

function lignesDe(brut: unknown, colonnes: Colonne[]): Ligne[] {
  if (!Array.isArray(brut)) return [];
  return brut.map((l: Record<string, unknown>) => {
    const ligne = ligneVide(colonnes);
    if (typeof l?._key === 'string' && l._key) ligne._key = l._key;
    for (const c of colonnes) ligne[c.cle] = enTexte(l?.[c.cle]);
    return ligne;
  });
}

export function depuisFiche(f: Fiche): EtatFiche {
  const src = f as unknown as Record<string, unknown>;
  const etat: Record<string, unknown> = {};
  for (const c of CHAMPS_TEXTE) etat[c] = enTexte(src[c]);
  for (const c of CHAMPS_LISTE) etat[c] = Array.isArray(src[c]) ? (src[c] as unknown[]).filter((x) => typeof x === 'string').join('\n') : '';
  for (const c of CHAMPS_LIGNES) etat[c] = lignesDe(src[c], COLONNES[c].colonnes);
  etat.ordre = enTexte(src.ordre);
  etat.tauxTVADefaut = typeof src.tauxTVADefaut === 'number' ? String(src.tauxTVADefaut) : '';
  return etat as EtatFiche;
}

/** Nombre saisi (virgule ou point). `null` = vide ; `undefined` = illisible. */
export function lireNombre(texte: string): number | null | undefined {
  const t = texte.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export type ValeurChamp = { valeur: unknown } | { erreur: string };

/** Valeur à écrire pour un champ, ou le message qui explique pourquoi on ne l'écrit pas. */
export function versValeur(champ: ChampEdition, etat: EtatFiche): ValeurChamp {
  if (champ === 'titre') {
    return etat.titre.trim() ? { valeur: etat.titre.trim() } : { erreur: 'Le nom du service est obligatoire.' };
  }
  if (champ === 'ordre') {
    const n = lireNombre(etat.ordre);
    return n === undefined ? { erreur: 'L’ordre doit être un nombre.' } : { valeur: n };
  }
  if (champ === 'tauxTVADefaut') return { valeur: etat.tauxTVADefaut === '' ? null : Number(etat.tauxTVADefaut) };
  if ((CHAMPS_LISTE as readonly string[]).includes(champ)) {
    const texte = etat[champ as (typeof CHAMPS_LISTE)[number]];
    return { valeur: texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) };
  }
  if ((CHAMPS_LIGNES as readonly string[]).includes(champ)) {
    const def = COLONNES[champ as (typeof CHAMPS_LIGNES)[number]];
    const sortie: Record<string, unknown>[] = [];
    for (const ligne of etat[champ as (typeof CHAMPS_LIGNES)[number]]) {
      const out: Record<string, unknown> = { _type: def.type, _key: ligne._key };
      let rempli = false;
      for (const c of def.colonnes) {
        const brut = ligne[c.cle] ?? '';
        if (c.nombre) {
          const n = lireNombre(brut);
          if (n === undefined) return { erreur: `Prix illisible (« ${brut.trim()} ») : écrivez un nombre, par exemple 12,50.` };
          if (n !== null) {
            out[c.cle] = n;
            rempli = true;
          }
        } else if (brut.trim()) {
          out[c.cle] = brut.trim();
          rempli = true;
        }
      }
      if (rempli) sortie.push(out);
    }
    return { valeur: sortie };
  }
  return { valeur: etat[champ as (typeof CHAMPS_TEXTE)[number]] };
}

export type { ChampFiche };
