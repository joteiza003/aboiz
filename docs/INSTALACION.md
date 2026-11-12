# INSTALACIÓN PASO A PASO — SIN MODIFICAR OTROS CONTENIDOS WIX

## Uso inmediato en este ordenador

No hace falta configurar Wix para probar o usar la aplicación localmente. Con Node.js 20+ instalado, ejecuta `npm start` en la raíz y abre `http://127.0.0.1:4173`. El servidor escucha únicamente en el propio equipo, guarda los datos en `.data/` y muestra en la consola las credenciales locales cuando no se han definido variables propias.

Antes de utilizar datos reales, define `ABOIZ_ADMIN_PASSWORD` y `ABOIZ_DAVID_PASSWORD` con valores únicos de 16 caracteres o más. Ejecuta `npm test` para comprobar el recorrido integral. El resto de esta guía corresponde al despliegue público con GitHub Pages y Wix.

## 0 · Antes de empezar

**No se modifica tu sitio actual al extraer el ZIP ni al subirlo a GitHub.** Se necesita: Node.js 20+ para el modo local; para Wix CLI, Node.js 24.22.1 o posterior, GitHub y acceso de propietario a Wix Studio. La instalación de las 3 colecciones modifica únicamente el CMS del sitio seleccionado y **solo cuando autorizas `--apply`**. Publicar código Velo SÍ actualiza el sitio Wix y podría publicar cambios pendientes en otras partes; guarda una copia y revisa antes de pulsar Publicar.

### Separación recomendada para Wix

Puedes reutilizar el mismo inicio de sesión y la misma cuenta Wix. Para evitar afectar al otro proyecto, crea un sitio Wix paralelo dedicado a Aboiz y deja que Wix genere su propio repositorio de Git Integration. Clónalo en una carpeta hermana, por ejemplo `ABOIZ-WIX`; no conviertas esta carpeta estática en el repositorio de otro sitio Wix ni reutilices el repositorio enlazado al proyecto anterior.

Esta separación mantiene independientes el CMS, los secretos, el endpoint y las publicaciones. La carpeta actual continúa siendo el frontend y el servidor local. Solo cuando el sitio paralelo esté verificado se copia o fusiona `wix-backend/http-functions.js` en el repositorio generado por Wix.

La CLI `@wix/cli` para sitios existentes es una herramienta de desarrollo/publicación vinculada a Git Integration, no el mecanismo de crear estas colecciones en el repositorio estático de GitHub Pages. Para evitar vincular o alterar tu sitio, el instalador usa la **API REST oficial de Wix CMS**, desde un script de línea de comandos de Node. Opcionalmente podrás usar Wix CLI en un repositorio separado de tu sitio, sin usar `wix publish` desde este proyecto.

## 1 · Publicar GitHub Pages

1. Extrae el ZIP en tu ordenador.
2. En GitHub crea el repositorio público **`amigo-invisible-aboiz`** (o el nombre que prefieras). Importante: **no** lo confundas con un posible repositorio vinculado a tu sitio Wix Studio.
3. Sube el **contenido** de la carpeta extraída a la raíz del repositorio (`index.html` debe quedar arriba, no dentro de otra carpeta).
4. En **Settings → Pages → Build and deployment**, configura **Deploy from a branch → `main` → `/(root)`** y guarda.
5. La web estará en `https://joteiza003.github.io/amigo-invisible-aboiz/` si usas la cuenta y nombre de ejemplo. Al principio avisará de que falta conectar Wix: es normal.
6. La página incluye etiqueta `noindex`, pero la URL y el código son públicos. No publiques capturas o datos de participantes en el repo.

## 2 · Preparar la API key del CMS

1. En el panel Wix, abre **API Keys Manager** y crea una nueva clave con el permiso mínimo **Manage Data Collections** para el sitio correcto. No selecciones otros permisos innecesarios.
2. Identifica el **SITE ID** exacto desde la URL del dashboard de Wix (`/dashboard/<site-id>`).
3. Guarda la clave solo en el ordenador: no la pegues en `config.js`, ni en un archivo de GitHub, ni la compartas aquí.
4. En **Windows PowerShell**, abre una consola en la carpeta extraída y usa (reemplaza los valores localmente):

```powershell
$env:WIX_SITE_ID = 'TU_ID_REAL'
$env:WIX_API_KEY = 'TU_CLAVE_PRIVADA'
node --version
npm run wix:plan
npm run wix:check
```

`wix:plan` no llama a la red ni crea nada; `wix:check` solo lee las tres colecciones por ID. Si falla por permisos, NO continúes. Revisa que la API key y site ID correspondan a la web correcta.

## 3 · Crear las tres colecciones, **solo una vez**

Solo después de ver que `AI26_Participantes`, `AI26_Sorteos` y `AI26_Deseos` figuran como `MISSING`, ejecuta:

```powershell
npm run wix:create
```

El script pedirá confirmar escribiendo **`CREAR <SITE_ID>`** literalmente. Antes de crear vuelve a consultar el ID. Si cualquiera ya existe, se detiene: **no hace cambios sobre colecciones existentes**, ni reemplaza campos, ni borra registros. Si hay un error tras crear alguna, el script NO hace borrado automático. Entra en Wix CMS para revisar el estado antes de reintentar.

Verifica en Wix CMS que los 3 nombres aparecen, que la estructura coincide y que **read/insert/update/remove = ADMIN**. Si no puedes crear una API key con permisos suficientes, crea las 3 colecciones manualmente con los campos indicados por `npm run wix:plan` y permisos ADMIN. No crees colecciones con permisos públicos.

