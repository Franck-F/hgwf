/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
// Tests du lot 12 : section Expédition, règlement et départ, suivi, reprise.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalStyle } from '../../../theme/GlobalStyle';
import { dossierExpedition } from '../../domaine/fabrique';

const m = vi.hoisted(() => ({
  magasin: {
    donnees: { demandes: [], expeditions: [], clients: [], conteneurs: [], rotations: [], fiches: [] },
    chargement: false,
    erreur: null,
    recharger: async () => undefined,
    revisionsLocales: new Set<string>(),
    memoriserRevision: () => undefined,
  },
  client: { getDocument: vi.fn() },
  toasts: { succes: () => undefined, erreur: () => undefined },
  cle: { presente: true, demanderCle: () => Promise.resolve(true), oublier: () => undefined },
}));

vi.mock('../../../app/Contexte', () => ({
  useRacine: () => document.body,
  useToasts: () => m.toasts,
  useCleApi: () => m.cle,
  useRoute: () => ({ chemin: '', naviguer: () => undefined, garde: { definir: () => undefined } }),
}));
vi.mock('../../../data/client', () => ({
  useClientSanity: () => m.client,
  useUtilisateur: () => ({ id: 'u1', nom: 'Marie' }),
}));
vi.mock('../../../data/magasin', () => ({ useMagasin: () => m.magasin }));
vi.mock('../../../actions/envoi', () => ({ appelerApi: vi.fn() }));
vi.mock('../../../actions/expedition', () => ({
  avancerSuivi: vi.fn(),
  marquerLivre: vi.fn(),
  notifierEtapeActuelle: vi.fn(),
  reprendre: vi.fn(),
  marquerReglement: vi.fn(),
  autoriserDepart: vi.fn(),
}));

import * as exp from '../../../actions/expedition';
import { BlocsPriseEnCharge } from '../../../views/Dossier/expedition/BlocsPriseEnCharge';
import { DepartReglement } from '../../../views/Dossier/expedition/DepartReglement';
import { FenetreSuivi } from '../../../views/Dossier/expedition/FenetreSuivi';
import { ReprisePanel } from '../../../views/Dossier/expedition/ReprisePanel';
import { SectionExpedition } from '../../../views/Dossier/expedition/SectionExpedition';
import { SuiviClient } from '../../../views/Dossier/expedition/SuiviClient';

const succes = { ok: true as const, patchs: 1, champsEnregistres: [] as string[] };
const complete = {
  expediteurAdresse: '1 rue du Port, Le Havre',
  destinataireNom: 'Awa Diop',
  destinataireAdresse: 'Dakar',
  colisNature: 'Vêtements',
  colisNombre: 12,
  colisPoids: 300,
  mode: 'Groupage maritime',
};

beforeEach(() => {
  vi.mocked(exp.marquerReglement).mockResolvedValue(succes);
  vi.mocked(exp.autoriserDepart).mockResolvedValue(succes);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SectionExpedition et BlocsPriseEnCharge', () => {
  it('regroupe les champs en quatre blocs puis le suivi client et le règlement, sans date ISO', () => {
    render(
      <SectionExpedition
        dossier={dossierExpedition({ ...complete, eta: '14/11/2026' })}
        brouillon={{}}
        modifier={vi.fn()}
        lectureSeule={false}
        ouverte
        onBasculer={() => undefined}
      />,
    );
    for (const titre of ['Expéditeur', 'Destinataire', 'Marchandise', 'Transport', 'Suivi client', 'Règlement et départ']) {
      expect(screen.getAllByText(titre).length).toBeGreaterThan(0);
    }
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('lit le brouillon avant le document enregistré et vide un champ en null', () => {
    const modifier = vi.fn();
    render(
      <BlocsPriseEnCharge
        dossier={dossierExpedition({ ...complete })}
        brouillon={{ destinataireNom: 'Moussa Ba' }}
        modifier={modifier}
        lectureSeule={false}
        ouverte
        onBasculer={() => undefined}
      />,
    );
    const nom = screen.getByDisplayValue('Moussa Ba');
    fireEvent.change(nom, { target: { value: '' } });
    expect(modifier).toHaveBeenCalledWith('destinataireNom', null);
  });

  it('passe en rouge les champs requis vides quand on demande les manques', () => {
    render(
      <BlocsPriseEnCharge
        dossier={dossierExpedition({})}
        brouillon={{}}
        modifier={vi.fn()}
        lectureSeule={false}
        ouverte
        onBasculer={() => undefined}
        afficherManques
      />,
    );
    expect(screen.getAllByText('À renseigner').length).toBeGreaterThanOrEqual(5);
  });

  it('écrit l\'ETA au format stocké, ou « À PLANIFIER »', () => {
    const modifier = vi.fn();
    render(
      <BlocsPriseEnCharge dossier={dossierExpedition({ eta: '14/11/2026' })} brouillon={{}} modifier={modifier} lectureSeule={false} ouverte onBasculer={() => undefined} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'À planifier' }));
    expect(modifier).toHaveBeenCalledWith('eta', 'À PLANIFIER');
  });
});

