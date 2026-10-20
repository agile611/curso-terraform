# Módulo de mensajería SNS y SQS con Terraform y LocalStack

Un módulo de mensajería SNS y SQS permite conectar productores y consumidores sin acoplarlos directamente.

SNS distribuye eventos publicados en un tema.

SQS conserva mensajes en colas para que cada consumidor pueda procesarlos a su ritmo.

Terraform puede agrupar el tema, las colas, las políticas y las suscripciones en un módulo reutilizable.

Sin embargo, crear esos recursos no demuestra por sí solo que los mensajes lleguen correctamente.

También necesitas verificar permisos, filtros, formato de entrega y confirmación de mensajes.

En esta lección construirás un módulo personalizado y comprobarás su funcionamiento mediante sesiones reproducibles con LocalStack.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los recursos y mensajes son exclusivamente didácticos.

---

## 1. Objetivos de aprendizaje

Esta lección combina diseño de módulos y verificación de una integración entre servicios.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un tema SNS y varias colas SQS.
- Definir suscripciones SNS con destino SQS.
- Autorizar envíos mediante políticas de cola.
- Configurar entrega raw y entrega con envoltorio.
- Aplicar filtros por atributos.
- Publicar y confirmar mensajes.
- Diseñar outputs reutilizables.
- Comprobar límites de la emulación.

### 1.2. Resultado práctico

Construirás un tema con dos consumidores y demostrarás que reciben eventos diferentes.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, variables y políticas AWS.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
python3 --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

### 2.3. Entorno de ejecución

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad que debe validar el docente

La práctica depende de operaciones y comportamientos que deben comprobarse previamente.

### 3.1. Operaciones obligatorias

Valida:

- Creación de temas y colas.
- Configuración de políticas SQS.
- Suscripción mediante protocolo `sqs`.
- Publicación en SNS.
- Entrega raw y con envoltorio.
- Filtrado por atributos.
- Recepción y eliminación de mensajes.
- Destrucción de los recursos.

### 3.2. Registro del entorno

Documenta Terraform, proveedor, AWS CLI, Docker e imagen o digest de LocalStack.

### 3.3. Regla

Una API disponible no demuestra que toda su semántica reproduzca AWS real.

---

## 4. Papel de SNS

SNS permite publicar un evento sin identificar directamente a todos sus consumidores.

### 4.1. Tema

El productor publica en un tema.

Las suscripciones determinan los destinos de distribución.

### 4.2. Distribución

Un evento puede enviarse a varias colas.

Cada suscripción puede tener sus propias opciones de entrega y filtrado.

### 4.3. Límite

Un tema estándar no sustituye una cola persistente que el consumidor consulta a demanda.

### 4.4. Regla principal

**El productor publica en SNS; los consumidores de esta práctica leen desde SQS.**

---

## 5. Papel de SQS

SQS conserva mensajes hasta que un consumidor los procesa, expiran o se eliminan.

### 5.1. Cola

Cada componente utilizará una cola independiente.

### 5.2. Recepción

Recibir un mensaje normalmente lo vuelve invisible durante un intervalo.

### 5.3. Confirmación

El consumidor debe eliminarlo con su `ReceiptHandle`.

### 5.4. Consecuencia

Recibir y eliminar son operaciones distintas.

### 5.5. Regla

No interpretes una recepción como confirmación definitiva del procesamiento.

---

## 6. Patrón fan-out

El patrón fan-out distribuye un evento a varios consumidores independientes.

### 6.1. Arquitectura conceptual

```text
Productor
   │
   ▼
Tema SNS
   ├── Suscripción ──→ Cola billing ──→ Consumidor billing
   └── Suscripción ──→ Cola analytics ──→ Consumidor analytics
```

### 6.2. Independencia

Eliminar un mensaje de billing no elimina la copia de analytics.

### 6.3. Beneficio

Cada consumidor puede procesar a su ritmo.

### 6.4. Límite

No existe una transacción global que confirme ambos consumidores simultáneamente.

---

## 7. Responsabilidad del módulo

El módulo representará un canal de eventos con consumidores SQS.

### 7.1. Recursos incluidos

Creará:

- Un tema SNS estándar.
- Una cola estándar por consumidor.
- Una política por cola.
- Una suscripción por consumidor.

### 7.2. Fuera de alcance

No creará aplicaciones, Lambda, DLQ, alarmas ni claves KMS.

### 7.3. Motivo

Esas responsabilidades pueden componerse con otros módulos.

### 7.4. Regla

El módulo debe tener una frontera comprensible y verificable.

---

