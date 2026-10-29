// Crée les fiches services de départ dans le dataset « operations ».
//
//   cd apps/studio && npx sanity exec scripts/semer-fiches.cjs --with-user-token
//
// createIfNotExists : une fiche qui existe déjà (et que l'équipe a peut-être
// complétée) n'est jamais écrasée. Pour repartir d'une fiche vierge, la
// supprimer d'abord dans le Studio.
// CommonJS volontairement : `sanity exec` ne résout pas `sanity/cli` en ESM.
const { getCliClient } = require('sanity/cli');

(async () => {
  const { FICHES } = await import('../seed/fichesServices.mjs');
  const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });

  // Sanity exige une _key sur chaque élément d'un tableau d'objets.
  const avecCles = (lignes, prefixe) => (lignes ?? []).map((l, i) => ({ _key: `${prefixe}${i}`, ...l }));

  const tx = client.transaction();
  for (const f of FICHES) {
    tx.createIfNotExists({
      _type: 'ficheService',
      actif: true,
      ...f,
      grille: avecCles(f.grille, 'g'),
      fraisAnnexes: avecCles(f.fraisAnnexes, 'a'),
      delais: avecCles(f.delais, 'd'),
    });
  }
  const r = await tx.commit();
  const existants = await client.fetch('*[_type == "ficheService"] | order(ordre asc){_id, titre}');
  console.log(`transaction : ${r.results.length} opérations ; fiches présentes : ${existants.length}`);
  for (const e of existants) console.log(`  ${e._id} — ${e.titre}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
