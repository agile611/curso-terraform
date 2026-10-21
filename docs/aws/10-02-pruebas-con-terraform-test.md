# Pruebas con `terraform test` y LocalStack

`terraform test` permite comprobar el comportamiento de una configuración Terraform mediante planes, aplicaciones y aserciones escritas en HCL.

Su utilidad va más allá de confirmar que una configuración es válida.

Puedes verificar contratos de entrada y salida, comprobar atributos calculados y demostrar que ciertas entradas se rechazan.

También puedes crear infraestructura temporal, actualizarla y comprobar que conserva su identidad.

En esta lección construirás un módulo de mensajería con una cola SQS y una cola de mensajes fallidos.

Después ejecutarás pruebas de planificación y aplicación contra LocalStack, sin utilizar una cuenta real de AWS.

Las sesiones incluyen resultados esperados, diagnóstico de fallos, aislamiento de ejecuciones y comprobación de limpieza.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Las pruebas con `command = apply` crean recursos.
>
> Terraform intenta limpiarlos al finalizar, pero debes comprobar el resultado.
>
> Una prueba correcta en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección convierte los contratos de un módulo en pruebas ejecutables.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Organizar archivos `.tftest.hcl`.
- Diferenciar ejecuciones de plan y aplicación.
- Escribir aserciones con mensajes útiles.
- Probar rechazos mediante `expect_failures`.
- Utilizar resultados de ejecuciones anteriores.
- Comprobar actualizaciones sin reemplazo.
- Ejecutar pruebas de forma aislada.
- Investigar recursos pendientes de limpieza.

### 1.2. Resultado práctico

Crearás y probarás un módulo SQS con una cola principal y una DLQ.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, estado y mensajería SQS.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

### 2.3. Lecciones recomendadas

Revisa validaciones, estrategia de pruebas y protección del estado.

---

## 3. Compatibilidad obligatoria

El docente debe validar el recorrido completo antes de distribuir la práctica.

### 3.1. Operaciones necesarias

Comprueba:

- Creación de colas SQS.
- Configuración de `redrive_policy`.
- Lectura de ARN y URL.
- Actualización de visibilidad.
- Ejecución de `terraform test`.
- Rechazos mediante validaciones.
- Destrucción de recursos de prueba.

### 3.2. Registro del entorno

Documenta versiones, edición e imagen o digest de LocalStack.

### 3.3. Regla principal

**Las capacidades del emulador y las del framework de pruebas deben comprobarse por separado.**

---

## 4. Qué es `terraform test`

El comando ejecuta archivos de prueba asociados a una configuración Terraform.

### 4.1. Componentes principales

Encontrarás:

- Archivos `.tftest.hcl`.
- Bloques `run`.
- Variables de prueba.
- Aserciones.
- Rechazos esperados.
- Estados temporales de prueba.

### 4.2. Alcance

Puede ejecutar planes o crear infraestructura mediante aplicaciones.

### 4.3. Regla

No presupongas que una prueba es inocua porque su archivo termina en `.tftest.hcl`.

---

## 5. Qué no es `terraform test`

La herramienta no sustituye todas las comprobaciones de infraestructura.

### 5.1. No demuestra automáticamente

- Seguridad completa de IAM.
- Cifrado físico del almacenamiento.
- Procesamiento correcto de aplicaciones.
- Ausencia de mensajes duplicados.
- Rendimiento equivalente a AWS.
- Disponibilidad de sistemas externos.

### 5.2. Uso correcto

Comprueba propiedades concretas de configuración y aprovisionamiento.

### 5.3. Regla

Cada aserción debe corresponder a una propiedad que Terraform pueda observar.

---

## 6. Plan frente a aplicación

La elección determina qué información estará disponible y qué efectos tendrá la prueba.

### 6.1. Comparación

| **Comando** | **Crea recursos** | **Uso principal** |
|-------------|------------------|-------------------|
| `plan` | No aplica los cambios | Entradas y valores conocidos |
| `apply` | Sí, cuando corresponde | Resultados calculados y actualización |

Las pruebas de plan suelen ser más rápidas y menos costosas.

### 6.2. Precaución

Un plan puede consultar servicios mediante proveedores o data sources.

### 6.3. Regla

“No aplica cambios” no significa “no necesita conectividad”.

