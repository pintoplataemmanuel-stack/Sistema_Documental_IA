# Sistema Inteligente de Gestión y Análisis Documental con IA

## Descripción

Aplicación web empresarial que permite gestionar un repositorio de documentos
y aplicar **Inteligencia Artificial (RAG)** para **clasificar**, **resumir**,
**extraer información** y **consultar el contenido** de los archivos.
Carga documentos (PDF, DOCX, TXT), los organiza en repositorios y luego
puedes buscar y preguntar en lenguaje natural sobre todo lo que contienen.

## Aplicación en línea

🌐 **Aplicación en línea:** https://sistema-documental-ia.vercel.app

El docente o cualquier usuario puede probar la aplicación desde su computador
ingresando a esta URL (crea una cuenta gratuita con un correo y contraseña de
mínimo 8 caracteres).

## Tecnologías utilizadas

- **React (Vite)** — Frontend (SPA)
- **Node.js (Express)** — Backend (API REST)
- **MongoDB Atlas** — Base de datos (+ Atlas Vector Search para búsqueda semántica)
- **OpenAI/OpenRouter** — IA: clasificación, resumen, extracción, embeddings y RAG
- **JWT** — Autenticación y control de acceso
- **Vercel** — Hosting del frontend
- **Render** — Hosting del backend

## Estructura del repositorio

El repositorio está organizado en los **entregables del 01 al 10**: Análisis,
Diseño, Desarrollo, Pruebas, Implementación/Despliegue, Manuales y los
códigos fuente.

| # | Entregable | Descripción |
|---|-----------|-------------|
| 01 | [Documento de Análisis](<01 – Documento de Análisis/01 – Documento de Análisis.md>) | Contexto, requerimientos, casos de uso |
| 02 | [Documento de Diseño](<02 – Documento de Diseño/02 – Documento de Diseño.md>) | Arquitectura, modelo de datos, API |
| 03 | [Documento de Desarrollo](<03 – Documento de Desarrollo – Documento técnico/03 – Documento de Desarrollo.md>) | Estructura del código e integración de IA |
| 04 | [Plan y evidencias de Pruebas](<04 – Plan y evidencias de Pruebas/04 – Plan y evidencias de Pruebas.md>) | Plan, 10 casos de prueba y resultados |
| 05 | [Implementación y Despliegue](<05 – Documento de Implementación y Despliegue/05 – Documento de Implementación y Despliegue.md>) | Despliegue en Vercel y Render |
| 06 | [Manual de Usuario](<06 – Manual de Usuario/06 – Manual de Usuario.md>) | Guía paso a paso del uso de la app |
| 07 | [Manual Técnico](<07 – Manual Técnico – Administración/07 – Manual Técnico.md>) | Instalación, ejecución y administración |
| 08 | [Matriz de Trazabilidad](<08 – Matriz de trazabilidad de requisitos, funcionalidades y pruebas/08 – Matriz de trazabilidad.md>) | Requisitos ↔ funcionalidades ↔ pruebas |
| 09 | [Código fuente en repositorio Git](<09 – Código fuente en repositorio Git/README.md>) | Backend (`backend/`) y frontend (`frontend/`) |
| 10 | [Base de datos y scripts](<10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/README.md>) | Acceso a MongoDB Atlas y scripts de reproducción |

## Cómo correr el proyecto localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env   # completar MONGODB_URI, JWT_SECRET y OPENAI_API_KEY
npm run dev            # API en http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # app en http://localhost:5173
```

## Autor

**Emmanuel Pinto Plata** — Desarrollo Full Stack (MERN) con integración de IA.