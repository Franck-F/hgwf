/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Facturation » (4.3) : repliée par défaut, badge « Incomplet » et
 * liste de ce qui manque, numéro de facture saisi à la main, et « Copier pour
 * la facture ». Aucun lien avec Henrri ni avec un autre outil de facturation.
 *
 * Le pays « France » n'est jamais écrit en douce : il est proposé, et le
 * bouton « Confirmer France » l'ajoute au brouillon. Tant qu'il n'est pas
 * enregistré, le pays reste compté comme manque (`manquesFacturation`).
 */
import type { ReactElement } from 'react';
import { useToasts } from '../../app/Contexte';
import { erreurSiret } from '../../domaine/chiffrage';
import type { SectionDossierProps } from '../../domaine/contrats';
import { fusionner } from '../../domaine/fusion';
import { manquesFacturation } from '../../domaine/manques';
import { texteCopieFacture } from '../../domaine/messages';
import type { TypeFacturation } from '../../domaine/types';
import { Badge, Bouton, Liste, Manques, Saisie, Section } from '../../ui';
import { copierTexte } from './ContexteDossier';

const TYPES: { valeur: TypeFacturation; libelle: string }[] = [
  { valeur: 'particulier', libelle: 'Particulier' },
  { valeur: 'professionnel', libelle: 'Société' },
];

export function SectionFacturation({
  dossier,
  brouillon,
  modifier,
  lectureSeule,
  ouverte,
  onBasculer,
}: SectionDossierProps): ReactElement | null {
  const toasts = useToasts();
  if (!dossier.demande) return null;
  const d = fusionner(dossier.demande, brouillon);
  const manques = manquesFacturation(d);
  const pro = d.facturationType === 'professionnel';

  // Un champ vidé devient `null` dans le brouillon : le patch fera un `unset`.
  const saisir = (champ: string) => (valeur: string) => modifier(champ, valeur === '' ? null : valeur);

  async function copier(): Promise<void> {
    if (await copierTexte(texteCopieFacture(d))) toasts.succes('Récapitulatif copié, prêt à coller dans la facture.');
    else toasts.erreur('Impossible de copier. Sélectionnez le texte à la main.');
  }

  return (
    <Section
      titre="Facturation"
      resume={manques.length === 0 ? 'Complète' : `Incomplète : il manque ${manques.join(', ')}`}
      ouverte={ouverte}
      onBasculer={onBasculer}
    >
      {manques.length > 0 ? (
        <div className="bo-pile">
          <div>
            <Badge ton="attention" icone="alerte">
              Incomplet
            </Badge>
          </div>
          <Manques manques={manques} />
        </div>
      ) : null}
      <div className="bo-grille">
        <Liste
          etiquette="Type de client"
          valeur={d.facturationType ?? ''}
          options={TYPES.map((t) => ({ valeur: t.valeur, libelle: t.libelle }))}
          vide="Choisir…"
          lectureSeule={lectureSeule}
          onChange={saisir('facturationType')}
        />
        <Saisie
          etiquette={pro ? 'Raison sociale' : 'Nom'}
          valeur={d.facturationNom ?? ''}
          lectureSeule={lectureSeule}
          onChange={saisir('facturationNom')}
        />
        <Saisie
          etiquette="Adresse"
          valeur={d.facturationAdresse ?? ''}
          lectureSeule={lectureSeule}
          onChange={saisir('facturationAdresse')}
        />
        <Saisie
          etiquette="Code postal"
          valeur={d.facturationCodePostal ?? ''}
          lectureSeule={lectureSeule}
          onChange={saisir('facturationCodePostal')}
        />
        <Saisie
          etiquette="Ville"
          valeur={d.facturationVille ?? ''}
          lectureSeule={lectureSeule}
          onChange={saisir('facturationVille')}
        />
        <div className="bo-pile">
          <Saisie
            etiquette="Pays"
            valeur={d.facturationPays ?? ''}
            placeholder="France"
            lectureSeule={lectureSeule}
            onChange={saisir('facturationPays')}
          />
          {!d.facturationPays && !lectureSeule ? (
            <div>
              <Bouton variante="secondaire" taille="s" onClick={() => modifier('facturationPays', 'France')}>
                Confirmer France
              </Bouton>
            </div>
          ) : null}
        </div>
        {pro ? (
          <>
            <Saisie
              etiquette="SIRET"
              valeur={d.facturationSiret ?? ''}
              erreur={erreurSiret(d.facturationSiret) ?? undefined}
              lectureSeule={lectureSeule}
              onChange={saisir('facturationSiret')}
            />
            <Saisie
              etiquette="TVA intracommunautaire"
              valeur={d.facturationTvaIntracom ?? ''}
              lectureSeule={lectureSeule}
              onChange={saisir('facturationTvaIntracom')}
            />
          </>
        ) : null}
        <Saisie
          etiquette="Numéro de facture"
          valeur={d.numeroFacture ?? ''}
          lectureSeule={lectureSeule}
          onChange={saisir('numeroFacture')}
        />
      </div>
      <div>
        <Bouton variante="secondaire" onClick={() => void copier()}>
          Copier pour la facture
        </Bouton>
      </div>
    </Section>
  );
}
