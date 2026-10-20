# Workspaces y separación de entornos con Terraform y LocalStack

Los workspaces de Terraform permiten utilizar varios estados independientes con una misma configuración.

Esa capacidad resulta útil cuando quieres desplegar variantes de una infraestructura sin duplicar todos sus archivos.

Sin embargo, un workspace no crea automáticamente una cuenta, una red ni una frontera de seguridad.

También debes separar los nombres de los recursos, seleccionar las entradas correctas y verificar el contexto antes de aplicar cambios.

En esta lección construirás tres entornos simulados: `dev`, `stage` y `prod`.

Cada entorno tendrá sus propias colas SQS y su estado independiente en un backend S3 de LocalStack.

Las sesiones incluyen selección de workspaces, planes guardados, verificación de aislamiento, cambios específicos, diagnóstico y limpieza.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> El nombre `prod` representa una simulación didáctica, no un entorno de producción real.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento reproducible para separar estados y recursos.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar qué cambia al seleccionar un workspace.
- Crear, seleccionar, enumerar y eliminar workspaces.
- Utilizar `terraform.workspace`.
- Separar nombres remotos por entorno.
- Asociar cada entorno con sus entradas.
- Inspeccionar las rutas del estado en S3.
- Comprobar independencia entre despliegues.
- Destruir cada entorno sin confundir su estado.

### 1.2. Resultado práctico

Construirás seis colas SQS distribuidas entre tres workspaces y verificarás su separación.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de estado, backend S3 y bloqueo.

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

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.10 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.3. Motivo

El backend utilizará bloqueo nativo S3 mediante `use_lockfile`.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir esta práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Lectura y escritura del estado en S3.
- Enumeración de workspaces.
- Creación y eliminación de estados por workspace.
- Bloqueo nativo mediante `.tflock`.
- Versionado de objetos.
- Creación y lectura de colas SQS.
- Consulta de atributos y etiquetas.
- Envío y recepción de mensajes.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Terraform implementa los workspaces; LocalStack emula los servicios utilizados por el backend y el proveedor.

---

## 4. Qué es un workspace de Terraform CLI

Un workspace selecciona un estado dentro del backend compatible utilizado por una configuración.

### 4.1. Relación conceptual

```text
Una configuración
    ├── Estado de dev
    ├── Estado de stage
    └── Estado de prod
```

### 4.2. Selección

Solo un workspace está seleccionado para una ejecución determinada.

### 4.3. Configuración compartida

Los archivos `.tf` siguen siendo los mismos.

### 4.4. Regla principal

**Cambiar de workspace cambia el estado seleccionado, no reescribe automáticamente la configuración.**

---

## 5. Workspaces CLI y plataformas de ejecución

El término *workspace* puede significar cosas diferentes según la herramienta.

### 5.1. Comparación

| **Concepto** | **Responsabilidad** | **Uso en esta página** |
|--------------|---------------------|------------------------|
| Workspace de Terraform CLI | Seleccionar un estado | Sí |
| Directorio de configuración | Contener archivos y metadatos locales | Sí |
| Workspace de una plataforma gestionada | Agrupar ejecución y configuración remota | No |

No debes trasladar automáticamente las propiedades de una plataforma gestionada a los workspaces CLI.

### 5.2. Alcance

No utilizaremos HCP Terraform ni Terraform Enterprise.

### 5.3. Ejecución

Todos los planes y aplicaciones se ejecutarán desde el host.

---

## 6. El workspace `default`

Terraform dispone inicialmente del workspace `default`.

### 6.1. Características

- Existe como workspace inicial.
- Puede seleccionarse.
- Tiene su propio estado.
- No puede eliminarse mediante `workspace delete`.

### 6.2. Uso en esta práctica

Lo mantendremos sin recursos de aplicación.

### 6.3. Protección didáctica

La configuración impedirá aplicar las colas desde `default`.

### 6.4. Regla

No interpretes `default` como un alias automático de `dev`.

---

## 7. Qué separan los workspaces

Los workspaces mantienen relaciones de estado independientes.

### 7.1. Separación efectiva

Cada uno conserva sus propias:

- Direcciones administradas.
- Asociaciones con identificadores remotos.
- Observaciones de atributos.
- Salidas registradas.
- Revisiones del estado.

### 7.2. Direcciones iguales

`aws_sqs_queue.queue["jobs"]` puede existir en los tres estados.

### 7.3. Distinción

La misma dirección puede corresponder a tres colas distintas porque pertenece a estados diferentes.

---

## 8. Qué no separan automáticamente

Un workspace no constituye una frontera completa de aislamiento.

### 8.1. No crea por sí solo

- Otra cuenta AWS.
- Otras credenciales.
- Otra región.
- Otro contenedor LocalStack.
- Otra red.
- Otros nombres de recursos.
- Otras políticas de acceso.

