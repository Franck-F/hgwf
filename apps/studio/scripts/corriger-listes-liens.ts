/**
 * Corrige, dans les documents de production pageLegale-confidentialite-fr,
 * pageLegale-confidentialite-en et pageLegale-cgv-fr, l'absence de listes et
 * de liens : seed-pages-legales.ts aplatissait tout en paragraphes au moment
 * où ces documents ont été créés. Sur les pages réellement servies (Sanity
 * gagne en bloc dès qu'un document a au moins une section exploitable — voir
 * apps/web/src/content/legal/fusion.ts), les six droits RGPD s'affichent donc
 * en un pavé de texte sans puces, et il n'existe ni lien mailto pour exercer
 * ses droits, ni lien vers cnil.fr — précisément ce qui rend une politique de
 * confidentialité utilisable.
 *
 * Remplace chaque document par le contenu produit par la fabrique de blocs
 * enrichie de seed-pages-legales.ts (listItem + level pour les listes,
 * markDefs pour les liens), dupliquée ici pour rester un script autonome
 * comme le reste de scripts/. Reproduit fidèlement
 * apps/web/src/content/legal/{confidentialite,cgv,confidentialite.en}.ts.
 *
 * Idempotent : compare le contenu actuel (style, puce/numérotation, texte et
 * liens de chaque bloc) au contenu cible avant d'écrire. Si les deux sont
 * déjà identiques, aucune mutation n'est envoyée. Remplace le tableau
 * `sections` en bloc, comme corriger-mentions-fr.ts : les listes et les liens
 * ne se patchent pas champ par champ, ce sont des blocs entiers qui changent
 * de forme (paragraphe → liste, texte → texte+lien).
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-listes-liens.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

// Même fabrique que seed-pages-legales.ts / apps/web/src/components/legal/portable.ts.
type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type MarkDef = { _type: 'link'; _key: string; href: string };
type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h3';
  listItem?: 'bullet' | 'number';
  level?: number;
  children: Span[];
  markDefs: MarkDef[];
};
type Lien = { texte: string; href: string };

function lien(texte: string, href: string): Lien {
  return { texte, href };
}

function bloc(style: Bloc['style'], parts: (string | Lien)[], listItem?: Bloc['listItem']): Bloc {
  const markDefs: MarkDef[] = [];
  const children = parts.map((part) => {
    if (typeof part === 'string') return { _type: 'span' as const, _key: cle('s'), text: part, marks: [] };
    const def: MarkDef = { _type: 'link', _key: cle('m'), href: part.href };
    markDefs.push(def);
    return { _type: 'span' as const, _key: cle('s'), text: part.texte, marks: [def._key] };
  });
  return {
    _type: 'block',
    _key: cle('b'),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    children,
    markDefs,
  };
}

const p = (...parts: (string | Lien)[]): Bloc => bloc('normal', parts);
const titre3 = (texte: string): Bloc => bloc('h3', [texte]);
const liste = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'bullet'));
const listeNum = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'number'));

const section = (titre: string, ancre: string, corps: Bloc[]) => ({
  _key: cle('sec'),
  titre,
  ancre: { _type: 'slug' as const, current: ancre },
  corps,
});

// ── Contenu cible ────────────────────────────────────────────────────────────────

function sectionsConfidentialiteFr() {
  return [
    section('Responsable du traitement', 'responsable', [
      p(
        'HGWF CARGO, société par actions simplifiée, siège avenue Faidherbe, 93110 Rosny-sous-Bois, immatriculée au RCS de Bobigny sous le numéro 940 048 051.',
      ),
      p(
        'Pour toute question relative à vos données : ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ]),
    section('Données collectées et finalités', 'finalites', [
      p('Nous ne collectons que les données que vous nous transmettez volontairement.'),
      titre3('Demande de devis'),
      p(
        'Nom, courriel, téléphone, destination, port de départ, dimensions et nombre de colis, message libre. Ces données servent à établir votre devis et à vous répondre. Base légale : l’exécution de mesures précontractuelles prises à votre demande. Conservation : trois ans à compter du dernier contact.',
      ),
      titre3('Formulaire de contact'),
      p(
        'Nom, courriel, téléphone, objet et message. Ces données servent à traiter votre demande. Base légale : notre intérêt légitime à répondre aux sollicitations qui nous sont adressées. Conservation : trois ans à compter du dernier contact.',
      ),
      titre3('Suivi d’expédition'),
      p(
        'Référence de dossier ou numéro de conteneur, statut, position et coordonnées liées au dossier. Base légale : l’exécution du contrat de transport. Conservation : durée du contrat, puis cinq ans au titre de la prescription commerciale, et dix ans pour les pièces comptables.',
      ),
      titre3('Sécurité du service'),
      p(
        'Votre adresse IP est utilisée pour limiter le nombre de requêtes envoyées à nos formulaires et prévenir les abus. Base légale : notre intérêt légitime à protéger le service. Cette donnée reste en mémoire vive et n’est pas enregistrée.',
      ),
    ]),
    section('Destinataires', 'destinataires', [
      p('Vos données sont accessibles aux seules personnes qui en ont besoin :'),
      ...liste(
        'le personnel de HGWF Cargo chargé du commerce et de l’exploitation',
        'nos prestataires techniques, qui agissent comme sous-traitants et n’utilisent vos données que sur nos instructions',
        'nos transporteurs, agents portuaires et déclarants en douane, lorsque l’exécution de votre expédition l’exige',
      ),
      p('Vos données ne sont ni vendues, ni louées, ni transmises à des fins publicitaires.'),
    ]),
    section('Transfert hors Union européenne', 'transferts', [
      p(
        'Les demandes que vous nous adressez sont enregistrées dans notre outil de gestion de contenu Sanity, dont les serveurs sont situés aux États-Unis. Ce transfert est encadré par les garanties prévues au chapitre V du RGPD, décrites dans l’accord de sous-traitance conclu avec ce prestataire.',
      ),
      p(
        'Vous pouvez obtenir communication de ces garanties en nous écrivant à ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ]),
    section('Vos droits', 'vos-droits', [
      p('Vous disposez, sur les données qui vous concernent, des droits suivants :'),
      ...liste(
        'droit d’accès : obtenir une copie des données que nous détenons sur vous',
        'droit de rectification : faire corriger une information inexacte',
        'droit à l’effacement, lorsque la conservation n’est plus justifiée',
        'droit à la limitation du traitement',
        'droit d’opposition, notamment aux traitements fondés sur notre intérêt légitime',
        'droit à la portabilité des données que vous nous avez fournies',
      ),
      p(
        'Pour les exercer, écrivez à ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        ' en précisant votre demande. Nous répondons dans un délai d’un mois, qui peut être prolongé de deux mois si la demande est complexe — nous vous en informerions alors.',
      ),
      p(
        'Si notre réponse ne vous satisfait pas, vous pouvez saisir la Commission nationale de l’informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou déposer une plainte sur ',
        lien('cnil.fr', 'https://www.cnil.fr'),
        '.',
      ),
    ]),
    section('Cookies', 'cookies', [
      p(
        'Ce site ne dépose aucun cookie et n’utilise aucun traceur : ni mesure d’audience, ni pixel publicitaire, ni bouton de réseau social embarqué. Aucun consentement ne vous est donc demandé, et aucune information n’est stockée dans votre navigateur.',
      ),
      p(
        'Si nous ajoutions un jour un outil de mesure d’audience, un bandeau vous permettrait de l’accepter ou de le refuser avant tout dépôt, et cette page serait mise à jour en conséquence.',
      ),
    ]),
    section('Sécurité', 'securite', [
      p(
        'Les échanges avec ce site sont chiffrés en transit. Les demandes sont enregistrées dans un espace privé, distinct du contenu public du site, et les accès en écriture sont limités à nos serveurs. Nous ne prenons aucune décision automatisée produisant des effets juridiques à votre égard, et ne réalisons aucun profilage.',
      ),
    ]),
  ];
}

function sectionsConfidentialiteEn() {
  return [
    section('Data controller', 'responsable', [
      p(
        'HGWF CARGO, société par actions simplifiée (a French simplified joint-stock company), registered office at avenue Faidherbe, 93110 Rosny-sous-Bois, registered with the Registre du commerce et des sociétés (Trade and Companies Register) of Bobigny under number 940 048 051.',
      ),
      p('For any question relating to your data: ', lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'), '.'),
    ]),
    section('Data collected and purposes', 'finalites', [
      p('We only collect data that you provide to us voluntarily.'),
      titre3('Quote request'),
      p(
        'Name, email address, phone number, destination, port of departure, package dimensions and quantity, free-text message. This data is used to prepare your quote and to respond to you. Legal basis: the performance of pre-contractual measures taken at your request. Retention period: three years from the last contact.',
      ),
      titre3('Contact form'),
      p(
        'Name, email address, phone number, subject and message. This data is used to handle your enquiry. Legal basis: our legitimate interest in responding to enquiries addressed to us. Retention period: three years from the last contact.',
      ),
      titre3('Shipment tracking'),
      p(
        'File reference or container number, status, location and contact details linked to the file. Legal basis: the performance of the transport contract. Retention period: for the duration of the contract, then five years under the French commercial limitation period, and ten years for accounting records.',
      ),
      titre3('Service security'),
      p(
        'Your IP address is used to limit the number of requests sent to our forms and to prevent abuse. Legal basis: our legitimate interest in protecting the service. This data remains in volatile memory and is not stored.',
      ),
    ]),
    section('Recipients', 'destinataires', [
      p('Your data is accessible only to those who need it:'),
      ...liste(
        'HGWF Cargo staff responsible for sales and operations',
        'our technical service providers, who act as processors and only use your data on our instructions',
        'our carriers, port agents and customs brokers, where required for the performance of your shipment',
      ),
      p('Your data is never sold, rented or transferred for advertising purposes.'),
    ]),
    section('Transfers outside the European Union', 'transferts', [
      p(
        'The requests you send us are recorded in our content management tool, Sanity, whose servers are located in the United States. This transfer is governed by the safeguards set out in Chapter V of the GDPR, described in the data processing agreement concluded with this provider.',
      ),
      p(
        'You can request a copy of these safeguards by writing to ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ]),
    section('Your rights', 'vos-droits', [
      p('You have the following rights over the data concerning you:'),
      ...liste(
        'right of access: to obtain a copy of the data we hold about you',
        'right of rectification: to have inaccurate information corrected',
        'right of erasure, where retention is no longer justified',
        'right to restriction of processing',
        'right to object, in particular to processing based on our legitimate interest',
        'right to data portability for the data you have provided to us',
      ),
      p(
        'To exercise these rights, write to ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        ' specifying your request. We respond within one month, which may be extended by two months if the request is complex — we would inform you of this.',
      ),
      p(
        'If our response does not satisfy you, you may contact the Commission nationale de l’informatique et des libertés (CNIL), the French supervisory authority, at 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, or lodge a complaint at ',
        lien('cnil.fr', 'https://www.cnil.fr'),
        '.',
      ),
    ]),
    section('Cookies', 'cookies', [
      p(
        'This site does not set any cookies and does not use any trackers: no audience measurement, no advertising pixels, no embedded social media buttons. No consent is therefore requested from you, and no information is stored in your browser.',
      ),
      p(
        'If we were ever to add an audience measurement tool, a banner would let you accept or decline it before any cookie is set, and this page would be updated accordingly.',
      ),
    ]),
    section('Security', 'securite', [
      p(
        "Exchanges with this site are encrypted in transit. Requests are stored in a private area, separate from the site's public content, and write access is limited to our servers. We do not make any automated decisions producing legal effects concerning you, and we do not carry out any profiling.",
      ),
    ]),
  ];
}

function sectionsCgvFr() {
  return [
    section('Champ d’application', 'champ-application', [
      p(
        'HGWF Cargo intervient en qualité de commissionnaire de transport : nous organisons librement, pour votre compte et en notre nom, l’acheminement de vos marchandises par les moyens de notre choix. Nous ne réalisons pas nous-mêmes le transport principal.',
      ),
      p(
        'Toute commande emporte acceptation sans réserve des présentes conditions, qui prévalent sur les conditions d’achat du client, sauf accord écrit de notre part.',
      ),
    ]),
    section('Devis et commande', 'devis', [
      p(
        'Nos devis sont établis sur la base des informations que vous nous communiquez et sont valables trente jours, sauf mention contraire. Les prix s’entendent hors taxes.',
      ),
      p('Sauf indication expresse au devis, ne sont pas compris :'),
      ...liste(
        'les droits de douane, taxes et redevances exigibles à destination',
        'les frais de stationnement, de magasinage ou d’immobilisation non imputables à HGWF Cargo',
        'les prestations de manutention exceptionnelle non prévues à la commande',
      ),
      p(
        'Toute modification des caractéristiques de l’envoi — poids, dimensions, nature, destination — entraîne la révision du prix.',
      ),
    ]),
    section('Obligations du client', 'obligations-client', [
      p('Vous vous engagez à :'),
      ...listeNum(
        'déclarer avec exactitude la nature, le poids, les dimensions et la valeur des marchandises',
        'assurer un emballage adapté au mode de transport et à la durée d’acheminement',
        'fournir en temps utile les documents nécessaires au transport et au dédouanement',
        'nous signaler toute marchandise dangereuse, réglementée ou de valeur',
      ),
      p(
        'Sont exclus du transport, sauf accord écrit préalable : les espèces, métaux et pierres précieuses, les objets d’art, les armes, les stupéfiants, les animaux vivants, les denrées périssables non réfrigérées et toute marchandise dont la circulation est interdite. Une déclaration inexacte engage votre responsabilité pour l’ensemble des conséquences qui en découlent.',
      ),
    ]),
    section('Délais', 'delais', [
      p(
        'Les délais annoncés, y compris ceux figurant sur ce site, sont donnés à titre indicatif. Ils dépendent des rotations maritimes, des conditions météorologiques, des opérations portuaires et des contrôles douaniers, qui échappent à notre maîtrise.',
      ),
      p(
        'Un dépassement de délai n’ouvre pas droit à indemnité, ni à l’annulation de la commande, sauf engagement écrit exprès de notre part sur une date garantie.',
      ),
    ]),
    section('Responsabilité', 'responsabilite', [
      p(
        'Notre responsabilité de commissionnaire s’exerce dans les limites fixées par le contrat type de commission de transport annexé au décret n° 2013-293 du 5 avril 2013, applicable à défaut de convention écrite contraire.',
      ),
      p(
        'La responsabilité du fait des transporteurs substitués est en outre limitée par les conventions applicables au mode d’acheminement employé :',
      ),
      ...liste(
        'transport routier international : Convention de Genève du 19 mai 1956, dite CMR',
        'transport maritime : Convention de Bruxelles de 1924 et ses protocoles, dites Règles de La Haye-Visby',
        'transport aérien : Convention de Montréal du 28 mai 1999',
      ),
      p(
        'En toute hypothèse, notre indemnisation ne peut excéder celle que nous pouvons obtenir du transporteur substitué, dans la limite des plafonds légaux applicables. Les dommages immatériels et pertes d’exploitation ne sont pas indemnisés.',
      ),
    ]),
    section('Assurance des marchandises', 'assurance', [
      p(
        'Les limitations d’indemnité rappelées ci-dessus sont souvent très inférieures à la valeur réelle des marchandises. Nous vous recommandons de souscrire une assurance ad valorem.',
      ),
      p(
        'Cette assurance n’est jamais souscrite d’office : elle doit faire l’objet d’une demande écrite de votre part, précisant la nature et la valeur à assurer, avant l’enlèvement.',
      ),
    ]),
    section('Paiement', 'paiement', [
      p(
        'Sauf convention particulière, nos prestations sont payables à réception de facture. Aucun escompte n’est accordé pour paiement anticipé.',
      ),
      p(
        'Tout retard de paiement entraîne de plein droit des pénalités calculées au taux d’intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de dix points, ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 €, conformément à l’article L.441-10 du code de commerce.',
      ),
      p(
        'Conformément à l’article L.132-2 du code de commerce, nous disposons d’un privilège et d’un droit de rétention sur les marchandises pour les créances nées à leur occasion.',
      ),
    ]),
    section('Réclamations', 'reclamations', [
      p(
        'Toute avarie ou perte partielle doit faire l’objet de réserves précises et motivées à la livraison, confirmées au transporteur et à nous-mêmes par écrit dans les trois jours ouvrables suivant la réception. À défaut, la marchandise est réputée livrée conforme.',
      ),
      p(
        'Les actions nées du contrat de commission de transport se prescrivent par un an à compter de la livraison, ou de la date à laquelle elle aurait dû intervenir.',
      ),
    ]),
    section('Clients particuliers', 'consommateurs', [
      p(
        'Les présentes conditions ne privent le client consommateur d’aucun des droits que lui reconnaît le code de la consommation, notamment en matière de garanties légales.',
      ),
      p(
        'En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation, après nous avoir adressé une réclamation écrite. Les coordonnées du médiateur retenu vous seront communiquées sur demande, à ',
        lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
        '.',
      ),
    ]),
    section('Droit applicable', 'droit-applicable', [
      p(
        'Les présentes conditions sont soumises au droit français. Seule la version française fait foi, toute traduction étant fournie à titre d’information.',
      ),
      p(
        'Seule la version française de ces conditions fait foi. Only the French version of these terms is legally binding.',
      ),
      p(
        'À défaut de résolution amiable, les litiges relèvent de la compétence du tribunal de commerce de Bobigny pour les clients professionnels. Pour les clients consommateurs, les règles légales de compétence s’appliquent.',
      ),
    ]),
  ];
}

const CIBLES: Record<string, () => ReturnType<typeof sectionsConfidentialiteFr>> = {
  'pageLegale-confidentialite-fr': sectionsConfidentialiteFr,
  'pageLegale-confidentialite-en': sectionsConfidentialiteEn,
  'pageLegale-cgv-fr': sectionsCgvFr,
};

// ── Comparaison idempotente ──────────────────────────────────────────────────────

type SectionExistante = {
  titre?: string;
  ancre?: { current?: string };
  corps?: { style?: string; listItem?: string; level?: number; children?: { text?: string }[]; markDefs?: { href?: string }[] }[];
};

// Forme canonique (titre, ancre, et pour chaque bloc : style, puce/numérotation, texte
// concaténé, liens) pour comparer un état existant à l'état cible sans dépendre des _key,
// régénérées à chaque exécution du script.
type Canonique = {
  titre: string;
  ancre: string;
  blocs: { style: string; listItem: string; level: number; texte: string; hrefs: string[] }[];
}[];

function canoniser(sections: SectionExistante[]): Canonique {
  return sections.map((s) => ({
    titre: s.titre ?? '',
    ancre: s.ancre?.current ?? '',
    blocs: (s.corps ?? []).map((b) => ({
      style: b.style ?? 'normal',
      listItem: b.listItem ?? '',
      level: b.level ?? 0,
      texte: (b.children ?? []).map((c) => c.text ?? '').join(''),
      hrefs: (b.markDefs ?? []).map((m) => m.href ?? ''),
    })),
  }));
}

async function main() {
  for (const [id, sectionsCible] of Object.entries(CIBLES)) {
    const doc = await client.fetch<{ _id: string; sections?: SectionExistante[] } | null>(
      `*[_id == $id][0]{ _id, sections[]{ titre, ancre, corps[]{ style, listItem, level, children[]{ text }, markDefs[]{ href } } } }`,
      { id },
    );

    if (!doc) {
      console.log(`  · ${id} introuvable — pas encore seedé, rien à corriger ici.`);
      continue;
    }

    const cible = sectionsCible();
    const actuel = canoniser(doc.sections ?? []);
    const attendu = canoniser(cible);

    if (JSON.stringify(actuel) === JSON.stringify(attendu)) {
      console.log(`  ✓ ${id} — déjà correct, rien à faire.`);
      continue;
    }

    await client.patch(id).set({ sections: cible }).commit();
    console.log(`  ✓ ${id} — sections remplacées (listes et liens rétablis).`);
  }
  console.log('Correction des listes et des liens terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
