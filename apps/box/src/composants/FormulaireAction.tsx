'use client';

/**
 * Formulaire générique branché sur une action serveur.
 *
 * Quatre formulaires du paramétrage ne diffèrent que par leurs champs : les
 * écrire quatre fois voudrait dire corriger quatre fois le jour où le retour
 * d'erreur change. Celui-ci tient l'état d'envoi, l'affichage du résultat et la
 * remise à zéro après succès.
 */
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { Resultat } from '@/app/parametrage/actions';
import ChampAdresse from './ChampAdresse';

export type Champ = {
  nom: string;
  libelle: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'adresse';
  obligatoire?: boolean;
  aide?: string;
  options?: { valeur: string; libelle: string }[];
  defaut?: string;
  pas?: string;
  colonnes?: number;
};

function Bouton({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton" disabled={pending}>
      {pending ? 'Enregistrement…' : libelle}
    </button>
  );
}

export default function FormulaireAction({
  action,
  champs,
  bouton,
}: {
  action: (precedent: Resultat | null, form: FormData) => Promise<Resultat>;
  champs: Champ[];
  bouton: string;
}) {
  const [resultat, envoyer] = useActionState(action, null);
  const reference = useRef<HTMLFormElement>(null);

  // On ne vide le formulaire qu'après un succès : après une erreur, effacer la
  // saisie oblige à tout retaper pour corriger un seul champ.
  useEffect(() => {
    if (resultat?.ok) reference.current?.reset();
  }, [resultat]);

  return (
    <form ref={reference} action={envoyer}>
      <div className="grille">
        {champs.map((c) =>
          // L'adresse porte sa propre étiquette et sa liste de suggestions.
          c.type === 'adresse' ? (
            <div key={c.nom} style={{ gridColumn: `span ${c.colonnes ?? 1}` }}>
              <ChampAdresse
                nom={c.nom}
                libelle={c.libelle}
                obligatoire={c.obligatoire}
                aide={c.aide}
              />
            </div>
          ) : (
            <label key={c.nom} style={{ display: 'block', gridColumn: `span ${c.colonnes ?? 1}` }}>
              <span className="etiquette">
                {c.libelle}
                {c.obligatoire && <span className="obligatoire"> *</span>}
              </span>

              {c.type === 'select' ? (
                <select className="champ" name={c.nom} required={c.obligatoire} defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {c.options?.map((o) => (
                    <option key={o.valeur} value={o.valeur}>
                      {o.libelle}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="champ"
                  name={c.nom}
                  type={c.type ?? 'text'}
                  step={c.pas}
                  required={c.obligatoire}
                  defaultValue={c.defaut}
                />
              )}

              {c.aide && <span className="aide">{c.aide}</span>}
            </label>
          ),
        )}
      </div>

      <div className="barre-actions">
        <Bouton libelle={bouton} />
        {resultat && (
          <span role="status" className={`retour ${resultat.ok ? 'retour-ok' : 'retour-erreur'}`}>
            {resultat.ok ? `✓ ${resultat.message}` : resultat.erreur}
          </span>
        )}
      </div>
    </form>
  );
}
