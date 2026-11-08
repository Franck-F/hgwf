/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Règlement et départ (4.3). Deux gestes IMMÉDIATS, hors barre d'enregistrement
 * et hors brouillon (5.5, n° 4) : cocher « Règlement reçu » et « Autoriser le
 * départ sans règlement » écrivent tout de suite leurs seuls champs, avec la
 * date et l'auteur. Les modifications en attente dans le brouillon restent
 * intactes. Le départ exige l'un ou l'autre (règle de sûreté de V1).
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { autoriserDepart, marquerReglement } from '../../../actions/expedition';
import type { SectionDossierProps } from '../../../domaine/contrats';
import { lireDate } from '../../../domaine/echeances';
import { formaterDateHeure } from '../../../domaine/format';
import { Bouton, Carte, Manques, ZoneTexte } from '../../../ui';
import { texteEchec } from '../ContexteDossier';
import { useContexteEcriture, useLanceur } from '../devis/outilsVue';

function dateTrace(texte: string | undefined): string {
  const d = lireDate(texte);
  return d ? formaterDateHeure(d) : (texte ?? '');
}

export function DepartReglement({ dossier, lectureSeule }: Pick<SectionDossierProps, 'dossier' | 'lectureSeule'>): ReactElement | null {
  const ctx = useContexteEcriture();
  const lancer = useLanceur();
  const idManques = useId();
  const [enCours, setEnCours] = useState(false);
  const [saisieMotif, setSaisieMotif] = useState(false);
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const x = dossier.expedition;
  if (!x) return null;

  const recu = x.reglementRecu === true;
  const derogation = x.derogationDepart === true && (x.derogationMotif ?? '').trim() !== '';
  const bloque = enCours || lectureSeule;

  async function executer(geste: () => ReturnType<typeof marquerReglement>): Promise<boolean> {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await lancer(geste);
      if (!r.ok) setErreur(texteEchec(r));
      return r.ok;
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Carte titre="Règlement et départ">
      <div className="bo-pile">
        <label className="bo-rangee">
          <input
            type="checkbox"
            checked={recu}
            disabled={bloque}
            onChange={(e) => void executer(() => marquerReglement(ctx, x, e.target.checked))}
          />
          <span className="bo-fort">Règlement reçu</span>
          {recu && x.reglementRecuLe ? <span className="bo-secondaire">le {dateTrace(x.reglementRecuLe)}</span> : null}
        </label>

        {derogation ? (
          <p className="bo-bandeau bo-bandeau--info">
            Départ autorisé sans règlement
            {x.derogationLe ? ` le ${dateTrace(x.derogationLe)}` : ''}
            {x.derogationPar ? ` par ${x.derogationPar}` : ''} : {x.derogationMotif}
          </p>
        ) : null}

        {!recu && !derogation && !lectureSeule && !saisieMotif ? (
          <div>
            <Bouton variante="discret" onClick={() => setSaisieMotif(true)}>
              Autoriser le départ sans règlement
            </Bouton>
          </div>
        ) : null}

        {saisieMotif && !recu && !derogation ? (
          <div className="bo-pile">
            <ZoneTexte etiquette="Motif de la dérogation" requis lignes={3} valeur={motif} onChange={setMotif} />
            <Manques manques={motif.trim() === '' ? ['le motif de la dérogation'] : []} id={idManques} />
            <div className="bo-rangee">
              <Bouton
                variante="secondaire"
                chargement={enCours}
                desactive={motif.trim() === ''}
                aria-describedby={motif.trim() === '' ? idManques : undefined}
                onClick={() =>
                  void executer(() => autoriserDepart(ctx, x, motif.trim())).then((ok) => {
                    if (ok) {
                      setSaisieMotif(false);
                      setMotif('');
                    }
                  })
                }
              >
                Autoriser le départ
              </Bouton>
              <Bouton variante="discret" onClick={() => setSaisieMotif(false)} desactive={enCours}>
                Annuler
              </Bouton>
            </div>
          </div>
        ) : null}

        {erreur ? (
          <p className="bo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </Carte>
  );
}
