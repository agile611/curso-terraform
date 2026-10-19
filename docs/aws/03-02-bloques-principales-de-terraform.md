# Bloques principales de Terraform

Terraform organiza la infraestructura mediante bloques de configuración.

Cada bloque tiene una responsabilidad concreta.

Algunos definen herramientas y proveedores.

Otros describen recursos, reciben parámetros o presentan resultados.

Comprender estas responsabilidades permite escribir proyectos más claros y revisar los planes con criterio.

En esta lección trabajarás con Terraform, el proveedor AWS y LocalStack.

Los despliegues utilizarán exclusivamente S3 emulado.

El objetivo no es aprender todas las opciones de S3.

El objetivo es comprender cómo colaboran los bloques de Terraform.

> **Entorno del curso:** Terraform para AWS con prácticas locales en LocalStack.
>
> Utiliza únicamente credenciales ficticias.
>
> Revisa los endpoints antes de aplicar cualquier configuración.
>
> LocalStack no reproduce todas las características ni garantías de AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección introduce los bloques fundamentales y los conecta en un laboratorio completo.

### 1.1. Conocimientos que adquirirás

Al finalizar podrás:

- Explicar la función del bloque `terraform`.
- Declarar proveedores con `required_providers`.
- Configurar un bloque `provider`.
- Crear recursos mediante `resource`.
- Consultar información con `data`.
- Declarar entradas con `variable`.
- Construir valores derivados con `locals`.
- Publicar resultados con `output`.
- Reutilizar configuraciones mediante `module`.
- Reconocer bloques anidados.
- Diferenciar bloques y metaargumentos.
- Identificar dependencias implícitas.
- Introducir comprobaciones con `check`.

### 1.2. Competencias prácticas

También podrás:

1. Preparar un proyecto raíz.
2. Inicializar dependencias.
3. Interpretar un plan.
4. Verificar recursos en LocalStack.
5. Crear un módulo local.
6. Modificar una configuración.
7. Diagnosticar errores habituales.
8. Destruir el laboratorio.

### 1.3. Entregable esperado

Entregarás una configuración organizada y un registro de pruebas.

No incluyas archivos de estado, planes binarios ni credenciales reales.

---

## 2. Requisitos previos

Debes haber completado la instalación de herramientas y la introducción a HCL.

### 2.1. Herramientas necesarias

Comprueba su disponibilidad:

```bash
terraform version
docker version
docker compose version
aws --version
```

El laboratorio requiere:

- Terraform 1.6 o superior dentro de la serie 1.x.
- Un proveedor AWS de la serie 5.x.
- Docker Compose.
- AWS CLI.
- Una imagen de LocalStack validada para las operaciones S3 utilizadas.

### 2.2. Conocimientos recomendados

Deberías reconocer:

- Cadenas de texto.
- Booleanos.
- Mapas.
- Referencias.
- Interpolación.
- Llaves y argumentos.
- Comandos básicos de terminal.

### 2.3. Preparación personal

Trabaja en un directorio nuevo.

Mantén una terminal para Terraform.

Puedes utilizar otra terminal para consultar LocalStack.

Si trabajas en pareja, alterna las funciones de ejecución y revisión.

---

## 3. Mapa general de bloques

Cada bloque responde a una pregunta diferente.

### 3.1. Vista resumida

| **Bloque** | **Pregunta que responde** | **Ejemplo** |
|------------|---------------------------|-------------|
| `terraform` | ¿Qué requisitos tiene la configuración? | Versiones y proveedores |
| `provider` | ¿Cómo accedemos a una plataforma? | Endpoint local de S3 |
| `resource` | ¿Qué objeto gestionamos? | Bucket S3 |
| `data` | ¿Qué información consultamos? | Bucket existente |
| `variable` | ¿Qué entradas acepta el proyecto? | Nombre del entorno |
| `locals` | ¿Qué valores calculamos? | Nombre del bucket |
| `output` | ¿Qué resultados exponemos? | ARN del bucket |
| `module` | ¿Qué configuración reutilizamos? | Módulo de almacenamiento |
| `check` | ¿Qué condición observamos? | Nombre esperado |

Esta tabla es una guía inicial.

Los detalles dependen del tipo de bloque y de la versión utilizada.

### 3.2. Flujo conceptual

```text
Variables
    ↓
Valores locales
    ↓
Proveedores y recursos
    ↓
Consultas y módulos
    ↓
Salidas y comprobaciones
```

El dibujo representa relaciones conceptuales.

No representa una ejecución estrictamente secuencial.

Terraform construye un grafo de dependencias.

---

## 4. Bloques, etiquetas y argumentos

La forma de un bloque determina cómo se identifica.

