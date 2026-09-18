#!/usr/bin/env python3
"""Repone las piezas de medicion que el envio automatico borra.

El proyecto se publica subiendo la carpeta local entera. Si esa carpeta no
esta al dia, cada subida sobrescribe las paginas y se lleva por delante las
lineas anadidas aqui (ya paso el 18/09/2026 con explorar.html, acceso.html y
marcador.html). Este guardian se ejecuta despues de cada envio y vuelve a
poner lo que falte, asi la medicion no depende de que la carpeta local este
sincronizada.

Es idempotente: si no falta nada, no toca ningun archivo.
"""

import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

ETIQUETA = '<script src="medicion.js"></script>'
META_GOOGLE = ('<meta name="google-site-verification" '
               'content="HByKjwVK09Luhc960ArvACJdKh22tCehgMvPvcQrMuY">')

# Paginas publicas que deben contar visitas. Los 52 exploradores por
# provincia no estan aqui: cargan config.js, que ya trae el cargador.
PAGINAS = [
    "index.html", "explorar.html", "acceso.html", "gracias.html",
    "valorar.html", "precios.html", "ampliar.html", "marcador.html",
    "aviso-legal.html", "privacidad.html", "cookies.html",
]

CARGADOR_CONFIG = """
// --- Medicion de visitas -------------------------------------------------
// Los 52 exploradores por provincia cargan este archivo, asi que cargar
// medicion.js desde aqui los mide todos.
(function () {
  var s = document.createElement("script");
  s.src = "medicion.js";
  (document.head || document.documentElement).appendChild(s);
})();
"""


def salto_de(datos):
    """Devuelve el final de linea que usa el archivo, para no cambiarlo."""
    return b"\r\n" if b"\r\n" in datos else b"\n"


def insertar_antes_de_head(datos, linea):
    """Mete `linea` justo antes de </head> respetando el salto del archivo."""
    salto = salto_de(datos)
    for cierre in (b"</head>", b"</HEAD>"):
        pos = datos.find(cierre)
        if pos != -1:
            trozo = linea.encode("utf-8") + salto
            return datos[:pos] + trozo + datos[pos:]
    return None


def revisar_paginas(arreglados):
    for nombre in PAGINAS:
        ruta = RAIZ / nombre
        if not ruta.exists():
            continue
        datos = ruta.read_bytes()
        # config.js ya inyecta medicion.js: esas paginas no necesitan la etiqueta.
        if b'src="medicion.js"' in datos or b'src="config.js"' in datos:
            continue
        nuevo = insertar_antes_de_head(datos, ETIQUETA)
        if nuevo is None:
            print(f"  aviso: {nombre} no tiene </head>, no se toca")
            continue
        ruta.write_bytes(nuevo)
        arreglados.append(f"{nombre}: repuesta la etiqueta de medicion.js")


def revisar_verificacion_google(arreglados):
    ruta = RAIZ / "index.html"
    if not ruta.exists():
        return
    datos = ruta.read_bytes()
    if b"google-site-verification" in datos:
        return
    nuevo = insertar_antes_de_head(datos, META_GOOGLE)
    if nuevo is None:
        return
    ruta.write_bytes(nuevo)
    arreglados.append("index.html: repuesta la verificacion de Search Console")


def revisar_config(arreglados):
    ruta = RAIZ / "config.js"
    if not ruta.exists():
        return
    datos = ruta.read_bytes()
    if b"medicion.js" in datos:
        return
    salto = salto_de(datos)
    bloque = CARGADOR_CONFIG.replace("\n", salto.decode("latin-1"))
    ruta.write_bytes(datos.rstrip() + salto + bloque.encode("utf-8"))
    arreglados.append("config.js: repuesto el cargador de medicion.js")


def main():
    arreglados = []
    revisar_paginas(arreglados)
    revisar_verificacion_google(arreglados)
    revisar_config(arreglados)

    if not arreglados:
        print("Todo en su sitio: no falta ninguna pieza de medicion.")
        return 0

    print("Se han repuesto estas piezas:")
    for linea in arreglados:
        print("  - " + linea)
    return 0


if __name__ == "__main__":
    sys.exit(main())
