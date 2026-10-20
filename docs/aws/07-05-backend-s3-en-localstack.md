# Backend S3 en LocalStack: almacenamiento remoto del estado de Terraform

Un backend S3 permite guardar el estado de Terraform en un bucket en lugar de conservarlo únicamente en el directorio de trabajo.

Ese cambio facilita compartir una misma relación de gestión entre distintas ejecuciones, conservar versiones y separar la configuración del archivo de estado.

Sin embargo, almacenar el estado en S3 no resuelve automáticamente los problemas de concurrencia, seguridad o recuperación.

También necesitas configurar correctamente los endpoints, el bloqueo, las credenciales y el ciclo de vida del bucket.

En esta lección crearás un bucket de backend mediante AWS CLI y migrarás un proyecto Terraform desde estado local hacia S3.

LocalStack emulará el almacenamiento y los recursos administrados.

Las sesiones incluyen inspección del objeto, bloqueo nativo, acceso desde otro directorio, versionado, diagnóstico y regreso a un backend local.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> El bucket del backend debe conservarse mientras exista estado que dependa de él.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento reproducible para almacenar el estado en un backend S3 local.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar backend y proveedor.
- Crear un bucket destinado al estado.
- Configurar endpoints locales para el backend S3.
- Migrar un estado local existente.
- Activar bloqueo nativo mediante un archivo S3.
- Inspeccionar estado y versiones.
- Coordinar dos directorios que utilizan el mismo backend.
- Recuperar conectividad y diagnosticar errores.
- Destruir recursos sin eliminar prematuramente el backend.

### 1.2. Resultado práctico

Administrarás una cola SQS cuyo estado se almacenará en un bucket S3 de LocalStack.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de estado, importación y planes guardados.

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

Esta práctica utiliza **Terraform 1.10 o superior dentro de la serie 1.x**.

### 2.2. Motivo de la versión mínima

El laboratorio utiliza `use_lockfile`, disponible en el backend S3 desde Terraform 1.10.

El proveedor AWS se limita a la serie 5.x como base didáctica.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir esta práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de buckets.
- Lectura y escritura de objetos S3.
- Versionado de objetos.
- Operaciones condicionales utilizadas por el bloqueo.
- Creación y eliminación del archivo `.tflock`.
- Migración del backend.
- Creación y consulta de colas SQS.
- Eliminación de versiones y delete markers.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Advertencia

Una API disponible no demuestra que sus condiciones de concurrencia reproduzcan completamente AWS real.

---

## 4. Backend y proveedor son componentes distintos

Terraform utiliza el backend para conservar el estado y el proveedor para administrar recursos.

### 4.1. Comparación

| **Componente** | **Responsabilidad** | **Servicio del laboratorio** |
|---------------|---------------------|-----------------------------|
| Backend S3 | Leer y escribir estado | S3 |
| Proveedor AWS | Crear y consultar recursos | SQS |
| AWS CLI | Preparar e inspeccionar infraestructura | S3 y SQS |

Cada componente necesita su propia configuración de acceso.

### 4.2. Consecuencia

Configurar `endpoints` en el proveedor AWS no configura el endpoint del backend.

### 4.3. Regla principal

**El backend debe apuntar explícitamente a LocalStack, aunque el proveedor ya lo haga.**

---

## 5. Estado remoto no significa infraestructura remota

La palabra *remoto* describe la ubicación del estado respecto al proceso de Terraform.

### 5.1. En este laboratorio

Terraform se ejecuta en el host.

LocalStack se ejecuta en Docker.

El archivo de estado se almacena mediante la API S3 de LocalStack.

### 5.2. Recursos administrados

La cola SQS también existe en LocalStack.

No se utiliza una cuenta de AWS real.

### 5.3. Distinción

Un backend remoto no implica que Terraform ejecute remotamente los planes o las aplicaciones.

---

## 6. Arquitectura del laboratorio

Separaremos el almacenamiento del estado y el recurso administrado.

### 6.1. Recorrido

