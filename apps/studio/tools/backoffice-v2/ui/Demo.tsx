/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Page de démonstration du kit : chaque composant dans chaque état, dans une
 * `.bo-racine` autonome. Sert à la revue visuelle et aux captures du harnais ;
 * n'est importée par aucune vue.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { GlobalStyle } from '../theme/GlobalStyle';
import {
  Badge,
  Bouton,
  Carte,
  Champ,
  ChoixTVA,
  Confirmation,
  DateChamp,
  EtatVide,
  Frise,
  LigneCliquable,
  Liste,
  Manques,
  MenuActions,
  Modale,
  Montant,
  Saisie,
  Section,
  Segments,
  Squelette,
  Toasts,
  ZoneTexte,
} from './index';

const ETAPES = [
  { id: 'demande', libelle: 'Demande' },
  { id: 'devis', libelle: 'Devis' },
  { id: 'accord', libelle: 'Accord' },
  { id: 'preparation', libelle: 'Préparation' },
  { id: 'transport', libelle: 'Transport' },
  { id: 'livre', libelle: 'Livré' },
];

export function Demo(): ReactElement {
  const [ouverte, setOuverte] = useState(true);
  const [vue, setVue] = useState('cours');
  const [montant, setMontant] = useState<number | null>(1250);
  const [tva, setTva] = useState<0 | 20 | null>(null);
  const [texte, setTexte] = useState('');
  const [date, setDate] = useState('2026-11-06');
  const [fenetre, setFenetre] = useState<'aucune' | 'modale' | 'confirmation'>('aucune');
  const [toasts, setToasts] = useState([
    { id: '1', type: 'succes' as const, message: 'Devis envoyé à martin@example.fr' },
    { id: '2', type: 'erreur' as const, message: 'Le dossier a été modifié par quelqu’un d’autre.' },
  ]);

  return (
    <div className="bo-racine">
      <GlobalStyle />
      <div className="bo-page">
        <h1 className="bo-titre-page">Kit d’interface</h1>
        <Carte titre="Boutons">
          <div className="bo-rangee">
            <Bouton variante="primaire">Envoyer le devis</Bouton>
            <Bouton>Secondaire</Bouton>
            <Bouton variante="discret">Discret</Bouton>
            <Bouton variante="danger">Annuler le dossier</Bouton>
            <Bouton chargement>Envoi en cours</Bouton>
            <Bouton desactive aria-describedby="demo-manques">Désactivé</Bouton>
            <MenuActions
              elements={[
                { id: 'pdf', libelle: 'Télécharger le devis PDF', onChoisir: () => undefined },
                { id: 'sans-suite', libelle: 'Sans suite', danger: true, onChoisir: () => undefined },
              ]}
            />
          </div>
          <Manques id="demo-manques" manques={['Le montant HT', 'La TVA']} />
        </Carte>
        <Carte titre="Badges et frise">
          <div className="bo-rangee">
            <Badge ton="neutre">Nouvelle demande</Badge>
            <Badge ton="info" icone="horloge">En route</Badge>
            <Badge ton="attention" icone="alerte">À chiffrer</Badge>
            <Badge ton="urgent" icone="alerte">Incident</Badge>
            <Badge ton="ok" icone="coche">Livré</Badge>
          </div>
          <Frise etapes={ETAPES} courante="transport" />
          <Frise etapes={ETAPES} courante="preparation" ton="urgent" />
        </Carte>
        <Carte titre="Champs">
          <div className="bo-grille">
            <Saisie etiquette="Nom du client" valeur="Dupont" onChange={() => undefined} requis />
            <Saisie etiquette="E-mail" valeur="" onChange={() => undefined} erreur="Adresse absente" type="email" />
            <Montant etiquette="Montant HT" valeur={montant} onChange={setMontant} requis aide="Montant hors taxes." />
            <ChoixTVA valeur={tva} onChange={setTva} />
            <Liste etiquette="Fiche service" valeur="g" options={[{ valeur: 'g', libelle: 'Groupage maritime' }]} onChange={() => undefined} />
            <DateChamp etiquette="Départ prévu" valeur={date} onChange={setDate} />
            <Champ etiquette="Groupe libre"><Bouton taille="s">Un contrôle</Bouton></Champ>
          </div>
          <ZoneTexte etiquette="Description" valeur={texte} onChange={setTexte} />
        </Carte>
        <Section titre="Facturation" resume="Incomplet : 2 champs" ouverte={ouverte} onBasculer={() => setOuverte(!ouverte)}>
          <p>Contenu de la section.</p>
        </Section>
        <Segments
          libelle="Vues"
          courant={vue}
          onChoisir={setVue}
          valeurs={[{ id: 'cours', libelle: 'En cours', compteur: 12 }, { id: 'devis', libelle: 'Devis', compteur: 4 }, { id: 'fin', libelle: 'Terminés' }]}
        />
        <LigneCliquable onClick={() => undefined}>
          <strong>Dupont</strong> <span className="bo-secondaire">Reçue il y a 2 jours</span>
        </LigneCliquable>
        <Squelette lignes={2} />
        <EtatVide titre="Rien d’urgent" phrase="Tous les dossiers sont à jour." action={{ libelle: 'Voir les dossiers en cours', onClick: () => undefined }} />
        <div className="bo-rangee">
          <Bouton onClick={() => setFenetre('modale')}>Ouvrir une fenêtre</Bouton>
          <Bouton onClick={() => setFenetre('confirmation')}>Ouvrir une confirmation</Bouton>
        </div>
      </div>
      {fenetre === 'modale' ? (
        <Modale titre="Envoyer le devis à Martin" onFermer={() => setFenetre('aucune')} pied={<Bouton variante="primaire">Envoyer</Bouton>}>
          <Saisie etiquette="Objet" valeur="Votre devis" onChange={() => undefined} />
        </Modale>
      ) : null}
      {fenetre === 'confirmation' ? (
        <Confirmation titre="Créer l’expédition ?" consequence="Le suivi devient public pour le client." verbe="Créer l’expédition" onConfirmer={() => setFenetre('aucune')} onAnnuler={() => setFenetre('aucune')} />
      ) : null}
      <Toasts toasts={toasts} onFermer={(id) => setToasts((l) => l.filter((t) => t.id !== id))} />
    </div>
  );
}
