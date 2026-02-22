# 📋 Guia de Deploy – Guarda de N. Sra. de Nazaré

## ESTRUTURA DO PROJETO

```
guarda-nazare/
├── backend/
│   ├── server.js          ← Servidor principal
│   ├── schema.sql         ← Cria as tabelas no banco
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── public/
│       └── index.html     ← Aplicação web
└── .gitignore
```

---

## PASSO 1 – Colocar o projeto no GitHub

1. Acesse https://github.com e faça login
2. Clique em **"New repository"** (botão verde)
3. Dê o nome: `guarda-nazare`
4. Deixe como **Public**, clique em **Create repository**
5. Na próxima tela, clique em **"uploading an existing file"**
6. Arraste **todos os arquivos e pastas** do projeto para a área de upload
7. Clique em **Commit changes**

---

## PASSO 2 – Criar o banco de dados no Railway

1. Acesse https://railway.app e faça login com sua conta GitHub
2. Clique em **"New Project"**
3. Selecione **"Provision PostgreSQL"**
4. Aguarde criar. Depois clique no banco criado
5. Clique na aba **"Query"**
6. Cole todo o conteúdo do arquivo `backend/schema.sql` e clique **Run**
   - Isso vai criar todas as tabelas e o usuário coordenador padrão

---

## PASSO 3 – Fazer o deploy do backend no Railway

1. Ainda no Railway, clique em **"New"** → **"GitHub Repo"**
2. Selecione o repositório `guarda-nazare`
3. O Railway vai detectar o projeto. Em **"Root Directory"** coloque: `backend`
4. Clique em **Deploy**
5. Após subir, clique no serviço e vá em **"Variables"**
6. Adicione as variáveis de ambiente:

   | Variável       | Valor                                              |
   |----------------|----------------------------------------------------|
   | `DATABASE_URL` | (copie de: banco PostgreSQL → aba Connect → DATABASE_URL) |
   | `JWT_SECRET`   | (crie uma senha longa qualquer, ex: `NzrGuarda@2024Secreta!`) |
   | `PORT`         | `3000`                                             |

7. O Railway vai fazer o redeploy automaticamente
8. Vá em **"Settings"** → **"Domains"** → clique em **"Generate Domain"**
9. Copie a URL gerada (ex: `https://guarda-nazare-production.up.railway.app`)

---

## PASSO 4 – Configurar o frontend

1. Abra o arquivo `frontend/public/index.html`
2. Encontre esta linha (próximo ao início do `<script>`):
   ```javascript
   const API = ''; // mesmo domínio
   ```
3. Substitua pela URL do Railway:
   ```javascript
   const API = 'https://guarda-nazare-production.up.railway.app';
   ```
4. Salve e faça upload do arquivo atualizado no GitHub

---

## PASSO 5 – Hospedar o frontend (Netlify Drop – grátis)

1. Acesse https://netlify.com e crie uma conta gratuita
2. Na tela inicial, role até ver **"Deploy manually"**
3. Arraste a pasta `frontend/public/` para lá
4. Pronto! Você receberá uma URL como `https://nazare-missoes.netlify.app`

---

## ACESSO AO SISTEMA

| Perfil         | Login        | Senha       |
|----------------|--------------|-------------|
| Coordenador    | coordenador  | guarda2024  |

> ⚠️ **Importante:** Após o primeiro acesso, troque a senha do coordenador diretamente no banco de dados pelo painel do Railway (aba Query), rodando:
> ```sql
> UPDATE usuarios SET senha_hash = '$2a$10$SEU_HASH' WHERE login = 'coordenador';
> ```
> Use um site como https://bcrypt-generator.com para gerar o hash da nova senha.

---

## DÚVIDAS COMUNS

**O sistema não conecta ao banco?**
- Verifique se a variável `DATABASE_URL` está correta no Railway

**Erro 401 ao fazer login?**
- Confirme que rodou o `schema.sql` completo no banco

**Frontend não acessa o backend?**
- Confirme que a variável `API` no `index.html` aponta para a URL correta do Railway
