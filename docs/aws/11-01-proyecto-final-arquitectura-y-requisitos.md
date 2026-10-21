# Proyecto final: arquitectura y requisitos con Terraform y LocalStack

El proyecto final reúne los conocimientos del curso en una arquitectura reproducible, verificable y fácil de recuperar.

No consiste únicamente en crear recursos.

También debes definir contratos, organizar módulos, proteger el estado, comprobar integraciones y eliminar los datos e infraestructura al finalizar.

Construirás una plataforma local de eventos con S3, SNS y SQS.

Un productor almacenará un documento ficticio y publicará su referencia.

Una suscripción distribuirá el evento a una cola de procesamiento.

Un consumidor de prueba recuperará el documento y comprobará su contenido.

Esta página establece la arquitectura, los requisitos y una implementación de referencia para comenzar el proyecto.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas datos personales, contraseñas ni tokens reales.
>
> Superar el proyecto local no certifica equivalencia completa con AWS real.

---

## 1. Objetivos del proyecto

El proyecto debe demostrar que puedes administrar una infraestructura durante todo su ciclo de vida.

### 1.1. Competencias

Al finalizar podrás:

- Traducir requisitos a recursos Terraform.
- Diseñar módulos con contratos claros.
- Configurar una integración entre servicios.
- Verificar configuración y comportamiento.
- Gestionar fallos y recursos pendientes.
- Documentar límites del emulador.

### 1.2. Resultado esperado

Entregarás código, pruebas, evidencias revisadas y un procedimiento de recuperación.

---

## 2. Alcance de esta lección

Esta página define la base del proyecto final y sus criterios de aceptación.

### 2.1. Incluye

Arquitectura y decisiones de diseño.

Configuración Terraform de referencia.

Pruebas iniciales y sesiones prácticas.

Requisitos de CI y limpieza.

### 2.2. No incluye

Un sistema productivo completo ni una aplicación comercial.

### 2.3. Regla

Las ampliaciones deben conservar el recorrido mínimo verificable.

---

## 3. Requisitos previos

Necesitas las herramientas del curso y comprensión de las lecciones anteriores.

### 3.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
git --version
```

### 3.2. Conocimientos

Debes comprender módulos, estado, IAM, S3, SNS, SQS y pruebas.

---

## 4. Versiones y dependencias

La reproducibilidad exige identificar las herramientas utilizadas.

### 4.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

Boto3 y LocalStack deben fijarse después de validar el recorrido.

### 4.2. Registro obligatorio

Documenta versiones, edición e imagen o digest del emulador.

### 4.3. Regla

**Una referencia no comprobada no debe presentarse como una combinación validada.**

---

## 5. Compatibilidad que debe validar el docente

El recorrido completo debe comprobarse antes de distribuir el proyecto.

### 5.1. Operaciones necesarias

Valida:

- Escritura y lectura S3.
- Publicación SNS.
- Suscripción SNS a SQS.
- Entrega raw.
- Filtrado por atributos.
- Recepción y eliminación SQS.
- Destrucción y comprobación de ausencia.

### 5.2. Resultado

Conserva una matriz de capacidades de la versión y edición seleccionadas.

---

## 6. Caso de uso educativo

La plataforma gestionará documentos ficticios mediante eventos.

### 6.1. Historia principal

Un productor recibe un documento de demostración.

Lo almacena en S3.

Publica un evento con su referencia.

Un consumidor obtiene el evento y recupera el documento.

### 6.2. Propiedad importante

El documento no viaja completo dentro del mensaje.

### 6.3. Regla

El evento debe identificar inequívocamente el contenido esperado.

---

## 7. Arquitectura mínima

La arquitectura combina almacenamiento, distribución y procesamiento.

### 7.1. Diagrama

```text
Productor de prueba
    ├── Documento ────────────────→ S3
    │
    └── Referencia ───────────────→ SNS
                                      │
                                      ▼
                              Suscripción filtrada
                                      │
                                      ▼
                                  SQS trabajo
                                      │
                           Consumidor de prueba
                                      │
                                      └── Recupera documento S3

