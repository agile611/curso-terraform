# SNS: topics y suscripciones con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Amazon SNS (Simple Notification Service) es un servicio de mensajería pub/sub.
Un topic (tema) recibe publicaciones y las entrega a suscriptores.
Los suscriptores pueden ser: colas SQS, funciones Lambda, endpoints HTTP/HTTPS, email, SMS.
Terraform permite declarar topics, suscripciones y políticas de filtrado.
LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección construirás un topic SNS, suscribirás una cola SQS y una función Lambda.
Practicarás publicación, filtrado por atributos, y entrega raw vs JSON.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un topic SNS con Terraform.
- Suscribir una cola SQS (entrega raw).
- Suscribir una función Lambda.
- Configurar filtrado por atributos (filter policy).
- Publicar mensajes con atributos.
- Verificar entrega en suscriptores.
- Diferenciar entrega raw vs JSON.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Construirás un topic con dos suscripciones (SQS + Lambda) y filtrado por atributos.

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
│  │  │  Topic SNS → SQS Queue (raw)                   │   │  │
│  │  │         → Lambda Function (JSON)               │   │  │
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
      SERVICES: sns,sqs,lambda,iam,logs,sts
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
    sns    = "http://127.0.0.1:4566"
    sqs    = "http://127.0.0.1:4566"
    lambda = "http://127.0.0.1:4566"
    iam    = "http://127.0.0.1:4566"
    logs   = "http://127.0.0.1:4566"
    sts    = "http://127.0.0.1:4566"
  }
}
```

---

## 4. Qué es un Topic SNS

Un topic es un punto de acceso para publicaciones.
Los publicadores envían mensajes al topic.
El topic entrega el mensaje a todos los suscriptores confirmados.

### 4.1. Tipos de suscriptores soportados

| Protocolo | Uso típico |
|-----------|------------|
| `sqs` | Desacoplamiento, buffering, DLQ |
| `lambda` | Procesamiento event-driven |
| `http/https` | Webhooks, APIs externas |
| `email` | Notificaciones humanas |
| `sms` | Alertas móviles |
| `application` | Push móvil (APNS, GCM) |

### 4.2. Formato de entrega

- **Raw** (para SQS): el cuerpo del mensaje SNS es el mensaje original.
- **JSON** (para Lambda, HTTP): envoltura SNS con `Message`, `MessageId`, `TopicArn`, `Timestamp`, etc.

---

## 5. Suscripciones y políticas de filtrado

### 5.1. Suscripción básica

```hcl
resource "aws_sns_topic" "eventos" {
  name = "tf-eventos"
}

resource "aws_sqs_queue" "cola" {
  name = "tf-cola-suscrita"
}

resource "aws_sns_topic_subscription" "sqs_sub" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.cola.arn
  # raw_message_delivery = true  # Para entrega raw (sin envoltura JSON)
}
```

### 5.2. Política de filtrado (Filter Policy)

Permite que el suscriptor reciba solo mensajes que coincidan con atributos.

```hcl
resource "aws_sns_topic_subscription" "lambda_sub" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.procesador.arn
  
  filter_policy = jsonencode({
    tipo = ["pedido", "pago"]  # Solo mensajes con attribute "tipo" = "pedido" o "pago"
    prioridad = ["alta"]       # Y attribute "prioridad" = "alta"
  })
}
```

### 5.3. Atributos de mensaje

Al publicar, se pueden incluir atributos para filtrado:

```bash
aws_local sns publish \
  --topic-arn arn:aws:sns:us-east-1:000000000000:tf-eventos \
  --message "Nuevo pedido" \
  --message-attributes '{"tipo":{"DataType":"String","StringValue":"pedido"},"prioridad":{"DataType":"String","StringValue":"alta"}}'
```

---

## 6. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p sns-suscripciones/evidencias
cd sns-suscripciones
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Código Lambda para suscripción

```bash
mkdir -p src
cat > src/sns_handler.py << 'PYEOF'
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    logger.info(f"Evento SNS recibido: {json.dumps(event)}")
    
    for record in event.get('Records', []):
        sns_msg = record.get('Sns', {})
        message = sns_msg.get('Message', '')
        attrs = sns_msg.get('MessageAttributes', {})
        logger.info(f"Mensaje: {message}")
        logger.info(f"Atributos: {json.dumps(attrs)}")
    
    return {'statusCode': 200, 'body': json.dumps({'procesados': len(event.get('Records', []))})}
PYEOF
```

### Paso 3: Configuración Terraform completa

```hcl
# versions.tf, providers.tf (sección 3.4)

# variables.tf
variable "project" { type = string, default = "sns-demo" }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "SNSSuscripciones" }
}

# main.tf
# Topic SNS
resource "aws_sns_topic" "eventos" {
  name = "${local.prefix}-eventos"
  tags = local.tags
}

# Cola SQS para suscripción raw
resource "aws_sqs_queue" "cola_raw" {
  name = "${local.prefix}-cola-raw"
  tags = local.tags
}