---

## 7. Sintaxis mínima

Una ejecución necesita un nombre y puede contener aserciones.

### 7.1. Ejemplo conceptual

```hcl
run "contract_plan" {
  command = plan

  assert {
    condition     = output.contract.version == 1
    error_message = "El contrato debe publicar la versión 1."
  }
}
```

### 7.2. Comando explícito

En esta página siempre declararemos `command`.

### 7.3. Motivo

El comportamiento predeterminado de un bloque `run` es aplicar.

---

## 8. Archivos de prueba

Terraform busca archivos con extensiones específicas.

### 8.1. Organización habitual

```text
app/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── 01-contract.tftest.hcl
    └── 02-lifecycle.tftest.hcl
```

### 8.2. Extensiones

Utilizaremos `.tftest.hcl`.

También existe una representación JSON compatible.

### 8.3. Regla

No confundas un archivo de prueba con un archivo `.tf` de la configuración principal.

---

## 9. Aserciones

Una aserción compara una condición booleana con el resultado esperado.

### 9.1. Partes

La condición expresa la propiedad.

El mensaje explica la discrepancia.

### 9.2. Buen diseño

Comprueba un contrato significativo.

Evita aserciones que solo repiten una constante sin observar infraestructura.

### 9.3. Regla

Un mensaje debe explicar qué falló sin revelar valores sensibles.

---

## 10. Resultados conocidos y desconocidos

Terraform no siempre conoce todos los atributos durante el plan.

### 10.1. Conocidos

El nombre solicitado y la visibilidad configurada suelen conocerse.

### 10.2. Calculados

El ARN y la URL pueden permanecer desconocidos hasta la aplicación.

### 10.3. Consecuencia

Una aserción de plan puede no disponer de información suficiente.

### 10.4. Regla

Comprueba resultados calculados mediante una ejecución de aplicación cuando sea necesario.

---

## 11. Estados de prueba

Terraform utiliza estados separados para administrar recursos creados por las pruebas.

### 11.1. Diferencia importante

El estado habitual del proyecto no administra automáticamente esos recursos temporales.

### 11.2. Dentro de un archivo

Las ejecuciones sobre la misma configuración pueden compartir el contexto de estado correspondiente.

### 11.3. Entre archivos

No debes tratar archivos independientes como una secuencia que comparte resultados automáticamente.

### 11.4. Regla

Agrupa creación y actualización relacionadas dentro del mismo archivo de prueba.

---

## 12. Limpieza automática

Terraform intenta destruir los recursos administrados por las pruebas al terminar.

### 12.1. Situaciones problemáticas

La limpieza puede fallar por:

- Interrupción del proceso.
- Indisponibilidad del emulador.
- Recursos adicionales externos al estado.
- Errores del proveedor.
- Permisos insuficientes.

### 12.2. Regla

Lee los mensajes finales y consulta el servicio antes de declarar el laboratorio limpio.

---

## 13. Arquitectura del módulo

El laboratorio representará un canal SQS con dos colas estándar.

### 13.1. Organización

```text
Productor
    │
    ▼
Cola principal
    │
    └── Política de redrive ──→ DLQ

Terraform test
    ├── Comprueba contrato
    ├── Crea recursos
    ├── Actualiza visibilidad
    └── Intenta destruir
```

### 13.2. Alcance

No implementaremos un consumidor permanente ni probaremos todavía el traslado funcional a la DLQ.

---

## 14. Contrato de entrada

El módulo recibirá identidad y configuración operacional.

### 14.1. Entradas previstas

| **Entrada** | **Propósito** | **Default** |
|-------------|---------------|-------------|
| `run_id` | Identificar una ejecución | Obligatorio |
| `visibility_seconds` | Visibilidad de recepción | 60 |
| `retention_seconds` | Retención de cola principal | 86400 |
| `max_receive_count` | Umbral de redrive | 3 |

Los nombres se derivarán del identificador.

### 14.2. Regla

El identificador debe permanecer estable durante creación y actualización de una misma prueba.

---

## 15. Contrato de salida

Las salidas permitirán comprobar identidad y configuración.

### 15.1. Información publicada

Expondremos:

