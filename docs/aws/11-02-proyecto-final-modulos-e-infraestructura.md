# Proyecto final: módulos e infraestructura con Terraform y LocalStack

La arquitectura del proyecto final necesita convertirse en una configuración Terraform comprensible, reproducible y verificable.

Separar recursos en módulos no consiste únicamente en distribuir archivos.

Cada módulo debe tener una responsabilidad clara, entradas documentadas y salidas que permitan conectar componentes sin depender de su implementación interna.

En esta lección construirás los módulos de almacenamiento, mensajería e integración del proyecto final.

La infraestructura utilizará S3, SNS y SQS, emulados mediante LocalStack.

También comprobarás contratos, relaciones entre recursos, actualizaciones y limpieza.

La implementación parte de un estado independiente y puede utilizarse como referencia para desarrollar tu entrega.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas datos personales ni secretos reales.
>
> Si ya tienes recursos de la lección anterior, no reutilices su estado sin planificar una migración.
>
> Una ejecución correcta en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección transforma la arquitectura acordada en módulos Terraform conectados.

### 1.1. Competencias

Al finalizar podrás:

- Definir responsabilidades de módulos.
- Diseñar entradas y salidas tipadas.
- Configurar proveedores desde la raíz.
- Establecer dependencias mediante referencias.
- Comprobar políticas y suscripciones.
- Actualizar atributos sin cambiar identidades.
- Destruir infraestructura sin perder su estado.

### 1.2. Resultado práctico

Crearás un bucket, un tópico, una cola principal, una DLQ y su integración.

---

## 2. Relación con la lección anterior

La arquitectura funcional se conserva, pero la organización del código evoluciona.

### 2.1. Separación utilizada

El almacenamiento pertenecerá a un módulo.

El tópico y las colas pertenecerán a otro.

Las políticas de entrega y la suscripción pertenecerán a un tercero.

### 2.2. Motivo

La integración tendrá un contrato explícito entre productor y destino.

### 2.3. Regla

Cambiar módulos puede cambiar direcciones de recursos aunque los nombres remotos permanezcan iguales.

---

## 3. Elección del modo de trabajo

Antes de escribir código, decide cómo continuar el proyecto.

### 3.1. Modo recomendado

Utiliza un directorio y un estado nuevos para esta práctica.

### 3.2. Continuación sobre infraestructura existente

Exige revisar direcciones, introducir movimientos cuando correspondan y comprobar un plan.

### 3.3. Precaución

No copies únicamente `terraform.tfstate` entre carpetas.

### 3.4. Regla

Esta página describe el modo independiente; la migración aparece como ejercicio específico.

---

## 4. Requisitos previos

Necesitas herramientas del curso y conocimientos de módulos, estado y servicios AWS.

### 4.1. Comprobación

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
git --version
```

### 4.2. Lecciones recomendadas

Revisa arquitectura final, validaciones, pruebas y aislamiento CI.

---

## 5. Versiones y compatibilidad

El docente debe identificar y comprobar las versiones distribuidas.

### 5.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

La raíz seleccionará el proveedor AWS de la serie 5.x.

Los módulos declararán compatibilidad con esa serie.

### 5.2. LocalStack

Selecciona una imagen fija validada y registra su edición.

### 5.3. Regla

**Una versión permitida por una restricción no equivale a una versión comprobada.**

---

## 6. Operaciones que deben validarse

El laboratorio depende de operaciones concretas del emulador.

### 6.1. Lista de comprobación

Valida:

- Creación y eliminación de buckets.
- Bloqueo público y cifrado S3 declarados.
- Creación de tópicos y colas.
- Configuración de redrive.
- Políticas de recepción.
- Suscripción, filtro y entrega raw.
- Actualización de visibilidad.

### 6.2. Evidencia

Conserva una matriz de capacidades para la imagen utilizada.

---

## 7. Arquitectura modular

La separación seguirá responsabilidades, no una regla de un módulo por recurso.

### 7.1. Diagrama

```text
Raíz app
├── module.storage
│   ├── Bucket
│   ├── Bloqueo público
│   └── Cifrado declarado
├── module.messaging
│   ├── Tópico SNS
│   ├── Cola principal
│   └── DLQ
└── module.integration
    ├── Política SQS
    └── Suscripción SNS → SQS
