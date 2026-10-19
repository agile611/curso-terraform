# Salidas `output` en Terraform

Las salidas permiten publicar información útil de una configuración de Terraform.

Con ellas puedes consultar nombres de recursos, identificadores, direcciones y estructuras de datos sin abrir manualmente el estado.

También permiten que un módulo entregue resultados a otro módulo.

En esta lección aprenderás a diseñar salidas claras, consultarlas desde la terminal y utilizarlas en verificaciones automatizadas.

Las prácticas utilizan S3 emulado en LocalStack.

La plataforma de referencia es AWS.

El despliegue se ejecuta localmente y utiliza credenciales ficticias.

> **Curso de Terraform para AWS.**
>
> Los ejemplos y prácticas se ejecutan con LocalStack.
>
> No necesitas una cuenta real de AWS.
>
> Un output no demuestra por sí solo que un recurso remoto siga disponible.

---

## 1. Objetivos de aprendizaje

Esta lección conecta la declaración de salidas con su uso práctico.

### 1.1. Conocimientos principales

Al finalizar podrás:

- Explicar qué es una salida.
- Declarar bloques `output`.
- Utilizar descripciones claras.
- Diferenciar salidas raíz y salidas de módulos hijos.
- Consultar resultados con `terraform output`.
- Utilizar `-raw` y `-json`.
- Construir salidas estructuradas.
- Exponer resultados de recursos con `for_each`.
- Tratar valores sensibles.
- Comprender valores desconocidos y nulos.
- Añadir precondiciones.
- Verificar recursos utilizando salidas.

### 1.2. Resultado práctico

Construirás dos buckets mediante un módulo local.

Cada bucket contendrá un documento de texto.

El proyecto publicará una interfaz de resultados para verificar ambos.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de módulos.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

El laboratorio utiliza:

- Terraform 1.6 o superior dentro de la serie 1.x.
- El proveedor AWS de la serie 5.x.
- Docker Compose.
- AWS CLI.
- `jq` para procesar JSON.
- Una imagen de LocalStack validada por el docente.

### 2.2. Conocimientos recomendados

Debes reconocer variables, locales, recursos y referencias.

También debes comprender mapas y bloques `module`.

---

## 3. Qué es una salida

Una salida es un valor publicado por un módulo.

### 3.1. Declaración básica

```hcl
output "bucket_name" {
  description = "Nombre del bucket."
  value       = aws_s3_bucket.example.bucket
}
```

### 3.2. Partes del bloque

- `output` identifica el tipo de bloque.
- `bucket_name` es el nombre de la salida.
- `description` documenta su significado.
- `value` contiene la expresión que produce el resultado.

### 3.3. Qué no hace

Una salida no crea un recurso adicional.

No configura permisos.

No convierte una dirección local en una dirección pública.

Tampoco ejecuta una comprobación de conectividad automáticamente.

---

## 4. Para qué sirven los outputs

Las salidas forman una interfaz de resultados.

### 4.1. Usos habituales

| **Uso** | **Ejemplo** | **Consumidor** |
|---------|-------------|----------------|
| Consulta humana | Nombre de un bucket | Alumno |
| Automatización | Mapa de nombres | Script |
| Composición | ARN publicado por un módulo | Módulo raíz |
| Verificación | Bucket y clave de objeto | AWS CLI |
| Documentación operativa | Resumen del despliegue | Equipo |

Cada salida debería tener un propósito reconocible.

### 4.2. Evitar exceso de exposición

No publiques todos los atributos por comodidad.

Elige los que realmente necesita el consumidor.

Una interfaz pequeña resulta más fácil de mantener.

### 4.3. Pregunta de diseño

Antes de añadir una salida, identifica quién la utilizará.

---

## 5. El archivo `outputs.tf`

El nombre del archivo es una convención.

### 5.1. Organización

Terraform carga conjuntamente los archivos `.tf` del directorio.

Podrías declarar una salida en `main.tf`.