```text
Terraform en el host
    │
    ├── Backend S3 ───────→ Bucket de estado en LocalStack
    │                          ├── terraform.tfstate
    │                          └── terraform.tfstate.tflock
    │
    └── Proveedor AWS ────→ Cola SQS en LocalStack
```

### 6.2. Bootstrap

AWS CLI creará el bucket antes de inicializar el backend.

### 6.3. Alcance

No utilizaremos Lambda, DynamoDB ni un servicio externo de ejecución.

---

## 7. Por qué existe una fase de bootstrap

El backend debe estar disponible antes de que Terraform pueda utilizarlo.

### 7.1. Dependencia

Terraform no puede depender de un bucket que todavía tiene que crear usando ese mismo backend inexistente.

### 7.2. Procedimientos posibles

Puedes preparar el backend mediante:

- AWS CLI.
- Otro proyecto Terraform con estado independiente.
- Una plataforma de aprovisionamiento.
- Un procedimiento administrativo controlado.

### 7.3. Laboratorio

Utilizaremos AWS CLI para mantener visible la separación.

### 7.4. Regla

No incluyas el bucket del backend como recurso del proyecto de aplicación de esta práctica.

---

## 8. Diseño del aislamiento

Cada alumno utilizará un bucket y una cola con nombres propios.

### 8.1. Convenciones

```text
Bucket: curso-backend-state-alumno01
Cola:   curso-backend-work-alumno01
Key:    curso/backend-s3/terraform.tfstate
```

### 8.2. Entorno compartido

Si varios alumnos comparten LocalStack, deben utilizar sufijos distintos.

### 8.3. Misma combinación

Dos directorios que apunten al mismo bucket y key utilizarán el mismo estado.

### 8.4. Precaución

No confundas compartir un backend con mantener dos estados independientes para el mismo recurso.

---

## 9. Preparación del directorio

Trabaja en una carpeta independiente.

### 9.1. Estructura

```bash
mkdir -p terraform-backend-s3/app
mkdir -p terraform-backend-s3/planes
mkdir -p terraform-backend-s3/resultados
mkdir -p terraform-backend-s3/copias
mkdir -p terraform-backend-s3/scripts
cd terraform-backend-s3
```

### 9.2. Distribución

La raíz contendrá Docker Compose y herramientas auxiliares.

El directorio `app` contendrá la configuración Terraform.

### 9.3. Ejecución

Salvo indicación expresa, los comandos se ejecutan desde la raíz del laboratorio.

---

## 10. Protección de archivos

El estado, los planes y los metadatos de inicialización requieren protección.

### 10.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
backend.local.hcl
planes/
resultados/
copias/
app-colaborador/
crash.log
```

### 10.2. Qué conservar

Versiona configuración, scripts y `.terraform.lock.hcl`.

### 10.3. Precaución

No introduzcas credenciales reales en archivos de backend, planes o comandos.

---

## 11. Selección de la imagen

Utiliza una imagen validada por el docente.

### 11.1. Referencia

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 11.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 11.3. Persistencia

No presuponemos persistencia del contenido al eliminar el contenedor.

### 11.4. Advertencia

El estado y los recursos pueden desaparecer juntos si destruyes LocalStack antes de exportar evidencias.

---

## 12. Docker Compose

La configuración publica LocalStack únicamente en la interfaz local.

### 12.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 12.2. Arranque

Ejecuta `docker compose up -d`.

### 12.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 13. Credenciales ficticias

Prepara la terminal antes de utilizar Terraform o AWS CLI.

### 13.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_SQS

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 13.2. Comprobación

Ejecuta `aws_local s3api list-buckets` y `aws_local sqs list-queues`.

### 13.3. Continuación

Espera respuestas válidas antes de crear recursos.

---

## 14. Variables operativas

Define las identidades del laboratorio en la terminal.

### 14.1. Valores

```bash
export SUFFIX=alumno01
export STATE_BUCKET="curso-backend-state-${SUFFIX}"
export STATE_KEY="curso/backend-s3/terraform.tfstate"
export QUEUE_NAME="curso-backend-work-${SUFFIX}"

