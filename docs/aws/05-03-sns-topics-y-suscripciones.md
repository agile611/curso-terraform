# SNS: topics y suscripciones con Terraform y LocalStack

Amazon SNS permite publicar mensajes en un topic y distribuirlos a suscripciones.

El productor publica una vez.

SNS evalúa las suscripciones y entrega el mensaje a los destinos correspondientes.

Este modelo permite construir sistemas de publicación y suscripción sin conectar directamente cada productor con cada consumidor.

En esta lección utilizarás colas SQS como destinos de SNS.

Terraform gestionará el topic, las colas, sus políticas y las suscripciones.

LocalStack emulará las API necesarias para practicar localmente.

También comprobarás filtros, formatos de entrega y límites de las garantías del sistema.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos de aprendizaje

La práctica combina infraestructura declarativa y operaciones de publicación y recepción.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un topic SNS.
- Crear suscripciones hacia SQS.
- Autorizar entregas mediante políticas de cola.
- Publicar mensajes mediante AWS CLI.
- Diferenciar mensaje original y envoltorio SNS.
- Configurar entrega sin envoltorio.
- Aplicar filtros por atributos.
- Verificar fan-out hacia varios destinos.
- Distinguir entrega de procesamiento.
- Destruir el laboratorio con un alcance controlado.

### 1.2. Resultado práctico

Construirás un topic con dos suscripciones y comprobarás qué mensajes recibe cada cola.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Terraform y SQS.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, `for_each`, outputs y políticas JSON.

Los comandos utilizan una terminal compatible con Bash.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones que deben comprobarse

Verifica en la imagen y edición elegidas:

- Creación de topics.
- Creación de colas.
- Suscripciones SNS hacia SQS.
- Políticas de acceso de colas.
- Publicación de mensajes.
- Entrega con y sin envoltorio.
- Filtrado por atributos.
- Eliminación de todos los recursos.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones de esta página no identifican necesariamente las versiones más recientes.

---

## 4. Qué es un topic

Un topic es un punto de publicación de mensajes.

### 4.1. Productor

El productor utiliza el ARN del topic para publicar.

No necesita conocer las URL de todas las colas consumidoras.

### 4.2. Suscriptores

Cada suscripción conecta el topic con un destino.

### 4.3. Flujo conceptual

```text
Productor → Topic SNS → Suscripciones → Destinos
```

### 4.4. Responsabilidad

El topic distribuye mensajes según su configuración.

No ejecuta automáticamente la lógica de negocio de los consumidores.

---

## 5. Qué es una suscripción

Una suscripción declara cómo entregar mensajes a un destino.

### 5.1. Elementos principales

Incluye:

- Topic de origen.
- Protocolo.
- Endpoint.
- Opciones de entrega.
- Política de filtrado, cuando corresponda.

### 5.2. Protocolo del laboratorio

Utilizaremos:

```text
sqs
```

### 5.3. Endpoint

Para una suscripción SQS, el endpoint es el ARN de la cola.

### 5.4. Precaución

No utilices la URL de la cola como endpoint de esta suscripción.

---

## 6. Identificadores principales

Cada identificador cumple una función distinta.

### 6.1. Comparación

| **Identificador** | **Uso** | **Dónde se obtiene** |
|-------------------|---------|----------------------|
| ARN del topic | Publicar y crear suscripciones | Recurso SNS |
| ARN de la cola | Endpoint y políticas | Recurso SQS |
| URL de la cola | Recibir y eliminar mensajes | Recurso SQS |
| ARN de suscripción | Consultar o eliminar la suscripción | Recurso de suscripción |

No construyas estos identificadores manualmente.

### 6.2. Regla del laboratorio

Utilizaremos outputs para recuperar ARN y URL.

### 6.3. LocalStack

El formato de las URL puede variar según la estrategia de endpoints.

---

## 7. SNS y SQS

Los servicios tienen responsabilidades complementarias.

### 7.1. Comparación

