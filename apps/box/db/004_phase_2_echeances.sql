-- Phase 2 : les loyers dus. Appliqué le 19/09/2026.
--
-- Une échéance est un loyer interne, PAS une facture : elle ne relève d'aucune
-- obligation légale et ne porte pas de numérotation fiscale. La facturation
-- reste à trancher (voir scale-up/specs/box-developpement.md, section 5).
--
-- Trois règles tenues par la base, pas par l'interface :
--   1. une même période ne peut pas avoir deux loyers vivants pour un contrat ;
--   2. le montant d'une échéance émise ne se modifie plus — seul son état
--      change (due, payée, annulée) ;
--   3. les jours facturés sont stockés, pas seulement le montant : sans eux,
--      un prorata devient invérifiable et donc incontestable par personne.

create table public.echeance (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references public.contrat(id),
  periode_debut date not null,
  periode_fin date not null,
  montant_cents integer not null check (montant_cents >= 0),
  jours_factures integer not null check (jours_factures > 0),
  jours_periode integer not null check (jours_periode > 0),
  statut text not null default 'due' check (statut in ('due', 'payee', 'annulee')),
  paye_le date,
  moyen_paiement text,
  note text,
  cree_le timestamptz not null default now(),
  check (periode_fin >= periode_debut),
  check (jours_factures <= jours_periode)
);

comment on table public.echeance is
  'Loyer dû pour une période. Interne : ce n''est pas une facture au sens légal.';
comment on column public.echeance.jours_factures is
  'Jours réellement dus. Inférieur à jours_periode en cas de prorata d''entrée ou de sortie.';

-- Un seul loyer VIVANT par période et par contrat.
--
-- L'index est partiel, et ce n'est pas un détail : une contrainte d'unicité
-- pleine empêcherait de régénérer une période après annulation. Le cas réel —
-- le mois en cours est émis en entier, puis le client sort le 25 : l'échéance
-- étant figée, la seule voie propre est de l'annuler et d'en émettre une au
-- prorata. Défaut trouvé en testant, corrigé avant la mise en service.
create unique index echeance_une_seule_vivante_par_periode
  on public.echeance (contrat_id, periode_debut)
  where statut <> 'annulee';

-- Une échéance émise ne se modifie plus. Son état, si : due → payée, ou
-- annulée. Mais ni son montant, ni sa période, ni son contrat.
create or replace function public.echeance_montant_fige() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.montant_cents is distinct from old.montant_cents
     or new.periode_debut is distinct from old.periode_debut
     or new.periode_fin is distinct from old.periode_fin
     or new.jours_factures is distinct from old.jours_factures
     or new.contrat_id is distinct from old.contrat_id then
    raise exception 'Le montant et la période d''une échéance émise ne se modifient pas. Annulez-la et générez-en une autre.';
  end if;
  return new;
end;
$$;

revoke all on function public.echeance_montant_fige() from public, anon, authenticated;

create trigger echeance_pas_de_reecriture
  before update on public.echeance
  for each row execute function public.echeance_montant_fige();

create index on public.echeance (contrat_id, periode_debut desc);
create index on public.echeance (statut, periode_fin);

alter table public.echeance enable row level security;

create policy "equipe lecture ecriture" on public.echeance
  for all to authenticated using (true) with check (true);
