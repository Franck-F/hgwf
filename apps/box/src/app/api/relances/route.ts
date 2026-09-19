/**
 * Relance des loyers en retard, déclenchée par une tâche planifiée.
 *
 * Même code que le bouton de l'écran : un envoi manuel et un envoi automatique
 * qui divergeraient, ce serait deux comportements à vérifier au lieu d'un.
 *
 * Protégée par un secret partagé. Sans `CRON_SECRET` posé, la route refuse
 * tout : une route d'envoi ouverte est une route d'envoi pour n'importe qui.
 *
 * Elle n'est pas encore branchée : l'application n'est pas déployée. Le jour où
 * elle le sera, une tâche planifiée l'appellera chaque matin.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { relancerImpayes } from '@/lib/relances';

export const dynamic = 'force-dynamic';

export async function POST(requete: NextRequest) {
  const attendu = process.env.CRON_SECRET;
  if (!attendu) {
    return NextResponse.json({ ok: false, erreur: 'CRON_SECRET absent' }, { status: 503 });
  }
  if (requete.headers.get('authorization') !== `Bearer ${attendu}`) {
    return NextResponse.json({ ok: false, erreur: 'non autorisé' }, { status: 401 });
  }

  // Pas de session utilisateur ici : la clé de service traverse la sécurité au
  // niveau des lignes. Elle ne sort jamais du serveur.
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) {
    return NextResponse.json({ ok: false, erreur: 'clé de service absente' }, { status: 503 });
  }

  const sanity = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, cle, {
    auth: { persistSession: false },
  });

  const bilan = await relancerImpayes(sanity);
  return NextResponse.json(bilan, { status: bilan.ok ? 200 : 500 });
}
