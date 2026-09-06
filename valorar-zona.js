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

  /* ── Catastro: rellenar el formulario con datos oficiales ─────────────── */
  var cRC  = document.getElementById("cat-rc");
  var cDir = document.getElementById("cat-dir");
  var cRes = document.getElementById("cat-res");

  // Lo que dijo el callejero oficial, para que NO se pierda al pintar despues
  // los datos del Catastro. El contraste entre ambos es justo lo que permite
  // ver que el punto ha caido en la finca de al lado.
  var contexto = "";

  function aviso(html, clase) {
    if (cRes) cRes.innerHTML = contexto +
      "<div class='cat-msg " + (clase || "") + "'>" + html + "</div>";
  }

  /* El Catastro escribe los municipios en mayúsculas y a su manera ("MADRID",
     "CORUÑA (A)"); nuestros selects usan la grafía de los anuncios. Se compara
     sin acentos, sin artículo y en minúsculas para que se encuentren. */
  function normaliza(t) {
    var n = (t || "").trim().toLowerCase();
    var m = n.match(/^(.*?),?\s*\((el|la|els|les|a|o|os|as|l')\)$/);
    if (m) n = m[2] + " " + m[1];
    return n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, "").trim();
  }

  function seleccionar(sel, texto) {
    var objetivo = normaliza(texto);
    for (var i = 0; i < sel.options.length; i++) {
      if (normaliza(sel.options[i].textContent) === objetivo) {
        sel.selectedIndex = i;
        return true;
      }
    }
    return false;
  }

  function volcar(d) {
    var notas = [];
    if (seleccionar(selP, d.provincia)) {
      pintarMunicipios();
      if (!seleccionar(selM, d.municipio)) {
        notas.push("de <b>" + d.municipio + "</b> no hay comparables suficientes, " +
                   "así que se valora con toda la provincia");
      }
    } else {
      notas.push("la provincia <b>" + d.provincia + "</b> no está entre las escaneadas");
    }

    // Superficie: la de la vivienda si el Catastro la desglosa; si no, la
    // construida total, avisando de que incluye garaje y trastero.
    var m2 = d.m2_vivienda || d.m2;
    if (m2) {
      document.getElementById("v-m2").value = Math.round(m2);
      if (!d.m2_vivienda && d.elementos.length > 1) {
        notas.push("los <b>" + Math.round(d.m2) + " m²</b> son la superficie " +
                   "construida total e incluyen anejos; ajústala si quieres solo " +
                   "la vivienda");
      }
    }

    var filas = [
      ["Dirección", d.direccion],
      ["Referencia catastral", d.rc],
      ["Uso", d.uso],
      ["Superficie construida", d.m2 ? d.m2 + " m²" : ""],
      ["Superficie de vivienda", d.m2_vivienda ? Math.round(d.m2_vivienda) + " m²" : ""],
      ["Año de construcción", d.anio || ""],
      ["Código postal", d.cp]
    ].filter(function (f) { return f[1]; });

    var elem = d.elementos.filter(function (e) { return e.m2; });
    cRes.innerHTML = contexto +
      "<div class='cat-ok'>Datos del Catastro</div>" +
      "<dl class='cat-dl'>" + filas.map(function (f) {
        return "<dt>" + f[0] + "</dt><dd>" + f[1] + "</dd>";
      }).join("") + "</dl>" +
      (elem.length > 1
        ? "<div class='cat-el'>Elementos: " + elem.map(function (e) {
            return e.clase.toLowerCase() + " " + e.m2 + " m²";
          }).join(" · ") + "</div>"
        : "") +
      (notas.length ? "<div class='cat-msg aviso'>" + notas.join(". ") + ".</div>" : "");

    // Datos que hacen falta para buscar en el Notariado: alli se busca por
    // codigo postal o municipio, y a estas alturas ya los tenemos del Catastro.
    var cp = document.getElementById("v-cp");
    if (cp) {
      var partes = [];
      if (d.cp) partes.push("código postal <b>" + d.cp + "</b>");
      if (d.municipio) partes.push("municipio <b>" + d.municipio + "</b>");
      cp.innerHTML = partes.length
        ? "Para buscarlo allí: " + partes.join(" · ")
        : "";
    }

    valorar();
  }

  /* Una dirección con varios inmuebles (un portal de pisos) devuelve la lista
     del edificio, no una ficha. Se enseñan para que se elija el suyo: sin
     esto, buscar cualquier calle con bloques de viviendas no daba nada. */
  function elegir(lista) {
    cRes.innerHTML =
      "<div class='cat-ok'>" + lista.length + " inmuebles en esa dirección</div>" +
      "<div class='cat-lista'>" + lista.map(function (it, i) {
        return "<button type='button' class='cat-op' data-rc='" + it.rc + "'>" +
          "<b>" + it.sitio + "</b>" +
          (it.uso ? " · " + it.uso : "") +
          (it.m2 ? " · " + it.m2 + " m²" : "") + "</button>";
      }).join("") + "</div>" +
      "<div class='cat-msg'>Elige el tuyo y se traen todos sus datos.</div>";
    Array.prototype.forEach.call(cRes.querySelectorAll(".cat-op"), function (b) {
      b.addEventListener("click", function () {
        buscar(REO_CATASTRO.porReferencia(b.getAttribute("data-rc")));
      });
    });
  }

  function buscar(promesa) {
    aviso("Consultando el Catastro…");
    promesa.then(function (r) {
      if (r && r.lista) return elegir(r.lista);
      volcar(r && r.unico ? r.unico : r);
    }).catch(function (e) {
      aviso("No se pudo: " + e.message, "error");
    });
  }

  if (cRC) {
    document.getElementById("cat-btn-rc").addEventListener("click", function () {
      contexto = "";   // la referencia es exacta: no hay nada que contrastar
      buscar(REO_CATASTRO.porReferencia(cRC.value));
    });
    cRC.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") document.getElementById("cat-btn-rc").click();
    });
  }
  if (cDir) {
    document.getElementById("cat-btn-dir").addEventListener("click", function () {
      var texto = cDir.value;
      aviso("Validando la dirección…");

      /* Dos pasos, y se enseñan los dos:
         1) el callejero oficial del IGN normaliza lo que se ha escrito y da
            sus coordenadas;
         2) el Catastro dice qué finca hay en ese punto.
         Si las dos coinciden, la dirección está contrastada de verdad. Si el
         IGN solo ha sabido situar la calle y no el portal, se avisa, porque
         entonces el punto cae en cualquier sitio de la vía. */
      REO_CATASTRO.validarDireccion(texto).then(function (d) {
        var exacta = /portal/i.test(d.precision);
        // Se enseña SIEMPRE lo que se pidió junto a lo que devolvió cada
        // fuente. Un aviso condicional se puede quedar callado por un fallo
        // de la comparación y entonces das por buena la finca equivocada;
        // poniendo las dos líneas a la vista, la discrepancia se ve sola.
        // Caso real: "carrer harmonia 35" -> el callejero devuelve el 37,
        // porque el 35 no existe en su base y engancha al portal más cercano.
        contexto =
          "<div class='cat-ok'>Dirección validada · " + (d.fuente || "IGN") + "</div>" +
          "<dl class='cat-dl'>" +
          "<dt>Has pedido</dt><dd>" + texto + "</dd>" +
          "<dt>El callejero encuentra</dt><dd>" + d.direccion + "</dd>" +
          "<dt>Municipio</dt><dd>" + d.municipio + " (" + d.provincia + ")</dd>" +
          (d.cp ? "<dt>Código postal</dt><dd>" + d.cp + "</dd>" : "") +
          "</dl>";
        if (!exacta) {
          contexto += "<div class='cat-msg aviso'>El callejero ha situado la " +
            "<b>vía</b> pero no el portal exacto: la finca del Catastro puede " +
            "no ser la tuya.</div>";
        }
        aviso("Contrastando con el Catastro…");

        return REO_CATASTRO.porCoordenadas(d.lat, d.lng).then(function (c) {
          contexto += "<div class='cat-msg'>En ese punto el Catastro tiene " +
            "<b>" + c.rc + "</b>" +
            (c.descripcion ? " — " + c.descripcion : "") + "</div>";
          return REO_CATASTRO.porReferencia(c.rc);
        }).catch(function (e) {
          // Sin finca en el punto se recurre a la búsqueda por calle+número,
          // que es la que funciona en portales de pisos.
          aviso("El Catastro no da finca en ese punto (" + e.message +
                "). Se busca por calle y número…");
          return REO_CATASTRO.porDireccion(d.provincia, d.municipio, texto);
        });
      }).then(function (r) {
        if (!r) return;
        if (r.lista) return elegir(r.lista);
        volcar(r.unico ? r.unico : r);
      }).catch(function (e) {
        aviso("No se pudo: " + e.message, "error");
      });
    });
    cDir.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") document.getElementById("cat-btn-dir").click();
    });
  }

  /* ── Informe descargable ────────────────────────────────────────────────
   *
   * Se genera con la impresion del navegador ("Guardar como PDF"), no con una
   * libreria externa: la web es estatica y meter un jsPDF de CDN significaria
   * depender de un tercero para algo que el navegador ya hace bien, ademas de
   * cargar 300 KB a todo el que entre. Asi el informe sale con las fuentes y
   * los colores de la propia pagina y funciona sin conexion.
   *
   * Los datos del emisor se guardan en este navegador (localStorage) para no
   * tener que reescribirlos: no viajan a ningun servidor porque no hay ninguno.
   */
  var emN = document.getElementById("em-nombre");
  var emC = document.getElementById("em-contacto");

  try {
    if (emN) emN.value = localStorage.getItem("reo_emisor_nombre") || "";
    if (emC) emC.value = localStorage.getItem("reo_emisor_contacto") || "";
  } catch (e) { /* navegador con el almacenamiento capado: se sigue igual */ }

  function guardarEmisor() {
    try {
      localStorage.setItem("reo_emisor_nombre", emN ? emN.value : "");
      localStorage.setItem("reo_emisor_contacto", emC ? emC.value : "");
    } catch (e) {}
  }
  [emN, emC].forEach(function (i) {
    if (i) i.addEventListener("change", guardarEmisor);
  });

  function txt(id) {
    var e = document.getElementById(id);
    return e ? e.textContent.trim() : "";
  }

  function informe() {
    if (txt("v-med") === "—") {
      return alert("Primero valora un inmueble: elige provincia y superficie, "
                 + "o trae los datos del Catastro.");
    }
    guardarEmisor();

    var hoy = new Date().toLocaleDateString("es-ES",
      { day: "2-digit", month: "long", year: "numeric" });
    var nombre = (emN && emN.value.trim()) || "";
    var contacto = (emC && emC.value.trim()) || "";

    // Ficha del Catastro, si se ha consultado. Se copia tal cual: es el dato
    // oficial y es justo lo que hace fiable la valoracion.
    var cat = document.getElementById("cat-res");
    var ficha = (cat && cat.querySelector(".cat-dl"))
      ? "<h2>Datos del inmueble · Catastro</h2>" + cat.innerHTML : "";

    var mercado = "";
    var m = (Z.mercado || {});
    if (m.fuente) {
      mercado = "<p class='pie'>Referencia de mercado: " + m.fuente +
                (m.periodo ? " · " + m.periodo : "") + ".</p>";
    }

    document.getElementById("hoja").innerHTML =
      "<div class='hoja-cab'>" +
        "<div class='hoja-marca'>Scanner<span>REO</span></div>" +
        "<div class='hoja-fecha'>Informe de valoración · " + hoy + "</div>" +
      "</div>" +
      (nombre
        ? "<div class='hoja-emisor'><b>Emitido por</b><br>" + nombre +
          (contacto ? "<br>" + contacto : "") + "</div>"
        : "") +
      "<h2>Valoración estimada</h2>" +
      "<p class='hoja-base'>" + txt("v-base") + "</p>" +
      "<table class='hoja-tres'><tr>" +
        "<th>Precio mínimo</th><th>Precio medio</th><th>Precio máximo</th></tr><tr>" +
        "<td>" + txt("v-min") + "</td>" +
        "<td class='destaca'>" + txt("v-med") + "</td>" +
        "<td>" + txt("v-max") + "</td></tr></table>" +
      "<p class='pie'>" + txt("v-conf") + "</p>" +
      ficha +
      mercado +
      // El informe deja constancia de que el valor tasado NO es el precio de
      // escritura, y de donde se consulta ese otro dato. Quien lo lea sabe
      // exactamente que tiene delante y que le falta por mirar.
      ((escEur && parseFloat(escEur.value) > 0)
        ? "<h2>Contraste: precio de escritura</h2>" +
          "<p class='hoja-base'>Dato consultado por quien emite este informe en " +
          (escFte ? escFte.value : "la fuente oficial") + ".</p>" +
          "<div class='hoja-esc'>" + escRes.innerHTML + "</div>"
        : "") +
      ((escEur && parseFloat(escEur.value) > 0) ? "" :
      "<h2>Contraste pendiente: precio de escritura</h2>") +
      ((escEur && parseFloat(escEur.value) > 0) ? "" :
      "<p class='pie'>Esta valoración parte del <b>valor tasado</b> oficial " +
      "(tasaciones hipotecarias). El precio <b>realmente escriturado</b> lo " +
      "publican en abierto el Portal Estadístico del Notariado " +
      "(penotariado.com) y el Catastro a través de su valor de referencia " +
      "(sedecatastro.gob.es). Las condiciones de uso de ambos no permiten " +
      "reproducir sus datos aquí, por lo que se recomienda consultarlos " +
      "directamente" +
      (function () {
        var cp = document.getElementById("v-cp");
        var t = cp ? cp.textContent.replace(/^Para buscarlo allí:\s*/, "") : "";
        return t ? " (" + t + ")" : "";
      })() + ".</p>") +
      "<p class='pie aviso-legal'>Valoración orientativa calculada a partir de " +
      "fuentes públicas (Catastro, valor tasado del Ministerio de Transportes y " +
      "Movilidad Sostenible, y precios de oferta recogidos por el Scanner). " +
      "<b>No sustituye a una tasación</b> homologada ni constituye asesoramiento " +
      "financiero, inmobiliario o legal.</p>";

    window.print();
  }

  /* ── Precio de escritura, consultado a mano ─────────────────────────────
   *
   * El dato lo consulta la persona en el portal del Notariado o en el
   * Catastro y lo escribe aqui. Esa diferencia importa: lo que sus
   * condiciones prohiben es INCORPORAR sus datos a una base consultable por
   * terceros, no que alguien mire una cifra publica y la use en su propio
   * trabajo. Aqui el dato no se descarga, no se guarda en ningun servidor y
   * no se comparte: vive en esta pagina mientras dure la consulta.
   *
   * A cambio, el informe deja de ser "una estimacion" y pasa a contrastar la
   * valoracion contra lo que se paga de verdad en la zona.
   */
  var escEur = document.getElementById("esc-eur");
  var escFte = document.getElementById("esc-fuente");
  var escRes = document.getElementById("esc-res");

  function pintarEscritura() {
    if (!escRes) return;
    var eur = parseFloat(escEur && escEur.value);
    var m2 = parseFloat(document.getElementById("v-m2").value);
    if (!eur || eur <= 0) { escRes.innerHTML = ""; return; }

    var html = "<b>" + eur.toLocaleString("es-ES") + " €/m²</b> según " +
               (escFte ? escFte.value : "la consulta");
    if (m2 > 0) {
      var total = Math.round(eur * m2);
      html += "<br>Para " + m2 + " m²: <b>" + total.toLocaleString("es-ES") + " €</b>";
      // Comparado con el precio medio que ha calculado la pagina.
      var med = parseFloat((txt("v-med") || "").replace(/[^\d]/g, ""));
      if (med > 0) {
        var dif = Math.round((total / med - 1) * 100);
        html += "<br>Frente a la valoración de esta página: <span class='" +
                (dif >= 0 ? "dif-pos" : "dif-neg") + "'>" +
                (dif > 0 ? "+" : "") + dif + " %</span>";
      }
    }
    escRes.innerHTML = html;
  }
  [escEur, escFte].forEach(function (e) {
    if (e) { e.addEventListener("input", pintarEscritura);
             e.addEventListener("change", pintarEscritura); }
  });

  var bPdf = document.getElementById("v-pdf");
  if (bPdf) bPdf.addEventListener("click", informe);

  document.getElementById("v-calc").addEventListener("click", valorar);
  ["v-m2", "v-estado", "v-muni"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", valorar);
  });
  selP.addEventListener("change", valorar);

  var cmkt = document.getElementById("c-mkt");
  if (cmkt) cmkt.textContent = (Z.muni_con_mercado || 0).toLocaleString("es-ES");

  var cm = document.getElementById("c-muni");
  if (cm) {
    cm.textContent = Object.keys(MUNI).reduce(function (a, k) {
      return a + Object.keys(MUNI[k]).length;
    }, 0).toLocaleString("es-ES");
  }

  valorar();
})();