```

### 7.2. Regla

Los módulos deben poder entenderse sin leer toda la raíz.

---

## 8. Responsabilidades de cada módulo

La división debe facilitar composición, pruebas y mantenimiento.

### 8.1. Comparación

| **Módulo** | **Administra** | **Recibe** |
|------------|---------------|------------|
| `storage` | Almacenamiento y controles S3 | Nombre y etiquetas |
| `messaging` | Tópico, cola y DLQ | Prefijo y tiempos |
| `integration` | Entrega SNS a SQS | Referencias y filtro |

La raíz conecta sus contratos.

### 8.2. Regla

El módulo de integración no descubrirá recursos por nombres reconstruidos.

---

## 9. Qué significa un contrato de módulo

Un contrato describe entradas, salidas y restricciones observables.

### 9.1. Elementos

Incluye tipos, defaults y validaciones.

Explica relaciones entre valores.

Publica las referencias necesarias.

Documenta cambios incompatibles.

### 9.2. Evita

No publiques todos los atributos simplemente porque están disponibles.

### 9.3. Regla

Una salida estable permite cambiar detalles internos con menos impacto.

---

## 10. Preparación del repositorio

Trabaja en una carpeta independiente.

### 10.1. Directorios

```bash
mkdir -p terraform-final-modules/app/tests
mkdir -p terraform-final-modules/modules/storage
mkdir -p terraform-final-modules/modules/messaging
mkdir -p terraform-final-modules/modules/integration
mkdir -p terraform-final-modules/scripts
mkdir -p terraform-final-modules/docs
mkdir -p terraform-final-modules/resultados
mkdir -p terraform-final-modules/planes
mkdir -p terraform-final-modules/copias
cd terraform-final-modules
```

### 10.2. Ejecución

Los comandos se ejecutan desde esta raíz salvo indicación expresa.

---

## 11. Archivos versionables y operativos

El repositorio no debe convertirse en un almacén de estados.

### 11.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
resultados/
planes/
copias/
crash.log
```

### 11.2. Qué conservar

Versiona código, pruebas, documentación y archivos de bloqueo de las raíces utilizadas.

---

## 12. Permisos y datos ficticios

Los artefactos operativos necesitan acceso controlado.

### 12.1. Preparación

```bash
umask 077
chmod 700 resultados planes copias
```

### 12.2. Alcance

Estas instrucciones utilizan permisos POSIX.

Configura ACL equivalentes en otros sistemas.

### 12.3. Regla

No introduzcas información real en los documentos de prueba.

---

## 13. Imagen de LocalStack

Selecciona una referencia comprobada por el docente.

### 13.1. Configuración

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 13.2. Reproducibilidad

Prefiere una etiqueta fija o un digest.

### 13.3. Ediciones con licencia

Gestiona cualquier token necesario mediante un secreto dedicado.

### 13.4. Regla

El marcador debe sustituirse antes de distribuir el laboratorio.

---

## 14. Docker Compose

Publica el emulador únicamente en loopback.

### 14.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sns,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 14.2. Restricción

El puerto fijo exige ejecución local secuencial o runners aislados.

### 14.3. Alcance

No necesitas montar el socket Docker para estos servicios.

---

## 15. Contexto AWS exclusivamente local

Prepara la terminal antes de utilizar AWS CLI.

### 15.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3
unset AWS_ENDPOINT_URL_SNS AWS_ENDPOINT_URL_SQS
unset TF_WORKSPACE TF_CLI_ARGS

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 15.2. Regla

No utilices AWS real como fallback.

---

## 16. Identidad del despliegue

La identidad debe distinguir esta infraestructura de otras prácticas.

### 16.1. Generación

