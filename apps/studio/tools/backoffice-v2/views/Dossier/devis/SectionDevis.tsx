/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Devis » (4.3) : quatre champs seulement, dans cet ordre
 * (description, montant HT, TVA, délai estimé), la ligne calculée
 * « TVA … · Total TTC … » et trois aides qui ne s'écrivent jamais d'office.
 * Après envoi, le devis est un récapitulatif en lecture seule avec « Modifier »
 * (qui avertit que le devis est déjà chez le client).
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useMagasin } from '../../../data/magasin';
import { calculerChiffrage, euros, pourcentage } from '../../../domaine/chiffrage';
import type { SectionDossierProps } from '../../../domaine/contrats';
import { lireDate } from '../../../domaine/echeances';
import { ficheDe } from '../../../domaine/fiches';
import { formaterDate } from '../../../domaine/format';
import type { Demande } from '../../../domaine/types';
import { Bouton, ChoixTVA, Confirmation, Montant, Saisie, Section, ZoneTexte } from '../../../ui';
import { AidesDevis } from './AidesDevis';
import { nombreChamp, texteChamp } from './outilsVue';
import { SuggestionTexte } from './SuggestionTexte';

const MOYENS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  emailPersonnel: 'e-mail personnel',
  mainPropre: 'remis en main propre',
  autre: 'autre moyen',
};

/** Date de trace lisible : « 05/11/2026 » ; le texte brut si elle est illisible. */
function dateLisible(texte: string | undefined): string {
  const d = lireDate(texte);
  return d ? formaterDate(d) : (texte ?? '');
}

/** Ligne « TVA 0,00 € · Total TTC 1 250,00 € » ou `null` tant que le chiffrage est incomplet. */
function ligneCalculee(ht: number | null, taux: number | null): string | null {
  const c = calculerChiffrage(ht, taux);
  return c ? `TVA ${euros(c.tva)} · Total TTC ${euros(c.ttc)}` : null;
}

function mentionEnvoi(d: Demande): string | null {
  if (d.devisEnvoyeLe) {
    return `Envoyé le ${dateLisible(d.devisEnvoyeLe)}${d.devisEnvoyeA ? ` à ${d.devisEnvoyeA}` : ''}`;
  }
  if (d.devisEnvoyeHorsOutilLe) {
    const moyen = d.devisEnvoyeHorsOutilMoyen ? MOYENS[d.devisEnvoyeHorsOutilMoyen] : undefined;
    return `Envoyé hors outil, le ${dateLisible(d.devisEnvoyeHorsOutilLe)}${moyen ? ` (${moyen})` : ''}`;
  }
  return null;
}

function Recapitulatif({ demande, onModifier }: { demande: Demande; onModifier?: () => void }): ReactElement {
  const ht = typeof demande.montantHT === 'number' ? demande.montantHT : null;
  const taux = typeof demande.tauxTVA === 'number' ? demande.tauxTVA : null;
  const envoi = mentionEnvoi(demande);
  return (
    <div className="bo-pile">
      {envoi ? <p className="bo-fort">{envoi}</p> : null}
      <p>{demande.descriptionPrestation || 'Aucune description'}</p>
      {ht !== null ? (
        <p>
          <span className="bo-fort">{euros(ht)} HT</span>
          {taux !== null ? ` · TVA ${pourcentage(taux)}` : ''}
        </p>
      ) : demande.montantDevis ? (
        <p>Montant : {demande.montantDevis}</p>
      ) : null}
      {ligneCalculee(ht, taux) ? <p className="bo-secondaire">{ligneCalculee(ht, taux)}</p> : null}
      {demande.delaiEstime ? <p>Délai estimé : {demande.delaiEstime}</p> : null}
      {onModifier ? (
        <div>
          <Bouton variante="secondaire" taille="s" onClick={onModifier}>
            Modifier
          </Bouton>
        </div>
      ) : null}
    </div>
  );
}

