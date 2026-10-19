# Sintaxis del lenguaje HCL en Terraform

HCL es el lenguaje que utilizamos para escribir configuraciones de Terraform.

En esta lección aprenderás a leerlo, escribirlo y comprobarlo mediante prácticas progresivas.

Los ejemplos utilizan el proveedor AWS y ejecutan los despliegues en LocalStack.

La infraestructura de práctica se limita a buckets y objetos S3.

Esto permite concentrarse en el lenguaje sin introducir redes, máquinas virtuales o funciones Lambda.

> **Entorno del curso:** Terraform para AWS con ejemplos locales en LocalStack.
>
> Las credenciales del laboratorio son ficticias.
>
> Los comandos de despliegue no deben apuntar a una cuenta real de AWS.

---

## 1. Objetivos

Esta lección combina explicación del lenguaje, comprobaciones locales y despliegues sencillos.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Identificar argumentos y bloques.
- Reconocer etiquetas de bloques.
- Escribir cadenas, números y booleanos.
- Diferenciar listas, conjuntos y mapas.
- Utilizar referencias entre elementos.
- Construir cadenas mediante interpolación.
- Definir variables y valores locales.
- Consultar funciones desde la consola.
- Construir expresiones condicionales.
- Transformar colecciones con expresiones `for`.
- Crear recursos con `for_each`.
- Interpretar errores frecuentes de sintaxis.
- Aplicar formato con `terraform fmt`.
- Validar una configuración.
- Verificar recursos en LocalStack.
- Eliminar los recursos del laboratorio.

### 1.2. Resultado práctico

Construirás:

1. Un bucket S3.
2. Un archivo de texto almacenado como objeto.
3. Etiquetas calculadas mediante expresiones.
4. Salidas con información de los recursos.
5. Una ampliación con varios buckets.

### 1.3. Alcance

Esta página introduce la sintaxis y su uso en Terraform.

No desarrolla en profundidad:

- Backends remotos.
- Módulos publicados.
- IAM.
- Redes de AWS.
- Pipelines.
- Migraciones de estado.

Estos temas se trabajan en otras lecciones.

---

## 2. Requisitos previos

Necesitas un entorno local preparado y acceso a una terminal.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
```

Las prácticas utilizan:

- Terraform 1.6 o superior.
- El proveedor AWS de la serie 5.
- Docker Compose.
- AWS CLI.
- Una versión de LocalStack compatible con las operaciones S3 utilizadas.

No necesitas una cuenta de AWS.

No necesitas credenciales reales.

### 2.2. Convención de versiones

El ejemplo fija el proveedor en la serie 5:

```hcl
version = "~> 5.0"
```

Esto permite versiones 5.x, pero no 6.x.

El archivo `.terraform.lock.hcl` registra la selección concreta.

Para un curso reproducible, todos los alumnos deberían utilizar una selección revisada por el docente.

### 2.3. Materiales

Prepara:

- Un editor con soporte para HCL.
- Una terminal.
- Una carpeta nueva.
- Un documento para registrar resultados.

### 2.4. Advertencia

No mezcles este laboratorio con un proyecto de producción.

El estado local puede contener información sensible en otros escenarios.

En esta práctica solo utilizaremos datos ficticios.

---

## 3. Qué es HCL

HCL significa **HashiCorp Configuration Language**.

### 3.1. HCL y Terraform

HCL ofrece una sintaxis para expresar configuraciones.

Terraform interpreta esa sintaxis con sus propias reglas.

Por ejemplo, Terraform define el significado de:

- `resource`.
- `variable`.
- `locals`.
- `output`.
- `terraform`.
- `provider`.

HCL no implica que cualquier bloque sea válido para Terraform.

### 3.2. Enfoque declarativo

Una configuración describe el resultado deseado.

Ejemplo:

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = "curso-hcl-dev-demo01"
}
```

El bloque declara un bucket gestionado por Terraform.

No describe una secuencia de llamadas manuales.

Terraform calcula qué acciones necesita realizar.

### 3.3. Sintaxis y significado

Distingue dos niveles:

- **Sintaxis:** cómo se escribe una expresión o bloque.
- **Semántica:** si ese elemento tiene sentido en la configuración.

