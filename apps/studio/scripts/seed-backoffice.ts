/**
 * Seed des données de démonstration du back-office (maquette Back-office HGWF.dc.html).
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/seed-backoffice.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

// Les données du back-office vivent dans le dataset PRIVÉ « operations ».
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({
  dataset: process.env.SANITY_STUDIO_OPERATIONS_DATASET || 'operations',
});

function slug(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function main() {
  console.log(`Projet : ${client.config().projectId} / dataset : ${client.config().dataset}`);

  const demandes = [
    {
      reference: 'HGWF-2026-4815',
      clientNom: 'S. Lemoine',
      contact: 's.lemoine@mail.fr · 06 12 44 78 90',
      typeEnvoi: 'Déménagement',
      destination: 'Nouméa',
      volume: '18,40 m³',
      recueLe: '11/07/2026',
      statut: 0,
      message: 'Mutation en Outre-mer (fonctionnaire). Départ souhaité fin août, avec véhicule (Peugeot 2008).',
    },
    {
      reference: 'HGWF-2026-4809',
      clientNom: 'Ets Kaveri',
      contact: 'compta@kaveri.gp · 05 90 22 18 30',
      typeEnvoi: 'Conteneur complet (FCL)',
      destination: 'Pointe-à-Pitre',
      volume: "40' dry",
      recueLe: '11/07/2026',
      statut: 0,
      message: 'Réassort trimestriel matériel BTP. Besoin des prochaines dates de clôture au Havre.',
    },
    {
      reference: 'HGWF-2026-4801',
      clientNom: 'M. Tuilagi',
      contact: 'm.tuilagi@mail.com · 07 88 12 03 55',
      typeEnvoi: 'Groupage (LCL)',
      destination: 'Mata-Utu',
      volume: '6,20 m³',
      recueLe: '10/07/2026',
      statut: 1,
      message: 'Effets personnels + électroménager. Retrait à domicile demandé (Orléans).',
    },
    {
      reference: 'HGWF-2026-4796',
      clientNom: 'A. Boisrond',
      contact: 'a.boisrond@mail.fr · 06 51 32 87 14',
      typeEnvoi: 'Véhicule / bateau',
      destination: 'Port-au-Prince',
      volume: '1 véhicule',
      recueLe: '09/07/2026',
      statut: 1,
      message: "Expédition d'un pick-up non roulant. Question sur les formalités douanières.",
    },
    {
      reference: 'HGWF-2026-4790',
      clientNom: 'Fare Nui Sarl',
      contact: 'contact@farenui.pf · 40 50 22 11',
      typeEnvoi: "Conteneur d'occasion",
      destination: 'Papeete',
      volume: '20 pieds',
      recueLe: '08/07/2026',
      statut: 2,
      message: "Achat d'un conteneur dernier voyage pour paillotte de plage, livraison presqu'île.",
    },
    {
      reference: 'HGWF-2026-4782',
      clientNom: 'C. Ozier-Lafontaine',
      contact: 'c.ozier@mail.fr · 06 44 09 71 23',
      typeEnvoi: 'Groupage (LCL)',
      destination: 'Fort-de-France',
      volume: '3,10 m³',
      recueLe: '07/07/2026',
      statut: 3,
      message: 'Cartons personnels, départ retraite. Devis accepté — en attente de dépôt à Rosny.',
    },
  ];

  for (const d of demandes) {
    await client.createOrReplace({ _id: `demandeDevis-${slug(d.reference)}`, _type: 'demandeDevis', ...d });
  }
  console.log(`  ✓ ${demandes.length} demandes de devis`);

  const expeditions = [
    { reference: 'MSKU 907 214 3', clientNom: 'C. Ozier-Lafontaine', trajet: 'Le Havre → Fort-de-France', etape: 2, eta: '28/07' },
    { reference: 'HGWF-2026-4720', clientNom: 'Ets Kaveri', trajet: 'Le Havre → Pointe-à-Pitre', etape: 3, eta: '14/07' },
    { reference: 'TCLU 442 780 1', clientNom: 'M. Tuilagi', trajet: 'Le Havre → Mata-Utu', etape: 1, eta: '12/09' },
    { reference: 'HGWF-2026-4688', clientNom: 'Fare Nui Sarl', trajet: 'Fos/Marseille → Papeete', etape: 2, eta: '21/08' },
    { reference: 'HGWF-2026-4655', clientNom: 'S. Lemoine', trajet: 'Le Havre → Nouméa', etape: 4, eta: 'LIVRÉ' },
  ];
  for (const x of expeditions) {
    await client.createOrReplace({ _id: `expedition-${slug(x.reference)}`, _type: 'expedition', ...x });
  }
  console.log(`  ✓ ${expeditions.length} expéditions`);

  const clients = [
    { nom: 'S. Lemoine', contact: 's.lemoine@mail.fr · 06 12 44 78 90', destination: 'Nouméa', envois: 3, volume: '42,1 m³' },
    { nom: 'Ets Kaveri', contact: 'compta@kaveri.gp · 05 90 22 18 30', destination: 'Pointe-à-Pitre', envois: 11, volume: '9 FCL' },
    { nom: 'M. Tuilagi', contact: 'm.tuilagi@mail.com · 07 88 12 03 55', destination: 'Mata-Utu', envois: 2, volume: '11,4 m³' },
    { nom: 'Fare Nui Sarl', contact: 'contact@farenui.pf · 40 50 22 11', destination: 'Papeete', envois: 5, volume: '3 conteneurs' },
    { nom: 'A. Boisrond', contact: 'a.boisrond@mail.fr · 06 51 32 87 14', destination: 'Port-au-Prince', envois: 1, volume: '1 véhicule' },
    { nom: 'C. Ozier-Lafontaine', contact: 'c.ozier@mail.fr · 06 44 09 71 23', destination: 'Fort-de-France', envois: 4, volume: '12,6 m³' },
  ];
  for (const c of clients) {
    await client.createOrReplace({ _id: `clientFiche-${slug(c.nom)}`, _type: 'clientFiche', ...c });
  }
  console.log(`  ✓ ${clients.length} fiches clients`);

  const conteneurs = [
    { reference: 'CTN-20-118', taille: '20 pieds', etat: 'A', lieu: 'Dépôt Rosny-sous-Bois', prix: '1 450 €', statut: 0 },
    { reference: 'CTN-20-121', taille: '20 pieds', etat: 'B', lieu: 'Dépôt Rosny-sous-Bois', prix: '1 150 €', statut: 0 },
    { reference: 'CTN-40-064', taille: '40 pieds', etat: 'A', lieu: 'Terminal Le Havre', prix: '2 350 €', statut: 1 },
    { reference: 'CTN-40-071', taille: '40 pieds HC', etat: 'A', lieu: 'Terminal Le Havre', prix: '2 690 €', statut: 0 },
    { reference: 'CTN-20-097', taille: '20 pieds', etat: 'B', lieu: 'Fos/Marseille', prix: '1 090 €', statut: 2 },
    { reference: 'CTN-40-052', taille: '40 pieds', etat: 'C', lieu: 'Dépôt Rosny-sous-Bois', prix: '1 780 €', statut: 0 },
  ];
  for (const k of conteneurs) {
    await client.createOrReplace({ _id: `conteneurOccasion-${slug(k.reference)}`, _type: 'conteneurOccasion', ...k });
  }
  console.log(`  ✓ ${conteneurs.length} conteneurs`);

  const rotations = [
    { nom: 'Le Havre → Pointe-à-Pitre / Fort-de-France', cloture: '15/07', depart: '17/07', remplissage: 82 },
    { nom: 'Fos/Marseille → Papeete', cloture: '22/07', depart: '26/07', remplissage: 54 },
    { nom: 'Le Havre → Nouméa · Mata-Utu', cloture: '29/07', depart: '02/08', remplissage: 37 },
  ];
  for (const [i, r] of rotations.entries()) {
    await client.createOrReplace({ _id: `rotation-${i + 1}`, _type: 'rotation', ...r });
  }
  console.log(`  ✓ ${rotations.length} rotations`);

  await client.createOrReplace({
    _id: 'statsMensuelles',
    _type: 'statsMensuelles',
    volumeMoisEnCours: '142 m³',
    progression: '+18 % vs juin',
    barres: [
      { _key: 'fev', mois: 'FÉV', valeur: 74 },
      { _key: 'mar', mois: 'MAR', valeur: 96 },
      { _key: 'avr', mois: 'AVR', valeur: 88 },
      { _key: 'mai', mois: 'MAI', valeur: 105 },
      { _key: 'juin', mois: 'JUIN', valeur: 120 },
      { _key: 'juil', mois: 'JUIL', valeur: 142 },
    ],
  });
  console.log('  ✓ statistiques mensuelles');

  console.log('Seed back-office terminé.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
