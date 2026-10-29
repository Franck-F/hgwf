// Facturation pré-remplie à la création d'une demande, depuis le formulaire du
// site (bloc « Facturation », facultatif depuis le 29/10/2026).
//
// Règles :
// - le nom facturé est toujours renseigné : la raison sociale pour un
//   professionnel qui l'a donnée, sinon le nom du demandeur ;
// - le type de client n'est jamais deviné : vide si le visiteur n'a rien choisi ;
// - le SIRET n'est gardé que pour un professionnel, sans espaces (comme le
//   back-office l'enregistre) ;
// - ce qui manque reste vide : le back-office le transforme en questions à
//   poser au client.
// Module pur, testé par test/facturation.test.js.

const propre = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export function facturationDepuisFormulaire(nom, brut) {
  const f = brut && typeof brut === 'object' ? brut : {};
  const type = f.type === 'particulier' || f.type === 'professionnel' ? f.type : undefined;
  const societe = type === 'professionnel' ? propre(f.societe, 160) : '';
  const siret = type === 'professionnel' ? propre(f.siret, 40).replace(/\s/g, '') : '';
  const champs = {
    facturationType: type,
    facturationNom: societe || propre(nom, 120),
    facturationAdresse: propre(f.adresse, 300),
    facturationCodePostal: propre(f.codePostal, 20),
    facturationVille: propre(f.ville, 120),
    facturationPays: propre(f.pays, 80),
    facturationSiret: siret,
  };
  // Seuls les champs remplis partent dans Sanity.
  return Object.fromEntries(Object.entries(champs).filter(([, v]) => v));
}
