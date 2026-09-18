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
import { CREME, IVOIRE, MARINE, ROUGE, VERT } from '@/lib/charte';

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
    <button
      type="submit"
      disabled={pending}
      style={{
        background: MARINE,
        color: CREME,
        border: 'none',
        borderRadius: 8,
        padding: '10px 18px',
        fontWeight: 700,
        opacity: pending ? 0.5 : 1,
      }}
    >
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
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
          <label
            key={c.nom}
            style={{ display: 'block', fontSize: 13.5, gridColumn: `span ${c.colonnes ?? 1}` }}
          >
            <span style={{ display: 'block', marginBottom: 5 }}>
              {c.libelle}
              {c.obligatoire && <span style={{ color: ROUGE }}> *</span>}
            </span>

            {c.type === 'select' ? (
              <select
                name={c.nom}
                required={c.obligatoire}
                defaultValue=""
                style={champStyle}
              >
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
                name={c.nom}
                type={c.type ?? 'text'}
                step={c.pas}
                required={c.obligatoire}
                defaultValue={c.defaut}
                style={champStyle}
              />
            )}

            {c.aide && (
              <span style={{ display: 'block', fontSize: 11.5, opacity: 0.62, marginTop: 4 }}>
                {c.aide}
              </span>
            )}
          </label>
          ),
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
        <Bouton libelle={bouton} />
        {resultat && (
          <span
            role="status"
            style={{ fontSize: 13.5, color: resultat.ok ? VERT : ROUGE, fontWeight: 500 }}
          >
            {resultat.ok ? `✓ ${resultat.message}` : resultat.erreur}
          </span>
        )}
      </div>
    </form>
  );
}

const champStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: `1.5px solid rgba(18,57,91,0.3)`,
  background: IVOIRE,
};