- Versión del contrato.
- Nombre, URL y ARN de la cola principal.
- Nombre y ARN de la DLQ.
- Visibilidad.
- Retención.
- Política de redrive.

### 15.2. Regla

Publica identificadores y propiedades necesarias, no contenido de mensajes.

---

## 16. Preparación del directorio

Trabaja en una carpeta independiente.

### 16.1. Estructura

```bash
mkdir -p terraform-test-sqs/app/tests
mkdir -p terraform-test-sqs/modules/queue
mkdir -p terraform-test-sqs/scripts
mkdir -p terraform-test-sqs/resultados
mkdir -p terraform-test-sqs/copias
cd terraform-test-sqs
```

### 16.2. Ejecución

Los comandos se ejecutan desde esta raíz salvo indicación expresa.

### 16.3. Aislamiento

No copies estados ni directorios `.terraform` de otras prácticas.

---

## 17. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 17.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
resultados/
copias/
crash.log
```

### 17.2. Qué conservar

Versiona código, pruebas y `.terraform.lock.hcl`.

### 17.3. Precaución

Una salida verbose puede incluir información que no debes publicar indiscriminadamente.

---

## 18. Permisos locales

Reduce la exposición accidental de evidencias.

### 18.1. Preparación

```bash
umask 077
chmod 700 resultados copias
```

### 18.2. Alcance

Estas instrucciones utilizan permisos POSIX.

### 18.3. Otros sistemas

Configura ACL equivalentes mediante el procedimiento del docente.

### 18.4. Regla

Los permisos locales no constituyen una frontera frente al administrador del host.

---

## 19. Imagen validada

Selecciona una imagen reproducible de LocalStack.

### 19.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 19.2. Recomendación

Utiliza una etiqueta fija o un digest.

### 19.3. Servicios

La práctica necesita SQS.

### 19.4. Regla

No utilices una etiqueta flotante como única referencia del entorno validado.

---

## 20. Docker Compose

Publica LocalStack únicamente en la interfaz local.

### 20.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 20.2. Arranque

Ejecuta `docker compose up -d`.

### 20.3. Alcance

No necesitas montar el socket Docker.

---

## 21. Credenciales locales

Prepara la terminal antes de ejecutar herramientas AWS.

### 21.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SQS
unset TF_WORKSPACE TF_CLI_ARGS

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 21.2. Regla

No utilices endpoints AWS como fallback.

---

## 22. Identificador único

Cada ejecución necesita nombres que no colisionen con otras pruebas.

### 22.1. Generación

```bash
RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf '%s\n' "$RUN_ID" > resultados/run-id.txt
```

### 22.2. Uso

Pasaremos este valor a `terraform test` mediante `-var`.

### 22.3. Precaución

Una ejecución nueva debe utilizar otro identificador si existen recursos remanentes de la anterior.

### 22.4. Regla

Identifica y recupera los recursos anteriores; no los abandones cambiando únicamente el nombre.

---

## 23. Requisitos del módulo

Crea `modules/queue/versions.tf`.

### 23.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 23.2. Proveedor

El módulo heredará la configuración AWS desde la raíz.

---

## 24. Variables del módulo

Crea `modules/queue/variables.tf`.

### 24.1. Identidad y visibilidad

```hcl
variable "run_id" {
  type = string
}

variable "visibility_seconds" {
  type    = number
  default = 60

  validation {
    condition = (
      var.visibility_seconds >= 0 &&
      var.visibility_seconds <= 43200 &&
      floor(var.visibility_seconds) == var.visibility_seconds
    )
    error_message = "La visibilidad debe ser un entero entre 0 y 43200."
  }
}
```

### 24.2. Continuación

Añade las variables restantes al mismo archivo.

---

## 25. Retención y redrive

Completa `modules/queue/variables.tf`.

### 25.1. Declaraciones

```hcl
variable "retention_seconds" {
  type    = number
  default = 86400

  validation {
    condition = (
      var.retention_seconds >= 60 &&
      var.retention_seconds <= 1209600 &&
      floor(var.retention_seconds) == var.retention_seconds
    )
    error_message = "La retención debe ser un entero válido para SQS."
  }
}

