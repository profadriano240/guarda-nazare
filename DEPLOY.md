# 📋 Deploy – Netlify Functions + Supabase

## ESTRUTURA
```
guarda-nazare/
├── public/
│   └── index.html          ← Frontend
├── netlify/
│   └── functions/
│       ├── db.js           ← Conexão com banco
│       ├── login.js        ← API de login
│       ├── guardas.js      ← API de guardas
│       ├── missoes.js      ← API de missões
│       ├── presencas.js    ← API de presenças
│       └── relatorio.js    ← API de relatórios
├── netlify.toml            ← Configuração do Netlify
└── package.json
```

---

## PASSO 1 – Pegar a Connection String do Supabase

1. Acesse https://supabase.com → seu projeto
2. Clique em **"Settings"** → **"Database"**
3. Role até **"Connection string"**
4. Selecione **"URI"**
5. Copie a string (substitua `[YOUR-PASSWORD]` pela sua senha)

---

## PASSO 2 – Subir no GitHub

1. Acesse https://github.com
2. Crie um novo repositório: `guarda-nazare`
3. Faça upload de todos os arquivos desta pasta

---

## PASSO 3 – Conectar ao Netlify

1. Acesse https://netlify.com → **"Add new site"** → **"Import from Git"**
2. Selecione o repositório `guarda-nazare`
3. **Build settings:**
   - Build command: (deixe vazio)
   - Publish directory: `public`
4. Clique em **"Deploy site"**

---

## PASSO 4 – Adicionar variáveis de ambiente no Netlify

1. No Netlify → seu site → **"Site configuration"** → **"Environment variables"**
2. Clique em **"Add variable"** e adicione:

| Chave | Valor |
|---|---|
| `DATABASE_URL` | (sua connection string do Supabase) |
| `JWT_SECRET` | `NzrGuarda@2024Secreta!` |

3. Clique em **"Save"**
4. Vá em **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

---

## ACESSO

| Perfil | Login | Senha |
|---|---|---|
| Coordenador | coordenador | guarda2024 |
