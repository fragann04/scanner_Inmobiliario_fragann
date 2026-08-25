/* ─── Valoración por cuartiles de comparables ────────────────────────────────
 * Precio mínimo (p25), medio (p50) y máximo (p75) del €/m² de la zona,
 * multiplicados por la superficie y ajustados por estado.
 *
 * Regla de honestidad: si la zona tiene pocos comparables, la página lo dice
 * en vez de dar una cifra con aplomo. Es la misma prudencia que aplica el
 * Banco de España, que desaconseja valorar de forma automática allí donde hay
 * poca actividad inmobiliaria.
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var Z = window.REO_ZONA;
  if (!Z) return;

  var PROV = Z.prov, MUNI = Z.muni || {};
  var UMBRAL_AVISO = 30;      // por debajo, se avisa de que el rango es frágil

  var selP = document.getElementById("v-prov");
  var selM = document.getElementById("v-muni");

  Object.keys(PROV)
    .sort(function (a, b) { return PROV[a].prov.localeCompare(PROV[b].prov, "es"); })
    .forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = PROV[k].prov;
      if (k === "madrid") o.selected = true;
      selP.appendChild(o);
    });

  function pintarMunicipios() {
    var m = MUNI[selP.value] || {};
    var nombres = Object.keys(m).sort(function (a, b) { return a.localeCompare(b, "es"); });
    selM.innerHTML = "";
    var todo = document.createElement("option");
    todo.value = "";
    todo.textContent = nombres.length
      ? "Toda la provincia (" + nombres.length + " municipios con datos)"
      : "Toda la provincia";
    selM.appendChild(todo);
    nombres.forEach(function (n) {
      var o = document.createElement("option");
      o.value = n; o.textContent = n;
      selM.appendChild(o);
    });
  }
  selP.addEventListener("change", pintarMunicipios);
  pintarMunicipios();

  function eur(x) { return Math.round(x).toLocaleString("es-ES") + " €"; }

  function valorar() {
    var p = PROV[selP.value];
    var mu = selM.value ? (MUNI[selP.value] || {})[selM.value] : null;
    var base = mu || p;
    var ambito = mu ? selM.value : (p ? p.prov : "");
    var m2 = parseFloat(document.getElementById("v-m2").value) || 0;
    var factor = parseFloat(document.getElementById("v-estado").value);
    if (!base || m2 <= 0) return;

    document.getElementById("v-min").textContent = eur(base.q[0] * m2 * factor);
    document.getElementById("v-med").textContent = eur(base.q[1] * m2 * factor);
    document.getElementById("v-max").textContent = eur(base.q[2] * m2 * factor);
    document.getElementById("v-base").innerHTML =
      m2 + " m² en <b>" + ambito + "</b> · cuartiles de " +
      base.q[0].toLocaleString("es-ES") + " a " +
      base.q[2].toLocaleString("es-ES") + " €/m²";

    var n = mu ? mu.c : p.n;
    document.getElementById("v-barra").style.width = Math.min(100, n / 3) + "%";
    document.getElementById("v-conf").innerHTML =
      "<b>" + n.toLocaleString("es-ES") + "</b> inmuebles comparables en " + ambito +
      (mu ? "" : " — sin datos suficientes en el municipio, se usa la provincia");

    document.getElementById("v-alerta").innerHTML = n < UMBRAL_AVISO
      ? "<div class='aviso-caja'><b>Zona de poca actividad: tómalo como " +
        "orientación, no como valoración.</b> Con " + n + " comparables el rango " +
        "es frágil. El Banco de España desaconseja las valoraciones automáticas " +
        "justo en estos casos, y es más honesto decirlo que dar una cifra con " +
        "aplomo.</div>"
      : "<div class='aviso-caja'><b>Esto es un suelo, no un precio de mercado.</b> " +
        "Sale del stock bancario y de subastas, que es sistemáticamente más barato " +
        "que el mercado abierto. Para una valoración de mercado falta la capa 2 de " +
        "aquí abajo.</div>";
  }

  document.getElementById("v-calc").addEventListener("click", valorar);
  ["v-m2", "v-estado", "v-muni"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", valorar);
  });
  selP.addEventListener("change", valorar);

  var cm = document.getElementById("c-muni");
  if (cm) {
    cm.textContent = Object.keys(MUNI).reduce(function (a, k) {
      return a + Object.keys(MUNI[k]).length;
    }, 0).toLocaleString("es-ES");
  }

  valorar();
})();
