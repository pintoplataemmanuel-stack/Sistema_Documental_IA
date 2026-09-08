# Documento 07 — Manual Técnico / Administración

**Proyecto:** Sistema Inteligente de Gestión y Análisis Documental
**Versión:** 1.0
**Fecha:** 8 de septiembre de 2026
**Estado:** Final

---

## 1. Requisitos previos

### 1.1 Para desarrollo local

| Requisito | Versión mínima | Verificar con |
|-----------|----------------|---------------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | 2.x | `git --version` |
| Cuenta de MongoDB Atlas | — | https://account.mongodb.com |
| API key de OpenRouter | — | https://openrouter.ai |

### 1.2 Para despliegue en producción

| Servicio | Cuenta requerida | URL |
|----------|------------------|-----|
| GitHub | Repositorio del proyecto | https://github.com |
| Vercel | Despliegue del frontend | https://vercel.com |
| Render | Despliegue del backend | https://render.com |
| MongoDB Atlas | Base de datos | https://cloud.mongodb.com |
| OpenRouter | API de IA | https://openrouter.ai |

---

## 2. Instalación del backend

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/pintoplataemmanuel-stack/Sistema_Documental_IA.git
cd Sistema_Documental_IA
```

### 2.2 Instalar dependencias

```bash
cd backend
npm install
```

### 2.3 Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales:

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/sistema_documental?retryWrites=true&w=majority

# JWT
JWT_SECRET=<secreto_aleatorio_largo>
JWT_EXPIRES_IN=7d

# OpenRouter (IA)
OPENAI_API_KEY=sk-or-v1-<tu_clave>
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=deepseek/deepseek-chat
OPENAI_EMBEDDING_MODEL=openai/text-embedding-3-small

# Opcional
AI_CHUNK_SIZE=1500
AI_CHUNK_OVERLAP=150
AI_MAX_CHUNKS=20
MAX_FILE_SIZE_MB=10
```

> **Importante:** el archivo `.env` nunca se sube al repositorio (está en `.gitignore`).

### 2.4 Ejecutar el backend

**Desarrollo** (auto-reinicia al cambiar archivos):

```bash
npm run dev
```

**Producción:**

```bash
npm start
```

El servidor arranca en `http://localhost:5000`.

### 2.5 Verificar

```bash
curl http://localhost:5000/api/health
# Respuesta: {"status":"ok","timestamp":"2026-09-08T..."}
```

---

## 3. Instalación del frontend

### 3.1 Instalar dependencias

```bash
cd frontend
npm install
```

### 3.2 Configurar variable de entorno (opcional en local)

El frontend usa el proxy de Vite para redirigir `/api` al backend, así que
no es necesario configurar nada si el backend corre en `:5000`. Si quieres
apuntar a otro servidor:

```bash
echo "VITE_API_BASE=http://localhost:5000/api" > .env
```

### 3.3 Ejecutar el frontend

```bash
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173`.

### 3.4 Build de producción

```bash
npm run build
```

Genera la carpeta `dist/` con los archivos estáticos para desplegar.

---

## 4. Estructura de archivos del proyecto

```
Sistema_Documental_IA/
├── backend/
│   ├── src/
│   │   ├── app.js                    Express app
│   │   ├── server.js                 Punto de entrada
│   │   ├── config/env.js             Variables de entorno
│   │   ├── config/db.js              Conexión MongoDB
│   │   ├── models/                   Schemas Mongoose (5 modelos)
│   │   ├── controllers/              Lógica de negocio (5 controladores)
│   │   ├── routes/                   Endpoints REST (4 routers)
│   │   ├── middleware/                Auth, roles, upload, errores
│   │   ├── services/                 IA, procesamiento, RAG, texto, chunks
│   │   └── utils/generateToken.js    JWT
│   ├── uploads/                      Archivos subidos (filesystem)
│   ├── .env.example                  Plantilla de variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   Rutas (React Router)
│   │   ├── main.jsx                  Punto de entrada
│   │   ├── index.css                 Estilos globales
│   │   ├── api/client.js             Cliente HTTP con JWT
│   │   ├── context/AuthContext.jsx   Estado de auth
│   │   ├── components/               UI reutilizable (10 componentes)
│   │   ├── pages/                    8 páginas
│   │   └── routes/ProtectedRoute.jsx
│   ├── vercel.json                   Configuración SPA
│   ├── vite.config.js                Proxy + define
│   ├── .env.production               URL del backend
│   └── package.json
├── 01 – … a 08 – …                   Documentos del proyecto
├── 09 – Código fuente en repositorio Git/
├── 10 – Base de datos, scripts.../    Scripts y docs de BD
└── README.md
```

