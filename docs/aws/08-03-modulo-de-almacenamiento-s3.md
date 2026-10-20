# Módulo de almacenamiento S3 con Terraform y LocalStack

Un módulo de almacenamiento S3 permite convertir varias decisiones de infraestructura en una interfaz reutilizable.

Crear un bucket es solo una parte del trabajo.

También necesitas decidir cómo gestionar versiones, cifrado, propiedad de objetos, acceso público y eliminación de datos.

En esta lección construirás un módulo personalizado que agrupa esos controles sin ocultar sus consecuencias.

Después lo utilizarás para desplegar dos buckets independientes en LocalStack.

Las sesiones incluyen carga de archivos, consulta de configuración, recuperación de versiones, pruebas del contrato y limpieza de buckets versionados.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los buckets de esta práctica almacenan datos de ejemplo, no el estado remoto de Terraform.

---

## 1. Objetivos de aprendizaje

Esta lección aplica el diseño de módulos a un servicio de almacenamiento.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diseñar una interfaz de almacenamiento.
- Crear buckets mediante un módulo.
- Configurar versionado y cifrado predeterminado.
- Gestionar propiedad y acceso público.
- Definir una regla opcional de ciclo de vida.
- Publicar identificadores y configuración efectiva.
- Verificar resultados mediante AWS CLI.
- Limpiar versiones y delete markers.

### 1.2. Resultado práctico

Desplegarás dos buckets con estados de versionado diferentes y comprobarás su comportamiento.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, variables y S3.

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

### 2.3. Entorno de ejecución

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad que debe validar el docente

El laboratorio depende de operaciones cuya emulación debe comprobarse.

### 3.1. Operaciones obligatorias

Valida:

- Creación y eliminación de buckets.
- Configuración de versionado.
- Consulta de cifrado.
- Configuración de propiedad.
- Configuración de bloqueo público.
- Escritura y lectura de objetos.
- Enumeración de versiones y delete markers.
- Eliminación de versiones concretas.

### 3.2. Operaciones adicionales

Valida la API de ciclo de vida y las pruebas Terraform.

### 3.3. Registro

Documenta versiones, edición e imagen o digest de LocalStack utilizados.

---

## 4. Alcance del módulo

El módulo representará un bucket privado con controles básicos de almacenamiento.

### 4.1. Recursos incluidos

Agrupará:

- Bucket S3.
- Configuración de versionado.
- Cifrado predeterminado AES256.
- Controles de propiedad.
- Bloqueo de acceso público.
- Ciclo de vida opcional.

### 4.2. Fuera de alcance

No creará usuarios, funciones Lambda, notificaciones, replicación ni claves KMS.

### 4.3. Regla principal

**Un módulo debe expresar una responsabilidad comprensible, no todas las capacidades posibles de S3.**

---

## 5. Módulo raíz y módulo hijo

La raíz compone el despliegue y el módulo hijo implementa el almacenamiento.

### 5.1. Comparación

| **Elemento** | **Responsabilidad** | **Ubicación** |
|--------------|---------------------|---------------|
| Raíz | Configurar proveedor y consumidores | Directorio principal |
| Módulo S3 | Implementar controles del bucket | `modules/storage` |
| Entradas | Expresar decisiones | Variables del módulo |
| Outputs | Publicar resultados | Contrato de almacenamiento |
| Estado | Registrar todos los recursos | Backend local de la raíz |

El módulo hijo no obtiene automáticamente un estado independiente.

### 5.2. Composición

Sus recursos forman parte del estado de la raíz.

### 5.3. Consecuencia

Destruir la raíz puede destruir ambos buckets.

---

## 6. Infraestructura y contenido

La configuración de un bucket y sus objetos tienen ciclos de vida diferentes.

### 6.1. En esta práctica

Terraform administrará los buckets y sus controles.

AWS CLI cargará y consultará los archivos.

### 6.2. Estado

Los objetos cargados mediante CLI no aparecerán como recursos Terraform.

### 6.3. Eliminación

Aunque Terraform no administre esos objetos, su presencia puede impedir eliminar el bucket.

### 6.4. Regla

**No administrar un objeto en el estado no significa que su existencia sea irrelevante para la destrucción.**

---

## 7. Diseño de la interfaz

