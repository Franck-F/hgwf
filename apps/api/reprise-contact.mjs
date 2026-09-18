// Reprise des demandes antérieures au 18/09/2026 : découpe la chaîne libre
// « mail · tél (préférence : X) » en trois champs distincts.
// Purement additif : aucun champ existant n'est modifié ni supprimé.
// Usage : node reprise-contact.mjs [--ecrire]
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';

const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
for (const ligne of env.split('\n')) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
}

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'operations',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const ecrire = process.argv.includes('--ecrire');

const docs = await sanity.fetch(
  `*[_type in ["demandeDevis", "expedition"] && defined(contact) && !defined(email)]{_id, _type, reference, contact}`,
);

for (const d of docs) {
  const contact = d.contact ?? '';
  const email = contact.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const tel = contact.match(/(?:\+?\d[\d ().-]{7,})/)?.[0]?.replace(/[^\d+]/g, '') ?? null;
  const pref = contact.match(/préférence\s*:\s*([^)]+)\)/)?.[1]?.trim() ?? null;

  const patch = {};
  if (email) patch.email = email;
  if (tel) patch.telephone = tel;
  if (pref && d._type === 'demandeDevis') patch.preferenceContact = pref;

  console.log(`${d._type} ${d.reference} → ${JSON.stringify(patch)}`);
  if (ecrire && Object.keys(patch).length) {
    await sanity.patch(d._id).set(patch).commit();
  }
}

console.log(ecrire ? `\n${docs.length} document(s) repris.` : `\n${docs.length} document(s) concerné(s). Relancer avec --ecrire.`);
