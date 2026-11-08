// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerRouteurHash, creerRouteurMemoire } from '../../app/routeur';

afterEach(() => {
  window.location.hash = '';
});

/** jsdom déclenche `hashchange` en différé : on attend l'événement. */
function attendreHash(): Promise<void> {
  return new Promise((resoudre) => window.addEventListener('hashchange', () => resoudre(), { once: true }));
}

describe('routeur à fragment', () => {
  it('lit et écrit le chemin dans le fragment, sans le « # »', async () => {
    const routeur = creerRouteurHash();
    const pret = attendreHash();
    routeur.naviguer('/dossier/abc');
    await pret;
    expect(window.location.hash).toBe('#/dossier/abc');
    expect(routeur.chemin()).toBe('/dossier/abc');
  });

  it('prévient les abonnés d’un changement et permet de se désabonner', async () => {
    const routeur = creerRouteurHash();
    const fn = vi.fn();
    const stop = routeur.ecouter(fn);
    let pret = attendreHash();
    routeur.naviguer('/clients');
    await pret;
    expect(fn).toHaveBeenCalledTimes(1);
    stop();
    pret = attendreHash();
    routeur.naviguer('/outils/export');
    await pret;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('« remplacer » ne laisse pas d’entrée dans l’historique', async () => {
    const routeur = creerRouteurHash();
    const longueur = window.history.length;
    const pret = attendreHash();
    routeur.naviguer('/clients', { remplacer: true });
    await pret;
    expect(window.history.length).toBe(longueur);
    expect(routeur.chemin()).toBe('/clients');
  });
});

describe('routeur en mémoire', () => {
  it('part du chemin donné et avance', () => {
    const routeur = creerRouteurMemoire('/clients');
    expect(routeur.chemin()).toBe('/clients');
    routeur.naviguer('/dossiers');
    expect(routeur.chemin()).toBe('/dossiers');
  });

  it('« retour » revient en arrière et prévient les abonnés', () => {
    const routeur = creerRouteurMemoire('/afaire');
    const fn = vi.fn();
    routeur.ecouter(fn);
    routeur.naviguer('/dossiers');
    routeur.naviguer('/dossier/x');
    routeur.retour();
    expect(routeur.chemin()).toBe('/dossiers');
    expect(fn).toHaveBeenCalledTimes(3);
    routeur.retour();
    routeur.retour();
    expect(routeur.chemin()).toBe('/afaire');
  });

  it('« remplacer » écrase la position courante', () => {
    const routeur = creerRouteurMemoire('/afaire');
    routeur.naviguer('/dossiers');
    routeur.naviguer('/clients', { remplacer: true });
    routeur.retour();
    expect(routeur.chemin()).toBe('/afaire');
  });

  it('naviguer après un retour efface l’historique « en avant »', () => {
    const routeur = creerRouteurMemoire('/afaire');
    routeur.naviguer('/dossiers');
    routeur.retour();
    routeur.naviguer('/clients');
    routeur.retour();
    expect(routeur.chemin()).toBe('/afaire');
  });
});
