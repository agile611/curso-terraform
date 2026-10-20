# Práctica: API serverless local con Terraform y LocalStack

Una API serverless combina una entrada HTTP, funciones que ejecutan lógica y servicios que conservan datos o distribuyen trabajo.

En esta práctica construirás una API que recibe trabajos numéricos y permite consultar su estado.

API Gateway dirigirá las solicitudes a una función Lambda de entrada.

Esa función registrará el trabajo en DynamoDB y enviará un mensaje a SQS.

Otra función Lambda consumirá la cola, calculará el resultado y actualizará el registro.

Los mensajes que fallen reiteradamente podrán terminar en una dead-letter queue.

Terraform gestionará la infraestructura y LocalStack emulará los servicios utilizados.

Las sesiones incluyen pruebas HTTP, duplicados, conflictos, fallos, recuperación y limpieza.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La práctica es didáctica y no constituye una arquitectura lista para producción.

---

## 1. Objetivos de aprendizaje

Esta práctica integra los conceptos del bloque de aplicaciones serverless.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Conectar API Gateway con Lambda.
- Persistir trabajos en DynamoDB.
- Distribuir trabajo mediante SQS.
- Configurar un consumidor Lambda.
- Separar permisos de ejecución e invocación.
- Reconocer duplicados compatibles y conflictos.
- Consultar estados mediante HTTP.
- Diagnosticar fallos y recuperar mensajes.
- Destruir la infraestructura con un plan revisado.

### 1.2. Resultado práctico

Construirás una API de trabajos asíncronos con aceptación HTTP y consulta posterior del resultado.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de las lecciones anteriores.

### 2.1. Herramientas

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, paquetes ZIP, IAM, REST APIs, colas y escrituras condicionales.

---

## 3. Compatibilidad del entorno

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Integración REST API con Lambda proxy.
- Invocación mediante la URL local seleccionada.
- Ejecución de Python 3.12.
- Acceso SDK a SQS y DynamoDB.
- Event source mapping y fallos parciales.
- Escrituras y actualizaciones condicionales.
- Redirección hacia DLQ.
- Consulta de logs y destrucción.

### 3.2. Registro de versiones

Documenta Terraform, proveedores, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Advertencia

La disponibilidad de una API no demuestra equivalencia completa con AWS real.

---

## 4. Arquitectura de la práctica

La API separa aceptación de trabajos y procesamiento.

### 4.1. Recorrido

```text
Cliente HTTP
    │
    ▼
API Gateway → Lambda API → DynamoDB
                  │           ▲
                  ▼           │
                 SQS → Lambda worker
                  │
                  └──→ DLQ tras recepciones repetidas
```

### 4.2. Observabilidad

Ambas funciones escribirán en grupos de logs independientes.

### 4.3. Alcance

No utilizaremos SNS, S3, dominios personalizados ni autenticación de usuarios.

---

## 5. Responsabilidades y límites

Cada componente resuelve una parte del recorrido.

### 5.1. Comparación

| **Componente** | **Responsabilidad** | **Límite importante** |
|---------------|---------------------|-----------------------|
| API Gateway | Enrutar HTTP | No ejecuta el cálculo |
| Lambda API | Validar y aceptar | No completa el trabajo |
| DynamoDB | Conservar estado | No publica automáticamente en SQS |
| SQS | Mantener mensajes | No garantiza éxito de negocio |
| Lambda worker | Calcular y actualizar | Puede recibir duplicados |
| DLQ | Aislar fallos repetidos | No repara la causa |

Estas diferencias deben reflejarse en las pruebas.

### 5.2. Regla principal

**Aceptar, almacenar, publicar, procesar y confirmar son operaciones diferentes.**

---

## 6. Contrato HTTP

La API expondrá tres operaciones.

### 6.1. Endpoints

| **Método y ruta** | **Responsabilidad** | **Respuesta correcta** |
|------------------|---------------------|------------------------|
| `GET /health` | Comprobar aplicación | `200` |
| `POST /jobs` | Aceptar un trabajo | `202` |
| `GET /jobs/{job_id}` | Consultar estado | `200` |

Una ruta no identifica por sí sola la operación: el método también forma parte del contrato.

### 6.2. Identificadores

Utilizaremos valores como `JOB-001`, sin caracteres especiales que compliquen la URL.

### 6.3. Autorización

