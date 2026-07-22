// La « houle » de la charte (les deux vagues du logo) en version animée :
// deux nappes qui dérivent lentement au pied du hero, comme une surface d'eau.
// Chaque nappe est un motif périodique dessiné deux fois (largeur 200 %) et
// translaté de -50 % en boucle : le raccord est invisible. Décoratif pur
// (aria-hidden) ; en mouvement réduit, la boucle est neutralisée par la règle
// globale de globals.css et les vagues restent figées.

// Deux périodes de 200 unités aux tangentes identiques à chaque extrémité :
// le viewBox 0 0 800 60 en contient quatre avec le doublon, répétables sans
// couture. Tracé dans l'esprit du composant Houle de la charte.
const TRACE =
  'M0 30 C 25 6, 75 6, 100 30 C 125 54, 175 54, 200 30 C 225 6, 275 6, 300 30 C 325 54, 375 54, 400 30';

function Nappe({ couleur, duree, classe }: { couleur: string; duree: string; classe?: string }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 overflow-hidden ${classe ?? ''}`} aria-hidden="true">
      <svg
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        className="houle-derive block h-full w-[200%]"
        style={{ animationDuration: duree }}
      >
        {/* Le motif deux fois : la translation de -50 % retombe exactement sur lui-même. */}
        <path d={TRACE} fill="none" stroke={couleur} strokeWidth="7" strokeLinecap="round" />
        <path
          d={TRACE}
          transform="translate(400 0)"
          fill="none"
          stroke={couleur}
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function HouleAnimee() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 sm:h-20" aria-hidden="true">
      {/* Deux nappes à vitesses différentes : la profondeur vient du déphasage. */}
      <Nappe couleur="rgba(81, 165, 221, 0.5)" duree="38s" classe="h-12 sm:h-16" />
      <Nappe couleur="rgba(253, 127, 90, 0.42)" duree="52s" classe="-mb-1 h-9 sm:h-12" />
    </div>
  );
}
