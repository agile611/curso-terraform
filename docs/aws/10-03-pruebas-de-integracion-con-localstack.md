# Pruebas de integración con LocalStack

Una prueba de integración comprueba que varios componentes pueden trabajar juntos y producir un resultado observable.

Crear un bucket, un tópico y una cola no demuestra que una notificación llegue al consumidor correcto.

También necesitas verificar suscripciones, filtros, permisos declarados, formatos de mensajes y recuperación del contenido.

En esta lección desplegarás una integración S3, SNS y SQS con Terraform.

Un productor de prueba almacenará un documento en S3 y publicará su referencia en SNS.

SNS distribuirá los eventos a dos colas con contratos diferentes.

Un consumidor de prueba comprobará la entrega, aplicará las expectativas de filtrado y recuperará el documento original.

Todo el recorrido se ejecutará localmente con LocalStack y datos ficticios.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Las pruebas crean recursos y datos temporales.
>
> Una prueba correcta en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección convierte una arquitectura de eventos en un contrato verificable.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar pruebas de recursos y de integración.
- Configurar una integración SNS y SQS.
- Comprobar filtros de suscripción.
- Utilizar referencias a documentos S3.
- Correlacionar mensajes mediante identificadores.
- Manejar duplicados y esperas acotadas.
- Registrar evidencias sin publicar contenido.
- Limpiar datos e infraestructura por separado.

### 1.2. Resultado práctico

Construirás un recorrido de eventos con dos destinos y una matriz de comprobaciones.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Terraform, S3, SNS y SQS.

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

### 2.2. Conocimientos recomendados

Revisa módulos, estado, políticas IAM y estrategia de pruebas.

---

## 3. Versiones y reproducibilidad

El resultado depende de las versiones de herramientas y servicios emulados.

### 3.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

La versión de Boto3 debe fijarse después de validarla.

### 3.2. Registro mínimo

Conserva:

- Terraform y proveedor seleccionado.
- AWS CLI y Python.
- Boto3 y Botocore.
- Imagen o digest de LocalStack.
- Edición y configuración del emulador.

### 3.3. Regla

**Código, dependencias y configuración deben poder reconstruirse juntos.**

---

## 4. Compatibilidad obligatoria

El docente debe comprobar el recorrido antes de distribuir la práctica.

### 4.1. Operaciones necesarias

Valida:

- Escritura y lectura S3.
- Publicación SNS.
- Suscripciones SNS a SQS.
- Entrega sin envoltorio SNS.
- Filtrado por atributos de mensaje.
- Recepción y eliminación SQS.
- Destrucción con Terraform.

### 4.2. Alcance

No presupongas soporte completo por obtener una respuesta del endpoint.

---

## 5. Qué significa integración

La prueba debe cruzar límites entre componentes.

### 5.1. En este laboratorio

Un documento se almacena en S3.

Una referencia se publica en SNS.

SNS entrega eventos a SQS.

Un consumidor recupera el documento referenciado.

### 5.2. Propiedad principal

El resultado depende de varios servicios y de su configuración conjunta.

### 5.3. Regla

Probar cada servicio aisladamente no demuestra este recorrido completo.

---

## 6. Arquitectura del recorrido

Separaremos almacenamiento, distribución y consumo.

### 6.1. Diagrama

```text
Productor de prueba
    ├── Escribe documento ────────────────→ S3
    │
    └── Publica referencia ───────────────→ SNS
                                               │
                          ┌────────────────────┴───────────────────┐
                          ▼                                        ▼
                 SQS procesamiento                         SQS auditoría
                 Filtro: created                           Sin filtro
                          │                                        │
                          ▼                                        ▼
                 Recupera documento                       Comprueba eventos
```

### 6.2. Aclaración

El productor publica explícitamente en SNS.

No configuraremos notificaciones automáticas de eventos S3.

---

## 7. Límites del laboratorio

La prueba representa una integración concreta, no una plataforma completa.

### 7.1. Fuera de alcance

No implementaremos:

- Lambda.
- Consumidores permanentes.
- DLQ.
- Transacciones distribuidas.
- Procesamiento exactamente una vez.
- Auditoría empresarial.

### 7.2. Regla

