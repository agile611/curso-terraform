# S3: buckets, objetos y versionado con Terraform y LocalStack

Amazon S3 almacena objetos dentro de buckets y permite conservar varias versiones de una misma clave.

Terraform declara los buckets, su configuración y los objetos que debe gestionar.

LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección recorrerás la creación, actualización, consulta, recuperación y eliminación de objetos versionados.

También distinguirás el estado de Terraform del historial de versiones que mantiene S3.

El laboratorio separa los objetos gestionados por Terraform de los utilizados para experimentar con AWS CLI.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página se ejecutan localmente con LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos de aprendizaje

La práctica combina infraestructura declarativa y operaciones sobre datos.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un bucket S3 con Terraform.
- Configurar el versionado mediante un recurso independiente.
- Publicar objetos desde cadenas y archivos.
- Consultar contenido y metadatos mediante AWS CLI.
- Identificar versiones mediante `VersionId`.
- Recuperar una versión anterior.
- Comprender los marcadores de eliminación.
- Diferenciar eliminación lógica y eliminación permanente.
- Limpiar un bucket versionado.
- Reconocer límites relevantes de LocalStack.

### 1.2. Resultado práctico

Construirás un bucket versionado con dos objetos gestionados y un documento experimental.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Terraform.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, outputs, dependencias y planes guardados.

Los comandos utilizan una terminal compatible con Bash.

Terraform y AWS CLI se ejecutan en el host.

---

## 3. Compatibilidad y versiones

El docente debe comprobar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones que deben validarse

Verifica en la imagen y edición elegidas:

- Creación y consulta de buckets.
- Activación del versionado.
- Escritura y lectura de versiones.
- Consulta de versiones y marcadores de eliminación.
- Eliminación de una versión concreta.
- Copia de versiones.
- Destrucción de un bucket con historial.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones de esta página no identifican necesariamente las versiones más recientes.

Una configuración escrita no demuestra que una combinación de versiones haya sido probada.

---

## 4. Qué es un bucket

Un bucket es el contenedor lógico donde S3 almacena objetos.

### 4.1. Identidad

Cada bucket tiene un nombre.

En AWS real, los nombres de buckets de propósito general deben ser únicos dentro de la partición correspondiente.

### 4.2. Configuración

Un bucket puede tener versionado, políticas, etiquetas y otras opciones.

Estas configuraciones no equivalen a objetos almacenados.

### 4.3. Responsabilidad

En el laboratorio, Terraform gestionará el bucket y su configuración de versionado.

### 4.4. Diferencia importante

Eliminar un archivo local no elimina automáticamente un objeto del bucket.

Las operaciones locales y remotas tienen ciclos independientes.

---

## 5. Qué es un objeto

Un objeto es una unidad de datos almacenada en S3.

### 5.1. Componentes principales

Un objeto incluye:

- Una clave.
- Un contenido.
- Metadatos.
- Información del servicio.
- Un identificador de versión cuando corresponda.

### 5.2. Ejemplo

```text
Bucket: curso-s3-versionado-alumno01
Clave:  docs/README.txt
```

### 5.3. Contenido

Puede ser texto, JSON, una imagen o cualquier secuencia de bytes admitida.

### 5.4. Identidad de una versión

Para identificar una versión concreta necesitas bucket, clave y `VersionId`.

---

## 6. Claves y prefijos

S3 utiliza un espacio de claves, no un sistema de directorios tradicional.

### 6.1. Ejemplos de claves

```text
docs/README.txt
config/settings.json
experiments/history.txt
```

### 6.2. Significado de la barra

La barra forma parte de la clave.

Las herramientas la utilizan para presentar agrupaciones similares a carpetas.

### 6.3. Prefijo

`docs/` es un prefijo útil para filtrar objetos.

### 6.4. Precaución

Las claves distinguen mayúsculas y minúsculas.

`README.txt` y `readme.txt` representan claves diferentes.

---

## 7. Contenido, metadatos y etiquetas

Estos conceptos cumplen responsabilidades distintas.

### 7.1. Comparación