| **Servicio** | **Responsabilidad principal** | **Interacción del consumidor** |
|--------------|-------------------------------|--------------------------------|
| SNS | Distribuir publicaciones | Recibe mediante un endpoint suscrito |
| SQS | Mantener mensajes disponibles | Solicita mensajes y los elimina |
| SNS con SQS | Distribuir hacia colas persistentes | Consume desde cada cola |

SNS no sustituye automáticamente una cola de trabajo.

### 7.2. Combinación

SNS permite publicar una vez hacia varios destinos.

SQS permite que cada consumidor procese a su propio ritmo.

### 7.3. Resultado

Cada cola mantiene sus propios mensajes y su propio ciclo de consumo.

---

## 8. Fan-out

Fan-out significa distribuir una publicación hacia varios destinos.

### 8.1. Ejemplo

```text
                        ┌→ Cola de pedidos
Productor → Topic SNS ──┤
                        └→ Cola de auditoría
```

### 8.2. Independencia

Eliminar un mensaje de una cola no elimina su copia de otra.

### 8.3. Filtrado

Una suscripción puede aceptar solamente una parte de las publicaciones.

### 8.4. Precaución

Las entregas no constituyen una transacción conjunta entre todos los destinos.

Un destino puede recibir mientras otro presenta problemas.

---

## 9. Topics estándar y FIFO

La elección afecta al orden y a la deduplicación.

### 9.1. Comparación

| **Tipo** | **Características relevantes** | **Uso orientativo** |
|----------|--------------------------------|--------------------|
| Estándar | Entrega al menos una vez y sin orden global garantizado | Distribución general de eventos |
| FIFO | Orden y deduplicación bajo condiciones específicas | Flujos que requieren secuencia por grupo |

Esta práctica utiliza un topic estándar y colas estándar.

### 9.2. Duplicados

Los consumidores deben tolerar entregas duplicadas.

### 9.3. Orden

No presupongas que las publicaciones se reciben en su orden original.

### 9.4. Producción

Revisa las garantías de toda la cadena, no solamente las del topic.

---

## 10. Permisos de publicación y entrega

Publicar en SNS y entregar en SQS son operaciones diferentes.

### 10.1. Publicación

El productor necesita permiso para publicar en el topic.

### 10.2. Entrega

SNS necesita autorización para enviar mensajes a la cola.

### 10.3. Política de cola

La cola puede autorizar al principal de servicio:

```text
sns.amazonaws.com
```

### 10.4. Restricción

La política del laboratorio limitará la entrega al ARN del topic esperado.

### 10.5. AWS real

También debes revisar IAM, políticas del topic y permisos de cifrado.

---

## 11. Política de acceso de la cola

Una suscripción no debe confundirse con la autorización del destino.

### 11.1. Acción necesaria

```text
sqs:SendMessage
```

### 11.2. Recurso

El recurso autorizado es el ARN de la cola.

### 11.3. Condición

Utilizaremos:

```text
aws:SourceArn
```

### 11.4. Objetivo

Permitir entregas desde el topic del laboratorio.

### 11.5. Recomendación

No abras la cola a cualquier principal para solucionar un error de entrega.

---

## 12. Formatos de entrega

SNS puede entregar un envoltorio o el mensaje original.

### 12.1. Entrega con envoltorio

El cuerpo SQS contiene un documento SNS.

El mensaje original aparece dentro del campo `Message`.

### 12.2. Entrega sin envoltorio

Con `raw_message_delivery = true`, el cuerpo SQS contiene el mensaje original.

### 12.3. Comparación

| **Modalidad** | **Cuerpo SQS** | **Lectura de JSON original** |
|---------------|---------------|-----------------------------|
| Con envoltorio | JSON de notificación SNS | Decodificar envoltorio y `Message` |
| Raw | Cuerpo publicado | Decodificar el cuerpo una vez |

La elección modifica el contrato del consumidor.

### 12.4. Laboratorio

Auditoría recibirá envoltorio y pedidos recibirá contenido raw.

---

## 13. Atributos de mensaje

Los atributos transportan información adicional a la publicación.

### 13.1. Ejemplo

```json
{
  "event_type": {
    "DataType": "String",
    "StringValue": "order.created"
  }
}
```

