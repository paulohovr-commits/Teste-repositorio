# Mini sistema de login (Vercel + Supabase)

Um sistema pequeno para aprender a hospedar um site ligado a um banco de dados.

- **Tela de login** (e-mail e senha)
- **Dois níveis de usuário**, e cada um abre a sua tela:
  - **Administrador** → `admin.html`: entra, **cadastra** e **exclui** usuários, e sai
  - **Comum** → `usuario.html`: só entra e sai

## Como funciona

```
Navegador (HTML + JS)              Vercel (pasta api/)                 Supabase
─────────────────────              ───────────────────                 ────────
index.html  ── login ──────────────────────────────────────────────▶  Auth (e-mail/senha)
            ── lê o próprio perfil (papel) ────────────────────────▶  tabela perfis (RLS)
admin.html  ── /api/usuarios ──▶  confere se é admin  ── chave ────▶  cria / lista / exclui
                                   (chave secreta)        secreta
usuario.html   só mostra "Olá" e o botão Sair
```

- O **login** usa o Supabase Auth direto do navegador, com a chave **pública** (anon).
- O **papel** (`admin` ou `comum`) fica na tabela `perfis`. Pelo navegador, cada um só consegue
  ler o próprio perfil (isso é o **RLS**, a segurança do banco).
- **Cadastrar e excluir** precisam da chave **secreta** (service_role). Por isso essas ações
  ficam nas funções da pasta `api/`, que rodam no servidor da Vercel. Antes de fazer qualquer coisa,
  a função confere se quem pediu é admin. Assim a chave secreta nunca vai para o navegador.

## Arquivos

```
sistema-login/
  public/
    index.html        tela de login
    admin.html        tela do administrador (cadastrar, listar, excluir)
    usuario.html      tela do usuário comum
    app.js            funções usadas pelas 3 telas (login, sair, proteger página)
    style.css         visual
  api/
    config.js         GET /api/config → entrega a URL e a chave pública
    usuarios.js       GET/POST/DELETE /api/usuarios → só para admin
    _supabase.js      conecta com a chave secreta e confere se é admin
  supabase/
    setup.sql         cria a tabela perfis, a segurança e o gatilho
  package.json        dependência: @supabase/supabase-js
  vercel.json         diz para a Vercel servir a pasta public/
```

---

## Passo a passo para colocar no ar

### 1. Supabase: criar o banco

1. Entre em [supabase.com](https://supabase.com) → **New project**. Escolha um nome, uma senha
   para o banco e a região (São Paulo, se tiver). Espere uns 2 minutos até ele ficar pronto.
2. No menu da esquerda, abra **SQL Editor** → **New query**.
3. Copie **todo** o conteúdo de [`supabase/setup.sql`](supabase/setup.sql), cole e clique **Run**.
   Deve aparecer *Success. No rows returned*.

### 2. Supabase: criar o seu usuário administrador

1. Menu **Authentication → Users → Add user → Create new user**.
2. Coloque o seu e-mail e uma senha, marque **Auto Confirm User** e clique em **Create user**.
3. Volte no **SQL Editor**, troque o e-mail e rode:
   ```sql
   update public.perfis set papel = 'admin', nome = 'Administrador'
   where email = 'seu.email@exemplo.com';
   ```
   Deve aparecer *Success. 1 row affected* (se vier 0, o e-mail está diferente).

### 3. Supabase: bloquear cadastro público (recomendado)

Como só o admin deve criar usuários: **Authentication → Sign In / Providers** (ou *Settings*)
→ desligue **Allow new users to sign up** e salve. A tela de admin continua cadastrando
normalmente, porque usa a chave secreta.

### 4. Supabase: copiar as chaves

Abra **Project Settings → API** (em projetos novos, **Project Settings → API Keys**) e anote:

| O que é | Nome no Supabase | Vai na variável |
|---|---|---|
| URL do projeto | **Project URL** (`https://xxxx.supabase.co`) | `SUPABASE_URL` |
| Chave pública | **anon public** (ou **publishable**, `sb_publishable_...`) | `SUPABASE_ANON_KEY` |
| Chave secreta | **service_role** (ou **secret**, `sb_secret_...`) | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ A chave **secreta** dá acesso total ao banco. Ela só vai na Vercel. Nunca a coloque em um
> arquivo do GitHub nem no código das telas.

### 5. Vercel: publicar o site

1. Entre em [vercel.com](https://vercel.com) → **Add New… → Project** → importe este repositório
   do GitHub (`Teste-repositorio`).
2. Em **Root Directory**, clique em **Edit** e escolha a pasta **`sistema-login`**. Isso é
   importante, porque a raiz do repositório tem outro projeto.
3. **Framework Preset**: deixe **Other**.
4. Abra **Environment Variables** e adicione as 3 variáveis da tabela acima.
5. Clique em **Deploy**. Em cerca de 1 minuto você recebe um endereço como
   `https://sistema-login-xxxx.vercel.app`.

> Se você mudar uma variável depois, vá em **Deployments → ⋯ → Redeploy** para ela valer.

### 6. Testar

1. Abra o endereço da Vercel e entre com o e-mail e a senha do passo 2. Deve abrir o
   **Painel do Administrador**.
2. Cadastre um usuário com nível **Comum**.
3. Clique em **Sair** e entre com esse usuário novo. Deve abrir a **Área do Usuário**, que só tem
   o botão **Sair**.
4. Ainda logado como comum, tente abrir `/admin.html` no endereço. O sistema manda você de volta
   para a sua tela. E se alguém tentar chamar `/api/usuarios` direto, recebe *"Só administradores
   podem fazer isso."*

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| *Configure SUPABASE_URL e SUPABASE_ANON_KEY…* | Faltam variáveis na Vercel. Adicione e faça **Redeploy**. |
| *Faltam as variáveis … SUPABASE_SERVICE_ROLE_KEY* | Falta a chave secreta na Vercel. Adicione e faça **Redeploy**. |
| *E-mail ou senha incorretos.* | Confira os dados. Se criou pelo painel, marcou **Auto Confirm User**? |
| *Seu usuário não tem perfil.* | O `setup.sql` não rodou. Rode de novo (ele pode rodar mais de uma vez). |
| Entra, mas abre a tela de comum | Faltou o `update … set papel = 'admin'` do passo 2. |
| Página 404 na Vercel | O **Root Directory** não está como `sistema-login`. |

## Ideias para continuar aprendendo

- Botão para o admin **trocar o nível** de um usuário (rota `PATCH` em `api/usuarios.js`).
- Tela "esqueci minha senha" com `supabase.auth.resetPasswordForEmail`.
- Uma tabela nova (ex.: `tarefas`) com RLS para cada usuário ver só as suas.