# Suscripción SQS con raw_message_delivery
resource "aws_sns_topic_subscription" "sqs_raw" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.cola_raw.arn
  raw_message_delivery = true
}

# Función Lambda para suscripción JSON
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/sns_handler.zip"
}

resource "aws_iam_role" "lambda_sns" {
  name = "${local.prefix}-lambda-sns-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_logs" {
  name = "${local.prefix}-lambda-logs"
  role = aws_iam_role.lambda_sns.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Effect = "Allow"
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_lambda_function" "procesador" {
  function_name = "${local.prefix}-procesador"
  runtime       = "python3.11"
  handler       = "sns_handler.handler"
  role          = aws_iam_role.lambda_sns.arn
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 30
  memory_size   = 256
}

resource "aws_cloudwatch_log_group" "lambda" {
  name = "/aws/lambda/${aws_lambda_function.procesador.function_name}"
  retention_in_days = 7
}

# Suscripción Lambda CON filtro
resource "aws_sns_topic_subscription" "lambda_filtrada" {
  topic_arn = aws_sns_topic.eventos.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.procesador.arn
  filter_policy = jsonencode({
    tipo = ["pedido", "pago"]
    prioridad = ["alta"]
  })
}

# Permiso para que SNS invoque Lambda
resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.procesador.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.eventos.arn
}

# outputs.tf
output "topic_arn" { value = aws_sns_topic.eventos.arn }
output "cola_raw_url" { value = aws_sqs_queue.cola_raw.id }
output "lambda_arn" { value = aws_lambda_function.procesador.arn }
output "lambda_sub_arn" { value = aws_sns_topic_subscription.lambda_filtrada.arn }
```

### Paso 4: Desplegar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=sns.tfplan
terraform show sns.tfplan
# Verificar: topic, cola, lambda, 2 suscripciones (sqs raw + lambda filtrada)

terraform apply sns.tfplan
```

### Paso 5: Verificar topic y suscripciones

```bash
aws_local sns list-topics
aws_local sns list-subscriptions-by-topic --topic-arn $(terraform output -raw topic_arn)
```

### Paso 6: Publicar mensaje SIN atributos (llega a SQS raw, NO a Lambda filtrada)

```bash
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Mensaje sin atributos"

# Verificar SQS raw (debe llegar)
aws_local sqs receive-message --queue-url $(terraform output -raw cola_raw_url) --max-number-of-messages 1

# Verificar Lambda (NO debe llegar - sin atributos no pasa filtro)
# Revisar logs:
STREAM=$(aws_local logs describe-log-streams --log-group-name /aws/lambda/sns-demo-procesador --order-by LastEventTime --descending --limit 1 | jq -r '.logStreams[0].logStreamName')
aws_local logs get-log-events --log-group-name /aws/lambda/sns-demo-procesador --log-stream-name "$STREAM"
```

### Paso 7: Publicar mensaje CON atributos (llega a AMBOS)

```bash
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Nuevo pedido creado" \
  --message-attributes '{"tipo":{"DataType":"String","StringValue":"pedido"},"prioridad":{"DataType":"String","StringValue":"alta"}}'

# Verificar SQS raw
aws_local sqs receive-message --queue-url $(terraform output -raw cola_raw_url) --max-number-of-messages 1

# Verificar Lambda (debe llegar - pasa filtro tipo=pedido, prioridad=alta)
sleep 3
STREAM=$(aws_local logs describe-log-streams --log-group-name /aws/lambda/sns-demo-procesador --order-by LastEventTime --descending --limit 1 | jq -r '.logStreams[0].logStreamName')
aws_local logs get-log-events --log-group-name /aws/lambda/sns-demo-procesador --log-stream-name "$STREAM" | jq '.events[] | .message'
```

### Paso 8: Publicar mensaje con atributos que NO pasan filtro (solo SQS)

```bash
aws_local sns publish \
  --topic-arn $(terraform output -raw topic_arn) \
  --message "Evento informativo" \
  --message-attributes '{"tipo":{"DataType":"String","StringValue":"info"},"prioridad":{"DataType":"String","StringValue":"baja"}}'

# Verificar SQS raw (llega)
aws_local sqs receive-message --queue-url $(terraform output -raw cola_raw_url) --max-number-of-messages 1

# Verificar Lambda (NO llega - tipo=info no en [pedido,pago])
sleep 3
STREAM=$(aws_local logs describe-log-streams --log-group-name /aws/lambda/sns-demo-procesador --order-by LastEventTime --descending --limit 1 | jq -r '.logStreams[0].logStreamName')
aws_local logs get-log-events --log-group-name /aws/lambda/sns-demo-procesador --log-stream-name "$STREAM"
```

### Paso 9: Verificar entrega raw vs JSON

```bash
# Mensaje en SQS (raw_message_delivery=true): cuerpo = mensaje original
aws_local sqs receive-message --queue-url $(terraform output -raw cola_raw_url) --max-number-of-messages 1 | jq -r '.Messages[0].Body'

# Mensaje en Lambda (JSON envelope): Records[0].Sns.Message
# Ver en logs arriba
```