Los nombres de las colas describen su función didáctica, no garantías adicionales.

---

## 8. Contrato de eventos

El formato debe ser estable y comprobable.

### 8.1. Campos utilizados

| **Campo** | **Propósito** | **Ejemplo conceptual** |
|-----------|---------------|------------------------|
| `schema_version` | Identificar el contrato | `1` |
| `event_id` | Correlación e identidad | UUID |
| `event_type` | Tipo de evento | `created` |
| `bucket` | Referencia de almacenamiento | Bucket del laboratorio |
| `key` | Documento concreto | Ruta de prueba |

La identidad del evento no depende de su posición en la cola.

### 8.2. Regla

No introduzcas documentos grandes o secretos en el cuerpo del evento.

---

## 9. Dos destinos diferentes

Las suscripciones tendrán expectativas distintas.

### 9.1. Comparación

| **Destino** | **Eventos previstos** | **Configuración** |
|-------------|-----------------------|-------------------|
| Procesamiento | Solo `created` | Filtro por atributo |
| Auditoría | `created` e `ignored` | Sin filtro |

Ambas suscripciones utilizarán entrega sin envoltorio SNS.

### 9.2. Regla

El filtro se aplicará a atributos SNS, no al JSON del cuerpo.

---

## 10. Mensajes duplicados

Las colas estándar no ofrecen una garantía general de entrega exactamente una vez.

### 10.1. Diseño de la prueba

Aceptaremos duplicados de eventos conocidos.

Compararemos identidad y contenido.

Eliminaremos cada recepción válida mediante su `ReceiptHandle`.

### 10.2. Lo que rechazaremos

Eventos ajenos o cuerpos inconsistentes.

### 10.3. Regla

Una segunda recepción no implica necesariamente un error de la integración.

---

## 11. Matriz de comprobaciones

La matriz relaciona propiedades con evidencias.

### 11.1. Casos previstos

| **Propiedad** | **Comprobación** | **Expectativa** |
|---------------|------------------|-----------------|
| Almacenamiento | Lectura del documento | Contenido idéntico |
| Entrega SNS | Recepción SQS | Evento identificado |
| Filtrado | Cola de procesamiento | Solo `created` |
| Distribución | Cola de auditoría | Ambos eventos |
| Correlación | Comparación de identificadores | Referencia correcta |
| Limpieza | Inventario final | Recursos ausentes |

Cada fila debe registrar su resultado observado.

### 11.2. Regla

Una expectativa escrita no constituye una evidencia de ejecución.

---

## 12. Preparación del directorio

Trabaja en una carpeta independiente.

### 12.1. Estructura

```bash
mkdir -p terraform-integration/app
mkdir -p terraform-integration/scripts
mkdir -p terraform-integration/planes
mkdir -p terraform-integration/resultados
mkdir -p terraform-integration/copias
cd terraform-integration
```

### 12.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 12.3. Aislamiento

No copies estados de otras prácticas.

---

## 13. Protección de archivos

Separa código y material operativo.

### 13.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.venv/
.env
planes/
resultados/
copias/
crash.log
```

### 13.2. Qué conservar

Versiona configuración, scripts y archivo de bloqueo del proveedor.

---

## 14. Permisos y datos ficticios

La práctica no necesita información personal ni credenciales reales.

### 14.1. Preparación

```bash
umask 077
chmod 700 planes resultados copias
```

### 14.2. Alcance

Estas instrucciones utilizan permisos POSIX.

En otros sistemas, configura ACL equivalentes.

### 14.3. Regla

Revisa los informes antes de compartirlos.

---

## 15. Imagen de LocalStack

Utiliza una imagen validada por el docente.

### 15.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 15.2. Recomendación

Selecciona una etiqueta fija o un digest.

### 15.3. Servicios

Necesitaremos S3, SNS y SQS.

### 15.4. Regla

Una etiqueta flotante no identifica de forma estable el entorno probado.

---

## 16. Docker Compose

Publica el endpoint únicamente en la interfaz local.

### 16.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sns,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 16.2. Alcance

No necesitas montar el socket Docker.

### 16.3. Arranque

Ejecuta `docker compose up -d`.

---

## 17. Contexto AWS local

Prepara la terminal antes de utilizar AWS CLI.

### 17.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3
unset AWS_ENDPOINT_URL_SNS AWS_ENDPOINT_URL_SQS
unset TF_WORKSPACE TF_CLI_ARGS

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 17.2. Regla

No utilices destinos AWS como fallback.

---

## 18. Dependencias Python

Los scripts utilizarán Boto3, sin instalar dependencias globalmente.

### 18.1. Entorno virtual

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip --version
```

