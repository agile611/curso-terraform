# Práctica de almacenamiento y mensajería con Terraform y LocalStack

Esta práctica integra S3, SNS, SQS y DynamoDB en un flujo de procesamiento de documentos.

El productor almacena un documento en un bucket versionado y publica un evento que identifica esa versión.

SNS distribuye el evento hacia una cola SQS.

Un consumidor de terminal descarga el documento, comprueba su integridad y registra el procesamiento en DynamoDB.

Si el mensaje no puede procesarse, permanece sin confirmar y puede terminar en una dead-letter queue.

Terraform gestiona la infraestructura.

Los scripts del laboratorio gestionan los documentos, eventos y registros ficticios.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los scripts son herramientas didácticas, no consumidores listos para producción.

---

## 1. Objetivos de aprendizaje

La práctica conecta infraestructura, datos y procedimientos operativos.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Desplegar cuatro servicios mediante Terraform.
- Referenciar una versión concreta de un objeto S3.
- Publicar eventos con atributos SNS.
- Autorizar entregas SNS hacia SQS.
- Procesar mensajes mediante AWS CLI.
- Registrar resultados con escrituras condicionales DynamoDB.
- Reconocer mensajes duplicados compatibles.
- Observar reintentos y mensajes fallidos.
- Recuperar un evento con un alcance controlado.
- Destruir la infraestructura y verificar la limpieza.

### 1.2. Resultado práctico

Construirás un flujo reproducible de documentos y eventos.

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
jq --version
bash --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer versionado S3, filtros SNS, visibilidad SQS y condiciones DynamoDB.

Los comandos se ejecutan desde Bash en el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Comprobaciones obligatorias

Verifica:

- Escritura y lectura de versiones S3.
- Publicación SNS y entrega raw hacia SQS.
- Filtrado por atributos.
- Políticas de acceso y redirección SQS.
- Recepción, visibilidad y eliminación de mensajes.
- Escrituras condicionales DynamoDB.
- Destrucción de buckets con historial.

### 3.2. Registro de versiones

Documenta Terraform, AWS CLI, proveedor e imagen o digest de LocalStack.

### 3.3. Alcance

La configuración escrita no demuestra por sí sola que una combinación haya sido probada.

---

## 4. Arquitectura de la práctica

El flujo combina almacenamiento de documentos y distribución de referencias.

### 4.1. Recorrido principal

```text
Productor ──→ S3 versionado
    │
    └──→ SNS ──→ SQS ──→ Consumidor ──→ DynamoDB
                   │          │
                   │          └──→ Descarga de versión S3
                   │
                   └──→ DLQ tras recepciones repetidas
```

### 4.2. Referencia, no contenido completo

El evento contiene bucket, clave, versión y hash.

El documento permanece en S3.

### 4.3. Motivo

El consumidor puede recuperar los bytes asociados a la publicación original.

### 4.4. Límite

El flujo no constituye una transacción distribuida entre los cuatro servicios.

---

## 5. Responsabilidades de los servicios

Cada componente debe tener un propósito identificable.

### 5.1. Comparación

| **Servicio** | **Responsabilidad** | **No garantiza por sí solo** |
|-------------|---------------------|-----------------------------|
| S3 | Conservar documentos y versiones | Publicación del evento |
| SNS | Distribuir publicaciones | Procesamiento del consumidor |
| SQS | Mantener mensajes para consumo | Éxito de negocio |
| DynamoDB | Registrar resultados | Atomicidad con SQS |
| DLQ SQS | Aislar mensajes con reintentos | Reparación de la causa |

Estas diferencias permiten diagnosticar cada etapa.

### 5.2. Regla principal

**Almacenar, publicar, entregar, registrar y confirmar son operaciones diferentes.**

### 5.3. Evidencia

La práctica verificará cada operación de forma independiente.

---

## 6. Contrato del documento

El documento representa un pedido ficticio.

### 6.1. Ejemplo

```json
{
  "schema_version": 1,
  "order_id": "ORDER#1001",
  "customer_id": "CUSTOMER#001",
  "total_cents": 12500,
  "currency": "EUR"
}
```

### 6.2. Importes

Utilizaremos números enteros de céntimos.

### 6.3. Identidad

`order_id` identifica el pedido, no el evento de procesamiento.

