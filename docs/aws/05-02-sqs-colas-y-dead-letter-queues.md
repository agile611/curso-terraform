# SQS: colas y dead-letter queues con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Amazon SQS permite intercambiar mensajes entre componentes sin exigir que productores y consumidores trabajen al mismo tiempo.
Una cola recibe mensajes, los mantiene disponibles y los entrega a consumidores.
El consumidor debe procesar cada mensaje y confirmar su finalización mediante una operación de eliminación.
Si el procesamiento falla repetidamente, una dead-letter queue (DLQ) puede aislar el mensaje para su investigación.
Terraform permite declarar estas colas y configurar sus relaciones.
LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección construirás una cola principal y una cola de mensajes fallidos.
Después practicarás publicación, recepción, eliminación, reintentos y recuperación.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una cola estándar con Terraform.
- Crear una dead-letter queue compatible.
- Configurar políticas de redirección (RedrivePolicy).
- Diferenciar URL, ARN y nombre de una cola.
- Publicar y recibir mensajes.
- Utilizar correctamente un receipt handle.
- Comprender el tiempo de visibilidad.
- Observar reintentos y mensajes fallidos.
- Recuperar mensajes sin ocultar riesgos de duplicación.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Construirás dos colas y comprobarás el recorrido de un mensaje fallido.

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
Los comandos utilizan una terminal compatible con Bash.
Terraform y AWS CLI se ejecutan en el host.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (gestión)  │  │  (publicar/recibir)│                  │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│              http://127.0.0.1:4566                          │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐    │  │
│  │  │  Cola Principal │  │  Dead-Letter Queue      │    │  │
│  │  └─────────────────┘  └─────────────────────────┘    │  │
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
      SERVICES: sqs,sts
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
  endpoints { sqs = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}
```

---

## 4. Qué es una cola

Una cola desacopla la publicación de mensajes de su procesamiento.

### 4.1. Productor

El productor publica un mensaje.
No necesita esperar a que el consumidor complete el trabajo.

### 4.2. Consumidor

El consumidor solicita mensajes y procesa los que recibe.
Después elimina aquellos cuyo procesamiento terminó correctamente.

### 4.3. Flujo conceptual

```
Productor → Cola principal → Consumidor
                ↓ (fallos repetidos)
           Dead-Letter Queue
```

### 4.4. Consecuencia

La cola permite absorber diferencias temporales entre publicación y procesamiento.
No sustituye la lógica de negocio del consumidor.

---

## 5. Qué es un mensaje

Un mensaje contiene un cuerpo y puede incluir atributos adicionales.

### 5.1. Componentes habituales

- `Body`: contenido del mensaje (string, máx 256 KB).
- `MessageId`: identificador único asignado por SQS.
- `ReceiptHandle`: token para eliminar el mensaje tras procesarlo.
- `MD5OfBody`: hash para verificación de integridad.
- `Attributes`: metadatos (ej. `ApproximateReceiveCount`).

### 5.2. Ciclo de vida

1. **Publicado** → disponible en cola.
2. **Recibido** → invisible para otros consumidores (visibility timeout).
3. **Procesado** → lógica de negocio.
4. **Eliminado** → `DeleteMessage` con `ReceiptHandle`.
5. **Si falla** → vuelve a ser visible tras timeout.
6. **Tras maxReceiveCount** → movido a DLQ.

---

## 6. Dead-Letter Queue (DLQ)

### 6.1. Propósito

Aislar mensajes que fallan repetidamente para análisis posterior.
Evita que bloqueen la cola principal.

### 6.2. Configuración: `RedrivePolicy`

```hcl
resource "aws_sqs_queue" "principal" {
  name = "tf-principal-001"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "dlq" {
  name = "tf-dlq-001"
}
```

- `maxReceiveCount`: reintentos antes de mover a DLQ (1-1000).
- `deadLetterTargetArn`: ARN de la cola DLQ (debe ser misma región/cuenta).

### 6.3. `RedriveAllowPolicy` (opcional)

Controla qué colas pueden usar esta cola como DLQ.

```hcl
resource "aws_sqs_queue" "dlq" {
  name = "tf-dlq-001"
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.principal.arn]
  })
}
```

---

## 7. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p sqs-dlq/evidencias
cd sqs-dlq
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Configuración Terraform

```hcl
# versions.tf, providers.tf (sección 3.4)

# variables.tf
variable "project" { type = string, default = "sqs-demo" }
variable "max_receive_count" { type = number, default = 3 }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "SQSDLQ" }
}