## 8. Contrato de entrada

La interfaz distinguirá identidad del canal y configuración de consumidores.

### 8.1. Variables principales

| **Entrada** | **Propósito** | **Default** |
|-------------|---------------|-------------|
| `name` | Nombre del tema y prefijo de colas | Obligatorio |
| `consumers` | Mapa de consumidores | Obligatorio |
| `tags` | Etiquetas comunes | `{}` |

Cada consumidor tendrá opciones de visibilidad, retención, entrega y filtrado.

### 8.2. Identidad estable

Las claves del mapa formarán parte de las direcciones Terraform.

### 8.3. Regla

No cambies esas claves como si fueran etiquetas sin consecuencias.

---

## 9. Contrato de salida

El módulo publicará identificadores necesarios para productores y consumidores.

### 9.1. Información incluida

Expondrá:

- Nombre y ARN del tema.
- Nombre, URL y ARN de cada cola.
- ARN de cada suscripción.
- Modalidad de entrega.
- Filtro configurado.

### 9.2. Encapsulación

La raíz consumirá outputs, no recursos internos.

### 9.3. Precaución

Un output configurado no sustituye una comprobación independiente del servicio.

---

## 10. Diseño de las políticas SQS

SNS necesita autorización para enviar mensajes a cada cola.

### 10.1. Permiso principal

La política permitirá:

```text
sqs:SendMessage
```

### 10.2. Principal autorizado

El principal será el servicio:

```text
sns.amazonaws.com
```

### 10.3. Restricción

La condición `aws:SourceArn` limitará el permiso al tema creado por el módulo.

### 10.4. Regla

No utilices un principal público sin necesidad para facilitar una prueba local.

---

## 11. Políticas y emulación

La declaración de una política y su aplicación efectiva son aspectos diferentes.

### 11.1. Verificación de configuración

Podemos consultar la política mediante AWS CLI.

### 11.2. Verificación funcional

Podemos comprobar que una publicación autorizada llega a la cola.

### 11.3. Límite

Eso no demuestra que todos los envíos no autorizados sean rechazados por el emulador.

### 11.4. AWS real

También deben revisarse condiciones, cuentas, políticas adicionales y permisos del productor.

### 11.5. Regla

Documenta qué propiedad comprobaste y cuál permanece sin verificar.

---

## 12. Entrega raw

La entrega raw evita el envoltorio SNS habitual en el cuerpo del mensaje.

### 12.1. Resultado esperado

Si publicas:

```json
{"event_id":"EVT-001","event_type":"order.created"}
```

El cuerpo SQS raw contiene ese mensaje publicado.

### 12.2. Ventaja

El consumidor puede interpretar directamente el JSON de negocio.

### 12.3. Precaución

Raw no significa que desaparezcan todas las restricciones de SNS.

### 12.4. AWS real

Las entregas raw a SQS admiten un máximo de diez atributos de mensaje SNS.

---

## 13. Entrega con envoltorio

Sin raw, SNS entrega una estructura que contiene el mensaje y metadatos.

### 13.1. Campos habituales

Pueden aparecer:

- `Type`.
- `MessageId`.
- `TopicArn`.
- `Message`.
- `Timestamp`.
- Metadatos adicionales.

### 13.2. Interpretación

El campo `Message` suele contener el mensaje publicado como cadena.

### 13.3. Regla

El consumidor debe distinguir el JSON del envoltorio y el JSON de negocio.

---

## 14. Filtros de suscripción

Un filtro decide qué publicaciones corresponden a una suscripción.

### 14.1. Alcance utilizado

Esta práctica filtrará atributos SNS mediante:

```text
MessageAttributes
```

### 14.2. Caso didáctico

Billing recibirá únicamente eventos cuyo atributo `eventType` sea `order.created`.

### 14.3. Analytics

Recibirá todas las publicaciones porque no tendrá filtro.

### 14.4. Regla

El filtro no busca automáticamente un campo del cuerpo cuando su alcance son atributos.

---

## 15. Atributos SNS y cuerpo

El mensaje publicado y sus atributos son datos separados.

### 15.1. Cuerpo de negocio

```json
{"event_id":"EVT-001","event_type":"order.created"}
```

### 15.2. Atributo para filtrar

```json
{"eventType":{"DataType":"String","StringValue":"order.created"}}
```

### 15.3. Consecuencia

Un cuerpo con `event_type` no satisface por sí solo el filtro de `eventType`.

### 15.4. Regla

El productor debe mantener coherencia entre su contrato de mensaje y sus atributos.

---

## 16. Alcance del filtrado implementado