### 18.2. Versión validada

```bash
export BOTO3_VERSION='SUSTITUIR_POR_VERSION_VALIDADA'
python -m pip install "boto3==${BOTO3_VERSION}"
python -m pip freeze > resultados/python-dependencies.txt
```

### 18.3. Regla

El docente debe distribuir versiones concretas, no mantener estos marcadores.

---

## 19. Identificador del despliegue

Los nombres necesitan distinguir alumnos y ejecuciones.

### 19.1. Generación

```bash
RUN_ID="$(python -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" > app/terraform.tfvars
printf '%s\n' "$RUN_ID" > resultados/run-id.txt
```

### 19.2. Estabilidad

Conserva el identificador mientras el estado administre sus recursos.

### 19.3. Regla

No regeneres nombres para ocultar recursos que quedaron pendientes.

---

## 20. Requisitos de Terraform

Crea `app/versions.tf`.

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

  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 20.2. Estado

Cada alumno debe utilizar su propio directorio y estado.

---

## 21. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 21.1. Configuración

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
    s3  = "http://127.0.0.1:4566"
    sns = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 21.2. Regla

Las opciones de omisión no sustituyen los endpoints explícitos.

---

## 22. Variables y nombres

Crea `app/variables.tf`.

### 22.1. Contrato

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{8,16}$", var.run_id))
    error_message = "run_id debe tener entre 8 y 16 caracteres alfanuméricos."
  }
}

