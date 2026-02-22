const { pool, cors, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  try {
    const user = verifyToken(event);
    const pathParts = event.path.replace('/.netlify/functions/missoes', '').split('/').filter(Boolean);
    const missaoId = pathParts[0];

    // GET /missoes ou GET /missoes/:id
    if (event.httpMethod === 'GET') {
      if (missaoId) {
        const m = await pool.query(`
          SELECT m.*, g.nome as lider_nome FROM missoes m
          LEFT JOIN guardas g ON g.id = m.lider_id WHERE m.id = $1`, [missaoId]);
        if (!m.rows[0]) return cors({ erro: 'Não encontrada' }, 404);

        const guardas = await pool.query(`
          SELECT mg.guarda_id as id, g.nome, mg.funcao
          FROM missao_guardas mg JOIN guardas g ON g.id = mg.guarda_id
          WHERE mg.missao_id = $1`, [missaoId]);

        const presencas = await pool.query(
          'SELECT guarda_id, presente FROM presencas WHERE missao_id = $1', [missaoId]);
        const presMap = {};
        presencas.rows.forEach(p => { presMap[p.guarda_id] = p.presente; });

        return cors({ ...m.rows[0], guardas: guardas.rows, presencas: presMap });
      }

      const missoes = await pool.query(`
        SELECT m.*, g.nome as lider_nome FROM missoes m
        LEFT JOIN guardas g ON g.id = m.lider_id ORDER BY m.data DESC`);

      const result = [];
      for (const m of missoes.rows) {
        const guardas = await pool.query(`
          SELECT mg.guarda_id as id, g.nome, mg.funcao
          FROM missao_guardas mg JOIN guardas g ON g.id = mg.guarda_id
          WHERE mg.missao_id = $1`, [m.id]);
        const presencas = await pool.query(
          'SELECT guarda_id, presente FROM presencas WHERE missao_id = $1', [m.id]);
        const presMap = {};
        presencas.rows.forEach(p => { presMap[p.guarda_id] = p.presente; });
        result.push({ ...m, guardas: guardas.rows, presencas: presMap });
      }
      return cors(result);
    }

    // POST /missoes
    if (event.httpMethod === 'POST') {
      if (user.tipo !== 'coordenador') return cors({ erro: 'Acesso negado' }, 403);
      const { comunidade, data, hora, lider_id, lider_funcao, observacoes, guardas } = JSON.parse(event.body || '{}');
      if (!comunidade || !data || !hora || !lider_id) return cors({ erro: 'Campos obrigatórios faltando' }, 400);

      const countResult = await pool.query('SELECT COUNT(*) FROM missoes');
      const nextId = parseInt(countResult.rows[0].count) + 1;
      const login = 'MISSAO' + String(nextId).padStart(3, '0');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let senha = 'NZR#';
      for (let i = 0; i < 4; i++) senha += chars[Math.floor(Math.random() * chars.length)];

      const missao = await pool.query(
        `INSERT INTO missoes (comunidade, data, hora, lider_id, lider_funcao, observacoes, login, senha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [comunidade, data, hora, lider_id, lider_funcao || null, observacoes || null, login, senha]
      );
      const mId = missao.rows[0].id;

      if (guardas && guardas.length > 0) {
        for (const g of guardas) {
          await pool.query(
            'INSERT INTO missao_guardas (missao_id, guarda_id, funcao) VALUES ($1,$2,$3)',
            [mId, g.id, g.funcao || null]
          );
        }
      }
      return cors({ ...missao.rows[0], login, senha });
    }

    return cors({ erro: 'Método não permitido' }, 405);
  } catch (err) {
    console.error(err);
    if (err.message === 'Token não fornecido' || err.name === 'JsonWebTokenError') {
      return cors({ erro: 'Não autorizado' }, 401);
    }
    return cors({ erro: 'Erro interno' }, 500);
  }
};
