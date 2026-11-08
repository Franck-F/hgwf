/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Chiffres du mois (4.7) : lecture seule, calculés depuis les dossiers, rien à
 * remplir. Dernier composant livré, supprimable sans effet sur le reste (Q12).
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useDossiers } from '../../data/useDossiers';
import { Carte, Liste, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';
import { chiffresDuMois, idMois, moisDisponibles } from './chiffres';

const nombre = (n: number): string => new Intl.NumberFormat('fr-FR').format(n);

export function ChiffresDuMois(): ReactElement {
  const { dossiers, chargement, erreur, recharger } = useDossiers();
  const mois = useMemo(() => moisDisponibles(new Date()), []);
  const [choisi, setChoisi] = useState(() => idMois(new Date().getFullYear(), new Date().getMonth()));
  const chiffres = useMemo(() => chiffresDuMois(dossiers, choisi), [dossiers, choisi]);

  const tuiles: { titre: string; valeur: string }[] = [
    { titre: 'Demandes reçues', valeur: nombre(chiffres.recues) },
    { titre: 'Devis envoyés', valeur: nombre(chiffres.devisEnvoyes) },
    { titre: 'Devis acceptés', valeur: nombre(chiffres.acceptes) },
    { titre: 'Taux d’acceptation', valeur: chiffres.tauxAcceptation === null ? '—' : `${chiffres.tauxAcceptation} %` },
    { titre: 'Volume des expéditions créées', valeur: `${nombre(chiffres.volumeM3)} m³` },
  ];

  return (
    <div className="bo-pile">
      <div className="bo-rangee">
        <h2 className="bo-groupe-titre">Chiffres du mois</h2>
        <span className="bo-espace">
          <Liste
            etiquette="Mois"
            valeur={choisi}
            onChange={setChoisi}
            options={mois.map((m) => ({ valeur: m.id, libelle: m.libelle }))}
          />
        </span>
      </div>

      {erreur ? (
        <BandeauErreur message="Impossible de charger les dossiers" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={3} />
      ) : (
        <div className="bo-grille">
          {tuiles.map((t) => (
            <Carte key={t.titre} titre={t.titre}>
              <p className="bo-groupe-titre">{t.valeur}</p>
            </Carte>
          ))}
        </div>
      )}
    </div>
  );
}