SQS trabajo ── Política de redrive ──→ SQS DLQ
```

### 7.2. Aclaración

El productor publica explícitamente en SNS; no utilizamos notificaciones automáticas S3.

---

## 8. Responsabilidades de los componentes

Cada componente debe tener una responsabilidad comprensible.

### 8.1. Distribución

| **Componente** | **Responsabilidad** | **No garantiza** |
|---------------|--------------------|------------------|
| S3 | Almacenar documentos | Validación de negocio |
| SNS | Distribuir eventos | Procesamiento |
| SQS | Mantener entregas pendientes | Exactamente una vez |
| DLQ | Recibir mensajes según redrive | Recuperación automática |
| Consumidor de prueba | Verificar el recorrido | Aplicación permanente |

La separación facilita pruebas y diagnóstico.

### 8.2. Regla

No atribuyas al servicio una garantía que pertenece a la aplicación.

---

## 9. Límites deliberados

La implementación mínima evita dependencias innecesarias.

### 9.1. Fuera de alcance

No requiere Lambda, API Gateway ni bases de datos.

No implementa usuarios, autenticación de negocio ni interfaces web.

No incorpora un consumidor desplegado permanentemente.

### 9.2. Ventaja

El alumno puede observar cada frontera del recorrido.

### 9.3. Regla

Añade servicios solo cuando exista un requisito y una prueba asociados.

---

## 10. Requisitos funcionales

Los requisitos deben tener identificadores y criterios verificables.

### 10.1. Catálogo

| **ID** | **Requisito** | **Criterio de aceptación** |
|--------|---------------|---------------------------|
| RF-01 | Guardar un documento | Lectura idéntica |
| RF-02 | Publicar su referencia | SNS devuelve identificador |
| RF-03 | Entregar eventos válidos | Consumidor observa el evento |
| RF-04 | Filtrar otros tipos | No se observan durante la ventana |
| RF-05 | Confirmar recepción | Eliminación con ReceiptHandle |
| RF-06 | Configurar DLQ | Política apunta al ARN correcto |

Cada requisito debe tener una evidencia.

### 10.2. Regla

La existencia de la DLQ no demuestra traslado funcional de mensajes.

---

## 11. Requisitos no funcionales

La calidad operacional también forma parte del proyecto.

### 11.1. Obligatorios

Infraestructura reproducible.

Nombres únicos por ejecución.

Estado aislado.

Dependencias identificadas.

Esperas y reintentos acotados.

Limpieza dirigida.

### 11.2. Documentación

Explica riesgos, límites y procedimientos de recuperación.

### 11.3. Regla

No evalúes calidad únicamente por la cantidad de recursos.

---

## 12. Criterios de aceptación

El proyecto debe superar un recorrido completo.

### 12.1. Secuencia

Formato y validación correctos.

Pruebas de contrato correctas.

Plan revisado.

Aplicación exitosa.

Integración funcional comprobada.

Plan posterior sin cambios.

Limpieza verificada.

### 12.2. Regla

Un fallo de limpieza impide declarar el proyecto completamente finalizado.

---

## 13. Contrato del documento

El contenido será pequeño, ficticio y determinista dentro de cada prueba.

### 13.1. Ejemplo

```json
{
  "document_id": "IDENTIFICADOR_UNICO",
  "purpose": "final-project-laboratory",
  "items": [
    {
      "sku": "DEMO-001",
      "quantity": 2
    }
  ]
}
```

### 13.2. Regla

El consumidor debe comparar el documento completo, no solo comprobar que existe.

---

## 14. Contrato del evento

El evento publica una referencia y una versión de esquema.

### 14.1. Ejemplo

```json
{
  "schema_version": 1,
  "event_id": "IDENTIFICADOR_UNICO",
  "event_type": "document.created",
  "bucket": "BUCKET_DEL_LABORATORIO",
  "key": "documents/IDENTIFICADOR_UNICO.json"
}
```

### 14.2. Regla

No publiques documentos grandes ni valores sensibles dentro del evento.

---

## 15. Identidad y duplicados

La identidad del evento debe ser independiente del orden de recepción.

### 15.1. Diseño

Utilizaremos un UUID por evento.

La prueba aceptará duplicados del evento esperado.

Comparará identidad y contenido.

Eliminará cada recepción válida.

### 15.2. Límite

El recorrido mínimo no implementa una tabla persistente de deduplicación.

### 15.3. Regla

No declares procesamiento exactamente una vez.

---

## 16. Organización del repositorio

La estructura debe separar infraestructura, pruebas y evidencias.

### 16.1. Directorios

```bash
mkdir -p terraform-final/app/tests
mkdir -p terraform-final/modules/storage
mkdir -p terraform-final/modules/events
mkdir -p terraform-final/scripts
mkdir -p terraform-final/docs
mkdir -p terraform-final/resultados
mkdir -p terraform-final/planes
mkdir -p terraform-final/copias
cd terraform-final
```

### 16.2. Ejecución

Los comandos siguientes se ejecutan desde esta raíz.

---

## 17. Política de archivos

No todos los archivos del proyecto deben entregarse o versionarse.

### 17.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.venv/
.env
resultados/
planes/
copias/
crash.log
```

