/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Échanges » (4.3) : le fil des réponses du client aux e-mails du
 * back-office, la plus récente en haut. Les réponses non lues sont mises en
 * avant ; « Marquer comme lu » n'écrit que `lu = true` sur l'échange.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { marquerEchangesLus } from '../../actions/echanges';
import type { SectionDossierProps } from '../../domaine/contrats';
import {
  adresseReponse,
  dateEchange,
  estNonLu,
  explicationErreurEchange,
  formaterTaille,
  trierEchanges,
} from '../../domaine/echanges';
import { formaterDateHeure } from '../../domaine/format';
import type { Echange, PieceEchange } from '../../domaine/types';
import { Badge, Bouton, EtatVide, Icone, Section } from '../../ui';
import { useContexteDossierOptionnel } from './ContexteDossier';
import { useContexteEcritureDossier } from './contexteEcriture';

/** Au-delà, le message est replié : une réponse cite souvent tout le fil précédent. */
const LONGUEUR_REPLI = 1200;

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function resumeEchanges(echanges: Echange[]): string {
  if (echanges.length === 0) return 'Aucune réponse';
  const nonLus = echanges.filter(estNonLu).length;
  if (nonLus > 0) return `${pluriel(nonLus, 'réponse')} non lue${nonLus > 1 ? 's' : ''}`;
  const derniere = dateEchange(trierEchanges(echanges)[0] as Echange);
  return `${pluriel(echanges.length, 'réponse')}${derniere ? `, dernière le ${formaterDateHeure(derniere)}` : ''}`;
}

function LignePiece({ piece }: { piece: PieceEchange }): ReactElement {
  const taille = formaterTaille(piece.taille);
  const nom = piece.nom?.trim() || 'Pièce jointe';
  if (!piece.url) {
    return <li className="bo-secondaire">{nom} : fichier indisponible</li>;
  }
  return (
    <li>
      <a className="bo-piece" href={piece.url} target="_blank" rel="noopener noreferrer" download={nom}>
        <Icone nom="telecharger" taille={16} />
        <span>{nom}</span>
        {taille ? <span className="bo-secondaire">{taille}</span> : null}
      </a>
    </li>
  );
}

interface MessageProps {
  echange: Echange;
  onLire?: () => void;
  occupe: boolean;
}

function Message({ echange, onLire, occupe }: MessageProps): ReactElement {
  const [deplie, setDeplie] = useState(false);
  const nonLu = estNonLu(echange);
  const date = dateEchange(echange);
  const texte = (echange.texte ?? '').trim();
  const long = texte.length > LONGUEUR_REPLI;
  const affiche = long && !deplie ? `${texte.slice(0, LONGUEUR_REPLI).trimEnd()}…` : texte;
  const pieces = echange.pieces ?? [];

  return (
    <li className={`bo-echange${nonLu ? ' bo-echange--nonlu' : ''}`} data-echange={echange._id}>
      <div className="bo-rangee">
        <span className="bo-fort">{echange.de?.trim() || 'Expéditeur inconnu'}</span>
        {nonLu ? (
          <Badge ton="attention" icone="enveloppe">
            Non lu
          </Badge>
        ) : null}
        <span className="bo-secondaire bo-espace">{date ? formaterDateHeure(date) : 'Date inconnue'}</span>
      </div>
      <p className="bo-fort">{echange.objet?.trim() || '(sans objet)'}</p>
      {echange.expediteurVerifie === false ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="alert" data-alerte="expediteur">
          <Icone nom="alerte" />
          <span>
            Expéditeur à vérifier
            {echange.motifNonVerifie ? ` : ${echange.motifNonVerifie}` : ''}. Ce message n’a pas fait avancer le dossier.
            Avant de répondre ou d’ouvrir un lien, confirmez auprès du client par ses coordonnées habituelles.
          </span>
        </div>
      ) : null}
      {texte ? (
        <p className="bo-echange-texte">{affiche}</p>
      ) : (
        <p className="bo-secondaire">Ce message ne contient pas de texte.</p>
      )}
      {long ? (
        <div>
          <Bouton variante="discret" taille="s" onClick={() => setDeplie((v) => !v)}>
            {deplie ? 'Réduire le message' : 'Afficher tout le message'}
          </Bouton>
        </div>
      ) : null}
      {pieces.length > 0 ? (
        <ul className="bo-pieces" aria-label="Pièces jointes">
          {pieces.map((p) => (
            <LignePiece key={p._key} piece={p} />
          ))}
        </ul>
      ) : null}
      {echange.erreur ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <Icone nom="alerte" />
          <span>{explicationErreurEchange(echange.erreur)}</span>
        </div>
      ) : null}
      {nonLu && onLire ? (
        <div>
          <Bouton variante="secondaire" taille="s" desactive={occupe} onClick={onLire}>
            Marquer comme lu
          </Bouton>
        </div>
      ) : null}
    </li>
  );
}

export function SectionEchanges({ dossier, ouverte, onBasculer }: SectionDossierProps): ReactElement {
  const contexte = useContexteDossierOptionnel();
  const ctxEcriture = useContexteEcritureDossier();
  const [occupe, setOccupe] = useState(false);
  const echanges = useMemo(() => trierEchanges(dossier.echanges ?? []), [dossier.echanges]);
  const nonLus = echanges.filter(estNonLu);
  const reference = dossier.demande?.reference || dossier.expedition?.demandeRef || dossier.expedition?.reference || '';

  async function lire(cibles: Echange[]): Promise<void> {
    if (!contexte || occupe) return;
    setOccupe(true);
    try {
      await contexte.lancer(() => marquerEchangesLus(ctxEcriture, cibles));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Section titre="Échanges" resume={resumeEchanges(echanges)} ouverte={ouverte} onBasculer={onBasculer}>
      {echanges.length === 0 ? (
        <EtatVide
          titre="Aucune réponse pour le moment"
          phrase={`Les réponses du client à vos e-mails apparaîtront ici.${
            reference ? ` L’adresse de réponse de ce dossier : ${adresseReponse(reference)}` : ''
          }`}
        />
      ) : (
        <>
          {nonLus.length > 1 && contexte ? (
            <div>
              <Bouton variante="secondaire" taille="s" desactive={occupe} onClick={() => void lire(nonLus)}>
                Tout marquer comme lu
              </Bouton>
            </div>
          ) : null}
          <ol className="bo-pile">
            {echanges.map((e) => (
              <Message key={e._id} echange={e} occupe={occupe} {...(contexte ? { onLire: () => void lire([e]) } : {})} />
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}
