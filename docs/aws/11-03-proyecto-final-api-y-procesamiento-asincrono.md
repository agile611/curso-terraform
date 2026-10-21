# Proyecto final: API y procesamiento asíncrono con Terraform y LocalStack

El proyecto final pasa de una infraestructura de eventos a un sistema que acepta solicitudes HTTP y las procesa en segundo plano.

La API validará un documento ficticio, lo almacenará en S3 y enviará una referencia a SQS.

Una función Lambda consumirá los mensajes y escribirá un resultado determinista.

El cliente consultará otra ruta HTTP para conocer el estado del trabajo.

Terraform administrará la infraestructura y LocalStack emulará los servicios AWS.

Las prácticas incluyen validación, respuestas asíncronas, reintentos, mensajes fallidos, observabilidad y limpieza.

Esta página utiliza un laboratorio independiente para evitar modificaciones accidentales sobre el estado de las lecciones anteriores.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los documentos y mensajes deben contener datos ficticios.
>
> La ejecución de Lambda requiere acceso al entorno Docker del laboratorio.
>
> Una prueba local positiva no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección conecta una interfaz HTTP con un consumidor asíncrono administrado mediante Terraform.

### 1.1. Competencias

Al finalizar podrás:

- Diferenciar aceptación y finalización.
- Configurar una API REST con integración Lambda.
- Validar solicitudes antes de encolar.
- Implementar respuestas parciales de lotes SQS.
- Diseñar resultados seguros frente a duplicados.
- Consultar estados mediante HTTP.
- Investigar mensajes que llegan a una DLQ.
- Limpiar datos, funciones e infraestructura.

### 1.2. Resultado práctico

Entregarás una API local con procesamiento asíncrono y pruebas reproducibles.

---

## 2. Relación con las lecciones anteriores

El proyecto conserva almacenamiento, colas y módulos, pero incorpora ejecución de aplicaciones.

### 2.1. Cambio deliberado

En esta variante, la API envía directamente a SQS.

No utilizamos SNS porque existe un único consumidor.

### 2.2. Motivo

La entrega directa reduce componentes y facilita observar el recorrido.

SNS sigue siendo apropiado si necesitas distribuir el evento a varios destinos.

### 2.3. Regla

Trabaja con un estado nuevo; no elimines el tópico anterior simplemente copiando esta configuración.

---

## 3. Requisitos previos y versiones

El docente debe validar las dependencias antes de distribuir la práctica.

### 3.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
curl --version
jq --version
```

### 3.2. Referencias

Utilizaremos Terraform 1.6 o superior y el proveedor AWS de la serie 5.x.

Las funciones utilizarán el runtime `python3.12`.

LocalStack debe fijarse mediante una referencia validada.

---

## 4. Compatibilidad obligatoria

La disponibilidad de servicios y funciones depende de la versión y edición seleccionadas.

### 4.1. Recorrido que debe comprobarse

Valida:

- API Gateway REST con integración Lambda proxy.
- Ejecución Lambda mediante Docker.
- Runtime Python y SDK incluidos.
- Conectividad Lambda hacia LocalStack.
- Event source mapping SQS.
- Respuestas parciales de lotes.
- Redrive a DLQ.
- Logs y eliminación de recursos.

### 4.2. Regla

**No presentes una combinación no comprobada como un entorno validado.**

---

## 5. Arquitectura del laboratorio

La solicitud HTTP y el procesamiento tienen ciclos de vida diferentes.

### 5.1. Diagrama

```text
Cliente
  │
  ├── POST /jobs
  │       ↓
  │   API Gateway
  │       ↓
  │   Lambda API
  │       ├── Escribe requests/... en S3
  │       └── Envía referencia a SQS
  │                              ↓
  │                         Lambda worker
  │                              ├── Lee solicitud S3
  │                              └── Escribe results/... en S3
  │
  └── GET /jobs/{job_id}
          ↓
      Lambda API
          └── Consulta solicitud y resultado