Los métodos utilizarán `authorization = "NONE"` exclusivamente para el laboratorio local.

---

## 7. Contrato del trabajo

El cuerpo del `POST` contendrá un identificador y una lista de enteros.

### 7.1. Ejemplo

```json
{
  "job_id": "JOB-001",
  "values": [2, 4, 6],
  "simulate_failure": false
}
```

### 7.2. Validación

Aceptaremos entre uno y cincuenta enteros, con valor absoluto máximo de un millón.

### 7.3. Campo didáctico

`simulate_failure` permite provocar un fallo antes de actualizar el resultado.

### 7.4. Precaución

Este campo no representa una funcionalidad de negocio adecuada para producción.

---

## 8. Estados e identidad

La tabla conservará un elemento por trabajo.

### 8.1. Estados

```text
QUEUED → COMPLETED
```

### 8.2. Identidad compatible

El mismo `job_id` con los mismos valores representa una repetición compatible.

### 8.3. Conflicto

El mismo identificador con valores diferentes producirá `409 Conflict`.

### 8.4. Estado intermedio

`QUEUED` significa que existe el registro de aceptación, no que la publicación SQS esté demostrada.

### 8.5. Límite

No implementaremos un estado persistente `FAILED`; un mensaje en DLQ puede conservar `QUEUED`.

---

## 9. Ventana entre DynamoDB y SQS

El registro y la publicación no constituyen una transacción distribuida.

### 9.1. Secuencia

```text
Crear registro → Enviar mensaje → Responder al cliente
```

### 9.2. Fallo posible

La función puede crear el registro y fallar antes de enviar el mensaje.

### 9.3. Recuperación didáctica

Repetir un `POST` compatible para un trabajo `QUEUED` volverá a intentar la publicación.

### 9.4. Duplicados

Si la publicación anterior sí ocurrió, esa repetición puede generar otro mensaje.

### 9.5. Producción

Un patrón outbox y un proceso de publicación pueden ofrecer garantías más sólidas.

---

## 10. Preparación del proyecto

Trabaja en una carpeta independiente.

### 10.1. Estructura

```bash
mkdir -p terraform-api-serverless/src/common
mkdir -p terraform-api-serverless/src/api
mkdir -p terraform-api-serverless/src/worker
mkdir -p terraform-api-serverless/tests
mkdir -p terraform-api-serverless/build/api
mkdir -p terraform-api-serverless/build/worker
mkdir -p terraform-api-serverless/{eventos,resultados,planes,scripts}
cd terraform-api-serverless
```

### 10.2. Separación

El código común se copiará a los paquetes de ambas funciones.

### 10.3. Aislamiento

No reutilices el estado de otra lección.

---

## 11. Protección de archivos

Separa material versionable y artefactos generados.

### 11.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
build/
resultados/
planes/
__pycache__/
*.pyc
crash.log
```

### 11.2. Qué conservar

Versiona código, pruebas, configuración, eventos ficticios y `.terraform.lock.hcl`.

### 11.3. Precaución

Los estados, planes y logs pueden contener información sensible.

---

## 12. Docker Compose y LocalStack

Utiliza una imagen validada por el docente.

### 12.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 12.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: apigateway,lambda,iam,sts,logs,sqs,dynamodb
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
      LAMBDA_DOCKER_NETWORK: curso-api-serverless
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-api-serverless
```

### 12.3. Seguridad

El socket Docker concede control amplio sobre el host; utiliza imágenes confiables y un entorno aislado.

---

## 13. Credenciales y conectividad

El host y los contenedores utilizarán direcciones diferentes.

### 13.1. Terminal

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 13.2. Runtime

El SDK utilizará `http://localstack:4566`.

### 13.3. Comprobación

Consulta `aws_local lambda list-functions`, `aws_local sqs list-queues` y `aws_local dynamodb list-tables`.

---

## 14. Código común: validación

Crea `src/common/domain.py`.

### 14.1. Primera parte

