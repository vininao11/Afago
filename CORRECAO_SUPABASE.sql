-- =============================================================
-- CORREÇÃO DEFINITIVA - Afago x Supabase
-- =============================================================
-- Cole todo este arquivo no SQL Editor do Supabase e execute.
-- Ele:
--   1. Garante que o RLS esteja habilitado em todas as tabelas
--   2. Remove políticas antigas conflitantes
--   3. Recria as políticas certas para site (anon) e painel (authenticated)
--   4. Adiciona colunas usadas pelo painel/site caso não existam
--   5. Publica todas as tabelas no Realtime
--
-- Depois de rodar isso o site consegue criar agendamentos/contatos
-- e o painel consegue ler tudo e editar massagens/pacotes/produtos.
-- =============================================================

-- ---------- MASSAGENS ----------
alter table if exists public.massagens enable row level security;
drop policy if exists "leitura pública de massagens" on public.massagens;
drop policy if exists "admins gerenciam massagens"  on public.massagens;
create policy "leitura pública de massagens"
  on public.massagens for select to anon, authenticated using (true);
create policy "admins gerenciam massagens"
  on public.massagens for all to authenticated using (true) with check (true);

-- ---------- PACOTES ----------
alter table if exists public.pacotes enable row level security;
drop policy if exists "leitura pública de pacotes" on public.pacotes;
drop policy if exists "admins gerenciam pacotes"  on public.pacotes;
create policy "leitura pública de pacotes"
  on public.pacotes for select to anon, authenticated using (true);
create policy "admins gerenciam pacotes"
  on public.pacotes for all to authenticated using (true) with check (true);

-- ---------- PRODUTOS ----------
alter table if exists public.produtos add column if not exists imagem text;
alter table if exists public.produtos add column if not exists oculto boolean default false;
alter table if exists public.produtos enable row level security;
drop policy if exists "leitura pública de produtos" on public.produtos;
drop policy if exists "admins gerenciam produtos"  on public.produtos;
create policy "leitura pública de produtos"
  on public.produtos for select to anon, authenticated using (true);
create policy "admins gerenciam produtos"
  on public.produtos for all to authenticated using (true) with check (true);

-- ---------- AGENDAMENTOS ----------
-- garante colunas usadas pelo site
alter table if exists public.agendamentos add column if not exists tipo         text default 'agendamento';
alter table if exists public.agendamentos add column if not exists itens        text;
alter table if exists public.agendamentos add column if not exists total        numeric;
alter table if exists public.agendamentos add column if not exists observacoes  text;
alter table if exists public.agendamentos add column if not exists status       text default 'pendente';

alter table if exists public.agendamentos enable row level security;
drop policy if exists "qualquer um pode criar agendamento" on public.agendamentos;
drop policy if exists "admins leem agendamentos"           on public.agendamentos;
drop policy if exists "admins atualizam agendamentos"      on public.agendamentos;
drop policy if exists "admins deletam agendamentos"        on public.agendamentos;

-- Site (anon) pode CRIAR agendamento
create policy "qualquer um pode criar agendamento"
  on public.agendamentos for insert to anon, authenticated with check (true);
-- Painel (authenticated) LÊ tudo
create policy "admins leem agendamentos"
  on public.agendamentos for select to authenticated using (true);
-- Painel ATUALIZA (mudar status, confirmar etc.)
create policy "admins atualizam agendamentos"
  on public.agendamentos for update to authenticated using (true) with check (true);
-- Painel DELETA (opcional)
create policy "admins deletam agendamentos"
  on public.agendamentos for delete to authenticated using (true);

-- ---------- CONTATOS ----------
alter table if exists public.contatos enable row level security;
drop policy if exists "qualquer um pode enviar contato" on public.contatos;
drop policy if exists "admins leem contatos"            on public.contatos;
drop policy if exists "admins deletam contatos"         on public.contatos;

create policy "qualquer um pode enviar contato"
  on public.contatos for insert to anon, authenticated with check (true);
create policy "admins leem contatos"
  on public.contatos for select to authenticated using (true);
create policy "admins deletam contatos"
  on public.contatos for delete to authenticated using (true);

-- ---------- EXPEDIENTE ----------
alter table if exists public.expediente enable row level security;
drop policy if exists "leitura pública de expediente" on public.expediente;
drop policy if exists "admins gerenciam expediente"   on public.expediente;
create policy "leitura pública de expediente"
  on public.expediente for select to anon, authenticated using (true);
create policy "admins gerenciam expediente"
  on public.expediente for all to authenticated using (true) with check (true);

-- ---------- INDISPONIBILIDADES ----------
alter table if exists public.indisponibilidades enable row level security;
drop policy if exists "leitura pública de indisponibilidades" on public.indisponibilidades;
drop policy if exists "admins gerenciam indisponibilidades"   on public.indisponibilidades;
create policy "leitura pública de indisponibilidades"
  on public.indisponibilidades for select to anon, authenticated using (true);
create policy "admins gerenciam indisponibilidades"
  on public.indisponibilidades for all to authenticated using (true) with check (true);

-- ---------- STORAGE (fotos de produtos) ----------
-- Cria o bucket "produtos" (pública) se ainda não existir
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "leitura pública de imagens de produtos"       on storage.objects;
drop policy if exists "admins podem enviar imagens de produtos"      on storage.objects;
drop policy if exists "admins podem atualizar imagens de produtos"   on storage.objects;
drop policy if exists "admins podem remover imagens de produtos"     on storage.objects;

create policy "leitura pública de imagens de produtos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'produtos');

create policy "admins podem enviar imagens de produtos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos');

create policy "admins podem atualizar imagens de produtos"
  on storage.objects for update to authenticated
  using (bucket_id = 'produtos') with check (bucket_id = 'produtos');

create policy "admins podem remover imagens de produtos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'produtos');

-- ---------- REALTIME ----------
-- Adiciona todas as tabelas à publicação supabase_realtime
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'massagens','pacotes','produtos',
    'agendamentos','contatos',
    'expediente','indisponibilidades'
  ]) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    when undefined_table then
      null;
    end;
  end loop;
end $$;

-- =============================================================
-- FIM. Se rodou sem erros vermelhos, site + painel já se falam.
-- =============================================================
