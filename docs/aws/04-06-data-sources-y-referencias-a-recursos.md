# Data sources y referencias a recursos en Terraform

Las fuentes de datos permiten consultar información que Terraform necesita para construir una configuración.

Las referencias permiten conectar esa información con recursos, expresiones y resultados.

La distinción principal no consiste en si un objeto existe antes del despliegue.

Consiste en quién es responsable de gestionarlo.

Un bloque `resource` declara un objeto gestionado por Terraform.

Un bloque `data` consulta información mediante un proveedor sin asumir, por esa consulta, la gestión del objeto remoto.

En esta lección trabajarás con buckets y documentos S3 emulados en LocalStack.

Crearás un origen externo mediante AWS CLI y una configuración Terraform que consume sus datos.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos

Esta lección combina consultas, referencias y delimitación de responsabilidades.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Diferenciar `resource` y `data`.
- Consultar un bucket existente.
- Leer un objeto de texto desde S3.
- Transformar JSON mediante `jsondecode`.
- Referenciar atributos de recursos gestionados.
- Interpretar valores conocidos y desconocidos.
- Reconocer lecturas diferidas.
- Diagnosticar consultas fallidas.
- Verificar los resultados con AWS CLI.
- Limpiar recursos según su propietario.

### 1.2. Resultado práctico

Construirás un informe y una copia de configuración en un bucket gestionado.

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
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer variables, locales, recursos, outputs y dependencias.

Los comandos utilizan una terminal compatible con Bash.

---

## 3. Compatibilidad del laboratorio

La combinación concreta debe validarse antes de distribuir la práctica.

### 3.1. Comprobaciones del docente

Verifica en la imagen y edición elegidas:

- Creación y consulta de buckets.
- Escritura y lectura de objetos.
- Consulta de `aws_s3_bucket`.
- Consulta de `aws_s3_object`.
- Disponibilidad del atributo `body` para JSON.
- Actualización y eliminación de objetos.
- Destrucción de recursos gestionados.

### 3.2. Registro de versiones

Conserva la versión de Terraform y `.terraform.lock.hcl`.

Documenta la imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones del curso no identifican necesariamente las versiones más recientes.

---

## 4. Qué es una fuente de datos

Una fuente de datos utiliza el proveedor para obtener información.

### 4.1. Ejemplo conceptual

```hcl
data "aws_s3_bucket" "catalog" {
  bucket = var.catalog_bucket_name
}
```

### 4.2. Interpretación

Terraform consulta el bucket indicado.

La declaración no solicita crear ese bucket.

### 4.3. Responsabilidad

La consulta no convierte el bucket en un recurso gestionado por esta configuración.

### 4.4. Consecuencia

Destruir esta configuración no elimina el bucket únicamente por haberlo consultado.

---

## 5. Recursos y fuentes de datos

La responsabilidad de gestión es la diferencia central.

### 5.1. Comparación

| **Elemento** | **Declaración** | **Responsabilidad** |
|--------------|-----------------|--------------------|
| Recurso | `resource "aws_s3_bucket" "lab"` | Gestionar el objeto declarado |
| Fuente de datos | `data "aws_s3_bucket" "catalog"` | Consultar un objeto |
| Variable | `variable "catalog_bucket_name"` | Recibir una entrada |
| Local | `locals { ... }` | Nombrar una expresión |
| Output | `output "bucket_name"` | Publicar un resultado |

Cada mecanismo ocupa un lugar diferente en la configuración.

### 5.2. Advertencia

Un objeto existente también puede gestionarse mediante importación.

Su existencia previa no obliga a utilizar una fuente de datos.

---

## 6. Cuándo utilizar una fuente de datos

La consulta debe responder a una necesidad concreta.

### 6.1. Casos habituales

- Consumir un bucket gestionado por otro equipo.
- Leer un documento de configuración externo.
- Consultar metadatos de un objeto.
- Resolver información necesaria para un recurso.
- Obtener datos que mantiene otro sistema.

### 6.2. Pregunta principal

¿Necesitas consultar el objeto o asumir su gestión?

### 6.3. Regla orientativa

Si solamente consumes información externa, considera `data`.

Si debes gestionar su configuración, considera un recurso y, cuando corresponda, importación.

### 6.4. Criterio

No añadas consultas que duplican información ya disponible mediante referencias.

---

## 7. Referencias a recursos gestionados

Un recurso publica atributos que pueden utilizar otras expresiones.

