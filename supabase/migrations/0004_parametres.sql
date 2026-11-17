-- Paramètres (T32, partie 1) : réglages de confidentialité et appareils connectés.
-- À coller une fois dans Supabase : SQL Editor, New query, Run.
--
-- Les réglages de confidentialité sont sur le serveur parce qu'ils décident de ce que les
-- autres pourront lire. Pour l'instant personne ne lit les données d'un autre : c'est la
-- fonction profil_ami du T33 qui les appliquera, côté base, jamais seulement dans l'app.
-- Sécurité par ligne : chacun ne lit et ne modifie que ses propres réglages.

create table public.confidentialite (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profil_public boolean not null default false, -- false : amis seulement
  demandes_ouvertes boolean not null default true, -- false : seulement par lien ou QR code
  dans_recherche boolean not null default true, -- trouvable par son username exact
  montrer_timbres boolean not null default true,
  montrer_defis boolean not null default true,
  montrer_quartiers boolean not null default true,
  montrer_stats boolean not null default true, -- kilomètres et pas
  modifie_le timestamptz not null default now()
);

alter table public.confidentialite enable row level security;
revoke all on public.confidentialite from anon;

create policy "confidentialité : lire la sienne" on public.confidentialite
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "confidentialité : créer la sienne" on public.confidentialite
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "confidentialité : modifier la sienne" on public.confidentialite
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Pas de suppression depuis l'app : la ligne part avec le compte.

-- La date de modification est posée par le serveur.
create function public.confidentialite_avant_ecriture() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.modifie_le := now();
  if tg_op = 'UPDATE' then new.user_id := old.user_id; end if;
  return new;
end;
$$;

create trigger confidentialite_avant_ecriture
  before insert or update on public.confidentialite
  for each row execute function public.confidentialite_avant_ecriture();

-- Appareils connectés : les sessions ouvertes du compte qui appelle, et lui seul.
-- Supabase ne donne pas cette liste à l'app : la fonction la lit dans auth.sessions avec
-- les droits du serveur, filtrée sur auth.uid(). Réponse minimale : pas d'adresse IP.
create function public.mes_sessions()
returns table (id uuid, appareil text, cree_le timestamptz, vue_le timestamptz, actuelle boolean)
language sql stable security definer set search_path = '' as $$
  select
    s.id,
    coalesce(s.user_agent, ''),
    s.created_at,
    coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at),
    s.id::text = (auth.jwt() ->> 'session_id')
  from auth.sessions s
  where s.user_id = auth.uid()
  order by 4 desc;
$$;

revoke all on function public.mes_sessions() from public, anon;
grant execute on function public.mes_sessions() to authenticated;
