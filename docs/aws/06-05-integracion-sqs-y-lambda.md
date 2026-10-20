# Integración de SQS y Lambda con Terraform y LocalStack

Amazon SQS conserva mensajes para que puedan procesarse de forma desacoplada del productor.

AWS Lambda puede consumir esos mensajes mediante una asignación de origen de eventos, conocida como *event source mapping*.

Terraform permite declarar la cola, la función, sus permisos y la conexión entre ambos servicios.

LocalStack permite practicar esta integración mediante una emulación local de las API de AWS.

En esta lección construirás un consumidor de trabajos numéricos que registra sus resultados en DynamoDB.

La práctica incluye procesamiento por lotes, fallos parciales, entregas repetidas y una dead-letter queue.

También aprenderás a detener el consumo, inspeccionar mensajes y recuperar un trabajo fallido con un procedimiento controlado.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los ejemplos son didácticos y no constituyen un consumidor listo para producción.

---

## 1. Objetivos de aprendizaje

Esta lección conecta mensajería, ejecución de código y persistencia de resultados.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una cola principal y una DLQ.
- Configurar una función consumidora.
- Declarar una asignación de origen de eventos.
- Diferenciar recepción, procesamiento y confirmación.
- Devolver fallos parciales de un lote.
- Reconocer mensajes duplicados compatibles.
- Registrar resultados mediante escrituras condicionales.
- Observar reintentos y redirección.
- Recuperar un mensaje fallido.
- Destruir y verificar el laboratorio.

### 1.2. Resultado práctico

Construirás un flujo SQS → Lambda → DynamoDB con aislamiento de mensajes fallidos.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Lambda, SQS, IAM y DynamoDB.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, paquetes ZIP, roles, claves DynamoDB y condiciones de escritura.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación de colas y políticas de redirección.
- Ejecución de Lambda con Python 3.12.
- Creación y activación del event source mapping.
- Consumo automático desde SQS.
- Entrega del evento con `Records`.
- Respuestas parciales de lote.
- Escrituras condicionales DynamoDB.
- Reintentos y traslado a DLQ.
- Consulta de logs.
- Desactivación y destrucción.

### 3.2. Registro del entorno

Documenta Terraform, proveedores, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Advertencia

La disponibilidad de una API no demuestra equivalencia completa de comportamiento con AWS.

---

## 4. Arquitectura de la práctica

El productor enviará mensajes y un consumidor gestionado los procesará.

### 4.1. Recorrido principal

```text
Productor → SQS principal → Event source mapping → Lambda → DynamoDB
                │                                    │
                └──→ DLQ tras reintentos              └──→ Logs
```

### 4.2. Productor

Utilizaremos AWS CLI para publicar trabajos ficticios.

### 4.3. Consumidor

Lambda validará cada trabajo y calculará un resumen numérico.

### 4.4. Persistencia

DynamoDB conservará un resultado por `job_id`.

### 4.5. Alcance

No utilizaremos SNS, API Gateway ni DynamoDB Streams en esta página.

---

## 5. SQS no invoca Lambda como SNS

La integración utiliza un mecanismo de consumo distinto al de una notificación push.

### 5.1. Polling gestionado

El servicio Lambda consulta SQS mediante el event source mapping.

### 5.2. Lotes

Los mensajes recibidos se agrupan y se entregan al handler.

### 5.3. Confirmación

La integración elimina los mensajes considerados procesados correctamente.

### 5.4. Fallo

Los mensajes no confirmados pueden volver a estar disponibles.

### 5.5. Permisos

El rol de ejecución necesita permisos para las operaciones SQS utilizadas.

### 5.6. Distinción

No añadiremos `aws_lambda_permission` con principal SQS para esta integración.

---

## 6. Responsabilidades de los componentes

Cada componente resuelve una parte del recorrido.

### 6.1. Comparación

