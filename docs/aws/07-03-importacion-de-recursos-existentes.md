# Importación de recursos existentes con Terraform y LocalStack

Importar un recurso permite incorporar a Terraform un objeto que ya existe sin crearlo nuevamente.

La importación establece una relación entre una dirección de Terraform y un identificador reconocido por el proveedor.

Sin embargo, esa relación no garantiza que la configuración describa correctamente el objeto ni que el siguiente plan esté libre de cambios.

En esta lección crearás recursos mediante AWS CLI y después los incorporarás a una configuración Terraform.

LocalStack emulará los servicios de AWS utilizados durante el laboratorio.

Practicarás importación imperativa, importación declarativa, generación inicial de configuración y verificación de identidad.

También aprenderás a distinguir la adopción de infraestructura de la recuperación de datos.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La importación requiere identificar correctamente el recurso, su dirección y su propietario.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento seguro para adoptar infraestructura existente.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Inventariar recursos creados fuera de Terraform.
- Identificar el valor utilizado para importar cada recurso.
- Escribir configuración compatible con el objeto existente.
- Utilizar `terraform import`.
- Utilizar bloques `import`.
- Revisar configuración generada.
- Detectar cambios no deseados después de importar.
- Conservar la identidad de los recursos.
- Limpiar el laboratorio de forma controlada.

### 1.2. Resultado práctico

Incorporarás colas SQS, una tabla DynamoDB y un bucket S3 a un estado Terraform local.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de configuración y estado.

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, outputs, direcciones, ARN y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de colas SQS.
- Creación y lectura de tablas DynamoDB.
- Creación de buckets y versionado S3.
- Lectura de etiquetas.
- Importación de los recursos seleccionados.
- Generación inicial de configuración para una cola.
- Aplicación de planes de importación.
- Destrucción de infraestructura adoptada.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Terraform ejecuta la importación; LocalStack emula las API consultadas por el proveedor.

---

## 4. Qué significa importar

Importar conecta una dirección de Terraform con un objeto del proveedor.

### 4.1. Relación conceptual

```text
Dirección Terraform → Identificador del proveedor → Objeto existente
```

### 4.2. Ejemplo

Una dirección `aws_sqs_queue.legacy` puede asociarse con la URL de una cola existente.

### 4.3. Lo que no implica

La importación no significa necesariamente:

- Crear el recurso.
- Copiar todos sus datos.
- Generar una arquitectura completa.
- Corregir automáticamente su configuración.

### 4.4. Regla principal

**Importar recupera o establece una relación de gestión; no sustituye el análisis del recurso.**

---

## 5. Configuración, estado y servicio

La adopción requiere comparar tres representaciones diferentes.

### 5.1. Comparación

| **Representación** | **Qué contiene** | **Dónde se consulta** |
|--------------------|------------------|-----------------------|
| Configuración | Intención declarada | Archivos `.tf` |
| Estado | Relaciones y atributos registrados | Backend Terraform |
| Servicio | Objetos existentes | API de AWS emulada |

En este laboratorio, los objetos del servicio existen en LocalStack.

### 5.2. Diferencia

Un recurso puede existir en SQS sin estar registrado en el estado.

### 5.3. Consecuencia

Un plan puede proponer creación aunque el objeto ya exista.

### 5.4. Precaución

No apliques esa creación como sustituto de una importación revisada.

---

## 6. Importación imperativa y declarativa

Terraform ofrece dos procedimientos principales para importar.

### 6.1. Comparación

| **Procedimiento** | **Mecanismo** | **Momento de adopción** |
|-------------------|---------------|-------------------------|
| Imperativo | `terraform import` | Durante el comando |
| Declarativo | Bloque `import` | Durante la aplicación del plan |
| Generación inicial | `-generate-config-out` | Genera HCL para revisión |

La generación de configuración no equivale por sí sola a completar una importación.

### 6.2. Laboratorio

Utilizaremos ambos procedimientos sobre recursos diferentes.

### 6.3. Regla

No ejecutes dos procedimientos simultáneamente para adoptar el mismo objeto.

### 6.4. Equipos

La importación declarativa facilita revisar la adopción dentro de un flujo de plan y aplicación.

---

## 7. Identificadores de importación

El valor aceptado depende del recurso y del proveedor.

### 7.1. Recursos seleccionados