Un archivo puede tener sintaxis correcta y utilizar un argumento inexistente.

También puede validar y fallar durante el despliegue.

### 3.4. Archivos

Los archivos habituales terminan en:

```text
.tf
```

Terraform también admite su representación JSON:

```text
.tf.json
```

En esta lección utilizaremos la sintaxis nativa.

---

## 4. Argumentos y bloques

Estos son los elementos básicos que encontrarás en una configuración.

### 4.1. Argumentos

Un argumento asigna una expresión a un nombre:

```hcl
nombre = expresion
```

Ejemplos:

```hcl
bucket        = "curso-hcl-dev-demo01"
force_destroy = true
```

El signo `=` indica asignación de configuración.

No debe confundirse con el operador de comparación `==`.

### 4.2. Bloques

Un bloque agrupa contenido:

```hcl
tipo "etiqueta" {
  argumento = "valor"
}
```

Las llaves delimitan el cuerpo.

El número de etiquetas depende del tipo de bloque.

### 4.3. Ejemplo de recurso

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = "curso-hcl-dev-demo01"
}
```

Sus partes son:

- `resource`: tipo de bloque.
- `aws_s3_bucket`: tipo de recurso.
- `principal`: nombre local.
- `bucket`: argumento del recurso.

### 4.4. Nombre local y nombre remoto

`principal` identifica el recurso dentro de Terraform.

`curso-hcl-dev-demo01` es el nombre del bucket.

No tienen por qué coincidir.

La referencia al recurso utiliza el nombre local:

```hcl
aws_s3_bucket.principal.id
```

---

## 5. Identificadores, comentarios y estilo

Un estilo consistente facilita revisar configuraciones.

### 5.1. Identificadores

Utiliza nombres descriptivos:

```hcl
variable "project" {
  type = string
}
```

Evita nombres ambiguos:

```hcl
variable "x" {
  type = string
}
```

Terraform permite guiones en muchos identificadores.

Como convención, utilizaremos `snake_case` para nombres locales compuestos.

### 5.2. Comentarios

HCL admite:

```hcl
# Comentario de una línea.

// Otro comentario de una línea.

/*
Comentario
de varias líneas.
*/
```

En el curso utilizaremos principalmente `#`.

### 5.3. Comentarios útiles

Explica el motivo:

```hcl
# Permite limpiar objetos ficticios al destruir el laboratorio.
force_destroy = true
```

Evita repetir lo evidente:

```hcl
# Asigna true a force_destroy.
force_destroy = true
```

### 5.4. Formato

Terraform proporciona:

```bash
terraform fmt
```

No necesitas alinear manualmente los signos `=`.

El formato mejora la lectura, pero no demuestra que el despliegue sea correcto.

---

## 6. Tipos de valores

Terraform utiliza valores primitivos y estructuras de colección.

### 6.1. Tipos principales

| **Tipo** | **Ejemplo** | **Uso** |
|----------|-------------|---------|
| `string` | `"dev"` | Texto |
| `number` | `3` | Cantidades |
| `bool` | `true` | Condiciones |
| `list(string)` | `["a", "b"]` | Secuencia de textos |
| `set(string)` | `toset(["a", "b"])` | Elementos únicos |
| `map(string)` | `{ owner = "formacion" }` | Pares clave-valor |

También existen tipos estructurales como `object` y `tuple`.

### 6.2. Cadenas

```hcl
project = "curso-hcl"
```

Las cadenas usan comillas dobles.

No utilices comillas tipográficas.

### 6.3. Números

```hcl
cantidad = 3
ratio    = 0.5
```

Si un argumento espera un número, evita escribirlo como texto.

### 6.4. Booleanos

```hcl
enabled = true
```

Los valores booleanos son:

```hcl
true
false
```

Se escriben sin comillas.

### 6.5. Valor nulo

```hcl
descripcion = null
```

`null` representa ausencia de valor.

Su comportamiento depende del contexto, del esquema y de las reglas de nulabilidad.

---

## 7. Colecciones y estructuras

Las colecciones permiten agrupar y transformar información.

### 7.1. Listas

```hcl
environments = ["dev", "test", "prod"]
```

