/**
 * Corrige, dans les documents de production pageLegale-confidentialite-fr et
 * pageLegale-confidentialite-en, la section « transferts » de la politique de
 * confidentialité : elle affirmait un hébergement des données aux États-Unis.
 *
 * Défaut corrigé : vérification faite auprès de l'API Sanity (en-tête
 * X-Sanity-Shard: gcp-eu-w1-… sur les deux datasets, stable sur plusieurs
 * requêtes), les données du projet b5xsqdjy sont hébergées sur Google Cloud
 * europe-west1 (Belgique), dans l'Union européenne. La politique publiée
 * disait l'inverse de la réalité. Le titre et le corps de la section sont
 * remplacés ; l'ancre « transferts » ne change pas (lien permanent).
 *
 * Repère la section par son ancre (`ancre.current == "transferts"`), pas par
 * sa position. Idempotent : si le premier paragraphe contient déjà
 * « Belgique »/« Belgium », le document n'est pas réécrit.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-hebergement-ue.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

// Même fabrique de blocs que seed-pages-legales.ts (forme de référence :
// apps/web/src/components/legal/portable.ts).
type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type MarkDef = { _type: 'link'; _key: string; href: string };
type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal';
  children: Span[];
  markDefs: MarkDef[];
};
type Lien = { texte: string; href: string };

const lien = (texte: string, href: string): Lien => ({ texte, href });

function p(...parts: (string | Lien)[]): Bloc {
  const markDefs: MarkDef[] = [];
  const children = parts.map((part) => {
    if (typeof part === 'string') return { _type: 'span' as const, _key: cle('s'), text: part, marks: [] };
    const def: MarkDef = { _type: 'link', _key: cle('m'), href: part.href };
    markDefs.push(def);
    return { _type: 'span' as const, _key: cle('s'), text: part.texte, marks: [def._key] };
  });
  return { _type: 'block', _key: cle('b'), style: 'normal', children, markDefs };
}

// Textes recopiés mot pour mot depuis apps/web/src/content/legal/confidentialite{,.en}.ts.
const CORRECTIONS: Record<string, { titre: string; corps: Bloc[] }> = {
  'pageLegale-confidentialite-fr': {
    titre: 'Hébergement et transferts de données',
    corps: [
      p(
        'Les demandes que vous nous adressez sont enregistrées dans notre outil de gestion de contenu Sanity. Les serveurs qui hébergent nos données sont situés dans l’Union européenne (Belgique).',
      ),
      p(
        'Sanity est une société américaine : si un accès à des données depuis un pays tiers s’avérait nécessaire — par exemple pour une opération d’assistance technique —, il serait encadré par les garanties prévues au chapitre V du RGPD, décrites dans l’accord de sous-traitance conclu avec ce prestataire. Vous pouvez en obtenir communication en nous écrivant à ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ],
  },
  'pageLegale-confidentialite-en': {
    titre: 'Data hosting and transfers',
    corps: [
      p(
        'The requests you send us are recorded in our content management tool, Sanity. The servers hosting our data are located in the European Union (Belgium).',
      ),
      p(
        'Sanity is a US company: should access to data from a third country ever prove necessary — for instance during a technical support operation — it would be governed by the safeguards set out in Chapter V of the GDPR, described in the data processing agreement concluded with this provider. You can request a copy of these safeguards by writing to ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ],
  },
};

type SectionDoc = { _key: string; ancre?: { current?: string }; corps?: { children?: { text?: string }[] }[] };

async function main() {
  for (const [id, correction] of Object.entries(CORRECTIONS)) {
    const doc = await client.fetch<{ _id: string; sections?: SectionDoc[] } | null>(
      `*[_id == $id][0]{ _id, sections[]{ _key, ancre, corps[]{ children[]{ text } } } }`,
      { id },
    );

    if (!doc) {
      console.log(`  · ${id} introuvable — pas encore seedé, rien à corriger ici.`);
      continue;
    }

    const section = (doc.sections ?? []).find((s) => s.ancre?.current === 'transferts');
    if (!section) {
      console.error(`  ✗ ${id} — aucune section d'ancre « transferts ». Arrêt : le document a une forme inattendue.`);
      process.exit(1);
    }

    const premierTexte = (section.corps?.[0]?.children ?? []).map((s) => s.text ?? '').join('');
    if (premierTexte.includes('Belgique') || premierTexte.includes('Belgium')) {
      console.log(`  ✓ ${id} — déjà correct, rien à faire.`);
      continue;
    }

    await client
      .patch(id)
      .set({
        [`sections[_key=="${section._key}"].titre`]: correction.titre,
        [`sections[_key=="${section._key}"].corps`]: correction.corps,
      })
      .commit();
    console.log(`  ✓ ${id} — section « transferts » corrigée (hébergement UE).`);
  }
  console.log('Correction de l’hébergement terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
