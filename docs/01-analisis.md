# Documento 01 — Análisis del Sistema

**Proyecto:** Sistema Inteligente de Gestión y Análisis Documental
**Versión:** 1.0
**Fecha:** 1 de septiembre de 2026
**Estado:** Borrador final

---

## 1. Descripción del problema y contexto empresarial

### 1.1 Contexto

**Novatec Consulting** es una consultora de tamaño medio (≈40 empleados) que gestiona
diariamente decenas de documentos: contratos con clientes y proveedores, facturas
electrónicas y reportes de proyectos. Hoy el flujo es manual:

1. Los documentos se guardan en carpetas de red compartidas, organizadas de forma
   inconsistente (unos por cliente, otros por año, otros sin orden).
2. Buscar un contrato específico puede tomar minutos (o no encontrarse).
3. No existe resumen ni metadatos automáticos: para saber qué contiene un contrato o
   cuánto se pagó en una factura, hay que abrir el archivo.
4. No hay forma de hacer preguntas transversales del tipo "¿cuál es el monto total de
   facturas de clientes con atraso?" sin revisar archivo por archivo.

El resultado es pérdida de tiempo operativo, errores en la localización de información
crítica y dependencia de la memoria de las personas que cargan los documentos.

### 1.2 Problema

La organización carece de un sistema que concentre, organice y **explote el contenido
de sus documentos de forma automática**, impidiendo convertir su archivo documental en
información útil y consultable. En términos técnicos: hay datos no estructurados
(documentos PDF, DOCX, TXT) que no están indexados, clasificados ni consultables
de forma inteligente.

### 1.3 Solución propuesta

Un **sistema web** con dos grandes capacidades:

- **Gestión documental:** repositorios, carga de archivos (PDF, DOCX, TXT), listado,
  descarga y eliminación, con control de acceso por usuario.
- **Análisis con IA:** al cargar un documento, el sistema extrae el texto, lo clasifica
  en categorías predefinidas (Contrato, Factura, Reporte, Otro), genera un resumen,
  extrae datos clave (fechas, montos, partes, etc.), construye una representación
  semántica (embeddings) y permite **buscar y preguntar en lenguaje natural** sobre el
  contenido de todos los documentos.

---

## 2. Objetivos

### 2.1 Objetivo general

Desarrollar un sistema web para la gestión y el análisis inteligente de documentos,
que permita almacenar, clasificar, resumir y consultar el contenido documental de una
organización mediante técnicas de inteligencia artificial (clasificación, resumen,
extracción de información y recuperación aumentada por generación —RAG).

### 2.2 Objetivos específicos

1. Implementar un módulo de autenticación y control de acceso basado en roles
   (administrador, editor/cargador, lector).
2. Implementar la gestión de repositorios y documentos (carga, consulta, descarga y
   eliminación) con validación de tipos de archivo y tamaños.
3. Implementar un flujo de procesamiento documental con IA que extraiga texto, clasifique
   el documento en una categoría, genere un resumen y extraiga campos clave.
4. Implementar búsqueda por palabras clave y por similitud semántica (embeddings en
   MongoDB Atlas Vector Search).
5. Implementar un módulo de preguntas en lenguaje natural (RAG) que responda con base en
   los documentos almacenados e indique sus fuentes.
6. Implementar un panel de control con indicadores de gestión documental.
7. Documentar el proceso completo (análisis, diseño, desarrollo, pruebas, despliegue)
   para su sustentación.

---

## 3. Alcance y exclusiones

### 3.1 Alcance

- Sistema web con frontend (React) y backend (API REST en Node/Express).
- Repositorios (carpetas) y documentos por usuario, con roles de acceso.
- Formatos de archivo admitidos: PDF (texto digital), DOCX y TXT.
- Procesamiento automático con IA: clasificación, resumen y extracción de campos clave.
- Búsqueda por palabra clave y búsqueda semántica sobre los documentos del usuario.
- Preguntas en lenguaje natural (RAG) con cita de la fuente.
- Panel de control con métricas básicas (totales, por categoría, estado de proceso).
- Autenticación con JWT y contraseñas hasheadas con bcrypt.
- Manejo de errores y registro de actividad de procesamiento (ProcessingLog).

### 3.2 Exclusiones

