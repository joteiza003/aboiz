// ÚNICA CONFIGURACIÓN PÚBLICA. Pega aquí la URL publicada del backend Velo Wix.
// Ejemplo: https://www.tudominio.com/_functions/aboiz26
// No pongas contraseñas, claves API ni códigos personales en este archivo.
window.ABOIZ_CONFIG = Object.freeze({
  apiUrl: ['localhost','127.0.0.1'].includes(location.hostname) ? '/api/aboiz26' : 'https://baztango13.wixstudio.com/aboiz/_functions/aboiz26',
  eventName: 'Amigo invisible Aboiz',
  year: 2026
});
