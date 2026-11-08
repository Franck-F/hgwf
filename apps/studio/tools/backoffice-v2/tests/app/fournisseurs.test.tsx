/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCleApi, useRacine, useRoute, useToasts } from '../../app/Contexte';
import { Fournisseurs } from '../../app/Fournisseurs';
import { creerRouteurMemoire } from '../../app/routeur';
import type { RouteurMemoire } from '../../app/routeur';
import type { ResultatUseCleApi, ResultatUseRoute, ResultatUseToasts } from '../../domaine/contrats';

// Faux stockage de la clé : le vrai module est un squelette (lot 7).
const stockage = vi.hoisted(() => ({ cle: null as string | null, ecritureOk: true }));
vi.mock('../../actions/cleApi', () => ({
  NOM_CLE_API: 'hgwf-cle-api',
  lireCle: () => stockage.cle,
  ecrireCle: (c: string) => {
    if (!stockage.ecritureOk) return false;
    stockage.cle = c;
    return true;
  },
  purgerCle: () => {
    stockage.cle = null;
  },
}));

interface Prises {
  route: ResultatUseRoute;
  toasts: ResultatUseToasts;
  cle: ResultatUseCleApi;
  racine: HTMLElement;
}

/** Compose les hooks et rend la dernière valeur lisible par le test. */
function Sonde({ prises }: { prises: { courant?: Prises } }) {
  const route = useRoute();
  const toasts = useToasts();
  const cle = useCleApi();
  const racine = useRacine();
  useEffect(() => {
    prises.courant = { route, toasts, cle, racine };
  });
  return <p data-testid="chemin">{route.chemin}</p>;
}

function monter(depart = '/afaire'): { prises: { courant?: Prises }; routeur: RouteurMemoire } {
  const prises: { courant?: Prises } = {};
  const routeur = creerRouteurMemoire(depart);
  render(
    <Fournisseurs routeur={routeur}>
      <Sonde prises={prises} />
    </Fournisseurs>,
  );
  return { prises, routeur };
}

/** Le champ de la clé (le titre de la fenêtre et son groupe portent la même étiquette). */
function champCle(): HTMLInputElement {
  return document.querySelector('input[type=password]') as HTMLInputElement;
}

beforeEach(() => {
  stockage.cle = null;
  stockage.ecritureOk = true;
});
afterEach(() => cleanup());

describe('racine', () => {
  it('fournit l’élément .bo-racine aux composants (hôte des fenêtres)', () => {
    const { prises } = monter();
    expect(prises.courant?.racine.classList.contains('bo-racine')).toBe(true);
  });
});

describe('route et garde de navigation', () => {
  it('suit le routeur et navigue', () => {
    const { prises, routeur } = monter('/clients');
    expect(screen.getByTestId('chemin').textContent).toBe('/clients');
    act(() => prises.courant?.route.naviguer('/dossiers'));
    expect(screen.getByTestId('chemin').textContent).toBe('/dossiers');
    expect(routeur.chemin()).toBe('/dossiers');
  });

  it('un chemin vide est lu comme l’accueil', () => {
    monter('');
    expect(screen.getByTestId('chemin').textContent).toBe('/afaire');
  });

  it('une garde qui refuse empêche la navigation', async () => {
    const { prises, routeur } = monter('/dossier/a');
    const verifier = vi.fn(() => false);
    act(() => prises.courant?.route.garde.definir(verifier));
    await act(async () => prises.courant?.route.naviguer('/clients'));
    expect(verifier).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('chemin').textContent).toBe('/dossier/a');
    expect(routeur.chemin()).toBe('/dossier/a');
  });

  it('une garde asynchrone qui accepte laisse passer, une seule fois', async () => {
    const { prises } = monter('/dossier/a');
    const verifier = vi.fn(async () => true);
    act(() => prises.courant?.route.garde.definir(verifier));
    await act(async () => prises.courant?.route.naviguer('/clients'));
    expect(verifier).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('chemin').textContent).toBe('/clients');
  });

  it('sans garde (retirée par la vue), la navigation est libre', async () => {
    const { prises } = monter('/dossier/a');
    act(() => prises.courant?.route.garde.definir(() => false));
    act(() => prises.courant?.route.garde.definir(null));
    await act(async () => prises.courant?.route.naviguer('/clients'));
    expect(screen.getByTestId('chemin').textContent).toBe('/clients');
  });

  it('« Précédent » du navigateur est aussi soumis à la garde : refus, l’adresse est remise', async () => {
    const { prises, routeur } = monter('/dossiers');
    await act(async () => prises.courant?.route.naviguer('/dossier/a'));
    act(() => prises.courant?.route.garde.definir(() => false));
    await act(async () => routeur.retour());
    expect(screen.getByTestId('chemin').textContent).toBe('/dossier/a');
    expect(routeur.chemin()).toBe('/dossier/a');
  });

  it('« Précédent » du navigateur accepté par la garde change de page', async () => {
    const { prises, routeur } = monter('/dossiers');
    await act(async () => prises.courant?.route.naviguer('/dossier/a'));
    act(() => prises.courant?.route.garde.definir(async () => true));
    await act(async () => routeur.retour());
    expect(screen.getByTestId('chemin').textContent).toBe('/dossiers');
  });

  it('une garde qui plante ne bloque pas la navigation suivante', async () => {
    const { prises } = monter('/dossier/a');
    act(() => prises.courant?.route.garde.definir(() => Promise.reject(new Error('boum'))));
    await act(async () => prises.courant?.route.naviguer('/clients'));
    expect(screen.getByTestId('chemin').textContent).toBe('/dossier/a');
    act(() => prises.courant?.route.garde.definir(null));
    await act(async () => prises.courant?.route.naviguer('/clients'));
    expect(screen.getByTestId('chemin').textContent).toBe('/clients');
  });
});

