# Tercer corte — Automatización propia y visión por computador

Esta carpeta concentra los entregables y evidencias del tercer corte de
**Desarrollo de Aplicaciones Empresariales**.

## Estructura

| Carpeta | Contenido |
|---|---|
| `Semana 1 - Diseño` | [Inventario de flujos n8n, ruta de reemplazo, caso de visión y arquitectura](<Semana 1 - Diseño/Documento de arquitectura - Semana 1.md>). |
| `Semana 2 - Motor de automatización` | [Implementación y evidencias](<Semana 2 - Motor de automatización/Implementación y evidencias - Semana 2.md>) y [guía de configuración de Gemini/Groq](<Semana 2 - Motor de automatización/Guía de configuración - Gemini y Groq.md>). |
| `Semana 3 - Visión` | Captura, procesamiento de imágenes y resultados medidos (pendiente). |
| `Semana 4 - Integración` | Visión → automatización, pruebas con 20 imágenes, seguridad y despliegue (pendiente). |
| `Semana 5 - Sustentación` | Documento técnico final, video y enlaces de demostración (pendiente). |

## Estado actual

- **Semana 1:** completada (documento de arquitectura con diagrama).
- **Semana 2:** implementada en código y probada con 18 pruebas unitarias.
  Incluye las páginas de Notificaciones y Automatizaciones. Pendiente la prueba
  en vivo con clave Gemini, la reindexación a 768 dimensiones y la actualización
  de variables en Render.

## Decisiones del grupo

- **Ruta de reemplazo:** Ruta A — código propio dentro del backend Node.js/Express.
- **Caso de visión:** lectura de facturas y recibos.
- **Proveedor de IA gratuita:** Gemini (nivel gratuito) como principal y Groq como respaldo para chat.
- **Base del inventario:** la integración n8n que existía en `backend/src/services/webhookService.js` (hoy retirada), con dos ramas: documento completado y documento con error.
