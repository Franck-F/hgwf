/**
 * Notifications et traces du dialogue avec le client : prévenir le client de
 * l'étape de l'expédition, noter sa réponse à une demande de compléments.
 * Appelé par `appliquerGeste` (sous le verrou du dossier), jamais directement
 * par les vues.
 */
import type { ContexteEcriture, Resultat, ResultatGeste } from '../domaine/contrats';
import { complementDemande } from '../domaine/complements';
import { formaterDateHeure } from '../domaine/format';
import type { Demande, Dossier, Expedition } from '../domaine/types';
import { MESSAGE_CLE_ABSENTE } from './cleApi';
import { echec, ecrireDossier, ecrirePatch, relireRevision } from './ecriture';

const texteDe = (v: unknown): string => (typeof v === 'string' ? v : '');

// ── Notification d'étape ────────────────────────────────────────────────────

/**
 * Prévient le client de l'étape ENREGISTRÉE de l'expédition (l'API la relit
 * dans Sanity). Elle refuse de notifier deux fois la même étape : réponse
 * `ignore`, rendue ici par `dejaPrevenu`.
 */
export async function notifierClient(
  ctx: ContexteEcriture,
  expedition: Expedition,
): Promise<Resultat<{ dejaPrevenu: boolean; destinataire: string }>> {
  if (!expedition.reference) return echec('refus', 'Cette expédition n’a pas de référence : le client ne peut pas être prévenu.');
  const r = await ctx.appelerApi('/api/envoi-expedition', { reference: expedition.reference });
  if (!r.ok) return r;
  // L'API note l'étape notifiée : sa révision est la nôtre, pas celle d'un tiers.
  await relireRevision(ctx, expedition._id);
  return { ok: true, dejaPrevenu: r.reponse.corps.ignore === true, destinataire: texteDe(r.reponse.corps.destinataire) };
}

/** « Prévenir le client de l'étape actuelle » : aucun champ de statut n'est écrit (seul l'ETA, si elle change). */
export async function executerNotification(
  ctx: ContexteEcriture,
  dossier: Dossier,
  eta?: string,
): Promise<Resultat<ResultatGeste>> {
  const x = dossier.expedition;
  if (!x) return echec('refus', 'Ce dossier n’a pas encore d’expédition.');
  // Sans clé : on la réclame avant d'écrire l'ETA, pour ne pas rejouer ensuite sur une révision périmée.
  if (ctx.cleDisponible && !ctx.cleDisponible()) return echec('cle', MESSAGE_CLE_ABSENTE);
  let patchs = 0;
  let rev = x._rev;
  const nouvelleEta = eta?.trim();
  if (nouvelleEta && nouvelleEta !== (x.eta ?? '')) {
    const e = await ecrireDossier(ctx, dossier, {}, 'expedition', { eta: nouvelleEta });
    if (!e.ok) return e;
    patchs = e.patchs;
    rev = e.rev;
  }
  const n = await notifierClient(ctx, x);
  if (!n.ok) {
    // Rien d'écrit : échec simple, rejouable. ETA déjà écrite : succès partiel, jamais rejoué tel quel.
    if (patchs === 0) return n;
    return {
      ok: true,
      patchs,
      rev,
      message: `Date d’arrivée enregistrée. Mais le client n’a pas été prévenu : ${n.message}`,
      champsEnregistres: [],
      notificationEchouee: { motif: n.motif, message: n.message },
    };
  }
  if (n.dejaPrevenu) return { ok: true, patchs, rev, dejaPrevenu: true, message: 'Client déjà prévenu de cette étape.', champsEnregistres: [] };
  return { ok: true, patchs, rev, message: `Client prévenu${n.destinataire ? ` (${n.destinataire})` : ''}.`, champsEnregistres: [] };
}

// ── Le client a répondu aux compléments ─────────────────────────────────────

/**
 * Note la réponse du client (champ `reponseClientLe`) : la ligne remonte dans
 * « À faire » (« Réponse reçue, à chiffrer »). Réversible, sans confirmation,
 * sans changement de statut : ce n'est pas un geste gardé, seulement un patch
 * sous `ifRevisionId` qui n'écrit que son champ.
 */
export async function executerClientARepondu(ctx: ContexteEcriture, demande: Demande): Promise<Resultat<ResultatGeste>> {
  if (!complementDemande(demande)) return echec('refus', 'Aucune demande de compléments n’est en attente de réponse.');
  const r = await ecrirePatch(ctx, demande._id, demande._rev, {}, { reponseClientLe: formaterDateHeure(ctx.maintenant()) }, demande);
  if (!r.ok) return r;
  return { ok: true, patchs: 1, rev: r.rev, message: 'Réponse du client notée.', champsEnregistres: [] };
}