| **Recurso Terraform** | **Identificador utilizado** | **Ejemplo conceptual** |
|------------------------|----------------------------|------------------------|
| `aws_sqs_queue` | URL de cola | URL devuelta por SQS |
| `aws_dynamodb_table` | Nombre de tabla | `curso-import-orders-alumno01` |
| `aws_s3_bucket` | Nombre de bucket | `curso-import-data-alumno01` |
| `aws_s3_bucket_versioning` | Nombre de bucket en este laboratorio | Mismo bucket |

No todos los recursos utilizan ARN como identificador de importación.

### 7.2. Documentación

Comprueba el formato correspondiente a la versión del proveedor seleccionada.

### 7.3. Precaución

Los identificadores compuestos y los escenarios entre cuentas requieren revisión adicional.

### 7.4. Laboratorio

Trabajaremos con recursos locales y una configuración sencilla.

---

## 8. Propiedad y ausencia de gestión duplicada

Un objeto no debería estar administrado simultáneamente desde estados independientes.

### 8.1. Preguntas previas

Antes de importar, comprueba:

- ¿Quién creó el recurso?
- ¿Otro proyecto Terraform ya lo administra?
- ¿Existe una dirección registrada en otro workspace?
- ¿Qué equipo autoriza la adopción?
- ¿Qué atributos se conservarán?

### 8.2. Riesgo

Dos estados pueden aplicar decisiones incompatibles sobre el mismo objeto.

### 8.3. Bloqueo

El bloqueo de un estado no coordina automáticamente otros estados independientes.

### 8.4. Regla

La importación técnica no sustituye un acuerdo sobre propiedad operacional.

---

## 9. Diseño de la práctica

Crearás recursos primero mediante AWS CLI y después los adoptarás.

### 9.1. Inventario

| **Objeto** | **Creación inicial** | **Adopción prevista** |
|------------|----------------------|-----------------------|
| Cola principal | AWS CLI | Importación imperativa |
| Tabla de pedidos | AWS CLI | Importación declarativa |
| Bucket | AWS CLI | Importación declarativa |
| Versionado del bucket | AWS CLI | Importación declarativa |
| Cola de auditoría | AWS CLI | Generación de configuración |

Al finalizar habrá cinco recursos gestionados por Terraform.

### 9.2. Datos ficticios

La tabla y el bucket contendrán un dato de prueba para demostrar que importación y datos son conceptos distintos.

### 9.3. Alcance

No importaremos los elementos DynamoDB ni el objeto S3 como recursos individuales.

---

## 10. Preparación del directorio

Trabaja en una carpeta independiente.

### 10.1. Estructura

```bash
mkdir -p terraform-import-localstack/planes
mkdir -p terraform-import-localstack/resultados
mkdir -p terraform-import-localstack/copias
mkdir -p terraform-import-localstack/documentos
cd terraform-import-localstack
```

### 10.2. Aislamiento

No copies el estado de otra práctica.

### 10.3. Directorio de trabajo

Ejecuta los comandos desde esta raíz, salvo indicación expresa.

### 10.4. Evidencias

Conservaremos respuestas de creación, identificadores e inventarios.

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
copias/
crash.log
```

### 11.2. Qué conservar

Versiona configuración, documentos ficticios y `.terraform.lock.hcl`.

### 11.3. Precaución

Los estados, planes y copias pueden contener información sensible.

---

## 12. Selección de LocalStack

Utiliza una imagen validada por el docente.

### 12.1. Referencia

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 12.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 12.3. Persistencia

No presupongas que los recursos sobrevivirán a la eliminación del contenedor.

### 12.4. Alcance

Esta práctica no necesita runtimes Lambda ni acceso al socket Docker desde LocalStack.

---

## 13. Docker Compose

La configuración publica LocalStack únicamente en la interfaz local.

### 13.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs,dynamodb
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 13.2. Arranque

Ejecuta `docker compose up -d` y comprueba `docker compose ps`.

### 13.3. Continuación

Espera a que los tres servicios respondan correctamente.

---

## 14. Credenciales ficticias y conectividad

Prepara la terminal antes de utilizar AWS CLI.

### 14.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 14.2. Consultas

Ejecuta `aws_local sqs list-queues`, `aws_local dynamodb list-tables` y `aws_local s3api list-buckets`.

### 14.3. Regla

Utiliza endpoints locales en todas las operaciones del laboratorio.

---

## 15. Identidad del laboratorio

Define nombres coherentes antes de crear recursos.

### 15.1. Variables de terminal

```bash
export SUFFIX=alumno01