### 4.1. Estructura general

```hcl
tipo_de_bloque "etiqueta" {
  argumento = "valor"
}
```

Algunos bloques no tienen etiquetas.

Otros tienen una o dos.

### 4.2. Ejemplo con dos etiquetas

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = "curso-bloques-dev-demo01"
}
```

En este caso:

- `resource` es el tipo de bloque.
- `aws_s3_bucket` es el tipo de recurso.
- `principal` es el nombre local.
- `bucket` es un argumento.

### 4.3. Ejemplo sin etiquetas

```hcl
locals {
  environment = "dev"
}
```

### 4.4. Responsabilidad del esquema

El proveedor define qué argumentos admite cada recurso.

Terraform define los bloques generales del lenguaje.

No puedes inventar un argumento porque resulte intuitivo.

Una configuración legible puede ser inválida.

---

## 5. Organización de archivos

Los nombres de archivo ayudan a las personas, no establecen el orden de ejecución.

### 5.1. Archivos habituales

```text
versions.tf
providers.tf
variables.tf
locals.tf
main.tf
outputs.tf
```

Terraform combina los archivos `.tf` del directorio en una configuración.

`main.tf` no tiene prioridad especial.

### 5.2. Proyecto raíz

El directorio desde el que ejecutas Terraform es el módulo raíz.

Allí suelen encontrarse:

- La configuración de proveedores.
- Las variables principales.
- Las llamadas a módulos.
- Las salidas del proyecto.
- La selección del backend.

### 5.3. Directorios secundarios

Terraform no incorpora automáticamente todos los subdirectorios.

Un directorio de módulo debe utilizarse mediante un bloque `module`.

### 5.4. Recomendación

Separa archivos por responsabilidad.

Evita dividirlos tanto que encontrar una configuración resulte difícil.

Para este laboratorio utilizaremos una organización explícita y pequeña.

---

## 6. Bloque `terraform`

Este bloque configura aspectos generales de Terraform.

### 6.1. Ejemplo

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

### 6.2. Restricción de Terraform

`required_version` limita las versiones aceptadas.

No instala Terraform.

No modifica automáticamente tu ejecutable.

Si la versión no cumple la restricción, debes utilizar una versión compatible.

### 6.3. Restricción del proveedor

`~> 5.0` permite versiones de la serie 5.x.

No permite la serie 6.x.

Es una decisión de compatibilidad del laboratorio.

No significa que la serie 5 sea la más reciente.

### 6.4. Archivo de bloqueo

`.terraform.lock.hcl` registra la selección concreta de proveedores.

En el proyecto raíz, debe versionarse para facilitar la reproducibilidad.

---

## 7. Bloque `required_providers`

Esta declaración identifica los proveedores que necesita un módulo.

### 7.1. Origen del proveedor

```hcl
required_providers {
  aws = {
    source  = "hashicorp/aws"
    version = "~> 5.0"
  }
}
```

`hashicorp/aws` identifica el proveedor.

`aws` es su nombre local dentro de la configuración.

### 7.2. No es una conexión

Esta declaración no contiene:

- Credenciales.
- Endpoints.
- Región de trabajo.
- Permisos de AWS.

Esos aspectos corresponden al bloque `provider`.

### 7.3. En módulos hijos

Un módulo hijo también debe declarar los proveedores que utiliza.

Esa declaración no implica crear una configuración de conexión dentro del módulo.

### 7.4. Inicialización

Terraform procesa estas dependencias al ejecutar:

```bash
terraform init
```

La descarga inicial puede necesitar acceso a Internet.

Los despliegues del laboratorio siguen siendo locales.

---

## 8. Bloque `provider`

El proveedor permite a Terraform comunicarse con una plataforma.

### 8.1. Configuración local

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

### 8.2. Responsabilidades

Este bloque define:

- La región utilizada.
- Las credenciales ficticias.
- Opciones de funcionamiento.
- El endpoint de S3.

### 8.3. Alcance del endpoint

Configurar S3 no redirige automáticamente todos los servicios.

Si añades otros recursos, revisa sus endpoints.

No utilices esta configuración incompleta para experimentar con servicios adicionales.

### 8.4. Backend independiente

El proveedor no configura un backend S3.

El almacenamiento del estado tiene su propia configuración.

En esta lección utilizaremos estado local.

---

## 9. Bloque `resource`

Un recurso representa un objeto que Terraform gestiona.

### 9.1. Ejemplo

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = "curso-bloques-dev-demo01"

  tags = {
    ManagedBy = "Terraform"
  }
}
```

### 9.2. Gestión del ciclo de vida

Terraform puede planificar:

