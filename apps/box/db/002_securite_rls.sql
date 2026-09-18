-- Phase 1 : l'outil est réservé à l'équipe, il n'y a pas encore de compte client.
-- Toutes les tables sont donc fermées au public et ouvertes aux personnes
-- authentifiées. À resserrer en phase 4, quand les clients auront un espace :
-- un client ne devra voir que ses propres contrats.

alter table public.site enable row level security;
alter table public.categorie_box enable row level security;
alter table public.tarif enable row level security;
alter table public.box enable row level security;
alter table public.client enable row level security;
alter table public.contrat enable row level security;
alter table public.mouvement enable row level security;

create policy "equipe lecture ecriture" on public.site
  for all to authenticated using (true) with check (true);
create policy "equipe lecture ecriture" on public.categorie_box
  for all to authenticated using (true) with check (true);
create policy "equipe lecture ecriture" on public.tarif
  for all to authenticated using (true) with check (true);
create policy "equipe lecture ecriture" on public.box
  for all to authenticated using (true) with check (true);
create policy "equipe lecture ecriture" on public.client
  for all to authenticated using (true) with check (true);
create policy "equipe lecture ecriture" on public.contrat
  for all to authenticated using (true) with check (true);

-- Le journal s'écrit et se lit, il ne se corrige pas : le déclencheur refuse
-- déjà toute modification, la politique n'ouvre donc que l'insertion.
create policy "equipe lecture" on public.mouvement
  for select to authenticated using (true);
create policy "equipe ecriture" on public.mouvement
  for insert to authenticated with check (true);
