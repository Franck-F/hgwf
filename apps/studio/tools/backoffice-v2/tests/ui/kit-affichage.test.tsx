/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalStyle } from '../../theme/GlobalStyle';
import {
  Badge,
  Bouton,
  ChoixTVA,
  Confirmation,
  Frise,
  Manques,
  MenuActions,
  Modale,
  Montant,
  Section,
  Segments,
  Toasts,
  formaterMontant,
  lireMontant,
} from '../../ui';

afterEach(() => cleanup());
describe('Section, Segments, Frise, Manques, Badge', () => {
  it('Section : aria-expanded et résumé quand fermée', () => {
    const { rerender } = render(
      <Section titre="Facturation" resume="Incomplet" ouverte={false} onBasculer={() => undefined}>
        Corps
      </Section>,
    );
    expect(screen.getByRole('button', { name: /Facturation/ }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Incomplet')).toBeTruthy();
    rerender(
      <Section titre="Facturation" resume="Incomplet" ouverte onBasculer={() => undefined}>
        Corps
      </Section>,
    );
    expect(screen.getByRole('button', { name: /Facturation/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByText('Incomplet')).toBeNull();
  });
  it('Segments : onglets, compteurs, sélection', () => {
    const onChoisir = vi.fn();
    render(
      <Segments
        libelle="Vues"
        courant="a"
        onChoisir={onChoisir}
        valeurs={[
          { id: 'a', libelle: 'En cours', compteur: 3 },
          { id: 'b', libelle: 'Terminés' },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: /En cours/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Terminés' }));
    expect(onChoisir).toHaveBeenCalledWith('b');
  });
  it('Frise : une seule étape courante ; aucune si courante est null', () => {
    const etapes = [
      { id: 'a', libelle: 'A' },
      { id: 'b', libelle: 'B' },
      { id: 'c', libelle: 'C' },
    ];
    const { container, rerender } = render(<Frise etapes={etapes} courante="b" />);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(container.querySelectorAll('.bo-frise-etape--faite')).toHaveLength(1);
    rerender(<Frise etapes={etapes} courante={null} />);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(0);
  });
  it('Manques : liste écrite, rien si vide', () => {
    const { container, rerender } = render(<Manques manques={['Le montant HT']} />);
    expect(screen.getByText('Il manque :')).toBeTruthy();
    expect(screen.getByText('Le montant HT')).toBeTruthy();
    rerender(<Manques manques={[]} />);
    expect(container.textContent).toBe('');
  });
  it('Badge : le mot est toujours présent avec l’icône', () => {
    render(
      <Badge ton="urgent" icone="alerte">
        Incident
      </Badge>,
    );
    expect(screen.getByText('Incident')).toBeTruthy();
    expect(document.querySelector('.bo-badge--urgent svg')).toBeTruthy();
  });
});

describe('Toasts', () => {
  it('utilise alert pour une erreur, status pour un succès, et ferme le succès après 6 s', () => {
    vi.useFakeTimers();
    const onFermer = vi.fn();
    render(
      <Toasts
        onFermer={onFermer}
        toasts={[
          { id: '1', type: 'succes', message: 'Envoyé' },
          { id: '2', type: 'erreur', message: 'Échec' },
        ]}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Envoyé');
    expect(screen.getByRole('alert').textContent).toContain('Échec');
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onFermer).toHaveBeenCalledWith('1');
    expect(onFermer).not.toHaveBeenCalledWith('2');
    vi.useRealTimers();
  });
});

describe('GlobalStyle', () => {
  it('injecte la feuille une seule fois, même montée deux fois', () => {
    const a = render(<GlobalStyle />);
    const b = render(<GlobalStyle />);
    expect(document.querySelectorAll('#bo-feuille-de-style')).toHaveLength(1);
    expect(document.querySelectorAll('#bo-polices')).toHaveLength(1);
    a.unmount();
    expect(document.querySelectorAll('#bo-feuille-de-style')).toHaveLength(1);
    b.unmount();
    expect(document.querySelectorAll('#bo-feuille-de-style')).toHaveLength(0);
  });
});
