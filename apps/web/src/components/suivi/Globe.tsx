'use client';

import createGlobe, { type Marker, type Arc, type COBEOptions } from 'cobe';
import { useEffect, useRef } from 'react';

export type { Marker as GlobeMarker, Arc as GlobeArc };

// Palette HGWF (composantes 0–1). Globe marine sombre, atmosphère ciel discrète.
const BASE_CONFIG: Omit<COBEOptions, 'width' | 'height' | 'markers' | 'arcs'> = {
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.28,
  dark: 1,
  diffuse: 1.15,
  mapSamples: 16000,
  mapBrightness: 5.2,
  baseColor: [0.23, 0.42, 0.58], // ciel-marine : les points de terre restent lisibles
  markerColor: [253 / 255, 127 / 255, 90 / 255], // corail (défaut, surchargé par marqueur)
  glowColor: [0.18, 0.36, 0.53], // halo marine-ciel discret
  arcColor: [253 / 255, 181 / 255, 61 / 255], // or : la route maritime
  arcWidth: 0.4,
  arcHeight: 0.4,
};

export function Globe({
  className,
  markers,
  arcs = [],
  label = 'Globe interactif des destinations desservies',
}: {
  className?: string;
  markers: Marker[];
  arcs?: Arc[];
  /** Nom accessible du globe — la donnée reste portée par le texte voisin. */
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const rotationDrag = useRef(0); // rotation induite par le glisser
  const phi = useRef(0); // rotation automatique cumulée
  const width = useRef(0);

  // Le globe n'est recréé que lorsque marqueurs ou arcs changent réellement
  // (une recherche qui résout une autre destination), pas à chaque frappe.
  const configKey = JSON.stringify({ markers, arcs });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onResize = () => {
      if (canvas) width.current = canvas.offsetWidth;
    };
    window.addEventListener('resize', onResize);
    onResize();

    let frame = 0;
    const globe = createGlobe(canvas, {
      ...BASE_CONFIG,
      width: width.current * 2,
      height: width.current * 2,
      markers,
      arcs,
    });

    // Dernier état réellement dessiné : en mouvement réduit, phi n'avance pas,
    // et redessiner à l'identique 60 fois par seconde serait du travail GPU
    // pour rien. On ne pousse un update que si quelque chose a changé
    // (rotation automatique, glisser, ou redimensionnement).
    let dernierPhi = Number.NaN;
    let derniereLargeur = 0;

    // Boucle de rendu (cobe v2 se pilote via update). Rotation lente, sauf
    // pendant un glisser ou en mouvement réduit.
    const rendre = () => {
      if (!pointerInteracting.current && !reduit) phi.current += 0.0035;
      const phiTotal = phi.current + rotationDrag.current;
      if (phiTotal !== dernierPhi || width.current !== derniereLargeur) {
        dernierPhi = phiTotal;
        derniereLargeur = width.current;
        globe.update({
          phi: phiTotal,
          width: width.current * 2,
          height: width.current * 2,
        });
      }
      frame = requestAnimationFrame(rendre);
    };

    const demarrer = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(rendre);
    };
    const arreter = () => cancelAnimationFrame(frame);

    // Hors du viewport, la boucle s'arrête complètement : un globe qu'on ne
    // voit pas ne doit coûter ni batterie ni GPU. La marge de 100 px relance
    // le rendu juste avant qu'il ne redevienne visible.
    const observer = new IntersectionObserver(
      ([entree]) => {
        if (entree?.isIntersecting) demarrer();
        else arreter();
      },
      { rootMargin: '100px' },
    );
    observer.observe(canvas);
    demarrer();

    // Apparition en fondu une fois le premier rendu prêt.
    const t = window.setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = '1';
    }, 0);

    return () => {
      arreter();
      observer.disconnect();
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
    // configKey suffit : recrée le globe uniquement quand marqueurs/arcs changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const majInteraction = (valeur: number | null) => {
    pointerInteracting.current = valeur;
    if (canvasRef.current) canvasRef.current.style.cursor = valeur ? 'grabbing' : 'grab';
  };

  const majMouvement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerMovement.current = delta;
      rotationDrag.current = delta / 200;
    }
  };

  return (
    // role="img" + aria-label : un lecteur d'écran annonce ce qu'est le globe
    // au lieu de rencontrer un canvas muet. Le canvas lui-même est masqué —
    // l'interaction (glisser pour tourner) est un bonus visuel, jamais le seul
    // chemin vers l'information.
    <div role="img" aria-label={label} className={`relative mx-auto aspect-square w-full ${className ?? ''}`}>
      <canvas
        aria-hidden="true"
        ref={canvasRef}
        className="size-full cursor-grab opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
        onPointerDown={(e) => majInteraction(e.clientX - pointerMovement.current)}
        onPointerUp={() => majInteraction(null)}
        onPointerOut={() => majInteraction(null)}
        onMouseMove={(e) => majMouvement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && majMouvement(e.touches[0].clientX)}
      />
    </div>
  );
}
