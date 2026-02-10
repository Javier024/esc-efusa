import { apiFetch } from './configuracion.js';

// --- ESTADO GLOBAL ---
let todosLosPagos = [];
let jugadoresList = [];
let paginaActual = 1; // Definición global para evitar errores de referencia

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- CACHÉ DE ELEMENTOS DOM (Para mejor rendimiento) ---
const DOM = {
  buscador: document.getElementById('buscador'),
  fechaInicio: document.getElementById('filtro-inicio'),
  fechaFin: document.getElementById('filtro-fin'),
  selectJugador: document.getElementById('jugador_id'),
  formPago: document.getElementById('formPago'),
  tablaResumen: document.getElementById('tabla-resumen'),
  vistaMovilResumen: document.getElementById('vista-movil-resumen'),
  tablaPagos: document.getElementById('tabla-pagos'),
  vistaMovilHistorial: document.getElementById('vista-movil-historial'),
  selectMes: document.getElementById('mes_inicio_select'),
  fechaInicioInput: document.getElementById('periodo_inicio'),
  totalFiltrado: document.getElementById('total-filtrado')
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  Promise.all([cargarPagos(), cargarJugadoresSelect()])
    .then(() => {
      filtrarPagos(); // Renderiza inicial
      renderizarResumen('todos');
      inicializarFormulario();
    })
    .catch(err => console.error("Error inicializando:", err));
});

