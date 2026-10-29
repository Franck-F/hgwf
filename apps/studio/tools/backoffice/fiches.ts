// Fiches services dans le back-office : rattacher une demande à sa fiche, et
// remplir les textes types. Module pur, testé par apps/api/test/fiches.test.js
// (le Studio n'a pas d'outil de test ; Node exécute ce .ts directement).

export type LigneTarif = { _key?: string; designation?: string; unite?: string; prixHT?: number | null; note?: string }

export type FicheService = {
  _id: string
  titre: string
  ordre?: number
  libellesFormulaire?: string[]
  resume?: string
  methodeTarif?: string
  grille?: LigneTarif[]
  fraisAnnexes?: LigneTarif[]
  tauxTVADefaut?: number | null
  delais?: { _key?: string; zone?: string; delai?: string }[]
  inclus?: string[]
  nonInclus?: string[]
  documents?: string[]
  infosAObtenir?: string[]
  vigilance?: string[]
  modeleDescription?: string
  modeleMessage?: string
  modeleNote?: string
  aCompleter?: string[]
}

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
  fiches: FicheService[],
): { fiche: FicheService | null; manuel: boolean } {
  const ref = d?.ficheService?._ref
  if (ref) {
    const choisie = fiches.find((f) => f._id === ref)
    if (choisie) return { fiche: choisie, manuel: true }
  }
  const type = normaliser(d?.typeEnvoi)
  if (!type) return { fiche: null, manuel: false }
  let meilleure: { fiche: FicheService; score: number } | null = null
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

// Questions au client pour compléter sa facturation, d'après ce qui manque
// (le bloc du formulaire est facultatif). Formulées pour le client.
// `manque` : le résultat de manquesFacturation (chiffrage.ts), passé par
// l'appelant pour garder ce module sans import (Node l'exécute tel quel).
export function questionsFacturation(manque: string[]): string[] {
  const q: string[] = []
  if (manque.includes('type de client')) q.push('Le devis est-il à établir au nom d’un particulier ou d’une société ?')
  if (manque.includes('raison sociale')) q.push('Quelle est la raison sociale de votre société ?')
  if (['adresse', 'code postal', 'ville', 'pays'].some((m) => manque.includes(m)))
    q.push('Quelle est votre adresse de facturation complète (adresse, code postal, ville, pays) ?')
  if (manque.includes('SIRET')) q.push('Quel est le numéro SIRET de votre société ?')
  return q
}

// Message au client pour obtenir ce qui manque à sa demande (questions issues
// de la proposition de description). Le même texte sert à la copie, à l'e-mail
// et à WhatsApp.
export function messageDemandeInfos(
  d: { clientNom?: string | null; reference: string },
  questions: string[],
): string {
  const prenom = (d.clientNom ?? '').trim().split(/\s+/)[0] ?? ''
  return [
    `Bonjour${prenom ? ` ${prenom}` : ''},`,
    '',
    `Merci pour votre demande de devis (référence ${d.reference}). Pour vous établir un prix exact, pourriez-vous nous préciser :`,
    ...questions.map((q) => `- ${q}`),
    '',
    'Dès réception de ces éléments, nous vous adressons votre devis.',
    '',
    'Bien cordialement,',
    "L'équipe HGWF Cargo",
    'contact@hgwf-cargo.fr · 09 62 03 80 13',
  ].join('\n')
}

// E-mail de demande de compléments, quand la demande ne suffit pas pour
// chiffrer. C'est un modèle : l'opérateur l'adapte dans la fenêtre de relecture
// avant l'envoi. Les lignes « - question » deviennent une liste mise en valeur
// dans la version HTML (gabaritHtml, apps/api/src/email.js) — ne pas changer ce
// format sans l'y répercuter. Sans question connue, les informations à obtenir
// de la fiche service servent de base ; à défaut, une ligne à compléter.
export function messageDemandeComplement(
  d: { clientNom?: string | null; reference: string; destination?: string | null; _createdAt?: string | null },
  questions: string[],
  fiche?: FicheService | null,
): { objet: string; texte: string } {
  const prenom = (d.clientNom ?? '').trim().split(/\s+/)[0] ?? ''
  const destination = (d.destination ?? '').trim()
  const recue = d._createdAt ? new Date(d._createdAt) : null
  const dateRecue =
    recue && !Number.isNaN(recue.getTime())
      ? `${String(recue.getDate()).padStart(2, '0')}/${String(recue.getMonth() + 1).padStart(2, '0')}/${recue.getFullYear()}`
      : ''
  const propres = questions.map((q) => q.trim()).filter(Boolean)
  const delaFiche = (fiche?.infosAObtenir ?? []).map((q) => q.trim()).filter(Boolean)
  const lignes = propres.length ? propres : delaFiche.length ? delaFiche : ['[précisez ici l’information attendue]']
  return {
    objet: `Votre demande de devis HGWF Cargo · ${d.reference} — quelques précisions`,
    texte: [
      `Bonjour${prenom ? ` ${prenom}` : ''},`,
      '',
      `Merci pour votre demande de devis${destination ? ` pour ${destination}` : ''} (référence ${d.reference}${dateRecue ? `, reçue le ${dateRecue}` : ''}).`,
      '',
      'Pour vous établir un prix exact, il nous manque quelques informations :',
      ...lignes.map((q) => `- ${q}`),
      '',
      'Vous trouverez en pièce jointe un devis provisoire qui reprend votre demande et le détail de la prestation. Le montant y sera indiqué dès réception de vos réponses.',
      '',
      'Il vous suffit de répondre à cet e-mail. Vous pouvez aussi nous appeler au 09 62 03 80 13 ou nous écrire sur WhatsApp.',
      '',
      'Bien cordialement,',
      "L'équipe HGWF Cargo",
    ].join('\n'),
  }
}

// Lignes de grille sans prix : ce qui empêche une suggestion de montant.
export function prixManquants(fiche?: FicheService | null): number {
  return (fiche?.grille ?? []).filter((l) => l.designation && !(typeof l.prixHT === 'number' && Number.isFinite(l.prixHT))).length
}