| **Componente** | **Responsabilidad** | **No garantiza por sí solo** |
|---------------|---------------------|-----------------------------|
| SQS | Conservar y entregar mensajes | Éxito de negocio |
| Event source mapping | Consultar e invocar | Corrección del handler |
| Lambda | Validar y procesar | Persistencia de variables globales |
| DynamoDB | Registrar resultados | Atomicidad con eliminación SQS |
| DLQ | Aislar mensajes reiteradamente fallidos | Reparación de la causa |
| Terraform | Gestionar infraestructura | Procesamiento de todos los mensajes |

Estas diferencias permiten interpretar correctamente las pruebas.

### 6.2. Regla principal

**Publicación, recepción, registro y confirmación son operaciones diferentes.**

### 6.3. Evidencia

Verificaremos cada etapa con consultas y resultados independientes.

---

## 7. Cola estándar y entregas repetidas

La práctica utilizará una cola SQS estándar.

### 7.1. Características relevantes

Debes diseñar considerando:

- Entregas al menos una vez.
- Posibles mensajes duplicados.
- Orden no estricto.
- Procesamiento concurrente.
- Reintentos tras fallos.

### 7.2. Consecuencia

El consumidor no debe asumir una única ejecución por trabajo.

### 7.3. Identidad

`MessageId` identifica una publicación SQS.

`job_id` identifica el trabajo de aplicación.

### 7.4. Regla

La deduplicación de negocio utilizará `job_id`, no solamente `MessageId`.

---

## 8. Visibilidad y confirmación

Recibir un mensaje no equivale a eliminarlo.

### 8.1. Visibilidad

Durante el periodo de invisibilidad, el mensaje normalmente no está disponible para otra recepción.

### 8.2. Confirmación correcta

La integración elimina los mensajes cuyo procesamiento considera exitoso.

### 8.3. Sin confirmación

Al vencer la visibilidad, un mensaje puede recibirse otra vez.

### 8.4. Handle

Cada recepción proporciona un `ReceiptHandle` utilizado para operaciones sobre esa recepción.

### 8.5. Precaución

Un handle antiguo no debe reutilizarse como identificador permanente del mensaje.

### 8.6. Handler

El código del laboratorio no llamará directamente a `DeleteMessage`.

---

## 9. Timeout de Lambda y visibilidad SQS

Los dos valores deben configurarse de forma coordinada.

### 9.1. Valores iniciales

Utilizaremos:

- Timeout Lambda: 10 segundos.
- Visibilidad SQS: 90 segundos.
- Ventana de agrupación: 0 segundos.

### 9.2. Recomendación de diseño

AWS recomienda dimensionar la visibilidad considerando al menos seis veces el timeout de la función y la ventana de agrupación.

### 9.3. Validación

La configuración del laboratorio deja margen respecto al timeout seleccionado.

### 9.4. Distinción

El timeout de la función no equivale al tiempo máximo que un mensaje puede permanecer en la cola.

### 9.5. Rendimiento

No extrapoles tiempos de reintento de LocalStack a un entorno real.

---

## 10. Procesamiento por lotes

Una invocación puede contener varios mensajes independientes.

### 10.1. Estructura

El evento utiliza una colección:

```json
{
  "Records": [
    {
      "messageId": "identificador-sqs",
      "body": "{\"job_id\":\"JOB#001\"}"
    }
  ]
}
```

### 10.2. Cuerpo

`body` es una cadena que debe decodificarse como JSON.

### 10.3. Tamaño del lote

Configuraremos `batch_size = 5`.

### 10.4. Precaución

El tamaño configurado es un máximo, no una promesa de cinco mensajes en cada invocación.

---

## 11. Fallo completo y fallo parcial

El resultado de un lote depende del contrato de respuesta y de la configuración.

### 11.1. Comparación

| **Comportamiento** | **Resultado general** | **Consecuencia** |
|-------------------|-----------------------|------------------|
| Handler termina correctamente sin fallos declarados | Lote exitoso | Mensajes confirmados |
| Handler lanza una excepción | Fallo de invocación | Puede repetirse todo el lote |
| Handler declara fallos parciales correctamente | Fallan los identificados | Los demás pueden confirmarse |