variable "max_receive_count" {
  type    = number
  default = 3

  validation {
    condition = (
      var.max_receive_count >= 1 &&
      var.max_receive_count <= 1000 &&
      floor(var.max_receive_count) == var.max_receive_count
    )
    error_message = "max_receive_count debe ser un entero entre 1 y 1000."
  }
}
```

---

## 26. Recursos del módulo

Crea `modules/queue/main.tf`.

### 26.1. Colas estándar

```hcl
locals {
  prefix = "curso-tftest-${var.run_id}"
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${local.prefix}-dlq"
  message_retention_seconds = 1209600

  tags = {
    Laboratory = "LocalStack"
    Role       = "DLQ"
  }
}

resource "aws_sqs_queue" "main" {
  name                       = "${local.prefix}-main"
  visibility_timeout_seconds = var.visibility_seconds
  message_retention_seconds  = var.retention_seconds

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = {
    Laboratory = "LocalStack"
    Role       = "Main"
  }
}
```

---

## 27. Outputs del módulo

Crea `modules/queue/outputs.tf`.

### 27.1. Contrato público

```hcl
output "contract" {
  value = {
    version            = 1
    queue_name         = aws_sqs_queue.main.name
    queue_url          = aws_sqs_queue.main.id
    queue_arn          = aws_sqs_queue.main.arn
    dlq_name           = aws_sqs_queue.dlq.name
    dlq_arn            = aws_sqs_queue.dlq.arn
    visibility_seconds = aws_sqs_queue.main.visibility_timeout_seconds
    retention_seconds  = aws_sqs_queue.main.message_retention_seconds
    redrive_policy     = aws_sqs_queue.main.redrive_policy
  }
}
```

### 27.2. Alcance

La salida representa información administrada y publicada por el proveedor.

---

## 28. Requisitos raíz

Crea `app/versions.tf`.

### 28.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 28.2. Estado normal

El backend se declara para el uso habitual del proyecto.

### 28.3. Regla

No confundas ese estado con los estados temporales de las pruebas.

---

## 29. Proveedor raíz

Crea `app/providers.tf`.

### 29.1. Configuración exclusivamente local

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 29.2. Regla

Las pruebas de esta página utilizan proveedores reales contra el emulador, no mocks.

---

## 30. Variables raíz

Crea `app/variables.tf`.

### 30.1. Identidad y configuración

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{8,16}$", var.run_id))
    error_message = "run_id debe tener entre 8 y 16 caracteres alfanuméricos en minúsculas."
  }
}

variable "visibility_seconds" {
  type    = number
  default = 60
}

variable "retention_seconds" {
  type    = number
  default = 86400
}

variable "max_receive_count" {
  type    = number
  default = 3
}
```

---

## 31. Composición raíz

Crea `app/main.tf` y `app/outputs.tf`.

### 31.1. Llamada

```hcl
module "queue" {
  source             = "../modules/queue"
  run_id             = var.run_id
  visibility_seconds = var.visibility_seconds
  retention_seconds  = var.retention_seconds
  max_receive_count  = var.max_receive_count
}
```

### 31.2. Output raíz

```hcl
output "contract" {
  value = module.queue.contract
}
```

### 31.3. Regla

Las aserciones utilizarán el contrato raíz para evitar depender de direcciones internas del módulo.

---

## 32. Sesión 1: inicializar y validar

Duración orientativa: 20 minutos.

### 32.1. Secuencia

```bash
terraform -chdir=app init
terraform fmt -recursive
terraform fmt -check -diff -recursive
terraform -chdir=app validate

aws_local sqs list-queues
```

### 32.2. Resultado esperado

La configuración es consistente y LocalStack responde.

### 32.3. Precaución

`validate` no demuestra creación, actualización ni limpieza de las colas.

---

## 33. Prueba de contrato con plan

Crea `app/tests/01-contract.tftest.hcl`.

### 33.1. Valores conocidos

```hcl
run "defaults_plan" {
  command = plan

  assert {
    condition     = output.contract.version == 1
    error_message = "El contrato debe publicar la versión 1."
  }

  assert {
    condition     = output.contract.queue_name == "curso-tftest-${var.run_id}-main"
    error_message = "El nombre principal debe derivarse de run_id."
  }

  assert {
    condition     = output.contract.visibility_seconds == 60
    error_message = "La visibilidad predeterminada debe ser 60."
  }

  assert {
    condition     = output.contract.retention_seconds == 86400
    error_message = "La retención predeterminada debe ser 86400."
  }
}
```