### 13.2. Uso

Pueden servir para filtrar sin analizar el cuerpo completo.

### 13.3. Distinción

Un campo JSON del cuerpo no es automáticamente un atributo SNS.

### 13.4. Contrato

El productor debe publicar los atributos que esperan las suscripciones.

---

## 14. Filtros de suscripción

Un filtro selecciona qué publicaciones acepta una suscripción.

### 14.1. Ejemplo

```json
{
  "event_type": ["order.created", "order.updated"]
}
```

### 14.2. Comportamiento

La suscripción acepta los valores indicados.

### 14.3. Sin filtro

Una suscripción sin filtro acepta las publicaciones compatibles con su configuración.

### 14.4. Precaución

Un mensaje filtrado no representa necesariamente un error de entrega.

Puede ser una exclusión correcta y prevista.

---

## 15. Alcance del filtro

SNS permite aplicar filtros sobre fuentes de información diferentes.

### 15.1. Comparación

| **Alcance** | **Información evaluada** | **Requisito del productor** |
|-------------|--------------------------|-----------------------------|
| `MessageAttributes` | Atributos SNS | Publicar atributos compatibles |
| `MessageBody` | Cuerpo JSON | Publicar un cuerpo JSON compatible |

Esta práctica utiliza `MessageAttributes`.

### 15.2. Regla

El cuerpo y los atributos son contratos diferentes.

### 15.3. Raw delivery

La modalidad raw no cambia por sí sola el alcance del filtro.

### 15.4. Recomendación

Declara explícitamente el alcance para facilitar la revisión.

---

## 16. Semántica básica de filtrado

El filtro necesita valores y tipos compatibles.

### 16.1. Valores de una propiedad

Varios valores admitidos representan alternativas.

### 16.2. Varias propiedades

Un filtro con varias propiedades exige que las condiciones correspondientes se satisfagan.

### 16.3. Atributo ausente

Un mensaje sin el atributo requerido no coincide con el filtro habitual de valores.

### 16.4. Mayúsculas

No presupongas equivalencia entre:

```text
order.created
Order.Created
```

### 16.5. Práctica

Utilizaremos valores exactos para evitar ambigüedades.

---

## 17. Propagación de filtros

Cambiar un filtro no garantiza un efecto instantáneo en AWS.

### 17.1. AWS real

Los cambios de políticas de filtrado pueden tardar hasta quince minutos en aplicarse completamente.

### 17.2. LocalStack

Puede aplicar cambios de forma más rápida o comportarse de manera diferente.

### 17.3. Consecuencia

Una publicación inmediata después de un cambio no siempre valida su comportamiento definitivo.

### 17.4. Regla

Documenta la ventana de propagación y repite pruebas de manera controlada.

### 17.5. Laboratorio

Verificaremos primero los atributos de la suscripción.

---

## 18. Diseño del laboratorio

Construiremos un topic y dos destinos con comportamientos distintos.

### 18.1. Destinos

| **Cola** | **Filtro** | **Formato** |
|----------|------------|-------------|
| `orders` | Eventos `order.created` y `order.updated` | Raw |
| `audit` | Sin filtro | Envoltorio SNS |

La cola de auditoría recibirá también publicaciones que pedidos no acepta.

### 18.2. Recursos

Terraform gestionará:

- Un topic.
- Dos colas.
- Dos políticas de cola.
- Dos suscripciones.

### 18.3. Mensajes

AWS CLI publicará y consumirá los eventos ficticios.

---

## 19. Preparación del directorio

Trabaja en una carpeta independiente.

### 19.1. Crear estructura

```bash
mkdir -p terraform-sns-localstack/planes
mkdir -p terraform-sns-localstack/mensajes
mkdir -p terraform-sns-localstack/resultados
cd terraform-sns-localstack
```

### 19.2. Archivos principales

```text
terraform-sns-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
└── outputs.tf
```

---

## 20. Protección de archivos

Separa configuración pública y artefactos operativos.

