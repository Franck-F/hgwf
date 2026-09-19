/**
 * Calcul des loyers dus. Pur : aucune base, aucun réseau, aucune horloge
 * cachée — tout entre par les arguments. C'est ce qui rend le prorata
 * vérifiable à la main, et c'est là que ce type de projet dérape.
 *
 * Les dates circulent en « AAAA-MM-JJ » et l'arithmétique se fait sur des
 * entiers année/mois/jour. Passer par `new Date('2026-01-15')` reviendrait à
 * travailler en UTC puis à afficher en heure locale : un contrat démarré le 1er
 * du mois se retrouverait à commencer le 31 du mois précédent pour la moitié
 * du globe.
 */

export type Jalon = { annee: number; mois: number; jour: number };

export type EcheanceCalculee = {
  periode_debut: string;
  periode_fin: string;
  montant_cents: number;
  jours_factures: number;
  jours_periode: number;
};

export function versJalon(iso: string): Jalon {
  const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
  return { annee: a ?? 0, mois: m ?? 1, jour: j ?? 1 };
}

export function versIso({ annee, mois, jour }: Jalon): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${annee}-${p(mois)}-${p(jour)}`;
}

/** Nombre de jours du mois donné. `mois` va de 1 à 12. */
export function joursDansMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** Comparaison de deux dates ISO. Sûre parce que le format est trié par nature. */
function avant(a: string, b: string): boolean {
  return a < b;
}

function min(a: string, b: string): string {
  return a <= b ? a : b;
}

function max(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Jours inclus entre deux dates ISO, bornes comprises. */
export function joursEntre(debutIso: string, finIso: string): number {
  const d = versJalon(debutIso);
  const f = versJalon(finIso);
  const ms =
    Date.UTC(f.annee, f.mois - 1, f.jour) - Date.UTC(d.annee, d.mois - 1, d.jour);
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Loyers dus d'un contrat, mois par mois, jusqu'à `jusquA` inclus.
 *
 * Le prorata est calculé sur les jours réels du mois concerné, pas sur une
 * base 30 : un mois de février entamé le 20 ne se facture pas comme un mois
 * de juillet entamé le 20. Les deux tiers de la dispute sur une facture de
 * self-stockage viennent de là.
 *
 * Arrondi au centime le plus proche. Le détail en jours est renvoyé avec le
 * montant : sans lui, un client qui conteste n'a rien à vérifier.
 */
export function echeancesDuContrat({
  debut,
  fin,
  loyerMensuelCents,
  jusquA,
}: {
  debut: string;
  fin: string | null;
  loyerMensuelCents: number;
  jusquA: string;
}): EcheanceCalculee[] {
  const sorties: EcheanceCalculee[] = [];
  if (avant(jusquA, debut)) return sorties;

  const depart = versJalon(debut);
  let annee = depart.annee;
  let mois = depart.mois;

  // Garde-fou : un contrat très ancien mal saisi ne doit pas produire dix mille
  // lignes ni boucler indéfiniment.
  for (let garde = 0; garde < 600; garde += 1) {
    const joursMois = joursDansMois(annee, mois);
    const premierDuMois = versIso({ annee, mois, jour: 1 });
    const dernierDuMois = versIso({ annee, mois, jour: joursMois });

    // Le contrat s'est terminé avant ce mois : plus rien à devoir.
    if (fin && avant(fin, premierDuMois)) break;

    const periodeDebut = max(debut, premierDuMois);
    const periodeFin = fin ? min(fin, dernierDuMois) : dernierDuMois;

    // On ne facture pas un mois qui n'a pas commencé.
    if (avant(jusquA, periodeDebut)) break;

    if (!avant(periodeFin, periodeDebut)) {
      const joursFactures = joursEntre(periodeDebut, periodeFin);
      sorties.push({
        periode_debut: periodeDebut,
        periode_fin: periodeFin,
        jours_factures: joursFactures,
        jours_periode: joursMois,
        montant_cents:
          joursFactures === joursMois
            ? loyerMensuelCents
            : Math.round((loyerMensuelCents * joursFactures) / joursMois),
      });
    }

    mois += 1;
    if (mois > 12) {
      mois = 1;
      annee += 1;
    }
  }

  return sorties;
}

/** Date du jour en « AAAA-MM-JJ », dans le fuseau du serveur. */
export function aujourdhuiIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Dernier jour du mois d'une date ISO. */
export function finDuMois(iso: string): string {
  const { annee, mois } = versJalon(iso);
  return versIso({ annee, mois, jour: joursDansMois(annee, mois) });
}

/** Libellé lisible d'une période : « janvier 2026 » ou « 15 → 31 janvier 2026 ». */
export function libellePeriode(debut: string, fin: string, joursPeriode: number): string {
  const d = versJalon(debut);
  const mois = new Date(Date.UTC(d.annee, d.mois - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const complet = joursEntre(debut, fin) === joursPeriode;
  if (complet) return mois;
  return `${d.jour} → ${versJalon(fin).jour} ${mois}`;
}