El módulo ofrecerá un subconjunto deliberadamente sencillo de filtros.

### 16.1. Interfaz

Utilizaremos un mapa de listas de cadenas.

### 16.2. Semántica

Dentro de una lista, varios valores actúan como alternativas.

Entre atributos distintos, las condiciones deben cumplirse conjuntamente.

### 16.3. Fuera de alcance

No implementaremos operadores numéricos, prefijos ni expresiones avanzadas.

### 16.4. Regla

Documenta las capacidades del módulo sin confundirlas con todas las capacidades del servicio.

---

## 17. Diseño del laboratorio

Utilizaremos un tema y dos consumidores.

### 17.1. Configuración inicial

| **Consumidor** | **Entrega** | **Filtro** |
|----------------|-------------|------------|
| `billing` | Raw | `eventType = order.created` |
| `analytics` | Envoltorio SNS | Sin filtro |

Publicaremos eventos creados, cancelados y sin atributos.

### 17.2. Resultado esperado

Billing recibe los creados con el atributo correcto.

Analytics recibe todas las publicaciones.

### 17.3. Precaución

No utilizaremos tráfico ajeno al laboratorio.

---

## 18. Preparación del directorio

Trabaja en una carpeta independiente.

### 18.1. Estructura

```bash
mkdir -p terraform-sns-sqs/modules/messaging
mkdir -p terraform-sns-sqs/scripts
mkdir -p terraform-sns-sqs/tests
mkdir -p terraform-sns-sqs/archivos
mkdir -p terraform-sns-sqs/planes
mkdir -p terraform-sns-sqs/resultados
mkdir -p terraform-sns-sqs/copias
cd terraform-sns-sqs
```

### 18.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 18.3. Aislamiento

No reutilices el estado de otra lección.

---

## 19. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 19.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
planes/
resultados/
copias/
archivos/
crash.log
```

### 19.2. Qué conservar

Versiona módulo, composición, documentación, pruebas y archivo de bloqueo.

### 19.3. Datos

No publiques mensajes personales ni secretos reales.

---

## 20. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 20.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sns,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 20.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 21. Credenciales y conectividad

Prepara la terminal antes de utilizar Terraform o AWS CLI.

### 21.1. Configuración

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SNS AWS_ENDPOINT_URL_SQS TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 21.2. Comprobación

Consulta `sns list-topics` y `sqs list-queues` mediante `aws_local`.

---

## 22. Requisitos del módulo hijo

Crea `modules/messaging/versions.tf`.

### 22.1. Configuración

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

### 22.2. Dependencia

El módulo declara el proveedor que necesita.

### 22.3. Configuración

No contiene credenciales, región ni endpoints propios.

---

## 23. Variables de identidad y etiquetas

Crea `modules/messaging/variables.tf`.

### 23.1. Declaraciones

```hcl
variable "name" {
  description = "Nombre del tema y prefijo de las colas estándar."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,39}$", var.name))
    error_message = "Usa entre 3 y 40 caracteres: minúsculas, dígitos y guiones."
  }
}

variable "tags" {
  description = "Etiquetas comunes; Component queda reservado al módulo."
  type        = map(string)
  default     = {}
  nullable    = false
}
```

### 23.2. Margen

El nombre deja espacio para añadir la clave del consumidor.

---

## 24. Variable estructurada de consumidores

Añade la variable `consumers` al mismo archivo.

### 24.1. Tipo

```hcl
variable "consumers" {
  description = "Colas y suscripciones; los filtros admiten coincidencias exactas de cadenas."
  nullable    = false

  type = map(object({
    raw_message_delivery       = optional(bool, true)
    visibility_timeout_seconds = optional(number, 60)
    retention_seconds          = optional(number, 86400)
    filter_attributes          = optional(map(list(string)))
  }))
```

### 24.2. Defaults

Omitir `filter_attributes` deja el atributo en `null`.

### 24.3. Archivo incompleto

Completa el bloque con las validaciones siguientes.

---

## 25. Validaciones de consumidores

Añade estas reglas dentro de `consumers`.

### 25.1. Identidad y atributos SQS

```hcl
  validation {
    condition = (
      length(var.consumers) > 0 &&
      alltrue([
        for key in keys(var.consumers) :
        can(regex("^[a-z][a-z0-9-]{1,19}$", key))
      ])
    )
    error_message = "Declara consumidores con claves de 2 a 20 caracteres, en minúsculas."
  }

  validation {
    condition = alltrue([
      for consumer in values(var.consumers) : (
        consumer.visibility_timeout_seconds >= 0 &&
        consumer.visibility_timeout_seconds <= 43200 &&
        floor(consumer.visibility_timeout_seconds) == consumer.visibility_timeout_seconds &&
        consumer.retention_seconds >= 60 &&
        consumer.retention_seconds <= 1209600 &&
        floor(consumer.retention_seconds) == consumer.retention_seconds
      )
    ])
    error_message = "Visibilidad y retención deben ser enteros válidos para SQS."
  }
```

---

## 26. Validación de filtros

Completa la variable y cierra su bloque.

### 26.1. Regla

```hcl
  validation {
    condition = alltrue([
      for consumer in values(var.consumers) :
      consumer.filter_attributes == null ? true : (
        length(consumer.filter_attributes) >= 1 &&
        length(consumer.filter_attributes) <= 5 &&
        alltrue([
          for key, accepted in consumer.filter_attributes : (
            length(key) > 0 &&
            length(accepted) > 0 &&
            alltrue([for item in accepted : length(item) > 0])
          )
        ])
      )
    ])
    error_message = "El filtro debe ser null o contener de 1 a 5 atributos con listas no vacías."
  }
}
```

### 26.2. Límite

Esta validación no reproduce todos los límites de complejidad de filtros SNS.

---

## 27. Tema y colas

Crea `modules/messaging/main.tf`.

### 27.1. Recursos

```hcl
resource "aws_sns_topic" "this" {
  name = var.name

  tags = merge(var.tags, {
    Component = "topic"
  })
}