### 6.4. Validación

El consumidor comprobará campos y tipos antes de registrar el resultado.

---

## 7. Contrato del evento

El evento identifica el documento exacto que debe procesarse.

### 7.1. Ejemplo conceptual

```json
{
  "schema_version": 1,
  "event_id": "document-001",
  "event_type": "document.ready",
  "bucket": "bucket-del-laboratorio",
  "key": "orders/ORDER-1001.json",
  "version_id": "identificador-devuelto-por-s3",
  "sha256": "hash-de-64-caracteres",
  "simulate_failure": false
}
```

### 7.2. Identidad estable

Una repetición del mismo evento conserva `event_id`.

### 7.3. Versión explícita

El consumidor no descargará simplemente la versión actual de la clave.

---

## 8. Claves de DynamoDB e idempotencia

La tabla registrará un resultado por identificador de evento.

### 8.1. Clave primaria

```text
event_id = document-001
```

### 8.2. Escritura condicional

El consumidor intentará crear el registro solamente si no existe.

### 8.3. Duplicado compatible

Si ya existe, comprobará que corresponde al mismo documento y pedido.

### 8.4. Conflicto

El mismo `event_id` con otra referencia no se confirmará automáticamente.

### 8.5. Límite

Esta estrategia cubre el registro del laboratorio.

No garantiza exactamente una ejecución de efectos externos como cobros o emails.

---

## 9. Fallos y dead-letter queue

La DLQ de esta práctica protege la etapa de consumo SQS.

### 9.1. Fallo de procesamiento

El consumidor recibe el mensaje, falla y no lo elimina.

### 9.2. Reintento

Al vencer la visibilidad, el mensaje puede recibirse otra vez.

### 9.3. Redirección

La cola utiliza `maxReceiveCount` para decidir el traslado a la DLQ.

### 9.4. Distinción

No configuraremos una DLQ de suscripción SNS en el laboratorio obligatorio.

### 9.5. Consecuencia

No afirmaremos que la DLQ SQS captura todos los fallos de entrega SNS.

---

## 10. Preparación del directorio

Trabaja en una carpeta independiente.

### 10.1. Estructura

```bash
mkdir -p terraform-practica-integrada/{scripts,documentos,eventos}
mkdir -p terraform-practica-integrada/{resultados,planes}
cd terraform-practica-integrada
```

### 10.2. Organización

La raíz contendrá Terraform y Docker Compose.

`scripts/` contendrá herramientas de terminal.

`documentos/` y `eventos/` contendrán datos ficticios.

### 10.3. Artefactos

`resultados/` almacenará respuestas y descargas.

### 10.4. Aislamiento

No reutilices el estado de otra lección.

---

## 11. Protección de archivos

Separa material versionable y artefactos operativos.

### 11.1. `.gitignore`

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

### 11.2. Qué conservar

Versiona configuración, scripts, datos ficticios y `.terraform.lock.hcl`.

### 11.3. Precaución

Los estados, planes y descargas pueden contener información sensible.

---

## 12. LocalStack y Docker Compose

Utiliza una imagen validada por el docente.

### 12.1. Selección

Sustituye el marcador:

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
      SERVICES: s3,sns,sqs,dynamodb
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 12.3. Arranque

Ejecuta `docker compose up -d` y comprueba `docker compose ps`.

---

## 13. Credenciales ficticias y conectividad

Configura la terminal antes de utilizar AWS CLI.

### 13.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 13.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
aws --endpoint-url=http://localhost:4566 --region us-east-1 sns list-topics
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
aws --endpoint-url=http://localhost:4566 --region us-east-1 dynamodb list-tables
```

### 13.3. Continuación

Espera respuestas válidas de los cuatro servicios.

---

## 14. Requisitos de Terraform

Crea `versions.tf`.

### 14.1. Configuración

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

### 14.2. Interpretación

La restricción permite versiones AWS 5.x.

### 14.3. Reproducibilidad

Conserva el archivo de bloqueo que genere `terraform init`.

---

## 15. Proveedor con endpoints locales

Crea `providers.tf`.

### 15.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style            = true

  endpoints {
    s3       = "http://localhost:4566"
    sns      = "http://localhost:4566"
    sqs      = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
  }
}
```

### 15.2. Alcance

No añadas servicios nuevos sin revisar sus endpoints.