| **Elemento** | **Responsabilidad** | **Ejemplo** |
|--------------|---------------------|-------------|
| Contenido | Bytes almacenados | Texto del documento |
| Metadatos del usuario | Información asociada al objeto | `owner=training` |
| Tipo de contenido | Describir el formato | `application/json` |
| Etiquetas del objeto | Clasificar el objeto | `Purpose=Documentation` |
| Etiquetas del bucket | Clasificar el contenedor | `Laboratory=LocalStack` |

Las etiquetas del bucket no se convierten automáticamente en etiquetas de los objetos.

### 7.2. Actualizaciones

Cambiar contenido o metadatos puede implicar una nueva escritura del objeto.

### 7.3. Versionado

Con el versionado habilitado, una escritura puede producir una nueva versión.

---

## 8. Operaciones principales de S3

Las API distinguen escritura, consulta y eliminación.

### 8.1. Operaciones del laboratorio

| **Operación** | **Uso** | **Comando principal** |
|---------------|---------|----------------------|
| Crear bucket | Preparar el contenedor | `create-bucket` |
| Escribir objeto | Publicar contenido | `put-object` |
| Consultar metadatos | Inspeccionar sin descargar | `head-object` |
| Leer objeto | Descargar contenido | `get-object` |
| Listar historial | Ver versiones y marcadores | `list-object-versions` |
| Eliminar | Borrar lógicamente o por versión | `delete-object` |

Cada operación tiene argumentos y efectos diferentes.

### 8.2. AWS CLI

Los comandos `s3api` exponen operaciones concretas.

Los comandos `s3` ofrecen una interfaz de mayor nivel.

---

## 9. Versionado de S3

El versionado permite conservar distintas versiones bajo una misma clave.

### 9.1. Sin versionado habilitado

Una nueva escritura de la misma clave normalmente sustituye el objeto actual.

### 9.2. Con versionado habilitado

Las escrituras generan versiones diferenciadas.

La versión más reciente representa el objeto actual, salvo que exista un marcador de eliminación actual.

### 9.3. Recuperación

Puedes leer una versión anterior mediante su identificador.

### 9.4. Límite

El versionado no convierte todas las operaciones en reversibles.

Una versión eliminada permanentemente deja de estar disponible.

---

## 10. Estados del versionado

La configuración distingue situaciones con efectos diferentes.

### 10.1. Estados relevantes

| **Situación** | **Comportamiento general** | **Precaución** |
|---------------|----------------------------|----------------|
| Nunca habilitado | No conserva historial versionado ordinario | Sobrescritura del objeto actual |
| `Enabled` | Nuevas escrituras producen versiones | Crece el historial |
| `Suspended` | Nuevas escrituras utilizan la versión `null` | No elimina versiones anteriores |

Suspender no equivale a borrar el historial.

### 10.2. Activación previa

Un bucket que ya tuvo versionado no vuelve simplemente al estado inicial de nunca habilitado.

### 10.3. Laboratorio

Mantendremos `Enabled` durante todas las sesiones principales.

---

## 11. La versión `null`

S3 puede utilizar un identificador de versión denominado `null`.

### 11.1. Caso habitual

Un objeto creado antes de activar el versionado puede conservar una versión `null`.

### 11.2. Suspensión

Con el versionado suspendido, nuevas escrituras pueden sustituir la versión `null`.

### 11.3. Distinción

La cadena `"null"` como identificador S3 no es lo mismo que un valor JSON nulo.

### 11.4. Argumentos

Para operar sobre esa versión se utiliza:

```bash
--version-id null
```

### 11.5. Precaución

No descartes ese identificador al preparar una limpieza del historial.

---

## 12. Identificadores de versión

`VersionId` es un identificador opaco proporcionado por S3.

### 12.1. Regla

No deduzcas su significado a partir de su formato.

### 12.2. Orden

No ordenes los identificadores alfabéticamente para determinar antigüedad.

Utiliza los campos y resultados de las API correspondientes.

### 12.3. Presentación

LocalStack puede generar identificadores con un formato distinto al observado en AWS.

### 12.4. Práctica

