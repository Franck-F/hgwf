/**
 * Props de TOUT le kit d'interface (spécification, section 6).
 *
 * Définies une seule fois, ici, avant l'écriture des composants : les vues les
 * consomment sans attendre leur implémentation, et chaque composant du kit
 * implémente exactement son type. Aucun import de `sanity`.
 */
import type { ChangeEvent, ReactNode } from 'react';

/** Noms des icônes SVG réellement utilisées (plafond 14, pas d'icône « au cas où »). */
export type IconeNom =
  | 'alerte'
  | 'horloge'
  | 'enveloppe'
  | 'telephone'
  | 'copier'
  | 'telecharger'
  | 'plus'
  | 'menu'
  | 'fleche'
  | 'coche'
  | 'croix'
  | 'chevron'
  | 'recherche'
  | 'lienExterne';

export type TonBadge = 'neutre' | 'info' | 'attention' | 'urgent' | 'ok';

// ── Boutons et menus ────────────────────────────────────────────────────────

export interface BoutonProps {
  /** `primaire` : un seul par écran. `danger` : contour corail, texte corail. */
  variante?: 'primaire' | 'secondaire' | 'discret' | 'danger';
  taille?: 'm' | 's';
  /** Désactive le bouton pendant l'action (verrou anti double clic). */
  chargement?: boolean;
  desactive?: boolean;
  /** `button` par défaut, jamais `submit` sans l'avoir demandé. */
  type?: 'button' | 'submit';
  onClick?: () => void;
  children?: ReactNode;
  /** Obligatoire dès que le bouton n'a pas de texte visible. */
  'aria-label'?: string;
  /** Id d'un élément `Manques` ou d'une infobulle expliquant un bouton désactivé. */
  'aria-describedby'?: string;
}

export interface ElementMenu {
  id: string;
  libelle: string;
  danger?: boolean;
  desactive?: boolean;
  onChoisir: () => void;
}

export interface MenuActionsProps {
  elements: ElementMenu[];
  /** Libellé accessible du bouton « … ». Défaut : « Autres actions ». */
  libelle?: string;
}

// ── Affichage ───────────────────────────────────────────────────────────────

export interface BadgeProps {
  ton: TonBadge;
  /** L'état n'est jamais porté par la couleur seule : icône + mot. */
  icone?: IconeNom;
  children?: ReactNode;
}

export interface CarteProps {
  titre?: string;
  children?: ReactNode;
  /** Classe additionnelle (préfixe `bo-`). */
  classe?: string;
}

export interface SectionProps {
  titre: string;
  /** Résumé d'une ligne affiché quand la section est fermée. */
  resume?: string;
  ouverte: boolean;
  onBasculer: () => void;
  children?: ReactNode;
}

export interface EtatVideProps {
  titre: string;
  phrase?: string;
  action?: { libelle: string; onClick: () => void };
}

export interface ManquesProps {
  manques: string[];
  /** Permet à un bouton désactivé de pointer vers cette liste (`aria-describedby`). */
  id?: string;
}

export interface EtapeFrise {
  id: string;
  libelle: string;
}

export interface FriseProps {
  etapes: EtapeFrise[];
  /** Id de l'étape courante ; `null` = aucune position marquée. */
  courante: string | null;
  /** `urgent` pour un incident, `neutre` pour sans suite / annulé. */
  ton?: 'normal' | 'urgent' | 'neutre';
}

export interface SqueletteProps {
  /** Nombre de lignes de placeholder. */
  lignes?: number;
  /** Variante de forme. */
  forme?: 'ligne' | 'entete' | 'carte';
}

// ── Champs ──────────────────────────────────────────────────────────────────

export interface ChampProps {
  etiquette: string;
  requis?: boolean;
  erreur?: string;
  /** Aide ponctuelle (infobulle accessible), jamais une phrase permanente. */
  aide?: string;
  children?: ReactNode;
}

export interface SaisieProps {
  etiquette: string;
  valeur: string;
  onChange: (valeur: string) => void;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  lectureSeule?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
}

export interface OptionListe {
  valeur: string;
  libelle: string;
}

export interface ListeProps {
  etiquette: string;
  valeur: string;
  options: OptionListe[];
  onChange: (valeur: string) => void;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  lectureSeule?: boolean;
  /** Libellé de l'option vide (ex. « Choisir… »). Absent = pas d'option vide. */
  vide?: string;
}

export interface ZoneTexteProps {
  etiquette: string;
  valeur: string;
  onChange: (valeur: string) => void;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  lectureSeule?: boolean;
  lignes?: number;
}

export interface MontantProps {
  etiquette: string;
  /** `null` = vide ; 0 est une valeur (piège du zéro). Jamais NaN. */
  valeur: number | null;
  onChange: (valeur: number | null) => void;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  lectureSeule?: boolean;
  /** Unité affichée à droite (« € » par défaut). */
  unite?: string;
}

export interface DateChampProps {
  etiquette: string;
  /** Format de stockage de l'application, ex. `2026-11-06` (jamais montré tel quel). */
  valeur: string;
  onChange: (valeur: string) => void;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  lectureSeule?: boolean;
}

export interface ChoixTVAProps {
  /** Valeur numérique stricte ; `null` = aucun choix (jamais présélectionné en silence). */
  valeur: 0 | 20 | null;
  onChange: (valeur: 0 | 20) => void;
  erreur?: string;
  lectureSeule?: boolean;
}

// ── Fenêtres, retours, navigation ───────────────────────────────────────────

export interface ModaleProps {
  titre: string;
  onFermer: () => void;
  /** Vrai dès qu'il y a une saisie : pas de fermeture au clic extérieur. */
  empecherFermeture?: boolean;
  /** Zone de boutons (le seul bouton plein de la fenêtre y figure). */
  pied?: ReactNode;
  children?: ReactNode;
}

export interface ConfirmationProps {
  titre: string;
  consequence: string;
  /** Verbe de l'action, texte du bouton de confirmation. */
  verbe: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
  danger?: boolean;
  chargement?: boolean;
}

export type TypeToast = 'succes' | 'erreur';

export interface ToastProps {
  id: string;
  type: TypeToast;
  message: string;
  onFermer: (id: string) => void;
}

export interface ToastsProps {
  toasts: Omit<ToastProps, 'onFermer'>[];
  onFermer: (id: string) => void;
}

export interface LigneCliquableProps {
  onClick: () => void;
  children?: ReactNode;
  /** Libellé accessible complet de la ligne. */
  'aria-label'?: string;
  /** Grise la ligne (dossier qui vient de sortir de la liste). */
  attenuee?: boolean;
}

export interface ValeurSegment {
  id: string;
  libelle: string;
  compteur?: number;
}

export interface SegmentsProps {
  valeurs: ValeurSegment[];
  courant: string;
  onChoisir: (id: string) => void;
  /** Libellé accessible du groupe d'onglets. */
  libelle: string;
}

/** Utilitaire partagé par les champs : extrait la valeur d'un événement de saisie. */
export type EvenementSaisie = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