La respuesta parcial requiere habilitar la funcionalidad correspondiente.

### 11.2. Configuración

Utilizaremos `ReportBatchItemFailures`.

### 11.3. Identificador

Cada fallo indicará el `messageId` del registro recibido.

### 11.4. Regla

No utilices `job_id` como `itemIdentifier` en la respuesta de lote.

---

## 12. Contrato del trabajo

Cada mensaje representará un trabajo numérico pequeño.

### 12.1. Ejemplo

```json
{
  "schema_version": 1,
  "job_id": "JOB#001",
  "values": [2, 4, 6],
  "simulate_failure": false
}
```

### 12.2. Validación

Aceptaremos entre uno y cincuenta números enteros dentro de un rango didáctico.

### 12.3. Booleanos

No aceptaremos `true` ni `false` como números.

### 12.4. Campo de prueba

`simulate_failure` permitirá provocar un fallo controlado antes de registrar resultados.

### 12.5. Producción

Ese mecanismo no debe confundirse con una funcionalidad de negocio.

---

## 13. Registro de resultados e idempotencia

La tabla almacenará un resultado por identificador de trabajo.

### 13.1. Atributos

El elemento incluirá:

- `job_id`.
- `payload_sha256`.
- `status`.
- `count`.
- `total`.

### 13.2. Creación condicional

El consumidor utilizará `attribute_not_exists(job_id)`.

### 13.3. Duplicado compatible

Si ya existe, comprobará identidad, hash y resultado.

### 13.4. Conflicto

El mismo `job_id` con otros valores no se confirmará automáticamente.

### 13.5. Límite

La estrategia protege el registro del laboratorio, no todos los posibles efectos externos.

---

## 14. Hash y recuperación del trabajo

La identidad documental se calculará sobre los campos de negocio normalizados.

### 14.1. Campos incluidos

El hash incluirá:

- `schema_version`.
- `job_id`.
- `values`.

### 14.2. Campo excluido

No incluirá `simulate_failure`.

### 14.3. Motivo

Desactivar el fallo de prueba no representa otro trabajo de negocio.

### 14.4. Canonicalización

El código utilizará orden estable de claves y separadores JSON definidos.

### 14.5. Precaución

Una canonicalización compartida entre lenguajes necesita un contrato más formal en producción.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente.

### 15.1. Crear estructura

```bash
mkdir -p terraform-sqs-lambda/src
mkdir -p terraform-sqs-lambda/tests
mkdir -p terraform-sqs-lambda/build
mkdir -p terraform-sqs-lambda/eventos
mkdir -p terraform-sqs-lambda/resultados
mkdir -p terraform-sqs-lambda/planes
cd terraform-sqs-lambda
```

### 15.2. Organización

`src/` contendrá dominio y handler.

### 15.3. Aislamiento

No reutilices estados de las páginas anteriores.

### 15.4. Concurrencia local

Los comandos didácticos sobrescriben determinados archivos; ejecuta una sesión cada vez.

---

## 16. Protección de archivos

Separa código versionable y artefactos operativos.

### 16.1. `.gitignore`

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

### 16.2. Qué conservar

Versiona configuración, código, pruebas, eventos ficticios y `.terraform.lock.hcl`.

### 16.3. Precaución

Estados, planes, mensajes y logs pueden contener información sensible.

---

## 17. Docker y configuración de LocalStack

La ejecución de Lambda necesita un runtime compatible y acceso a Docker.

### 17.1. Selección de imagen

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs,lambda,dynamodb,iam,sts,logs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
      LAMBDA_DOCKER_NETWORK: curso-sqs-lambda
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-sqs-lambda
```

### 17.3. Seguridad

El socket concede control amplio sobre Docker; utiliza imágenes confiables y un entorno aislado.

---

## 18. Credenciales, red y conectividad

El endpoint depende de dónde se ejecuta el cliente.

### 18.1. Terminal

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

### 18.2. Runtime

La función utilizará `http://localstack:4566`.

### 18.3. Comprobaciones

