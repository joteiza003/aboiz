# Amigo Invisible Aboiz — GitHub Pages + Wix CMS

Aplicación móvil de **una página**, con acceso **Administración (Joseba)**, **Acceso a participantes** mediante contraseña compartida y **Código personal**. Interfaz inspirada en la V9: fotografía de Aboiz, verde oscuro, tarjetas claras y caja animada. Lista de deseos **totalmente opcional**, con 7 categorías y texto libre.

La carpeta incluye un **servidor local completo** para utilizar y probar todo el recorrido sin servicios externos. Para publicar la web en Internet, se mantiene el backend privado de Wix Studio, que requiere instalación y publicación autorizadas en tu cuenta.

## Arranque local

Requiere Node.js 20 o posterior. Desde esta carpeta:

```powershell
npm start
```

Abre `http://127.0.0.1:4173`. En el primer arranque se generan accesos locales aleatorios para Joseba y David y se muestran en la consola.

Los datos persisten en `.data/aboiz.json`; las claves internas y accesos locales quedan en `.data/secrets.json`. La carpeta `.data/` está excluida de Git. Para elegir contraseñas propias antes de arrancar:

```powershell
$env:ABOIZ_ADMIN_PASSWORD = 'TU_CONTRASEÑA_DE_16_O_MÁS_CARACTERES'
$env:ABOIZ_DAVID_PASSWORD = 'OTRA_CONTRASEÑA_DE_16_O_MÁS_CARACTERES'
npm start
```

Ejecuta `npm test` para validar el flujo completo. Las credenciales locales predeterminadas son solo para uso en este ordenador: para publicar, configura Wix siguiendo la guía y utiliza secretos distintos.

## Instalación guiada

**Sigue [docs/INSTALACION.md](docs/INSTALACION.md)** de principio a fin para publicar. Wix requiere autenticación y publicación manual, que aquí no se han realizado.

### Contenido

- `index.html`, `assets/`, `config.js`, `robots.txt`, `.nojekyll`: interfaz web.
- `server/local-server.mjs`: servidor local completo, API y persistencia para ejecutar la app con `npm start`.
- `wix-backend/http-functions.js`: backend Velo, **no se ejecuta en GitHub**. Se fusiona en el editor Wix, sin reemplazar archivos existentes.
- `tools/collections.mjs`: instalador aislado de colecciones (Node.js; usa **REST CMS Wix** con clave propia; no es un comando nativo de Wix CLI).
- `docs/`: instalación, arquitectura y comprobaciones.
- `tests/`: comprobaciones automáticas de estructura y del flujo integral local, sin tocar Wix.

### Resumen seguridad

Tres colecciones CMS exclusivas con permisos ADMIN: `AI26_Participantes`, `AI26_Sorteos`, `AI26_Deseos`. Los participantes reciben códigos aleatorios y el backend guarda solo su hash. El acceso compartido a participantes no recibe emparejamientos. Los visitantes no acceden al CMS directamente. Los secretos se gestionan **solo en Wix Secrets Manager**. Sesiones de 4 horas y revocación de códigos. **No distribuir códigos por GitHub ni ponerlos en el repositorio.**

`noindex` desaconseja la indexación, **no** convierte en privada la página ni garantiza desaparición de todos los buscadores. El repositorio público seguirá siendo visible en GitHub; no se incluyen datos reales.

### Límites conocidos

- **No se envían mensajes automáticamente**: el panel prepara el texto y abre correo o WhatsApp para que Joseba revise y confirme el envío manualmente. Así evitamos servicios externos y envíos accidentales.
- El endpoint HTTP Velo recibe llamadas externas desde el navegador mediante CORS; debe confirmarse en el sitio publicado real, pues Wix documenta estos endpoints principalmente para integraciones server-to-server.
- La comprobación de sintaxis/estructura local **no reemplaza las pruebas en Wix**. No se ha desplegado ni ensayado una transacción real con tu CMS.
- Si hay varios administradores simultáneos, las operaciones de sorteo y edición no son transaccionales; se recomienda un único operador durante la generación del sorteo.
- No hay limitador persistente de intentos en el backend: usar contraseñas largas y códigos de alta entropía; añadir protección de abuso antes de una difusión amplia.
- El fondo utiliza una URL externa de fotografía de la V9, que podría dejar de estar disponible. Sustituirlo por un recurso propio con derechos de uso.
