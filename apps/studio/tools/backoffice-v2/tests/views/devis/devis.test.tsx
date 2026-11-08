/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
// Tests du lot 11 : section Devis, aides, suggestion et fenêtre d'envoi.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalStyle } from '../../../theme/GlobalStyle';
import { dossierDemande } from '../../domaine/fabrique';

const m = vi.hoisted(() => ({
  magasin: {
    donnees: { demandes: [], expeditions: [], clients: [], conteneurs: [], rotations: [] as unknown[], fiches: [] as unknown[] },
    chargement: false,
    erreur: null,
    recharger: async () => undefined,
    revisionsLocales: new Set<string>(),
    memoriserRevision: () => undefined,
  },
  client: { getDocument: () => Promise.resolve(undefined) },
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
vi.mock('../../../actions/envoi', () => ({
  appelerApi: vi.fn(),
  apercuEnvoi: vi.fn(),
  envoyerDevis: vi.fn(),
  envoyerComplement: vi.fn(),
  terminerEnvoi: vi.fn(),
}));
vi.mock('../../../actions/suggestion', () => ({ suggererDescription: vi.fn() }));

import * as envoi from '../../../actions/envoi';
import { suggererDescription } from '../../../actions/suggestion';
import { AidesDevis } from '../../../views/Dossier/devis/AidesDevis';
import { FenetreEnvoi } from '../../../views/Dossier/devis/FenetreEnvoi';
import { SectionDevis } from '../../../views/Dossier/devis/SectionDevis';
import { SuggestionTexte } from '../../../views/Dossier/devis/SuggestionTexte';

const apercu = {
  de: 'HGWF Cargo <contact@hgwf.fr>',
  a: 'martin@example.fr',
  pieceJointe: 'Devis-DEV-2611-001.pdf',
  objet: 'Votre devis',
  message: 'Bonjour Martin',
};

beforeEach(() => {
  m.magasin.donnees.fiches = [];
  m.magasin.donnees.rotations = [];
  m.cle.presente = true;
  vi.mocked(envoi.apercuEnvoi).mockResolvedValue({ ok: true, apercu });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const devisComplet = { statut: 1, montantHT: 1250, tauxTVA: 0, descriptionPrestation: 'Groupage Le Havre vers Dakar' };

function sectionProps(extra: Partial<Parameters<typeof SectionDevis>[0]> = {}) {
  return {
    dossier: dossierDemande(devisComplet),
    brouillon: {},
    modifier: vi.fn(),
    lectureSeule: false,
    ouverte: true,
    onBasculer: () => undefined,
    ...extra,
  };
}

describe('SectionDevis', () => {
  it('affiche quatre champs dans l\'ordre description, HT, TVA, délai, puis la ligne calculée', () => {
    render(<SectionDevis {...sectionProps()} />);
    const libelles = ['Description de la prestation', 'Montant HT', 'TVA', 'Délai estimé'].map((l) => screen.getAllByText(new RegExp(`^${l}`))[0]!);
    for (let i = 0; i < libelles.length - 1; i++) {
      // eslint-disable-next-line no-bitwise
      expect(libelles[i]!.compareDocumentPosition(libelles[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByText(/TVA 0,00 € · Total TTC 1 250,00 €/)).toBeTruthy();
  });

  it('écrit 0 comme une vraie valeur et ne présélectionne aucune TVA en silence', () => {
    const modifier = vi.fn();
    render(<SectionDevis {...sectionProps({ dossier: dossierDemande({ statut: 1 }), modifier })} />);
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText('0 % export'));
    expect(modifier).toHaveBeenCalledWith('tauxTVA', 0);
  });

  it('affiche un récapitulatif en lecture seule après envoi, et avertit avant de modifier', () => {
    const dossier = dossierDemande({ ...devisComplet, statut: 2, devisEnvoyeLe: '29/10/2026 a 10h00', devisEnvoyeA: 'martin@example.fr' });
    render(<SectionDevis {...sectionProps({ dossier })} />);
    expect(screen.queryByLabelText(/Montant HT/)).toBeNull();
    expect(screen.getByText(/Envoyé le 29\/10\/2026 à martin@example.fr/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByText(/déjà parti chez le client/)).toBeTruthy();
  });

  it('mentionne « hors outil » pour un devis envoyé hors outil', () => {
    const dossier = dossierDemande({
      ...devisComplet,
      statut: 2,
      devisEnvoyeHorsOutilLe: '05/11/2026',
      devisEnvoyeHorsOutilMoyen: 'whatsapp',
    });
    render(<SectionDevis {...sectionProps({ dossier })} />);
    expect(screen.getByText(/Envoyé hors outil, le 05\/11\/2026 \(WhatsApp\)/)).toBeTruthy();
  });
});

describe('AidesDevis', () => {
  const fiche = { _id: 'f1', _rev: 'r', _type: 'ficheService', titre: 'Groupage maritime', libellesFormulaire: ['Groupage maritime'], grille: [{ designation: 'm³', unite: 'm³', prixHT: 400 }] };

  it('ne propose rien sans prix de grille ni rotation', () => {
    const { container } = render(
      <AidesDevis dossier={dossierDemande({ typeEnvoi: 'Groupage maritime', volume: '8 m³' })} onUtiliserMontant={vi.fn()} onUtiliserDelai={vi.fn()} />,
    );
    expect(container.textContent).toBe('');
  });

  it('montre le détail du calcul et n\'écrit rien avant « Utiliser »', () => {
    m.magasin.donnees.fiches = [fiche];
    const onMontant = vi.fn();
    render(
      <AidesDevis champ="montant" dossier={dossierDemande({ typeEnvoi: 'Groupage maritime', volume: '8 m³' })} onUtiliserMontant={onMontant} onUtiliserDelai={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer la grille' }));
    expect(screen.getByText(/8 m³ × 400 € = 3 200 € HT/)).toBeTruthy();
    expect(onMontant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser' }));
    expect(onMontant).toHaveBeenCalledWith(3200);
  });

  it('propose la prochaine clôture comme délai', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    m.magasin.donnees.rotations = [{ _id: 'r1', _rev: 'r', _type: 'rotation', nom: 'Dakar', cloture: '14/11', depart: '18/11' }];
    const onDelai = vi.fn();
    render(<AidesDevis champ="delai" dossier={dossierDemande({})} onUtiliserMontant={vi.fn()} onUtiliserDelai={onDelai} />);
    fireEvent.click(screen.getByRole('button', { name: 'Proposer un délai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser' }));
    expect(onDelai).toHaveBeenCalledWith('Prochaine clôture le 14/11, départ le 18/11');
  });
});

describe('SuggestionTexte', () => {
  it('reste affiché sans clé et ouvre la fenêtre de clé avant de suggérer', async () => {
    m.cle.presente = false;
    const demander = vi.fn().mockResolvedValue(false);
    m.cle.demanderCle = demander;
    render(<SuggestionTexte dossier={dossierDemande({})} onUtiliser={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer un texte' }));
    await waitFor(() => expect(demander).toHaveBeenCalled());
    expect(suggererDescription).not.toHaveBeenCalled();
  });

  it('n\'écrit la suggestion que sur « Utiliser »', async () => {
    vi.mocked(suggererDescription).mockResolvedValue({ ok: true, description: 'Transport groupé' });
    const onUtiliser = vi.fn();
    render(<SuggestionTexte dossier={dossierDemande({})} onUtiliser={onUtiliser} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer un texte' }));
    await screen.findByText('Transport groupé');
    expect(onUtiliser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser' }));
    expect(onUtiliser).toHaveBeenCalledWith('Transport groupé');
  });
});

describe('FenetreEnvoi', () => {
  const rendre = (extra: Partial<Parameters<typeof FenetreEnvoi>[0]> = {}) => {
    const onTermine = vi.fn();
    const onFermer = vi.fn();
    render(
      <>
        <GlobalStyle />
        <FenetreEnvoi dossier={dossierDemande(devisComplet)} brouillon={{}} mode="devis" onFermer={onFermer} onTermine={onTermine} {...extra} />
      </>,
    );
    return { onTermine, onFermer };
  };

  it('est une fenêtre unique : À en lecture seule, un seul bouton plein, pas de seconde confirmation', async () => {
    rendre();
    const fenetre = await screen.findByRole('dialog');
    await within(fenetre).findByDisplayValue('martin@example.fr');
    expect((within(fenetre).getByDisplayValue('martin@example.fr') as HTMLInputElement).readOnly).toBe(true);
    expect(fenetre.querySelectorAll('.bo-bouton--primaire')).toHaveLength(1);
    expect(within(fenetre).getByRole('button', { name: 'Envoyer' })).toBeTruthy();
  });

  it('envoie l\'objet et le message relus, puis termine', async () => {
    vi.mocked(envoi.envoyerDevis).mockResolvedValue({ ok: true, patchs: 2, champsEnregistres: [], message: 'Devis envoyé à martin@example.fr' });
    const { onTermine } = rendre();
    const objet = await screen.findByDisplayValue('Votre devis');
    fireEvent.change(objet, { target: { value: 'Votre devis HGWF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(envoi.envoyerDevis).toHaveBeenCalledWith(expect.anything(), expect.anything(), {}, { objet: 'Votre devis HGWF', message: 'Bonjour Martin' });
  });

  it('bloque l\'envoi et écrit ce qui manque', async () => {
    rendre({ dossier: dossierDemande({ statut: 1 }) });
    await screen.findByDisplayValue('martin@example.fr');
    expect(screen.getByText('Il manque :')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Envoyer' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('propose de terminer sans renvoyer d\'e-mail quand le statut n\'a pas été posé', async () => {
    vi.mocked(envoi.envoyerDevis).mockResolvedValue({ ok: true, patchs: 1, champsEnregistres: [], statutACorriger: true });
    vi.mocked(envoi.terminerEnvoi).mockResolvedValue({ ok: true, patchs: 1, champsEnregistres: [] });
    const { onTermine } = rendre();
    await screen.findByDisplayValue('Votre devis');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await screen.findByText(/Envoyé mais statut non mis à jour/);
    expect(onTermine).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Réessayer la mise à jour' }));
    });
    await waitFor(() => expect(onTermine).toHaveBeenCalled());
    expect(envoi.terminerEnvoi).toHaveBeenCalledTimes(1);
    expect(envoi.envoyerDevis).toHaveBeenCalledTimes(1);
  });

  it('garde la fenêtre ouverte et affiche l\'erreur quand l\'envoi échoue', async () => {
    vi.mocked(envoi.envoyerDevis).mockResolvedValue({ ok: false, motif: 'perime', message: 'La demande a changé.' });
    const { onTermine } = rendre();
    await screen.findByDisplayValue('Votre devis');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await screen.findByText(/La demande a changé/);
    expect(onTermine).not.toHaveBeenCalled();
  });
});