---

## 34. Prueba negativa de identidad

Añade otra ejecución al mismo archivo.

### 34.1. Rechazo previsto

```hcl
run "reject_short_identifier" {
  command = plan

  variables {
    run_id = "a"
  }

  expect_failures = [var.run_id]
}
```

### 34.2. Interpretación

La prueba pasa cuando falla la validación de `run_id`.

### 34.3. Regla

`expect_failures` identifica objetos verificables, no mensajes de error arbitrarios del proveedor.

---

## 35. Alcance de `expect_failures`

Una prueba negativa debe fallar por la razón diseñada.

### 35.1. Qué puede comprobar

Rechazos de validaciones y condiciones compatibles con el framework.

### 35.2. Qué no debe utilizarse como atajo

Errores de red.

Binarios ausentes.

Endpoints incorrectos.

Fallos inesperados del proveedor.

### 35.3. Regla

Un diagnóstico adicional no esperado puede hacer fallar toda la ejecución.

---

## 36. Sesión 2: ejecutar solo contrato

La opción `-filter` permite seleccionar un archivo de pruebas.

### 36.1. Comando

```bash
terraform -chdir=app test \
  -filter=tests/01-contract.tftest.hcl \
  -var="run_id=${RUN_ID}"
```

### 36.2. Resultado esperado

Las dos ejecuciones pasan.

No se aplican los recursos.

### 36.3. Verificación

Consulta `aws_local sqs list-queues` para comprobar el inventario.

### 36.4. Regla

No interpretes esta sesión como una prueba de creación.

---

## 37. Archivo de ciclo de vida

Crea `app/tests/02-lifecycle.tftest.hcl`.

### 37.1. Creación inicial

```hcl
run "initial_apply" {
  command = apply

  variables {
    visibility_seconds = 60
  }

  assert {
    condition     = length(output.contract.queue_url) > 0
    error_message = "La cola principal debe publicar una URL."
  }

  assert {
    condition     = output.contract.queue_arn != output.contract.dlq_arn
    error_message = "La cola principal y la DLQ deben tener ARN diferentes."
  }

  assert {
    condition = endswith(
      output.contract.queue_arn,
      ":${output.contract.queue_name}"
    )
    error_message = "El ARN principal debe corresponder a su nombre."
  }
}
```

---

## 38. Comprobar la política de redrive

Añade las siguientes aserciones dentro de `initial_apply`, antes de su llave final.

### 38.1. Comparación estructurada

```hcl
  assert {
    condition = (
      jsondecode(output.contract.redrive_policy).deadLetterTargetArn
      == output.contract.dlq_arn
    )
    error_message = "La política de redrive debe apuntar a la DLQ creada."
  }

  assert {
    condition = (
      tonumber(jsondecode(output.contract.redrive_policy).maxReceiveCount)
      == 3
    )
    error_message = "El umbral de redrive debe ser 3."
  }
```

### 38.2. Regla

Compara JSON decodificado, no cadenas cuya ordenación de campos puede variar.

---

## 39. Prueba de actualización

Añade otra ejecución al archivo de ciclo de vida.

### 39.1. Cambiar visibilidad sin cambiar identidad

```hcl
run "updated_apply" {
  command = apply

  variables {
    visibility_seconds = 120
  }

  assert {
    condition     = output.contract.visibility_seconds == 120
    error_message = "La actualización debe publicar visibilidad 120."
  }

  assert {
    condition = (
      output.contract.queue_arn
      == run.initial_apply.contract.queue_arn
    )
    error_message = "Actualizar visibilidad no debe cambiar el ARN principal."
  }

  assert {
    condition = (
      output.contract.dlq_arn
      == run.initial_apply.contract.dlq_arn
    )
    error_message = "La actualización no debe reemplazar la DLQ."
  }
}
```

---

## 40. Referencias a ejecuciones anteriores

La expresión `run.initial_apply.contract` utiliza un output de una ejecución anterior.

### 40.1. Sintaxis

```text
run.<nombre_de_ejecución>.<nombre_de_output>
```

### 40.2. Uso

Permite comparar identidad y resultados entre pasos relacionados.

### 40.3. Límite