- **No OCR de manuscritos/escaners con imagen:** solo se procesa texto digital
  (PDF con capa de texto). Los PDF escaneados quedarán registrados en error.
- **No multi-idioma:** la interfaz y el procesamiento se realizan en español.
- **No edición colaborativa simultánea de documentos.**
- **No firma electrónica ni sellos de tiempo.**
- **No flujos de aprobación de documentos** (workflow de revisión).
- **No versionado múltiple de un mismo archivo:** al cargar un archivo con el mismo
  nombre se crea un nuevo documento (no se sobreescribe ni se versiona).
- **No análisis de imágenes ni audio/video.**
- No se incluye móvil nativo (el sistema es responsive web).

---

## 4. Actores del sistema

| Actor | Descripción |
|-------|-------------|
| **Administrador** | Gestiona usuarios y repositorios globales, puede eliminar cualquier documento, ve el dashboard general. |
| **Editor / Cargador de documentos** | Usuario operativo que crea repositorios, sube y procesa documentos de su dominio. |
| **Lector / Auditor** | Puede consultar, buscar y preguntar sobre documentos de los repositorios a los que tiene acceso. Solo lectura. |

---

## 5. Perfiles de usuario (personas)

### P1 — María (Administradora)
- **Edad:** 38 · **Rol:** Líder de operaciones en Novatec.
- **Necesidad:** controlar qué se sube, quién accede y tener visibilidad global del
  archivo documental.
- **Comportamiento:** revisa el dashboard diariamente, crea repositorios corporativos,
  desactiva usuarios que rotan.

### P2 — Andrés (Editor / Cargador)
- **Edad:** 27 · **Rol:** Asistente administrativo.
- **Necesidad:** subir contratos y facturas rápido y que el sistema los organice
  (clasifique, resuma y extraiga datos) para no hacerlo a mano.
- **Comportamiento:** sube lotes de archivos, revisa que el resumen sea correcto y
  consulta "¿qué contiene este contrato?" antes de responder correos.

### P3 — Carolina (Lectora / Auditora)
- **Edad:** 45 · **Rol:** Revisora contable.
- **Necesidad:** encontrar facturas y cláusulas específicas sin leer archivos enteros.
- **Comportamiento:** usa el buscador y hace preguntas como "¿cuáles facturas están
  pendientes y por qué monto?".

---

## 6. Requerimientos funcionales (RF)

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF01 | El sistema debe permitir el registro de usuarios con nombre, correo y contraseña. | Must |
| RF02 | El sistema debe permitir el inicio de sesión y devolver un token JWT. | Must |
| RF03 | El sistema debe proteger las rutas privadas mediante el token JWT. | Must |
| RF04 | El sistema debe permitir al usuario crear, listar, editar y eliminar repositorios (carpetas). | Must |
| RF05 | El sistema debe permitir la carga de documentos (PDF, DOCX, TXT) a un repositorio. | Must |
| RF06 | El sistema debe validar el tipo de archivo y su tamaño máximo al cargar. | Must |
| RF07 | El sistema debe permitir listar, ver detalle, descargar y eliminar documentos. | Must |
| RF08 | El sistema debe extraer el texto del documento automáticamente tras la carga. | Must |
| RF09 | El sistema debe clasificar el documento en una categoría (Contrato, Factura, Reporte, Otro) con IA. | Must |
| RF10 | El sistema debe generar un resumen del documento con IA. | Must |
| RF11 | El sistema debe extraer campos clave del documento según su tipo (fechas, montos, partes, etc.). | Must |
| RF12 | El sistema debe persistir el resultado del procesamiento y registrar un log de proceso. | Must |
| RF13 | El sistema debe permitir búsqueda por palabras clave sobre el contenido (nombre, texto, resumen). | Must |
| RF14 | El sistema debe permitir búsqueda semántica mediante embeddings (Atlas Vector Search). | Must |
| RF15 | El sistema debe permitir hacer preguntas en lenguaje natural (RAG) y responder con base en los documentos. | Must |
| RF16 | La respuesta del RAG debe indicar los documentos de origen de la información. | Must |
| RF17 | El sistema debe mostrar un dashboard con total de documentos, por categoría, y estado del proceso. | Must |
| RF18 | El sistema debe permitir ver la actividad reciente de procesamiento. | Should |
| RF19 | El sistema debe permitir actualizar el perfil del usuario (nombre, empresa). | Should |
| RF20 | El sistema debe mostrar mensajes de error claros al usuario (no solo en consola). | Must |
| RF21 | El sistema debe registrar los errores de procesamiento sin interrumpir el servidor. | Must |
| RF22 | El sistema debe permitir al admin desactivar/activar usuarios. | Should |
| RF23 | El sistema debe permitir al admin eliminar cualquier documento (regla de negocio RN02). | Should |
| RF24 | El panel de dashboard debe incluir al menos un gráfico de documentos por categoría. | Could |