resource "aws_sqs_queue" "consumer" {
  for_each = var.consumers

  name                       = "${var.name}-${each.key}"
  visibility_timeout_seconds = each.value.visibility_timeout_seconds
  message_retention_seconds  = each.value.retention_seconds

  tags = merge(var.tags, {
    Component = each.key
  })
}
```

### 27.2. Identidad

Cada clave crea una instancia independiente de la cola.

---

## 28. Documentos de política

Añade los documentos de autorización a `modules/messaging/main.tf`.

### 28.1. Política por consumidor

```hcl
data "aws_iam_policy_document" "consumer" {
  for_each = var.consumers

  statement {
    sid       = "AllowTopicDelivery"
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.consumer[each.key].arn]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.this.arn]
    }
  }
}
```

### 28.2. Nota

Este data source construye JSON; no necesita un servicio IAM emulado para crear la política.

---

## 29. Políticas y suscripciones

Completa `modules/messaging/main.tf`.

### 29.1. Recursos relacionados

```hcl
resource "aws_sqs_queue_policy" "consumer" {
  for_each = var.consumers

  queue_url = aws_sqs_queue.consumer[each.key].id
  policy    = data.aws_iam_policy_document.consumer[each.key].json
}

resource "aws_sns_topic_subscription" "consumer" {
  for_each = var.consumers

  topic_arn = aws_sns_topic.this.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.consumer[each.key].arn

  raw_message_delivery = each.value.raw_message_delivery

  filter_policy = (
    each.value.filter_attributes == null
    ? null
    : jsonencode(each.value.filter_attributes)
  )

  filter_policy_scope = (
    each.value.filter_attributes == null ? null : "MessageAttributes"
  )

  depends_on = [aws_sqs_queue_policy.consumer]
}
```

---

## 30. Comprender las dependencias

Las referencias establecen buena parte del orden de creación.

### 30.1. Dependencias implícitas

La suscripción necesita el tema y el ARN de su cola.

### 30.2. Dependencia adicional

`depends_on` solicita crear las políticas antes de las suscripciones.

### 30.3. Alcance conservador

La dependencia se aplica al conjunto de políticas de consumidores.

### 30.4. Límite

El orden Terraform no garantiza ausencia de propagación eventual del servicio.

### 30.5. Regla

Verifica la integración antes de publicar eventos importantes.

---

## 31. Outputs del módulo

Crea `modules/messaging/outputs.tf`.

### 31.1. Contrato público

```hcl
output "contract" {
  description = "Contrato v1 del tema y sus consumidores SQS."

  value = {
    contract_version = 1
    topic_name       = aws_sns_topic.this.name
    topic_arn        = aws_sns_topic.this.arn

    consumers = {
      for key, consumer in var.consumers : key => {
        queue_name       = aws_sqs_queue.consumer[key].name
        queue_url        = aws_sqs_queue.consumer[key].id
        queue_arn        = aws_sqs_queue.consumer[key].arn
        subscription_arn = aws_sns_topic_subscription.consumer[key].arn

        raw_message_delivery = consumer.raw_message_delivery
        filter_attributes    = consumer.filter_attributes
      }
    }
  }
}
```

---

## 32. Requisitos y proveedor raíz

Crea `versions.tf` y `providers.tf`.

### 32.1. Requisitos

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 32.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sns = "http://localhost:4566"
    sqs = "http://localhost:4566"
  }
}
```

