/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Contact du client en puces actionnables (4.3) : numéro (lien `tel:`),
 * WhatsApp (lien `wa.me`, message court pré-rempli), e-mail affiché en clair
 * avec « Copier ». Pas de `mailto:` : il ne laisse aucune trace.
 */
import type { ReactElement } from 'react';
import { useToasts } from '../../app/Contexte';
import { formaterTelephone } from '../../domaine/format';
import { messageWhatsApp } from '../../domaine/messages';
import { extraireContact, lienTel, lienWhatsApp } from '../../domaine/rapprochement';
import type { Demande, Dossier } from '../../domaine/types';
import { Bouton, Icone } from '../../ui';
import { copierTexte } from './ContexteDossier';

export function ContactsDossier({ dossier }: { dossier: Dossier }): ReactElement | null {
  const toasts = useToasts();
  const d = dossier.demande;
  const x = dossier.expedition;
  const historique = extraireContact(d?.contact ?? x?.contact);
  const telephone = d?.telephone || x?.telephone || historique.telephone;
  const email = d?.email || x?.email || historique.email;
  if (!telephone && !email) return <p className="bo-secondaire">Aucun contact enregistré.</p>;

  // Une expédition seule n'a pas de demande : le message n'a besoin que du nom et de la référence.
  const pourMessage = d ?? ({ clientNom: x?.clientNom, reference: x?.reference } as Demande);

  async function copierEmail(): Promise<void> {
    if (await copierTexte(email)) toasts.succes('Adresse e-mail copiée.');
    else toasts.erreur('Impossible de copier l’adresse. Sélectionnez-la à la main.');
  }

  return (
    <div className="bo-puces">
      {telephone ? (
        <>
          <a className="bo-puce" href={lienTel(telephone)}>
            <Icone nom="telephone" />
            {formaterTelephone(telephone)}
          </a>
          <a
            className="bo-puce"
            href={lienWhatsApp(telephone, messageWhatsApp(pourMessage))}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </>
      ) : null}
      {email ? (
        <span className="bo-rangee">
          <span className="bo-puce">
            <Icone nom="enveloppe" />
            {email}
          </span>
          <Bouton variante="secondaire" taille="s" onClick={() => void copierEmail()}>
            Copier
          </Bouton>
        </span>
      ) : null}
    </div>
  );
}
