# 10 – Base de datos, scripts o estructura necesaria para reproducir el sistema

## Base de datos (MongoDB Atlas)

El sistema usa **MongoDB Atlas** (cluster en la nube, compartido/free M0 con
MongoDB 7.0.2+). Para acceder a la base de datos:

1. Abre https://account.mongodb.com y entra con la cuenta del proyecto.
2. Entra al cluster → **Database > Browse Collections** para ver las
   colecciones: `users`, `repositories`, `documents`, `processinglogs` y
   `documentchunks`.
3. La cadena de conexión para el código se define en `backend/.env`
   (variable `MONGODB_URI`), en formato
   `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/sistema_documental?retryWrites=true&w=majority`.
   Esta cadena **nunca se sube al repositorio**; consulta el archivo
   `backend/.env.example` para ver la estructura.

### Índice de Atlas Vector Search (búsqueda semántica)

La búsqueda inteligente requiere un índice `vectorSearch` sobre la colección
`documentchunks` (similitud coseno, filtros por `owner` y `repository`). La
dimensión depende del proveedor de embeddings:

| Proveedor | Modelo | Dimensiones |
|---|---|---|
| Gemini (proveedor principal) | `gemini-embedding-001` (`outputDimensionality` configurable) | 1536 en este proyecto |
| Ollama local (plan B) | `nomic-embed-text` | 768 |

Los scripts leen la dimensión automáticamente desde `aiService`, así que no hay
que editar el número a mano. También se puede crear desde **Atlas UI → Atlas
Search → Create Search Index → JSON Editor**; por ejemplo, para Gemini:

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

> Al cambiar de proveedor de embeddings hay que regenerar los vectores con
> `cd backend && npm run reindex`. La dimensión debe coincidir con el índice;
> en este proyecto se usa 1536. Solo si cambias la dimensión hay que recrear el
> índice.

## Scripts (migrados desde `backend/scripts`)

Estos scripts se mueven aquí como evidencia de pruebas y para reproducir el
sistema. Los que usan el backend se ejecutan desde la raíz del repositorio
(necesitan que exista `backend/node_modules` y `backend/.env` con la
`MONGODB_URI` y credenciales de Gemini/Groq):

| Script | Descripción |
|--------|-------------|
| `createVectorIndex.js` | Crea el índice de Atlas Vector Search y espera a que esté READY. |
| `checkVectorIndex.js` | Verifica si el índice existe y muestra su definición JSON. |
| `testPipelineMock.js` | Ejecuta el pipeline completo sin llamar a la API (mocks de IA). |
| `testErrorPath.js` | Verifica que un documento en `processing` pase a `error` al fallar la IA. |
| `testRecovery.js` | Prueba la recuperación de documentos "colgados" en `processing`. |
| `testDay3.js` | Prueba local de extracción de texto (TXT/PDF) y fragmentación. |
| `smokeTest.js` | Smoke test end-to-end HTTP (login, upload, process). |
| `reprocess.js` | Reprocesa un documento por id y sigue su estado hasta completar. |
| `generateTestPdf.js` | Genera un PDF mínimo válido para probar la extracción de texto. |

Ejemplos de ejecución (desde la raíz del repositorio):

```bash
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/createVectorIndex.js"
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/testPipelineMock.js" <DOC_ID>
node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/smokeTest.js" <TOKEN> <REPO_ID> <RUTA_TXT>
```

## Reproducir el sistema

1. Clona el repositorio: `git clone https://github.com/pintoplataemmanuel-stack/Sistema_Documental_IA.git`
2. Configura `backend/.env` con `MONGODB_URI`, `JWT_SECRET` y `GEMINI_API_KEY`
   (nivel gratuito) según `backend/.env.example`. Groq es opcional como respaldo.
3. Crea el índice vectorial (1536 dimensiones en este proyecto, la dimensión
   configurada para Gemini):
   `node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/createVectorIndex.js"`.
4. Si ya había documentos procesados con otro proveedor, reindexa:
   `cd backend && npm run reindex`.
5. Levanta el backend (`cd backend && npm install && npm run dev`) y el
   frontend (`cd frontend && npm install && npm run dev`).