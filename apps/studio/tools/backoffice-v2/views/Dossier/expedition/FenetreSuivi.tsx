/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre « Faire avancer le suivi » (4.5) : avancer, notifier seulement, ou
 * livrer. Elle remplace « Étape suivante » + « Prévenir le client » séparés.
 * Quand l'étape visée est « Livré », le geste est celui de `marquerLivre` (étape
 * 4 et prise en charge 3 dans un seul patch) : aucun chemin n'écrit l'étape 4
 * seule. Si l'étape a avancé mais que l'e-mail n'est pas parti, l'étape reste
 * avancée et la fenêtre propose de réessayer l'e-mail seul.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { avancerSuivi, marquerLivre, notifierEtapeActuelle } from '../../../actions/expedition';
import type { FenetreSuiviProps } from '../../../domaine/contrats';
import { ETAPE, ETAPES_EXPEDITION } from '../../../domaine/statuts';
import type { Dossier } from '../../../domaine/types';
import { Bouton, Liste, Modale } from '../../../ui';
import { texteEchec } from '../ContexteDossier';
import { texteChamp, useAvecCle, useContexteEcriture, useLanceur } from '../devis/outilsVue';
import { ChampEta } from './ChampEta';

export function FenetreSuivi({ dossier, brouillon, mode, onFermer, onTermine }: FenetreSuiviProps): ReactElement | null {
  const ctx = useContexteEcriture();
  const lancer = useLanceur();
  const avecCle = useAvecCle();
  const x = dossier.expedition;
  const actuelle = x?.etape ?? ETAPE.priseEnCharge;
  // Depuis « Port d'arrivée », la seule suite possible est Livré.
  const effectif = mode === 'avancer' && actuelle >= ETAPE.portArrivee ? 'livrer' : mode;
  const etapesSuivantes = ETAPES_EXPEDITION.map((libelle, i) => ({ valeur: String(i), libelle })).filter(
    (e) => Number(e.valeur) > actuelle,
  );
  const [visee, setVisee] = useState<number>(Math.min(actuelle + 1, ETAPE.livre));
  const [prevenir, setPrevenir] = useState(true);
  const etaDepart = texteChamp(x, brouillon, 'eta');
  const [eta, setEta] = useState(etaDepart);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [mailEchoue, setMailEchoue] = useState<Dossier | null>(null);
  const [dejaPrevenu, setDejaPrevenu] = useState(false);
  if (!x) return null;

  const notifier = effectif === 'notifier';
  const cible = effectif === 'livrer' ? ETAPE.livre : visee;
  const dejaNotifiee = notifier && x.derniereEtapeNotifiee === actuelle;
  const etaSaisie = eta !== etaDepart ? eta : undefined;
  const titre = notifier ? 'Prévenir le client de l’étape actuelle' : effectif === 'livrer' ? 'Marquer livré' : 'Faire avancer le suivi';
  const libelle = notifier
    ? 'Prévenir le client'
    : effectif === 'livrer'
      ? prevenir ? 'Marquer livré et prévenir' : 'Marquer livré'
      : prevenir ? 'Avancer et prévenir' : 'Avancer';

  async function reessayerMail(): Promise<void> {
    if (!mailEchoue || enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await lancer(() => avecCle(() => notifierEtapeActuelle(ctx, mailEchoue, etaSaisie)));
      if (!r.ok) setErreur(texteEchec(r));
      else if (r.dejaPrevenu) setDejaPrevenu(true);
      else onTermine();
    } finally {
      setEnCours(false);
    }
  }

  /** L'étape a-t-elle bien avancé malgré l'échec ? Alors seul l'e-mail est à refaire. */
  async function dossierAvance(): Promise<Dossier | null> {
    try {
      const relu = await ctx.client.getDocument<NonNullable<Dossier['expedition']>>(x!._id);
      // « Prévenir » seul n'avance aucune étape : seule la relecture compte ici.
      return relu && (notifier || relu.etape === cible) ? { ...dossier, expedition: relu } : null;
    } catch {
      return null;
    }
  }

  async function valider(): Promise<void> {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await lancer(() =>
        avecCle(() => {
          if (notifier) return notifierEtapeActuelle(ctx, dossier, etaSaisie);
          if (cible === ETAPE.livre) return marquerLivre(ctx, dossier, brouillon, { notifier: prevenir });
          return avancerSuivi(ctx, dossier, brouillon, { etape: cible, eta: etaSaisie, notifier: prevenir });
        }),
      );
      if (r.ok && r.dejaPrevenu) setDejaPrevenu(true);
      else if (r.ok && r.notificationEchouee) {
        // Étape (ou ETA) écrite, e-mail non parti : on propose de refaire l'e-mail seul, sur la révision relue.
        const relu = await dossierAvance();
        if (relu) setMailEchoue(relu);
        else onTermine();
      } else if (r.ok) onTermine();
      else {
        const avance = !notifier && prevenir && (r.motif === 'reseau' || r.motif === 'cle') ? await dossierAvance() : null;
        if (avance) setMailEchoue(avance);
        else setErreur(texteEchec(r));
      }
    } finally {
      setEnCours(false);
    }
  }

  const pied = dejaPrevenu ? (
    <Bouton variante="primaire" onClick={onTermine}>
      Fermer
    </Bouton>
  ) : mailEchoue ? (
    <>
      <Bouton variante="discret" onClick={onTermine} desactive={enCours}>
        Fermer
      </Bouton>
      <Bouton variante="primaire" chargement={enCours} onClick={() => void reessayerMail()}>
        Réessayer l’e-mail
      </Bouton>
    </>
  ) : (
    <>
      <Bouton variante="discret" onClick={onFermer} desactive={enCours}>
        Annuler
      </Bouton>
      <Bouton variante="primaire" chargement={enCours} desactive={dejaNotifiee} onClick={() => void valider()}>
        {libelle}
      </Bouton>
    </>
  );

  return (
    <Modale titre={titre} onFermer={onFermer} empecherFermeture={enCours || mailEchoue !== null} pied={pied}>
      <div className="bo-pile">
        <p>
          Étape actuelle : <span className="bo-fort">{ETAPES_EXPEDITION[actuelle]}</span>
        </p>
        {!notifier && effectif === 'avancer' ? (
          <Liste
            etiquette="Étape suivante"
            valeur={String(visee)}
            options={etapesSuivantes}
            onChange={(v) => setVisee(Number(v))}
          />
        ) : null}
        {effectif === 'livrer' ? (
          <p>
            Étape suivante : <span className="bo-fort">{ETAPES_EXPEDITION[ETAPE.livre]}</span>
          </p>
        ) : null}
        {!mailEchoue ? <ChampEta valeur={eta} onChange={setEta} /> : null}
        {!notifier && !mailEchoue ? (
          <label className="bo-rangee">
            <input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} />
            <span>Prévenir le client par e-mail</span>
          </label>
        ) : null}
        {dejaNotifiee || dejaPrevenu ? <div className="bo-bandeau bo-bandeau--info">Client déjà prévenu de cette étape</div> : null}
        {mailEchoue ? (
          <div className="bo-bandeau bo-bandeau--urgent" role="alert">
            {notifier ? 'La date d’arrivée est enregistrée' : 'L’étape a bien avancé'}, mais le client n’a pas été prévenu.
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
