/**
 * Petites briques de sécurité de l'API (audit du 16/11/2026).
 *
 * - `cleValide` : compare un secret reçu au secret attendu en temps constant.
 *   Une comparaison `===` s'arrête au premier caractère différent ; mesurée sur
 *   beaucoup d'essais, cette différence de durée aide à deviner la clé caractère
 *   par caractère. On compare donc les empreintes SHA-256 (même longueur) avec
 *   `timingSafeEqual`.
 *
 * - `sansLien` / `prenomAffichable` : le formulaire public déclenche un accusé
 *   de réception envoyé à l'adresse saisie. Sans nettoyage, n'importe qui
 *   pourrait faire envoyer par HGWF Cargo, à n'importe quelle adresse, un
 *   e-mail contenant son propre lien (hameçonnage sous notre nom). On retire
 *   donc de ce qui est recopié dans l'e-mail tout ce qui ressemble à un lien ou
 *   à une adresse.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

const empreinte = (v) => createHash('sha256').update(String(v), 'utf8').digest();

export function cleValide(recue, attendue) {
  if (typeof recue !== 'string' || typeof attendue !== 'string' || !recue || !attendue) return false;
  return timingSafeEqual(empreinte(recue), empreinte(attendue));
}

// http(s)://…, www.…, un nom de domaine nu (« exemple.online/abc ») ou une adresse e-mail.
const LIEN = /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\b[\w-]+(?:\.[\w-]+)*\.(?:[a-z]{2,24})(?:\/\S*)?/gi;

/** Le texte sans lien ni adresse, espaces resserrés. Chaîne vide s'il ne reste rien d'utile. */
export function sansLien(texte) {
  return String(texte ?? '')
    .replace(LIEN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Premier mot du nom, seulement s'il ressemble à un prénom (lettres, tiret, apostrophe ; 40 caractères au plus). */
export function prenomAffichable(nom) {
  const premier = String(nom ?? '').trim().split(/\s+/)[0] ?? '';
  return /^[\p{L}][\p{L}'’-]{0,39}$/u.test(premier) ? premier : '';
}