---

## 7. Requerimientos no funcionales (RNF)

| ID | Categoría | Requerimiento |
|----|-----------|---------------|
| RNF01 | Seguridad | Las contraseñas deben almacenarse con hash (bcrypt, sal de 10 rondas). |
| RNF02 | Seguridad | La autenticación debe usar JWT con expiración configurable (7 días). |
| RNF03 | Seguridad | Los secretos (clave JWT, cadena de conexión, API key de IA) deben vivir en variables de entorno y nunca en el repositorio. |
| RNF04 | Seguridad | Debe validarse el tipo de archivo (extensión y MIME) y el tamaño máximo (por defecto 10 MB). |
| RNF05 | Seguridad | Acceso por roles: solo admin o propietario eliminan documentos; solo propietario edita repositorios. |
| RNF06 | Rendimiento | El procesamiento de IA debe ejecutarse de forma asíncrona para no bloquear la API. Los archivos deben aparecer con estado "pendiente" y cambiar a procesado al terminar. |
| RNF07 | Rendimiento | Un documento de tamaño típico (≤ 1 MB de texto) debe procesarse en menos de 60 segundos. |
| RNF08 | Disponibilidad | La base de datos vive en MongoDB Atlas (alta disponibilidad, respaldo automático). Si la API de IA no responde, el sistema debe registrarlo y permitir reintentar el procesamiento. |
| RNF09 | Usabilidad | La interfaz debe estar en español y ser navegable en ≤ 3 clics a cada vista principal. |
| RNF10 | Usabilidad | Los mensajes de error de la interfaz deben ser comprensibles y accionables para el usuario final. |
| RNF11 | Compatibilidad | La interfaz web debe funcionar en navegadores modernos (Chrome, Edge, Firefox) y ser responsiva. |
| RNF12 | Mantenibilidad | El backend debe organizarse por capas (rutas → controladores → servicios → modelos). |
| RNF13 | Portabilidad | El despliegue debe ser reproducible mediante documentación paso a paso y variables de entorno. |
| RNF14 | Trazabilidad | El sistema debe mantener log de actividad de procesamiento por documento. |

---

## 8. Reglas de negocio (RN)

| ID | Regla |
|----|-------|
| RN01 | Un documento solo puede pertenecer a una categoría y a un repositorio. |
| RN02 | Solo el propietario del documento o un administrador pueden eliminar un archivo. |
| RN03 | Solo el propietario de un repositorio puede editarlo o eliminarlo. |
| RN04 | Para acceder a un repositorio, el usuario debe ser el propietario o estar registrado como miembro. |
| RN05 | Los únicos formatos admitidos son PDF, DOCX y TXT; cualquier otro tipo se rechaza al cargar. |
| RN06 | Si el archivo no puede procesarse (PDF escaneado sin texto, error de IA), se registra como "error" y se puede reintentar, pero el archivo permanece cargado. |
| RN07 | Un mismo usuario con rol lector no puede cargar, editar ni eliminar documentos. |
| RN08 | El correo electrónico es único en el sistema. |
| RN09 | El procesamiento se ejecuta una sola vez por defecto; un reproceso crea un nuevo log. |
| RN10 | Si la API de IA falla, el procesamiento se marca como error y queda registrado sin tumbar el servidor. |

---

## 9. Historias de usuario