La entrada principal será un objeto `storage`.

### 7.1. Atributos

| **Atributo** | **Propósito** | **Default** |
|--------------|---------------|-------------|
| `name` | Identificar el bucket | Obligatorio |
| `versioning_enabled` | Seleccionar versionado | `true` |
| `force_destroy` | Permitir vaciado por el proveedor | `false` |
| `tags` | Etiquetas comunes | `{}` |
| `noncurrent_expiration_days` | Expirar versiones no actuales | `null` |

El módulo fijará otros controles como parte de su política inicial.

### 7.2. Decisión explícita

El cifrado será AES256, no KMS.

### 7.3. Evolución

Otras estrategias requieren ampliar el contrato y sus pruebas.

---

## 8. Contrato de salida

El módulo publicará un objeto `contract`.

### 8.1. Información incluida

Contendrá:

- Nombre del bucket.
- ARN.
- Estado configurado de versionado.
- Algoritmo de cifrado.
- Modelo de propiedad.
- Indicador de bloqueo público.
- Política de destrucción.
- Expiración no actual configurada.

### 8.2. Distinción

Algunos campos describen intención configurada.

### 8.3. Verificación

La API del servicio permitirá contrastar esa intención.

---

## 9. Nombres de buckets

Los nombres remotos forman parte de la identidad de la infraestructura.

### 9.1. Restricción didáctica

El módulo admitirá nombres con:

- Minúsculas.
- Dígitos.
- Guiones interiores.
- Longitud entre 3 y 63 caracteres.
- Inicio y final alfanuméricos.

### 9.2. Simplificación

No admitiremos puntos aunque S3 permita determinados nombres con puntos.

### 9.3. AWS real

También existen restricciones de prefijos, sufijos y espacio de nombres.

---

## 10. Versionado: Enabled y Suspended

La opción booleana del módulo se traducirá a estados de configuración S3.

### 10.1. Interpretación

`true` configura `Enabled`.

`false` configura `Suspended`.

### 10.2. Diferencia importante

Suspender el versionado no elimina versiones históricas.

### 10.3. Bucket nuevo

La API puede diferenciar un bucket nunca versionado de uno con versionado suspendido.

### 10.4. Regla

Documentaremos la opción como suspensión, no como eliminación universal del versionado.

---

## 11. Versiones y delete markers

S3 puede conservar varias representaciones de una misma key.

### 11.1. Versiones

Cada escritura en un bucket versionado puede crear una versión distinta.

### 11.2. Eliminación lógica

Eliminar una key sin especificar versión puede crear un delete marker.

### 11.3. Lectura habitual

Una lectura sin `VersionId` utiliza la versión actual visible.

### 11.4. Regla

Un objeto aparentemente eliminado puede seguir teniendo versiones recuperables.

---

## 12. Cifrado predeterminado

El módulo solicitará cifrado del lado del servidor con AES256.

### 12.1. Configuración

Utilizaremos SSE-S3.

No necesitaremos una clave KMS administrada por el alumno.

### 12.2. Alcance

El cifrado predeterminado no constituye una política universal contra cualquier encabezado alternativo de carga.

### 12.3. Emulación

Una respuesta con metadatos de cifrado no demuestra por sí sola garantías criptográficas equivalentes a AWS.

### 12.4. Regla

Distingue configuración declarada y seguridad efectiva del almacenamiento.

---

## 13. Propiedad de objetos

El módulo utilizará `BucketOwnerEnforced`.

### 13.1. Propósito

El propietario del bucket controla la propiedad de los objetos mediante el modelo correspondiente de S3.

### 13.2. ACL

En AWS, este modo desactiva las ACL como mecanismo de autorización.

### 13.3. Laboratorio

No enviaremos ACL en las cargas.

### 13.4. Precaución

No mezcles este modelo con ejemplos que dependan de ACL públicas.

---

## 14. Bloqueo de acceso público

El módulo activará los cuatro controles habituales de bloqueo público.

### 14.1. Opciones

Configurará:

- `block_public_acls`.
- `ignore_public_acls`.
- `block_public_policy`.
- `restrict_public_buckets`.

### 14.2. Límite

Estos controles no equivalen a una política de autorización completa.

### 14.3. LocalStack

La aplicación efectiva de permisos debe validarse separadamente.