El primer índice es cero:

```hcl
local.environments[0]
```

El orden importa.

### 7.2. Conjuntos

```hcl
environments = toset(["dev", "test", "dev"])
```

El conjunto elimina duplicados.

No ofrece el mismo acceso por índice que una lista.

### 7.3. Mapas

```hcl
tags = {
  Project = "curso-hcl"
  Owner   = "formacion"
}
```

Puedes acceder mediante:

```hcl
local.tags["Owner"]
```

### 7.4. Objetos

Un objeto puede combinar atributos de tipos distintos:

```hcl
laboratorio = {
  name    = "hcl"
  enabled = true
  minutes = 60
}
```

Un tipo explícito podría ser:

```hcl
object({
  name    = string
  enabled = bool
  minutes = number
})
```

### 7.5. Tuplas y listas

La expresión `["dev", "test"]` produce inicialmente un valor estructural de tupla.

Terraform puede convertirlo a una lista cuando el contexto lo requiere.

Para comenzar, céntrate en el tipo esperado por cada variable o argumento.

---

## 8. Referencias y dependencias

Las referencias conectan unas partes de la configuración con otras.

### 8.1. Variables

```hcl
var.project
```

Accede al valor de una variable de entrada.

### 8.2. Valores locales

```hcl
local.bucket_name
```

Accede a un valor definido en `locals`.

### 8.3. Recursos

```hcl
aws_s3_bucket.principal.id
```

Accede a un atributo del recurso.

### 8.4. Dependencia implícita

Ejemplo:

```hcl
resource "aws_s3_object" "readme" {
  bucket  = aws_s3_bucket.principal.id
  key     = "README.txt"
  content = "Laboratorio HCL."
}
```

La referencia permite a Terraform reconocer la dependencia.

El objeto necesita el bucket.

No añadimos `depends_on` porque esa relación ya está expresada.

### 8.5. Valores desconocidos

Algunos atributos solo se conocen después de aplicar.

Durante el plan puedes ver:

```text
(known after apply)
```

No es necesariamente un error.

Es una indicación de que el valor todavía no está disponible.

---

## 9. Cadenas, interpolación y heredoc

Terraform permite construir texto a partir de expresiones.

### 9.1. Interpolación

```hcl
bucket = "${var.project}-${var.environment}"
```

La expresión entre `${` y `}` se incorpora al texto.

### 9.2. Referencia directa

Si necesitas únicamente el valor:

```hcl
bucket = local.bucket_name
```

Evita:

```hcl
bucket = "${local.bucket_name}"
```

La interpolación no aporta nada en ese caso.

### 9.3. Caracteres especiales

```hcl
mensaje = "Primera línea\nSegunda línea"
ruta    = "C:\\laboratorio"
```

`\n` representa un salto de línea.

`\\` representa una barra invertida.

### 9.4. Texto multilínea

```hcl
content = <<-EOT
  Curso de Terraform.
  Entorno: LocalStack.
  Proyecto: ${var.project}.
EOT
```

`<<-` permite retirar una indentación común.

El marcador final debe coincidir con el inicial.

### 9.5. Interpolación literal

Para escribir `${...}` sin evaluarlo:

```hcl
ejemplo = "Utiliza $${var.project} como referencia."
```

Terraform producirá el texto literal `${var.project}`.

---

## 10. Operadores y expresiones

Las expresiones permiten calcular valores.

### 10.1. Aritmética

```hcl
total = 2 + 3
doble = 4 * 2
mitad = 10 / 2
```

No utilizaremos cálculos complejos en el despliegue.

### 10.2. Comparación

```hcl
var.environment == "dev"
var.environment != "prod"
```

La comparación produce un booleano.

### 10.3. Lógica

```hcl
var.enabled && var.environment == "dev"
```

Operadores habituales:

- `&&`: y.
- `||`: o.
- `!`: negación.

No confíes en una evaluación de cortocircuito como mecanismo para proteger accesos inválidos.

### 10.4. Condicional

```hcl
var.environment == "prod" ? "alta" : "normal"
```

La estructura es:

```hcl
condicion ? resultado_si_true : resultado_si_false
```