locals {
  prefix = "curso-integration-${var.run_id}"

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

---

## 23. Bucket S3

Crea `app/storage.tf`.

### 23.1. Recurso y restricciones públicas

```hcl
resource "aws_s3_bucket" "documents" {
  bucket        = "${local.prefix}-documents"
  force_destroy = false
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 23.2. Regla

Los objetos de prueba deben eliminarse antes de destruir el bucket.

---

## 24. Cifrado S3 declarado

Completa `app/storage.tf`.

### 24.1. Configuración

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 24.2. Alcance

La respuesta del emulador permite observar configuración.

### 24.3. Regla

No demuestra cifrado físico equivalente al servicio AWS.

---

## 25. Tópico y colas

Crea `app/messaging.tf`.

### 25.1. Recursos

```hcl
resource "aws_sns_topic" "events" {
  name = "${local.prefix}-events"
  tags = local.tags
}

resource "aws_sqs_queue" "processing" {
  name                       = "${local.prefix}-processing"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  tags                       = local.tags
}

resource "aws_sqs_queue" "audit" {
  name                       = "${local.prefix}-audit"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  tags                       = local.tags
}
```

---

## 26. Políticas de recepción

SNS necesita autorización declarada para enviar a cada cola.

### 26.1. Cola de procesamiento

Añade a `app/messaging.tf`:

```hcl
resource "aws_sqs_queue_policy" "processing" {
  queue_url = aws_sqs_queue.processing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.processing.arn
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

## 27. Política de auditoría

La segunda cola necesita su propia política.

### 27.1. Configuración

Añade al mismo archivo:

```hcl
resource "aws_sqs_queue_policy" "audit" {
  queue_url = aws_sqs_queue.audit.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.audit.arn
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

## 28. Suscripción filtrada

La cola de procesamiento recibirá solamente eventos `created`.

### 28.1. Configuración

Añade al mismo archivo:

```hcl
resource "aws_sns_topic_subscription" "processing" {
  topic_arn            = aws_sns_topic.events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.processing.arn
  raw_message_delivery = true
  filter_policy_scope  = "MessageAttributes"

  filter_policy = jsonencode({
    event_type = ["created"]
  })

  depends_on = [
    aws_sqs_queue_policy.processing
  ]
}
```

### 28.2. Regla

El productor debe publicar el atributo `event_type`.

---

## 29. Suscripción sin filtro

La cola de auditoría recibirá ambos tipos de evento.

### 29.1. Configuración

Añade al mismo archivo:

```hcl
resource "aws_sns_topic_subscription" "audit" {
  topic_arn            = aws_sns_topic.events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.audit.arn
  raw_message_delivery = true

  depends_on = [
    aws_sqs_queue_policy.audit
  ]
}
```

### 29.2. Orden

La dependencia explícita permite crear la política antes de la suscripción.

### 29.3. Límite

No garantiza propagación instantánea en AWS real.

---

## 30. Contrato de salida

Crea `app/outputs.tf`.

### 30.1. Referencias para las pruebas

```hcl
output "integration" {
  value = {
    contract_version         = 1
    bucket_name              = aws_s3_bucket.documents.id
    topic_arn                = aws_sns_topic.events.arn
    processing_queue_url     = aws_sqs_queue.processing.id
    audit_queue_url          = aws_sqs_queue.audit.id
    processing_subscription  = aws_sns_topic_subscription.processing.arn
    audit_subscription       = aws_sns_topic_subscription.audit.arn
  }
}
```

### 30.2. Regla

Los scripts utilizarán estas referencias en lugar de reconstruir nombres.

---

## 31. Sesión 1: preparar y desplegar

Duración orientativa: 30 minutos.

### 31.1. Secuencia

```bash
terraform -chdir=app init
terraform fmt -recursive
terraform -chdir=app validate

terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan

terraform -chdir=app output -json integration \
  > resultados/integration.json
```

### 31.2. Resultado esperado

Se crean almacenamiento, distribución, políticas y suscripciones.

---

## 32. Sesión 2: verificar suscripciones

Comprueba los atributos antes de publicar eventos.

### 32.1. Comandos

```bash
PROCESSING_SUB="$(jq -er '.processing_subscription' resultados/integration.json)"
AUDIT_SUB="$(jq -er '.audit_subscription' resultados/integration.json)"

aws_local sns get-subscription-attributes \
  --subscription-arn "$PROCESSING_SUB" \
  > resultados/processing-subscription.json

aws_local sns get-subscription-attributes \
  --subscription-arn "$AUDIT_SUB" \
  > resultados/audit-subscription.json
```

### 32.2. Expectativa

Entrega raw en ambas y filtro por atributos en procesamiento.

---

## 33. Contexto Boto3 local

Un helper centralizará clientes y contratos.

### 33.1. Diseño

Utilizaremos:

- Credenciales ficticias explícitas.
- Endpoint fijo.
- Región fija.
- Timeouts de conexión y lectura.
- Reintentos limitados.
- Validación de URLs de colas.

### 33.2. Regla

El helper no constituye una sandbox ni sustituye controles de red.

---

## 34. Helper: clientes

Crea `scripts/local_clients.py`.

### 34.1. Implementación

```python
import json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "http://127.0.0.1:4566"

session = boto3.Session(
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1",
)

config = Config(
    connect_timeout=3,
    read_timeout=5,
    retries={"total_max_attempts": 2, "mode": "standard"},
    proxies={},
    s3={"addressing_style": "path"},
)

s3 = session.client("s3", endpoint_url=ENDPOINT, config=config)
sns = session.client("sns", endpoint_url=ENDPOINT, config=config)
sqs = session.client("sqs", endpoint_url=ENDPOINT, config=config)
```

---

## 35. Helper: URLs y contrato

Completa `scripts/local_clients.py`.

### 35.1. Validación local

```python
def local_queue_url(value):
    parsed = urlsplit(value)
    allowed = {"127.0.0.1", "localhost", "localhost.localstack.cloud"}

    if (
        parsed.scheme != "http"
        or parsed.hostname not in allowed
        or parsed.port != 4566
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or not parsed.path.startswith("/")
    ):
        raise ValueError("La URL de cola no pertenece al laboratorio local.")

    return urlunsplit(("http", "127.0.0.1:4566", parsed.path, "", ""))

def contract():
    data = json.loads(
        (ROOT / "resultados" / "integration.json").read_text()
    )
    if data.get("contract_version") != 1:
        raise ValueError("Versión de contrato no admitida.")
    for key in ("processing_queue_url", "audit_queue_url"):
        data[key] = local_queue_url(data[key])
    return data
```

---

## 36. Normalización de URLs

La URL publicada por LocalStack puede utilizar un nombre local equivalente.

### 36.1. Decisión

El helper valida una lista cerrada y sustituye el host por loopback.

### 36.2. Conservación

Mantiene la ruta de la cola.

### 36.3. Compatibilidad

El docente debe comprobar esta normalización con la estrategia `path` seleccionada.

### 36.4. Regla

No añadas dominios AWS a la lista de destinos permitidos.

---

## 37. Documento de prueba

El contenido almacenado debe ser ficticio y pequeño.

### 37.1. Ejemplo conceptual

```json
{
  "document_id": "IDENTIFICADOR_UNICO",
  "purpose": "integration-laboratory",
  "items": [
    {
      "sku": "DEMO-001",
      "quantity": 2
    }
  ]
}
```

### 37.2. Regla

La prueba comparará el documento completo, no solo su existencia.

---

## 38. Registro de fixtures

Antes de escribir datos remotos, registraremos su ubicación.

### 38.1. Propósito

Si la prueba falla, sabremos qué objeto necesita limpieza.

### 38.2. Contenido del registro

Guardaremos bucket, clave y eventos conocidos.

### 38.3. Alcance

No representa un almacén de secretos ni un registro empresarial.

### 38.4. Regla

No sobrescribas un fixture anterior hasta haber resuelto su limpieza.

---

## 39. Script de integración: preparación

Crea `scripts/test-integration.py`.

### 39.1. Imports y estado inicial

```python
import json
import time
import uuid

from local_clients import ROOT, contract, s3, sns, sqs

data = contract()
fixture_path = ROOT / "resultados" / "fixture.json"
report_path = ROOT / "resultados" / "integration-report.json"

if fixture_path.exists():
    raise SystemExit("Existe un fixture pendiente. Ejecuta su limpieza.")

test_id = uuid.uuid4().hex
key = f"integration/{test_id}.json"
document = {
    "document_id": test_id,
    "purpose": "integration-laboratory",
    "items": [{"sku": "DEMO-001", "quantity": 2}],
}
```

---

## 40. Script de integración: eventos

Añade la definición de eventos al mismo archivo.

### 40.1. Contrato aplicado

```python
def event(kind):
    return {
        "schema_version": 1,
        "event_id": uuid.uuid4().hex,
        "event_type": kind,
        "bucket": data["bucket_name"],
        "key": key,
    }

created = event("created")
ignored = event("ignored")
known = {
    created["event_id"]: created,
    ignored["event_id"]: ignored,
}

fixture = {
    "bucket": data["bucket_name"],
    "key": key,
    "test_id": test_id,
    "events": known,
}
fixture_path.write_text(json.dumps(fixture, indent=2), encoding="utf-8")
```

---

## 41. Script de integración: publicación

Añade una función de publicación.

### 41.1. Atributos SNS

```python
def publish(body):
    response = sns.publish(
        TopicArn=data["topic_arn"],
        Message=json.dumps(body),
        MessageAttributes={
            "event_type": {
                "DataType": "String",
                "StringValue": body["event_type"],
            }
        },
    )
    if not response.get("MessageId"):
        raise RuntimeError("SNS no publicó un identificador de mensaje.")
```

### 41.2. Regla

El tipo del cuerpo y el atributo de filtrado deben ser coherentes.

---

## 42. Script de integración: recepción

Añade la función que comprobará cada cola.

### 42.1. Espera y validación

```python
def observe(queue_url, expected, duration=15):
    deadline = time.monotonic() + duration
    seen = set()
    deliveries = 0

    while time.monotonic() < deadline:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            WaitTimeSeconds=2,
            MaxNumberOfMessages=10,
        )
        for message in response.get("Messages", []):
            body = json.loads(message["Body"])
            identity = body.get("event_id")

            if identity not in expected:
                raise RuntimeError("Se observó un evento no permitido.")
            if body != known[identity]:
                raise RuntimeError("El cuerpo recibido incumple el contrato.")

            seen.add(identity)
            deliveries += 1
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=message["ReceiptHandle"],
            )

    if seen != set(expected):
        raise RuntimeError("No se observaron todos los eventos esperados.")

    return {"unique_events": len(seen), "deliveries": deliveries}
