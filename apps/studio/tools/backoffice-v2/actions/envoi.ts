/**
 * Envois d'e-mails depuis l'outil (devis, compléments) et aperçu. Le gabarit
 * d'appel à l'API (clé, 401, erreurs) est dans `api.ts` et réexporté ici.
 */
import type { VerbesActions } from '../domaine/contrats';
import { executerApercu } from './envoiExecution';
import { appliquerGeste } from './gestes';

export { appelerApi } from './api';

export const envoyerDevis: VerbesActions['envoyerDevis'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'envoyerDevis', ...saisie });

export const envoyerComplement: VerbesActions['envoyerComplement'] = (ctx, dossier, brouillon, saisie) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'envoyerComplement', ...saisie });

/** Sans e-mail : relit la `_rev`, constate `devisEnvoyeLe`, pose le statut 2 sous `ifRevisionId`. */
export const terminerEnvoi: VerbesActions['terminerEnvoi'] = (ctx, dossier) =>
  appliquerGeste(ctx, dossier, {}, { type: 'terminerEnvoi' });

/** L'aperçu n'écrit rien : pas de geste, pas de verrou. */
export const apercuEnvoi: VerbesActions['apercuEnvoi'] = (ctx, dossier, mode) => executerApercu(ctx, dossier, mode);