Ejecuta `aws_local sqs list-queues`, `aws_local lambda list-functions` y `aws_local dynamodb list-tables`.

### 18.4. Precaución

Dentro del runtime, `localhost` no representa automáticamente al contenedor LocalStack.

---

## 19. Código de dominio: validación

Crea `src/domain.py`.

### 19.1. Primera parte

```python
import hashlib
import json
import re


def validate_job(document):
    if not isinstance(document, dict):
        raise ValueError("El trabajo debe ser un objeto JSON.")

    if type(document.get("schema_version")) is not int:
        raise ValueError("schema_version debe ser un entero.")
    if document["schema_version"] != 1:
        raise ValueError("schema_version no está soportada.")

    job_id = document.get("job_id")
    if not isinstance(job_id, str) or not re.fullmatch(r"JOB#[A-Z0-9-]{1,32}", job_id):
        raise ValueError("job_id no es válido.")

    values = document.get("values")
    if not isinstance(values, list) or not 1 <= len(values) <= 50:
        raise ValueError("values debe contener entre 1 y 50 elementos.")

    if any(type(value) is not int for value in values):
        raise ValueError("Todos los valores deben ser enteros.")
    if any(abs(value) > 1_000_000 for value in values):
        raise ValueError("Un valor está fuera del rango permitido.")
```

---

## 20. Código de dominio: normalización y hash

Completa `src/domain.py`.

### 20.1. Segunda parte

```python
    simulate_failure = document.get("simulate_failure", False)
    if type(simulate_failure) is not bool:
        raise ValueError("simulate_failure debe ser un booleano.")

    return {
        "schema_version": 1,
        "job_id": job_id,
        "values": values,
        "simulate_failure": simulate_failure,
    }


def payload_hash(job):
    business = {
        "schema_version": job["schema_version"],
        "job_id": job["job_id"],
        "values": job["values"],
    }
    encoded = json.dumps(
        business, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
```

### 20.2. Resultado

La representación normalizada evita diferencias por espacios o por orden de claves.

---

## 21. Código del consumidor: cliente y resultado

Crea `src/app.py`.

### 21.1. Primera parte

```python
import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

from domain import payload_hash, validate_job

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ddb = boto3.client(
    "dynamodb",
    endpoint_url=os.environ["LOCAL_ENDPOINT"],
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
)
TABLE = os.environ["TABLE_NAME"]


def process_job(document):
    job = validate_job(document)
    if job["simulate_failure"]:
        raise RuntimeError("Fallo simulado antes de registrar el resultado.")

    item = {
        "job_id": {"S": job["job_id"]},
        "payload_sha256": {"S": payload_hash(job)},
        "status": {"S": "COMPLETED"},
        "count": {"N": str(len(job["values"]))},
        "total": {"N": str(sum(job["values"]))},
    }
```

---

## 22. Código del consumidor: escritura condicional

Completa `process_job` con la creación y comprobación de duplicados.

### 22.1. Segunda parte

```python
    try:
        ddb.put_item(
            TableName=TABLE,
            Item=item,
            ConditionExpression="attribute_not_exists(job_id)",
        )
        logger.info("Resultado creado.")
        return

    except ClientError as error:
        code = error.response["Error"]["Code"]
        if code != "ConditionalCheckFailedException":
            raise

    existing = ddb.get_item(
        TableName=TABLE,
        Key={"job_id": {"S": job["job_id"]}},
        ConsistentRead=True,
    ).get("Item")

    if existing != item:
        raise ValueError("Conflicto de identidad o resultado incompatible.")

    logger.info("Duplicado compatible reconocido.")
```

### 22.2. Alcance

La comparación exacta es adecuada para el esquema fijo de esta práctica.

---

## 23. Código del consumidor: respuesta parcial

Completa `src/app.py` con el handler.

### 23.1. Tercera parte