---

## 33. Composición raíz

Crea `variables.tf`, `terraform.tfvars` y `main.tf`.

### 33.1. Identidad

```hcl
# variables.tf
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

# terraform.tfvars
suffix = "alumno01"
```

### 33.2. Llamada

```hcl
module "events" {
  source = "./modules/messaging"
  name   = "curso-events-${var.suffix}"

  consumers = {
    billing = {
      raw_message_delivery = true
      filter_attributes    = { eventType = ["order.created"] }
    }
    analytics = {
      raw_message_delivery = false
    }
  }

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

---

## 34. Publicar el contrato raíz

Crea `outputs.tf`.

### 34.1. Output

```hcl
output "messaging" {
  description = "Identificadores del canal de eventos."
  value       = module.events.contract
}
```

### 34.2. Backend

Utilizaremos el estado local predeterminado.

### 34.3. Diferencia

El módulo hijo publica un contrato a la raíz.

`terraform output` consulta las salidas raíz registradas.

### 34.4. Regla

No presupongas que las salidas hijo aparecen directamente como comandos independientes.

---

## 35. Sesión 1: validar y revisar

Duración orientativa: 25 minutos.

### 35.1. Comandos

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform providers

terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 35.2. Resultado esperado

El plan debe crear siete recursos administrados.

### 35.3. Inventario

Un tema, dos colas, dos políticas y dos suscripciones.

Los documentos de política son data sources, no recursos remotos adicionales.

---

## 36. Sesión 2: aplicar e identificar

La aplicación crea el canal de mensajería.

### 36.1. Comandos

```bash
terraform apply planes/create.tfplan
terraform state list

terraform output -json messaging > resultados/messaging.json

TOPIC_ARN="$(jq -er '.topic_arn' resultados/messaging.json)"
BILLING_URL="$(jq -er '.consumers.billing.queue_url' resultados/messaging.json)"
ANALYTICS_URL="$(jq -er '.consumers.analytics.queue_url' resultados/messaging.json)"
BILLING_SUB="$(jq -er '.consumers.billing.subscription_arn' resultados/messaging.json)"
```

### 36.2. Verificación

Comprueba que las dos URLs son distintas.

### 36.3. Regla

Conserva nombres específicos para evitar enviar o consumir en el destino equivocado.

---

## 37. Sesión 3: consultar la integración

Verifica recursos y atributos con AWS CLI.

### 37.1. Comandos

```bash
aws_local sns list-subscriptions-by-topic \
  --topic-arn "$TOPIC_ARN"

aws_local sns get-subscription-attributes \
  --subscription-arn "$BILLING_SUB" \
  > resultados/billing-subscription.json

aws_local sqs get-queue-attributes \
  --queue-url "$BILLING_URL" \
  --attribute-names Policy QueueArn \
  > resultados/billing-queue.json
```

### 37.2. Resultado

Comprueba protocolo, endpoint, entrega raw, alcance y filtro.

### 37.3. Política

Interpreta `.Attributes.Policy` con `fromjson` y revisa `aws:SourceArn`.

---

## 38. Sesión 4: publicar un evento creado

Utiliza archivos para evitar errores de comillas en JSON.

### 38.1. Preparación y publicación

```bash
printf '%s\n' \
  '{"event_id":"EVT-001","event_type":"order.created","order_id":"ORDER-001"}' \
  > archivos/created.json

printf '%s\n' \
  '{"eventType":{"DataType":"String","StringValue":"order.created"}}' \
  > archivos/created-attributes.json

aws_local sns publish \
  --topic-arn "$TOPIC_ARN" \
  --message file://archivos/created.json \
  --message-attributes file://archivos/created-attributes.json \
  > resultados/publish-created.json
```

### 38.2. Expectativa

Ambos consumidores deben recibir una copia.

---

## 39. Sesión 5: observar entrega raw

Consulta billing sin confirmar todavía el mensaje.

### 39.1. Recepción

```bash
aws_local sqs receive-message \
  --queue-url "$BILLING_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  > resultados/billing-created.json

jq -r '.Messages[0].Body | fromjson' \
  resultados/billing-created.json