```

---

## 43. Script de integración: ejecución

Completa el archivo con el recorrido y el informe.

### 43.1. Operaciones principales

```python
report = {"test_id": test_id, "passed": False}

try:
    s3.put_object(
        Bucket=data["bucket_name"],
        Key=key,
        Body=json.dumps(document).encode("utf-8"),
        ContentType="application/json",
    )

    publish(created)
    publish(ignored)

    report["processing"] = observe(
        data["processing_queue_url"], {created["event_id"]}
    )
    report["audit"] = observe(
        data["audit_queue_url"], set(known)
    )

    response = s3.get_object(Bucket=created["bucket"], Key=created["key"])
    stream = response["Body"]
    try:
        recovered = json.loads(stream.read())
    finally:
        stream.close()

    if recovered != document:
        raise RuntimeError("El documento recuperado no coincide.")

    report["document_verified"] = True
    report["passed"] = True
finally:
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

print(json.dumps({"integration_passed": True, "test_id": test_id}))
```

---

## 44. Interpretar la ventana de observación

La prueba mantiene una ventana acotada para comprobar entregas y filtrado.

### 44.1. Qué demuestra

Los eventos esperados aparecieron durante la ventana.

No se observó el evento prohibido en procesamiento durante esa ventana.

### 44.2. Qué no demuestra

Ausencia eterna de entregas tardías.

Orden estricto.

Entrega exactamente una vez.

### 44.3. Regla

Documenta la duración y evita convertir una observación temporal en una garantía absoluta.

---

## 45. Comportamiento ante eventos inesperados

El script falla antes de eliminar una recepción ajena o inválida.

### 45.1. Motivo

Eliminar datos desconocidos podría ocultar errores de aislamiento.

### 45.2. Consecuencia

Un mensaje recibido puede quedar invisible hasta vencer su visibilidad.

### 45.3. Recuperación

Investiga el mensaje y decide una limpieza dirigida.

### 45.4. Regla

No utilices esta prueba contra colas compartidas con consumidores reales.

---

## 46. Sesión 3: ejecutar la integración

La primera ejecución debe realizarse con recursos aislados y sin tráfico externo.

### 46.1. Comandos

```bash
python -m py_compile scripts/local_clients.py
python -m py_compile scripts/test-integration.py