```python
import hashlib
import json
import re


def validate_job(document):
    if not isinstance(document, dict):
        raise ValueError("invalid_document")

    job_id = document.get("job_id")
    if not isinstance(job_id, str) or not re.fullmatch(r"JOB-[A-Z0-9-]{1,32}", job_id):
        raise ValueError("invalid_job_id")

    values = document.get("values")
    if not isinstance(values, list) or not 1 <= len(values) <= 50:
        raise ValueError("invalid_values")
    if any(type(value) is not int or abs(value) > 1_000_000 for value in values):
        raise ValueError("invalid_values")

    failure = document.get("simulate_failure", False)
    if type(failure) is not bool:
        raise ValueError("invalid_failure_flag")

    return {"job_id": job_id, "values": values, "simulate_failure": failure}
```

---

## 15. Código común: hash y lectura

Completa `domain.py` y crea `src/common/store.py`.

### 15.1. Hash de negocio

```python
def payload_hash(job):
    business = {"job_id": job["job_id"], "values": job["values"]}
    encoded = json.dumps(business, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
```

### 15.2. Cliente y lectura

```python
import os
import boto3

TABLE = os.environ["TABLE_NAME"]
ddb = boto3.client(
    "dynamodb",
    endpoint_url=os.environ["LOCAL_ENDPOINT"],
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
)


def read_job(job_id):
    return ddb.get_item(
        TableName=TABLE,
        Key={"job_id": {"S": job_id}},
        ConsistentRead=True,
    ).get("Item")
```

### 15.3. Decisión

El flag de fallo no entra en el hash para permitir reparar el ejercicio sin cambiar la identidad.

---

## 16. Lambda API: helpers

Crea `src/api/app.py`.

### 16.1. Primera parte

```python
import json
import logging
import os
import re

import boto3
from botocore.exceptions import ClientError

from domain import payload_hash, validate_job
from store import TABLE, ddb, read_job

logger = logging.getLogger()
logger.setLevel(logging.INFO)
sqs = boto3.client("sqs", endpoint_url=os.environ["LOCAL_ENDPOINT"])
QUEUE = os.environ["QUEUE_URL"]


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
        "isBase64Encoded": False,
    }


def public_job(item):
    result = {"job_id": item["job_id"]["S"], "status": item["status"]["S"]}
    if "total" in item:
        result["total"] = int(item["total"]["N"])
        result["count"] = int(item["count"]["N"])
    return result
```

---

## 17. Lambda API: aceptar trabajos

Añade la operación de creación y publicación.

### 17.1. Segunda parte

```python
def submit(job):
    digest = payload_hash(job)
    item = {
        "job_id": {"S": job["job_id"]},
        "payload_sha256": {"S": digest},
        "status": {"S": "QUEUED"},
    }

    try:
        ddb.put_item(
            TableName=TABLE, Item=item,
            ConditionExpression="attribute_not_exists(job_id)",
        )
    except ClientError as error:
        if error.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        item = read_job(job["job_id"])
        if not item or item["payload_sha256"]["S"] != digest:
            return response(409, {"error": "identity_conflict"})
        if item["status"]["S"] == "COMPLETED":
            return response(200, public_job(item))

    sqs.send_message(QueueUrl=QUEUE, MessageBody=json.dumps(job))
    logger.info("Publicación aceptada por SQS.")
    return response(202, {"job_id": job["job_id"], "status": "QUEUED"})
```

### 17.2. Límite

Un fallo de publicación deja el registro existente; el cliente debe conservar la solicitud original.

---

## 18. Lambda API: handler HTTP

Completa `src/api/app.py`.

### 18.1. Tercera parte

```python
def handler(event, context):
    method = event.get("httpMethod")
    resource = event.get("resource")
    logger.info("Solicitud HTTP; method=%s resource=%s", method, resource)

    try:
        if method == "GET" and resource == "/health":
            return response(200, {"status": "ok"})

        if method == "GET" and resource == "/jobs/{job_id}":
            job_id = (event.get("pathParameters") or {}).get("job_id")
            if not isinstance(job_id, str) or not re.fullmatch(r"JOB-[A-Z0-9-]{1,32}", job_id):
                return response(400, {"error": "invalid_job_id"})
            item = read_job(job_id)
            return response(200, public_job(item)) if item else response(
                404, {"error": "not_found"}
            )

        if method == "POST" and resource == "/jobs":
            headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
            media_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
            if media_type != "application/json":
                return response(415, {"error": "unsupported_media_type"})
            if event.get("isBase64Encoded"):
                return response(400, {"error": "base64_not_supported_in_lab"})
            return submit(validate_job(json.loads(event.get("body") or "")))

        return response(404, {"error": "route_not_found"})
    except ValueError:
        return response(400, {"error": "invalid_request"})
    except Exception:
        logger.exception("Fallo de integración en API.")
        return response(503, {"error": "service_unavailable"})
```