### 7.1. Ejemplo

```hcl
resource "aws_s3_object" "report" {
  bucket  = aws_s3_bucket.destination.id
  key     = "report.txt"
  content = "Informe del laboratorio."
}
```

### 7.2. Referencia

```hcl
aws_s3_bucket.destination.id
```

### 7.3. Efecto

La referencia proporciona un valor y expresa una dependencia.

### 7.4. Recomendación

Utiliza el atributo del recurso cuando ambos elementos pertenecen a la misma configuración.

---

## 8. Referencias a fuentes de datos

Las fuentes de datos utilizan el prefijo `data`.

### 8.1. Ejemplos

```hcl
data.aws_s3_bucket.catalog.arn
data.aws_s3_bucket.catalog.id
data.aws_s3_object.settings.body
```

### 8.2. Componentes

La referencia identifica:

- El espacio `data`.
- El tipo de fuente.
- Su nombre local.
- El atributo consultado.

### 8.3. Precaución

Los atributos disponibles dependen del esquema del proveedor.

No presupongas que todas las fuentes publican los mismos campos.

---

## 9. Nombres locales y nombres remotos

Los nombres de los bloques pertenecen a Terraform.

### 9.1. Ejemplo

```hcl
data "aws_s3_bucket" "catalog" {
  bucket = "curso-datos-origen-alumno01"
}
```

### 9.2. Diferencia

`catalog` es el nombre local de la fuente de datos.

`curso-datos-origen-alumno01` es el nombre remoto del bucket.

### 9.3. Consecuencia

Cambiar el nombre local modifica las referencias de la configuración.

No renombra el bucket remoto.

### 9.4. Recomendación

Utiliza nombres locales que expliquen la responsabilidad del elemento.

---

## 10. El grafo de dependencias

Terraform utiliza referencias para organizar consultas y operaciones.

### 10.1. Flujo conceptual

```text
Entrada → Consulta externa → Expresión local → Recurso gestionado
```

### 10.2. Lectura

Una fuente necesita conocer sus argumentos antes de consultar.

### 10.3. Consumo

Un recurso que utiliza sus resultados depende de esa información.

### 10.4. Orden visual

El nombre del archivo no establece la secuencia.

Puedes declarar los recursos antes de las fuentes de datos en el archivo.

Las referencias siguen determinando las relaciones necesarias.

---

## 11. Lecturas durante el plan

Terraform intenta leer las fuentes cuando dispone de la información necesaria.

### 11.1. Caso sencillo

El nombre del bucket procede de una variable conocida.

La consulta puede realizarse durante el plan.

### 11.2. Resultado

Los atributos consultados pueden aparecer como valores conocidos.

### 11.3. Requisito

El servicio debe estar disponible y la consulta debe ser válida.

### 11.4. Advertencia

`terraform validate` no demuestra que el bucket exista.

La comprobación remota ocurre al evaluar operaciones que consultan el proveedor.

---

## 12. Lecturas diferidas al apply

Algunas consultas no pueden completarse durante el plan.

### 12.1. Motivos habituales

- Un argumento depende de un resultado todavía desconocido.
- Existe una dependencia con operaciones pendientes.
- La consulta necesita un recurso que aún debe crearse.
- Una condición depende de información disponible posteriormente.

### 12.2. Mensaje orientativo

```text
will be read during apply
```

### 12.3. Consecuencia

Los resultados pueden aparecer como desconocidos durante la planificación.

### 12.4. Criterio

Una lectura diferida no es automáticamente un error.

Debes comprobar si responde al diseño esperado.

---

## 13. Valores desconocidos

Un valor desconocido es información pendiente, no una cadena especial.

### 13.1. Presentación habitual

```text
known after apply
```

### 13.2. Significado

Terraform todavía no puede determinar el valor concreto.

### 13.3. Lo que no significa

No significa necesariamente:

- Que la consulta haya fallado.
- Que el atributo esté vacío.
- Que debas introducir un valor manual.
- Que exista una dependencia circular.

### 13.4. Regla

Revisa el origen del valor y su momento de evaluación.

---

## 14. `depends_on` en fuentes de datos

Una dependencia explícita puede modificar el momento de lectura.

### 14.1. Ejemplo conceptual

```hcl
data "aws_s3_bucket" "published" {
  bucket = aws_s3_bucket.destination.bucket

  depends_on = [
    aws_s3_object.report
  ]
}
```

