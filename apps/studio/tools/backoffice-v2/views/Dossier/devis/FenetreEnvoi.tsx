/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre d'envoi unique (4.4), pour le devis et pour les compléments.
 * Elle EST la confirmation : pas de seconde fenêtre « Êtes-vous sûr ? ». L'aperçu
 * (objet, message) vient de l'API, jamais réécrit côté client ; seul le champ
 * « À » est affiché en lecture seule (le destinataire n'est jamais pris dans un
 * paramètre modifiable). Si l'e-mail est parti mais que le statut n'a pas pu
 * être posé, la fenêtre propose de terminer l'enregistrement SANS renvoyer
 * d'e-mail (jamais de double envoi).
 */
import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { apercuEnvoi, envoyerComplement, envoyerDevis, terminerEnvoi } from '../../../actions/envoi';
import type { ApercuEnvoi, FenetreEnvoiProps } from '../../../domaine/contrats';
import { fusionner } from '../../../domaine/fusion';
import { manquesDevis, manquesEnvoiComplement } from '../../../domaine/manques';
import { appelClient } from '../../../domaine/messages';
import { Bouton, Manques, Modale, Saisie, Squelette, ZoneTexte } from '../../../ui';
import { texteEchec } from '../ContexteDossier';
import { useAvecCle, useContexteEcriture, useLanceur } from './outilsVue';

export function FenetreEnvoi({ dossier, brouillon, mode, onFermer, onTermine }: FenetreEnvoiProps): ReactElement | null {
  const ctx = useContexteEcriture();
  const avecCle = useAvecCle();
  const lancer = useLanceur();
  const idManques = useId();
  const [apercu, setApercu] = useState<ApercuEnvoi | null>(null);
  const [objet, setObjet] = useState('');
  const [message, setMessage] = useState('');
  const [erreurApercu, setErreurApercu] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Vrai quand l'e-mail est parti mais que le statut 2 n'a pas été posé (4.4).
  const [statutACorriger, setStatutACorriger] = useState(false);
  const [essai, setEssai] = useState(0);

  const demande = dossier.demande;
  const effective = demande ? fusionner(demande, brouillon) : undefined;
  const manques = effective ? (mode === 'devis' ? manquesDevis(effective) : manquesEnvoiComplement(effective)) : [];

  // L'aperçu reflète ce qui est à l'écran (document enregistré + brouillon), pas la version enregistrée seule.
  const dossierEffectif = useCallback(
    () => (demande ? { ...dossier, demande: fusionner(demande, brouillon) } : dossier),
    [dossier, demande, brouillon],
  );

  useEffect(() => {
    let annule = false;
    setApercu(null);
    setErreurApercu(null);
    void avecCle(() => apercuEnvoi(ctx, dossierEffectif(), mode)).then((r) => {
      if (annule) return;
      if (r.ok) {
        setApercu(r.apercu);
        setObjet(r.apercu.objet);
        setMessage(r.apercu.message);
      } else {
        setErreurApercu(texteEchec(r));
      }
    });
    return () => {
      annule = true;
    };
    // L'aperçu se charge à l'ouverture et sur « Réessayer » seulement : le recalculer à chaque
    // frappe du brouillon écraserait l'objet et le message que l'équipe est en train de relire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, essai]);

  async function envoyer(): Promise<void> {
    if (envoi || !apercu || manques.length > 0) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const saisie = { objet, message };
      const r = await lancer(() =>
        avecCle(() =>
          mode === 'devis'
            ? envoyerDevis(ctx, dossier, brouillon, saisie)
            : envoyerComplement(ctx, dossier, brouillon, saisie),
        ),
      );
      if (!r.ok) setErreur(texteEchec(r));
      else if (r.statutACorriger) setStatutACorriger(true);
      else onTermine();
    } finally {
      setEnvoi(false);
    }
  }

  async function reessayerStatut(): Promise<void> {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      // Aucun e-mail : `terminerEnvoi` relit la demande et pose seulement le statut 2.
      const r = await lancer(() => terminerEnvoi(ctx, dossier));
      if (r.ok) onTermine();
      else setErreur(texteEchec(r));
    } finally {
      setEnvoi(false);
    }
  }

  const titre = mode === 'devis' ? `Envoyer le devis à ${appelClient(demande?.clientNom, demande?.facturationType) || 'le client'}` : 'Demander des compléments';
  const modifie = apercu !== null && (objet !== apercu.objet || message !== apercu.message);

  const pied = statutACorriger ? (
    <>
      <Bouton variante="discret" onClick={onFermer} desactive={envoi}>
        Fermer
      </Bouton>
      <Bouton variante="primaire" chargement={envoi} onClick={() => void reessayerStatut()}>
        Réessayer la mise à jour
      </Bouton>
    </>
  ) : (
    <>
      <Bouton variante="discret" onClick={onFermer} desactive={envoi}>
        Annuler
      </Bouton>
      <Bouton
        variante="primaire"
        chargement={envoi}
        desactive={!apercu || manques.length > 0}
        aria-describedby={manques.length > 0 ? idManques : undefined}
        onClick={() => void envoyer()}
      >
        Envoyer
      </Bouton>
    </>
  );

  return (
    <Modale titre={titre} onFermer={onFermer} empecherFermeture={envoi || modifie || statutACorriger} pied={pied}>
      <div className="bo-pile">
        {statutACorriger ? (
          <div className="bo-bandeau bo-bandeau--urgent" role="alert">
            Envoyé mais statut non mis à jour. L’e-mail est bien parti : n’envoyez rien de plus, terminez simplement
            l’enregistrement.
          </div>
        ) : null}
        {erreurApercu ? (
          <div className="bo-pile">
            <p className="bo-erreur" role="alert">
              {erreurApercu}
            </p>
            <div>
              <Bouton variante="secondaire" onClick={() => setEssai((n) => n + 1)}>
                Réessayer
              </Bouton>
            </div>
          </div>
        ) : null}
        {!apercu && !erreurApercu ? <Squelette lignes={5} /> : null}
        {apercu ? (
          <>
            <Manques manques={manques} id={idManques} />
            <Saisie etiquette="De" valeur={apercu.de} onChange={() => undefined} lectureSeule />
            <Saisie etiquette="À" valeur={apercu.a} onChange={() => undefined} lectureSeule />
            <Saisie etiquette="Pièce jointe" valeur={apercu.pieceJointe} onChange={() => undefined} lectureSeule />
            <Saisie etiquette="Objet" valeur={objet} onChange={setObjet} lectureSeule={statutACorriger} />
            <ZoneTexte etiquette="Message" valeur={message} onChange={setMessage} lignes={10} lectureSeule={statutACorriger} />
          </>
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
