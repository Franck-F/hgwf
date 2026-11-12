/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fiches services (4.7) : chaque fiche s'ouvre en édition directe
 * (`EditeurFiche`), sans passer par le Studio. « Nouvelle fiche » demande le
 * nom du service. Les fiches retirées des choix restent listées (badge
 * « Retirée ») pour pouvoir être réactivées.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { creerFiche } from '../../actions/fiches';
import { useToasts } from '../../app/Contexte';
import { useFichesRetirees } from '../../data/useFichesRetirees';
import { useOutils } from '../../data/useOutils';
import { prixManquants } from '../../domaine/fiches';
import type { Fiche } from '../../domaine/types';
import { Badge, Bouton, EtatVide, Icone, Modale, Saisie, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';
import { useContexteEcriture } from './contexte';
import { EditeurFiche } from './EditeurFiche';

function etatGrille(f: Fiche): { ton: 'ok' | 'attention' | 'neutre'; texte: string } {
  const lignes = (f.grille ?? []).filter((l) => l.designation);
  if (lignes.length === 0) return { ton: 'neutre', texte: 'Pas de grille de prix' };
  const manquants = prixManquants(f);
  if (manquants === 0) return { ton: 'ok', texte: 'Grille renseignée' };
  return { ton: 'attention', texte: `${manquants} ${manquants > 1 ? 'prix manquants' : 'prix manquant'}` };
}

function NouvelleFiche({ ordre, onFermer, onCreee }: { ordre: number; onFermer: () => void; onCreee: (id: string) => void }): ReactElement {
  const ctx = useContexteEcriture();
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function creer(): Promise<void> {
    if (enCours) return;
    if (!titre.trim()) {
      setErreur('Le nom du service est obligatoire.');
      return;
    }
    setErreur('');
    setEnCours(true);
    const r = await creerFiche(ctx, { titre, ordre });
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return;
    }
    onCreee(r.ficheId);
  }

  return (
    <Modale
      titre="Nouvelle fiche"
      onFermer={onFermer}
      empecherFermeture={titre !== ''}
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
      <Saisie etiquette="Nom du service" requis valeur={titre} onChange={setTitre} erreur={erreur} placeholder="Groupage maritime" />
    </Modale>
  );
}

export function FichesServices(): ReactElement {
  const { fiches, chargement, erreur, recharger } = useOutils();
  const { retirees, relireRetirees } = useFichesRetirees();
  const toasts = useToasts();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const toutes = [...fiches, ...retirees].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));
  const prochainOrdre = toutes.reduce((m, f) => Math.max(m, f.ordre ?? 0), 0) + 1;

  const relire = async (): Promise<void> => {
    await Promise.all([recharger(), relireRetirees()]);
  };

  return (
    <div className="bo-pile">
      <div className="bo-rangee">
        <h2 className="bo-groupe-titre">Fiches services</h2>
        <span className="bo-espace">
          <Bouton variante="primaire" onClick={() => setCreation(true)}>
            <Icone nom="plus" /> Nouvelle fiche
          </Bouton>
        </span>
      </div>

      {erreur ? (
        <BandeauErreur message="Impossible de charger les fiches services" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={3} />
      ) : toutes.length === 0 ? (
        <EtatVide titre="Aucune fiche service" phrase="Créez la première avec « Nouvelle fiche »." />
      ) : (
        <ul className="bo-pile" aria-label="Fiches services">
          {toutes.map((f) => {
            const etat = etatGrille(f);
            const estOuverte = ouverte === f._id;
            return (
              <li key={f._id} className="bo-pile">
                <button
                  type="button"
                  className={`bo-ligne${f.actif === false ? ' bo-ligne--attenuee' : ''}`}
                  aria-expanded={estOuverte}
                  onClick={() => setOuverte(estOuverte ? null : f._id)}
                >
                  <span className="bo-fort">{f.titre || 'Fiche sans titre'}</span>
                  {f.actif === false ? <Badge ton="neutre">Retirée</Badge> : null}
                  <span className="bo-espace">
                    <Badge ton={etat.ton} icone={etat.ton === 'ok' ? 'coche' : etat.ton === 'attention' ? 'alerte' : undefined}>
                      {etat.texte}
                    </Badge>
                  </span>
                </button>
                {estOuverte ? (
                  <EditeurFiche
                    key={f._id}
                    fiche={f}
                    recharger={relire}
                    onSupprimee={() => {
                      setOuverte(null);
                      void relireRetirees();
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {creation ? (
        <NouvelleFiche
          ordre={prochainOrdre}
          onFermer={() => setCreation(false)}
          onCreee={(id) => {
            setCreation(false);
            toasts.succes('Fiche créée');
            void relire().then(() => setOuverte(id));
          }}
        />
      ) : null}
    </div>
  );
}