---

## 15. Ciclo de vida opcional

La regla opcional expirará versiones no actuales.

### 15.1. Activación

Un número de días crea la configuración de ciclo de vida.

`null` significa que el módulo no crea esa configuración.

### 15.2. No incluye

No expirará versiones actuales.

No configurará replicación ni archivado.

### 15.3. Precaución

La ejecución del ciclo de vida es asíncrona y no debe comprobarse esperando unos segundos.

---

## 16. Política de destrucción

La entrada `force_destroy` controla una decisión potencialmente destructiva.

### 16.1. Default seguro

Utilizaremos `false`.

Un bucket con contenido puede impedir la destrucción.

### 16.2. Opción alternativa

Con `true`, el proveedor puede vaciar contenido para eliminar el bucket.

### 16.3. Limitaciones

Permisos, retenciones u otros controles pueden impedir ese vaciado en AWS real.

### 16.4. Regla

No uses `force_destroy` como sustituto de una revisión de datos.

---

## 17. Arquitectura del laboratorio

Desplegaremos dos instancias del módulo.

### 17.1. Organización

```text
Configuración raíz
    ├── documents
    │    └── Bucket con versionado Enabled
    └── scratch
         └── Bucket con versionado Suspended
```

### 17.2. Configuración inicial

Ambos buckets tendrán AES256, propiedad reforzada y bloqueo público.

### 17.3. Ciclo de vida

Estará desactivado inicialmente en ambos.

---

## 18. Preparación del directorio

Trabaja en una carpeta independiente.

### 18.1. Estructura

```bash
mkdir -p terraform-storage-module/modules/storage
mkdir -p terraform-storage-module/tests
mkdir -p terraform-storage-module/scripts
mkdir -p terraform-storage-module/archivos
mkdir -p terraform-storage-module/planes
mkdir -p terraform-storage-module/resultados
mkdir -p terraform-storage-module/copias
cd terraform-storage-module
```

### 18.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 18.3. Aislamiento

No copies estados de otras lecciones.

---

## 19. Protección de archivos

Separa configuración y evidencias operativas.

### 19.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
planes/
resultados/
copias/
archivos/
crash.log
```

### 19.2. Qué conservar

Versiona módulo, composición, documentación, pruebas y `.terraform.lock.hcl`.

### 19.3. Datos

No cargues archivos personales ni secretos reales.

---

## 20. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 20.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3
      AWS_DEFAULT_REGION: us-east-1
```

### 20.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 21. Credenciales y conectividad

Prepara la terminal antes de ejecutar Terraform o AWS CLI.

### 21.1. Configuración

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 21.2. Comprobación

Ejecuta `aws_local s3api list-buckets` y espera una respuesta válida.

---

## 22. Requisitos del módulo hijo

Crea `modules/storage/versions.tf`.

### 22.1. Configuración

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

### 22.2. Dependencia

El módulo declara que utiliza el proveedor AWS.

### 22.3. Configuración

No contiene credenciales ni endpoints propios.

---

## 23. Entrada estructurada

Crea `modules/storage/variables.tf`.

### 23.1. Tipo y defaults

```hcl
variable "storage" {
  description = "Configuración de un bucket privado de almacenamiento."
  nullable    = false

  type = object({
    name                        = string
    versioning_enabled          = optional(bool, true)
    force_destroy               = optional(bool, false)
    tags                        = optional(map(string), {})
    noncurrent_expiration_days  = optional(number)
  })
```

### 23.2. Archivo incompleto

Completa el bloque con las validaciones siguientes.

### 23.3. Ausencia

Sin días de expiración, el atributo queda en `null`.

---

## 24. Validaciones del contrato

Añade las validaciones dentro de `storage` y cierra el bloque.

### 24.1. Reglas

```hcl
  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
      var.storage.name
    ))
    error_message = "Usa entre 3 y 63 caracteres: minúsculas, dígitos y guiones interiores."
  }

  validation {
    condition = var.storage.noncurrent_expiration_days == null ? true : (
      var.storage.versioning_enabled &&
      var.storage.noncurrent_expiration_days >= 1 &&
      var.storage.noncurrent_expiration_days <= 3650 &&
      floor(var.storage.noncurrent_expiration_days) == var.storage.noncurrent_expiration_days
    )
    error_message = "La expiración requiere versionado Enabled y un entero entre 1 y 3650 días."
  }
}
```

