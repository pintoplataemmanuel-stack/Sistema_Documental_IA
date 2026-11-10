# Guía de configuración — Gemini, Groq e índice vectorial

Esta guía deja el chatbot y la IA del sistema usando proveedores gratuitos, sin
depender de n8n y sin tocar claves en el código.

**Tiempo estimado:** 20–30 minutos.
**Costo:** $0 con los niveles gratuitos de Google AI Studio y Groq.

---

## 1. Requisitos

- Cuenta de Google.
- Cuenta gratuita en Groq (para el respaldo de chat).
- Acceso al cluster de MongoDB Atlas del proyecto.
- `backend/.env` configurado con `MONGODB_URI` y `JWT_SECRET`.

---

## 2. Crear la clave de Gemini

1. Abre <https://aistudio.google.com/apikey>.
2. Inicia sesión con la cuenta de Google del proyecto.
3. Pulsa **Create API key** (o **Crear clave de API**).
4. Selecciona el proyecto y copia la clave. Puede empezar por `AQ.` (clave de
   autorización, formato nuevo de 2026) o por `AIza...` (clave estándar antigua).
5. Si la clave aparece como **Unrestricted**, aplica **Add restrictions** →
   **Restrict to Gemini API only**. Desde 2026, Gemini rechaza las claves
   estándar sin restricciones.
6. No la compartas ni la subas al repositorio.

> El nivel gratuito de Gemini tiene límites por minuto y por día. Para el
> proyecto son suficientes; si se agotan, el sistema cambia automáticamente a
> Groq o a la búsqueda por palabras clave.

---

## 3. Configurar `backend/.env`

Abre `backend/.env` y agrega o actualiza estas variables:

```env
# --- Gemini (principal y gratuito) ---
GEMINI_API_KEY=AQ...tu_clave...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
GEMINI_NATIVE_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
# Debe coincidir con el índice de Atlas de este proyecto (1536 dimensiones)
GEMINI_EMBEDDING_DIMENSIONS=1536

# --- Orden de proveedores ---
AI_PROVIDER=auto
AI_FALLBACK_PROVIDERS=groq,openrouter,ollama
EMBEDDINGS_PROVIDER=auto
```

Notas:

- `gemini-3.5-flash-lite` es un modelo estable, rápido y económico con nivel
  gratuito. Si necesitas más calidad, usa `gemini-3.8-flash` en
  `GEMINI_CHAT_MODEL`.
- No uses `gemini-2.0-flash`: fue retirado el 1 de junio de 2026.
- No uses `text-embedding-004`: fue retirado el 14 de enero de 2026.
- `GEMINI_EMBEDDING_DIMENSIONS=1536` debe coincidir con el índice de Atlas.
  Gemini admite 768, 1536 y 3072 dimensiones; este proyecto conserva **1536**
  porque el índice `vector_index` ya está creado con esa dimensión.

Si prefieres mantener los embeddings en el proveedor anterior, deja
`EMBEDDINGS_PROVIDER` en ese proveedor:

```env
EMBEDDINGS_PROVIDER=openrouter
```

Así el chatbot usa Gemini, pero los vectores siguen generándose con el
proveedor anterior. En ambos casos la dimensión debe seguir siendo 1536.

---

## 4. Verificar la configuración

```bash
cd backend
npm run ai:check
```

Salida esperada con Gemini configurado:

```text
=== Proveedores de chat (orden de uso) ===
  1. gemini | modelo: gemini-3.5-flash-lite | clave: AQ...xxxx
  2. groq | modelo: openai/gpt-oss-120b | clave: gsk_...xxxx

=== Proveedores de embeddings ===
{
  "provider": "gemini",
  "model": "gemini-embedding-001",
  "dimensions": 1536,
  "configured": true
}
```

Si Gemini no aparece, revisa que la clave esté en `backend/.env` y que no tenga
espacios ni comillas adicionales.

---

## 5. Prueba real de chat y embeddings

```bash
npm run ai:test
```

Salida esperada:

```text
=== Orden de proveedores de chat ===
  1. gemini (gemini-3.5-flash-lite)

=== Prueba de chat (JSON) ===
  OK: {"ok":true,"mensaje":"..."}

=== Prueba de embeddings ===
  OK: 1536 dimensiones con gemini / gemini-embedding-001
```

Si el chat falla con Gemini pero responde con Groq, la cadena de respaldo está
funcionando. Revisa la cuota o la clave de Gemini.

---

## 6. Reindexar embeddings sin recrear el índice

**Obligatorio al cambiar de proveedor o de modelo de embeddings.** Los vectores
y el índice deben coincidir; si no, la búsqueda vectorial falla y el sistema usa
palabras clave. En este proyecto el índice `vector_index` usa **1536
dimensiones**, por eso Gemini se configura con `GEMINI_EMBEDDING_DIMENSIONS=1536`.

1. Confirma la dimensión del índice en MongoDB Atlas → cluster del proyecto →
   **Atlas Search** → `vector_index`, o con:

   ```bash
   node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/checkVectorIndex.js"
   ```

2. Ajusta `GEMINI_EMBEDDING_DIMENSIONS` a esa dimensión (1536 en este proyecto).
3. Regenera los vectores con el proveedor actual:

   ```bash
   cd backend
   npm run reindex
   ```

   Debe mostrar `gemini / gemini-embedding-001 / 1536 dimensiones` y cuántos
   fragmentos reindexó.
4. Prueba el chat en la aplicación. La búsqueda debe responder en modo `vector`
   y seguir citando fuentes.