- Creación.
- Actualización.
- Reemplazo.
- Destrucción.

Las acciones concretas dependen del recurso y del cambio.

### 9.3. Dirección del recurso

Su dirección es:

```text
aws_s3_bucket.principal
```

### 9.4. Nombre remoto

El argumento `bucket` define el nombre del objeto remoto.

El nombre local `principal` identifica el recurso en Terraform.

Cambiar uno no equivale a cambiar el otro.

### 9.5. Atributos

El proveedor expone atributos como:

```hcl
aws_s3_bucket.principal.id
aws_s3_bucket.principal.arn
```

Algunos pueden conocerse solo después de aplicar.

---

## 10. Bloque `data`

Una fuente de datos consulta información mediante un proveedor.

### 10.1. Ejemplo

```hcl
data "aws_s3_bucket" "principal" {
  bucket = aws_s3_bucket.principal.bucket
}
```

### 10.2. Diferencia fundamental

`resource` declara un objeto gestionado.

`data` consulta información.

Una fuente de datos no adopta automáticamente el objeto consultado como recurso gestionado.

### 10.3. Referencia

```hcl
data.aws_s3_bucket.principal.arn
```

La referencia comienza por `data`.

### 10.4. Momento de consulta

Terraform puede leer una fuente de datos durante el plan.

Si depende de valores o cambios pendientes, puede diferir la lectura hasta la aplicación.

### 10.5. Uso didáctico

Consultar un bucket que acabamos de crear es redundante para obtener su ARN.

Aquí lo hacemos para aprender el bloque.

En un proyecto real, utiliza una fuente de datos cuando aporte una necesidad concreta.

---

## 11. Bloque `variable`

Las variables definen las entradas de un módulo.

### 11.1. Ejemplo básico

```hcl
variable "environment" {
  description = "Entorno lógico del laboratorio."
  type        = string
  default     = "dev"
}
```

### 11.2. Propiedades importantes

Puedes definir:

- `description`.
- `type`.
- `default`.
- `sensitive`.
- `nullable`.
- Bloques `validation`.

No todas son obligatorias.

### 11.3. Variable requerida

```hcl
variable "project" {
  description = "Nombre del proyecto."
  type        = string
}
```

Sin `default`, el proyecto necesita recibir un valor.

### 11.4. Referencia

```hcl
var.environment
```

### 11.5. Valores externos

El módulo raíz puede recibir valores desde archivos, argumentos o variables de entorno.

Un módulo hijo recibe sus entradas desde el bloque `module`.

---

## 12. Bloques `validation`

La validación restringe valores de entrada.

### 12.1. Ejemplo

```hcl
variable "environment" {
  type    = string
  default = "dev"

  validation {
    condition = contains(
      ["dev", "test", "prod"],
      var.environment
    )
    error_message = "Utiliza dev, test o prod."
  }
}
```

### 12.2. Ventaja

El error se presenta cerca del problema.

No necesitas esperar a una llamada fallida al servicio.

### 12.3. Límites

Una validación local no comprueba:

- Permisos.
- Disponibilidad remota.
- Todas las reglas del servicio.
- Compatibilidad completa del emulador.

### 12.4. Mensaje útil

Explica qué valor se acepta.

Evita mensajes como:

```text
Valor incorrecto.
```

### 12.5. Alcance de esta lección

Los ejemplos validan cada variable utilizando su propio valor.

Así mantienen compatibilidad con el mínimo de Terraform indicado.

---

## 13. Bloque `locals`

Los locales asignan nombres a expresiones internas.

### 13.1. Ejemplo

```hcl
locals {
  bucket_name = "${var.project}-${var.environment}-${var.suffix}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

### 13.2. Referencia

```hcl
local.bucket_name
```

El bloque se llama `locals`.

La referencia utiliza `local`.

### 13.3. Utilidad

Los locales ayudan a:

- Evitar repeticiones.
- Centralizar convenciones.
- Separar cálculos.
- Mejorar nombres.
- Facilitar revisión.

### 13.4. Diferencia con variables

Un local no es una entrada externa.

No puedes establecerlo mediante:

```text
-var="bucket_name=..."
```

### 13.5. Recomendación

No crees locales para cada literal.

Úsalos cuando aporten claridad o reutilización.

---

## 14. Bloque `output`

Las salidas exponen resultados de un módulo.

### 14.1. Ejemplo

```hcl
output "bucket_name" {
  description = "Nombre del bucket principal."
  value       = aws_s3_bucket.principal.bucket
}
```

### 14.2. Módulo raíz

En el módulo raíz, las salidas aparecen después de aplicar.

También puedes consultarlas:

```bash
terraform output
terraform output -raw bucket_name
```

### 14.3. Módulo hijo

En un módulo hijo, las salidas forman su interfaz de resultados.

El módulo raíz puede utilizarlas como referencias.

### 14.4. Salidas sensibles

```hcl
output "example_secret" {
  value     = "dato-ficticio"
  sensitive = true
}
```

`sensitive` reduce la exposición en determinadas salidas de terminal.

No elimina el valor del estado.

### 14.5. Uso del laboratorio

No utilizaremos secretos.

Las salidas presentarán nombres, ARN y etiquetas ficticias.

---

## 15. Bloque `module`

Un módulo agrupa una configuración reutilizable.

### 15.1. Ejemplo de llamada

```hcl
module "archive" {
  source = "./modules/storage"

