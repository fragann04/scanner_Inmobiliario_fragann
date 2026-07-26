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
  adminEmails: ["norelysfraga@gmail.com"],
  provinciasActivas: [
    { slug: "ceuta", nombre: "Ceuta" },
    { slug: "melilla", nombre: "Melilla" }
  ]
};
