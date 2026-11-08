/**
 * Enregistrement du brouillon par la barre d'enregistrement (4.3).
 *
 * Ce n'est pas un geste gardé : aucun statut ne change. Une demande et son
 * expédition sont deux documents : quand le brouillon touche les deux, ils
 * partent dans UNE transaction (`ecrireDossier`), tout ou rien. Deux patchs
 * successifs laissaient la demande écrite et l'expédition en échec : le dossier
 * en mémoire gardait alors une ancienne révision et le clic suivant repartait
 * en faux conflit. En cas d'échec le brouillon est conservé intact (règle 5.5, n° 5).
 *
 * Fichier ajouté au lot 10.
 */
import { ecrireDossier } from '../../actions/ecriture';
import type { ContexteEcriture, Resultat } from '../../domaine/contrats';
import type { Brouillon, Dossier } from '../../domaine/types';
import { repartirBrouillon } from './champsDossier';

export async function enregistrerBrouillon(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
): Promise<Resultat<{ champsEnregistres: string[] }>> {
  const parts = repartirBrouillon(dossier, brouillon);
  const aEcrire: Brouillon = { ...parts.demande, ...parts.expedition };
  if (Object.keys(aEcrire).length === 0) return { ok: true, champsEnregistres: [] };
  // Le document « cible » est la demande, ou l'expédition d'un dossier sans demande.
  const r = await ecrireDossier(ctx, dossier, aEcrire, dossier.demande ? 'demande' : 'expedition', {});
  if (!r.ok) return r;
  return { ok: true, champsEnregistres: r.champsEnregistres };
}
