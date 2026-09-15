// ─── Configuración global del Scanner REO ────────────────────────────────────
// betaAbierta: true  → cualquier usuario registrado explora TODAS las provincias.
// betaAbierta: false → cada cuenta solo accede a sus provincias contratadas;
//                      el resto redirige a ampliar.html (pago).
// Para pasar al modo de pago, cambia true por false y sube el archivo.
//
// adminEmails: cuentas que SIEMPRE ven todas las provincias (tu perfil),
//              incluso con betaAbierta en false.
//
// provinciasActivas: provincias con datos publicados. Cuando subas un nuevo
//              explorador-<slug>.html, añade aquí su línea para que aparezca
//              en el selector de provincia de todas las páginas.
window.REO_CONFIG = {
  betaAbierta: true,
  precioProvincia: "9 €/mes",
  adminEmails: ["fleximaxca@gmail.com"],
  provinciasActivas: [
    { slug: "a-coruna", nombre: "A Coruña" },
    { slug: "alava", nombre: "Álava" },
    { slug: "albacete", nombre: "Albacete" },
    { slug: "alicante", nombre: "Alicante" },
    { slug: "almeria", nombre: "Almería" },
    { slug: "asturias", nombre: "Asturias" },
    { slug: "avila", nombre: "Ávila" },
    { slug: "badajoz", nombre: "Badajoz" },
    { slug: "baleares", nombre: "Baleares" },
    { slug: "barcelona", nombre: "Barcelona" },
    { slug: "bizkaia", nombre: "Bizkaia" },
    { slug: "burgos", nombre: "Burgos" },
    { slug: "caceres", nombre: "Cáceres" },
    { slug: "cadiz", nombre: "Cádiz" },
    { slug: "cantabria", nombre: "Cantabria" },
    { slug: "castellon", nombre: "Castellón" },
    { slug: "ceuta", nombre: "Ceuta" },
    { slug: "ciudad-real", nombre: "Ciudad Real" },
    { slug: "cordoba", nombre: "Córdoba" },
    { slug: "cuenca", nombre: "Cuenca" },
    { slug: "gipuzkoa", nombre: "Gipuzkoa" },
    { slug: "girona", nombre: "Girona" },
    { slug: "granada", nombre: "Granada" },
    { slug: "guadalajara", nombre: "Guadalajara" },
    { slug: "huelva", nombre: "Huelva" },
    { slug: "huesca", nombre: "Huesca" },
    { slug: "jaen", nombre: "Jaén" },
    { slug: "la-rioja", nombre: "La Rioja" },
    { slug: "las-palmas", nombre: "Las Palmas" },
    { slug: "leon", nombre: "León" },
    { slug: "lleida", nombre: "Lleida" },
    { slug: "lugo", nombre: "Lugo" },
    { slug: "madrid", nombre: "Madrid" },
    { slug: "malaga", nombre: "Málaga" },
    { slug: "melilla", nombre: "Melilla" },
    { slug: "murcia", nombre: "Murcia" },
    { slug: "navarra", nombre: "Navarra" },
    { slug: "ourense", nombre: "Ourense" },
    { slug: "palencia", nombre: "Palencia" },
    { slug: "pontevedra", nombre: "Pontevedra" },
    { slug: "salamanca", nombre: "Salamanca" },
    { slug: "santa-cruz-de-tenerife", nombre: "Santa Cruz de Tenerife" },
    { slug: "segovia", nombre: "Segovia" },
    { slug: "sevilla", nombre: "Sevilla" },
    { slug: "soria", nombre: "Soria" },
    { slug: "tarragona", nombre: "Tarragona" },
    { slug: "teruel", nombre: "Teruel" },
    { slug: "toledo", nombre: "Toledo" },
    { slug: "valencia", nombre: "Valencia" },
    { slug: "valladolid", nombre: "Valladolid" },
    { slug: "zamora", nombre: "Zamora" },
    { slug: "zaragoza", nombre: "Zaragoza" }
  ]
};

// ─── Medición de visitas ───────────────────────────────
// Los 52 exploradores por provincia cargan este archivo, así que cargar
// medicion.js desde aquí los mide todos sin tocar 52 páginas que, además,
// se regeneran cada día (cualquier línea añadida en ellas se perdería).
// Si la página ya trae su propia etiqueta, medicion.js detecta que ya se
// ejecutó y no cuenta la visita dos veces.
(function () {
  var s = document.createElement("script");
  s.src = "medicion.js";
  (document.head || document.documentElement).appendChild(s);
})();