Captura el identificador devuelto por cada escritura.

### 12.5. Ventaja

Así puedes recuperar exactamente la versión que acabas de publicar.

---

## 13. Marcadores de eliminación

Eliminar una clave sin especificar una versión tiene un efecto particular con versionado habilitado.

### 13.1. Comportamiento

S3 crea un marcador de eliminación.

### 13.2. Lectura normal

La clave deja de ofrecer el contenido anterior mediante una lectura sin `VersionId`.

### 13.3. Historial

Las versiones anteriores pueden seguir existiendo.

### 13.4. Identidad

El marcador tiene su propio identificador de versión.

### 13.5. Distinción

Un marcador de eliminación no es un documento vacío.

Representa un estado lógico de eliminación de la clave.

---

## 14. Eliminación lógica y permanente

Es importante distinguir los dos tipos de operación.

### 14.1. Sin versión

```bash
aws s3api delete-object --bucket EJEMPLO --key documento.txt
```

Con versionado habilitado, esta operación normalmente crea un marcador.

### 14.2. Con versión

```bash
aws s3api delete-object \
  --bucket EJEMPLO \
  --key documento.txt \
  --version-id IDENTIFICADOR
```

### 14.3. Efecto

La segunda operación elimina permanentemente esa versión o ese marcador.

### 14.4. Seguridad

No ejecutes estos ejemplos contra AWS real.

El laboratorio añadirá siempre el endpoint local.

---

## 15. Terraform y el historial de S3

El estado de Terraform y el historial remoto no son equivalentes.

### 15.1. Terraform registra

Direcciones, identificadores y atributos necesarios para gestionar recursos.

### 15.2. S3 registra

Versiones y marcadores según las operaciones realizadas sobre las claves.

### 15.3. Consecuencia

Una dirección `aws_s3_object.readme` no representa cada versión histórica como un recurso separado.

### 15.4. Recuperación

Restaurar un estado antiguo no restaura automáticamente los bytes antiguos del objeto.

### 15.5. Regla

Gestiona la infraestructura con Terraform y utiliza operaciones explícitas para recuperar datos.

---

## 16. Recursos utilizados

El proveedor AWS separa varias responsabilidades de configuración.

### 16.1. Recursos principales

| **Recurso** | **Responsabilidad** | **Cantidad inicial** |
|-------------|---------------------|----------------------|
| `aws_s3_bucket` | Gestionar el bucket | Uno |
| `aws_s3_bucket_versioning` | Gestionar el versionado | Uno |
| `aws_s3_object` | Gestionar una clave y su contenido | Dos |

El historial de versiones no añade automáticamente recursos Terraform por cada versión.

### 16.2. Configuración moderna del curso

Utilizaremos el recurso independiente de versionado.

### 16.3. Precaución

No declares dos configuraciones independientes que compitan por el versionado del mismo bucket.

---

## 17. Diseño del laboratorio

Separaremos infraestructura, contenido gestionado y experimentos.

### 17.1. Objetos gestionados

Terraform publicará:

- `docs/README.txt`.
- `config/settings.json`.

### 17.2. Objeto experimental

AWS CLI publicará:

```text
experiments/history.txt
```

### 17.3. Motivo

Las pruebas de eliminación y recuperación no interferirán con los objetos gestionados.

### 17.4. Propiedad

El bucket completo pertenece al laboratorio Terraform.

Los documentos experimentales son datos de práctica dentro de ese contenedor.

---

## 18. Preparación del directorio

Trabaja en una carpeta independiente.

### 18.1. Crear estructura

```bash
mkdir -p terraform-s3-versionado/files
mkdir -p terraform-s3-versionado/planes
mkdir -p terraform-s3-versionado/descargas
cd terraform-s3-versionado
```

### 18.2. Archivos previstos

```text
terraform-s3-versionado/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── main.tf
└── outputs.tf
```

---

## 19. Protección de archivos

Los artefactos requieren protección aunque utilices datos ficticios.