# main.tf
# DLQ (debe crearse primero por referencia en redrive_policy)
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  tags = local.tags
}

# Cola principal con RedrivePolicy
resource "aws_sqs_queue" "principal" {
  name = "${local.prefix}-principal"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
  tags = local.tags
}

# RedriveAllowPolicy en DLQ (opcional pero recomendado)
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.principal.arn]
  })
  tags = local.tags
}

# outputs.tf
output "principal_url" { value = aws_sqs_queue.principal.id }
output "principal_arn" { value = aws_sqs_queue.principal.arn }
output "dlq_url"       { value = aws_sqs_queue.dlq.id }
output "dlq_arn"       { value = aws_sqs_queue.dlq.arn }
```

### Paso 3: Desplegar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=sqs.tfplan
terraform show sqs.tfplan
# Verificar: principal tiene redrive_policy apuntando a dlq.arn

terraform apply sqs.tfplan
```

### Paso 4: Verificar colas

```bash
aws_local sqs list-queues
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw principal_url) --attribute-names All
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw dlq_url) --attribute-names All
```

### Paso 5: Publicar mensajes (éxito)

```bash
# Mensaje normal
aws_local sqs send-message \
  --queue-url $(terraform output -raw principal_url) \
  --message-body '{"tipo": "normal", "datos": "procesar esto"}'

# Recibir
RECV=$(aws_local sqs receive-message --queue-url $(terraform output -raw principal_url) --max-number-of-messages 1)
MSG_BODY=$(echo "$RECV" | jq -r '.Messages[0].Body')
RECEIPT=$(echo "$RECV" | jq -r '.Messages[0].ReceiptHandle')
echo "Recibido: $MSG_BODY"

# Procesar (simulado: éxito)
echo "Procesando..."

# Eliminar (confirmar)
aws_local sqs delete-message --queue-url $(terraform output -raw principal_url) --receipt-handle "$RECEIPT"
echo "Mensaje eliminado correctamente"
```

### Paso 6: Simular fallo y reintentos (hacia DLQ)

```bash
# Publicar mensaje que "fallará"
aws_local sqs send-message \
  --queue-url $(terraform output -raw principal_url) \
  --message-body '{"tipo": "fallo", "datos": "esto fallara"}'

# Recibir y NO eliminar (simular fallo) - repetir 3 veces (maxReceiveCount=3)
for i in 1 2 3; do
  echo "Intento $i:"
  RECV=$(aws_local sqs receive-message --queue-url $(terraform output -raw principal_url) --max-number-of-messages 1 --attribute-names All)
  RECEIPT=$(echo "$RECV" | jq -r '.Messages[0].ReceiptHandle')
  COUNT=$(echo "$RECV" | jq -r '.Messages[0].Attributes.ApproximateReceiveCount')
  echo "  ReceiveCount: $COUNT"
  # NO eliminamos → vuelve a cola tras visibility timeout (30s default)
  # Para acelerar: esperar o cambiar visibility timeout
  sleep 2
done

# Verificar: mensaje debe estar en DLQ
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw dlq_url) --attribute-names ApproximateNumberOfMessages
aws_local sqs receive-message --queue-url $(terraform output -raw dlq_url) --max-number-of-messages 1
```

### Paso 7: Recuperar de DLQ

```bash
# Leer mensaje en DLQ
DLQ_RECV=$(aws_local sqs receive-message --queue-url $(terraform output -raw dlq_url) --max-number-of-messages 1)
DLQ_BODY=$(echo "$DLQ_RECV" | jq -r '.Messages[0].Body')
DLQ_RECEIPT=$(echo "$DLQ_RECV" | jq -r '.Messages[0].ReceiptHandle')
echo "Mensaje en DLQ: $DLQ_BODY"

# Opción A: Reprocesar (reenviar a principal)
aws_local sqs send-message --queue-url $(terraform output -raw principal_url) --message-body "$DLQ_BODY"
aws_local sqs delete-message --queue-url $(terraform output -raw dlq_url) --receipt-handle "$DLQ_RECEIPT"

# Opción B: Analizar y descartar
# aws_local sqs delete-message --queue-url $(terraform output -raw dlq_url) --receipt-handle "$DLQ_RECEIPT"
```

### Paso 8: Limpiar

```bash
terraform destroy -auto-approve
aws_local sqs list-queues
docker compose down
```

---

## 8. Sesiones guiadas

### 8.1. Sesión 1: Cola principal y DLQ (30 min)

