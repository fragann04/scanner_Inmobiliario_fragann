#!/usr/bin/env python3
"""Genera las paginas publicas por provincia que Google si puede indexar.

Los 52 exploradores piden clave (redirigen a acceso.html), asi que robots.txt
los bloquea y Google no ve nada del inventario: solo quedaban 5 URLs
indexables, dos de ellas utiles. Sin paginas por provincia no hay forma de
aparecer en «pisos de banco en Malaga» o «subastas BOE Valencia», que es donde
esta la busqueda con volumen.

Este script lee cada explorador-<provincia>.html, resume lo que contiene y
escribe:

  provincia-<slug>.html   un adelanto publico e indexable por provincia
  provincias.html         el indice de las 52
  sitemap.xml             las 5 URLs de siempre mas las 53 nuevas

El adelanto NO reproduce el inventario completo: da recuentos, rangos de
precio, los municipios con mas oferta y unos pocos ejemplos. El explorador
entero sigue siendo el producto, detras del registro.

Se ejecuta en el flujo de GitHub despues de cada envio, asi que los datos
salen siempre del escaneo del dia sin depender de la carpeta local.
"""

import datetime
import glob
import html
import pathlib
import re
import statistics
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SITIO = "https://www.scannerinmobiliario.com"
MARCA = "Scanner Inmobiliario"

# Cuantos ejemplos se ensenan por provincia. Pocos a proposito: es un
# adelanto, no el catalogo.
EJEMPLOS = 6
# Cuantos municipios se listan como «donde hay mas oferta».
MUNICIPIOS = 12

FILA = re.compile(r"<tr>.*?</tr>", re.S)
CAMPOS = {
    "municipio": re.compile(r'data-label="Localidad / Dirección"><b>([^<]*)</b>'),
    "fuente": re.compile(r'data-label="Fuente"><span class=\'tag\'[^>]*>([^<]*)</span>'),
    "precio": re.compile(r'data-label="Precio" class="num">(.*?)</td>', re.S),
    "capital": re.compile(r'data-label="Capital entrada" class="num"><b>([^<]*)</b>'),
    "bruta": re.compile(r'data-label="Rent\. bruta" class="num">(.*?)</td>', re.S),
}
PROVINCIA_H1 = re.compile(r"<h1>[^<]*·\s*([^<]+)</h1>")


def numero(texto):
    """«123.975 €» -> 123975.0 ; «1080,1%» -> 1080.1 ; «~ N/D» -> None."""
    if texto is None:
        return None
    limpio = re.sub(r"<[^>]+>", "", texto)
    limpio = limpio.replace("€", "").replace("%", "").replace("\xa0", " ").strip()
    limpio = limpio.replace(".", "").replace(",", ".")
    try:
        return float(limpio)
    except ValueError:
        return None


def euros(valor):
    """1234567.0 -> «1.234.567 €», al estilo espanol."""
    return "{:,.0f}".format(valor).replace(",", ".") + " €"


def escribir_si_cambia(ruta, contenido):
    """Escribe solo si el contenido es distinto. Devuelve True si tocó el disco."""
    if ruta.exists() and ruta.read_text(encoding="utf-8") == contenido:
        return False
    ruta.write_text(contenido, encoding="utf-8")
    return True


def leer_explorador(ruta):
    """Saca de un explorador la provincia y sus filas utiles."""
    texto = ruta.read_text(encoding="utf-8", errors="replace")

    m = PROVINCIA_H1.search(texto)
    if not m:
        return None
    provincia = html.unescape(m.group(1)).strip()
    slug = ruta.name[len("explorador-"):-len(".html")]

    filas = []
    for bruto in FILA.findall(texto):
        if 'data-label="Precio"' not in bruto:
            continue
        fila = {}
        for nombre, patron in CAMPOS.items():
            hallado = patron.search(bruto)
            fila[nombre] = html.unescape(hallado.group(1)).strip() if hallado else None
        precio = numero(fila["precio"])
        if not precio or precio <= 0:
            continue
        fila["precio_num"] = precio
        fila["capital_num"] = numero(fila["capital"])
        fila["bruta_num"] = numero(fila["bruta"])
        if fila["municipio"]:
            filas.append(fila)

    return {"slug": slug, "provincia": provincia, "filas": filas} if filas else None


