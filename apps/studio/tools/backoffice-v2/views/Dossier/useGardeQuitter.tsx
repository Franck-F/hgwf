/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Garde de navigation d'une page qui a des saisies non enregistrées (4.3,
 * « Quitter sans enregistrer ? »). Elle s'inscrit auprès du routeur
 * (`useRoute().garde`) : quand l'utilisateur veut changer de page, le routeur
 * attend la réponse de la fenêtre. Elle prévient aussi la fermeture de
 * l'onglet. Le hook rend la fenêtre à afficher (ou `null`).
 *
 * Fichier ajouté au lot 10, partagé par la page Dossier et « Nouveau dossier ».
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { Confirmation } from '../../ui';

export function useGardeQuitter(actif: boolean): ReactElement | null {
  const { garde } = useRoute();
  const definir = useRef(garde.definir);
  definir.current = garde.definir;
  const [attente, setAttente] = useState<{ repondre: (quitter: boolean) => void } | null>(null);

  useEffect(() => {
    if (!actif) return undefined;
    definir.current(
      () =>
        new Promise<boolean>((resolve) => {
          setAttente({ repondre: resolve });
        }),
    );
    const avantFermeture = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener('beforeunload', avantFermeture);
    return () => {
      definir.current(null);
      window.removeEventListener('beforeunload', avantFermeture);
    };
  }, [actif]);

  if (!attente) return null;
  const repondre = (quitter: boolean): void => {
    attente.repondre(quitter);
    setAttente(null);
  };
  return (
    <Confirmation
      titre="Quitter sans enregistrer ?"
      consequence="Vos modifications non enregistrées seront perdues."
      verbe="Quitter sans enregistrer"
      danger
      onAnnuler={() => repondre(false)}
      onConfirmer={() => repondre(true)}
    />
  );
}