  bucket_name = "curso-bloques-dev-demo01-archive"
  tags = {
    Purpose = "archive"
  }
}
```

### 15.2. Argumento `source`

Indica dónde encontrar el módulo.

Puede apuntar a diferentes orígenes.

Aquí utilizaremos un directorio local.

### 15.3. Entradas

Los argumentos `bucket_name` y `tags` corresponden a variables declaradas por el módulo hijo.

No son argumentos universales de `module`.

### 15.4. Resultados

```hcl
module.archive.bucket_name
```

Esa salida debe existir en el módulo hijo.

### 15.5. Configuración de proveedores

El módulo raíz configura la conexión.

El módulo hijo declara qué proveedor necesita.

Este patrón facilita reutilización y control del entorno.

---

## 16. Bloques anidados

Un bloque puede contener otros bloques con significado específico.

### 16.1. Ejemplo del proveedor

```hcl
provider "aws" {
  region = "us-east-1"

  endpoints {
    s3 = "http://localhost:4566"
  }
}
```

`endpoints` es un bloque anidado del proveedor AWS.

### 16.2. Ejemplo de variable

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = length(var.suffix) >= 4
    error_message = "Utiliza al menos cuatro caracteres."
  }
}
```

### 16.3. No son intercambiables

Un bloque admitido en una variable no puede colocarse arbitrariamente dentro de un recurso.

El contexto importa.

### 16.4. Bloques dinámicos

`dynamic` puede generar determinados bloques anidados repetidos.

No genera libremente bloques de nivel superior.

No lo necesitamos para este laboratorio.

---

## 17. Metaargumentos

Los metaargumentos modifican el comportamiento de recursos o módulos.

### 17.1. Ejemplos habituales

- `count`.
- `for_each`.
- `depends_on`.
- `provider`.
- `lifecycle`, como bloque especial de recurso.

### 17.2. Dependencia explícita

```hcl
depends_on = [aws_s3_bucket.principal]
```

Debe utilizarse cuando exista una dependencia que las referencias no expresen.

### 17.3. Dependencia implícita

```hcl
bucket = aws_s3_bucket.principal.id
```

Esta referencia ya conecta ambos elementos.

No añadas `depends_on` por costumbre.

### 17.4. Instancias repetidas

`for_each` permite crear instancias con claves identificables.

`count` utiliza índices numéricos.

No desarrollaremos su uso completo aquí.

### 17.5. Precaución

Los metaargumentos no son argumentos particulares de S3.

Terraform los interpreta.

---

## 18. Bloque `lifecycle`

Este bloque ajusta determinadas reglas de gestión de un recurso.

### 18.1. Ejemplo conceptual

```hcl
resource "aws_s3_bucket" "important" {
  bucket = "ejemplo-no-ejecutar"

  lifecycle {
    prevent_destroy = true
  }
}
```

No copies este ejemplo al laboratorio.

### 18.2. Protección contra destrucción

`prevent_destroy` puede impedir operaciones de destrucción o reemplazo mientras la regla esté presente.

No sustituye controles de acceso ni copias de seguridad.

### 18.3. Cambios ignorados

`ignore_changes` permite ignorar determinados cambios en actualizaciones.

Utilízalo solo cuando exista una responsabilidad compartida bien definida.

### 18.4. No ocultar problemas

Ignorar cambios no corrige una configuración incorrecta.

Puede hacer que determinadas divergencias dejen de aparecer en el plan.

### 18.5. Decisión didáctica

No añadiremos `lifecycle` al ejemplo principal.

Queremos observar cambios y destruir los recursos de forma explícita.

---

## 19. Bloque `check`

Las comprobaciones permiten observar condiciones de la configuración.

### 19.1. Ejemplo

```hcl
check "bucket_prefix" {
  assert {
    condition = startswith(
      aws_s3_bucket.principal.bucket,
      "${var.project}-"
    )
    error_message = "El bucket no conserva el prefijo esperado."
  }
}
```