python scripts/test-integration.py \
  > resultados/integration.stdout.txt
```

### 46.2. Resultado esperado

Procesamiento observa un evento único.

Auditoría observa dos eventos únicos.

El documento recuperado coincide con el original.

### 46.3. Tiempo

La ejecución incluye dos ventanas de observación, además de las llamadas remotas.

---

## 47. Interpretar el informe

El informe resume propiedades sin imprimir el documento.

### 47.1. Campos importantes

`passed` indica resultado global.

`unique_events` distingue identidades.

`deliveries` permite observar duplicados.

`document_verified` confirma comparación del documento.

### 47.2. Regla

Un informe incompleto con `passed = false` necesita el diagnóstico del proceso.

### 47.3. Precaución

El bloque `finally` conserva resultados, pero no elimina automáticamente el fixture.

---

## 48. Limpieza dirigida de datos

La limpieza debe utilizar la ubicación registrada antes de escribir.

### 48.1. Separación

El script de limpieza eliminará el objeto S3 concreto.

Las colas desaparecerán posteriormente con Terraform.

### 48.2. Regla

No purgues todas las colas ni elimines todos los objetos como procedimiento rutinario.

### 48.3. Fixture

El registro se retirará después de confirmar ausencia del objeto.

---

## 49. Script de limpieza

Crea `scripts/cleanup-fixture.py`.

### 49.1. Implementación

```python
import json
from botocore.exceptions import ClientError
from local_clients import ROOT, contract, s3

path = ROOT / "resultados" / "fixture.json"
if not path.exists():
    print(json.dumps({"fixture_present": False}))
    raise SystemExit(0)

fixture = json.loads(path.read_text())
data = contract()

if fixture["bucket"] != data["bucket_name"]:
    raise SystemExit("El fixture no pertenece al bucket del contrato.")
