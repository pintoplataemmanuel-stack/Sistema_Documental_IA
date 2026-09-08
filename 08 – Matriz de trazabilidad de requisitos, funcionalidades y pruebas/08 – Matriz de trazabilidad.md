# Documento 08 — Matriz de Trazabilidad de Requisitos, Funcionalidades y Pruebas

**Proyecto:** Sistema Inteligente de Gestión y Análisis Documental
**Versión:** 1.0
**Fecha:** 8 de septiembre de 2026
**Estado:** Final

---

## 1. Descripción

Este documento conecta cada **requerimiento funcional** (RF) del Documento 01
con su **historia de usuario** (HU), su **caso de uso** (CU), la
**funcionalidad implementada** en el código y el **caso de prueba** (CP) que
lo valida. Permite verificar que todo lo solicitado fue implementado y probado.

---

## 2. Matriz de trazabilidad completa

| RF | Requerimiento | HU | CU | Funcionalidad (código) | CP | Estado |
|----|---------------|----|----|------------------------|-----|--------|
| RF01 | Registro de usuarios | HU01 | CU-01 | `authController.js` → `POST /api/auth/register` | CP-01 | Aprobado |
| RF02 | Inicio de sesión con JWT | HU02 | CU-02 | `authController.js` → `POST /api/auth/login` + `generateToken.js` | CP-02 | Aprobado |
| RF03 | Protección de rutas con JWT | HU02 | CU-02 | `authMiddleware.js` → middleware `protect` | CP-02 | Aprobado |
| RF04 | CRUD de repositorios | HU03 | CU-03 | `repositoryController.js` → `POST/GET/PUT/DELETE /api/repos` | CP-04 | Aprobado |
| RF05 | Carga de documentos (PDF/DOCX/TXT) | HU04 | CU-04 | `fileController.js` → `POST /api/files/upload` + `uploadMiddleware.js` | CP-05 | Aprobado |
| RF06 | Validación de tipo y tamaño | HU04 | CU-04 | `uploadMiddleware.js` → extensión, MIME, `MAX_FILE_SIZE_MB` | CP-06 | Aprobado |
| RF07 | Listado, detalle, descarga y eliminación | HU04, HU10 | CU-04, CU-10 | `fileController.js` → `GET /api/files`, `GET/:id`, `GET/:id/download`, `DELETE/:id` | CP-07, CP-10 | Aprobado |
| RF08 | Extracción automática de texto | HU05 | CU-04 | `textExtractionService.js` → PDF (pdfjs-dist), DOCX (mammoth), TXT | CP-07 | Aprobado |
| RF09 | Clasificación con IA | HU05 | CU-07 | `aiService.js` → `classifyDocument()` con DeepSeek | CP-07 | Aprobado |
| RF10 | Resumen con IA | HU05 | CU-07 | `aiService.js` → `summarizeDocument()` con DeepSeek | CP-07 | Aprobado |
| RF11 | Extracción de campos clave | HU05 | CU-07 | `aiService.js` → `extractKeyInfo()` con DeepSeek | CP-07 | Aprobado |
| RF12 | Persistencia del resultado + log | HU06 | CU-04 | `processingService.js` → guardado en Document + ProcessingLog | CP-07 | Aprobado |
| RF13 | Búsqueda por palabra clave | HU07 | CU-05 | Índice de texto MongoDB sobre `filename/summary/textContent` | CP-08 | Aprobado |
| RF14 | Búsqueda semántica (embeddings) | HU07 | CU-05 | `ragService.js` → `$vectorSearch` + `generateEmbeddings()` con text-embedding-3-small | CP-08 | Aprobado |
| RF15 | Preguntas en lenguaje natural (RAG) | HU08 | CU-06 | `ragService.js` → `answerQuestion()` con DeepSeek | CP-09 | Aprobado |
| RF16 | Indicar fuentes en respuesta RAG | HU08 | CU-06 | `searchController.js` → `POST /api/search/chat` devuelve `sources[]` | CP-09 | Aprobado |
| RF17 | Dashboard con métricas | HU09 | CU-08 | `DashboardPage.jsx` + `GET /api/files` (totales, por categoría, recientes) | — | Aprobado |
| RF18 | Actividad reciente de procesamiento | HU09 | CU-08 | `DashboardPage.jsx` → sección "Documentos recientes" | — | Aprobado |
| RF19 | Actualizar perfil | — | — | `authController.js` → `GET /api/auth/profile` | — | Pendiente (parcial) |
| RF20 | Mensajes de error claros | HU04, HU10 | CU-04, CU-10 | `errorMiddleware.js` + manejo en frontend (Alert.jsx) | CP-03, CP-06 | Aprobado |
| RF21 | Registro de errores sin caer el servidor | HU06 | CU-04 | `processingService.js` → try/catch + `status: error` + ProcessingLog | CP-07 | Aprobado |
| RF22 | Admin desactiva usuarios | — | CU-09 | Modelo `User.isActive` (lógica de negocio) | — | Pendiente (parcial) |
| RF23 | Admin elimina cualquier documento | HU10 | CU-10 | `authorize.js` + `fileController.js` → verifica owner o admin | CP-10 | Aprobado |
| RF24 | Gráfico de documentos por categoría | HU09 | CU-08 | `DashboardPage.jsx` → stats por categoría | — | Aprobado |