---

## 19. Lambda worker: actualización condicional

Crea `src/worker/app.py`.

### 19.1. Primera parte

```python
import json
import logging

from botocore.exceptions import ClientError

from domain import payload_hash, validate_job
from store import TABLE, ddb, read_job

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def process(document):
    job = validate_job(document)
    if job["simulate_failure"]:
        raise RuntimeError("Controlled failure before result update.")

    digest = payload_hash(job)
    try:
        ddb.update_item(
            TableName=TABLE,
            Key={"job_id": {"S": job["job_id"]}},
            UpdateExpression="SET #status=:done, #total=:total, #count=:count",
            ConditionExpression="#hash=:hash AND #status=:queued",
            ExpressionAttributeNames={
                "#status": "status", "#hash": "payload_sha256",
                "#total": "total", "#count": "count",
            },
            ExpressionAttributeValues={
                ":done": {"S": "COMPLETED"}, ":queued": {"S": "QUEUED"},
                ":hash": {"S": digest},
                ":total": {"N": str(sum(job["values"]))},
                ":count": {"N": str(len(job["values"]))},
            },
        )
        logger.info("Resultado registrado.")
        return
    except ClientError as error:
        if error.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
```

---

## 20. Lambda worker: duplicados y lotes

Completa `src/worker/app.py`.

### 20.1. Segunda parte

```python
    existing = read_job(job["job_id"])
    compatible = (
        existing
        and existing["payload_sha256"]["S"] == digest
        and existing["status"]["S"] == "COMPLETED"
        and int(existing["total"]["N"]) == sum(job["values"])
        and int(existing["count"]["N"]) == len(job["values"])
    )
    if not compatible:
        raise ValueError("Missing job or incompatible state.")
    logger.info("Duplicado compatible reconocido.")


def handler(event, context):
    records = event.get("Records") if isinstance(event, dict) else None
    if not isinstance(records, list):
        raise ValueError("Expected SQS Records.")

    failures = []
    for record in records:
        message_id = record.get("messageId")
        if not isinstance(message_id, str) or not message_id:
            raise ValueError("Missing messageId.")
        try:
            process(json.loads(record["body"]))
        except Exception:
            logger.exception("Registro fallido; message_id=%s", message_id)
            failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": failures}
```

---

## 21. Empaquetado reproducible

Crea `scripts/build.sh` para preparar directorios de staging.

### 21.1. Script

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p build/api build/worker
for target in api worker; do
  cp src/common/domain.py "build/$target/domain.py"
  cp src/common/store.py "build/$target/store.py"
  cp "src/$target/app.py" "build/$target/app.py"
done
```

### 21.2. Regla

Ejecuta el build después de cambiar código y antes de crear el plan.

### 21.3. Alcance

Los runtimes validados deben incluir Boto3; en producción conviene empaquetar versiones controladas.

---

## 22. Pruebas locales

Crea `tests/test_domain.py` para comprobar validación e identidad.

### 22.1. Código

```python
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src/common"))
from domain import payload_hash, validate_job


class DomainTests(unittest.TestCase):
    def test_valid_job(self):
        job = validate_job({"job_id": "JOB-001", "values": [2, 4, 6]})
        self.assertEqual(sum(job["values"]), 12)

    def test_boolean_rejected(self):
        with self.assertRaises(ValueError):
            validate_job({"job_id": "JOB-001", "values": [True]})

    def test_recovery_preserves_hash(self):
        job = validate_job({"job_id": "JOB-001", "values": [2]})
        repaired = dict(job, simulate_failure=True)
        self.assertEqual(payload_hash(job), payload_hash(repaired))
```

### 22.2. Ejecución

Utiliza `python3 -m unittest discover -s tests -v` y `bash scripts/build.sh`.

---

## 23. Requisitos y proveedor Terraform

Crea `versions.tf` y `providers.tf`.

### 23.1. Requisitos

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
```