### 24.2. Límite propio

3650 es un límite didáctico del módulo, no una afirmación del máximo universal de S3.

---

## 25. Bucket y versionado

Crea `modules/storage/main.tf`.

### 25.1. Recursos

```hcl
resource "aws_s3_bucket" "this" {
  bucket        = var.storage.name
  force_destroy = var.storage.force_destroy

  tags = merge(var.storage.tags, {
    StorageModule = "standard-private"
  })
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.storage.versioning_enabled ? "Enabled" : "Suspended"
  }
}
```

### 25.2. Identidad

Cambiar `name` puede provocar reemplazo del bucket.

### 25.3. Regla

Revisa nombres como decisiones de identidad, no como simples etiquetas.

---

## 26. Cifrado y propiedad

Añade estos recursos a `modules/storage/main.tf`.

### 26.1. Configuración

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
```

### 26.2. Separación

Utilizamos recursos específicos del proveedor para gestionar cada configuración.

---

## 27. Acceso público

Añade el recurso de bloqueo a `modules/storage/main.tf`.

### 27.1. Configuración

```hcl
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 27.2. Alcance

No se crea una política de bucket para consumidores.

### 27.3. Regla

El acceso privado autorizado necesita diseñarse en la composición correspondiente.

---

## 28. Ciclo de vida opcional

Completa `modules/storage/main.tf`.

### 28.1. Regla

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count = var.storage.noncurrent_expiration_days == null ? 0 : 1

  bucket = aws_s3_bucket.this.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.storage.noncurrent_expiration_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.this]
}
```

### 28.2. Dependencia

La configuración de versionado debe aplicarse antes de esta regla.

---

## 29. Outputs del módulo

Crea `modules/storage/outputs.tf`.

### 29.1. Contrato público

```hcl
output "contract" {
  description = "Contrato v1 de almacenamiento; los controles publicados describen configuración."

  value = {
    contract_version = 1
    bucket_name      = aws_s3_bucket.this.id
    bucket_arn       = aws_s3_bucket.this.arn

    versioning_status = (
      var.storage.versioning_enabled ? "Enabled" : "Suspended"
    )

    encryption_algorithm       = "AES256"
    object_ownership           = "BucketOwnerEnforced"
    public_access_blocked      = true
    force_destroy              = var.storage.force_destroy
    noncurrent_expiration_days = var.storage.noncurrent_expiration_days
  }
}
```

### 29.2. Verificación

Contrasta estos valores con las API antes de afirmar cumplimiento.

---

## 30. Requisitos y proveedor raíz

Crea `versions.tf` y `providers.tf`.

### 30.1. Requisitos

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

### 30.2. Proveedor

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
    s3 = "http://localhost:4566"
  }
}
```

---

## 31. Variables raíz

Crea `variables.tf`.

### 31.1. Identidad y configuración

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "documents_noncurrent_days" {
  type    = number
  default = null
}
```

### 31.2. Validación delegada

El módulo comprobará el número de días cuando se proporcione.

### 31.3. Entorno compartido

Cada alumno debe utilizar un sufijo distinto.

---

## 32. Composición de los buckets

Crea `main.tf`.

### 32.1. Instancias

```hcl
module "documents" {
  source = "./modules/storage"

  storage = {
    name                       = "curso-storage-${var.suffix}-documents"
    noncurrent_expiration_days = var.documents_noncurrent_days
    tags = {
      Laboratory = "LocalStack"
      Purpose    = "documents"
    }
  }
}

module "scratch" {
  source = "./modules/storage"