SQS trabajo ── Reintentos y redrive ──→ SQS DLQ
```

### 5.2. Alcance

El laboratorio no contiene autenticación de usuarios ni datos reales.

---

## 6. Contrato HTTP

La API distingue una solicitud aceptada de un trabajo finalizado.

### 6.1. Rutas y respuestas

| **Ruta** | **Respuesta habitual** | **Significado** |
|----------|------------------------|-----------------|
| `POST /jobs` | 202 | Trabajo aceptado |
| `GET /jobs/{job_id}` | 200 | Resultado disponible |
| `GET /jobs/{job_id}` | 202 | Solicitud conocida sin resultado |
| `GET /jobs/{job_id}` | 404 | Identificador desconocido |
| Solicitud inválida | 400 | Entrada rechazada |

El cliente debe consultar el recurso del trabajo.

### 6.2. Regla

HTTP 202 no garantiza que el procesamiento vaya a finalizar correctamente.

---

## 7. Contrato del documento

El trabajo calcula unidades totales de artículos ficticios.

### 7.1. Solicitud válida

```json
{
  "items": [
    {"sku": "DEMO-001", "quantity": 2},
    {"sku": "DEMO-002", "quantity": 3}
  ]
}
```

### 7.2. Restricciones

Entre uno y diez artículos.

SKU de entre 1 y 32 caracteres permitidos.

Cantidades enteras entre 1 y 100.

### 7.3. Regla

El laboratorio rechaza campos inesperados para mantener un contrato pequeño y explícito.

---

## 8. Estados y limitaciones

El almacenamiento permite distinguir trabajos conocidos y resultados terminados.

### 8.1. Estados expuestos

`accepted`: existe una solicitud sin resultado.

`completed`: existe un resultado.

`unknown`: no existe una solicitud conocida.

### 8.2. Límite importante

La API no registra un estado persistente `failed`.

Un mensaje en DLQ seguirá apareciendo como `accepted`.

### 8.3. Regla

No confundas “pendiente de resultado” con “consumidor activo”.

---

## 9. Duplicados y consistencia

Una cola estándar puede entregar mensajes más de una vez.

### 9.1. Estrategia del worker

Utilizaremos una clave de resultado derivada del identificador del trabajo.

El mismo documento producirá el mismo contenido.

Un duplicado podrá sobrescribir ese contenido idéntico.

### 9.2. Alcance

Esto proporciona convergencia de la escritura final, no procesamiento exactamente una vez.

### 9.3. POST repetido

Dos solicitudes HTTP válidas generan dos trabajos diferentes.

La API no implementa una clave de idempotencia del cliente.

---

## 10. Escritura y envío no son una transacción

S3 y SQS no participan en una transacción conjunta en este laboratorio.

### 10.1. Orden

Primero se almacena la solicitud.

Después se envía su referencia.

### 10.2. Fallo posible

La escritura puede completarse y el envío fallar o quedar con resultado incierto.

La API devolverá 503 y conservará el identificador.

### 10.3. Regla

No borres la solicitud automáticamente: el mensaje podría haberse aceptado antes del error de red.

---

## 11. Estructura del repositorio

Separa código de aplicación, módulos y artefactos operativos.

### 11.1. Directorios

```bash
mkdir -p terraform-final-async/app
mkdir -p terraform-final-async/modules/storage
mkdir -p terraform-final-async/modules/queue
mkdir -p terraform-final-async/modules/runtime
mkdir -p terraform-final-async/modules/api
mkdir -p terraform-final-async/functions
mkdir -p terraform-final-async/scripts
mkdir -p terraform-final-async/build
mkdir -p terraform-final-async/resultados
mkdir -p terraform-final-async/planes
cd terraform-final-async
```

### 11.2. Ejecución

Los comandos siguientes se ejecutan desde esta raíz.

---

## 12. Archivos y permisos

Los estados, planes y documentos de prueba no deben publicarse rutinariamente.

### 12.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/__pycache__/
.env
build/
planes/
resultados/
crash.log
```

### 12.2. Preparación