describe('notifications', () => {
  it('un succès est annoncé en « status », une erreur en « alert » et reste jusqu’à fermeture', () => {
    const { prises } = monter();
    act(() => {
      prises.courant?.toasts.succes('Devis envoyé à martin@exemple.fr');
      prises.courant?.toasts.erreur('Le dossier a été modifié');
    });
    expect(screen.getByRole('status').textContent).toContain('Devis envoyé');
    const alerte = screen.getByRole('alert');
    expect(alerte.textContent).toContain('Le dossier a été modifié');
    const fermer = alerte.querySelector('button') as HTMLButtonElement;
    fireEvent.click(fermer);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('la pile est le dernier enfant de .bo-racine (elle y est collante)', () => {
    const { prises } = monter();
    act(() => prises.courant?.toasts.succes('ok'));
    const racine = document.querySelector('.bo-racine') as HTMLElement;
    expect(racine.lastElementChild?.classList.contains('bo-toasts')).toBe(true);
  });

  it('ne garde que les cinq derniers messages', () => {
    const { prises } = monter();
    act(() => {
      for (let i = 1; i <= 7; i += 1) prises.courant?.toasts.erreur(`Erreur ${i}`);
    });
    expect(screen.getAllByRole('alert')).toHaveLength(5);
    expect(screen.queryByText('Erreur 1')).toBeNull();
    expect(screen.getByText('Erreur 7')).toBeTruthy();
  });
});

describe('clé d’envoi', () => {
  it('ouvre la fenêtre, refuse une clé vide, puis enregistre', async () => {
    const { prises } = monter();
    let reponse: Promise<boolean> | undefined;
    act(() => {
      reponse = prises.courant?.cle.demanderCle();
    });
    const dialogue = screen.getByRole('dialog');
    expect(dialogue.textContent).toContain('saisissez la clé fournie par Franck');

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Saisissez la clé')).toBeTruthy();
    expect(stockage.cle).toBeNull();

    const champ = champCle() as HTMLInputElement;
    // Jamais affichée en clair pendant la saisie.
    expect(champ.type).toBe('password');
    fireEvent.change(champ, { target: { value: '  secret-123  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await act(async () => {
      await reponse;
    });
    expect(await reponse).toBe(true);
    expect(stockage.cle).toBe('secret-123');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(prises.courant?.cle.presente).toBe(true);
    expect(document.body.textContent).not.toContain('secret-123');
  });

  it('Entrée enregistre, Annuler renonce sans rien écrire', async () => {
    const { prises } = monter();
    let reponse: Promise<boolean> | undefined;
    act(() => {
      reponse = prises.courant?.cle.demanderCle();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await reponse).toBe(false);
    expect(stockage.cle).toBeNull();

    act(() => {
      reponse = prises.courant?.cle.demanderCle();
    });
    const champ = champCle();
    fireEvent.change(champ, { target: { value: 'abc' } });
    fireEvent.keyDown(champ, { key: 'Enter' });
    expect(await reponse).toBe(true);
    expect(stockage.cle).toBe('abc');
  });

  it('Échap ferme la fenêtre et répond « non »', async () => {
    const { prises } = monter();
    let reponse: Promise<boolean> | undefined;
    act(() => {
      reponse = prises.courant?.cle.demanderCle();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await reponse).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('deux demandes simultanées partagent une seule fenêtre et la même réponse', async () => {
    const { prises } = monter();
    let a: Promise<boolean> | undefined;
    let b: Promise<boolean> | undefined;
    act(() => {
      a = prises.courant?.cle.demanderCle();
      b = prises.courant?.cle.demanderCle();
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.change(champCle(), { target: { value: 'k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await a).toBe(true);
    expect(await b).toBe(true);
  });

  it('un stockage bloqué affiche une erreur au lieu de lever une exception', () => {
    stockage.ecritureOk = false;
    const { prises } = monter();
    act(() => {
      void prises.courant?.cle.demanderCle();
    });
    fireEvent.change(champCle(), { target: { value: 'k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByRole('dialog').textContent).toContain('n’a pas pu être enregistrée');
  });

  it('« oublier » efface la clé et `presente` repasse à faux', () => {
    stockage.cle = 'existante';
    const { prises } = monter();
    expect(prises.courant?.cle.presente).toBe(true);
    act(() => prises.courant?.cle.oublier());
    expect(stockage.cle).toBeNull();
    expect(prises.courant?.cle.presente).toBe(false);
  });
});