  storage = {
    name               = "curso-storage-${var.suffix}-scratch"
    versioning_enabled = false
    tags = {
      Laboratory = "LocalStack"
      Purpose    = "scratch"
    }
  }
}
```

---

## 33. Entradas y resultados raíz

Crea `terraform.tfvars` y `outputs.tf`.

### 33.1. Entradas

```hcl
suffix                   = "alumno01"
documents_noncurrent_days = null
```

### 33.2. Outputs

```hcl
output "storage" {
  description = "Contratos de los buckets del laboratorio."

  value = {
    documents = module.documents.contract
    scratch   = module.scratch.contract
  }
}
```

### 33.3. Backend

Utilizaremos el estado local predeterminado.

---

## 34. Sesión 1: validar y revisar

Duración orientativa: 25 minutos.

### 34.1. Comandos

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform providers

terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 34.2. Resultado esperado

El workspace debe ser `default`.

El plan debe crear diez recursos: cinco por bucket.

### 34.3. Revisión

La regla opcional de ciclo de vida todavía no existe.

---

## 35. Sesión 2: aplicar e identificar

La aplicación crea los buckets y sus controles.

### 35.1. Comandos

```bash
terraform apply planes/create.tfplan
terraform state list

terraform output -json storage \
  > resultados/storage-initial.json

DOCUMENTS_BUCKET="$(jq -er '.documents.bucket_name' resultados/storage-initial.json)"
SCRATCH_BUCKET="$(jq -er '.scratch.bucket_name' resultados/storage-initial.json)"
```

### 35.2. Comprobación

Ejecuta `head-bucket` sobre ambos nombres.

### 35.3. Regla

No continúes si los nombres pertenecen a otra práctica.

---

## 36. Sesión 3: verificar configuración

Consulta el servicio independientemente del estado.

### 36.1. Comandos

```bash
aws_local s3api get-bucket-versioning \
  --bucket "$DOCUMENTS_BUCKET"

aws_local s3api get-bucket-versioning \
  --bucket "$SCRATCH_BUCKET"

aws_local s3api get-bucket-encryption \
  --bucket "$DOCUMENTS_BUCKET"

aws_local s3api get-bucket-ownership-controls \
  --bucket "$DOCUMENTS_BUCKET"

aws_local s3api get-public-access-block \
  --bucket "$DOCUMENTS_BUCKET"
```

### 36.2. Resultado

Comprueba Enabled, Suspended, AES256, BucketOwnerEnforced y los cuatro controles públicos.

---

## 37. Sesión 4: cargar archivos

Utilizaremos una key estable para observar versiones.

### 37.1. Primera escritura

```bash
printf 'Documento de ejemplo: revisión 1\n' > archivos/documento.txt

aws_local s3api put-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  --body archivos/documento.txt \
  > resultados/upload-v1.json

VERSION_1="$(jq -er '.VersionId' resultados/upload-v1.json)"
```

### 37.2. Resultado esperado

La respuesta contiene un identificador de versión.

### 37.3. Precaución

Conserva el identificador exacto; no lo deduzcas de una fecha.

---

## 38. Sesión 5: sobrescribir la key

La segunda carga crea otra revisión en el bucket versionado.

### 38.1. Comandos

```bash
printf 'Documento de ejemplo: revisión 2\n' > archivos/documento.txt

aws_local s3api put-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  --body archivos/documento.txt \
  > resultados/upload-v2.json

VERSION_2="$(jq -er '.VersionId' resultados/upload-v2.json)"
```

### 38.2. Verificación

Los dos identificadores deben ser distintos.

### 38.3. Regla

La key identifica el objeto lógico; `VersionId` identifica una revisión concreta.

---

## 39. Sesión 6: enumerar revisiones

El inventario permite observar versiones actuales e históricas.

### 39.1. Consulta

```bash
aws_local s3api list-object-versions \
  --bucket "$DOCUMENTS_BUCKET" \
  --prefix documentos/documento.txt \
  > resultados/document-versions.json

jq '
  .Versions[]? |
  select(.Key == "documentos/documento.txt") |
  {VersionId, IsLatest, LastModified, Size}
' resultados/document-versions.json
```

### 39.2. Filtro exacto

Un prefijo puede incluir keys adicionales.

### 39.3. Resultado

La segunda revisión debe figurar como actual.

---

## 40. Sesión 7: recuperar una versión

Recuperar un archivo no requiere sobrescribir inmediatamente el objeto actual.

### 40.1. Descarga

```bash
aws_local s3api get-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  --version-id "$VERSION_1" \
  archivos/documento-recuperado-v1.txt \
  > resultados/download-v1.json