Utilizamos `outputs.tf` para localizar los resultados publicados.

### 5.2. Ejemplo

```hcl
output "environment" {
  description = "Entorno lógico de la configuración."
  value       = var.environment
}
```

### 5.3. Unicidad

No declares dos salidas con el mismo nombre en un módulo.

Las declaraciones no se sobrescriben entre archivos.

### 5.4. Recomendación

Agrupa salidas relacionadas.

Mantén nombres estables y descripciones útiles.

No dependas del orden visual del archivo.

---

## 6. El argumento `value`

`value` acepta una expresión.

### 6.1. Referencia a recurso

```hcl
value = aws_s3_bucket.example.bucket
```

### 6.2. Referencia a variable

```hcl
value = var.environment
```

### 6.3. Referencia a local

```hcl
value = local.common_tags
```

### 6.4. Expresión calculada

```hcl
value = "s3://${aws_s3_bucket.example.bucket}/README.txt"
```

### 6.5. Regla práctica

La salida publica el resultado de la expresión.

No modifica el valor de origen.

No sustituye una variable de entrada.

---

## 7. Tipos de resultados

Una salida puede publicar valores simples o estructurados.

### 7.1. Ejemplos

```hcl
output "example_text" {
  value = "LocalStack"
}

output "example_number" {
  value = 2
}

output "example_boolean" {
  value = true
}

output "example_object" {
  value = {
    service = "s3"
    local   = true
  }
}
```

### 7.2. Tipo inferido

Los bloques `output` no tienen un argumento general `type`.

Terraform obtiene el tipo a partir de `value`.

---

## 8. Salidas del módulo raíz

El módulo raíz es el directorio desde el que ejecutas Terraform.

### 8.1. Publicación

Sus salidas aparecen después de una aplicación correcta.

También puedes consultarlas posteriormente:

```bash
terraform output
```

### 8.2. Persistencia

Los outputs raíz se guardan en el estado.

Por eso pueden consultarse sin volver a crear recursos.

### 8.3. Precaución

Consultar una salida no refresca automáticamente los objetos remotos.

El resultado representa el valor registrado.

Si LocalStack perdió un bucket, su nombre puede seguir apareciendo.

### 8.4. Verificación real

Utiliza el output como entrada de una consulta al servicio.

---

## 9. Salidas de módulos hijos

Un módulo hijo entrega resultados al módulo que lo llama.

### 9.1. Dentro del módulo

```hcl
output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}
```

### 9.2. Desde el módulo raíz

```hcl
output "archive_bucket_name" {
  value = module.archive.bucket_name
}
```

### 9.3. Diferencia

La primera salida forma parte de la interfaz del módulo hijo.

La segunda vuelve a publicar ese resultado desde la raíz.

### 9.4. Consulta con CLI

`terraform output` muestra las salidas raíz.

No enumera automáticamente todas las salidas internas de los módulos.

---

## 10. Encapsulación de módulos

Los outputs permiten evitar referencias a detalles internos.

### 10.1. Interfaz correcta

```hcl
module.archive.bucket_name
```

### 10.2. Referencia incorrecta

```hcl
# No utilizar:
# module.archive.aws_s3_bucket.this.bucket
```

El módulo debe publicar explícitamente los resultados necesarios.

### 10.3. Ventaja

Puedes reorganizar recursos internos manteniendo la misma interfaz.

### 10.4. Responsabilidad

Cambiar el nombre o la estructura de una salida puede romper a sus consumidores.

Trata las salidas como una API del módulo.

Documenta cambios incompatibles.

---

## 11. Nombres y descripciones

Un nombre claro reduce errores en scripts.

### 11.1. Buenos nombres

```text
bucket_name
bucket_arn
object_key
storage_summary
local_s3_endpoint
```

### 11.2. Nombres ambiguos

```text
result
data
info
url
```

Estos nombres pueden servir en contextos concretos.

Pero suelen necesitar más explicación.

### 11.3. Descripción recomendada