### 19.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
planes/
descargas/
crash.log
```

### 19.2. Qué versionar

Versiona configuración, archivos ficticios y `.terraform.lock.hcl`.

### 19.3. Precaución

Los estados y planes pueden contener contenido de objetos y datos sensibles.

---

## 20. Selección de LocalStack

Utiliza una imagen validada por el docente.

### 20.1. Referencia

Sustituye el marcador antes de continuar:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 20.3. Advertencia

Una etiqueta flotante puede producir diferencias entre alumnos o sesiones.

### 20.4. Alcance

Las operaciones del laboratorio solo necesitan S3.

No se requiere montar el socket de Docker.

---

## 21. Configuración de Docker Compose

Publicaremos el servicio únicamente en la interfaz local.

### 21.1. `compose.yaml`

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

### 21.2. Arranque

```bash
docker compose up -d
docker compose ps
```

### 21.3. Diagnóstico

Consulta `docker compose logs --tail=100 localstack` si el servicio no responde.

---

## 22. Credenciales ficticias y conectividad

AWS CLI utilizará valores de prueba.

### 22.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 22.2. Consulta inicial

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 22.3. Condición para continuar

Espera una respuesta válida antes de desplegar Terraform.

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

### 23.2. Interpretación

La restricción permite versiones AWS 5.x.

### 23.3. Bloqueo

El archivo de bloqueo registra la selección concreta realizada durante `init`.

---

## 24. Proveedor con endpoint local

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
    s3 = "http://localhost:4566"
  }
}
```

### 24.2. Alcance

Solo S3 está redirigido mediante este bloque.

No añadas otros servicios sin revisar sus endpoints.

---

## 25. Variables del laboratorio

Crea `variables.tf`.

