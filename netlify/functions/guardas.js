const { pool, cors, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  try {
    const user = verifyToken(event);

    // GET /guardas
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM guardas ORDER BY nome');
      return cors(result.rows);
    }

    // POST /guardas — apenas coordenador
    if (event.httpMethod === 'POST') {
      if (user.tipo !== 'coordenador') return cors({ erro: 'Acesso negado' }, 403);
      const { nome, telefone, status } = JSON.parse(event.body || '{}');
      if (!nome) return cors({ erro: 'Nome obrigatório' }, 400);
      const result = await pool.query(
        'INSERT INTO guardas (nome, telefone, status) VALUES ($1,$2,$3) RETURNING *',
        [nome, telefone || null, status || 'ativo']
      );
      return cors(result.rows[0]);
    }

    // PUT /guardas/:id
    if (event.httpMethod === 'PUT') {
      if (user.tipo !== 'coordenador') return cors({ erro: 'Acesso negado' }, 403);
      const id = event.path.split('/').pop();
      const { nome, telefone, status } = JSON.parse(event.body || '{}');
      const result = await pool.query(
        'UPDATE guardas SET nome=$1, telefone=$2, status=$3 WHERE id=$4 RETURNING *',
        [nome, telefone || null, status, id]
      );
      return cors(result.rows[0]);
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
