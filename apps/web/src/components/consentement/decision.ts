export const CLE_STOCKAGE = 'hgwf-consentement';
export type Choix = 'accepte' | 'refuse';

export function doitAfficher(actif: boolean, choix: string | null): boolean {
  if (!actif) return false;
  return choix !== 'accepte' && choix !== 'refuse';
}
