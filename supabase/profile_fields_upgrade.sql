-- Run this in Supabase SQL Editor before using the upgraded Profile page.
alter table public.profiles add column if not exists years_of_experience text;
alter table public.profiles add column if not exists specialization text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists zip text;
alter table public.profiles add column if not exists signature_name text;
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists license_state text;
alter table public.profiles add column if not exists logo_url text;