### 20.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
planes/
resultados/
crash.log
```

### 20.2. Qué versionar

Versiona configuración, mensajes ficticios y `.terraform.lock.hcl`.

### 20.3. Precaución

No publiques resultados que contengan mensajes reales o datos sensibles.

---

## 21. Selección de LocalStack

Utiliza una referencia validada por el docente.

### 21.1. Imagen

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 21.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 21.3. Alcance

La práctica requiere SNS y SQS.

### 21.4. Advertencia

No presupongas soporte idéntico de filtros y modalidades de entrega entre versiones.

---

## 22. Docker Compose

La configuración debe devolver URL de cola utilizables desde el host.

### 22.1. `compose.yaml`

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

### 22.2. Arranque

```bash
docker compose up -d
docker compose ps
```

### 22.3. Verificación

Comprueba que la imagen elegida admite esta estrategia de endpoints.

---

## 23. Credenciales ficticias y conexión

Configura AWS CLI en la terminal actual.

### 23.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 23.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 sns list-topics
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
```

### 23.3. Continuación

Espera respuestas válidas antes de desplegar Terraform.

---

## 24. Requisitos de Terraform

Crea `versions.tf`.

### 24.1. Configuración

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

### 24.2. Interpretación

El proveedor AWS gestionará SNS y SQS.

### 24.3. Bloqueo

El archivo de bloqueo conserva la versión concreta seleccionada.

---

## 25. Proveedor con endpoints locales

Crea `providers.tf`.

### 25.1. Configuración

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

### 25.2. Alcance

No añadas otros servicios sin configurar sus endpoints.

---

## 26. Variable e instancias del laboratorio

Crea `variables.tf` y `terraform.tfvars`.

### 26.1. Variable

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 26.2. Entrada

```hcl
suffix = "alumno01"
```

### 26.3. Identidad

Alumnos que comparten LocalStack necesitan sufijos diferentes.

---

## 27. Configuración de suscriptores

Crea `locals.tf`.

### 27.1. Colección

```hcl
locals {
  subscribers = {
    orders = {
      raw_delivery = true
      filter_policy = jsonencode({
        event_type = ["order.created", "order.updated"]
      })
    }

    audit = {
      raw_delivery  = false
      filter_policy = null
    }
  }
}
```

### 27.2. Responsabilidad

Cada clave identifica una cola y su suscripción.

La ausencia de filtro en auditoría se expresa mediante `null`.

---

## 28. Topic y colas

Crea `main.tf`.

### 28.1. Recursos

```hcl
resource "aws_sns_topic" "events" {
  name = "curso-sns-events-${var.suffix}"

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}

resource "aws_sqs_queue" "subscriber" {
  for_each = local.subscribers

  name                       = "curso-sns-${each.key}-${var.suffix}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 5

  tags = {
    Laboratory = "LocalStack"
    Consumer   = each.key
  }
}
```

---

## 29. Políticas de entrega

Añade las políticas a `main.tf`.

### 29.1. Configuración

```hcl
resource "aws_sqs_queue_policy" "sns_delivery" {
  for_each = aws_sqs_queue.subscriber

  queue_url = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowExpectedSNSTopic"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = each.value.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.events.arn
        }
      }
    }]
  })
}
```

---

## 30. Suscripciones SNS hacia SQS

Añade las suscripciones al mismo archivo.

### 30.1. Configuración

```hcl
resource "aws_sns_topic_subscription" "subscriber" {
  for_each = local.subscribers

  topic_arn = aws_sns_topic.events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.subscriber[each.key].arn

  raw_message_delivery = each.value.raw_delivery
  filter_policy         = each.value.filter_policy
  filter_policy_scope   = "MessageAttributes"

  # Crear suscripciones después de autorizar la entrega a las colas.
  depends_on = [
    aws_sqs_queue_policy.sns_delivery
  ]
}
```

### 30.2. Dependencia

La dependencia explícita cubre las políticas de destino antes de crear las suscripciones.

---

## 31. Outputs del proyecto

Crea `outputs.tf`.

### 31.1. Resultados