```hcl
description = "Nombre del bucket docs en LocalStack; no incluye endpoint."
```

Distingue nombres, URI, ARN y endpoints.

---

## 12. Consulta básica con `terraform output`

La consulta permite recuperar resultados del estado.

### 12.1. Todas las salidas raíz

```bash
terraform output
```

### 12.2. Una salida concreta

```bash
terraform output bucket_name
```

### 12.3. Formato humano

Una cadena puede aparecer entre comillas:

```text
"curso-outputs-dev-alumno01-docs"
```

### 12.4. Limitación

No analices este formato con expresiones improvisadas.

Para automatización utiliza `-raw` o `-json`.

### 12.5. Error de nombre

Solicitar una salida inexistente produce un error.

Comprueba el nombre declarado y el estado utilizado.

---

## 13. El formato `-raw`

`-raw` simplifica la recuperación de valores primitivos.

### 13.1. Ejemplo

```bash
terraform output -raw docs_bucket_name
```

### 13.2. Uso en shell

```bash
BUCKET="$(terraform output -raw docs_bucket_name)"
printf '%s\n' "$BUCKET"
```

### 13.3. Tipos adecuados

Utilízalo para cadenas, números y booleanos.

No lo utilices para objetos o colecciones.

### 13.4. Ventaja

No necesitas retirar comillas manualmente.

### 13.5. Precaución

La salida cruda no es una barrera de seguridad.

Puede mostrar un valor marcado como sensible.

---

## 14. El formato `-json`

JSON es apropiado para estructuras y automatización.

### 14.1. Todas las salidas

```bash
terraform output -json
```

El resultado incluye metadatos por salida.

### 14.2. Una salida

```bash
terraform output -json storage_summary
```

En este caso recibes directamente su valor JSON.

### 14.3. Diferencia de estructura

No utilices la misma ruta de `jq` sin comprobar el formato.

Para todas las salidas:

```bash
terraform output -json | jq '.storage_summary.value'
```

Para una salida concreta:

```bash
terraform output -json storage_summary | jq '.'
```

---

## 15. Salidas sensibles

`sensitive` indica que un resultado necesita tratamiento cuidadoso.

### 15.1. Ejemplo conceptual

```hcl
output "example_token" {
  value     = "token-ficticio"
  sensitive = true
}
```

### 15.2. Presentación habitual

El listado general para humanos oculta el valor.

### 15.3. Exposición explícita

Consultar una salida sensible por nombre puede revelar su contenido.

`-raw` y `-json` también pueden mostrarlo.

### 15.4. Estado y planes

El valor puede estar presente en el estado y en planes guardados.

### 15.5. Regla

`sensitive` controla presentación y propagación de sensibilidad.

No sustituye cifrado, permisos ni gestión de secretos.

---

## 16. Sensibilidad heredada

Una expresión puede recibir sensibilidad desde sus entradas.

### 16.1. Variable conceptual

```hcl
variable "example_secret" {
  type      = string
  sensitive = true
}
```

### 16.2. Salida correspondiente

```hcl
output "example_secret" {
  value     = var.example_secret
  sensitive = true
}
```

### 16.3. Objetos mixtos

Si una estructura incluye información sensible, puede requerir marcar toda la salida como sensible.

### 16.4. Recomendación

Separa información pública y privada.

No mezcles un token con nombres de buckets dentro del mismo resumen general.

Evita utilizar `nonsensitive` para silenciar una advertencia sin analizar los datos.

---

## 17. Valores desconocidos y nulos

Una salida puede no tener un valor concreto durante el plan.

### 17.1. Valor desconocido

Terraform puede mostrar:

```text
(known after apply)
```

Esto significa que el valor se resolverá posteriormente.

### 17.2. Valor nulo

```hcl
output "optional_name" {
  value = null
}
```

Una salida raíz nula puede no aparecer como salida disponible.

### 17.3. Diferencia

- Desconocido: falta información temporalmente.
- Nulo: ausencia de valor.
- Error: la expresión es inválida.

