-- Modèle de chargement du parc réel. À copier, remplir, puis appliquer.
-- Ce fichier est un exemple : il n'est pas appliqué automatiquement, et les
-- valeurs ci-dessous sont des valeurs d'illustration, pas celles de HGWF.
--
-- Ordre imposé par les dépendances : site, puis catégories, puis tarifs,
-- puis box. Un box ne peut pas exister sans site ni catégorie.

begin;

-- ── 1. Le local ──────────────────────────────────────────────────────────────
insert into public.site (nom, adresse, code_postal, ville, horaires)
values ('Entrepôt principal', '0 rue à compléter', '93110', 'Rosny-sous-Bois',
        'Lundi au vendredi, 9h-18h');

-- ── 2. Les gabarits de box ───────────────────────────────────────────────────
-- Un gabarit par taille vendue. C'est lui qui porte le tarif, pas le box.
insert into public.categorie_box (nom, surface_m2, volume_m3, description) values
  ('1 m²',   1,   2.5, 'Cartons et petits objets'),
  ('3 m²',   3,   7.5, 'Studio, une pièce'),
  ('6 m²',   6,  15.0, 'Deux pièces'),
  ('10 m²', 10,  25.0, 'Trois pièces'),
  ('15 m²', 15,  37.5, 'Maison, ou stock professionnel');

-- ── 3. Les tarifs ────────────────────────────────────────────────────────────
-- Montants en CENTIMES. 89,00 € s'écrit 8900. Jamais de virgule ici.
-- Un tarif ne s'écrase pas : pour changer un prix, on insère une nouvelle ligne
-- avec un applicable_du postérieur, et on ferme l'ancienne par applicable_au.
insert into public.tarif (categorie_id, montant_mensuel_cents, applicable_du)
select id,
       case nom
         when '1 m²'  then 2900
         when '3 m²'  then 4900
         when '6 m²'  then 7900
         when '10 m²' then 11900
         when '15 m²' then 15900
       end,
       date '2026-01-01'
from public.categorie_box;

-- ── 4. Les box ───────────────────────────────────────────────────────────────
-- Le code est ce qui est écrit sur la porte : c'est la référence que le client
-- utilise au téléphone. Il doit correspondre au local, pas à une numérotation
-- inventée ici.
--
-- Création en série pour éviter de taper soixante lignes. Exemple : douze box
-- de 6 m² au rez-de-chaussée, codés A-01 à A-12.
insert into public.box (site_id, categorie_id, code, etage)
select s.id,
       c.id,
       'A-' || lpad(n::text, 2, '0'),
       'Rez-de-chaussée'
from public.site s
cross join public.categorie_box c
cross join generate_series(1, 12) as n
where s.nom = 'Entrepôt principal'
  and c.nom = '6 m²';

-- Vérification avant de valider : le compte doit correspondre au local réel.
select c.nom as categorie, count(*) as nombre_de_box
from public.box b
join public.categorie_box c on c.id = b.categorie_id
group by c.nom
order by c.nom;

-- Remplacer par « commit; » une fois le compte vérifié.
rollback;
