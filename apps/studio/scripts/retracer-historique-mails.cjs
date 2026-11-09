const fs = require('node:fs');
const path = require('node:path');

function normaliseNom(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u2019\u2018`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extraireEmail(contact) {
  const text = String(contact ?? '');
  const match = text.match(/[^\s·|,;<>]+@[^\s·|,;<>]+\.[^\s·|,;<>]+/);
  return match ? match[0].trim().toLowerCase() : '';
}

function lireJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function trouverFicheClient(clients, demande) {
  const email = extraireEmail(demande.contact ?? demande.email);
  const nom = normaliseNom(demande.clientNom);
  if (email) {
    const exact = clients.find((client) => extraireEmail(client.contact) === email);
    if (exact) return exact;
  }
  if (nom) {
    const match = clients.find((client) => normaliseNom(client.nom) === nom);
    if (match) return match;
  }
  return null;
}

function construireResultat(demandes, clients) {
  return demandes.map((demande) => {
    const client = trouverFicheClient(clients, demande);
    const ref = String(demande.reference ?? '').trim();
    const nom = String(demande.clientNom ?? '').trim();
    const email = extraireEmail(demande.contact ?? demande.email);
    return {
      type: 'demandeDevis',
      reference: ref,
      clientNom: nom,
      email,
      rattacheVers: client
        ? {
            id: client._id,
            nom: client.nom,
            email: extraireEmail(client.contact),
            destination: client.destination ?? '',
          }
        : null,
      match: client ? (email && extraireEmail(client.contact) === email ? 'email' : 'nom') : 'aucun',
    };
  });
}

function main() {
  const root = path.resolve(__dirname, '../../../../reports');
  const files = fs
    .readdirSync(root)
    .filter((name) => /^sauvegarde.*\.json$/i.test(name))
    .sort();

  const allItems = [];
  for (const file of files) {
    const items = lireJson(path.join(root, file));
    allItems.push(...items);
  }

  const demandes = allItems.filter((item) => item && item._type === 'demandeDevis');
  const clients = allItems.filter((item) => item && item._type === 'clientFiche');

  const rattachements = construireResultat(demandes, clients);
  const resultat = {
    generatedAt: new Date().toISOString(),
    sourceFiles: files,
    counts: {
      demandes: demandes.length,
      clients: clients.length,
    },
    rattachements,
    aCreer: rattachements
      .filter((r) => !r.rattacheVers)
      .map((r) => ({
        reference: r.reference,
        clientNom: r.clientNom,
        email: r.email,
        raison: 'Aucune fiche client existante trouvée par e-mail ou nom normalisé.',
      })),
  };

  const outPath = path.join(root, 'rattachements-historique.json');
  fs.writeFileSync(outPath, JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify({ outPath, demandes: resultat.counts.demandes, clients: resultat.counts.clients, aCreer: resultat.aCreer.length }, null, 2));
}

main();