```python
def handler(event, context):
    records = event.get("Records") if isinstance(event, dict) else None
    if not isinstance(records, list):
        raise ValueError("Se esperaba un evento SQS con Records.")

    failures = []

    for record in records:
        message_id = record.get("messageId")
        if not isinstance(message_id, str) or not message_id:
            raise ValueError("Registro sin messageId válido.")

        try:
            document = json.loads(record["body"])
            process_job(document)
        except Exception:
            logger.exception("Registro fallido; message_id=%s", message_id)
            failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": failures}
```

### 23.2. Contrato

Cada registro se procesa independientemente.

### 23.3. Precaución

Una excepción fuera del procesamiento individual puede hacer fallar la invocación completa.

---

## 24. Pruebas unitarias del dominio

Crea `tests/test_domain.py`.

### 24.1. Código

```python
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from domain import payload_hash, validate_job


class DomainTests(unittest.TestCase):
    def test_valid_job(self):
        job = validate_job({
            "schema_version": 1, "job_id": "JOB#001", "values": [2, 4, 6],
        })
        self.assertEqual(sum(job["values"]), 12)

    def test_boolean_rejected(self):
        with self.assertRaises(ValueError):
            validate_job({
                "schema_version": 1, "job_id": "JOB#001", "values": [True],
            })

    def test_failure_flag_does_not_change_hash(self):
        first = validate_job({
            "schema_version": 1, "job_id": "JOB#001", "values": [2],
        })
        second = dict(first, simulate_failure=True)
        self.assertEqual(payload_hash(first), payload_hash(second))
```

### 24.2. Ejecución

Utiliza `python3 -m unittest discover -s tests -v`.

---

## 25. Requisitos y proveedor Terraform

Crea `versions.tf` y `providers.tf`.

### 25.1. Requisitos

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

### 25.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs      = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    iam      = "http://localhost:4566"
    sts      = "http://localhost:4566"
    logs     = "http://localhost:4566"
  }
}
```

---

## 26. Variables y estado inicial del consumidor

Crea los archivos de entradas.

### 26.1. `variables.tf`

```hcl
variable "suffix" {
  type     = string
  nullable = false

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

### 26.2. `terraform.tfvars`

```hcl
suffix           = "alumno01"
consumer_enabled = false
```

### 26.3. Decisión

El consumo permanecerá desactivado hasta revisar infraestructura y función.

---

## 27. Colas principal y dead-letter queue

Crea `queues.tf`.

### 27.1. Recursos

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-sqs-work-${var.suffix}"
  visibility_timeout_seconds = 90
  receive_wait_time_seconds  = 5
  message_retention_seconds  = 86400
}

resource "aws_sqs_queue" "dlq" {
  name                      = "curso-sqs-dlq-${var.suffix}"
  message_retention_seconds = 1209600
}
```

### 27.2. Retención

La cola principal conserva mensajes durante un día.

La DLQ conserva mensajes durante catorce días.

### 27.3. Diseño

La DLQ tiene más retención para dejar margen de diagnóstico.

### 27.4. Precaución

La retención no sustituye backups ni procedimientos de recuperación.

---

## 28. Políticas de redirección

Añade la relación entre la cola principal y su DLQ.

### 28.1. Configuración

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

### 28.2. Interpretación

El umbral se refiere a recepciones, no a un contador explícito del código.

---

## 29. Tabla, paquete y grupo de logs

Crea `storage.tf` y `lambda.tf`.

### 29.1. Tabla

```hcl
resource "aws_dynamodb_table" "results" {
  name         = "curso-sqs-results-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "job_id"

  attribute {
    name = "job_id"
    type = "S"
  }
}
```

### 29.2. Paquete y logs

```hcl
locals {
  function_name = "curso-sqs-consumer-${var.suffix}"
}