```

### 39.2. Resultado esperado

El cuerpo representa directamente el evento de negocio.

### 39.3. Precaución

Si no hay mensajes, repite de forma acotada antes de declarar una entrega fallida.

---

## 40. Sesión 6: observar el envoltorio

Analytics recibe el mismo evento con otra representación.

### 40.1. Recepción

```bash
aws_local sqs receive-message \
  --queue-url "$ANALYTICS_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  > resultados/analytics-created.json

jq -r '.Messages[0].Body | fromjson | .Message | fromjson' \
  resultados/analytics-created.json
```

### 40.2. Resultado

El evento de negocio coincide con el recibido por billing.

### 40.3. Identificadores

No confundas `MessageId` SNS, `MessageId` SQS y `event_id` de negocio.

---

## 41. Sesión 7: confirmar ambas copias

Cada cola requiere su propia eliminación.

### 41.1. Comandos

```bash
BILLING_RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/billing-created.json)"
ANALYTICS_RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/analytics-created.json)"

aws_local sqs delete-message \
  --queue-url "$BILLING_URL" \
  --receipt-handle "$BILLING_RECEIPT"

aws_local sqs delete-message \
  --queue-url "$ANALYTICS_URL" \
  --receipt-handle "$ANALYTICS_RECEIPT"
```

### 41.2. Regla

Utiliza el handle de la recepción correspondiente y confirma dentro de su ventana de visibilidad.

---

## 42. Script de inspección repetible

Crea `scripts/receive-event.py` para inspeccionar ambas representaciones.

### 42.1. Implementación

```python
import argparse
import json
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument("--queue-url", required=True)
parser.add_argument("--mode", choices=["raw", "envelope"], required=True)
parser.add_argument("--seconds", type=int, default=20)
parser.add_argument("--delete", action="store_true")
args = parser.parse_args()

def aws(*operation):
    command = [
        "aws", "--endpoint-url=http://localhost:4566",
        "--region", "us-east-1", "--output", "json", *operation,
    ]
    return subprocess.check_output(command, text=True)

deadline = time.monotonic() + args.seconds
found = 0

while time.monotonic() < deadline:
    response = json.loads(aws(
        "sqs", "receive-message", "--queue-url", args.queue_url,
        "--max-number-of-messages", "10", "--wait-time-seconds", "2",
    ))
    for message in response.get("Messages", []):
        body = json.loads(message["Body"])
        event = body if args.mode == "raw" else json.loads(body["Message"])
        print(json.dumps(event), flush=True)
        found += 1
        if args.delete:
            aws(
                "sqs", "delete-message", "--queue-url", args.queue_url,
                "--receipt-handle", message["ReceiptHandle"],
            )

print(json.dumps({"deliveries_observed": found}), flush=True)
```

### 42.2. Alcance

Es una herramienta didáctica, no un consumidor de producción.

---

## 43. Sesión 8: publicar un evento cancelado

El filtro de billing debe excluir esta publicación.

### 43.1. Preparación y envío

```bash
printf '%s\n' \
  '{"event_id":"EVT-002","event_type":"order.cancelled","order_id":"ORDER-001"}' \
  > archivos/cancelled.json

printf '%s\n' \
  '{"eventType":{"DataType":"String","StringValue":"order.cancelled"}}' \
  > archivos/cancelled-attributes.json

aws_local sns publish \
  --topic-arn "$TOPIC_ARN" \
  --message file://archivos/cancelled.json \
  --message-attributes file://archivos/cancelled-attributes.json
```

### 43.2. Expectativa

Analytics recibe `EVT-002`; billing no debe recibirlo.

---

## 44. Sesión 9: verificar la exclusión

Utiliza una ventana de observación acotada.

### 44.1. Comandos

```bash
python3 scripts/receive-event.py \
  --queue-url "$ANALYTICS_URL" \
  --mode envelope --seconds 10 --delete \
  > resultados/analytics-cancelled.jsonl

python3 scripts/receive-event.py \
  --queue-url "$BILLING_URL" \
  --mode raw --seconds 10 --delete \
  > resultados/billing-cancelled.jsonl
```

### 44.2. Interpretación

Comprueba IDs de negocio, no solo cantidad de entregas.

### 44.3. Límite

Una ventana sin mensajes es evidencia acotada, no prueba universal de ausencia futura.

---

## 45. Sesión 10: publicar sin atributos

El cuerpo puede parecer correcto y no satisfacer el filtro.

### 45.1. Publicación

```bash
printf '%s\n' \
  '{"event_id":"EVT-003","event_type":"order.created"}' \
  > archivos/no-attributes.json

aws_local sns publish \
  --topic-arn "$TOPIC_ARN" \
  --message file://archivos/no-attributes.json
