/* ─── Mapa de precios por provincia ──────────────────────────────────────────
 * Dibuja las 52 provincias a partir de los trazados de datos-zona.js y las
 * colorea por una de dos capas: precio €/m² o rentabilidad (cash-on-cash).
 *
 * No usa librería de mapas ni servidor de teselas: los trazados vienen en el
 * propio JS, así que la página funciona en estático y sin peticiones externas.
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var Z = window.REO_ZONA;
  if (!Z || !Z.mapa) return;

  var PROV = Z.prov, GEO = Z.mapa;

  // Azules del sistema para el precio; escala divergente para la rentabilidad,
  // que tiene signo y donde el rojo/verde sí significa algo.
  var AZUL  = ["#e8eff5", "#c9dcea", "#a3c3da", "#7ba5c6", "#4d7495"];
  var RENTA = ["#b5544b", "#d08b7f", "#e8c9a8", "#9dbf9f", "#4f8a5c"];

  var capa = "precio";
  var svg = document.getElementById("svg-mapa");
  var g = document.getElementById("g-prov");
  var tip = document.getElementById("tip");

  svg.setAttribute("viewBox", "0 0 " + GEO.w + " " + GEO.h);

  function valor(slug) {
    var p = PROV[slug];
    return capa === "precio" ? p.med : p.coc;
  }

  function cortes() {
    var v = Object.keys(GEO.d).filter(function (s) { return PROV[s]; })
      .map(valor).sort(function (a, b) { return a - b; });
    return [0.2, 0.4, 0.6, 0.8].map(function (p) { return v[Math.floor(v.length * p)]; });
  }

  function tramo(x, c) {
    return c.filter(function (u) { return x > u; }).length;
  }

  function eur(x) { return Math.round(x).toLocaleString("es-ES"); }
  function pct(x) {
    return x.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
  }

  Object.keys(GEO.d).forEach(function (slug) {
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", GEO.d[slug]);
    p.setAttribute("tabindex", "0");
    p.setAttribute("role", "button");
    p.dataset.slug = slug;
    if (PROV[slug]) p.setAttribute("aria-label", PROV[slug].prov);
    g.appendChild(p);
  });

  function pintar() {
    var c = cortes(), pal = capa === "precio" ? AZUL : RENTA;
    g.querySelectorAll("path").forEach(function (p) {
      var s = p.dataset.slug;
      p.setAttribute("fill", PROV[s] ? pal[tramo(valor(s), c)] : "#eceff2");
    });

    var fmt = capa === "precio" ? eur : pct;
    // Con valores negativos, un guion entre dos cifras se lee fatal
    // ("-3,6 %--2,1 %"): se separa con "a".
    var sep = capa === "precio" ? " – " : " a ";
    var et = ["&lt; " + fmt(c[0]),
              fmt(c[0]) + sep + fmt(c[1]),
              fmt(c[1]) + sep + fmt(c[2]),
              fmt(c[2]) + sep + fmt(c[3]),
              "&gt; " + fmt(c[3])];
    document.getElementById("leyenda").innerHTML = et.map(function (t, i) {
      return "<span class='lg" + (i >= 3 && capa === "precio" ? " osc" : "") +
             "' style='background:" + pal[i] + "'>" + t + "</span>";
    }).join("");
  }

  function ficha(slug) {
    var p = PROV[slug];
    if (!p) return;
    document.getElementById("detalle").innerHTML =
      "<h3>" + p.prov + "</h3>" +
      "<div class='lin'><b>" + eur(p.med) + " €/m²</b> de mediana, sobre <b>" +
      p.n.toLocaleString("es-ES") + "</b> inmuebles con superficie medida (de " +
      p.tot.toLocaleString("es-ES") + " en la provincia).</div>" +
      "<div class='lin'>Cash-on-cash mediano: <b class='" +
      (p.coc >= 0 ? "pos" : "neg") + "'>" + pct(p.coc) + "</b> — con 80 % " +
      "financiado a 20 años al 3,5 %.</div>" +
      "<div class='lin' style='margin-top:10px'><a href='explorador-" + slug +
      ".html'>Ver los inmuebles de " + p.prov + " →</a></div>";
  }

  function elegir(p) {
    g.querySelectorAll("path").forEach(function (o) { o.classList.remove("sel"); });
    p.classList.add("sel");
    ficha(p.dataset.slug);
  }

  g.addEventListener("mousemove", function (e) {
    var p = e.target.closest("path");
    if (!p || !PROV[p.dataset.slug]) { tip.hidden = true; return; }
    var d = PROV[p.dataset.slug], r = svg.getBoundingClientRect();
    tip.innerHTML = "<b>" + d.prov + "</b><br>" +
      (capa === "precio" ? eur(d.med) + " €/m²" : "cash-on-cash " + pct(d.coc));
    tip.hidden = false;
    // Se acota al ancho del contenedor: cerca del borde, un tooltip suelto
    // asoma fuera y hace que la pagina se pueda desplazar de lado.
    var mitad = tip.offsetWidth / 2 + 4;
    var x = Math.min(Math.max(e.clientX - r.left, mitad), r.width - mitad);
    tip.style.left = x + "px";
    tip.style.top = (e.clientY - r.top) + "px";
  });
  g.addEventListener("mouseleave", function () { tip.hidden = true; });
  g.addEventListener("click", function (e) {
    var p = e.target.closest("path");
    if (p) elegir(p);
  });
  g.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var p = e.target.closest("path");
    if (p) { e.preventDefault(); elegir(p); }
  });

  document.querySelectorAll(".cb").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".cb").forEach(function (o) { o.classList.remove("on"); });
      b.classList.add("on");
      capa = b.dataset.capa;
      pintar();
    });
  });

  // ── Resumen y tabla de extremos ───────────────────────────────────────────
  var todas = Object.keys(PROV).map(function (s) { return [s, PROV[s]]; });
  var medidos = todas.reduce(function (a, x) { return a + x[1].n; }, 0);
  var total = todas.reduce(function (a, x) { return a + x[1].tot; }, 0);
  var precios = todas.map(function (x) { return x[1].med; });

  document.getElementById("det-lin").innerHTML =
    "<b>" + medidos.toLocaleString("es-ES") + "</b> inmuebles con superficie medida " +
    "en las " + todas.length + " provincias, entre <b>" +
    eur(Math.min.apply(null, precios)) + "</b> y <b>" +
    eur(Math.max.apply(null, precios)) + " €/m²</b>.";
  var ctaN = document.getElementById("cta-n");
  if (ctaN) ctaN.textContent = total.toLocaleString("es-ES");

  var orden = todas.slice().sort(function (a, b) { return b[1].med - a[1].med; });
  document.getElementById("tabla-extremos").innerHTML =
    orden.slice(0, 6).concat(orden.slice(-4)).map(function (x) {
      var p = x[1];
      return "<tr><td><a href='explorador-" + x[0] + ".html'>" + p.prov + "</a></td>" +
        "<td class='num'>" + eur(p.med) + "</td>" +
        "<td class='num'>" + p.n.toLocaleString("es-ES") + "</td>" +
        "<td class='num " + (p.coc >= 0 ? "pos" : "neg") + "'>" + pct(p.coc) + "</td></tr>";
    }).join("");

  pintar();
})();
