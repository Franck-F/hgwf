// Rattrapage unique (29/10/2026) : les demandes créées avant le pré-remplissage
// de la facturation reçoivent le nom du client comme nom facturé.
//
//   cd apps/studio && npx sanity exec scripts/reprise-facturation.cjs --with-user-token
//
// setIfMissing : un nom facturé déjà saisi n'est jamais remplacé. Le reste
// (adresse, type…) n'a jamais été collecté : il apparaît dans les questions à
// poser au client.
const { getCliClient } = require('sanity/cli');

(async () => {
  const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });
  const demandes = await client.fetch(
    '*[_type == "demandeDevis" && !defined(facturationNom) && defined(clientNom)]{_id, reference, clientNom}',
  );
  if (!demandes.length) return console.log('rien à reprendre');
  const tx = client.transaction();
  for (const d of demandes) tx.patch(d._id, (p) => p.setIfMissing({ facturationNom: d.clientNom.trim() }));
  await tx.commit();
  console.log(`${demandes.length} demande(s) reprise(s) : ${demandes.map((d) => d.reference).join(', ')}`);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