---

## 16. Variables e identidad

Crea los archivos de entrada.

### 16.1. `variables.tf`

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

### 16.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
```

### 16.3. Entorno compartido

Alumnos que compartan LocalStack necesitan sufijos diferentes.

---

## 17. Bucket versionado

Crea `main.tf`.

### 17.1. Configuración

```hcl
resource "aws_s3_bucket" "documents" {
  bucket = "curso-practica-documents-${var.suffix}"

  # Exclusivamente para limpiar datos ficticios.
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

### 17.2. Propiedad

Terraform gestionará el contenedor; los scripts publicarán sus documentos.

---

## 18. Tabla de resultados

Añade la tabla a `main.tf`.

### 18.1. Configuración

```hcl
resource "aws_dynamodb_table" "processed" {
  name         = "curso-practica-processed-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"

  attribute {
    name = "event_id"
    type = "S"
  }

  tags = {
    Laboratory = "LocalStack"
  }
}
```

### 18.2. Atributos

Los atributos de negocio se escribirán en los elementos.

No deben declararse todos como bloques `attribute`.

---

## 19. Topic y colas

Añade los recursos de mensajería.

### 19.1. Configuración

```hcl
resource "aws_sns_topic" "documents" {
  name = "curso-practica-documents-${var.suffix}"
}

resource "aws_sqs_queue" "work" {
  name                       = "curso-practica-work-${var.suffix}"
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 5
  message_retention_seconds  = 86400
}

resource "aws_sqs_queue" "dlq" {
  name                      = "curso-practica-dlq-${var.suffix}"
  message_retention_seconds = 1209600
}
```

### 19.2. Retención

La DLQ conserva mensajes durante más tiempo que la principal.

---

## 20. Políticas de redirección

Configura la relación entre la cola principal y su DLQ.

### 20.1. Recursos

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
    maxReceiveCount     = 3
  })

  depends_on = [aws_sqs_queue_redrive_allow_policy.dlq]
}
```

---

## 21. Autorización de entrega SNS

La cola principal aceptará mensajes desde el topic esperado.

### 21.1. Política

```hcl
resource "aws_sqs_queue_policy" "sns_delivery" {
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

### 21.2. Alcance

Esta autorización no sustituye los permisos del productor en AWS real.

---

## 22. Suscripción y filtro

La suscripción selecciona eventos de documentos preparados.

### 22.1. Configuración

```hcl
resource "aws_sns_topic_subscription" "work" {
  topic_arn = aws_sns_topic.documents.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.work.arn

  raw_message_delivery = true
  filter_policy_scope   = "MessageAttributes"

  filter_policy = jsonencode({
    event_type = ["document.ready"]
  })

  depends_on = [
    aws_sqs_queue_policy.sns_delivery,
    aws_sqs_queue_redrive_policy.work
  ]
}
```

### 22.2. Contrato

El consumidor recibirá el JSON original directamente en `Body`.

---

## 23. Outputs del proyecto

Crea `outputs.tf`.

### 23.1. Resultados

```hcl
output "bucket_name" {
  value = aws_s3_bucket.documents.bucket
}

output "topic_arn" {
  value = aws_sns_topic.documents.arn
}

output "queue_url" {
  value = aws_sqs_queue.work.id
}

output "dlq_url" {
  value = aws_sqs_queue.dlq.id
}

output "table_name" {
  value = aws_dynamodb_table.processed.name
}
```

---

## 24. Sesión 1: desplegar y verificar

Duración orientativa: 25 minutos.

### 24.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 24.2. Resultado esperado

Deben crearse diez recursos Terraform.

### 24.3. Verificación

Consulta los outputs y comprueba bucket, tabla, topic y colas mediante AWS CLI.

### 24.4. Condición

No continúes hasta que la tabla esté activa y el versionado habilitado.

---

## 25. Entorno común de los scripts

Los scripts utilizarán una conexión local explícita.

### 25.1. `scripts/env.sh`

```bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1 AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}

BUCKET="$(terraform output -raw bucket_name)"
TOPIC="$(terraform output -raw topic_arn)"
QUEUE="$(terraform output -raw queue_url)"
DLQ="$(terraform output -raw dlq_url)"
TABLE="$(terraform output -raw table_name)"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}
```

---

## 26. Productor: almacenar una versión

El productor guardará la referencia exacta devuelta por S3.

### 26.1. Primera parte de `scripts/publish.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"

FILE="${1:?Indica archivo}"
EVENT_ID="${2:?Indica event_id}"
KEY="${3:?Indica clave S3}"
jq -e '.' "$FILE" >/dev/null

aws_local s3api put-object \
  --bucket "$BUCKET" --key "$KEY" \
  --body "$FILE" --content-type application/json \
  > resultados/upload.json

VERSION="$(jq -er '.VersionId' resultados/upload.json)"
[[ "$VERSION" != "null" ]] || {
  echo "Se esperaba una versión no null." >&2
  exit 1
}
HASH="$(hash_file "$FILE")"
```

---

## 27. Productor: construir y publicar el evento

Completa el mismo archivo con este fragmento.

### 27.1. Segunda parte

```bash
jq -n --arg id "$EVENT_ID" --arg bucket "$BUCKET" \
  --arg key "$KEY" --arg version "$VERSION" --arg hash "$HASH" \
  '{
    schema_version: 1, event_id: $id, event_type: "document.ready",
    bucket: $bucket, key: $key, version_id: $version,
    sha256: $hash, simulate_failure: false
  }' > eventos/latest.json

