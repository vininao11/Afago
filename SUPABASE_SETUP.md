# Configuração do Afago no Supabase

## 1. Tabelas e colunas necessárias

Crie as tabelas no **SQL Editor** com os comandos abaixo. Se as tabelas já existirem, os comandos `add column if not exists` são seguros e só adicionam o que faltar.

### 1.1 Tabela `massagens`
```sql
create table if not exists public.massagens (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  cat text,
  title text not null,
  duration text,
  price numeric,
  descricao text,
  icon text default 'icon-touch'
);

alter table public.massagens enable row level security;

create policy "leitura pública de massagens"
on public.massagens for select
to public using (true);

create policy "admins gerenciam massagens"
on public.massagens for all
to authenticated using (true) with check (true);
```

### 1.2 Tabela `pacotes`
```sql
create table if not exists public.pacotes (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  title text not null,
  sessoes text,
  duracao text,
  de numeric,
  por numeric,
  economia numeric,
  icon text default 'icon-flower',
  featured boolean default false
);

alter table public.pacotes enable row level security;

create policy "leitura pública de pacotes"
on public.pacotes for select
to public using (true);

create policy "admins gerenciam pacotes"
on public.pacotes for all
to authenticated using (true) with check (true);
```

### 1.3 Tabela `produtos`
```sql
create table if not exists public.produtos (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  cat text,
  title text not null,
  descricao text,
  price numeric,
  bg text default 'bg-clay',
  icon text default 'icon-flower',
  imagem text,
  oculto boolean default false
);

alter table public.produtos enable row level security;

create policy "leitura pública de produtos"
on public.produtos for select
to public using (true);

create policy "admins gerenciam produtos"
on public.produtos for all
to authenticated using (true) with check (true);
```

### 1.4 Tabelas auxiliares (opcionais)
```sql
-- Agendamentos recebidos pelo site
create table if not exists public.agendamentos (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  servico text,
  data text,
  horario text,
  nome text,
  whatsapp text,
  observacoes text,
  status text default 'pendente',
  tipo text default 'agendamento',
  itens text,
  total numeric
);

alter table public.agendamentos enable row level security;

create policy "qualquer um pode criar agendamento"
on public.agendamentos for insert
to public with check (true);

create policy "admins leem agendamentos"
on public.agendamentos for select
to authenticated using (true);

create policy "admins atualizam agendamentos"
on public.agendamentos for update
to authenticated using (true) with check (true);

-- Se a tabela agendamentos já existe, rode também:
alter table public.agendamentos add column if not exists tipo text default 'agendamento';
alter table public.agendamentos add column if not exists itens text;
alter table public.agendamentos add column if not exists total numeric;

-- Mensagens de contato recebidas
create table if not exists public.contatos (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  nome text,
  whatsapp text,
  mensagem text
);

alter table public.contatos enable row level security;

create policy "qualquer um pode enviar contato"
on public.contatos for insert
to public with check (true);

create policy "admins leem contatos"
on public.contatos for select
to authenticated using (true);
```

## 2. Bucket de imagens (Storage)

No Supabase, abra **Storage > New bucket** e crie um bucket chamado:
`produtos`

Deixe o bucket como **Public** para que as fotos apareçam no site público.

O bucket sozinho **não basta**. Na sua tela, `POLICIES = 0` significa que o envio de foto será bloqueado.

### Opção A — pelo painel (mais fácil)

1. Abra **Storage**
2. Clique na aba **Policies** (ao lado de Buckets)
3. Em `produtos`, crie 2 políticas:

**1. Leitura pública**
- Policy name: `leitura pública de imagens de produtos`
- Allowed operation: `SELECT`
- Target roles: `public`
- Policy definition: `bucket_id = 'produtos'`

**2. Upload de admin**
- Policy name: `admins podem enviar imagens de produtos`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `bucket_id = 'produtos'`

### Opção B — SQL Editor

Rode **todas** as políticas abaixo. Sem elas, o painel altera preço, mas **falha ao enviar foto**.

```sql
drop policy if exists "admins podem enviar imagens de produtos" on storage.objects;
drop policy if exists "admins podem atualizar imagens de produtos" on storage.objects;
drop policy if exists "admins podem remover imagens de produtos" on storage.objects;
drop policy if exists "leitura pública de imagens de produtos" on storage.objects;

create policy "admins podem enviar imagens de produtos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'produtos');

create policy "admins podem atualizar imagens de produtos"
on storage.objects
for update
to authenticated
using (bucket_id = 'produtos')
with check (bucket_id = 'produtos');

create policy "admins podem remover imagens de produtos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'produtos');

create policy "leitura pública de imagens de produtos"
on storage.objects
for select
to public
using (bucket_id = 'produtos');
```

Depois disso, em Storage > Buckets, a coluna **POLICIES** do bucket `produtos` precisa ser maior que 0.

## 3. Realtime (atualização automática no site)

Para que o site atualize automaticamente quando você alterar algo no painel:

1. No Supabase, abra **Database > Replication**
2. Clique em **0 tables** ao lado de "supabase_realtime"
3. Marque as tabelas: **massagens**, **pacotes**, **produtos**
4. Clique em **Save**

Pronto! Agora ao editar um preço no painel, o site atualiza sozinho sem precisar de F5.

## 4. Recuperação de senha do painel

O login usa Supabase Auth. Para "Esqueci minha senha":

1. Em **Authentication > URL Configuration**, adicione a URL do painel em **Redirect URLs**:
   - `https://seu-dominio/admin/admin.html`
   - `http://localhost:5500/admin/admin.html`
2. Confirme se o provedor de e-mail está ativo em **Authentication > Emails**.

## 5. Resumo rápido

| O que fazer | Onde |
|---|---|
| Criar tabelas | SQL Editor → rodar scripts do item 1 |
| Habilitar Realtime | Database → Replication → marcar 3 tabelas |
| Criar bucket de fotos | Storage → New bucket → "produtos" (público) |
| Confirmação de e-mail | SQL Editor → `update auth.users set email_confirmed_at = now() where email = 'carlathaispacheco@gmail.com';` |