### 17.2. Regla

Versiona los archivos `.terraform.lock.hcl` de las raíces utilizadas.

---

## 18. Permisos y evidencias

Los artefactos operativos necesitan protección.

### 18.1. Preparación

```bash
umask 077
chmod 700 resultados planes copias
```

### 18.2. Alcance

Estas instrucciones utilizan permisos POSIX.

Configura ACL equivalentes en otros sistemas.

### 18.3. Regla

No publiques estados, planes ni logs completos como evidencia rutinaria.

---

## 19. Configuración de LocalStack

Selecciona una imagen validada por el docente.

### 19.1. Referencia

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 19.2. Reproducibilidad

Prefiere una etiqueta fija o un digest.

### 19.3. Edición

Documenta cualquier requisito de licencia del entorno seleccionado.

### 19.4. Regla

No incluyas tokens de licencia en el repositorio.

---

## 20. Docker Compose

Publica los servicios únicamente en loopback.

### 20.1. `compose.yaml`

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

### 20.2. Restricción

Esta configuración requiere ejecución local secuencial o runners aislados.

### 20.3. Regla

No necesitas montar el socket Docker para este recorrido.

---

## 21. Contexto AWS local

Prepara la terminal con credenciales exclusivamente ficticias.

### 21.1. Configuración

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

### 21.2. Regla

No utilices AWS real como fallback ante errores locales.

---

## 22. Identificador del despliegue

Cada alumno y ejecución necesitan nombres distintos.

### 22.1. Generación

```bash
RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" > app/terraform.tfvars
printf '%s\n' "$RUN_ID" > resultados/run-id.txt
```

### 22.2. Estabilidad

Conserva el identificador mientras el estado administre recursos.

### 22.3. Regla

No cambies nombres para ocultar una limpieza pendiente.

---

## 23. Requisitos de los módulos

Crea el siguiente `versions.tf` en ambos módulos.

### 23.1. Configuración compartida

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 23.2. Proveedores

Los módulos heredarán la configuración AWS desde la raíz.

---

## 24. Módulo de almacenamiento: entrada

Crea `modules/storage/variables.tf`.

### 24.1. Contrato

```hcl
variable "name" {
  description = "Nombre del bucket del laboratorio."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{2,62}$", var.name))
    error_message = "Utiliza un nombre alfanumérico en minúsculas con guiones."
  }
}
```

### 24.2. Alcance

La validación refleja la convención del proyecto, no todas las reglas posibles de S3.

---

## 25. Módulo de almacenamiento: recursos

