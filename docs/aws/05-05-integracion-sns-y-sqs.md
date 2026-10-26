# Integración SNS y SQS con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

La integración SNS + SQS es el patrón fundamental de mensajería pub/sub en AWS.
SNS (topic) recibe publicaciones y las entrega a suscriptores.
SQS (cola) actúa como suscriptor, bufferizando mensajes para consumidores.
Terraform permite declarar topics, colas, suscripciones y políticas en una sola configuración.
LocalStack permite practicar esta integración completa localmente.

En esta lección construirás un topic SNS suscrito a una cola SQS con entrega raw.
Configurarás una Dead-Letter Queue para la cola SQS.
Practicarás publicación con atributos, filtrado, y verificación de entrega.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Integrar SNS Topic + SQS Queue en una sola configuración Terraform.
- Configurar suscripción con `raw_message_delivery = true`.
- Añadir Dead-Letter Queue a la cola SQS suscrita.
- Publicar mensajes con atributos para filtrado.
- Verificar entrega en cola y en DLQ.
- Entender el flujo: Publicador → SNS → SQS → Consumidor.

### 1.2. Resultado práctico

Construirás: Topic SNS → Cola SQS (con DLQ) → Consumidor.

---

## 2. Requisitos previos

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

Debes reconocer recursos, variables, outputs, referencias y planes guardados.
Conocimientos previos: SNS (lección 05-03), SQS (lección 05-02).
Los comandos utilizan una terminal compatible con Bash.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (gestión)  │  │  (publicar/verif)│                    │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│              http://127.0.0.1:4566                          │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  SNS Topic → SQS Queue (raw) → DLQ             │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sns,sqs,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 3.3. `aws_local`

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://127.0.0.1:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 3.4. Configuración Terraform base

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# providers.tf
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  endpoints { sns = "http://127.0.0.1:4566", sqs = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}
```

---

## 4. Arquitectura de integración SNS → SQS

### 4.1. Flujo de mensajes

```
Publicador
    │
    ▼
SNS Topic (fan-out)
    │
    ├──▶ SQS Queue (suscriptor) ──▶ Consumidor
    │       │
    │       ▼ (fallos repetidos)
    │   Dead-Letter Queue
    │
    └──▶ (otros suscriptores: Lambda, HTTP, etc.)
```

### 4.2. Puntos clave de configuración

| Componente | Configuración clave |
|------------|---------------------|
| **SNS Topic** | Nombre, tags |
| **SQS Queue** | `redrive_policy` → DLQ, `visibility_timeout` |
| **DLQ** | Cola separada, `redrive_allow_policy` opcional |
| **Suscripción** | `protocol = "sqs"`, `endpoint = queue_arn`, `raw_message_delivery = true` |
| **Permisos** | SNS necesita permiso para `sqs:SendMessage` en la cola (LocalStack lo gestiona automáticamente) |

---

## 5. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p sns-sqs-integracion/evidencias
cd sns-sqs-integracion
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Configuración Terraform completa

```hcl
# versions.tf, providers.tf (sección 3.4)

# variables.tf
variable "project" { type = string, default = "sns-sqs-demo" }
variable "max_receive_count" { type = number, default = 3 }
variable "visibility_timeout" { type = number, default = 30 }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "SNS-SQS-Integracion" }
}

# main.tf
# 1. Dead-Letter Queue (primero por dependencia)
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  tags = local.tags
}

# 2. Cola principal con RedrivePolicy hacia DLQ
resource "aws_sqs_queue" "principal" {
  name = "${local.prefix}-principal"
  visibility_timeout_seconds = var.visibility_timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
  tags = local.tags
}

# 3. DLQ con RedriveAllowPolicy (restringe quién puede usarla)
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.principal.arn]
  })
  tags = local.tags
}

# 4. Topic SNS
resource "aws_sns_topic" "eventos" {
  name = "${local.prefix}-eventos"
  tags = local.tags
}

# 5. Suscripción SQS con raw_message_delivery
resource "aws_sns_topic_subscription" "sqs_sub" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.principal.arn
  raw_message_delivery = true
}