### HU01 — Registro de usuario
- **Como** nuevo usuario, **quiero** registrarme con mi nombre, correo y contraseña, **para** poder acceder al sistema.
- **Criterios de aceptación:**
  - Dado un correo no registrado y una contraseña de al menos 8 caracteres, cuando envío el formulario, entonces se crea la cuenta y soy autenticado automáticamente.
  - Dado un correo ya registrado, cuando intento registrarme, entonces el sistema muestra "El correo ya está registrado".
  - Dado una contraseña menor a 8 caracteres, cuando envío el formulario, entonces el sistema muestra error de validación.

### HU02 — Inicio de sesión
- **Como** usuario registrado, **quiero** iniciar sesión con mi correo y contraseña, **para** acceder a mis documentos.
- **Criterios de aceptación:**
  - Dado credenciales correctas, cuando envío el formulario, entonces recibo un token JWT y accedo al dashboard.
  - Dado credenciales incorrectas, cuando envío el formulario, entonces el sistema muestra "Correo o contraseña inválidos".
  - Dado un token expirado, cuando intento acceder a una ruta privada, entonces el sistema me redirige al login.

### HU03 — Crear repositorio
- **Como** editor, **quiero** crear un repositorio (carpeta), **para** organizar mis documentos por tema o cliente.
- **Criterios de aceptación:**
  - Dado que estoy autenticado, cuando creo un repositorio con nombre y descripción, entonces aparece en mi lista de repositorios.
  - Dado repositorio sin nombre, cuando intento crearlo, entonces el sistema muestra error.

### HU04 — Cargar un documento
- **Como** editor, **quiero** subir un documento PDF/DOCX/TXT a un repositorio, **para** que el sistema lo analice automáticamente.
- **Criterios de aceptación:**
  - Dado un archivo válido y un repositorio existente, cuando lo subo, entonces aparece en la lista con estado "pendiente".
  - Dado un archivo con extensión no permitida (ej. .exe, .jpg), cuando intento subirlo, entonces el sistema lo rechaza con mensaje claro.
  - Dado un archivo mayor al tamaño máximo, cuando intento subirlo, entonces el sistema lo rechaza.

### HU05 — Ver resultado del procesamiento IA
- **Como** usuario, **quiero** ver la clasificación, el resumen y los datos extraídos de un documento, **para** entender su contenido sin abrirlo.
- **Criterios de aceptación:**
  - Dado un documento procesado, cuando abro su detalle, entonces veo categoría, resumen e información extraída.
  - Dado un documento en error, cuando abro su detalle, entonces veo el estado "error" y el mensaje del problema.

### HU06 — Reprocesar un documento
- **Como** editor, **quiero** reintentar el procesamiento de un documento que falló, **para** obtener su análisis.
- **Criterios de aceptación:**
  - Dado un documento con estado "error", cuando pido reprocesarlo, entonces cambia a "procesando" y al terminar queda "completado".
  - Dado un documento en error por PDF escaneado, cuando lo reproceso, entonces vuelve a quedar en "error" sin tumbar el sistema.

### HU07 — Buscar por palabras clave
- **Como** lector, **quiero** buscar documentos por término de texto, **para** encontrar rápidamente lo que necesito.
- **Criterios de aceptación:**
  - Dado que escribo una palabra clave, cuando busco, entonces obtengo documentos cuyo nombre, texto o resumen coinciden.
  - Dado que no hay coincidencias, cuando busco, entonces el sistema indica que no hay resultados.

### HU08 — Preguntar en lenguaje natural (RAG)
- **Como** lector, **quiero** hacer una pregunta en lenguaje natural sobre mis documentos, **para** obtener respuestas sin abrir cada archivo.
- **Criterios de aceptación:**
  - Dado que escribo una pregunta como "¿cuál es el monto total de las facturas de marzo?", cuando la envío, entonces recibo una respuesta basada en los documentos.
  - La respuesta debe indicar de qué documento(s) fue extraída la información.
  - Dado que no hay documentos que respondan la pregunta, entonces el modelo responde que no encontró información relevante.

### HU09 — Ver dashboard
- **Como** administrador, **quiero** ver indicadores del sistema, **para** supervisar la gestión documental.
- **Criterios de aceptación:**
  - Dado que existen documentos, cuando abro el dashboard, entonces veo totales por categoría, estado de proceso y actividad reciente.

