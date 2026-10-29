// Suggestions Gemini et fiche du service, dans le panneau « Chiffrage du devis ».
//
// Règle d'usage : une proposition n'écrit jamais rien d'elle-même. Elle
// s'affiche à côté du champ ; l'opérateur la reprend (ou non), la corrige, puis
// enregistre comme d'habitude. Le montant suit la même règle : la proposition
// remplit la saisie, rien de plus.
import { type CSSProperties, type ReactNode } from 'react';
import { euros, pourcentage } from './chiffrage';
import { prixManquants, type FicheService, type LigneTarif } from './fiches';

// Palette du back-office (BackOffice.tsx), reprise ici pour éviter un import circulaire.
const MARINE = '#12395B';
const CREME = '#FBF4E6';
const ENCRE = '#29638D';
const ROUGE = '#C24435';
const MONO = "'Space Mono', monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";

export type ChampSuggestion = 'descriptionPrestation' | 'montant' | 'delaiEstime' | 'notes';

export type SuggestionRecue = {
  texte?: string;
  montantHT?: number | null;
  tauxTVA?: number | null;
  calcul?: string;
  manques: string[];
};

const petitBouton: CSSProperties = {
  fontFamily: SANS,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  color: MARINE,
  background: CREME,
  border: '1px solid rgba(18,57,91,0.25)',
  borderRadius: 999,
  padding: '3px 10px',
  cursor: 'pointer',
};

export function BoutonProposer({
  quoi,
  enCours,
  desactive,
  onClick,
}: {
  quoi: string;
  enCours: boolean;
  desactive?: boolean;
  onClick: () => void;
}) {
  const aide = `Proposer ${quoi} à partir de la demande et de la fiche du service (IA, à relire)`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={enCours || desactive}
      title={aide}
      aria-label={aide}
      style={{ ...petitBouton, opacity: enCours || desactive ? 0.55 : 1, cursor: enCours || desactive ? 'default' : 'pointer' }}
    >
      {enCours ? 'Rédaction…' : '✦ Proposer'}
    </button>
  );
}

// En-tête d'un champ : le libellé à gauche, le bouton « Proposer » à droite.
export function EnteteChamp({ htmlFor, libelle, bouton }: { htmlFor: string; libelle: ReactNode; bouton: ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 12, fontWeight: 500, color: ENCRE }}>
        {libelle}
      </label>
      {bouton}
    </span>
  );
}

const LIBELLE_UTILISER: Record<ChampSuggestion, string> = {
  descriptionPrestation: 'Utiliser ce texte',
  delaiEstime: 'Utiliser ce délai',
  notes: 'Ajouter à la note',
  montant: 'Reprendre ce montant',
};

export function CarteSuggestion({
  champ,
  s,
  onUtiliser,
  onIgnorer,
}: {
  champ: ChampSuggestion;
  s: SuggestionRecue;
  onUtiliser: () => void;
  onIgnorer: () => void;
}) {
  const montant = champ === 'montant';
  const utilisable = montant ? typeof s.montantHT === 'number' : Boolean(s.texte?.trim());
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 13,
        color: MARINE,
        background: '#F2F7FB',
        border: `1px dashed ${ENCRE}`,
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: ENCRE }}>
        Proposition — à relire avant de l’utiliser
      </span>
      {montant ? (
        <>
          <span style={{ fontFamily: MONO, fontWeight: 700 }}>
            {typeof s.montantHT === 'number'
              ? `${euros(s.montantHT)} HT · ${typeof s.tauxTVA === 'number' ? `TVA ${pourcentage(s.tauxTVA)}` : 'taux à choisir'}`
              : 'Pas de montant proposé.'}
          </span>
          {s.calcul ? (
            <span style={{ fontFamily: MONO, fontSize: 12, whiteSpace: 'pre-wrap', color: ENCRE }}>{s.calcul}</span>
          ) : null}
        </>
      ) : (
        <span style={{ whiteSpace: 'pre-wrap' }}>{s.texte || 'Rien à proposer.'}</span>
      )}
      {s.manques.length > 0 && (
        <span style={{ fontSize: 12, color: ROUGE }}>
          À vérifier : {s.manques.join(' ; ')}
        </span>
      )}
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {utilisable && (
          <button type="button" onClick={onUtiliser} style={{ ...petitBouton, background: MARINE, color: CREME, border: 'none' }}>
            {LIBELLE_UTILISER[champ]}
          </button>
        )}
        <button type="button" onClick={onIgnorer} style={petitBouton}>
          Ignorer
        </button>
      </span>
    </div>
  );
}