```hcl
output "topic_arn" {
  value = aws_sns_topic.events.arn
}

output "queue_urls" {
  value = {
    for key, queue in aws_sqs_queue.subscriber :
    key => queue.id
  }
}

output "subscription_arns" {
  value = {
    for key, subscription in aws_sns_topic_subscription.subscriber :
    key => subscription.arn
  }
}
```

### 31.2. Alcance

Los outputs publican identificadores; no comprueban una entrega nueva.

---

## 32. Sesión 1: desplegar infraestructura

Duración orientativa: 25 minutos.

### 32.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 32.2. Resultado esperado

Deben crearse siete recursos Terraform.

Un topic, dos colas, dos políticas y dos suscripciones.

### 32.3. Entregable

Dibuja la relación entre topic, permisos y destinos.

---

## 33. Sesión 2: recuperar identificadores

Utiliza los outputs en la terminal actual.

### 33.1. Variables

```bash
TOPIC_ARN="$(terraform output -raw topic_arn)"
ORDERS_URL="$(terraform output -json queue_urls | jq -er '.orders')"
AUDIT_URL="$(terraform output -json queue_urls | jq -er '.audit')"
ORDERS_SUB="$(terraform output -json subscription_arns | jq -er '.orders')"
AUDIT_SUB="$(terraform output -json subscription_arns | jq -er '.audit')"
```

### 33.2. Revisión

```bash
printf 'Topic: %s\n' "$TOPIC_ARN"
printf 'Pedidos: %s\n' "$ORDERS_URL"
printf 'Auditoría: %s\n' "$AUDIT_URL"
```

### 33.3. Precaución

Si abres otra terminal, vuelve a configurar credenciales y variables.

---

## 34. Sesión 3: verificar suscripciones y políticas

Comprueba la configuración remota antes de publicar.

### 34.1. Suscripción de pedidos

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns get-subscription-attributes \
  --subscription-arn "$ORDERS_SUB" \
  > resultados/orders-subscription.json
```

### 34.2. Política de cola

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs get-queue-attributes --queue-url "$ORDERS_URL" \
  --attribute-names Policy > resultados/orders-policy.json
```

### 34.3. Lectura

Utiliza `fromjson` para examinar las políticas almacenadas como cadenas JSON.

---

## 35. Sesión 4: preparar el primer evento

El cuerpo contiene la información de negocio.

### 35.1. `mensajes/order-created.json`

```json
{
  "event_id": "evento-order-001",
  "event_type": "order.created",
  "order_id": "order-001",
  "environment": "local"
}
```

### 35.2. `mensajes/order-attributes.json`

```json
{
  "event_type": {
    "DataType": "String",
    "StringValue": "order.created"
  },
  "environment": {
    "DataType": "String",
    "StringValue": "local"
  }
}
```

---

## 36. Sesión 5: publicar el evento

El productor utiliza el topic, no las colas.

### 36.1. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish \
  --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/order-created.json \
  --message-attributes file://mensajes/order-attributes.json \
  > resultados/publish-order.json
```

### 36.2. Comprobación

```bash
jq '.' resultados/publish-order.json
```

### 36.3. Resultado esperado

SNS devuelve un identificador de publicación.

Esto no demuestra todavía el procesamiento de los consumidores.

---

## 37. Función de recepción para las prácticas

Utilizaremos una función que espera de manera acotada.

### 37.1. Definir en la terminal

```bash
receive_one() {
  local queue_url="$1"
  local output_file="$2"
  local attempt

  for attempt in 1 2 3 4; do
    aws --endpoint-url=http://localhost:4566 --region us-east-1 \
      sqs receive-message --queue-url "$queue_url" \
      --max-number-of-messages 1 --wait-time-seconds 5 \
      --visibility-timeout 120 \
      --message-attribute-names All \
      --message-system-attribute-names All > "$output_file" || return 1

    if jq -e '.Messages[0] != null' "$output_file" >/dev/null; then
      return 0
    fi
  done
  return 2
}
```

---

## 38. Sesión 6: recibir desde pedidos

La cola de pedidos utiliza entrega raw.

### 38.1. Recepción

```bash
receive_one "$ORDERS_URL" resultados/orders-first.json
```

### 38.2. Examinar el cuerpo

```bash
jq '.Messages[0].Body | fromjson' resultados/orders-first.json
```

### 38.3. Atributos

```bash
jq '.Messages[0].MessageAttributes' resultados/orders-first.json
```

### 38.4. Resultado esperado

El cuerpo debe corresponder al evento original.

### 38.5. Precaución

Si la función devuelve `2`, investiga antes de continuar.

---

## 39. Sesión 7: recibir desde auditoría

Auditoría utiliza el envoltorio SNS.

### 39.1. Recepción

```bash
receive_one "$AUDIT_URL" resultados/audit-first.json
```

### 39.2. Examinar envoltorio

```bash
jq '.Messages[0].Body | fromjson' resultados/audit-first.json
```

### 39.3. Extraer evento

```bash
jq '.Messages[0].Body | fromjson | .Message | fromjson' \
  resultados/audit-first.json
