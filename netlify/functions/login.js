const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, cors, JWT_SECRET } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ erro: 'Método não permitido' }, 405);

  const { login, senha, tipo } = JSON.parse(event.body || '{}');

  try {
    if (tipo === 'coordenador') {
      const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [login]);
      const user = result.rows[0];
      if (!user) return cors({ erro: 'Credenciais inválidas' }, 401);

      const ok = await bcrypt.compare(senha, user.senha_hash);
      if (!ok) return cors({ erro: 'Credenciais inválidas' }, 401);

      const token = jwt.sign({ id: user.id, nome: user.nome, tipo: 'coordenador' }, JWT_SECRET, { expiresIn: '8h' });
      return cors({ token, nome: user.nome, tipo: 'coordenador' });

    } else {
      const result = await pool.query(
        'SELECT m.*, g.nome as lider_nome FROM missoes m JOIN guardas g ON g.id = m.lider_id WHERE m.login = $1 AND m.senha = $2',
        [login, senha]
      );
      const missao = result.rows[0];
      if (!missao) return cors({ erro: 'Credenciais inválidas' }, 401);

      const token = jwt.sign({ tipo: 'lider', missaoId: missao.id, nome: missao.lider_nome }, JWT_SECRET, { expiresIn: '8h' });
      return cors({ token, nome: missao.lider_nome, tipo: 'lider', missaoId: missao.id });
    }
  } catch (err) {
    console.error(err);
    return cors({ erro: 'Erro interno' }, 500);
  }
};
