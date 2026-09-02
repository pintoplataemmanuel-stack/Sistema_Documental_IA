# Sistema Inteligente de Gestión y Análisis Documental

## Descripción

Sistema web que permite gestionar archivos de una empresa (repositorios y documentos),
y analizarlos con inteligencia artificial: **clasificación automática**, **resúmenes**,
**extracción de datos clave**, **búsqueda semántica** y **preguntas en lenguaje natural**
sobre los documentos (RAG).

## Contexto del proyecto

Proyecto académico tipo Full Stack cuyo alcance funcional mínimo cubre:

- Autenticación (registro e inicio de sesión con JWT).
- Carga y gestión de documentos (PDF, DOCX, TXT) en repositorios.
- Procesamiento con IA: clasificación, resumen y extracción de información.
- Búsqueda por palabras clave y por similitud semántica.
- Consultas en lenguaje natural sobre los documentos.
- Panel de control (dashboard) con indicadores.

## Estructura del repositorio

```
/backend   -> API REST (Node.js + Express + MongoDB Atlas)
/frontend  -> Aplicación web (React + Vite) [pendiente de crear en el frontend]
/docs      -> Documentos del proyecto (Análisis, Diseño, Desarrollo, Pruebas, etc.)
```

## Documentos del proyecto

- [01 - Análisis](docs/01-analisis.md)
- [02 - Diseño](docs/02-diseno.md)
- 03 - Desarrollo (planificado)
- 04 - Plan de Pruebas (planificado)
- 05 - Implementación y Despliegue (planificado)
- 06 - Manual de Usuario (planificado)
- 07 - Manual Técnico/Administración (planificado)
- 08 - Matriz de Trazabilidad (planificado)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite, Tailwind CSS, React Router |
| Backend | Node.js + Express |
| Base de datos | MongoDB Atlas (datos + vectores) |
| Autenticación | JWT + bcrypt |
| IA | OpenAI API (clasificación, resumen, extracción, embeddings) |
| Búsqueda | Búsqueda de texto + MongoDB Atlas Vector Search |
| Control de versiones | Git + GitHub |

## Cómo correr el proyecto

> Detalle completo en el Manual Técnico (07). Resumen rápido:

### Requisitos previos
- Node.js 18+ y npm
- Cuenta de MongoDB Atlas con un cluster
- API key de OpenAI

### Backend
1. `cd backend`
2. `npm install`
3. Copiar `.env.example` a `.env` y completar las variables.
4. `npm run dev`

### Frontend
1. `cd frontend` → `npm install`
2. Configurar `VITE_API_URL` apuntando al backend.
3. `npm run dev`

## Estado actual

- [x] Estructura del repositorio
- [x] Backend: modelos (User, Repository, Document, ProcessingLog)
- [x] Backend: autenticación (register/login/profile) con JWT y bcrypt
- [x] Backend: CRUD de repositorios
- [x] Backend: carga, listado, descarga y eliminación de archivos (multer)
- [ ] Documento 01 - Análisis
- [ ] Documento 02 - Diseño
- [ ] Backend: procesamiento con IA (extracción, clasificación, resumen, embeddings, RAG)
- [ ] Frontend (React + Vite)
- [ ] Pruebas y documentos de prueba
- [ ] Despliegue y video