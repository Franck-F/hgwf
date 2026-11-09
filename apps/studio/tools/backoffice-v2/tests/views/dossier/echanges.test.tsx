/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
// Fil « Échanges » du dossier : état vide, non lus mis en avant, pièces jointes,
// erreur lisible, « Marquer comme lu », bandeau et badges des listes.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Dossier, Echange } from '../../../domaine/types';
import type { ContexteVue } from '../../../views/Dossier/ContexteDossier';

const m = vi.hoisted(() => ({ marquer: vi.fn(async () => ({ ok: true as const, patchs: 1, champsEnregistres: [] })) }));

vi.mock('../../../actions/echanges', () => ({ marquerEchangesLus: m.marquer }));
vi.mock('../../../views/Dossier/contexteEcriture', () => ({ useContexteEcritureDossier: () => ({ marqueur: 'ctx' }) }));

import { LigneAFaire } from '../../../views/AFaire/LigneAFaire';
import { BandeauReponse } from '../../../views/Dossier/BandeauReponse';
import { ContexteDossierReact } from '../../../views/Dossier/ContexteDossier';
import { SectionDemande } from '../../../views/Dossier/SectionDemande';
import { resumeEchanges, SectionEchanges } from '../../../views/Dossier/SectionEchanges';
import { LigneDossier } from '../../../views/Dossiers/LigneDossier';
import { dossierDemande } from '../../domaine/fabrique';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const echange = (extra: Partial<Echange> = {}): Echange => ({
  _id: 'echange-1',
  _rev: 'e1',
  _type: 'echange',
  reference: 'DEV-2611-001',
  sens: 'recu',
  de: 'Martin Dupont <martin@example.fr>',
  objet: 'Re : Votre devis',
  texte: 'Bonjour,\nvoici les dimensions.',
  recuLe: '2026-11-05T14:00:00.000Z',
  lu: false,
  ...extra,
});

const avec = (echanges: Echange[]): Dossier => ({ ...dossierDemande({ statut: 1 }), echanges });

function monter(dossier: Dossier, avecContexte = true) {
  const lancer = vi.fn(async (geste: () => Promise<unknown>) => geste());
  const ctx = { lancer } as unknown as ContexteVue;
  const section = (
    <SectionEchanges dossier={dossier} brouillon={{}} modifier={() => undefined} lectureSeule={false} ouverte onBasculer={() => undefined} />
  );
  render(avecContexte ? <ContexteDossierReact.Provider value={ctx}>{section}</ContexteDossierReact.Provider> : section);
  return { lancer };
}