### 14.2. Interpretación

La consulta debe esperar las operaciones relacionadas con el informe.

### 14.3. Precaución

Esto puede diferir la lectura y ampliar valores desconocidos.

### 14.4. Recomendación

No utilices `depends_on` sin una necesidad de comportamiento bien justificada.

---

## 15. Consultas redundantes

No siempre necesitas volver a consultar un recurso gestionado.

### 15.1. Patrón innecesario

Crear un bucket y consultar después ese mismo bucket solamente para obtener su ARN.

### 15.2. Alternativa

```hcl
aws_s3_bucket.destination.arn
```

### 15.3. Ventajas

Evitas una consulta adicional.

Mantienes un grafo más sencillo.

### 15.4. Excepción

Una lectura posterior puede estar justificada si necesitas información específica no disponible en el recurso.

### 15.5. Regla

Explica qué aporta la fuente de datos.

---

## 16. Diseño del laboratorio

Separaremos origen externo y destino gestionado.

### 16.1. Origen

AWS CLI creará un bucket con un documento JSON.

Terraform lo consultará mediante dos fuentes de datos.

### 16.2. Destino

Terraform creará otro bucket y dos objetos.

### 16.3. Objetos de destino

Un informe describirá los datos consultados.

Una copia conservará el documento leído.

### 16.4. Propiedad

Terraform gestionará únicamente el destino.

El origen se limpiará mediante AWS CLI.

---

## 17. Preparación del directorio

Trabaja en una carpeta independiente.

### 17.1. Crear estructura

```bash
mkdir -p terraform-data-localstack/seed
mkdir -p terraform-data-localstack/planes
mkdir -p terraform-data-localstack/descargas
cd terraform-data-localstack
```

### 17.2. Archivos previstos

```text
terraform-data-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── data.tf
├── locals.tf
├── main.tf
└── outputs.tf
```

---

## 18. Protección de archivos

La práctica utiliza datos ficticios, pero mantiene hábitos de protección.

### 18.1. `.gitignore`

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

### 18.2. Qué versionar

Versiona la configuración y `.terraform.lock.hcl`.

El documento ficticio de `seed/` puede formar parte del material del curso.

### 18.3. Precaución

Los estados y planes pueden contener información leída desde fuentes externas.

---

## 19. Selección de LocalStack

El docente debe proporcionar una referencia validada.

### 19.1. Imagen

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 19.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

No presupongas que una etiqueta flotante mantiene el comportamiento.

### 19.3. Alcance

Solo utilizaremos S3.

No se requiere montar el socket de Docker para estas operaciones.

### 19.4. Continuación

No arranques el laboratorio manteniendo el marcador.

---

## 20. Docker Compose

Publicaremos LocalStack únicamente en la interfaz local.

### 20.1. `compose.yaml`

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

### 20.2. Arranque

```bash
docker compose up -d
docker compose ps
```

### 20.3. Diagnóstico

Consulta `docker compose logs --tail=100 localstack` si el servicio falla.

---

## 21. Credenciales ficticias y conexión

Configura AWS CLI en la terminal actual.

### 21.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 21.2. Consulta inicial

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 21.3. Continuación

Espera una respuesta válida antes de crear el origen.

---

## 22. Identificadores del laboratorio

Utiliza el mismo sufijo en AWS CLI y Terraform.

### 22.1. Variables de terminal

```bash
LAB_SUFFIX=alumno01
SOURCE_BUCKET="curso-datos-origen-${LAB_SUFFIX}"
DESTINATION_BUCKET="curso-datos-destino-${LAB_SUFFIX}"
SOURCE_KEY="config/settings.json"
```

### 22.2. Revisión

```bash
printf 'Origen: %s\n' "$SOURCE_BUCKET"
printf 'Destino: %s\n' "$DESTINATION_BUCKET"
```

### 22.3. Precaución

Dos alumnos que comparten un mismo LocalStack necesitan identificadores diferentes.

### 22.4. Alcance

Estas variables de shell no se convierten automáticamente en variables de Terraform.

---

## 23. Documento externo de configuración

Crea un documento pequeño y legible.

### 23.1. `seed/settings.json`

```json
{
  "project": "curso-data-sources",
  "environment": "local",
  "revision": 1,
  "owner": "equipo-catalogo",
  "features": ["reports", "snapshots"]
}
```

### 23.2. Validación local

```bash
jq -e '.' seed/settings.json
```