No referencia automáticamente ejecuciones de otros archivos.

### 40.4. Regla

Mantén las dependencias de resultados dentro de una secuencia explícita.

---

## 41. Plan posterior a la actualización

Añade la última ejecución al archivo de ciclo de vida.

### 41.1. Contrato actualizado

```hcl
run "updated_contract_plan" {
  command = plan

  variables {
    visibility_seconds = 120
  }

  assert {
    condition     = output.contract.visibility_seconds == 120
    error_message = "El plan posterior debe conservar la visibilidad actualizada."
  }

  assert {
    condition = (
      output.contract.queue_name
      == run.initial_apply.contract.queue_name
    )
    error_message = "El nombre debe permanecer estable."
  }
}
```

### 41.2. Límite

Estas aserciones no inspeccionan por sí solas todas las acciones del plan.

---

## 42. Sesión 3: ejecutar ciclo de vida

La prueba crea, actualiza y posteriormente intenta destruir las colas.

### 42.1. Comando

```bash
terraform -chdir=app test \
  -filter=tests/02-lifecycle.tftest.hcl \
  -var="run_id=${RUN_ID}"
```

### 42.2. Resultado esperado

Las tres ejecuciones pasan.

Terraform intenta eliminar ambos recursos al finalizar.

### 42.3. Regla

Espera el final completo del comando antes de verificar ausencia.

### 42.4. Seguridad

No detengas LocalStack durante la limpieza.

---

## 43. Sesión 4: ejecutar toda la suite

La suite combina pruebas de plan y aplicación.

### 43.1. Comando

```bash
terraform -chdir=app test \
  -var="run_id=${RUN_ID}"
```

### 43.2. Resultado esperado

Cinco ejecuciones pasan entre ambos archivos.

### 43.3. Precaución

El primer archivo no crea recursos; el segundo sí.

### 43.4. Regla

No dependas de compartir estado entre estos archivos.

---

## 44. Salida verbose

La opción verbose ayuda a inspeccionar planes y estados de ejecuciones.

### 44.1. Captura protegida

```bash
terraform -chdir=app test \
  -filter=tests/02-lifecycle.tftest.hcl \
  -var="run_id=${RUN_ID}" \
  -verbose \
  > resultados/lifecycle-verbose.txt
```

### 44.2. Uso

Revisa cambios de visibilidad y atributos de identidad.

### 44.3. Precaución

La salida puede contener información operacional sensible.

### 44.4. Regla

Revisa antes de compartir; no adjuntes el archivo completo rutinariamente.

---

## 45. Salida JSON

El formato JSON facilita procesar resultados mediante herramientas.

### 45.1. Comando

```bash
terraform -chdir=app test \
  -filter=tests/01-contract.tftest.hcl \
  -var="run_id=${RUN_ID}" \
  -json \
  > resultados/contract-events.jsonl
```

### 45.2. Formato

La salida contiene eventos JSON emitidos durante la ejecución.

### 45.3. Regla

No la trates automáticamente como un único documento JSON ni como un estado Terraform.

---

## 46. Códigos de salida

La automatización debe registrar éxito y fallo sin perder diagnósticos.

### 46.1. Captura Bash

```bash
set +e
terraform -chdir=app test -var="run_id=${RUN_ID}" \
  > resultados/suite.stdout.txt \
  2> resultados/suite.stderr.txt
CODE=$?
set -e

printf '%s\n' "$CODE" > resultados/suite.exit.txt
```

### 46.2. Interpretación

Código cero indica que el comando terminó correctamente.

Un código no nulo requiere revisar pruebas y limpieza.

### 46.3. Regla

No clasifiques todos los errores como aserciones fallidas.

---

## 47. Sesión 5: introducir una aserción incorrecta

La prueba negativa del framework debe ser reversible y no crear recursos adicionales.

### 47.1. Ejercicio

Cambia temporalmente la expectativa de visibilidad en `defaults_plan` de 60 a 61.

Ejecuta únicamente el archivo de contrato.

### 47.2. Resultado esperado

La aserción falla con su mensaje.

### 47.3. Recuperación

Restaura la expectativa a 60 y repite.

### 47.4. Regla

Un test solo es útil si también demuestra que detecta una discrepancia.

---

## 48. Proveedores dentro de pruebas