### 8.2. Riesgo

Dos workspaces pueden intentar administrar objetos con el mismo nombre remoto.

### 8.3. Regla

**Estados independientes necesitan identidades remotas coherentes para representar recursos independientes.**

---

## 9. Cuándo resultan adecuados

Los workspaces son útiles para despliegues con estructura muy similar.

### 9.1. Ejemplos razonables

- Entornos temporales de pruebas.
- Variantes de una infraestructura pequeña.
- Laboratorios educativos.
- Despliegues paralelos con entradas controladas.
- Entornos con un mismo modelo de recursos.

### 9.2. Precaución

Cuantas más diferencias estructurales existan entre entornos, más difícil resulta mantener una configuración común.

### 9.3. Alternativas

Directorios raíz independientes pueden compartir módulos sin compartir todo el contexto operacional.

---

## 10. Cuándo conviene una separación más fuerte

Los workspaces no sustituyen decisiones sobre seguridad y gobierno.

### 10.1. Señales de alerta

Considera otra organización cuando existen:

- Equipos con permisos diferentes.
- Cuentas AWS distintas.
- Políticas de aprobación independientes.
- Arquitecturas muy diferentes.
- Requisitos estrictos de aislamiento.
- Ciclos de despliegue incompatibles.

### 10.2. Producción real

Puede necesitar estados, credenciales y procesos separados.

### 10.3. Regla

Selecciona una estrategia por sus garantías, no solamente por la comodidad de un comando.

---

## 11. Diseño del laboratorio

Cada entorno tendrá una cola de trabajos y una cola de auditoría.

### 11.1. Inventario previsto

| **Workspace** | **Colas** | **Visibilidad inicial** |
|---------------|-----------|------------------------|
| `dev` | `jobs`, `audit` | 30 segundos |
| `stage` | `jobs`, `audit` | 60 segundos |
| `prod` | `jobs`, `audit` | 90 segundos |

El total será de seis colas.

### 11.2. Sin consumidores

No conectaremos Lambda ni otros consumidores automáticos.

### 11.3. Datos de prueba

Cada cola de trabajos recibirá un mensaje ficticio identificando su entorno.

---

## 12. Arquitectura de estados

El backend S3 utilizará una key base y un prefijo explícito para workspaces.

### 12.1. Organización

```text
Bucket de estado
└── environments/
    ├── dev/app/terraform.tfstate
    ├── stage/app/terraform.tfstate
    └── prod/app/terraform.tfstate
```

### 12.2. Estado predeterminado

El workspace `default` utiliza la key base, fuera del prefijo de los otros workspaces.

### 12.3. Bloqueo

Cada estado tendrá su archivo de bloqueo asociado cuando una operación lo necesite.

### 12.4. Regla

Los bloqueos de estados distintos no coordinan recursos remotos compartidos entre esos estados.

---

## 13. Preparación del directorio

Trabaja en una carpeta independiente.

### 13.1. Estructura

```bash
mkdir -p terraform-workspaces/app/environments
mkdir -p terraform-workspaces/planes
mkdir -p terraform-workspaces/resultados
mkdir -p terraform-workspaces/copias
mkdir -p terraform-workspaces/scripts
cd terraform-workspaces
```

### 13.2. Ejecución

Salvo indicación expresa, ejecuta los comandos desde esta raíz.

### 13.3. Aislamiento

No copies estados ni metadatos de inicialización de otra práctica.

### 13.4. Organización

`app` contendrá la configuración Terraform compartida.

---

## 14. Protección de archivos

Separa material versionable y artefactos operativos.

### 14.1. `.gitignore`

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
app-observer/
crash.log
```

### 14.2. Qué conservar

Versiona configuración, entradas ficticias, scripts y `.terraform.lock.hcl`.

### 14.3. Precaución

Planes y copias pueden contener información sensible en proyectos reales.

---

## 15. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 15.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 15.2. `compose.yaml`

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

### 15.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 16. Credenciales y conectividad

Prepara la terminal antes de utilizar AWS CLI o Terraform.

### 16.1. Configuración

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_SQS
unset TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 16.2. Comprobación

Consulta `s3api list-buckets` y `sqs list-queues` mediante `aws_local`.

---

## 17. Identidad del alumno y del backend

Define nombres exclusivos para esta práctica.

### 17.1. Variables operativas

```bash
export SUFFIX=alumno01
export STATE_BUCKET="curso-workspaces-state-${SUFFIX}"
export STATE_KEY="app/terraform.tfstate"
export WORKSPACE_PREFIX="environments"
```

### 17.2. Entorno compartido

Cada alumno necesita un sufijo distinto si utiliza el mismo LocalStack.

### 17.3. Consistencia

El sufijo también aparecerá en las entradas comunes de Terraform.

### 17.4. Precaución

No utilices un bucket que ya pertenezca a otro proyecto.

---

## 18. Sesión 1: preparar el backend

Duración orientativa: 15 minutos.

### 18.1. Bucket y versionado

```bash
aws_local s3api create-bucket \
  --bucket "$STATE_BUCKET"