```bash
RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" > app/terraform.tfvars
printf '%s\n' "$RUN_ID" > resultados/run-id.txt
```

### 16.2. Estabilidad

Conserva el valor mientras existan recursos administrados.

### 16.3. Regla

No cambies nombres para evitar investigar una limpieza pendiente.

---

## 17. Requisitos compartidos de los módulos

Cada módulo debe declarar el proveedor que utiliza.

### 17.1. Archivo `versions.tf`

Crea este archivo en `storage`, `messaging` e `integration`:

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

### 17.2. Regla

Los módulos no incluirán bloques `provider "aws"` propios.

---

## 18. Almacenamiento: variables

Crea `modules/storage/variables.tf`.

### 18.1. Entradas

```hcl
variable "bucket_name" {
  description = "Nombre del bucket del proyecto."
  type        = string
  nullable    = false

  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
      var.bucket_name
    ))
    error_message = "Usa entre 3 y 63 caracteres alfanuméricos con guiones."
  }
}

variable "tags" {
  description = "Etiquetas adicionales."
  type        = map(string)
  default     = {}
}
```

### 18.2. Alcance

La convención utilizada no pretende reproducir toda la especificación de nombres S3.

---

## 19. Almacenamiento: bucket y controles públicos

Crea `modules/storage/main.tf`.

### 19.1. Recursos

```hcl
resource "aws_s3_bucket" "documents" {
  bucket        = var.bucket_name
  force_destroy = false
  tags          = var.tags
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 19.2. Decisión

`force_destroy = false` permite detectar objetos pendientes durante la limpieza.

---

## 20. Almacenamiento: cifrado declarado

Completa `modules/storage/main.tf`.

### 20.1. Configuración

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 20.2. Límite

La consulta local permite observar la configuración declarada.

### 20.3. Regla

No certifica cifrado físico equivalente al almacenamiento de AWS.

---

## 21. Almacenamiento: salida

Crea `modules/storage/outputs.tf`.

### 21.1. Contrato público

```hcl
output "contract" {
  description = "Referencias del almacenamiento."

  value = {
    version     = 1
    bucket_name = aws_s3_bucket.documents.id
    bucket_arn  = aws_s3_bucket.documents.arn
  }
}
```

### 21.2. Decisión

La salida no contiene documentos ni credenciales.

### 21.3. Regla

Los datos externos al estado requieren su propio inventario de limpieza.

---

## 22. Mensajería: identidad y etiquetas

Crea `modules/messaging/variables.tf`.

### 22.1. Entradas iniciales

```hcl
variable "prefix" {
  description = "Prefijo común de recursos."
  type        = string
  nullable    = false

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{2,49}$",
      var.prefix
    ))
    error_message = "El prefijo debe tener entre 3 y 50 caracteres permitidos."
  }
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

### 22.2. Continuación

Añade las variables temporales al mismo archivo.

---

## 23. Mensajería: visibilidad

Completa `modules/messaging/variables.tf`.

### 23.1. Contrato

```hcl
variable "visibility_seconds" {
  description = "Visibilidad de la cola principal."
  type        = number
  default     = 30
  nullable    = false

  validation {
    condition = (
      var.visibility_seconds >= 1 &&
      var.visibility_seconds <= 43200 &&
      floor(var.visibility_seconds) == var.visibility_seconds
    )
    error_message = "La visibilidad del módulo debe ser un entero entre 1 y 43200."
  }
}
```

### 23.2. Política propia

El módulo excluye cero por decisión del proyecto, aunque SQS permite ese valor.

---

## 24. Mensajería: retención

Añade otra variable al mismo archivo.

### 24.1. Contrato

```hcl
variable "retention_seconds" {
  description = "Retención de la cola principal."
  type        = number
  default     = 86400
  nullable    = false

  validation {
    condition = (
      var.retention_seconds >= 60 &&
      var.retention_seconds <= 1209600 &&
      floor(var.retention_seconds) == var.retention_seconds
    )
    error_message = "La retención debe ser un entero válido para SQS."
  }
}
```

