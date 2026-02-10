import { apiFetch, MENSUALIDAD_OBJETIVO } from './configuracion.js';

// ==========================
// ESTADO GLOBAL
// ==========================
let jugadoresList = [];
let listaPagos = [];
let paginaActual = 1;
const FILAS_POR_PAGINA = 8;

// Referencias DOM
let tabla, buscador, filtroCategoria, infoPaginacion, btnPrev, btnNext;
let containerActividad;

// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  // Referencias DOM
  tabla = document.getElementById('tabla-jugadores');
  buscador = document.getElementById('buscador');
  filtroCategoria = document.getElementById('filtro-categoria');
  infoPaginacion = document.getElementById('info-paginacion');
  btnPrev = document.getElementById('btn-prev');
  btnNext = document.getElementById('btn-next');
  containerActividad = document.getElementById('actividad-feed');

  // Event Listeners
  if (buscador) buscador.addEventListener('input', filtrar);
  if (filtroCategoria) filtroCategoria.addEventListener('change', filtrar);

  // Eventos Sidebar
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btnOpen = document.getElementById('open-sidebar');
  const btnClose = document.getElementById('close-sidebar');

  if (btnOpen && btnClose) {
    btnOpen.addEventListener('click', () => toggleSidebar(true));
    btnClose.addEventListener('click', () => toggleSidebar(false));
  }
  if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));

  // Carga inicial
  cargarDatos();
});

// ==========================
// LÓGICA DE DATOS
// ==========================
async function cargarDatos() {
  try {
    // CONEXIÓN CORREGIDA: Solo '/jugadores' y '/pagos' (sin /api/ adelante)
    const resultados = await Promise.allSettled([
      apiFetch('/jugadores'),
      apiFetch('/pagos')
    ]);

    // 1. Manejar Jugadores
    if (resultados[0].status === 'fulfilled') {
      jugadoresList = Array.isArray(resultados[0].value) ? resultados[0].value : [];
    } else {
      console.warn('Error cargando jugadores:', resultados[0].reason);
      jugadoresList = [];
    }

    // 2. Manejar Pagos
    if (resultados[1].status === 'fulfilled') {
      listaPagos = Array.isArray(resultados[1].value) ? resultados[1].value : [];
      listaPagos.sort((a, b) => new Date(b.created_at || b.fecha) - new Date(a.created_at || a.fecha));
    } else {
      console.warn('Error cargando pagos:', resultados[1].reason);
      listaPagos = [];
    }

    actualizarEstadisticas();
    renderTabla();
    renderActividad();

  } catch (error) {
    console.error('Error crítico:', error);
    mostrarErrorCritico();
  }
}

// ==========================
// ESTADÍSTICAS
// ==========================
function actualizarEstadisticas() {
  const total = jugadoresList.length;
  const activos = jugadoresList.filter(j => Number(j.mensualidad) >= MENSUALIDAD_OBJETIVO).length;
  const deudores = jugadoresList.filter(j => Number(j.mensualidad) < MENSUALIDAD_OBJETIVO).length;
  const dinero = jugadoresList.reduce((acc, curr) => acc + Number(curr.mensualidad || 0), 0);

  const elTotal = document.getElementById('stat-total');
  const elDinero = document.getElementById('stat-dinero');
  const elActivos = document.getElementById('stat-activos');
  const elDeudores = document.getElementById('stat-deudores');

  if (elTotal) elTotal.innerText = total;
  if (elDinero) elDinero.innerText = '$' + dinero.toLocaleString();
  if (elActivos) elActivos.innerText = activos;
  if (elDeudores) elDeudores.innerText = deudores;
}

// ==========================
// RENDERIZADO TABLA Y FILTROS
// ==========================
function filtrar() {
  paginaActual = 1;
  renderTabla();
}

