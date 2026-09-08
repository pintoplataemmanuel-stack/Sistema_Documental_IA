# Documento 06 — Manual de Usuario

**Proyecto:** Sistema Inteligente de Gestión y Análisis Documental
**Versión:** 1.0
**Fecha:** 8 de septiembre de 2026
**Estado:** Final

---

## 1. Acceso al sistema

1. Abre tu navegador (Chrome, Edge o Firefox).
2. Escribe la dirección: **https://sistema-documental-ia.vercel.app**
3. Se mostrará la pantalla de inicio de sesión.

---

## 2. Registro de usuario

Si es tu primera vez:

1. Haz clic en **"¿No tienes cuenta? Regístrate"** en la pantalla de login.
2. Completa el formulario:
   - **Nombre:** tu nombre completo.
   - **Correo electrónico:** un correo válido (será tu usuario).
   - **Contraseña:** mínimo 8 caracteres.
3. Haz clic en **"Registrarse"**.
4. Serás redirigido automáticamente al **Dashboard**.

> Si el correo ya está registrado, verás un mensaje de error indicándolo.

---

## 3. Inicio de sesión

1. Ingresa tu **correo** y **contraseña**.
2. Haz clic en **"Iniciar sesión"**.
3. Si las credenciales son correctas, accederás al **Dashboard**.

> Si la contraseña es incorrecta, verás "Correo o contraseña inválidos".

---

## 4. Dashboard (panel principal)

Al iniciar sesión, verás el panel principal con:

- **Total de documentos** procesados.
- **Documentos por categoría** (Contrato, Factura, Reporte, Otro).
- **Estado de procesamiento** (completados, pendientes, con error).
- **Documentos recientes** con acceso rápido al detalle.
- **Chat RAG** integrado: escribe una pregunta y obtén respuestas basadas en tus documentos.

---

## 5. Crear un repositorio

Los repositorios son carpetas para organizar tus documentos:

1. Navega a **Repositorios** (menú lateral).
2. Haz clic en **"Nuevo repositorio"**.
3. Escribe un **nombre** y una **descripción** (opcional).
4. Haz clic en **"Crear"**.
5. El repositorio aparecerá en la lista de tarjetas.

---

## 6. Subir documentos

1. Haz clic en un **repositorio** para abrir su detalle.
2. Haz clic en **"Subir documento"**.
3. Selecciona un archivo de tu computador.
   - **Formatos admitidos:** PDF, DOCX, TXT.
   - **Tamaño máximo:** 10 MB.
4. El sistema validará el tipo y tamaño del archivo.
5. Si es válido, el documento aparecerá en la lista con estado **"pendiente"**.

> Los archivos con extensión no permitida (como .exe o .jpg) serán rechazados
> con un mensaje claro.

---

## 7. Procesamiento automático con IA

Una vez subido, el sistema procesa automáticamente el documento:

1. **Extracción de texto:** lee el contenido del PDF, DOCX o TXT.
2. **Clasificación:** lo clasifica como Contrato, Factura, Reporte u Otro.
3. **Resumen:** genera un resumen de 3-5 líneas.
4. **Extracción de datos:** obtiene campos clave (fechas, montos, partes, etc.).
5. **Generación de embeddings:** crea vectores semánticos para búsqueda inteligente.

El proceso tarda entre **10 y 30 segundos** dependiendo del tamaño del documento.

---

## 8. Ver el análisis de un documento

1. Haz clic en un **documento** procesado.
2. Verás:
   - **Categoría** asignada (Contrato, Factura, Reporte u Otro).
   - **Resumen** del contenido.
   - **Datos extraídos** (fechas, montos, partes, objeto, etc.).
   - **Texto completo** extraído.
   - **Número de fragmentos** generados para búsqueda semántica.
3. Puedes **descargar** el archivo original con el botón de descarga.

---

## 9. Buscar documentos

1. Navega a **Búsqueda** (menú lateral o enlace en el topbar).
2. Escribe un **término de búsqueda** (nombre, palabra clave o consulta semántica).
3. Haz clic en **"Buscar"**.
4. Se mostrarán los **fragmentos relevantes** de los documentos coincidentes, con:
   - Nombre del documento.
   - Categoría.
   - Fragmento de texto encontrado.
   - Score de relevancia.

La búsqueda es **semántica**: no solo busca palabras exactas, sino que
encuentra documentos con significado similar al de tu consulta.

---

## 10. Chat con tus documentos (RAG)

1. Navega a **Búsqueda** o usa el widget del Dashboard.
2. Escribe una **pregunta** en lenguaje natural, por ejemplo:
   - "¿Cuál es el monto total de las facturas?"
   - "¿Qué dice el contrato con el proveedor?"
   - "Resume los reportes de este trimestre".
3. Haz clic en **"Enviar"** o presiona Enter.
4. El sistema responderá con información basada **únicamente** en tus documentos,
   indicando **de qué documentos** extrajo la respuesta.

---

## 11. Eliminar un documento

1. Abre el **detalle del documento**.
2. Haz clic en **"Eliminar"**.
3. Confirma la eliminación.
4. El documento y su archivo serán eliminados permanentemente.

> Solo el propietario del documento o un administrador pueden eliminarlo.

---

## 12. Cerrar sesión

Haz clic en **"Cerrar sesión"** en el menú lateral o en el topbar. Tu sesión
finalizará y serás redirigido a la pantalla de login.

---

## 13. Tips y notas

- **El chat RAG** es más útil cuanto más documentos tengas procesados.
- **Los formatos admitidos** son PDF (texto digital), DOCX y TXT. Los PDF
  escaneados (imágenes) no se pueden procesar (no hay OCR).
- **Si un documento falla** al procesarse, aparecerá con estado "error" y podrás
  reintentar.
- **La búsqueda semántica** funciona mejor con preguntas específicas basadas
  en el contenido de tus documentos.

---

*Fin del manual de usuario.*