### 24.2. DLQ

Su retención permanecerá fijada en 1209600 segundos en este laboratorio.

---

## 25. Mensajería: umbral de redrive

Completa las variables del módulo.

### 25.1. Contrato

```hcl
variable "max_receive_count" {
  description = "Umbral configurado de redrive."
  type        = number
  default     = 3
  nullable    = false

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

### 25.2. Regla

Configurar el umbral no demuestra que el redrive haya ocurrido.

---

## 26. Mensajería: tópico y DLQ

Crea `modules/messaging/main.tf`.

### 26.1. Recursos iniciales

```hcl
resource "aws_sns_topic" "documents" {
  name = "${var.prefix}-events"
  tags = var.tags
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.prefix}-dlq"
  message_retention_seconds = 1209600

  tags = merge(var.tags, {
    Role = "DLQ"
  })
}
```

### 26.2. Etiquetas

El módulo fija `Role` para describir su recurso.

---

## 27. Mensajería: cola principal

Completa `modules/messaging/main.tf`.

### 27.1. Recurso

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "${var.prefix}-work"
  visibility_timeout_seconds = var.visibility_seconds
  message_retention_seconds  = var.retention_seconds

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Role = "Work"
  })
}
```

### 27.2. Dependencia

La referencia al ARN permite a Terraform ordenar las operaciones necesarias.

---

## 28. Mensajería: salida

Crea `modules/messaging/outputs.tf`.

### 28.1. Contrato público

```hcl
output "contract" {
  value = {
    version            = 1
    topic_arn          = aws_sns_topic.documents.arn
    queue_name         = aws_sqs_queue.work.name
    queue_url          = aws_sqs_queue.work.id
    queue_arn          = aws_sqs_queue.work.arn
    dlq_arn            = aws_sqs_queue.dlq.arn
    visibility_seconds = aws_sqs_queue.work.visibility_timeout_seconds
    retention_seconds  = aws_sqs_queue.work.message_retention_seconds
    redrive_policy     = aws_sqs_queue.work.redrive_policy
  }
}
```

### 28.2. Regla

Las pruebas compararán la política decodificada, no su orden textual.

---

## 29. Integración: referencias tipadas

Crea `modules/integration/variables.tf`.

### 29.1. Entradas

```hcl
variable "source" {
  description = "Origen SNS."
  type = object({
    topic_arn = string
  })
  nullable = false
}

variable "target" {
  description = "Destino SQS."
  type = object({
    queue_arn = string
    queue_url = string
  })
  nullable = false
}
```

### 29.2. Decisión

Las referencias calculadas pueden permanecer desconocidas durante el primer plan.

---

## 30. Integración: filtro

Completa `modules/integration/variables.tf`.

### 30.1. Tipos de eventos

```hcl
variable "event_types" {
  description = "Tipos permitidos por la suscripción."
  type        = set(string)
  default     = ["document.created"]
  nullable    = false

  validation {
    condition = (
      length(var.event_types) > 0 &&
      alltrue([
        for item in var.event_types :
        can(regex("^[a-z][a-z0-9.-]{2,63}$", item))
      ])
    )
    error_message = "Define al menos un tipo de evento con formato válido."
  }
}
```

### 30.2. Regla

El filtro se aplicará a atributos SNS, no al cuerpo JSON.

---

## 31. Integración: política de recepción

Crea `modules/integration/main.tf`.

### 31.1. Autorización declarada

```hcl
resource "aws_sqs_queue_policy" "delivery" {
  queue_url = var.target.queue_url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowProjectTopic"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = var.target.queue_arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = var.source.topic_arn
        }
      }
    }]
  })
}
```

### 31.2. Propiedad

La política limita el origen declarado al tópico recibido como entrada.

---

## 32. Integración: suscripción

Completa `modules/integration/main.tf`.

### 32.1. Entrega filtrada