printf 'Bucket: %s\nKey: %s\nCola: %s\n' \
  "$STATE_BUCKET" "$STATE_KEY" "$QUEUE_NAME"
```

### 14.2. Validación

Utiliza entre cuatro y ocho caracteres alfanuméricos en el sufijo.

### 14.3. Consistencia

El mismo sufijo se utilizará en `app/terraform.tfvars`.

### 14.4. Precaución

No continúes si el bucket ya pertenece a otro laboratorio o alumno.

---

## 15. Sesión 1: crear el bucket del backend

Duración orientativa: 15 minutos.

### 15.1. Creación

```bash
aws_local s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  > resultados/create-state-bucket.json

aws_local s3api head-bucket \
  --bucket "$STATE_BUCKET"
```

### 15.2. Región

Utilizamos `us-east-1`, por lo que no añadimos una configuración de ubicación.

### 15.3. Propiedad

Este bucket pertenece exclusivamente al laboratorio.

### 15.4. Regla

El bucket debe existir antes de inicializar el backend S3.

---

## 16. Activar versionado

El versionado conserva revisiones de los objetos escritos en el bucket.

### 16.1. Configuración y consulta

```bash
aws_local s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws_local s3api get-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  > resultados/bucket-versioning.json

jq '.' resultados/bucket-versioning.json
```

### 16.2. Resultado esperado

La respuesta debe indicar `Status: Enabled`.

### 16.3. Límite

El versionado no sustituye copias externas ni procedimientos de recuperación.

---

## 17. Etiquetas y acceso público

Añade controles administrativos básicos al bucket.

### 17.1. Comandos

```bash
aws_local s3api put-bucket-tagging \
  --bucket "$STATE_BUCKET" \
  --tagging 'TagSet=[
    {Key=Laboratory,Value=LocalStack},
    {Key=Purpose,Value=TerraformState}
  ]'

aws_local s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 17.2. Alcance

Valida la emulación de estos controles en la imagen seleccionada.

### 17.3. Advertencia

Declarar controles en LocalStack no demuestra equivalencia completa de seguridad con AWS.

---

## 18. Requisitos del proyecto de aplicación

Crea `app/versions.tf`.

### 18.1. Configuración

```hcl
terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 18.2. Backend inicial

Todavía no declares un backend S3.

Terraform utilizará el backend local predeterminado.

### 18.3. Propósito

Primero crearemos un estado local real para practicar su migración.

---

## 19. Proveedor y variables

Crea `app/providers.tf` y `app/variables.tf`.

### 19.1. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://localhost:4566"
  }
}
```

### 19.2. Variable

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

---

## 20. Recurso administrado y outputs

Crea los archivos de aplicación con una cola independiente del backend.

### 20.1. `app/main.tf`

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-backend-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

### 20.2. Entradas y resultados

```hcl
# app/terraform.tfvars
suffix = "alumno01"
```

```hcl
# app/outputs.tf
output "queue_url" {
  value = aws_sqs_queue.work.id
}
```

---

## 21. Sesión 2: desplegar con estado local

Duración orientativa: 20 minutos.

### 21.1. Secuencia

```bash
terraform -chdir=app init
terraform -chdir=app fmt
terraform -chdir=app validate

terraform -chdir=app plan \
  -out=../planes/create-local.tfplan

terraform -chdir=app show ../planes/create-local.tfplan
terraform -chdir=app apply ../planes/create-local.tfplan
```

### 21.2. Resultado esperado

Debe crearse una cola SQS.

### 21.3. Estado

El archivo administrado estará inicialmente en `app/terraform.tfstate`.

---

## 22. Inventario previo a la migración

Conserva identificadores y metadatos antes de cambiar el backend.

### 22.1. Comandos

```bash
umask 077

QUEUE_URL="$(terraform -chdir=app output -raw queue_url)"

terraform -chdir=app state pull \
  > copias/before-s3-migration.tfstate

terraform -chdir=app output -json \
  > resultados/outputs-before-migration.json

jq '{lineage, serial, terraform_version}' \
  copias/before-s3-migration.tfstate
```

### 22.2. Verificación independiente