QUEUE_NAME="curso-import-work-${SUFFIX}"
AUDIT_NAME="curso-import-audit-${SUFFIX}"
TABLE_NAME="curso-import-orders-${SUFFIX}"
BUCKET_NAME="curso-import-data-${SUFFIX}"
```

### 15.2. Entorno compartido

Alumnos que compartan LocalStack necesitan sufijos diferentes.

### 15.3. Precaución

No continúes si esos nombres pertenecen a recursos ajenos.

### 15.4. Consistencia

El mismo sufijo se utilizará después en `terraform.tfvars`.

---

## 16. Sesión 1: crear la cola existente

Duración orientativa: 15 minutos para preparar los recursos iniciales.

### 16.1. Creación

```bash
aws_local sqs create-queue \
  --queue-name "$QUEUE_NAME" \
  --attributes VisibilityTimeout=75,MessageRetentionPeriod=86400 \
  --tags Laboratory=LocalStack,Owner=training \
  > resultados/create-queue.json

QUEUE_URL="$(jq -er '.QueueUrl' resultados/create-queue.json)"
```

### 16.2. Verificación

Consulta atributos y etiquetas mediante AWS CLI.

### 16.3. Relación inicial

La cola existe en LocalStack, pero todavía no está administrada por Terraform.

---

## 17. Crear la cola de auditoría

Esta cola se utilizará para practicar generación inicial de configuración.

### 17.1. Creación

```bash
aws_local sqs create-queue \
  --queue-name "$AUDIT_NAME" \
  --attributes VisibilityTimeout=45,MessageRetentionPeriod=172800 \
  --tags Laboratory=LocalStack,Owner=training \
  > resultados/create-audit.json

AUDIT_URL="$(jq -er '.QueueUrl' resultados/create-audit.json)"
```

### 17.2. Diferencias intencionadas

La cola tiene un timeout y una retención distintos de la principal.

### 17.3. Evidencia

Conserva ambos valores para comprobar que la configuración generada los representa.

---

## 18. Crear la tabla existente

La tabla utilizará una clave primaria simple.

### 18.1. Creación y espera

```bash
aws_local dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions AttributeName=order_id,AttributeType=S \
  --key-schema AttributeName=order_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  > resultados/create-table.json

aws_local dynamodb wait table-exists \
  --table-name "$TABLE_NAME"
```

### 18.2. Verificación

Comprueba que la tabla está activa.

### 18.3. Alcance

Todavía no existe una relación con un recurso `aws_dynamodb_table` en el estado.

---

## 19. Insertar un elemento ficticio

El dato permitirá comprobar que la importación no recrea la tabla.

### 19.1. Escritura

```bash
aws_local dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --item '{
    "order_id":{"S":"ORDER-001"},
    "status":{"S":"TRAINING"},
    "total_cents":{"N":"12500"}
  }'
```

### 19.2. Verificación

Consulta `ORDER-001` mediante `get-item`.

### 19.3. Distinción

El elemento no se declarará como recurso Terraform.

### 19.4. Límite

Importar la tabla no representa un backup de sus elementos.

---

## 20. Crear el bucket existente

Utilizaremos la región `us-east-1` para simplificar la creación.

### 20.1. Creación y versionado

```bash
aws_local s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  > resultados/create-bucket.json

aws_local s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
```

### 20.2. Verificación

Consulta `get-bucket-versioning`.

### 20.3. Decisión

El bucket y su configuración de versionado se adoptarán mediante recursos Terraform separados.

---

## 21. Subir un documento ficticio

El objeto demuestra que la importación del contenedor no adopta todos sus contenidos.

### 21.1. Documento y subida

```bash
printf '{"message":"Dato ficticio para practicar importación."}\n' \
  > documentos/sample.json

aws_local s3api put-object \
  --bucket "$BUCKET_NAME" \
  --key training/sample.json \
  --body documentos/sample.json \
  --content-type application/json \
  > resultados/upload.json

