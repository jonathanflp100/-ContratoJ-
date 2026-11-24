-- ContratoJá · schema do Supabase
-- Rode este arquivo uma vez em: Supabase → SQL Editor → New query → Run.
--
-- Só o servidor (com a SERVICE_ROLE_KEY) lê e grava estas tabelas.
-- O RLS fica ligado SEM políticas: o navegador, com a chave anon,
-- não consegue ler nada diretamente. Tudo passa pelo server.ts.

create table if not exists public.workspaces (
  owner_id     uuid primary key references auth.users (id) on delete cascade,
  owner_email  text not null default '',
  data         jsonb not null,              -- snapshot completo da empresa
  credits      integer not null default 0 check (credits >= 0),
  transactions jsonb not null default '[]', -- extrato de créditos (controlado pelo servidor)
  meta         jsonb not null default '{}', -- ids de contratos que já gastaram crédito etc.
  version      integer not null default 1,  -- trava otimista contra gravações simultâneas
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índice para achar o contrato a partir do link de assinatura / código / hash.
create table if not exists public.contract_index (
  contract_id   text primary key,
  owner_id      uuid not null references public.workspaces (owner_id) on delete cascade,
  code          text not null,
  document_hash text,
  status        text
);

create index if not exists contract_index_owner_idx on public.contract_index (owner_id);
create index if not exists contract_index_code_idx  on public.contract_index (code);
create index if not exists contract_index_hash_idx  on public.contract_index (document_hash);

alter table public.workspaces     enable row level security;
alter table public.contract_index enable row level security;
-- (sem policies de propósito)
