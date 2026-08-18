'use client';

import { Globe, type GlobeMarker, type GlobeArc } from './suivi/Globe';

// Globe des destinations de la page d'accueil : réemploi du composant de la
// page suivi. Les ports de départ en or, le réseau desservi en ciel, et trois
// routes maritimes dessinées en arc, le voyage du conteneur depuis le quai
// du Havre. Interactif (glisser pour tourner), rotation lente sinon.
const OR: [number, number, number] = [253 / 255, 181 / 255, 61 / 255];
const CIEL: [number, number, number] = [81 / 255, 165 / 255, 221 / 255];

const LE_HAVRE: [number, number] = [49.49, 0.11];
const FOS: [number, number] = [43.43, 4.94];
const NEW_YORK: [number, number] = [40.71, -74.01];
const SANTOS: [number, number] = [-23.96, -46.33];
const FORT_DE_FRANCE: [number, number] = [14.6, -61.07];

const MARQUEURS: GlobeMarker[] = [
  // Ports de départ
  { location: LE_HAVRE, size: 0.09, color: OR },
  { location: FOS, size: 0.07, color: OR },
  // Amérique du Nord
  { location: NEW_YORK, size: 0.07, color: CIEL },
  { location: [25.76, -80.19], size: 0.06, color: CIEL }, // Miami
  { location: [45.5, -73.55], size: 0.05, color: CIEL }, // Montréal
  // Amérique du Sud
  { location: SANTOS, size: 0.06, color: CIEL }, // Santos (São Paulo)
  { location: [-34.6, -58.38], size: 0.05, color: CIEL }, // Buenos Aires
  // Antilles & Guyane
  { location: FORT_DE_FRANCE, size: 0.06, color: CIEL },
  { location: [16.24, -61.53], size: 0.06, color: CIEL }, // Pointe-à-Pitre
  { location: [4.93, -52.33], size: 0.06, color: CIEL }, // Cayenne
  { location: [18.59, -72.31], size: 0.05, color: CIEL }, // Port-au-Prince
  // Afrique
  { location: [14.72, -17.47], size: 0.06, color: CIEL }, // Dakar
  { location: [5.34, -4.03], size: 0.06, color: CIEL }, // Abidjan
];

const ROUTES: GlobeArc[] = [
  { from: LE_HAVRE, to: FORT_DE_FRANCE },
  { from: LE_HAVRE, to: NEW_YORK },
  { from: FOS, to: SANTOS },
];

export function GlobeDestinations({ className, label }: { className?: string; label?: string }) {
  return <Globe markers={MARQUEURS} arcs={ROUTES} className={className} label={label} />;
}
