// api/pagos.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // ==========================
    // GET → LISTAR PAGOS
    // ==========================
    if (req.method === 'GET') {
      const { rows } = await pool.query(`
        SELECT
          p.id,
          p.jugador_id,
          j.nombre AS jugador,
          j.telefono AS jugador_telefono,
          j.categoria AS jugador_categoria,
          p.monto,
          p.fecha,
          p.tipo,
          p.observacion,
          p.mes_pago,
          p.cantidad_meses,
          p.periodo_inicio,
          p.periodo_fin
        FROM pagos p
        JOIN jugadores j ON j.id = p.jugador_id
        ORDER BY p.created_at DESC
      `);
      return res.status(200).json(rows);
    }

    // ==========================
    // POST → REGISTRAR PAGO
    // ==========================
    if (req.method === 'POST') {
      const { 
        jugador_id, monto, fecha, tipo, observacion,
        mes_pago, cantidad_meses, periodo_inicio, periodo_fin 
      } = req.body;

      if (!jugador_id || !monto || !fecha) {
        return res.status(400).json({ error: 'Jugador, monto y fecha son obligatorios' });
      }

      let cantMeses = cantidad_meses || 1;
      if (cantMeses > 1 && (!periodo_inicio || !periodo_fin)) {
         return res.status(400).json({ error: 'Para pagos múltiples, debe definir el periodo de inicio y fin.' });
      }

      // 1. Insertar el pago
      const { rows } = await pool.query(
        `INSERT INTO pagos
         (jugador_id, monto, fecha, tipo, observacion, mes_pago, cantidad_meses, periodo_inicio, periodo_fin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          jugador_id, 
          monto, 
          fecha, 
          tipo || 'abono', 
          observacion || null,
          mes_pago || null,
          cantMeses,
          periodo_inicio || null,
          periodo_fin || null
        ]
      );

      // 2. ACTUALIZAR AUTOMÁTICAMENTE EL JUGADOR
      await pool.query(
        `UPDATE jugadores SET mensualidad = mensualidad + $1 WHERE id = $2`,
        [monto, jugador_id]
      );

      return res.status(201).json(rows[0]);
    }

    // ==========================
    // DELETE → ELIMINAR PAGO
    // ==========================
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta ID del pago' });

      // Buscar pago antes de borrar para saber el monto a restar
      const { rows: pagoData } = await pool.query('SELECT * FROM pagos WHERE id = $1', [id]);
      
      if (pagoData.length === 0) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      
      const pago = pagoData[0];

      // Borrar pago
      await pool.query('DELETE FROM pagos WHERE id = $1', [id]);

      // Restar saldo al jugador
      await pool.query(
        `UPDATE jugadores SET mensualidad = mensualidad - $1 WHERE id = $2`,
        [pago.monto, pago.jugador_id]
      );

      return res.status(200).json({ mensaje: 'Pago eliminado y saldo actualizado' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('❌ pagos API:', error);
    return res.status(500).json({ error: error.message });
  }
}