---

## 5. Modelos de datos

### Colección `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | String | Nombre (2-120 chars) |
| email | String | Correo único, lowercase |
| password | String | Hash bcrypt (select:false) |
| role | String | `admin` · `editor` · `lector` |
| company | String | Empresa (opcional, máx 150) |
| isActive | Boolean | Estado de la cuenta |

### Colección `repositories`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | String | Nombre (1-150 chars) |
| description | String | Descripción (máx 500) |
| owner | ObjectId→User | Propietario |
| members | [ObjectId→User] | Miembros |

### Colección `documents`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| filename | String | Nombre físico en uploads |
| originalName | String | Nombre original |
| fileType | String | `pdf` · `docx` · `txt` |
| size | Number | Tamaño en bytes |
| path | String | Ruta física |
| repository | ObjectId→Repository | Repositorio |
| owner | ObjectId→User | Subidor |
| status | String | `pending` · `processing` · `completed` · `error` |
| category | String | `Contrato` · `Factura` · `Reporte` · `Otro` |
| summary | String | Resumen IA |
| extractedInfo | Mixed | Campos clave IA |
| textContent | String | Texto plano extraído |
| chunks | [String] | Fragmentos |
| embedding | [Number] | Vector del documento |
| processingError | String | Mensaje si falló |
| processedAt | Date | Fecha de procesamiento |

### Colección `documentchunks`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| document | ObjectId→Document | Documento origen |
| repository | ObjectId→Repository | Repositorio |
| owner | ObjectId→User | Propietario |
| index | Number | Índice del fragmento |
| content | String | Texto del fragmento |
| embedding | [Number] | Vector de 1536 dimensiones |
| category | String | Categoría heredada |

### Colección `processinglogs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| document | ObjectId→Document | Documento |
| user | ObjectId→User | Usuario |
| status | String | Estado del log |
| stage | String | `extraccion` · `clasificacion` · `resumen` · `extraccion_info` · `embeddings` |
| message | String | Mensaje |
| startedAt | Date | Inicio |
| finishedAt | Date | Fin |

---

## 6. Endpoints de la API

Todas las rutas están bajo `/api`. Las rutas marcadas con 🔒 requieren
token JWT en el header `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | 🔒 Perfil |

### Repositorios 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/repos` | Crear |
| GET | `/api/repos` | Listar |
| GET | `/api/repos/:id` | Detalle |
| PUT | `/api/repos/:id` | Editar (owner) |
| DELETE | `/api/repos/:id` | Eliminar (owner) |

### Archivos 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/files/upload` | Subir (multipart: `file`, `repositoryId`) |
| GET | `/api/files` | Listar/filtrar (`?repositoryId=&status=`) |
| GET | `/api/files/:id` | Detalle |
| GET | `/api/files/:id/download` | Descargar archivo |
| POST | `/api/files/:id/process` | Disparar procesamiento IA |
| DELETE | `/api/files/:id` | Eliminar (owner o admin) |

### Búsqueda y RAG 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/search/search` | Búsqueda semántica (`{query, repositoryId, limit}`) |
| POST | `/api/search/chat` | Chat RAG (`{question, repositoryId}`) |

### Health check

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |

---

## 7. Scripts de utilidad