```

### 39.4. Resultado esperado

El evento original coincide con pedidos, pero el formato externo es diferente.

---

## 40. Confirmar procesamiento y eliminar mensajes

Cada cola necesita su propia confirmación.

### 40.1. Función auxiliar

```bash
delete_received() {
  local queue_url="$1"
  local input_file="$2"
  local receipt

  receipt="$(jq -er '.Messages[0].ReceiptHandle' "$input_file")" || return 1

  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs delete-message \
    --queue-url "$queue_url" \
    --receipt-handle "$receipt"
}
```

### 40.2. Eliminar después de revisar

```bash
delete_received "$ORDERS_URL" resultados/orders-first.json
delete_received "$AUDIT_URL" resultados/audit-first.json
```

---

## 41. Sesión 8: publicar un evento que no coincide

Publicaremos un evento de inventario.

### 41.1. Cuerpo

Crea `mensajes/inventory.json`:

```json
{
  "event_id": "evento-inventory-001",
  "event_type": "inventory.updated",
  "product_id": "product-001"
}
```

### 41.2. Atributos

Crea `mensajes/inventory-attributes.json`:

```json
{
  "event_type": {
    "DataType": "String",
    "StringValue": "inventory.updated"
  }
}
```

---

## 42. Sesión 9: comprobar el filtro

Asegúrate de haber terminado los mensajes de las sesiones anteriores.

### 42.1. Publicar inventario

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/inventory.json \
  --message-attributes file://mensajes/inventory-attributes.json
```

### 42.2. Auditoría

Recibe, valida el evento y elimínalo después de procesarlo.

### 42.3. Pedidos

Solicita mensajes durante una ventana acotada.

No debería recibirse ese evento.

### 42.4. Límite

Una respuesta vacía aislada no prueba definitivamente la ausencia de entrega.

---

## 43. Sesión 10: publicar sin atributos

El cuerpo no sustituye automáticamente los atributos del filtro.