function renderTabla() {
  if (!tabla) return;
  
  // Referencia para móvil (Añadido para soporte dual)
  const containerMovil = document.getElementById('vista-movil-jugadores');
  if(containerMovil) containerMovil.innerHTML = '';
  
  tabla.innerHTML = '';

  const texto = buscador ? buscador.value.toLowerCase() : '';
  const cat = filtroCategoria ? filtroCategoria.value : '';

  // 1. Filtrar datos
  const filtrados = jugadoresList.filter(j => {
    const nombreCompleto = `${j.nombre || ''} ${j.apellidos || ''}`.toLowerCase();
    const matchNombre = nombreCompleto.includes(texto);
    const matchCat = cat === '' || j.categoria === cat;
    return matchNombre && matchCat;
  });

  // 2. Calcular paginación
  const totalItems = filtrados.length;
  const totalPages = Math.ceil(totalItems / FILAS_POR_PAGINA) || 1;

  if (paginaActual > totalPages) paginaActual = totalPages;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const fin = inicio + FILAS_POR_PAGINA;
  const datosPagina = filtrados.slice(inicio, fin);

  // 3. Renderizar filas (Lógica Doble)
  if (datosPagina.length === 0) {
    // Mensaje PC
    tabla.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-rose-500 text-sm font-bold">No hay datos en tu base de datos.</td></tr>`;
    // Mensaje Móvil
    if(containerMovil) containerMovil.innerHTML = `<div class="text-center py-10 text-rose-500 text-sm font-bold">No hay datos.</div>`;
  } else {
    datosPagina.forEach(j => {
      const valor = Number(j.mensualidad || 0);
      let estadoHtml = '';
      
      // Lógica de Estado
      if (valor >= MENSUALIDAD_OBJETIVO) {
        estadoHtml = '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">Pago</span>';
      } else if (valor > 0) {
        estadoHtml = '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">Abono</span>';
      } else {
        estadoHtml = '<span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold border border-rose-200">Pendiente</span>';
      }

      // --- RENDERIZADO ESCRITORIO (TABLA) ---
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 border-b border-slate-100 transition duration-150";
      tr.innerHTML = `
        <td class="px-4 py-3">
          <div class="font-bold text-slate-900 text-sm md:text-base">${j.nombre} ${j.apellidos || ''}</div>
          ${j.numero_identificacion ? `<div class="text-[10px] text-slate-400">${j.numero_identificacion}</div>` : ''}
        </td>
        <!-- Categoría -->
        <td class="px-4 py-3 text-slate-600 hidden sm:table-cell text-xs md:text-sm">
          ${j.categoria || '-'}
        </td>
        <!-- Contacto -->
        <td class="px-4 py-3 text-slate-600 text-xs md:text-sm">
          ${j.telefono ? `<a href="tel:${j.telefono}" class="hover:text-brand-600 hover:underline">${j.telefono}</a>` : '-'}
        </td>
        <!-- Estado -->
        <td class="px-4 py-3 text-center">
          ${estadoHtml}
          <div class="text-[9px] text-slate-400 mt-0.5">$${valor.toLocaleString()}</div>
        </td>
      `;
      tabla.appendChild(tr);

      // --- RENDERIZADO MÓVIL (TARJETAS) ---
      if(containerMovil) {
        const card = document.createElement('div');
        card.className = "bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2";
        
        // Calculamos estilo del borde izquierdo según estado
        let borderClass = "border-l-4 border-l-rose-500";
        if(valor >= MENSUALIDAD_OBJETIVO) borderClass = "border-l-4 border-l-emerald-500";
        else if (valor > 0) borderClass = "border-l-4 border-l-amber-500";
        
        card.classList.add(...borderClass.split(' '));

        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-slate-900 text-base leading-tight">${j.nombre} ${j.apellidos || ''}</h4>
              <p class="text-xs text-slate-500 mt-0.5">${j.categoria || '-'}</p>
            </div>
            ${estadoHtml}
          </div>
          
          <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
            <div class="flex items-center gap-2">
              <i class="ph ph-phone text-slate-400"></i>
              <a href="tel:${j.telefono}" class="text-sm font-semibold text-slate-700 hover:text-brand-600">${j.telefono || '-'}</a>
            </div>
            <div class="text-xs font-bold text-slate-500">$${valor.toLocaleString()}</div>
          </div>
        `;
        containerMovil.appendChild(card);
      }
    });
  }

  // 4. Actualizar controles de paginación
  if (infoPaginacion) infoPaginacion.innerText = `Página ${paginaActual} de ${totalPages} (${totalItems} registros)`;
  if (btnPrev) btnPrev.disabled = paginaActual === 1;
  if (btnNext) btnNext.disabled = paginaActual === totalPages;
}

// ==========================
// NAVEGACIÓN
// ==========================
function cambiarPagina(delta) {
  if (jugadoresList.length === 0) return;
  paginaActual += delta;
  renderTabla();
}

// ==========================
// ACTIVIDAD RECIENTE
// ==========================
function renderActividad() {
  if (!containerActividad) return;
  containerActividad.innerHTML = '';

  if (!listaPagos || listaPagos.length === 0) {
    containerActividad.innerHTML = '<div class="text-center text-xs text-slate-400 py-8 italic">No hay pagos registrados recientemente.</div>';
    return;
  }

  const ultimos5 = listaPagos.slice(0, 5);

  ultimos5.forEach((p, index) => {
    const fechaObj = new Date(p.fecha || p.created_at);
    const hora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const fechaCorta = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    const item = document.createElement('div');
    item.className = "activity-item relative pl-8 pb-6 last:pb-0";
    
    let icono = 'ph-money';
    let colorFondo = 'bg-brand-50 text-brand-600';
    if (p.tipo === 'inscripcion') { icono = 'ph-id-card'; colorFondo = 'bg-blue-50 text-blue-600'; }
    if (p.tipo === 'uniforme') { icono = 'ph-t-shirt'; colorFondo = 'bg-purple-50 text-purple-600'; }

    item.innerHTML = `
      <div class="absolute left-0 top-0 w-8 h-8 rounded-full ${colorFondo} border-2 border-white shadow-sm flex items-center justify-center z-10 ring-4 ring-slate-50">
        <i class="ph ${icono} text-sm font-bold"></i>
      </div>
      <div class="pl-3">
        <div class="flex justify-between items-start">
          <p class="text-xs font-bold text-slate-700 leading-tight">
            ${p.jugador || 'Jugador desconocido'}
          </p>
          <span class="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
            ${fechaCorta}
          </span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <p class="text-[10px] text-slate-500">Pago de mensualidad</p>
          <span class="text-xs font-bold text-emerald-600">$${Number(p.monto).toLocaleString()}</span>
        </div>
        <p class="text-[10px] text-slate-400 mt-0.5">${hora}</p>
      </div>
    `;
    containerActividad.appendChild(item);
  });
}

// ==========================
// EXPORTACIÓN A EXCEL
// ==========================
function exportarExcel() {
  if (typeof XLSX === 'undefined') {
    alert("La librería de Excel (XLSX) no está cargada.");
    return;
  }
  if (jugadoresList.length === 0) {
    alert("No hay datos de jugadores para exportar.");
    return;
  }

  try {
    const datosExportar = jugadoresList.map(j => {
      const valor = Number(j.mensualidad);
      let estado = 'Pendiente';
      if (valor >= MENSUALIDAD_OBJETIVO) estado = 'Pago';
      else if (valor > 0) estado = 'Abono';

      return {
        "Nombre Completo": `${j.nombre} ${j.apellidos}`,
        "Categoría": j.categoria || '-',
        "Teléfono": j.telefono || '-',
        "Estado": estado,
        "Mensualidad": valor
      };
    });

    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Jugadores EFUSA");

    const fecha = new Date().toISOString().slice(0,10);
    XLSX.writeFile(libro, `Reporte_Jugadores_${fecha}.xlsx`);
  } catch (error) {
    console.error(error);
    alert("Error al generar Excel.");
  }
}

// ==========================
// EXPORTACIÓN A PDF
// ==========================
function exportarPDF() {
  if (typeof window.jspdf === 'undefined') {
    alert("La librería jsPDF no está cargada.");
    return;
  }
  if (jugadoresList.length === 0) {
    alert("No hay datos para exportar a PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Reporte de Jugadores - EFUSA", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);

  const datosTabla = jugadoresList.map(j => {
    const valor = Number(j.mensualidad);
    let estado = 'Pendiente';
    if (valor >= MENSUALIDAD_OBJETIVO) estado = 'Pago';
    else if (valor > 0) estado = 'Abono';

    return [
      `${j.nombre} ${j.apellidos || ''}`,
      j.categoria || '-',
      j.telefono || '-',
      estado,
      `$${valor.toLocaleString()}`
    ];
  });

  doc.autoTable({
    head: [['Nombre', 'Categoría', 'Teléfono', 'Estado', 'Monto']],
    body: datosTabla,
    startY: 35,
    headStyles: { fillColor: [22, 163, 74] }, // Verde
    styles: { fontSize: 9 }
  });

  doc.save(`Reporte_Jugadores_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ==========================
// UTILIDADES
// ==========================
function toggleSidebar(abrir) {
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (abrir) {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden', 'opacity-0');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}

function mostrarErrorCritico() {
  if (tabla) {
    tabla.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-rose-600 font-bold">
      Error Crítico: No se pudieron cargar los datos.<br>
      <span class="text-xs text-rose-400 font-normal">Verifica tu conexión.</span>
    </td></tr>`;
  }
}

// Exportar funciones globales
window.cambiarPagina = cambiarPagina;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.toggleSidebar = () => toggleSidebar(true);