1. Crear DLQ + Principal con `redrive_policy`
2. `plan` → verificar `redrive_policy` y `deadLetterTargetArn`
3. `apply` → verificar atributos con `aws_local`
4. **Entrega**: Plan + verificación colas + política redrive

### 8.2. Sesión 2: Publicar, recibir, eliminar (25 min)

1. Publicar mensaje → recibir → procesar → eliminar
2. Verificar `ReceiptHandle` uso correcto
3. **Entrega**: Evidencia ciclo completo mensaje exitoso

### 8.3. Sesión 3: Fallos, DLQ y recuperación (30 min)

1. Publicar mensaje → recibir 3 veces sin eliminar → verificar DLQ
2. Recuperar de DLQ → reenviar a principal → procesar → eliminar
3. **Entrega**: Evidencia mensaje en DLQ + recuperación exitosa

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica la diferencia entre:
- `QueueUrl` vs `QueueArn` vs `QueueName`
- `ReceiptHandle` vs `MessageId`
- `VisibilityTimeout` vs `MessageRetentionPeriod`
- `RedrivePolicy` vs `RedriveAllowPolicy`

### 9.2. Ejercicio de interpretación

Una cola tiene `maxReceiveCount = 5` y `VisibilityTimeout = 30s`.
Un mensaje se recibe y no se elimina.
¿Cuándo vuelve a estar visible? ¿Cuántas veces se intentará antes de ir a DLQ?
¿Qué pasa si el consumidor tarda 40s en procesar?

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración Terraform para:
- Cola principal "pedidos" con maxReceiveCount=5
- DLQ "pedidos-dlq" con RedriveAllowPolicy restringida a "pedidos"
- Outputs: URLs, ARNs, RedrivePolicy JSON
Incluye: variables para maxReceiveCount, visibilityTimeout, messageRetentionPeriod.
```

---

## 10. Limitaciones LocalStack en SQS

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Colas estándar | ✅ | ✅ |
| Colas FIFO | ⚠️ Parcial | ✅ |
| DLQ / RedrivePolicy | ✅ | ✅ |
| RedriveAllowPolicy | ✅ | ✅ |
| Message attributes | ✅ | ✅ |
| Batch operations | ✅ | ✅ |
| Long polling | ✅ | ✅ |
| Dead-letter queue metrics | ⚠️ Básico | ✅ CloudWatch |
| Server-side encryption (SSE) | ❌ | ✅ |

---

## 11. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `QueueDoesNotExist` | Nombre/URL incorrecta | Usar output `queue_url` |
| `ReceiptHandleIsInvalid` | Handle expirado o ya usado | Usar handle inmediato tras receive |
| Mensaje no va a DLQ | `maxReceiveCount` no alcanzado | Verificar `ApproximateReceiveCount` |
| `InvalidParameterValue` en RedrivePolicy | ARN DLQ incorrecto | Usar `aws_sqs_queue.dlq.arn` |
| Mensaje duplicado | No se eliminó tras procesar | Siempre `delete-message` tras éxito |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Cola + DLQ | No crea | Crea sin RedrivePolicy | Crea + RedrivePolicy + AllowPolicy |
| Publicar/Recibir | No hace | Solo publicar | Publicar + Recibir + Eliminar |
| Fallos → DLQ | No simula | Simula sin verificar | Simula + verifica DLQ + recupera |
| ReceiptHandle | No usa | Usa incorrecto | Usa correctamente en delete |
| Limpieza | No limpia | Parcial | Destroy + list-queues vacío |

### 12.2. Checklist final

- [ ] DLQ creada antes que principal (orden de dependencia)
- [ ] `redrive_policy` en principal con `deadLetterTargetArn` y `maxReceiveCount`
- [ ] `redrive_allow_policy` en DLQ (opcional)
- [ ] Mensaje publicado, recibido, eliminado (éxito)
- [ ] Mensaje fallado 3 veces → aparece en DLQ
- [ ] Mensaje recuperado de DLQ y reprocesado
- [ ] `terraform destroy` limpia ambas colas
- [ ] `aws_local sqs list-queues` vacío

### 12.3. Idea principal

> **SQS = búfer asíncrono. DLQ = red de seguridad.**
> `RedrivePolicy` conecta principal → DLQ. `maxReceiveCount` define tolerancia a fallos.
> `ReceiptHandle` = llave de eliminación. Úsalo SIEMPRE tras procesar.
> **Mensaje en DLQ ≠ perdido. Mensaje en DLQ = "revisa esto".**