Ubicados en `10 – Base de datos, scripts o estructura necesaria para
reproducir el sistema/`. Ejecutar desde la raíz del repositorio.

| Script | Uso | Descripción |
|--------|-----|-------------|
| `createVectorIndex.js` | `node "10 – …/createVectorIndex.js"` | Crea el índice Atlas Vector Search |
| `checkVectorIndex.js` | `node "10 – …/checkVectorIndex.js"` | Verifica el índice |
| `testPipelineMock.js` | `node "10 – …/testPipelineMock.js" <DOC_ID>` | Pipeline completo con mocks |
| `testOpenRouter.js` | `node "10 – …/testOpenRouter.js"` | Valida IA contra OpenRouter |
| `testErrorPath.js` | `node "10 – …/testErrorPath.js"` | Prueba manejo de errores |
| `testRecovery.js` | `node "10 – …/testRecovery.js"` | Prueba recuperación de docs colgados |
| `testDay3.js` | `node "10 – …/testDay3.js"` | Prueba extracción + chunking |
| `smokeTest.js` | `node "10 – …/smokeTest.js" <TOKEN> <REPO_ID> <TXT>` | Test E2E HTTP |
| `reprocess.js` | `node "10 – …/reprocess.js" <TOKEN> <DOC_ID>` | Reprocesar y seguir estado |
| `generateTestPdf.js` | `node "10 – …/generateTestPdf.js"` | Genera PDF de prueba |

---

## 8. Despliegue en Render (backend)

1. Conectar el repositorio GitHub a Render.
2. Crear **Web Service**:
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
   - Puerto: 5000
3. Configurar variables de entorno (ver sección 2.3).
4. Render despliega automáticamente al hacer push a `main`.

---

## 9. Despliegue en Vercel (frontend)

1. Conectar el repositorio GitHub a Vercel.
2. Configurar:
   - Framework: Vite
   - Root directory: `frontend/`
   - Build: `npm run build`
   - Output: `dist`
3. Variable: `VITE_API_BASE=https://sistema-documental-ia.onrender.com/api`
4. Vercel despliega automáticamente al hacer push a `main`.

---

## 10. Mantenimiento

### 10.1 Índice vectorial

Si el índice `vector_index` se pierde (recreación de colección):

```bash
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/createVectorIndex.js"
```

Verificar:

```bash
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/checkVectorIndex.js"
```

### 10.2 Recuperación de documentos colgados

Si hay documentos en estado `processing` que no avanzan, el servidor los
recupera automáticamente al reiniciar. También se puede ejecutar manualmente:

```bash
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/testRecovery.js"
```

### 10.3 Variables de entorno — referencia rápida

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 5000 | Puerto del backend |
| `MONGODB_URI` | `mongodb://localhost:27017/sistema_documental` | URI de MongoDB |
| `JWT_SECRET` | `dev_secret_no_usar_en_produccion` | Secreto JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración del token |
| `OPENAI_API_KEY` | — | Clave de OpenRouter (requerida) |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | URL base de IA |
| `OPENAI_MODEL` | `deepseek/deepseek-chat` | Modelo de chat |
| `OPENAI_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Modelo de embeddings |
| `AI_CHUNK_SIZE` | 1500 | Tamaño de fragmentos |
| `AI_CHUNK_OVERLAP` | 150 | Solape entre fragmentos |
| `AI_MAX_CHUNKS` | 20 | Máximo de fragmentos por consulta |
| `AI_CHAT_TEXT_LIMIT` | 6000 | Límite de texto para chat |
| `AI_PROCESS_STALE_MS` | 300000 | Tiempo para recuperar docs colgados (ms) |
| `AI_VECTOR_SEARCH_INDEX` | `vector_index` | Nombre del índice vectorial |
| `MAX_FILE_SIZE_MB` | 10 | Tamaño máximo de archivo |
| `FRONTEND_URL` | — | Origen CORS permitido |

---

*Fin del manual técnico.*
