/**
 * Gabarit unique d'appel à l'API d'envoi (8.3) : clé, en-têtes, 401 vers purge
 * de la clé, erreurs normalisées. Remplace les trois copies de `fetch` + 401
 * de la V1. Les contrats de l'API (`apps/api`) ne changent pas.
 *
 * Le destinataire n'est jamais pris dans le corps envoyé : l'API le relit
 * dans Sanity (règle de sûreté conservée).
 */
import type { AppelerApi, MotifEchec, ReponseApi, Resultat } from '../domaine/contrats';
import { lireCle, MESSAGE_CLE_ABSENTE, purgerCle } from './cleApi';

/** Adresse de l'API : injectée au build par la CLI Sanity (variables `SANITY_STUDIO_*`). */
function adresseApi(): string | undefined {
  return process.env.SANITY_STUDIO_HGWF_API_URL;
}

/** Message d'erreur lisible pour une réponse en échec. */
function messageDeReponse(statut: number, corps: Record<string, unknown>): string {
  const erreur = typeof corps.erreur === 'string' ? corps.erreur : '';
  return erreur || `Erreur ${statut} de l'API.`;
}

export const appelerApi: AppelerApi = async (route, corps) => {
  const cle = lireCle();
  if (!cle) {
    return { ok: false, motif: 'cle', message: MESSAGE_CLE_ABSENTE };
  }
  const api = adresseApi();
  if (!api) {
    return { ok: false, motif: 'reseau', message: "L'adresse de l'API d'envoi n'est pas configurée." };
  }
  let reponse: Response;
  try {
    reponse = await fetch(`${api}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hgwf-cle': cle },
      body: JSON.stringify(corps),
    });
  } catch {
    return { ok: false, motif: 'reseau', message: "Connexion impossible : l'API d'envoi ne répond pas." };
  }
  const donnees = (await reponse.json().catch(() => ({}))) as Record<string, unknown>;
  if (reponse.status === 401) {
    // Clé refusée : on l'oublie pour que la prochaine tentative la redemande.
    purgerCle();
    return { ok: false, motif: 'cle', message: "La clé d'envoi a été refusée. Saisissez-la à nouveau." };
  }
  const ok = reponse.ok && donnees.ok !== false;
  if (!ok) {
    // 5xx : service ou e-mail en panne (réessayer a un sens) ; 4xx : l'API refuse cette demande.
    const motif: MotifEchec = reponse.status >= 500 ? 'reseau' : 'refus';
    return { ok: false, motif, message: messageDeReponse(reponse.status, donnees) };
  }
  const rep: ReponseApi = { ok: true, statut: reponse.status, corps: donnees };
  return { ok: true, reponse: rep };
};

/** Raccourci pour les échecs de l'API vus depuis un verbe : même forme, sans le champ `reponse`. */
export function echecApi(r: Resultat<{ reponse: ReponseApi }>): Extract<Resultat, { ok: false }> {
  if (r.ok) return { ok: false, motif: 'refus', message: 'Réponse inattendue.' };
  return r;
}
