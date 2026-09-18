import 'server-only';

/**
 * Appel à Gemini, côté serveur uniquement.
 *
 * `server-only` n'est pas décoratif : si ce module se retrouvait un jour
 * importé par un composant client, la compilation échouerait au lieu
 * d'embarquer la clé dans le paquet envoyé au navigateur.
 *
 * L'authentification passe par l'en-tête `x-goog-api-key` et non par la clé en
 * paramètre d'URL : une URL se retrouve dans les journaux du serveur, dans les
 * outils de suivi et dans l'historique du navigateur. Pas un en-tête.
 */

const MODELE = 'gemini-2.5-flash';
const RACINE = 'https://generativelanguage.googleapis.com/v1beta';

export type Reponse<T> = { ok: true; donnees: T } | { ok: false; erreur: string };

export function geminiConfigure(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Demande une réponse conforme à un schéma JSON. Le modèle ne renvoie jamais de
 * prose : soit un objet valide, soit une erreur explicite.
 */
export async function extraire<T>({
  consigne,
  texte,
  schema,
  delaiMs = 20_000,
}: {
  consigne: string;
  texte: string;
  schema: Record<string, unknown>;
  delaiMs?: number;
}): Promise<Reponse<T>> {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return { ok: false, erreur: 'Assistance non configurée sur ce serveur.' };

  // Un appel réseau sans limite de temps finit par bloquer une action serveur
  // entière : l'utilisateur voit une roue tourner sans fin.
  const minuteur = AbortSignal.timeout(delaiMs);

  let brut: Response;
  try {
    brut = await fetch(`${RACINE}/models/${MODELE}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
      signal: minuteur,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: consigne }] },
        contents: [{ role: 'user', parts: [{ text: texte }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          // Zéro : on extrait des faits présents dans le texte, on n'écrit pas.
          // La même phrase doit donner le même résultat deux fois de suite.
          temperature: 0,
        },
      }),
    });
  } catch (e) {
    const expire = e instanceof Error && e.name === 'TimeoutError';
    return {
      ok: false,
      erreur: expire ? 'L’assistance n’a pas répondu à temps.' : 'L’assistance est injoignable.',
    };
  }

  if (!brut.ok) {
    return { ok: false, erreur: `L’assistance a refusé la demande (${brut.status}).` };
  }

  const enveloppe = (await brut.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const contenu = enveloppe.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!contenu) return { ok: false, erreur: 'L’assistance n’a rien renvoyé d’exploitable.' };

  try {
    return { ok: true, donnees: JSON.parse(contenu) as T };
  } catch {
    return { ok: false, erreur: 'Réponse de l’assistance illisible.' };
  }
}
