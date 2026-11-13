/** @jsxRuntime automatic @jsxImportSource react */
/**
 * « Répondre » à un message du client, depuis le fil « Échanges ».
 *
 * À l'ouverture, l'outil propose une réponse (IA, sur la demande, la fiche et
 * le message du client anonymisé) ; l'équipe la relit, la corrige et l'envoie.
 * Le destinataire est affiché en lecture seule : l'API le relit dans la
 * demande. Si la réponse du client suffit pour chiffrer, la fenêtre le dit et
 * mène au devis (« Préparer le devis », ou « Envoyer le devis » s'il est prêt).
 */
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { envoyerReponse, suggererReponse } from '../../actions/echanges';
import { fusionner } from '../../domaine/fusion';
import { manquesDevis } from '../../domaine/manques';
import { appelClient } from '../../domaine/messages';
import type { Brouillon, Dossier, Echange } from '../../domaine/types';
import { Bouton, Modale, Saisie, Squelette, ZoneTexte } from '../../ui';
import { texteEchec, useContexteDossierOptionnel } from './ContexteDossier';
import { useAvecCle, useContexteEcriture, useLanceur } from './devis/outilsVue';

export interface FenetreReponseProps {
  dossier: Dossier;
  brouillon: Brouillon;
  /** Message auquel on répond. */
  echange: Echange;
  onFermer: () => void;
}

/** « Re : objet », sans empiler les « Re : ». */
export function objetReponse(objet: string | undefined): string {
  const base = (objet ?? '').trim().replace(/^((re|tr|fwd?)\s*:\s*)+/i, '');
  return base ? `Re : ${base}` : 'Votre demande de devis HGWF Cargo';
}

/** Le modèle écrit « Bonjour, » sans nom (aucun nom ne lui est transmis) : on l'ajoute ici. */
export function saluer(texte: string, appel: string): string {
  if (!appel) return texte;
  return texte.replace(/^Bonjour\s*,/, `Bonjour ${appel},`);
}

export function FenetreReponse({ dossier, brouillon, echange, onFermer }: FenetreReponseProps): ReactElement {
  const ctx = useContexteEcriture();
  const avecCle = useAvecCle();
  const lancer = useLanceur();
  const page = useContexteDossierOptionnel();
  const demande = dossier.demande;
  const appel = appelClient(demande?.clientNom, demande?.facturationType);

  const [objet, setObjet] = useState(objetReponse(echange.objet));
  const [texte, setTexte] = useState('');
  const [proposition, setProposition] = useState('');
  const [chargement, setChargement] = useState(true);
  const [devisPossible, setDevisPossible] = useState(false);
  const [manques, setManques] = useState<string[]>([]);
  const [erreurIa, setErreurIa] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreurIa(null);
    void avecCle(() => suggererReponse(ctx, dossier, echange)).then((r) => {
      if (annule) return;
      setChargement(false);
      if (!r.ok) {
        setErreurIa(`${texteEchec(r)} Vous pouvez écrire la réponse vous-même.`);
        return;
      }
      const t = saluer(r.suggestion.texte, appel);
      setProposition(t);
      // À l'ouverture, la proposition n'écrase pas une saisie commencée ; « Proposer une autre réponse » la remplace.
      setTexte((actuel) => (essai > 0 || actuel.trim() === '' ? t : actuel));
      setDevisPossible(r.suggestion.devisPossible);
      setManques(r.suggestion.manques);
    });
    return () => {
      annule = true;
    };
    // Une proposition à l'ouverture et sur « Proposer une autre réponse » seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essai]);

  async function envoyer(): Promise<void> {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await lancer(() => avecCle(() => envoyerReponse(ctx, dossier, echange, { objet, texte })));
      if (r.ok) onFermer();
      else setErreur(texteEchec(r));
    } finally {
      setEnvoi(false);
    }
  }

  const effective = demande ? fusionner(demande, brouillon) : undefined;
  const devisPret = effective ? manquesDevis(effective).length === 0 : false;
  const modifie = texte.trim() !== '' && texte !== proposition;

  function versDevis(): void {
    onFermer();
    if (devisPret) page?.ouvrirFenetre('envoi');
    else page?.allerA('devis');
  }

  return (
    <Modale
      titre={`Répondre à ${appel || 'votre client'}`}
      large
      onFermer={onFermer}
      empecherFermeture={envoi || modifie}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer} desactive={envoi}>
            Annuler
          </Bouton>
          <Bouton variante="primaire" chargement={envoi} desactive={chargement || !texte.trim() || !objet.trim()} onClick={() => void envoyer()}>
            Envoyer la réponse
          </Bouton>
        </>
      }
    >
      <div className="bo-pile">
        <div className="bo-citation">
          <p className="bo-secondaire">Message du client</p>
          <p className="bo-fort">{echange.objet?.trim() || '(sans objet)'}</p>
          <p className="bo-echange-texte">{(echange.texte ?? '').trim().slice(0, 1500) || 'Ce message ne contient pas de texte.'}</p>
        </div>

        {devisPossible && page ? (
          <div className="bo-bandeau bo-bandeau--info" role="status">
            <span>D’après sa réponse, le devis peut maintenant être établi.</span>
            <span className="bo-espace" />
            <Bouton variante="secondaire" taille="s" onClick={versDevis}>
              {devisPret ? 'Envoyer le devis' : 'Préparer le devis'}
            </Bouton>
          </div>
        ) : null}
        {!devisPossible && manques.length > 0 ? (
          <p className="bo-secondaire">Il manque encore pour chiffrer : {manques.join(' ; ')}.</p>
        ) : null}

        <Saisie etiquette="À" valeur={demande?.email ?? ''} onChange={() => undefined} lectureSeule />
        <Saisie etiquette="Objet" valeur={objet} onChange={setObjet} />
        {chargement ? (
          <div className="bo-pile" aria-busy="true">
            <p className="bo-secondaire" role="status">
              Rédaction d’une proposition de réponse…
            </p>
            <Squelette lignes={5} />
          </div>
        ) : (
          <ZoneTexte etiquette="Message" valeur={texte} onChange={setTexte} lignes={12} />
        )}
        {erreurIa ? <p className="bo-secondaire" role="status">{erreurIa}</p> : null}
        {!chargement ? (
          <div>
            <Bouton variante="discret" taille="s" onClick={() => setEssai((n) => n + 1)}>
              Proposer une autre réponse
            </Bouton>
          </div>
        ) : null}
        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Modale>
  );
}