Los archivos de prueba pueden declarar configuraciones de proveedores.

### 48.1. Uso posible

Una suite puede utilizar un proveedor local específico y asignarlo mediante `providers`.

### 48.2. Decisión del laboratorio

Utilizamos la configuración raíz local para reducir duplicación.

### 48.3. Riesgo

Un alias o proveedor añadido puede conservar otro destino.

### 48.4. Regla

Revisa todas las configuraciones de proveedores utilizadas por las pruebas.

---

## 49. Configuración alternativa y helpers

Un bloque `module` dentro de `run` permite probar otra configuración.

### 49.1. Aplicación

Puede utilizarse para módulos auxiliares de observación o ejemplos de composición.

### 49.2. Diferencia

Cambiar la configuración bajo prueba introduce otro contexto de estado.

### 49.3. Laboratorio

No utilizamos helpers con recursos para mantener clara la secuencia de creación y actualización.

### 49.4. Regla

No presupongas que todos los bloques `run` comparten el mismo estado si prueban configuraciones distintas.

---

## 50. Mocks y versiones posteriores

Las pruebas con mocks pertenecen a capacidades adicionales del framework.

### 50.1. Compatibilidad

El soporte de proveedores simulados se incorporó en Terraform 1.7.

### 50.2. Diferencia

Un mock permite comprobar lógica sin ejecutar operaciones reales del proveedor.

LocalStack ejecuta operaciones contra un servicio emulado.

### 50.3. Regla

No denomines mock al proveedor AWS configurado contra LocalStack.

### 50.4. Alcance

Esta página es compatible con Terraform 1.6 y no utiliza mocks.

---

## 51. Pruebas funcionales fuera del framework

Las aserciones actuales comprueban configuración, creación e identidad.

### 51.1. Lo que falta

Enviar y recibir mensajes.

Confirmar procesamiento.

Observar movimiento a DLQ.

Comprobar comportamiento de consumidores.

### 51.2. Diseño

Añade pruebas funcionales separadas con identificadores únicos y tiempos acotados.

### 51.3. Regla

Una política de redrive correcta no demuestra que un mensaje haya llegado a la DLQ.

---

## 52. Verificación de limpieza mediante AWS CLI

Consulta el servicio usando el prefijo de la ejecución.

### 52.1. Comando

```bash
aws_local sqs list-queues \
  --queue-name-prefix "curso-tftest-${RUN_ID}-" \
  > resultados/queues-after-test.json
```

### 52.2. Expectativa

No aparecen URLs de las colas creadas por la prueba.

### 52.3. Precaución

La ausencia solo es evidencia válida si la consulta terminó correctamente.

### 52.4. Regla

Un error de red no demuestra eliminación.

---

## 53. Script de comprobación de ausencia

Crea `scripts/check-cleanup.py`.

### 53.1. Implementación

```python
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "resultados" / "queues-after-test.json"

try:
    response = json.loads(path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError):
    raise SystemExit("No existe una respuesta válida de inventario.")

queues = response.get("QueueUrls", [])
if queues:
    print(json.dumps({
        "cleanup_verified": False,
        "remaining_queue_count": len(queues),
    }))
    sys.exit(1)

print(json.dumps({"cleanup_verified": True}))
```

### 53.2. Ejecución

Ejecuta el script después de una consulta AWS CLI correcta.

---

## 54. Recuperación de recursos remanentes

La recuperación debe conservar la relación entre recurso y contexto de prueba.

### 54.1. Procedimiento

Lee los mensajes de Terraform sobre recursos no destruidos.

Identifica el estado o mecanismo de recuperación indicado.

Restablece LocalStack si estuvo indisponible.

Ejecuta la limpieza conforme al diagnóstico.

Consulta nuevamente el prefijo concreto.

### 54.2. Regla

No ejecutes `terraform destroy` sobre el estado habitual suponiendo que administra los recursos de test.

---

## 55. Interrupciones y cancelación

Una interrupción puede impedir que la limpieza termine.

### 55.1. Buenas prácticas

Deja finalizar el comando normalmente.

Si necesitas cancelar, permite que Terraform gestione la interrupción.

Evita terminar abruptamente el proceso o detener Docker.

### 55.2. Después

