-- Trois avertissements du linter de sécurité Supabase, corrigés le 18/09/2026.
-- Après application : aucun avertissement restant.

-- 1. L'extension btree_gist sortait dans le schéma public, donc exposée par l'API.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 2 et 3. La fonction du déclencheur n'a aucune raison d'être SECURITY DEFINER :
-- elle ne fait que lever une exception. En SECURITY DEFINER et dans le schéma
-- public, elle était appelable par n'importe qui via /rest/v1/rpc/.
create or replace function public.mouvement_immuable() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Le journal des mouvements ne se modifie pas et ne s''efface pas.';
end;
$$;

revoke all on function public.mouvement_immuable() from public, anon, authenticated;