### 25.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "readme_content" {
  type    = string
  default = "Version 1 del documento gestionado."
}
```

### 25.2. Identidad

El sufijo distingue el bucket del alumno.

---

## 26. Entradas y archivo JSON

Prepara contenido ficticio antes de inicializar el proyecto.

### 26.1. `terraform.tfvars`

```hcl
suffix         = "alumno01"
readme_content = "Version 1 del documento gestionado."
```

### 26.2. `files/settings.json`

```json
{
  "project": "curso-s3",
  "environment": "local",
  "revision": 1
}
```

### 26.3. Comprobación

Ejecuta `jq -e '.' files/settings.json`.

---

## 27. Bucket y configuración de versionado

Crea `main.tf`.

### 27.1. Recursos

```hcl
resource "aws_s3_bucket" "lab" {
  bucket = "curso-s3-versionado-${var.suffix}"

  # Exclusivamente para limpiar datos ficticios del laboratorio.
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "lab" {
  bucket = aws_s3_bucket.lab.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

---

## 28. Objeto gestionado desde una cadena

Añade el README a `main.tf`.

### 28.1. Configuración

```hcl
resource "aws_s3_object" "readme" {
  bucket       = aws_s3_bucket.lab.id
  key          = "docs/README.txt"
  content      = var.readme_content
  content_type = "text/plain"

  metadata = {
    owner = "training"
  }

  tags = {
    Purpose = "Documentation"
  }

  depends_on = [
    aws_s3_bucket_versioning.lab
  ]
}
```

---

## 29. Objeto gestionado desde un archivo

Añade el documento JSON a `main.tf`.

### 29.1. Configuración

```hcl
resource "aws_s3_object" "settings" {
  bucket       = aws_s3_bucket.lab.id
  key          = "config/settings.json"
  source       = "${path.module}/files/settings.json"
  source_hash  = filemd5("${path.module}/files/settings.json")
  content_type = "application/json"

  tags = {
    Purpose = "Configuration"
  }

  depends_on = [
    aws_s3_bucket_versioning.lab
  ]
}
```

### 29.2. Archivo disponible

El archivo debe existir cuando Terraform evalúa la configuración.

---

## 30. Dependencias y detección de cambios

Los objetos necesitan el bucket y el versionado activo.

### 30.1. Dependencia implícita

El argumento `bucket` referencia el recurso bucket.

### 30.2. Dependencia explícita

`depends_on` expresa que la operación de activar versionado debe completarse primero.

### 30.3. Límite

La dependencia organiza operaciones.

No sustituye todas las esperas o garantías de propagación del servicio.

### 30.4. Hash del archivo

`source_hash` permite detectar cambios en el archivo local.

### 30.5. Seguridad

El MD5 utilizado aquí es un detector de cambios, no una firma ni una prueba de autenticidad.

---

## 31. Outputs del proyecto

Crea `outputs.tf`.

### 31.1. Resultados

```hcl
output "bucket_name" {
  value = aws_s3_bucket.lab.bucket
}

output "managed_object_versions" {
  value = {
    readme   = aws_s3_object.readme.version_id
    settings = aws_s3_object.settings.version_id
  }
}

output "managed_object_keys" {
  value = {
    readme   = aws_s3_object.readme.key
    settings = aws_s3_object.settings.key
  }
}
```

---

## 32. Sesión 1: desplegar y comprobar

Duración orientativa: 25 minutos.

### 32.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 32.2. Resultado esperado

Deben crearse cuatro recursos gestionados.

### 32.3. Consultar versionado

```bash
BUCKET="$(terraform output -raw bucket_name)"
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-bucket-versioning --bucket "$BUCKET"
```

---

## 33. Sesión 2: consultar objetos y metadatos

Verifica los resultados fuera de Terraform.

### 33.1. Listar objetos actuales

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api list-objects-v2 --bucket "$BUCKET"
```

### 33.2. Consultar README

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api head-object --bucket "$BUCKET" --key docs/README.txt
```

### 33.3. Descarga

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/docs/README.txt" descargas/README.txt
```

---

## 34. Sesión 3: actualizar contenido con Terraform

La misma clave puede acumular varias versiones.

### 34.1. Capturar versión inicial

```bash
README_V1="$(terraform output -json managed_object_versions | jq -er '.readme')"
```

### 34.2. Nuevo contenido

Cambia `readme_content` a `"Version 2 del documento gestionado."`.

### 34.3. Aplicación revisada

```bash
terraform plan -out=planes/readme-v2.tfplan
terraform show planes/readme-v2.tfplan
terraform apply planes/readme-v2.tfplan
README_V2="$(terraform output -json managed_object_versions | jq -er '.readme')"
```

### 34.4. Entregable

Comprueba que ambas versiones corresponden a la misma clave.

---

## 35. Sesión 4: consultar el historial gestionado

El listado de versiones muestra más información que el listado de objetos actuales.

### 35.1. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api list-object-versions \
  --bucket "$BUCKET" \
  --prefix docs/README.txt \
  > descargas/readme-versions.json
```

### 35.2. Presentación

```bash
jq '.Versions[]? |
  {Key, VersionId, IsLatest, LastModified, Size}' \
  descargas/readme-versions.json
```

### 35.3. Precaución

El prefijo puede coincidir con otras claves; filtra por igualdad si necesitas una clave exacta.

---

## 36. Sesión 5: recuperar una versión anterior

La lectura específica no modifica la versión actual.

### 36.1. Descargar la primera versión

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-object \
  --bucket "$BUCKET" \
  --key docs/README.txt \
  --version-id "$README_V1" \
  descargas/README-v1.txt
```

### 36.2. Comparación

```bash
cat descargas/README-v1.txt
cat descargas/README.txt
```

### 36.3. Actualizar descarga

Descarga nuevamente el objeto actual para comparar correctamente las dos versiones.

---

## 37. Sesión 6: actualizar el archivo JSON

La práctica utiliza detección de cambios mediante `source_hash`.

### 37.1. Modificación local

Cambia `revision` de uno a dos en `files/settings.json`.

### 37.2. Comprobación

```bash
jq -e '.' files/settings.json
terraform plan -out=planes/settings-v2.tfplan
terraform show planes/settings-v2.tfplan
terraform apply planes/settings-v2.tfplan
```

### 37.3. Resultado esperado

El objeto JSON debe actualizarse y producir una nueva versión.

### 37.4. Estabilidad

Un plan posterior sin otros cambios no debería proponer otra actualización.

---

## 38. Sesión 7: crear versiones experimentales

Trabajaremos sobre una clave que Terraform no gestiona individualmente.

### 38.1. Preparar archivos

```bash
printf 'Version experimental 1.\n' > files/history-v1.txt
printf 'Version experimental 2.\n' > files/history-v2.txt
HISTORY_KEY="experiments/history.txt"
```

### 38.2. Primera escritura

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --body files/history-v1.txt --content-type text/plain \
  > descargas/put-v1.json
HISTORY_V1="$(jq -er '.VersionId' descargas/put-v1.json)"
```

---

## 39. Sesión 8: publicar y leer la segunda versión

Captura el identificador devuelto por la escritura.

### 39.1. Segunda publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --body files/history-v2.txt --content-type text/plain \
  > descargas/put-v2.json
HISTORY_V2="$(jq -er '.VersionId' descargas/put-v2.json)"
```

### 39.2. Lectura actual

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  descargas/history-current.txt
```

### 39.3. Resultado

El archivo descargado debe contener la segunda versión.

---

## 40. Sesión 9: crear un marcador de eliminación

Eliminar sin `VersionId` cambia la visibilidad de la clave.

### 40.1. Operación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api delete-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  > descargas/delete-marker.json
DELETE_MARKER="$(jq -er '.VersionId' descargas/delete-marker.json)"
```

### 40.2. Lectura normal

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  descargas/history-deleted.txt
```

### 40.3. Resultado esperado

La lectura sin versión debe fallar porque el marcador actual representa una eliminación.

---

## 41. Sesión 10: inspeccionar versiones y marcadores

El historial sigue existiendo aunque la clave no aparezca como objeto actual.

### 41.1. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api list-object-versions --bucket "$BUCKET" \
  --prefix "$HISTORY_KEY" > descargas/history-versions.json
```

### 41.2. Lectura del informe

```bash
jq '{
  versions: [.Versions[]? | {Key, VersionId, IsLatest}],
  markers: [.DeleteMarkers[]? | {Key, VersionId, IsLatest}]
}' descargas/history-versions.json
```

### 41.3. Entregable

Identifica las dos versiones de contenido y el marcador actual.

---

## 42. Sesión 11: leer contenido oculto y recuperar visibilidad

Un marcador no impide leer una versión anterior por su identificador.

### 42.1. Lectura específica

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --version-id "$HISTORY_V1" descargas/history-old.txt
```

### 42.2. Eliminar el marcador

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api delete-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --version-id "$DELETE_MARKER"
```

### 42.3. Resultado

La segunda versión debe volver a ser visible como objeto actual.

---

## 43. Sesión 12: restaurar contenido mediante una nueva escritura

Otra recuperación consiste en publicar nuevamente el contenido antiguo.

### 43.1. Restauración

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --body descargas/history-old.txt --content-type text/plain \
  > descargas/restored.json
RESTORED_VERSION="$(jq -er '.VersionId' descargas/restored.json)"
```

### 43.2. Diferencia

El contenido coincide con la primera versión.

El identificador corresponde a una nueva versión.

### 43.3. Alternativa

`copy-object` puede copiar una versión anterior hacia la misma clave.

Su origen debe incluir el identificador y codificarse correctamente cuando sea necesario.

---

## 44. Sesión 13: eliminar permanentemente una versión

La eliminación específica no crea una copia de seguridad adicional.

### 44.1. Operación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api delete-object --bucket "$BUCKET" --key "$HISTORY_KEY" \
  --version-id "$HISTORY_V2"
```

### 44.2. Comprobación

Intenta leer nuevamente `HISTORY_V2`.

La consulta debe fallar porque esa versión se eliminó.

### 44.3. Estado actual

La versión restaurada debe continuar disponible.

### 44.4. Advertencia

No ejecutes esta práctica sobre una versión que necesites conservar.

---

## 45. Consistencia, propagación y ETag

Las garantías del servicio no deben deducirse de una ejecución local.

### 45.1. AWS real

S3 ofrece consistencia fuerte para operaciones de lectura y listado relevantes sobre objetos.

La primera activación del versionado puede requerir propagación de configuración.

AWS recomienda esperar antes de comenzar determinadas escrituras tras esa activación inicial.

### 45.2. LocalStack

Puede no reproducir esos tiempos ni todas las condiciones operativas.

### 45.3. ETag

No interpretes siempre un ETag como MD5 del archivo.

Multipartes, cifrado y otras condiciones pueden cambiar esa relación.

### 45.4. Verificación

Utiliza hashes propios cuando necesites comparar bytes de manera explícita.

---

## 46. Limpieza con Terraform

Mantén LocalStack disponible hasta completar la eliminación.

### 46.1. Plan revisable

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
```

### 46.2. Efecto de `force_destroy`

Permite al proveedor vaciar el bucket, incluyendo historial cuando sus operaciones lo admiten.

También puede eliminar objetos experimentales que no tenían un recurso Terraform propio.

### 46.3. Verificación

Consulta `terraform state list` y `s3api list-buckets`.

### 46.4. Precaución

`aws s3 rm --recursive` por sí solo no vacía necesariamente todas las versiones y marcadores.

---

## 47. Limpieza manual del historial: procedimiento alternativo

Utiliza esta alternativa solamente si la destrucción del laboratorio falla por contenido residual.

### 47.1. Preparar el lote

Lista todas las versiones y marcadores del bucket:

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api list-object-versions --bucket "$BUCKET" \
  --output json > descargas/all-versions.json

jq '{
  Objects: (
    [.Versions[]?, .DeleteMarkers[]?] |
    map({Key, VersionId}) |
    .[:1000]
  ),
  Quiet: true
}' descargas/all-versions.json > descargas/delete-batch.json
```

### 47.2. Límite

Cada llamada de eliminación masiva admite como máximo mil entradas.

---

## 48. Limpieza manual: ejecutar y repetir con revisión

Este procedimiento elimina permanentemente las versiones incluidas en el lote.

### 48.1. Revisar y ejecutar

```bash
jq '.Objects | length' descargas/delete-batch.json
jq '.Objects' descargas/delete-batch.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api delete-objects --bucket "$BUCKET" \
  --delete file://descargas/delete-batch.json \
  > descargas/delete-result.json