```

### 45.2. Expectativa

Analytics recibe `EVT-003`.

Billing no lo recibe porque falta el atributo SNS `eventType`.

### 45.3. Regla

La coincidencia del cuerpo no reemplaza atributos requeridos por el alcance del filtro.

---

## 46. Sesión 11: ampliar el filtro

Un consumidor puede ampliar sus eventos aceptados sin cambiar el tema.

### 46.1. Cambio

En `main.tf`, utiliza:

```hcl
filter_attributes = {
  eventType = ["order.created", "order.cancelled"]
}
```

### 46.2. Aplicación

Revisa un plan nuevo y aplícalo.

Consulta los atributos de la suscripción antes de volver a publicar.

### 46.3. Propagación

En AWS real, los cambios de filtros pueden tardar hasta 15 minutos en propagarse completamente.

### 46.4. Regla

No conviertas un timeout breve del laboratorio en una garantía de propagación AWS.

---

## 47. Sesión 12: verificar el filtro ampliado

Publica un evento nuevo, no reutilices únicamente resultados anteriores.

### 47.1. Caso

Utiliza `event_id = EVT-004` y atributo `eventType = order.cancelled`.

### 47.2. Resultado esperado

Ambas colas deben recibir ese evento después de que el filtro sea efectivo.

### 47.3. Historial

Ampliar el filtro no vuelve a entregar automáticamente publicaciones históricas excluidas.

### 47.4. Limpieza

Confirma las dos copias con sus handles correspondientes.

### 47.5. Regla

Distingue configuración nueva, propagación y publicaciones nuevas.

---

## 48. Pruebas declarativas del contrato

Crea `tests/messaging.tftest.hcl`.

### 48.1. Plan válido

```hcl
run "contract_plan" {
  command = plan

  variables {
    suffix = "test01"
  }

  assert {
    condition     = output.messaging.contract_version == 1
    error_message = "El contrato debe publicar su versión."
  }

  assert {
    condition     = length(output.messaging.consumers) == 2
    error_message = "La raíz debe declarar dos consumidores."
  }

  assert {
    condition     = output.messaging.consumers.billing.raw_message_delivery
    error_message = "Billing debe utilizar entrega raw."
  }

  assert {
    condition     = output.messaging.consumers.analytics.filter_attributes == null
    error_message = "Analytics no debe tener filtro."
  }
}
```

---

## 49. Prueba negativa del módulo

Añade una ejecución con entrada inválida.

### 49.1. Caso

```hcl
run "reject_invalid_consumer" {
  command = plan

  module {
    source = "./modules/messaging"
  }

  variables {
    name = "curso-invalid"

    consumers = {
      billing = {
        visibility_timeout_seconds = -1
      }
    }
  }

  expect_failures = [var.consumers]
}
```

### 49.2. Propósito

La prueba espera rechazo de validación, no un fallo remoto al crear la cola.

---

## 50. Sesión 13: ejecutar pruebas

Las pruebas detectan cambios accidentales en la interfaz.

### 50.1. Comandos

```bash
terraform fmt -recursive
terraform validate
terraform test
```

### 50.2. Alcance

Estas ejecuciones solicitan planes y no publican eventos.

### 50.3. Proveedor

No utilizamos mocks; conserva LocalStack disponible.

### 50.4. Regla

Las aserciones del contrato complementan, pero no sustituyen, las pruebas funcionales SNS→SQS.

---

## 51. Duplicados, orden e idempotencia

Los recursos de esta práctica son estándar, no FIFO.

### 51.1. Diseño del consumidor

Debe tolerar entregas duplicadas y no depender de un orden estricto.

### 51.2. Identidad de negocio

`event_id` permite reconocer un evento independientemente de identificadores del transporte.

### 51.3. Idempotencia

Procesar nuevamente el mismo evento no debería repetir un efecto irreversible.

### 51.4. Regla

Una prueba local sin duplicados no demuestra entrega exactamente una vez.

---

## 52. Visibilidad y reintentos

La visibilidad debe corresponder al tiempo de procesamiento del consumidor.

### 52.1. Si es demasiado corta

Otro trabajador puede recibir el mensaje antes de que termine el primero.

### 52.2. Si es demasiado larga

La recuperación de un procesamiento fallido puede retrasarse.

### 52.3. Reintentos

SNS reintenta determinadas entregas fallidas; SQS controla posteriores recepciones del consumidor.

### 52.4. Regla

Son etapas diferentes y requieren observabilidad distinta.

---

## 53. DLQ y límites del módulo

Este módulo no incluye DLQ deliberadamente.

### 53.1. Dos problemas distintos

Una DLQ de suscripción SNS puede conservar fallos de entrega al destino.

Una DLQ SQS puede conservar mensajes que el consumidor recibe repetidamente sin confirmar.

### 53.2. No son equivalentes

Actúan en puntos diferentes del recorrido.

### 53.3. Ampliación

Una versión posterior puede incorporar ambas con contratos separados.

### 53.4. Regla

No presentes una DLQ genérica como solución automática para todos los fallos.

---

## 54. Documentación y evolución

Crea `modules/messaging/README.md`.

### 54.1. Contenido mínimo

Documenta entradas, outputs, defaults y semántica de filtros.

Explica raw, envoltorio y autorización de SNS.

### 54.2. Compatibilidad

Añadir opciones puede ser compatible; cambiar defaults puede modificar consumidores existentes.

### 54.3. Direcciones

Renombrar claves o recursos internos puede requerir migraciones de estado.

### 54.4. Regla

Revisa interfaz, comportamiento y direcciones como aspectos diferentes.

---

## 55. Diagnóstico de entregas ausentes

Investiga el recorrido completo antes de modificar el estado.

### 55.1. Lista de comprobación

Comprueba tema, suscripción, protocolo y endpoint.

Revisa política de cola, raw, alcance y atributos de publicación.

### 55.2. SQS

Comprueba mensajes invisibles por recepciones anteriores.

### 55.3. Emulador

Consulta disponibilidad y logs de LocalStack.

### 55.4. Regla

No retires recursos del estado para corregir un mensaje filtrado correctamente.

---

## 56. Preparar la limpieza

La destrucción elimina colas y mensajes pendientes.

### 56.1. Evidencias

```bash
umask 077
terraform state pull > copias/before-destroy.tfstate