aws_local s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws_local s3api get-bucket-versioning \
  --bucket "$STATE_BUCKET"
```

### 18.2. Resultado esperado

El bucket existe y el versionado está habilitado.

### 18.3. Bootstrap

AWS CLI prepara el backend antes de que Terraform lo utilice.

---

## 19. Configuración parcial del backend

Crea `app/backend.tf` y el archivo local de parámetros.

### 19.1. Declaración

```hcl
terraform {
  backend "s3" {}
}
```

### 19.2. `backend.local.hcl`

```bash
cat > backend.local.hcl <<EOF
bucket = "${STATE_BUCKET}"
key    = "${STATE_KEY}"
region = "us-east-1"

workspace_key_prefix = "${WORKSPACE_PREFIX}"
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

---

## 20. Interpretar las rutas del backend

El prefijo permite predecir la ubicación de cada estado no predeterminado.

### 20.1. Rutas del laboratorio

| **Workspace** | **Key del estado** |
|---------------|--------------------|
| `default` | `app/terraform.tfstate` |
| `dev` | `environments/dev/app/terraform.tfstate` |
| `stage` | `environments/stage/app/terraform.tfstate` |
| `prod` | `environments/prod/app/terraform.tfstate` |

El archivo de bloqueo añade `.tflock` a la key correspondiente.

### 20.2. Prefijo explícito

Esta práctica utiliza `environments`, no el prefijo predeterminado del backend.

### 20.3. Regla

No cambies el prefijo de un backend existente como si fuera una etiqueta decorativa.

---

## 21. Requisitos y proveedor

Crea `app/versions.tf` y `app/providers.tf`.

### 21.1. Requisitos

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

### 21.2. Proveedor

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

---

## 22. Variables de entrada

Crea `app/variables.tf` con valores explícitos y validaciones.

### 22.1. Identidad y entorno esperado

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "expected_environment" {
  type     = string
  nullable = false

  validation {
    condition     = contains(["dev", "stage", "prod"], var.expected_environment)
    error_message = "Selecciona dev, stage o prod."
  }
}
```

### 22.2. Propósito

`expected_environment` comprobará que el archivo de entradas corresponde al workspace seleccionado.

---

## 23. Variables de comportamiento

Completa `app/variables.tf`.

### 23.1. Atributos SQS

```hcl
variable "visibility_timeout_seconds" {
  type = number

  validation {
    condition = (
      var.visibility_timeout_seconds >= 0 &&
      var.visibility_timeout_seconds <= 43200 &&
      floor(var.visibility_timeout_seconds) == var.visibility_timeout_seconds
    )
    error_message = "Usa un entero válido para la visibilidad SQS."
  }
}

variable "message_retention_seconds" {
  type = number

  validation {
    condition = (
      var.message_retention_seconds >= 60 &&
      var.message_retention_seconds <= 1209600 &&
      floor(var.message_retention_seconds) == var.message_retention_seconds
    )
    error_message = "Usa una retención SQS válida."
  }
}
```

---

## 24. Entradas comunes y específicas

Cada archivo de entorno declarará sus valores completos.

### 24.1. `app/terraform.tfvars`

```hcl
suffix = "alumno01"
```

### 24.2. `app/environments/dev.tfvars`

```hcl
expected_environment        = "dev"
visibility_timeout_seconds  = 30
message_retention_seconds   = 86400
```

### 24.3. `app/environments/stage.tfvars`

```hcl
expected_environment        = "stage"
visibility_timeout_seconds  = 60
message_retention_seconds   = 172800
```

### 24.4. `app/environments/prod.tfvars`

```hcl
expected_environment        = "prod"
visibility_timeout_seconds  = 90
message_retention_seconds   = 345600
```

---

## 25. Carga de archivos de variables

Terraform no selecciona automáticamente un archivo por el nombre del workspace.

### 25.1. Carga automática

`terraform.tfvars` se carga desde el directorio de configuración.

### 25.2. Carga explícita

Los archivos del subdirectorio `environments` se proporcionarán mediante `-var-file`.

### 25.3. Precaución

Un archivo llamado `prod.tfvars` no se aplica automáticamente al seleccionar `prod`.

### 25.4. Regla

Selecciona workspace y entradas como dos acciones relacionadas, pero distintas.

### 25.5. Protección adicional

La precondición de los recursos rechazará combinaciones incoherentes.

---

## 26. Recursos compartidos por estructura

Crea `app/main.tf` con dos instancias por workspace.

### 26.1. Configuración

```hcl
resource "aws_sqs_queue" "queue" {
  for_each = toset(["jobs", "audit"])

  name = "curso-ws-${var.suffix}-${terraform.workspace}-${each.key}"

  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds

  tags = {
    Laboratory = "LocalStack"
    Environment = terraform.workspace
    Role        = each.key
    ManagedBy   = "Terraform"
  }

  lifecycle {
    precondition {
      condition = (
        contains(["dev", "stage", "prod"], terraform.workspace) &&
        terraform.workspace == var.expected_environment
      )
      error_message = "Workspace y archivo de entorno no coinciden, o se seleccionó default."
    }
  }
}
```

---

## 27. Por qué existe la precondición

La validación convierte una convención operacional en una comprobación del plan.

### 27.1. Casos que bloquea

- Seleccionar `dev` y cargar entradas de `prod`.
- Seleccionar `stage` y cargar entradas de `dev`.
- Intentar crear colas desde `default`.
- Utilizar un workspace no previsto por esta práctica.

### 27.2. Límite

No es un mecanismo de autorización.

Una persona con capacidad de editar la configuración puede modificar la comprobación.

### 27.3. Regla

Utiliza guardas para reducir errores, no para reemplazar controles de acceso.

---

## 28. Outputs por workspace

Crea `app/outputs.tf` para inspeccionar identidad y comportamiento.

### 28.1. Configuración

```hcl
output "environment" {
  value = terraform.workspace
}