Crea `modules/storage/main.tf`.

### 25.1. Bucket y bloqueo público

```hcl
resource "aws_s3_bucket" "documents" {
  bucket        = var.name
  force_destroy = false
  tags          = { Laboratory = "LocalStack" }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 25.2. Regla

Los objetos externos al estado deben retirarse antes de destroy.

---

## 26. Módulo de almacenamiento: cifrado y salida

Completa `main.tf` y crea `outputs.tf`.

### 26.1. Cifrado declarado

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

### 26.2. Output

```hcl
output "bucket_name" {
  value = aws_s3_bucket.documents.id
}
```

### 26.3. Límite

La configuración no certifica cifrado físico equivalente al servicio AWS.

---

## 27. Módulo de eventos: entrada

Crea `modules/events/variables.tf`.

### 27.1. Contrato

```hcl
variable "prefix" {
  description = "Prefijo de recursos del proyecto."
  type        = string
  nullable    = false
}
```

### 27.2. Responsabilidad

La raíz construirá el prefijo a partir del identificador validado.

### 27.3. Ejercicio posterior

Añade una validación propia si deseas utilizar el módulo fuera de esta raíz.

---

## 28. Módulo de eventos: tópico y DLQ

Crea `modules/events/main.tf`.

### 28.1. Recursos iniciales

```hcl
resource "aws_sns_topic" "documents" {
  name = "${var.prefix}-events"
  tags = { Laboratory = "LocalStack" }
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.prefix}-dlq"
  message_retention_seconds = 1209600
  tags                      = { Laboratory = "LocalStack" }
}
```

### 28.2. Retención

La DLQ conserva mensajes durante el máximo configurado de 14 días.

### 28.3. Regla

No confundas retención con recuperación de negocio.

---

## 29. Módulo de eventos: cola principal

Completa `modules/events/main.tf`.

### 29.1. Configuración

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "${var.prefix}-work"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Laboratory = "LocalStack"
  }
}
```

### 29.2. Dependencia

La referencia al ARN establece la relación Terraform entre las colas.

---

## 30. Módulo de eventos: política SQS

SNS necesita autorización declarada para enviar a la cola.

### 30.1. Configuración

Añade al mismo archivo:

```hcl
resource "aws_sqs_queue_policy" "work" {
  queue_url = aws_sqs_queue.work.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.work.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.documents.arn
        }
      }
    }]
  })
}
```

### 30.2. Regla

La entrega permitida observada no prueba todos los rechazos IAM posibles.

---

## 31. Módulo de eventos: suscripción

La cola recibirá únicamente eventos de creación.

### 31.1. Configuración

Añade al mismo archivo:

```hcl
resource "aws_sns_topic_subscription" "work" {
  topic_arn            = aws_sns_topic.documents.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.work.arn
  raw_message_delivery = true
  filter_policy_scope  = "MessageAttributes"

  filter_policy = jsonencode({
    event_type = ["document.created"]
  })

  depends_on = [aws_sqs_queue_policy.work]
}
```

### 31.2. Regla

El productor debe publicar el atributo SNS `event_type`.

---

## 32. Módulo de eventos: salida

Crea `modules/events/outputs.tf`.

### 32.1. Contrato

```hcl
output "contract" {
  value = {
    topic_arn         = aws_sns_topic.documents.arn
    queue_url         = aws_sqs_queue.work.id
    queue_arn         = aws_sqs_queue.work.arn
    dlq_arn           = aws_sqs_queue.dlq.arn
    subscription_arn  = aws_sns_topic_subscription.work.arn
    visibility        = aws_sqs_queue.work.visibility_timeout_seconds
    retention         = aws_sqs_queue.work.message_retention_seconds
  }
}
```

### 32.2. Regla

Las pruebas consumirán este contrato sin reconstruir nombres.

---

## 33. Requisitos y proveedor raíz

Crea `app/versions.tf` y `app/providers.tf`.