```bash
umask 077
chmod 700 build planes resultados
```

### 12.3. Regla

Versiona el archivo de bloqueo de la raíz, no los ZIP ni el estado.

---

## 13. LocalStack y red de ejecución

Las funciones deben alcanzar el emulador desde sus contenedores.

### 13.1. Configuración de imagen

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 13.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs,lambda,apigateway,iam,logs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
      LAMBDA_DOCKER_NETWORK: course-final-async-net
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
    networks:
      laboratory:
        aliases:
          - localstack

networks:
  laboratory:
    name: course-final-async-net
```

---

## 14. Seguridad y conectividad Docker

El socket Docker implica acceso privilegiado al entorno de contenedores del host.

### 14.1. Precauciones

Utiliza un equipo o runner dedicado al laboratorio.

No ejecutes código no confiable.

No compartas este entorno con credenciales productivas.

### 14.2. Endpoints

Terraform y AWS CLI utilizarán `http://127.0.0.1:4566`.

Las funciones utilizarán `http://localstack:4566`.

### 14.3. Regla

Dentro de Lambda, `127.0.0.1` identifica su propio contenedor, no el emulador.

---

## 15. Contexto local y nombres

Configura credenciales ficticias antes de ejecutar comandos.

### 15.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}

RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" > app/terraform.tfvars
```

### 15.2. Regla

Conserva el identificador mientras existan recursos administrados.

---

## 16. Requisitos Terraform

Los módulos heredarán el proveedor configurado por la raíz.

### 16.1. `versions.tf` de cada módulo

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 16.2. `app/versions.tf`

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

---

## 17. Proveedor de la raíz

Crea `app/providers.tf` con todos los servicios administrados.

### 17.1. Configuración

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
    s3         = "http://127.0.0.1:4566"
    sqs        = "http://127.0.0.1:4566"
    lambda     = "http://127.0.0.1:4566"
    apigateway = "http://127.0.0.1:4566"
    iam        = "http://127.0.0.1:4566"
    cloudwatchlogs = "http://127.0.0.1:4566"
  }
}
```

### 17.2. Regla

Las omisiones de validación de credenciales no sustituyen los endpoints explícitos.

---

## 18. Módulo de almacenamiento

Crea `modules/storage/main.tf`.

### 18.1. Bucket y salida

```hcl
variable "name" {
  type = string
}

resource "aws_s3_bucket" "data" {
  bucket        = var.name
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

output "contract" {
  value = {
    name = aws_s3_bucket.data.id
    arn  = aws_s3_bucket.data.arn
  }
}
```

---

## 19. Módulo de colas

Crea `modules/queue/main.tf`.

### 19.1. Trabajo y DLQ

```hcl
variable "prefix" {
  type = string
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.prefix}-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "work" {
  name                       = "${var.prefix}-work"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

output "contract" {
  value = {
    arn     = aws_sqs_queue.work.arn
    url     = aws_sqs_queue.work.id
    dlq_url = aws_sqs_queue.dlq.id
  }
}
```

---

## 20. Código de la API: clientes y respuestas

Crea `functions/api.py`.

### 20.1. Inicialización

```python
import base64
import json
import os
import re
import uuid
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

config = Config(connect_timeout=3, read_timeout=5,
                retries={"total_max_attempts": 2}, proxies={},
                s3={"addressing_style": "path"})
endpoint = os.environ["LOCAL_ENDPOINT"]
s3 = boto3.client("s3", endpoint_url=endpoint, config=config)
sqs = boto3.client("sqs", endpoint_url=endpoint, config=config)
bucket = os.environ["BUCKET_NAME"]

def response(status, body):
    return {"statusCode": status,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(body)}

def read_document(key):
    try:
        result = s3.get_object(Bucket=bucket, Key=key)
    except ClientError as error:
        if error.response["Error"]["Code"] in {"NoSuchKey", "404"}:
            return None
        raise
    stream = result["Body"]
    try:
        return json.loads(stream.read())
    finally:
        stream.close()
```

---