jq '.Errors // []' descargas/delete-result.json
```

### 48.2. Continuación

Si quedan entradas, vuelve a listar y prepara otro lote.

No ejecutes `delete-objects` con una lista vacía.

### 48.3. Finalizar

Genera otro plan de destrucción y apágalo con `docker compose down` después de verificar.

---

## 49. Diferencias respecto a AWS real y diagnóstico

El laboratorio enseña operaciones transferibles, no una arquitectura completa de producción.

### 49.1. Aspectos que debes revisar

En AWS real considera permisos IAM, cifrado, costes de versiones y solicitudes.

También revisa Object Lock, retención, replicación y políticas de ciclo de vida.

El versionado no sustituye todas estas protecciones.

### 49.2. Errores frecuentes

- Endpoint omitido.
- Bucket o clave incorrectos.
- Identificador de versión perdido.
- Marcador confundido con eliminación permanente.
- Contenido histórico restante.
- Recursos perdidos al recrear LocalStack.

### 49.3. Regla

Borrar el estado o apagar el contenedor no equivale a destruir correctamente el laboratorio.

---

## 50. Ejercicios y resumen

Consolida las diferencias entre infraestructura, contenido actual e historial.

### 50.1. Ejercicios

1. Añade un tercer objeto gestionado desde un archivo.
2. Publica tres versiones de una clave experimental.
3. Descarga la primera sin modificar la actual.
4. Crea un marcador y recupera visibilidad.
5. Restaura contenido mediante una nueva escritura.
6. Elimina permanentemente una versión de práctica.
7. Explica por qué un bucket aparentemente vacío puede conservar historial.

### 50.2. Ideas esenciales

Terraform gestiona la configuración declarada.

S3 mantiene versiones y marcadores según las operaciones realizadas.

### 50.3. Idea final

Un laboratorio correcto no termina al publicar datos: también demuestra cómo identificarlos, recuperarlos y eliminarlos con un alcance comprendido.