describe('SuiviClient', () => {
  it('montre la dernière notification sans la mélanger à la phase', () => {
    render(
      <SuiviClient
        dossier={dossierExpedition({ etape: 2, derniereEtapeNotifiee: 2, derniereNotificationLe: '01/11/2026 a 11h00' })}
      />,
    );
    expect(screen.getByText('Prévenu le 01/11/2026 à 11h00 (En mer)')).toBeTruthy();
  });
});

describe('DepartReglement', () => {
  it('écrit tout de suite le règlement reçu, sans passer par le brouillon', async () => {
    const dossier = dossierExpedition({});
    render(<DepartReglement dossier={dossier} lectureSeule={false} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Règlement reçu/ }));
    await waitFor(() => expect(exp.marquerReglement).toHaveBeenCalledWith(expect.anything(), dossier.expedition, true));
  });

  it('exige un motif avant d\'autoriser le départ sans règlement', async () => {
    const dossier = dossierExpedition({});
    render(<DepartReglement dossier={dossier} lectureSeule={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Autoriser le départ sans règlement' }));
    const bouton = screen.getByRole('button', { name: 'Autoriser le départ' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(screen.getByText('le motif de la dérogation')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Motif de la dérogation/), { target: { value: 'Client fidèle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Autoriser le départ' }));
    await waitFor(() => expect(exp.autoriserDepart).toHaveBeenCalledWith(expect.anything(), dossier.expedition, 'Client fidèle'));
  });

  it('affiche la dérogation existante avec sa date et son auteur', () => {
    render(
      <DepartReglement
        dossier={dossierExpedition({ derogationDepart: true, derogationMotif: 'Client fidèle', derogationLe: '02/11/2026 a 10h00', derogationPar: 'Marie' })}
        lectureSeule={false}
      />,
    );
    expect(screen.getByText(/Départ autorisé sans règlement le 02\/11\/2026 à 10h00 par Marie : Client fidèle/)).toBeTruthy();
  });
});

describe('ReprisePanel', () => {
  const rendre = (extra: Parameters<typeof dossierExpedition>[0], brouillon = {}) => {
    const onTermine = vi.fn();
    render(
      <>
        <GlobalStyle />
        <ReprisePanel dossier={dossierExpedition({ statutPriseEnCharge: 4, ...extra })} brouillon={brouillon} onFermer={vi.fn()} onTermine={onTermine} />
      </>,
    );
    return { onTermine };
  };

  it('ne présélectionne rien sans statutAvantIncident et écrit pourquoi le bouton est inactif', () => {
    rendre({});
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('button', { name: 'Reprendre le dossier' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('le choix du statut de reprise')).toBeTruthy();
  });

  it('propose le statut d\'avant l\'incident', () => {
    rendre({ statutAvantIncident: 1, ...complete });
    expect((screen.getByRole('radio', { name: /Prêt/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/état avant l’arrêt/)).toBeTruthy();
  });

  it('applique les garde-fous du statut visé : « Prêt » exige les 7 manques levés', () => {
    rendre({ statutAvantIncident: 1 });
    expect(screen.getByText("l'adresse d'enlèvement")).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Reprendre le dossier' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('évalue les manques sur le brouillon et reprend avec le choix', async () => {
    vi.mocked(exp.reprendre).mockResolvedValue(succes);
    const { onTermine } = rendre({ statutAvantIncident: 0 }, {});
    fireEvent.click(screen.getByRole('radio', { name: /À préparer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre le dossier' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(exp.reprendre).toHaveBeenCalledWith(expect.anything(), expect.anything(), {}, 0);
  });
});

describe('FenetreSuivi', () => {
  const rendre = (mode: 'avancer' | 'notifier' | 'livrer', extra: Parameters<typeof dossierExpedition>[0] = {}) => {
    const onTermine = vi.fn();
    render(
      <>
        <GlobalStyle />
        <FenetreSuivi dossier={dossierExpedition({ statutPriseEnCharge: 2, etape: 1, ...extra })} brouillon={{}} mode={mode} onFermer={vi.fn()} onTermine={onTermine} />
      </>,
    );
    return { onTermine, fenetre: screen.getByRole('dialog') };
  };

  it('fait avancer à l\'étape suivante et prévient le client par défaut', async () => {
    vi.mocked(exp.avancerSuivi).mockResolvedValue(succes);
    const { onTermine, fenetre } = rendre('avancer');
    expect((within(fenetre).getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Avancer et prévenir' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(exp.avancerSuivi).toHaveBeenCalledWith(expect.anything(), expect.anything(), {}, { etape: 2, eta: undefined, notifier: true });
    expect(exp.marquerLivre).not.toHaveBeenCalled();
  });

  it('passe toujours par marquerLivre quand l\'étape visée est Livré', async () => {
    vi.mocked(exp.marquerLivre).mockResolvedValue(succes);
    const { onTermine, fenetre } = rendre('avancer', { etape: 3 });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Marquer livré et prévenir' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(exp.marquerLivre).toHaveBeenCalledWith(expect.anything(), expect.anything(), {}, { notifier: true });
    expect(exp.avancerSuivi).not.toHaveBeenCalled();
  });

  it('refuse de notifier une étape déjà notifiée', () => {
    const { fenetre } = rendre('notifier', { derniereEtapeNotifiee: 1 });
    expect(within(fenetre).getByText('Client déjà prévenu de cette étape')).toBeTruthy();
    expect((within(fenetre).getByRole('button', { name: 'Prévenir le client' }) as HTMLButtonElement).disabled).toBe(true);
    expect(fenetre.querySelector('select')).toBeNull();
  });

  it('affiche « déjà prévenu » quand l\'API répond ignoré', async () => {
    vi.mocked(exp.notifierEtapeActuelle).mockResolvedValue({ ...succes, dejaPrevenu: true });
    const { fenetre } = rendre('notifier');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Prévenir le client' }));
    await screen.findByText('Client déjà prévenu de cette étape');
    expect(exp.avancerSuivi).not.toHaveBeenCalled();
  });

  it('garde l\'étape avancée et propose de réessayer l\'e-mail seul quand l\'envoi échoue', async () => {
    vi.mocked(exp.avancerSuivi).mockResolvedValue({ ok: false, motif: 'reseau', message: 'Envoi impossible.' });
    vi.mocked(exp.notifierEtapeActuelle).mockResolvedValue(succes);
    m.client.getDocument.mockResolvedValue({ ...dossierExpedition({}).expedition, etape: 2 });
    const { onTermine, fenetre } = rendre('avancer');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Avancer et prévenir' }));
    await screen.findByText(/le client n’a pas été prévenu/);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’e-mail' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(exp.notifierEtapeActuelle).toHaveBeenCalledTimes(1);
    expect(exp.avancerSuivi).toHaveBeenCalledTimes(1);
  });

  it('succès partiel (étape écrite, e-mail non parti) : propose « Réessayer l’e-mail » sur la révision relue', async () => {
    vi.mocked(exp.avancerSuivi).mockResolvedValue({
      ok: true,
      patchs: 1,
      champsEnregistres: [],
      notificationEchouee: { motif: 'cle', message: 'La clé d’envoi est absente.' },
    });
    vi.mocked(exp.notifierEtapeActuelle).mockResolvedValue(succes);
    m.client.getDocument.mockResolvedValue({ ...dossierExpedition({}).expedition, etape: 2, _rev: 'rev-apres' });
    const { onTermine, fenetre } = rendre('avancer');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Avancer et prévenir' }));
    await screen.findByText(/le client n’a pas été prévenu/);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’e-mail' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    // Le rejeu part de l'expédition relue, pas de celle d'avant l'écriture.
    expect(vi.mocked(exp.notifierEtapeActuelle).mock.calls[0]?.[1].expedition?._rev).toBe('rev-apres');
  });
});