### 19.2. Comportamiento

Un `check` fallido produce una advertencia.

No equivale a una validación bloqueante de entrada.

No debe utilizarse como único control de una condición crítica.

### 19.3. Momento de evaluación

Si la condición depende de valores desconocidos, Terraform puede evaluarla después.

### 19.4. Comparación

- `validation`: valida entradas.
- `precondition`: puede bloquear una operación ante una condición inválida.
- `postcondition`: comprueba condiciones después de evaluar un elemento.
- `check`: observa y comunica mediante advertencias.

### 19.5. Uso de la práctica

Añadiremos una comprobación sencilla de convención de nombres.

---

## 20. Preparación del proyecto práctico

El laboratorio reúne los bloques estudiados.

### 20.1. Crear directorios

```bash
mkdir -p terraform-bloques-localstack/modules/storage
cd terraform-bloques-localstack
```

### 20.2. Estructura prevista

```text
terraform-bloques-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── locals.tf
├── main.tf
├── data.tf
├── checks.tf
├── outputs.tf
├── terraform.tfvars
└── modules/
    └── storage/
        ├── versions.tf
        ├── variables.tf
        ├── main.tf
        └── outputs.tf
```

### 20.3. Gestión de Git

Crea `.gitignore`:

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
crash.log
.env
README-descargado.txt
```

Versiona el archivo de bloqueo del proyecto raíz.

---

## 21. Arranque del emulador

Usaremos una imagen fija para el laboratorio.

### 21.1. Seleccionar imagen

El docente debe validar previamente la imagen elegida.

Como referencia de práctica:

```bash
printf 'LOCALSTACK_IMAGE=%s\n' \
  'localstack/localstack:4.0' > .env
```

La referencia no representa una recomendación de versión más reciente.

Para mayor reproducibilidad, utiliza un digest validado.

### 21.2. Archivo `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE en .env}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3
      AWS_DEFAULT_REGION: us-east-1
```

### 21.3. Iniciar

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 localstack
```

### 21.4. Credenciales de AWS CLI

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

---

## 22. Comprobación inicial de conectividad

No empieces el despliegue hasta verificar el servicio local.

### 22.1. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 22.2. Resultado esperado

La respuesta debe ser válida.

Puede mostrar una lista vacía.

También puede incluir recursos de otras prácticas si compartes el emulador.

### 22.3. Si falla

Comprueba:

- Docker está iniciado.
- El contenedor sigue ejecutándose.
- El puerto 4566 está disponible.
- El endpoint coincide.
- Las variables de entorno están definidas.

### 22.4. Ejecución desde contenedores

`localhost` significa el entorno donde se ejecuta el proceso.

Si Terraform se ejecuta en otro contenedor, esta dirección no apunta al contenedor de LocalStack.

El laboratorio asume Terraform ejecutado en el host.

---

## 23. Archivos de requisitos y conexión

Crea los archivos del proyecto raíz.

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

### 23.3. Revisión por parejas

Una persona lee la configuración.

La otra identifica:

- Restricción de Terraform.
- Restricción del proveedor.
- Endpoint.
- Credenciales.
- Servicio configurado.

---

## 24. Variables del laboratorio

Estas entradas controlan nombres y etiquetas.

### 24.1. `variables.tf`

```hcl
variable "project" {
  description = "Prefijo del proyecto."
  type        = string
  default     = "curso-bloques"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "Usa entre 3 y 20 caracteres válidos."
  }
}

variable "environment" {
  description = "Entorno lógico."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Utiliza dev, test o prod."
  }
}

variable "suffix" {
  description = "Identificador ficticio."
  type        = string
  default     = "demo01"

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "extra_tags" {
  description = "Etiquetas adicionales."
  type        = map(string)
  default     = {}
}
```

### 24.2. `terraform.tfvars`

```hcl
project     = "curso-bloques"
environment = "dev"
suffix      = "alumno01"

extra_tags = {
  Owner = "formacion"
  Group = "grupo-a"
}
```

Estos datos son ficticios.

---

## 25. Valores locales del laboratorio

Centralizaremos las convenciones.

### 25.1. `locals.tf`

```hcl
locals {
  bucket_name = "${var.project}-${var.environment}-${var.suffix}"

  archive_bucket_name = "${local.bucket_name}-archive"

  base_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
    Laboratory  = "LocalStack"
  }

  common_tags = merge(
    var.extra_tags,
    local.base_tags
  )
}
```

### 25.2. Precedencia del mapa

`merge` conserva el valor del último mapa cuando una clave se repite.

Las etiquetas base prevalecen en este ejemplo.

### 25.3. Preguntas de sesión

Responde:

