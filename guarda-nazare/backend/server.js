require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'guarda_nazare_secret_2024';

// ── Banco de dados ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// ── Middlewares ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── Auth Middleware ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

function apenasCoord(req, res, next) {
  if (req.user.tipo !== 'coordenador') return res.status(403).json({ erro: 'Acesso negado' });
  next();
}

// ════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════
app.post('/api/login', async (req, res) => {
  const { login, senha, tipo } = req.body;
  try {
    if (tipo === 'coordenador') {
      const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [login]);
      const user = result.rows[0];
      if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' });

      const ok = await bcrypt.compare(senha, user.senha_hash);
      if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

      const token = jwt.sign({ id: user.id, nome: user.nome, tipo: 'coordenador' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, nome: user.nome, tipo: 'coordenador' });

    } else {
      // Login de líder de missão
      const result = await pool.query('SELECT * FROM missoes WHERE login = $1 AND senha = $2', [login, senha]);
      const missao = result.rows[0];
      if (!missao) return res.status(401).json({ erro: 'Credenciais inválidas' });

      // busca nome do líder
      const lider = await pool.query('SELECT nome FROM guardas WHERE id = $1', [missao.lider_id]);

      const token = jwt.sign({
        tipo: 'lider',
        missaoId: missao.id,
        nome: lider.rows[0]?.nome || 'Líder'
      }, JWT_SECRET, { expiresIn: '8h' });

      return res.json({ token, nome: lider.rows[0]?.nome, tipo: 'lider', missaoId: missao.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ════════════════════════════════════════
//  GUARDAS
// ════════════════════════════════════════
app.get('/api/guardas', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guardas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar guardas' });
  }
});

app.post('/api/guardas', authMiddleware, apenasCoord, async (req, res) => {
  const { nome, telefone, status } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    const result = await pool.query(
      'INSERT INTO guardas (nome, telefone, status) VALUES ($1, $2, $3) RETURNING *',
      [nome, telefone || null, status || 'ativo']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar guarda' });
  }
});

app.put('/api/guardas/:id', authMiddleware, apenasCoord, async (req, res) => {
  const { nome, telefone, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE guardas SET nome=$1, telefone=$2, status=$3 WHERE id=$4 RETURNING *',
      [nome, telefone || null, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar guarda' });
  }
});

// ════════════════════════════════════════
//  MISSÕES
// ════════════════════════════════════════
app.get('/api/missoes', authMiddleware, async (req, res) => {
  try {
    const missoes = await pool.query(`
      SELECT m.*, g.nome as lider_nome
      FROM missoes m
      LEFT JOIN guardas g ON g.id = m.lider_id
      ORDER BY m.data DESC
    `);

    const result = [];
    for (const m of missoes.rows) {
      const guardas = await pool.query(`
        SELECT mg.guarda_id as id, g.nome, mg.funcao
        FROM missao_guardas mg
        JOIN guardas g ON g.id = mg.guarda_id
        WHERE mg.missao_id = $1
      `, [m.id]);

      const presencas = await pool.query(
        'SELECT guarda_id, presente FROM presencas WHERE missao_id = $1', [m.id]
      );
      const presMap = {};
      presencas.rows.forEach(p => { presMap[p.guarda_id] = p.presente; });

      result.push({ ...m, guardas: guardas.rows, presencas: presMap });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar missões' });
  }
});

app.get('/api/missoes/:id', authMiddleware, async (req, res) => {
  try {
    const m = await pool.query(`
      SELECT m.*, g.nome as lider_nome
      FROM missoes m LEFT JOIN guardas g ON g.id = m.lider_id
      WHERE m.id = $1`, [req.params.id]);
    if (!m.rows[0]) return res.status(404).json({ erro: 'Missão não encontrada' });

    const guardas = await pool.query(`
      SELECT mg.guarda_id as id, g.nome, mg.funcao
      FROM missao_guardas mg JOIN guardas g ON g.id = mg.guarda_id
      WHERE mg.missao_id = $1`, [req.params.id]);

    const presencas = await pool.query(
      'SELECT guarda_id, presente FROM presencas WHERE missao_id = $1', [req.params.id]);
    const presMap = {};
    presencas.rows.forEach(p => { presMap[p.guarda_id] = p.presente; });

    res.json({ ...m.rows[0], guardas: guardas.rows, presencas: presMap });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar missão' });
  }
});

app.post('/api/missoes', authMiddleware, apenasCoord, async (req, res) => {
  const { comunidade, data, hora, lider_id, lider_funcao, observacoes, guardas } = req.body;
  if (!comunidade || !data || !hora || !lider_id) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Gera login e senha únicos
    const countResult = await client.query('SELECT COUNT(*) FROM missoes');
    const nextId = parseInt(countResult.rows[0].count) + 1;
    const login = 'MISSAO' + String(nextId).padStart(3, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let senha = 'NZR#';
    for (let i = 0; i < 4; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    const missao = await client.query(
      `INSERT INTO missoes (comunidade, data, hora, lider_id, lider_funcao, observacoes, login, senha)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [comunidade, data, hora, lider_id, lider_funcao || null, observacoes || null, login, senha]
    );
    const missaoId = missao.rows[0].id;

    // Insere guardas
    if (guardas && guardas.length > 0) {
      for (const g of guardas) {
        await client.query(
          'INSERT INTO missao_guardas (missao_id, guarda_id, funcao) VALUES ($1,$2,$3)',
          [missaoId, g.id, g.funcao || null]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ...missao.rows[0], login, senha });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar missão' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════
//  PRESENÇAS
// ════════════════════════════════════════
app.post('/api/presencas/:missaoId', authMiddleware, async (req, res) => {
  // Lider só pode salvar a própria missão
  if (req.user.tipo === 'lider' && req.user.missaoId !== parseInt(req.params.missaoId)) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  const { presencas } = req.body; // { guardaId: true/false, ... }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [guardaId, presente] of Object.entries(presencas)) {
      await client.query(`
        INSERT INTO presencas (missao_id, guarda_id, presente)
        VALUES ($1, $2, $3)
        ON CONFLICT (missao_id, guarda_id) DO UPDATE SET presente = $3, registrado_em = NOW()
      `, [req.params.missaoId, guardaId, presente]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao salvar presenças' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════
//  RELATÓRIO
// ════════════════════════════════════════
app.get('/api/relatorio', authMiddleware, apenasCoord, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        g.id, g.nome,
        COUNT(DISTINCT mg.missao_id) + COUNT(DISTINCT CASE WHEN m2.lider_id = g.id THEN m2.id END) as total_missoes,
        COUNT(DISTINCT CASE WHEN p.presente = true THEN p.missao_id END) as total_presencas
      FROM guardas g
      LEFT JOIN missao_guardas mg ON mg.guarda_id = g.id
      LEFT JOIN missoes m2 ON m2.lider_id = g.id
      LEFT JOIN presencas p ON p.guarda_id = g.id AND p.presente = true
      GROUP BY g.id, g.nome
      ORDER BY total_presencas DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório' });
  }
});

// ── Rota fallback → frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── Inicializa banco e servidor ──
async function init() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Banco de dados conectado');
  } catch (err) {
    console.error('❌ Erro ao conectar banco:', err.message);
  }
  app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
}

init();