function inicializarEventos() {
  // Filtros
  if (DOM.buscador) DOM.buscador.addEventListener('input', () => { paginaActual = 1; filtrarPagos(); });
  if (DOM.fechaInicio) DOM.fechaInicio.addEventListener('change', () => { paginaActual = 1; filtrarPagos(); });
  if (DOM.fechaFin) DOM.fechaFin.addEventListener('change', () => { paginaActual = 1; filtrarPagos(); });
  
  // Cambio de Jugador
  if (DOM.selectJugador) {
    DOM.selectJugador.addEventListener('change', () => {
      paginaActual = 1;
      filtrarPagos(); 
      renderizarResumen(document.querySelector('input[name="filtro-resumen"]:checked')?.value || 'todos');
      
      // Scroll suave al historial en móvil
      const historialMovil = document.getElementById('vista-movil-historial');
      if(historialMovil) historialMovil.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Formulario
  if (DOM.formPago) DOM.formPago.addEventListener('submit', guardarPago);
}

function inicializarFormulario() {
  if (DOM.selectMes) {
    DOM.selectMes.innerHTML = MESES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    DOM.selectMes.value = new Date().getMonth();
  }
  if (DOM.fechaInicioInput && !DOM.fechaInicioInput.value) {
    DOM.fechaInicioInput.valueAsDate = new Date();
  }
}

// --- LÓGICA PAGO MÚLTIPLE (WINDOW PARA ACCESO HTML) ---
window.toggleMultiplePayment = function() {
  const esMultiple = document.querySelector('input[name="pago_multiple"]:checked').value === 'si';
  const wrapper = document.getElementById('pago-multiple-wrapper');
  if (esMultiple) { 
    wrapper.classList.remove('hidden'); 
    calcularPeriodo(); 
  } else { 
    wrapper.classList.add('hidden'); 
  }
};

window.calcularPeriodo = function() {
  const cantidad = parseInt(document.getElementById('cantidad_meses').value) || 1;
  const mesInicioIdx = parseInt(document.getElementById('mes_inicio_select').value);
  const fechaInicioVal = document.getElementById('periodo_inicio').value;
  if(!fechaInicioVal) return;

  const fechaInicio = new Date(fechaInicioVal + 'T12:00:00'); 

  // Lista de meses (Texto)
  let lista = [];
  for(let i=0; i<cantidad; i++) {
    let idx = (mesInicioIdx + i) % 12; 
    lista.push(MESES[idx]);
  }
  const textoLista = lista.join(', ');
  const elResumen = document.getElementById('resumen-meses-texto');
  if(elResumen) elResumen.innerText = textoLista;

  // Fecha Fin
  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + cantidad);
  fechaFin.setDate(fechaFin.getDate() - 1); 
  
  const y = fechaFin.getFullYear();
  const m = String(fechaFin.getMonth() + 1).padStart(2, '0');
  const d = String(fechaFin.getDate()).padStart(2, '0');
  const elPeriodoFin = document.getElementById('periodo_fin');
  if(elPeriodoFin) elPeriodoFin.value = `${y}-${m}-${d}`;

  // Próximo Pago
  const proximo = new Date(fechaFin);
  proximo.setDate(proximo.getDate() + 1); 
  
  const diaProx = String(proximo.getDate()).padStart(2,'0');
  const mesProx = MESES[proximo.getMonth()];
  const anioProx = proximo.getFullYear();
  
  const elNextPayment = document.getElementById('next_payment_preview');
  if(elNextPayment) elNextPayment.value = `${diaProx} de ${mesProx} de ${anioProx}`;
  
  const elMesPago = document.getElementById('mes_pago');
  if(elMesPago) {
    elMesPago.value = MESES[mesInicioIdx];
    elMesPago.dataset.listaMeses = textoLista;
  }
};

// --- DATOS ---
async function cargarPagos() {
  try { 
    const data = await apiFetch('/pagos'); 
    todosLosPagos = data; 
  } catch (e) { 
    mostrarNotificacion('Error cargando pagos', 'error'); 
    console.error(e); 
  }
}

async function cargarJugadoresSelect() {
  try { 
    const data = await apiFetch('/jugadores'); 
    jugadoresList = data; 
    
    if (DOM.selectJugador) { 
      DOM.selectJugador.innerHTML = '<option value="">Seleccione...</option>'; 
      data.forEach(j => { 
        DOM.selectJugador.innerHTML += `<option value="${j.id}">${j.nombre} (${j.categoria})</option>`; 
      }); 
    } 
  } catch(e) { console.error(e); }
}

// --- FILTRADO Y RENDERIZADO HISTORIAL ---

function filtrarPagos() {
  const txt = DOM.buscador ? DOM.buscador.value.toLowerCase() : ''; 
  const fIni = DOM.fechaInicio ? DOM.fechaInicio.value : ''; 
  const fFin = DOM.fechaFin ? DOM.fechaFin.value : ''; 
  const jugadorId = DOM.selectJugador ? DOM.selectJugador.value : '';

  const pagosFiltrados = todosLosPagos.filter(p => {
    const fechaPago = p.fecha ? p.fecha.split('T')[0] : '';
    
    // Condiciones
    const matchTexto = p.jugador && p.jugador.toLowerCase().includes(txt);
    const matchFechaIni = !fIni || fechaPago >= fIni;
    const matchFechaFin = !fFin || fechaPago <= fFin;
    // Importante: Si hay jugador seleccionado, filtrar estrictamente por su ID
    const matchJugador = !jugadorId || p.jugador_id == jugadorId;

    return matchTexto && matchFechaIni && matchFechaFin && matchJugador;
  });

  // Calcular total recaudado filtrado
  const total = pagosFiltrados.reduce((sum, p) => sum + Number(p.monto), 0);
  if(DOM.totalFiltrado) DOM.totalFiltrado.innerText = '$' + total.toLocaleString();

  renderPagos(pagosFiltrados);
}

function renderPagos(pagos) {
  if (!DOM.tablaPagos || !DOM.vistaMovilHistorial) return;
  
  DOM.tablaPagos.innerHTML = ''; 
  DOM.vistaMovilHistorial.innerHTML = '';

  if(pagos.length === 0) { 
    DOM.tablaPagos.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No se encontraron pagos.</td></tr>'; 
    DOM.vistaMovilHistorial.innerHTML = '<div class="text-center py-8 text-slate-400">Sin pagos registrados para mostrar.</div>'; 
    return; 
  }

  const fragmentTabla = document.createDocumentFragment();
  const fragmentMovil = document.createDocumentFragment();

  pagos.forEach(p => {
    let detHTML = ''; 
    if(p.cantidad_meses > 1) {
      detHTML += `<div class="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><i class="ph ph-calendar"></i> Pagó ${p.cantidad_meses} meses</div>`; 
    }
    if(p.observacion) {
      detHTML += `<div class="text-[10px] text-slate-400 truncate" title="${p.observacion}">${p.observacion}</div>`;
    }

    // Fila Desktop
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 border-b border-slate-100 transition";
    tr.innerHTML = `
      <td class="px-6 py-4 font-medium text-slate-900">${p.jugador || 'N/A'}</td>
      <td class="px-6 py-4 text-slate-600">${p.fecha.split('T')[0]}</td>
      <td class="px-6 py-4"><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 capitalize">${p.tipo || ''}</span></td>
      <td class="px-6 py-4 text-slate-500">${detHTML||'-'}</td>
      <td class="px-6 py-4 font-bold text-slate-900">$${Number(p.monto).toLocaleString()}</td>
      <td class="px-6 py-4 text-center">
        <button onclick="window.enviarWhatsapp(${p.id})" class="text-green-600 p-1 hover:bg-green-50 rounded transition"><i class="ph ph-whatsapp-logo text-xl"></i></button> 
        <button onclick="window.eliminarPago(${p.id})" class="text-rose-600 p-1 hover:bg-rose-50 rounded transition"><i class="ph ph-trash text-xl"></i></button>
      </td>
    `;
    fragmentTabla.appendChild(tr);

    // Tarjeta Móvil
    const div = document.createElement('div');
    div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3";
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-slate-900">${p.jugador || 'N/A'}</h3>
          <p class="text-xs text-slate-500">${p.fecha.split('T')[0]} · ${p.tipo || ''}</p>
        </div>
        <span class="font-bold text-emerald-600 text-lg">$${Number(p.monto).toLocaleString()}</span>
      </div>
      ${detHTML ? `<div class="bg-slate-50 p-2 rounded text-xs text-slate-600 mb-2 mt-2">${detHTML}</div>` : ''}
      <div class="flex gap-2 mt-2">
        <button onclick="window.enviarWhatsapp(${p.id})" class="flex-1 bg-green-50 text-green-600 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition flex justify-center items-center gap-1"><i class="ph ph-whatsapp-logo text-lg"></i> WhatsApp</button>
        <button onclick="window.eliminarPago(${p.id})" class="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 transition">Eliminar</button>
      </div>
    `;
    fragmentMovil.appendChild(div);
  });

  DOM.tablaPagos.appendChild(fragmentTabla);
  DOM.vistaMovilHistorial.appendChild(fragmentMovil);
}

function renderizarResumen(tipo) {
  if(!DOM.tablaResumen || !DOM.vistaMovilResumen) return; 
  DOM.tablaResumen.innerHTML = ''; 
  DOM.vistaMovilResumen.innerHTML = '';
  
  let lista = jugadoresList;
  const jugadorId = DOM.selectJugador ? DOM.selectJugador.value : null;

  // 1. Filtrado de Lista
  if (tipo === 'deudores') {
    lista = jugadorId ? lista.filter(j => j.id === Number(jugadorId)) : lista.filter(j => j.mensualidad < 50000);
  } else if(tipo === 'pagados') {
    lista = jugadorId ? lista.filter(j => j.id === Number(jugadorId)) : lista.filter(j => j.mensualidad >= 50000);
  } else if (jugadorId) {
    // Todos pero con filtro de jugador seleccionado
    lista = lista.filter(j => j.id === Number(jugadorId));
  }

  // 2. Paginación
  const totalItems = lista.length;
  const itemsPorPagina = 5;
  const totalPages = Math.ceil(totalItems / itemsPorPagina) || 1; 
  
  if (paginaActual > totalPages) paginaActual = totalPages;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const datosPagina = lista.slice(inicio, fin);

  if (datosPagina.length === 0) {
    const msg = jugadorId ? "Este jugador no tiene pagos registrados." : "No hay registros en esta vista.";
    DOM.tablaResumen.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">${msg}</td></tr>`;
    DOM.vistaMovilResumen.innerHTML = `<div class="text-center py-8 text-slate-400">${msg}</div>`;
    return; 
  }

  // 3. Renderizado
  const fragmentTabla = document.createDocumentFragment();
  const fragmentMovil = document.createDocumentFragment();

  datosPagina.forEach(j => {
    let estadoBadge = '';
    if (j.mensualidad >= 50000) {
      estadoBadge = '<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Al día</span>';
    } else if (j.mensualidad > 0) {
      estadoBadge = `<span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">Parcial ($${j.mensualidad.toLocaleString()})</span>`;
    } else {
      estadoBadge = '<span class="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200">No Pagado</span>';
    }

    // Fila Tabla
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 border-b border-slate-100 transition";
    tr.innerHTML = `
      <td class="px-4 py-3">
        <div class="font-medium text-slate-900">${j.nombre}</div>
        <div class="mt-1 text-xs text-slate-500">${j.categoria}</div>
      </td>
      <td class="px-4 py-3 text-center">${estadoBadge}</td>
      <td class="px-4 py-3 text-center">
        <div class="text-xs font-bold text-slate-700">$${j.mensualidad.toLocaleString()}</div>
        ${j.mensualidad > 0 && j.mensualidad < 50000 ? `<div class="text-[10px] text-rose-500">Faltan $${(50000 - j.mensualidad).toLocaleString()}</div>` : ''}
      </td>
      <td class="px-4 py-3 text-right">
        <button onclick="window.irAPagar(${j.id})" class="text-blue-600 hover:text-blue-800 text-xs font-bold underline decoration-blue-200 hover:decoration-blue-600 underline-offset-4 transition-all">
          Pagar
        </button>
      </td>
    `;
    fragmentTabla.appendChild(tr);

    // Tarjeta Móvil
    const div = document.createElement('div');
    div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center";
    div.innerHTML = `
      <div>
        <h4 class="font-bold text-slate-900">${j.nombre}</h4>
        <div class="mt-1">${estadoBadge}</div>
      </div>
      <div class="text-right">
        <div class="font-bold text-lg ${j.mensualidad >= 50000 ? 'text-emerald-600' : (j.mensualidad > 0 ? 'text-amber-600' : 'text-rose-600')}">
          $${j.mensualidad.toLocaleString()}
        </div>
        <button onclick="window.irAPagar(${j.id})" class="mt-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
          Pagar
        </button>
      </div>
    `;
    fragmentMovil.appendChild(div);
  });

  DOM.tablaResumen.appendChild(fragmentTabla);
  DOM.vistaMovilResumen.appendChild(fragmentMovil);
}

// --- ACCIONES ---

async function guardarPago(e) {
  e.preventDefault();
  const btnSubmit = DOM.formPago.querySelector('button[type="submit"]');
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';
  
  if(btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Guardando...';
  }

  const esMultiple = document.querySelector('input[name="pago_multiple"]:checked').value === 'si';
  const payload = {
    jugador_id: DOM.selectJugador ? DOM.selectJugador.value : null, 
    monto: Number(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value, 
    tipo: document.getElementById('tipo').value,
    observacion: document.getElementById('observacion').value, 
    mes_pago: document.getElementById('mes_pago').value,
    cantidad_meses: 1, 
    periodo_inicio: null, 
    periodo_fin: null
  };

  if(!payload.jugador_id) {
    mostrarNotificacion('Seleccione un jugador', 'error');
    if(btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = textoOriginal; }
    return;
  }

  if(esMultiple) {
    payload.cantidad_meses = Number(document.getElementById('cantidad_meses').value);
    payload.periodo_inicio = document.getElementById('periodo_inicio').value;
    payload.periodo_fin = document.getElementById('periodo_fin').value;
    if(!payload.observacion) payload.observacion = `Meses pagados: ${document.getElementById('resumen-meses-texto').innerText}`;
  } else { 
    payload.periodo_inicio = payload.fecha; 
  }

  try {
    await apiFetch('/pagos', { method: 'POST', body: JSON.stringify(payload) });
    mostrarNotificacion('✅ Pago guardado correctamente', 'success');
    DOM.formPago.reset();
    const wrapper = document.getElementById('pago-multiple-wrapper');
    if(wrapper) wrapper.classList.add('hidden');
    const radioNo = document.querySelector('input[name="pago_multiple"][value="no"]');
    if(radioNo) radioNo.checked = true;
    
    await Promise.all([cargarPagos(), cargarJugadoresSelect()]);
    filtrarPagos(); 
    renderizarResumen(document.querySelector('input[name="filtro-resumen"]:checked').value || 'todos');
    
    // Actualización local inmediata
    const jug = jugadoresList.find(j => j.id == payload.jugador_id);
    if (jug) jug.mensualidad += payload.monto;

  } catch (error) { 
    console.error(error);
    mostrarNotificacion('Error al guardar pago', 'error'); 
  } finally {
    if(btnSubmit) { 
      btnSubmit.disabled = false; 
      btnSubmit.innerText = textoOriginal; 
    }
  }
}

async function eliminarPago(id) {
  if(!confirm('¿Estás seguro de borrar este pago?')) return;
  
  try {
    await apiFetch(`/pagos?id=${id}`, {method:'DELETE'});
    mostrarNotificacion('Pago eliminado', 'success');
    await Promise.all([cargarPagos(), cargarJugadoresSelect()]);
    filtrarPagos();
    renderizarResumen(document.querySelector('input[name="filtro-resumen"]:checked').value || 'todos');
  } catch(e) {
    mostrarNotificacion('Error al eliminar', 'error');
  }
}

function enviarWhatsapp(idPago) {
  const pago = todosLosPagos.find(p => p.id === idPago);
  if(!pago) return alert('Pago no encontrado');
  if(!pago.jugador_telefono) return mostrarNotificacion('El jugador no tiene teléfono registrado', 'error');

  const saludo = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  const monto = Number(pago.monto).toLocaleString();
  const obs = pago.observacion ? `📝 ${pago.observacion}` : '';
  let mensaje = '';

  if(p.cantidad_meses > 1 && pago.periodo_fin) {
    const fFin = new Date(pago.periodo_fin);
    const proximo = new Date(fFin); 
    proximo.setDate(proximo.getDate() + 1);
    
    mensaje = `${saludo} ${pago.jugador}, gracias por tu pago adelantado. 🚀%0A%0A`;
    mensaje += `💰 *Monto:* $${monto}%0A`;
    mensaje += `📆 *Periodo:* ${pago.observacion ? pago.observacion.split('Meses pagados: ')[1] : 'Varios meses'}%0A`;
    mensaje += `📢 *Próximo pago:* ${proximo.getDate()} de ${MESES[proximo.getMonth()]} de ${proximo.getFullYear()}.%0A`;
    mensaje += `${obs}%0A¡Gracias!`;
  } else {
    let prox = "próximo mes";
    if(p.mes_pago) { 
      const idx = MESES.indexOf(p.mes_pago); 
      if(idx!==-1) prox = MESES[(idx+1)%12]; 
    }
    mensaje = `${saludo} ${pago.jugador}, pago recibido.%0A%0A💰 *Valor:* $${monto}%0A%0A📢 *Próximo:* ${prox}.%0A${obs}`;
  }

  window.open(`https://wa.me/57${pago.jugador_telefono}?text=${mensaje}`, '_blank');
}

// --- UTILIDADES ---

function mostrarNotificacion(mensaje, tipo = 'info') {
  let container = document.getElementById('toast-container');
  if(!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colores = tipo === 'error' ? 'bg-rose-500' : (tipo === 'success' ? 'bg-emerald-500' : 'bg-blue-500');
  
  toast.className = `${colores} text-white px-4 py-3 rounded shadow-lg text-sm font-medium transform transition-all duration-300 translate-y-10 opacity-0`;
  toast.innerText = mensaje;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Exponer al scope global
window.irAPagar = (id) => { 
  if(DOM.selectJugador) DOM.selectJugador.value = id; 
  if(DOM.formPago) DOM.formPago.scrollIntoView({behavior:'smooth'}); 
};
window.eliminarPago = eliminarPago;
window.enviarWhatsapp = enviarWhatsapp;
window.renderizarResumen = renderizarResumen;
window.limpiarFiltros = () => { 
  if(DOM.buscador) DOM.buscador.value=''; 
  if(DOM.fechaInicio) DOM.fechaInicio.value=''; 
  if(DOM.fechaFin) DOM.fechaFin.value=''; 
  paginaActual = 1;
  filtrarPagos(); 
};