## 4 · Crear secretos en Wix Secrets Manager

Añade los siguientes **4 secretos obligatorios**, valores únicos y fuertes:

| Nombre secreto | Contenido |
|---|---|
| `ABOIZ_ADMIN_PASSWORD` | Contraseña de Joseba, **mínimo 16 caracteres**, única. Preferible 24+ aleatorios. |
| `ABOIZ_DAVID_PASSWORD` | Contraseña compartida del acceso a participantes, **mínimo 14 caracteres**. |
| `ABOIZ_SIGNING_KEY` | Cadena aleatoria impredecible de 32+ bytes para firmar sesiones. |
| `ABOIZ_CODE_PEPPER` | Otra cadena aleatoria de 32+ bytes para proteger hashes de códigos. |

Puedes generar claves aleatorias en PowerShell sin subirlas a Internet:

```powershell
$b = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($b)
[Convert]::ToBase64String($b)
$rng.Dispose()
```

Ejecuta dos veces y guarda valores distintos para SIGNING_KEY y CODE_PEPPER. No publiques esas salidas en GitHub. Wix puede requerir habilitar Secrets Manager; revisa los permisos de tu plan.

## 5 · Incorporar el backend Velo de modo seguro

1. En Wix Studio abre el **sitio correcto** y el panel **Código → Backend**.
2. **Haz copia del archivo `http-functions.js` si ya existe.** Nunca reemplaces un archivo en producción sin revisar sus funciones actuales.
3. Si no existe, crea `Backend/http-functions.js` y pega `wix-backend/http-functions.js`. Si existe, fusiona los nuevos `import` y las exportaciones `post_aboiz26` y `options_aboiz26` **sin borrar o duplicar las funciones existentes**. Las funciones auxiliares también se necesitan: si hay colisiones de nombres, se deben resolver con un archivo backend propio antes de publicar.
4. Comprueba que `ALLOWED_ORIGIN` contiene exactamente el origen de tu GitHub Pages: `https://joteiza003.github.io` (NO se pone la ruta `/amigo-invisible-aboiz`). Si usas otra cuenta GitHub cámbialo.
5. **No ejecutes `wix publish` en este repositorio.** En el editor Wix comprueba el código, prueba en modo previa, revisa los cambios pendientes del resto de tu sitio y **publica manualmente** solo cuando estés conforme. La publicación en Wix puede incluir otros cambios no publicados.
6. La API quedará en tu URL Wix: `https://www.TU-DOMINIO.com/_functions/aboiz26` (si es sitio premium) o en la URL `...wixsite.com/.../_functions/aboiz26` si es gratuito. Verifica la URL real en Wix. Los endpoints externos pueden tener particularidades de CORS y versión del SDK: es imprescindible comprobarlos con la página publicada.

## 6 · Conectar la web con Wix

Edita **solo** `config.js` en GitHub y cambia `apiUrl` por la URL HTTPS real del paso 5. No pongas valores secretos. Haz commit y espera a que GitHub Pages actualice los archivos.

Para comprobar CORS y el backend: abre las herramientas de desarrollador (F12), panel Network, intenta acceder con una contraseña de prueba, e inspecciona errores. Un error CORS o 403 debe resolverse antes de difundir enlaces. **No inventes resultados ni uses el sorteo real hasta probar todo el recorrido.**

## 7 · Pruebas imprescindibles

- Accede como Joseba, añade tres personas ficticias, edita una y retira otra. Debe bloquearse la edición cuando hay sorteo.
- Comprueba que la sesión de David no muestra emparejamientos y que una petición directa a `me` con su sesión tampoco los devuelve.
- Añade al menos 3 participantes activos, ejecuta primero la prueba sin guardar y después realiza el sorteo. Comprueba que nadie se regala a sí mismo y que se respetan las exclusiones.
- Genera un código por participante, cópialo fuera del repositorio e introduce uno desde el móvil. Verifica que solo se ve el destinatario y sus deseos.
- Guarda una lista en blanco, otra con categorías y otra con texto. Recarga la página y comprueba persistencia.
- Regenera un código: el anterior debe fallar. Anula el sorteo: todos los anteriores deben fallar.
- Prueba en dos móviles reales y con el navegador sin sesión.
- **Antes del evento real, elimina o desactiva únicamente los datos ficticios del proyecto**, sin tocar colecciones ajenas. Ten en cuenta que el script no elimina datos ni colecciones; el borrado es manual y debe decidirlo Joseba.

## 8 · Publicar de verdad

Una vez superadas las pruebas, introduce participantes reales, genera sorteo, comprueba resultados solo como Joseba y prepara individualmente cada invitación. El panel permite copiar el mensaje y abrir correo o WhatsApp, pero **el envío final siempre lo confirma Joseba**. No envíes contraseñas administrativas a participantes.

## 9 · Precauciones

- GitHub Pages es público. La directiva `noindex` no es control de acceso. Cualquier archivo incluido en el repositorio público se puede leer.
- HTTPS es obligatorio. No uses la API REST con `WIX_API_KEY` en el navegador; la clave solo la utiliza el instalador local.
- Las llamadas externas a Wix HTTP Functions se consideran anónimas: todos los roles se validan en código servidor y los secretos no salen del backend.
- No hay una capa de limitación de intentos persistente; configura claves fuertes, no hagas pública la web de forma masiva y monitorea el uso. Para un sistema más expuesto, añade protección contra abuso antes de lanzarlo.
- La disponibilidad de las API Wix, sus permisos y el plan CMS puede cambiar: confirma las cuotas vigentes en tu cuenta.