Las ramas deben ser compatibles con las reglas de tipos.

### 10.5. Legibilidad

Evita encadenar muchos condicionales.

Cuando una expresión crezca, considera separarla en valores locales.

---

## 11. Preparación del laboratorio

Crearemos un proyecto independiente.

### 11.1. Directorio

```bash
mkdir -p terraform-hcl-localstack
cd terraform-hcl-localstack
```

Todos los comandos siguientes se ejecutan aquí.

### 11.2. Estructura

El laboratorio tendrá:

```text
terraform-hcl-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── locals.tf
├── main.tf
├── outputs.tf
└── terraform.tfvars
```

Los nombres son convenciones organizativas.

Terraform carga conjuntamente los archivos `.tf` del directorio.

### 11.3. Imagen de LocalStack

El docente debe proporcionar una etiqueta o digest validado.

Créalo así:

```bash
printf 'LOCALSTACK_IMAGE=%s\n' \
  'localstack/localstack:4.0' > .env
```

La etiqueta es una referencia de laboratorio, no una recomendación de usar la versión más reciente.

Para reproducibilidad estricta, utiliza un digest validado.

### 11.4. Archivo `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
crash.log
.env
```

En un proyecto raíz ejecutable, versiona `.terraform.lock.hcl`.

---

## 12. Arranque de LocalStack

Utilizaremos únicamente S3.

### 12.1. Archivo `compose.yaml`

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

El puerto se publica en la interfaz local.

No montamos el socket de Docker.

Las operaciones S3 de esta práctica no lo necesitan.

### 12.2. Arranque

```bash
docker compose up -d
docker compose ps
```

Consulta los mensajes:

```bash
docker compose logs --tail=100 localstack
```

### 12.3. Credenciales ficticias

En la terminal actual:

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

Estas variables sirven para AWS CLI.

El proveedor también tendrá credenciales ficticias explícitas.

### 12.4. Comprobación S3

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

Si LocalStack todavía está arrancando, espera y repite.

No continúes hasta que la consulta responda correctamente.

---

## 13. Versiones y proveedor

Esta configuración conecta Terraform con el S3 local.

### 13.1. Archivo `versions.tf`

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

`required_providers` declara origen y restricciones.

No configura el endpoint.

### 13.2. Archivo `providers.tf`

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

La configuración está limitada a esta práctica S3.

### 13.3. Alcance de los endpoints

Añadir recursos de otros servicios requiere revisar sus endpoints.

No presupongas que configurar S3 redirige todo el proveedor.

Esta configuración tampoco configura un backend S3.

El backend tiene opciones independientes.

### 13.4. Inicialización

```bash
terraform init
```

Comprueba que se instala `hashicorp/aws`.

Conserva el archivo de bloqueo para repetir la selección del proveedor.

---

## 14. Variables de entrada

Las variables parametrizan la configuración.

### 14.1. Archivo `variables.tf`

```hcl
variable "project" {
  description = "Prefijo del laboratorio."
  type        = string
  default     = "curso-hcl"

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{2,29}$",
      var.project
    ))
    error_message = "Usa entre 3 y 30 caracteres en minúsculas."
  }
}

variable "environment" {
  description = "Entorno lógico del ejercicio."
  type        = string
  default     = "dev"

  validation {
    condition = contains(
      ["dev", "test", "prod"],
      var.environment
    )
    error_message = "El entorno debe ser dev, test o prod."
  }
}

variable "suffix" {
  description = "Identificador ficticio del alumno."
  type        = string
  default     = "demo01"

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 letras minúsculas o números."
  }
}

variable "extra_tags" {
  description = "Etiquetas adicionales."
  type        = map(string)

  default = {
    Owner = "formacion"
  }
}
```

### 14.2. Archivo `terraform.tfvars`

```hcl
project     = "curso-hcl"
environment = "dev"
suffix      = "alumno01"