output "queue_urls" {
  value = {
    for role, queue in aws_sqs_queue.queue : role => queue.id
  }
}

output "queue_names" {
  value = {
    for role, queue in aws_sqs_queue.queue : role => queue.name
  }
}

output "visibility_timeout_seconds" {
  value = var.visibility_timeout_seconds
}
```

### 28.2. Distinción

Las salidas consultadas pertenecen al estado seleccionado, no a todos los workspaces.

---

## 29. Sesión 2: inicializar e inspeccionar

Duración orientativa: 15 minutos.

### 29.1. Comandos

```bash
terraform -chdir=app init \
  -backend-config=../backend.local.hcl

terraform -chdir=app fmt -recursive
terraform -chdir=app validate
terraform -chdir=app workspace list
terraform -chdir=app workspace show
```

### 29.2. Resultado esperado

Inicialmente debe estar seleccionado `default`.

### 29.3. Advertencia

Todavía no ejecutes una aplicación.

### 29.4. Objetivo

Primero crearás y seleccionarás `dev`.

---

## 30. Sesión 3: crear y desplegar `dev`

`workspace new` crea el workspace y lo selecciona.

### 30.1. Secuencia

```bash
terraform -chdir=app workspace new dev
terraform -chdir=app workspace show

terraform -chdir=app plan \
  -var-file=environments/dev.tfvars \
  -out=../planes/dev-create.tfplan

terraform -chdir=app show ../planes/dev-create.tfplan
terraform -chdir=app apply ../planes/dev-create.tfplan
```

### 30.2. Resultado esperado

Se crean dos colas con `-dev-` en sus nombres.

### 30.3. Plan guardado

Las entradas utilizadas ya forman parte del plan; no añadas otro `-var-file` al aplicarlo.

---

## 31. Guardar evidencia de `dev`

Conserva las salidas y el estado antes de cambiar de workspace.

### 31.1. Comandos

```bash
umask 077

terraform -chdir=app output -json \
  > resultados/dev-outputs.json

terraform -chdir=app state pull \
  > copias/dev-state.tfstate

DEV_JOBS="$(jq -er '.queue_urls.value.jobs' resultados/dev-outputs.json)"
DEV_AUDIT="$(jq -er '.queue_urls.value.audit' resultados/dev-outputs.json)"
```

### 31.2. Verificación independiente

Consulta atributos y etiquetas de `DEV_JOBS`.

### 31.3. Regla

No reutilices una variable llamada simplemente `QUEUE_URL` para todos los entornos sin registrar su origen.

---

## 32. Sesión 4: crear y desplegar `stage`

El nuevo workspace empieza con relaciones independientes.

### 32.1. Secuencia

```bash
terraform -chdir=app workspace new stage

terraform -chdir=app plan \
  -var-file=environments/stage.tfvars \
  -out=../planes/stage-create.tfplan

terraform -chdir=app show ../planes/stage-create.tfplan
terraform -chdir=app apply ../planes/stage-create.tfplan

terraform -chdir=app output -json \
  > resultados/stage-outputs.json
```

### 32.2. Resultado esperado

Se crean otras dos colas, ahora con `-stage-` en sus nombres.

### 32.3. Independencia

No debe actualizar ni destruir las colas de `dev`.

---

## 33. Sesión 5: crear y desplegar `prod`

Este workspace representa únicamente una simulación de producción.

### 33.1. Secuencia

```bash
terraform -chdir=app workspace new prod

terraform -chdir=app plan \
  -var-file=environments/prod.tfvars \
  -out=../planes/prod-create.tfplan

