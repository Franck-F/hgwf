/**
 * Un dossier ouvert : lecture du détail complet (8.2) et détection d'un
 * changement distant (4.3, « modifié par quelqu'un d'autre »).
 *
 * Le détail est relu à l'ouverture, puis à chaque relecture des données du
 * magasin (écoute en direct, focus, 60 s). Une relecture qui apporte une
 * révision que CE poste vient d'écrire (`revisionsLocales`) est adoptée sans
 * bruit ; une révision inconnue lève `conflit` et on ne touche pas au dossier
 * affiché : les saisies en cours ne sont jamais écrasées.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientLike, UseDossier } from '../domaine/contrats';
import { echangesDe } from '../domaine/echanges';
import type { Demande, DonneesMagasin, Dossier, Echange, Expedition } from '../domaine/types';
import { ecritureEnCours } from './activite';
import { useClientSanity } from './client';
import { empreinteEchanges, revisionsDuDossier, trouverDossier } from './dossiers';
import { lireDonneesMagasin, useMagasin } from './magasin';
import { REQUETE_DOSSIER, REQUETE_ECHANGES_DOSSIER } from './requetes';

type Document = Demande | Expedition;

/**
 * Lit le détail complet d'un dossier : la demande et son expédition, chacune
 * par son `_id` (révision à jour). `null` si aucun des deux n'existe.
 */
export async function lireDetailDossier(
  client: ClientLike,
  donnees: DonneesMagasin,
  id: string,
): Promise<Dossier | null> {
  const connu = trouverDossier(donnees, id);
  const ids = connu ? [connu.demande?._id, connu.expedition?._id].filter((x): x is string => Boolean(x)) : [id];
  const docs = await Promise.all(ids.map((i) => client.fetch<Document | null>(REQUETE_DOSSIER, { id: i })));
  const demande = docs.find((d): d is Demande => d?._type === 'demandeDevis');
  const expedition = docs.find((d): d is Expedition => d?._type === 'expedition');
  if (!demande && !expedition) return null;
  const echanges = await lireEchanges(client, donnees, demande, expedition);
  return {
    id: demande?._id ?? expedition?._id ?? id,
    ...(demande ? { demande } : {}),
    ...(expedition ? { expedition } : {}),
    ...(echanges.length > 0 ? { echanges } : {}),
  };
}

/**
 * Réponses complètes du client (texte, pièces). Une lecture qui échoue ne doit
 * pas empêcher d'ouvrir le dossier : on retombe sur la version légère du magasin
 * (le signal et le nombre de non lus restent justes, pas le texte).
 */
async function lireEchanges(
  client: ClientLike,
  donnees: DonneesMagasin,
  demande: Demande | undefined,
  expedition: Expedition | undefined,
): Promise<Echange[]> {
  const references = [demande?.reference, expedition?.demandeRef, demande ? undefined : expedition?.reference]
    .map((r) => (r ?? '').trim().toLowerCase())
    .filter(Boolean);
  if (!demande && references.length === 0) return [];
  try {
    const lus = await client.fetch<Echange[] | null>(REQUETE_ECHANGES_DOSSIER, {
      demandeId: demande?._id ?? '',
      references,
    });
    if (Array.isArray(lus)) return lus;
  } catch {
    /* repli ci-dessous */
  }
  return echangesDe(demande, expedition, donnees.echanges);
}

/** Vrai si toutes les révisions qui ont changé sont des écritures de ce poste. */
export function changementsLocaux(actuel: Dossier, frais: Dossier, locales: Set<string>): boolean {
  const avant = revisionsDuDossier(actuel);
  const apres = revisionsDuDossier(frais);
  const ids = new Set([...Object.keys(avant), ...Object.keys(apres)]);
  for (const i of ids) {
    if (avant[i] === apres[i]) continue;
    const rev = apres[i];
    if (rev === undefined || !locales.has(rev)) return false;
  }
  return true;
}

const memesRevisions = (a: Dossier, b: Dossier): boolean => {
  const ra = revisionsDuDossier(a);
  const rb = revisionsDuDossier(b);
  const cles = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const c of cles) if (ra[c] !== rb[c]) return false;
  return true;
};

export const useDossier: UseDossier = (id) => {
  const client = useClientSanity();
  const magasin = useMagasin();
  // `undefined` = pas encore lu ; `null` = lu, introuvable.
  const [lu, setLu] = useState<{ id: string; dossier: Dossier | null } | undefined>(undefined);
  const [conflit, setConflit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const courant = useRef<Dossier | null>(null);
  const numero = useRef(0);

  const dossier = lu && lu.id === id ? lu.dossier : undefined;
  courant.current = dossier ?? null;

  /** `adopter` : relecture demandée (rechargement explicite), on prend la version lue quoi qu'il arrive. */
  const lire = useCallback(
    async (donnees: DonneesMagasin, adopter: boolean): Promise<void> => {
      numero.current += 1;
      const mien = numero.current;
      try {
        const frais = await lireDetailDossier(client, donnees, id);
        if (mien !== numero.current) return; // une lecture plus récente a pris le relais
        const actuel = courant.current;
        setErreur(null);
        if (adopter || !actuel) {
          setLu({ id, dossier: frais });
          setConflit(false);
          return;
        }
        if (frais && memesRevisions(actuel, frais)) {
          // Mêmes documents, mais une réponse est arrivée (ou a été lue ailleurs) : on l'affiche sans bruit.
          if (empreinteEchanges(actuel) !== empreinteEchanges(frais)) setLu({ id, dossier: frais });
          return;
        }
        if (frais && changementsLocaux(actuel, frais, magasin.revisionsLocales)) {
          setLu({ id, dossier: frais });
          return;
        }
        // Pas pendant un de nos gestes : l'API change la révision avant que l'outil pose le statut.
        if (!ecritureEnCours()) setConflit(true);
      } catch (e) {
        if (mien !== numero.current) return;
        setErreur(e instanceof Error && e.message ? e.message : 'Lecture impossible.');
      }
    },
    [client, id, magasin.revisionsLocales],
  );

  // Ouverture d'un autre dossier : on repart de zéro.
  useEffect(() => {
    setConflit(false);
    setErreur(null);
  }, [id]);

  // Première lecture, puis à chaque relecture du magasin (focus, 60 s, écoute en direct).
  useEffect(() => {
    // Tant que la liste n'est pas là on ne sait pas quelle expédition est liée.
    if (magasin.chargement && !magasin.erreur) return;
    void lire(magasin.donnees, false);
  }, [lire, magasin.donnees, magasin.chargement, magasin.erreur]);

  /** Relit le magasin puis le dossier, adopte la version lue et efface le conflit. */
  const rechargerMagasin = magasin.recharger;
  const recharger = useCallback(async (): Promise<void> => {
    await rechargerMagasin();
    await lire(lireDonneesMagasin(), true);
  }, [lire, rechargerMagasin]);

  return {
    dossier: dossier ?? null,
    chargement: dossier === undefined && erreur === null,
    erreur,
    conflit,
    recharger,
  };
};
