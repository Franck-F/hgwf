'use client';

/**
 * Encaisser ou annuler un loyer.
 *
 * Aucune des deux n'agit du premier clic. L'encaissement demande la date, et
 * l'annulation exige un motif écrit : un loyer annulé sans raison lisible
 * devient, six mois plus tard, un trou que personne ne sait expliquer.
 */
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { annulerEcheance, marquerPayee } from '@/app/echeances/actions';
import { aujourdhuiIso } from '@/lib/echeances';

function Soumettre({ libelle, violet }: { libelle: string; violet?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`bouton${violet ? ' bouton-violet' : ''}`}
      disabled={pending}
      style={{ fontSize: 12.5, padding: '9px 14px' }}
    >
      {pending ? '…' : libelle}
    </button>
  );
}

export function EncaisserEcheance({ echeanceId }: { echeanceId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [resultat, agir] = useActionState(marquerPayee, null);

  if (resultat?.ok) return <span className="retour retour-ok">✓ encaissé</span>;

  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        <i className="ph ph-check" aria-hidden="true" /> Encaisser
      </button>
    );
  }

  return (
    <form action={agir} style={{ display: 'grid', gap: 8, minWidth: 190 }}>
      <input type="hidden" name="echeance_id" value={echeanceId} />
      <input
        className="champ"
        type="date"
        name="paye_le"
        required
        defaultValue={aujourdhuiIso()}
        style={{ padding: '8px 10px', fontSize: 12.5 }}
      />
      <select className="champ" name="moyen_paiement" style={{ padding: '8px 10px', fontSize: 12.5 }}>
        <option value="">Moyen non précisé</option>
        <option>Prélèvement</option>
        <option>Virement</option>
        <option>Carte</option>
        <option>Chèque</option>
        <option>Espèces</option>
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <Soumettre libelle="Confirmer" violet />
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {resultat && !resultat.ok && <span className="retour retour-erreur">{resultat.erreur}</span>}
    </form>
  );
}

export function AnnulerEcheance({ echeanceId }: { echeanceId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [resultat, agir] = useActionState(annulerEcheance, null);

  if (resultat?.ok) return <span className="retour retour-ok">✓ annulé</span>;

  if (!ouvert) {
    return (
      <button type="button" className="bouton-lien" onClick={() => setOuvert(true)}>
        annuler
      </button>
    );
  }

  return (
    <form action={agir} style={{ display: 'grid', gap: 8, minWidth: 210 }}>
      <input type="hidden" name="echeance_id" value={echeanceId} />
      <input
        className="champ"
        name="motif"
        required
        maxLength={200}
        placeholder="Motif — obligatoire"
        style={{ padding: '8px 10px', fontSize: 12.5 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Soumettre libelle="Annuler le loyer" />
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Revenir
        </button>
      </div>
      {resultat && !resultat.ok && <span className="retour retour-erreur">{resultat.erreur}</span>}
    </form>
  );
}

export function LancerRelances({
  action,
  nombreEnRetard,
}: {
  action: () => Promise<{
    ok: boolean;
    envoyees: number;
    echecs: number;
    sansAdresse: number;
    message: string;
  }>;
  nombreEnRetard: number;
}) {
  const [resultat, agir] = useActionState(async () => action(), null);
  const [confirme, setConfirme] = useState(false);

  if (resultat) {
    return (
      <span className={`retour ${resultat.ok ? 'retour-ok' : 'retour-erreur'}`}>
        {resultat.ok ? `✓ ${resultat.message}` : resultat.message}
      </span>
    );
  }

  // Un envoi d'e-mails ne se déclenche pas d'un clic distrait : ceux qui
  // partent ne se rattrapent pas.
  if (!confirme) {
    return (
      <button
        type="button"
        className="bouton-discret"
        onClick={() => setConfirme(true)}
        disabled={nombreEnRetard === 0}
        style={{ opacity: nombreEnRetard === 0 ? 0.45 : 1 }}
      >
        <i className="ph ph-paper-plane-tilt" aria-hidden="true" /> Relancer les retards
      </button>
    );
  }

  return (
    <form action={agir} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="aide" style={{ marginTop: 0 }}>
        Un e-mail partira pour chaque loyer en retard jamais relancé. Un e-mail envoyé ne se
        rattrape pas.
      </span>
      <Soumettre libelle="Envoyer" />
      <button type="button" className="bouton-discret" onClick={() => setConfirme(false)}>
        Annuler
      </button>
    </form>
  );
}

export function GenererEcheances({
  action,
}: {
  action: () => Promise<{ ok: boolean; message?: string; erreur?: string }>;
}) {
  const [resultat, agir] = useActionState(async () => action(), null);
  return (
    <form action={agir} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <Soumettre libelle="Générer les loyers manquants" violet />
      {resultat && (
        <span className={`retour ${resultat.ok ? 'retour-ok' : 'retour-erreur'}`}>
          {resultat.ok ? `✓ ${resultat.message}` : resultat.erreur}
        </span>
      )}
    </form>
  );
}