### 23.3. Propósito

El documento representa información que mantiene otro sistema.

No contiene credenciales ni secretos.

---

## 24. Creación del origen mediante AWS CLI

El origen no se declarará como recurso Terraform.

### 24.1. Crear bucket

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api create-bucket \
  --bucket "$SOURCE_BUCKET"
```

### 24.2. Subir documento

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object \
  --bucket "$SOURCE_BUCKET" \
  --key "$SOURCE_KEY" \
  --body seed/settings.json \
  --content-type application/json
```

### 24.3. Reejecución

Si el bucket ya existe, verifica su propietario y contenido antes de continuar.

---

## 25. Comprobación del origen

Consulta el objeto antes de utilizar Terraform.

### 25.1. Metadatos

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api head-object \
  --bucket "$SOURCE_BUCKET" \
  --key "$SOURCE_KEY"
```

### 25.2. Descarga

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${SOURCE_BUCKET}/${SOURCE_KEY}" descargas/source.json
```

### 25.3. Lectura

```bash
jq '.' descargas/source.json
```

### 25.4. Resultado

Comprueba revisión uno y tipo de contenido `application/json`.

---

## 26. Requisitos de Terraform

Crea `versions.tf`.

### 26.1. Configuración

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

### 26.2. Interpretación

Terraform utiliza el proveedor AWS para recursos y consultas S3.

### 26.3. Reproducibilidad

El archivo de bloqueo registra la versión concreta seleccionada.

---

## 27. Proveedor con endpoint local

Crea `providers.tf`.

### 27.1. Configuración

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

### 27.2. Alcance

Solo S3 está redirigido.

No añadas consultas de otros servicios sin revisar sus endpoints.

---

## 28. Variables del proyecto

Crea `variables.tf`.

### 28.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "source_bucket_name" {
  type     = string
  nullable = false
}

variable "source_object_key" {
  type    = string
  default = "config/settings.json"
}
```

### 28.2. Responsabilidad

Las entradas identifican qué objeto externo debe consultarse.

---

## 29. Valores de entrada

Crea `terraform.tfvars`.

### 29.1. Configuración

```hcl
suffix             = "alumno01"
source_bucket_name = "curso-datos-origen-alumno01"
source_object_key  = "config/settings.json"
```

### 29.2. Coherencia

El nombre debe coincidir con el bucket creado mediante AWS CLI.

### 29.3. Si utilizas otro sufijo

Actualiza tanto la terminal como este archivo.

### 29.4. Precaución

Terraform no descubre automáticamente las variables de shell del laboratorio.

Una discrepancia de nombres puede producir una consulta fallida.

---

## 30. Consulta del bucket y del objeto

Crea `data.tf`.

### 30.1. Fuentes de datos

```hcl
data "aws_s3_bucket" "source" {
  bucket = var.source_bucket_name
}