jq -n '{
  event_type: {DataType: "String", StringValue: "document.ready"}
}' > eventos/attributes.json

aws_local sns publish --topic-arn "$TOPIC" \
  --message file://eventos/latest.json \
  --message-attributes file://eventos/attributes.json \
  > resultados/publish.json

echo "Publicación aceptada: $EVENT_ID"
```

### 27.2. Límite

Los archivos de salida se sobrescriben; conserva copias para cada sesión.

---

## 28. Consumidor: recibir y validar

El consumidor procesará como máximo un mensaje por ejecución.

### 28.1. Primera parte de `scripts/consume.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"

aws_local sqs receive-message --queue-url "$QUEUE" \
  --max-number-of-messages 1 --wait-time-seconds 5 \
  --visibility-timeout 120 --message-system-attribute-names All \
  > resultados/receive.json

if ! jq -e '.Messages[0] != null' resultados/receive.json >/dev/null; then
  echo "No se recibió mensaje en esta solicitud."
  exit 0
fi

RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/receive.json)"
jq -r '.Messages[0].Body' resultados/receive.json > resultados/event.json

jq -e '
  .schema_version == 1 and .event_type == "document.ready" and
  (.event_id | type == "string" and length > 0) and
  (.bucket | type == "string" and length > 0) and
  (.key | type == "string" and length > 0) and
  (.version_id | type == "string" and length > 0) and
  (.sha256 | type == "string" and test("^[a-f0-9]{64}$")) and
  (.simulate_failure | type == "boolean")
' resultados/event.json >/dev/null
```

---

## 29. Consumidor: recuperar y comprobar bytes

Añade esta segunda parte al mismo script.

### 29.1. Descarga y validación

```bash
EVENT_BUCKET="$(jq -r '.bucket' resultados/event.json)"
[[ "$EVENT_BUCKET" == "$BUCKET" ]] || {
  echo "Bucket ajeno al laboratorio." >&2
  exit 1
}
if jq -e '.simulate_failure == true' resultados/event.json >/dev/null; then
  echo "Fallo simulado: mensaje sin confirmar." >&2
  exit 1
fi

ID="$(jq -r '.event_id' resultados/event.json)"
KEY="$(jq -r '.key' resultados/event.json)"
VERSION="$(jq -r '.version_id' resultados/event.json)"
EXPECTED="$(jq -r '.sha256' resultados/event.json)"

aws_local s3api get-object --bucket "$BUCKET" --key "$KEY" \
  --version-id "$VERSION" resultados/document.json \
  > resultados/download.json

[[ "$(hash_file resultados/document.json)" == "$EXPECTED" ]] || {
  echo "Hash incompatible: mensaje sin confirmar." >&2
  exit 1
}
```

---

## 30. Consumidor: preparar el registro

El resultado incluirá la identidad del evento y su referencia documental.

### 30.1. Tercera parte

```bash
jq -e '
  .schema_version == 1 and
  (.order_id | type == "string" and length > 0) and
  (.customer_id | type == "string" and length > 0) and
  (.total_cents | type == "number" and . >= 0 and . == floor) and
  (.currency == "EUR")
