/**
 * Verbes métier de l'expédition. Chaque geste qui change la prise en charge
 * passe par `appliquerGeste` (règle 5.5). Les deux gestes « immédiats »
 * (règlement reçu, départ sans règlement) n'utilisent pas le brouillon : ils
 * écrivent seulement leurs propres champs, avec date et auteur.
 */
import type { VerbesActions } from '../domaine/contrats';
import { formaterDateHeure } from '../domaine/format';
import { echec, ecrirePatch } from './ecriture';
import { appliquerGeste } from './gestes';

export const declencherPriseEnCharge: VerbesActions['declencherPriseEnCharge'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'declencherPEC' });

export const marquerExpedie: VerbesActions['marquerExpedie'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'marquerExpedie' });

export const avancerSuivi: VerbesActions['avancerSuivi'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'avancerSuivi', ...saisie });

/** Unique chemin vers l'étape 4 : étape 4 et prise en charge 3 dans UN patch. */
export const marquerLivre: VerbesActions['marquerLivre'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'marquerLivre', ...saisie });

export const notifierEtapeActuelle: VerbesActions['notifierEtapeActuelle'] = (ctx, dossier, eta) =>
  appliquerGeste(ctx, dossier, {}, { type: 'notifierEtapeActuelle', ...(eta !== undefined ? { eta } : {}) });

export const signalerIncident: VerbesActions['signalerIncident'] = (ctx, dossier) =>
  appliquerGeste(ctx, dossier, {}, { type: 'signalerIncident' });

export const reprendre: VerbesActions['reprendre'] = (ctx, dossier, brouillon, choix) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'reprendre', choix });

export const annuler: VerbesActions['annuler'] = (ctx, dossier) =>
  appliquerGeste(ctx, dossier, {}, { type: 'annuler' });

/** Case « Règlement reçu » : écrite tout de suite, avec la date. Décocher efface la date. */
export const marquerReglement: VerbesActions['marquerReglement'] = async (ctx, expedition, recu) => {
  const supplements = { reglementRecu: recu, reglementRecuLe: recu ? formaterDateHeure(ctx.maintenant()) : null };
  const r = await ecrirePatch(ctx, expedition._id, expedition._rev, {}, supplements, expedition);
  if (!r.ok) return r;
  return {
    ok: true,
    patchs: 1,
    rev: r.rev,
    message: recu ? 'Règlement noté comme reçu.' : 'Règlement noté comme non reçu.',
    champsEnregistres: [],
  };
};

/** Départ sans règlement : motif obligatoire, écrit avec la date et l'auteur. */
export const autoriserDepart: VerbesActions['autoriserDepart'] = async (ctx, expedition, motif) => {
  if (!motif.trim()) return echec('manques', 'Il manque : le motif de la dérogation de départ.', ['le motif de la dérogation de départ']);
  const supplements = {
    derogationDepart: true,
    derogationMotif: motif.trim(),
    derogationLe: formaterDateHeure(ctx.maintenant()),
    derogationPar: ctx.utilisateur.nom,
  };
  const r = await ecrirePatch(ctx, expedition._id, expedition._rev, {}, supplements, expedition);
  if (!r.ok) return r;
  return { ok: true, patchs: 1, rev: r.rev, message: 'Départ sans règlement autorisé.', champsEnregistres: [] };
};