data "archive_file" "function" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/function.zip"
  excludes    = ["__pycache__"]
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
```

---

## 30. Rol de ejecución y permisos

Crea `iam.tf`.

### 30.1. Configuración

```hcl
resource "aws_iam_role" "function" {
  name = "curso-sqs-consumer-role-${var.suffix}"

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
  name = "consume-and-record"
  role = aws_iam_role.function.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.work.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem"]
        Resource = aws_dynamodb_table.results.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.function.arn}:*"
      }
    ]
  })
}
```

---

## 31. Función y event source mapping

Completa `lambda.tf` y crea `mapping.tf`.

### 31.1. Función

```hcl
resource "aws_lambda_function" "consumer" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn
  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.results.name
      LOCAL_ENDPOINT = "http://localstack:4566"
    }
  }

  depends_on = [aws_iam_role_policy.execution]
}
```

### 31.2. Asignación de origen

```hcl
resource "aws_lambda_event_source_mapping" "work" {
  event_source_arn = aws_sqs_queue.work.arn
  function_name    = aws_lambda_function.consumer.arn
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

---

## 32. Outputs y despliegue inicial

Crea `outputs.tf`.

### 32.1. Resultados

```hcl
output "function_name" {
  value = aws_lambda_function.consumer.function_name
}

output "queue_url" {
  value = aws_sqs_queue.work.id
}

output "dlq_url" {
  value = aws_sqs_queue.dlq.id
}

output "table_name" {
  value = aws_dynamodb_table.results.name
}

output "mapping_uuid" {
  value = aws_lambda_event_source_mapping.work.uuid
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.function.name
}
```

### 32.2. Secuencia

Ejecuta pruebas, `terraform init`, `fmt`, `validate`, un plan guardado y su aplicación revisada.

### 32.3. Resultado esperado

Deben crearse diez recursos gestionados.

---

## 33. Sesión 1: comprobar configuración y artefacto

Duración orientativa: 25 minutos.

### 33.1. Comandos

```bash
python3 -m unittest discover -s tests -v
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
python3 -m zipfile -l build/function.zip
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 33.2. Identificadores

```bash
FUNCTION="$(terraform output -raw function_name)"
QUEUE="$(terraform output -raw queue_url)"
DLQ="$(terraform output -raw dlq_url)"
TABLE="$(terraform output -raw table_name)"
MAPPING="$(terraform output -raw mapping_uuid)"
```

### 33.3. Condición

La tabla y la función deben estar activas; el mapping debe permanecer desactivado.

---

## 34. Sesión 2: invocación directa con lote ficticio

Esta prueba comprueba el handler sin consumir mensajes reales.

### 34.1. Evento

```bash
jq -n '{
  Records: [
    {
      messageId: "direct-valid",
      body: ({
        schema_version: 1, job_id: "JOB#DIRECT",
        values: [2,4,6], simulate_failure: false
      } | tojson)
    },
    {
      messageId: "direct-failed",
      body: ({
        schema_version: 1, job_id: "JOB#DIRECTFAIL",
        values: [1], simulate_failure: true
      } | tojson)
    }
  ]
}' > eventos/direct-batch.json
```

### 34.2. Invocación

Utiliza `aws_local lambda invoke` con `--cli-binary-format raw-in-base64-out` y ese archivo.

### 34.3. Resultado esperado

La respuesta debe identificar únicamente `direct-failed`; la prueba no confirma mensajes SQS.

---

## 35. Sesión 3: preparar mensajes reales

Crea dos trabajos correctos y otro con fallo simulado.

### 35.1. Archivos

```bash
jq -n '{
  schema_version:1, job_id:"JOB#001",
  values:[2,4,6], simulate_failure:false
}' > eventos/job-001.json

jq -n '{
  schema_version:1, job_id:"JOB#002",
  values:[10,20], simulate_failure:false
}' > eventos/job-002.json

jq -n '{
  schema_version:1, job_id:"JOB#FAILED",
  values:[3,7], simulate_failure:true
}' > eventos/job-failed.json
```

### 35.2. Publicación

```bash
aws_local sqs send-message --queue-url "$QUEUE" \
  --message-body file://eventos/job-001.json
```

### 35.3. Comprobación

Con el mapping desactivado, el mensaje debe permanecer pendiente de consumo.

---

## 36. Sesión 4: activar el consumidor

La activación permite comenzar el polling gestionado.

### 36.1. Cambio

Establece `consumer_enabled = true` en `terraform.tfvars`.

### 36.2. Aplicación

```bash
terraform plan -out=planes/enable.tfplan
terraform show planes/enable.tfplan
terraform apply planes/enable.tfplan

