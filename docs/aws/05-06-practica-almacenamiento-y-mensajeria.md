# Práctica integrada: Almacenamiento y mensajería con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Esta práctica integra los servicios vistos en el módulo 05: S3, SQS, SNS, DynamoDB.
Construirás un pipeline de procesamiento de documentos:
1. Subida de documento a S3 → evento S3 → SNS Topic
2. SNS Topic → SQS Queue (con DLQ)
3. Consumidor (Lambda) lee de SQS → procesa → guarda metadatos en DynamoDB
4. Verificación end-to-end y limpieza.

Esta práctica consolida: S3 (eventos), SNS (fan-out), SQS (buffer+DLQ), Lambda (procesamiento), DynamoDB (estado).

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Integrar S3, SNS, SQS, Lambda, DynamoDB en un pipeline coherente.
- Configurar notificaciones S3 → SNS.
- Suscribir SQS (con DLQ) a SNS con entrega raw.
- Procesar eventos S3 desde Lambda (parsear evento S3 → SNS → SQS).
- Guardar metadatos de procesamiento en DynamoDB.
- Verificar trazabilidad end-to-end: S3 → SNS → SQS → Lambda → DynamoDB.
- Limpiar todo el pipeline de forma ordenada.

### 1.2. Resultado práctico

Un pipeline funcional: Subida S3 → Notificación SNS → Cola SQS (con DLQ) → Lambda Procesador → DynamoDB.

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
python3 --version
zip
```

El laboratorio utiliza Terraform 1.6+ (serie 1.x), Provider AWS ~> 5.0, archive ~> 2.0.

### 2.2. Conocimientos recomendados

Módulo 05 completo: S3 (05-01), SQS (05-02), SNS (05-03), DynamoDB (05-04), Integración SNS+SQS (05-05).
Lambda básico (módulo 06-01).

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura completa

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)                 │
│  ┌──────────────┐  ┌──────────────────┐                           │
│  │   Terraform  │  │   aws_local()    │                           │
│  │   (gestión)  │  │  (verificación)  │                           │
│  └──────┬───────┘  └────────┬─────────┘                           │
│         │                   │                                      │
│         └───────────────────┼──────────────────────────────────────┘
│                             ▼                                      │
│              http://127.0.0.1:4566                                 │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Docker Container: LocalStack                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │  S3 Bucket (eventos) → SNS Topic → SQS Queue (DLQ)  │  │   │
│  │  │       → Lambda Procesador → DynamoDB Table           │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sns,sqs,lambda,iam,logs,dynamodb,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
      LAMBDA_EXECUTOR: docker-reuse
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock

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
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
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
  endpoints {
    s3      = "http://127.0.0.1:4566"
    sns     = "http://127.0.0.1:4566"
    sqs     = "http://127.0.0.1:4566"
    lambda  = "http://127.0.0.1:4566"
    iam     = "http://127.0.0.1:4566"
    logs    = "http://127.0.0.1:4566"
    dynamodb = "http://127.0.0.1:4566"
    sts     = "http://127.0.0.1:4566"
  }
}
```

---

## 5. Práctica guiada paso a paso

### Paso 1: Preparar estructura

```bash
mkdir -p practica-integrada/{src,evidencias}
cd practica-integrada
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Código Lambda (procesador de eventos)

```bash
mkdir -p src
cat > src/processor.py << 'PYEOF'
import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.client('dynamodb', endpoint_url=os.environ.get('LOCALSTACK_ENDPOINT', 'http://localhost:4566'))
TABLE_NAME = os.environ.get('TABLE_NAME', 'practica-metadatos')

def handler(event, context):
    logger.info(f"Evento recibido: {json.dumps(event)}")
    
    procesados = 0
    for record in event.get('Records', []):
        # El mensaje viene de SQS, que viene de SNS (raw_message_delivery=true)
        # El body es el mensaje SNS original (JSON string)
        try:
            sns_message = json.loads(record['body'])
            # El mensaje SNS tiene el evento S3 en Message
            s3_event = json.loads(sns_message['Message'])
            
            for s3_record in s3_event.get('Records', []):
                bucket = s3_record['s3']['bucket']['name']
                key = s3_record['s3']['object']['key']
                size = s3_record['s3']['object'].get('size', 0)
                event_time = s3_record['eventTime']
                
                # Guardar en DynamoDB
                item = {
                    'documento_id': {'S': f"{bucket}/{key}"},
                    'bucket': {'S': bucket},
                    'key': {'S': key},
                    'size_bytes': {'N': str(size)},
                    'event_time': {'S': event_time},
                    'procesado_en': {'S': datetime.utcnow().isoformat()},
                    'estado': {'S': 'PROCESADO'}
                }
                
                dynamodb.put_item(TableName=TABLE_NAME, Item=item)
                logger.info(f"Guardado metadatos: {bucket}/{key}")
                procesados += 1
                
        except Exception as e:
            logger.error(f"Error procesando record: {e}")
            # No re-lanzar para que el mensaje vaya a DLQ tras reintentos
    
    return {'statusCode': 200, 'body': json.dumps({'procesados': procesados})}