Consulta la cola mediante `aws_local sqs get-queue-attributes`.

### 22.3. Regla

La migración debe conservar la asociación con esa cola, no crear otra.

---

## 23. Declarar el tipo de backend

Crea `app/backend.tf` con una configuración parcial.

### 23.1. Bloque

```hcl
terraform {
  backend "s3" {}
}
```

### 23.2. Configuración parcial

El tipo de backend queda declarado en HCL.

Los valores concretos se proporcionarán durante `terraform init`.

### 23.3. Restricción

El bloque de backend no utiliza variables, recursos ni outputs del proyecto.

### 23.4. Motivo

Terraform necesita inicializar el backend antes de evaluar esas relaciones.

---

## 24. Configurar el backend local de S3

Crea `backend.local.hcl` en la raíz del laboratorio.

### 24.1. Archivo generado

```bash
cat > backend.local.hcl <<EOF
bucket = "${STATE_BUCKET}"
key    = "${STATE_KEY}"
region = "us-east-1"

endpoints = {
  s3 = "http://localhost:4566"
}

use_path_style              = true
use_lockfile                = true
skip_credentials_validation = true
skip_metadata_api_check     = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_s3_checksum            = true
EOF
```

### 24.2. Credenciales

El backend utilizará las credenciales ficticias de la terminal.

---

## 25. Interpretar las opciones del backend

Cada opción tiene un propósito concreto en la emulación.

### 25.1. Comparación

| **Opción** | **Propósito** | **Observación** |
|------------|---------------|-----------------|
| `endpoints.s3` | Utilizar LocalStack | Independiente del proveedor |
| `use_path_style` | Acceso mediante ruta | Evita depender de DNS por bucket |
| `use_lockfile` | Bloqueo nativo S3 | Requiere Terraform compatible |
| `skip_credentials_validation` | Evitar validación de credenciales | Solo para este laboratorio |
| `skip_s3_checksum` | Adaptación de compatibilidad | No es una recomendación general para AWS |

Las opciones de omisión reducen comprobaciones que no son necesarias en este entorno ficticio.

### 25.2. Seguridad

No traslades esta configuración sin revisión a una cuenta AWS real.

### 25.3. Versiones

El backend forma parte de Terraform, no del proveedor AWS descargado.

---

## 26. Sesión 3: migrar el estado hacia S3

La migración copia la relación de gestión desde el backend anterior.

### 26.1. Comando

```bash
terraform -chdir=app init \
  -migrate-state \
  -backend-config=../backend.local.hcl
```

### 26.2. Confirmación

Lee el mensaje que solicita copiar el estado existente.

Confirma únicamente si bucket, key y estado de origen son los esperados.

### 26.3. No automatizar inicialmente

En esta práctica no utilizaremos opciones para confirmar automáticamente la migración.

### 26.4. Resultado esperado

Terraform debe inicializar el backend S3 y conservar la cola administrada.

---

## 27. `-migrate-state` frente a `-reconfigure`

Estas opciones no representan el mismo procedimiento.

### 27.1. Comparación

| **Opción** | **Intención** | **Uso típico** |
|------------|---------------|----------------|
| `-migrate-state` | Trasladar estado entre configuraciones | Local hacia S3 |
| `-reconfigure` | Aceptar configuración sin migrar automáticamente | Conectar con un backend existente |
| Inicialización normal | Reutilizar configuración inicializada | Operaciones habituales |

La elección depende de dónde está el estado que necesitas conservar.

### 27.2. Riesgo

Utilizar `-reconfigure` hacia una key vacía puede dejarte conectado a un estado sin recursos.

### 27.3. Regla

No sustituyas una migración por una reconfiguración sin localizar primero el estado de origen.

---

## 28. Verificar la migración

Comprueba relaciones, identificadores y objeto almacenado.

### 28.1. Comandos

```bash
terraform -chdir=app state list
terraform -chdir=app output -raw queue_url

aws_local s3api head-object \
  --bucket "$STATE_BUCKET" \
  --key "$STATE_KEY" \
  > resultados/state-object-head.json

terraform -chdir=app state pull \
  > copias/after-s3-migration.tfstate
```