cat archivos/documento-recuperado-v1.txt
```

### 40.2. Resultado esperado

El contenido indica revisión 1.

### 40.3. Regla

Descargar una revisión histórica no la convierte automáticamente en la revisión actual.

---

## 41. Sesión 8: observar un delete marker

La eliminación lógica conserva posibilidades de recuperación.

### 41.1. Comando

```bash
aws_local s3api delete-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  > resultados/delete-current.json

DELETE_MARKER="$(jq -er '.VersionId' resultados/delete-current.json)"
```

### 41.2. Resultado esperado

La respuesta indica un delete marker.

### 41.3. Lectura habitual

Un `head-object` sin versión debe indicar que no existe un objeto actual visible.

---

## 42. Sesión 9: retirar el delete marker

Eliminar el marcador concreto puede volver a exponer la versión anterior.

### 42.1. Comandos

```bash
aws_local s3api delete-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  --version-id "$DELETE_MARKER"

aws_local s3api get-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  archivos/documento-visible.txt \
  > resultados/download-current.json
```

### 42.2. Resultado

La revisión 2 vuelve a ser visible.

### 42.3. Precaución

Eliminar una versión de datos concreta puede ser irreversible.

---

## 43. Sesión 10: contrastar el bucket suspendido

La misma key no obtiene la misma historia que en un bucket con Enabled.

### 43.1. Cargas

```bash
printf 'Temporal A\n' > archivos/temporal.txt
aws_local s3api put-object \
  --bucket "$SCRATCH_BUCKET" \
  --key temporal.txt \
  --body archivos/temporal.txt

printf 'Temporal B\n' > archivos/temporal.txt
aws_local s3api put-object \
  --bucket "$SCRATCH_BUCKET" \
  --key temporal.txt \
  --body archivos/temporal.txt
```

### 43.2. Observación

Consulta versiones y descarga la key actual.

### 43.3. Regla

No esperes dos versiones recuperables equivalentes a las del bucket Enabled.

---

## 44. Sesión 11: comprobar cifrado de objeto

La consulta de configuración y los metadatos del objeto aportan evidencias distintas.

### 44.1. Consulta

```bash
aws_local s3api head-object \
  --bucket "$DOCUMENTS_BUCKET" \
  --key documentos/documento.txt \
  > resultados/object-head.json

jq '{
  VersionId,
  ContentLength,
  ServerSideEncryption
}' resultados/object-head.json
```

### 44.2. Resultado esperado

Comprueba el algoritmo que devuelve la imagen validada.

### 44.3. Límite

No interpretes un ETag como checksum MD5 universal de cualquier objeto S3.

---

## 45. Sesión 12: activar ciclo de vida

La opción crea una configuración, no una eliminación inmediata.

### 45.1. Cambio

Establece `documents_noncurrent_days = 30` en `terraform.tfvars`.

### 45.2. Secuencia

```bash
terraform plan -out=planes/enable-lifecycle.tfplan
terraform show planes/enable-lifecycle.tfplan
terraform apply planes/enable-lifecycle.tfplan

aws_local s3api get-bucket-lifecycle-configuration \
  --bucket "$DOCUMENTS_BUCKET"
```

### 45.3. Resultado

El estado incorpora un recurso adicional.

### 45.4. Límite

No esperes expiración real durante esta sesión breve.

---

## 46. Sesión 13: validación negativa

Una configuración inválida debe rechazarse antes de administrar controles incorrectos.

### 46.1. Archivo de prueba

Crea `examples/invalid-lifecycle.tfvars`:

```hcl
documents_noncurrent_days = 0
```

### 46.2. Ejecución

```bash
terraform plan \
  -var-file=examples/invalid-lifecycle.tfvars