PYEOF
```

### Paso 3: Configuración Terraform completa

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
  }
}

# providers.tf (sección 3.4)

# variables.tf
variable "project" { type = string, default = "practica-integrada" }

# locals.tf
locals {
  prefix = var.project
  tags = { Practica = "Integrada", Modulo = "05" }
}

# main.tf

# 1. S3 Bucket (origen de documentos)
resource "aws_s3_bucket" "documentos" {
  bucket = "${local.prefix}-documentos"
  force_destroy = true
  tags = local.tags
}

# Notificación S3 → SNS
resource "aws_s3_bucket_notification" "s3_to_sns" {
  bucket = aws_s3_bucket.documentos.id
  topic {
    topic_arn     = aws_sns_topic.eventos.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "documentos/"
    filter_suffix = ".pdf"
  }
  depends_on = [aws_sns_topic_policy.permisos_sns]
}

# 2. SNS Topic
resource "aws_sns_topic" "eventos" {
  name = "${local.prefix}-eventos"
  tags = local.tags
}

# Política para permitir S3 publicar en SNS
resource "aws_sns_topic_policy" "permisos_sns" {
  arn = aws_sns_topic.eventos.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid = "AllowS3Publish"
      Effect = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action = "SNS:Publish"
      Resource = aws_sns_topic.eventos.arn
      Condition = {
        ArnLike = { "aws:SourceArn" = "arn:aws:s3:::${aws_s3_bucket.documentos.bucket}" }
      }
    }]
  })
}

# 3. DLQ
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  tags = local.tags
}

# 4. Cola Principal con RedrivePolicy
resource "aws_sqs_queue" "cola" {
  name = "${local.prefix}-cola"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = local.tags
}

# DLQ con RedriveAllowPolicy
resource "aws_sqs_queue" "dlq" {
  name = "${local.prefix}-dlq"
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.cola.arn]
  })
  tags = local.tags
}

# 5. SNS Topic
resource "aws_sns_topic" "eventos" {
  name = "${local.prefix}-eventos"
  tags = local.tags
}

# Suscripción SQS (raw)
resource "aws_sns_topic_subscription" "sqs_sub" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.cola.arn
  raw_message_delivery = true
}

# 6. DynamoDB Table (metadatos de procesamiento)
resource "aws_dynamodb_table" "metadatos" {
  name = "${local.prefix}-metadatos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "documento_id"
  attribute { name = "documento_id", type = "S" }
  attribute { name = "bucket", type = "S" }
  attribute { name = "estado", type = "S" }
  
  global_secondary_index {
    name = "bucket-estado-index"
    hash_key = "bucket"
    range_key = "estado"
    projection_type = "ALL"
  }
  
  ttl { attribute_name = "expires_at", enabled = true }
  tags = local.tags
}

# 7. Lambda Procesador
data "archive_file" "lambda_zip" {
  type = "zip"
  source_dir = "${path.module}/src"
  output_path = "${path.module}/processor.zip"
}

resource "aws_iam_role" "lambda_role" {
  name = "${local.prefix}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "lambda_perms" {
  name = "${local.prefix}-lambda-perms"
  role = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], Resource = "arn:aws:logs:*:*:*" },
      { Effect = "Allow", Action = ["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"], Resource = aws_sqs_queue.cola.arn },
      { Effect = "Allow", Action = ["dynamodb:PutItem","dynamodb:GetItem","dynamodb:Query"], Resource = aws_dynamodb_table.metadatos.arn },
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = "${aws_s3_bucket.documentos.arn}/*" }
    ]
  })
}

resource "aws_lambda_function" "procesador" {
  function_name = "${local.prefix}-procesador"
  runtime = "python3.11"
  handler = "processor.handler"
  role = aws_iam_role.lambda_role.arn
  filename = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout = 60
  memory_size = 256
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.metadatos.name
      LOCALSTACK_ENDPOINT = "http://localhost:4566"
    }
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  name = "/aws/lambda/${aws_lambda_function.procesador.function_name}"
  retention_in_days = 7
}

# Event Source Mapping: SQS → Lambda
resource "aws_lambda_event_source_mapping" "sqs_to_lambda" {
  event_source_arn = aws_sqs_queue.cola.arn
  function_name = aws_lambda_function.procesador.function_name
  batch_size = 5
  maximum_batching_window_in_seconds = 10
}

# 8. Permiso SNS para invocar Lambda (no necesario aquí, SNS→SQS→Lambda)
# Pero S3 necesita permiso para publicar en SNS (aws_sns_topic_policy arriba)

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.documentos.bucket }
output "topic_arn" { value = aws_sns_topic.eventos.arn }
output "cola_url" { value = aws_sqs_queue.cola.id }
output "dlq_url" { value = aws_sqs_queue.dlq.id }
output "table_name" { value = aws_dynamodb_table.metadatos.name }
output "lambda_arn" { value = aws_lambda_function.procesador.arn }
```