### HU10 — Eliminar documento
- **Como** propietario del documento (o admin), **quiero** eliminar un archivo, **para** depurar el repositorio.
- **Criterios de aceptación:**
  - Dado que soy propietario o admin, cuando elimino, entonces el documento y el archivo físico desaparecen.
  - Dado que soy lector, cuando intento eliminar, entonces el sistema muestra mensaje de permisos insuficientes.

---

## 10. Casos de uso

### 10.1 Diagrama de casos de uso (descripción textual)

```
                    ┌─────────────────────────────────────────────┐
                    │              SISTEMA DOCUMENTAL            │
                    │                                             │
   ┌──────────┐     │  ┌────────────┐   ┌──────────────┐          │
   │  No      │────▶│  │ CU-01      │   │ CU-02        │          │
   │  registrado  │  │  │ Registrarse │   │ Iniciar sesión│          │
   └──────────┘     │  └────────────┘   └──────────────┘          │
                    │                                             │
   ┌──────────┐     │  ┌────────────┐   ┌──────────────┐          │
   │  Editor  │────▶│  │ CU-03      │   │ CU-04        │          │
   │          │     │  │ Crear repo │   │ Cargar doc   │          │
   └──────────┘     │  └────────────┘   └──────────────┘          │
   ┌──────────┐     │                                             │
   │  Lector  │────▶│  CU-05 Buscar · CU-06 Preguntar (RAG)       │
   └──────────┘     │  CU-07 Ver resumen/clasificación            │
   ┌──────────┐     │                                             │
   │  Admin   │────▶│  CU-08 Ver dashboard · CU-09 Gestionar      │
   └──────────┘     │                                              │
                    └─────────────────────────────────────────────┘
```

### 10.2 Casos de uso principales

| ID | Caso de uso | Actor principal | Descripción breve |
|----|-------------|-----------------|-------------------|
| CU-01 | Registrarse | No registrado | Crear cuenta de usuario. |
| CU-02 | Iniciar sesión | Todos | Autenticarse y obtener token. |
| CU-03 | Crear/editar repositorio | Editor, Admin | Gestionar carpetas de documentos. |
| CU-04 | Cargar documento | Editor, Admin | Subir un archivo válido a un repositorio. |
| CU-05 | Buscar documentos | Todos | Búsqueda por palabra clave y semántica. |
| CU-06 | Preguntar en lenguaje natural | Todos | Consultas RAG sobre los documentos. |
| CU-07 | Ver análisis del documento | Todos | Consultar clasificación, resumen y datos extraídos. |
| CU-08 | Ver dashboard | Admin, Editor | Indicadores de gestión. |
| CU-09 | Gestionar usuarios | Admin | Activar/desactivar usuarios. |
| CU-10 | Eliminar documento | Propietario, Admin | Borrar archivo y su registro. |

### 10.3 Especificación detallada — CU-04: Cargar documento

- **Actor:** Editor / Admin.
- **Precondición:** Usuario autenticado, existe un repositorio.
- **Flujo principal:**
  1. El usuario navega al repositorio y pulsa "Subir documento".
  2. Selecciona un archivo (PDF, DOCX o TXT).
  3. El sistema valida tipo y tamaño.
  4. El sistema guarda el archivo y crea el registro con estado "pendiente".
  5. El sistema dispara el procesamiento en segundo plano (extracción → clasificación → resumen → extracción de campos → embeddings).
  6. El registro pasa a "procesando" y luego a "completado".
- **Flujos alternativos:**
  - 3a. Tipo no permitido → se rechaza con mensaje.
  - 4a. Repositorio no existe o sin acceso → error 404/403.
  - 5a. Error de lectura o de IA → estado "error" y log del mensaje, sin tumbar el servidor.
- **Postcondición:** documento listable y consultable con su análisis.

### 10.4 Especificación detallada — CU-06: Preguntar en lenguaje natural (RAG)

- **Actor:** Lector / Editor / Admin.
- **Precondición:** Usuario autenticado con documentos procesados.
- **Flujo principal:**
  1. El usuario escribe una pregunta en el chat.
  2. El sistema genera el embedding de la pregunta.
  3. El sistema busca en MongoDB Atlas Vector Search los fragmentos más similares.
  4. El sistema arma un prompt con el contexto recuperado.
  5. OpenAI responde con base únicamente en ese contexto.
  6. El sistema devuelve la respuesta junto con los documentos/fuentes usados.