' resultados/document.json >/dev/null

ORDER="$(jq -r '.order_id' resultados/document.json)"
jq -n --arg id "$ID" --arg bucket "$BUCKET" --arg key "$KEY" \
  --arg version "$VERSION" --arg hash "$EXPECTED" --arg order "$ORDER" \
  '{
    event_id: {S: $id}, status: {S: "COMPLETED"},
    bucket: {S: $bucket}, object_key: {S: $key},
    version_id: {S: $version}, sha256: {S: $hash},
    order_id: {S: $order}
  }' > resultados/item.json
```

### 30.2. Efecto de negocio

En esta práctica, completar significa validar y registrar este resultado.

---

## 31. Consumidor: escribir o reconocer un duplicado

Completa el script con la escritura condicional y la confirmación.

### 31.1. Cuarta parte

```bash
if aws_local dynamodb put-item --table-name "$TABLE" \
  --item file://resultados/item.json \
  --condition-expression "attribute_not_exists(event_id)" \
  > resultados/write.json 2> resultados/write-error.txt; then
  echo "Resultado creado: $ID"
else
  if ! grep -q 'ConditionalCheckFailedException' resultados/write-error.txt; then
    cat resultados/write-error.txt >&2
    exit 1
  fi
  jq -n --arg id "$ID" '{event_id:{S:$id}}' > resultados/item-key.json
  aws_local dynamodb get-item --table-name "$TABLE" \
    --key file://resultados/item-key.json --consistent-read \
    > resultados/existing.json
  jq -e --slurpfile expected resultados/item.json \
    '.Item == $expected[0]' resultados/existing.json >/dev/null || {
      echo "Conflicto de identidad: mensaje sin confirmar." >&2
      exit 1
    }
  echo "Duplicado compatible: $ID"
fi

aws_local sqs delete-message --queue-url "$QUEUE" --receipt-handle "$RECEIPT"
echo "Mensaje confirmado."
```

---

## 32. Preparación de las sesiones

Comprueba sintaxis antes de ejecutar los scripts.

### 32.1. Validación

```bash
bash -n scripts/env.sh
bash -n scripts/publish.sh
bash -n scripts/consume.sh
```

### 32.2. Documento inicial

Guarda el ejemplo de la sección 6 en `documentos/order-1001.json`.

### 32.3. Ejecución

Utilizaremos `bash scripts/...`; no es necesario cambiar permisos.

### 32.4. Restricción

Ejecuta un consumidor cada vez.

Los archivos compartidos de `resultados/` no permiten concurrencia segura.

---

## 33. Sesión 2: completar el recorrido correcto

Duración orientativa: 20 minutos.

### 33.1. Publicar y conservar evidencia

```bash
bash scripts/publish.sh documentos/order-1001.json \
  document-001 orders/ORDER-1001.json
cp eventos/latest.json eventos/document-001.json
bash scripts/consume.sh
```

### 33.2. Resultado esperado

El consumidor descarga, valida, registra y confirma.

### 33.3. Sin mensaje recibido

Espera y ejecuta otra recepción acotada.

No republicar inmediatamente evita duplicados innecesarios.

### 33.4. Entregable

Conserva evento, versión S3 y registro DynamoDB.

---

## 34. Sesión 3: verificar el resultado persistente

Consulta DynamoDB de forma independiente.

### 34.1. Comandos

```bash
source scripts/env.sh
jq -n '{event_id:{S:"document-001"}}' > resultados/check-key.json
aws_local dynamodb get-item --table-name "$TABLE" \
  --key file://resultados/check-key.json --consistent-read \
  > resultados/check-item.json
jq '.Item' resultados/check-item.json
```

### 34.2. Comprobaciones

El registro debe contener estado `COMPLETED`.

La versión y el hash deben coincidir con el evento conservado.

### 34.3. Límite

El registro no demuestra efectos externos no implementados por el consumidor.

---

## 35. Sesión 4: repetir el mismo evento

La repetición debe conservar el identificador y la referencia.

### 35.1. Republicación

```bash
source scripts/env.sh
aws_local sns publish --topic-arn "$TOPIC" \
  --message file://eventos/document-001.json \
  --message-attributes file://eventos/attributes.json