describe('SectionEchanges', () => {
  it('état vide utile : dit ce qui apparaîtra ici et donne l’adresse de réponse du dossier', () => {
    monter(avec([]));
    expect(screen.getByText('Aucune réponse pour le moment')).toBeTruthy();
    expect(
      screen.getByText(
        'Les réponses du client à vos e-mails apparaîtront ici. L’adresse de réponse de ce dossier : dossier-DEV-2611-001@reponses.hgwf-cargo.fr',
      ),
    ).toBeTruthy();
  });

  it('une réponse non lue est mise en avant, avec ses retours à la ligne et son expéditeur', () => {
    monter(avec([echange()]));
    const item = document.querySelector('[data-echange="echange-1"]') as HTMLElement;
    expect(item.className).toContain('bo-echange--nonlu');
    expect(within(item).getByText('Non lu')).toBeTruthy();
    expect(within(item).getByText('Martin Dupont <martin@example.fr>')).toBeTruthy();
    const texte = item.querySelector('.bo-echange-texte') as HTMLElement;
    expect(texte.textContent).toBe('Bonjour,\nvoici les dimensions.');
    expect(within(item).getByText('Re : Votre devis')).toBeTruthy();
  });

  it('une réponse lue n’a ni badge ni bouton', () => {
    monter(avec([echange({ lu: true })]));
    expect(screen.queryByText('Non lu')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marquer comme lu' })).toBeNull();
  });

  it('les plus récentes d’abord', () => {
    monter(
      avec([
        echange({ _id: 'vieux', objet: 'Ancienne', recuLe: '2026-11-01T10:00:00Z', lu: true }),
        echange({ _id: 'neuf', objet: 'Récente', recuLe: '2026-11-05T10:00:00Z', lu: true }),
      ]),
    );
    const ordre = Array.from(document.querySelectorAll('[data-echange]')).map((n) => n.getAttribute('data-echange'));
    expect(ordre).toEqual(['neuf', 'vieux']);
  });

  it('liens de téléchargement des pièces jointes, et fichier indisponible dit clairement', () => {
    monter(
      avec([
        echange({
          pieces: [
            { _key: 'p1', nom: 'photo.jpg', taille: 340_000, url: 'https://cdn.exemple.invalid/photo.jpg' },
            { _key: 'p2', nom: 'perdu.pdf' },
          ],
        }),
      ]),
    );
    const lien = screen.getByRole('link', { name: /photo\.jpg/ }) as HTMLAnchorElement;
    expect(lien.getAttribute('href')).toBe('https://cdn.exemple.invalid/photo.jpg');
    expect(lien.getAttribute('rel')).toContain('noopener');
    expect(lien.textContent).toContain('340 Ko');
    expect(screen.getByText('perdu.pdf : fichier indisponible')).toBeTruthy();
  });

  it('affiche l’erreur d’un échange de façon compréhensible', () => {
    monter(avec([echange({ erreur: 'pièce jointe introuvable' })]));
    const alerte = screen.getByRole('alert');
    expect(alerte.textContent).toMatch(/pièce jointe n’a pas pu être récupérée/);
    expect(alerte.textContent).toContain('pièce jointe introuvable');
  });

  it('signale un expéditeur non vérifié et explique l’absence des pièces jointes', () => {
    monter(
      avec([
        echange({
          expediteurVerifie: false,
          motifNonVerifie: 'l’expéditeur x@pirate.net n’est pas l’adresse e-mail enregistrée dans la demande',
          erreur: 'Pièces non récupérées : 1 pièce(s) jointe(s) non récupérée(s), expéditeur non vérifié (facture.pdf)',
        }),
      ]),
    );
    const alertes = screen.getAllByRole('alert').map((a) => a.textContent ?? '');
    expect(alertes[0]).toMatch(/^Expéditeur à vérifier : l’expéditeur x@pirate\.net/);
    expect(alertes[0]).toContain('n’a pas fait avancer le dossier');
    expect(alertes[1]).toMatch(/l’expéditeur n’est pas vérifié/);
  });

  it('pas d’alerte d’expéditeur pour un message vérifié ou ancien', () => {
    monter(avec([echange({ expediteurVerifie: true }), echange({ _id: 'e-ancien' })]));
    expect(document.querySelector('[data-alerte="expediteur"]')).toBeNull();
  });

  it('replie un très long message et le déplie à la demande', () => {
    monter(avec([echange({ texte: 'x'.repeat(3000) })]));
    const texte = () => (document.querySelector('.bo-echange-texte') as HTMLElement).textContent ?? '';
    expect(texte().length).toBeLessThan(1300);
    fireEvent.click(screen.getByRole('button', { name: 'Afficher tout le message' }));
    expect(texte()).toHaveLength(3000);
  });

  it('« Marquer comme lu » écrit par la couche actions, via le geste du dossier', async () => {
    const e = echange();
    const { lancer } = monter(avec([e, echange({ _id: 'echange-2', recuLe: '2026-11-04T10:00:00Z', lu: true })]));
    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme lu' }));
    await waitFor(() => expect(m.marquer).toHaveBeenCalledWith({ marqueur: 'ctx' }, [e]));
    expect(lancer).toHaveBeenCalledTimes(1);
  });

  it('plusieurs non lus : « Tout marquer comme lu » les passe tous', async () => {
    const a = echange({ _id: 'a', recuLe: '2026-11-05T10:00:00Z' });
    const b = echange({ _id: 'b', recuLe: '2026-11-04T10:00:00Z' });
    monter(avec([a, b]));
    fireEvent.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }));
    await waitFor(() => expect(m.marquer).toHaveBeenCalledWith({ marqueur: 'ctx' }, [a, b]));
  });

  it('sans contexte de page (affichage seul), aucun bouton d’écriture', () => {
    monter(avec([echange()]), false);
    expect(screen.queryByRole('button', { name: 'Marquer comme lu' })).toBeNull();
  });
});

