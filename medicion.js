// ─── Medición de origen — Scanner Inmobiliario ───────────────────────────────
// Responde a dos preguntas: ¿cómo nos encuentran? y ¿de dónde viene quien se
// suscribe?
//
// Funciona entero dentro del navegador del visitante: sin cookies, sin píxeles
// y sin enviar nada a ningún tercero. Solo guarda, en la PRIMERA visita, desde
// qué sitio llegó (Google, WhatsApp, un enlace…). Si después esa persona se da
// de alta, ese dato viaja con el formulario y aparece en el aviso de alta que
// llega por email. Si no se da de alta, el dato nunca sale de su navegador.
(function () {
  "use strict";

  var CLAVE = "reo_origen";

  // ── Cómo se traduce el sitio de procedencia a un nombre legible ────────────
  var FUENTES = [
    { re: /(^|\.)google\./,                 nombre: "Búsqueda en Google" },
    { re: /(^|\.)bing\./,                   nombre: "Búsqueda en Bing" },
    { re: /duckduckgo\./,                   nombre: "Búsqueda en DuckDuckGo" },
    { re: /(^|\.)ecosia\./,                 nombre: "Búsqueda en Ecosia" },
    { re: /(^|\.)yahoo\./,                  nombre: "Búsqueda en Yahoo" },
    { re: /(^|\.)yandex\./,                 nombre: "Búsqueda en Yandex" },
    { re: /(whatsapp\.com|wa\.me)/,         nombre: "WhatsApp" },
    { re: /(^|\.)(facebook|fb)\./,          nombre: "Facebook" },
    { re: /instagram\./,                    nombre: "Instagram" },
    { re: /(t\.co$|twitter\.|(^|\.)x\.com)/, nombre: "X (Twitter)" },
    { re: /linkedin\.|lnkd\.in/,            nombre: "LinkedIn" },
    { re: /(t\.me$|telegram\.)/,            nombre: "Telegram" },
    { re: /(youtube\.|youtu\.be)/,          nombre: "YouTube" },
    { re: /reddit\./,                       nombre: "Reddit" },
    { re: /(mail\.google\.|outlook\.|mail\.yahoo\.)/, nombre: "Email" },
    { re: /idealista\./,                    nombre: "Idealista" },
    { re: /fotocasa\./,                     nombre: "Fotocasa" },
    { re: /chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google/,
                                            nombre: "Asistente de IA" }
  ];

  function leerParam(nombre) {
    try {
      return new URLSearchParams(location.search).get(nombre) || "";
    } catch (e) { return ""; }
  }

  function anfitrion(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function clasificar() {
    // 1) Si el enlace trae etiquetas de campaña (utm_source), mandan ellas:
    //    son las que tú pones al compartir el enlace en un anuncio, un grupo…
    var utmFuente = leerParam("utm_source");
    if (utmFuente) {
      return { origen: utmFuente, detalle: leerParam("utm_medium") || "campaña etiquetada" };
    }

    var host = anfitrion(document.referrer);

    // 2) Sin sitio de procedencia: han escrito la dirección, la tenían en
    //    favoritos, la abrieron desde la app instalada o desde una app que
    //    no informa del enlace (es lo habitual en muchos móviles).
    if (!host) return { origen: "Directo o app", detalle: "sin web de procedencia" };

    // 3) Navegación dentro del propio sitio: no es un origen nuevo.
    if (host === location.hostname.replace(/^www\./, "")) return null;

    for (var i = 0; i < FUENTES.length; i++) {
      if (FUENTES[i].re.test(host)) return { origen: FUENTES[i].nombre, detalle: host };
    }
    return { origen: "Otra web", detalle: host };
  }

  function dispositivo() {
    var movil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var enApp = window.matchMedia("(display-mode: standalone)").matches ||
                window.navigator.standalone === true;
    return (movil ? "Móvil" : "Ordenador") + (enApp ? " (app instalada)" : "");
  }

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Registro: la fuente se fija en la PRIMERA visita y ya no se sobreescribe
  //    (salvo que llegue con etiquetas de campaña, que sí interesa actualizar).
  function registrar() {
    var guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) {}

    var nuevo = clasificar();
    var esCampana = !!leerParam("utm_source");

    if (!guardado) {
      // Sin registro previo y llegando desde otra página del sitio: pasó por
      // alguna página sin medición (p. ej. la de acceso). Se anota igualmente
      // para que el alta nunca viaje sin origen.
      if (!nuevo) nuevo = { origen: "Directo o app", detalle: "otra página del sitio" };
      guardado = {
        origen: nuevo.origen,
        detalle: nuevo.detalle,
        campana: leerParam("utm_campaign") || "",
        pagina: location.pathname,
        primera: hoy(),
        visitas: 0
      };
    } else if (nuevo && esCampana) {
      guardado.origen  = nuevo.origen;
      guardado.detalle = nuevo.detalle;
      guardado.campana = leerParam("utm_campaign") || guardado.campana || "";
    }

    guardado.visitas = (guardado.visitas || 0) + 1;
    guardado.ultima = hoy();

    try { localStorage.setItem(CLAVE, JSON.stringify(guardado)); } catch (e) {}
    return guardado;
  }

  // ── Se cuelga del formulario de alta para que el aviso de suscripción diga
  //    por dónde nos encontró esa persona.
  function marcarFormulario(dato) {
    var form = document.getElementById("form-alta");
    if (!form || !dato) return;

    var campos = {
      origen:        dato.origen,
      detalle_origen: dato.detalle,
      campana:       dato.campana || "—",
      pagina_entrada: dato.pagina,
      primera_visita: dato.primera,
      visitas:       String(dato.visitas),
      dispositivo:   dispositivo()
    };

    Object.keys(campos).forEach(function (nombre) {
      var input = form.querySelector('input[name="' + nombre + '"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = nombre;
        form.appendChild(input);
      }
      input.value = campos[nombre];
    });
  }

  var dato = registrar();

  // Consulta desde la consola del navegador: REO_MEDICION.resumen()
  window.REO_MEDICION = {
    datos: dato,
    resumen: function () {
      if (!dato) return "Sin datos de origen en este navegador.";
      return "Llegaste por: " + dato.origen + " (" + dato.detalle + ")" +
             (dato.campana ? " · campaña: " + dato.campana : "") +
             " · primera visita: " + dato.primera +
             " · visitas: " + dato.visitas +
             " · " + dispositivo();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { marcarFormulario(dato); });
  } else {
    marcarFormulario(dato);
  }
})();