data "aws_s3_object" "settings" {
  bucket = data.aws_s3_bucket.source.id
  key    = var.source_object_key

  lifecycle {
    postcondition {
      condition     = self.body != null
      error_message = "El objeto debe publicar contenido de texto legible."
    }
  }
}
```

### 30.2. Dependencia

La consulta del objeto utiliza el identificador obtenido del bucket.

---

## 31. Contenido del objeto y tipo MIME

El atributo `body` no debe tratarse como una descarga binaria universal.

### 31.1. Documento del laboratorio

Utilizamos JSON con:

```text
Content-Type: application/json
```

### 31.2. Compatibilidad

El proveedor AWS limita la exposición del cuerpo a tipos de contenido considerados adecuados.

JSON y tipos de texto forman parte del caso utilizado en esta práctica.

### 31.3. Archivos binarios

No diseñes esta técnica para descargar imágenes o archivos grandes.

### 31.4. Diagnóstico

Si `body` no está disponible, revisa contenido, metadatos y versión del proveedor.

---

## 32. Transformación de JSON

Crea `locals.tf`.

### 32.1. Valores derivados

```hcl
locals {
  destination_name = "curso-datos-destino-${var.suffix}"

  source_config = jsondecode(data.aws_s3_object.settings.body)

  report_content = jsonencode({
    source_bucket = data.aws_s3_bucket.source.id
    source_arn    = data.aws_s3_bucket.source.arn
    source_key    = data.aws_s3_object.settings.key
    project       = local.source_config.project
    environment   = local.source_config.environment
    revision      = local.source_config.revision
    owner         = local.source_config.owner
    features      = local.source_config.features
    source_sha256 = sha256(data.aws_s3_object.settings.body)
  })
}
```

---

## 33. Contrato del documento externo

Leer JSON válido no garantiza que tenga los atributos esperados.

### 33.1. Contrato del laboratorio

El documento debe incluir:

- `project`.
- `environment`.
- `revision`.
- `owner`.
- `features`.

### 33.2. Tipos esperados

Proyecto, entorno y propietario son cadenas.

Revisión es un número.

Características es una lista de cadenas.

### 33.3. Advertencia

`jsondecode` valida la sintaxis JSON, no todo este contrato de negocio.

Los accesos posteriores pueden fallar si faltan atributos.

---

## 34. Bucket gestionado de destino

Crea `main.tf`.

### 34.1. Configuración

```hcl
resource "aws_s3_bucket" "destination" {
  bucket        = local.destination_name
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
    Source     = data.aws_s3_bucket.source.id
  }

  lifecycle {
    precondition {
      condition     = local.source_config.environment == "local"
      error_message = "El documento externo debe indicar environment = local."
    }
  }
}
```

### 34.2. Advertencia

`force_destroy` se utiliza únicamente para datos ficticios.

---

## 35. Informe y copia gestionada

Añade estos recursos a `main.tf`.

### 35.1. Objetos

```hcl
resource "aws_s3_object" "report" {
  bucket       = aws_s3_bucket.destination.id
  key          = "reports/source-report.json"
  content_type = "application/json"
  content      = local.report_content
}

resource "aws_s3_object" "snapshot" {
  bucket       = aws_s3_bucket.destination.id
  key          = "snapshots/settings.json"
  content_type = "application/json"
  content      = data.aws_s3_object.settings.body
}
```

### 35.2. Propiedad

Estos dos objetos sí están gestionados por Terraform.

### 35.3. Nombre snapshot

Es una copia actualizable, no un historial inmutable de revisiones.

---

## 36. Outputs del proyecto

Crea `outputs.tf`.

### 36.1. Resultados

```hcl
output "source_bucket_name" {
  value = data.aws_s3_bucket.source.id
}

output "destination_bucket_name" {
  value = aws_s3_bucket.destination.bucket
}

output "source_revision" {
  value = local.source_config.revision
}

output "destination_keys" {
  value = {
    report   = aws_s3_object.report.key
    snapshot = aws_s3_object.snapshot.key
  }
}
```

### 36.2. Alcance

Los outputs publican resultados; no realizan una comprobación remota nueva al consultarlos.

---

## 37. Sesión 1: inicialización y consola

Duración orientativa: 20 minutos.

### 37.1. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
```

### 37.2. Consola

```bash
terraform console
```

### 37.3. Consultas iniciales

```hcl
var.source_bucket_name
var.source_object_key
local.destination_name
```

### 37.4. Precaución

Antes de aplicar, algunos resultados de fuentes pueden no estar disponibles en la consola.

---

## 38. Sesión 2: planificar las consultas

El origen debe existir antes de esta sesión.

### 38.1. Plan guardado

```bash
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 38.2. Resultado esperado

Deben crearse tres recursos.

Un bucket y dos objetos.

### 38.3. Fuentes de datos

Las consultas no se cuentan como tres recursos remotos adicionales que deban crearse.

### 38.4. Entregable

Identifica las dos lecturas y las tres operaciones de creación.

---

## 39. Sesión 3: aplicar el plan

La aplicación utiliza el artefacto revisado.

### 39.1. Comando

```bash
terraform apply planes/create.tfplan
```

### 39.2. Consultar resultados

```bash
terraform output
terraform state list
```

### 39.3. Observación

El estado puede incluir direcciones `data` y direcciones de recursos.

### 39.4. Diferencia

La presencia de una fuente en el estado no implica propiedad del bucket externo.

### 39.5. Entregable

Clasifica cada dirección como consulta o recurso gestionado.

---

## 40. Sesión 4: verificar el destino

Comprueba los objetos con AWS CLI.

### 40.1. Nombre

```bash
DESTINATION_BUCKET="$(terraform output -raw destination_bucket_name)"
```

### 40.2. Descargas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${DESTINATION_BUCKET}/reports/source-report.json" \
  descargas/report.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${DESTINATION_BUCKET}/snapshots/settings.json" \
  descargas/snapshot.json
```