# outputs.tf
output "topic_arn"      { value = aws_sns_topic.eventos.arn }
output "principal_url"  { value = aws_sqs_queue.principal.id }
output "principal_arn"  { value = aws_sqs_queue.principal.arn }
output "dlq_url"        { value = aws_sqs_queue.dlq.id }
output "dlq_arn"        { value = aws_sqs_queue.dlq.arn }
output "subscription_arn" { value = aws_sns_topic_subscription.sqs_sub.arn }
```

### Paso 3: Desplegar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=integracion.tfplan
terraform show integracion.tfplan
# Verificar: DLQ → Principal (redrive_policy) → Topic → Suscripción (raw=true)

terraform apply integracion.tfplan
```

### Paso 4: Verificar infraestructura

```bash
aws_local sns list-topics
aws_local sns list-subscriptions-by-topic --topic-arn $(terraform output -raw topic_arn)
aws_local sqs list-queues
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw principal_url) --attribute-names All
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw dlq_url) --attribute-names All
```

### Paso 5: Publicar mensaje simple (sin atributos)

```bash
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Mensaje de prueba simple"

# Verificar entrega en cola principal (raw)
aws_local sqs receive-message --queue-url $(terraform output -raw principal_url) --max-number-of-messages 1
# Debe mostrar Body = "Mensaje de prueba simple" (sin envoltura JSON)
```

### Paso 6: Publicar con atributos (para filtrado futuro)

```bash
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Evento con atributos" \
  --message-attributes '{"tipo":{"DataType":"String","StringValue":"pedido"},"origen":{"DataType":"String","StringValue":"web"}}'

# Verificar en cola (raw delivery: atributos en MessageAttributes)
aws_local sqs receive-message \
  --queue-url $(terraform output -raw principal_url) \
  --max-number-of-messages 1 \
  --message-attribute-names All
```

### Paso 7: Simular fallos y DLQ

```bash
# Publicar mensaje que "fallará"
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Mensaje para DLQ"

# Recibir y NO eliminar (simular fallo) - repetir maxReceiveCount veces (3)
for i in 1 2 3; do
  echo "Intento $i:"
  RECV=$(aws_local sqs receive-message --queue-url $(terraform output -raw principal_url) --max-number-of-messages 1 --attribute-names All)
  RECEIPT=$(echo "$RECV" | jq -r '.Messages[0].ReceiptHandle')
  COUNT=$(echo "$RECV" | jq -r '.Messages[0].Attributes.ApproximateReceiveCount')
  echo "  ReceiveCount: $COUNT"
  # NO eliminamos → vuelve a cola tras visibility timeout
  sleep 2
done

# Verificar: mensaje debe estar en DLQ
echo "=== Verificando DLQ ==="
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw dlq_url) --attribute-names ApproximateNumberOfMessages
aws_local sqs receive-message --queue-url $(terraform output -raw dlq_url) --max-number-of-messages 1 --attribute-names All
```

### Paso 8: Recuperar de DLQ

```bash
# Leer mensaje en DLQ
DLQ_RECV=$(aws_local sqs receive-message --queue-url $(terraform output -raw dlq_url) --max-number-of-messages 1 --attribute-names All)
DLQ_BODY=$(echo "$DLQ_RECV" | jq -r '.Messages[0].Body')
DLQ_RECEIPT=$(echo "$DLQ_RECV" | jq -r '.Messages[0].ReceiptHandle')
echo "Mensaje en DLQ: $DLQ_BODY"

# Opción A: Reprocesar (reenviar a principal)
aws_local sns publish --topic-arn $(terraform output -raw topic_arn) --message "$DLQ_BODY"
aws_local sqs delete-message --queue-url $(terraform output -raw dlq_url) --receipt-handle "$DLQ_RECEIPT"

# Verificar que llegó a principal
aws_local sqs receive-message --queue-url $(terraform output -raw principal_url) --max-number-of-messages 1
```

### Paso 9: Limpiar

```bash
terraform destroy -auto-approve
aws_local sns list-topics
aws_local sqs list-queues
docker compose down
```

---

## 6. Sesiones guiadas

### 6.1. Sesión 1: Infraestructura completa (30 min)

1. Desplegar: DLQ → Principal (redrive_policy) → Topic → Suscripción (raw=true)
2. Verificar cada componente con `aws_local`
3. **Entrega**: Diagrama arquitectura + verificación cada componente

### 6.2. Sesión 2: Publicación y entrega (25 min)

