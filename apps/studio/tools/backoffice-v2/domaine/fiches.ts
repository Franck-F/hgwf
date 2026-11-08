// COPIE de tools/backoffice/fiches.ts (V1 intacte) : rattacher une demande à sa
// fiche service et remplir les textes types. Module pur. Les messages au client
// (messageDemandeInfos, messageDemandeComplement, questionsFacturation) sont
// fusionnés dans `messages.ts` ; le type de fiche est `Fiche` (types.ts).
import type { Fiche } from './types'

export const PROJECTION_FICHE =
  '{_id, titre, ordre, libellesFormulaire, resume, methodeTarif, grille, fraisAnnexes, tauxTVADefaut, delais, inclus, nonInclus, documents, infosAObtenir, vigilance, modeleDescription, modeleMessage, modeleNote, aCompleter}'

// « Véhicule / Bateau » et « vehicule/bateau » sont le même libellé : casse,
// accents, apostrophes typographiques et espaces ne comptent pas.
export function normaliser(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

type AvecFiche = { typeEnvoi?: string | null; ficheService?: { _ref?: string } | null }

// La fiche d'une demande : celle choisie à la main si elle existe encore,
// sinon celle dont un libellé reconnu correspond au type d'envoi (égalité
// d'abord, puis libellé contenu dans le type d'envoi, le plus long gagnant).
export function ficheDe(
  d: AvecFiche | null | undefined,
  fiches: Fiche[],
): { fiche: Fiche | null; manuel: boolean } {
  const ref = d?.ficheService?._ref
  if (ref) {
    const choisie = fiches.find((f) => f._id === ref)
    if (choisie) return { fiche: choisie, manuel: true }
  }
  const type = normaliser(d?.typeEnvoi)
  if (!type) return { fiche: null, manuel: false }
  let meilleure: { fiche: Fiche; score: number } | null = null
  for (const f of fiches) {
    for (const libelle of f.libellesFormulaire ?? []) {
      const l = normaliser(libelle)
      if (!l) continue
      const score = l === type ? 1000 : l.length >= 5 && type.includes(l) ? l.length : 0
      if (score && (!meilleure || score > meilleure.score)) meilleure = { fiche: f, score }
    }
  }
  return { fiche: meilleure?.fiche ?? null, manuel: false }
}

// « {destination} » remplacé par la destination de la demande.
export function remplirModele(texte: string | undefined | null, d: { destination?: string | null }): string {
  return (texte ?? '').replace(/\{destination\}/g, d.destination?.trim() || 'votre destination').trim()
}

// Lignes de grille sans prix : ce qui empêche une suggestion de montant.
export function prixManquants(fiche?: Fiche | null): number {
  return (fiche?.grille ?? []).filter((l) => l.designation && !(typeof l.prixHT === 'number' && Number.isFinite(l.prixHT))).length
}
