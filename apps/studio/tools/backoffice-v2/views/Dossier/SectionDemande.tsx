/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Demande » : ce que le client a demandé, en lecture seule et
 * compacte (4.3). Contact et facturation ne sont pas répétés ici.
 */
import type { ReactElement } from 'react';
import { fusionner } from '../../domaine/fusion';
import { lireDate, texteAUneHeure } from '../../domaine/echeances';
import { formaterDate, formaterDateHeure } from '../../domaine/format';
import type { SectionDossierProps } from '../../domaine/contrats';
import { Saisie, Section, ZoneTexte } from '../../ui';

// Les détails du colis sont rangés dans le message par l'API (« Colis : … »).
// Lecture locale plutôt qu'un import de `pdf/devisPdf.ts` : ce module tire
// jsPDF, inutile pour afficher une page.
const DETAILS = ['Colis', 'Remarques colis', 'Départ'] as const;
const EST_DETAIL = /^(Colis|Remarques colis|Départ) : /;

function lireDetailMessage(message: string | undefined, cle: string): string | null {
  return message?.match(new RegExp(`^${cle} : (.+)$`, 'm'))?.[1]?.trim() ?? null;
}

function messageDuClient(message: string | undefined): string {
  return (message ?? '')
    .split('\n')
    .filter((l) => !EST_DETAIL.test(l))
    .join('\n')
    .trim();
}

function Fait({ titre, valeur }: { titre: string; valeur: string }): ReactElement {
  return (
    <div>
      <div className="bo-secondaire">{titre}</div>
      <div className="bo-fort">{valeur}</div>
    </div>
  );
}

function dateRecue(texte: string | undefined): string {
  const d = lireDate(texte);
  if (!d) return texte?.trim() || 'Date inconnue';
  return texteAUneHeure(texte) ? formaterDateHeure(d) : formaterDate(d);
}

export function SectionDemande({
  dossier,
  brouillon,
  modifier,
  lectureSeule,
  ouverte,
  onBasculer,
}: SectionDossierProps): ReactElement | null {
  const d = dossier.demande ? fusionner(dossier.demande, brouillon) : undefined;
  const x = dossier.expedition;
  if (!d) {
    // Expédition seule (créée à la main dans le Studio) : pas de demande à relire.
    return (
      <Section titre="Demande" resume="Aucune demande liée" ouverte={ouverte} onBasculer={onBasculer}>
        <p>Ce dossier a été créé directement comme expédition : il n’y a pas de demande de devis.</p>
      </Section>
    );
  }

  const resume = [d.typeEnvoi, d.destination, d.volume].filter(Boolean).join(' · ');
  const libre = messageDuClient(d.message);
  const details = DETAILS.map((cle) => ({ cle, valeur: lireDetailMessage(d.message, cle) })).filter(
    (e): e is { cle: (typeof DETAILS)[number]; valeur: string } => e.valeur !== null,
  );
  const saisir = (champ: string) => (valeur: string) => modifier(champ, valeur === '' ? null : valeur);

  return (
    <Section titre="Demande" resume={resume} ouverte={ouverte} onBasculer={onBasculer}>
      <div className="bo-grille bo-grille--3">
        {lectureSeule ? (
          d.typeEnvoi ? <Fait titre="Type d’envoi" valeur={d.typeEnvoi} /> : null
        ) : (
          <Saisie etiquette="Type d’envoi" valeur={d.typeEnvoi ?? ''} lectureSeule={false} onChange={saisir('typeEnvoi')} />
        )}
        {lectureSeule ? (
          d.destination ? <Fait titre="Destination" valeur={d.destination} /> : null
        ) : (
          <Saisie etiquette="Destination" valeur={d.destination ?? ''} lectureSeule={false} onChange={saisir('destination')} />
        )}
        {lectureSeule ? (
          d.volume ? <Fait titre="Volume" valeur={d.volume} /> : null
        ) : (
          <Saisie etiquette="Volume" valeur={d.volume ?? ''} lectureSeule={false} onChange={saisir('volume')} />
        )}
        <Fait titre="Reçue le" valeur={dateRecue(d.recueLe ?? d._createdAt)} />
        {d.sourceDemande === 'telephone' ? <Fait titre="Origine" valeur="Reçue au téléphone" /> : null}
        {details.map((e) => (
          <Fait key={e.cle} titre={e.cle} valeur={e.valeur} />
        ))}
      </div>
      {lectureSeule ? (
        libre ? (
          <div>
            <div className="bo-secondaire">Message du client</div>
            {/* Les retours à la ligne du client sont conservés sans style en ligne. */}
            <p>
              {libre.split('\n').map((ligne, i) => (
                <span key={i}>
                  {i > 0 ? <br /> : null}
                  {ligne}
                </span>
              ))}
            </p>
          </div>
        ) : null
      ) : (
        <ZoneTexte
          etiquette="Message du client"
          valeur={d.message ?? ''}
          lignes={6}
          onChange={saisir('message')}
        />
      )}
      {x ? (
        <p className="bo-secondaire">
          Expédition liée : <span className="bo-fort">{x.reference ?? x._id}</span>
        </p>
      ) : null}
    </Section>
  );
}