```hcl
resource "aws_sns_topic_subscription" "delivery" {
  topic_arn            = var.source.topic_arn
  protocol             = "sqs"
  endpoint             = var.target.queue_arn
  raw_message_delivery = true
  filter_policy_scope  = "MessageAttributes"

  filter_policy = jsonencode({
    event_type = sort(tolist(var.event_types))
  })

  depends_on = [
    aws_sqs_queue_policy.delivery
  ]
}
```

### 32.2. Orden

La dependencia explícita representa un requisito operacional de entrega.

---

## 33. Integración: salida

Crea `modules/integration/outputs.tf`.

### 33.1. Contrato

```hcl
output "contract" {
  value = {
    version          = 1
    subscription_arn = aws_sns_topic_subscription.delivery.arn
    event_types      = sort(tolist(var.event_types))
  }
}
```

### 33.2. Encapsulación

La raíz no necesita conocer el nombre interno del recurso de suscripción.

### 33.3. Regla

Una salida no demuestra propagación instantánea ni entrega funcional.

---

## 34. Proveedores y backend de la raíz

Crea `app/versions.tf` y `app/providers.tf`.

### 34.1. Requisitos

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

### 34.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sns = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

---

## 35. Variables y convenciones de la raíz

Crea `app/variables.tf`.

### 35.1. Entradas

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}

variable "visibility_seconds" {
  type    = number
  default = 30
}

locals {
  prefix = "curso-modules-${var.run_id}"
  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
    RunId      = var.run_id
  }
}
```

---

## 36. Composición de almacenamiento y mensajería

Crea `app/main.tf`.

### 36.1. Primeros módulos

```hcl
module "storage" {
  source      = "../modules/storage"
  bucket_name = "${local.prefix}-documents"
  tags        = local.tags
}

module "messaging" {
  source             = "../modules/messaging"
  prefix             = local.prefix
  visibility_seconds = var.visibility_seconds
  retention_seconds  = 86400
  max_receive_count  = 3
  tags               = local.tags
}
```

### 36.2. Regla

No es necesario un `depends_on` entre estos dos módulos independientes.

---

## 37. Composición de la integración

Completa `app/main.tf`.

### 37.1. Referencias entre contratos

```hcl
module "integration" {
  source = "../modules/integration"

  source = "../modules/integration"
}
```

### 37.2. Configuración correcta

No utilices el bloque anterior: ilustra una colisión de nombres.

En un bloque `module`, `source` es un argumento reservado.

Renombra la variable `source` del módulo de integración a `origin`.

Sustituye también `var.source.topic_arn` por `var.origin.topic_arn` en su `main.tf`.

El bloque definitivo es:

```hcl
module "integration" {
  source = "../modules/integration"

  origin = {
    topic_arn = module.messaging.contract.topic_arn
  }

  target = {
    queue_arn = module.messaging.contract.queue_arn
    queue_url = module.messaging.contract.queue_url
  }

  event_types = ["document.created"]
}
```

### 37.3. Regla

Los contratos de módulos deben evitar nombres reservados de llamada como `source`, `version` y `providers`.

---

## 38. Contrato raíz y revisión de archivos

Crea `app/outputs.tf` y comprueba que la integración utiliza `origin`.

### 38.1. Salida

```hcl
output "project" {
  value = {
    schema_version = 1
    run_id         = var.run_id
    storage        = module.storage.contract
    messaging      = module.messaging.contract
    integration    = module.integration.contract
  }
}
```

### 38.2. Comprobación

En `modules/integration/variables.tf` debe existir `variable "origin"`, no `variable "source"`.

En sus recursos deben aparecer referencias `var.origin.topic_arn`.

### 38.3. Regla

La implementación final no debe contener el bloque incorrecto de la sección anterior.

---

## 39. Pruebas del contrato raíz

Crea `app/tests/contract.tftest.hcl`.

### 39.1. Casos positivos y negativos

```hcl
run "project_plan" {
  command = plan

  assert {
    condition     = output.project.schema_version == 1
    error_message = "La versión raíz debe ser 1."
  }

  assert {
    condition     = output.project.messaging.visibility_seconds == 30
    error_message = "La visibilidad predeterminada debe ser 30."
  }

  assert {
    condition = (
      output.project.integration.event_types
      == tolist(["document.created"])
    )
    error_message = "El filtro debe permitir document.created."
  }
}

