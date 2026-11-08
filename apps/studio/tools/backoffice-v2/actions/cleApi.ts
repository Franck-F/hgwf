/**
 * Clé d'envoi du back-office : `localStorage['hgwf-cle-api']`, même nom que la
 * V1 pour ne pas la redemander à l'équipe (8.3).
 *
 * Tout est dans un `try/catch` : en navigation privée, ou avec les données de
 * site bloquées, le stockage peut lever une exception ou revenir vide. L'outil
 * doit alors continuer à fonctionner (la clé est redemandée), jamais planter.
 */
export const NOM_CLE_API = 'hgwf-cle-api';

/** Message unique quand aucune clé n'est enregistrée (appel à l'API et contrôle préalable des gestes). */
export const MESSAGE_CLE_ABSENTE = "La clé d'envoi est absente. Saisissez-la pour continuer.";

type Ecouteur = () => void;
const ecouteurs = new Set<Ecouteur>();
const prevenir = (): void => ecouteurs.forEach((fn) => fn());

/** La coque s'abonne ici pour tenir à jour « Clé enregistrée sur cet ordinateur ». */
export function surChangementCle(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => ecouteurs.delete(ecouteur);
}

export function lireCle(): string | null {
  try {
    const cle = window.localStorage.getItem(NOM_CLE_API);
    return cle && cle.trim() ? cle : null;
  } catch {
    return null;
  }
}

/** `false` si le navigateur refuse d'écrire (l'appelant le dit à l'utilisateur). */
export function ecrireCle(cle: string): boolean {
  const propre = cle.trim();
  if (!propre) return false;
  try {
    window.localStorage.setItem(NOM_CLE_API, propre);
    prevenir();
    return true;
  } catch {
    return false;
  }
}

export function purgerCle(): void {
  try {
    window.localStorage.removeItem(NOM_CLE_API);
  } catch {
    /* rien à effacer */
  }
  prevenir();
}