```

### 46.3. Resultado esperado

La validación del módulo rechaza cero días.

### 46.4. Regla

No elimines la validación para hacer pasar un caso negativo.

---

## 47. Pruebas declarativas del contrato

Crea `tests/storage.tftest.hcl`.

### 47.1. Plan válido

```hcl
run "default_contract" {
  command = plan

  variables {
    suffix                   = "test01"
    documents_noncurrent_days = null
  }

  assert {
    condition     = output.storage.documents.versioning_status == "Enabled"
    error_message = "Documents debe configurar versionado Enabled."
  }

  assert {
    condition     = output.storage.scratch.versioning_status == "Suspended"
    error_message = "Scratch debe configurar versionado Suspended."
  }

  assert {
    condition     = output.storage.documents.force_destroy == false
    error_message = "La destrucción forzada no debe activarse por defecto."
  }
}
```

---

## 48. Prueba directa de entrada inválida

Añade otra ejecución al archivo de pruebas.

### 48.1. Caso negativo

```hcl
run "reject_invalid_name" {
  command = plan

  module {
    source = "./modules/storage"
  }

  variables {
    storage = {
      name = "BUCKET_INVALIDO"
    }
  }

  expect_failures = [var.storage]
}
```

### 48.2. Propósito

La prueba espera un rechazo del contrato, no un error remoto de creación.

---

## 49. Sesión 14: ejecutar pruebas

Las pruebas permiten detectar cambios accidentales en la interfaz.

### 49.1. Comandos

```bash
terraform fmt -recursive
terraform validate
terraform test
```

### 49.2. Alcance

Estas ejecuciones solicitan planes, no aplicaciones.

No deben crear los buckets de prueba.

### 49.3. Proveedor

No utilizamos mocks; conserva LocalStack disponible.

### 49.4. Regla

Una aserción del output comprueba intención, no aplicación efectiva de seguridad.

---

## 50. Documentación del módulo

Crea `modules/storage/README.md`.

### 50.1. Contenido mínimo

Documenta propósito, versiones, entradas y outputs.

Explica Enabled, Suspended y la opción de ciclo de vida.

### 50.2. Riesgos

Describe consecuencias de renombrar buckets y activar `force_destroy`.

### 50.3. Límites

Indica ausencia de KMS, replicación, notificaciones y políticas de consumidores.

### 50.4. Regla

La documentación debe explicar decisiones y riesgos, no solo enumerar atributos.

---

## 51. Cambios compatibles y refactorización

El módulo puede evolucionar sin alterar necesariamente a sus consumidores.

### 51.1. Interfaz

Añadir una opción con default coherente puede conservar llamadas existentes.

### 51.2. Infraestructura

Cambiar defaults puede modificar recursos aunque la sintaxis siga siendo válida.

### 51.3. Direcciones

Renombrar recursos internos puede requerir bloques `moved`.

### 51.4. Regla

Revisa compatibilidad de interfaz, comportamiento y estado como aspectos distintos.

---

## 52. Diagnóstico de errores frecuentes

Investiga primero la capa que produce el error.

### 52.1. Lista de revisión

Comprueba nombre duplicado, región, endpoint y disponibilidad de LocalStack.

Revisa ruta `source`, tipos y valores opcionales.

### 52.2. S3

Distingue objeto actual, versión histórica y delete marker.

### 52.3. Destrucción

Un bucket no vacío no implica que Terraform haya perdido su configuración.

### 52.4. Regla

No retires recursos del estado para evitar un error de limpieza.

---

## 53. Preparar la limpieza

La limpieza elimina datos y debe limitarse al laboratorio.

### 53.1. Copias e inventario

```bash
umask 077
terraform state pull > copias/before-cleanup.tfstate

aws_local s3api list-object-versions \
  --bucket "$DOCUMENTS_BUCKET" \
  > resultados/documents-before-cleanup.json

aws_local s3api list-object-versions \
  --bucket "$SCRATCH_BUCKET" \
  > resultados/scratch-before-cleanup.json
```

### 53.2. Condición

Detén cargas y escrituras antes de vaciar los buckets.

### 53.3. Regla

Una copia del estado no es una copia de los archivos.

---

## 54. Script de vaciado controlado

Crea `scripts/empty-lab-bucket.py`.

### 54.1. Código

```python
import json
import os
import subprocess

suffix = os.environ["SUFFIX"]
bucket = os.environ["TARGET_BUCKET"]
allowed = {
    f"curso-storage-{suffix}-documents",
    f"curso-storage-{suffix}-scratch",
}
if bucket not in allowed:
    raise SystemExit("Bucket fuera del laboratorio.")

def aws(*args):
    command = [
        "aws", "--endpoint-url=http://localhost:4566",
        "--region", "us-east-1", "--output", "json", *args,
    ]
    return subprocess.check_output(command, text=True)

data = json.loads(aws("s3api", "list-object-versions", "--bucket", bucket))
entries = data.get("Versions", []) + data.get("DeleteMarkers", [])

