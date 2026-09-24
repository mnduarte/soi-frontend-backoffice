import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /*
     * La consola también se instala.
     *
     * Es para una sola persona —la que administra las cuentas—, pero se usa
     * desde el teléfono: mirar quién escribió, si está al día, registrar un
     * pago. Abrir el navegador, buscar la dirección y esperar es más fricción
     * que el trabajo en sí.
     *
     * A diferencia de la app del consultorio, acá la versión nueva entra SOLA
     * en la próxima apertura, sin avisar: no hay nadie a quien interrumpir en
     * medio de un cobro, y un cartel para un único usuario es ruido. Ver
     * `PwaConsola`.
     */
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'SOI Consola',
        // En la pantalla de inicio va a estar al lado de la app del
        // consultorio: si las dos dijeran "SOI" habría que abrirlas para saber
        // cuál es cuál.
        short_name: 'Consola',
        description: 'Administración de cuentas de SOI.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FBF7EE',
        // Violeta, el color de la consola. La app del consultorio es azul
        // tinta: mismo diente, distinto color, se distinguen de un vistazo.
        theme_color: '#7C3AED',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // En desarrollo apagado: un service worker sirviendo copias viejas
        // mientras se edita hace perder horas buscando un cambio que ya está.
        enabled: false,
      },
    }),
  ],
})
