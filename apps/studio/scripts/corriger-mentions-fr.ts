/**
 * Corrige pageLegale-mentions-fr en production.
 *
 * Ce document vient de la migration de l'ancien pageMentions-fr (script
 * migrer-pages-legales.ts, depuis supprimé — voir l'historique git, sa cible
 * pageMentions-fr n'existe plus) et n'a conservé que quatre sections, dont deux
 * sont fautives et une n'a pas d'équivalent dans la référence :
 *   - « Éditeur du site » a pour ancre editeur-du-site au lieu de editeur,
 *     ce qui désaligne ses ancres — des liens permanents — de celles de la
 *     version anglaise (pageLegale-mentions-en, ancre editeur) ;
 *   - « Immatriculation » a perdu le code NAF/APE 49.41B ;
 *   - « Direction » dit « Dirigeante : Marie Bagassien » au lieu de
 *     « Directrice de la publication : Marie Rioltha Bagassien » — le
 *     directeur de la publication est une mention obligatoire, et le
 *     prénom du registre est tronqué ;
 *   - « Contact » n'existe pas dans la référence et disparaît ici ;
 *   - trois sections obligatoires manquent entièrement : Hébergement
 *     (mention LCEN), Propriété intellectuelle, Données personnelles.
 *
 * Réplique exactement MENTIONS_FR (apps/web/src/content/legal/mentions.ts)
 * et l'entrée pageLegale-mentions-fr de seed-pages-legales.ts : six sections,
 * ancres editeur / immatriculation / direction / hebergement /
 * propriete-intellectuelle / donnees-personnelles — identiques à celles de
 * pageLegale-mentions-en.
 *
 * Idempotent : compare le contenu actuel (titre, ancre, texte de chaque
 * section) au contenu cible avant d'écrire. Si les deux sont déjà
 * identiques, aucune mutation n'est envoyée. Remplace le tableau `sections`
 * en bloc plutôt que section par section : la moitié des sections cible
 * n'existent pas encore dans le document, un patch par clé ne suffirait pas
 * à les créer.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-mentions-fr.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const ID = 'pageLegale-mentions-fr';

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal';
  children: { _type: 'span'; _key: string; text: string; marks: string[] }[];
  markDefs: never[];
};

const p = (texte: string): Bloc => ({
  _type: 'block',
  _key: cle('b'),
  style: 'normal',
  children: [{ _type: 'span', _key: cle('s'), text: texte, marks: [] }],
  markDefs: [],
});

const section = (titre: string, ancre: string, lignes: string[]) => ({
  _key: cle('sec'),
  titre,
  ancre: { _type: 'slug' as const, current: ancre },
  corps: lignes.map(p),
});

// Six sections cible — identiques à MENTIONS_FR (mentions.ts) et à l'entrée
// pageLegale-mentions-fr de seed-pages-legales.ts.
function sectionsCible() {
  return [
    section('Éditeur du site', 'editeur', [
      'HGWF CARGO, société par actions simplifiée.',
      'Siège social : avenue Faidherbe, 93110 Rosny-sous-Bois, France.',
      'Adresse logistique : 10 rue Diderot, 93110 Rosny-sous-Bois.',
      'Courriel : contact@hgwf-cargo.fr — Téléphone : +33 6 27 05 69 34.',
    ]),
    section('Immatriculation', 'immatriculation', [
      'Registre du commerce et des sociétés de Bobigny, sous le numéro 940 048 051.',
      'Numéro de TVA intracommunautaire : FR18940048051.',
      'Code d’activité : 49.41B — transport routier de fret.',
    ]),
    section('Direction de la publication', 'direction', [
      'Directrice de la publication : Marie Rioltha Bagassien, présidente.',
    ]),
    section('Hébergement', 'hebergement', [
      'Le site est hébergé par OVH SAS.',
      '2 rue Kellermann, 59100 Roubaix, France.',
      'Téléphone : +33 9 72 10 10 07.',
    ]),
    section('Propriété intellectuelle', 'propriete-intellectuelle', [
      'L’ensemble des contenus de ce site — textes, images, identité visuelle, logos — est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.',
    ]),
    section('Données personnelles', 'donnees-personnelles', [
      'Le traitement des données collectées sur ce site est décrit dans notre politique de confidentialité.',
    ]),
  ];
}

type SectionExistante = {
  titre?: string;
  ancre?: { current?: string };
  corps?: { children?: { text?: string }[] }[];
};

// Forme canonique (titre, ancre, texte concaténé de chaque bloc) pour comparer un état
// existant à l'état cible sans dépendre des _key, régénérées à chaque exécution du script.
type Canonique = { titre: string; ancre: string; textes: string[] }[];

function canoniser(sections: SectionExistante[]): Canonique {
  return sections.map((s) => ({
    titre: s.titre ?? '',
    ancre: s.ancre?.current ?? '',
    textes: (s.corps ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')),
  }));
}

async function main() {
  const doc = await client.fetch<{ _id: string; sections?: SectionExistante[] } | null>(
    `*[_id == $id][0]{ _id, sections[]{ titre, ancre, corps[]{ children[]{ text } } } }`,
    { id: ID },
  );

  if (!doc) {
    console.log(`  · ${ID} introuvable — pas encore seedé, rien à corriger ici.`);
    return;
  }

  const cible = sectionsCible();
  const actuel = canoniser(doc.sections ?? []);
  const attendu = canoniser(cible);

  if (JSON.stringify(actuel) === JSON.stringify(attendu)) {
    console.log(`  ✓ ${ID} — déjà correct, rien à faire.`);
    return;
  }

  await client.patch(ID).set({ sections: cible }).commit();
  console.log(`  ✓ ${ID} — sections remplacées par les six sections de référence.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
