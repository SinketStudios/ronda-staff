# Plan Automatizaciones Ronda Staff

## Objetivo

Crear una seccion en `ronda-staff` para gestionar automatizaciones visuales tipo n8n, empezando por el caso de uso "Digitaliza tu carta con IA".

La interfaz visual vive en `ronda-staff`. La ejecucion real, llamadas a IA, jobs en segundo plano y persistencia viven en `ronda-api`.

## Estado actual

- Ruta inicial creada: `/automations`.
- Añadida entrada al sidebar: `Automatizaciones`.
- Pantalla actual:
  - Header con descripcion.
  - Boton `Crear automatizacion`.
  - Contadores.
  - Buscador.
  - Lista de automatizaciones en memoria.
  - Estado vacio.
- Todavia no hay persistencia, canvas de nodos ni integracion con API.

## Arquitectura propuesta

```txt
ronda-staff
  Editor visual
  Lista de automatizaciones
  Configuracion de nodos y prompts
  Previsualizacion de resultados

ronda-api web
  CRUD de workflows
  Crea ejecuciones
  Consulta estado y output
  Valida permisos

ronda-api worker
  Consume jobs
  Ejecuta nodos
  Llama a IA
  Guarda logs y resultados

Redis
  Cola BullMQ
  Reintentos
  Progreso temporal

Postgres
  Workflows
  Runs
  Logs
  Outputs persistidos
```

## Servicios en Railway

- `ronda-api-web`: proceso HTTP Nest.
- `ronda-api-worker`: mismo repo, otro start command para workers.
- `Redis`: cola BullMQ.
- `Postgres`: base actual.

El worker no debe correr dentro del proceso HTTP en produccion.

## Modelo de datos inicial

```txt
AutomationWorkflow
- id
- restaurantId nullable
- name
- description
- status: draft | active | paused
- nodes JSON
- edges JSON
- createdByStaffId
- createdAt
- updatedAt

AutomationRun
- id
- workflowId
- status: queued | running | succeeded | failed
- input JSON
- output JSON
- error nullable
- startedAt nullable
- finishedAt nullable
- createdAt

AutomationRunLog
- id
- runId
- nodeId nullable
- level: info | warn | error
- message
- data JSON nullable
- createdAt
```

## Nodos iniciales

Para no construir un n8n enorme desde el principio:

- `manual-trigger`: dispara workflow manualmente.
- `file-upload`: recibe PDF/imagen.
- `extract-document`: obtiene texto o paginas.
- `ai-prompt`: prompt editable + schema fijo.
- `validate-json`: valida salida esperada.
- `preview-menu`: genera preview de categorias/productos.
- `commit-products`: crea categorias/productos al confirmar.

## Caso de uso: Digitaliza tu carta con IA

Workflow base:

```txt
manual/file upload
-> extract-document
-> ai-prompt
-> validate-json
-> preview-menu
-> commit-products
```

Salida esperada del nodo IA:

```json
{
  "categories": [
    {
      "name": "Entrantes",
      "products": [
        {
          "name": "Bravas",
          "description": "",
          "priceCents": 650
        }
      ]
    }
  ]
}
```

El prompt puede ser editable, pero el schema de salida debe ser fijo para que el sistema no sea fragil.

## Fases

### Fase 1: CRUD basico

- Crear entidades en `ronda-api`.
- Endpoints:
  - `GET /staff/automations`
  - `POST /staff/automations`
  - `GET /staff/automations/:id`
  - `PATCH /staff/automations/:id`
  - `DELETE /staff/automations/:id`
- Conectar `/automations` a API.
- Crear pantalla de detalle simple.

### Fase 2: Canvas

- Instalar `reactflow` o `@xyflow/react` en `ronda-staff`.
- Crear editor visual:
  - panel de nodos
  - canvas
  - panel derecho de propiedades
  - guardado de `nodes` y `edges`
- Empezar con nodos estaticos, sin ejecucion real.

### Fase 3: Worker y Redis

- Añadir Redis a Railway.
- Añadir BullMQ a `ronda-api`.
- Crear servicio worker.
- Endpoint:
  - `POST /staff/automations/:id/run`
  - `GET /staff/automation-runs/:runId`
- Guardar logs por nodo.

### Fase 4: Digitaliza carta

- Endpoint de upload de archivo.
- Nodo `extract-document`.
- Nodo `ai-prompt` con OpenAI desde backend.
- Preview editable.
- Commit de categorias/productos.

## Decisiones tecnicas

- No reutilizar n8n como codigo base por licencia y peso tecnico.
- Construir version propia enfocada a Ronda.
- `ronda-staff` no debe contener API keys.
- `ronda-api` es quien llama a proveedores IA.
- Redis/BullMQ solo para ejecuciones asincronas.
- Postgres conserva la verdad del workflow y resultados finales.

## Proximo paso recomendado

1. Conectar la ruta `/automations` a datos reales de `ronda-api`.
2. Crear tabla `AutomationWorkflow`.
3. Implementar CRUD staff.
4. Sustituir el listado en memoria por API.
5. Despues construir el detalle/canvas.