OBJECT_VERSION="$(jq -er '.VersionId' resultados/upload.json)"
```

### 21.2. Condición

Comprueba que el versionado devolvió un identificador válido.

### 21.3. Limpieza

Conserva esa versión para eliminar exactamente el objeto de prueba al finalizar.

---

## 22. Inventario previo a la adopción

Guarda las características observadas antes de utilizar Terraform.

### 22.1. Consultas

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" --attribute-names All \
  > resultados/queue-before.json

aws_local dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  > resultados/table-before.json

aws_local s3api get-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  > resultados/versioning-before.json
```

### 22.2. Evidencia

Registra también las dos URLs, nombres, ARN disponibles y versión del objeto S3.

### 22.3. Regla

La verificación posterior debe compararse con este inventario, no con recuerdos de la terminal.

---

## 23. Requisitos de Terraform

Crea `versions.tf`.

### 23.1. Configuración

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

### 23.2. Bloqueo

Conserva `.terraform.lock.hcl` después de inicializar.

### 23.3. Alcance

La práctica utiliza el backend local predeterminado.

---

## 24. Proveedor con endpoints locales

Crea `providers.tf`.

### 24.1. Configuración

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
    sqs      = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    s3       = "http://localhost:4566"
  }
}
```

### 24.2. Distinción

Los endpoints del proveedor no configuran automáticamente un backend remoto.

---

## 25. Variables e inputs

Crea `variables.tf` y `terraform.tfvars`.

### 25.1. Declaración

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

### 25.2. Entrada

```hcl
suffix = "alumno01"
```

### 25.3. Consistencia

El valor debe coincidir con el utilizado para crear los recursos mediante AWS CLI.

---

## 26. Configuración de la cola principal

Crea `queue.tf` antes de ejecutar la importación imperativa.

### 26.1. Recurso

```hcl
resource "aws_sqs_queue" "legacy" {
  name                       = "curso-import-work-${var.suffix}"
  visibility_timeout_seconds = 75
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Owner      = "training"
  }
}
```

### 26.2. Objetivo inicial

Describe la configuración existente sin introducir mejoras simultáneamente.

### 26.3. Regla

Primero adopta sin cambios; después modifica mediante otro plan.

---

## 27. Sesión 2: importación imperativa

La operación asociará la cola existente con `aws_sqs_queue.legacy`.

### 27.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show

terraform import aws_sqs_queue.legacy "$QUEUE_URL"

terraform state list
terraform state show aws_sqs_queue.legacy
```

### 27.2. Resultado esperado

Debe aparecer una relación administrada con la URL original.

### 27.3. Precaución

El comando modifica el estado durante su ejecución; no esperes una aplicación posterior para completar esa asociación.

---

## 28. Revisar el plan posterior

Importar no garantiza que la configuración coincida con el objeto.

### 28.1. Comandos

```bash
terraform plan -out=planes/queue-adopted.tfplan
terraform show planes/queue-adopted.tfplan
```

### 28.2. Resultado deseado

No deberían existir cambios correctivos sobre la cola principal.

### 28.3. Si aparecen diferencias

Comprueba atributos omitidos, valores predeterminados y etiquetas.

### 28.4. No asumir

No apliques cambios simplemente porque el comando de importación terminó correctamente.

### 28.5. Evidencia

Consulta SQS para confirmar que la URL y los atributos originales permanecen.

---

## 29. Copia del estado adoptado

Conserva una copia antes de ampliar el conjunto administrado.

### 29.1. Comandos

```bash
umask 077
terraform state pull > copias/after-queue-import.tfstate

jq '{version, terraform_version, lineage, serial}' \
  copias/after-queue-import.tfstate
```

### 29.2. Protección

La copia puede contener información sensible en otros proyectos.

### 29.3. Límite

No contiene los datos de la tabla ni el documento del bucket.

### 29.4. Regla

Protege copias y planes con el mismo cuidado que el estado principal.

---

## 30. Configuración de tabla y bucket

Crea `storage.tf` para describir los recursos existentes.

### 30.1. Recursos

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "curso-import-orders-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }
}

