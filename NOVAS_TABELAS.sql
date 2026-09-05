-- ============================================
-- NOVAS TABELAS PARA FUNCIONALIDADES ADICIONAIS
-- ============================================

-- 1. Tabela de Expediente (horários disponíveis por dia da semana)
create table if not exists public.expediente (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  dia_semana integer not null, -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  horario_inicio text not null, -- ex: '09:00'
  horario_fim text not null, -- ex: '18:00'
  intervalo_entre_atendimentos integer default 60, -- em minutos
  ativo boolean default true
);
alter table public.expediente enable row level security;
create policy "leitura pública de expediente" on public.expediente for select to public using (true);
create policy "admins gerenciam expediente" on public.expediente for all to authenticated using (true) with check (true);

-- Dados padrão para expediente (segunda a sábado, 9h às 18h)
insert into public.expediente (dia_semana, horario_inicio, horario_fim, intervalo_entre_atendimentos, ativo) values
(1, '09:00', '18:00', 60, true),
(2, '09:00', '18:00', 60, true),
(3, '09:00', '18:00', 60, true),
(4, '09:00', '18:00', 60, true),
(5, '09:00', '18:00', 60, true),
(6, '09:00', '12:00', 60, true)
on conflict do nothing;

-- 2. Tabela de Indisponibilidades (dias/horários específicos bloqueados)
create table if not exists public.indisponibilidades (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  data date not null,
  horario_inicio text, -- se null, dia todo indisponível
  horario_fim text, -- se null, dia todo indisponível
  motivo text,
  ativo boolean default true
);
alter table public.indisponibilidades enable row level security;
create policy "leitura pública de indisponibilidades" on public.indisponibilidades for select to public using (true);
create policy "admins gerenciam indisponibilidades" on public.indisponibilidades for all to authenticated using (true) with check (true);

-- 3. Habilitar Realtime para as novas tabelas
-- (No Supabase: Database > Replication > supabase_realtime > marcar expediente e indisponibilidades)