describe('SectionDemande', () => {
  it('permet de modifier directement le texte et les informations clés de la demande dans le dossier', () => {
    const modifier = vi.fn();
    const dossier = dossierDemande({
      typeEnvoi: 'Groupage maritime',
      destination: 'Dakar',
      volume: '8 m³',
      message: 'Bonjour\nColis : 1\nDépart : Marseille',
    });

    render(
      <SectionDemande
        dossier={dossier}
        brouillon={{}}
        modifier={modifier}
        lectureSeule={false}
        ouverte
        onBasculer={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Type d’envoi'), { target: { value: 'FCL' } });
    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Abidjan' } });
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '12 m³' } });
    fireEvent.change(screen.getByLabelText('Message du client'), { target: { value: 'Bonjour\nMerci de confirmer.' } });

    expect(modifier).toHaveBeenCalledWith('typeEnvoi', 'FCL');
    expect(modifier).toHaveBeenCalledWith('destination', 'Abidjan');
    expect(modifier).toHaveBeenCalledWith('volume', '12 m³');
    expect(modifier).toHaveBeenCalledWith('message', 'Bonjour\nMerci de confirmer.');
  });
});

describe('resumeEchanges', () => {
  it('dit le nombre de non lus, sinon la dernière réponse', () => {
    expect(resumeEchanges([])).toBe('Aucune réponse');
    expect(resumeEchanges([echange(), echange({ _id: 'b' })])).toBe('2 réponses non lues');
    expect(resumeEchanges([echange({ lu: true })])).toMatch(/^1 réponse, dernière le \d{2}\/\d{2}\/\d{4} à \d{2}h\d{2}$/);
  });
});

describe('signal sur les pages', () => {
  it('le bandeau n’apparaît que s’il y a des non lus et mène au fil', () => {
    const onLire = vi.fn();
    const { container, rerender } = render(<BandeauReponse dossier={avec([echange({ lu: true })])} onLire={onLire} />);
    expect(container.textContent).toBe('');
    rerender(<BandeauReponse dossier={avec([echange()])} onLire={onLire} />);
    expect(screen.getByText('Le client a répondu : 1 réponse non lue.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lire la réponse' }));
    expect(onLire).toHaveBeenCalled();
  });

  it('la ligne d’« À faire » porte le nombre de réponses non lues', () => {
    const ligne = {
      dossierId: 'd1',
      client: 'Alice',
      reference: 'REF',
      raison: 'Réponse reçue, à chiffrer',
      ageJours: 1,
      enRetard: false,
      actionLibelle: 'Envoyer le devis',
      phase: 'reponseRecue' as const,
      nbNonLus: 2,
    };
    const { rerender } = render(<LigneAFaire ligne={ligne} principale={false} onOuvrir={() => undefined} />);
    expect(screen.getByText('2 réponses non lues')).toBeTruthy();
    rerender(<LigneAFaire ligne={{ ...ligne, nbNonLus: 0 }} principale={false} onOuvrir={() => undefined} />);
    expect(screen.queryByText(/non lue/)).toBeNull();
  });

  it('la liste des dossiers porte le badge, et rien sans réponse', () => {
    const rendu = (d: Dossier) => (
      <table>
        <tbody>
          <LigneDossier dossier={d} onOuvrir={() => undefined} maintenant={new Date(2026, 10, 6, 9, 0)} />
        </tbody>
      </table>
    );
    const { rerender } = render(rendu(avec([echange()])));
    expect(screen.getByText('1 réponse non lue')).toBeTruthy();
    rerender(rendu(dossierDemande({ statut: 1 })));
    expect(screen.queryByText(/non lue/)).toBeNull();
  });
});