> Solo si decides **cambiar la dimensión** (por ejemplo a 768) debes eliminar y
> recrear el índice con ese `numDimensions`. Si algo falla, el sistema no se cae:
> `ragService` usa búsqueda por palabras clave y el chat sigue respondiendo.

---

## 7. Configurar Groq como respaldo

1. Abre <https://console.groq.com/keys>.
2. Crea una cuenta gratuita e inicia sesión.
3. Pulsa **Create API Key**, copia la clave (`gsk_...`).
4. Agrégala a `backend/.env`:

   ```env
   GROQ_API_KEY=gsk_...tu_clave...
   GROQ_BASE_URL=https://api.groq.com/openai/v1
   GROQ_CHAT_MODEL=openai/gpt-oss-120b
   ```

5. Verifica:

   ```bash
   npm run ai:check
   ```

Groq solo se usa para chat. No ofrece embeddings ni visión.

---

## 8. Probar el plan B

1. Con Gemini y Groq configurados, ejecuta `npm run ai:test`.
2. Cambia temporalmente `GEMINI_API_KEY` por un valor inválido (por ejemplo
   `GEMINI_API_KEY=invalida`).
3. Ejecuta de nuevo `npm run ai:test`.
4. El chat debe responder con Groq y el resultado debe indicar que funcionó.
5. Restaura la clave real.

Esto demuestra el requisito de plan B ante fallo o cuota agotada.

---

## 9. Plan B local con Ollama (opcional)

Solo si tu computador puede correr modelos locales:

1. Instala Ollama desde <https://ollama.com>.
2. Descarga los modelos:

   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

3. En `backend/.env`:

   ```env
   OLLAMA_ENABLED=true
   OLLAMA_BASE_URL=http://localhost:11434/v1
   OLLAMA_CHAT_MODEL=llama3.2
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text
   ```

4. Verifica con `npm run ai:check`.

Ollama no se recomienda para el servidor gratuito de Render porque no tiene
recursos suficientes para el modelo. Es un plan B local.

---

## 10. Configurar Render (producción)

1. Entra a Render → servicio del backend → **Environment**.
2. Agrega las mismas variables de `backend/.env`:
   - `GEMINI_API_KEY`
   - `GEMINI_CHAT_MODEL`
   - `GEMINI_EMBEDDING_MODEL`
   - `GEMINI_EMBEDDING_DIMENSIONS`
   - `GROQ_API_KEY` (opcional)
   - `AI_PROVIDER=auto`
   - `EMBEDDINGS_PROVIDER=auto`
3. Guarda y haz **Manual Deploy**.
4. Verifica el health check:

   ```bash
   curl https://sistema-documental-ia.onrender.com/api/health
   ```

   Debe mostrar `status: "ok"`, los proveedores de IA y
   `automation.flows: 2`.

5. Si cambiaste embeddings a Gemini, recuerda que la reindexación y el índice de
   Atlas se hacen una sola vez sobre la base de datos, no en Render.

---

## 11. Seguridad

- Nunca subas `backend/.env` al repositorio.
- Si una clave se filtra, revócala en Google AI Studio o Groq y crea otra.
- Usa claves distintas para desarrollo y producción.
- No imprimas claves completas en logs; `npm run ai:check` solo muestra los
  primeros y últimos caracteres.
- Para la Semana 3, no envíes imágenes con datos personales a la nube sin
  autorización; usa OCR local como alternativa.

---

## 12. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `No hay ningún proveedor de IA configurado` | Falta la clave en `.env` | Agrega `GEMINI_API_KEY` o `GROQ_API_KEY`. |
| Gemini responde 404 | Modelo retirado o nombre incorrecto | Revisa `GEMINI_CHAT_MODEL`; usa un modelo que AI Studio muestre con nivel gratuito. |
| Gemini responde 401 | Clave inválida o revocada | Verifica `GEMINI_API_KEY`; en este proyecto una clave `AQ.` funcionó con el endpoint compatible y con el nativo. |
| Gemini responde 429 | Cuota gratuita agotada | Espera o usa Groq; el fallback es automático. |
| `devolvió 3072 dimensiones y se esperaban 1536` | Se usó el endpoint compatible en vez del nativo | Verifica `GEMINI_NATIVE_BASE_URL` y `GEMINI_EMBEDDING_DIMENSIONS=1536`. |
| La búsqueda responde en modo `keyword` | Índice vectorial ausente o dimensión distinta | Revisa el índice y ejecuta `npm run reindex`. |
| `npm run reindex` falla | Falta `MONGODB_URI` o no hay documentos completados | Revisa `.env` y procesa al menos un documento. |
| El chat funciona pero no cita fuentes | No hay fragmentos relevantes | Procesa documentos hasta el estado `completado`. |
| Groq responde 401 | Clave inválida | Crea otra clave en `console.groq.com/keys`. |
| Groq responde 404 `model does not exist` | El modelo fue retirado o no está disponible en la cuenta | Consulta los modelos con `GET https://api.groq.com/openai/v1/models` y actualiza `GROQ_CHAT_MODEL` (por ejemplo `openai/gpt-oss-120b`). |

---

## 13. Checklist final

- [ ] `GEMINI_API_KEY` configurada en `backend/.env`.
- [ ] `npm run ai:check` muestra Gemini primero.
- [ ] `npm run ai:test` responde chat y embeddings.
- [ ] `GROQ_API_KEY` configurada (respaldo).
- [ ] Índice `vector_index` en 1536 (la dimensión configurada para Gemini).
- [ ] `npm run reindex` ejecutado sin errores.
- [ ] Variables agregadas en Render y redeploy hecho.
- [ ] `GET /api/health` muestra 2 flujos y los proveedores.
- [ ] Notificaciones y automatizaciones visibles en la aplicación.
