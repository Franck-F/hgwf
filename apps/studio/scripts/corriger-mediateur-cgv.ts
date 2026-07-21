/**
 * Corrige, dans le document de production pageLegale-cgv-fr, le paragraphe de
 * la section « Clients particuliers » qui affirmait : « Les coordonnées du
 * médiateur figurent dans nos mentions légales. » — c'est faux : aucune
 * section médiateur n'existe dans les mentions légales, ni dans le code ni
 * dans le CMS. Ce sont des coordonnées que le client doit encore fournir.
 *
 * Remplace ce paragraphe par le texte corrigé de CGV_FR
 * (apps/web/src/content/legal/cgv.ts, section consommateurs) : le recours au
 * médiateur reste ouvert, ses coordonnées sont communiquées sur demande, avec
 * un lien mailto vers contact@hgwf-cargo.fr pour formuler cette demande — rien
 * n'est promis qui ne soit pas disponible.
 *
 * Repère le bloc à corriger par son texte exact (comparé au texte concaténé
 * de ses enfants), pas par sa position dans le tableau — comme
 * corriger-titres-confidentialite.ts.
 *
 * Idempotent : si le paragraphe corrigé est déjà en place (même lien
 * mailto), aucune mutation n'est envoyée. Si l'ancien texte fautif n'est pas
 * trouvé (section restructurée, ou document pas encore seedé), le script
 * s'arrête sans écrire, plutôt que de corriger silencieusement le mauvais
 * bloc.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-mediateur-cgv.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const ID = 'pageLegale-cgv-fr';

const ANCIEN_TEXTE =
  'En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation, après nous avoir adressé une réclamation écrite. Les coordonnées du médiateur figurent dans nos mentions légales.';

const MAILTO = 'mailto:contact@hgwf-cargo.fr';
const NOUVEAU_TEXTE_PARTIE_1 =
  'En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation, après nous avoir adressé une réclamation écrite. Les coordonnées du médiateur retenu vous seront communiquées sur demande, à ';
const NOUVEAU_TEXTE_LIEN = 'contact@hgwf-cargo.fr';
const NOUVEAU_TEXTE_PARTIE_2 = '.';
const NOUVEAU_TEXTE_COMPLET = NOUVEAU_TEXTE_PARTIE_1 + NOUVEAU_TEXTE_LIEN + NOUVEAU_TEXTE_PARTIE_2;

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

type Span = { _type: 'span'; _key: string; text?: string; marks: string[] };
type MarkDef = { _type: 'link'; _key: string; href: string };
type Bloc = { _key: string; style?: string; children?: Span[]; markDefs?: MarkDef[] };
type Section = { _key: string; ancre?: { current?: string }; corps?: Bloc[] };
type Document = { _id: string; sections?: Section[] };

async function main() {
  const doc = await client.fetch<Document | null>(
    `*[_id == $id][0]{ _id, sections[]{ _key, ancre, corps[]{ _key, style, children[]{ text }, markDefs } } }`,
    { id: ID },
  );

  if (!doc) {
    console.log(`  · ${ID} introuvable — pas encore seedé, rien à corriger ici.`);
    return;
  }

  for (const section of doc.sections ?? []) {
    for (const bloc of section.corps ?? []) {
      const texte = (bloc.children ?? []).map((s) => s.text ?? '').join('');

      if (texte === NOUVEAU_TEXTE_COMPLET) {
        console.log(`  ✓ ${ID} — déjà correct, rien à faire.`);
        return;
      }

      if (texte === ANCIEN_TEXTE) {
        const cleLien = cle('m');
        const nouveauBloc: Bloc = {
          _key: bloc._key,
          style: bloc.style ?? 'normal',
          markDefs: [{ _type: 'link', _key: cleLien, href: MAILTO }],
          children: [
            { _type: 'span', _key: cle('s'), text: NOUVEAU_TEXTE_PARTIE_1, marks: [] },
            { _type: 'span', _key: cle('s'), text: NOUVEAU_TEXTE_LIEN, marks: [cleLien] },
            { _type: 'span', _key: cle('s'), text: NOUVEAU_TEXTE_PARTIE_2, marks: [] },
          ],
        };

        await client
          .patch(ID)
          .set({ [`sections[_key=="${section._key}"].corps[_key=="${bloc._key}"]`]: nouveauBloc })
          .commit();
        console.log(`  ✓ ${ID} — paragraphe du médiateur corrigé (lien mailto ajouté).`);
        return;
      }
    }
  }

  console.error(
    `\n${ID} : paragraphe fautif introuvable (texte attendu non trouvé, et texte corrigé absent). ` +
      `Section « Clients particuliers » probablement restructurée — correction interrompue sans écriture, ` +
      `pour ne jamais patcher le mauvais bloc.`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