1. ¿Qué entradas afectan al nombre?
2. ¿Qué cambia si modificamos `Owner`?
3. ¿Por qué `Laboratory` permanece en `LocalStack`?
4. ¿Dónde añadirías una etiqueta común?

### 25.4. Comprobación mental

Con los valores proporcionados, el nombre principal será:

```text
curso-bloques-dev-alumno01
```

El nombre del archivo será distinto del nombre del bucket.

---

## 26. Recursos, consulta y comprobación

Crea los objetos principales y su consulta didáctica.

### 26.1. `main.tf`

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = local.bucket_name

  # Exclusivamente para limpiar datos ficticios del laboratorio.
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_object" "readme" {
  bucket = aws_s3_bucket.principal.id
  key    = "README.txt"

  content = <<-EOT
    Laboratorio de bloques de Terraform.
    Proyecto: ${var.project}
    Entorno: ${var.environment}
    Plataforma de referencia: AWS.
    Ejecución local: LocalStack.
  EOT

  content_type = "text/plain"
}
```

### 26.2. `data.tf`

```hcl
data "aws_s3_bucket" "principal" {
  bucket = aws_s3_bucket.principal.bucket
}
```

### 26.3. `checks.tf`

```hcl
check "bucket_prefix" {
  assert {
    condition = startswith(
      aws_s3_bucket.principal.bucket,
      "${var.project}-"
    )
    error_message = "El prefijo del bucket no es el esperado."
  }
}
```

---

## 27. Salidas del proyecto raíz

Estas salidas permiten observar diferentes bloques.

### 27.1. `outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.principal.bucket
}

output "bucket_arn" {
  description = "ARN expuesto por el recurso."
  value       = aws_s3_bucket.principal.arn
}

output "queried_bucket_arn" {
  description = "ARN consultado mediante data."
  value       = data.aws_s3_bucket.principal.arn
}

output "object_key" {
  description = "Clave del objeto."
  value       = aws_s3_object.readme.key
}

output "effective_tags" {
  description = "Etiquetas calculadas."
  value       = local.common_tags
}
```

### 27.2. Lectura de referencias

Identifica qué salida utiliza:

- Un recurso.
- Una fuente de datos.
- Un valor local.

### 27.3. ARN local

Un ARN generado en LocalStack no demuestra existencia en AWS real.

Interprétalo dentro del contexto del laboratorio.

---

## 28. Sesión práctica 1: primer despliegue

Trabaja primero sin el módulo de archivo.

### 28.1. Duración

Duración orientativa: 25 minutos.

### 28.2. Inicialización

```bash
terraform init
terraform fmt -recursive
terraform validate
```

### 28.3. Plan

```bash
terraform plan -out=base.tfplan
```

Deberías observar dos recursos nuevos:

- Un bucket.
- Un objeto.

La fuente de datos no cuenta como recurso nuevo gestionado.

### 28.4. Aplicación

```bash
terraform apply base.tfplan
```

Un plan guardado se aplica sin solicitar otra confirmación interactiva.

Revísalo antes.

### 28.5. Resultados

```bash
terraform output
```

Compara el ARN del recurso y el ARN consultado.

### 28.6. Entregable

Registra los bloques que participaron y la función de cada uno.

---

## 29. Sesión práctica 2: verificación independiente

Consulta los objetos mediante AWS CLI.

### 29.1. Obtener el nombre

```bash
BUCKET="$(terraform output -raw bucket_name)"
```

### 29.2. Listar objetos

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$BUCKET"
```

### 29.3. Descargar

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${BUCKET}/README.txt" \
  ./README-descargado.txt
```

### 29.4. Leer

```bash
cat README-descargado.txt
```

### 29.5. Etiquetas

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api get-bucket-tagging \
  --bucket "$BUCKET"
```

### 29.6. Plan posterior

```bash
terraform plan
```

No deberían aparecer cambios inesperados.

---

## 30. Construcción del módulo local

El módulo gestionará otro bucket.

### 30.1. `modules/storage/versions.tf`

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

### 30.2. `modules/storage/variables.tf`

```hcl
variable "bucket_name" {
  description = "Nombre del bucket."
  type        = string
}

variable "tags" {
  description = "Etiquetas del bucket."
  type        = map(string)
  default     = {}
}
```

### 30.3. `modules/storage/main.tf`

```hcl
resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = true
  tags          = var.tags
}
```

### 30.4. `modules/storage/outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}
```

---

## 31. Llamada al módulo

Integra el módulo desde el proyecto raíz.

### 31.1. Añadir a `main.tf`

```hcl
module "archive" {
  source = "./modules/storage"

  providers = {
    aws = aws
  }

  bucket_name = local.archive_bucket_name