if not fixture["key"].startswith("integration/"):
    raise SystemExit("La clave no pertenece al espacio de pruebas.")

s3.delete_object(Bucket=fixture["bucket"], Key=fixture["key"])

try:
    s3.head_object(Bucket=fixture["bucket"], Key=fixture["key"])
except ClientError as error:
    code = str(error.response["Error"]["Code"])
    if code not in {"404", "NoSuchKey", "NotFound"}:
        raise
else:
    raise SystemExit("El objeto sigue presente.")

path.unlink()
print(json.dumps({"fixture_removed": True}))
```

---

## 50. Sesión 4: limpiar y repetir

Una repetición debe crear nuevas identidades y conservar el mismo despliegue.

### 50.1. Secuencia

```bash
python scripts/cleanup-fixture.py
python scripts/test-integration.py
python scripts/cleanup-fixture.py
```

### 50.2. Resultado esperado

Cada ejecución utiliza otro documento y otros eventos.

### 50.3. Precaución

Duplicados tardíos de la ejecución anterior pueden provocar un fallo deliberado por tráfico ajeno.

### 50.4. Regla

Para aislamiento máximo, utiliza un despliegue nuevo por ejecución.

---

## 51. Sesión 5: demostrar un filtro incorrecto

Una prueba útil también debe detectar una integración mal configurada.

### 51.1. Cambio controlado

En una copia de trabajo, cambia el filtro a `["ignored"]`.

Planifica y aplica el cambio.

Ejecuta la prueba.

### 51.2. Resultado esperado

Procesamiento recibe un evento prohibido o no observa el esperado.

### 51.3. Recuperación

Restaura el filtro, limpia datos y elimina cualquier mensaje conocido pendiente.

---

## 52. Sesión 6: comprobar entrega raw

El consumidor espera directamente el JSON del evento.

### 52.1. Cambio controlado

En una copia de trabajo, configura entrega raw como falsa.

Aplica y ejecuta la prueba.

### 52.2. Resultado esperado

El cuerpo contiene un envoltorio SNS y no satisface el contrato esperado.

### 52.3. Regla

No adaptes silenciosamente el consumidor para que la prueba deje de detectar el cambio.

---

## 53. Sesión 7: contrato de documento incorrecto

También debes probar la comparación del contenido.

### 53.1. Ejercicio

En una copia del script, altera la expectativa después de escribir el documento.

Ejecuta la integración.

### 53.2. Resultado esperado

La entrega puede funcionar, pero falla la verificación del documento.

### 53.3. Interpretación

Esto distingue transporte correcto y contenido correcto.

### 53.4. Regla

Restaura el script antes de continuar.

---

## 54. Diagnóstico por capas

Investiga primero la capa donde desaparece la evidencia.

### 54.1. Orden recomendado

Comprueba endpoint y servicios.

Verifica recursos y suscripciones.

Revisa filtro y atributos publicados.

Confirma recepción y contrato.

Comprueba referencia y contenido S3.

### 54.2. Regla

No cambies varias capas simultáneamente si quieres identificar la causa.

---

## 55. Errores de autorización

Las políticas declaradas forman parte de la integración, pero el emulador tiene límites.

### 55.1. Observación válida

Puedes comprobar la política configurada y el recorrido permitido observado.

### 55.2. Observación insuficiente

No debes concluir que todas las identidades no autorizadas serán rechazadas como en AWS.

### 55.3. Regla

Un ensayo negativo IAM requiere validar expresamente el enforcement disponible.

### 55.4. Producción

Revisa permisos efectivos en un entorno autorizado separado del laboratorio.

---

## 56. Reintentos y fallos temporales

Los reintentos deben ser acotados y compatibles con la operación.

### 56.1. Diseño actual

El cliente limita intentos por llamada.

La recepción utiliza una ventana monotónica.

Las discrepancias de contrato no se reintentan como si fueran ausencia temporal.

### 56.2. Riesgo

Reintentar una publicación puede producir más de una entrega.

### 56.3. Regla

Utiliza identidad de evento para correlación y deduplicación del consumidor.

---

## 57. Concurrencia y aislamiento

La paralelización requiere separar recursos y artefactos.

### 57.1. Controles mínimos

Un directorio por ejecución.

Un estado por despliegue.

Un identificador único.

Colas dedicadas.

Fixtures e informes independientes.

### 57.2. Regla

No ejecutes dos instancias del script contra las mismas colas.

### 57.3. Motivo

Cada consumidor podría recibir eventos de la otra prueba.

---

## 58. Evidencias para evaluación

La entrega debe demostrar propiedades sin exponer material operativo innecesario.

### 58.1. Incluye

Código Terraform y Python.

Versiones y configuración del emulador.

Matriz de resultados observados.

Resumen de eventos únicos y entregas.

Diagnósticos negativos revisados.

Resultado de limpieza.

### 58.2. Excluye

Estados, planes y respuestas completas con información sensible.

---

## 59. Integración en CI

El laboratorio puede automatizarse en un entorno gestionado.

### 59.1. Secuencia

Preparar herramientas fijadas.

Arrancar LocalStack.

Esperar disponibilidad observable.

Validar y desplegar.

Ejecutar la integración.

Limpiar fixtures.

Destruir infraestructura.

Verificar ausencia.

### 59.2. Regla

Conserva por separado el resultado de prueba y el resultado de limpieza.

---

## 60. Preparar destrucción

El bucket debe quedar vacío antes de eliminar la infraestructura.

### 60.1. Comandos

```bash
python scripts/cleanup-fixture.py

