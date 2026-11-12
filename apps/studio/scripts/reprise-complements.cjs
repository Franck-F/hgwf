// Reprise des anciens dossiers : les demandes « en cours » (statut 1) traitées directement
// depuis Outlook, sans trace dans l'outil, n'ont ni compléments, ni devis, ni montant. Elles
// apparaissent à tort dans « À faire » (« Montant à saisir », en retard).
//
// Par défaut : AFFICHE seulement les références ciblées (aucune écriture). Avec APPLIQUER=1,
// pose complementDemandeHorsOutil = 'email' et complementDemandePar sur chacune, sous
// ifRevisionId (une demande modifiée entre-temps est ignorée, pas écrasée).
//
//   cd apps/studio && npx sanity exec scripts/reprise-complements.cjs --with-user-token
//   cd apps/studio && APPLIQUER=1 npx sanity exec scripts/reprise-complements.cjs --with-user-token
const { getCliClient } = require('sanity/cli');

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });

const AUTEUR = 'Reprise : traité dans Outlook';

const REQUETE = `*[
  _type == "demandeDevis"
  && statut == 1
  && (!defined(complementDemandeLe) || complementDemandeLe == "")
  && (!defined(complementDemandeHorsOutil) || complementDemandeHorsOutil == "")
  && (!defined(devisEnvoyeLe) || devisEnvoyeLe == "")
  && (!defined(devisEnvoyeHorsOutilLe) || devisEnvoyeHorsOutilLe == "")
  && !defined(montantHT)
]{_id, _rev, reference, clientNom} | order(reference asc)`;

async function main() {
  const cibles = await client.fetch(REQUETE);
  console.log(`${cibles.length} demande(s) ciblée(s) :`);
  for (const c of cibles) console.log(`- ${c.reference || c._id} (${c.clientNom || 'sans nom'})`);

  if (process.env.APPLIQUER !== '1') {
    console.log('\nAucune écriture (mode lecture). Relancez avec APPLIQUER=1 pour appliquer la reprise.');
    return;
  }

  let ecrites = 0;
  let ignorees = 0;
  for (const c of cibles) {
    try {
      await client
        .patch(c._id)
        .ifRevisionId(c._rev)
        .set({ complementDemandeHorsOutil: 'email', complementDemandePar: AUTEUR })
        .commit();
      ecrites += 1;
    } catch (e) {
      ignorees += 1;
      console.error(`Ignorée ${c.reference || c._id} : ${e.message}`);
    }
  }
  console.log(`\nReprise appliquée : ${ecrites} écrite(s), ${ignorees} ignorée(s).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
