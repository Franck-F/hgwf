// Export du magasin du back-office (dataset operations) vers un fichier JSON local,
// pour diagnostiquer « À faire » hors du Studio. Usage :
//   cd apps/studio && SORTIE=<fichier.json> npx sanity exec scripts/export-magasin.cjs --with-user-token
// Le fichier contient des données clients : le garder hors du dépôt.
const { getCliClient } = require('sanity/cli');
const fs = require('node:fs');

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });

async function main() {
  const sortie = process.env.SORTIE;
  if (!sortie) throw new Error('SORTIE manquant');
  const donnees = await client.fetch(`{
    "demandes": *[_type == "demandeDevis"],
    "expeditions": *[_type == "expedition"],
    "echanges": *[_type == "echange"]{..., "demandeId": demande._ref},
    "rotations": *[_type == "rotation"],
    "fiches": *[_type == "ficheService"]
  }`);
  fs.writeFileSync(sortie, JSON.stringify(donnees));
  console.log(
    `demandes ${donnees.demandes.length}, expeditions ${donnees.expeditions.length}, echanges ${donnees.echanges.length}, fiches ${donnees.fiches.length}`,
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