## 21. Código de la API: validación

Añade al mismo archivo una validación estricta y pequeña.

### 21.1. Contrato de entrada

```python
def validate(document):
    if not isinstance(document, dict) or set(document) != {"items"}:
        raise ValueError("El documento debe contener únicamente items.")
    items = document["items"]
    if not isinstance(items, list) or not 1 <= len(items) <= 10:
        raise ValueError("items debe contener entre 1 y 10 elementos.")
    for item in items:
        if not isinstance(item, dict) or set(item) != {"sku", "quantity"}:
            raise ValueError("Cada artículo requiere sku y quantity.")
        if not isinstance(item["sku"], str) or not re.fullmatch(
            r"[A-Z0-9-]{1,32}", item["sku"]
        ):
            raise ValueError("SKU inválido.")
        if type(item["quantity"]) is not int or not 1 <= item["quantity"] <= 100:
            raise ValueError("quantity debe ser un entero entre 1 y 100.")
```

### 21.2. Regla

La comprobación de tipo excluye booleanos, aunque Python los trate como una subclase de enteros.

---

## 22. Código de la API: creación

Añade la función que almacena y encola.

### 22.1. Implementación

```python
def create(event):
    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        try:
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        except Exception:
            return response(400, {"error": "Cuerpo codificado inválido."})
    try:
        if len(raw.encode("utf-8")) > 4096:
            raise ValueError("Documento demasiado grande.")
        document = json.loads(raw)
        validate(document)
    except (ValueError, TypeError):
        return response(400, {"error": "Documento inválido."})

    job_id = uuid.uuid4().hex
    request_key = f"requests/{job_id}.json"
    message = {"schema_version": 1, "job_id": job_id,
               "request_key": request_key}
    try:
        s3.put_object(Bucket=bucket, Key=request_key,
                      Body=json.dumps(document).encode(),
                      ContentType="application/json")
        sqs.send_message(QueueUrl=os.environ["QUEUE_URL"],
                         MessageBody=json.dumps(message))
    except Exception:
        print(json.dumps({"event": "acceptance_uncertain", "job_id": job_id}))
        return response(503, {"job_id": job_id, "error": "Aceptación incierta."})
    return response(202, {"job_id": job_id, "status": "accepted",
                          "status_path": f"/jobs/{job_id}"})
```

---

## 23. Código de la API: consulta y handler

Completa `functions/api.py`.

### 23.1. Despacho HTTP

```python
def status(event):
    job_id = (event.get("pathParameters") or {}).get("job_id", "")
    if not re.fullmatch(r"[a-f0-9]{32}", job_id):
        return response(400, {"error": "Identificador inválido."})
    result = read_document(f"results/{job_id}.json")
    if result is not None:
        return response(200, result)
    if read_document(f"requests/{job_id}.json") is None:
        return response(404, {"job_id": job_id, "status": "unknown"})
    return response(202, {"job_id": job_id, "status": "accepted"})

def handler(event, context):
    try:
        if event.get("httpMethod") == "POST" and event.get("resource") == "/jobs":
            return create(event)
        if event.get("httpMethod") == "GET" and event.get("resource") == "/jobs/{job_id}":
            return status(event)
        return response(404, {"error": "Ruta desconocida."})
    except Exception:
        print(json.dumps({"event": "api_error",
                          "request_id": context.aws_request_id}))
        return response(503, {"error": "Servicio temporalmente no disponible."})
```

---

## 24. Código del worker

Crea `functions/worker.py`.

### 24.1. Procesamiento determinista