### 33.1. Requisitos

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

### 33.2. Proveedor local

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

---

## 34. Composición raíz

Crea `app/main.tf`.

### 34.1. Entrada y módulos

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}

locals {
  prefix = "curso-final-${var.run_id}"
}

module "storage" {
  source = "../modules/storage"
  name   = "${local.prefix}-documents"
}

module "events" {
  source = "../modules/events"
  prefix = local.prefix
}
```

---

## 35. Contrato raíz

Crea `app/outputs.tf`.

### 35.1. Salida pública

```hcl
output "project" {
  value = {
    schema_version = 1
    run_id         = var.run_id
    bucket_name    = module.storage.bucket_name
    events         = module.events.contract
  }
}
```

### 35.2. Diseño

El contrato agrupa referencias de almacenamiento y mensajería.

### 35.3. Regla

Una versión de contrato debe cambiar cuando modifiques incompatiblemente su estructura.

---

## 36. Pruebas de contrato

Crea `app/tests/contract.tftest.hcl`.

### 36.1. Plan positivo y negativo

```hcl
run "project_contract" {
  command = plan

  assert {
    condition     = output.project.schema_version == 1
    error_message = "El contrato debe publicar la versión 1."
  }

  assert {
    condition     = output.project.events.visibility == 30
    error_message = "La visibilidad prevista debe ser 30."
  }

  assert {
    condition     = output.project.events.retention == 86400
    error_message = "La retención prevista debe ser 86400."
  }
}

run "reject_invalid_identifier" {
  command = plan

  variables {
    run_id = "invalid"
  }

  expect_failures = [var.run_id]
}
```

---

## 37. Sesión 1: preparación y despliegue

Duración orientativa: 45 minutos.

### 37.1. Secuencia

```bash
docker compose up -d
aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues

terraform -chdir=app init
terraform fmt -recursive
terraform -chdir=app validate
terraform -chdir=app test -var="run_id=${RUN_ID}"

terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan
terraform -chdir=app output -json project > resultados/project.json
```

### 37.2. Resultado

El despliegue publica un contrato con referencias calculadas.

---

## 38. Dependencias Python

Los scripts utilizarán Boto3 dentro de un entorno virtual.

### 38.1. Preparación

```bash
python3 -m venv .venv
source .venv/bin/activate
export BOTO3_VERSION='SUSTITUIR_POR_VERSION_VALIDADA'
python -m pip install "boto3==${BOTO3_VERSION}"
python -m pip freeze > resultados/python-dependencies.txt
```

### 38.2. Regla

El docente debe proporcionar una versión concreta antes de distribuir el proyecto.

### 38.3. Reproducibilidad

Conserva también las dependencias transitivas seleccionadas.

---

## 39. Helper de clientes locales

Crea `scripts/clients.py`.

### 39.1. Implementación

```python
import json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]
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

def client(service):
    return session.client(
        service, endpoint_url="http://127.0.0.1:4566", config=config
    )

s3, sns, sqs = client("s3"), client("sns"), client("sqs")
```

---

## 40. Helper: contrato y URL

Completa `scripts/clients.py`.

### 40.1. Validación

```python
def project():
    data = json.loads((ROOT / "resultados/project.json").read_text())
    if data.get("schema_version") != 1:
        raise ValueError("Contrato incompatible.")

    value = urlsplit(data["events"]["queue_url"])
    if (
        value.scheme != "http"
        or value.hostname not in {
            "127.0.0.1", "localhost", "localhost.localstack.cloud"
        }
        or value.port != 4566
        or value.username is not None
        or value.password is not None
        or value.query
        or value.fragment
    ):
        raise ValueError("URL SQS no local.")

    data["events"]["queue_url"] = urlunsplit(
        ("http", "127.0.0.1:4566", value.path, "", "")
    )
    return data
