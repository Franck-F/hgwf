import { Suspense } from 'react';
import FormulaireConnexion from './Formulaire';

// Le formulaire lit « suite » dans l'URL pour renvoyer là où l'on allait.
// Next impose une frontière Suspense autour de toute lecture de la requête
// depuis un composant client, sinon la page ne peut plus être pré-rendue.
export default function Connexion() {
  return (
    <Suspense
      fallback={
        <main className="connexion-scene">
          <div className="connexion-panneau">
            <section className="connexion-recit" />
            <section className="connexion-formulaire" />
          </div>
        </main>
      }
    >
      <FormulaireConnexion />
    </Suspense>
  );
}
