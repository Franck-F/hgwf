-- Socle de la phase 1 : savoir quel box est libre, qui occupe quoi, jusqu'à quand.
-- Appliqué le 18/09/2026 sur le projet Supabase « hgwf-box » (eu-west-3, Paris).
--
-- Deux règles structurantes appliquées ici, pas plus tard :
--   1. rien ne s'efface : on archive (archive_le), on ne supprime pas ;
--   2. le journal des mouvements est non modifiable.
-- Les montants sont en centimes entiers : un loyer ne se calcule jamais en flottant.

create extension if not exists btree_gist;

create table public.site (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text not null,
  code_postal text,
  ville text,
  horaires text,
  cree_le timestamptz not null default now(),
  archive_le timestamptz
);
comment on table public.site is 'Un local de stockage. Prévu au pluriel dès le départ, même avec un seul site.';

create table public.categorie_box (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  surface_m2 numeric(6,2),
  volume_m3 numeric(6,2),
  description text,
  cree_le timestamptz not null default now(),
  archive_le timestamptz
);
comment on table public.categorie_box is 'Gabarit de box (« 3 m² », « 6 m² »…). Porte le tarif, pas le box lui-même.';

create table public.tarif (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references public.categorie_box(id),
  montant_mensuel_cents integer not null check (montant_mensuel_cents >= 0),
  applicable_du date not null,
  applicable_au date,
  cree_le timestamptz not null default now(),
  check (applicable_au is null or applicable_au > applicable_du)
);
comment on table public.tarif is 'Un tarif ne s''écrase jamais : on en crée un nouveau, daté. Sans cela, un contrat ancien devient irrelisable.';

create table public.box (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.site(id),
  categorie_id uuid not null references public.categorie_box(id),
  code text not null,
  etage text,
  statut text not null default 'disponible'
    check (statut in ('disponible','occupe','reserve','maintenance','retire')),
  note text,
  cree_le timestamptz not null default now(),
  archive_le timestamptz,
  unique (site_id, code)
);
comment on column public.box.code is 'Ce qui est écrit sur la porte. C''est la référence que le client utilise.';

create table public.client (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'particulier' check (type in ('particulier','societe')),
  nom text not null,
  raison_sociale text,
  siret text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  pays text not null default 'France',
  note text,
  cree_le timestamptz not null default now(),
  archive_le timestamptz
);
comment on column public.client.type is 'Une société déclenche l''obligation de facturation électronique au 01/09/2027. Un particulier, non.';

create table public.contrat (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_id uuid not null references public.client(id),
  box_id uuid not null references public.box(id),
  debut date not null,
  fin_prevue date,
  fin_effective date,
  preavis_jours integer not null default 30 check (preavis_jours >= 0),
  loyer_mensuel_cents integer not null check (loyer_mensuel_cents >= 0),
  depot_garantie_cents integer not null default 0 check (depot_garantie_cents >= 0),
  statut text not null default 'actif' check (statut in ('actif','resilie','termine')),
  note text,
  cree_le timestamptz not null default now(),
  check (fin_prevue is null or fin_prevue >= debut),
  check (fin_effective is null or fin_effective >= debut)
);

-- Un même box ne peut pas être loué deux fois sur des périodes qui se chevauchent.
-- La base le refuse, plutôt que de compter sur l'interface pour y penser.
alter table public.contrat add constraint contrat_pas_de_chevauchement
  exclude using gist (
    box_id with =,
    daterange(debut, coalesce(fin_effective, fin_prevue, 'infinity'::date), '[)') with &&
  );

create table public.mouvement (
  id bigint generated always as identity primary key,
  survenu_le timestamptz not null default now(),
  type text not null check (type in ('entree','sortie','changement','incident','maintenance','note')),
  box_id uuid references public.box(id),
  contrat_id uuid references public.contrat(id),
  client_id uuid references public.client(id),
  auteur text,
  detail text not null
);
comment on table public.mouvement is 'Journal non modifiable. Base de toute enquête : litige, incident, contestation de loyer.';

create or replace function public.mouvement_immuable() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Le journal des mouvements ne se modifie pas et ne s''efface pas.';
end;
$$;

create trigger mouvement_pas_de_modification
  before update or delete on public.mouvement
  for each row execute function public.mouvement_immuable();

create index on public.box (site_id, statut);
create index on public.contrat (box_id, statut);
create index on public.contrat (client_id);
create index on public.mouvement (survenu_le desc);
create index on public.tarif (categorie_id, applicable_du desc);