### 23.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway = "http://localhost:4566"
    lambda     = "http://localhost:4566"
    iam        = "http://localhost:4566"
    sts        = "http://localhost:4566"
    logs       = "http://localhost:4566"
    sqs        = "http://localhost:4566"
    dynamodb   = "http://localhost:4566"
  }
}
```

---

## 24. Variables y colecciones

Crea `variables.tf`, `terraform.tfvars` y `locals.tf`.

### 24.1. Entradas

```hcl
variable "suffix" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "consumer_enabled" {
  type    = bool
  default = false
}
```

### 24.2. Valores y locales

```hcl
# terraform.tfvars
suffix           = "alumno01"
consumer_enabled = false
```

```hcl
# locals.tf
locals {
  stage = "lab"
  functions = toset(["api", "worker"])
  routes = {
    health = { method = "GET", path = "health" }
    create = { method = "POST", path = "jobs" }
    get    = { method = "GET", path = "jobs/*" }
  }
}
```

---

## 25. Tabla y colas

Crea `storage.tf` y `queues.tf`.

### 25.1. Almacenamiento

```hcl
resource "aws_dynamodb_table" "jobs" {
  name         = "curso-api-jobs-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "job_id"

  attribute {
    name = "job_id"
    type = "S"
  }
}
```

### 25.2. Mensajería

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-api-work-${var.suffix}"
  visibility_timeout_seconds = 90
  receive_wait_time_seconds  = 5
  message_retention_seconds  = 86400
}

resource "aws_sqs_queue" "dlq" {
  name                      = "curso-api-dlq-${var.suffix}"
  message_retention_seconds = 1209600
}
```

---

## 26. Redirección a DLQ

Añade las políticas a `queues.tf`.

### 26.1. Configuración

```hcl
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.work.arn]
  })
}

resource "aws_sqs_queue_redrive_policy" "work" {
  queue_url = aws_sqs_queue.work.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
  depends_on = [aws_sqs_queue_redrive_allow_policy.dlq]
}
```

### 26.2. Interpretación

El umbral se refiere a recepciones, no a un contador de errores mantenido por Python.

---

## 27. Roles y permisos separados

Crea `iam.tf`.

### 27.1. Configuración

```hcl
resource "aws_iam_role" "function" {
  for_each = local.functions
  name     = "curso-api-${each.key}-role-${var.suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "execution" {
  for_each = local.functions
  name     = "execution"
  role     = aws_iam_role.function[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = each.key == "api" ? [
          "dynamodb:PutItem", "dynamodb:GetItem"
        ] : ["dynamodb:UpdateItem", "dynamodb:GetItem"]
        Resource = aws_dynamodb_table.jobs.arn
      },
      {
        Effect = "Allow"
        Action = each.key == "api" ? ["sqs:SendMessage"] : [
          "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.work.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.function[each.key].arn}:*"
      }
    ]
  })
}
```

---

## 28. Funciones y grupos de logs

Crea `lambda.tf`.

### 28.1. Configuración

```hcl
data "archive_file" "function" {
  for_each    = local.functions
  type        = "zip"
  source_dir  = "${path.module}/build/${each.key}"
  output_path = "${path.module}/build/${each.key}.zip"
}

resource "aws_cloudwatch_log_group" "function" {
  for_each          = local.functions
  name              = "/aws/lambda/curso-api-${each.key}-${var.suffix}"
  retention_in_days = 7
}

resource "aws_lambda_function" "function" {
  for_each      = local.functions
  function_name = "curso-api-${each.key}-${var.suffix}"
  role          = aws_iam_role.function[each.key].arn
  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function[each.key].output_path
  source_code_hash = data.archive_file.function[each.key].output_base64sha256
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.jobs.name
      LOCAL_ENDPOINT = "http://localstack:4566"
      QUEUE_URL      = aws_sqs_queue.work.id
    }
  }

  depends_on = [aws_iam_role_policy.execution]
}
```

---

## 29. Consumo automático

Crea `mapping.tf`.

### 29.1. Configuración

```hcl
resource "aws_lambda_event_source_mapping" "work" {
  event_source_arn = aws_sqs_queue.work.arn
  function_name    = aws_lambda_function.function["worker"].arn
  enabled         = var.consumer_enabled

  batch_size                         = 5
  maximum_batching_window_in_seconds = 0
  function_response_types            = ["ReportBatchItemFailures"]

  depends_on = [
    aws_iam_role_policy.execution,
    aws_sqs_queue_redrive_policy.work
  ]
}
```

### 29.2. Timeout y visibilidad

