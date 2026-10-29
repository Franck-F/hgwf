/**
 * Envoi d'e-mails transactionnels via Resend.
 *
 * Pourquoi ici et pas dans le back-office : celui-ci est un outil Sanity qui
 * s'exécute dans le navigateur. Une clé d'API y serait lisible par quiconque
 * télécharge le paquet JavaScript. L'envoi doit donc partir du serveur.
 *
 * Le module est volontairement inerte tant que la configuration est
 * incomplète : sans clé ou sans expéditeur, `envoyerEmail` ne fait rien et le
 * dit. C'est ce qui permet de déployer le code avant que le domaine ne soit
 * vérifié chez Resend, sans risquer d'envoi raté ni d'erreur en production.
 */

const RESEND_API = 'https://api.resend.com/emails';

const CLE = () => process.env.RESEND_API_KEY;
// Doit être une adresse d'un domaine vérifié chez Resend, sinon l'envoi est
// refusé. Format attendu : « HGWF Cargo <contact@hgwf-cargo.fr> ».
const EXPEDITEUR = () => process.env.EMAIL_EXPEDITEUR;
// Adresse de l'équipe, pour les notifications internes.
const INTERNE = () => process.env.EMAIL_INTERNE;

export function envoiConfigure() {
  return Boolean(CLE() && EXPEDITEUR());
}

/**
 * Envoie un e-mail. Ne lève jamais : un envoi raté ne doit pas faire échouer
 * l'opération métier qui l'a déclenché — une demande de devis enregistrée puis
 * perdue parce que l'e-mail de confirmation a échoué serait le pire des deux
 * mondes.
 *
 * @returns {Promise<{ok: boolean, id?: string, raison?: string}>}
 */
export async function envoyerEmail({ to, subject, text, html, replyTo, attachments }) {
  if (!envoiConfigure()) {
    return { ok: false, raison: 'envoi non configuré (RESEND_API_KEY ou EMAIL_EXPEDITEUR absent)' };
  }
  const destinataires = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!destinataires.length) return { ok: false, raison: 'aucun destinataire' };

  const corps = {
    from: EXPEDITEUR(),
    to: destinataires,
    subject,
    text,
    ...(html ? { html } : {}),
    // Les réponses doivent atterrir dans la boîte de l'équipe, jamais dans le
    // vide d'une adresse technique.
    ...(replyTo ? { reply_to: replyTo } : {}),
    // Pièces jointes : `content` en base64, sans préfixe « data: ». Le devis et
    // la facture voyagent en pièce jointe et non en lien — le client doit
    // pouvoir les archiver, les imprimer et les transmettre sans dépendre
    // d'une URL qui vivra moins longtemps que sa comptabilité.
    ...(attachments?.length ? { attachments } : {}),
  };

  try {
    const rep = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLE()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(10_000),
    });
    const donnees = await rep.json().catch(() => ({}));
    if (!rep.ok) {
      // On journalise le motif, jamais la clé ni le contenu du message.
      console.error(`[email] refus ${rep.status} : ${donnees?.message ?? 'sans détail'}`);
      return { ok: false, raison: `HTTP ${rep.status}` };
    }
    return { ok: true, id: donnees?.id };
  } catch (err) {
    console.error(`[email] échec d'envoi : ${err?.message ?? err}`);
    return { ok: false, raison: 'injoignable' };
  }
}

// ── Gabarit ───────────────────────────────────────────────────────────────────
// Version compacte du gabarit de la charte : tableaux imbriqués et styles en
// ligne, parce qu'Outlook sur Windows rend le HTML avec le moteur de Word —
// ni flexbox, ni grid, ni feuille de style externe. Les puces sont donc des
// cellules de tableau (les <ul> y ont un retrait imprévisible), et le filet de
// l'encadré est un border-left de cellule, seul rendu fiable partout.
const MARINE = '#063565'; // PMS 289 C, la couleur du site
const CORAIL = '#fd7f5a'; // PMS 170 C
const OR = '#fdb53d';
const IVOIRE = '#fcf7ed';
const CREME = '#fbf4e6';
const ARDOISE = '#45566a';
const POLICE = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const echapper = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Le numéro de téléphone ne doit pas se couper en fin de ligne : espaces
// insécables (ni tel: ni mise en page ne le garantissent autrement).
const securiser = (s) => echapper(s).replace(/09 62 03 80 13/g, '09 62 03 80 13');

const EST_PUCE = (l) => /^\s*[-•]\s+\S/.test(l);
// Un « Libellé : » court devient un intertitre ; une phrase d'introduction
// qui finit aussi par « : » reste du texte courant, sinon elle serait mise en
// gras sur trois lignes.
const EST_INTERTITRE = (l) => /\S ?:\s*$/.test(l) && !EST_PUCE(l) && l.trim().length <= 50;

/**
 * Découpe un bloc en séquences : intertitre, texte (lignes conservées) ou liste.
 * Tout est échappé ici, une seule fois : rien du texte n'atteint le HTML brut.
 */