1. Publicar mensajes simples y con atributos
2. Verificar entrega raw en SQS (sin envoltura JSON)
3. Verificar atributos en `MessageAttributes`
4. **Entrega**: Evidencia mensajes en cola con/sin atributos

### 6.3. Sesión 3: Fallos, DLQ y recuperación (30 min)

1. Simular 3 fallos → mensaje en DLQ
2. Recuperar de DLQ → reenviar a topic → procesar
4. **Entrega**: Evidencia mensaje en DLQ + recuperación exitosa

---

## 7. Ejercicios de refuerzo

### 7.1. Ejercicio de identificación

Diferencia entre:
- Suscripción SQS con `raw_message_delivery=true` vs `false`
- `RedrivePolicy` en cola principal vs `RedriveAllowPolicy` en DLQ
- Atributos de mensaje SNS vs atributos de mensaje SQS
- `VisibilityTimeout` vs `MessageRetentionPeriod`

### 7.2. Ejercicio de interpretación

Un topic SNS tiene 2 suscripciones SQS: Cola A (raw=true) y Cola B (raw=false).
Se publica mensaje con `MessageAttributes`.
¿Qué recibe cada cola? ¿En qué formato?

### 7.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración Terraform para:
- Topic "notificaciones"
- Cola "notificaciones-principal" con DLQ "notificaciones-dlq" (maxReceiveCount=5)
- Suscripción SQS raw
- Segunda cola "notificaciones-auditoria" suscrita AL MISMO topic (raw=false)
- Outputs: ARNs, URLs, Subscription ARNs
Incluye: variables para maxReceiveCount, visibilityTimeout.
```

---

## 8. Limitaciones LocalStack en SNS+SQS

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| SNS → SQS subscription | ✅ | ✅ |
| Raw message delivery | ✅ | ✅ |
| DLQ / RedrivePolicy | ✅ | ✅ |
| Filter Policy en suscripción SQS | ⚠️ Parcial | ✅ |
| Message Attributes | ✅ | ✅ |
| FIFO Topics + SQS FIFO | ❌ | ✅ |
| Server-side encryption | ❌ | ✅ |

---

## 9. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| Mensaje no llega a SQS | `raw_message_delivery`, ARN cola correcto | Verificar suscripción ARN |
| Mensaje no va a DLQ | `maxReceiveCount` no alcanzado | Verificar `ApproximateReceiveCount` |
| `InvalidParameter` en suscripción | ARN endpoint inválido | Usar `aws_sqs_queue.principal.arn` |
| Permisos SNS→SQS | LocalStack auto-gestiona | En AWS real: policy en cola |
| Mensaje duplicado | Suscripción duplicada | `list-subscriptions-by-topic` |

---

## 10. Evaluación y cierre

### 10.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Infraestructura | No crea | Crea sin DLQ | Topic + SQS + DLQ + Suscripción raw |
| Publicación | No hace | Publica simple | Publica + atributos + verifica entrega |
| DLQ | No usa | Crea sin probar | Simula fallos → DLQ → recupera |
| Raw delivery | No verifica | Verifica uno | Verifica raw vs JSON |
| Limpieza | No limpia | Parcial | Destroy + list-topics/queues vacío |

### 10.2. Checklist final

- [ ] DLQ creada con `redrive_allow_policy`
- [ ] Cola principal con `redrive_policy` → DLQ
- [ ] Topic SNS creado
- [ ] Suscripción SQS con `raw_message_delivery=true`
- [ ] Mensaje publicado y recibido en cola (raw)
- [ ] Mensaje con atributos recibido con `MessageAttributes`
- [ ] 3 fallos simulados → mensaje en DLQ
- [ ] Mensaje recuperado de DLQ y reprocesado
- [ ] `terraform destroy` limpia todo
- [ ] `aws_local sns list-topics` y `sqs list-queues` vacíos

### 10.3. Idea principal

> **SNS + SQS = pub/sub desacoplado con buffer.**
> SNS = fan-out (múltiples suscriptores). SQS = buffer + reintentos + DLQ.
> `raw_message_delivery=true` = mensaje tal cual (sin envoltura JSON).
> DLQ = red de seguridad para mensajes que fallan sistemáticamente.
> **Terraform une todo: topic, colas, suscripciones, políticas en una sola configuración.**
