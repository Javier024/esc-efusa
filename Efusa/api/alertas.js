////api/alertas.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const META_MENSUALIDAD = 50000;

    // 1. Consulta mejorada:
    // - Traemos a los que tienen saldo pendiente (mensualidad < 50000)
    // - O a los que el mes se les venció (último pago fue antes de que empezara el mes actual)
    const { rows: deudoresData } = await pool.query(`
      SELECT
        j.id,
        j.nombre,
        j.categoria,
        j.telefono,
        j.mensualidad,
        p.mes_pago AS mes_abono,
        p.fecha AS fecha_ultimo_pago -- Importante: Necesitamos la fecha real para comparar
      FROM jugadores j
      LEFT JOIN (
        SELECT DISTINCT ON (jugador_id) 
          jugador_id, 
          mes_pago,
          fecha
        FROM pagos
        ORDER BY jugador_id, fecha DESC
      ) p ON j.id = p.jugador_id
      WHERE j.activo = true 
        AND (
          j.mensualidad < $1 
          OR p.fecha < date_trunc('month', CURRENT_DATE)
        )
      ORDER BY 
        CASE 
          WHEN p.fecha < date_trunc('month', CURRENT_DATE) THEN 0 -- Prioridad a vencidos
          ELSE 1
        END,
        p.fecha ASC
    `, [META_MENSUALIDAD]);

    // 2. Lógica de Negocio: Clasificar y Calcular
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const deudores = deudoresData.map(j => {
      // Verificar si el pago es antiguo (antes del 1º del mes actual)
      const esPagoVencido = j.fecha_ultimo_pago && new Date(j.fecha_ultimo_pago) < primerDiaMesActual;
      
      let tipoAlerta = 'DEUDA'; // Por defecto
      let deudaCalculada = META_MENSUALIDAD - j.mensualidad;

      // Si pagó el mes completo (deuda 0 o negativa) pero el pago es antiguo
      if (esPagoVencido && j.mensualidad >= META_MENSUALIDAD) {
        tipoAlerta = 'VENCIMIENTO';
        deudaCalculada = META_MENSUALIDAD; // Deuda completa del nuevo mes
      }

      return {
        id: j.id,
        nombre: j.nombre,
        categoria: j.categoria,  //categoria del jugador
        telefono: j.telefono,
        pagado: j.mensualidad, // Histórico total
        deuda: deudaCalculada,  // Lo que se debe pedir ahora
        mes_abono: j.mes_abono,
        tipo_alerta: tipoAlerta // NUEVO CAMPO: 'DEUDA' o 'VENCIMIENTO'
      };
    });

    return res.status(200).json(deudores);

  } catch (error) {
    console.error('Error API Alertas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}