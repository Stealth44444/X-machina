-- Gymspire Studio — Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor

create extension if not exists "uuid-ossp";

-- Channels
create table channels (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  topic text,
  description text,
  color text not null default '#2B9BF4',
  emoji text not null default '💪',
  instagram_handle text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Seed GYMSPIRE channel (fixed UUID for migration reference)
insert into channels (id, name, topic, description, color, emoji, instagram_handle) values
  ('00000000-0000-0000-0000-000000000001',
   'GYMSPIRE', 'fitness',
   '짐샤크 한국 공식 인스타그램 @gymspire.kr. 짐샤크 브랜드·선수·문화 전문 콘텐츠. 한국 피트니스 팬덤 커뮤니티.',
   '#2B9BF4', '💪', '@gymspire.kr');

-- Presets
create table presets (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references channels(id) on delete cascade,
  name text not null,
  slides_json jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Posts
create table posts (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references channels(id) on delete cascade,
  preset_id uuid references presets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  caption text default '',
  hashtags text[] default '{}',
  instagram_post_id text,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- RLS
alter table channels enable row level security;
alter table presets enable row level security;
alter table posts enable row level security;

create policy "auth_all_channels" on channels for all to authenticated using (true) with check (true);
create policy "auth_all_presets"  on presets  for all to authenticated using (true) with check (true);
create policy "auth_all_posts"    on posts     for all to authenticated using (true) with check (true);

-- Storage bucket (create via Dashboard > Storage, or run here)
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true)
on conflict do nothing;

create policy "auth_upload_images" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images');

create policy "public_read_images" on storage.objects for select
  using (bucket_id = 'post-images');

create policy "auth_delete_images" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images');
