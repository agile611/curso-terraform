# Integración de SNS y SQS con Terraform y LocalStack

Amazon SNS distribuye publicaciones hacia suscriptores y Amazon SQS mantiene mensajes disponibles para su procesamiento.

Al combinarlos, un productor puede publicar un evento una sola vez y permitir que varios consumidores trabajen de forma independiente.

Terraform declara los topics, las colas, las suscripciones y las políticas que conectan estos componentes.

LocalStack permite practicar esta arquitectura mediante una emulación local de las API de AWS.

En esta lección construirás un sistema de distribución de eventos con dos consumidores y sus respectivas colas de mensajes fallidos.

Las sesiones cubrirán publicación, filtrado, recepción, confirmación, reintentos y recuperación controlada.

También distinguirás un fallo de entrega desde SNS de un fallo de procesamiento dentro de un consumidor SQS.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos de aprendizaje

Esta lección integra los conceptos de las páginas anteriores en una arquitectura completa.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar las responsabilidades de SNS y SQS.
- Construir una arquitectura de fan-out.
- Autorizar entregas desde un topic concreto.
- Crear suscripciones con filtros.
- Configurar DLQ para consumidores SQS.
- Publicar y consumir eventos ficticios.
- Confirmar procesamiento mediante eliminación.
- Observar reintentos sin ocultar mensajes fallidos.
- Recuperar un evento con un procedimiento controlado.

### 1.2. Resultado práctico

Desplegarás un topic, dos colas principales y dos DLQ.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de las lecciones de SNS y SQS.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer `resource`, `for_each`, `jsonencode`, referencias y outputs.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del entorno

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones que deben comprobarse

Verifica en la imagen y edición elegidas:

- Topics SNS y colas SQS.
- Suscripciones SNS hacia SQS.
- Políticas de acceso de colas.
- Entrega raw.
- Filtros por atributos.
- Políticas de redirección SQS.
- Transferencia de mensajes a DLQ.
- Recepción, eliminación y destrucción.

### 3.2. Registro de versiones

Documenta Terraform, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Una configuración escrita no demuestra que una combinación de versiones haya sido probada.

---

## 4. Responsabilidades de cada componente

La arquitectura funciona mejor cuando cada servicio tiene una responsabilidad explícita.

### 4.1. Comparación

| **Componente** | **Responsabilidad** | **No garantiza por sí solo** |
|----------------|---------------------|-----------------------------|
| Productor | Publicar eventos | Procesamiento de consumidores |
| SNS | Distribuir publicaciones | Finalización del trabajo |
| SQS | Mantener mensajes para consumo | Éxito de la lógica de negocio |
| Consumidor | Procesar y confirmar | Ausencia de duplicados |
| DLQ | Aislar mensajes problemáticos | Reparación automática |

Esta separación permite diagnosticar cada etapa.

### 4.2. Regla principal

**Publicar, entregar, recibir y procesar son acciones diferentes.**

### 4.3. Consecuencia

Una publicación exitosa no equivale a una operación de negocio completada.

---

## 5. Arquitectura de fan-out

Fan-out permite distribuir una publicación hacia varios destinos.

### 5.1. Flujo del laboratorio

```text
                             ┌→ SQS orders → Consumidor orders
Productor → SNS events ──────┤                   ↓
                             │                 DLQ orders
                             │
                             └→ SQS audit → Consumidor audit
                                               ↓
                                             DLQ audit
```

### 5.2. Independencia

Cada cola mantiene su propio ciclo de recepción y eliminación.

### 5.3. Ventaja

Un consumidor lento no necesita bloquear directamente al otro.

### 5.4. Límite

Las entregas a todos los destinos no forman una transacción conjunta.

---

## 6. Selección de consumidores

Los filtros permiten que cada consumidor reciba solamente eventos relevantes.

### 6.1. Configuración prevista

| **Consumidor** | **Publicaciones aceptadas** | **Formato** |
|----------------|----------------------------|-------------|
| `orders` | `order.created` y `order.updated` | Raw |
| `audit` | Todas las publicaciones | Raw |

