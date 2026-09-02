# Sistema Documental IA — Frontend

Interfaz de usuario del Sistema Inteligente de Gestión y Análisis Documental.
SPA en **React 19 + Vite 8** con React Router.

## Requisitos

- Node.js 18+ (recomendado 20+)
- Backend corriendo en `http://localhost:5000` (ver `backend/`)

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

Abre `http://localhost:5173`. El dev server redirige `/api/*` al backend
(`http://localhost:5000`) mediante proxy, por lo que no hace falta configurar
CORS ni URLs absolutas.

## Build de producción

```bash
npm run build   # genera ./dist
npm run preview # sirve el build localmente
```

## Estructura

```
src/
  api/          -> cliente HTTP con token (fetch)
  context/      -> AuthContext (usuario y token, persistido en localStorage)
  components/   -> UI reutilizable (Layout, Alert, Field, DocumentStatus…)
  pages/        -> Login, Register, Repositorios, Detalle de repositorio, Detalle de documento
  routes/       -> ProtectedRoute (redirige a /login si no hay sesión)
```

## Funcionalidad

- Registro e inicio de sesión (JWT persistido).
- CRUD de repositorios.
- Subida de documentos (PDF/DOCX/TXT) y listado con estado.
- Procesamiento con IA (clasificación, resumen, campos clave, embeddings).
- Detalle de documento: categoría, resumen, campos extraídos y texto.

## Variables de entorno (opcionales)

| Variable | Uso | Default |
| --- | --- | --- |
| `VITE_API_BASE` | URL base de la API (sin valor = misma app `/api`) | `/api` |