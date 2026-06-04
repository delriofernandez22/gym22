-- GYM22 Supabase setup
-- 1) Crea un bucket privado llamado: gym22
-- 2) El backend usará SERVICE_ROLE_KEY, por eso NO expongas esa key en el frontend.
-- 3) Esta tabla es opcional para una migración futura a base de datos relacional.
--    La versión actual guarda perfil/fotos/JSON en Supabase Storage.

create table if not exists public.gym22_clients (
  id uuid primary key default gen_random_uuid(),
  folder_name text unique not null,
  email text unique,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym22_training_events (
  id uuid primary key default gen_random_uuid(),
  folder_name text not null,
  training_id text,
  training_date date,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
