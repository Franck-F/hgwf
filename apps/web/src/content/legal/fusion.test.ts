import { describe, it, expect } from 'vitest';
import { fusionner } from './fusion';
import type { ContenuLegal } from '@/components/legal/PageLegale';

const DEFAUT: ContenuLegal = {
  eyebrow: 'Informations légales',
  titrePage: 'Mentions légales.',
  chapo: 'Chapô par défaut',
  dateMaj: '2026-07-21',
  sections: [{ titre: 'Éditeur', ancre: 'editeur', corps: [] }],
};

describe('fusionner', () => {
  it('renvoie le contenu par défaut quand Sanity ne répond rien', () => {
    expect(fusionner(DEFAUT, null)).toEqual(DEFAUT);
  });

  it('laisse la valeur par défaut quand le champ Sanity est vide', () => {
    expect(fusionner(DEFAUT, { titrePage: '' }).titrePage).toBe('Mentions légales.');
  });

  it('remplace les champs fournis par Sanity', () => {
    expect(fusionner(DEFAUT, { titrePage: 'Autre titre' }).titrePage).toBe('Autre titre');
  });

  it('ignore les sections Sanity sans corps, pour ne jamais afficher une section vide', () => {
    const r = fusionner(DEFAUT, {
      sections: [
        { titre: 'Remplie', ancre: 'remplie', corps: [{ _type: 'block' }] },
        { titre: 'Vide', ancre: 'vide', corps: [] },
      ],
    });
    expect(r.sections.map((s) => s.titre)).toEqual(['Remplie']);
  });

  it('garde les sections par défaut si Sanity n’en fournit aucune exploitable', () => {
    expect(fusionner(DEFAUT, { sections: [] }).sections).toEqual(DEFAUT.sections);
  });

  it('replie l’ancre sur un slug du titre quand elle manque', () => {
    const r = fusionner(DEFAUT, { sections: [{ titre: 'Vos droits RGPD', corps: [{ _type: 'block' }] }] });
    expect(r.sections[0]!.ancre).toBe('vos-droits-rgpd');
  });
});
