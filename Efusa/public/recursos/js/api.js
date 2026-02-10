/**
 * 🌐 API CLIENT – EFUSA
 * Funciones centralizadas para consumir el backend
 */

const API_BASE = '/api'

/* ================= JUGADORES ================= */

/**
 * Obtener todos los jugadores
 */
export async function getJugadores() {
  const res = await fetch(`${API_BASE}/jugadores`)
  if (!res.ok) throw new Error('Error cargando jugadores')
  return res.json()
}

/**
 * Crear jugador
 */
export async function crearJugador(data) {
  const res = await fetch(`${API_BASE}/jugadores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error creando jugador')
  return res.json()
}

/* ================= PAGOS ================= */

/**
 * Obtener pagos
 */
export async function getPagos() {
  const res = await fetch(`${API_BASE}/pagos`)
  if (!res.ok) throw new Error('Error cargando pagos')
  return res.json()
}

/**
 * Crear pago
 */
export async function crearPago(data) {
  const res = await fetch(`${API_BASE}/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error creando pago')
  return res.json()
}

/* ================= UTIL ================= */

/**
 * Eliminar recurso (opcional)
 */
export async function eliminar(url) {
  const res = await fetch(`${API_BASE}/${url}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error eliminando')
  return res.json()
}
