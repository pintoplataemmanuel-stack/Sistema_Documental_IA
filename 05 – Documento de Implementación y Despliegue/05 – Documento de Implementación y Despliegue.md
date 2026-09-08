# Documento 05 — Documento de Implementación y Despliegue

**Proyecto:** Sistema Inteligente de Gestión y Análisis Documental
**Versión:** 1.0
**Fecha:** 8 de septiembre de 2026
**Estado:** Final

---

## 1. Infraestructura

El sistema se despliega en tres servicios en la nube, todos en tier gratuito
o de bajo costo:

| Componente | Proveedor | Tier | Función |
|------------|-----------|------|---------|
| Frontend (SPA) | **Vercel** | Free | Hosting del build de React + Vite |
| Backend (API) | **Render** | Free | Servidor Node.js + Express |
| Base de datos | **MongoDB Atlas** | M0 (Shared) | Datos + Vector Search |

### Modelo de IA (externo)

| Servicio | Proveedor | Costo |
|----------|-----------|-------|
| DeepSeek Chat (chat/completions) | OpenRouter | Bajo costo por token |
| text-embedding-3-small (embeddings) | OpenRouter | Muy bajo costo |

---

## 2. Despliegue del backend (Render)

### 2.1 Configuración en Render

1. Conectar el repositorio de GitHub a Render.
2. Crear un servicio **Web Service** con las siguientes configuraciones:
   - **Runtime:** Node
   - **Build command:** `cd backend && npm install`
   - **Start command:** `cd backend && npm start`
   - **Port:** 5000 (o variable `PORT`)
   - **Root directory:** (vacío, el monorepo tiene `backend/` como subcarpeta)
3. Configurar las variables de entorno (ver sección 3).

### 2.2 Variables de entorno del backend

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Modo de producción |
| `PORT` | `5000` | Puerto del servidor |
| `MONGODB_URI` | `mongodb+srv://...@clusterdocia.xhhvakr.mongodb.net/sistema_documental?retryWrites=true&w=majority` | Conexión a Atlas |
| `JWT_SECRET` | *(secreto generado)* | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración de tokens |
| `OPENAI_API_KEY` | `sk-or-v1-...` | Clave de OpenRouter |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | URL base de OpenRouter |
| `OPENAI_MODEL` | `deepseek/deepseek-chat` | Modelo de chat |
| `OPENAI_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Modelo de embeddings |
| `AI_CHUNK_SIZE` | `1500` | Tamaño de fragmentos |
| `AI_CHUNK_OVERLAP` | `150` | Solape entre fragmentos |
| `AI_MAX_CHUNKS` | `20` | Máximo de fragmentos por consulta |
| `AI_CHAT_TEXT_LIMIT` | `6000` | Límite de texto para chat |
| `AI_VECTOR_SEARCH_INDEX` | `vector_index` | Nombre del índice vectorial |
| `MAX_FILE_SIZE_MB` | `10` | Tamaño máximo de archivo |
| `FRONTEND_URL` | `https://sistema-documental-ia.vercel.app` | Origen permitido para CORS |

### 2.3 Recuperación automática

El backend ejecuta `runStartupRecovery()` al iniciar: busca documentos en
estado `processing` con más de 5 minutos sin actualización y los marca como
`error`. Esto evita que documentos queden "colgados" después de un reinicio
del servidor.

---

## 3. Despliegue del frontend (Vercel)

### 3.1 Configuración en Vercel

1. Conectar el repositorio de GitHub a Vercel.
2. Configuración del proyecto:
   - **Framework:** Vite
   - **Root directory:** `frontend/`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Variable de entorno:
   - `VITE_API_BASE` = `https://sistema-documental-ia.onrender.com/api`
4. El `vite.config.js` también define `VITE_API_BASE` por defecto, por lo que
   el build funciona incluso sin la variable en Vercel.

### 3.2 vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

- **Reescrituras SPA:** todas las rutas se redirigen a `index.html` para que
  React Router maneje la navegación.
- **Cache inmutable:** los assets estáticos (JS, CSS con hash) se cachean
  indefinidamente para mejorar el rendimiento.

### 3.3 Proxy de desarrollo

En `vite.config.js` se configura un proxy para el entorno local:

```js
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'https://sistema-documental-ia.onrender.com',
      changeOrigin: true
    }
  }
}
```