- **Flujos alternativos:**
  - 3a. Sin resultados relevantes → el modelo responde "no encontré información".
  - 5a. Error de API → mensaje de error controlado con reintento.
- **Postcondición:** respuesta con fuentes visibles.

### 10.5 Especificación detallada — CU-08: Ver dashboard

- **Actor:** Admin / Editor.
- **Precondición:** Usuario autenticado.
- **Flujo principal:**
  1. El usuario abre el dashboard.
  2. El sistema consulta total de documentos, distribución por categoría, estados de procesamiento y actividad reciente.
  3. El sistema renderiza indicadores y al menos un gráfico.
- **Postcondición:** vista de indicadores actualizada.

---

## 11. Priorización de requerimientos (MoSCoW)

| Prioridad | Requerimientos |
|-----------|----------------|
| **Must (imprescindible)** | RF01, RF02, RF03, RF04, RF05, RF06, RF07, RF08, RF09, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF20, RF21 |
| **Should (debería)** | RF18, RF19, RF22, RF23, RNF06 |
| **Could (podría)** | RF24, drag & drop en carga, gráficos avanzados |
| **Won't (no se hará)** | OCR de manuscritos, multi-idioma, firma electrónica, workflows de aprobación, versión móvil nativa |

---

## 12. Matriz de trazabilidad inicial

| RF | Historias de usuario | Casos de uso |
|----|----------------------|--------------|
| RF01 | HU01 | CU-01 |
| RF02 | HU02 | CU-02 |
| RF03 | HU02 | CU-02 |
| RF04 | HU03 | CU-03 |
| RF05 | HU04 | CU-04 |
| RF06 | HU04 | CU-04 |
| RF07 | HU04, HU10 | CU-04, CU-10 |
| RF08 | HU05 | CU-04 |
| RF09 | HU05 | CU-07 |
| RF10 | HU05 | CU-07 |
| RF11 | HU05 | CU-07 |
| RF12 | HU06 | CU-04 |
| RF13 | HU07 | CU-05 |
| RF14 | HU07 | CU-05 |
| RF15 | HU08 | CU-06 |
| RF16 | HU08 | CU-06 |
| RF17 | HU09 | CU-08 |
| RF18 | HU09 | CU-08 |
| RF19 | — | — |
| RF20 | HU04, HU10 | CU-04, CU-10 |
| RF21 | HU06 | CU-04 |
| RF22 | — | CU-09 |
| RF23 | HU10 | CU-10 |
| RF24 | HU09 | CU-08 |

---

## 13. Análisis de riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|--------------|---------|------------|
| R01 | Límites de la API de IA (rate limits) durante procesamiento masivo de los 30 documentos de prueba. | Media | Alto | Procesar en lotes pequeños; reintentos con backoff; registrar errores por documento. |
| R02 | Costos de la API de OpenAI (tokens de entrada/salida + embeddings). | Media | Medio | Usar modelo ligero (gpt-4o-mini), embeddings text-embedding-3-small, chunking para no enviar textos gigantes, límites de tamaño de archivo. |
| R03 | Tiempo insuficiente para completar todos los entregables de la semana. | Media | Alto | Plan día a día, priorizar flujo de IA real sobre UI, entregables mínimos por día. |
| R04 | PDF escaneados sin capa de texto no dan resultado de extracción (0 páginas con texto). | Alta | Medio | Documentar como exclusión (no OCR); marcar documento en error con mensaje claro. |
| R05 | Disponibilidad de MongoDB Atlas (interrupción del proveedor). | Baja | Medio | Atlas tiene alta disponibilidad y respaldo automático; conexión con retry; documentar respaldo (export/restore). |
| R06 | Dependencia de claves/credenciales mal manejadas (fuga de API key). | Media | Alto | Variables de entorno, .gitignore, rotación de key, nunca subir .env. |
| R07 | Chunks muy largos degradan calidad del RAG y aumentan costo. | Media | Medio | Definir chunking fijo (≈ 1500 caracteres con solape) y límite de fragmentos por consulta. |
| R08 | Curva de aprendizaje de Atlas Vector Search. | Media | Medio | Uso de índice de vector simple, documentación paso a paso del índice. |

---

*Fin del documento 01.*