### 17.4. Diseño

Para scripts, una colección vacía puede ser más manejable que una salida opcional nula.

Documenta la elección.

---

## 18. Dependencias de salidas

Las referencias establecen dependencias.

### 18.1. Ejemplo

```hcl
output "object_uri" {
  value = "s3://${aws_s3_bucket.example.bucket}/${aws_s3_object.readme.key}"
}
```

### 18.2. Dependencia implícita

Terraform reconoce los elementos utilizados por la expresión.

### 18.3. `depends_on`

Un output también puede declarar dependencias explícitas.

Úsalo solo cuando exista una relación necesaria que la expresión no represente.

### 18.4. Precaución

Añadir dependencias amplias puede retrasar evaluaciones.

### 18.5. Laboratorio

El módulo publicará un descriptor que referencia bucket y objeto.

No necesitaremos `depends_on`.

---

## 19. Precondiciones de outputs

Una precondición comprueba una condición asociada a la salida.

### 19.1. Ejemplo

```hcl
output "bucket_name" {
  value = aws_s3_bucket.example.bucket

  precondition {
    condition = startswith(
      aws_s3_bucket.example.bucket,
      "curso-"
    )
    error_message = "El bucket debe conservar el prefijo curso-."
  }
}
```

### 19.2. Comportamiento

Una precondición fallida es un error.

No se limita a emitir una advertencia como un bloque `check`.

### 19.3. Momento

Si la condición es desconocida, su evaluación puede diferirse.

### 19.4. Límite

No es un mecanismo de reversión automática de cambios ya realizados.

---

## 20. Preparación del laboratorio

Crearemos un proyecto independiente con un módulo reutilizable.

### 20.1. Directorios

```bash
mkdir -p terraform-outputs-localstack/modules/storage
cd terraform-outputs-localstack
```

### 20.2. Estructura principal

```text
terraform-outputs-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
├── outputs.tf
└── modules/
    └── storage/
```

### 20.3. Archivos del módulo

El módulo tendrá requisitos, variables, recursos y salidas.

---

## 21. Imagen y Docker Compose

Utiliza una imagen validada para las operaciones S3 del laboratorio.

### 21.1. Selección

Sustituye el marcador antes de continuar:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

El docente debe proporcionar una etiqueta fija o digest.

### 21.2. `compose.yaml`

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

### 21.3. Arranque

```bash
docker compose up -d
docker compose ps
```

---

## 22. Credenciales y comprobación inicial

AWS CLI utilizará credenciales ficticias.

### 22.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 22.2. Verificación

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 22.3. Si falla

```bash
docker compose logs --tail=100 localstack
```

### 22.4. Supuesto de red

Terraform se ejecuta en el host.

Desde otro contenedor, `localhost` no identifica el contenedor de LocalStack.

---

## 23. Requisitos y proveedor raíz

Crea los archivos de conexión.

### 23.1. `versions.tf`

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

### 23.2. `providers.tf`

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3 = "http://localhost:4566"
  }
}
```

---

## 24. Variables y valores del proyecto

Los nombres se parametrizan para cada alumno.

### 24.1. `variables.tf`

```hcl
variable "suffix" {
  description = "Identificador ficticio del alumno."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "owner" {
  description = "Responsable ficticio."
  type        = string
  default     = "formacion"
}

variable "storage_names" {
  description = "Claves lógicas de almacenamiento."
  type        = set(string)
  default     = ["docs", "reports"]
}
```

### 24.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
owner  = "equipo-docente"
```

---

## 25. Locales y llamada al módulo

La misma configuración creará dos instancias.

### 25.1. `locals.tf`

```hcl
locals {
  prefix = "curso-outputs-dev-${var.suffix}"

  tags = {
    Project    = "curso-outputs"
    Owner      = var.owner
    ManagedBy  = "Terraform"
    Laboratory = "LocalStack"
  }
}
```

### 25.2. `main.tf`

```hcl
module "storage" {
  source   = "./modules/storage"
  for_each = var.storage_names

  providers = {
    aws = aws
  }

  bucket_name = "${local.prefix}-${each.key}"
  content     = "Documento del almacenamiento ${each.key}."
  tags        = merge(local.tags, { Purpose = each.key })
}
```

Las claves `docs` y `reports` identifican las instancias.

---

## 26. Requisitos y entradas del módulo

Crea los archivos dentro de `modules/storage`.

### 26.1. `versions.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 26.2. `variables.tf`

```hcl
variable "bucket_name" {
  type = string
}

variable "content" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

El módulo no configura credenciales.

Recibe el proveedor desde la raíz.

---

## 27. Recursos internos del módulo

Crea `modules/storage/main.tf`.

### 27.1. Configuración

```hcl
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  # Solo para limpiar datos ficticios del laboratorio.
  force_destroy = true

  tags = var.tags
}