extra_tags = {
  Owner = "equipo-docente"
  Group = "grupo-a"
}
```

### 14.3. Lectura automática

Terraform carga automáticamente `terraform.tfvars`.

También reconoce archivos terminados en `.auto.tfvars`.

Si varias fuentes definen una variable, existen reglas de precedencia.

No confundas valores predeterminados con valores finales.

---

## 15. Valores locales

Los valores locales dan nombre a expresiones reutilizables.

### 15.1. Archivo `locals.tf`

```hcl
locals {
  bucket_name = "${var.project}-${var.environment}-${var.suffix}"

  base_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
    Laboratory  = "LocalStack"
  }

  tags = merge(
    var.extra_tags,
    local.base_tags
  )

  priority = var.environment == "prod" ? "alta" : "normal"
}
```

### 15.2. Qué calcula

`bucket_name` combina tres variables.

`base_tags` construye un mapa.

`tags` combina mapas.

`priority` utiliza un condicional.

### 15.3. Orden de `merge`

Cuando una clave se repite, prevalece el valor del mapa posterior.

En este ejemplo, las etiquetas base prevalecen sobre las adicionales.

Así `Laboratory` conserva el valor `LocalStack`.

### 15.4. Variables y locales

Las variables reciben valores desde fuera.

Los locales se calculan dentro de la configuración.

No puedes asignar un local mediante `-var`.

### 15.5. Sin reasignación imperativa

Un local no se modifica paso a paso.

Terraform evalúa las expresiones según sus dependencias.

El orden visual no equivale a orden de ejecución.

---

## 16. Recursos del laboratorio

Crearemos un bucket y un objeto de texto.

### 16.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = local.bucket_name

  # Solo para facilitar la limpieza de datos ficticios.
  force_destroy = true

  tags = local.tags
}

resource "aws_s3_object" "readme" {
  bucket = aws_s3_bucket.principal.id
  key    = "README.txt"

  content = <<-EOT
    Laboratorio de sintaxis HCL.
    Proyecto: ${var.project}
    Entorno: ${var.environment}
    Prioridad: ${local.priority}
    Plataforma de referencia: AWS.
    Entorno de ejecución: LocalStack.
  EOT

  content_type = "text/plain"
}
```

### 16.2. Dependencia

El objeto referencia el identificador del bucket.

Terraform utiliza esa referencia para construir el grafo.

No importa que `outputs.tf` se lea antes o después visualmente.

### 16.3. Advertencia sobre limpieza

`force_destroy = true` permite eliminar un bucket no vacío.

Es cómodo para este laboratorio.

No lo copies automáticamente a producción.

### 16.4. Contenido del objeto

El texto demuestra:

- Heredoc.
- Interpolación.
- Variables.
- Locales.
- Referencias entre recursos.

No incluye secretos.

---

## 17. Salidas y primera sesión de despliegue

Las salidas presentan información útil.

### 17.1. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket principal."
  value       = aws_s3_bucket.principal.bucket
}

output "object_key" {
  description = "Clave del objeto de práctica."
  value       = aws_s3_object.readme.key
}

output "effective_tags" {
  description = "Etiquetas calculadas."
  value       = local.tags
}

output "local_s3_uri" {
  description = "URI lógica; usar con endpoint local."
  value       = "s3://${aws_s3_bucket.principal.bucket}"
}
```

Una URI `s3://` no codifica el endpoint.

AWS CLI sigue necesitando `--endpoint-url`.

### 17.2. Sesión guiada

Ejecuta:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=lab.tfplan
```

Comprueba que el plan muestra dos recursos nuevos.

No aceptes un número distinto sin investigar.

### 17.3. Aplicación

```bash
terraform apply lab.tfplan
terraform output
```

Aplicar un plan guardado no vuelve a solicitar aprobación interactiva.

La revisión debe ocurrir antes.

### 17.4. Entregable

Registra:

- Resultado de validación.
- Recursos previstos.
- Recursos creados.
- Nombre del bucket.
- Una explicación de la dependencia.

---

## 18. Verificación en LocalStack

Comprueba el resultado con una herramienta distinta de Terraform.

### 18.1. Obtener el nombre

```bash
BUCKET="$(terraform output -raw bucket_name)"
printf '%s\n' "$BUCKET"
```

### 18.2. Consultar objetos

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$BUCKET"
```

Deberías encontrar `README.txt`.

### 18.3. Descargar el objeto

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${BUCKET}/README.txt" \
  ./README-descargado.txt
