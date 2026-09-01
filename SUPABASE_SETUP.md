# Configuração do Afago no Supabase

Para usar fotos de produtos pelo painel, o projeto usa o Supabase Storage.

## 1. Coluna da foto

Na tabela `public.produtos`, crie uma coluna:

```sql
alter table public.produtos
add column if not exists imagem text;
```

## 2. Bucket de imagens

No Supabase, abra **Storage > New bucket** e crie um bucket chamado:

`produtos`

Deixe o bucket como **Public** para que as fotos apareçam no site público.

## 3. Permissões do Storage

O upload é feito pelo usuário autenticado do painel. A leitura precisa ser pública. Se o upload for bloqueado, crie uma policy de INSERT para usuários autenticados no bucket `produtos`.

Exemplo:

```sql
create policy "admins podem enviar imagens de produtos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'produtos');
```

A policy pode ser restringida depois para usuários/roles específicos.

## 4. Ocultar produtos

Para esconder um produto da loja (quando acabar, por exemplo), crie a coluna:

```sql
alter table public.produtos
add column if not exists oculto boolean default false;
```

No painel, use **Ocultar do site** ou a opção no formulário do produto. O item continua no admin e some da loja pública.

## 5. Recuperação de senha do painel

O login usa Supabase Auth. Para “Esqueci minha senha” e o envio após 5 tentativas:

1. Em **Authentication > URL Configuration**, adicione a URL do painel em **Redirect URLs**, por exemplo:
   - `https://seu-dominio/admin/admin.html`
   - `http://localhost:5500/admin/admin.html`
2. Confirme se o provedor de e-mail está ativo em **Authentication > Emails**.
3. O e-mail enviado traz o passo a passo e um link de acesso provisório. Depois de entrar, a dona deve trocar a senha em **Configurações**.

## 6. Resultado

Depois disso, no painel:

- escolha uma foto no celular ou PC;
- veja a prévia;
- salve o produto;
- a foto é enviada para o Storage;
- o endereço público é salvo em `produtos.imagem`;
- o site usa automaticamente essa foto no mesmo card visual dos produtos existentes;
- produtos marcados como ocultos não aparecem na loja.