resource "aws_s3_object" "readme" {
  bucket       = aws_s3_bucket.this.id
  key          = "README.txt"
  content      = var.content
  content_type = "text/plain"
}
```

### 27.2. Dependencia

El objeto referencia el bucket.

Terraform reconoce esa dependencia.

### 27.3. Advertencia

`force_destroy = true` permite eliminar contenido.

No es una recomendación general para producción.

---

## 28. Outputs del módulo hijo

Crea `modules/storage/outputs.tf`.

### 28.1. Interfaz del módulo

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  description = "ARN del bucket en el entorno configurado."
  value       = aws_s3_bucket.this.arn
}

output "object_key" {
  description = "Clave del documento."
  value       = aws_s3_object.readme.key
}

output "descriptor" {
  description = "Datos necesarios para verificar el almacenamiento."

  value = {
    bucket_name = aws_s3_bucket.this.bucket
    bucket_arn  = aws_s3_bucket.this.arn
    object_key  = aws_s3_object.readme.key
  }
}
```

El descriptor incluye referencias a ambos recursos.

---

## 29. Outputs estructurados del módulo raíz

Crea `outputs.tf` en el directorio principal.

### 29.1. Mapa de resultados

```hcl
output "bucket_names" {
  description = "Nombres de bucket por clave lógica."

  value = {
    for key, storage in module.storage :
    key => storage.bucket_name
  }
}

output "storage_summary" {
  description = "Interfaz de verificación por almacenamiento."

  value = {
    for key, storage in module.storage :
    key => storage.descriptor
  }
}

output "storage_count" {
  description = "Número de almacenamientos declarados."
  value       = length(module.storage)
}
```

### 29.2. Estabilidad

El mapa conserva claves lógicas.

Los scripts pueden consultar `docs` sin depender de un índice.

---

## 30. Outputs auxiliares y precondición

Añade al mismo archivo raíz.

### 30.1. Consulta y validación

```hcl
output "docs_bucket_name" {
  description = "Nombre del bucket docs."
  value       = try(module.storage["docs"].bucket_name, null)
}

output "local_s3_endpoint" {
  description = "Endpoint local; no representa AWS real."
  value       = "http://localhost:4566"
}

output "verification_contract" {
  description = "Contrato mínimo del laboratorio."

  value = {
    endpoint = "http://localhost:4566"
    region   = "us-east-1"
  }

  precondition {
    condition     = contains(var.storage_names, "docs")
    error_message = "Esta práctica requiere el almacenamiento docs."
  }
}
```

### 30.2. Decisión

El endpoint se publica para verificación.

No representa una URL de descarga del objeto.

---

## 31. Sesión práctica 1: despliegue inicial

Duración orientativa: 25 minutos.