### Paso 4: Desplegar pipeline completo

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=pipeline.tfplan
terraform show pipeline.tfplan
# Verificar orden: DLQ → Cola → Topic → Bucket (notificación) → Tabla → Lambda → EventSourceMapping

terraform apply pipeline.tfplan
```

### Paso 5: Verificar infraestructura

```bash
aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues
aws_local dynamodb list-tables
aws_local lambda list-functions
aws_local sns list-subscriptions-by-topic --topic-arn $(terraform output -raw topic_arn)
```

### Paso 6: Probar pipeline end-to-end

```bash
# 1. Subir documento PDF a S3 (prefijo documentos/)
echo "Contenido PDF simulado" > documento.pdf
aws_local s3api put-object \
  --bucket $(terraform output -raw bucket_name) \
  --key documentos/prueba.pdf \
  --body documento.pdf \
  --content-type application/pdf

# 2. Verificar notificación S3 → SNS → SQS
sleep 5
aws_local sqs receive-message --queue-url $(terraform output -raw cola_url) --max-number-of-messages 1 --attribute-names All

# 3. Verificar Lambda procesó (logs)
sleep 10
STREAM=$(aws_local logs describe-log-streams --log-group-name /aws/lambda/practica-integrada-procesador --order-by LastEventTime --descending --limit 1 | jq -r '.logStreams[0].logStreamName')
aws_local logs get-log-events --log-group-name /aws/lambda/practica-integrada-procesador --log-stream-name "$STREAM" | jq '.events[] | .message'

# 4. Verificar DynamoDB (metadatos guardados)
aws_local dynamodb query \
  --table-name $(terraform output -raw table_name) \
  --key-condition-expression "documento_id = :id" \
  --expression-attribute-values '{":id":{"S":"practica-integrada-documentos/documentos/prueba.pdf"}}'

# 5. Verificar GSI (consultar por bucket + estado)
aws_local dynamodb query \
  --table-name $(terraform output -raw table_name) \
  --index-name bucket-estado-index \
  --key-condition-expression "bucket = :b AND estado = :e" \
  --expression-attribute-values '{":b":{"S":"practica-integrada-documentos"},":e":{"S":"PROCESADO"}}'
```

### Paso 7: Probar DLQ (simular fallo en Lambda)

```bash
# Modificar Lambda para que falle (cambiar handler a función inexistente)
# O publicar mensaje directamente a SQS que cause error
aws_local sqs send-message \
  --queue-url $(terraform output -raw cola_url) \
  --message-body '{"Records":[{"body":"{\"Message\":\"{\\\"Records\\\":[{\\\"s3\\\":{\\\"bucket\\\":{\\\"name\\\":\\\"test\\\"},\\\"object\\\":{\\\"key\\\":\\\"bad.pdf\\\"}}}]}\"}]}'

# Recibir 3 veces sin procesar correctamente
for i in 1 2 3; do
  aws_local sqs receive-message --queue-url $(terraform output -raw cola_url) --max-number-of-messages 1
  sleep 2
done