La visibilidad de 90 segundos deja margen respecto al timeout de diez segundos.

### 29.3. Contrato

Los fallos parciales utilizan `messageId`, no el identificador de negocio.

---

## 30. API y recursos de ruta

Crea `api.tf`.

### 30.1. Configuración

```hcl
resource "aws_api_gateway_rest_api" "lab" {
  name = "curso-serverless-${var.suffix}"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.lab.id
  parent_id   = aws_api_gateway_rest_api.lab.root_resource_id
  path_part   = "health"
}

resource "aws_api_gateway_resource" "jobs" {
  rest_api_id = aws_api_gateway_rest_api.lab.id
  parent_id   = aws_api_gateway_rest_api.lab.root_resource_id
  path_part   = "jobs"
}

resource "aws_api_gateway_resource" "job" {
  rest_api_id = aws_api_gateway_rest_api.lab.id
  parent_id   = aws_api_gateway_resource.jobs.id
  path_part   = "{job_id}"
}

locals {
  resource_ids = {
    health = aws_api_gateway_resource.health.id
    create = aws_api_gateway_resource.jobs.id
    get    = aws_api_gateway_resource.job.id
  }
}
```

---

## 31. Métodos, integraciones y permisos

Completa `api.tf`.

### 31.1. Configuración

```hcl
resource "aws_api_gateway_method" "route" {
  for_each      = local.routes
  rest_api_id   = aws_api_gateway_rest_api.lab.id
  resource_id   = local.resource_ids[each.key]
  http_method   = each.value.method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "route" {
  for_each                = local.routes
  rest_api_id             = aws_api_gateway_rest_api.lab.id
  resource_id             = local.resource_ids[each.key]
  http_method             = aws_api_gateway_method.route[each.key].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.function["api"].invoke_arn
}

resource "aws_lambda_permission" "api" {
  for_each      = local.routes
  statement_id  = "AllowApi-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.function["api"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.lab.execution_arn}/${local.stage}/${each.value.method}/${each.value.path}"
}
```

### 31.2. Distinción

La invocación interna de Lambda utiliza `POST`, aunque el método público sea `GET`.

---

## 32. Deployment, stage y outputs

Crea `deployment.tf` y `outputs.tf`.

### 32.1. Despliegue

```hcl
resource "aws_api_gateway_deployment" "lab" {
  rest_api_id = aws_api_gateway_rest_api.lab.id
  triggers = {
    configuration = sha1(jsonencode({
      routes    = local.routes
      resources = local.resource_ids
      uri       = aws_lambda_function.function["api"].invoke_arn
      type      = "AWS_PROXY"
      auth      = "NONE"
    }))
  }
  depends_on = [aws_api_gateway_integration.route, aws_lambda_permission.api]
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "lab" {
  rest_api_id   = aws_api_gateway_rest_api.lab.id
  deployment_id = aws_api_gateway_deployment.lab.id
  stage_name    = local.stage
}
```

### 32.2. Resultados

```hcl
output "base_url" {
  value = "http://localhost:4566/_aws/execute-api/${aws_api_gateway_rest_api.lab.id}/${local.stage}"
}
output "queue_url" { value = aws_sqs_queue.work.id }
output "dlq_url" { value = aws_sqs_queue.dlq.id }
output "table_name" { value = aws_dynamodb_table.jobs.name }
output "mapping_uuid" { value = aws_lambda_event_source_mapping.work.uuid }
```

---

## 33. Sesión 1: desplegar y revisar

Duración orientativa: 30 minutos.

### 33.1. Secuencia

```bash
python3 -m unittest discover -s tests -v
bash scripts/build.sh
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 33.2. Resultado esperado

Deben crearse veintisiete recursos gestionados.

### 33.3. Compatibilidad

Valida la URL local y que las Queue URLs sean utilizables por el SDK dentro del runtime.

---

## 34. Sesión 2: salud y aceptación

El consumidor inicialmente desactivado permite observar el estado pendiente.

### 34.1. Identificadores y solicitudes

```bash
BASE_URL="$(terraform output -raw base_url)"
TABLE="$(terraform output -raw table_name)"
QUEUE="$(terraform output -raw queue_url)"
DLQ="$(terraform output -raw dlq_url)"
MAPPING="$(terraform output -raw mapping_uuid)"