Auditoría recibirá también eventos que pedidos no acepta.

### 6.2. Justificación

Pedidos utiliza un contrato específico.

Auditoría necesita observar diferentes tipos de eventos.

### 6.3. Precaución

Una publicación filtrada no representa necesariamente un fallo.

### 6.4. Contrato

El productor publicará un atributo SNS llamado `event_type`.

---

## 7. Identificadores utilizados

ARN, URL y nombre cumplen funciones diferentes.

### 7.1. Comparación

| **Identificador** | **Uso principal** | **Origen** |
|-------------------|-------------------|------------|
| ARN del topic | Publicar en SNS | Recurso SNS |
| ARN de la cola | Suscripción y políticas | Recurso SQS |
| URL de la cola | Operaciones de mensajes | Recurso SQS |
| ARN de suscripción | Consultar suscripción | Recurso SNS subscription |

Obtendremos estos valores desde outputs.

### 7.2. Regla

No construyas manualmente ARN ni URL del laboratorio.

### 7.3. LocalStack

El formato de URL depende de la estrategia de endpoints.

### 7.4. Terraform

Una dirección de estado no sustituye ningún identificador remoto.

---

## 8. Políticas de entrega

Crear una suscripción no sustituye la autorización del destino.

### 8.1. Principal

La política de la cola autorizará:

```text
sns.amazonaws.com
```

### 8.2. Acción

La operación permitida será `sqs:SendMessage`.

### 8.3. Restricción

Utilizaremos una condición sobre `aws:SourceArn`.

### 8.4. Objetivo

Permitir entregas únicamente desde el topic esperado.

### 8.5. AWS real

También debes revisar permisos del productor, políticas del topic y cifrado.

---

## 9. Tres políticas con funciones distintas

La arquitectura necesita distinguir acceso y redirección.

### 9.1. Comparación

| **Política** | **Ubicación** | **Responsabilidad** |
|--------------|---------------|--------------------|
| Política SQS | Cola principal | Autorizar entregas SNS |
| `RedrivePolicy` | Cola principal | Elegir DLQ y umbral |
| `RedriveAllowPolicy` | DLQ | Restringir colas de origen |

Estas políticas no son intercambiables.

### 9.2. Error habitual

Cambiar una política de redirección para solucionar un permiso de entrega.

### 9.3. Diagnóstico

Primero identifica la etapa donde se produce el problema.

### 9.4. Regla

Cada política debe explicar qué permite o configura.

---

## 10. Formato raw y envoltorio SNS

Esta práctica utilizará entrega raw para simplificar el consumidor.

### 10.1. Raw

El cuerpo SQS contendrá el cuerpo publicado en SNS.

### 10.2. Con envoltorio

El cuerpo SQS contendría una notificación SNS.

El evento original aparecería dentro de `Message`.

### 10.3. Configuración

```hcl
raw_message_delivery = true
```

### 10.4. Contrato

El consumidor de esta página espera JSON de negocio directamente en `Body`.

### 10.5. Advertencia

Cambiar esta opción requiere cambiar también la interpretación del consumidor.

---

## 11. Duplicados, orden e idempotencia

Utilizaremos un topic estándar y colas estándar.

### 11.1. Garantías relevantes

Los consumidores deben tolerar:

- Entregas duplicadas.
- Reintentos.
- Ausencia de orden global garantizado.

### 11.2. Identidad de negocio

Cada evento incluirá un `event_id` estable.

### 11.3. Idempotencia

Procesar otra copia no debe repetir efectos incompatibles.

### 11.4. Ejemplo

Un pedido no debe cobrarse dos veces por recibir dos copias del mismo evento.

### 11.5. Límite

SNS y SQS no implementan la transacción de negocio de tu aplicación.

---

## 12. Visibilidad y confirmación

Recibir un mensaje no lo elimina.

### 12.1. Secuencia correcta

```text
Recibir → Validar → Procesar → Eliminar
```

### 12.2. Visibilidad

El mensaje recibido se oculta temporalmente para otras recepciones.

### 12.3. Fallo

