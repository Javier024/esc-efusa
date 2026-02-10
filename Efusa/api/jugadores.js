// api/jugadores.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Falta conexión a BD' });
  }

  try {
    // ==========================
    // GET → LISTAR
    // ==========================
    if (req.method === 'GET') {
      // Seleccionamos los nuevos campos
      const result = await pool.query(`
        SELECT id, nombre, apellidos, fecha_nacimiento, tipo_identificacion, 
               numero_identificacion, categoria, telefono, mensualidad, activo, created_at
        FROM jugadores
        ORDER BY created_at DESC
      `);
      return res.status(200).json(result.rows);
    }

    // ==========================
    // POST → CREAR
    // ==========================
    if (req.method === 'POST') {
      const { 
        nombre, apellidos, fecha_nacimiento, 
        tipo_identificacion, numero_identificacion,
        categoria, telefono, mensualidad 
      } = req.body;

      // Validación actualizada: Teléfono ahora es obligatorio
      if (!nombre || !apellidos || !categoria || !telefono) {
        return res.status(400).json({ error: 'Nombre, apellidos, categoría y teléfono son obligatorios' });
      }

      const mensualidadValor = mensualidad ? Number(mensualidad) : 0;

      const result = await pool.query(
        `INSERT INTO jugadores (
           nombre, apellidos, fecha_nacimiento, tipo_identificacion, 
           numero_identificacion, categoria, telefono, mensualidad, activo
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
        [
          nombre, 
          apellidos, 
          fecha_nacimiento || null, 
          tipo_identificacion || null, 
          numero_identificacion || null,
          categoria, 
          telefono, 
          mensualidadValor
        ]
      );
      return res.status(201).json(result.rows[0]);
    }

    // ==========================
    // PUT → EDITAR
    // ==========================
    if (req.method === 'PUT') {
      const { 
        id, nombre, apellidos, fecha_nacimiento, 
        tipo_identificacion, numero_identificacion,
        categoria, telefono, mensualidad, activo 
      } = req.body;

      if (!id || !nombre || !apellidos || !categoria || !telefono) {
        return res.status(400).json({ error: 'Datos incompletos o faltan datos obligatorios' });
      }

      const result = await pool.query(
        `UPDATE jugadores
         SET nombre = $1, apellidos = $2, fecha_nacimiento = $3, 
             tipo_identificacion = $4, numero_identificacion = $5,
             categoria = $6, telefono = $7, mensualidad = $8, activo = $9
         WHERE id = $10
         RETURNING *`,
        [
          nombre, apellidos, fecha_nacimiento || null, 
          tipo_identificacion || null, numero_identificacion || null,
          categoria, telefono, Number(mensualidad), activo, id
        ]
      );

      return res.status(200).json(result.rows[0]);
    }

    // ==========================
    // DELETE → ELIMINAR
    // ==========================
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta ID' });

      await pool.query('DELETE FROM jugadores WHERE id = $1', [id]);
      return res.status(200).json({ mensaje: 'Jugador eliminado' });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('❌ ERROR API:', error.message);
    return res.status(500).json({ error: 'Error interno', detalle: error.message });
  }
}