terraform -chdir=app state pull \
  > copias/before-destroy.tfstate

terraform -chdir=app plan -destroy \
  -out=../planes/destroy.tfplan

terraform -chdir=app show ../planes/destroy.tfplan
```

### 60.2. Regla

Si existen objetos desconocidos, investiga su origen antes de borrarlos.

---

## 61. Sesión 8: destruir y verificar

Mantén LocalStack disponible durante la destrucción.

### 61.1. Secuencia

```bash
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local s3api list-buckets > resultados/buckets-after-destroy.json
aws_local sns list-topics > resultados/topics-after-destroy.json
aws_local sqs list-queues > resultados/queues-after-destroy.json
```

### 61.2. Resultado esperado

Los identificadores del contrato dejan de aparecer en los inventarios.

### 61.3. Regla

Estado vacío e infraestructura ausente son evidencias distintas.

---

## 62. Cierre y diferencias respecto a AWS real

Detén el emulador después de verificar ausencia.

### 62.1. Finalización

Ejecuta `docker compose down`.

Revisa planes, informes y copias antes de conservarlos.

### 62.2. Diferencias relevantes

AWS real añade propagación, cuotas, IAM efectivo, auditoría y costes.

El comportamiento temporal y los errores pueden diferir.

### 62.3. Regla

No declares la arquitectura lista para producción por superar esta práctica.

---

## 63. Ejercicios propuestos

Las actividades deben reforzar contratos, diagnóstico y aislamiento.

### 63.1. Actividades

1. Añade una tercera categoría de evento.
2. Diseña otra suscripción filtrada.
3. Comprueba etiquetas mediante SDK.
4. Introduce un atributo SNS incorrecto.
5. Detecta un documento referenciado inexistente.
6. Documenta duplicados sin declararlos fallo.
7. Separa artefactos para ejecuciones paralelas.
8. Demuestra limpieza después de una prueba negativa.

### 63.2. Evaluación

Explica qué propiedad detecta cada prueba y qué garantías siguen fuera de alcance.

---

## 64. Resumen de la lección

Una prueba de integración fiable comprueba el recorrido y sus contratos, no solo la existencia de recursos.

### 64.1. Ideas esenciales

SNS y SQS necesitan suscripciones y políticas coherentes.

El filtrado depende del ámbito y atributos configurados.

La entrega raw cambia el contrato del consumidor.

Las referencias S3 deben conducir al documento esperado.

Los duplicados necesitan identidad, no suposiciones de orden.

La ausencia temporal no equivale a una garantía eterna.

### 64.2. Procedimiento recomendado

Aísla, despliega, consulta, publica, observa, compara, registra y limpia.

### 64.3. Idea final

**Una integración bien probada demuestra que sus componentes cooperan bajo un contrato explícito y conserva evidencias claras tanto del recorrido correcto como de su limpieza.**