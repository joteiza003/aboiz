# Especificación técnica resumida

## Ejecución local autónoma

`server/local-server.mjs` sirve los archivos de la interfaz y expone `POST /api/aboiz26` con el mismo contrato funcional que el endpoint Wix. Escucha en `127.0.0.1:4173` por defecto. La persistencia se guarda de forma local en `.data/aboiz.json`; las claves de firma y protección de códigos se generan una vez y persisten en `.data/secrets.json`, por lo que sesiones y códigos siguen siendo válidos tras reiniciar el servidor. `.data/` no se versiona.

Este modo implementa los tres roles, sesiones firmadas de cuatro horas, alta y edición, sorteo, códigos revocables y listas de deseos. Las mutaciones se serializan para evitar escrituras simultáneas sobre el archivo. Está pensado para ejecución en un único ordenador; el despliegue público utiliza Wix CMS.

## Un único sitio estático

`index.html` carga `assets/app.js`, `assets/style.css` y `config.js`. Tres entradas iniciales: Joseba (admin), David (gestor), código personal. Una única URL móvil. No hay cookies, contraseñas, emparejamientos ni códigos reales en el repositorio. La sesión de 4 horas se almacena en `sessionStorage`, no persiste entre navegadores.

## Backend privado Wix Studio (Velo)

Endpoint `POST /_functions/aboiz26` y `OPTIONS /_functions/aboiz26` (preflight CORS). Acciones de sesión: `login`, `codeLogin`, `me`. Acciones administrativas: `addPerson`, `updatePerson`, `removePerson`, `draw`, `invalidateDraw`, `issueCode`. Acción de participante: `saveWish`.

CORS admite únicamente `https://joteiza003.github.io` y no otorga autorización. Los roles son verificados por token HMAC firmado con secreto de Wix; los invitados quedan vinculados a su `_id` y `rev` actual. Los códigos aleatorios se almacenan como SHA-256 del código precedido de un secreto privado; se revelan al administrador solamente al generarlos. Los resultados se mantienen en Wix y no se devuelven a David.

## Esquema de colecciones

- `AI26_Participantes`: `name` (TEXT), `email` (TEXT), `year` (TEXT), `active` (BOOLEAN), `codeHash` (TEXT), `rev` (TEXT).
- `AI26_Sorteos`: `year` (TEXT), `active` (BOOLEAN), `pairs` (OBJECT `{participantId: recipientId}`), `createdAt` (DATETIME).
- `AI26_Deseos`: `personId` (TEXT), `year` (TEXT), `selected` (ARRAY), `other` (TEXT).

Permisos directos de los tres CMS: `read`, `insert`, `update`, `remove` => `ADMIN`. Las operaciones públicas usan `wix-data` en el backend con `suppressAuth:true` **después** de verificar credenciales y restricciones.

## Regla del sorteo

Permutación aleatoria sin autoasignaciones, con opción de evitar parejas recíprocas y validación de las reglas internas. Se bloquea la modificación de participantes una vez realizado el sorteo. Para regenerarlo se anulan resultados y códigos anteriores (las preferencias persisten por participante). Los resultados no se publican en GitHub.

## Riesgos y límites

- La API HTTP externa de Wix está documentada como integración server-to-server; CORS y el runtime deben validarse en tu sitio publicado.
- No hay semáforo transaccional distribuido sobre la generación del sorteo: no utilizar dos sesiones administrativas simultáneas para sortear.
- Sesiones admin firmadas permanecen válidas hasta 4h si se cambia la contraseña sin rotar la clave de firmado. Para invalidarlas inmediatamente, rota `ABOIZ_SIGNING_KEY`.
- No hay envío automático de invitaciones, seguimiento de entregas ni rate limit persistente; estas funciones quedan explícitamente fuera de esta entrega.
- La fotografía de portada proviene de URL de la V9, no es un archivo propio en esta entrega.

## Fuentes técnicas oficiales

- Wix HTTP Functions: https://dev.wix.com/docs/velo/articles/getting-started/expose-an-api
- API CMS Create Collection: https://dev.wix.com/docs/api-reference/business-solutions/cms/collection-management/data-collections/create-data-collection
- API key REST: https://dev.wix.com/docs/api-reference/articles/rest-authentication/rest-api-authentication
- Wix CLI for Sites / Git Integration: https://dev.wix.com/docs/develop-websites/articles/workspace-tools/developer-tools/git-integration-wix-cli-for-sites/setting-up-git-integration-wix-cli-for-sites
- Wix CMS supressAuth: https://dev.wix.com/docs/develop-websites/articles/databases/wix-data/data-api/working-with-the-data-api
