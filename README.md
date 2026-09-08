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
/frontend  -> Aplicación web (React + Vite)
/01 … /10  -> Entregables del proyecto (ver "Documentos del proyecto")
```

## Documentos del proyecto

Los entregables del proyecto se organizan en carpetas numeradas en la raíz
del repositorio:

- `01 – Documento de Análisis` → [Documento de Análisis](<01 – Documento de Análisis/01 – Documento de Análisis.md>)
- `02 – Documento de Diseño` → [Documento de Diseño](<02 – Documento de Diseño/02 – Documento de Diseño.md>)
- `03 – Documento de Desarrollo – Documento técnico` → pendiente
- `04 – Plan y evidencias de Pruebas` → pendiente
- `05 – Documento de Implementación y Despliegue` → pendiente
- `06 – Manual de Usuario` → pendiente
- `07 – Manual Técnico – Administración` → pendiente (resumen en "Cómo correr el proyecto")
- `08 – Matriz de trazabilidad de requisitos, funcionalidades y pruebas` → pendiente
- `09 – Código fuente en repositorio Git` → `backend/` y `frontend/` en la raíz
- `10 – Base de datos, scripts o estructura necesaria para reproducir el sistema` → [README](<10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/README.md>)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite, Tailwind CSS, React Router |
| Backend | Node.js + Express |
| Base de datos | MongoDB Atlas (datos + vectores) |
| Autenticación | JWT + bcrypt |
| IA | OpenRouter vía API compatible con OpenAI (clasificación, resumen, extracción, embeddings) |
| Búsqueda | Búsqueda de texto + MongoDB Atlas Vector Search |
| Control de versiones | Git + GitHub |

## Cómo correr el proyecto

> Detalle completo en el Manual Técnico (07). Resumen rápido:

### Requisitos previos
- Node.js 18+ y npm
- Cuenta de MongoDB Atlas con un cluster
- API key de OpenRouter (o de un proveedor compatible con la API de OpenAI)

### Backend
1. `cd backend`
2. `npm install`
3. Copiar `.env.example` a `.env` y completar las variables.
4. `npm run dev`

### Frontend
1. `cd frontend` → `npm install`
2. Configurar `VITE_API_BASE` apuntando al backend (o usar el proxy dev de `vite.config.js`).
3. `npm run dev`

## Búsqueda semántica y chat RAG (Atlas Vector Search)

Día 5: búsqueda por similitud semántica sobre los fragmentos de los
documentos procesados (`documentchunks`) y chat que responde usando solo ese
contexto, citando las fuentes.

### Índice de Atlas Vector Search

La búsqueda requiere un índice de tipo `vectorSearch` en la colección
`documentchunks` (dimensiones 1536, igual que las del modelo de embeddings):

```bash
# Intenta crearlo automáticamente (soportado en tier free/atlas) y espera a READY
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/createVectorIndex.js"
# O verifica si ya existe y muestra la definición JSON para crearla en Atlas UI
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/checkVectorIndex.js"
```

Definición equivalente para crear a mano en **Atlas UI** (Atlas Search → Create
Search Index → JSON Editor), con nombre `vector_index`:

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
      { "type": "filter", "path": "owner" },
      { "type": "filter", "path": "repository" }
    ]
  }
}
```

Requiere MongoDB 7.0.2+ (default en Atlas). Si el índice no existe, las rutas
responden `400` indicando que debe crearse; nunca quedan colgadas.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/search/search` | Búsqueda semántica. Body: `{ query, repositoryId?, limit? }` → `{ results: [{ documentId, documentName, content, score, ... }] }` |
| POST | `/api/search/chat` | Chat RAG. Body: `{ question, repositoryId? }` → `{ answer, sources: [...] }` |

Frontend: página **Buscar IA** (`/search`) con pestañas de chat y de búsqueda.

## Estado actual

- [x] Estructura del repositorio
- [x] Backend: modelos (User, Repository, Document, ProcessingLog)
- [x] Backend: autenticación (register/login/profile) con JWT y bcrypt
- [x] Backend: CRUD de repositorios
- [x] Backend: carga, listado, descarga y eliminación de archivos (multer)
- [ ] Documento 01 - Análisis
- [ ] Documento 02 - Diseño
- [x] Backend: procesamiento con IA (extracción, clasificación, resumen, embeddings, RAG)
- [x] Frontend (React + Vite)
- [ ] Pruebas y documentos de prueba
- [ ] Despliegue y video