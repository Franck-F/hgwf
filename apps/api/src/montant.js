// Calcul et présentation du montant d'un devis — côté serveur.
//
// Jumeau de apps/studio/tools/backoffice/chiffrage.ts (le back-office tourne
// dans le navigateur et ne peut pas importer ce fichier, ce projet Vercel ne
// peut pas importer le sien). Les deux doivent rendre exactement les mêmes
// chaînes : test/montant.test.js les compare sur une même table de cas.
//
// Modèle : le document stocke montantHT (nombre, en euros) et tauxTVA (nombre,
// en pourcentage : 0 ou 20). TVA et TTC se recalculent partout, en centimes
// entiers pour éviter les écarts de flottants (1250 × 0,2).
// Les documents antérieurs au 29/09/2026 n'ont qu'une chaîne libre montantDevis
// (« 1 250 € ») : on l'affiche telle quelle, sans jamais en déduire de TVA.

// Pratique constatée : 0 % sur le transport lié à l'export (Outre-mer compris),
// 20 % sinon. À faire valider par l'expert-comptable, comme la mention ci-dessous.
export const TAUX_TVA = [0, 20];

export const MENTION_EXONERATION = 'TVA non applicable : transport international lié à une exportation.';

const estNombre = (n) => typeof n === 'number' && Number.isFinite(n);

// { ht, taux, tva, ttc } en euros, ou null si le montant HT ou le taux manque.
// Attention au zéro : 0 % est le taux le plus courant, on ne teste jamais par vérité.
export function calculerChiffrage(montantHT, tauxTVA) {
  if (!estNombre(montantHT) || !estNombre(tauxTVA) || montantHT < 0 || tauxTVA < 0) return null;
  const htC = Math.round(montantHT * 100);
  const tvaC = Math.round((htC * tauxTVA) / 100);
  return { ht: htC / 100, taux: tauxTVA, tva: tvaC / 100, ttc: (htC + tvaC) / 100 };
}

// « 1 250,00 € ». Intl sépare les milliers par U+202F, absent des polices
// standard du PDF : on le remplace par l'espace insécable classique (U+00A0).
export function euros(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/ /g, ' ');
}

// « 20 % », « 5,5 % ».
export function pourcentage(taux) {
  return `${String(taux).replace('.', ',')} %`;
}

const ancienMontant = (d) =>
  typeof d?.montantDevis === 'string' && d.montantDevis.trim() ? d.montantDevis.trim() : null;

// Vrai si le devis peut partir : un montant HT strictement positif avec son
// taux, ou, pour un ancien document, la chaîne libre.
export function aUnMontant(d) {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA);
  if (c) return c.ht > 0;
  return ancienMontant(d) !== null;
}

// Récapitulatif en lignes [libellé, valeur] : e-mail, PDF, fiches.
export function lignesMontant(d) {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA);
  if (c) {
    return [
      ['Montant HT', euros(c.ht)],
      [`TVA ${pourcentage(c.taux)}`, euros(c.tva)],
      ['Total TTC', euros(c.ttc)],
    ];
  }
  const ancien = ancienMontant(d);
  return ancien ? [['Montant', ancien]] : [];
}

// Le montant tel qu'on l'annonce au client (objet d'e-mail, relance, listes) :
// le TTC, puisque c'est ce qu'il paiera. null si rien n'est chiffré.
export function montantAnnonce(d) {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA);
  if (c) return `${euros(c.ttc)} TTC`;
  return ancienMontant(d);
}

// Une phrase complète pour un message rédigé :
// « 1 500,00 € TTC (1 250,00 € HT + TVA 20 %) » ou « 1 250,00 € TTC (TVA 0 %, exportation) ».
export function libelleMontant(d) {
  const c = calculerChiffrage(d?.montantHT, d?.tauxTVA);
  if (c) {
    return c.taux === 0
      ? `${euros(c.ttc)} TTC (TVA 0 %, exportation)`
      : `${euros(c.ttc)} TTC (${euros(c.ht)} HT + TVA ${pourcentage(c.taux)})`;
  }
  return ancienMontant(d);
}
