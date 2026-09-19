'use server';

/**
 * Relance déclenchée depuis l'écran. Elle passe par la session de la personne
 * connectée : pas de clé de service, donc les politiques de la base
 * s'appliquent comme pour n'importe quelle autre lecture.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import { relancerImpayes, type Bilan } from '@/lib/relances';

export async function lancerRelances(): Promise<Bilan> {
  const sanity = await serveur();
  const bilan = await relancerImpayes(sanity);
  if (bilan.envoyees > 0 || bilan.echecs > 0) revalidatePath('/echeances');
  return bilan;
}
