'use client';

/**
 * Enregistrement d'une sortie.
 *
 * Le bouton n'agit jamais du premier clic : il ouvre d'abord la date et
 * demande confirmation. Une sortie enregistrée par erreur libère un box qui
 * est encore occupé — et c'est le genre de faute qu'on découvre en louant
 * deux fois le même emplacement.
 */
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { enregistrerSortie } from '@/app/contrats/actions';

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton" disabled={pending} style={{ fontSize: 12.5 }}>
      {pending ? 'Enregistrement…' : 'Confirmer la sortie'}
    </button>
  );
}

export default function SortieContrat({
  contratId,
  reference,
  codeBox,
  debut,
}: {
  contratId: string;
  reference: string;
  codeBox: string;
  debut: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [resultat, agir] = useActionState(enregistrerSortie, null);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  if (resultat?.ok) {
    return <span className="retour retour-ok">✓ {resultat.message}</span>;
  }

  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        <i className="ph ph-sign-out" aria-hidden="true" /> Sortie
      </button>
    );
  }

  return (
    <form action={agir} style={{ display: 'grid', gap: 8, minWidth: 210 }}>
      <input type="hidden" name="contrat_id" value={contratId} />
      <p className="aide" style={{ margin: 0 }}>
        Sortie du box <strong>{codeBox}</strong>, contrat {reference}. Le box redeviendra
        disponible.
      </p>
      <input
        className="champ"
        type="date"
        name="fin_effective"
        required
        min={debut}
        defaultValue={aujourdhui}
        style={{ padding: '8px 10px', fontSize: 12.5 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Bouton />
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {resultat && !resultat.ok && <span className="retour retour-erreur">{resultat.erreur}</span>}
    </form>
  );
}
