/* ─── Mapa de precios por provincia, con desglose por municipio ──────────────
 * Tres capas sobre la misma geometría:
 *
 *   mercado  – valor tasado medio de vivienda libre (Ministerio de Vivienda).
 *              Es el precio de MERCADO, y es la capa por defecto: el stock del
 *              Scanner son pisos de banco y subasta, que no representan lo que
 *              cuesta comprar en esa zona.
 *   stock    – mediana del inventario del Scanner. Sirve para ver la distancia
 *              con el mercado, no para saber cuánto vale una casa.
 *   renta    – cash-on-cash mediano. Esto no lo enseña ningún portal.
 *
 * Al pulsar una provincia se abre su desglose: todos los municipios con datos,
 * su €/m² y cuántos comparables lo sostienen.
 *
 * Sin librería de mapas ni servidor de teselas: los trazados viajan en
 * datos-zona.js, así que la página funciona en estático y sin peticiones.
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var Z = window.REO_ZONA;
  if (!Z || !Z.mapa) return;

  var PROV = Z.prov, GEO = Z.mapa, MUNI = Z.muni || {}, MKT = Z.mercado || null;

  var VERDE = ["#e9f0ea", "#c6dbc9", "#9dbf9f", "#74a377", "#4f8a5c"];  // mercado
  var AZUL  = ["#e8eff5", "#c9dcea", "#a3c3da", "#7ba5c6", "#4d7495"];  // stock
  var RENTA = ["#b5544b", "#d08b7f", "#e8c9a8", "#9dbf9f", "#4f8a5c"];  // rentabilidad

  var CAPAS = {
    mercado: { pal: VERDE, campo: "mkt", fmt: "eur", tit: "Precio de mercado" },
    stock:   { pal: AZUL,  campo: "med", fmt: "eur", tit: "Stock del Scanner" },
    renta:   { pal: RENTA, campo: "coc", fmt: "pct", tit: "Rentabilidad" }
  };

  var capa = MKT ? "mercado" : "stock";
  var svg = document.getElementById("svg-mapa");
  var g = document.getElementById("g-prov");
  var tip = document.getElementById("tip");
  var seleccionada = null;

  svg.setAttribute("viewBox", "0 0 " + GEO.w + " " + GEO.h);

  function eur(x) { return Math.round(x).toLocaleString("es-ES"); }
  function pct(x) {
    return x.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
  }
  function fmtDe(c) { return CAPAS[c].fmt === "eur" ? eur : pct; }
  function valor(slug) {
    var p = PROV[slug];
    return p ? p[CAPAS[capa].campo] : undefined;
  }

  function cortes() {
    var v = Object.keys(GEO.d)
      .map(valor)
      .filter(function (x) { return typeof x === "number"; })
      .sort(function (a, b) { return a - b; });
    return [0.2, 0.4, 0.6, 0.8].map(function (p) { return v[Math.floor(v.length * p)]; });
  }
  function tramo(x, c) { return c.filter(function (u) { return x > u; }).length; }

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
    var c = cortes(), pal = CAPAS[capa].pal, fmt = fmtDe(capa);
    g.querySelectorAll("path").forEach(function (p) {
      var v = valor(p.dataset.slug);
      p.setAttribute("fill", typeof v === "number" ? pal[tramo(v, c)] : "#eceff2");
    });
    // Con valores negativos un guion entre cifras se lee fatal: se usa "a".
    var sep = capa === "renta" ? " a " : " – ";
    var et = ["&lt; " + fmt(c[0]),
              fmt(c[0]) + sep + fmt(c[1]),
              fmt(c[1]) + sep + fmt(c[2]),
              fmt(c[2]) + sep + fmt(c[3]),
              "&gt; " + fmt(c[3])];
    document.getElementById("leyenda").innerHTML = et.map(function (t, i) {
      return "<span class='lg" + (i >= 3 ? " osc" : "") + "' style='background:" +
             pal[i] + "'>" + t + "</span>";
    }).join("");
  }

  // ── Desglose por municipio ────────────────────────────────────────────────
  function desglose(slug) {
    var m = MUNI[slug] || {};
    var filas = Object.keys(m).map(function (k) { return [k, m[k]]; })
      .sort(function (a, b) { return b[1].q[1] - a[1].q[1]; });
    if (!filas.length) {
      return "<div class='fuente'>Sin municipios con suficientes comparables en " +
             "esta provincia.</div>";
    }
    var mkt = PROV[slug] && PROV[slug].mkt;
    return "<div class='muni-cab'><b>" + filas.length + " municipios</b> con 12 o más " +
      "comparables, ordenados por precio del stock" +
      (mkt ? " · media de mercado de la provincia: <b>" + eur(mkt) + " €/m²</b>" : "") +
      "</div>" +
      "<div class='tabla-scroll'><table class='t-muni'><thead><tr>" +
      "<th>Municipio</th><th class='num'>€/m² stock</th>" +
      "<th class='num'>Rango (p25–p75)</th><th class='num'>Comparables</th>" +
      (mkt ? "<th class='num'>Mercado</th><th class='num'>vs mercado</th>" : "") +
      "</tr></thead><tbody>" +
      filas.map(function (f) {
        // Referencia propia del municipio si el ministerio la publica; si no,
        // la de su provincia. Se marca cuál es cada una: comparar un municipio
        // contra la media de su provincia desvía muchisimo (Barcelona ciudad
        // esta un 46 % por encima de la media de su provincia, y Manresa un
        // 52 % por debajo), asi que el usuario tiene que poder distinguirlo.
        var d = f[1], ref = (typeof d.mkt === "number") ? d.mkt : mkt;
        var propia = d.mfuente === "muni";
        var gap = ref ? Math.round((d.q[1] / ref - 1) * 100) : null;
        return "<tr><td>" + f[0] + "</td>" +
          "<td class='num'><b>" + eur(d.q[1]) + "</b></td>" +
          "<td class='num'>" + eur(d.q[0]) + " – " + eur(d.q[2]) + "</td>" +
          "<td class='num'>" + d.c.toLocaleString("es-ES") + "</td>" +
          (mkt ? "<td class='num'>" + (ref ? eur(ref) : "—") +
                 (ref ? "<span class='ref-t' title='" +
                        (propia ? "Valor tasado del propio municipio"
                                : "Sin dato municipal: se usa la media de la provincia") +
                        "'>" + (propia ? " muni" : " prov") + "</span>" : "") +
                 "</td>" : "") +
          (mkt ? "<td class='num " + (gap <= 0 ? "pos" : "neg") + "'>" +
                 (gap > 0 ? "+" : "") + gap + " %</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>" +
      "<div class='fuente'>La columna «mercado» es el <b>valor tasado oficial</b> " +
      "del Ministerio. Los municipios marcados <b>muni</b> se comparan con su " +
      "propio valor; los marcados <b>prov</b> no llegan a 25.000 habitantes —el " +
      "ministerio no los publica por separado— y usan la media de su provincia, " +
      "que en municipios pequeños puede desviarse bastante.</div>";
  }

  function ficha(slug) {
    var p = PROV[slug];
    if (!p) return;
    var html = "<h3>" + p.prov + "</h3>";

    if (typeof p.mkt === "number") {
      html += "<div class='comparativa'>" +
        "<div class='cm'><div class='cm-k'>Mercado</div><div class='cm-v'>" +
          eur(p.mkt) + " €/m²</div><div class='cm-c'>valor tasado oficial" +
          (typeof p.mvar === "number" ? " · " + (p.mvar > 0 ? "+" : "") +
            pct(p.mvar) + " en un año" : "") + "</div></div>" +
        "<div class='cm'><div class='cm-k'>Stock del Scanner</div><div class='cm-v'>" +
          eur(p.med) + " €/m²</div><div class='cm-c'>" +
          p.n.toLocaleString("es-ES") + " inmuebles medidos</div></div>" +
        "<div class='cm'><div class='cm-k'>Diferencia</div><div class='cm-v " +
          (p.gap <= 0 ? "pos" : "neg") + "'>" + (p.gap > 0 ? "+" : "") + pct(p.gap) +
          "</div><div class='cm-c'>" + (p.gap <= 0
            ? "el stock de banco está por debajo del mercado"
            : "aquí el stock sale por encima de la media provincial") +
          "</div></div></div>";
    } else {
      html += "<div class='lin'><b>" + eur(p.med) + " €/m²</b> de mediana del stock, " +
        "sobre <b>" + p.n.toLocaleString("es-ES") + "</b> inmuebles medidos.</div>";
    }

    html += "<div class='lin'>Cash-on-cash mediano: <b class='" +
      (p.coc >= 0 ? "pos" : "neg") + "'>" + pct(p.coc) + "</b> — con 80 % financiado " +
      "a 20 años al 3,5 %.</div>" +
      "<div class='muni'>" + desglose(slug) + "</div>" +
      "<div class='lin' style='margin-top:14px'><a href='explorador-" + slug +
      ".html'>Ver los " + p.tot.toLocaleString("es-ES") + " inmuebles de " +
      p.prov + " →</a></div>";

    document.getElementById("detalle").innerHTML = html;
  }

  function elegir(p) {
    g.querySelectorAll("path").forEach(function (o) { o.classList.remove("sel"); });
    p.classList.add("sel");
    seleccionada = p.dataset.slug;
    ficha(seleccionada);
    document.getElementById("detalle").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  g.addEventListener("mousemove", function (e) {
    var p = e.target.closest("path");
    if (!p || !PROV[p.dataset.slug]) { tip.hidden = true; return; }
    var d = PROV[p.dataset.slug], r = svg.getBoundingClientRect(), v = valor(p.dataset.slug);
    tip.innerHTML = "<b>" + d.prov + "</b><br>" +
      (typeof v === "number"
        ? (capa === "renta" ? "cash-on-cash " + pct(v) : eur(v) + " €/m²")
        : "sin dato");
    tip.hidden = false;
    var mitad = tip.offsetWidth / 2 + 4;
    tip.style.left = Math.min(Math.max(e.clientX - r.left, mitad), r.width - mitad) + "px";
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
    if (b.dataset.capa === "mercado" && !MKT) { b.disabled = true; return; }
    b.classList.toggle("on", b.dataset.capa === capa);
    b.addEventListener("click", function () {
      document.querySelectorAll(".cb").forEach(function (o) { o.classList.remove("on"); });
      b.classList.add("on");
      capa = b.dataset.capa;
      pintar();
      if (seleccionada) ficha(seleccionada);
    });
  });

  // ── Resumen, tabla de extremos y pie de fuente ────────────────────────────
  var todas = Object.keys(PROV).map(function (s) { return [s, PROV[s]]; });
  var total = todas.reduce(function (a, x) { return a + x[1].tot; }, 0);

  var linea = document.getElementById("det-lin");
  if (MKT) {
    var mkts = todas.map(function (x) { return x[1].mkt; })
                    .filter(function (v) { return typeof v === "number"; });
    linea.innerHTML = "Precio de mercado de las 52 provincias en el <b>" +
      MKT.periodo + "</b>, entre <b>" + eur(Math.min.apply(null, mkts)) +
      "</b> y <b>" + eur(Math.max.apply(null, mkts)) + " €/m²</b>. " +
      "Pulsa una para ver sus municipios.";
  } else {
    linea.textContent = "Pulsa una provincia para ver sus municipios.";
  }
  var ctaN = document.getElementById("cta-n");
  if (ctaN) ctaN.textContent = total.toLocaleString("es-ES");

  var pie = document.getElementById("pie-fuente");
  if (pie && MKT) {
    pie.innerHTML = "Precio de mercado: <b>" + MKT.fuente + "</b> (" + MKT.periodo +
      "), a partir de tasaciones hipotecarias. Datos abiertos, " +
      "<a href='" + MKT.url + "' rel='nofollow noopener'>descarga oficial</a>.";
  }

  var orden = todas.filter(function (x) { return typeof x[1].mkt === "number"; })
                   .sort(function (a, b) { return (a[1].gap) - (b[1].gap); });
  document.getElementById("tabla-extremos").innerHTML =
    orden.slice(0, 6).concat(orden.slice(-4)).map(function (x) {
      var p = x[1];
      return "<tr><td><a href='explorador-" + x[0] + ".html'>" + p.prov + "</a></td>" +
        "<td class='num'>" + eur(p.mkt) + "</td>" +
        "<td class='num'>" + eur(p.med) + "</td>" +
        "<td class='num " + (p.gap <= 0 ? "pos" : "neg") + "'>" +
        (p.gap > 0 ? "+" : "") + pct(p.gap) + "</td></tr>";
    }).join("");

  pintar();
})();
