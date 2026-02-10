/**
 * 📲 WHATSAPP – EFUSA
 * Utilidades para enviar mensajes automáticos
 */

import { formatearMoneda } from './configuracion.js'

/* ======================================================
   📤 ENVIAR MENSAJE GENÉRICO
====================================================== */

export function enviarWhatsApp(telefono, mensaje) {
  if (!telefono) {
    alert('Número de teléfono no válido')
    return
  }

  // Limpia el número (solo dígitos)
  const numero = telefono.toString().replace(/\D/g, '')

  // 🇨🇴 Colombia +57
  const url = `https://wa.me/57${numero}?text=${encodeURIComponent(mensaje)}`

  window.open(url, '_blank')
}

/* ======================================================
   💸 MENSAJE CONFIRMACIÓN DE PAGO
====================================================== */

export function mensajePago(nombre, monto, tipo = 'pago') {
  return `
Hola ${nombre} 👋

Hemos registrado tu ${tipo} en *EFUSA* ⚽💚

💰 Monto: ${formatearMoneda(monto)}

Gracias por apoyar el proceso deportivo 🙌
`.trim()
}

/* ======================================================
   ⏰ MENSAJE RECORDATORIO DE PAGO
====================================================== */

export function mensajeRecordatorio(nombre, monto, meses) {
  return `
Hola ${nombre} 👋

Te recordamos que tienes *${meses} mes(es)* pendiente(s) en *EFUSA* ⚠️

💵 Valor mensual: ${formatearMoneda(monto)}

Por favor regulariza tu pago.
¡Gracias! ⚽
`.trim()
}

/* ======================================================
   🧾 MENSAJE INSCRIPCIÓN
====================================================== */

export function mensajeInscripcion(nombre, categoria) {
  return `
Bienvenido a *EFUSA* ⚽💚

👤 Jugador: ${nombre}
🏷️ Categoría: ${categoria}

Gracias por confiar en nuestra escuela 🙏
`.trim()
}

