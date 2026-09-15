# Cómo ver quién encuentra Scanner Inmobiliario y quién se suscribe

Guía práctica en tres partes: **cómo te encuentran** (buscadores), **cuántas
visitas tienes y de dónde llegan** (todas, se registren o no) y **de dónde viene
cada suscriptor** (altas). Todo lo que aparece marcado como «ya hecho» está en
el repositorio; lo demás son pasos de 5 o 10 minutos que solo puedes dar tú,
porque hacen falta tus cuentas.

---

## 1. Cómo te encuentran en los buscadores

### Lo que ya está hecho

- `robots.txt` — deja indexar las páginas públicas (portada, *explorar* y los
  textos legales) y bloquea lo privado: `cuentas/`, acceso, gracias, ampliar,
  el generador de enlaces y los exploradores por provincia (piden clave, así que
  a Google no le sirven).
- `sitemap.xml` — la lista de páginas públicas que Google debe revisar.
- Etiquetas `canonical`, Open Graph y Twitter Card en la portada y en *explorar*:
  fijan la dirección buena y hacen que al compartir el enlace por WhatsApp o
  redes salga el título, el texto y la imagen correctos.
- Ficha `JSON-LD` del sitio en la portada.

### Lo que tienes que hacer tú (una vez)

1. Entra en **Google Search Console**: <https://search.google.com/search-console>
2. Añade la propiedad `https://www.scannerinmobiliario.com`.
3. Elige verificar con **etiqueta HTML**. Google te da una línea parecida a
   `<meta name="google-site-verification" content="abc123...">`.
4. Abre `index.html`, busca el bloque comentado que ya está preparado en el
   `<head>` (dice *PEGA-AQUI-TU-CODIGO*), pon tu código y quita las marcas de
   comentario `<!--` y `-->`. Sube el cambio.
5. Pulsa «Verificar» en Google.
6. En Search Console, menú **Sitemaps**, escribe `sitemap.xml` y envía.

### Aviso automático de rastreo (ya hecho, sin cuentas ni contraseñas)

Un buscador solo actualiza lo que sabe de tu web cuando vuelve a pasar por ella.
**IndexNow** invierte eso: en cuanto cambia una página pública, le avisamos
nosotros de que vuelva a leerla. Lo admiten Bing, Yandex, Seznam y Naver
(Google no lo usa: para Google mandan el sitemap y Search Console).

Ya está conectado y no requiere ninguna cuenta:

| Pieza | Para qué |
|---|---|
| `72bb9ac1ae059ef2ad4de5d999088920.txt` | La clave. Vive en la raíz del sitio; el buscador la lee para comprobar que el aviso es tuyo. **No la borres ni la renombres.** |
| `.github/indexnow.py` | Arma el aviso con las direcciones del `sitemap.xml` y lo envía. |
| `.github/workflows/indexnow.yml` | Lo lanza solo, en GitHub, cada vez que cambia una página pública. |

Salta únicamente cuando cambian la portada, *explorar*, el sitemap o los
legales. Las actualizaciones diarias de datos tocan los exploradores por
provincia, que no se indexan, así que no generan avisos inútiles.

Para lanzarlo a mano: en GitHub, pestaña **Actions** → «Avisar a los buscadores
(IndexNow)» → botón **Run workflow**. Para ver qué enviaría sin enviar nada,
desde el repositorio: `python3 .github/indexnow.py --prueba`.

### Qué verás a partir de entonces

En **Rendimiento** → cada búsqueda real que lleva gente al sitio: la consulta
escrita («pisos de banco Málaga», «subastas BOE rentabilidad»…), cuántas veces
apareciste, cuántos clics y en qué posición. Los datos empiezan a acumularse
desde la verificación, no hay histórico anterior. Tarda unos días en llenarse.

En **Páginas** → qué páginas están indexadas y cuáles no, con el motivo.

> Opcional: lo mismo, gratis, para Bing y ChatGPT-search en
> <https://www.bing.com/webmasters> (acepta importar la propiedad desde Search
> Console en dos clics).

---

## 2. Cuántas visitas tienes y de dónde llega cada una

Esto responde a «no sé por dónde vienen los usuarios que encuentran mi página».
El apartado 3 mide solo a quien **se da de alta**; este mide a **todo el que
entra**, se registre o no.

Lo hace **Cloudflare Web Analytics**: gratis y sin límite de visitas, **sin
cookies** y sin huella digital del navegador, así que no hace falta banner de
consentimiento (la razón por la que no te propongo Google Analytics, que sí lo
exigiría y obligaría a rehacer la parte legal).

### Lo que tienes que hacer tú (una vez, 5 minutos)

1. Crea una cuenta gratis en <https://dash.cloudflare.com/sign-up> (no hace
   falta mover el dominio a Cloudflare ni tocar nada del DNS).
2. En el menú lateral: **Analytics & Logs → Web Analytics → Add a site**.
3. Escribe `www.scannerinmobiliario.com`.
4. Te dará un fragmento con un **token** (una cadena larga de letras y números).
   Copia solo el token, no el fragmento entero.
