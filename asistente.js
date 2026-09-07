/* ─── Asistente del Scanner REO ───────────────────────────────────────────────
 * Bot de orientación y dudas. Se incrusta con:
 *
 *   <script>window.REO_ASISTENTE = { contexto: "landing" };</script>
 *   <script src="asistente.js" defer></script>
 *
 * contexto: "landing" | "acceso" | "explorar" | "explorador" (cambia el saludo
 * y los atajos que se ofrecen). Si no se declara, se deduce del nombre del
 * archivo.
 *
 * Funciona 100% en el navegador, sin servidor ni clave de API: la web es
 * estática (GitHub Pages), así que meter una clave en el JS la dejaría
 * expuesta a cualquiera. El bot responde desde la base de conocimiento de
 * abajo (BASE) y, cuando no sabe algo, deriva al email de contacto.
 *
 * Para añadir una respuesta nueva: añade un objeto a BASE con sus `claves`
 * (palabras que el visitante escribiría) y su `respuesta` en HTML.
 * ───────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var EMAIL = "fleximaxca@gmail.com";

  // ── Utilidades de texto ────────────────────────────────────────────────────
  function normalizar(t) {
    return (t || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ñ%€ ]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function slugify(s) {
    return normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ── Provincias (para responder "¿tenéis Málaga?") ──────────────────────────
  var PROVINCIAS = ["A Coruña", "Álava", "Albacete", "Alicante", "Almería",
    "Asturias", "Ávila", "Badajoz", "Baleares", "Barcelona", "Bizkaia", "Burgos",
    "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real",
    "Córdoba", "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva",
    "Huesca", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid",
    "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra",
    "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria",
    "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Zamora",
    "Zaragoza"];

  // Sinónimos y gentilicios habituales que la gente escribe.
  var ALIAS = {
    "la coruna": "A Coruña", "coruna": "A Coruña", "vitoria": "Álava",
    "araba": "Álava", "vizcaya": "Bizkaia", "bilbao": "Bizkaia",
    "guipuzcoa": "Gipuzkoa", "san sebastian": "Gipuzkoa", "donostia": "Gipuzkoa",
    "mallorca": "Baleares", "menorca": "Baleares", "ibiza": "Baleares",
    "palma": "Baleares", "gerona": "Girona", "lerida": "Lleida",
    "tenerife": "Santa Cruz de Tenerife", "gran canaria": "Las Palmas",
    "canarias": "Las Palmas", "logrono": "La Rioja", "pamplona": "Navarra",
    "oviedo": "Asturias", "gijon": "Asturias", "santander": "Cantabria",
    "orense": "Ourense", "vigo": "Pontevedra", "terrassa": "Barcelona",
    "sabadell": "Barcelona", "valles": "Barcelona", "hospitalet": "Barcelona",
    "badalona": "Barcelona", "elche": "Alicante", "benidorm": "Alicante",
    "marbella": "Málaga", "torrevieja": "Alicante", "jerez": "Cádiz"
  };

  function provinciaEn(txt) {
    var n = " " + normalizar(txt) + " ";
    for (var a in ALIAS) if (n.indexOf(" " + a + " ") !== -1) return ALIAS[a];
    for (var i = 0; i < PROVINCIAS.length; i++) {
      var p = normalizar(PROVINCIAS[i]);
      if (n.indexOf(" " + p + " ") !== -1) return PROVINCIAS[i];
    }
    return null;
  }

  // ── Base de conocimiento ───────────────────────────────────────────────────
  // peso: las claves de 2+ palabras puntúan más que las sueltas.
  var BASE = [
    {
      id: "que-es",
      titulo: "¿Qué es el Scanner REO?",
      claves: ["que es", "que hace", "para que sirve", "de que va", "explicame",
               "en que consiste", "quienes sois", "que ofreceis", "scanner reo"],
      respuesta:
        "El <b>Scanner REO</b> es un radar automático de oportunidades " +
        "inmobiliarias en España. Cada pocos días rastrea el Portal de Subastas " +
        "del BOE, los portales de los bancos (Solvia, Aliseda, Altamira, " +
        "BuildingCenter), la cartera de Sareb y portales como Fotocasa, y " +
        "para cada " +
        "inmueble calcula los números que importan a un inversor: <b>capital de " +
        "entrada, cashflow y cash-on-cash apalancado</b>.<br><br>" +
        "Lo ves todo en un explorador web con filtros por provincia y municipio.",
      relacionados: ["fuentes", "cash-on-cash", "precio"]
    },
    {
      id: "precio",
      titulo: "¿Cuánto cuesta?",
      claves: ["cuanto cuesta", "precio", "cuesta", "pagar", "pago", "gratis",
               "gratuito", "tarifa", "suscripcion", "cobrais", "cobra", "coste",
               "es de pago", "tarjeta", "prueba"],
      respuesta:
        "<b>Durante la beta es gratis</b>, y no se pide tarjeta.<br><br>" +
        "Cuando el servicio salga de beta, quien esté apuntado tendrá " +
        "condiciones preferentes y se avisará con antelación. La cuenta gratuita " +
        "pasará a incluir 1 provincia a elegir y podrás ampliar a más provincias " +
        "si te interesa. <b>Nunca se cobra nada sin tu confirmación expresa.</b>",
      relacionados: ["registro", "provincias", "baja"]
    },
    {
      id: "registro",
      titulo: "¿Cómo me registro?",
      claves: ["registrar", "registro", "darme de alta", "alta", "crear cuenta",
               "apuntarme", "apuntar", "suscribirme", "quiero entrar",
               "como empiezo", "sign up", "crear acceso"],
      respuesta:
        "En un minuto:<br>" +
        "1. Ve al formulario <a href='index.html#alta'>Apúntate a la beta gratuita</a>.<br>" +
        "2. Pon tu nombre, tu email, la provincia que más te interesa y " +
        "<b>crea tu clave</b> (mínimo 6 caracteres).<br>" +
        "3. Pulsa <i>Crear mi acceso gratis</i> — <b>la cuenta se activa al " +
        "instante</b>, no hay que esperar ningún correo.<br><br>" +
        "A partir de ahí entras siempre desde " +
        "<a href='acceso.html'>Acceder</a> con ese email y esa clave, desde " +
        "cualquier dispositivo.",
      relacionados: ["acceso", "clave-olvidada", "provincias"]
    },
    {
      id: "acceso",
      titulo: "¿Cómo entro a explorar?",
      claves: ["entrar", "acceder", "acceso", "login", "iniciar sesion",
               "como entro", "donde entro", "usuario", "identificarme"],
      respuesta:
        "Desde <a href='acceso.html'>la página de acceso</a>: escribes el email " +
        "con el que te registraste y tu clave, y entras directo al explorador de " +
        "tu provincia.<br><br>" +
        "Una vez dentro, en la cabecera hay un <b>selector de provincia</b> para " +
        "saltar a cualquier otra sin volver a entrar.",
      relacionados: ["clave-olvidada", "no-encuentra-cuenta", "provincias"]
    },
    {
      id: "clave-olvidada",
      titulo: "He olvidado mi clave",
      claves: ["olvide la clave", "olvidado la clave", "perdi la clave",
               "no recuerdo", "recuperar clave", "cambiar clave",
               "clave incorrecta", "contrasena", "password", "resetear"],
      respuesta:
        "No hay recuperación por correo, pero es aún más rápido: " +
        "<b>vuelve a registrarte con el mismo email</b> en " +
        "<a href='index.html#alta'>el formulario de alta</a> y pon una clave " +
        "nueva. Queda activa al momento y sustituye a la anterior; conservas la " +
        "misma cuenta.",
      relacionados: ["acceso", "no-encuentra-cuenta"]
    },
    {
      id: "no-encuentra-cuenta",
      titulo: "Dice que no encuentra mi cuenta",
      claves: ["no encuentra la cuenta", "no existe la cuenta", "no me deja entrar",
               "no funciona el acceso", "error al entrar", "no reconoce mi email",
               "cuenta no encontrada"],
      respuesta:
        "Suele ser una de estas tres:<br>" +
        "• El <b>email no es exactamente</b> el del registro (revisa puntos, " +
        "guiones o si usaste otra dirección).<br>" +
        "• Te registraste hace muy poco: las altas se publican cada pocos " +
        "minutos, prueba de nuevo en un rato.<br>" +
        "• Estás en un navegador distinto y aún no se ha sincronizado. " +
        "<b>Solución rápida:</b> vuelve a registrarte con el mismo email y la " +
        "clave que quieras — se activa al instante.<br><br>" +
        "Si sigue sin ir, escríbenos a <a href='mailto:" + EMAIL + "'>" + EMAIL +
        "</a> y lo miramos.",
      relacionados: ["clave-olvidada", "contacto"]
    },
    {
      id: "provincias",
      titulo: "¿Qué provincias hay?",
      claves: ["provincias", "provincia", "que zonas", "zonas", "donde buscais",
               "cobertura", "toda espana", "ciudades", "comunidad", "region",
               "municipios disponibles"],
      respuesta:
        "<b>Las 52 provincias de España</b>, todas activas y con sus municipios. " +
        "Durante la beta puedes explorarlas todas: eliges una de referencia al " +
        "registrarte, pero el selector de la cabecera te deja cambiar a " +
        "cualquier otra.<br><br>" +
        "Escríbeme el nombre de tu provincia y te digo cómo llegar a ella.",
      relacionados: ["registro", "municipios", "actualizacion"]
    },
    {
      id: "fuentes",
      titulo: "¿De dónde salen los inmuebles?",
      claves: ["de donde salen", "fuentes", "de donde sacais", "origen",
               "que portales", "que bancos", "quien publica", "procedencia",
               "idealista", "habitaclia", "fotocasa", "altamira", "donpiso",
               "servicers"],
      respuesta:
        "Todo de <b>fuentes públicas</b>, y cada ficha enlaza a su web oficial:<br>" +
        "• <b>BOE</b> — Portal de Subastas judiciales y notariales.<br>" +
        "• <b>Servicers bancarios</b>: Solvia (Sabadell), Aliseda (Santander), " +
        "Altamira (doValue/Santander), BuildingCenter (CaixaBank).<br>" +
        "• <b>Sareb</b>, a través de Hipoges, su comercializadora minorista.<br>" +
        "• <b>Portales</b>: Fotocasa y pisos.com.<br>" +
        "• <b>Agencias</b>: donpiso, con su cartera propia en 40 provincias.<br><br>" +
        "Idealista y Habitaclia <b>no</b> se rastrean: sus condiciones de uso y " +
        "sus sistemas anti-bot lo impiden, y preferimos no construir sobre eso.",
      relacionados: ["sareb", "boe", "actualizacion"]
    },
    {
      id: "sareb",
      titulo: "¿Incluye la cartera de Sareb?",
      claves: ["sareb", "banco malo", "hipoges", "cartera publica"],
      respuesta:
        "Sí. Sareb (el llamado «banco malo») <b>no publica fichas en su propia " +
        "web</b>, solo contadores. Su inventario minorista se comercializa a " +
        "través de <b>Hipoges</b>, y de ahí lo rastreamos.<br><br>" +
        "En el explorador esos inmuebles aparecen con la fuente " +
        "<b>SAREB · HIPOGES</b> y enlazan a la ficha oficial de Hipoges.",
      relacionados: ["fuentes", "comprar"]
    },
    {
      id: "boe",
      titulo: "¿Cómo funcionan las subastas del BOE?",
      claves: ["subasta", "subastas", "boe", "puja", "pujar", "judicial",
               "notarial", "deposito", "como se puja"],
      respuesta:
        "Las subastas del BOE son <b>procedimientos oficiales</b>: se puja en el " +
        "Portal de Subastas del BOE con certificado digital o Cl@ve, hay que " +
        "depositar un porcentaje del valor de subasta y el plazo tiene fecha de " +
        "cierre.<br><br>" +
        "Ojo con dos cosas que el Scanner no puede saber por ti: si el inmueble " +
        "está <b>ocupado</b> y qué <b>cargas anteriores subsisten</b>. Antes de " +
        "pujar hay que leer el edicto completo y, si puedes, pedir nota simple " +
        "del Registro.<br><br>" +
        "El Scanner te muestra la oportunidad y sus números; la puja la haces tú " +
        "en el BOE.",
      relacionados: ["comprar", "exactitud", "capital"]
    },
    {
      id: "cash-on-cash",
      titulo: "¿Qué es el cash-on-cash?",
      claves: ["cash on cash", "cashoncash", "coc", "que es el cash",
               "rentabilidad principal", "metrica", "que significa cash"],
      respuesta:
        "Es <b>lo que rinde al año el dinero que tú pones</b>:<br><br>" +
        "<code>cash-on-cash = cashflow anual neto ÷ capital de entrada</code><br><br>" +
        "Es la métrica que manda porque incorpora la financiación: un piso con " +
        "rentabilidad bruta modesta puede dar un cash-on-cash alto si la hipoteca " +
        "trabaja a tu favor, y al revés.<br><br>" +
        "En el explorador, los inmuebles con cash-on-cash estimado <b>≥ 10 %</b> " +
        "se marcan con <b>★</b>.",
      relacionados: ["capital", "cashflow", "rentabilidad"]
    },
    {
      id: "capital",
      titulo: "¿Qué incluye el capital de entrada?",
      claves: ["capital de entrada", "capital", "entrada", "cuanto necesito",
               "cuanto dinero", "desembolso", "ahorros", "que incluye el capital",
               "inversion inicial", "de mi bolsillo"],
      respuesta:
        "Es el dinero que sale de tu bolsillo, no solo la entrada:<br><br>" +
        "<code>20 % del precio + ITP de tu comunidad + ~1,5 % notaría y registro " +
        "+ ~15.000 € de reforma tipo + cargas que subsistan</code><br><br>" +
        "El 80 % restante se supone financiado con hipoteca. Puedes filtrar por " +
        "<b>capital máximo</b> en el explorador para ver solo lo que te encaja: " +
        "el Scanner no descarta nada por tu presupuesto, te enseña las opciones " +
        "de cada tramo y decides tú.",
      relacionados: ["cash-on-cash", "hipoteca", "impuestos"]
    },
    {
      id: "cashflow",
      titulo: "¿Qué es el cashflow anual?",
      claves: ["cashflow", "cash flow", "flujo de caja", "cuanto me queda",
               "beneficio anual", "gano al ano"],
      respuesta:
        "Lo que queda al año después de pagar todo: <b>renta estimada menos " +
        "cuota de hipoteca, IBI, comunidad, seguro, mantenimiento y una " +
        "provisión por vacancia e impagos</b>.<br><br>" +
        "Si sale en verde, el inmueble se paga solo y sobra; si sale en rojo, " +
        "tendrías que poner dinero cada mes con los supuestos del modelo.",
      relacionados: ["cash-on-cash", "rentabilidad", "exactitud"]
    },
    {
      id: "rentabilidad",
      titulo: "Rentabilidad bruta y neta",
      claves: ["rentabilidad bruta", "rentabilidad neta", "rentabilidad",
               "roi", "yield", "rendimiento", "diferencia entre bruta y neta"],
      respuesta:
        "• <b>Bruta</b> = renta anual ÷ precio de compra. Sirve para comparar " +
        "rápido, pero ignora gastos y financiación.<br>" +
        "• <b>Neta</b> = (renta − gastos) ÷ inversión total. Ya descuenta IBI, " +
        "comunidad, seguro, mantenimiento y vacancia.<br>" +
        "• <b>Cash-on-cash</b> = cashflow ÷ tu capital. La que decide, porque " +
        "mide lo que rinde <i>tu</i> dinero con hipoteca.",
      relacionados: ["cash-on-cash", "cashflow", "capital"]
    },
    {
      id: "descuento",
      titulo: "¿Qué es el descuento sobre tasación?",
      claves: ["descuento", "dto tasacion", "tasacion", "valor de tasacion",
               "chollo", "por debajo de mercado", "rebaja"],
      respuesta:
        "Es cuánto está el precio publicado <b>por debajo del valor de " +
        "tasación o de referencia</b> del inmueble. Un −30 % indica margen " +
        "teórico, pero <b>no es beneficio garantizado</b>: muchas veces refleja " +
        "estado del inmueble, ocupación o una tasación antigua.<br><br>" +
        "Úsalo como señal para mirar con más detalle, no como valor final.",
      relacionados: ["exactitud", "comprar"]
    },
    {
      id: "estrella",
      titulo: "¿Qué significa la estrella ★?",
      claves: ["estrella", "asterisco", "que significa la estrella",
               "destacados", "los mejores"],
      respuesta:
        "La <b>★</b> marca los inmuebles cuyo <b>cash-on-cash estimado supera " +
        "el 10 %</b>, el umbral que usamos para «merece una mirada seria».<br><br>" +
        "En algunas provincias, con los supuestos actuales, casi todo sale por " +
        "debajo — eso también es información útil: dice que el alquiler no " +
        "compensa los precios de esa zona.",
      relacionados: ["cash-on-cash", "filtros"]
    },
    {
      id: "filtros",
      titulo: "¿Cómo uso los filtros?",
      claves: ["filtros", "filtrar", "buscar", "como busco", "ordenar",
               "columnas", "buscador", "no me salen resultados", "lista vacia",
               "no aparece nada"],
      respuesta:
        "En el explorador, arriba tienes los filtros: <b>municipio</b> (con " +
        "buscador), fuente, precio máximo, capital máximo, rentabilidad mínima, " +
        "m² mínimos, habitaciones y texto en la dirección. Pulsa " +
        "<b>Aplicar filtros</b> para verlos actuar y ordena haciendo clic en " +
        "cualquier cabecera.<br><br>" +
        "¿La lista se queda vacía? Casi siempre es la <b>rentabilidad mínima</b>: " +
        "si pones un mínimo positivo en una provincia donde todo sale negativo, " +
        "no queda nada. Déjala en blanco y ve bajando el resto de filtros.",
      relacionados: ["estrella", "municipios", "movil"]
    },
    {
      id: "municipios",
      titulo: "Buscar por municipio",
      claves: ["municipio", "municipios", "pueblo", "localidad", "mi ciudad",
               "barrio", "zona concreta"],
      respuesta:
        "Dentro del explorador de cada provincia, el desplegable " +
        "<b>Municipio</b> lista todos los municipios con inmuebles y tiene " +
        "buscador: escribes las primeras letras y marcas los que te interesan " +
        "(puedes marcar varios a la vez).<br><br>" +
        "Si un municipio no aparece en la lista es que ahora mismo no hay " +
        "inventario activo allí en ninguna de las fuentes.",
      relacionados: ["filtros", "provincias", "actualizacion"]
    },
    {
      id: "actualizacion",
      titulo: "¿Cada cuánto se actualizan los datos?",
      claves: ["actualiza", "actualizacion", "cada cuanto", "frecuencia",
               "datos nuevos", "refresca", "al dia", "novedades", "cuando escanea"],
      respuesta:
        "El radar se ejecuta <b>tres veces por semana</b> (lunes, miércoles y " +
        "viernes de madrugada) y vuelve a publicar la web con el inventario " +
        "actualizado de las 52 provincias.<br><br>" +
        "La fecha del último escaneo aparece en la cabecera de cada explorador. " +
        "Aun así, verifica siempre en la ficha oficial: un inmueble puede " +
        "venderse entre dos escaneos.",
      relacionados: ["fuentes", "enlaces-caidos"]
    },
    {
      id: "enlaces-caidos",
      titulo: "Un enlace no funciona / el piso ya no está",
      claves: ["enlace roto", "no funciona el enlace", "error 404", "ya no esta",
               "vendido", "no existe la ficha", "link caido", "desaparecio"],
      respuesta:
        "Pasa: entre escaneo y escaneo los bancos retiran inmuebles vendidos o " +
        "reorganizan sus fichas. El Scanner enlaza siempre a la ficha oficial " +
        "vigente en el último rastreo.<br><br>" +
        "Si te encuentras muchos enlaces rotos en una fuente concreta, avísanos " +
        "a <a href='mailto:" + EMAIL + "'>" + EMAIL + "</a> — suele significar " +
        "que ese portal ha cambiado y hay que ajustar el rastreador.",
      relacionados: ["actualizacion", "contacto"]
    },
    {
      id: "comprar",
      titulo: "¿Cómo se compra uno de estos inmuebles?",
      claves: ["como compro", "comprar", "reservar", "hacer una oferta", "ofertar",
               "visitar", "ver el piso", "siguiente paso", "me interesa uno",
               "contactar con el banco", "proceso de compra"],
      respuesta:
        "El Scanner <b>no intermedia</b> en la compra: te lleva a la ficha " +
        "oficial y a partir de ahí tratas directamente con quien vende.<br><br>" +
        "• <b>Piso de banco o Sareb</b>: en la ficha del servicer hay formulario " +
        "o teléfono. Pides visita, negocias precio y ellos gestionan la reserva y " +
        "muchas veces también la financiación.<br>" +
        "• <b>Subasta del BOE</b>: se puja en el Portal de Subastas, con " +
        "depósito previo y plazos oficiales.<br><br>" +
        "Antes de comprometer dinero: visita el inmueble, pide nota simple del " +
        "Registro y comprueba ocupación, cargas y derramas de la comunidad.",
      relacionados: ["boe", "sareb", "hipoteca", "exactitud"]
    },
    {
      id: "hipoteca",
      titulo: "¿Qué hipoteca supone el modelo?",
      claves: ["hipoteca", "financiacion", "prestamo", "interes", "cuota",
               "banco me financia", "apalancamiento", "porcentaje de financiacion"],
      respuesta:
        "El modelo supone una hipoteca estándar de inversión: <b>80 % del " +
        "precio</b> financiado, a tipo y plazo de mercado, y calcula la cuota " +
        "para restarla del cashflow. Los supuestos exactos están en el panel " +
        "<b>«Cómo se calculan estos números»</b>, arriba del explorador.<br><br>" +
        "Tu caso real puede ser mejor o peor: los servicers a veces financian " +
        "hasta el 90 % de sus propios inmuebles, y en subasta rara vez hay " +
        "financiación previa.",
      relacionados: ["capital", "cash-on-cash", "exactitud"]
    },
    {
      id: "impuestos",
      titulo: "Impuestos y gastos de compra",
      claves: ["impuestos", "itp", "iva", "notaria", "registro", "gastos",
               "plusvalia", "cuanto se paga de impuestos"],
      respuesta:
        "En el capital de entrada ya van incluidos:<br>" +
        "• <b>ITP</b> (Impuesto de Transmisiones) con el tipo de <b>tu " +
        "comunidad autónoma</b> — va del 6 % al 11 % según dónde compres.<br>" +
        "• <b>Notaría y registro</b>, ~1,5 % del precio.<br>" +
        "• <b>Reforma tipo</b> estimada.<br>" +
        "• <b>Cargas</b> que subsistan, cuando constan.<br><br>" +
        "No están incluidos: gestoría, tasación ni los gastos propios de " +
        "constituir la hipoteca, que suelen ser menores pero existen.",
      relacionados: ["capital", "comprar"]
    },
    {
      id: "tensionada",
      titulo: "Zonas tensionadas y límite de alquiler",
      claves: ["zona tensionada", "tensionada", "limite de alquiler",
               "tope de alquiler", "ley de vivienda", "cataluna alquiler",
               "indice de referencia"],
      respuesta:
        "En algunas comunidades (Cataluña la primera) hay <b>zonas declaradas " +
        "tensionadas</b> donde la renta de los nuevos contratos está limitada " +
        "por índice.<br><br>" +
        "El Scanner lo señala cuando lo detecta, porque cambia la renta máxima " +
        "que puedes pedir y, con ella, todo el cálculo de rentabilidad. Antes de " +
        "comprar para alquilar en una de esas zonas, comprueba el índice oficial " +
        "para esa dirección concreta.",
      relacionados: ["rentabilidad", "exactitud"]
    },
    {
      id: "exactitud",
      titulo: "¿Son fiables las cifras?",
      claves: ["fiable", "exacto", "exactas", "de verdad", "seguro", "confiar",
               "son reales", "estimaciones", "garantia", "os equivocais"],
      respuesta:
        "Son <b>estimaciones automáticas</b>, y conviene tratarlas como tales. " +
        "La renta se estima por zona, la reforma es una cifra tipo y la hipoteca " +
        "usa supuestos publicados en el panel «cómo se calcula».<br><br>" +
        "Para lo que sirven: <b>detectar y comparar</b> cientos de inmuebles en " +
        "minutos en vez de en semanas. Para lo que no: sustituir la comprobación " +
        "de cada caso antes de ofertar o pujar.<br><br>" +
        "No es asesoramiento financiero, inmobiliario ni legal.",
      relacionados: ["cash-on-cash", "comprar", "legal"]
    },
    {
      id: "movil",
      titulo: "Instalar la app en el móvil",
      claves: ["app", "movil", "instalar", "telefono", "android", "iphone",
               "descargar", "pantalla de inicio", "aplicacion"],
      respuesta:
        "No hace falta tienda de apps, es una web instalable:<br>" +
        "• <b>Android (Chrome)</b>: pulsa «Instalar la app» en la portada, o el " +
        "menú <b>⋮</b> → <i>Instalar aplicación</i>.<br>" +
        "• <b>iPhone (Safari)</b>: botón <b>Compartir</b> → " +
        "<i>Añadir a pantalla de inicio</i>.<br><br>" +
        "Si abriste el enlace desde WhatsApp, ábrelo antes en Chrome o Safari: " +
        "desde el navegador interno de WhatsApp no se puede instalar.",
      relacionados: ["acceso", "filtros"]
    },
    {
      id: "privacidad",
      titulo: "¿Qué hacéis con mis datos?",
      claves: ["datos personales", "privacidad", "rgpd", "que hacen con mis datos",
               "vendeis mis datos", "spam", "seguridad", "cookies"],
      respuesta:
        "Tus datos (nombre, email, provincia) se usan <b>solo para tu acceso</b> " +
        "y para avisos ocasionales del servicio. <b>No se ceden ni se venden a " +
        "terceros.</b> La clave nunca se guarda en claro: se almacena su hash.<br><br>" +
        "El detalle está en la <a href='privacidad.html'>Política de " +
        "privacidad</a>, el <a href='aviso-legal.html'>Aviso legal</a> y la " +
        "<a href='cookies.html'>Política de cookies</a>.",
      relacionados: ["baja", "legal", "contacto"]
    },
    {
      id: "baja",
      titulo: "Quiero darme de baja",
      claves: ["baja", "darme de baja", "borrar mi cuenta", "eliminar cuenta",
               "cancelar", "no quiero recibir", "unsubscribe", "desuscribir"],
      respuesta:
        "Escribe <b>BAJA</b> a <a href='mailto:" + EMAIL + "?subject=BAJA'>" +
        EMAIL + "</a> desde tu email registrado y damos de baja la cuenta y los " +
        "avisos. Sin permanencia ni preguntas.",
      relacionados: ["privacidad", "contacto"]
    },
    {
      id: "legal",
      titulo: "¿Esto es asesoramiento financiero?",
      claves: ["asesoramiento", "consejo", "me recomiendas", "que compro",
               "es legal", "aviso legal", "responsabilidad", "invierto o no"],
      respuesta:
        "No. El Scanner es una <b>herramienta de información</b> construida " +
        "sobre datos públicos y estimaciones propias. No constituye " +
        "asesoramiento financiero, inmobiliario ni legal, y no recomienda " +
        "inmuebles concretos.<br><br>" +
        "Las decisiones de inversión son tuyas: verifica cada caso y, si la " +
        "operación es grande, apóyate en un profesional.",
      relacionados: ["exactitud", "privacidad"]
    },
    {
      id: "comparador",
      titulo: "Comparar inmuebles",
      claves: ["comparar", "comparador", "comparacion", "lado a lado",
               "cual es mejor", "cual me conviene", "enfrentar", "versus",
               "dos pisos", "varios pisos", "elegir entre"],
      respuesta:
        "Dentro del explorador, cada fila tiene una <b>casilla</b> a la " +
        "izquierda. Marca hasta <b>4 inmuebles</b> y abajo aparece el botón " +
        "<b>Comparar</b>.<br><br>" +
        "Se abren en columnas, una métrica por fila — precio, €/m², capital de " +
        "entrada, cuota, renta estimada, cashflow, cash-on-cash, descuento — y " +
        "el <b>mejor valor de cada fila se marca en verde</b>.<br><br>" +
        "Arriba tienes un <b>simulador</b>: cambias el porcentaje que financias, " +
        "el tipo de interés, el plazo y la reforma, y los números se recalculan " +
        "al momento con <i>tus</i> condiciones, no con las del ejemplo.<br><br>" +
        "La selección te sigue si cambias de provincia, así que puedes comparar " +
        "un piso de Valencia con otro de Sevilla. Y con <b>Guardar en PDF</b> te " +
        "lo llevas.",
      relacionados: ["cash-on-cash", "capital", "hipoteca", "filtros"]
    },
    {
      id: "contacto",
      titulo: "Hablar con una persona",
      claves: ["contacto", "hablar con alguien", "persona", "humano", "email",
               "telefono", "soporte", "ayuda real", "escribir", "atencion"],
      respuesta:
        "Claro: escribe a <a href='mailto:" + EMAIL + "'>" + EMAIL + "</a> y te " +
        "responde una persona. Si es un problema de acceso, cuéntanos el email " +
        "con el que te registraste y qué mensaje te sale.",
      relacionados: ["no-encuentra-cuenta", "baja"]
    }
  ];

  var POR_ID = {};
  BASE.forEach(function (e) { POR_ID[e.id] = e; });

  // Saludos y cortesías, que no son preguntas.
  var SALUDOS = ["hola", "buenas", "buenos dias", "buenas tardes",
                 "buenas noches", "hey", "que tal", "saludos"];
  var GRACIAS = ["gracias", "muchas gracias", "genial", "perfecto", "ok",
                 "vale", "entendido", "adios", "hasta luego", "chao"];

  function esDe(lista, n) {
    for (var i = 0; i < lista.length; i++) {
      if (n === lista[i] || n.indexOf(lista[i]) === 0) return true;
    }
    return false;
  }

  // ── Motor de coincidencia ──────────────────────────────────────────────────
  // Dos señales que se suman:
  //   1) la frase clave aparece literal en la pregunta (señal fuerte);
  //   2) palabras sueltas en común. Una palabra que solo usa UNA respuesta
  //      («sareb», «itp», «clave») vale más que una compartida por muchas
  //      («cuenta», «provincia»), que por sí sola no distingue nada.
  var VACIAS = ("el la los las un una unos unas de del al en y o u que como cual " +
    "cuales es son esta estan para por con sin mi mis tu tus su sus me te se lo " +
    "le hay hace puedo puede quiero necesito tengo he ha muy mas pero si no ya " +
    "eso esto esa ese hola sobre cuando donde quien").split(" ");

  function palabrasUtiles(txt) {
    var out = [], vistas = {};
    txt.split(" ").forEach(function (w) {
      if (w.length <= 2 || VACIAS.indexOf(w) !== -1 || vistas[w]) return;
      vistas[w] = 1;
      out.push(w);
    });
    return out;
  }

  var FRECUENCIA = {};
  BASE.forEach(function (e) {
    var tok = {};
    e.claves.forEach(function (c) {
      palabrasUtiles(c).forEach(function (w) { tok[w] = 1; });
    });
    palabrasUtiles(normalizar(e.titulo)).forEach(function (w) { tok[w] = 1; });
    e._tok = tok;
    for (var w in tok) FRECUENCIA[w] = (FRECUENCIA[w] || 0) + 1;
  });

  function puntuar(entrada, n) {
    var total = 0;
    for (var i = 0; i < entrada.claves.length; i++) {
      var c = entrada.claves[i];
      if (n.indexOf(c) !== -1) {
        // una frase de varias palabras es una señal mucho más fuerte
        total += c.indexOf(" ") !== -1 ? 3 : 1.2;
      }
    }
    palabrasUtiles(n).forEach(function (w) {
      if (!entrada._tok[w]) return;
      total += FRECUENCIA[w] === 1 ? 1.4 : (FRECUENCIA[w] <= 3 ? 0.9 : 0.5);
    });
    return total;
  }

  function responder(texto) {
    var n = normalizar(texto);
    if (!n) return null;

    if (esDe(SALUDOS, n) && n.split(" ").length <= 3) {
      return { tipo: "saludo" };
    }
    if (esDe(GRACIAS, n) && n.split(" ").length <= 3) {
      return { tipo: "gracias" };
    }

    var ranking = BASE.map(function (e) {
      return { e: e, p: puntuar(e, n) };
    }).sort(function (a, b) { return b.p - a.p; });

    // ¿Ha escrito el nombre de una provincia y poco más?
    var prov = provinciaEn(texto);
    if (prov && ranking[0].p < 3) {
      return { tipo: "provincia", provincia: prov };
    }

    // Con señal clara respondemos directo. Si la primera y la segunda están
    // muy igualadas, es más honesto preguntar a cuál se refería.
    var empate = ranking[1] && ranking[0].p - ranking[1].p < 0.3;
    if (ranking[0].p >= 1.2 && !(empate && ranking[0].p < 2)) {
      return { tipo: "respuesta", entrada: ranking[0].e };
    }
    if (ranking[0].p >= 0.9) {
      return {
        tipo: "no-se",
        cercanos: ranking.slice(0, 3).map(function (r) { return r.e; })
      };
    }
    return {
      tipo: "no-se",
      cercanos: ranking.slice(0, 3).map(function (r) { return r.e; })
    };
  }

  /* ── Buscador en lenguaje natural ───────────────────────────────────────────
   * Convierte "piso en Málaga por menos de 120.000 con rentabilidad > 8%" en
   * filtros y responde con los inmuebles que cumplen.
   *
   * En un explorador busca sobre el DATA que ya trae la página (no descarga
   * nada extra) y ofrece volcar los criterios a la tabla de filtros.
   * En la landing no hay datos —están detrás del acceso—, así que interpreta
   * la petición y lleva al explorador de esa provincia con la búsqueda puesta
   * en el enlace (#buscar=…), que se ejecuta sola al llegar.
   * ───────────────────────────────────────────────────────────────────────── */

  function sinTildes(t) {
    return (t || "").toLowerCase().normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  }

  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ESCAPES[c];
    });
  }

  function eur(v) {
    return Math.round(v).toLocaleString("es-ES") + " €";
  }

  function pct(v) {
    return (Math.round(v * 10) / 10).toLocaleString("es-ES") + "%";
  }

  // DATA es el array de inmuebles que cada explorador lleva incrustado.
  function datosPagina() {
    try {
      if (typeof DATA !== "undefined" && DATA && DATA.length) return DATA;
    } catch (e) {}
    return null;
  }

  // ── Números como los escribe la gente ──────────────────────────────────────
  // "120.000" · "120000" · "120k" · "120 mil" · "1,2 millones" · "120" (=120.000)
  var TROZO_NUM = "(\\d[\\d.,]*)\\s*(k|mil|millones|millon)?";

  function aNumero(cifra, sufijo, escalaCorta) {
    var s = String(cifra).replace(/\s/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "");   // millares
    else if (/^\d+\.\d{3}$/.test(s)) s = s.replace(".", "");
    var v = parseFloat(s.replace(",", "."));
    if (!isFinite(v)) return null;
    var suf = (sufijo || "").toLowerCase();
    if (suf === "k" || suf === "mil") v *= 1000;
    else if (suf.indexOf("millon") === 0) v *= 1000000;
    // "hasta 120" en un contexto de dinero son 120.000, no 120 €.
    else if (escalaCorta && v > 0 && v <= 2000) v *= 1000;
    return v;
  }

  var NUM_PALABRA = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };

  // ── Fuentes: lo que escribe el visitante → código de la columna "origen" ───
  var FUENTES = [
    { claves: ["boe", "subasta", "subastas"], codigos: ["JA", "AT", "OTRO"],
      nombre: "subastas del BOE" },
    { claves: ["judicial", "juzgado"], codigos: ["JA"], nombre: "subastas judiciales" },
    { claves: ["hacienda", "aeat"], codigos: ["AT"], nombre: "subastas de Hacienda" },
    { claves: ["solvia"], codigos: ["SOLVIA"], nombre: "Solvia" },
    { claves: ["aliseda"], codigos: ["ALISEDA"], nombre: "Aliseda" },
    { claves: ["altamira", "dovalue"], codigos: ["ALTAMIRA"], nombre: "Altamira" },
    { claves: ["fotocasa"], codigos: ["FOTOCASA"], nombre: "Fotocasa" },
    { claves: ["donpiso", "don piso"], codigos: ["DONPISO"], nombre: "donpiso" },
    { claves: ["sareb"], codigos: ["SAREB"], nombre: "Sareb" },
    { claves: ["hipoges"], codigos: ["HIPOGES"], nombre: "Hipoges" },
    { claves: ["buildingcenter", "caixabank", "caixa"], codigos: ["BUILDINGCENTER"],
      nombre: "BuildingCenter" },
    { claves: ["pisos com", "pisoscom"], codigos: ["PISOS.COM"], nombre: "pisos.com" },
    { claves: ["banco", "bancos", "servicer", "servicers"],
      codigos: ["SOLVIA", "ALISEDA", "ALTAMIRA", "SAREB", "HIPOGES",
                "BUILDINGCENTER"],
      nombre: "carteras de banco" }
  ];

  var NOMBRE_A_CODIGO = {
    "boe judicial": "JA", "boe aeat": "AT", "boe otros": "OTRO",
    "sareb via hipoges": "SAREB", "hipoges": "HIPOGES"
  };

  function codigoFuente(nombreVisible) {
    var n = sinTildes(nombreVisible).replace(/[()]/g, "").replace(/\s+/g, " ").trim();
    return NOMBRE_A_CODIGO[n] || String(nombreVisible).trim().toUpperCase();
  }

  // ── Criterios de orden ─────────────────────────────────────────────────────
  var ORDENES = {
    coc:     { campo: "coc",     desc: true,  etiqueta: "mejor cash-on-cash",             select: "coc:1" },
    precio:  { campo: "precio",  desc: false, etiqueta: "más baratos primero",            select: "precio:0" },
    capital: { campo: "capital", desc: false, etiqueta: "menos capital de entrada",       select: "capital:0" },
    cf:      { campo: "cf",      desc: true,  etiqueta: "mejor cashflow",                 select: "cf:1" },
    dto:     { campo: "dto",     desc: true,  etiqueta: "mayor descuento sobre tasación", select: "dto:1" },
    m2:      { campo: "m2",      desc: true,  etiqueta: "más metros",                     select: "m2:1" }
  };

  // ── Interpretación de la frase ─────────────────────────────────────────────
  function interpretar(texto, datos) {
    var t = " " + sinTildes(texto) + " ";
    var q = { pMax: null, cMax: null, cocMin: null, m2Min: null, hab: "",
              fuentes: [], nombreFuente: null, provincia: null, municipio: null,
              orden: "coc", ordenExplicito: false };
    var m;

    function consumir(trozo) { t = t.replace(trozo, " "); }

    // 1. Habitaciones (se saca primero: si no, su número se leería como precio)
    m = t.match(/\b(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:o mas\s*)?(?:hab\b|habitacion|habitaciones|dorm\b|dormitorio|dormitorios)/);
    if (m) {
      var nh = NUM_PALABRA[m[1]] || parseInt(m[1], 10);
      if (nh > 0) q.hab = (nh >= 4 || /o mas/.test(m[0])) ? "4+" : String(nh);
      consumir(m[0]);
    }

    // 2. Metros cuadrados
    m = t.match(/(?:mas de|minimo|al menos|desde|a partir de|\+)?\s*(\d[\d.,]*)\s*(?:m2|m²|metros cuadrados|metros)\b/);
    if (m) { q.m2Min = aNumero(m[1], "", false); consumir(m[0]); }

    // 3. Rentabilidad mínima (cash-on-cash)
    m = t.match(/(?:rentabilidad|rentab\w*|rinda|rindan|coc|cash ?on ?cash|cash-on-cash|rendimiento|retorno)\D{0,25}?(\d+(?:[.,]\d+)?)\s*%?/);
    if (!m) m = t.match(/(?:al menos|minimo de|minimo|mas de|superior a|por encima de|>=?)\s*(\d+(?:[.,]\d+)?)\s*%/);
    if (m) { q.cocMin = parseFloat(m[1].replace(",", ".")); consumir(m[0]); }

    // 4. Capital de entrada (antes que el precio: "con 30.000 de entrada")
    m = t.match(new RegExp("(?:entrada|capital|ahorros?|bolsillo|dispongo de|dispongo|tengo|puedo poner|puedo aportar|aportar|pongo|poner)\\D{0,18}?" + TROZO_NUM));
    if (!m) m = t.match(new RegExp(TROZO_NUM + "\\s*(?:€|euros?)?\\s*(?:de )?(?:entrada|capital|ahorros)"));
    if (m) { q.cMax = aNumero(m[1], m[2], true); consumir(m[0]); }

    // 5. Precio máximo
    m = t.match(new RegExp("(?:hasta|menos de|por debajo de|no mas de|maximo de|maximo|max\\.?|tope de|presupuesto de|por|de)\\s*" + TROZO_NUM + "\\s*(?:€|euros?|eur)?"));
    if (!m) m = t.match(new RegExp(TROZO_NUM + "\\s*(?:€|euros)"));
    if (m) { q.pMax = aNumero(m[1], m[2], true); consumir(m[0]); }

    // 6. Fuente
    for (var i = 0; i < FUENTES.length; i++) {
      for (var j = 0; j < FUENTES[i].claves.length; j++) {
        if (t.indexOf(" " + FUENTES[i].claves[j]) !== -1) {
          FUENTES[i].codigos.forEach(function (c) {
            if (q.fuentes.indexOf(c) === -1) q.fuentes.push(c);
          });
          q.nombreFuente = FUENTES[i].nombre;
          break;
        }
      }
    }

    // 7. Orden ("lo más barato", "los mejores chollos"…). Que pida un orden
    //    concreto ya es, por sí solo, señal de que está buscando y no preguntando.
    var ORDEN_POR_FRASE = [
      [/barat|economic|asequible/, "precio"],
      [/cashflow|flujo de caja|deje al mes/, "cf"],
      [/descuento|chollo|ganga|rebajad|debajo de tasacion/, "dto"],
      [/mas grande|mas amplio|mas metros/, "m2"],
      [/menos entrada|menos capital|menos dinero/, "capital"],
      [/mas rentable|mejor rentabilidad|mejores|mejor/, "coc"]
    ];
    for (var z = 0; z < ORDEN_POR_FRASE.length; z++) {
      if (ORDEN_POR_FRASE[z][0].test(t)) {
        q.orden = ORDEN_POR_FRASE[z][1];
        q.ordenExplicito = true;
        break;
      }
    }

    // 8. Provincia y municipio
    q.provincia = provinciaEn(texto);
    if (datos) {
      var mejor = null, vistos = {}, frase = " " + sinTildes(texto) + " ";
      for (var k = 0; k < datos.length; k++) {
        var loc = datos[k].localidad;
        if (!loc || vistos[loc]) continue;
        vistos[loc] = 1;
        var ln = sinTildes(loc);
        if (ln.length < 4) continue;
        // "A Coruña" o "Palma de Mallorca" nombran la provincia: si el nombre
        // del municipio está contenido en el de la provincia, gana la
        // provincia (superconjunto) en vez de acotar sin que lo hayan pedido.
        if (q.provincia && sinTildes(q.provincia).indexOf(ln) !== -1) continue;
        if (frase.indexOf(" " + ln + " ") !== -1 &&
            (!mejor || ln.length > sinTildes(mejor).length)) mejor = loc;
      }
      q.municipio = mejor;
    }
    return q;
  }

  var VERBOS_BUSQUEDA = ["busco", "buscar", "busca", "quiero", "ensename",
    "muestrame", "muestra", "dame", "encuentra", "encuentrame", "hay algo",
    "que hay", "tienes algo", "recomiendame", "recomienda", "opciones",
    "oportunidades", "chollo", "chollos", "filtra", "filtrame", "listame",
    "sacame", "mejores", "invertir en", "comprar en", "algo en",
    // Superlativos sueltos: "lo mas barato que tengas" es una busqueda, aunque
    // no nombre ni provincia ni cifras.
    "lo mas", "los mas", "las mas", "que tengas", "que teneis",
    "que tengais", "que haya"];

  var COSAS = ["piso", "casa", "chalet", "vivienda", "inmueble", "local",
    "garaje", "nave", "atico", "duplex", "finca", "apartamento", "terreno",
    "solar", "adosado", "unifamiliar"];

  function contiene(t, lista) {
    for (var i = 0; i < lista.length; i++) {
      if (t.indexOf(" " + lista[i] + " ") !== -1 ||
          t.indexOf(" " + lista[i] + "s ") !== -1) return true;
    }
    return false;
  }

  function cuentaFiltros(q) {
    var n = 0;
    if (q.pMax != null) n++;
    if (q.cMax != null) n++;
    if (q.cocMin != null) n++;
    if (q.m2Min != null) n++;
    if (q.hab) n++;
    if (q.fuentes.length) n++;
    return n;
  }

  // ¿Esto es una búsqueda de inmuebles o una duda sobre el servicio?
  function esPeticionDeBusqueda(texto, q, puntFaq) {
    var t = " " + sinTildes(texto) + " ";
    var filtros = cuentaFiltros(q);
    var lugar = !!(q.provincia || q.municipio);
    var verbo = contiene(t, VERBOS_BUSQUEDA);
    var cosa = contiene(t, COSAS);

    // Una pregunta clara del FAQ ("¿qué es el cash-on-cash?") manda siempre.
    if (puntFaq >= 2.2 && filtros === 0 && !verbo) return false;
    if (verbo && (lugar || filtros || cosa || q.ordenExplicito)) return true;
    if (q.ordenExplicito && (verbo || cosa || lugar || filtros)) return true;
    if (cosa && (lugar || filtros)) return true;
    if (lugar && filtros >= 1) return true;
    return filtros >= 2;
  }

  // ── Filtrado y orden ───────────────────────────────────────────────────────
  function cumple(r, q, saltar) {
    if (saltar !== "pMax" && q.pMax != null && !(r.precio <= q.pMax)) return false;
    if (saltar !== "cMax" && q.cMax != null && !(r.capital <= q.cMax)) return false;
    if (saltar !== "cocMin" && q.cocMin != null && !(r.coc >= q.cocMin)) return false;
    if (saltar !== "m2Min" && q.m2Min != null && !(r.m2 >= q.m2Min)) return false;
    if (saltar !== "hab" && q.hab) {
      if (q.hab === "4+") { if (!(r.hab >= 4)) return false; }
      else if (String(r.hab) !== q.hab) return false;
    }
    if (saltar !== "fuentes" && q.fuentes.length &&
        q.fuentes.indexOf(r.origen) === -1) return false;
    if (saltar !== "municipio" && q.municipio &&
        sinTildes(r.localidad) !== sinTildes(q.municipio)) return false;
    return true;
  }

  function filtrar(datos, q, saltar) {
    var out = [];
    for (var i = 0; i < datos.length; i++) if (cumple(datos[i], q, saltar)) out.push(datos[i]);
    return out;
  }

  function ordenar(filas, q) {
    var o = ORDENES[q.orden] || ORDENES.coc;
    return filas.slice().sort(function (a, b) {
      var va = a[o.campo], vb = b[o.campo];
      if (va == null) va = o.desc ? -Infinity : Infinity;
      if (vb == null) vb = o.desc ? -Infinity : Infinity;
      return o.desc ? vb - va : va - vb;
    });
  }

  // ── Presentación ───────────────────────────────────────────────────────────
  var ETIQUETA_FILTRO = {
    pMax: "el precio máximo", cMax: "el capital de entrada",
    cocMin: "la rentabilidad mínima", m2Min: "los metros mínimos",
    hab: "las habitaciones", fuentes: "la fuente", municipio: "el municipio"
  };

  function criteriosActivos(q) {
    var l = [];
    ["pMax", "cMax", "cocMin", "m2Min"].forEach(function (k) {
      if (q[k] != null) l.push(k);
    });
    if (q.hab) l.push("hab");
    if (q.fuentes.length) l.push("fuentes");
    if (q.municipio) l.push("municipio");
    return l;
  }

  function resumenCriterios(q) {
    var p = [];
    if (q.municipio) p.push("en <b>" + esc(q.municipio) + "</b>");
    else if (q.provincia) p.push("en <b>" + esc(q.provincia) + "</b>");
    if (q.pMax != null) p.push("hasta " + eur(q.pMax));
    if (q.cMax != null) p.push("con " + eur(q.cMax) + " de entrada como mucho");
    if (q.cocMin != null) p.push("cash-on-cash ≥ " + pct(q.cocMin));
    if (q.m2Min != null) p.push("desde " + Math.round(q.m2Min) + " m²");
    if (q.hab) p.push(q.hab === "4+" ? "4 o más habitaciones" : q.hab + " habitaciones");
    if (q.fuentes.length) p.push("solo " + (q.nombreFuente || "esa fuente"));
    return p.join(" · ");
  }

  function ficha(r) {
    var estrella = r.coc >= 10 ? " ★" : "";
    var signo = r.cf >= 0 ? "+" : "";
    return "<div class='reo-ficha'>" +
      "<div class='reo-ficha-cab'><b>" + esc(r.localidad) + "</b>" +
        "<span class='reo-precio'>" + eur(r.precio) + "</span></div>" +
      "<div class='reo-dir'>" + esc(r.direccion || "—") +
        (r.m2 ? " · " + Math.round(r.m2) + " m²" : "") +
        (r.hab ? " · " + r.hab + " hab" : "") + "</div>" +
      "<div class='reo-nums'>" +
        "<span>Entrada <b>" + eur(r.capital) + "</b></span>" +
        "<span>Cash-on-cash <b class='" + (r.coc >= 0 ? "reo-pos" : "reo-neg") + "'>" +
          pct(r.coc) + estrella + "</b></span>" +
        "<span>Cashflow <b class='" + (r.cf >= 0 ? "reo-pos" : "reo-neg") + "'>" +
          signo + eur(r.cf) + "/año</b></span>" +
        (r.dto == null ? "" : "<span>Dto. tasación <b>" + pct(r.dto) + "</b></span>") +
      "</div>" +
      "<a class='reo-ver' href='" + esc(r.url) + "' target='_blank' rel='noopener'>" +
        "ver anuncio ↗</a></div>";
  }

  // ── Volcar los criterios a los filtros de la tabla del explorador ──────────
  function ponValor(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = (v == null ? "" : v);
  }

  function chipsDe(contId) {
    var c = document.getElementById(contId);
    return c ? Array.prototype.slice.call(c.querySelectorAll(".chip")) : [];
  }

  function hayTablaDeFiltros() {
    return !!document.getElementById("f-precio") && typeof window.aplicar === "function";
  }

  function aplicarEnTabla(q) {
    ponValor("f-precio", q.pMax);
    ponValor("f-capital", q.cMax);
    ponValor("f-coc", q.cocMin);
    ponValor("f-m2", q.m2Min == null ? null : Math.round(q.m2Min));
    ponValor("f-txt", "");
    var h = document.getElementById("f-hab");
    if (h) h.value = q.hab || "";
    var o = document.getElementById("f-orden");
    if (o && ORDENES[q.orden]) o.value = ORDENES[q.orden].select;

    // Los chips son un toggle: se apagan los que sobran y se encienden los que faltan.
    chipsDe("f-muni").forEach(function (ch) {
      var quiero = !!(q.municipio && sinTildes(ch.textContent) === sinTildes(q.municipio));
      if (ch.classList.contains("on") !== quiero) ch.click();
    });
    chipsDe("f-fuente").forEach(function (ch) {
      var quiero = q.fuentes.length > 0 &&
                   q.fuentes.indexOf(codigoFuente(ch.textContent)) !== -1;
      if (ch.classList.contains("on") !== quiero) ch.click();
    });

    window.aplicar();
    var ancla = document.getElementById("resumen") || document.getElementById("filtros");
    if (ancla && ancla.scrollIntoView) ancla.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function enlaceExplorador(texto, provincia) {
    return "explorador-" + slugify(provincia) + ".html#buscar=" + encodeURIComponent(texto);
  }

  var CSS_BUSCADOR =
    ".reo-ficha{background:#fff;border:1px solid #e2e9f0;border-left:3px solid #5b84a6;" +
      "border-radius:8px;padding:10px 12px;margin-top:8px}" +
    ".reo-ficha-cab{display:flex;justify-content:space-between;align-items:baseline;gap:8px}" +
    ".reo-ficha-cab b{font-size:13.5px;color:#2c3e50}" +
    ".reo-precio{font-weight:700;color:#3d5266;white-space:nowrap;font-size:13.5px}" +
    ".reo-dir{font-size:11.5px;color:#7c8b98;margin-top:2px;line-height:1.45}" +
    ".reo-nums{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:7px;font-size:11.5px;color:#5a6875}" +
    ".reo-nums b{color:#3d4a55}" +
    ".reo-pos{color:#4a8060}.reo-neg{color:#b5544b}" +
    ".reo-ver{display:inline-block;margin-top:7px;font-size:12px;font-weight:600;color:#4d7495}" +
    ".reo-aplicar{margin-top:10px;width:100%;background:#5b84a6;color:#fff;border:none;" +
      "border-radius:8px;padding:9px 12px;font-size:12.5px;font-weight:600;cursor:pointer}" +
    ".reo-aplicar:hover{background:#4d7495}" +
    ".reo-msg.reo-ancho{max-width:100%;background:transparent;border:none;padding:2px 0}" +
    ".reo-ancho .reo-ficha:first-child{margin-top:0}";

  // ── Conversación de búsqueda ───────────────────────────────────────────────
  var TOPE_FICHAS = 5;

  function mejorPuntuacionFaq(texto) {
    var n = normalizar(texto), mejor = 0;
    for (var i = 0; i < BASE.length; i++) {
      var p = puntuar(BASE[i], n);
      if (p > mejor) mejor = p;
    }
    return mejor;
  }

  // Sin resultados: en vez de un "no hay nada" seco, se dice QUÉ filtro aprieta.
  function sinResultados(datos, q, ui) {
    var mejorSuelto = null, mejorN = 0;
    criteriosActivos(q).forEach(function (k) {
      var n = filtrar(datos, q, k).length;
      if (n > mejorN) { mejorN = n; mejorSuelto = k; }
    });
    var msg = "No hay ningún inmueble " + (resumenCriterios(q) || "con esos criterios") + ".";
    if (mejorSuelto && mejorN > 0) {
      msg += "<br><br>El filtro que más aprieta es <b>" + ETIQUETA_FILTRO[mejorSuelto] +
             "</b>: soltándolo salen <b>" + mejorN + "</b>. Aflójalo y vuelve a " +
             "preguntarme.";
    } else {
      msg += "<br><br>Prueba con criterios más amplios. Ojo sobre todo a la " +
             "rentabilidad mínima: en varias provincias el cash-on-cash sale " +
             "negativo con los supuestos actuales, así que pedir un mínimo " +
             "positivo puede dejar la lista vacía.";
    }
    ui.decir(msg, false);
    ui.ofrecer(["filtros", "cash-on-cash", "capital"]);
    return true;
  }

  // Fuera del explorador no hay datos en la página (están tras el acceso):
  // se interpreta la petición y se lleva al explorador con la búsqueda puesta.
  function derivarAExplorador(texto, q, ui) {
    var crit = resumenCriterios(q);
    if (q.provincia) {
      ui.decir("Anotado: " + (crit || "esa búsqueda") + ".<br><br>" +
        "Los inmuebles viven dentro del explorador, detrás de tu acceso. " +
        "<a href='" + enlaceExplorador(texto, q.provincia) + "'>Abre " +
        esc(q.provincia) + " con esta búsqueda ya puesta</a> y te la ejecuto " +
        "nada más entrar.<br><br>¿Aún no tienes cuenta? " +
        "<a href='index.html#alta'>Créala gratis en un minuto</a> y vuelve a " +
        "este enlace.", false);
      ui.ofrecer(["registro", "precio", "cash-on-cash"]);
      return true;
    }
    ui.decir("Puedo buscarte eso, pero necesito saber <b>en qué provincia</b>. " +
      "Añádela a la frase —por ejemplo «" + esc(texto) + " en Málaga»— y te " +
      "llevo directo a los resultados.", false);
    ui.ofrecer(["provincias", "registro"]);
    return true;
  }

  // Devuelve true si la frase era una búsqueda y ya se ha contestado.
  function atenderBusqueda(texto, ui) {
    var datos = datosPagina();
    var q = interpretar(texto, datos);
    if (!esPeticionDeBusqueda(texto, q, mejorPuntuacionFaq(texto))) return false;
    if (!datos) return derivarAExplorador(texto, q, ui);

    var filas = filtrar(datos, q);
    if (!filas.length) return sinResultados(datos, q, ui);

    var o = ORDENES[q.orden] || ORDENES.coc;
    var top = ordenar(filas, q).slice(0, TOPE_FICHAS);
    var crit = resumenCriterios(q);

    ui.decir("He encontrado <b>" + filas.length + "</b> " +
      (filas.length === 1 ? "inmueble" : "inmuebles") + (crit ? " " + crit : "") +
      ".<br>Te enseño " +
      (filas.length <= TOPE_FICHAS ? "" : "los " + TOPE_FICHAS + " de ") +
      o.etiqueta + ":", false);

    var nodo = ui.decir(top.map(ficha).join("") +
      (hayTablaDeFiltros()
        ? "<button type='button' class='reo-aplicar'>Ver los " + filas.length +
          " en la tabla con estos filtros</button>"
        : ""), false);
    nodo.className += " reo-ancho";

    var btn = nodo.querySelector(".reo-aplicar");
    if (btn) {
      btn.addEventListener("click", function () {
        aplicarEnTabla(q);
        ui.decir("Listo, filtros aplicados en la tabla. Puedes seguir afinando a " +
          "mano o pedirme otra búsqueda.", false);
      });
    }
    return true;
  }

  // Búsqueda que llega en el enlace desde otra página: explorador-x.html#buscar=…
  function busquedaEnHash() {
    var m = (location.hash || "").match(/[#&]buscar=([^&]*)/);
    if (!m) return null;
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return null; }
  }

  // ── Interfaz ───────────────────────────────────────────────────────────────
  var CSS =
    "#reo-bot,#reo-bot *{box-sizing:border-box;font-family:'Work Sans','Segoe UI',Arial,sans-serif}" +
    "#reo-bot{position:fixed;right:20px;bottom:20px;z-index:9999}" +
    "#reo-bot-btn{display:flex;align-items:center;gap:9px;background:#5b84a6;color:#fff;" +
      "border:none;border-radius:26px;padding:13px 20px;font-size:14px;font-weight:600;" +
      "cursor:pointer;box-shadow:0 4px 14px rgba(35,49,64,.18);transition:background .15s}" +
    "#reo-bot-btn:hover{background:#4d7495}" +
    "#reo-bot-btn svg{flex-shrink:0}" +
    "#reo-bot-panel{display:none;flex-direction:column;width:min(378px,calc(100vw - 32px));" +
      "height:min(552px,calc(100vh - 110px));background:#f5f8fb;border:1px solid #dfe7ee;" +
      "border-radius:10px;box-shadow:0 12px 40px rgba(35,49,64,.20);overflow:hidden}" +
    "#reo-bot.abierto #reo-bot-panel{display:flex}" +
    "#reo-bot.abierto #reo-bot-btn{display:none}" +
    "#reo-bot-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;" +
      "padding:14px 16px;background:#eef4f9;border-bottom:1px solid #dfe7ee}" +
    "#reo-bot-cab .t{font-family:'Space Grotesk','Segoe UI',sans-serif;font-weight:700;" +
      "font-size:15px;color:#2c3e50;line-height:1.3}" +
    "#reo-bot-cab .s{font-size:11.5px;color:#7c8b98;margin-top:1px}" +
    "#reo-bot-cerrar{background:none;border:none;color:#5a6875;font-size:22px;line-height:1;" +
      "cursor:pointer;padding:0 2px}" +
    "#reo-bot-cerrar:hover{color:#233140}" +
    "#reo-bot-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}" +
    ".reo-msg{max-width:88%;font-size:13.5px;line-height:1.62;border-radius:10px;padding:11px 14px;" +
      "word-wrap:break-word}" +
    ".reo-bot-msg{background:#fff;border:1px solid #e2e9f0;color:#3d4a55;align-self:flex-start;" +
      "border-bottom-left-radius:3px}" +
    ".reo-yo{background:#5b84a6;color:#fff;align-self:flex-end;border-bottom-right-radius:3px}" +
    ".reo-msg a{color:#4d7495;font-weight:500}" +
    ".reo-yo a{color:#fff}" +
    ".reo-msg code{background:#eef4f9;border-radius:3px;padding:1px 5px;font-size:12px;" +
      "font-family:ui-monospace,Consolas,monospace;color:#3d5266;display:inline-block}" +
    ".reo-chips{display:flex;flex-wrap:wrap;gap:7px;align-self:flex-start;max-width:100%}" +
    ".reo-chip{background:#dce8f2;color:#3d5266;border:none;border-radius:16px;padding:7px 13px;" +
      "font-size:12.5px;font-weight:500;cursor:pointer;text-align:left;line-height:1.35}" +
    ".reo-chip:hover{background:#cbdcea}" +
    "#reo-bot-pie{border-top:1px solid #dfe7ee;background:#fff;padding:10px 12px}" +
    "#reo-bot-form{display:flex;gap:8px;align-items:center}" +
    "#reo-bot-input{flex:1;border:1px solid #cfdbe6;border-radius:20px;padding:10px 14px;" +
      "font-size:14px;color:#233140;background:#fff;min-width:0}" +
    "#reo-bot-input:focus{outline:none;border-color:#5b84a6}" +
    "#reo-bot-enviar{background:#5b84a6;color:#fff;border:none;border-radius:50%;width:38px;" +
      "height:38px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;" +
      "justify-content:center}" +
    "#reo-bot-enviar:hover{background:#4d7495}" +
    "#reo-bot-nota{font-size:10.5px;color:#8b98a3;text-align:center;margin-top:7px;line-height:1.4}" +
    "@media (max-width:520px){#reo-bot{right:12px;bottom:12px;left:12px}" +
      "#reo-bot-btn{margin-left:auto}" +
      "#reo-bot-panel{width:100%;height:min(80vh,540px)}}";

  var ICONO_CHAT =
    "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' " +
    "stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.5 11.6a7.9 7.9 0 0 1-8.5 7.9 9 9 0 0 1-2.6-.4L4.5 20.5l1.4-4.4a7.6 7.6 0 0 1-1.4-4.5 " +
    "7.9 7.9 0 0 1 8.5-7.9 8 8 0 0 1 7.5 7.9z'/></svg>";

  var ICONO_ENVIAR =
    "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' " +
    "stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M4.5 12h13M12 6l6 6-6 6'/></svg>";

  // Atajos iniciales según dónde esté el visitante.
  var ATAJOS = {
    landing:    ["precio", "provincias", "cash-on-cash", "registro", "fuentes"],
    acceso:     ["clave-olvidada", "no-encuentra-cuenta", "registro", "precio"],
    explorar:   ["provincias", "filtros", "cash-on-cash", "actualizacion"],
    explorador: ["comparador", "filtros", "cash-on-cash", "capital", "estrella"],
    generico:   ["que-es", "precio", "provincias", "cash-on-cash", "contacto"]
  };

  var SALUDO_INICIAL = {
    landing:
      "¡Hola! Soy el asistente del <b>Scanner REO</b>. Puedo <b>buscarte " +
      "inmuebles hablando</b> — prueba con <i>«piso en Málaga por menos de " +
      "120.000 con rentabilidad mayor del 8%»</i> — y también explicarte cómo " +
      "funciona el servicio y sus números.<br><br>Empieza por aquí si lo prefieres:",
    acceso:
      "¡Hola! ¿Problemas para entrar? Te echo una mano con el acceso, la clave " +
      "o el registro.",
    explorar:
      "¡Hola! Aquí eliges provincia. Dime qué buscas —<i>«chalet en Cádiz " +
      "hasta 150.000»</i>— y te llevo al explorador con los filtros puestos. " +
      "También resuelvo dudas de cobertura, filtros y cálculos.",
    explorador:
      "¡Hola! Estás en el explorador. <b>Pídeme la búsqueda hablando</b> y te " +
      "la hago sobre esta provincia: <i>«2 habitaciones por menos de 80.000 " +
      "con 30.000 de entrada»</i>. También te explico cualquier columna " +
      "(capital de entrada, cash-on-cash, descuento…).",
    generico:
      "¡Hola! Soy el asistente del <b>Scanner REO</b>. Pregúntame lo que " +
      "necesites saber sobre el servicio."
  };

  function detectarContexto() {
    var cfg = window.REO_ASISTENTE || {};
    if (cfg.contexto && SALUDO_INICIAL[cfg.contexto]) return cfg.contexto;
    var f = (location.pathname.split("/").pop() || "").toLowerCase();
    if (f.indexOf("explorador-") === 0) return "explorador";
    if (f.indexOf("explorar") === 0) return "explorar";
    if (f.indexOf("acceso") === 0) return "acceso";
    if (f === "" || f.indexOf("index") === 0) return "landing";
    return "generico";
  }

  function construir() {
    var ctx = detectarContexto();

    var estilo = document.createElement("style");
    estilo.textContent = CSS + CSS_BUSCADOR;
    document.head.appendChild(estilo);

    var raiz = document.createElement("div");
    raiz.id = "reo-bot";
    raiz.innerHTML =
      "<button id='reo-bot-btn' aria-label='Abrir el asistente'>" + ICONO_CHAT +
        "<span>Busca o pregúntame</span></button>" +
      "<div id='reo-bot-panel' role='dialog' aria-label='Asistente del Scanner REO'>" +
        "<div id='reo-bot-cab'>" +
          "<div><div class='t'>Asistente del Scanner</div>" +
          "<div class='s'>Busca inmuebles y resuelve dudas</div></div>" +
          "<button id='reo-bot-cerrar' aria-label='Cerrar'>&times;</button>" +
        "</div>" +
        "<div id='reo-bot-msgs'></div>" +
        "<div id='reo-bot-pie'>" +
          "<form id='reo-bot-form' autocomplete='off'>" +
            "<input id='reo-bot-input' type='text' placeholder='Busca o pregunta…' " +
              "aria-label='Tu pregunta'>" +
            "<button id='reo-bot-enviar' type='submit' aria-label='Enviar'>" +
              ICONO_ENVIAR + "</button>" +
          "</form>" +
          "<div id='reo-bot-nota'>Asistente automático · " +
            "<a href='mailto:" + EMAIL + "'>habla con una persona</a></div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(raiz);

    var msgs = raiz.querySelector("#reo-bot-msgs");
    var input = raiz.querySelector("#reo-bot-input");

    function alFinal() { msgs.scrollTop = msgs.scrollHeight; }

    function decir(html, mio) {
      var d = document.createElement("div");
      d.className = "reo-msg " + (mio ? "reo-yo" : "reo-bot-msg");
      d.innerHTML = html;
      msgs.appendChild(d);
      alFinal();
      return d;
    }

    function ofrecer(ids) {
      if (!ids || !ids.length) return;
      var cont = document.createElement("div");
      cont.className = "reo-chips";
      ids.forEach(function (id) {
        var e = POR_ID[id];
        if (!e) return;
        var b = document.createElement("button");
        b.className = "reo-chip";
        b.type = "button";
        b.textContent = e.titulo;
        b.addEventListener("click", function () {
          decir(e.titulo, true);
          cont.remove();
          setTimeout(function () { mostrar(e); }, 180);
        });
        cont.appendChild(b);
      });
      msgs.appendChild(cont);
      alFinal();
    }

    function mostrar(entrada) {
      decir(entrada.respuesta, false);
      ofrecer(entrada.relacionados);
    }

    var ui = { decir: decir, ofrecer: ofrecer };

    function preguntar(texto) {
      decir(texto.replace(/[<>]/g, ""), true);
      input.value = "";
      setTimeout(function () {
        // Primero se mira si la frase es una búsqueda de inmuebles; si no
        // lo es (o algo falla), sigue el camino de siempre: el FAQ.
        try { if (atenderBusqueda(texto, ui)) return; } catch (e) {}
        var r = responder(texto);
        if (!r) return;
        if (r.tipo === "saludo") {
          decir("¡Hola! ¿En qué te ayudo?", false);
          ofrecer(ATAJOS[ctx] || ATAJOS.generico);
        } else if (r.tipo === "gracias") {
          decir("A mandar. Si te surge cualquier otra duda, aquí sigo 🙂", false);
        } else if (r.tipo === "provincia") {
          var slug = slugify(r.provincia);
          decir("<b>" + r.provincia + "</b> está activa, sí — como las 52 " +
                "provincias. Durante la beta puedes explorarla entera con sus " +
                "municipios.<br><br>" +
                "Si ya tienes cuenta, entra en " +
                "<a href='explorador-" + slug + ".html'>el explorador de " +
                r.provincia + "</a>. Si aún no la tienes, " +
                "<a href='index.html#alta'>créala gratis en un minuto</a>.", false);
          ofrecer(["registro", "filtros", "cash-on-cash"]);
        } else if (r.tipo === "respuesta") {
          mostrar(r.entrada);
        } else {
          decir("No estoy seguro de haber entendido esa. ¿Te refieres a alguna " +
                "de estas?", false);
          ofrecer(r.cercanos.map(function (e) { return e.id; }));
          decir("Si no es nada de eso, escríbelo con otras palabras o " +
                "pregúntale a una persona: <a href='mailto:" + EMAIL +
                "?subject=Duda%20sobre%20el%20Scanner%20REO'>" + EMAIL +
                "</a>.", false);
        }
      }, 240);
    }

    raiz.querySelector("#reo-bot-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = input.value.trim();
      if (t) preguntar(t);
    });

    // Enter envia. No se deja al envio implicito del formulario: hay teclados y
    // navegadores donde no dispara y el visitante se queda escribiendo sin que
    // pase nada.
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      var t = input.value.trim();
      if (t) preguntar(t);
    });

    var abierto = false;
    function abrir() {
      raiz.classList.add("abierto");
      if (!abierto) {
        abierto = true;
        decir(SALUDO_INICIAL[ctx] || SALUDO_INICIAL.generico, false);
        ofrecer(ATAJOS[ctx] || ATAJOS.generico);
      }
      setTimeout(function () { input.focus(); }, 60);
    }
    raiz.querySelector("#reo-bot-btn").addEventListener("click", abrir);
    raiz.querySelector("#reo-bot-cerrar").addEventListener("click", function () {
      raiz.classList.remove("abierto");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") raiz.classList.remove("abierto");
    });

    // Búsqueda que llega desde otra página en el enlace (#buscar=…):
    // se abre el asistente y se ejecuta sola al aterrizar.
    var pendiente = busquedaEnHash();
    if (pendiente) {
      setTimeout(function () {
        abrir();
        preguntar(pendiente);
        if (history.replaceState) {
          history.replaceState(null, "", location.pathname + location.search);
        }
      }, 400);
    }

    // Permite abrirlo desde cualquier enlace de la página: href="#asistente"
    // o cualquier elemento con data-abrir-asistente. Si ese atributo lleva el
    // id de una respuesta ("cash-on-cash", "capital"…), el asistente se abre
    // directamente en ella — asi el comparador puede explicar cada metrica sin
    // duplicar los textos.
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-abrir-asistente],a[href='#asistente']") : null;
      if (!t) return;
      e.preventDefault();
      abrir();
      var tema = t.getAttribute("data-abrir-asistente");
      if (tema && POR_ID[tema]) {
        decir(POR_ID[tema].titulo, true);
        setTimeout(function () { mostrar(POR_ID[tema]); }, 180);
      }
    });

    // Misma puerta, para quien prefiera llamarla desde JS.
    window.reoAsistente = {
      abrir: abrir,
      tema: function (id) {
        abrir();
        if (POR_ID[id]) { decir(POR_ID[id].titulo, true); mostrar(POR_ID[id]); }
      },
      preguntar: function (txt) { abrir(); preguntar(txt); }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", construir);
  } else {
    construir();
  }
})();