terraform -chdir=app show ../planes/prod-create.tfplan
terraform -chdir=app apply ../planes/prod-create.tfplan

terraform -chdir=app output -json \
  > resultados/prod-outputs.json
```

### 33.2. Resultado esperado

Existen seis colas de aplicación en total.

### 33.3. Precaución

El nombre del workspace no aporta permisos especiales ni protecciones automáticas.

---

## 34. Sesión 6: enumerar y seleccionar

La selección debe formar parte explícita de cada procedimiento.

### 34.1. Comandos

```bash
terraform -chdir=app workspace list
terraform -chdir=app workspace select dev
terraform -chdir=app workspace show

terraform -chdir=app state list
terraform -chdir=app output
```

### 34.2. Resultado

El listado de estado debe contener solo dos recursos de `dev`.

### 34.3. Marca de selección

El listado de workspaces señala cuál está seleccionado.

### 34.4. Regla

Comprueba el workspace antes de planificar, aplicar, importar, mover o destruir.

---

## 35. Comprobar direcciones e identificadores

Las direcciones son iguales en estructura, pero los IDs son diferentes.

### 35.1. Direcciones en cada estado

```text
aws_sqs_queue.queue["audit"]
aws_sqs_queue.queue["jobs"]
```

### 35.2. Consulta concreta

```bash
terraform -chdir=app state show \
  'aws_sqs_queue.queue["jobs"]'
```

### 35.3. Identidad

En `dev`, debe mostrar la URL de la cola de desarrollo.

Al seleccionar `stage`, la misma dirección corresponde a la cola de staging.

### 35.4. Regla

Una dirección sin contexto de estado no identifica universalmente un recurso remoto.

---

## 36. Sesión 7: demostrar separación de mensajes

Cada cola de trabajos recibirá un mensaje propio.

### 36.1. Obtener URLs

```bash
STAGE_JOBS="$(jq -er '.queue_urls.value.jobs' resultados/stage-outputs.json)"
PROD_JOBS="$(jq -er '.queue_urls.value.jobs' resultados/prod-outputs.json)"
```

### 36.2. Envíos

```bash
aws_local sqs send-message \
  --queue-url "$DEV_JOBS" \
  --message-body '{"environment":"dev","marker":"DEV-001"}'

aws_local sqs send-message \
  --queue-url "$STAGE_JOBS" \
  --message-body '{"environment":"stage","marker":"STAGE-001"}'

aws_local sqs send-message \
  --queue-url "$PROD_JOBS" \
  --message-body '{"environment":"prod","marker":"PROD-001"}'
```

---

## 37. Verificar los mensajes por cola

Consulta cada URL sin depender del workspace seleccionado.

### 37.1. Ejemplo para `dev`

```bash
aws_local sqs receive-message \
  --queue-url "$DEV_JOBS" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  > resultados/dev-message.json

jq -r '.Messages[0].Body | fromjson | .environment' \
  resultados/dev-message.json
```

### 37.2. Repetición

Realiza la misma consulta para `stage` y `prod`.

### 37.3. Resultado esperado

Cada cola devuelve únicamente el mensaje de su entorno en este laboratorio.

### 37.4. Precaución

Recibir cambia temporalmente la visibilidad; no elimina el mensaje.

---

## 38. Sesión 8: inspeccionar estados en S3

Los workspaces no predeterminados utilizan rutas distintas.

### 38.1. Consulta

```bash
aws_local s3api list-objects-v2 \
  --bucket "$STATE_BUCKET" \
  --prefix "${WORKSPACE_PREFIX}/" \
  > resultados/backend-current-objects.json

jq -r '.Contents[]?.Key' \
  resultados/backend-current-objects.json
```

### 38.2. Resultado esperado

Deben aparecer las tres keys de estado previstas.

### 38.3. Bloqueos

Los archivos `.tflock` pueden aparecer durante operaciones activas.

### 38.4. Regla

No confundas un bloqueo temporal con un workspace adicional.

---

## 39. Comparar contenido y metadatos

Cada estado conserva relaciones independientes.

### 39.1. Descarga de `dev`

```bash
aws_local s3api get-object \
  --bucket "$STATE_BUCKET" \
  --key environments/dev/app/terraform.tfstate \
  resultados/dev-state-from-s3.tfstate \
  > resultados/dev-download-metadata.json

jq '{lineage, serial, terraform_version}' \
  resultados/dev-state-from-s3.tfstate
```

### 39.2. Repetición

Descarga también los estados de `stage` y `prod`.

### 39.3. Interpretación

Compara relaciones, IDs y metadatos; no utilices el serial para comparar “qué entorno es más importante”.

### 39.4. Seguridad

Estas descargas deben mantenerse fuera del repositorio.

---

## 40. Sesión 9: rechazar entradas incompatibles

La precondición debe detectar un archivo de entorno incorrecto.

### 40.1. Prueba negativa

```bash
terraform -chdir=app workspace select dev

