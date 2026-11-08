/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Rotations (4.7) : nom, clôture, départ, remplissage. Triées sur la date LUE
 * (jamais sur le texte « JJ/MM »). Une rotation dont le départ est passé est
 * rangée dans le groupe replié « Terminées ». Elles servent aux délais annoncés.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { supprimerRotation } from '../../actions/referentiels';
import { useToasts } from '../../app/Contexte';
import { useOutils } from '../../data/useOutils';
import { formaterJourMois, lireDatesRotation, rotationTerminee } from '../../domaine/format';
import type { Rotation } from '../../domaine/types';
import { Bouton, Confirmation, EtatVide, Icone, MenuActions, Section, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';
import { useContexteEcriture } from './contexte';
import { FormulaireRotation } from './FormulaireRotation';

const jour = (d: Date | null): string => (d ? formaterJourMois(d) : 'à préciser');

export function Rotations(): ReactElement {
  const { rotations, chargement, erreur, recharger } = useOutils();
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const [formulaire, setFormulaire] = useState<{ rotation?: Rotation } | null>(null);
  const [suppression, setSuppression] = useState<Rotation | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [terminees, setTerminees] = useState(false);

  const { aVenir, finies } = useMemo(() => {
    const maintenant = new Date();
    const lues = rotations.map((r) => ({ r, ...lireDatesRotation(r, maintenant), finie: rotationTerminee(r, maintenant) }));
    const parCloture = (a: (typeof lues)[number], b: (typeof lues)[number]) =>
      (a.cloture?.getTime() ?? Infinity) - (b.cloture?.getTime() ?? Infinity);
    return {
      aVenir: lues.filter((x) => !x.finie).sort(parCloture),
      finies: lues.filter((x) => x.finie).sort((a, b) => parCloture(b, a)),
    };
  }, [rotations]);

  async function supprimer(): Promise<void> {
    if (!suppression || enCours) return;
    setEnCours(true);
    const r = await supprimerRotation(ctx, suppression);
    setEnCours(false);
    if (!r.ok) {
      setSuppression(null);
      toasts.erreur(r.message);
      return;
    }
    await recharger();
    toasts.succes(`Rotation ${suppression.nom ?? ''} supprimée`);
    setSuppression(null);
  }

  const ligne = (x: (typeof aVenir)[number], attenuee = false): ReactElement => (
    <li key={x.r._id} className={`bo-ligne${attenuee ? ' bo-ligne--attenuee' : ''}`}>
      <span className="bo-fort">{x.r.nom || 'Rotation sans nom'}</span>
      <span className="bo-secondaire">Clôture le {jour(x.cloture)}</span>
      <span className="bo-secondaire">Départ le {jour(x.depart)}</span>
      <span className="bo-secondaire">Remplie à {x.r.remplissage ?? 0} %</span>
      <span className="bo-espace">
        <MenuActions
          libelle={`Autres actions pour ${x.r.nom ?? 'cette rotation'}`}
          elements={[
            { id: 'modifier', libelle: 'Modifier', onChoisir: () => setFormulaire({ rotation: x.r }) },
            { id: 'supprimer', libelle: 'Supprimer', danger: true, onChoisir: () => setSuppression(x.r) },
          ]}
        />
      </span>
    </li>
  );

  return (
    <div className="bo-pile">
      <div className="bo-rangee">
        <h2 className="bo-groupe-titre">Rotations</h2>
        <span className="bo-espace">
          <Bouton variante="primaire" onClick={() => setFormulaire({})}>
            <Icone nom="plus" /> Ajouter une rotation
          </Bouton>
        </span>
      </div>

      {erreur ? (
        <BandeauErreur message="Impossible de charger les rotations" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={3} />
      ) : rotations.length === 0 ? (
        <EtatVide titre="Aucune rotation" phrase="Ajoutez les prochains départs : ils servent à annoncer les délais." />
      ) : (
        <>
          {aVenir.length === 0 ? (
            <EtatVide titre="Aucune rotation à venir" phrase="Ajoutez le prochain départ pour annoncer des délais." />
          ) : (
            <ul className="bo-pile" aria-label="Rotations à venir">
              {aVenir.map((x) => ligne(x))}
            </ul>
          )}
          {finies.length > 0 ? (
            <Section
              titre="Terminées"
              resume={`${finies.length} ${finies.length > 1 ? 'rotations' : 'rotation'}`}
              ouverte={terminees}
              onBasculer={() => setTerminees(!terminees)}
            >
              <ul className="bo-pile" aria-label="Rotations terminées">
                {finies.map((x) => ligne(x, true))}
              </ul>
            </Section>
          ) : null}
        </>
      )}

      {formulaire ? (
        <FormulaireRotation rotation={formulaire.rotation} onFermer={() => setFormulaire(null)} onEnregistre={recharger} />
      ) : null}
      {suppression ? (
        <Confirmation
          titre={`Supprimer la rotation ${suppression.nom ?? ''} ?`}
          consequence="Elle ne sera plus proposée pour annoncer un délai. Cette action est définitive."
          verbe="Supprimer"
          danger
          chargement={enCours}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setSuppression(null)}
        />
      ) : null}
    </div>
  );
}