Esto permite que `localhost:5173/api/*` se redirija al backend de Render
durante el desarrollo local.

---

## 4. Variables de entorno del frontend

| Archivo | Variable | Valor |
|---------|----------|-------|
| `.env.production` | `VITE_API_BASE` | `https://sistema-documental-ia.onrender.com/api` |
| `.env` (local) | `VITE_API_BASE` | `https://sistema-documental-ia.onrender.com/api` |
| `vite.config.js` | Default (si no existe la variable) | `https://sistema-documental-ia.onrender.com/api` |

**Nótese:** las rutas en el cliente HTTP (`frontend/src/api/client.js`) **no**
incluyen el prefijo `/api`; este se agrega automáticamente por la variable
`VITE_API_BASE` que termina en `/api`. Ejemplo: `api.get("/auth/profile")`
resuelve a `https://sistema-documental-ia.onrender.com/api/auth/profile`.

---

## 5. Configuración de CORS

El backend permite explícitamente los siguientes orígenes:

```
http://localhost:5173
http://127.0.0.1:5173
https://sistema-documental-ia.vercel.app  (vía FRONTEND_URL)
*.vercel.app                               (regex)
```

Cualquier otro origen es rechazado con error CORS.

---

## 6. URLs de acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | https://sistema-documental-ia.vercel.app | Aplicación web |
| **Backend API** | https://sistema-documental-ia.onrender.com | API REST |
| **Health check** | https://sistema-documental-ia.onrender.com/api/health | `{"status":"ok","timestamp":"..."}` |
| **Repositorio** | https://github.com/pintoplataemmanuel-stack/Sistema_Documental_IA | Código fuente |

---

## 7. Proceso de verificación post-despliegue

1. **Health check:** `GET /api/health` → `{"status": "ok"}`.
2. **Login:** `POST /api/auth/login` con credenciales de prueba → 200 con token.
3. **CORS:** verificar desde Vercel que las peticiones al backend no son bloqueadas.
4. **Upload:** subir un PDF desde la interfaz → verificar que se crea el documento.
5. **Procesamiento IA:** esperar ~10-30 s → verificar que el estado cambia a "completed".
6. **Búsqueda semántica:** escribir una consulta en `/search` → verificar que hay resultados.
7. **Chat RAG:** hacer una pregunta → verificar que la respuesta cita documentos.

---

## 8. Diagrama de despliegue final

```
┌──────────────┐      HTTPS       ┌──────────────────────────────────┐
│  Navegador   │ ───────────────▶ │  Vercel (Frontend React + Vite)  │
│  (usuario)   │ ◀─────────────── │  https://sistema-documental-ia.  │
└──────────────┘                  │  vercel.app                       │
                                  └──────────────┬───────────────────┘
                                                 │ HTTPS / API
                                  ┌──────────────▼───────────────────┐
                                  │  Render (Backend Node/Express)    │
                                  │  https://sistema-documental-ia.   │
                                  │  onrender.com/api/*               │
                                  │  + uploads/ (archivos subidos)    │
                                  └───────┬──────────────┬───────────┘
                                  Mongoose│              │HTTPS
                                  ┌───────▼──────┐ ┌─────▼─────────────┐
                                  │ MongoDB Atlas │ │ OpenRouter        │
                                  │ (datos +      │ │ DeepSeek +        │
                                  │ vector search)│ │ text-emb-3-small  │
                                  └──────────────┘ └───────────────────┘
```

---

## 9. Mantenimiento

### 9.1 Índice vectorial

El índice `vector_index` sobre `documentchunks` se crea una sola vez desde
Atlas UI o con el script `createVectorIndex.js`. Se verifica con
`checkVectorIndex.js`. Si se recrea la colección, se debe volver a crear.

### 9.2 Actualizaciones de dependencias

```bash
cd backend && npm update
cd frontend && npm update
git add package*.json && git commit -m "chore: update deps" && git push
```

Vercel y Render despliegan automáticamente al hacer push a `main`.

### 9.3 Respaldo de MongoDB Atlas

MongoDB Atlas realiza respaldos automáticos en tier M0 (último estado
disponible). Para un respaldo manual:

1. Atlas UI → Cluster → "..." → "Download Backup"
2. O usar `mongodump` con la URI de conexión.

---

*Fin del documento 05.*
