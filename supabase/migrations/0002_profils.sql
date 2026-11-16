-- Profils (T29) : username, bio, photo. Pas de nom ni de prénom.
-- À coller une fois dans Supabase : SQL Editor, New query, Run.
--
-- Tout est vérifié ici, côté serveur, quelle que soit l'app qui écrit :
-- - username unique sans tenir compte des majuscules, 3 à 20 caractères
--   (lettres, chiffres, point, tiret bas), mots réservés interdits ;
-- - username modifiable une fois tous les 30 jours (le premier choix ne compte pas) ;
-- - bio de 150 caractères au plus ;
-- - la photo n'est jamais écrite par l'app : seule la fonction photo-profil, après
--   avoir vérifié le fichier, peut remplir photo_cle.
-- Sécurité par ligne : chacun ne lit et ne modifie que son profil (les amis viendront plus tard).

create table public.profils (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null,
  bio text not null default '',
  photo_cle text, -- chemin du fichier dans R2, null sans photo
  username_modifie_le timestamptz, -- dernier changement, null tant que c'est le premier choix
  cree_le timestamptz not null default now(),
  constraint username_format check (
    username ~ '^[A-Za-z0-9._]{3,20}$'
    and username !~ '^\.' and username !~ '\.$' and username !~ '\.\.'
  ),
  constraint bio_longueur check (char_length(bio) <= 150),
  constraint photo_chemin check (photo_cle is null or photo_cle ~ '^avatars/[0-9a-f-]{36}\.jpg$')
);

-- Unicité sans tenir compte des majuscules : « Zoa » et « zoa » sont le même username.
create unique index profils_username_unique on public.profils (lower(username));

-- Mots réservés : interdits tels quels, et « balade », « admin » nulle part dans le nom,
-- pour qu'on ne puisse pas se faire passer pour l'app.
create function public.username_reserve(u text) returns boolean
language sql immutable as $$
  select lower(u) = any (array[
    'admin', 'administrateur', 'administrator', 'root', 'support', 'aide', 'help',
    'contact', 'moderateur', 'moderation', 'modo', 'staff', 'equipe', 'team', 'officiel',
    'official', 'system', 'systeme', 'api', 'app', 'null', 'undefined', 'anonyme',
    'anonymous', 'compte', 'profil', 'securite', 'security', 'info', 'infos', 'news',
    'paris', 'ratp', 'sncf', 'idfm', 'supabase', 'expo', 'apple', 'google'
  ]) or lower(u) like '%balade%' or lower(u) like '%admin%';
$$;

-- Avant chaque écriture : mots réservés, délai de 30 jours, et colonnes que l'app
-- ne doit pas pouvoir choisir elle-même.
create function public.profils_avant_ecriture() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.username_reserve(new.username) then
    raise exception 'username_reserve' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.username_modifie_le := null;
    new.cree_le := now();
    return new;
  end if;

  new.user_id := old.user_id;
  new.cree_le := old.cree_le;
  if lower(new.username) <> lower(old.username) or new.username <> old.username then
    if old.username_modifie_le is not null and old.username_modifie_le > now() - interval '30 days' then
      raise exception 'username_30_jours' using errcode = 'P0001';
    end if;
    new.username_modifie_le := now();
  else
    new.username_modifie_le := old.username_modifie_le;
  end if;
  return new;
end;
$$;

create trigger profils_avant_ecriture
  before insert or update on public.profils
  for each row execute function public.profils_avant_ecriture();

alter table public.profils enable row level security;

-- Droits par colonne : l'app peut écrire son username et sa bio, rien d'autre.
-- photo_cle n'est modifiable que par la fonction photo-profil (clé service, côté serveur).
revoke all on public.profils from anon, authenticated;
grant select on public.profils to authenticated;
grant insert (username, bio) on public.profils to authenticated;
grant update (username, bio) on public.profils to authenticated;

create policy "profils : lire le sien" on public.profils
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profils : créer le sien" on public.profils
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profils : modifier le sien" on public.profils
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Pas de suppression depuis l'app : le profil part avec le compte (on delete cascade).