### 40.3. Consulta

Ejecuta `jq '.'` sobre los dos archivos descargados.

---

## 41. Sesión 5: comparar origen y copia

La copia debe conservar los bytes del documento consultado.

### 41.1. Comparación

```bash
cmp descargas/source.json descargas/snapshot.json
```

### 41.2. Hash en Linux

```bash
sha256sum descargas/source.json descargas/snapshot.json
```

### 41.3. macOS

Utiliza `shasum -a 256` sobre ambos archivos.

### 41.4. Informe

Compara el hash obtenido con `source_sha256` del informe.

### 41.5. Límite

Un hash sin autenticación no demuestra quién publicó el documento.

---

## 42. Sesión 6: consultar resultados con la consola

Después de aplicar, examina los valores conocidos.

### 42.1. Consola

```bash
terraform console
```

### 42.2. Expresiones

```hcl
data.aws_s3_bucket.source.arn
data.aws_s3_object.settings.body
local.source_config.revision
local.source_config.features
jsondecode(local.report_content)
```

### 42.3. Entregable

Distingue atributos leídos, valores transformados y resultados generados.

### 42.4. Continuación

Escribe `exit` antes de ejecutar otros comandos Terraform.

---

## 43. Sesión 7: modificar el origen externo

El cambio se realiza fuera de Terraform.

### 43.1. Actualizar documento

```bash
jq '.revision = 2 | .owner = "equipo-catalogo-v2"' \
  seed/settings.json > seed/settings-v2.json
```

### 43.2. Publicar revisión

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object \
  --bucket "$SOURCE_BUCKET" \
  --key "$SOURCE_KEY" \
  --body seed/settings-v2.json \
  --content-type application/json
```

### 43.3. Plan

Genera un nuevo plan y observa los objetos de destino.

---

## 44. Sesión 8: propagar la información nueva

La configuración Terraform no ha cambiado, pero la entrada externa sí.

### 44.1. Plan guardado

```bash
terraform plan -out=planes/update.tfplan
terraform show planes/update.tfplan
```

### 44.2. Resultado esperado

El informe y la copia deben actualizarse.

El nombre del bucket de destino no cambia.

### 44.3. Aplicación

```bash
terraform apply planes/update.tfplan
terraform output source_revision
```

### 44.4. Entregable

Explica por qué un plan puede proponer cambios sin modificaciones de archivos `.tf`.

---

## 45. Planes guardados y datos externos

La revisión debe considerar la ventana entre lectura y aplicación.

### 45.1. Caso del laboratorio

Las fuentes se leen durante el plan cuando sus argumentos son conocidos.

Los contenidos calculados quedan incorporados a la propuesta guardada.

### 45.2. Cambio posterior

Si el origen cambia después, no esperes que la aplicación vuelva a planificarlo completamente.

### 45.3. Lecturas diferidas

Una fuente pendiente puede leerse durante el apply.

Su resultado no estaba completamente disponible en la revisión anterior.

### 45.4. Regla

Si conoces cambios relevantes del origen, genera y revisa otro plan.

---

## 46. Sesión 9: consultar un objeto inexistente

Esta prueba no modifica el origen.

### 46.1. Comando

```bash
terraform plan \
  -var='source_object_key=config/no-existe.json'
```

### 46.2. Resultado esperado

La consulta debe fallar porque no existe el objeto indicado.

### 46.3. Diagnóstico

Revisa bucket, clave, endpoint y permisos.

### 46.4. Qué no hacer

No añadas una cadena alternativa para ocultar un objeto obligatorio ausente.

### 46.5. Lección

`try` no captura automáticamente errores de lectura remota del proveedor.

---

## 47. Sesión 10: provocar JSON inválido

Esta práctica altera temporalmente el documento externo.

### 47.1. Archivo incorrecto

```bash
printf '{"project":\n' > seed/invalid.json
```

### 47.2. Publicar

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-object --bucket "$SOURCE_BUCKET" --key "$SOURCE_KEY" \
  --body seed/invalid.json --content-type application/json
```

### 47.3. Prueba

Ejecuta `terraform plan` y observa el error de `jsondecode`.

### 47.4. Restauración

Publica nuevamente `seed/settings-v2.json` con tipo `application/json`.

---

## 48. Validación del contrato y uso de `try`

Las alternativas deben normalizar datos, no ocultar fallos obligatorios.

### 48.1. Patrón conceptual