```

Consulta el contenido:

```bash
cat README-descargado.txt
```

### 18.4. Consultar etiquetas

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api get-bucket-tagging \
  --bucket "$BUCKET"
```

### 18.5. Plan sin cambios

```bash
terraform plan
```

Sin modificaciones externas o de configuración, debería indicar que no hay cambios.

Si no ocurre, revisa el detalle.

---

## 19. Consola de Terraform

La consola permite practicar expresiones sin desplegar recursos nuevos.

### 19.1. Abrir la consola

```bash
terraform console
```

Escribe una expresión por entrada.

No escribas el indicador `>` si aparece en la terminal.

### 19.2. Cadenas y funciones

Prueba:

```hcl
upper("terraform")
lower("LOCALSTACK")
length("hcl")
join("-", ["curso", "hcl", "dev"])
split("-", "curso-hcl-dev")
```

Observa los tipos de resultado.

### 19.3. Variables y locales

Prueba:

```hcl
var.project
var.environment
local.bucket_name
local.priority
local.tags
```

Los valores proceden de la configuración actual.

### 19.4. Colecciones

Prueba:

```hcl
length(["dev", "test", "prod"])
contains(["dev", "test"], "prod")
toset(["dev", "dev", "test"])
lookup({ Owner = "formacion" }, "Owner", "sin-owner")
lookup({ Owner = "formacion" }, "Group", "sin-grupo")
```

### 19.5. Salida

Escribe:

```text
exit
```

Registra tres expresiones y sus resultados.

Explica qué tipo devuelve cada una.

---

## 20. Expresiones `for`

Una expresión `for` transforma una colección en otro valor.

### 20.1. Transformar textos

En la consola:

```hcl
[for env in ["dev", "test"] : upper(env)]
```

Resultado esperado:

```hcl
[
  "DEV",
  "TEST",
]
```

### 20.2. Construir un objeto

```hcl
{ for env in ["dev", "test"] : env => upper(env) }
```

Resultado conceptual:

```hcl
{
  dev  = "DEV"
  test = "TEST"
}
```

### 20.3. Filtrar

```hcl
[for env in ["dev", "test", "prod"] : env if env != "prod"]
```

La condición conserva los elementos que la cumplen.

### 20.4. Clave y valor

```hcl
{
  for key, value in {
    project = "hcl"
    owner   = "docente"
  } : upper(key) => value
}
```

### 20.5. Distinción importante

Una expresión `for` crea un valor.

`for_each` crea instancias de un recurso o módulo.

No son equivalentes.

### 20.6. Ejercicio

Construye una lista con:

```text
curso-dev
curso-test
```

Utiliza una expresión `for` y una interpolación.

Comprueba el resultado en la consola.

---

## 21. Sesión de ampliación con `for_each`

Añadiremos buckets auxiliares al mismo proyecto.

### 21.1. Nueva variable

Añade a `variables.tf`:

```hcl
variable "auxiliary_buckets" {
  description = "Nombres lógicos de buckets auxiliares."
  type        = set(string)
  default     = ["datos", "informes"]

  validation {
    condition = alltrue([
      for name in var.auxiliary_buckets :
      can(regex("^[a-z0-9]{3,10}$", name))
    ])
    error_message = "Usa nombres de 3 a 10 caracteres alfanuméricos."
  }
}
```

### 21.2. Nuevo recurso

Añade a `main.tf`:

```hcl
resource "aws_s3_bucket" "auxiliary" {
  for_each = var.auxiliary_buckets

  bucket = "${local.bucket_name}-${each.key}"

  force_destroy = true

  tags = merge(local.tags, {
    Purpose = each.key
  })
}
```

### 21.3. Nueva salida

Añade a `outputs.tf`:

```hcl
output "auxiliary_bucket_names" {
  value = {
    for key, bucket in aws_s3_bucket.auxiliary :
    key => bucket.bucket
  }
}
```

### 21.4. Claves estables

Las direcciones incluyen:

```text
aws_s3_bucket.auxiliary["datos"]
aws_s3_bucket.auxiliary["informes"]
```

Para este conjunto, `each.key` y `each.value` tienen el mismo valor.

