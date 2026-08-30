/* ─── Consulta al Catastro (OVC) ──────────────────────────────────────────────
 *
 * Rellena los datos del inmueble desde la Oficina Virtual del Catastro, por
 * referencia catastral o por dirección.
 *
 * Por qué se puede hacer desde el navegador, sin servidor: el servicio del
 * Catastro devuelve JSON y manda `Access-Control-Allow-Origin: *`, así que la
 * página estática lo llama directamente (comprobado el 2026-08-30). Es un
 * servicio público y gratuito de la Secretaría de Estado de Hacienda; no hace
 * falta clave ni registro.
 *
 * Nada de esto sale del navegador de quien consulta: la petición va del
 * visitante al Catastro, no pasa por nosotros y no se guarda.
 *
 * Servicios usados (los dos del mismo endpoint):
 *   Consulta_DNPRC   — por referencia catastral (parámetro `RefCat`; ojo, NO
 *                      `RC`, que devuelve «la referencia catastral es
 *                      obligatoria» aunque la mandes)
 *   Consulta_DNPLOC  — por provincia + municipio + vía + número
 * ────────────────────────────────────────────────────────────────────────── */
(function (global) {
  "use strict";

  var BASE = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/" +
             "COVCCallejero.svc/json/";

  // Siglas de vía del Catastro, las corrientes. Si el usuario escribe "Calle
  // Mayor" se detecta "CL" y se manda el resto como nombre.
  var SIGLAS = {
    "calle": "CL", "c/": "CL", "c": "CL", "avenida": "AV", "avda": "AV",
    "av": "AV", "plaza": "PZ", "pza": "PZ", "paseo": "PS", "carretera": "CR",
    "camino": "CM", "travesia": "TR", "ronda": "RD", "via": "VI",
    "carrer": "CL", "passeig": "PS", "placa": "PZ", "rua": "CL"
  };

  function sinTildes(s) {
    return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function pedir(servicio, params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k] || "");
    }).join("&");
    return fetch(BASE + servicio + "?" + q, { mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("el Catastro respondió " + r.status);
        return r.json();
      });
  }

  // El Catastro devuelve el error dentro del cuerpo, no en el código HTTP.
  function comprobarError(res) {
    var c = res.control || {};
    if (c.cuerr && res.lerr && res.lerr.length) {
      throw new Error(res.lerr[0].des || "consulta rechazada");
    }
  }

  /* Aplana la respuesta a algo manejable. El Catastro anida mucho y con
     nombres de tres letras; se traduce aquí una sola vez. */
  function normalizar(bico) {
    if (!bico || !bico.bi) return null;
    var bi = bico.bi, dt = bi.dt || {}, debi = bi.debi || {};
    var rc = (bi.idbi && bi.idbi.rc) || {};
    var urb = ((dt.locs || {}).lous || {}).lourb || {};

    var elementos = (bico.lcons || []).map(function (c) {
      return {
        clase: c.lcd || "",
        tipo: (c.dvcons || {}).dtip || "",
        m2: parseFloat((c.dfcons || {}).stl) || null
      };
    });

    return {
      rc: [rc.pc1, rc.pc2, rc.car, rc.cc1, rc.cc2].join(""),
      direccion: bi.ldt || "",
      provincia: dt.np || "",
      municipio: dt.nm || "",
      cp: urb.dp || "",
      uso: debi.luso || "",
      m2: parseFloat(debi.sfc) || null,
      anio: debi.ant ? parseInt(debi.ant, 10) : null,
      // Cuando la finca tiene varios elementos (vivienda + garaje + trastero),
      // sfc los suma. Para valorar interesa la vivienda sola, que suele ser
      // bastante menos: en el ejemplo de las pruebas, 308 m² totales frente a
      // 109 de vivienda. Se ofrecen los dos y decide quien consulta.
      m2_vivienda: (function () {
        var v = elementos.filter(function (e) {
          return /VIVIENDA/i.test(e.clase) && e.m2;
        });
        return v.length ? v.reduce(function (s, e) { return s + e.m2; }, 0) : null;
      })(),
      elementos: elementos
    };
  }

  /* ─── Validar la direccion antes de preguntar al Catastro ──────────────
   *
   * Se usa CartoCiudad, el geocodificador oficial del Instituto Geografico
   * Nacional. Por que este y no Google Maps: esta web son ficheros estaticos
   * en GitHub Pages, asi que una clave de API iria dentro del JavaScript y la
   * veria cualquiera que abriese el codigo fuente — el mismo motivo por el que
   * el asistente de dudas es de reglas y no llama a ninguna IA. CartoCiudad no
   * pide clave, es gratuito, manda Access-Control-Allow-Origin: * y ademas
   * conoce el callejero espanol oficial, que para direcciones de aqui es mejor
   * fuente que Google.
   *
   * Devuelve la direccion normalizada y sus coordenadas.
   */
  var URL_IGN = "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp";

  /* Google Maps como geocodificador, si hay clave.
   *
   * Se activa poniendo la clave en la propia pagina, antes de cargar este
   * fichero:
   *
   *     <script>window.REO_GOOGLE_KEY = "AIza...";</script>
   *
   * La clave va en el navegador porque es el modelo de Google para su API web:
   * lo que la protege NO es esconderla —es imposible en una web estatica— sino
   * RESTRINGIRLA. En Google Cloud Console, en la clave:
   *   · Restriccion de aplicacion: "Sitios web (referente HTTP)" con
   *     https://www.scannerinmobiliario.com/*
   *   · Restriccion de API: solo "Geocoding API"
   *   · Y ponle un limite de cuota diario, para que un abuso no dispare la
   *     factura.
   * Sin esas dos restricciones cualquiera puede copiar la clave y gastarte el
   * credito, asi que no la subas hasta tenerlas puestas.
   *
   * Sin clave se usa CartoCiudad (IGN), que no la necesita y conoce el
   * callejero oficial espanol.
   */
  function _google(texto) {
    var key = global.REO_GOOGLE_KEY;
    if (!key) return Promise.reject(new Error("sin clave"));
    var u = "https://maps.googleapis.com/maps/api/geocode/json?address=" +
            encodeURIComponent(texto) + "&components=country:ES&language=es&key=" + key;
    return fetch(u, { mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status !== "OK" || !j.results.length) {
          throw new Error("Google no encuentra esa direccion (" + j.status + ")");
        }
        var g = j.results[0], c = {};
        (g.address_components || []).forEach(function (x) {
          x.types.forEach(function (t) { c[t] = x.long_name; });
        });
        return {
          direccion: g.formatted_address,
          municipio: c.locality || c.administrative_area_level_2 || "",
          provincia: c.administrative_area_level_2 || "",
          cp: c.postal_code || "",
          lat: g.geometry.location.lat,
          lng: g.geometry.location.lng,
          // ROOFTOP = el portal exacto; el resto es aproximado.
          precision: g.geometry.location_type === "ROOFTOP" ? "portal" : "aproximada",
          fuente: "Google Maps"
        };
      });
  }

  function validarDireccion(texto) {
    if (!(texto || "").trim()) {
      return Promise.reject(new Error("escribe una direccion"));
    }
    if (global.REO_GOOGLE_KEY) {
      // Con clave manda Google; si falla (cuota agotada, clave mal
      // restringida) NO se deja al usuario sin validar: se cae al IGN.
      return _google(texto).catch(function (e) {
        if (global.console) console.warn("Google geocoding fallo:", e.message);
        return _cartociudad(texto);
      });
    }
    return _cartociudad(texto);
  }

  function _cartociudad(texto) {
    return fetch(URL_IGN + "?q=" + encodeURIComponent(texto), { mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("el geocodificador respondio " + r.status);
        return r.text();
      })
      .then(function (txt) {
        // La respuesta viene envuelta en callback(...) aunque se pida JSON.
        var m = txt.match(/^[^(]*\((.*)\)\s*;?\s*$/s);
        var j = JSON.parse(m ? m[1] : txt);
        if (!j || (!j.lat && !j.lng)) {
          throw new Error("no se ha encontrado esa direccion");
        }
        return {
          direccion: [j.tip_via, j.address, j.portalNumber].filter(Boolean).join(" "),
          municipio: j.muni || "",
          provincia: j.province || "",
          cp: j.postalCode || "",
          lat: j.lat,
          lng: j.lng,
          // "portal" = numero exacto; "callejero"/"via" = solo la calle, el
          // punto cae en algun sitio de ella y el contraste puede desviarse.
          precision: j.type || "",
          fuente: "IGN · CartoCiudad"
        };
      });
  }

  /* Referencia catastral que hay en unas coordenadas. OJO: los parametros son
     CoorX / CoorY. Con Coordenada_X responde "LA COORDENADA X OBLIGATORIA"
     aunque la mandes, que despista bastante. */
  function porCoordenadas(lat, lng) {
    var base = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/" +
               "COVCCoordenadas.svc/json/Consulta_RCCOOR";
    var q = "SRS=EPSG:4326&CoorX=" + encodeURIComponent(lng) +
            "&CoorY=" + encodeURIComponent(lat);
    return fetch(base + "?" + q, { mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var res = j.Consulta_RCCOORResult || {};
        if (res.control && res.control.cuerr && res.lerr && res.lerr.length) {
          throw new Error(res.lerr[0].des || "el Catastro no reconoce ese punto");
        }
        var c = ((res.coordenadas || {}).coord || [])[0];
        if (!c) throw new Error("no hay ninguna finca catastrada en ese punto");
        var pc = c.pc || {};
        return { rc: (pc.pc1 || "") + (pc.pc2 || ""), descripcion: c.ldt || "" };
      });
  }

  function porReferencia(refcat) {
    var rc = (refcat || "").replace(/[\s.-]/g, "").toUpperCase();
    if (rc.length < 14) {
      return Promise.reject(new Error(
        "una referencia catastral tiene 20 caracteres (o 14 si es la de la finca)"));
    }
    return pedir("Consulta_DNPRC", { Provincia: "", Municipio: "", RefCat: rc })
      .then(function (j) {
        var res = j.consulta_dnprcResult || {};
        comprobarError(res);
        var d = normalizar(res.bico);
        if (!d) throw new Error("el Catastro no devolvió datos de esa referencia");
        return d;
      });
  }

  /* Parte una dirección escrita a mano en lo que pide el Catastro.
     Admite piso y puerta al final, que es como se escribe de verdad:
       "Carrer Harmonia 35 9-1"  -> CL HARMONIA, nº 35, planta 9, puerta 1
       "Calle Gloria 51"         -> CL GLORIA, nº 51
       "Av. Diagonal 220, 3 B"   -> AV DIAGONAL, nº 220, planta 3, puerta B
     Sin esto había que quedarse en el portal y elegir a mano entre todos los
     inmuebles del edificio. */
  function partirDireccion(texto) {
    var t = (texto || "").trim().replace(/\s+/g, " ");
    var planta = "", puerta = "";

    // Piso y puerta al final: "9-1", "9 1", "3º B", "3 B", "bajo A".
    var mPP = t.match(/[,\s]((?:\d{1,3}|bajo|bj|entlo|ppal|atico)[ºoª]?)\s*[-\/ ]\s*([A-Za-z0-9]{1,3})\s*$/i);
    if (mPP) {
      // El indicador de ordinal se quita SOLO detras de un numero: si se
      // borrara siempre, "bajo" perdia su "o" y acababa como planta "aj".
      planta = mPP[1].replace(/(\d)[ºoª]/gi, "$1");
      puerta = mPP[2];
      t = t.slice(0, mPP.index);
    }

    // Una coma colgando ("Av. Diagonal 220, 3 B") dejaba el numero sin
    // reconocer, porque el patron pide que la cadena acabe en el numero.
    t = t.replace(/[\s,]+$/, "");
    var mNum = t.match(/[,\s](\d+[A-Za-z]?)\s*$/);
    var numero = mNum ? mNum[1].replace(/\D/g, "") : "";
    if (mNum) t = t.slice(0, mNum.index);

    var sigla = "CL", partes = t.replace(/,\s*$/, "").split(" ");
    var primera = sinTildes(partes[0] || "").toLowerCase().replace(/\.$/, "");
    if (SIGLAS[primera]) {
      sigla = SIGLAS[primera];
      partes.shift();
    }
    return {
      sigla: sigla, calle: partes.join(" ").trim(), numero: numero,
      // El Catastro guarda la planta a dos dígitos ("09") y el bajo como "00".
      planta: /^(bajo|bj)$/i.test(planta) ? "00"
              : (planta ? ("0" + planta).slice(-2) : ""),
      puerta: puerta ? puerta.toUpperCase() : ""
    };
  }

  function porDireccion(provincia, municipio, texto) {
    var d = partirDireccion(texto);
    if (!d.calle) return Promise.reject(new Error("falta el nombre de la vía"));
    if (!d.numero) return Promise.reject(new Error("falta el número de portal"));
    return pedir("Consulta_DNPLOC", {
      Provincia: provincia, Municipio: municipio, Sigla: d.sigla,
      Calle: d.calle, Numero: d.numero,
      Bloque: "", Escalera: "", Planta: d.planta, Puerta: d.puerta
    }).then(function (j) {
      var res = j.consulta_dnplocResult || {};
      comprobarError(res);

      // Dos formas de respuesta según lo que haya en esa dirección:
      //  - una sola finca  -> `bico`, la ficha completa
      //  - un edificio     -> `lrcdnp.rcdnp[]`, la lista de sus inmuebles
      // Un portal con pisos cae SIEMPRE en el segundo caso, así que tratarlo
      // era imprescindible: sin esto, buscar "Gran Via 25" fallaba aunque el
      // Catastro estuviera respondiendo de sobra.
      var uno = normalizar(res.bico);
      if (uno) return { unico: uno };

      var lista = ((res.lrcdnp || {}).rcdnp) || [];
      if (!lista.length) {
        throw new Error("no hay ningún inmueble en esa dirección; revisa la vía " +
                        "y el número, o busca por referencia catastral");
      }
      return {
        lista: lista.map(function (it) {
          var rc = it.rc || {}, dt = it.dt || {}, debi = it.debi || {};
          var urb = ((dt.locs || {}).lous || {}).lourb || {};
          var li = urb.loint || {};
          var sitio = [li.es ? "esc " + li.es : "",
                       li.pt ? "planta " + li.pt : "",
                       li.pu ? "puerta " + li.pu : ""].filter(Boolean).join(", ");
          return {
            rc: [rc.pc1, rc.pc2, rc.car, rc.cc1, rc.cc2].join(""),
            sitio: sitio || "sin desglose",
            uso: debi.luso || "",
            m2: parseFloat(String(debi.sfc || "").replace(/\./g, "")) || null
          };
        })
      };
    });
  }

  global.REO_CATASTRO = {
    porReferencia: porReferencia,
    porDireccion: porDireccion,
    partirDireccion: partirDireccion,
    validarDireccion: validarDireccion,
    porCoordenadas: porCoordenadas
  };
})(window);