aws_local lambda get-event-source-mapping \
  --uuid "$MAPPING" > resultados/mapping.json
```

### 36.3. Estado

Espera a que la asignación indique `Enabled`.

### 36.4. Precaución

Activación y procesamiento no son necesariamente instantáneos.

### 36.5. Verificación

Consulta DynamoDB hasta observar el resultado de `JOB#001` dentro de una ventana acotada.

---

## 37. Sesión 5: verificar resultado y duplicado

El registro persistido proporciona evidencia independiente del procesamiento.

### 37.1. Consulta

```bash
jq -n '{job_id:{S:"JOB#001"}}' > eventos/result-key.json

aws_local dynamodb get-item --table-name "$TABLE" \
  --key file://eventos/result-key.json --consistent-read \
  > resultados/job-001.json

jq '.Item' resultados/job-001.json
```

### 37.2. Resultado esperado

Debe contener `COMPLETED`, cantidad tres y total doce.

### 37.3. Duplicado

Publica otra vez el mismo trabajo y comprueba que se reconoce como compatible.

### 37.4. Distinción

La nueva publicación tiene otro `MessageId`, pero conserva el mismo `job_id`.

---

## 38. Sesión 6: fallos parciales y mensajes problemáticos

Publica un trabajo correcto y otro fallido.

### 38.1. Comandos

```bash
aws_local sqs send-message --queue-url "$QUEUE" \
  --message-body file://eventos/job-002.json

aws_local sqs send-message --queue-url "$QUEUE" \
  --message-body file://eventos/job-failed.json
```

### 38.2. Resultado esperado

`JOB#002` debe registrarse; `JOB#FAILED` no debe tener resultado.

### 38.3. Lotes

No presupongas que ambos mensajes llegarán en la misma invocación.

### 38.4. Evidencia

La prueba directa anterior verifica el contrato de lote; esta sesión verifica el consumo automático.

### 38.5. Reintentos

El mensaje fallido permanece sin confirmar y puede volver a recibirse.

---

## 39. Sesión 7: observar colas y logs

Las métricas de cola son orientativas y pueden presentar retrasos.

### 39.1. Consultas

```bash
aws_local sqs get-queue-attributes --queue-url "$QUEUE" \
  --attribute-names ApproximateNumberOfMessages \
  ApproximateNumberOfMessagesNotVisible RedrivePolicy

aws_local sqs get-queue-attributes --queue-url "$DLQ" \
  --attribute-names ApproximateNumberOfMessages

LOG_GROUP="$(terraform output -raw log_group_name)"
aws_local logs tail "$LOG_GROUP" --since 10m
```

### 39.2. Observación

Busca registros fallidos y resultados creados o duplicados compatibles.

### 39.3. Tiempo

Con visibilidad de 90 segundos, la prueba de DLQ puede tardar varios minutos.

### 39.4. Precaución

No recibas manualmente mensajes de la cola principal mientras investigas el consumo automático.

---

## 40. Sesión 8: detener e inspeccionar la DLQ

Desactivar el mapping evita nuevas recepciones gestionadas, pero no cancela inmediatamente todas las ejecuciones en curso.

### 40.1. Pausa

Establece `consumer_enabled = false`, revisa el plan y aplica el cambio.

### 40.2. Inspección

```bash
aws_local sqs receive-message --queue-url "$DLQ" \
  --max-number-of-messages 1 --wait-time-seconds 5 \
  --visibility-timeout 300 \
  --message-system-attribute-names All \
  > resultados/dlq-message.json

jq '.Messages[0].Body | fromjson' resultados/dlq-message.json
```

### 40.3. Condición

Continúa solamente si existe un mensaje y corresponde a `JOB#FAILED`.

### 40.4. Precaución

La recepción vuelve invisible el mensaje; no lo elimina.

---

## 41. Sesión 9: recuperación controlada