terraform -chdir=app plan \
  -var-file=environments/prod.tfvars
```

### 40.2. Resultado esperado

El plan debe fallar porque `dev` no coincide con `expected_environment = "prod"`.

### 40.3. Evidencia

Conserva el error y comprueba que no se modificó ninguna cola.

### 40.4. Regla

Un rechazo de validación no debe resolverse eliminando la guarda sin investigar el contexto.

---

## 41. Sesión 10: impedir despliegues en `default`

El workspace predeterminado queda reservado como posición neutral.

### 41.1. Prueba

```bash
terraform -chdir=app workspace select default

terraform -chdir=app plan \
  -var-file=environments/dev.tfvars
```

### 41.2. Resultado esperado

La precondición debe rechazar el plan.

### 41.3. Verificación

Selecciona de nuevo `dev` antes de continuar.

### 41.4. Alcance

Esta protección pertenece a la configuración del laboratorio, no a una propiedad automática de Terraform.

---

## 42. Sesión 11: cambiar únicamente `dev`

Ahora comprobarás una modificación específica del entorno.

### 42.1. Cambio

En `app/environments/dev.tfvars`, cambia la visibilidad de 30 a 45 segundos.

### 42.2. Plan y aplicación

```bash
terraform -chdir=app workspace select dev

terraform -chdir=app plan \
  -var-file=environments/dev.tfvars \
  -out=../planes/dev-update.tfplan

terraform -chdir=app show ../planes/dev-update.tfplan
terraform -chdir=app apply ../planes/dev-update.tfplan
```

### 42.3. Resultado

Las dos colas de `dev` se actualizan; sus URLs permanecen iguales.

---

## 43. Verificar que otros entornos no cambiaron

La independencia debe demostrarse mediante las API de servicio.

### 43.1. Consultas

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$DEV_JOBS" \
  --attribute-names VisibilityTimeout

aws_local sqs get-queue-attributes \
  --queue-url "$STAGE_JOBS" \
  --attribute-names VisibilityTimeout

aws_local sqs get-queue-attributes \
  --queue-url "$PROD_JOBS" \
  --attribute-names VisibilityTimeout
```

### 43.2. Resultado esperado

`dev` muestra 45, `stage` conserva 60 y `prod` conserva 90.

### 43.3. Regla

Un plan de `dev` no evalúa automáticamente el estado de `stage` ni el de `prod`.

---

## 44. Sesión 12: cambio común con aplicación separada

Los archivos compartidos afectan a todos los entornos cuando se aplican.

### 44.1. Cambio de configuración

Añade una etiqueta común a las colas:

```hcl
CourseUnit = "workspaces"
```

### 44.2. Aplicación progresiva

Selecciona `dev`, revisa y aplica su plan.

Después repite el procedimiento para `stage` y `prod`, con sus archivos de entradas.

### 44.3. Observación

Antes de aplicar cada entorno, sus recursos todavía pueden conservar las etiquetas anteriores.

### 44.4. Regla

Compartir HCL no convierte tres aplicaciones independientes en una transacción global.

---

## 45. Planes guardados y contexto operacional

Un plan contiene decisiones preparadas bajo un estado y unas entradas concretas.

### 45.1. Convención de nombres

Utiliza nombres como:

```text
dev-update.tfplan
stage-update.tfplan
prod-update.tfplan
```

### 45.2. Precaución

No dependas únicamente del nombre del archivo para verificar su procedencia.

Revisa su contenido y mantén el workspace correcto al aplicarlo.

### 45.3. Antigüedad

Cambios de estado pueden volver incompatible un plan guardado.

### 45.4. Regla

Descarta y vuelve a planificar cuando el contexto no sea inequívoco.

---

## 46. Directorios y selección local

La selección de workspace se conserva en el contexto local de inicialización.

### 46.1. Consecuencia

Dos directorios conectados al mismo backend pueden tener workspaces seleccionados diferentes.

### 46.2. No es global

Cambiar de workspace en un directorio no selecciona automáticamente el mismo en todos los demás.

### 46.3. Precaución adicional

Dos terminales sobre el mismo directorio comparten archivos locales de selección.

### 46.4. Regla

No alternes workspaces concurrentemente desde el mismo directorio durante operaciones sensibles.

### 46.5. Equipo

Utiliza directorios independientes y comprobaciones explícitas de contexto.

---

## 47. `TF_WORKSPACE` en automatización

La variable de entorno puede seleccionar un workspace para una ejecución.

### 47.1. Ejemplo aislado

```bash
TF_WORKSPACE=dev terraform -chdir=app workspace show

TF_WORKSPACE=dev terraform -chdir=app plan \
  -var-file=environments/dev.tfvars
```

### 47.2. Condición