export function SectionDevis({
  dossier,
  brouillon,
  modifier,
  lectureSeule,
  ouverte,
  onBasculer,
}: SectionDossierProps): ReactElement | null {
  const { donnees } = useMagasin();
  const [modification, setModification] = useState(false);
  const [avertir, setAvertir] = useState(false);
  const demande = dossier.demande;
  if (!demande) return null;

  const ht = nombreChamp(demande, brouillon, 'montantHT');
  const tauxBrut = nombreChamp(demande, brouillon, 'tauxTVA');
  // Seuls 0 % et 20 % sont proposés ; un ancien taux différent n'est pas présélectionné.
  const taux: 0 | 20 | null = tauxBrut === 0 || tauxBrut === 20 ? tauxBrut : null;
  const envoye = Boolean(demande.devisEnvoyeLe || demande.devisEnvoyeHorsOutilLe || (demande.statut ?? 0) >= 2);
  const enLecture = lectureSeule || (envoye && !modification);
  const fiche = ficheDe(demande, donnees.fiches).fiche;
  const calculee = ligneCalculee(ht, tauxBrut);
  const resume = ht !== null && tauxBrut !== null ? `${euros(ht)} HT · TVA ${pourcentage(tauxBrut)}` : 'Pas encore chiffré';

  /** Une saisie vidée devient `null` : le patch fera un `unset`, jamais une chaîne vide. */
  const saisir = (champ: string) => (v: string) => modifier(champ, v === '' ? null : v);

  return (
    <Section titre="Devis" resume={resume} ouverte={ouverte} onBasculer={onBasculer}>
      {enLecture ? (
        <Recapitulatif demande={demande} onModifier={lectureSeule ? undefined : () => setAvertir(true)} />
      ) : (
        <div className="bo-pile">
          {fiche ? <p className="bo-secondaire">Fiche service utilisée : {fiche.titre} (choisie automatiquement)</p> : null}
          <ZoneTexte
            etiquette="Description de la prestation"
            requis
            valeur={texteChamp(demande, brouillon, 'descriptionPrestation')}
            onChange={saisir('descriptionPrestation')}
            lignes={3}
          />
          <SuggestionTexte dossier={dossier} onUtiliser={(texte) => modifier('descriptionPrestation', texte)} />
          <Montant
            etiquette="Montant HT"
            requis
            valeur={ht}
            onChange={(v) => modifier('montantHT', v)}
            erreur={ht === 0 ? 'Un devis à 0 € ne peut pas être envoyé.' : undefined}
          />
          <AidesDevis
            champ="montant"
            dossier={dossier}
            onUtiliserMontant={(m) => modifier('montantHT', m)}
            onUtiliserDelai={() => undefined}
          />
          <ChoixTVA valeur={taux} onChange={(v) => modifier('tauxTVA', v)} />
          {calculee ? <p className="bo-fort">{calculee}</p> : null}
          {demande.montantDevis && ht === null ? (
            <p className="bo-secondaire">Ancien montant, en lecture seule : {demande.montantDevis}</p>
          ) : null}
          <Saisie etiquette="Délai estimé" valeur={texteChamp(demande, brouillon, 'delaiEstime')} onChange={saisir('delaiEstime')} />
          <AidesDevis
            champ="delai"
            dossier={dossier}
            onUtiliserMontant={() => undefined}
            onUtiliserDelai={(d) => modifier('delaiEstime', d)}
          />
        </div>
      )}
      {avertir ? (
        <Confirmation
          titre="Modifier le devis ?"
          consequence="Ce devis est déjà parti chez le client. Vos changements ne lui seront pas envoyés automatiquement."
          verbe="Modifier"
          onConfirmer={() => {
            setModification(true);
            setAvertir(false);
          }}
          onAnnuler={() => setAvertir(false)}
        />
      ) : null}
    </Section>
  );
}