### 43.1. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/order-created.json
```

### 43.2. Resultado esperado

Auditoría acepta el mensaje porque no tiene filtro.

Pedidos no coincide porque falta el atributo requerido.

### 43.3. Entregable

Explica por qué el campo `event_type` del cuerpo no resuelve esta ausencia.

### 43.4. Finalización

Procesa y elimina el mensaje recibido en auditoría.

---

## 44. Sesión 11: modificar el filtro con Terraform

El cambio amplía las publicaciones aceptadas por pedidos.

### 44.1. Modificación

Añade `inventory.updated` a la lista de `event_type` en `locals.tf`.

### 44.2. Plan y aplicación

```bash
terraform plan -out=planes/expand-filter.tfplan
terraform show planes/expand-filter.tfplan
terraform apply planes/expand-filter.tfplan
```

### 44.3. Verificación

Consulta nuevamente los atributos de la suscripción.

### 44.4. Prueba

Publica otro evento de inventario con un `event_id` nuevo.

### 44.5. Propagación

Respeta las diferencias de tiempo entre LocalStack y AWS real.

---

## 45. Filtrado por cuerpo y límites de raw delivery

Estas opciones requieren revisar el contrato completo.

### 45.1. Filtrado por cuerpo

Una ampliación puede utilizar:

```hcl
filter_policy_scope = "MessageBody"
```

El cuerpo debe ser JSON compatible con la política declarada.

### 45.2. Cambio de contrato

No cambies el alcance sin modificar también las pruebas del productor.

### 45.3. Límite de atributos raw

Para entregas raw hacia SQS, SNS admite hasta diez atributos de mensaje.

Publicaciones con más atributos no deben tratarse como un caso compatible con esa suscripción.

### 45.4. Recomendación

Mantén los atributos mínimos necesarios para enrutamiento y contexto.

---

## 46. Fallos, DLQ e idempotencia

Entrega fallida y procesamiento fallido pertenecen a etapas diferentes.

### 46.1. Distinción

| **Situación** | **Etapa** | **Mecanismo relevante** |
|---------------|-----------|------------------------|
| SNS no puede entregar al endpoint | Distribución | DLQ de suscripción SNS |
| El consumidor falla repetidamente | Procesamiento SQS | DLQ de la cola SQS |
| El filtro excluye el evento | Selección | Comportamiento previsto del filtro |

Una DLQ de suscripción no sustituye una DLQ del consumidor.

### 46.2. Idempotencia

Conserva un `event_id` estable.

El consumidor debe evitar efectos duplicados aunque reciba varias copias.

### 46.3. Recuperación

Investiga la causa antes de reenviar mensajes.

---

## 47. Confirmación, otros protocolos y observabilidad

Las suscripciones SQS del laboratorio no representan todos los protocolos SNS.

### 47.1. Confirmación

Suscripciones HTTP/S y email requieren procedimientos específicos de confirmación.

En escenarios entre cuentas también debes revisar propiedad y permisos.

### 47.2. Otros destinos

No utilices direcciones email reales, SMS ni endpoints públicos en esta práctica.

### 47.3. Observabilidad

En AWS real revisa métricas de publicación, entrega y filtrado.

Configura registros de entrega donde estén disponibles y sean adecuados.

### 47.4. Interpretación

Un `publish` exitoso no demuestra que cada consumidor completó su trabajo.

---

## 48. Diagnóstico de problemas

Clasifica el fallo antes de modificar permisos o repetir publicaciones.

### 48.1. Lista de revisión

Comprueba:

- Endpoint local de SNS y SQS.
- ARN correcto del topic.
- Endpoint de suscripción igual al ARN de la cola.
- Política que autoriza al topic esperado.
- Filtro y alcance configurados.
- Atributos publicados.
- Formato raw o con envoltorio.
- Mensajes en vuelo por visibilidad.
- Ventana de propagación.

### 48.2. Advertencia

Republicar repetidamente puede introducir duplicados y dificultar el diagnóstico.

### 48.3. Evidencia

Utiliza `event_id` distintos para separar pruebas.

---

## 49. Limpieza y diferencias respecto a AWS real

Mantén LocalStack activo durante la destrucción.

### 49.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 sns list-topics
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
docker compose down
```

### 49.2. Datos

Eliminar las colas también elimina sus mensajes pendientes.

### 49.3. AWS real

Revisa IAM, cifrado, costes, cuotas, propagación y políticas entre cuentas.

LocalStack no valida toda la seguridad ni todos los tiempos operativos.

---

## 50. Ejercicios y resumen

Consolida el contrato entre productor, topic y consumidores.

### 50.1. Ejercicios

1. Añade una tercera cola suscrita.
2. Configura un filtro diferente.
3. Publica eventos que coincidan y que no coincidan.
4. Compara entrega raw y envoltorio SNS.
5. Explica la diferencia entre ARN y URL.
6. Distingue DLQ de entrega y DLQ de procesamiento.
7. Documenta una estrategia de idempotencia.
8. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

SNS distribuye publicaciones; SQS mantiene mensajes para consumo.

Las políticas autorizan y los filtros seleccionan.

### 50.3. Idea final

Un sistema de publicación y suscripción correcto define permisos, formatos, filtros y confirmaciones de procesamiento como contratos explícitos y verificables.