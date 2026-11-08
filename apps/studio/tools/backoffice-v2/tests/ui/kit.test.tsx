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

describe('Bouton', () => {
  it('est de type button et se désactive pendant une action', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Bouton onClick={onClick}>Valider</Bouton>);
    const b = screen.getByRole('button', { name: 'Valider' });
    expect(b.getAttribute('type')).toBe('button');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Bouton onClick={onClick} chargement>
        Valider
      </Bouton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Valider' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Montant (piège du zéro)', () => {
  function Hote({ depart }: { depart: number | null }) {
    const [v, setV] = useState<number | null>(depart);
    return (
      <>
        <Montant etiquette="Montant HT" valeur={v} onChange={setV} />
        <output data-testid="v">{v === null ? 'vide' : String(v)}</output>
      </>
    );
  }
  it('lit la virgule, distingue 0 du vide et n’émet jamais NaN', () => {
    render(<Hote depart={null} />);
    const champ = screen.getByLabelText('Montant HT');
    fireEvent.change(champ, { target: { value: '1 250,50' } });
    expect(screen.getByTestId('v').textContent).toBe('1250.5');
    fireEvent.change(champ, { target: { value: '0' } });
    expect(screen.getByTestId('v').textContent).toBe('0');
    fireEvent.change(champ, { target: { value: '' } });
    expect(screen.getByTestId('v').textContent).toBe('vide');
    fireEvent.change(champ, { target: { value: 'abc' } });
    expect(screen.getByTestId('v').textContent).toBe('vide');
    expect(screen.getByText(/Saisissez un montant/)).toBeTruthy();
  });
  it('ne vide pas le champ quand la saisie devient illisible, et accepte le symbole €', () => {
    render(<Hote depart={null} />);
    const champ = screen.getByLabelText('Montant HT') as HTMLInputElement;
    fireEvent.change(champ, { target: { value: '1250' } });
    fireEvent.change(champ, { target: { value: '1250,505' } });
    // Le texte tapé reste là (avec son message), il n'est pas effacé silencieusement.
    expect(champ.value).toBe('1250,505');
    expect(screen.getByText(/Saisissez un montant/)).toBeTruthy();
    fireEvent.change(champ, { target: { value: '1 250 €' } });
    expect(screen.getByTestId('v').textContent).toBe('1250');
    fireEvent.blur(champ);
    expect(champ.value.replace(/\s/g, ' ')).toBe('1 250');
  });
  it('fonctions de lecture et de format', () => {
    expect(lireMontant('0')).toBe(0);
    expect(lireMontant('')).toBeNull();
    expect(lireMontant('12,3')).toBe(12.3);
    expect(lireMontant('1,234')).toBeUndefined();
    expect(formaterMontant(0)).toBe('0');
    expect(formaterMontant(12.5)).toBe('12,5');
    expect(formaterMontant(null)).toBe('');
  });
  it('affiche la valeur reçue, y compris 0', () => {
    render(<Hote depart={0} />);
    expect((screen.getByLabelText('Montant HT') as HTMLInputElement).value).toBe('0');
  });
});

describe('ChoixTVA', () => {
  it('ne présélectionne rien et renvoie une valeur numérique stricte', () => {
    const onChange = vi.fn();
    render(<ChoixTVA valeur={null} onChange={onChange} />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
    fireEvent.click(radios[0] as HTMLInputElement);
    expect(onChange).toHaveBeenCalledWith(0);
    fireEvent.click(radios[1] as HTMLInputElement);
    expect(onChange).toHaveBeenCalledWith(20);
  });
});

describe('Modale', () => {
  function Hote({ empecher }: { empecher?: boolean }) {
    const [ouverte, setOuverte] = useState(false);
    return (
      <>
        <button onClick={() => setOuverte(true)}>Ouvrir</button>
        {ouverte ? (
          <Modale
            titre="Envoyer"
            onFermer={() => setOuverte(false)}
            empecherFermeture={empecher}
            pied={<Bouton variante="primaire">Valider l’envoi</Bouton>}
          >
            <input aria-label="Objet" />
          </Modale>
        ) : null}
      </>
    );
  }
  it('est un dialogue, prend le focus, se ferme sur Échap et rend le focus', () => {
    render(<Hote />);
    const ouvrir = screen.getByText('Ouvrir');
    ouvrir.focus();
    fireEvent.click(ouvrir);
    expect(screen.getByRole('dialog', { name: 'Envoyer' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Objet'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(ouvrir);
  });
  it('garde le focus à l’intérieur avec Tab', () => {
    render(<Hote />);
    fireEvent.click(screen.getByText('Ouvrir'));
    const dernier = screen.getByRole('button', { name: 'Valider l’envoi' });
    dernier.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fermer la fenêtre' }));
  });
  it('ne se ferme pas au clic extérieur quand il y a une saisie', () => {
    render(<Hote empecher />);
    fireEvent.click(screen.getByText('Ouvrir'));
    fireEvent.mouseDown(document.querySelector('.bo-voile') as Element);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('se ferme au clic extérieur sans saisie', () => {
    render(<Hote />);
    fireEvent.click(screen.getByText('Ouvrir'));
    fireEvent.mouseDown(document.querySelector('.bo-voile') as Element);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('verrouille le défilement de la racine et le rend à la fermeture', () => {
    render(<Hote />);
    fireEvent.click(screen.getByText('Ouvrir'));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });
  it('seule la fenêtre du dessus réagit à Échap (Confirmation ouverte sur une Modale)', () => {
    const fermerBas = vi.fn();
    const annuler = vi.fn();
    function Empilees() {
      const [confirme, setConfirme] = useState(false);
      return (
        <Modale titre="Bas" onFermer={fermerBas} pied={<Bouton onClick={() => setConfirme(true)}>Continuer</Bouton>}>
          {confirme ? (
            <Confirmation
              titre="Sûr ?"
              consequence="Le client sera prévenu."
              verbe="Confirmer"
              onConfirmer={() => undefined}
              onAnnuler={annuler}
            />
          ) : null}
        </Modale>
      );
    }
    render(<Empilees />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(annuler).toHaveBeenCalledTimes(1);
    expect(fermerBas).not.toHaveBeenCalled();
  });
});

describe('Confirmation', () => {
  it('a exactement un bouton plein, le verbe, et Annuler', () => {
    const onConfirmer = vi.fn();
    const onAnnuler = vi.fn();
    render(
      <Confirmation
        titre="Créer l’expédition ?"
        consequence="Le suivi devient public."
        verbe="Créer"
        onConfirmer={onConfirmer}
        onAnnuler={onAnnuler}
      />,
    );
    expect(document.querySelectorAll('.bo-bouton--primaire')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(onConfirmer).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onAnnuler).toHaveBeenCalled();
  });
});

describe('MenuActions', () => {
  it('s’ouvre, se parcourt aux flèches et se ferme sur Échap en rendant le focus', () => {
    render(
      <MenuActions
        elements={[
          { id: 'a', libelle: 'Premier', onChoisir: () => undefined },
          { id: 'b', libelle: 'Second', onChoisir: () => undefined },
        ]}
      />,
    );
    const decl = screen.getByRole('button', { name: 'Autres actions' });
    expect(decl.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(decl);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0] as Element, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1] as Element, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(decl);
  });
  it('appelle onChoisir puis se referme ; se ferme au clic extérieur', () => {
    const choisir = vi.fn();
    render(<MenuActions elements={[{ id: 'a', libelle: 'Premier', onChoisir: choisir }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Autres actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Premier' }));
    expect(choisir).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Autres actions' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