Investiga recursos remanentes y conserva diagnósticos.

### 55.3. Regla

No repitas la suite con el mismo identificador hasta conocer el resultado anterior.

---

## 56. Aislamiento y concurrencia

La paralelización requiere más que generar nombres diferentes.

### 56.1. Controles necesarios

Directorios de ejecución independientes.

Identificadores únicos.

Ausencia de estados compartidos accidentalmente.

Limpieza asociada a cada ejecución.

### 56.2. Versiones

Las capacidades de paralelismo del framework dependen de la versión utilizada.

### 56.3. Regla

Esta práctica utiliza ejecución secuencial y no presupone funciones posteriores al mínimo establecido.

---

## 57. Buenas prácticas de diseño

Una suite debe ser comprensible, rápida y capaz de detectar regresiones.

### 57.1. Recomendaciones

Usa nombres que describan el comportamiento.

Comprueba defaults importantes.

Incluye entradas inválidas.

Compara objetos estructurados en lugar de texto serializado.

Prueba actualizaciones relevantes.

Revisa limpieza y tiempos de ejecución.

### 57.2. Regla

Evita acoplar todas las pruebas a direcciones internas si puedes observar un contrato público estable.

---

## 58. Integración en CI

El mismo procedimiento puede ejecutarse en un entorno gestionado.

### 58.1. Secuencia recomendada

Instalar herramientas fijadas.

Arrancar LocalStack validado.

Esperar disponibilidad.

Ejecutar formato y validación.

Ejecutar pruebas con identificador único.

Verificar limpieza.

Conservar un resumen revisado.

### 58.2. Regla

La fase LocalStack no necesita credenciales AWS reales.

---

## 59. Cierre del laboratorio

El cierre debe comprobar recursos antes de detener el emulador.

### 59.1. Secuencia

```bash
aws_local sqs list-queues \
  --queue-name-prefix "curso-tftest-${RUN_ID}-" \
  > resultados/queues-after-test.json

python3 scripts/check-cleanup.py

docker compose down
```

### 59.2. Artefactos

Revisa informes, archivos temporales de recuperación y posibles estados conservados.

### 59.3. Regla

No borres evidencias necesarias para recuperar recursos todavía existentes.

---

## 60. Diferencias respecto a AWS real

La emulación permite probar determinadas propiedades sin costes de una cuenta AWS.

### 60.1. Aspectos adicionales

IAM efectivo, KMS, auditoría y cuotas.

Tiempos de propagación y fallos de red.

Disponibilidad, rendimiento y resiliencia.

Comportamiento completo de DLQ y consumidores.

### 60.2. Regla

Una suite local correcta necesita complementos antes de certificar un despliegue de producción.

---

## 61. Ejercicios y evaluación

La evaluación debe demostrar pruebas positivas, negativas y limpieza.

### 61.1. Ejercicios

1. Añade una aserción para el nombre de la DLQ.
2. Comprueba el ARN de ambas colas.
3. Introduce una expectativa incorrecta y restaúrala.
4. Añade un plan con visibilidad 90.
5. Comprueba conservación de URL durante actualización.
6. Documenta una limpieza fallida y su recuperación.
7. Explica la diferencia entre mock y LocalStack.
8. Diseña una prueba funcional de redrive sin ejecutarla todavía.

### 61.2. Entrega

Incluye código, versiones y resultados resumidos; excluye estados y diagnósticos sensibles completos.

---

## 62. Resumen de la lección

`terraform test` permite convertir contratos de infraestructura en comprobaciones reproducibles.

### 62.1. Ideas esenciales

Las pruebas de plan comprueban valores conocidos.

Las aplicaciones permiten observar atributos calculados.

`expect_failures` verifica rechazos concretos.

Las referencias a ejecuciones anteriores permiten comprobar actualizaciones.

Los estados de prueba no equivalen al estado habitual del proyecto.

La limpieza automática necesita verificación independiente.

### 62.2. Procedimiento recomendado

Prepara, valida, prueba el contrato, crea, actualiza, verifica identidad y comprueba limpieza.

### 62.3. Idea final

**Una suite fiable no solo demuestra que puede crear recursos: detecta entradas incorrectas, identifica regresiones y deja evidencias claras de que la infraestructura temporal ha sido eliminada.**