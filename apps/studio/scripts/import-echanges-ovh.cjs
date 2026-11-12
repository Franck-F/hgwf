// Import des e-mails clients reçus sur contact@ (webmail OVH) dans les dossiers du back-office.
//
// Entrée : FICHIER = export JSON produit depuis le webmail (un objet par message :
// uid, reference, de, a, objet, date, texte, pieces[{nom, type, b64}], sansDossier).
// Les messages sans dossier sont rattachés aux nouveaux dossiers déclarés dans NOUVEAUX
// (demandes arrivées directement par e-mail), créés au passage.
//
// Par défaut : simulation (affiche ce qui serait fait). APPLIQUER=1 : écrit.
//   cd apps/studio && FICHIER=<export.json> [APPLIQUER=1] npx sanity exec scripts/import-echanges-ovh.cjs --with-user-token
// Rejouable : identifiants dérivés de l'uid du message (echange-ovh-<uid>, demande-ovh-<uid>).
const { getCliClient } = require('sanity/cli');
const fs = require('node:fs');

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: 'operations', useCdn: false });
const APPLIQUER = process.env.APPLIQUER === '1';
const NOUVEAUX = JSON.parse(fs.readFileSync(process.env.NOUVEAUX, 'utf8'));
// Messages encore non lus dans le webmail : ils restent « non lus » dans le dossier.
const NON_LUS = new Set((process.env.NON_LUS || '').split(',').filter(Boolean).map(Number));

const adresseDe = (t) => {
  const s = String(t || '');
  return (s.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] || s.match(/[^\s<>",;]+@[^\s<>",;]+/)?.[0] || '').toLowerCase();
};
const deux = (n) => String(n).padStart(2, '0');
// Format des dates du back-office : « JJ/MM/AAAA à HHhMM », heure de Paris.
const horodatage = (d) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} à ${p.hour}h${p.minute}`;
};

async function main() {
  const messages = JSON.parse(fs.readFileSync(process.env.FICHIER, 'utf8'));
  const demandes = await client.fetch('*[_type == "demandeDevis"]{_id, reference, email, clientNom}');
  const parRef = new Map(demandes.map((d) => [d.reference, d]));

  // 1. Nouveaux dossiers (demandes reçues directement par e-mail).
  const refsDev = demandes.map((d) => d.reference).filter((r) => /^DEV-\d{4}-\d{3,}$/.test(r || ''));
  for (const n of NOUVEAUX) {
    const premier = messages.find((m) => m.uid === n.uids[0]);
    const recue = new Date(premier.date);
    const _id = `demande-ovh-${n.uids[0]}`;
    const existant = await client.getDocument(_id);
    let reference = existant?.reference;
    if (!reference) {
      const prefixe = `DEV-${deux(recue.getFullYear() % 100)}${deux(recue.getMonth() + 1)}-`;
      const max = refsDev.filter((r) => r.startsWith(prefixe)).reduce((m, r) => Math.max(m, Number(r.slice(prefixe.length))), 0);
      reference = `${prefixe}${String(max + 1).padStart(3, '0')}`;
      refsDev.push(reference);
    }
    const doc = {
      _id,
      _type: 'demandeDevis',
      reference,
      clientNom: n.clientNom,
      email: n.email,
      ...(n.telephone ? { telephone: n.telephone } : {}),
      contact: [n.email, n.telephone].filter(Boolean).join(' · '),
      typeEnvoi: n.typeEnvoi,
      destination: n.destination,
      ...(n.volume ? { volume: n.volume } : {}),
      message: n.message,
      statut: 1,
      recueLe: horodatage(recue),
      sourceDemande: 'email',
    };
    console.log(`${existant ? 'existe déjà' : 'à créer'} : ${reference} ${n.clientNom} (${n.typeEnvoi} → ${n.destination}), ${n.uids.length} message(s)`);
    if (APPLIQUER && !existant) await client.createIfNotExists(doc);
    const d = { _id, reference, email: n.email, clientNom: n.clientNom };
    parRef.set(reference, d);
    for (const uid of n.uids) {
      const m = messages.find((x) => x.uid === uid);
      if (m) m.reference = reference;
    }
  }

  // 2. Échanges.
  let nb = 0;
  let pieces = 0;
  for (const m of messages.sort((a, b) => new Date(a.date) - new Date(b.date))) {
    const d = parRef.get(m.reference);
    if (!d) {
      console.log(`  ignoré uid ${m.uid} : aucun dossier (${m.reference || 'sans référence'})`);
      continue;
    }
    const _id = `echange-ovh-${m.uid}`;
    const de = adresseDe(m.de);
    const verifie = Boolean(de) && de === String(d.email || '').trim().toLowerCase();
    const recuLe = new Date(m.date);
    const lu = !NON_LUS.has(m.uid);
    console.log(
      `  ${d.reference.padEnd(15)} ${recuLe.toISOString().slice(0, 16)} ${verifie ? 'vérifié ' : 'À VÉRIFIER'} ${lu ? 'lu    ' : 'NON LU'} ${m.pieces.length} pj  ${String(m.objet).slice(0, 60)}`,
    );
    nb += 1;
    pieces += m.pieces.length;
    if (!APPLIQUER) continue;
    if (await client.getDocument(_id)) continue;
    const piecesSanity = [];
    for (const [i, p] of m.pieces.entries()) {
      const contenu = Buffer.from(p.b64, 'base64');
      const asset = await client.assets.upload('file', contenu, { filename: p.nom, contentType: p.type });
      piecesSanity.push({
        _key: `p${i}`,
        nom: p.nom,
        typeMime: p.type,
        taille: contenu.length,
        fichier: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
      });
    }
    await client.createIfNotExists({
      _id,
      _type: 'echange',
      reference: d.reference,
      demande: { _type: 'reference', _weak: true, _ref: d._id },
      sens: 'recu',
      de: m.de,
      a: m.a,
      objet: m.objet,
      texte: m.texte,
      recuLe: recuLe.toISOString(),
      pieces: piecesSanity,
      lu,
      expediteurVerifie: verifie,
      ...(verifie
        ? {}
        : { motifNonVerifie: `importé depuis la boîte contact@ et rattaché par le nom du client : l’adresse ${de} n’est pas celle de la demande` }),
    });
  }
  console.log(`\n${APPLIQUER ? 'Écrit' : 'Simulation'} : ${NOUVEAUX.length} dossier(s), ${nb} échange(s), ${pieces} pièce(s) jointe(s).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
