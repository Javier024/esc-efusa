const API_BASE = '/api';

// ==========================
// CONSTANTES GLOBALES
// ==========================
// Esta línea es necesaria para que dashboard.js funcione.
// Si cambias este valor (ej: a 60000), se actualiza en toda la app automáticamente.
export const MENSUALIDAD_OBJETIVO = 50000;

// ==========================
// FUNCIÓN DE CONEXIÓN
// ==========================
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // 1. Configuración de Headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 2. Lógica del Body
  let body = options.body;
  
  // Convertimos a JSON si es un objeto simple (no es FormData)
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options, 
      headers: headers, 
      body: body, 
    });

    // Intentar leer la respuesta
    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.indexOf("application/json") !== -1) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error('❌ Error API (Status', response.status, '):', responseData);
      
      // Extraemos el mensaje de error del backend
      const msg = (responseData && responseData.detalle) || responseData.error || 'Error desconocido en el servidor';
      throw new Error(msg);
    }

    return responseData;
  } catch (error) {
    console.error('❌ Error en apiFetch (Red):', error);
    throw error;
  }
}