### Paso 10: Limpiar

```bash
terraform destroy -auto-approve
aws_local sns list-topics
aws_local sqs list-queues
aws_local lambda list-functions
docker compose down
```

---

## 7. Sesiones guiadas

### 7.1. Sesión 1: Topic y suscripción SQS raw (25 min)

1. Crear topic + cola SQS + suscripción con `raw_message_delivery=true`
2. Publicar mensaje → verificar entrega raw en SQS
3. **Entrega**: Evidencia mensaje raw en SQS (sin envoltura JSON)

### 7.2. Sesión 2: Suscripción Lambda con filtro (30 min)

1. Crear Lambda + suscripción con `filter_policy`
2. Publicar mensajes con/sin atributos → verificar filtro
3. **Entrega**: Tabla de casos: atributos → ¿llega a Lambda?

### 7.3. Sesión 3: Raw vs JSON y limpieza (25 min)

1. Comparar cuerpo mensaje en SQS (raw) vs Lambda (JSON envelope)
2. `terraform destroy` → limpiar todo
3. **Entrega**: Comparativa formatos + limpieza completa

---

## 8. Ejercicios de refuerzo

### 8.1. Ejercicio de identificación

Explica la diferencia entre:
- `raw_message_delivery = true` vs `false` (default)
- `filter_policy` en suscripción vs atributos en publicación
- Protocolo `sqs` vs `lambda` vs `http`
- `MessageAttributes` vs `Message` en publicación

### 8.2. Ejercicio de interpretación

Un topic tiene 3 suscripciones:
1. SQS con `raw_message_delivery=true`
2. Lambda con filtro `tipo = ["pedido"]`
3. HTTP endpoint sin filtro

Se publica mensaje con `tipo="pago"`.
¿Qué suscriptores lo reciben? ¿En qué formato cada uno?

### 8.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración Terraform para:
- Topic "alertas"
- Suscripción SQS "alertas-criticas" con filtro: severidad = ["critica", "emergencia"], raw_message_delivery=true
- Suscripción Lambda "alertas-todas" sin filtro
- Suscripción HTTP "alertas-webhook" con filtro: origen = ["sistema-a", "sistema-b"]
Incluye: topic, colas, lambdas, permisos, outputs.
```

---

## 9. Limitaciones LocalStack en SNS

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Topics | ✅ | ✅ |
| Suscripciones SQS | ✅ | ✅ |
| Suscripciones Lambda | ✅ | ✅ |
| Suscripciones HTTP/HTTPS | ⚠️ Parcial | ✅ |
| Suscripciones Email/SMS | ❌ | ✅ |
| Filter Policy | ✅ | ✅ |
| Message Attributes | ✅ | ✅ |
| Raw Message Delivery | ✅ | ✅ |
| FIFO Topics | ❌ | ✅ |
| Message Deduplication | ❌ | ✅ |

---

## 10. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| Lambda no recibe | `filter_policy`, permisos `lambda:InvokeFunction` | Verificar `aws_lambda_permission` |
| SQS no recibe | `raw_message_delivery`, permisos cola | Verificar ARN cola en suscripción |
| Filtro no funciona | Atributos en publish coinciden con policy | `DataType: String`, `StringValue` exacto |
| `InvalidParameter` en suscripción | ARN endpoint inválido | Usar `aws_sqs_queue.cola.arn` o `aws_lambda_function.fn.arn` |
| Mensaje duplicado | Suscripciones duplicadas | `aws sns list-subscriptions-by-topic` |

---

## 11. Evaluación y cierre

### 11.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Topic + suscripciones | No crea | Crea sin filtro | Topic + SQS raw + Lambda filtrada |
| Publicar con atributos | No hace | Publica sin atributos | Publica con atributos + verifica filtro |
| Raw vs JSON | No distingue | Identifica uno | Compara ambos formatos |
| Filter Policy | No usa | Usa básico | Usa múltiples atributos + verifica |
| Limpieza | No limpia | Parcial | Destroy + list-topics/subscriptions vacío |

### 11.2. Checklist final

- [ ] Topic SNS creado
- [ ] Cola SQS suscrita con `raw_message_delivery=true`
- [ ] Lambda suscrita con `filter_policy` (tipo + prioridad)
- [ ] Permiso `aws_lambda_permission` para SNS
- [ ] Publicación sin atributos → solo SQS
- [ ] Publicación con atributos que pasan filtro → SQS + Lambda
- [ ] Publicación con atributos que NO pasan → solo SQS
- [ ] Verificación formato raw (SQS) vs JSON (Lambda)
- [ ] `terraform destroy` limpia todo
- [ ] `aws_local sns list-topics` vacío

### 11.3. Idea principal

> **SNS = abanico de mensajes. Suscripciones = quién recibe qué.**
> `raw_message_delivery` = mensaje tal cual (para SQS). Default = envoltura JSON (para Lambda/HTTP).
> `filter_policy` = suscriptor decide qué quiere recibir.
> **Publicar con atributos = enrutamiento inteligente sin lógica en el publicador.**
