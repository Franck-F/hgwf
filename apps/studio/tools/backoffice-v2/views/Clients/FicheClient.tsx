/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fiche client (4.6) : coordonnées modifiables, dossiers rapprochés par
 * e-mail puis par nom, suppression dans le menu « … ». « Enregistrer » est le
 * seul bouton plein, et seulement quand quelque chose a changé.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { modifierClient, supprimerClient } from '../../actions/clients';
import { useRoute, useToasts } from '../../app/Contexte';
import { useClients } from '../../data/useClients';
import { useDossiers } from '../../data/useDossiers';
import type { FicheClientProps } from '../../domaine/contrats';
import { formaterDate, ilYa } from '../../domaine/format';
import { LIBELLES_PHASE, TON_PHASE, phaseDe } from '../../domaine/phases';
import { derniereActivite } from '../../domaine/priorites';
import { Badge, Bouton, Carte, Confirmation, EtatVide, LigneCliquable, MenuActions, Saisie, Squelette } from '../../ui';
import { montantTTC, resumeDossier } from '../Dossiers/LigneDossier';
import { useContexteEcriture } from '../Outils/contexte';
import { assemblerContact, synthese } from './contactClient';

type Champ = 'nom' | 'email' | 'telephone' | 'destination';
type Saisies = Partial<Record<Champ, string>>;