def resumir(datos):
    """Calcula los numeros que se ensenan, descartando los disparatados."""
    filas = datos["filas"]
    precios = sorted(f["precio_num"] for f in filas)

    # Una rentabilidad bruta por encima del 100% es un error de datos, no una
    # oportunidad. Se excluyen del resumen para no publicar cifras absurdas.
    brutas = [f["bruta_num"] for f in filas
              if f["bruta_num"] is not None and 0 < f["bruta_num"] <= 100]

    conteo = {}
    for f in filas:
        conteo.setdefault(f["municipio"], []).append(f["precio_num"])
    municipios = sorted(conteo.items(), key=lambda kv: (-len(kv[1]), kv[0]))

    fuentes = {}
    for f in filas:
        if f["fuente"]:
            fuentes[f["fuente"]] = fuentes.get(f["fuente"], 0) + 1

    # Los ejemplos: una muestra repartida por el rango de precios, no los mas
    # baratos. Elegir los mas baratos deja siempre pisos de 13.000 € cuyo
    # capital de entrada sale mayor que el precio (la reforma estimada se
    # come la diferencia), y en un escaparate eso solo desconcierta. Repartir
    # la muestra ensena el rango real y no elige a dedo.
    candidatos = sorted((f for f in filas if f["capital_num"]),
                        key=lambda f: f["precio_num"])
    if candidatos:
        paso = len(candidatos) / (EJEMPLOS + 1)
        indices = sorted({min(len(candidatos) - 1, int(paso * (k + 1)))
                          for k in range(EJEMPLOS)})
        candidatos = [candidatos[i] for i in indices]

    return {
        "total": len(filas),
        "precio_min": precios[0],
        "precio_max": precios[-1],
        "precio_medio": statistics.median(precios),
        "bruta_media": statistics.median(brutas) if brutas else None,
        "municipios": municipios[:MUNICIPIOS],
        "n_municipios": len(conteo),
        "fuentes": sorted(fuentes.items(), key=lambda kv: -kv[1]),
        "ejemplos": candidatos,
    }


ESTILO = """
  :root { --tinta:#16212b; --suave:#5b6b7a; --linea:#dfe7ee; --fondo:#f5f8fb;
          --dorado:#b08d3f; --acento:#1f6f8b; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta);
         font-family:'Segoe UI',system-ui,Arial,sans-serif; line-height:1.55; }
  .wrap { max-width:960px; margin:0 auto; padding:0 16px; }
  header.top { background:#fff; border-bottom:1px solid var(--linea); padding:14px 0; }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between;
                     gap:12px; flex-wrap:wrap; }
  .marca { font-weight:700; font-size:19px; text-decoration:none; color:var(--tinta); }
  .marca span { color:var(--dorado); }
  nav a { margin-left:14px; text-decoration:none; color:var(--acento); font-size:15px; }
  .pill { background:var(--acento); color:#fff !important; padding:8px 15px;
          border-radius:999px; }
  h1 { font-size:27px; line-height:1.25; margin:26px 0 10px; letter-spacing:-0.01em; }
  h2 { font-size:20px; margin:30px 0 10px; }
  .sub { color:var(--suave); font-size:17px; margin:0 0 22px; }
  .cifras { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
            margin:22px 0; }
  .cifra { background:#fff; border:1px solid var(--linea); border-radius:10px; padding:14px; }
  .cifra b { display:block; font-size:22px; }
  .cifra span { color:var(--suave); font-size:13px; }
  table { width:100%; border-collapse:collapse; background:#fff; font-size:15px;
          border:1px solid var(--linea); border-radius:10px; overflow:hidden; }
  th,td { padding:9px 11px; border-bottom:1px solid var(--linea); text-align:left; }
  th { background:#eef4f9; font-size:13px; text-transform:uppercase;
       letter-spacing:0.04em; color:var(--suave); }
  td.num, th.num { text-align:right; }
  tr:last-child td { border-bottom:none; }
  .tag { background:#eef4f9; border-radius:5px; padding:2px 7px; font-size:13px; }
  .cta { display:inline-block; background:var(--dorado); color:#fff; text-decoration:none;
         padding:13px 22px; border-radius:999px; font-weight:600; margin:8px 0 4px; }
  .aviso { background:#fff; border:1px solid var(--linea); border-left:4px solid var(--dorado);
           border-radius:8px; padding:13px 15px; color:var(--suave); font-size:14px;
           margin:22px 0; }
  .otras { display:flex; flex-wrap:wrap; gap:7px; margin:12px 0 0; padding:0; list-style:none; }
  .otras a { display:inline-block; background:#fff; border:1px solid var(--linea);
             border-radius:999px; padding:5px 12px; text-decoration:none;
             color:var(--acento); font-size:14px; }
  footer { border-top:1px solid var(--linea); margin-top:42px; padding:22px 0 34px;
           color:var(--suave); font-size:14px; }
  footer a { color:var(--acento); }
  @media (max-width:600px) { h1 { font-size:23px; } }
"""


