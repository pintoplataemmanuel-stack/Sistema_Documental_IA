# Tercer corte — Automatización propia y visión por computador

Esta carpeta concentra los entregables y evidencias del tercer corte de
**Desarrollo de Aplicaciones Empresariales**.

## Estructura

| Carpeta | Contenido |
|---|---|
| `Semana 1 - Diseño` | [Inventario de flujos n8n, ruta de reemplazo, caso de visión y arquitectura](<Semana 1 - Diseño/Documento de arquitectura - Semana 1.md>). |
| `Semana 2 - Motor de automatización` | [Implementación y evidencias](<Semana 2 - Motor de automatización/Implementación y evidencias - Semana 2.md>) y [guía de configuración de Gemini/Groq](<Semana 2 - Motor de automatización/Guía de configuración - Gemini y Groq.md>). |
| `Semana 3 - Visión` | [Implementación y evidencias](<Semana 3 - Visión/Implementación y evidencias - Semana 3.md>): lectura de facturas con IA y resultados medidos. |
| `Semana 4 - Integración` | Visión → automatización, pruebas con 20 imágenes, seguridad y despliegue (pendiente). |
| `Semana 5 - Sustentación` | Documento técnico final, video y enlaces de demostración (pendiente). |

## Estado actual

- **Semana 1:** completada (documento de arquitectura con diagrama).
- **Semana 2:** implementada en código y probada con 18 pruebas unitarias.
  Incluye las páginas de Notificaciones y Automatizaciones. Verificada en vivo
  con Gemini (chat, embeddings y reindexación a 1536 dimensiones, la dimensión
  del índice de Atlas). Pendiente replicar las variables nuevas en Render.
- **Semana 3:** implementada y probada. Lectura de facturas y recibos (imagen o
  PDF) con confianza, guardado automático desde `0.85`, revisión manual, error
  claro para imágenes ilegibles y página **Facturas IA**. Evidencia real con
  OpenRouter `google/gemini-2.5-flash` y con Gemini `gemini-3.5-flash-lite`:
  factura completa con 98 % de confianza, recibo incompleto enviado a revisión
  e imagen ilegible rechazada con HTTP 422. Las 26 pruebas del backend pasan.

## Decisiones del grupo

- **Ruta de reemplazo:** Ruta A — código propio dentro del backend Node.js/Express.
- **Caso de visión:** lectura de facturas y recibos.
- **Proveedor de IA gratuita:** Gemini (nivel gratuito) como principal y Groq como respaldo para chat.
- **Base del inventario:** la integración n8n que existía en `backend/src/services/webhookService.js` (hoy retirada), con dos ramas: documento completado y documento con error.