### 31.1. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
```

### 31.2. Plan

```bash
terraform plan -out=lab.tfplan
```

Con las entradas iniciales deberían aparecer cuatro recursos nuevos.

Dos buckets y dos objetos.

### 31.3. Aplicación

```bash
terraform apply lab.tfplan
```

Un plan guardado se aplica sin otra aprobación interactiva.

### 31.4. Entregable

Identifica las salidas conocidas durante el plan.

Identifica las que Terraform presenta como pendientes.

---

## 32. Sesión práctica 2: consulta humana

Consulta las salidas sin utilizar herramientas externas.

### 32.1. Listado

```bash
terraform output
```

### 32.2. Consultas individuales

```bash
terraform output storage_count
terraform output bucket_names
terraform output storage_summary
```

### 32.3. Consulta cruda

```bash
terraform output -raw docs_bucket_name
```

### 32.4. Comparación

Observa las comillas y estructuras de presentación.

No asumas que el formato humano es una API estable para scripts.

### 32.5. Entregable

Explica qué formato utilizarías para una persona y cuál para una automatización.

---

## 33. Sesión práctica 3: procesamiento JSON

Duración orientativa: 20 minutos.

### 33.1. Todas las salidas

```bash
terraform output -json | jq 'keys'
```

### 33.2. Una estructura

```bash
terraform output -json storage_summary | jq '.docs'
```

### 33.3. Extraer cadena

```bash
terraform output -json storage_summary \
  | jq -r '.docs.bucket_name'
```

### 33.4. Comparación de rutas

```bash
terraform output -json \
  | jq -r '.storage_summary.value.docs.bucket_name'
```

### 33.5. Entregable

Documenta por qué una consulta necesita `.value` y la otra no.

---

## 34. Sesión práctica 4: verificar S3

Utiliza los outputs como entradas de AWS CLI.

### 34.1. Recuperar datos

```bash
BUCKET="$(terraform output -raw docs_bucket_name)"
ENDPOINT="$(terraform output -raw local_s3_endpoint)"
```

### 34.2. Comprobar bucket

```bash
aws \
  --endpoint-url="$ENDPOINT" \
  --region us-east-1 \
  s3api head-bucket \
  --bucket "$BUCKET"
```

Una ejecución correcta puede no mostrar contenido.

### 34.3. Listar objetos

```bash
aws \
  --endpoint-url="$ENDPOINT" \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$BUCKET"
```

---

## 35. Sesión práctica 5: descargar mediante el descriptor

Recupera bucket y clave desde una salida estructurada.

### 35.1. Preparación

```bash
SUMMARY="$(terraform output -json storage_summary)"
BUCKET="$(printf '%s' "$SUMMARY" | jq -er '.docs.bucket_name')"
KEY="$(printf '%s' "$SUMMARY" | jq -er '.docs.object_key')"
```

### 35.2. Descarga

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${BUCKET}/${KEY}" \
  ./README-descargado.txt
```

### 35.3. Lectura

```bash
cat README-descargado.txt
```

### 35.4. Resultado

El contenido debe corresponder al almacenamiento `docs`.

Una URI `s3://` no incorpora el endpoint local.

---

## 36. Sesión práctica 6: verificar todas las instancias

Crea `verify.sh` para practicar automatización.

### 36.1. Script

```bash
#!/usr/bin/env bash
set -euo pipefail

summary="$(terraform output -json storage_summary)"
endpoint="$(terraform output -raw local_s3_endpoint)"

while IFS=$'\t' read -r logical_name bucket object_key; do
  printf 'Verificando %s\n' "$logical_name"

  aws \
    --endpoint-url="$endpoint" \
    --region us-east-1 \
    s3api head-object \
    --bucket "$bucket" \
    --key "$object_key" \
    >/dev/null
done < <(
  printf '%s' "$summary" | jq -r '
    to_entries[] |
    [.key, .value.bucket_name, .value.object_key] |
    @tsv
  '
)
```

### 36.2. Ejecución

```bash
bash verify.sh
```

---

## 37. Sesión práctica 7: añadir solo una salida

Una nueva salida no exige crear otro recurso remoto.

### 37.1. Añadir

```hcl
output "ordered_storage_names" {
  description = "Claves lógicas ordenadas."
  value       = sort(keys(module.storage))
}
```

