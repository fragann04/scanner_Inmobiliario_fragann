# Cómo ver quién encuentra Scanner Inmobiliario y quién se suscribe

Guía práctica en dos partes: **cómo te encuentran** (buscadores) y **de dónde
viene cada suscriptor** (altas). Todo lo que aparece marcado como «ya hecho»
está en el repositorio; lo demás son pasos de 10 minutos que solo puedes dar tú,
porque hacen falta tus cuentas.

---

## 1. Cómo te encuentran en Google

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

## 2. De dónde viene cada persona que se suscribe

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

## 3. Límites que conviene tener claros

- **No hay recuento de visitas totales.** El sitio es estático (GitHub Pages):
  sin servidor propio no se puede contar visitantes sin meter un servicio
  externo. Search Console te dará las que vienen de buscadores, y los correos de
  alta las que se convierten en suscriptor. Entre medias (alguien que entra y no
  se registra) queda a ciegas salvo que un día añadas una analítica tipo
  Plausible o Google Analytics — eso ya obligaría a un aviso de cookies.
- **El listado de suscriptores es tu bandeja de correo.** Las altas se crean en
  el navegador del usuario y te llegan por email vía formsubmit.co; no hay base
  de datos que consultar. Crea un filtro en Gmail con el asunto «Nueva
  suscripción Scanner REO» y una etiqueta: ahí tienes el registro completo y
  ordenado.
- **Los exploradores por provincia no se indexan** a propósito, porque piden
  clave. Si algún día quieres tráfico de búsquedas del tipo «pisos de banco en
  Cuenca», haría falta una versión pública reducida de esas páginas.
