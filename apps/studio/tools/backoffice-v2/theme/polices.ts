/**
 * Polices du site (Poppins pour le texte et les titres, comme la maquette). Un seul `<link>` inséré une fois dans `<head>`, au lieu d'un
 * `@import` à chaque rendu ; si le réseau manque, `system-ui` prend le relais.
 */
export const URL_POLICES =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';

const ID_LIEN = 'bo-polices';

export function insererPolices(): void {
  if (typeof document === 'undefined' || document.getElementById(ID_LIEN)) return;
  const lien = document.createElement('link');
  lien.id = ID_LIEN;
  lien.rel = 'stylesheet';
  lien.href = URL_POLICES;
  document.head.appendChild(lien);
}