```python
import json
import os
import re
import boto3
from botocore.config import Config

config = Config(connect_timeout=3, read_timeout=5,
                retries={"total_max_attempts": 2}, proxies={},
                s3={"addressing_style": "path"})
s3 = boto3.client("s3", endpoint_url=os.environ["LOCAL_ENDPOINT"], config=config)
bucket = os.environ["BUCKET_NAME"]

def process(record):
    message = json.loads(record["body"])
    job_id = message["job_id"]
    if message.get("schema_version") != 1 or not re.fullmatch(r"[a-f0-9]{32}", job_id):
        raise ValueError("Mensaje incompatible.")
    if message["request_key"] != f"requests/{job_id}.json":
        raise ValueError("Referencia incompatible.")
    result = s3.get_object(Bucket=bucket, Key=message["request_key"])
    stream = result["Body"]
    try:
        document = json.loads(stream.read())
    finally:
        stream.close()
    if os.environ["ENABLE_FAILURE_TEST"] == "true" and any(
        item["sku"] == "DEMO-FAIL" for item in document["items"]
    ):
        raise RuntimeError("Fallo didáctico.")
    output = {"job_id": job_id, "status": "completed",
              "total_units": sum(item["quantity"] for item in document["items"]),
              "item_count": len(document["items"])}
    s3.put_object(Bucket=bucket, Key=f"results/{job_id}.json",
                  Body=json.dumps(output, sort_keys=True).encode(),
                  ContentType="application/json")
    print(json.dumps({"event": "job_completed", "job_id": job_id}))
```

---

## 25. Respuestas parciales de lotes

Completa `functions/worker.py` con el handler.

### 25.1. Implementación

```python
def handler(event, context):
    failures = []
    for record in event["Records"]:
        try:
            process(record)
        except Exception:
            failures.append({"itemIdentifier": record["messageId"]})
            print(json.dumps({"event": "job_failed",
                              "message_id": record["messageId"]}))
    return {"batchItemFailures": failures}
```

### 25.2. Comportamiento

Los mensajes correctos pueden confirmarse aunque otro mensaje falle.

La función debe devolver exactamente la estructura esperada por Lambda.

### 25.3. Regla

El event source mapping debe habilitar `ReportBatchItemFailures`.

---

## 26. Empaquetado de funciones

Los ZIP deben contener los módulos Python en su raíz.

### 26.1. Comandos

```bash
python3 -m py_compile functions/api.py functions/worker.py

python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
for name in ("api", "worker"):
    with ZipFile(Path("build") / f"{name}.zip", "w", ZIP_DEFLATED) as archive:
        archive.write(Path("functions") / f"{name}.py", arcname=f"{name}.py")
PY
```

### 26.2. SDK

Esta referencia utiliza el Boto3 incluido en el runtime validado.

### 26.3. Regla

Para reproducibilidad estricta, empaqueta dependencias fijadas y registra también sus versiones transitivas.

---

## 27. Runtime: entradas, roles y logs

Crea `modules/runtime/main.tf`.

### 27.1. Configuración inicial

```hcl
variable "prefix" { type = string }
variable "bucket" { type = object({ name = string, arn = string }) }
variable "queue" { type = object({ arn = string, url = string, dlq_url = string }) }
variable "api_zip" { type = string }
variable "worker_zip" { type = string }

resource "aws_iam_role" "execution" {
  for_each = toset(["api", "worker"])
  name     = "${var.prefix}-${each.key}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_cloudwatch_log_group" "function" {
  for_each          = toset(["api", "worker"])
  name              = "/aws/lambda/${var.prefix}-${each.key}"
  retention_in_days = 7
}
```

---

## 28. Runtime: políticas de ejecución

Añade políticas separadas para API y worker.

### 28.1. Permisos

```hcl
resource "aws_iam_role_policy" "execution" {
  for_each = toset(["api", "worker"])
  role     = aws_iam_role.execution[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      {
        Effect = "Allow"
        Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.function[each.key].arn}:*"
      },
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = ["${var.bucket.arn}/requests/*", "${var.bucket.arn}/results/*"]
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = each.key == "api" ? "${var.bucket.arn}/requests/*" : "${var.bucket.arn}/results/*"
      }
    ], [{
      Effect = "Allow"
      Action = each.key == "api" ? ["sqs:SendMessage"] : [
        "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"
      ]
      Resource = var.queue.arn
    }])
  })
}
```

### 28.2. Límite

El worker podría reducir su lectura a `requests/*`; se propone como ejercicio de menor privilegio.