```

### 40.2. Regla

Valida esta normalización con la estrategia `path` seleccionada.

---

## 41. Prueba funcional: preparación

Crea `scripts/integration.py`.

### 41.1. Fixture registrado

```python
import json
import time
import uuid
from clients import ROOT, project, s3, sns, sqs

data = project()
fixture_path = ROOT / "resultados/fixture.json"
if fixture_path.exists():
    raise SystemExit("Existe un fixture pendiente de limpieza.")

identity = uuid.uuid4().hex
document = {
    "document_id": identity,
    "purpose": "final-project-laboratory",
    "items": [{"sku": "DEMO-001", "quantity": 2}],
}
event = {
    "schema_version": 1,
    "event_id": identity,
    "event_type": "document.created",
    "bucket": data["bucket_name"],
    "key": f"documents/{identity}.json",
}
fixture_path.write_text(json.dumps(event))
```

---

## 42. Prueba funcional: publicación

Continúa el mismo archivo.

### 42.1. Operaciones

```python
s3.put_object(
    Bucket=event["bucket"],
    Key=event["key"],
    Body=json.dumps(document).encode("utf-8"),
    ContentType="application/json",
)

publication = sns.publish(
    TopicArn=data["events"]["topic_arn"],
    Message=json.dumps(event),
    MessageAttributes={
        "event_type": {
            "DataType": "String",
            "StringValue": event["event_type"],
        }
    },
)

if not publication.get("MessageId"):
    raise RuntimeError("SNS no devolvió un identificador.")
```

### 42.2. Regla

La referencia se publica después de escribir el documento.

---

## 43. Prueba funcional: consumo

Completa el script con recepción y comparación.

### 43.1. Implementación

```python
queue = data["events"]["queue_url"]
deadline = time.monotonic() + 30
found = False

while time.monotonic() < deadline and not found:
    response = sqs.receive_message(
        QueueUrl=queue, WaitTimeSeconds=2, MaxNumberOfMessages=10
    )
    for message in response.get("Messages", []):
        if json.loads(message["Body"]) != event:
            raise RuntimeError("Evento inesperado o incompatible.")

        result = s3.get_object(Bucket=event["bucket"], Key=event["key"])
        stream = result["Body"]
        try:
            recovered = json.loads(stream.read())
        finally:
            stream.close()

        if recovered != document:
            raise RuntimeError("El documento no coincide.")

        sqs.delete_message(
            QueueUrl=queue, ReceiptHandle=message["ReceiptHandle"]
        )
        found = True

if not found:
    raise RuntimeError("No se observó el evento esperado.")

print(json.dumps({"integration_passed": True, "event_id": identity}))
```

---

## 44. Sesión 2: recorrido funcional

Duración orientativa: 30 minutos.

### 44.1. Comandos

```bash
python -m py_compile scripts/clients.py
python -m py_compile scripts/integration.py
python scripts/integration.py > resultados/integration-summary.json
```

### 44.2. Resultado esperado

El consumidor recibe el evento y recupera el documento idéntico.

### 44.3. Límite

La prueba espera un evento concreto; no demuestra ausencia de duplicados tardíos.

---

## 45. Limpieza del fixture

Crea `scripts/cleanup_data.py`.

### 45.1. Implementación

```python
import json
from botocore.exceptions import ClientError
from clients import ROOT, project, s3

path = ROOT / "resultados/fixture.json"
if not path.exists():
    raise SystemExit(0)

fixture = json.loads(path.read_text())
data = project()
if (
    fixture["bucket"] != data["bucket_name"]
    or fixture["key"] != f"documents/{fixture['event_id']}.json"
):
    raise RuntimeError("Fixture incompatible.")

s3.delete_object(Bucket=fixture["bucket"], Key=fixture["key"])
try:
    s3.head_object(Bucket=fixture["bucket"], Key=fixture["key"])
except ClientError as error:
    if str(error.response["Error"]["Code"]) not in {
        "404", "NoSuchKey", "NotFound"
    }:
        raise
else:
    raise RuntimeError("El objeto sigue presente.")