bash scripts/consume.sh
```

### 35.2. Resultado esperado

El consumidor reconoce un duplicado compatible y lo confirma.

### 35.3. Verificación

DynamoDB sigue teniendo un único elemento para `document-001`.

### 35.4. Distinción

La deduplicación del registro no significa que SNS evitó la entrega.

---

## 36. Sesión 5: procesar una versión anterior

La referencia de versión debe resistir cambios posteriores en la clave.

### 36.1. Preparar evento pendiente

Publica el documento con `event_id = document-002`.

Conserva su evento, pero no ejecutes todavía el consumidor.

### 36.2. Sobrescribir la clave

Modifica el importe y sube el archivo directamente:

```bash
source scripts/env.sh
aws_local s3api put-object --bucket "$BUCKET" \
  --key orders/ORDER-1001.json --body documentos/order-1001.json \
  --content-type application/json
```

### 36.3. Procesamiento

Ejecuta el consumidor y comprueba que descarga la versión del evento pendiente.

---

## 37. Sesión 6: observar el filtro SNS

El filtro utiliza atributos, no campos del cuerpo.

### 37.1. Publicación sin atributos

```bash
source scripts/env.sh
aws_local sns publish --topic-arn "$TOPIC" \
  --message file://eventos/document-001.json
```

### 37.2. Expectativa

La suscripción no coincide porque falta `event_type` como atributo SNS.

### 37.3. Comprobación

Solicita mensajes durante una ventana acotada con la cola previamente vacía.

### 37.4. Límite

Una recepción vacía aislada no prueba definitivamente ausencia de entrega.

### 37.5. AWS real

Los cambios de filtros pueden requerir hasta quince minutos de propagación.

---

## 38. Sesión 7: provocar un fallo y liberar visibilidad

Utiliza un identificador nuevo para separar la prueba.

### 38.1. Publicación fallida

```bash
source scripts/env.sh
jq '.event_id = "document-failed-001" | .simulate_failure = true' \
  eventos/document-001.json > eventos/failed.json
aws_local sns publish --topic-arn "$TOPIC" \
  --message file://eventos/failed.json \
  --message-attributes file://eventos/attributes.json
```

### 38.2. Reintentos

Ejecuta el consumidor; su fallo dejará el mensaje sin eliminar.

Para no esperar 120 segundos, utiliza el handle recién capturado:

```bash
RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/receive.json)"
aws_local sqs change-message-visibility --queue-url "$QUEUE" \
  --receipt-handle "$RECEIPT" --visibility-timeout 0
```

---

## 39. Sesión 8: observar la DLQ y preparar recuperación

Repite recepciones y liberaciones de forma acotada, por ejemplo hasta diez intentos.

### 39.1. Consulta de DLQ

```bash
source scripts/env.sh
aws_local sqs receive-message --queue-url "$DLQ" \
  --max-number-of-messages 1 --wait-time-seconds 5 \
  --visibility-timeout 120 > resultados/dlq-message.json
jq '.Messages[0].Body | fromjson' resultados/dlq-message.json
```

### 39.2. Recuperación controlada

Verifica primero `event_id = document-failed-001`.

Corrige `simulate_failure` y publica la copia directamente en la cola principal.

Confirma la publicación antes de eliminar el original mediante su handle de DLQ.

### 39.3. Riesgo

Publicación y eliminación no son atómicas; una recuperación interrumpida puede duplicarse.

---

## 40. Limpieza, ejercicios y resumen

La práctica termina cuando infraestructura y datos ficticios tienen un destino comprendido.

### 40.1. Limpieza revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
docker compose down
```

`force_destroy` permite eliminar documentos e historial ficticio del bucket.

Eliminar la tabla y las colas elimina también sus datos pendientes.

### 40.2. Diferencias y ejercicios

En AWS real revisa IAM, cifrado, costes, cuotas, propagación y recuperación de datos.

No extrapoles rendimiento ni seguridad desde LocalStack.

Practica hashes incorrectos, conflictos de `event_id` y fallos después del registro.

Documenta también la ventana entre subida S3 y publicación SNS, donde falta atomicidad.

### 40.3. Idea final

**El flujo correcto conserva referencias exactas, valida datos, registra resultados y confirma mensajes con responsabilidades explícitas.**