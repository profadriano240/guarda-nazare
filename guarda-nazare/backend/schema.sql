-- ================================================
-- GUARDA DE NOSSA SENHORA DE NAZARÉ
-- Script de criação do banco de dados
-- ================================================

-- Tabela de usuários (coordenadores)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  login VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'coordenador',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de guardas
CREATE TABLE IF NOT EXISTS guardas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  telefone VARCHAR(20),
  status VARCHAR(10) DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de missões
CREATE TABLE IF NOT EXISTS missoes (
  id SERIAL PRIMARY KEY,
  comunidade VARCHAR(300) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  lider_id INTEGER REFERENCES guardas(id),
  lider_funcao VARCHAR(200),
  observacoes TEXT,
  login VARCHAR(20) UNIQUE NOT NULL,
  senha VARCHAR(50) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de guardas por missão
CREATE TABLE IF NOT EXISTS missao_guardas (
  id SERIAL PRIMARY KEY,
  missao_id INTEGER REFERENCES missoes(id) ON DELETE CASCADE,
  guarda_id INTEGER REFERENCES guardas(id),
  funcao VARCHAR(200),
  UNIQUE(missao_id, guarda_id)
);

-- Tabela de presenças
CREATE TABLE IF NOT EXISTS presencas (
  id SERIAL PRIMARY KEY,
  missao_id INTEGER REFERENCES missoes(id) ON DELETE CASCADE,
  guarda_id INTEGER REFERENCES guardas(id),
  presente BOOLEAN,
  registrado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(missao_id, guarda_id)
);

-- Usuário coordenador padrão (senha: guarda2024)
INSERT INTO usuarios (nome, login, senha_hash, tipo)
VALUES (
  'Coordenador Geral',
  'coordenador',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'coordenador'
) ON CONFLICT (login) DO NOTHING;