Si no se elimina, puede volver a estar disponible.

### 12.4. Receipt handle

La eliminación necesita el handle de la recepción más reciente.

### 12.5. Regla

No elimines un mensaje antes de completar el trabajo que representa.

---

## 13. Dos clases de dead-letter queue

Los fallos de entrega y procesamiento pertenecen a etapas distintas.

### 13.1. Comparación

| **DLQ** | **Fallo observado** | **Configuración** |
|---------|--------------------|-------------------|
| DLQ de suscripción SNS | SNS no consigue entregar al endpoint | Suscripción SNS |
| DLQ de cola SQS | Recepciones repetidas sin procesamiento confirmado | Cola SQS |

El laboratorio obligatorio configura la segunda clase.

### 13.2. Consecuencia

No afirmaremos que estas DLQ capturan cualquier fallo de SNS.

### 13.3. Ampliación

La DLQ de suscripción se estudiará como ejercicio avanzado.

### 13.4. Regla

Documenta siempre qué etapa protege cada DLQ.

---

## 14. Diseño de recursos Terraform

La configuración utiliza colecciones para evitar duplicación innecesaria.

### 14.1. Recursos previstos

| **Tipo** | **Cantidad** | **Responsabilidad** |
|----------|--------------|--------------------|
| Topic SNS | Uno | Publicación |
| Colas SQS | Cuatro | Dos principales y dos DLQ |
| Políticas de cola | Dos | Entrega desde SNS |
| Políticas redrive | Cuatro | Origen y autorización |
| Suscripciones | Dos | Conexión y filtros |

En total habrá trece recursos gestionados.

### 14.2. Mensajes

AWS CLI gestionará los datos ficticios.

### 14.3. Estado

Terraform no registrará cada publicación como un recurso independiente.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente de las lecciones anteriores.

### 15.1. Crear estructura

```bash
mkdir -p terraform-integracion-sns-sqs/mensajes
mkdir -p terraform-integracion-sns-sqs/resultados
mkdir -p terraform-integracion-sns-sqs/planes
mkdir -p terraform-integracion-sns-sqs/scripts
cd terraform-integracion-sns-sqs
```

### 15.2. Organización

La raíz contendrá los archivos Terraform y Docker Compose.

### 15.3. Datos

`mensajes/` contendrá ejemplos ficticios versionables.

### 15.4. Artefactos

`resultados/` contendrá recepciones y respuestas de API.

---

## 16. Protección de archivos

Los mensajes de práctica no deben convertirse en un hábito de exposición de datos reales.

### 16.1. `.gitignore`

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

### 16.2. Qué versionar

Versiona configuración, scripts, mensajes ficticios y `.terraform.lock.hcl`.

### 16.3. Precaución

Los estados, planes y resultados pueden contener información sensible.

---

## 17. Selección de LocalStack

Utiliza una imagen validada por el docente.

### 17.1. Referencia

Sustituye el marcador antes de continuar:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 17.3. Alcance

La práctica requiere SNS y SQS.

### 17.4. Advertencia

No presupongas soporte idéntico de filtros y redirección entre versiones.

---

## 18. Docker Compose

Publicaremos LocalStack únicamente en la interfaz local.

### 18.1. `compose.yaml`

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

### 18.2. Arranque

Ejecuta `docker compose up -d`.

### 18.3. Verificación

Comprueba que la imagen elegida admite esta estrategia de endpoints.

---

## 19. Credenciales ficticias y conectividad

Configura AWS CLI en la terminal actual.

