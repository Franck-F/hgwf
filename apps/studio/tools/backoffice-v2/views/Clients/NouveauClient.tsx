/** @jsxRuntime automatic @jsxImportSource react */
/** Fenêtre « Nouveau client » : quatre champs, un seul bouton plein. */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { creerClient } from '../../actions/clients';
import { useRoute, useToasts } from '../../app/Contexte';
import { Bouton, Modale, Saisie } from '../../ui';
import { assemblerContact } from './contactClient';
import { useContexteEcriture } from '../Outils/contexte';

interface Props {
  onFermer: () => void;
  /** Appelé après création, pour relire la liste. */
  onCree: () => Promise<void> | void;
}

export function NouveauClient({ onFermer, onCree }: Props): ReactElement {
  const ctx = useContexteEcriture();
  const toasts = useToasts();
  const { naviguer } = useRoute();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [destination, setDestination] = useState('');
  const [erreurNom, setErreurNom] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const saisie = nom.trim() !== '' || email.trim() !== '' || telephone.trim() !== '' || destination.trim() !== '';

  async function creer(): Promise<void> {
    if (enCours) return;
    if (!nom.trim()) {
      setErreurNom('Indiquez le nom du client.');
      return;
    }
    setErreurNom('');
    setErreur('');
    setEnCours(true);
    const r = await creerClient(ctx, {
      nom: nom.trim(),
      contact: assemblerContact(email, telephone),
      destination: destination.trim(),
    });
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return;
    }
    toasts.succes(`Fiche de ${nom.trim()} créée`);
    await onCree();
    onFermer();
    naviguer(`/client/${r.clientId}`);
  }

  return (
    <Modale
      titre="Nouveau client"
      onFermer={onFermer}
      empecherFermeture={saisie}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton variante="primaire" chargement={enCours} onClick={() => void creer()}>
            Créer la fiche
          </Bouton>
        </>
      }
    >
      <div className="bo-pile">
        <Saisie etiquette="Nom" valeur={nom} onChange={setNom} requis erreur={erreurNom} />
        <Saisie etiquette="E-mail" valeur={email} onChange={setEmail} type="email" />
        <Saisie etiquette="Téléphone" valeur={telephone} onChange={setTelephone} type="tel" />
        <Saisie etiquette="Destination habituelle" valeur={destination} onChange={setDestination} />
        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Modale>
  );
}