### 28.2. Resultado esperado

Debe seguir apareciendo `aws_sqs_queue.work`.

### 28.3. Identidad

La URL debe coincidir con `QUEUE_URL`.

### 28.4. Metadatos

Compara lineage y contenido; no presupongas un incremento exacto del serial.

---

## 29. Descargar el objeto de estado

Una consulta S3 permite inspeccionar la representación almacenada.

### 29.1. Descarga

```bash
aws_local s3api get-object \
  --bucket "$STATE_BUCKET" \
  --key "$STATE_KEY" \
  resultados/state-from-s3.tfstate \
  > resultados/state-download-metadata.json

jq '{lineage, serial, terraform_version}' \
  resultados/state-from-s3.tfstate
```

### 29.2. Formato

Este objeto contiene el estado utilizado por el backend.

### 29.3. Precaución

No lo edites manualmente para cambiar direcciones o eludir controles.

### 29.4. Seguridad

La descarga debe mantenerse fuera del repositorio.

---

## 30. Qué queda en el directorio local

Utilizar S3 no elimina todos los archivos locales relacionados con Terraform.

### 30.1. Archivos habituales

Puedes encontrar:

- Configuración `.tf`.
- `.terraform.lock.hcl`.
- Proveedores descargados.
- Metadatos de backend en `.terraform`.
- Planes guardados.
- Copias del estado anterior.

### 30.2. Distinción importante

`.terraform/terraform.tfstate` puede contener metadatos de inicialización del backend.

No debe confundirse con el estado de recursos almacenado en S3.

### 30.3. Regla

No publiques `.terraform` ni presupongas que carece de información sensible.

---

## 31. Sesión 4: aplicar un cambio con backend S3

El backend debe conservar las revisiones resultantes de las aplicaciones.

### 31.1. Cambio

En `app/main.tf`, cambia la visibilidad de 60 a 90 segundos.

### 31.2. Secuencia

```bash
terraform -chdir=app plan \
  -out=../planes/update-remote.tfplan

terraform -chdir=app show ../planes/update-remote.tfplan
terraform -chdir=app apply ../planes/update-remote.tfplan

terraform -chdir=app state pull \
  > copias/after-remote-update.tfstate
```

### 31.3. Resultado

La cola se actualiza sin cambiar su URL.

### 31.4. Evidencia

Consulta SQS y el objeto del backend después de aplicar.

---

## 32. Inspeccionar versiones del estado

El versionado permite observar revisiones del objeto.

### 32.1. Consulta

```bash
aws_local s3api list-object-versions \
  --bucket "$STATE_BUCKET" \
  --prefix "$STATE_KEY" \
  > resultados/state-versions.json

jq --arg key "$STATE_KEY" '
  .Versions[]? |
  select(.Key == $key) |
  {VersionId, IsLatest, LastModified, Size}
' resultados/state-versions.json
```

### 32.2. Filtro exacto

El prefijo también puede incluir el archivo de bloqueo.

El filtro por `Key` evita mezclarlo con el estado.

### 32.3. Precaución

No deduzcas un número fijo de versiones para cada comando Terraform.

---

## 33. Bloqueo nativo mediante S3

`use_lockfile = true` utiliza un objeto de bloqueo asociado a la key del estado.

### 33.1. Nombre esperado

```text
curso/backend-s3/terraform.tfstate.tflock
```

### 33.2. Finalidad

Evitar que dos operaciones compatibles escriban simultáneamente sobre el mismo estado.

### 33.3. Operaciones

Terraform crea el bloqueo cuando lo necesita y lo elimina al liberar la operación.

### 33.4. Límite

El bloqueo depende de que el almacenamiento respete las operaciones condicionales utilizadas.

### 33.5. Regla

Valida esa propiedad en LocalStack; no presupongas equivalencia por la existencia del archivo.

---

## 34. Bloqueo S3 y alternativa histórica con DynamoDB

El laboratorio utiliza bloqueo nativo y no necesita una tabla de bloqueo.

