/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Édition directe d'une fiche service (Outils > Fiches services). Tous les
 * champs sont du texte : champ d'une ligne, zone de texte, ou « un élément par
 * ligne » pour les listes. L'enregistrement est automatique
 * (`useEnregistrementFiche`) ; l'indicateur en haut dit où l'on en est.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { definirFicheActive, nombreDemandesLiees, supprimerFiche } from '../../actions/fiches';
import { useToasts } from '../../app/Contexte';
import type { Fiche } from '../../domaine/types';
import { Bouton, Carte, Confirmation, Liste, Saisie, ZoneTexte } from '../../ui';
import { useContexteEcriture } from './contexte';
import { COLONNES_DELAIS, COLONNES_TARIF, type EtatFiche } from './fichesEdition';
import { LignesEditables } from './LignesEditables';
import { useEnregistrementFiche, type StatutFiche } from './useEnregistrementFiche';

interface Props {
  fiche: Fiche;
  /** Relit les fiches (après une écriture, un conflit, un retrait ou une suppression). */
  recharger: () => Promise<void> | void;
  onSupprimee: () => void;
}

const TVA = [
  { valeur: '0', libelle: '0 % — transport lié à l’export' },
  { valeur: '20', libelle: '20 %' },
];

export function IndicateurEnregistrement({ statut, onReessayer }: { statut: StatutFiche; onReessayer: () => void }): ReactElement {
  if (statut.type === 'erreur') {
    return (
      <p className="bo-erreur" role="alert">
        {statut.message}{' '}
        <Bouton variante="secondaire" taille="s" onClick={onReessayer}>
          Réessayer
        </Bouton>
      </p>
    );
  }
  const texte =
    statut.type === 'attente' || statut.type === 'cours'
      ? 'Enregistrement…'
      : statut.type === 'ok'
        ? `Enregistré à ${statut.heure}`
        : '';
  return (
    <p className="bo-secondaire" role="status" aria-live="polite">
      {texte}
    </p>
  );
}

