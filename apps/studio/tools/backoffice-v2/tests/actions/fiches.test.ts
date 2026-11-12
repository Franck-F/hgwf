/** Fiches services : patch du bon champ sous ifRevisionId, listes, suppression refusée si utilisée puis retrait. */
import { describe, expect, it } from 'vitest';
import {
  creerFiche,
  definirFicheActive,
  modifierChampFiche,
  modifierChampsFiche,
  reactiverFiche,
  retirerFiche,
  supprimerFiche,
} from '../../actions/fiches';
import { creerContexte, creerFauxClient, Erreur409, type Doc } from './fauxClient';

const FICHE: Doc = {
  _id: 'f1',
  _type: 'ficheService',
  _rev: 'rf1',
  titre: 'Groupage maritime',
  actif: true,
  inclus: ['Chargement'],
};
const fiche = { _id: 'f1', _rev: 'rf1' };

/** Le faux client ne sait pas compter : on lui dit combien de demandes se rattachent à la fiche. */
function avecDemandesLiees(client: ReturnType<typeof creerFauxClient>, n: number): void {
  const lire = client.fetch.bind(client);
  client.fetch = (async (requete: string, params?: Record<string, unknown>) =>
    requete.startsWith('count(') ? n : lire(requete, params)) as typeof client.fetch;
}

describe('modification d’une fiche', () => {
  it('écrit le bon champ, sous ifRevisionId, et mémorise la révision', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx, revisions } = creerContexte(client);
    const r = await modifierChampFiche(ctx, fiche, 'resume', 'Départ chaque mois');
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]).toMatchObject({ op: 'patch', id: 'f1', ifRevisionId: 'rf1', set: { resume: 'Départ chaque mois' } });
    expect(client.journal[0]?.unset).toEqual([]);
    expect(revisions).toHaveLength(1);
  });

  it('écrit une liste, une grille et le taux de TVA ; efface un champ vidé', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    const grille = [{ _type: 'ligneTarif', _key: 'a', designation: 'm³', prixHT: 400 }];
    const r = await modifierChampsFiche(ctx, 'f1', 'rf1', { inclus: ['Chargement', 'Transport'], grille, tauxTVADefaut: 0, resume: '', nonInclus: [] });
    expect(r.ok).toBe(true);
    expect(client.journal[0]).toMatchObject({
      set: { inclus: ['Chargement', 'Transport'], grille, tauxTVADefaut: 0 },
      unset: ['resume', 'nonInclus'],
    });
  });

  it('refuse un nom de service vide, un champ inconnu et un nombre illisible, sans rien écrire', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    expect((await modifierChampsFiche(ctx, 'f1', 'rf1', { titre: '  ' })).ok).toBe(false);
    expect((await modifierChampsFiche(ctx, 'f1', 'rf1', { _id: 'x' } as never)).ok).toBe(false);
    expect((await modifierChampsFiche(ctx, 'f1', 'rf1', { ordre: Number.NaN })).ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('signale un conflit quand la fiche a changé ailleurs, sans rien présenter comme enregistré', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    client.modifierAilleurs('f1', { resume: 'autre' });
    const r = await modifierChampFiche(ctx, fiche, 'resume', 'Moi');
    expect(r).toMatchObject({ ok: false, motif: 'conflit' });
    expect(client.docs.get('f1')?.resume).toBe('autre');
  });

  it('traduit une panne réseau', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    client.echouerProchaine(new Error('hors ligne'));
    expect(await modifierChampFiche(ctx, fiche, 'resume', 'x')).toMatchObject({ ok: false, motif: 'reseau' });
    client.echouerProchaine(new Erreur409('x'));
    expect(await modifierChampFiche(ctx, fiche, 'resume', 'x')).toMatchObject({ ok: false, motif: 'conflit' });
  });
});

describe('création d’une fiche', () => {
  it('exige le nom du service', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    expect(await creerFiche(ctx, { titre: '   ' })).toMatchObject({ ok: false, motif: 'manques' });
    expect(client.journal).toHaveLength(0);
  });

  it('crée une fiche active avec son ordre', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    const r = await creerFiche(ctx, { titre: ' Fret aérien ', ordre: 4 });
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.doc).toMatchObject({ _type: 'ficheService', titre: 'Fret aérien', actif: true, ordre: 4 });
  });
});

describe('suppression, retrait et réactivation', () => {
  it('supprime une fiche que plus aucune demande n’utilise', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    expect((await supprimerFiche(ctx, fiche)).ok).toBe(true);
    expect(client.docs.has('f1')).toBe(false);
  });

  it('refuse de supprimer une fiche utilisée par des demandes, puis la retire', async () => {
    const client = creerFauxClient([FICHE]);
    avecDemandesLiees(client, 3);
    const { ctx } = creerContexte(client);
    const refus = await supprimerFiche(ctx, fiche);
    expect(refus).toMatchObject({ ok: false, motif: 'refus' });
    expect(refus.ok ? '' : refus.message).toContain('3 demandes');
    expect(client.docs.has('f1')).toBe(true);

    const retrait = await retirerFiche(ctx, fiche);
    expect(retrait.ok).toBe(true);
    expect(client.journal.at(-1)).toMatchObject({ op: 'patch', id: 'f1', ifRevisionId: 'rf1', set: { actif: false } });
    expect(client.docs.get('f1')?.actif).toBe(false);
  });

  it('réactive une fiche retirée', async () => {
    const client = creerFauxClient([{ ...FICHE, actif: false }]);
    const { ctx } = creerContexte(client);
    expect((await reactiverFiche(ctx, fiche)).ok).toBe(true);
    expect(client.docs.get('f1')?.actif).toBe(true);
    expect((await definirFicheActive(ctx, { _id: 'f1', _rev: client.docs.get('f1')?._rev as string }, false)).ok).toBe(true);
  });
});