export function FicheClient({ id }: FicheClientProps): ReactElement {
  const { clients, chargement, erreur, recharger } = useClients();
  const { dossiers } = useDossiers();
  const { naviguer, garde } = useRoute();
  const toasts = useToasts();
  const ctx = useContexteEcriture();
  const [saisies, setSaisies] = useState<Saisies>({});
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [quitter, setQuitter] = useState<{ resolve: (v: boolean) => void } | null>(null);

  const client = clients.find((c) => c._id === id) ?? null;
  const s = useMemo(() => (client ? synthese(client, dossiers) : null), [client, dossiers]);

  const initial: Record<Champ, string> = {
    nom: client?.nom ?? '',
    email: s?.email ?? '',
    telephone: s?.telephone ?? '',
    destination: client?.destination ?? '',
  };
  const valeur = (c: Champ): string => saisies[c] ?? initial[c];
  const modifies = (Object.keys(saisies) as Champ[]).filter((c) => saisies[c] !== undefined && saisies[c] !== initial[c]);
  const sale = modifies.length > 0;

  // Garde de navigation : quitter la fiche avec des saisies demande confirmation.
  useEffect(() => {
    if (!sale) {
      garde.definir(null);
      return undefined;
    }
    garde.definir(() => new Promise<boolean>((resolve) => setQuitter({ resolve })));
    return () => garde.definir(null);
  }, [sale, garde]);

  function decider(quitterVraiment: boolean): void {
    quitter?.resolve(quitterVraiment);
    setQuitter(null);
  }

  async function enregistrer(): Promise<void> {
    if (!client || enCours) return;
    if (!valeur('nom').trim()) {
      toasts.erreur('Le nom du client ne peut pas être vide.');
      return;
    }
    setEnCours(true);
    // La chaîne « mail · tél » n'est reconstruite que si l'un des deux a changé :
    // sinon on garde le texte d'origine, qui peut contenir autre chose.
    const contactChange = modifies.includes('email') || modifies.includes('telephone');
    const r = await modifierClient(ctx, client, {
      nom: valeur('nom').trim(),
      contact: contactChange ? assemblerContact(valeur('email'), valeur('telephone')) : (client.contact ?? ''),
      destination: valeur('destination').trim(),
    });
    if (!r.ok) {
      setEnCours(false);
      // Saisies conservées : rien n'est perdu sur un conflit ou une panne.
      toasts.erreur(r.message);
      return;
    }
    await recharger();
    setSaisies({});
    setEnCours(false);
    toasts.succes('Fiche enregistrée');
  }

  async function supprimer(): Promise<void> {
    if (!client) return;
    setEnCours(true);
    const r = await supprimerClient(ctx, client);
    setEnCours(false);
    setSuppression(false);
    if (!r.ok) {
      toasts.erreur(r.message);
      return;
    }
    setSaisies({});
    garde.definir(null);
    await recharger();
    toasts.succes(`Fiche de ${s?.nom ?? 'ce client'} supprimée`);
    naviguer('/clients');
  }

  if (erreur) {
    return (
      <div className="bo-page">
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <span>Impossible de charger la fiche</span>
          <span className="bo-espace">
            <Bouton variante="secondaire" onClick={() => void recharger()}>
              Réessayer
            </Bouton>
          </span>
        </div>
      </div>
    );
  }
  if (chargement) {
    return (
      <div className="bo-page">
        <Squelette forme="entete" />
        <Squelette forme="carte" />
      </div>
    );
  }
  if (!client || !s) {
    return (
      <div className="bo-page">
        <EtatVide
          titre="Cette fiche n’existe plus"
          action={{ libelle: 'Retour aux clients', onClick: () => naviguer('/clients') }}
        />
      </div>
    );
  }

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <Bouton variante="discret" onClick={() => naviguer('/clients')}>
          ← Clients
        </Bouton>
        <h1 className="bo-titre-page">{s.nom}</h1>
        <span className="bo-espace bo-rangee">
          {sale ? (
            <Bouton variante="discret" onClick={() => setSaisies({})}>
              Annuler
            </Bouton>
          ) : null}
          {sale ? (
            <Bouton variante="primaire" chargement={enCours} onClick={() => void enregistrer()}>
              Enregistrer
            </Bouton>
          ) : null}
          <MenuActions
            elements={[{ id: 'supprimer', libelle: 'Supprimer la fiche', danger: true, onChoisir: () => setSuppression(true) }]}
          />
        </span>
      </div>

      <Carte titre="Coordonnées">
        <div className="bo-grille">
          <Saisie etiquette="Nom" valeur={valeur('nom')} onChange={(v) => setSaisies({ ...saisies, nom: v })} requis />
          <Saisie
            etiquette="Destination habituelle"
            valeur={valeur('destination')}
            onChange={(v) => setSaisies({ ...saisies, destination: v })}
          />
          <Saisie etiquette="E-mail" type="email" valeur={valeur('email')} onChange={(v) => setSaisies({ ...saisies, email: v })} />
          <Saisie
            etiquette="Téléphone"
            type="tel"
            valeur={valeur('telephone')}
            onChange={(v) => setSaisies({ ...saisies, telephone: v })}
          />
        </div>
      </Carte>

      <Carte titre={`Dossiers (${s.dossiers.length})`}>
        {s.dossiers.length === 0 ? (
          <p className="bo-secondaire">Aucun dossier pour ce client.</p>
        ) : (
          <div className="bo-pile">
            {s.dossiers.map((d) => {
              const phase = phaseDe(d);
              const activite = derniereActivite(d);
              const reference = d.demande?.reference ?? d.expedition?.reference ?? '';
              // Service · destination · montant : de quoi reconnaître le dossier sans l'ouvrir.
              const detail = [resumeDossier(d), d.demande?.destination?.trim(), montantTTC(d.demande)].filter(Boolean).join(' · ');
              return (
                <LigneCliquable key={d.id} onClick={() => naviguer(`/dossier/${d.id}`)} aria-label={`Ouvrir le dossier ${reference}`}>
                  <span className="bo-fort">{reference}</span>
                  {detail ? <span>{detail}</span> : null}
                  <Badge ton={TON_PHASE[phase]}>{LIBELLES_PHASE[phase]}</Badge>
                  <span className="bo-espace bo-secondaire">
                    {activite ? `${formaterDate(activite)}, ${ilYa(activite, new Date())}` : ''}
                  </span>
                </LigneCliquable>
              );
            })}
          </div>
        )}
      </Carte>

      {suppression ? (
        <Confirmation
          titre={`Supprimer la fiche de ${s.nom} ?`}
          consequence="Ses dossiers ne sont pas supprimés."
          verbe="Supprimer la fiche"
          danger
          chargement={enCours}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setSuppression(false)}
        />
      ) : null}
      {quitter ? (
        <Confirmation
          titre="Quitter sans enregistrer ?"
          consequence={`Les modifications de la fiche de ${s.nom} seront perdues.`}
          verbe="Quitter"
          onConfirmer={() => decider(true)}
          onAnnuler={() => decider(false)}
        />
      ) : null}
    </div>
  );
}