export function EditeurFiche({ fiche, recharger, onSupprimee }: Props): ReactElement {
  const e = useEnregistrementFiche(fiche, recharger);
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const [dialogue, setDialogue] = useState<'supprimer' | 'retirer' | null>(null);
  const [liees, setLiees] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const { etat, erreurs, modifier } = e;
  const nom = fiche.titre || 'cette fiche';
  const retiree = fiche.actif === false;

  const texte = (champ: keyof EtatFiche, etiquette: string, lignes = 3) => (
    <ZoneTexte etiquette={etiquette} valeur={etat[champ] as string} lignes={lignes} onChange={(v) => modifier(champ, v as never)} />
  );
  const liste = (champ: keyof EtatFiche, etiquette: string, aide?: string) => (
    <ZoneTexte
      etiquette={`${etiquette} (un élément par ligne)`}
      aide={aide}
      valeur={etat[champ] as string}
      lignes={4}
      onChange={(v) => modifier(champ, v as never)}
    />
  );

  async function demanderSuppression(): Promise<void> {
    const n = await nombreDemandesLiees(ctx, fiche._id);
    setLiees(n);
    setDialogue(n > 0 ? 'retirer' : 'supprimer');
  }

  async function changerActivite(actif: boolean): Promise<void> {
    setEnCours(true);
    const r = await definirFicheActive(ctx, { _id: fiche._id, _rev: e.revision() }, actif);
    setEnCours(false);
    setDialogue(null);
    if (!r.ok) {
      toasts.erreur(r.message);
      return;
    }
    e.reconnaitre(r.rev);
    toasts.succes(actif ? `Fiche « ${nom} » réactivée` : `Fiche « ${nom} » retirée des choix`);
    await recharger();
  }

  async function supprimer(): Promise<void> {
    setEnCours(true);
    const r = await supprimerFiche(ctx, { _id: fiche._id, _rev: e.revision() });
    setEnCours(false);
    setDialogue(null);
    if (!r.ok) {
      toasts.erreur(r.message);
      return;
    }
    e.abandonner();
    toasts.succes(`Fiche « ${nom} » supprimée`);
    await recharger();
    onSupprimee();
  }

  return (
    <div className="bo-pile" onBlur={e.vider}>
      <IndicateurEnregistrement statut={e.statut} onReessayer={e.reessayer} />
      {e.avertissement ? (
        <div className="bo-bandeau bo-bandeau--info" role="status">
          <span>{e.avertissement}</span>
          <span className="bo-espace">
            <Bouton variante="discret" taille="s" onClick={e.fermerAvertissement}>
              Compris
            </Bouton>
          </span>
        </div>
      ) : null}

      <Carte titre="Le service">
        <div className="bo-pile">
          <Saisie etiquette="Nom du service" requis valeur={etat.titre} erreur={erreurs.titre} onChange={(v) => modifier('titre', v)} />
          <div className="bo-grille">
            <Saisie
              etiquette="Ordre d’affichage"
              valeur={etat.ordre}
              erreur={erreurs.ordre}
              onChange={(v) => modifier('ordre', v)}
            />
          </div>
          {texte('resume', 'En une phrase', 2)}
          {liste(
            'libellesFormulaire',
            'Libellés reconnus',
            'Le « Type d’envoi » d’une demande est rattaché à cette fiche s’il correspond à l’un de ces libellés. Majuscules et accents ignorés.',
          )}
        </div>
      </Carte>

      <Carte titre="Tarification">
        <div className="bo-pile">
          {texte('methodeTarif', 'Comment le prix se calcule')}
          <LignesEditables
            titre="Grille tarifaire"
            colonnes={COLONNES_TARIF}
            lignes={etat.grille}
            erreur={erreurs.grille}
            onChange={(l) => modifier('grille', l)}
          />
          <LignesEditables
            titre="Frais annexes possibles"
            colonnes={COLONNES_TARIF}
            lignes={etat.fraisAnnexes}
            erreur={erreurs.fraisAnnexes}
            onChange={(l) => modifier('fraisAnnexes', l)}
          />
          <Liste
            etiquette="Taux de TVA habituel"
            valeur={etat.tauxTVADefaut}
            options={TVA}
            vide="Non précisé"
            onChange={(v) => modifier('tauxTVADefaut', v)}
          />
          <LignesEditables
            titre="Délais indicatifs"
            colonnes={COLONNES_DELAIS}
            lignes={etat.delais}
            onChange={(l) => modifier('delais', l)}
          />
        </div>
      </Carte>

      <Carte titre="Contenu de la prestation">
        <div className="bo-pile">
          {liste('inclus', 'Compris dans la prestation')}
          {liste('nonInclus', 'Non compris')}
          {liste('documents', 'Documents à réclamer au client')}
          {liste('infosAObtenir', 'Informations à obtenir avant de chiffrer')}
          {liste('vigilance', 'Points de vigilance')}
        </div>
      </Carte>

      <Carte titre="Textes types du devis">
        <div className="bo-pile">
          {texte('modeleDescription', 'Description type de la prestation (sur le devis)', 4)}
          {texte('modeleMessage', 'Paragraphe propre au service dans la réponse au client', 5)}
          {texte('modeleNote', 'Liste de contrôle interne', 5)}
          {liste('aCompleter', 'Reste à compléter par l’équipe')}
        </div>
      </Carte>

      <div className="bo-rangee">
        {retiree ? (
          <Bouton variante="secondaire" chargement={enCours} onClick={() => void changerActivite(true)}>
            Réactiver la fiche
          </Bouton>
        ) : (
          <Bouton variante="secondaire" chargement={enCours} onClick={() => setDialogue('retirer')}>
            Retirer des choix
          </Bouton>
        )}
        <span className="bo-espace">
          <Bouton variante="danger" onClick={() => void demanderSuppression()}>
            Supprimer la fiche
          </Bouton>
        </span>
      </div>

      {dialogue === 'supprimer' ? (
        <Confirmation
          danger
          titre="Supprimer cette fiche ?"
          consequence={`La fiche « ${nom} » sera supprimée définitivement, avec sa grille de prix et ses textes types.`}
          verbe="Supprimer la fiche"
          chargement={enCours}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setDialogue(null)}
        />
      ) : null}
      {dialogue === 'retirer' ? (
        <Confirmation
          titre="Retirer cette fiche des choix ?"
          consequence={
            liees > 0
              ? `La fiche « ${nom} » est utilisée par ${liees} ${liees > 1 ? 'demandes' : 'demande'} : elle ne peut pas être supprimée. Retirée des choix, conservée pour les anciens devis. Vous pourrez la réactiver.`
              : `Retirée des choix, conservée pour les anciens devis. Vous pourrez la réactiver.`
          }
          verbe="Retirer"
          chargement={enCours}
          onConfirmer={() => void changerActivite(false)}
          onAnnuler={() => setDialogue(null)}
        />
      ) : null}
    </div>
  );
}