for entry in entries:
    aws(
        "s3api", "delete-object", "--bucket", bucket,
        "--key", entry["Key"], "--version-id", entry["VersionId"],
    )

objects = json.loads(aws("s3api", "list-objects-v2", "--bucket", bucket))
for item in objects.get("Contents", []):
    aws("s3api", "delete-object", "--bucket", bucket, "--key", item["Key"])

print(f"Vaciado solicitado para el bucket dedicado {bucket}.")
```

---

## 55. Ejecutar y verificar el vaciado

El script utiliza la paginación automática de AWS CLI para obtener el inventario.

### 55.1. Ejecución

```bash
export SUFFIX=alumno01

TARGET_BUCKET="$DOCUMENTS_BUCKET" python3 scripts/empty-lab-bucket.py
TARGET_BUCKET="$SCRATCH_BUCKET" python3 scripts/empty-lab-bucket.py

aws_local s3api list-object-versions \
  --bucket "$DOCUMENTS_BUCKET"

aws_local s3api list-object-versions \
  --bucket "$SCRATCH_BUCKET"
```

### 55.2. Resultado

No deben quedar versiones ni delete markers.

### 55.3. Límite

No es una herramienta de limpieza masiva para producción ni tolera escritores concurrentes.

---

## 56. Destruir la infraestructura

Mantén LocalStack disponible durante la destrucción.

### 56.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan

terraform state list
aws_local s3api list-buckets
docker compose down
```

### 56.2. Resultado esperado

Desaparecen los dos buckets y sus configuraciones.

### 56.3. Precaución

El número de recursos depende de si dejaste activado el ciclo de vida.

---

## 57. Diferencias respecto a AWS real

La emulación permite practicar configuración y API, no certificar aislamiento ni durabilidad.

### 57.1. Aspectos adicionales

En AWS real revisa permisos, cifrado, auditoría, costes y recuperación.

### 57.2. Ciclo de vida

La aceptación de una regla no demuestra que LocalStack ejecute su expiración como AWS.

### 57.3. Persistencia

Eliminar el contenedor puede hacer desaparecer datos según la configuración utilizada.

### 57.4. Regla

Documenta garantías observadas y propiedades todavía no comprobadas.

---

## 58. Ejercicios de consolidación

Las actividades deben reforzar diseño, verificación y consecuencias operacionales.

### 58.1. Ejercicios

1. Documenta la interfaz completa.
2. Compara Enabled y Suspended.
3. Recupera una versión histórica.
4. Explica un delete marker.
5. Añade una prueba del cifrado configurado.
6. Rechaza una expiración incompatible.
7. Diseña una evolución con KMS sin implementarla.
8. Limpia versiones y destruye infraestructura.

### 58.2. Evidencia

Incluye salidas Terraform y consultas independientes del servicio.

---

## 59. Criterios de evaluación

La evaluación debe comprobar comprensión, no únicamente un `apply` correcto.

### 59.1. Entrega

Incluye módulo, composición, pruebas y documentación.

Adjunta inventario de buckets, versiones y configuración.

### 59.2. Explicación

Justifica defaults, política de destrucción y alcance del ciclo de vida.

### 59.3. Limpieza

Demuestra eliminación de versiones, delete markers y recursos administrados.

### 59.4. Compatibilidad

Identifica imagen validada y límites de la emulación.

---

## 60. Resumen de la lección

Un módulo S3 agrupa decisiones de almacenamiento en una interfaz reutilizable.

### 60.1. Ideas esenciales

- El bucket y su contenido tienen ciclos diferentes.
- Suspender versionado no elimina historia.
- Los delete markers no son versiones de datos.
- AES256 configurado no demuestra toda la seguridad.
- El ciclo de vida no es una acción inmediata.
- `force_destroy` requiere revisión explícita.
- Las pruebas de contrato complementan las API.
- La limpieza debe incluir todas las versiones.

### 60.2. Procedimiento recomendado

Diseña, valida, despliega, verifica datos y limpia antes de destruir.

### 60.3. Idea final

**Un módulo de almacenamiento fiable hace explícitas las decisiones sobre identidad, conservación y eliminación de datos, y permite comprobar sus resultados sin depender de su implementación interna.**