  tags = merge(local.common_tags, {
    Purpose = "archive"
  })
}
```

### 31.2. Añadir a `outputs.tf`

```hcl
output "archive_bucket_name" {
  description = "Nombre expuesto por el módulo."
  value       = module.archive.bucket_name
}

output "archive_bucket_arn" {
  description = "ARN expuesto por el módulo."
  value       = module.archive.bucket_arn
}
```

### 31.3. Mapeo del proveedor

`providers` indica qué configuración recibe el módulo.

En este caso utiliza la configuración AWS local del módulo raíz.

### 31.4. Dirección interna

El recurso del módulo tendrá esta dirección:

```text
module.archive.aws_s3_bucket.this
```

---

## 32. Sesión práctica 3: aplicar el módulo

Comprueba la incorporación sin recrear recursos existentes.

### 32.1. Inicializar de nuevo

```bash
terraform init
```

Este paso registra el módulo añadido.

### 32.2. Revisar

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=module.tfplan
```

El plan debería añadir un bucket.

No debería reemplazar el bucket principal.

### 32.3. Aplicar

```bash
terraform apply module.tfplan
terraform output
```

### 32.4. Verificar

```bash
ARCHIVE_BUCKET="$(terraform output -raw archive_bucket_name)"

aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api head-bucket \
  --bucket "$ARCHIVE_BUCKET"
```

Una ejecución correcta de `head-bucket` puede no mostrar contenido.

### 32.5. Entregable

Explica entradas, recurso interno, proveedor recibido y salidas del módulo.

---

## 33. Sesión práctica 4: cambios controlados

Observa cómo las entradas afectan al grafo.

### 33.1. Cambiar una etiqueta

Modifica `Owner` en `terraform.tfvars`.

Después:

```bash
terraform plan
```

Revisa las actualizaciones de ambos buckets.

### 33.2. Cambiar el entorno

Cambia temporalmente:

```hcl
environment = "test"
```

Vuelve a generar un plan.

Los nombres calculados cambian.

El proveedor necesitará reemplazar los buckets correspondientes.

### 33.3. No aplicar el reemplazo

Restaura:

```hcl
environment = "dev"
```

### 33.4. Probar validación

Introduce temporalmente:

```hcl
environment = "desarrollo"
```

Ejecuta `terraform plan`.

Observa el mensaje de validación.

### 33.5. Restaurar

Devuelve el valor a `dev`.

Registra la diferencia entre actualización, reemplazo y rechazo de entrada.

---

## 34. Estado y direcciones

El estado conecta direcciones de Terraform con objetos gestionados.

### 34.1. Inspección

```bash
terraform state list
```

Deberías reconocer:

```text
aws_s3_bucket.principal
aws_s3_object.readme
data.aws_s3_bucket.principal
module.archive.aws_s3_bucket.this
```

### 34.2. Consulta individual

```bash
terraform state show aws_s3_bucket.principal
```

### 34.3. Precaución

Estos comandos pueden mostrar valores sensibles en otros proyectos.

No publiques resultados indiscriminadamente.

### 34.4. Renombrar bloques

Cambiar el nombre local de un recurso cambia su dirección.

No significa necesariamente cambiar el objeto remoto deseado.

Sin una refactorización adecuada, Terraform puede planificar destrucción y creación.

### 34.5. Separación de responsabilidades

No edites manualmente el estado como solución inicial.

Utiliza mecanismos de Terraform y revisa siempre el plan.

---

## 35. Bloques de importación y refactorización

Estos bloques se estudian aquí como ampliación conceptual.

### 35.1. Bloque `import`

Disponible desde Terraform 1.5:

```hcl
import {
  to = aws_s3_bucket.imported
  id = "nombre-del-bucket-existente"
}
```

Necesita una configuración de recurso correspondiente.

No convierte una fuente de datos en un recurso por sí solo.

### 35.2. Bloque `moved`

Permite describir un cambio de dirección:

```hcl
moved {
  from = aws_s3_object.readme
  to   = aws_s3_object.documentation
}
```

También tendrías que renombrar el bloque y actualizar sus referencias.

### 35.3. No ejecutar sin preparación

Estos ejemplos no forman parte del despliegue principal.

Copiarlos sin adaptar la configuración puede producir errores.

### 35.4. Regla práctica

Una refactorización se valida leyendo el plan.

El objetivo suele ser cambiar la organización sin reemplazar objetos innecesariamente.

---

## 36. Diagnóstico de problemas

Clasifica el error antes de intentar corregirlo.

### 36.1. Argumento no admitido

Ejemplo incorrecto:

```hcl
resource "aws_s3_bucket" "example" {
  nombre = "curso-bloques-demo01"
}
```