### 37.2. Plan

```bash
terraform plan -out=outputs.tfplan
```

### 37.3. Observación

El plan debería mostrar cambios de outputs sin cambios en recursos.

### 37.4. Aplicación

```bash
terraform apply outputs.tfplan
terraform output ordered_storage_names
```

### 37.5. Principio

Editar el archivo no actualiza por sí solo el estado.

---

## 38. Sesión práctica 8: sensibilidad con datos ficticios

No utilices secretos reales.

### 38.1. Salida temporal

```hcl
output "training_token" {
  description = "Valor ficticio para estudiar sensibilidad."
  value       = "NO-ES-UN-SECRETO-REAL"
  sensitive   = true
}
```

### 38.2. Aplicar y comparar

```bash
terraform apply
terraform output
terraform output training_token
terraform output -raw training_token
terraform output -json training_token
```

Revisa el plan antes de confirmar.

### 38.3. Entregable

Explica qué consultas ocultan el valor y cuáles lo revelan.

Después elimina la salida temporal y aplica el cambio.

---

## 39. Sesión práctica 9: precondición fallida

Esta prueba no necesita crear nuevos recursos.

### 39.1. Plan temporal

```bash
terraform plan \
  -var='storage_names=["reports"]'
```

### 39.2. Observación

La precondición exige que exista la clave `docs`.

El plan debe mostrar el error correspondiente.

### 39.3. No aplicar

No guardes ni apliques esta configuración de prueba.

### 39.4. Restauración

```bash
terraform plan
```

### 39.5. Entregable

Diferencia una precondición fallida de una salida nula.

No son mecanismos equivalentes.

---

## 40. Estado, refresco y verificación

Los outputs representan resultados registrados por Terraform.

### 40.1. Consulta sin refresco

```bash
terraform output
```

No consulta directamente S3.

### 40.2. Plan normal

```bash
terraform plan
```

Terraform normalmente refresca recursos antes de calcular cambios.

### 40.3. Refresco explícito

```bash
terraform plan -refresh-only
```

Revisa el resultado antes de actualizar el estado.

### 40.4. Advertencia

Si faltan objetos remotos, un refresco puede reflejar esa pérdida.

No lo utilices para recrear recursos: ese es un objetivo diferente.

---

## 41. Compatibilidad, seguridad y AWS real

Los outputs son contratos operativos, no pruebas completas de infraestructura.

### 41.1. Cambios compatibles

Añadir una salida nueva suele permitir conservar consumidores existentes.

### 41.2. Cambios incompatibles

Renombrar una salida o cambiar su estructura puede romper scripts.

Versiona y documenta esos cambios.

### 41.3. Recursos locales

Un ARN de LocalStack no demuestra existencia en AWS.

Un endpoint local solo funciona desde un contexto de red compatible.

### 41.4. Estado remoto

`terraform_remote_state` puede recuperar salidas raíz de otro estado.

Pero acceder al estado puede implicar acceso a más información que las salidas visibles.

No lo desarrollamos en este laboratorio.

---

## 42. Limpieza, ejercicios y resumen

Finaliza con una destrucción controlada.

### 42.1. Limpieza

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
docker compose down
rm -f lab.tfplan outputs.tfplan destroy.tfplan README-descargado.txt
```

Revisa el plan y verifica los buckets antes de apagar LocalStack.

### 42.2. Ejercicios

1. Añade una salida de URI por almacenamiento.
2. Comprueba que las URI no incluyen el endpoint.
3. Publica solo nombres y claves, sin ARN.
4. Modifica el script para verificar ese contrato.
5. Documenta una consulta a una salida inexistente.

### 42.3. Resumen

Las salidas publican resultados y conectan módulos.

`-raw` sirve para valores simples.

`-json` sirve para estructuras y automatización.

La sensibilidad no sustituye la protección del estado.

La verificación real requiere consultar el servicio correspondiente.