5. Abre `medicion.js`, línea 8 aproximadamente, y pégalo entre las comillas:

   ```js
   var TOKEN_ANALITICA = "pega-aqui-tu-token";
   ```

6. Sube el cambio. Ya está: no hay que tocar ninguna página más.

### Qué verás en el panel de Cloudflare

- **Visitas y páginas vistas**, por día.
- **Referrers**: de qué web llega cada visita — esto es exactamente lo que
  buscabas.
- **Países**, **navegadores**, **sistemas operativos**, móvil o escritorio.
- **Qué páginas** son las más vistas.

### Detalles que conviene saber

- **Mientras el token esté vacío no se carga nada de fuera** y la web funciona
  igual que ahora: no cuenta visitas, pero tampoco añade ninguna dependencia.
- **El texto legal se activa solo.** Las páginas de cookies y privacidad llevan
  un párrafo y una fila de proveedor ocultos que aparecen únicamente cuando el
  token está puesto. Así nunca declaran algo que no se esté cumpliendo, ni al
  revés. No tienes que editar nada a mano.
- **Se mide en las 11 páginas fijas** del sitio (portada, explorar, acceso,
  gracias, valorar, precios, ampliar, marcador y los tres textos legales).
- **Los `explorador-<provincia>.html` no se miden todavía**: los regenera tu
  proceso automático cada día, así que cualquier línea que yo añada ahí se
  perdería en la siguiente actualización. Para incluirlos hay que añadir
  `<script src="medicion.js"></script>` a la plantilla del generador. Dime
  dónde está y lo dejo hecho.
- Comprobar que funciona: abre la web, F12 → **Consola** y escribe
  `REO_MEDICION.contador`. Responde `activo` o `sin token (no se cuentan las
  visitas)`.

## 3. De dónde viene cada persona que se suscribe

### Lo que ya está hecho

`medicion.js` guarda en el navegador del visitante, **en su primera visita**, el
sitio desde el que llegó. Cuando esa persona rellena el alta, ese dato viaja con
el formulario y aparece en el correo de «🆕 Nueva suscripción Scanner REO» que
recibes en `fleximaxca@gmail.com`, junto al nombre, email y provincia:

| Campo | Ejemplo |
|---|---|
| `origen` | Búsqueda en Google · WhatsApp · Instagram · Directo o app · Otra web |
| `detalle_origen` | `google.es`, `l.wa.me`, `idealista.com`… |
| `campana` | `grupo-inversores` (solo si compartiste un enlace etiquetado) |
| `pagina_entrada` | `/index.html` o `/explorar.html` |
| `primera_visita` | `2026-09-11` |
| `visitas` | `3` (cuántas veces volvió antes de decidirse) |
| `dispositivo` | `Móvil`, `Ordenador`, `Móvil (app instalada)` |

No usa cookies, ni píxeles, ni servicios de terceros: es cálculo del propio
navegador. Si la persona no se registra, el dato no sale nunca de su móvil.
Está reflejado en la política de cookies y en la de privacidad.

### Etiqueta tus enlaces cuando los compartas

Así distingues un canal de otro aunque el navegador no informe de la
procedencia (habitual en WhatsApp desde móvil):

```
https://www.scannerinmobiliario.com/?utm_source=whatsapp&utm_campaign=grupo-inversores
https://www.scannerinmobiliario.com/?utm_source=instagram&utm_campaign=bio
```

Lo que pongas en `utm_source` y `utm_campaign` es lo que verás en el correo de
alta. Una etiqueta manda siempre sobre lo que detecte el navegador.

### Comprobar que funciona

Abre el sitio, pulsa F12 → **Consola** y escribe:

```js
REO_MEDICION.resumen()
```

Responde algo como *«Llegaste por: Búsqueda en Google (google.es) · primera
visita: 2026-09-11 · visitas: 2 · Ordenador»*. Para probar una etiqueta, abre
`https://www.scannerinmobiliario.com/?utm_source=prueba` en una ventana de
incógnito y repite.

---

## 4. Límites que conviene tener claros

- **El recuento de visitas empieza el día que pegues el token** del apartado 2.
  El sitio es estático (GitHub Pages): sin servidor propio no hay registro de
  visitas anteriores que recuperar, ni con Cloudflare ni con nada. Lo de antes
  no se puede reconstruir.
- **Ninguna medición es retroactiva, en general.** Search Console empieza a
  acumular el día que verificas; el origen de las altas, el día que se publique
  este cambio. De los suscriptores que ya tienes no se puede saber por dónde
  llegaron.
- **El listado de suscriptores es tu bandeja de correo.** Las altas se crean en
  el navegador del usuario y te llegan por email vía formsubmit.co; no hay base
  de datos que consultar. Crea un filtro en Gmail con el asunto «Nueva
  suscripción Scanner REO» y una etiqueta: ahí tienes el registro completo y
  ordenado.
- **Los exploradores por provincia no se indexan** a propósito, porque piden
  clave. Si algún día quieres tráfico de búsquedas del tipo «pisos de banco en
  Cuenca», haría falta una versión pública reducida de esas páginas.
