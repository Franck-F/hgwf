/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Stock de conteneurs (4.7) : liste simple (référence, taille et état, lieu,
 * prix, statut). Le statut est un sélecteur, plus un bouton cyclique. Un seul
 * bouton plein, « Ajouter » ; modifier et supprimer sont dans le menu « … » de
 * la ligne, la suppression demande une confirmation nommée.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { enregistrerConteneur, supprimerConteneur } from '../../actions/referentiels';
import { useToasts } from '../../app/Contexte';
import { useOutils } from '../../data/useOutils';
import { STATUTS_CONTENEUR } from '../../domaine/statuts';
import type { Conteneur } from '../../domaine/types';
import { Bouton, Confirmation, EtatVide, Icone, MenuActions, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';
import { useContexteEcriture } from './contexte';
import { FormulaireConteneur } from './FormulaireConteneur';

const indexStatut = (c: Conteneur): number => Math.min(STATUTS_CONTENEUR.length - 1, Math.max(0, c.statut ?? 0));

export function StockConteneurs(): ReactElement {
  const { conteneurs, chargement, erreur, recharger } = useOutils();
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const [formulaire, setFormulaire] = useState<{ conteneur?: Conteneur } | null>(null);
  const [suppression, setSuppression] = useState<Conteneur | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  async function changerStatut(c: Conteneur, statut: number): Promise<void> {
    if (enCours) return;
    setEnCours(c._id);
    const r = await enregistrerConteneur(ctx, { _id: c._id, _rev: c._rev, _type: 'conteneurOccasion', statut });
    if (r.ok) {
      await recharger();
      toasts.succes(`Conteneur ${c.reference ?? ''} : ${STATUTS_CONTENEUR[statut]!.toLowerCase()}`);
    } else {
      toasts.erreur(r.message);
    }
    setEnCours(null);
  }

  async function supprimer(): Promise<void> {
    if (!suppression) return;
    setEnCours(suppression._id);
    const r = await supprimerConteneur(ctx, suppression);
    setEnCours(null);
    if (!r.ok) {
      setSuppression(null);
      toasts.erreur(r.message);
      return;
    }
    await recharger();
    toasts.succes(`Conteneur ${suppression.reference ?? ''} supprimé`);
    setSuppression(null);
  }

  return (
    <div className="bo-pile">
      <div className="bo-rangee">
        <h2 className="bo-groupe-titre">Stock de conteneurs</h2>
        <span className="bo-espace">
          <Bouton variante="primaire" onClick={() => setFormulaire({})}>
            <Icone nom="plus" /> Ajouter un conteneur
          </Bouton>
        </span>
      </div>

      {erreur ? (
        <BandeauErreur message="Impossible de charger le stock" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={4} />
      ) : conteneurs.length === 0 ? (
        <EtatVide titre="Aucun conteneur en stock" phrase="Ajoutez un conteneur d’occasion pour le suivre ici." />
      ) : (
        <ul className="bo-pile" aria-label="Conteneurs">
          {conteneurs.map((c) => (
            <li key={c._id} className="bo-ligne">
              <span className="bo-fort">{c.reference || 'Sans référence'}</span>
              <span className="bo-secondaire">{[c.taille, c.etat ? `état ${c.etat}` : ''].filter(Boolean).join(' · ')}</span>
              <span className="bo-secondaire">{c.lieu || 'Lieu non renseigné'}</span>
              <span className="bo-secondaire">{c.prix || 'Prix non renseigné'}</span>
              <span className="bo-espace bo-rangee">
                <select
                  className="bo-saisie"
                  aria-label={`Statut du conteneur ${c.reference ?? ''}`}
                  value={String(indexStatut(c))}
                  disabled={enCours === c._id}
                  onChange={(e) => void changerStatut(c, Number(e.target.value))}
                >
                  {STATUTS_CONTENEUR.map((libelle, i) => (
                    <option key={libelle} value={String(i)}>
                      {libelle}
                    </option>
                  ))}
                </select>
                <MenuActions
                  libelle={`Autres actions pour ${c.reference ?? 'ce conteneur'}`}
                  elements={[
                    { id: 'modifier', libelle: 'Modifier', onChoisir: () => setFormulaire({ conteneur: c }) },
                    { id: 'supprimer', libelle: 'Supprimer', danger: true, onChoisir: () => setSuppression(c) },
                  ]}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {formulaire ? (
        <FormulaireConteneur conteneur={formulaire.conteneur} onFermer={() => setFormulaire(null)} onEnregistre={recharger} />
      ) : null}
      {suppression ? (
        <Confirmation
          titre={`Supprimer le conteneur ${suppression.reference ?? ''} ?`}
          consequence="Il disparaît du stock. Cette action est définitive."
          verbe="Supprimer"
          danger
          chargement={enCours === suppression._id}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setSuppression(null)}
        />
      ) : null}
    </div>
  );
}
