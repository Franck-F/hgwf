-- Appliqué le 19/09/2026, après une passe du linter de sécurité Supabase.
--
-- `rls_auto_enable` n'est pas de nous : c'est le filet de sécurité de Supabase,
-- un déclencheur d'événement qui active la protection des lignes sur toute
-- table créée dans « public ». On le garde — il protège d'un oubli le jour où
-- une table sera ajoutée sans y penser.
--
-- En revanche il était appelable par `anon` et `authenticated` via
-- /rest/v1/rpc/rls_auto_enable. Un déclencheur d'événement ne s'appelle pas
-- comme une fonction ordinaire, donc l'exposer n'apportait rien et laissait
-- une surface inutile.
--
-- Révoquer EXECUTE n'empêche pas le déclencheur de se déclencher : PostgreSQL
-- ne vérifie pas ce droit pour un déclencheur d'événement. Vérifié en créant
-- une table témoin après la révocation — la protection des lignes s'est bien
-- activée toute seule, puis la table a été supprimée.

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
