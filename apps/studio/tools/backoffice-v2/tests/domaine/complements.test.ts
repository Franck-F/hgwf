import { describe, expect, it } from 'vitest';
import { actionPrincipale } from '../../domaine/actionPrincipale';
import { complementARelancer, complementDemande, complementEnAttente, dateComplement } from '../../domaine/complements';
import { construireHistorique } from '../../domaine/historique';
import { dossierDemande, MAINTENANT } from './fabrique';

describe('compléments demandés', () => {
  it('date connue : en attente tant qu’aucune réponse, à relancer après 5 jours ouvrés', () => {
    const recent = dossierDemande({ statut: 1, complementDemandeLe: '05/11/2026' });
    const ancien = dossierDemande({ statut: 1, complementDemandeLe: '28/10/2026' });
    expect(complementEnAttente(recent)).toBe(true);
    expect(complementARelancer(recent, MAINTENANT)).toBe(false);
    expect(complementARelancer(ancien, MAINTENANT)).toBe(true);
  });

  it('date inconnue (hors outil) : en attente, jamais relancé automatiquement', () => {
    const d = dossierDemande({ statut: 1, complementDemandeHorsOutil: 'email' });
    expect(complementDemande(d.demande)).toBe(true);
    expect(dateComplement(d.demande)).toBeNull();
    expect(complementEnAttente(d)).toBe(true);
    expect(complementARelancer(d, MAINTENANT)).toBe(false);
  });

  it('aucun complément : rien en attente', () => {
    expect(complementEnAttente(dossierDemande({ statut: 1 }))).toBe(false);
  });

  it('action principale : phrase d’attente, bouton « Relancer le client » au-delà du seuil', () => {
    const recent = actionPrincipale(dossierDemande({ statut: 1, complementDemandeLe: '05/11/2026', complementDemandeHorsOutil: 'email' }), {}, MAINTENANT);
    expect(recent.libelle).toBe('Demander des compléments');
    expect(recent.phrase).toContain('Compléments demandés le');
    expect(recent.phrase).toContain('(E-mail (Outlook))');
    expect(recent.phrase).toContain('En attente de la réponse de');
    const ancien = actionPrincipale(dossierDemande({ statut: 1, complementDemandeLe: '28/10/2026' }), {}, MAINTENANT);
    expect(ancien.libelle).toBe('Relancer le client');
  });

  it('historique : trace hors outil avec auteur, même sans date', () => {
    const h = construireHistorique(dossierDemande({ statut: 1, complementDemandeHorsOutil: 'email', complementDemandePar: 'Marie' }));
    const e = h.find((x) => x.libelle.startsWith('Compléments demandés hors outil'));
    expect(e?.libelle).toBe('Compléments demandés hors outil (E-mail (Outlook))');
    expect(e?.auteur).toBe('Marie');
  });
});