---

## 3. Requerimientos no funcionales

| RNF | Requerimiento | Implementación | Estado |
|-----|---------------|----------------|--------|
| RNF01 | Contraseñas con hash bcrypt (10 rondas) | `User.js` → `pre('save')` con bcryptjs | Cumplido |
| RNF02 | JWT con expiración configurable | `generateToken.js` + `JWT_EXPIRES_IN` (default 7d) | Cumplido |
| RNF03 | Secretos en variables de entorno | `.env.example` documentado, `.gitignore` excluye `.env` | Cumplido |
| RNF04 | Validación de tipo y tamaño de archivo | `uploadMiddleware.js` → extensión + MIME + `MAX_FILE_SIZE_MB` | Cumplido |
| RNF05 | Acceso por roles | `authorize.js` + `authMiddleware.js` | Cumplido |
| RNF06 | Procesamiento asíncrono | `POST /api/files/:id/process` → 202 Accepted, proceso en background | Cumplido |
| RNF07 | Procesamiento < 60 s para docs típicos | Verificado con docs de prueba (10-30 s) | Cumplido |
| RNF08 | MongoDB Atlas (alta disponibilidad) | Atlas M0 con respaldo automático | Cumplido |
| RNF09 | Interfaz en español, ≤3 clics | `index.css`, `Layout.jsx`, `Sidebar.jsx`, React Router | Cumplido |
| RNF10 | Errores comprensibles | `Alert.jsx`, `errorMiddleware.js`, mensajes en español | Cumplido |
| RNF11 | Navegadores modernos + responsiva | React + CSS con media queries | Cumplido |
| RNF12 | Backend por capas | routes → controllers → services → models | Cumplido |
| RNF13 | Despliegue reproducible | Documentos 05 y 07, `.env.example` | Cumplido |
| RNF14 | Log de actividad | `ProcessingLog.js` con stage, status, message, timestamps | Cumplido |

---

## 4. Reglas de negocio

| RN | Regla | Implementación | Estado |
|----|-------|----------------|--------|
| RN01 | Documento pertenece a una categoría y un repositorio | `Document.js` → `category` enum + `repository` ref | Cumplido |
| RN02 | Solo owner o admin eliminan documentos | `fileController.js` + `authorize('admin', 'owner')` | Cumplido |
| RN03 | Solo owner edita/elimina repositorios | `repositoryController.js` → verifica `owner` | Cumplido |
| RN04 | Acceso a repos: owner o miembro | `repositoryController.js` → filtro por owner + members | Cumplido |
| RN05 | Solo PDF, DOCX, TXT | `uploadMiddleware.js` → extensión + MIME whitelist | Cumplido |
| RN06 | Error no tumba el servidor | `processingService.js` → catch + `status: error` | Cumplido |
| RN07 | Lector no carga/edita/elimina | `authorize.js` → roles restrictivos por ruta | Cumplido |
| RN08 | Email único | `User.js` → `unique: true` en email | Cumplido |
| RN09 | Procesamiento una vez; reproceso crea log nuevo | `processingService.js` → crea nuevo ProcessingLog en cada ejecución | Cumplido |
| RN10 | Fallo de IA se registra sin caer servidor | `processingService.js` → catch + ProcessingLog | Cumplido |

---

## 5. Cobertura de pruebas

| Métrica | Valor |
|---------|-------|
| Requerimientos funcionales totales | 24 |
| Implementados y aprobados | 21 |
| Parcialmente implementados | 2 (RF19, RF22 — funcionalidad base existe) |
| Casos de prueba totales | 10 |
| Casos aprobados | 10 (100%) |
| Requerimientos no funcionales | 14 |
| Cumplidos | 14 (100%) |
| Reglas de negocio | 10 |
| Cumplidas | 10 (100%) |

---

## 6. Trazabilidad por caso de uso

| CU | Caso de uso | RF asociados | CP | Estado |
|----|-------------|--------------|-----|--------|
| CU-01 | Registrarse | RF01 | CP-01 | Aprobado |
| CU-02 | Iniciar sesión | RF02, RF03 | CP-02, CP-03 | Aprobado |
| CU-03 | Crear/editar repositorio | RF04 | CP-04 | Aprobado |
| CU-04 | Cargar documento | RF05, RF06, RF07, RF08, RF12 | CP-05, CP-06, CP-07 | Aprobado |
| CU-05 | Buscar documentos | RF13, RF14 | CP-08 | Aprobado |
| CU-06 | Preguntar en lenguaje natural | RF15, RF16 | CP-09 | Aprobado |
| CU-07 | Ver análisis del documento | RF09, RF10, RF11 | CP-07 | Aprobado |
| CU-08 | Ver dashboard | RF17, RF18, RF24 | — | Aprobado |
| CU-09 | Gestionar usuarios | RF22 | — | Pendiente |
| CU-10 | Eliminar documento | RF07, RF23 | CP-10 | Aprobado |

---

*Fin del documento 08.*