El workspace debe existir y el backend debe estar inicializado correctamente.

### 47.3. Riesgo

Una variable exportada anteriormente puede cambiar el contexto que esperabas seleccionar de forma interactiva.

### 47.4. Regla

En la práctica manual, mantén `TF_WORKSPACE` sin definir y comprueba siempre el workspace efectivo.

---

## 48. Script de planificación por entorno

Un script puede reducir errores repetitivos sin reemplazar la revisión humana.

### 48.1. `scripts/plan-environment.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENVIRONMENT="${1:?Indica dev, stage o prod}"
case "$ENVIRONMENT" in
  dev|stage|prod) ;;
  *) echo "Entorno no permitido." >&2; exit 1 ;;
esac

unset TF_WORKSPACE

terraform -chdir=app workspace select "$ENVIRONMENT"

ACTUAL="$(terraform -chdir=app workspace show)"
[[ "$ACTUAL" == "$ENVIRONMENT" ]] || exit 1

terraform -chdir=app plan \
  -input=false \
  -var-file="environments/${ENVIRONMENT}.tfvars" \
  -out="../planes/${ENVIRONMENT}-review.tfplan"
```

---

## 49. Utilizar el script con revisión

La automatización prepara un plan, pero no lo aplica automáticamente.

### 49.1. Ejemplo

```bash
bash -n scripts/plan-environment.sh
bash scripts/plan-environment.sh stage

terraform -chdir=app show \
  ../planes/stage-review.tfplan
```

### 49.2. Aplicación

Comprueba de nuevo el workspace antes de aplicar el plan revisado.

### 49.3. Límite

El script cambia la selección del directorio `app`.

### 49.4. Regla

No lo ejecutes en paralelo con otra operación que utiliza el mismo directorio.

---

## 50. Workspace nuevo frente a copia de un estado

Crear un workspace no significa clonar la infraestructura de otro.

### 50.1. Creación normal

Un workspace nuevo comienza sin las relaciones administradas de `dev`, `stage` o `prod`.

### 50.2. Peligro de copiar

Copiar el estado de `dev` a `stage` puede hacer que ambos administren las mismas colas.

### 50.3. Resultado

Cambios de nombres podrían provocar reemplazos o decisiones incompatibles.

### 50.4. Regla

No utilices una copia de estado para crear entornos independientes.

### 50.5. Procedimiento correcto

Comparte configuración y entradas coherentes; crea recursos independientes mediante un plan nuevo.

---

## 51. Renombrado, migración e importación

Un workspace no se renombra cambiando una etiqueta ni ejecutando un bloque `moved`.

### 51.1. Direcciones

Los bloques `moved` reorganizan direcciones dentro del contexto de un estado.

### 51.2. Workspaces

Cambiar nombres o rutas de workspace requiere un procedimiento distinto y cuidadosamente coordinado.

### 51.3. Nombres remotos

En este laboratorio, `terraform.workspace` forma parte del nombre de cada cola.

Un cambio de nombre de entorno también altera la intención sobre los nombres remotos.

### 51.4. Regla

No presentes una migración de entorno como una refactorización trivial de direcciones.

---

## 52. Diagnóstico de errores frecuentes

Un error de contexto puede parecer un problema del proveedor.

### 52.1. Lista de revisión

Comprueba:

- Directorio de trabajo.
- Workspace efectivo.
- Variable `TF_WORKSPACE`.
- Archivo de entradas.
- Sufijo del alumno.
- Bucket y key del backend.
- Prefijo de workspaces.
- Región y endpoints.
- Nombres de recursos.

### 52.2. Regla

No importes ni desvincules recursos para corregir una selección equivocada sin investigar primero.

---

## 53. Comparación con una organización por directorios

La separación por workspaces es una opción, no una obligación.

### 53.1. Alternativas

| **Estrategia** | **Ventaja principal** | **Coste o límite** |
|----------------|----------------------|-------------------|
| Workspaces CLI | Reutilización directa de una raíz | Contexto de selección sensible |
| Directorios raíz por entorno | Entradas y backend explícitos | Más archivos de composición |
| Cuentas separadas | Frontera de permisos más fuerte | Mayor administración |
| Módulos compartidos | Reutilización de estructura | Requiere diseñar interfaces |

Estas estrategias pueden combinarse.

### 53.2. Producción real

Las cuentas separadas pueden convivir con módulos comunes y estados independientes.

### 53.3. Regla

Prioriza aislamiento, claridad operacional y responsabilidad sobre la reducción de archivos.

---

## 54. Sesión 13: preparar la destrucción

La limpieza debe recorrer todos los estados que contienen recursos.

### 54.1. Copias por entorno

```bash
for ENVIRONMENT in dev stage prod; do
  terraform -chdir=app workspace select "$ENVIRONMENT"

  terraform -chdir=app state pull \
    > "copias/${ENVIRONMENT}-before-destroy.tfstate"
