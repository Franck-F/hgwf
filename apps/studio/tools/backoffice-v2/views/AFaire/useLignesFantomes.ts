/**
 * Une ligne qui disparaît de « À faire » pendant qu'on la regarde reste
 * visible 2 secondes, grisée (4.1) : sans cela, la liste saute sous la souris
 * au moment du clic.
 *
 * Le hook compare chaque nouvelle liste à la précédente ; les dossiers
 * disparus sont réinsérés à leur ancienne place, puis retirés après `delaiMs`.
 */
import { useEffect, useRef, useState } from 'react';
import type { GroupeAFaire, IdGroupeAFaire, LigneAFaire } from '../../domaine/types';

export const DELAI_FANTOME_MS = 2000;

interface Fantome {
  ligne: LigneAFaire;
  groupeId: IdGroupeAFaire;
  titre: string;
  index: number;
}

export interface ListeAvecFantomes {
  groupes: GroupeAFaire[];
  /** Ids des lignes fantômes (à griser). */
  fantomes: ReadonlySet<string>;
}

function aplatir(groupes: GroupeAFaire[]): Map<string, Fantome> {
  const m = new Map<string, Fantome>();
  for (const g of groupes) {
    g.lignes.forEach((ligne, index) => m.set(ligne.dossierId, { ligne, groupeId: g.id, titre: g.titre, index }));
  }
  return m;
}

export function fusionnerFantomes(groupes: GroupeAFaire[], fantomes: Map<string, Fantome>): GroupeAFaire[] {
  if (fantomes.size === 0) return groupes;
  const copie: GroupeAFaire[] = groupes.map((g) => ({ ...g, lignes: [...g.lignes] }));
  for (const f of [...fantomes.values()].sort((a, b) => a.index - b.index)) {
    let g = copie.find((x) => x.id === f.groupeId);
    if (!g) {
      g = { id: f.groupeId, titre: f.titre, lignes: [] };
      copie.push(g);
    }
    g.lignes.splice(Math.min(f.index, g.lignes.length), 0, f.ligne);
  }
  return copie;
}

export function useLignesFantomes(groupes: GroupeAFaire[], delaiMs = DELAI_FANTOME_MS): ListeAvecFantomes {
  const precedent = useRef<Map<string, Fantome>>(new Map());
  const minuteurs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [fantomes, setFantomes] = useState<Map<string, Fantome>>(new Map());

  useEffect(() => {
    const courant = aplatir(groupes);
    const disparus: Fantome[] = [];
    for (const [id, f] of precedent.current) if (!courant.has(id)) disparus.push(f);
    precedent.current = courant;

    // Un dossier revenu dans la liste n'est plus un fantôme.
    const revenus = [...minuteurs.current.keys()].filter((id) => courant.has(id));
    for (const id of revenus) {
      clearTimeout(minuteurs.current.get(id));
      minuteurs.current.delete(id);
    }
    if (disparus.length === 0 && revenus.length === 0) return;

    setFantomes((avant) => {
      const suite = new Map(avant);
      for (const id of revenus) suite.delete(id);
      for (const f of disparus) suite.set(f.ligne.dossierId, f);
      return suite;
    });
    for (const f of disparus) {
      const id = f.ligne.dossierId;
      minuteurs.current.set(
        id,
        setTimeout(() => {
          minuteurs.current.delete(id);
          setFantomes((avant) => {
            const suite = new Map(avant);
            suite.delete(id);
            return suite;
          });
        }, delaiMs),
      );
    }
  }, [groupes, delaiMs]);

  // Aucun minuteur ne survit à l'écran.
  useEffect(() => {
    const en = minuteurs.current;
    return () => {
      for (const t of en.values()) clearTimeout(t);
      en.clear();
    };
  }, []);

  return { groupes: fusionnerFantomes(groupes, fantomes), fantomes: new Set(fantomes.keys()) };
}
