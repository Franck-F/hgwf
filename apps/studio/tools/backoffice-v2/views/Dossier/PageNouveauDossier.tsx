/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Mode création de la page Dossier (`#/dossier/nouveau`, 4.3) : une demande
 * reçue au téléphone. Fenêtre minimale (nom, téléphone ou e-mail, type
 * d'envoi, destination, volume, message). Crée une demande déjà prise en
 * charge (statut 1), sans accusé de réception, puis ouvre le dossier.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { creerDossierManuel } from '../../actions/demande';
import { useRoute, useToasts } from '../../app/Contexte';
import { useMagasin } from '../../data/magasin';
import type { NouveauDossierSaisie } from '../../domaine/contrats';
import { Bouton, Carte, Liste, Saisie, ZoneTexte } from '../../ui';
import { useContexteEcritureDossier } from './contexteEcriture';
import { texteEchec } from './ContexteDossier';
import { useGardeQuitter } from './useGardeQuitter';

/** Les types d'envoi du formulaire public du site. */
const TYPES_ENVOI = ['Groupage maritime', 'Conteneur complet', 'Véhicule / Bateau', 'Colis et petits envois'];

interface Erreurs {
  clientNom?: string;
  contact?: string;
  typeEnvoi?: string;
  destination?: string;
}

const VIDE = { clientNom: '', telephone: '', email: '', typeEnvoi: '', destination: '', volume: '', message: '' };

export function PageNouveauDossier(): ReactElement {
  const { naviguer } = useRoute();
  const toasts = useToasts();
  const { recharger } = useMagasin();
  const ctx = useContexteEcritureDossier();
  const [saisie, setSaisie] = useState(VIDE);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [enCours, setEnCours] = useState(false);

  const modifie = Object.values(saisie).some((v) => v.trim() !== '');
  const garde = useGardeQuitter(modifie && !enCours);

  const champ = (nom: keyof typeof VIDE) => (valeur: string) => {
    setSaisie((s) => ({ ...s, [nom]: valeur }));
    setErreurs({});
  };

  function verifier(): Erreurs {
    const e: Erreurs = {};
    if (!saisie.clientNom.trim()) e.clientNom = 'Indiquez le nom du client.';
    if (!saisie.telephone.trim() && !saisie.email.trim()) e.contact = 'Indiquez un téléphone ou une adresse e-mail.';
    if (!saisie.typeEnvoi) e.typeEnvoi = 'Choisissez le type d’envoi.';
    if (!saisie.destination.trim()) e.destination = 'Indiquez la destination.';
    return e;
  }

  async function creer(): Promise<void> {
    if (enCours) return;
    const e = verifier();
    setErreurs(e);
    if (Object.keys(e).length > 0) return;
    setEnCours(true);
    const donnees: NouveauDossierSaisie = {
      clientNom: saisie.clientNom.trim(),
      typeEnvoi: saisie.typeEnvoi,
      destination: saisie.destination.trim(),
      ...(saisie.telephone.trim() ? { telephone: saisie.telephone.trim() } : {}),
      ...(saisie.email.trim() ? { email: saisie.email.trim() } : {}),
      ...(saisie.volume.trim() ? { volume: saisie.volume.trim() } : {}),
      ...(saisie.message.trim() ? { message: saisie.message.trim() } : {}),
    };
    const r = await creerDossierManuel(ctx, donnees);
    if (!r.ok) {
      setEnCours(false);
      toasts.erreur(texteEchec(r));
      return;
    }
    toasts.succes('Dossier créé.');
    await recharger();
    // La garde se retire d'elle-même : le formulaire n'est plus « modifié » (enCours).
    naviguer(`/dossier/${r.dossierId}`, { remplacer: true });
  }

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">Nouveau dossier</h1>
      </div>
      <Carte>
        <div className="bo-grille">
          <Saisie etiquette="Nom du client" requis valeur={saisie.clientNom} erreur={erreurs.clientNom} onChange={champ('clientNom')} />
          <Saisie etiquette="Téléphone" type="tel" valeur={saisie.telephone} erreur={erreurs.contact} onChange={champ('telephone')} />
          <Saisie etiquette="Adresse e-mail" type="email" valeur={saisie.email} onChange={champ('email')} />
          <Liste
            etiquette="Type d’envoi"
            requis
            valeur={saisie.typeEnvoi}
            vide="Choisir…"
            erreur={erreurs.typeEnvoi}
            options={TYPES_ENVOI.map((t) => ({ valeur: t, libelle: t }))}
            onChange={champ('typeEnvoi')}
          />
          <Saisie etiquette="Destination" requis valeur={saisie.destination} erreur={erreurs.destination} onChange={champ('destination')} />
          <Saisie etiquette="Volume" valeur={saisie.volume} onChange={champ('volume')} />
        </div>
        <ZoneTexte etiquette="Message du client" valeur={saisie.message} lignes={4} onChange={champ('message')} />
        <div className="bo-rangee">
          <Bouton variante="primaire" chargement={enCours} onClick={() => void creer()}>
            Créer le dossier
          </Bouton>
          <Bouton variante="discret" desactive={enCours} onClick={() => naviguer('/dossiers')}>
            Annuler
          </Bouton>
        </div>
      </Carte>
      {garde}
    </div>
  );
}