done
```

### 54.2. Precaución

Este bucle solo inspecciona y copia; no destruye automáticamente.

### 54.3. Datos

La destrucción de cada cola elimina sus mensajes pendientes.

### 54.4. Regla

Mantén LocalStack y el backend disponibles durante toda la limpieza de recursos.

---

## 55. Destruir cada entorno con revisión

La destrucción debe prepararse y aprobarse por separado.

### 55.1. Ejemplo para `dev`

```bash
terraform -chdir=app workspace select dev

terraform -chdir=app plan -destroy \
  -var-file=environments/dev.tfvars \
  -out=../planes/dev-destroy.tfplan

terraform -chdir=app show ../planes/dev-destroy.tfplan
terraform -chdir=app apply ../planes/dev-destroy.tfplan

terraform -chdir=app state list
```

### 55.2. Repetición

Realiza el mismo procedimiento para `stage` y `prod` con sus entradas y planes correspondientes.

### 55.3. Resultado

Cada estado debe quedar sin recursos administrados.

---

## 56. Eliminar workspaces vacíos

Un workspace debe dejar de contener recursos antes de retirarlo normalmente.

### 56.1. Secuencia

```bash
terraform -chdir=app workspace select default

terraform -chdir=app workspace delete dev
terraform -chdir=app workspace delete stage
terraform -chdir=app workspace delete prod

terraform -chdir=app workspace list
aws_local sqs list-queues
```

### 56.2. Resultado esperado

Solo permanece `default` y desaparecen las seis colas del laboratorio.

### 56.3. Precaución

No utilices `workspace delete -force` para evitar destruir recursos todavía administrados.

---

## 57. Versiones históricas y cierre del backend

Eliminar un workspace no elimina necesariamente todas las versiones históricas de sus objetos S3.

### 57.1. Inventario final

```bash
aws_local s3api list-object-versions \
  --bucket "$STATE_BUCKET" \
  > resultados/final-backend-versions.json
```

### 57.2. Limpieza controlada

Revisa las versiones y los delete markers del bucket dedicado.

Elimina cada entrada mediante su key y `VersionId` exactos antes de eliminar el bucket.

### 57.3. Cierre

Después de limpiar el bucket, ejecuta `delete-bucket` y `docker compose down`.

### 57.4. Regla

No vuelvas a operar contra ese backend eliminado; una reutilización necesita inicialización y almacenamiento válidos.

---

## 58. Diferencias respecto a AWS real

La emulación permite practicar separación de estados, no certificar aislamiento de producción.

### 58.1. Aspectos adicionales

En AWS real revisa cuentas, IAM, políticas, cifrado, cuotas, costes y auditoría.

### 58.2. Fronteras de seguridad

Workspaces que comparten credenciales pueden compartir capacidad de acceso al backend y a los servicios.

### 58.3. Persistencia local

Eliminar LocalStack puede hacer desaparecer recursos y estados almacenados en su S3.

### 58.4. Bloqueo

La semántica del bloqueo debe validarse para la imagen utilizada.

### 58.5. Límite

Ni los workspaces ni el estado son backups de mensajes o aplicaciones.

---

## 59. Ejercicios y criterios de evaluación

La evaluación debe demostrar separación efectiva y contexto operacional correcto.

### 59.1. Ejercicios

1. Despliega los tres workspaces.
2. Identifica las seis URLs y las tres rutas S3.
3. Rechaza un archivo de entradas incompatible.
4. Modifica únicamente `dev`.
5. Aplica una etiqueta común por etapas.
6. Explica el riesgo de copiar un estado.
7. Compara workspaces y directorios independientes.
8. Destruye todos los entornos y elimina los workspaces vacíos.

### 59.2. Entrega

Incluye configuración, planes revisados, inventario por entorno y evidencias de limpieza.

### 59.3. Explicación

Justifica qué aislamiento aporta el laboratorio y qué garantías quedan fuera de su alcance.

---

## 60. Resumen de la lección

Los workspaces permiten reutilizar una configuración con estados independientes.

### 60.1. Ideas esenciales

- Seleccionar un workspace selecciona un estado.
- Los nombres remotos deben distinguir entornos.
- Los archivos de entradas necesitan selección explícita.
- El backend organiza rutas diferentes por workspace.
- Los bloqueos no coordinan estados independientes.
- Los cambios comunes se aplican por entorno.
- La limpieza debe recorrer todos los estados.
- Producción puede necesitar fronteras de seguridad más fuertes.

### 60.2. Procedimiento recomendado

Comprueba contexto, selecciona entradas, revisa el plan y verifica recursos mediante su API.

### 60.3. Idea final

**Una separación de entornos fiable necesita más que varios workspaces: requiere identidad coherente, entradas verificadas, estados protegidos y procedimientos que hagan evidente dónde se está operando.**