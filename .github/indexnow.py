#!/usr/bin/env python3
"""Avisa a los buscadores de que las páginas públicas han cambiado (IndexNow).

IndexNow es un aviso directo: en vez de esperar a que el buscador vuelva a
pasar por su cuenta, le decimos «esta dirección ha cambiado, vuelve a leerla».
Lo admiten Bing, Yandex, Seznam y Naver; Google no lo usa, para Google está el
sitemap y Search Console.

No hace falta cuenta ni contraseña: la clave es un archivo que vive en la raíz
del sitio y que el buscador comprueba para saber que el aviso es nuestro.

Uso:
    python3 .github/indexnow.py            envía el aviso
    python3 .github/indexnow.py --prueba   solo muestra lo que enviaría
"""

import json
import os
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

CLAVE = "72bb9ac1ae059ef2ad4de5d999088920"
HOST = "www.scannerinmobiliario.com"
API = "https://api.indexnow.org/indexnow"
SITEMAP = os.path.join(os.path.dirname(__file__), "..", "sitemap.xml")
ESPACIO = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def urls_publicas():
    """Las direcciones que ya declaramos en el sitemap: una sola lista que mantener."""
    raiz = ET.parse(SITEMAP).getroot()
    return [loc.text.strip() for loc in raiz.findall(".//s:loc", ESPACIO) if loc.text]


def main():
    urls = urls_publicas()
    if not urls:
        print("El sitemap no tiene direcciones; no hay nada que avisar.")
        return 0

    aviso = {
        "host": HOST,
        "key": CLAVE,
        "keyLocation": f"https://{HOST}/{CLAVE}.txt",
        "urlList": urls,
    }

    if "--prueba" in sys.argv:
        print(json.dumps(aviso, indent=2, ensure_ascii=False))
        return 0

    peticion = urllib.request.Request(
        API,
        data=json.dumps(aviso).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=30) as respuesta:
            print(f"Aviso enviado ({respuesta.status}) para {len(urls)} direcciones:")
            for u in urls:
                print("  ·", u)
        return 0
    except urllib.error.HTTPError as e:
        # 422 = alguna dirección no corresponde al host; 403 = clave no encontrada.
        print(f"IndexNow respondió {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
        return 1
    except urllib.error.URLError as e:
        print(f"No se pudo contactar con IndexNow: {e.reason}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