### 34.1. Comparación

| **Mecanismo** | **Componente adicional** | **Uso en esta página** |
|---------------|-------------------------|------------------------|
| Archivo S3 | Objeto `.tflock` | Sí |
| Bloqueo con DynamoDB | Tabla con clave de bloqueo | No |

La configuración con DynamoDB es una alternativa histórica que está deprecada en el backend S3 actual.

### 34.2. Compatibilidad

Terraform anterior a 1.10 no admite `use_lockfile`.

### 34.3. Regla

No elimines el bloqueo para adaptar silenciosamente una práctica a una versión antigua.

### 34.4. Alternativa didáctica

Utiliza una lección separada si necesitas estudiar el mecanismo histórico.

---

## 35. Sesión 5: observar un bloqueo real

Esta sesión necesita dos terminales y una modificación pendiente.

### 35.1. Preparación

Añade temporalmente una etiqueta a la cola:

```hcl
Session = "locking"
```

### 35.2. Terminal A

Ejecuta sin un plan guardado:

```bash
terraform -chdir=app apply
```

### 35.3. Pausa

Mantén la operación esperando confirmación, si la versión utilizada conserva el bloqueo durante esa espera.

### 35.4. Condición

La prueba de contención solo comienza cuando la terminal B confirma que existe el archivo `.tflock`.

---

## 36. Comprobar el bloqueo desde la terminal B

La segunda terminal debe utilizar las mismas credenciales ficticias.

### 36.1. Inspección

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-object \
  --bucket curso-backend-state-alumno01 \
  --key curso/backend-s3/terraform.tfstate.tflock \
  resultados/current-lock.json
```

### 36.2. Lectura

Inspecciona ID, operación, usuario y fecha disponibles.

### 36.3. Adaptación

Sustituye el bucket si utilizas otro sufijo.

### 36.4. Si no existe

No atribuyas un resultado posterior a contención; el docente debe ajustar la prueba a una operación que mantenga un bloqueo real.

---

## 37. Probar la contención

Mientras el bloqueo real sigue activo, una segunda operación debe respetarlo.

### 37.1. Terminal B

```bash
terraform -chdir=app plan -lock-timeout=5s
```

### 37.2. Resultado esperado

La operación debe esperar y terminar con un error de adquisición de bloqueo si el primero no se libera.

### 37.3. Terminal A

Responde `no` para cancelar la aplicación pendiente.

### 37.4. Verificación posterior

Repite el plan en la terminal B.

Ahora debe poder ejecutarse.

### 37.5. Regla

No utilices `-lock=false` para convertir una prueba fallida de contención en una aplicación concurrente.

---

## 38. Liberación normal y desbloqueo excepcional

Cancelar correctamente una operación debe liberar su bloqueo.

### 38.1. Comprobación

Consulta si existe la versión actual de `.tflock`.

Con versionado, pueden permanecer versiones históricas o delete markers.

### 38.2. Bloqueo abandonado

Un cierre inesperado puede requerir investigación y recuperación.

### 38.3. `force-unlock`

Solo debe utilizarse cuando se ha demostrado que ningún proceso sigue escribiendo.

### 38.4. Precaución

Eliminar el objeto a mano mientras existe un escritor activo puede permitir corrupción lógica o actualizaciones perdidas.

### 38.5. Regla

Investiga primero; desbloquear no corrige la causa del fallo.

---

## 39. Sesión 6: utilizar otro directorio

Un segundo directorio puede conectarse al mismo backend sin copiar el estado localmente.

### 39.1. Preparación

```bash
mkdir -p app-colaborador