# Verificar DLQ
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw dlq_url) --attribute-names ApproximateNumberOfMessages
aws_local sqs receive-message --queue-url $(terraform output -raw dlq_url) --max-number-of-messages 1
```

### Paso 8: Limpiar pipeline completo

```bash
terraform destroy -auto-approve
aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues
aws_local dynamodb list-tables
aws_local lambda list-functions
docker compose down
```

---

## 6. Sesiones guiadas

### 6.1. Sesión 1: Despliegue completo (40 min)

1. Desplegar pipeline completo (terraform apply)
2. Verificar cada componente: S3, SNS, SQS, DLQ, DynamoDB, Lambda, EventSourceMapping
3. **Entrega**: Diagrama arquitectura + verificación cada componente

### 6.2. Sesión 2: Prueba end-to-end (35 min)

1. Subir PDF a S3 → verificar cadena completa S3→SNS→SQS→Lambda→DynamoDB
2. Verificar logs Lambda, query DynamoDB (PK + GSI)
3. **Entrega**: Evidencia trazabilidad completa documento

### 6.3. Sesión 3: Fallos, DLQ y limpieza (30 min)

1. Simular fallo Lambda → mensaje en DLQ
2. Recuperar de DLQ
3. `terraform destroy` → limpieza completa
4. **Entrega**: Evidencia DLQ + limpieza ordenada

---

## 7. Ejercicios de refuerzo

### 7.1. Ejercicio de identificación

Identifica el servicio responsable de cada función:

1. Almacenar documento original
2. Notificar evento de creación
3. Bufferizar mensaje para consumidor
4. Procesar evento de forma asíncrona
5. Guardar metadatos estructurados
6. Capturar mensajes fallidos

### 7.2. Ejercicio de interpretación

El pipeline falla en Lambda (error de código). El mensaje va a DLQ tras 3 intentos.
¿Qué componentes siguen funcionando? ¿Qué se pierde? ¿Cómo se recupera?

### 7.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un diagrama Mermaid del pipeline: S3 → SNS → SQS (DLQ) → Lambda → DynamoDB.
Incluye: recursos Terraform, flujos de datos, puntos de fallo, recuperación.
```

---

## 8. Limitaciones LocalStack en pipeline completo

| Componente | LocalStack | AWS Real |
|------------|------------|----------|
| S3 Event Notifications | ✅ | ✅ |
| SNS → SQS | ✅ | ✅ |
| SQS DLQ | ✅ | ✅ |
| Lambda (Python) | ✅ | ✅ |
| Event Source Mapping | ✅ | ✅ |
| DynamoDB GSI/TTL/Stream | ✅ | ✅ |
| S3 → SNS permissions | ✅ | ✅ |
| IAM evaluation | ⚠️ Simplificado | ✅ |
| Lambda VPC/ENI | ❌ | ✅ |
| CloudWatch Metrics/Alarms | ❌ | ✅ |

---

## 9. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| S3 no notifica a SNS | `aws_s3_bucket_notification`, policy SNS | Verificar `aws_sns_topic_policy` |
| SNS no entrega a SQS | Suscripción ARN, `raw_message_delivery` | Verificar `aws_sns_topic_subscription` |
| Lambda no se dispara | EventSourceMapping, permisos IAM | Verificar `aws_lambda_event_source_mapping` |
| Lambda falla (timeout/memoria) | Logs CloudWatch, timeout/memory | Aumentar recursos |
| DynamoDB no guarda | Permisos IAM Lambda, nombre tabla | Verificar `TABLE_NAME` env var |
| Mensaje en DLQ | Lambda falla 3 veces | Revisar logs Lambda, corregir código |

---

## 10. Evaluación y cierre

### 10.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Pipeline completo | No despliega | Despliega incompleto | Despliega todo: S3→SNS→SQS→Lambda→DynamoDB |
| End-to-end | No prueba | Prueba parcial | Sube PDF → verifica DynamoDB (PK+GSI) |
| DLQ | No prueba | Crea sin probar | Simula fallo → DLQ → recupera |
| Integración | Servicios aislados | 2-3 integrados | 5 servicios integrados + verificación |
| Limpieza | No limpia | Parcial | Destroy + todos los list-* vacíos |

### 10.2. Checklist final

- [ ] Bucket S3 con notificación a SNS (prefijo/sufijo)
- [ ] Topic SNS con política para S3
- [ ] Cola SQS principal con RedrivePolicy → DLQ
- [ ] DLQ con RedriveAllowPolicy
- [ ] Suscripción SNS→SQS con `raw_message_delivery=true`
- [ ] Tabla DynamoDB con PK + GSI + TTL
- [ ] Lambda con EventSourceMapping SQS
- [ ] Permisos IAM: Lambda → SQS, DynamoDB, S3, Logs
- [ ] Subida PDF → DynamoDB tiene metadatos (PK + GSI query)
- [ ] Fallo simulado → DLQ → recuperación
- [ ] `terraform destroy` limpia todo
- [ ] Todos los `list-*` vacíos

### 10.3. Idea principal

> **Integración = servicios especializados + conexiones declarativas.**
> S3 (origen) → SNS (fan-out) → SQS (buffer+reintentos+DLQ) → Lambda (procesamiento) → DynamoDB (estado).
> Terraform orquesta todo: recursos, permisos, eventos, mappings.
> **End-to-end = subir archivo → ver metadatos en BD. Si falla → DLQ → reintentar.**
> **Esta práctica es la base del proyecto final (módulo 11).**
