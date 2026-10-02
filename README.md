# Scanner Inmobiliario

**La web está en 👉 [www.scannerinmobiliario.com](https://www.scannerinmobiliario.com/)**

Si has llegado aquí buscando *Scanner Inmobiliario*, lo que buscas es la web, no
este repositorio. Aquí solo vive el código publicado del sitio.

---

## Qué es

Un radar diario de **pisos de banco (REO), cartera de Sareb y subastas del BOE**
en toda España, con la rentabilidad ya calculada: capital de entrada real,
rentabilidad bruta y neta, cash-on-cash, cashflow anual y descuento sobre
tasación.

- **Portada:** <https://www.scannerinmobiliario.com/>
- **Explorar por provincia:** <https://www.scannerinmobiliario.com/provincias.html>

El acceso al explorador completo es gratuito: email y clave, sin tarjeta.

## Fuentes

Todo procede de fuentes públicas, y cada ficha enlaza al anuncio oficial:

- **BOE** — Portal de Subastas judiciales y notariales.
- **Servicers bancarios** — Solvia (Sabadell), Aliseda (Santander),
  Altamira (doValue/Santander), BuildingCenter (CaixaBank).
- **Sareb**, a través de Hipoges, su comercializadora minorista.
- **Portales** — Fotocasa y pisos.com.
- **Agencias** — donpiso.

Idealista y Habitaclia no se rastrean: sus condiciones de uso y sus sistemas
anti-bot lo impiden.

## Qué hay en este repositorio

Es el **destino de publicación** del sitio (GitHub Pages), no el generador. El
proceso que rastrea las fuentes y construye los exploradores por provincia se
ejecuta fuera de aquí y sube el resultado.

| Ruta | Para qué sirve |
|---|---|
| `index.html`, `explorar.html` | Portada y página de entrada al explorador |
| `explorador-<provincia>.html` | Los 52 exploradores (piden acceso) |
| `provincia-<provincia>.html`, `provincias.html` | Adelanto público e indexable por provincia |
| `medicion.js` | Recuento de visitas y origen, sin cookies |
| `.github/provincias.py` | Genera las páginas públicas por provincia |
| `.github/guardian.py` | Repone la medición si un envío la borra |
| `.github/indexnow.py` | Avisa a los buscadores cuando algo cambia |
| `GUIA-VISIBILIDAD.md` | Cómo se mide la visibilidad y qué falta por hacer |

## Aviso

Las cifras de rentabilidad son **estimaciones automáticas** (renta estimada por
zona, reforma estándar, hipoteca según condiciones publicadas). Sirven para
detectar y comparar oportunidades rápido, pero cada caso hay que comprobarlo
antes de ofertar o pujar.

[Aviso legal](https://www.scannerinmobiliario.com/aviso-legal.html) ·
[Privacidad](https://www.scannerinmobiliario.com/privacidad.html) ·
[Cookies](https://www.scannerinmobiliario.com/cookies.html)
