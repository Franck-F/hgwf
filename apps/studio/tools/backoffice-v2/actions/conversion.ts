/** Conversion d'une demande acceptée en expédition : un geste gardé, une transaction (5.2). */
import type { VerbesActions } from '../domaine/contrats';
import { appliquerGeste } from './gestes';

export const convertirEnExpedition: VerbesActions['convertirEnExpedition'] = (ctx, dossier, brouillon) =>
  appliquerGeste(ctx, dossier, brouillon, { type: 'creerExpedition' });
