-- Rues parcourues à la place des positions brutes (T22).
-- À coller une fois dans Supabase : SQL Editor, New query, Run.
-- À lancer seulement APRÈS avoir installé la version de l'app qui ne synchronise plus
-- les points : l'ancienne version échouerait sur la table points disparue.
--
-- Le serveur ne garde plus que des rues, des jours et des chiffres, jamais une position :
-- - rues_parcourues : chaque bout de rue parcouru, avec la première et la dernière fois ;
-- - passages_jours : les jours où l'on est passé sur chaque bout de rue, jamais l'heure ;
-- - stats_jours : les mètres et les pas d'une journée.
-- Puis la table points est supprimée, avec toutes les positions déjà envoyées.
-- Sécurité par ligne : chacun ne lit et n'écrit que ses propres lignes.

-- Un bout de rue est désigné par « voie-partie », deux nombres du réseau embarqué dans l'app.

create table public.rues_parcourues (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  segment_id text not null check (segment_id ~ '^[0-9]{1,10}-[0-9]{1,5}$'),
  premiere_fois timestamptz not null,
  derniere_fois timestamptz not null,
  nb_passages integer not null check (nb_passages between 1 and 1000000),
  check (premiere_fois >= '2024-01-01' and derniere_fois >= premiere_fois),
  check (derniere_fois <= now() + interval '1 day'),
  primary key (user_id, segment_id)
);

create table public.passages_jours (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  segment_id text not null check (segment_id ~ '^[0-9]{1,10}-[0-9]{1,5}$'),
  jour date not null check (jour >= '2024-01-01' and jour <= current_date + 1),
  primary key (user_id, segment_id, jour)
);

create table public.stats_jours (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jour date not null check (jour >= '2024-01-01' and jour <= current_date + 1),
  metres real not null default 0 check (metres between 0 and 300000),
  pas integer not null default 0 check (pas between 0 and 300000),
  primary key (user_id, jour)
);

alter table public.rues_parcourues enable row level security;
alter table public.passages_jours enable row level security;
alter table public.stats_jours enable row level security;

-- Les visiteurs sans compte n'ont aucun droit sur ces tables.
revoke all on public.rues_parcourues from anon;
revoke all on public.passages_jours from anon;
revoke all on public.stats_jours from anon;

create policy "rues : lire les siennes" on public.rues_parcourues
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "rues : ajouter les siennes" on public.rues_parcourues
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rues : modifier les siennes" on public.rues_parcourues
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rues : supprimer les siennes" on public.rues_parcourues
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "passages : lire les siens" on public.passages_jours
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "passages : ajouter les siens" on public.passages_jours
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "passages : supprimer les siens" on public.passages_jours
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "stats : lire les siennes" on public.stats_jours
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "stats : ajouter les siennes" on public.stats_jours
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "stats : modifier les siennes" on public.stats_jours
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "stats : supprimer les siennes" on public.stats_jours
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Plus aucune position brute sur le serveur : la table et tout son contenu disparaissent.
-- Irréversible, choix validé par Enzo le 17 novembre 2026.
drop table if exists public.points;