---

## 29. Runtime: funciones y consumidor

Completa `modules/runtime/main.tf`.

### 29.1. Recursos

```hcl
resource "aws_lambda_function" "function" {
  for_each         = toset(["api", "worker"])
  function_name    = "${var.prefix}-${each.key}"
  role             = aws_iam_role.execution[each.key].arn
  runtime          = "python3.12"
  handler          = "${each.key}.handler"
  filename         = each.key == "api" ? var.api_zip : var.worker_zip
  source_code_hash = filebase64sha256(each.key == "api" ? var.api_zip : var.worker_zip)
  timeout          = each.key == "api" ? 15 : 10
  memory_size      = 128

  environment {
    variables = {
      LOCAL_ENDPOINT      = "http://localstack:4566"
      BUCKET_NAME         = var.bucket.name
      QUEUE_URL           = replace(var.queue.url, "/^http:\\/\\/[^\\/]+/", "http://localstack:4566")
      ENABLE_FAILURE_TEST = "true"
    }
  }
  depends_on = [aws_iam_role_policy.execution]
}

resource "aws_lambda_event_source_mapping" "work" {
  event_source_arn        = var.queue.arn
  function_name          = aws_lambda_function.function["worker"].arn
  batch_size             = 5
  function_response_types = ["ReportBatchItemFailures"]
  enabled                = true
}

output "contract" {
  value = {
    api_arn        = aws_lambda_function.function["api"].arn
    api_invoke_arn = aws_lambda_function.function["api"].invoke_arn
    worker_name    = aws_lambda_function.function["worker"].function_name
  }
}
```

---

## 30. API Gateway: recursos y métodos

Crea `modules/api/main.tf`.

### 30.1. Rutas REST

```hcl
variable "name" { type = string }
variable "function" {
  type = object({ api_arn = string, api_invoke_arn = string, worker_name = string })
}

resource "aws_api_gateway_rest_api" "jobs" {
  name = var.name
}

resource "aws_api_gateway_resource" "jobs" {
  rest_api_id = aws_api_gateway_rest_api.jobs.id
  parent_id   = aws_api_gateway_rest_api.jobs.root_resource_id
  path_part   = "jobs"
}

resource "aws_api_gateway_resource" "job" {
  rest_api_id = aws_api_gateway_rest_api.jobs.id
  parent_id   = aws_api_gateway_resource.jobs.id
  path_part   = "{job_id}"
}

locals {
  routes = {
    create = { resource_id = aws_api_gateway_resource.jobs.id, method = "POST" }
    status = { resource_id = aws_api_gateway_resource.job.id, method = "GET" }
  }
}

resource "aws_api_gateway_method" "route" {
  for_each      = local.routes
  rest_api_id   = aws_api_gateway_rest_api.jobs.id
  resource_id   = each.value.resource_id
  http_method   = each.value.method
  authorization = "NONE"
}
```

---

## 31. API Gateway: integración y despliegue

Completa `modules/api/main.tf`.

### 31.1. Integración Lambda proxy

```hcl
resource "aws_api_gateway_integration" "route" {
  for_each                = local.routes
  rest_api_id             = aws_api_gateway_rest_api.jobs.id
  resource_id             = each.value.resource_id
  http_method             = aws_api_gateway_method.route[each.key].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.function.api_invoke_arn
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.function.api_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.jobs.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "jobs" {
  rest_api_id = aws_api_gateway_rest_api.jobs.id
  triggers = {
    configuration = sha1(jsonencode([
      aws_api_gateway_method.route,
      aws_api_gateway_integration.route
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "lab" {
  rest_api_id   = aws_api_gateway_rest_api.jobs.id
  deployment_id = aws_api_gateway_deployment.jobs.id
  stage_name    = "lab"
}

output "contract" {
  value = {
    api_id = aws_api_gateway_rest_api.jobs.id
    stage  = aws_api_gateway_stage.lab.stage_name
  }
}
```

---

## 32. Composición raíz