### 19.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 19.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 sns list-topics
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
```

### 19.3. Continuación

Espera respuestas válidas antes de desplegar Terraform.

---

## 20. Requisitos de Terraform

Crea `versions.tf`.

### 20.1. Configuración

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

### 20.2. Interpretación

El proveedor AWS gestionará ambos servicios.

### 20.3. Bloqueo

Conserva el archivo de bloqueo generado durante `init`.

---

## 21. Proveedor con endpoints locales

Crea `providers.tf`.

### 21.1. Configuración

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

### 21.2. Alcance

No añadas otros servicios sin revisar sus endpoints.

---

## 22. Variables y entradas

Crea `variables.tf` y `terraform.tfvars`.

### 22.1. Variable

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

### 22.2. Entrada

```hcl
suffix = "alumno01"
```

### 22.3. Identidad

Alumnos que compartan LocalStack necesitan sufijos diferentes.

---

## 23. Colección de consumidores

Crea `locals.tf`.

### 23.1. Configuración

```hcl
locals {
  consumers = {
    orders = {
      filter_policy = jsonencode({
        event_type = ["order.created", "order.updated"]
      })
    }

    audit = {
      filter_policy = null
    }
  }
}
```

### 23.2. Claves estables

`orders` y `audit` identifican las instancias Terraform.

### 23.3. Filtro

`null` indica ausencia de política de filtrado.

---

## 24. Topic y colas principales

Crea `main.tf`.

### 24.1. Recursos

```hcl
resource "aws_sns_topic" "events" {
  name = "curso-integracion-events-${var.suffix}"

  tags = {
    Laboratory = "LocalStack"
  }
}