path.unlink()
print(json.dumps({"data_cleanup_verified": True}))
```

---

## 46. Sesión 3: configuración y convergencia

La prueba funcional debe complementarse con consultas y planificación posterior.

### 46.1. Comandos

```bash
terraform -chdir=app plan -detailed-exitcode
python scripts/cleanup_data.py
```

### 46.2. Interpretación

Código 0: sin cambios.

Código 2: cambios propuestos.

Código 1: error.

### 46.3. Regla

Consulta también filtro, política de cola y redrive mediante AWS CLI.

---

## 47. Pruebas adicionales obligatorias

La implementación de referencia no completa toda la evaluación.

### 47.1. Actividades pendientes

Publica `document.ignored` y comprueba el filtro durante una ventana definida.

Introduce una expectativa incorrecta de contenido.

Verifica la política de redrive.

Comprueba etiquetas y bloqueo público.

Registra un fallo de limpieza y su recuperación.

### 47.2. Regla

Distingue pruebas implementadas de requisitos todavía pendientes.

---

## 48. Requisitos del pipeline

La automatización debe ejecutar el mismo recorrido reproducible.

### 48.1. Secuencia mínima

Formato, inicialización readonly y validación.

Pruebas de contrato.

Disponibilidad observable de LocalStack.

Plan guardado y revisado.

Aplicación y prueba funcional.

Limpieza de datos, destroy y ausencia.

### 48.2. Regla

Registra por separado resultado de prueba y resultado de limpieza.

---

## 49. Recuperación y seguridad

Los procedimientos negativos deben ser dirigidos y reversibles.

### 49.1. Después de un fallo

Conserva estado y fixture.

Identifica la fase alcanzada.

Mantén el emulador disponible cuando sea necesario.

Corrige o retira únicamente recursos conocidos.

Repite la verificación.

### 49.2. Regla

No borres estados ni utilices limpiezas globales de Docker para ocultar problemas.

---

## 50. Sesión 4: destruir y verificar

Mantén LocalStack disponible durante el teardown.

### 50.1. Secuencia

```bash
python scripts/cleanup_data.py
terraform -chdir=app state pull > copias/before-destroy.tfstate
terraform -chdir=app plan -destroy -out=../planes/destroy.tfplan
terraform -chdir=app show ../planes/destroy.tfplan
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local s3api list-buckets
aws_local sns list-topics
aws_local sqs list-queues
```

### 50.2. Finalización

Comprueba ausencia de los identificadores del contrato antes de ejecutar `docker compose down`.

---

## 51. Entrega y evaluación

La entrega debe permitir comprender, reproducir y revisar el proyecto.

### 51.1. Documentación mínima

README con preparación y comandos.

Diagrama de arquitectura.

Matriz de requisitos y evidencias.

Registro de versiones.

Procedimiento de limpieza y recuperación.

Lista de límites del emulador.

### 51.2. Regla

Excluye estados, planes y respuestas sensibles completas.

---

## 52. Rúbrica y resumen del proyecto

La evaluación debe premiar trazabilidad y comprensión, no complejidad innecesaria.

### 52.1. Rúbrica sugerida

| **Área** | **Peso** | **Evidencia principal** |
|----------|----------|------------------------|
| Arquitectura y contratos | 20 % | Requisitos y diagrama |
| Terraform y módulos | 25 % | Código reproducible |
| Pruebas | 25 % | Casos positivos y negativos |
| Limpieza y recuperación | 20 % | Ausencia y recuperación |
| Documentación | 10 % | Procedimientos y límites |

Los porcentajes pueden adaptarse al curso.

### 52.2. Diferencias respecto a AWS real

Quedan pendientes IAM efectivo, KMS, auditoría, cuotas, propagación y resiliencia.

### 52.3. Idea final

**El proyecto final está completo cuando demuestra su recorrido, detecta errores relevantes y puede retirarse de forma verificable sin afectar a otras ejecuciones.**