run "reject_identifier" {
  command = plan
  variables {
    run_id = "invalid"
  }
  expect_failures = [var.run_id]
}
```

---

## 40. Sesión 1: inicialización y planificación

Duración orientativa: 45 minutos.

### 40.1. Comandos

```bash
docker compose up -d
aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues

terraform fmt -recursive
terraform -chdir=app init
terraform -chdir=app validate
terraform -chdir=app test -var="run_id=${RUN_ID}"
terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
```

### 40.2. Resultado esperado

El plan propone ocho recursos administrados: tres de almacenamiento, tres de mensajería y dos de integración.

---

## 41. Sesión 2: aplicación y estado

Aplica únicamente el plan revisado.

### 41.1. Comandos

```bash
terraform -chdir=app apply ../planes/create.tfplan
terraform -chdir=app state list
terraform -chdir=app output -json project > resultados/project.json
```

### 41.2. Direcciones

El estado debe utilizar prefijos `module.storage`, `module.messaging` y `module.integration`.

### 41.3. Regla

El estado relaciona direcciones Terraform con objetos remotos; las salidas no sustituyen esa relación.

---

## 42. Verificación de configuración independiente

AWS CLI debe complementar las salidas Terraform.

### 42.1. Comandos

```bash
BUCKET="$(jq -er '.storage.bucket_name' resultados/project.json)"
QUEUE_URL="$(jq -er '.messaging.queue_url' resultados/project.json)"
SUBSCRIPTION="$(jq -er '.integration.subscription_arn' resultados/project.json)"

aws_local s3api get-public-access-block --bucket "$BUCKET"
aws_local s3api get-bucket-encryption --bucket "$BUCKET"
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn VisibilityTimeout RedrivePolicy Policy
aws_local sns get-subscription-attributes \
  --subscription-arn "$SUBSCRIPTION"
```

### 42.2. Regla

Comprueba propiedades concretas, no solo que los comandos devuelven código cero.

---

## 43. Sesión 3: actualización sin reemplazo

Una modificación de visibilidad debe conservar la identidad de la cola.

### 43.1. Comandos

```bash
terraform -chdir=app plan \
  -var='visibility_seconds=60' \
  -out=../planes/update.tfplan

terraform -chdir=app show ../planes/update.tfplan
terraform -chdir=app apply ../planes/update.tfplan
```

### 43.2. Persistencia

Añade `visibility_seconds = 60` a `app/terraform.tfvars` después de revisar la actualización.

### 43.3. Regla

Un argumento temporal no modifica por sí solo las entradas guardadas del proyecto.

---

## 44. Sesión 4: comprobación de convergencia

La configuración actualizada debe quedar estable.

### 44.1. Comando

```bash
terraform -chdir=app plan -detailed-exitcode
```

### 44.2. Interpretación

Código 0: sin cambios.

Código 2: cambios propuestos.

Código 1: error operacional.

### 44.3. Regla

No declares convergencia si Terraform propone volver a la visibilidad anterior.

---

## 45. Sesión 5: prueba funcional mínima

Comprueba entrega SNS a SQS con un evento exclusivamente ficticio.

### 45.1. Publicación

```bash
TOPIC="$(jq -er '.messaging.topic_arn' resultados/project.json)"

aws_local sns publish \
  --topic-arn "$TOPIC" \
  --message '{"schema_version":1,"event_id":"DEMO-MODULES-001","event_type":"document.created"}' \
  --message-attributes \
  '{"event_type":{"DataType":"String","StringValue":"document.created"}}'

aws_local sqs receive-message \
  --queue-url "$QUEUE_URL" \
  --wait-time-seconds 5 \
  > resultados/message.json