curl --silent --show-error "$BASE_URL/health" | jq '.'

jq -n '{job_id:"JOB-001",values:[2,4,6],simulate_failure:false}' \
  > eventos/job-001.json

curl --silent --show-error -i \
  -H 'Content-Type: application/json' \
  --data-binary @eventos/job-001.json "$BASE_URL/jobs"
```

### 34.2. Resultado

Espera `200` en salud y `202` en aceptación; conserva encabezados y cuerpo como evidencia.

---

## 35. Sesión 3: consultar y activar procesamiento

La consulta permite distinguir aceptación y finalización.

### 35.1. Estado inicial

```bash
curl --silent --show-error "$BASE_URL/jobs/JOB-001" | jq '.'
```

### 35.2. Activación

Establece `consumer_enabled = true` y aplica un plan revisado.

### 35.3. Verificación

Consulta el mapping mediante `aws_local lambda get-event-source-mapping --uuid "$MAPPING"`.

### 35.4. Resultado esperado

Dentro de una ventana acotada, el `GET` debe devolver `COMPLETED`, total doce y cantidad tres.

### 35.5. Precaución

La activación y el procesamiento no son necesariamente instantáneos.

---

## 36. Sesión 4: verificar persistencia y duplicados

Comprueba el resultado sin depender de la API.

### 36.1. Consulta directa

```bash
jq -n '{job_id:{S:"JOB-001"}}' > eventos/key.json
aws_local dynamodb get-item --table-name "$TABLE" \
  --key file://eventos/key.json --consistent-read \
  > resultados/job-001.json
jq '.Item' resultados/job-001.json
```

### 36.2. Repetición

Publica otra vez el mismo `POST`.

Si ya está completado, devuelve `200` con el resultado sin enviar otro mensaje.

### 36.3. Conflicto

Cambia los valores conservando `JOB-001`; debe producir `409` sin alterar el resultado existente.

---

## 37. Sesión 5: entradas y rutas inválidas

Los errores de contrato deben comprobarse por separado.

### 37.1. Pruebas

```bash
curl --silent --show-error -i \
  -H 'Content-Type: application/json' \
  --data '{"job_id":"JOB-BAD","values":[true]}' "$BASE_URL/jobs"

curl --silent --show-error -i \
  -H 'Content-Type: text/plain' --data 'hello' "$BASE_URL/jobs"

curl --silent --show-error -i "$BASE_URL/jobs/JOB-MISSING"
```

### 37.2. Resultados

Espera `400`, `415` y `404`, respectivamente.

### 37.3. Gateway

Una ruta inexistente o método no declarado puede producir un error propio de API Gateway.

---

## 38. Sesión 6: provocar un fallo del worker

El fallo simulado ocurre antes de registrar el resultado.

### 38.1. Solicitud

```bash
jq -n '{job_id:"JOB-FAILED",values:[3,7],simulate_failure:true}' \
  > eventos/job-failed.json

curl --silent --show-error -i \
  -H 'Content-Type: application/json' \
  --data-binary @eventos/job-failed.json "$BASE_URL/jobs"
```

### 38.2. Observación

El registro permanece `QUEUED` y el mensaje no se confirma correctamente.

### 38.3. Reintentos

La integración puede recibirlo de nuevo después de vencer la visibilidad.

### 38.4. Tiempo

Con la configuración seleccionada, la redirección puede tardar varios minutos.

---

## 39. Sesión 7: logs e inspección de DLQ

No recibas manualmente mensajes de la cola principal mientras investigas el consumidor automático.

### 39.1. Consultas

```bash
aws_local logs tail "/aws/lambda/curso-api-worker-alumno01" --since 15m

aws_local sqs get-queue-attributes --queue-url "$DLQ" \
  --attribute-names ApproximateNumberOfMessages

aws_local sqs receive-message --queue-url "$DLQ" \
  --max-number-of-messages 1 --wait-time-seconds 5 \
  --visibility-timeout 300 > resultados/dlq-message.json
```

### 39.2. Identidad

Comprueba que el cuerpo corresponde a `JOB-FAILED`; adapta el nombre del log al sufijo utilizado.

### 39.3. Precaución

Las métricas son aproximadas y recibir vuelve invisible el mensaje, pero no lo elimina.

---

## 40. Sesión 8: recuperación controlada

Repara el fallo didáctico sin cambiar la identidad de negocio.

### 40.1. Publicación y eliminación

```bash
jq -e '
  .Messages[0].Body | fromjson |
  select(.job_id == "JOB-FAILED") |
  .simulate_failure = false