function sequencesDe(bloc) {
  const seqs = [];
  for (const brute of bloc.split('\n')) {
    const l = brute.replace(/\s+$/, '');
    if (!l.trim()) continue;
    const dernier = seqs[seqs.length - 1];
    if (EST_PUCE(l)) {
      const item = l.replace(/^\s*[-•]\s+/, '');
      if (dernier?.type === 'liste') dernier.items.push(item);
      else seqs.push({ type: 'liste', items: [item] });
    } else if (EST_INTERTITRE(l)) {
      seqs.push({ type: 'intertitre', texte: l.trim() });
    } else if (dernier?.type === 'texte') {
      dernier.lignes.push(l.trim());
    } else {
      seqs.push({ type: 'texte', lignes: [l.trim()] });
    }
  }
  return seqs;
}

function rendreListe(items, encadre) {
  const lignes = items
    .map(
      (it) =>
        `<tr><td width="22" valign="top" style="width:22px;padding:0 0 8px 0;font-family:${POLICE};font-size:18px;line-height:26px;font-weight:700;color:${CORAIL};">&bull;</td><td valign="top" style="padding:0 0 8px 0;font-family:${POLICE};font-size:16px;line-height:26px;color:${ARDOISE};">${securiser(
          it,
        )}</td></tr>`,
    )
    .join('');
  const liste = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lignes}</table>`;
  if (!encadre) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;"><tr><td style="padding:0 0 0 4px;">${liste}</td></tr></table>`;
  }
  // Fond crème et filet corail à gauche : la liste des questions doit sauter
  // aux yeux, c'est ce que le client doit traiter.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr><td style="background-color:${CREME};border-left:4px solid ${CORAIL};padding:16px 20px 8px 18px;">${liste}</td></tr></table>`;
}

function rendreBloc(bloc, encadre) {
  return sequencesDe(bloc)
    .map((s) => {
      if (s.type === 'intertitre') {
        return `<p style="margin:0 0 8px 0;font-family:${POLICE};font-size:16px;line-height:24px;font-weight:700;color:${MARINE};">${echapper(
          s.texte,
        )}</p>`;
      }
      if (s.type === 'liste') return rendreListe(s.items, encadre);
      return `<p style="margin:0 0 16px 0;font-family:${POLICE};font-size:16px;line-height:26px;color:${ARDOISE};">${s.lignes
        .map(securiser)
        .join('<br>')}</p>`;
    })
    .join('');
}

/**
 * `paragraphesApres` : texte placé après le récapitulatif (le devis met ses
 * montants au milieu du message, pas sous la signature).
 *
 * Mise en forme du texte, par bloc (les `\n` sont conservés) :
 *   - lignes commençant par « - » : vraie liste à puces ;
 *   - ligne courte finissant par « : » : intertitre en gras marine ;
 *   - `encadre: true` : les listes sont mises en valeur (fond crème, filet corail).
 * @param {{titre: string, paragraphes: string[], lignes?: Array<[string, string]>, paragraphesApres?: string[], encadre?: boolean}} contenu
 */
export function gabaritHtml({ titre, paragraphes, lignes = [], paragraphesApres = [], encadre = false }) {
  const enParagraphes = (liste) =>
    liste
      .filter(Boolean)
      .map((x) => rendreBloc(String(x), encadre))
      .join('');
  const p = enParagraphes(paragraphes);
  const pApres = enParagraphes(paragraphesApres);

  const recap = lignes.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREME};border-radius:6px;margin:0 0 16px 0;"><tr><td style="padding:18px 22px;">${lignes
        .map(
          ([libelle, valeur]) =>
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 6px 0;font-family:${POLICE};font-size:15px;color:${ARDOISE};">${echapper(
              libelle,
            )}</td><td align="right" style="padding:0 0 6px 0;font-family:${POLICE};font-size:15px;font-weight:700;color:${MARINE};">${echapper(
              valeur,
            )}</td></tr></table>`,
        )
        .join('')}</td></tr></table>`
    : '';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapper(
    titre,
  )}</title></head><body style="margin:0;padding:0;background-color:${CREME};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREME};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${IVOIRE};border-radius:8px;">
<tr><td style="padding:24px 32px;background-color:${MARINE};border-radius:8px 8px 0 0;">
<img src="https://hgwf-cargo.fr/logos/hgwf-monochrome-blanc.png" width="150" height="47" alt="HGWF Cargo" style="display:block;width:150px;height:auto;">
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background-color:${CORAIL};">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 12px 32px;">
<h1 style="margin:0 0 20px 0;font-family:${POLICE};font-size:24px;line-height:32px;font-weight:700;color:${MARINE};">${echapper(
    titre,
  )}</h1>
${p}${recap}${pApres}
</td></tr>
<tr><td style="padding:20px 32px;background-color:${MARINE};border-radius:0 0 8px 8px;font-family:${POLICE};font-size:14px;line-height:22px;color:#cfe0ef;">
<strong style="color:#ffffff;">HGWF Cargo</strong><br>Commissionnaire de transport international · Rosny-sous-Bois<br>
<a href="tel:+33962038013" style="color:${OR};font-size:16px;font-weight:700;text-decoration:none;">09 62 03 80 13</a> ·
<a href="https://hgwf-cargo.fr" style="color:#ffffff;text-decoration:none;">hgwf-cargo.fr</a>
</td></tr></table></td></tr></table></body></html>`;
}
