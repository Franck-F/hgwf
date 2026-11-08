/**
 * Suggestion de texte par l'IA, pour la seule description de la prestation.
 * Rien n'est écrit : la proposition revient à l'écran, l'équipe l'utilise ou
 * l'ignore. Aucun montant n'est jamais proposé par ce chemin (« aucun prix
 * inventé » : le seul montant proposé vient de la grille de la fiche, en local).
 */
import type { VerbesActions } from '../domaine/contrats';
import { echec } from './ecriture';
import { lireFiches } from './envoiExecution';
import { ficheDe } from '../domaine/fiches';

export const suggererDescription: VerbesActions['suggererDescription'] = async (ctx, dossier, brouillon) => {
  const demande = dossier.demande;
  if (!demande?.reference) return echec('refus', 'Ce dossier n’a pas de demande de devis.');
  // La fiche choisie à l'écran (brouillon) passe avant celle enregistrée.
  const choisie = brouillon.ficheService;
  const ref = typeof choisie === 'string' ? { _ref: choisie } : demande.ficheService;
  const fiche = ficheDe({ typeEnvoi: demande.typeEnvoi, ficheService: ref }, await lireFiches(ctx)).fiche;
  const r = await ctx.appelerApi('/api/suggestion-devis', {
    reference: demande.reference,
    champ: 'descriptionPrestation',
    ficheId: fiche?._id,
  });
  if (!r.ok) return r;
  const suggestion = r.reponse.corps.suggestion as { texte?: unknown } | undefined;
  const texte = typeof suggestion?.texte === 'string' ? suggestion.texte.trim() : '';
  if (!texte) return echec('refus', 'Aucune proposition n’a pu être rédigée pour cette demande.');
  return { ok: true, description: texte };
};
