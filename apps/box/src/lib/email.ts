import 'server-only';

/**
 * Envoi d'e-mails par Resend, côté serveur uniquement.
 *
 * Même expéditeur que le fret — `contact@hgwf-cargo.fr`, déjà authentifié
 * SPF et DKIM. Réutiliser un domaine dont la réputation est établie vaut mieux
 * que d'en monter un second qui partirait de zéro.
 *
 * Inerte tant que `RESEND_API_KEY` et `EMAIL_EXPEDITEUR` ne sont pas posés :
 * l'application tourne, l'envoi ne part pas, et le dit. Une relance qui échoue
 * ne doit jamais faire tomber l'écran qui l'a déclenchée.
 */

export type Envoi = { ok: true } | { ok: false; raison: string };

export function envoiConfigure(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_EXPEDITEUR);
}

export async function envoyerEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<Envoi> {
  if (!envoiConfigure()) return { ok: false, raison: 'envoi non configuré' };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from: process.env.EMAIL_EXPEDITEUR,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(process.env.EMAIL_INTERNE ? { reply_to: process.env.EMAIL_INTERNE } : {}),
      }),
    });

    if (!r.ok) {
      const corps = await r.text();
      return { ok: false, raison: `Resend ${r.status} — ${corps.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (e) {
    const expire = e instanceof Error && e.name === 'TimeoutError';
    return { ok: false, raison: expire ? 'délai dépassé' : 'réseau indisponible' };
  }
}

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Gabarit sobre, en tableaux : c'est ce que les clients de messagerie
 * comprennent encore tous, Outlook compris.
 */
export function gabaritHtml({
  titre,
  paragraphes,
  lignes = [],
}: {
  titre: string;
  paragraphes: string[];
  lignes?: [string, string][];
}): string {
  const corps = paragraphes
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#16182c">${echapper(p)}</p>`,
    )
    .join('');

  const tableau = lignes.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:14px">${lignes
        .map(
          ([cle, valeur]) =>
            `<tr><td style="padding:5px 18px 5px 0;color:#6f7089">${echapper(cle)}</td>` +
            `<td style="padding:5px 0;font-weight:700;color:#16182c">${echapper(valeur)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px">
<tr><td style="padding:28px 30px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;color:#6f7089">HGWF CARGO</p>
<h1 style="margin:0 0 18px;font-size:20px;color:#16182c">${echapper(titre)}</h1>
${corps}${tableau}
<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#6f7089">
HGWF Cargo · contact@hgwf-cargo.fr · 09 62 03 80 13
</p>
</td></tr></table></body></html>`;
}