def cabecera(titulo, descripcion, url, extra_jsonld=""):
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descripcion}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="icon" href="favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{MARCA}">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descripcion}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary">
<style>{ESTILO}</style>
{extra_jsonld}<script src="medicion.js"></script>
</head>
<body>

<header class="top">
  <div class="wrap">
    <a class="marca" href="/">Scanner<span>Inmobiliario</span></a>
    <nav>
      <a href="provincias.html">Provincias</a>
      <a href="acceso.html">Acceder</a>
      <a class="pill" href="/#alta">Crear acceso gratis</a>
    </nav>
  </div>
</header>
"""


PIE = f"""
<footer>
  <div class="wrap">
    <a href="/">{MARCA}</a> · <a href="provincias.html">Todas las provincias</a> ·
    <a href="aviso-legal.html">Aviso legal</a> · <a href="privacidad.html">Privacidad</a> ·
    <a href="cookies.html">Cookies</a>
    <p>Datos de fuentes públicas (Portal de Subastas del BOE, portales de los servicers
       bancarios y cartera de Sareb vía Hipoges). Las cifras son estimaciones automáticas:
       comprueba cada caso antes de ofertar o pujar.</p>
  </div>
</footer>
</body>
</html>
"""


def pagina_provincia(datos, resumen, fecha, vecinas):
    prov = html.escape(datos["provincia"])
    slug = datos["slug"]
    url = f"{SITIO}/provincia-{slug}.html"

    titulo = f"Pisos de banco y subastas en {prov} — {MARCA}"
    desc = (f"{resumen['total']} pisos de banco, cartera Sareb y subastas BOE en "
            f"{prov} desde {euros(resumen['precio_min'])}, con la rentabilidad y el "
            f"capital de entrada ya calculados. Actualizado el {fecha}.")

    jsonld = f"""<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{titulo}",
  "url": "{url}",
  "inLanguage": "es-ES",
  "description": "{desc}",
  "isPartOf": {{ "@type": "WebSite", "name": "{MARCA}", "url": "{SITIO}/" }},
  "about": {{ "@type": "Place", "name": "{prov}" }},
  "breadcrumb": {{
    "@type": "BreadcrumbList",
    "itemListElement": [
      {{ "@type": "ListItem", "position": 1, "name": "Inicio", "item": "{SITIO}/" }},
      {{ "@type": "ListItem", "position": 2, "name": "Provincias", "item": "{SITIO}/provincias.html" }},
      {{ "@type": "ListItem", "position": 3, "name": "{prov}", "item": "{url}" }}
    ]
  }}
}}
</script>
"""

    p = [cabecera(titulo, desc, url, jsonld)]
    p.append('<main class="wrap">')
    p.append(f"<h1>Pisos de banco y subastas en {prov}, con la rentabilidad ya calculada</h1>")
    p.append(f'<p class="sub">{resumen["total"]} inmuebles localizados en {prov} '
             f'({resumen["n_municipios"]} municipios) a partir de fuentes públicas: '
             f'portales de los servicers bancarios, cartera de Sareb y subastas del BOE. '
             f'Escaneo del {fecha}.</p>')

    p.append('<div class="cifras">')
    p.append(f'<div class="cifra"><b>{resumen["total"]}</b><span>inmuebles en {prov}</span></div>')
    p.append(f'<div class="cifra"><b>{euros(resumen["precio_min"])}</b><span>el más barato</span></div>')
    p.append(f'<div class="cifra"><b>{euros(resumen["precio_medio"])}</b><span>precio mediano</span></div>')
    if resumen["bruta_media"] is not None:
        p.append(f'<div class="cifra"><b>{resumen["bruta_media"]:.1f} %</b>'
                 f'<span>rentabilidad bruta mediana</span></div>')
    p.append("</div>")

    p.append(f'<a class="cta" href="/#alta">Ver los {resumen["total"]} inmuebles de {prov} — acceso gratis</a>')

    if resumen["municipios"]:
        p.append(f"<h2>Dónde hay más oferta en {prov}</h2>")
        p.append("<table><thead><tr><th>Municipio</th><th class='num'>Inmuebles</th>"
                 "<th class='num'>Desde</th></tr></thead><tbody>")
        for municipio, precios in resumen["municipios"]:
            p.append(f"<tr><td>{html.escape(municipio)}</td>"
                     f"<td class='num'>{len(precios)}</td>"
                     f"<td class='num'>{euros(min(precios))}</td></tr>")
        p.append("</tbody></table>")

    if resumen["ejemplos"]:
        p.append(f"<h2>Algunos ejemplos en {prov}</h2>")
        p.append("<table><thead><tr><th>Municipio</th><th>Vendedor</th>"
                 "<th class='num'>Precio</th><th class='num'>Capital de entrada</th>"
                 "</tr></thead><tbody>")
        for f in resumen["ejemplos"]:
            p.append(f"<tr><td>{html.escape(f['municipio'])}</td>"
                     f"<td><span class='tag'>{html.escape(f['fuente'] or '—')}</span></td>"
                     f"<td class='num'>{euros(f['precio_num'])}</td>"
                     f"<td class='num'>{euros(f['capital_num'])}</td></tr>")
        p.append("</tbody></table>")
        p.append('<div class="aviso">El <b>capital de entrada</b> es lo que sale de tu '
                 'bolsillo: entrada, impuestos, notaría y una reforma estimada. Dentro del '
                 'explorador tienes además la rentabilidad neta, el cash-on-cash, el '
                 'cashflow anual y el descuento sobre tasación de cada inmueble, con '
                 'filtros por municipio, precio y situación (libre, alquilado u ocupado).</div>')

    if resumen["fuentes"]:
        p.append(f"<h2>De dónde salen los inmuebles de {prov}</h2>")
        p.append("<table><thead><tr><th>Fuente</th><th class='num'>Inmuebles</th></tr>"
                 "</thead><tbody>")
        for fuente, n in resumen["fuentes"]:
            p.append(f"<tr><td>{html.escape(fuente)}</td><td class='num'>{n}</td></tr>")
        p.append("</tbody></table>")

    if vecinas:
        p.append("<h2>Otras provincias</h2><ul class='otras'>")
        for s, nombre in vecinas:
            p.append(f'<li><a href="provincia-{s}.html">{html.escape(nombre)}</a></li>')
        p.append("</ul>")
        p.append('<p><a href="provincias.html">Ver las 52 provincias →</a></p>')

    p.append(f'<h2>Cómo ver el detalle</h2><p>El explorador de {prov} es gratuito: '
             f'creas un acceso con tu email y tu clave, eliges provincia y filtras por '
             f'municipio, precio, capital disponible o rentabilidad mínima. Sin tarjeta.</p>')
    p.append(f'<a class="cta" href="/#alta">Crear mi acceso gratis</a>')
    p.append("</main>")
    p.append(PIE)
    return "\n".join(p)


def pagina_indice(resumenes, fecha):
    url = f"{SITIO}/provincias.html"
    total = sum(r["total"] for _, r in resumenes)
    titulo = f"Pisos de banco y subastas por provincia — {MARCA}"
    desc = (f"{total} pisos de banco, cartera Sareb y subastas BOE repartidos por las "
            f"provincias de España, con la rentabilidad y el capital de entrada ya "
            f"calculados. Actualizado el {fecha}.")

    jsonld = f"""<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "{titulo}",
  "url": "{url}",
  "inLanguage": "es-ES",
  "description": "{desc}",
  "isPartOf": {{ "@type": "WebSite", "name": "{MARCA}", "url": "{SITIO}/" }}
}}
</script>
"""

    p = [cabecera(titulo, desc, url, jsonld)]
    p.append('<main class="wrap">')
    p.append("<h1>Pisos de banco y subastas, provincia por provincia</h1>")
    p.append(f'<p class="sub">{total} inmuebles localizados en toda España a partir de '
             f'fuentes públicas, con el capital de entrada y la rentabilidad ya '
             f'calculados. Escaneo del {fecha}.</p>')
    p.append("<table><thead><tr><th>Provincia</th><th class='num'>Inmuebles</th>"
             "<th class='num'>Desde</th><th class='num'>Municipios</th></tr>"
             "</thead><tbody>")
    for datos, r in sorted(resumenes, key=lambda x: -x[1]["total"]):
        p.append(f'<tr><td><a href="provincia-{datos["slug"]}.html">'
                 f'{html.escape(datos["provincia"])}</a></td>'
                 f'<td class="num">{r["total"]}</td>'
                 f'<td class="num">{euros(r["precio_min"])}</td>'
                 f'<td class="num">{r["n_municipios"]}</td></tr>')
    p.append("</tbody></table>")
    p.append('<a class="cta" href="/#alta">Crear mi acceso gratis — explora toda España</a>')
    p.append("</main>")
    p.append(PIE)
    return "\n".join(p)


def escribir_sitemap(slugs, hoy):
    fijas = ["/", "/explorar.html", "/provincias.html",
             "/privacidad.html", "/aviso-legal.html", "/cookies.html"]
    lineas = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for ruta in fijas:
        lineas.append(f"  <url><loc>{SITIO}{ruta}</loc><lastmod>{hoy}</lastmod></url>")
    for slug in slugs:
        lineas.append(f"  <url><loc>{SITIO}/provincia-{slug}.html</loc>"
                      f"<lastmod>{hoy}</lastmod></url>")
    lineas.append("</urlset>")
    escribir_si_cambia(RAIZ / "sitemap.xml", "\n".join(lineas) + "\n")
    return len(fijas) + len(slugs)


def main():
    exploradores = sorted(RAIZ.glob("explorador-*.html"))
    if not exploradores:
        print("No hay exploradores que resumir.")
        return 0

    hoy = datetime.date.today()
    fecha = hoy.strftime("%d/%m/%Y")

    resumenes = []
    escritas = 0
    for ruta in exploradores:
        datos = leer_explorador(ruta)
        if not datos:
            print(f"  aviso: {ruta.name} no se pudo resumir, se salta")
            continue
        resumenes.append((datos, resumir(datos)))

    if not resumenes:
        print("Ningun explorador dio datos utiles.")
        return 1

    nombres = sorted((d["slug"], d["provincia"]) for d, _ in resumenes)
    for datos, resumen in resumenes:
        # Vecinas: las siguientes por orden alfabetico, dando la vuelta. Asi
        # todas las paginas quedan enlazadas entre si y el rastreador las
        # recorre sin depender solo del sitemap.
        i = [s for s, _ in nombres].index(datos["slug"])
        vecinas = [nombres[(i + k) % len(nombres)] for k in range(1, 9)]
        destino = RAIZ / f"provincia-{datos['slug']}.html"
        if escribir_si_cambia(destino, pagina_provincia(datos, resumen, fecha, vecinas)):
            escritas += 1

    if escribir_si_cambia(RAIZ / "provincias.html", pagina_indice(resumenes, fecha)):
        escritas += 1
    n_sitemap = escribir_sitemap([s for s, _ in nombres], hoy.isoformat())

    total = sum(r["total"] for _, r in resumenes)
    print(f"{len(resumenes)} provincias resumidas ({total} inmuebles); "
          f"{escritas} paginas escritas (el resto ya estaba al dia).")
    print(f"sitemap.xml con {n_sitemap} URLs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