resource "aws_sqs_queue" "main" {
  for_each = local.consumers

  name                       = "curso-integracion-${each.key}-${var.suffix}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 5
}
```

### 24.2. Continuación

Los recursos siguientes se añaden al mismo archivo.

---

## 25. Colas de mensajes fallidos

Cada consumidor tendrá su propia DLQ.

### 25.1. Configuración

```hcl
resource "aws_sqs_queue" "dlq" {
  for_each = local.consumers

  name = "curso-integracion-${each.key}-dlq-${var.suffix}"

  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 60

  tags = {
    Laboratory = "LocalStack"
    Consumer   = each.key
    Role       = "DeadLetterQueue"
  }
}
```

### 25.2. Retención

La DLQ conserva mensajes durante más tiempo que la cola principal.

---

## 26. Autorización de redirección

Cada DLQ permitirá solamente su cola principal correspondiente.

### 26.1. Configuración

```hcl
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  for_each = local.consumers

  queue_url = aws_sqs_queue.dlq[each.key].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns = [
      aws_sqs_queue.main[each.key].arn
    ]
  })
}
```

### 26.2. Alcance

Esta política restringe qué cola puede utilizar la DLQ.

### 26.3. Distinción

No autoriza entregas normales desde SNS.

---

## 27. Política de reintentos

La cola principal configura su destino de mensajes fallidos.

### 27.1. Configuración

```hcl
resource "aws_sqs_queue_redrive_policy" "main" {
  for_each = local.consumers

  queue_url = aws_sqs_queue.main[each.key].id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  depends_on = [
    aws_sqs_queue_redrive_allow_policy.dlq
  ]
}
```

### 27.2. Umbral

El servicio utiliza las recepciones para decidir la transferencia.

---

## 28. Autorización de entregas SNS

Añade las políticas de acceso de las colas principales.

### 28.1. Configuración

```hcl
resource "aws_sqs_queue_policy" "sns_delivery" {
  for_each = local.consumers

  queue_url = aws_sqs_queue.main[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.main[each.key].arn
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

## 29. Suscripciones y dependencias

Cada consumidor se conecta con el mismo topic.

### 29.1. Configuración

```hcl
resource "aws_sns_topic_subscription" "consumer" {
  for_each = local.consumers

  topic_arn = aws_sns_topic.events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.main[each.key].arn

  raw_message_delivery = true
  filter_policy         = each.value.filter_policy
  filter_policy_scope   = "MessageAttributes"

  depends_on = [
    aws_sqs_queue_policy.sns_delivery,
    aws_sqs_queue_redrive_policy.main
  ]
}
```

### 29.2. Justificación

La suscripción se crea después de configurar permisos y redirección.

---

## 30. Outputs del proyecto

Crea `outputs.tf`.

### 30.1. Resultados

```hcl
output "topic_arn" {
  value = aws_sns_topic.events.arn
}

output "queue_urls" {
  value = {
    for key, queue in aws_sqs_queue.main : key => queue.id
  }
}

output "dlq_urls" {
  value = {
    for key, queue in aws_sqs_queue.dlq : key => queue.id
  }
}

output "subscription_arns" {
  value = {
    for key, sub in aws_sns_topic_subscription.consumer : key => sub.arn
  }
}
```

---

## 31. Sesión 1: desplegar infraestructura

Duración orientativa: 25 minutos.

### 31.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 31.2. Resultado esperado

Deben crearse trece recursos gestionados.

### 31.3. Entregable

Identifica las cuatro colas y explica la función de cada una.

### 31.4. Seguridad

Revisa el plan antes de aplicar.

---

## 32. Sesión 2: recuperar identificadores

Utiliza los outputs en la terminal actual.

### 32.1. Variables

```bash
TOPIC_ARN="$(terraform output -raw topic_arn)"
ORDERS_URL="$(terraform output -json queue_urls | jq -er '.orders')"
AUDIT_URL="$(terraform output -json queue_urls | jq -er '.audit')"
ORDERS_DLQ="$(terraform output -json dlq_urls | jq -er '.orders')"
AUDIT_DLQ="$(terraform output -json dlq_urls | jq -er '.audit')"
ORDERS_SUB="$(terraform output -json subscription_arns | jq -er '.orders')"
```

### 32.2. Revisión

Comprueba que todos los valores son no vacíos.

### 32.3. Terminal nueva

Si abres otra terminal, vuelve a configurar credenciales y variables.

### 32.4. Regla

No copies URL de otro alumno.

---

## 33. Sesión 3: verificar la configuración remota

Comprueba suscripción y cola antes de publicar.

### 33.1. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns get-subscription-attributes \
  --subscription-arn "$ORDERS_SUB" > resultados/subscription.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs get-queue-attributes --queue-url "$ORDERS_URL" \
  --attribute-names All > resultados/orders-attributes.json
```

### 33.2. Lectura

Utiliza `jq` y `fromjson` para examinar las políticas.

### 33.3. Entregable

Localiza filtro, modo raw, visibilidad y ARN de DLQ.

---

## 34. Contrato del evento

El contrato separa identidad, tipo y datos de negocio.

### 34.1. `mensajes/order-created.json`

```json
{
  "schema_version": 1,
  "event_id": "integration-order-001",
  "event_type": "order.created",
  "order_id": "ORDER#1001",
  "simulate_failure": false
}
```

### 34.2. Identidad

`event_id` identifica el evento de negocio.

### 34.3. Evolución

`schema_version` permite distinguir versiones del contrato.

### 34.4. Simulación

`simulate_failure` se utiliza solamente en este laboratorio.

---

## 35. Atributos para el filtrado

SNS evalúa los atributos definidos para la publicación.

### 35.1. `mensajes/order-attributes.json`

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

### 35.2. Coherencia

El tipo de evento del cuerpo y del atributo deben coincidir.

### 35.3. Límite raw

Las entregas raw a SQS admiten hasta diez atributos de mensaje SNS.

### 35.4. Recomendación

Publica solamente atributos necesarios.

---

## 36. Sesión 4: publicar y comprobar aceptación

El productor utiliza únicamente el topic.

### 36.1. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish \
  --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/order-created.json \
  --message-attributes file://mensajes/order-attributes.json \
  > resultados/publish-order.json
```

### 36.2. Respuesta

Examina `MessageId` con `jq`.

### 36.3. Interpretación

La respuesta demuestra aceptación de la publicación por SNS.

### 36.4. Siguiente comprobación

La recepción en cada cola verifica la distribución observada.

---

## 37. Función auxiliar de recepción

La función espera de manera acotada y conserva la respuesta.

### 37.1. Definición

Guarda en `scripts/helpers.sh`:

```bash
receive_one() {
  local url="$1"
  local file="$2"
  local attempt

  for attempt in 1 2 3 4; do
    aws --endpoint-url=http://localhost:4566 --region us-east-1 \
      sqs receive-message --queue-url "$url" \
      --max-number-of-messages 1 --wait-time-seconds 5 \
      --visibility-timeout 120 \
      --message-attribute-names All \
      --message-system-attribute-names All > "$file" || return 1
    if jq -e '.Messages[0] != null' "$file" >/dev/null; then
      return 0
    fi
  done
  return 2
}
```

---

## 38. Función auxiliar de confirmación

La eliminación utiliza el handle de la respuesta recibida.

### 38.1. Añadir al archivo

```bash
delete_received() {
  local url="$1"
  local file="$2"
  local receipt

  receipt="$(jq -er '.Messages[0].ReceiptHandle' "$file")" || return 1
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs delete-message --queue-url "$url" \
    --receipt-handle "$receipt"
}
```

### 38.2. Cargar funciones

Ejecuta `source scripts/helpers.sh`.

### 38.3. Advertencia

No confirmes utilizando una recepción antigua cuya visibilidad haya vencido.

---

## 39. Sesión 5: verificar fan-out

Recibe una copia en cada cola principal.

### 39.1. Recepciones

```bash
receive_one "$ORDERS_URL" resultados/orders-first.json
receive_one "$AUDIT_URL" resultados/audit-first.json
```

### 39.2. Identidad de negocio

```bash
jq -r '.Messages[0].Body | fromjson | .event_id' resultados/orders-first.json
jq -r '.Messages[0].Body | fromjson | .event_id' resultados/audit-first.json
```

### 39.3. Resultado esperado

Ambas copias corresponden a `integration-order-001`.

### 39.4. Precaución

Detén la sesión si alguna recepción no contiene un mensaje válido.

---

## 40. Sesión 6: confirmar cada copia

Cada consumidor confirma de forma independiente.

### 40.1. Procesamiento simulado

Revisa el cuerpo y declara completado el trabajo ficticio.

### 40.2. Eliminaciones

```bash
delete_received "$ORDERS_URL" resultados/orders-first.json
delete_received "$AUDIT_URL" resultados/audit-first.json
```

### 40.3. Diferencia

Eliminar en pedidos no confirma auditoría.

### 40.4. Entregable

Explica por qué hacen falta dos receipt handles.

### 40.5. Límite

Los identificadores de transporte no sustituyen el `event_id` de negocio.

---

## 41. Sesión 7: preparar un evento no coincidente

Crearemos un evento de inventario.

### 41.1. Cuerpo

Crea `mensajes/inventory.json`:

```json
{
  "schema_version": 1,
  "event_id": "integration-inventory-001",
  "event_type": "inventory.updated",
  "product_id": "PRODUCT#A",
  "simulate_failure": false
}
```

### 41.2. Atributos

Copia el archivo de atributos y cambia `event_type` a `inventory.updated`.

Guárdalo como `mensajes/inventory-attributes.json`.

### 41.3. Expectativa

Auditoría acepta; pedidos no coincide.

---

## 42. Sesión 8: comprobar selección por filtro

Termina primero los mensajes pendientes de las sesiones anteriores.

### 42.1. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/inventory.json \
  --message-attributes file://mensajes/inventory-attributes.json
```

### 42.2. Auditoría

Recibe, verifica `event_id` y confirma su procesamiento.

### 42.3. Pedidos

Solicita mensajes durante una ventana acotada.

No debería aparecer ese evento.

### 42.4. Límite

Una respuesta vacía aislada no demuestra definitivamente ausencia de entrega.

---

## 43. Sesión 9: publicar sin atributos

El cuerpo no sustituye automáticamente los atributos del filtro.

### 43.1. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sns publish --topic-arn "$TOPIC_ARN" \
  --message file://mensajes/order-created.json
```

### 43.2. Resultado esperado

Auditoría acepta la publicación.

Pedidos no coincide porque falta el atributo `event_type`.

### 43.3. Identidad repetida

Esta prueba reutiliza el cuerpo para mostrar el contrato de filtrado.

Un consumidor real debería reconocer su `event_id` repetido.

### 43.4. Finalización

Procesa y elimina la copia recibida en auditoría.

---

## 44. Sesión 10: modificar el filtro

La ampliación debe hacerse mediante Terraform.

### 44.1. Cambio

Añade `inventory.updated` a los valores aceptados por `orders`.

### 44.2. Plan y aplicación

```bash
terraform plan -out=planes/expand-filter.tfplan
terraform show planes/expand-filter.tfplan
terraform apply planes/expand-filter.tfplan
```

### 44.3. Verificación

Consulta los atributos de la suscripción.

### 44.4. Propagación

En AWS real los cambios de filtro pueden tardar hasta quince minutos.

### 44.5. Prueba

Publica inventario con un `event_id` nuevo y comprueba ambos destinos.

---

## 45. Sesión 11: preparar un fallo de procesamiento

Utilizaremos otro evento de pedido.

### 45.1. `mensajes/order-failed.json`

```json
{
  "schema_version": 1,
  "event_id": "integration-failed-001",
  "event_type": "order.created",
  "order_id": "ORDER#INVALID",
  "simulate_failure": true
}
```

### 45.2. Publicación

Publica este cuerpo con `mensajes/order-attributes.json`.

### 45.3. Auditoría

Recibe y confirma su copia normalmente.

### 45.4. Pedidos

Simulará un fallo y no confirmará su copia.

---

## 46. Sesión 12: provocar reintentos acotados

La siguiente prueba necesita una cola de pedidos sin otros mensajes pendientes.

### 46.1. Primera parte del bucle

```bash
FOUND_DLQ=false

for attempt in $(seq 1 15); do
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs receive-message --queue-url "$ORDERS_URL" \
    --max-number-of-messages 1 --wait-time-seconds 1 \
    --visibility-timeout 2 \
    --message-system-attribute-names All \
    > resultados/retry.json || break

  jq -r '.Messages[]? |
    "Recepción \(.MessageId): \(.Attributes.ApproximateReceiveCount)"' \
    resultados/retry.json
```

### 46.2. Continuación

Completa el mismo bucle con la sección siguiente.

---

## 47. Sesión 12: observar la DLQ de pedidos

El bucle consulta la DLQ sin eliminar mensajes.

### 47.1. Segunda parte

```bash
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs receive-message --queue-url "$ORDERS_DLQ" \
    --max-number-of-messages 1 --wait-time-seconds 1 \
    --visibility-timeout 120 \
    --message-system-attribute-names All \
    > resultados/orders-dlq.json || break

  if jq -e '.Messages[0] != null' resultados/orders-dlq.json >/dev/null; then
    FOUND_DLQ=true
    break
  fi
  sleep 3
done

printf 'Mensaje observado en DLQ: %s\n' "$FOUND_DLQ"
```

### 47.2. Precaución

Este bucle didáctico no es un consumidor de producción.

---

## 48. Interpretar el mensaje fallido

Verifica identidad y causa antes de intentar recuperación.

### 48.1. Comprobación

```bash
jq '.Messages[0].Body | fromjson' resultados/orders-dlq.json
```

### 48.2. Resultado esperado

El evento debe ser `integration-failed-001`.

### 48.3. Umbral

`maxReceiveCount` no cuenta excepciones de aplicación.

SQS observa recepciones y ausencia de confirmación.

### 48.4. Diagnóstico

Si no hay transferencia, revisa políticas, tiempos y compatibilidad de LocalStack.

### 48.5. Regla

No presupongas el instante exacto de transferencia a partir de una llamada.

---

## 49. Sesión 13: recuperar de forma controlada

Publicaremos una copia corregida directamente en la cola de pedidos.

### 49.1. Preparar contenido

```bash
jq -r '.Messages[0].Body' resultados/orders-dlq.json \
  | jq '.simulate_failure = false | .recovered = true' \
  > mensajes/recovered.json
```

### 49.2. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs send-message --queue-url "$ORDERS_URL" \
  --message-body file://mensajes/recovered.json \
  > resultados/recovered-send.json
```

### 49.3. Alcance

Esta recuperación evita republicar automáticamente otra copia en auditoría.

---

## 50. Completar la recuperación

La publicación y la eliminación de DLQ son operaciones separadas.

### 50.1. Confirmar publicación

Comprueba que `recovered-send.json` contiene un `MessageId`.

### 50.2. Eliminar original

```bash
delete_received "$ORDERS_DLQ" resultados/orders-dlq.json
```

### 50.3. Handle vencido

Si venció la visibilidad, recibe nuevamente y verifica identidad antes de eliminar.

### 50.4. Riesgo

Publicar y fallar antes de eliminar puede producir otra recuperación duplicada.

### 50.5. Finalización

Recibe la copia corregida en pedidos, procesa y confirma.

---

## 51. Idempotencia y recuperación de producción

Una estrategia real necesita más que copiar un cuerpo.

### 51.1. Identidad estable

Conserva el `event_id` original para reconocer el mismo evento.

### 51.2. Registro de procesamiento

Utiliza almacenamiento persistente y operaciones condicionales apropiadas.

### 51.3. Atomicidad

La deduplicación debe coordinarse con el efecto de negocio.

Marcar un evento antes de completar el trabajo puede perderlo lógicamente.

### 51.4. Reenvío al topic

Republicar en SNS puede volver a afectar a todos los suscriptores coincidentes.

### 51.5. Redrive nativo

Revisa soporte, permisos y controles antes de utilizar tareas nativas de movimiento SQS.

---

## 52. Observabilidad y ampliaciones

La arquitectura necesita evidencia de cada etapa.

### 52.1. Señales relevantes

Observa:

- Publicaciones aceptadas.
- Entregas y fallos SNS.
- Publicaciones filtradas.
- Mensajes disponibles y en vuelo.
- Antigüedad de mensajes.
- Mensajes acumulados en DLQ.

### 52.2. Aproximación

Los contadores SQS no son una enumeración exacta e instantánea.

### 52.3. Ampliación

Añade una DLQ de suscripción SNS para estudiar fallos de entrega.

### 52.4. Seguridad

No imprimas cuerpos reales sensibles como estrategia habitual de observabilidad.

---

## 53. Diagnóstico y diferencias respecto a AWS real

LocalStack permite practicar API, pero no demuestra todas las garantías operativas.

### 53.1. Lista de revisión

Comprueba endpoints, ARN, URL, políticas, filtros, atributos y formato raw.

Después revisa visibilidad, mensajes pendientes y receipt handles.

### 53.2. AWS real

Considera IAM, políticas entre cuentas, cifrado, costes y cuotas.

Las claves KMS pueden exigir permisos adicionales para productores y servicios.

### 53.3. Seguridad

Una prueba local exitosa no valida completamente los permisos de producción.

### 53.4. Rendimiento

No extrapoles latencia, throughput o tiempos de propagación desde la emulación.

### 53.5. Precaución

Republicar repetidamente puede introducir duplicados y ocultar la causa original.

---

## 54. Limpieza del laboratorio

Mantén LocalStack activo durante la destrucción.

### 54.1. Plan revisado

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
```

### 54.2. Verificación

```bash
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 sns list-topics
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
docker compose down
```

### 54.3. Advertencia

Eliminar las colas elimina también sus mensajes pendientes.

---

## 55. Ejercicios y resumen

Consolida la arquitectura antes de añadir nuevos destinos.

### 55.1. Ejercicios

1. Añade un tercer consumidor con su propia DLQ.
2. Define otro filtro y publica eventos coincidentes.
3. Comprueba fan-out mediante identidad de negocio.
4. Distingue rechazo por filtro y fallo de entrega.
5. Provoca reintentos y observa una DLQ.
6. Documenta los riesgos de recuperación manual.
7. Diseña una estrategia de idempotencia persistente.
8. Destruye y verifica todos los recursos.

### 55.2. Ideas esenciales

SNS distribuye, SQS conserva y el consumidor procesa y confirma.

Las políticas autorizan, los filtros seleccionan y las DLQ aíslan fallos concretos.

### 55.3. Idea final

Una integración mantenible define permisos, contratos, reintentos y recuperación como responsabilidades explícitas que pueden comprobarse de extremo a extremo.