terraform output -json messaging \
  > resultados/messaging-before-destroy.json

aws_local sns list-subscriptions-by-topic \
  --topic-arn "$TOPIC_ARN" \
  > resultados/subscriptions-before-destroy.json
```

### 56.2. Condición

Detén publicaciones y consumidores antes de destruir.

### 56.3. Regla

Una copia del estado no es una copia de los mensajes SQS.

---

## 57. Destruir la infraestructura

Mantén LocalStack disponible durante la destrucción.

### 57.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan

terraform state list
aws_local sns list-topics
aws_local sqs list-queues
docker compose down
```

### 57.2. Resultado esperado

Desaparecen tema, colas, políticas y suscripciones del laboratorio.

### 57.3. Precaución

Borrar archivos locales no sustituye la destrucción.

---

## 58. Diferencias respecto a AWS real

La emulación permite practicar integración, no certificar producción.

### 58.1. Aspectos adicionales

En AWS real revisa IAM, KMS, costes, cuotas, auditoría y métricas.

### 58.2. Comportamiento

Valida propagación de filtros, reintentos y manejo de errores.

### 58.3. Persistencia

Eliminar LocalStack puede hacer desaparecer mensajes y recursos según la configuración utilizada.

### 58.4. Regla

Documenta garantías observadas y propiedades no comprobadas.

---

## 59. Ejercicios y evaluación

La evaluación debe demostrar configuración y comportamiento verificable.

### 59.1. Ejercicios

1. Documenta el contrato completo.
2. Comprueba la política restringida al tema.
3. Compara raw y envoltorio.
4. Publica eventos aceptados y excluidos.
5. Demuestra que el cuerpo no sustituye atributos.
6. Amplía un filtro y verifica publicaciones nuevas.
7. Explica idempotencia y tipos de DLQ.
8. Destruye y verifica todos los recursos.

### 59.2. Entrega

Incluye código, pruebas, consultas API y evidencias por `event_id`.

---

## 60. Resumen de la lección

Un módulo SNS y SQS agrupa distribución, persistencia y autorización en una interfaz reutilizable.

### 60.1. Ideas esenciales

- SNS distribuye; SQS conserva.
- Cada consumidor tiene su propia copia.
- La política SQS debe autorizar al tema.
- Raw cambia la representación del mensaje.
- Los filtros requieren atributos coherentes.
- Recibir no equivale a confirmar.
- Los consumidores deben tolerar duplicados.
- Las pruebas de plan no demuestran toda la entrega.

### 60.2. Procedimiento recomendado

Diseña, valida, despliega, publica, observa y confirma antes de limpiar.

### 60.3. Idea final

**Un módulo de mensajería fiable no solo crea recursos: hace explícitos los contratos de publicación, entrega y consumo, y permite comprobar el recorrido completo de cada evento.**