Crea `app/main.tf`.

### 32.1. Módulos conectados

```hcl
variable "run_id" {
  type = string
  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}

locals {
  prefix = "curso-async-${var.run_id}"
}

module "storage" {
  source = "../modules/storage"
  name   = "${local.prefix}-data"
}

module "queue" {
  source = "../modules/queue"
  prefix = local.prefix
}

module "runtime" {
  source     = "../modules/runtime"
  prefix     = local.prefix
  bucket     = module.storage.contract
  queue      = module.queue.contract
  api_zip    = abspath("${path.module}/../build/api.zip")
  worker_zip = abspath("${path.module}/../build/worker.zip")
}

module "api" {
  source   = "../modules/api"
  name     = "${local.prefix}-api"
  function = module.runtime.contract
}

output "project" {
  value = {
    run_id  = var.run_id
    storage = module.storage.contract
    queue   = module.queue.contract
    runtime = module.runtime.contract
    api     = module.api.contract
  }
}
```

---

## 33. Sesión 1: preparación y aplicación

Duración orientativa: 50 minutos.

### 33.1. Comandos

```bash
docker compose up -d
aws_local s3api list-buckets
aws_local sqs list-queues
aws_local lambda list-functions
aws_local apigateway get-rest-apis

terraform fmt -recursive
terraform -chdir=app init
terraform -chdir=app validate
terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan
terraform -chdir=app output -json project > resultados/project.json
```

### 33.2. Regla

Empaqueta las funciones antes del plan y espera disponibilidad observable del emulador.

---

## 34. URL de la API local

La URL de invocación depende del formato admitido por LocalStack.

### 34.1. Construcción de referencia

```bash
API_ID="$(jq -er '.api.api_id' resultados/project.json)"
STAGE="$(jq -er '.api.stage' resultados/project.json)"
API_BASE="http://127.0.0.1:4566/_aws/execute-api/${API_ID}/${STAGE}"
```

### 34.2. Compatibilidad

El docente debe validar este formato en la imagen seleccionada.

Si la versión utiliza otra URL documentada, ajusta únicamente el acceso local.

### 34.3. Regla

No utilices una URL de AWS real para solucionar una ruta local incorrecta.

---

## 35. Sesión 2: crear y consultar un trabajo

La consulta debe utilizar espera acotada, no asumir finalización instantánea.

### 35.1. Solicitud

```bash
curl --silent --show-error \
  -D resultados/create.headers \
  -o resultados/create.json \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"sku":"DEMO-001","quantity":2},{"sku":"DEMO-002","quantity":3}]}' \
  "${API_BASE}/jobs"

JOB_ID="$(jq -er '.job_id' resultados/create.json)"
```

### 35.2. Consulta

```bash
for attempt in $(seq 1 30); do
  CODE="$(curl --silent --show-error -o resultados/status.json \
    -w '%{http_code}' "${API_BASE}/jobs/${JOB_ID}")"
  test "$CODE" = 200 && break
  test "$CODE" = 202 || break
  sleep 2
done

test "$CODE" = 200
jq -e '.status == "completed" and .total_units == 5 and .item_count == 2' \
  resultados/status.json
```

---

## 36. Sesión 3: entradas inválidas

La validación debe rechazar errores antes de crear trabajos.

### 36.1. Casos

Envía JSON mal formado.

Prueba `items` vacío.

Utiliza `quantity: true`.

Añade un campo inesperado.

### 36.2. Ejemplo

```bash
curl --silent --show-error -o resultados/invalid.json \
  -w '%{http_code}\n' \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"sku":"DEMO-001","quantity":true}]}' \
  "${API_BASE}/jobs"
```

### 36.3. Resultado esperado

HTTP 400 y ninguna solicitud nueva asociada a ese intento.

---

## 37. Sesión 4: reintentos y DLQ

El SKU `DEMO-FAIL` activa un fallo exclusivamente didáctico.

### 37.1. Solicitud

