-- Tables de sauvegarde de la collection (utilisées par la synchronisation, T13).
-- Chaque ligne appartient à un utilisateur. La sécurité par ligne (RLS) est activée
-- partout : un utilisateur connecté ne lit et n'écrit que ses propres lignes, et un
-- visiteur sans compte n'a accès à rien.
-- À coller une fois dans Supabase : SQL Editor, New query, Run.

-- Cartes débloquées : une ligne par lieu et par utilisateur.
create table public.cartes_debloquees (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lieu_id text not null check (lieu_id ~ '^[a-z0-9-]{1,64}$'),
  debloquee_le timestamptz not null,
  primary key (user_id, lieu_id)
);

-- Points GPS. Données sensibles : elles ne seront envoyées qu'avec l'accord explicite
-- de l'utilisateur (interrupteur prévu au T13).
create table public.points (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  precision_m real not null check (precision_m >= 0 and precision_m <= 1000),
  horodatage timestamptz not null,
  unique (user_id, horodatage)
);

create index points_user_horodatage on public.points (user_id, horodatage);

alter table public.cartes_debloquees enable row level security;
alter table public.points enable row level security;

-- Les visiteurs sans compte n'ont aucun droit sur ces tables.
revoke all on public.cartes_debloquees from anon;
revoke all on public.points from anon;

-- Règles : uniquement ses propres lignes, pour chaque opération.
-- « (select auth.uid()) » est évalué une seule fois par requête, plus rapide qu'à chaque ligne.

create policy "cartes : lire les siennes" on public.cartes_debloquees
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cartes : ajouter les siennes" on public.cartes_debloquees
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cartes : modifier les siennes" on public.cartes_debloquees
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cartes : supprimer les siennes" on public.cartes_debloquees
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "points : lire les siens" on public.points
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "points : ajouter les siens" on public.points
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "points : modifier les siens" on public.points
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "points : supprimer les siens" on public.points
  for delete to authenticated using ((select auth.uid()) = user_id);