El argumento correcto es `bucket`.

### 36.2. Referencia inexistente

```hcl
value = module.archive.name
```

Fallará si el módulo solo expone `bucket_name`.

### 36.3. Módulo no instalado

Después de añadir una llamada a módulo:

```bash
terraform init
```

### 36.4. Fuente de datos fallida

Comprueba si el objeto consultado existe y si utilizas el endpoint adecuado.

No todos los errores de lectura son errores de sintaxis.

### 36.5. LocalStack reiniciado

Si el emulador pierde recursos, el estado puede seguir registrándolos.

Investiga la divergencia.

No borres el estado por costumbre.

### 36.6. Orden de diagnóstico

Lee el primer error, identifica su categoría y corrige una causa cada vez.

---

## 37. Diferencias respecto a AWS real

Los conceptos de Terraform se transfieren, pero el entorno operativo cambia.

### 37.1. Elementos transferibles

Se mantienen:

- Bloques.
- Referencias.
- Variables.
- Módulos.
- Planes.
- Direcciones.
- Dependencias.

### 37.2. Elementos que requieren revisión

Debes revisar:

- Credenciales.
- IAM.
- Endpoints.
- Restricciones de nombres.
- Comportamiento del servicio.
- Disponibilidad.
- Costes.
- Persistencia.

### 37.3. Seguridad

Los indicadores `skip_*` son decisiones del laboratorio local.

No representan una configuración de seguridad para producción.

### 37.4. Eliminación

`force_destroy = true` facilita destruir buckets con objetos.

Puede provocar pérdida de datos.

No lo copies automáticamente a AWS real.

### 37.5. Compatibilidad

Una práctica correcta en LocalStack no valida toda una arquitectura de AWS.

Documenta las limitaciones observadas.

---

## 38. Limpieza del laboratorio

Destruye mientras LocalStack sigue disponible.

### 38.1. Plan de destrucción

```bash
terraform plan -destroy -out=destroy.tfplan
```

Comprueba los tres recursos gestionados:

- Bucket principal.
- Objeto de texto.
- Bucket del módulo.

### 38.2. Aplicación

```bash
terraform apply destroy.tfplan
```

### 38.3. Verificación local

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

No deberían aparecer los buckets del ejercicio.

### 38.4. Apagar

```bash
docker compose down
```

### 38.5. Retirar archivos auxiliares

```bash
rm -f base.tfplan module.tfplan destroy.tfplan
rm -f README-descargado.txt
```

Conserva configuración, registro y archivo de bloqueo.

---

## 39. Ejercicios de consolidación

Completa estos ejercicios con revisión por parejas.

### 39.1. Ejercicio A

Añade una variable `owner`.

Utilízala en las etiquetas comunes.

### 39.2. Ejercicio B

Añade una salida con un objeto que incluya ambos nombres de bucket.

### 39.3. Ejercicio C

Explica por qué el módulo no necesita credenciales propias.

### 39.4. Ejercicio D

Provoca una referencia incorrecta a una salida del módulo.

Registra el error y corrígelo.

### 39.5. Ejercicio E

Añade una comprobación del sufijo `-archive`.

Recuerda que un fallo de `check` produce una advertencia.

### 39.6. Ejercicio F

Dibuja las dependencias entre variables, locales, recursos, consulta y módulo.

### 39.7. Entrega

Incluye los cambios, un plan revisado y una explicación de resultados.

---

## 40. Resumen y comprobación final

Los bloques definen responsabilidades que colaboran mediante referencias.

### 40.1. Ideas esenciales

Recuerda:

- `terraform` define requisitos.
- `provider` configura la conexión.
- `resource` gestiona objetos.
- `data` consulta información.
- `variable` declara entradas.
- `locals` organiza cálculos.
- `output` expone resultados.
- `module` reutiliza configuraciones.
- `check` observa condiciones.
- Las referencias construyen dependencias.
- Los archivos no definen una secuencia.
- El estado requiere protección.

### 40.2. Antes de aplicar

Comprueba:

- Directorio correcto.
- LocalStack disponible.
- Endpoint local.
- Credenciales ficticias.
- Formato correcto.
- Validación satisfactoria.
- Plan revisado.
- Recursos esperados.

### 40.3. Evidencia de aprendizaje

Debes poder explicar el proyecto sin limitarte a leer los archivos.

Describe qué recibe cada bloque, qué produce y cómo se conecta con los demás.

### 40.4. Idea final

Una configuración mantenible no es una colección de bloques aislados.

Es un conjunto de responsabilidades explícitas, conectadas mediante referencias y comprobadas con planes, verificaciones y una limpieza controlada.