cp app/*.tf app-colaborador/
cp app/terraform.tfvars app-colaborador/
cp app/.terraform.lock.hcl app-colaborador/
```

### 39.2. Inicialización

```bash
terraform -chdir=app-colaborador init \
  -backend-config=../backend.local.hcl
```

### 39.3. Resultado

El nuevo directorio debe leer el estado existente en S3.

### 39.4. Precaución

No copies `.terraform` ni un archivo local de estado al directorio colaborador.

---

## 40. Verificar la lectura compartida

Ambos directorios deben consultar la misma relación de gestión.

### 40.1. Comandos

```bash
terraform -chdir=app-colaborador state list
terraform -chdir=app-colaborador output -raw queue_url
terraform -chdir=app-colaborador plan
```

### 40.2. Resultado esperado

Debe aparecer la cola original y no una propuesta de creación por estado vacío.

### 40.3. Configuración

La copia debe contener los mismos cambios que `app`.

### 40.4. Regla

Compartir estado no sincroniza automáticamente los archivos HCL.

### 40.5. Equipo

Utiliza control de versiones para coordinar configuración y revisiones.

---

## 41. Key, workspaces y rutas de estado

La ubicación del objeto depende también del workspace.

### 41.1. Workspace predeterminado

En `default`, el estado utiliza la key configurada directamente.

### 41.2. Otros workspaces

El backend S3 incorpora un prefijo de workspace y el nombre seleccionado.

El prefijo predeterminado es `env:`.

### 41.3. Riesgo

Cambiar de workspace puede seleccionar un estado vacío aunque bucket y backend parezcan correctos.

### 41.4. Comprobación

Ejecuta `terraform -chdir=app workspace show` antes de operaciones sensibles.

### 41.5. Alcance

Esta práctica utiliza exclusivamente `default`.

---

## 42. Sesión 7: diagnosticar conectividad

Un fallo del backend puede impedir operar aunque SQS siga disponible.

### 42.1. Fuentes de evidencia

Comprueba:

- Contenedor LocalStack.
- Puerto publicado.
- Endpoint del backend.
- Existencia del bucket.
- Key seleccionada.
- Credenciales de la terminal.
- Archivo de bloqueo.
- Configuración inicializada.

### 42.2. Distinción

Un error de S3 durante la lectura del estado no implica necesariamente un problema en el recurso SQS.

### 42.3. Regla

No ejecutes una nueva aplicación desde otro estado para “sortear” la falta de acceso al backend.

---

## 43. Endpoint del host y endpoint de contenedor

La dirección correcta depende de dónde se ejecuta Terraform.

### 43.1. En esta página

Terraform se ejecuta en el host y utiliza `http://localhost:4566`.

### 43.2. Dentro de Docker

`localhost` identificaría el contenedor de Terraform, no el contenedor LocalStack.

Necesitarías una dirección accesible mediante la red Docker.

### 43.3. Regla

Adapta el endpoint del backend y el del proveedor por separado.

### 43.4. Precaución

No copies esta configuración a un contenedor sin comprobar resolución DNS, red y puerto.

### 43.5. Síntoma

Los errores de conexión pueden aparecer antes de cualquier lectura del recurso administrado.

---

## 44. Recuperación desde versiones anteriores

El versionado ofrece material para investigar, pero restaurar requiere un procedimiento explícito.

### 44.1. Descarga de una revisión

Obtén un `VersionId` exacto de la key del estado.

Después descarga esa versión con `get-object --version-id`.

### 44.2. Comparación

Revisa lineage, serial, direcciones e identificadores.

Comprueba también la situación actual de SQS.

### 44.3. Precaución

Una versión antigua puede representar infraestructura anterior a cambios ya aplicados.

### 44.4. Regla

No sobrescribas el estado actual ni uses `state push -force` únicamente porque existe una versión anterior.

---

## 45. Seguridad y permisos en AWS real

El backend requiere permisos propios, independientes de los necesarios para administrar la aplicación.

### 45.1. Permisos habituales

Se necesitan permisos adecuados para listar el bucket y leer o escribir la key del estado.

El bloqueo nativo necesita leer, crear y eliminar su objeto correspondiente.

### 45.2. Diferencia importante

Eliminar el archivo de bloqueo forma parte de su operación normal.

Eliminar el estado no debería concederse indiscriminadamente.

### 45.3. Controles adicionales

Revisa cifrado, TLS, políticas, acceso entre cuentas, auditoría y recuperación.

### 45.4. Límite local

Esta práctica no certifica aplicación completa de IAM, cifrado ni condiciones de acceso.

---

## 46. Sesión 8: destruir primero la aplicación

El backend debe seguir disponible durante la destrucción del recurso administrado.

### 46.1. Secuencia

```bash
terraform -chdir=app plan -destroy \
  -out=../planes/destroy-app.tfplan

terraform -chdir=app show ../planes/destroy-app.tfplan
terraform -chdir=app apply ../planes/destroy-app.tfplan

terraform -chdir=app state list
aws_local sqs list-queues
```

### 46.2. Resultado

La cola del laboratorio debe desaparecer.

### 46.3. Estado remoto

Puede permanecer un estado válido sin recursos administrados, además de sus versiones anteriores.

---

## 47. Regresar a un backend local

Antes de eliminar el bucket, desconecta el proyecto de ese backend conservando su estado final.

### 47.1. Copia final

```bash
terraform -chdir=app state pull \
  > copias/final-remote-state.tfstate
```

### 47.2. Cambiar `app/backend.tf`

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 47.3. Migración inversa

```bash
terraform -chdir=app init -migrate-state
```

### 47.4. Verificación

Confirma la copia hacia local y comprueba `state list` antes de eliminar el bucket.

---

## 48. Limpiar versiones del bucket dedicado

Un bucket versionado no queda vacío eliminando únicamente los objetos actuales.

### 48.1. Script de limpieza

Crea `scripts/empty-state-bucket.py`:

```python
import json
import os
import subprocess

bucket = os.environ["STATE_BUCKET"]
expected = "curso-backend-state-" + os.environ["SUFFIX"]
if bucket != expected:
    raise SystemExit("El bucket no coincide con el laboratorio.")

def aws(*args):
    command = [
        "aws", "--endpoint-url=http://localhost:4566",
        "--region", "us-east-1", "--output", "json", *args
    ]
    return subprocess.check_output(command, text=True)

data = json.loads(aws("s3api", "list-object-versions", "--bucket", bucket))
entries = data.get("Versions", []) + data.get("DeleteMarkers", [])
for entry in entries:
    aws(
        "s3api", "delete-object", "--bucket", bucket,
        "--key", entry["Key"], "--version-id", entry["VersionId"]
    )
print(f"Eliminadas {len(entries)} entradas versionadas del bucket dedicado.")
```

### 48.2. Condición

Ejecuta este script solo después de revisar que el bucket contiene exclusivamente datos del laboratorio.

---

## 49. Eliminar el backend y cerrar LocalStack

La eliminación del bucket es el último paso de infraestructura.

### 49.1. Secuencia

```bash
aws_local s3api list-object-versions \
  --bucket "$STATE_BUCKET" \
  > resultados/bucket-before-final-cleanup.json

python3 scripts/empty-state-bucket.py

aws_local s3api delete-bucket \
  --bucket "$STATE_BUCKET"

aws_local s3api list-buckets
docker compose down
```

### 49.2. Directorio colaborador

No vuelvas a operar desde `app-colaborador` después de eliminar su backend.

### 49.3. Evidencias

Conserva copias necesarias de forma protegida y elimina artefactos que ya no deban mantenerse.

---

## 50. Ejercicios, evaluación y resumen

La práctica se completa cuando puedes explicar dónde está el estado y qué protege cada componente.

### 50.1. Ejercicios

1. Diferencia endpoints del proveedor y del backend.
2. Migra una cola existente desde estado local.
3. Comprueba identidad y lineage antes y después.
4. Identifica versiones exactas de la key del estado.
5. Observa una contención con bloqueo real.
6. Conecta un segundo directorio al mismo backend.
7. Documenta un procedimiento de recuperación sin sobrescritura improvisada.
8. Destruye la aplicación antes de limpiar el bucket.

### 50.2. Criterio de evaluación

Entrega configuración reproducible, evidencias de migración, prueba de lectura compartida y limpieza ordenada.

### 50.3. Idea final

**Un backend S3 seguro requiere más que un bucket: necesita configuración independiente, bloqueo validado, versionado, coordinación y un procedimiento que proteja el estado durante todo su ciclo de vida.**