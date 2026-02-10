import { apiFetch } from './configuracion.js';

let deudores = [];

// Variables Globales para Paginación
let paginaActual = 1;
const FILAS_POR_PAGINA = 5; // Mostramos 5 alertas por página

document.addEventListener('DOMContentLoaded', () => {
  cargarAlertas();
});

async function cargarAlertas() {
  try {
    deudores = await apiFetch('/alertas');
    renderizarAlertas();
  } catch (error) {
    console.error('Error cargando alertas:', error);
    const container = document.getElementById('con-alertas');
    if(container) container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl text-center text-red-500 border border-red-200">
        <i class="ph ph-warning text-4xl mb-2"></i>
        <p>Error al cargar las alertas.</p>
      </div>
    `;
  }
}

// FUNCIÓN DE PAGINACIÓN PARA USAR DESDE EL HTML
window.cambiarPaginaAlerta = function(delta) {
  if (deudores.length === 0) return;
  
  const totalPages = Math.ceil(deudores.length / FILAS_POR_PAGINA) || 1;
  paginaActual += delta;

  if (paginaActual > totalPages) paginaActual = totalPages;
  if (paginaActual < 1) paginaActual = 1;
  
  renderizarAlertas();
};

function renderizarAlertas() {
  const tbody = document.getElementById('tabla-alertas');
  const containerMovil = document.getElementById('vista-movil-alertas');
  const infoPaginacion = document.getElementById('info-paginacion-alertas');
  const btnPrev = document.getElementById('btn-prev-alerta');
  const btnNext = document.getElementById('btn-next-alerta');
  
  if (!tbody || !containerMovil) return;
  
  tbody.innerHTML = '';
  containerMovil.innerHTML = '';

  if (deudores.length === 0) {
    document.getElementById('sin-alertas').classList.remove('hidden');
    document.getElementById('con-alertas').classList.add('hidden');
    return;
  }

  document.getElementById('sin-alertas').classList.add('hidden');
  document.getElementById('con-alertas').classList.remove('hidden');

  // 1. LÓGICA DE PAGINACIÓN
  const totalItems = deudores.length;
  const totalPages = Math.ceil(totalItems / FILAS_POR_PAGINA) || 1;
  
  // Validar límites
  if (paginaActual > totalPages) paginaActual = totalPages;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const fin = inicio + FILAS_POR_PAGINA;
  // Aquí cortamos el array para mostrar solo los datos de esta página
  const datosPagina = deudores.slice(inicio, fin);

  // 2. RENDERIZAR SI NO HAY DATOS EN ESTA PÁGINA
  if (datosPagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">No hay alertas en esta página.</td></tr>`;
    containerMovil.innerHTML = `<div class="text-center py-8 text-slate-400">Sin alertas en esta página.</div>`;
    return; 
  }

  // Obtener nombre del mes actual para mensajes de vencimiento
  const nombreMesActual = new Date().toLocaleDateString('es-ES', { month: 'long' });

  // 3. RENDERIZAR DATOS (USAMOS datosPagina, NO deudores)
  datosPagina.forEach(j => {
    const esVencimiento = j.tipo_alerta === 'VENCIMIENTO';
    
    // Estilos según tipo de alerta
    let colorBadge = 'bg-rose-50 text-rose-700 border-rose-100';
    let iconoBadge = 'ph-warning';
    let textoBadge = 'Pendiente';
    let colorBarra = 'from-rose-500 to-rose-600';

    if (esVencimiento) {
      colorBadge = 'bg-amber-50 text-amber-700 border-amber-100';
      iconoBadge = 'ph-clock-countdown';
      textoBadge = 'Vencido';
      colorBarra = 'from-amber-500 to-orange-600';
    }

    // Formatear Mes Abonado
    let mesInfo = '';
    if (j.mes_abono) {
      mesInfo = `<span class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100">${j.mes_abono}</span>`;
    } else {
      mesInfo = `<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-semibold">Sin historial</span>`;
    }

    // --- RENDERIZAR ESCRITORIO (FILA TABLA) ---
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0 transition duration-150";
    
    tr.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
           <div class="w-8 h-8 rounded-full ${esVencimiento ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'} flex items-center justify-center">
             <i class="ph ${esVencimiento ? 'ph-calendar-x' : 'ph-user'}"></i>
           </div>
           <div>
              <div class="font-bold text-slate-900 text-base">${j.nombre}</div>
              <div class="text-xs text-slate-500">${j.categoria || 'Sin categoría'}</div>
           </div>
        </div>
      </td>
      
      <td class="px-6 py-4 text-center">
        ${mesInfo}
      </td>
      
      <td class="px-6 py-4 text-center">
        <div class="flex flex-col items-center gap-1">
          <div class="w-full bg-slate-100 rounded-full h-2 max-w-[120px] mx-auto overflow-hidden">
            <div class="bg-gradient-to-r ${colorBarra} h-2 rounded-full transition-all duration-500" style="width: ${esVencimiento ? 0 : '100%'}"></div>
          </div>
          <div class="text-[10px] text-slate-400 font-medium">
             ${esVencimiento ? `Mes nuevo (${nombreMesActual})` : `Pagado: $${j.pagado.toLocaleString()}`}
          </div>
        </div>
      </td>
      
      <td class="px-6 py-4 text-center">
        <div class="inline-flex flex-col items-center px-3 py-1 rounded-full text-xs font-bold ${colorBadge}">
          <span>$${j.deuda.toLocaleString()}</span>
        </div>
      </td>
      
      <td class="px-6 py-4 text-right">
        <button onclick="enviarWhatsApp('${j.telefono}', '${j.nombre.replace(/'/g, "\\'")}', ${j.deuda}, '${j.mes_abono || ''}', '${j.tipo_alerta}')" class="group flex items-center gap-2 justify-end ${esVencimiento ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'} px-3 py-2 rounded-lg text-xs font-bold transition border">
          <i class="ph ph-whatsapp-logo text-lg group-hover:scale-110 transition-transform"></i> 
          ${esVencimiento ? 'Cobrar Mes' : 'Cobrar Deuda'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    // --- RENDERIZAR MÓVIL (TARJETA) ---
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden group hover:shadow-md transition-all";
    
    // Barra decorativa superior
    const colorBarraTop = esVencimiento ? 'bg-amber-500' : 'bg-rose-500';
    
    card.innerHTML = `
      <div class="absolute top-0 left-0 h-1 ${colorBarraTop}" style="width: 100%"></div>
      
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="font-bold text-slate-900 text-lg">${j.nombre}</h3>
          <p class="text-xs text-slate-500">${j.categoria}</p>
        </div>
        <div class="flex flex-col items-end">
           <div class="${esVencimiento ? 'text-amber-600' : 'text-rose-600'} font-bold text-lg">$${j.deuda.toLocaleString()}</div>
           <div class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${esVencimiento ? 'text-amber-500' : 'text-rose-500'}">
              <i class="ph ${iconoBadge}"></i> ${textoBadge}
           </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Último Pago</div>
          <div class="text-sm font-bold text-slate-700">${j.mes_abono || '-'}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</div>
          <div class="text-sm font-bold ${esVencimiento ? 'text-amber-600' : 'text-rose-600'}">
            ${esVencimiento ? 'Mes Nuevo' : 'Incompleto'}
          </div>
        </div>
      </div>

      <button onclick="enviarWhatsApp('${j.telefono}', '${j.nombre.replace(/'/g, "\\'")}', ${j.deuda}, '${j.mes_abono || ''}', '${j.tipo_alerta}')" class="w-full flex items-center justify-center gap-2 py-3 rounded-xl ${esVencimiento ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'} text-white font-bold text-sm active:scale-[0.98] transition shadow-lg">
        <i class="ph ph-whatsapp-logo text-xl"></i>
        ${esVencimiento ? 'Enviar Cobro Mes' : 'Enviar Recordatorio'}
      </button>
    `;
    containerMovil.appendChild(card);
  });

  // 4. ACTUALIZAR PAGINACIÓN (TEXTOS Y BOTONES)
  if (infoPaginacion) {
    infoPaginacion.innerText = `Página ${paginaActual} de ${totalPages} (${totalItems} alertas)`;
  }
  if (btnPrev) btnPrev.disabled = paginaActual === 1;
  if (btnNext) btnNext.disabled = paginaActual === totalPages;
}

// Función mejorada para WhatsApp con manejo de vencimiento
window.enviarWhatsApp = function(telefono, nombre, deuda, mesAbono, tipoAlerta) {
  if (!telefono) {
    alert('Este jugador no tiene número de teléfono registrado.');
    return;
  }

  // Limpieza básica del número
  let numeroLimpio = telefono.replace(/[^0-9]/g, '');
  
  // Asignar indicativo Colombia si falta
  if (numeroLimpio.length === 10) {
    numeroLimpio = '57' + numeroLimpio;
  }

  const nombreMesActual = new Date().toLocaleDateString('es-ES', { month: 'long' });
  let mensaje = `Hola ${nombre}, te escribo de EFUSA.%0A`;

  if (tipoAlerta === 'VENCIMIENTO') {
    mensaje += `📅 *Recordatorio de Mensualidad*: Ya comenzó el mes de ${nombreMesActual} y aún no hemos recibido tu pago.%0A`;
    mensaje += `💰 *Monto a cancelar:* $${deuda.toLocaleString()}%0A`;
    if (mesAbono) {
      mensaje += `Tu último pago registrado fue para el mes de ${mesAbono}.%0A`;
    }
  } else {
    // Caso: Deuda normal (falta dinero para completar el mes)
    mensaje += `💰 *Saldo Adeudado:* $${deuda.toLocaleString()}%0A`;
    if (mesAbono) {
      mensaje += `📅 *Tu último pago:* Fue para el mes de ${mesAbono}.%0A`;
    } else {
      mensaje += `📅 *Estado:* Sin pagos recientes registrados.%0A`;
    }
  }
  
  mensaje += `Te agradecemos ponernos al día a la brevedad posible, gracias. 🚀`;

  const url = `https://wa.me/${numeroLimpio}?text=${mensaje}`;
  window.open(url, '_blank');
};