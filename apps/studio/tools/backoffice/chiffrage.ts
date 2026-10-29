// Calcul et présentation du montant d'un devis, et bloc de facturation —
// côté back-office (navigateur).
//
// Jumeau de apps/api/src/montant.js : l'API rédige l'e-mail du devis, le
// back-office fabrique le PDF, et les deux doivent afficher exactement les
// mêmes montants. apps/api/test/montant.test.js exécute les deux fichiers sur
// une même table de cas. Toute modification se fait donc des deux côtés.
//
// Modèle : montantHT (nombre, en euros) et tauxTVA (nombre, en pourcentage :
// 0 ou 20). TVA et TTC se recalculent, en centimes entiers. Les documents
// antérieurs au 29/09/2026 n'ont qu'une chaîne libre montantDevis
// (« 1 250 € ») : affichée telle quelle, jamais convertie en TVA.

// Pratique constatée : 0 % sur le transport lié à l'export (Outre-mer compris),
// 20 % sinon. À faire valider par l'expert-comptable, comme la mention ci-dessous.
export const TAUX_TVA = [0, 20]

export const MENTION_EXONERATION = 'TVA non applicable : transport international lié à une exportation.'

export type Chiffrage = { ht: number; taux: number; tva: number; ttc: number }

export type MontantSource = {
  montantHT?: number | null
  tauxTVA?: number | null
  montantDevis?: string | null
}

const estNombre = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

// { ht, taux, tva, ttc } en euros, ou null si le montant HT ou le taux manque.
// Attention au zéro : 0 % est le taux le plus courant, on ne teste jamais par vérité.
export function calculerChiffrage(montantHT: unknown, tauxTVA: unknown): Chiffrage | null {
  if (!estNombre(montantHT) || !estNombre(tauxTVA) || montantHT < 0 || tauxTVA < 0) return null
  const htC = Math.round(montantHT * 100)
  const tvaC = Math.round((htC * tauxTVA) / 100)
  return { ht: htC / 100, taux: tauxTVA, tva: tvaC / 100, ttc: (htC + tvaC) / 100 }
}

// « 1 250,00 € ». Intl sépare les milliers par U+202F, absent des polices
// standard de jsPDF (il sortirait en « ? ») : remplacé par U+00A0.
export function euros(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/ /g, ' ')
}

// « 20 % », « 5,5 % ».
export function pourcentage(taux: number): string {
  return `${String(taux).replace('.', ',')} %`
}

const ancienMontant = (d?: MontantSource | null): string | null =>
  typeof d?.montantDevis === 'string' && d.montantDevis.trim() ? d.montantDevis.trim() : null

// Vrai si le devis peut partir : un montant HT strictement positif avec son
// taux, ou, pour un ancien document, la chaîne libre.
export function aUnMontant(d?: MontantSource | null): boolean {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA)
  if (c) return c.ht > 0
  return ancienMontant(d) !== null
}

// Récapitulatif en lignes [libellé, valeur] : e-mail, PDF, fiches.
export function lignesMontant(d?: MontantSource | null): [string, string][] {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA)
  if (c) {
    return [
      ['Montant HT', euros(c.ht)],
      [`TVA ${pourcentage(c.taux)}`, euros(c.tva)],
      ['Total TTC', euros(c.ttc)],
    ]
  }
  const ancien = ancienMontant(d)
  return ancien ? [['Montant', ancien]] : []
}

// Le montant tel qu'on l'annonce au client (objet d'e-mail, relance, listes) :
// le TTC, puisque c'est ce qu'il paiera. null si rien n'est chiffré.
export function montantAnnonce(d?: MontantSource | null): string | null {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA)
  if (c) return `${euros(c.ttc)} TTC`
  return ancienMontant(d)
}

// Une phrase complète pour un message rédigé :
// « 1 500,00 € TTC (1 250,00 € HT + TVA 20 %) » ou « 1 250,00 € TTC (TVA 0 %, exportation) ».
export function libelleMontant(d?: MontantSource | null): string | null {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA)
  if (c) {
    return c.taux === 0
      ? `${euros(c.ttc)} TTC (TVA 0 %, exportation)`
      : `${euros(c.ttc)} TTC (${euros(c.ht)} HT + TVA ${pourcentage(c.taux)})`
  }
  return ancienMontant(d)
}