```bash
curl --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"sku":"DEMO-FAIL","quantity":1}]}' \
  "${API_BASE}/jobs" > resultados/failure-job.json
```

### 37.2. Observación

Consulta logs del worker y atributos de la DLQ.

La visibilidad es 60 segundos y el traslado no será inmediato.

### 37.3. Regla

No recibas manualmente mensajes de la cola principal mientras investigas el consumidor automático.

---

## 38. Observabilidad y diagnóstico

Los logs deben permitir correlacionar el trabajo sin imprimir documentos completos.

### 38.1. Comandos

```bash
WORKER="$(jq -er '.runtime.worker_name' resultados/project.json)"
DLQ_URL="$(jq -er '.queue.dlq_url' resultados/project.json)"

aws_local logs tail "/aws/lambda/${WORKER}" --since 10m
aws_local sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages
```

### 38.2. Límites

Las métricas de cola son aproximadas.

Una recepción manual cambia temporalmente la visibilidad.

### 38.3. Regla

No declares ausencia de mensajes a partir de una única observación aproximada.

---

## 39. Convergencia y requisitos de CI

El pipeline debe comprobar aplicación, comportamiento y limpieza por separado.

### 39.1. Plan posterior

```bash
terraform -chdir=app plan -detailed-exitcode
```

### 39.2. Interpretación

Código 0: sin cambios.

Código 2: cambios propuestos.

Código 1: error.

### 39.3. Requisitos

Incluye pruebas unitarias de validación, prueba HTTP, espera acotada y teardown.

Conserva resultados independientes de prueba y limpieza.

---

## 40. Limpieza de datos

El bucket no utiliza versionado y contiene únicamente datos de esta ejecución.

### 40.1. Procedimiento dirigido

```bash
BUCKET="$(jq -er '.storage.name' resultados/project.json)"
EXPECTED="curso-async-${RUN_ID}-data"
test "$BUCKET" = "$EXPECTED"

aws_local s3 rm "s3://${BUCKET}/requests/" --recursive
aws_local s3 rm "s3://${BUCKET}/results/" --recursive
aws_local s3api list-objects-v2 --bucket "$BUCKET" --max-items 1
```

### 40.2. Precaución

Detén primero nuevas solicitudes y deshabilita el consumidor si quedan trabajos activos.

### 40.3. Regla

No elimines datos mientras un worker puede volver a escribir resultados.

---

## 41. Destrucción y verificación

La infraestructura debe retirarse mientras LocalStack permanece disponible.

### 41.1. Secuencia

```bash
terraform -chdir=app plan -destroy -out=../planes/destroy.tfplan
terraform -chdir=app show ../planes/destroy.tfplan
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local lambda list-functions
aws_local apigateway get-rest-apis
aws_local sqs list-queues
aws_local s3api list-buckets
```

### 41.2. Finalización

Comprueba ausencia de los identificadores del contrato antes de ejecutar `docker compose down`.

### 41.3. Regla

Si destroy falla, conserva estado y diagnóstico; no elimines el emulador automáticamente.

---

## 42. Diferencias, ejercicios y resumen

El laboratorio demuestra un recorrido asíncrono, no una plataforma productiva completa.

### 42.1. Diferencias respecto a AWS real

Faltan autenticación, autorización por usuario, límites de uso y protección de red.

IAM efectivo, propagación, rendimiento y cuotas necesitan pruebas adicionales.

La API no ofrece idempotencia de creación ni estado terminal de error.

### 42.2. Ejercicios

1. Añade pruebas unitarias de validación.
2. Desactiva el fallo didáctico mediante una variable.
3. Reduce permisos S3 del worker.
4. Implementa un estado persistente `failed`.
5. Diseña recuperación de solicitudes huérfanas.
6. Añade idempotencia HTTP sin confundirla con deduplicación SQS.
7. Comprueba limpieza tras un fallo funcional.

### 42.3. Idea final

**Una API asíncrona fiable distingue aceptación de finalización, tolera duplicados y conserva información suficiente para investigar fallos y retirar sus recursos de forma verificable.**