### 21.5. Aplicación

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
```

Revisa antes de confirmar.

Deberían añadirse dos buckets sin reemplazar el principal.

---

## 22. Sesión de cambios y observación

Ahora observarás cómo las expresiones afectan al plan.

### 22.1. Cambio de etiqueta

En `terraform.tfvars`, cambia:

```hcl
extra_tags = {
  Owner = "nuevo-equipo"
  Group = "grupo-a"
}
```

Ejecuta:

```bash
terraform plan
```

El cambio debería afectar a las etiquetas.

No debería requerir cambiar los nombres de bucket.

### 22.2. Cambio de entorno

Cambia temporalmente:

```hcl
environment = "test"
```

Ejecuta otro plan.

Los nombres calculados cambian.

El proveedor puede necesitar reemplazar los buckets porque sus nombres no se modifican en el mismo recurso remoto.

### 22.3. No aplicar todavía

En esta sesión, observa el plan sin aplicarlo.

Después restaura:

```hcl
environment = "dev"
```

### 22.4. Cambio inválido

Prueba:

```hcl
environment = "desarrollo"
```

Ejecuta:

```bash
terraform plan
```

La validación de la variable debería rechazar el valor.

### 22.5. Restauración

Devuelve `environment` a `dev`.

Comprueba:

```bash
terraform validate
terraform plan
```

### 22.6. Entregable

Explica la diferencia entre:

- Modificar una etiqueta.
- Modificar un nombre calculado.
- Introducir un valor inválido.

---

## 23. Errores frecuentes y diagnóstico

Aprender a leer errores forma parte del trabajo con HCL.

### 23.1. Comillas ausentes

Incorrecto:

```hcl
bucket = curso-hcl
```

Terraform interpreta una expresión, no una cadena literal.

Correcto:

```hcl
bucket = "curso-hcl"
```

### 23.2. Referencia inexistente

Incorrecto:

```hcl
bucket = local.bucket_names
```

Si solo has definido `bucket_name`, la referencia es incorrecta.

Comprueba el identificador exacto.

### 23.3. Argumento no admitido

Incorrecto:

```hcl
resource "aws_s3_bucket" "ejemplo" {
  nombre = "curso-hcl-demo01"
}
```

El proveedor espera `bucket`, no `nombre`.

La sintaxis puede ser legible y el esquema inválido.

### 23.4. Llave sin cerrar

Incorrecto:

```hcl
locals {
  project = "curso-hcl"
```

Busca delimitadores abiertos.

El error puede señalar una línea posterior al origen real.

### 23.5. Credenciales o conexión

Un fallo de conexión no es un fallo de HCL.

Revisa:

```bash
docker compose ps
docker compose logs --tail=100 localstack
```

### 23.6. Procedimiento de diagnóstico

1. Lee el primer error.
2. Identifica archivo y línea.
3. Clasifica el problema.
4. Corrige una causa.
5. Ejecuta de nuevo la comprobación.

---

## 24. Diferencias respecto a AWS real

LocalStack permite practicar, pero no reproduce todas las garantías de AWS.

### 24.1. Qué permanece parecido

Utilizamos:

- Tipos de recursos del proveedor AWS.
- Sintaxis de Terraform.
- Referencias.
- Variables.
- Expresiones.
- Planes.
- Estado.

Estos conceptos son transferibles.

### 24.2. Qué cambia

Cambian aspectos como:

- Endpoints.
- Credenciales.
- Comportamiento de servicios.
- Restricciones reproducidas.
- Persistencia del entorno.
- Rendimiento.
- Integración con identidades.

### 24.3. Nombres S3

AWS aplica reglas de nombres y disponibilidad global para buckets de propósito general.

LocalStack no debe utilizarse como prueba definitiva de cumplimiento de todas esas reglas.

Los nombres generados aquí son didácticos.

### 24.4. Seguridad

Las credenciales `test` no son un patrón para producción.

Los indicadores `skip_*` pertenecen a esta configuración local.

No deben copiarse sin revisión a un entorno real.

### 24.5. Persistencia y estado

El estado de Terraform y los recursos del emulador son sistemas distintos.

Si reinicias LocalStack y pierde recursos, el estado puede seguir registrándolos.

No borres el estado como primera solución.

Investiga y decide cómo recuperar o limpiar el laboratorio.

---

## 25. Limpieza del laboratorio

Elimina primero los recursos gestionados.

### 25.1. Plan de destrucción

Con LocalStack todavía funcionando:

```bash
terraform plan -destroy -out=destroy.tfplan
```

Comprueba que solo aparecen recursos del laboratorio.

### 25.2. Destrucción

```bash
terraform apply destroy.tfplan
```

La aplicación de este plan no vuelve a pedir aprobación.

No ejecutes el comando sin haber revisado el plan.

### 25.3. Verificación

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

Los buckets del ejercicio ya no deberían aparecer.

### 25.4. Apagar LocalStack

```bash
docker compose down
```

No hagas esto antes de destruir si quieres que Terraform pueda eliminar los recursos.

### 25.5. Archivos auxiliares

Puedes eliminar:

```bash
rm -f lab.tfplan destroy.tfplan README-descargado.txt
```

No elimines indiscriminadamente estados o archivos de bloqueo.

### 25.6. Terminal

Si ya no necesitas las credenciales ficticias:

```bash
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
```

---

## 26. Ejercicios de consolidación

Completa estos ejercicios sin copiar directamente la solución.

### 26.1. Ejercicio A: cadena calculada

Define un local con este resultado:

```text
Laboratorio curso-hcl en dev
```

Utiliza `var.project` y `var.environment`.

### 26.2. Ejercicio B: etiqueta nueva

Añade:

```text
Lesson = 03-01
```

No modifiques directamente todos los recursos.

Busca el lugar compartido adecuado.

### 26.3. Ejercicio C: condicional

Define una salida que muestre:

- `requiere revision` para `prod`.
- `laboratorio` para otros entornos.

No despliegues en AWS real.

### 26.4. Ejercicio D: transformación

Convierte:

```hcl
["s3", "terraform", "localstack"]
```

En una lista de mayúsculas mediante `for`.

### 26.5. Ejercicio E: filtrado

Conserva solo las palabras cuya longitud sea mayor que dos.

Utiliza `length` y una condición.

### 26.6. Ejercicio F: diagnóstico

Provoca una referencia incorrecta en un output.

Guarda el error.

Corrige el identificador y repite la validación.

### 26.7. Entrega

Incluye configuración, resultados y explicación.

No entregues estados ni planes binarios.

---

## 27. Resumen y lista de comprobación

La sintaxis HCL permite describir configuraciones mediante bloques, argumentos y expresiones.

### 27.1. Conceptos esenciales

Recuerda:

- Un argumento asigna una expresión.
- Un bloque organiza contenido.
- Las etiquetas identifican elementos.
- Las referencias conectan valores.
- Las variables reciben entradas.
- Los locales nombran cálculos.
- Las funciones transforman valores.
- `for` construye colecciones.
- `for_each` crea instancias.
- El formato no garantiza exactitud.
- Validar no equivale a desplegar.
- LocalStack no equivale a AWS real.

### 27.2. Antes de aplicar

Comprueba:

- Estás en el directorio correcto.
- LocalStack responde.
- El proveedor usa el endpoint local.
- Las credenciales son ficticias.
- La configuración está formateada.
- La validación termina correctamente.
- Has revisado el plan.
- Los recursos previstos son los esperados.

### 27.3. Después de aplicar

Comprueba:

- Los outputs tienen sentido.
- AWS CLI consulta el endpoint local.
- El objeto contiene el texto esperado.
- Las etiquetas coinciden.
- Un nuevo plan no presenta cambios inesperados.

### 27.4. Evidencia final

Redacta una explicación breve de:

1. Cómo se calcula el nombre del bucket.
2. Cómo se conecta el objeto con el bucket.
3. Cómo se combinan las etiquetas.
4. Cómo se crean las instancias auxiliares.
5. Cómo se realiza la limpieza.

### 27.5. Idea final

Aprender HCL no consiste en memorizar bloques aislados.

Consiste en comprender cómo los valores, las expresiones y las referencias describen una infraestructura que Terraform puede analizar, comparar y gestionar.