La recuperación modifica únicamente el fallo didáctico y conserva la identidad de negocio.

### 41.1. Preparación y publicación

```bash
jq -e '
  .Messages[0].Body | fromjson |
  select(.job_id == "JOB#FAILED") |
  .simulate_failure = false
' resultados/dlq-message.json > eventos/recovered.json

aws_local sqs send-message --queue-url "$QUEUE" \
  --message-body file://eventos/recovered.json \
  > resultados/recovery-send.json

jq -e '.MessageId | type == "string" and length > 0' \
  resultados/recovery-send.json >/dev/null
```

### 41.2. Eliminación del original

```bash
RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/dlq-message.json)"
aws_local sqs delete-message --queue-url "$DLQ" --receipt-handle "$RECEIPT"
```

### 41.3. Verificación

Reactiva el mapping y comprueba el resultado de `JOB#FAILED`.

---

## 42. Riesgos de recuperación y conflictos

Publicar una copia y eliminar el original no constituye una transacción.

### 42.1. Interrupción

Si el procedimiento se interrumpe después de publicar, puede producirse una repetición.

### 42.2. Protección

El registro condicional permite reconocer duplicados compatibles.

### 42.3. Identidad incompatible

El mismo `job_id` con otros valores fallará y puede terminar en la DLQ.

### 42.4. Diagnóstico

No cambies el identificador solamente para silenciar un conflicto sin investigar su causa.

### 42.5. Redrive masivo

Las API de redrive gestionado requieren revisión de compatibilidad, permisos y alcance.

### 42.6. Laboratorio

Utilizamos recuperación manual de un único mensaje para mantener control sobre la prueba.

---

## 43. Límites de idempotencia y concurrencia

La práctica registra resultados, pero no implementa exactamente una ejecución universal.

### 43.1. Ventana de repetición

DynamoDB puede registrar el resultado y la confirmación SQS puede fallar después.

### 43.2. Nueva entrega

El consumidor reconocerá el registro compatible y permitirá confirmar la repetición.

### 43.3. Efectos externos

Cobros, emails o llamadas HTTP necesitan estrategias adicionales.

### 43.4. Concurrencia

Dos consumidores pueden intentar registrar el mismo trabajo; la condición protege la creación.

### 43.5. Esquema

Si amplías atributos, revisa la comparación de duplicados y la evolución del hash.

### 43.6. FIFO

Una cola FIFO exige revisar orden, grupos y tratamiento de fallos; este handler está diseñado para cola estándar.

---

## 44. Operación, permisos y diferencias respecto a AWS real

El funcionamiento local debe interpretarse dentro de las capacidades validadas.

### 44.1. Permisos

El rol consume la cola principal y escribe resultados; no necesita leer la DLQ para el flujo normal.

### 44.2. Cifrado

Una cola o tabla cifrada con claves KMS administradas por el cliente puede requerir permisos adicionales.

### 44.3. Concurrencia

Revisa escalado, concurrencia reservada y concurrencia máxima del mapping antes de producción.

### 44.4. Errores parciales

Una invocación exitosa con elementos fallidos no equivale a todos los trabajos completados.

### 44.5. Observabilidad

Añade métricas de negocio y alarmas para backlog, antigüedad y DLQ.

### 44.6. LocalStack

No extrapoles rendimiento, tiempos ni aplicación completa de IAM desde la emulación.

---

## 45. Limpieza, ejercicios y resumen

La práctica termina cuando infraestructura y datos pendientes tienen un destino comprendido.

### 45.1. Limpieza revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local sqs list-queues
aws_local lambda list-functions
aws_local dynamodb list-tables
docker compose down
```

### 45.2. Ejercicios

Añade pruebas de JSON inválido, conflicto de identidad y duplicados concurrentes.

Documenta también una interrupción entre registro y confirmación, y una recuperación desde DLQ.

### 45.3. Idea final

**Un consumidor mantenible valida cada mensaje, registra resultados idempotentes, comunica fallos parciales y conserva un procedimiento explícito para reintentos y recuperación.**