// ── Saisie ────────────────────────────────────────────────────────────────────
// Les champs restent des chaînes pendant la saisie : un champ vide n'est pas un
// zéro. Conversion à l'enregistrement seulement.

// « 1 250,50 », « 1 250 € », « 1250.5 » → 1250.5 ; vide → undefined ;
// illisible → NaN (à signaler, jamais à enregistrer). Arrondi au centime.
// Les espaces (y compris U+00A0 et U+202F collés depuis un PDF ou un tableur)
// sont retirés avant conversion.
export function lireMontantSaisi(saisie: string): number | undefined {
  const brut = saisie.replace(/\s/g, '').replace(/€/g, '').replace(',', '.')
  if (brut === '') return undefined
  if (!/^\d+(\.\d+)?$/.test(brut)) return NaN
  return Math.round(Number(brut) * 100) / 100
}

// 1250.5 → « 1250,50 » pour remplir le champ ; undefined → ''.
export function montantVersSaisie(n?: number | null): string {
  return estNombre(n) ? n.toFixed(2).replace('.', ',') : ''
}

// ── Facturation ───────────────────────────────────────────────────────────────
// Collectée par l'opérateur à la validation du devis, jamais dans le formulaire
// public. Champs plats préfixés, comme le volet exploitation des expéditions.

export type TypeClient = 'particulier' | 'professionnel'

export type Facturation = {
  facturationType?: TypeClient
  facturationNom?: string
  facturationAdresse?: string
  facturationCodePostal?: string
  facturationVille?: string
  facturationPays?: string
  facturationSiret?: string
  facturationTvaIntracom?: string
}

export const CHAMPS_FACTURATION = [
  'facturationType',
  'facturationNom',
  'facturationAdresse',
  'facturationCodePostal',
  'facturationVille',
  'facturationPays',
  'facturationSiret',
  'facturationTvaIntracom',
] as const

// Encadré « Client » du PDF et résumé du panneau : lignes non vides, dans l'ordre
// d'une adresse postale.
export function lignesFacturation(f?: Facturation | null): string[] {
  if (!f) return []
  const pro = f.facturationType === 'professionnel'
  const ville = [f.facturationCodePostal, f.facturationVille].filter((x) => x && x.trim()).join(' ')
  return [
    f.facturationNom,
    ...(f.facturationAdresse ?? '').split('\n'),
    ville,
    f.facturationPays,
    pro && f.facturationSiret ? `SIRET ${f.facturationSiret}` : undefined,
    pro && f.facturationTvaIntracom ? `TVA intracom. ${f.facturationTvaIntracom}` : undefined,
  ]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
}

// Ce qui manque pour facturer (préparation Henrri) : la liste exacte, affichée
// telle quelle à l'opérateur. Un SIRET est requis pour un professionnel.
export function manquesFacturation(f?: Facturation | null): string[] {
  const manque: string[] = []
  const vide = (v?: string) => !v || !v.trim()
  if (!f?.facturationType) manque.push('type de client')
  if (vide(f?.facturationNom)) manque.push(f?.facturationType === 'professionnel' ? 'raison sociale' : 'nom')
  if (vide(f?.facturationAdresse)) manque.push('adresse')
  if (vide(f?.facturationCodePostal)) manque.push('code postal')
  if (vide(f?.facturationVille)) manque.push('ville')
  if (vide(f?.facturationPays)) manque.push('pays')
  if (f?.facturationType === 'professionnel' && vide(f?.facturationSiret)) manque.push('SIRET')
  return manque
}

// SIREN (9 chiffres) ou SIRET (14), espaces ignorés : null si valide ou vide,
// sinon le message d'erreur. Contrôle de format seulement (Henrri attend 14 chiffres).
export function erreurSiret(v?: string): string | null {
  const s = (v ?? '').replace(/\s/g, '')
  if (s === '') return null
  return /^(\d{9}|\d{14})$/.test(s) ? null : 'SIREN (9 chiffres) ou SIRET (14 chiffres) attendu'
}