' resultados/dlq-message.json > eventos/recovered.json

aws_local sqs send-message --queue-url "$QUEUE" \
  --message-body file://eventos/recovered.json > resultados/recovery-send.json

jq -e '.MessageId | type == "string" and length > 0' \
  resultados/recovery-send.json >/dev/null

RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/dlq-message.json)"
aws_local sqs delete-message --queue-url "$DLQ" --receipt-handle "$RECEIPT"
```

### 40.2. Verificación

Consulta hasta observar `COMPLETED` y total diez; publicación y eliminación no son atómicas.

---

## 41. Sesión 9: estudiar publicación incompleta

Una prueba adicional demuestra la ventana entre registro y envío.

### 41.1. Preparación

Crea temporalmente un registro `QUEUED` mediante AWS CLI con el hash correcto de un trabajo nuevo, sin enviar mensaje.

### 41.2. Observación

El `GET` mostrará el estado pendiente, pero no habrá trabajo disponible para el consumidor.

### 41.3. Recuperación

Envía un `POST` compatible para ese identificador.

La API reconocerá el registro y volverá a intentar publicar.

### 41.4. Límite

La recuperación depende de conservar los valores originales; esta tabla no los almacena.

### 41.5. Producción

Guardar el comando y su estado de publicación permitiría una reconciliación más completa.

---

## 42. Garantías, concurrencia y diagnóstico

El diseño protege el resultado, no todos los efectos distribuidos.

### 42.1. Duplicados

Dos workers pueden competir; la condición permite completar el registro una vez y reconocer repeticiones.

### 42.2. Respuesta perdida

Un cliente puede recibir `202` aunque el trabajo ya haya terminado durante la respuesta.

### 42.3. Confirmación

Registrar el resultado y eliminar el mensaje SQS siguen siendo operaciones separadas.

### 42.4. Diagnóstico

Revisa método, ruta, deployment, permisos, endpoint, Queue URL, mapping, tabla y logs.

### 42.5. Precaución

No cambies simultáneamente todas esas capas para resolver un único fallo.

---

## 43. Diferencias respecto a AWS real

La emulación permite practicar integración, no certificar seguridad o rendimiento.

### 43.1. Controles adicionales

Revisa autenticación, autorización por usuario, cifrado, cuotas, throttling, backups y observabilidad.

### 43.2. Datos

La API actual no comprueba qué usuario puede consultar cada trabajo.

### 43.3. IAM

Una ejecución local exitosa no demuestra aplicación completa de permisos.

### 43.4. Red

El formato de URL local y la conectividad Docker no reproducen los endpoints públicos reales.

### 43.5. Evolución

Añadir rutas, opciones de métodos o integraciones exige revisar los triggers del deployment.

---

## 44. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 44.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local apigateway get-rest-apis
aws_local lambda list-functions
aws_local sqs list-queues
aws_local dynamodb list-tables
docker compose down
```

### 44.2. Datos

Eliminar tabla y colas elimina resultados y mensajes pendientes.

### 44.3. Evidencias

Exporta los logs necesarios antes de destruir y revisa contenedores residuales sin eliminar recursos ajenos.

---

## 45. Ejercicios, evaluación y resumen

La práctica se completa cuando puedes explicar el recorrido y sus límites.

### 45.1. Ejercicios

1. Añade pruebas unitarias para identidad incompatible.
2. Comprueba dos publicaciones concurrentes del mismo trabajo.
3. Instrumenta ambas funciones con correlación estructurada.
4. Implementa un estado de publicación separado.
5. Diseña recuperación automática antes de escribir código.
6. Añade autenticación como ampliación de arquitectura.
7. Documenta fallo, evidencia y recuperación.
8. Destruye y verifica todos los recursos.

### 45.2. Criterio de evaluación

Entrega configuración reproducible, pruebas HTTP, resultado persistido, evidencia de DLQ y explicación de la ventana no atómica.

### 45.3. Idea final

**Una API serverless mantenible separa aceptación y procesamiento, limita permisos, controla duplicados y ofrece procedimientos verificables para consultar, diagnosticar y recuperar sus trabajos.**