/**
 * Supprime les documents back-office du dataset public « production »
 * (ils vivent désormais dans le dataset privé « operations »).
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/nettoyer-backoffice-production.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });

const TYPES = ['demandeDevis', 'expedition', 'clientFiche', 'conteneurOccasion', 'rotation', 'statsMensuelles'];

async function main() {
  console.log(`Nettoyage du dataset : ${client.config().dataset}`);
  const ids = await client.fetch<string[]>(`*[_type in $types]._id`, { types: TYPES });
  if (!ids.length) {
    console.log('Aucun document back-office dans production — rien à faire.');
    return;
  }
  let tx = client.transaction();
  for (const id of ids) tx = tx.delete(id);
  await tx.commit();
  console.log(`  ✓ ${ids.length} documents supprimés de production`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