const ligneTarif = (l: LigneTarif) =>
  `${l.designation}${l.unite ? ` (/ ${l.unite})` : ''} : ${
    typeof l.prixHT === 'number' && Number.isFinite(l.prixHT) ? `${euros(l.prixHT)} HT` : 'prix à compléter'
  }${l.note ? ` — ${l.note}` : ''}`;

function Rubrique({ titre, lignes }: { titre: string; lignes: string[] }) {
  if (!lignes.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: ENCRE }}>{titre}</span>
      {lignes.map((l, i) => (
        <span key={i} style={{ fontSize: 12, color: MARINE }}>
          · {l}
        </span>
      ))}
    </div>
  );
}

// Sélecteur de fiche + consultation de la fiche, en haut du chiffrage.
export function PanneauFiche({
  fiches,
  fiche,
  manuel,
  typeEnvoi,
  enCours,
  onChoisir,
}: {
  fiches: FicheService[];
  fiche: FicheService | null;
  manuel: boolean;
  typeEnvoi?: string;
  enCours: boolean;
  onChoisir: (id: string) => void;
}) {
  const manquants = prixManquants(fiche);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 500, color: ENCRE }}>
        Fiche service
        <select
          value={manuel && fiche ? fiche._id : ''}
          disabled={enCours}
          onChange={(e) => onChoisir(e.target.value)}
          style={{
            fontSize: 14,
            fontFamily: SANS,
            color: MARINE,
            background: '#FFFDF8',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1.5px solid rgba(18,57,91,0.2)',
            width: '100%',
          }}
        >
          <option value="">
            {`Automatique — ${!manuel && fiche ? fiche.titre : 'aucune fiche ne correspond'}`}
          </option>
          {fiches.map((f) => (
            <option key={f._id} value={f._id}>
              {f.titre}
            </option>
          ))}
        </select>
      </label>
      {!fiche && (
        <span style={{ fontSize: 12, color: ENCRE }}>
          Le type d’envoi « {typeEnvoi || 'non précisé'} » ne correspond à aucune fiche : choisissez-la, les
          propositions s’en servent.
        </span>
      )}
      {fiche && (
        <details style={{ fontSize: 12, color: MARINE, background: CREME, borderRadius: 12, padding: '8px 12px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
            Voir la fiche « {fiche.titre} »
            {manquants > 0 ? ` — ${manquants} prix à compléter` : ''}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {fiche.methodeTarif ? <span>{fiche.methodeTarif}</span> : null}
            <Rubrique titre="Grille tarifaire" lignes={(fiche.grille ?? []).filter((l) => l.designation).map(ligneTarif)} />
            <Rubrique titre="Frais annexes" lignes={(fiche.fraisAnnexes ?? []).filter((l) => l.designation).map(ligneTarif)} />
            <Rubrique
              titre="Délais indicatifs"
              lignes={(fiche.delais ?? []).filter((d) => d.zone && d.delai).map((d) => `${d.zone} : ${d.delai}`)}
            />
            <Rubrique titre="Informations à obtenir" lignes={fiche.infosAObtenir ?? []} />
            <Rubrique titre="Documents à réclamer" lignes={fiche.documents ?? []} />
            <Rubrique titre="Non compris" lignes={fiche.nonInclus ?? []} />
            <Rubrique titre="Points de vigilance" lignes={fiche.vigilance ?? []} />
            <Rubrique titre="Reste à compléter dans la fiche" lignes={fiche.aCompleter ?? []} />
            <span style={{ color: ENCRE }}>La fiche se modifie dans Données → Fiches services.</span>
          </div>
        </details>
      )}
    </div>
  );
}
