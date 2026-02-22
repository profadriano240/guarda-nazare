const { pool, cors, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  try {
    const user = verifyToken(event);
    if (user.tipo !== 'coordenador') return cors({ erro: 'Acesso negado' }, 403);

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
    return cors(result.rows);
  } catch (err) {
    console.error(err);
    if (err.message === 'Token não fornecido' || err.name === 'JsonWebTokenError') {
      return cors({ erro: 'Não autorizado' }, 401);
    }
    return cors({ erro: 'Erro interno' }, 500);
  }
};
