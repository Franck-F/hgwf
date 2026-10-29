// Tarif groupage annoncé par Franck le 29/10/2026 : 400 € le mètre cube,
// identique pour toutes les destinations (confirmé le même jour).
//
//   cd apps/studio && npx sanity exec scripts/tarif-groupage.cjs --with-user-token
//
// Écrit la grille et la liste « reste à compléter » de la fiche Groupage.
// Refuse d'écrire si la fiche a été modifiée depuis la dernière révision connue
// (REVISION_CONNUE), pour ne jamais écraser une saisie de l'équipe.
const { getCliClient } = require('sanity/cli');

const REVISION_CONNUE = process.env.REVISION_CONNUE || 'T95ALXVUV2f7U3Re2epFkk';

(async () => {
  const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });
  const f = await client.fetch('*[_id == "fiche-groupage"][0]{_rev}');
  if (!f) throw new Error('fiche-groupage introuvable');
  if (f._rev !== REVISION_CONNUE) {
    console.log(`Fiche modifiée depuis la révision ${REVISION_CONNUE} (actuelle : ${f._rev}) : rien écrit.`);
    return;
  }
  const r = await client
    .patch('fiche-groupage')
    .ifRevisionId(f._rev)
    .set({
      grille: [
        {
          _key: 'g0',
          designation: 'Fret groupage maritime — toutes destinations',
          unite: 'm³',
          prixHT: 400,
          note: 'tarif unique quelle que soit la destination (confirmé le 29/10/2026)',
        },
      ],
      aCompleter: [
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