```

### 45.2. Expectativa

El cuerpo contiene el evento directamente, sin envoltorio SNS.

---

## 46. Confirmación y límites de la prueba

La recepción necesita confirmación explícita.

### 46.1. Eliminación

```bash
RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/message.json)"

aws_local sqs delete-message \
  --queue-url "$QUEUE_URL" \
  --receipt-handle "$RECEIPT"
```

### 46.2. Alcance

Esta prueba comprueba entrega, no recuperación de documentos S3 ni traslado a DLQ.

### 46.3. Regla

Para automatización, añade identidad única, espera acotada y tratamiento de duplicados.

---

## 47. Migración desde la organización anterior

Mover un recurso entre módulos necesita preservar su relación con el estado.

### 47.1. Ejemplo conceptual

Si la dirección anterior era exactamente `module.events.aws_sqs_queue.work`:

```hcl
moved {
  from = module.events.aws_sqs_queue.work
  to   = module.messaging.aws_sqs_queue.work
}
```

### 47.2. Procedimiento

Inventaría todas las direcciones, prepara movimientos y revisa el plan.

### 47.3. Regla

El ejemplo no es una migración completa: deben contemplarse tópico, DLQ, política, suscripción y almacenamiento.

---

## 48. Buenas prácticas de dependencias

Las referencias deben expresar relaciones reales.

### 48.1. Preferencias

Utiliza outputs para conectar módulos.

Reserva `depends_on` para dependencias no representadas por atributos.

Evita dependencias globales innecesarias entre módulos.

### 48.2. Riesgo

Un `depends_on` demasiado amplio puede aumentar valores desconocidos y dificultar la planificación.

### 48.3. Regla

No utilices dependencias artificiales para ocultar una prueba de disponibilidad ausente.

---

## 49. Preparación de la limpieza

Destruir recursos y eliminar datos son operaciones diferentes.

### 49.1. Comprobaciones

Inventaría objetos S3 externos al estado.

Elimina únicamente datos conocidos del laboratorio.

Conserva una copia protegida si necesitas recuperación.

### 49.2. Copia

```bash
terraform -chdir=app state pull > copias/before-destroy.tfstate
```

### 49.3. Regla

No actives `force_destroy` únicamente para ocultar objetos abandonados por una prueba.

---

## 50. Sesión 6: destrucción verificable

Mantén LocalStack disponible durante el teardown.

### 50.1. Secuencia

```bash
terraform -chdir=app plan -destroy -out=../planes/destroy.tfplan
terraform -chdir=app show ../planes/destroy.tfplan
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues
```

### 50.2. Finalización

Comprueba ausencia de los identificadores anteriores antes de ejecutar `docker compose down`.

---

## 51. Evaluación y diferencias respecto a AWS real

La entrega debe demostrar contratos y gestión del ciclo de vida.

### 51.1. Evidencias mínimas

Código de los tres módulos.

Pruebas y resultados observados.

Plan revisado de actualización.

Convergencia y limpieza.

Registro de versiones.

### 51.2. Límites

IAM efectivo, KMS, propagación, cuotas y resiliencia necesitan comprobaciones adicionales.

### 51.3. Regla

No presentes los controles declarados como garantías productivas certificadas por LocalStack.

---

## 52. Ejercicios y resumen de la lección

Las actividades deben reforzar composición, evolución y recuperación.

### 52.1. Ejercicios

1. Añade descripciones a todas las salidas.
2. Prueba una visibilidad inválida.
3. Comprueba la política de redrive decodificada.
4. Añade una segunda suscripción sin duplicar políticas sobre la misma cola.
5. Diseña una migración completa desde `module.events`.
6. Demuestra actualización sin reemplazo.
7. Documenta un bucket no vacío durante destroy.
8. Verifica ausencia de todos los recursos.

### 52.2. Idea final

**Una infraestructura modular fiable mantiene contratos claros, conexiones explícitas y procedimientos de evolución y limpieza que preservan la relación entre código, estado y recursos.**