const { pool, cors, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  try {
    const user = verifyToken(event);
    const pathParts = event.path.replace('/.netlify/functions/presencas', '').split('/').filter(Boolean);
    const missaoId = pathParts[0];

    if (!missaoId) return cors({ erro: 'missaoId obrigatório' }, 400);

    if (user.tipo === 'lider' && user.missaoId !== parseInt(missaoId)) {
      return cors({ erro: 'Acesso negado' }, 403);
    }

    const { presencas } = JSON.parse(event.body || '{}');
    for (const [guardaId, presente] of Object.entries(presencas)) {
      await pool.query(`
        INSERT INTO presencas (missao_id, guarda_id, presente)
        VALUES ($1,$2,$3)
        ON CONFLICT (missao_id, guarda_id) DO UPDATE SET presente=$3, registrado_em=NOW()`,
        [missaoId, guardaId, presente]
      );
    }
    return cors({ ok: true });
  } catch (err) {
    console.error(err);
    if (err.message === 'Token não fornecido' || err.name === 'JsonWebTokenError') {
      return cors({ erro: 'Não autorizado' }, 401);
    }
    return cors({ erro: 'Erro interno' }, 500);
  }
};