resource "aws_s3_bucket" "data" {
  bucket        = "curso-import-data-${var.suffix}"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

### 30.2. Distinción

Importar el bucket no adopta automáticamente el recurso separado que administra su versionado.

---

## 31. Bloques de importación declarativa

Crea `imports.tf`.

### 31.1. Configuración

```hcl
import {
  to = aws_dynamodb_table.orders
  id = "curso-import-orders-${var.suffix}"
}

import {
  to = aws_s3_bucket.data
  id = "curso-import-data-${var.suffix}"
}

import {
  to = aws_s3_bucket_versioning.data
  id = "curso-import-data-${var.suffix}"
}
```

### 31.2. Identificadores

Los nombres deben corresponder a los recursos creados anteriormente.

### 31.3. Alcance

Los bloques describen la adopción; los recursos describen la gestión futura.

---

## 32. Sesión 3: revisar y aplicar importaciones

La importación declarativa permite inspeccionar las acciones antes de aplicarlas.

### 32.1. Secuencia

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=planes/storage-import.tfplan
terraform show planes/storage-import.tfplan
terraform apply planes/storage-import.tfplan
terraform state list
```

### 32.2. Resultado esperado

El plan debe indicar tres importaciones sin creación o destrucción de esos objetos.

### 32.3. Cambios adicionales

Si propone actualizaciones, revísalas antes de aplicar.

### 32.4. Inventario

Después de esta sesión debe haber cuatro recursos gestionados.

---

## 33. Verificar conservación de datos

La adopción no debería eliminar el contenido ficticio.

### 33.1. Consultas

```bash
aws_local dynamodb get-item \
  --table-name "$TABLE_NAME" \
  --key '{"order_id":{"S":"ORDER-001"}}' \
  --consistent-read \
  > resultados/order-after-import.json

aws_local s3api get-object \
  --bucket "$BUCKET_NAME" \
  --key training/sample.json \
  --version-id "$OBJECT_VERSION" \
  resultados/sample-after-import.json \
  > resultados/download-after-import.json
```

### 33.2. Resultado

El elemento y el documento deben seguir disponibles.

### 33.3. Límite

Esa conservación no convierte al estado en una copia de los datos.

---

## 34. Generación inicial de configuración

Terraform puede generar HCL para determinados recursos declarados en bloques `import`.

### 34.1. Preparación

Añade a `imports.tf`:

```hcl
import {
  to = aws_sqs_queue.audit
  id = "SUSTITUIR_POR_URL_REAL_DE_LA_COLA_DE_AUDITORIA"
}
```

### 34.2. Identificador

Sustituye el marcador por el contenido de `AUDIT_URL`.

### 34.3. Condición

Todavía no debe existir un bloque `resource "aws_sqs_queue" "audit"`.

### 34.4. Alcance

La generación inicial no descubre ni modela automáticamente toda la arquitectura.

---

## 35. Sesión 4: generar HCL para revisión

Utiliza un archivo nuevo para evitar sobrescribir configuración.

### 35.1. Comando

```bash
terraform plan \
  -generate-config-out=generated-audit.tf
```

### 35.2. Resultado esperado

Terraform debe generar un bloque inicial para la cola de auditoría.

### 35.3. Precaución

El comando puede generar configuración y aun así señalar problemas que requieren corrección.

### 35.4. No aplicar todavía

Revisa el archivo, normaliza sus atributos y vuelve a generar un plan.

### 35.5. Versiones

El comportamiento de generación debe verificarse con la versión Terraform utilizada.

---

## 36. Revisar configuración generada

La configuración generada es un punto de partida, no una recomendación final de diseño.

### 36.1. Qué comprobar

Revisa:

- Nombre de la cola.
- Timeout de visibilidad.
- Retención.
- Etiquetas.
- Configuración FIFO.
- Cifrado observado.
- Atributos redundantes o incompatibles.
- Valores que deseas administrar explícitamente.

### 36.2. Precaución

No elimines atributos solo por parecer poco importantes.

### 36.3. Regla

Relaciona cada simplificación con el comportamiento esperado del proveedor y compruébala mediante plan.

---

## 37. Normalizar la cola de auditoría

Para el objeto creado en esta página, una configuración sencilla puede ser suficiente.

### 37.1. Bloque esperado

Después de revisar el archivo generado, puedes normalizarlo a:

```hcl
resource "aws_sqs_queue" "audit" {
  name                       = "curso-import-audit-${var.suffix}"
  visibility_timeout_seconds = 45
  message_retention_seconds  = 172800

  tags = {
    Laboratory = "LocalStack"
    Owner      = "training"
  }
}
```

### 37.2. Condición

Solo utiliza este bloque si el plan confirma que no omite diferencias relevantes del entorno validado.

### 37.3. Regla

No conserves dos bloques con la misma dirección en archivos diferentes.

---

## 38. Sesión 5: adoptar la cola generada

Aplica únicamente después de revisar la configuración normalizada.

### 38.1. Secuencia

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=planes/audit-import.tfplan
terraform show planes/audit-import.tfplan
terraform apply planes/audit-import.tfplan
terraform state show aws_sqs_queue.audit
```

### 38.2. Resultado esperado

El plan debe importar la cola sin recrearla.

### 38.3. Inventario final

Deben existir cinco recursos administrados en el estado.

### 38.4. Evidencia

Comprueba que `aws_sqs_queue.audit` conserva la URL original de auditoría.

---

## 39. Outputs e inventario administrado

Crea `outputs.tf` cuando todos los recursos estén adoptados.

### 39.1. Configuración

```hcl
output "queue_url" {
  value = aws_sqs_queue.legacy.id
}

output "audit_url" {
  value = aws_sqs_queue.audit.id
}

output "table_name" {
  value = aws_dynamodb_table.orders.name
}

output "bucket_name" {
  value = aws_s3_bucket.data.bucket
}
```

### 39.2. Aplicación

Revisa y aplica un plan para registrar los outputs si todavía no están presentes.

### 39.3. Límite

Los outputs no sustituyen una consulta independiente de existencia.

---

## 40. Sesión 6: aceptación sin cambios

La adopción termina cuando la configuración y los recursos están reconciliados.

### 40.1. Verificación

```bash
terraform state list
terraform plan
terraform show -json > resultados/adopted-state-values.json
```

### 40.2. Direcciones esperadas

El estado debe incluir las dos colas, la tabla, el bucket y su versionado.

### 40.3. Resultado deseado

El plan debe indicar ausencia de cambios.

### 40.4. Precaución

Un plan sin cambios no certifica salud de aplicación ni conservación de todos los datos.

### 40.5. Evidencia

Compara identificadores y atributos con el inventario previo.

---

## 41. Sesión 7: cambios después de adoptar

Una vez completada la importación, las mejoras deben realizarse por separado.

### 41.1. Cambio intencionado

En `queue.tf`, cambia el timeout de 75 a 90 segundos.

### 41.2. Plan y aplicación

```bash
terraform plan -out=planes/update-queue.tfplan
terraform show planes/update-queue.tfplan
terraform apply planes/update-queue.tfplan
```

### 41.3. Resultado esperado

Debe actualizar el atributo sin crear otra cola.

### 41.4. Verificación

Consulta `VisibilityTimeout` y confirma que la URL permanece igual.

### 41.5. Regla

Separar adopción y mejora facilita atribuir cada cambio a una decisión explícita.

---

## 42. Importación en módulos y recursos indexados

La dirección de destino debe identificar la instancia correcta.

### 42.1. Ejemplos conceptuales

```bash
terraform import \
  'aws_sqs_queue.work["blue"]' \
  "$QUEUE_URL"

terraform import \
  'module.messaging.aws_sqs_queue.queue["events"]' \
  "$QUEUE_URL"

terraform import \
  'aws_sqs_queue.audit[0]' \
  "$AUDIT_URL"
```

### 42.2. No ejecutar aquí

Estas direcciones no pertenecen a la configuración del laboratorio actual.

### 42.3. Regla

Conserva las comillas y no importes el mismo objeto en varias direcciones.

---

## 43. Fallos frecuentes de importación

Un fallo debe diagnosticarse antes de repetir operaciones.

### 43.1. Lista de revisión

Comprueba:

- ID incorrecto.
- ARN utilizado donde se esperaba nombre o URL.
- Dirección inexistente.
- Instancia de `for_each` no declarada.
- Dirección ya ocupada.
- Endpoint o región incorrectos.
- Permisos insuficientes.
- Recurso no soportado para importación.
- Estado o workspace equivocado.

### 43.2. Regla

No cambies el proveedor, el ID y la dirección simultáneamente para resolver un único error.

---

## 44. Recuperación de una asociación incorrecta

Si importaste el objeto equivocado, detén cualquier aplicación correctiva.

### 44.1. Procedimiento orientativo

1. Inspecciona dirección e ID registrado.
2. Comprueba el objeto mediante su API.
3. Conserva una copia del estado.
4. Retira únicamente la asociación incorrecta con `state rm`.
5. Corrige configuración y bloque `import`, si existe.
6. Importa el objeto adecuado.
7. Revisa un plan completo.

### 44.2. Precaución

`state rm` no elimina el objeto remoto.

### 44.3. Regla

Una importación equivocada no debe solucionarse aplicando destrucciones sobre recursos que no pretendías administrar.

---

## 45. Bloques conservados, drift y automatización

Los bloques de importación pueden permanecer como documentación de la adopción.

### 45.1. Relación existente

Una importación ya satisfecha no debe volver a crear el recurso en cada aplicación.

### 45.2. Recuperación

Conservar el bloque también puede afectar planes futuros si la relación desaparece del estado.

### 45.3. Drift

Después de adoptar, cambios externos se evalúan como en cualquier recurso administrado.

### 45.4. Automatización

Utiliza `terraform plan -detailed-exitcode` y distingue sus códigos de error, ausencia de cambios y cambios presentes.

### 45.5. Seguridad

Los planes guardados pueden contener información sensible y deben protegerse.

---

## 46. Protección y límites de destrucción

Importar otorga a Terraform capacidad de gestionar el ciclo de vida del recurso.

### 46.1. Consecuencia

Un recurso adoptado puede aparecer en un plan de destrucción.

### 46.2. Protección opcional

`prevent_destroy` puede bloquear determinados planes destructivos mientras esté presente en la configuración.

### 46.3. Límite

No evita eliminaciones realizadas fuera de Terraform ni sustituye controles de acceso.

### 46.4. S3

`force_destroy = false` impedirá vaciar automáticamente el bucket del laboratorio.

### 46.5. Regla

Decide explícitamente quién autoriza destrucción, cómo se conservan datos y qué verificaciones son obligatorias.

---

## 47. Preparar la limpieza de datos

La importación de infraestructura no significa que sus contenidos estén gestionados individualmente.

### 47.1. Verificar versiones

```bash
aws_local s3api list-object-versions \
  --bucket "$BUCKET_NAME" \
  > resultados/versions-before-cleanup.json
```

### 47.2. Eliminar la versión ficticia

```bash
aws_local s3api delete-object \
  --bucket "$BUCKET_NAME" \
  --key training/sample.json \
  --version-id "$OBJECT_VERSION"
```

### 47.3. Condición

Comprueba que el bucket no contiene otras versiones ni delete markers.

### 47.4. Precaución

No ejecutes limpieza masiva sobre buckets compartidos o con datos ajenos.

---

## 48. Limpieza de la infraestructura adoptada

Mantén LocalStack disponible mientras Terraform destruye los recursos.

### 48.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local sqs list-queues
aws_local dynamodb list-tables
aws_local s3api list-buckets
docker compose down
```

### 48.2. Datos

Eliminar la tabla elimina también el pedido ficticio.

### 48.3. Condición

Los cinco recursos deben seguir vinculados al estado antes de destruir.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar adopción, no certificar todas las condiciones de producción.

### 49.1. Aspectos adicionales

En AWS real revisa:

- Permisos de lectura y modificación.
- Propiedad entre cuentas.
- Dependencias externas.
- Protección de datos.
- Cifrado y claves.
- Restricciones de los servicios.
- Backend remoto protegido.
- Auditoría y coordinación de equipos.

### 49.2. Persistencia local

Eliminar LocalStack puede hacer desaparecer recursos aunque Terraform conserve sus asociaciones.

### 49.3. Límite

El estado importado no recupera objetos ni datos que hayan sido eliminados.

---

## 50. Ejercicios, evaluación y resumen

Consolida la adopción antes de incorporar recursos más complejos.

### 50.1. Ejercicios

1. Documenta ID de importación y dirección de cada recurso.
2. Compara atributos antes y después de adoptar.
3. Importa una cola con el procedimiento imperativo.
4. Adopta almacenamiento mediante bloques `import`.
5. Revisa y simplifica configuración generada.
6. Provoca una diferencia de configuración y explica el plan.
7. Diseña un procedimiento para evitar gestión duplicada.
8. Destruye y verifica todos los recursos del laboratorio.

### 50.2. Criterio de evaluación

Entrega inventario previo, planes revisados, cinco relaciones administradas y evidencia de conservación de identidad y datos ficticios.

### 50.3. Idea final

**Importar con seguridad exige identificar el objeto, declarar su gestión, revisar el plan y comprobar que la adopción conserva la infraestructura que realmente pretendías administrar.**