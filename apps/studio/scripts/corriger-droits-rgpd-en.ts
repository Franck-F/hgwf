/**
 * Corrige, dans le document de production pageLegale-confidentialite-en,
 * section « Your rights », la terminologie de deux des six droits RGPD :
 * « right of rectification » et « right of erasure » ne sont pas les termes
 * officiels du RGPD, qui sont « right to rectification » et
 * « right to erasure » (voir apps/web/src/content/legal/confidentialite.en.ts).
 *
 * Repère les blocs à corriger par leur texte actuel (comparé au texte
 * concaténé de leurs enfants), pas par leur position dans le tableau — comme
 * corriger-titres-confidentialite.ts. Ne touche que le premier segment de
 * texte de chaque bloc, sans reconstruire le bloc entier, pour préserver les
 * autres champs (listItem, level) inchangés.
 *
 * Idempotent : si un bloc commence déjà par « right to rectification » ou
 * « right to erasure », il n'est pas repatché. Si tous les droits concernés
 * sont déjà corrects, le document n'est pas écrit du tout.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-droits-rgpd-en.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const ID = 'pageLegale-confidentialite-en';

const REMPLACEMENTS: { ancien: string; nouveau: string }[] = [
  { ancien: 'right of rectification', nouveau: 'right to rectification' },
  { ancien: 'right of erasure', nouveau: 'right to erasure' },
];

type Span = { _key: string; text?: string };
type Bloc = { _key: string; children?: Span[] };
type Section = { _key: string; corps?: Bloc[] };
type Document = { _id: string; sections?: Section[] };

async function main() {
  const doc = await client.fetch<Document | null>(
    `*[_id == $id][0]{ _id, sections[]{ _key, corps[]{ _key, children[]{ _key, text } } } }`,
    { id: ID },
  );

  if (!doc) {
    console.log(`  · ${ID} introuvable — pas encore seedé, rien à corriger ici.`);
    return;
  }

  // Chemins de patch par clé (sections[_key=="..."].corps[_key=="..."].children[_key=="..."].text),
  // pour ne toucher que le span identifié, sans dépendre de sa position.
  const champs: Record<string, string> = {};
  for (const section of doc.sections ?? []) {
    for (const bloc of section.corps ?? []) {
      for (const span of bloc.children ?? []) {
        const texte = span.text ?? '';
        const remplacement = REMPLACEMENTS.find((r) => texte.startsWith(r.ancien));
        if (remplacement) {
          const nouveauTexte = remplacement.nouveau + texte.slice(remplacement.ancien.length);
          champs[`sections[_key=="${section._key}"].corps[_key=="${bloc._key}"].children[_key=="${span._key}"].text`] =
            nouveauTexte;
        }
      }
    }
  }

  const nbCorrections = Object.keys(champs).length;
  if (nbCorrections === 0) {
    console.log(`  ✓ ${ID} — déjà correct, rien à faire.`);
    return;
  }

  await client.patch(ID).set(champs).commit();
  console.log(`  ✓ ${ID} — ${nbCorrections} droit(s) corrigé(s) (« right of » → « right to »).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
