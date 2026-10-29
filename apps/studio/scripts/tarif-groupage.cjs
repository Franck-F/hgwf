// Tarif groupage annoncé par Franck le 29/10/2026 : 400 € le mètre cube.
//
//   cd apps/studio && npx sanity exec scripts/tarif-groupage.cjs --with-user-token
//
// Remplace les quatre lignes par destination de la fiche « Groupage » par une
// ligne générale, tant qu'on ne sait pas si le tarif varie selon la
// destination. Refuse d'écrire si la fiche a été modifiée dans le Studio depuis
// sa création (pour ne jamais écraser une saisie de l'équipe).
const { getCliClient } = require('sanity/cli');

(async () => {
  const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });
  const f = await client.fetch('*[_id == "fiche-groupage"][0]{_rev, _createdAt, _updatedAt, grille, aCompleter}');
  if (!f) throw new Error('fiche-groupage introuvable');
  const modifieeDepuis = new Date(f._updatedAt) - new Date(f._createdAt) > 5000;
  if (modifieeDepuis && !process.env.FORCER) {
    console.log('Fiche déjà modifiée dans le Studio depuis sa création : rien écrit. Grille actuelle :');
    console.log(JSON.stringify(f.grille, null, 1));
    return;
  }
  const r = await client
    .patch('fiche-groupage')
    .ifRevisionId(f._rev)
    .set({
      grille: [
        {
          _key: 'g0',
          designation: 'Fret groupage maritime',
          unite: 'm³',
          prixHT: 400,
          note: 'tarif général annoncé le 29/10/2026 ; préciser s’il varie selon la destination',
        },
      ],
      aCompleter: [
        'Le tarif de 400 €/m³ varie-t-il selon la destination (Antilles, Haïti, Amériques, Afrique) ?',
        'Minimum facturable',
        'Règle poids / volume éventuelle',
        'Supplément palette',
        'Coût de l’enlèvement à domicile (zone, créneaux)',
        'Tarif de l’assurance ad valorem',
        'Emballage exigé',
      ],
    })
    .commit();
  console.log('fiche-groupage mise à jour, révision', r._rev);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
