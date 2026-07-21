/**
 * Corrige, dans les documents de production pageLegale-confidentialite-fr et
 * pageLegale-confidentialite-en, le style des quatre sous-titres de la section
 * « Données collectées et finalités » (« Demande de devis », « Formulaire de
 * contact », « Suivi d'expédition », « Sécurité du service », et leurs
 * équivalents anglais).
 *
 * Défaut corrigé : seed-pages-legales.ts ne savait produire que des blocs de
 * style 'normal' au moment où ces deux documents ont été créés. Ces quatre
 * sous-titres ont donc été enregistrés comme de simples paragraphes au lieu de
 * blocs 'h3' — la hiérarchie sémantique (navigation par titres) et la mise en
 * forme visuelle du sous-titre sont perdues sur le site, qui lit Sanity en
 * priorité. seed-pages-legales.ts sait maintenant produire ces blocs h3 (voir
 * titre3() dans ce fichier), mais createIfNotExists ne réécrit jamais un
 * document déjà présent : les deux documents de production doivent donc être
 * corrigés séparément, ici.
 *
 * Repère les blocs à corriger par leur texte exact (comparé au texte concaténé
 * de leurs enfants), pas par leur position dans le tableau — un ajout ou un
 * retrait de paragraphe dans le Studio ne doit pas faire corriger le mauvais
 * bloc.
 *
 * Idempotent : un bloc déjà en style 'h3' n'est pas repatché. Si tous les
 * sous-titres d'un document sont déjà corrects, le document n'est pas écrit
 * du tout (aucune mutation vide envoyée). Rejouer ce script sur des documents
 * déjà corrigés ne fait donc rien.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-titres-confidentialite.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });

const SOUS_TITRES: Record<string, string[]> = {
  'pageLegale-confidentialite-fr': [
    'Demande de devis',
    'Formulaire de contact',
    'Suivi d’expédition',
    'Sécurité du service',
  ],
  'pageLegale-confidentialite-en': ['Quote request', 'Contact form', 'Shipment tracking', 'Service security'],
};

type Span = { text?: string };
type Bloc = { _key: string; style?: string; children?: Span[] };
type Section = { _key: string; corps?: Bloc[] };
type Document = { _id: string; sections?: Section[] };

async function main() {
  for (const [id, sousTitres] of Object.entries(SOUS_TITRES)) {
    const doc = await client.fetch<Document | null>(
      `*[_id == $id][0]{ _id, sections[]{ _key, corps[]{ _key, style, children[]{ text } } } }`,
      { id },
    );

    if (!doc) {
      console.log(`  · ${id} introuvable — pas encore seedé, rien à corriger ici.`);
      continue;
    }

    // Chemins de patch par clé (sections[_key=="..."].corps[_key=="..."].style), pour ne
    // toucher que les blocs identifiés, sans dépendre de leur position dans le tableau.
    const champs: Record<string, string> = {};
    for (const section of doc.sections ?? []) {
      for (const bloc of section.corps ?? []) {
        const texte = (bloc.children ?? []).map((s) => s.text ?? '').join('');
        if (sousTitres.includes(texte) && bloc.style !== 'h3') {
          champs[`sections[_key=="${section._key}"].corps[_key=="${bloc._key}"].style`] = 'h3';
        }
      }
    }

    const nbCorrections = Object.keys(champs).length;
    if (nbCorrections === 0) {
      console.log(`  ✓ ${id} — déjà correct, rien à faire.`);
      continue;
    }

    await client.patch(id).set(champs).commit();
    console.log(`  ✓ ${id} — ${nbCorrections} sous-titre(s) remis en style h3.`);
  }
  console.log('Correction des sous-titres de confidentialité terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