```hcl
locals {
  owner = try(local.source_config.owner, "sin-propietario")
}
```

### 48.2. Uso adecuado

Puede servir cuando el contrato permite omitir `owner`.

### 48.3. Uso inadecuado

No debe convertir silenciosamente una configuración obligatoria incompleta en una válida.

### 48.4. Distinción

`try` trabaja con errores de evaluación de expresiones.

No sustituye la disponibilidad del servicio ni los permisos de consulta.

---

## 49. Fuentes opcionales y `for_each`

Puedes decidir si una consulta debe existir.

### 49.1. Patrón conceptual independiente

```hcl
data "aws_s3_bucket" "optional" {
  for_each = var.enable_lookup ? {
    primary = var.optional_bucket_name
  } : {}

  bucket = each.value
}
```

No añadas este fragmento sin declarar sus variables.

### 49.2. Ventaja

Con la opción deshabilitada no se instancia esa consulta.

### 49.3. Referencias

Los consumidores deben contemplar la ausencia de la clave `primary`.

---

## 50. Recursos con varias instancias

Las fuentes y los recursos utilizan direcciones según su repetición.

### 50.1. Con `count`

```hcl
data.aws_s3_bucket.example[0].arn
```

### 50.2. Con `for_each`

```hcl
data.aws_s3_bucket.example["docs"].arn
```

### 50.3. Mapa de resultados

```hcl
{
  for key, bucket in data.aws_s3_bucket.example :
  key => bucket.arn
}
```

### 50.4. Regla

Utiliza claves o cantidades conocidas durante el plan para establecer las instancias.

---

## 51. Módulos y resultados publicados

Los módulos deben exponer una interfaz clara.

### 51.1. Ejemplo conceptual

```hcl
module "consumer" {
  source = "./modules/consumer"

  source_bucket_arn = data.aws_s3_bucket.source.arn
}
```

### 51.2. Encapsulación

El consumidor recibe el dato que necesita.

No debe conocer los detalles internos de la consulta si no forman parte de su responsabilidad.

### 51.3. Recomendación

Decide qué módulo es responsable de consultar.

Evita repetir la misma búsqueda en todos los módulos sin necesidad.

---

## 52. Estado remoto, importación y responsabilidad

Estos mecanismos no sustituyen una fuente de datos ordinaria.

### 52.1. Estado remoto

`terraform_remote_state` permite consumir outputs de otra configuración.

El acceso al backend puede implicar acceso al estado completo, no solamente a sus outputs.

### 52.2. Importación

Importar asocia un objeto existente con una dirección de recurso gestionado.

No es una consulta de solo lectura.

### 52.3. Decisión

Consulta cuando consumes información.

Importa cuando asumes gestión y has definido el procedimiento correspondiente.

### 52.4. Seguridad

Delimita permisos, contratos y propietarios antes de compartir información entre proyectos.

---

## 53. Limpieza de los recursos gestionados

Destruye primero el destino mientras el origen sigue disponible.

### 53.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
```

### 53.2. Comprobación

```bash
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
```

### 53.3. Resultado esperado

El destino debe desaparecer.

El origen debe continuar existiendo porque no estaba gestionado como recurso.

---

## 54. Limpieza del origen y diferencias con AWS real

El origen pertenece al procedimiento de AWS CLI.

### 54.1. Eliminar origen

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 rm "s3://${SOURCE_BUCKET}" --recursive

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api delete-bucket --bucket "$SOURCE_BUCKET"

docker compose down
```

### 54.2. AWS real

Revisa permisos de lectura, versionado, cifrado, costes y límites.

### 54.3. Seguridad

No utilices objetos con secretos como entradas sin considerar su exposición en estado y planes.

---

## 55. Ejercicios y resumen

La idea central es separar información consumida de infraestructura gestionada.

### 55.1. Ejercicios

1. Añade un atributo al documento y publícalo en el informe.
2. Consulta otra clave S3 mediante una fuente independiente.
3. Diagnostica una clave inexistente.
4. Explica una lectura diferida.
5. Documenta el propietario del origen y del destino.
6. Verifica que destruir Terraform no elimina el origen.

### 55.2. Ideas esenciales

`data` consulta; `resource` gestiona.

Las referencias transmiten valores y expresan dependencias.

### 55.3. Idea final

Una configuración mantenible deja claro qué información necesita, de dónde procede y quién es responsable de cada objeto remoto.