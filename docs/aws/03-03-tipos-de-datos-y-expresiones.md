# Tipos de datos y expresiones en Terraform

Los tipos de datos indican qué clase de información utiliza una configuración.

Las expresiones permiten consultar, transformar y combinar esa información.

En Terraform, ambas cosas están directamente relacionadas.

Una variable puede recibir un objeto con varios atributos.

Una expresión puede transformar ese objeto en etiquetas, nombres de recursos o contenido de archivos.

Esta lección desarrolla esos conceptos mediante ejercicios de consola y un laboratorio con S3 en LocalStack.

La plataforma de referencia es AWS.

El entorno de ejecución de los recursos es local.

> **Importante:** utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta de AWS para completar estas prácticas.
>
> LocalStack no reproduce todas las características ni garantías de AWS.

---

## 1. Objetivos de aprendizaje

Esta lección conecta los fundamentos del sistema de tipos con configuraciones ejecutables.

### 1.1. Objetivos principales

Al finalizar podrás:

- Identificar cadenas, números y booleanos.
- Diferenciar valores nulos y desconocidos.
- Comprender listas, conjuntos y mapas.
- Comprender objetos y tuplas.
- Declarar restricciones de tipo.
- Utilizar atributos opcionales.
- Construir expresiones condicionales.
- Transformar colecciones con `for`.
- Utilizar funciones habituales.
- Crear recursos con `for_each`.
- Generar JSON con `jsonencode`.
- Interpretar errores de conversión.

### 1.2. Resultado práctico

Construirás un laboratorio con:

1. Una configuración de proyecto tipada.
2. Dos buckets definidos mediante un mapa.
3. Objetos de texto.
4. Contenido JSON generado.
5. Etiquetas calculadas.
6. Salidas estructuradas.

### 1.3. Evidencias de aprendizaje

Entrega:

- Los archivos de configuración.
- Resultados de ejercicios de consola.
- Un registro de errores y correcciones.
- Una explicación de los tipos utilizados.

No entregues estados ni planes binarios.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de HCL.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
```

El laboratorio utiliza:

- Terraform 1.6 o superior dentro de la serie 1.x.
- El proveedor AWS de la serie 5.x.
- Docker Compose.
- AWS CLI.
- Una imagen de LocalStack validada para S3.

### 2.2. Conocimientos necesarios

Deberías reconocer:

- Bloques y argumentos.
- Variables.
- Valores locales.
- Recursos.
- Salidas.
- Referencias entre recursos.

### 2.3. Convención de versiones

La selección del proveedor es una decisión de compatibilidad.

No implica que esa serie sea la más reciente.

Conserva `.terraform.lock.hcl` en el proyecto raíz.

La imagen de LocalStack debe ser común para todo el grupo.

---

## 3. Valores, tipos y expresiones

Estos tres conceptos aparecen juntos, pero no significan lo mismo.

### 3.1. Valor

Un valor es información concreta:

```hcl
"dev"
```

```hcl
3
```

```hcl
true
```

### 3.2. Tipo

El tipo describe la estructura del valor:

```hcl
string
number
bool
```

Una restricción de tipo establece qué valores admite una entrada.

### 3.3. Expresión

Una expresión produce un valor:

```hcl
upper("dev")
```

Resultado:

```hcl
"DEV"
```

### 3.4. Relación

Una expresión tiene un resultado.

Ese resultado tiene un tipo.

El argumento que lo recibe debe aceptar un valor compatible.

---

## 4. Mapa del sistema de tipos

Terraform diferencia tipos primitivos, colecciones y estructuras.

### 4.1. Vista general

| **Familia** | **Tipos** | **Característica** |
|-------------|-----------|--------------------|
| Primitivos | `string`, `number`, `bool` | Un valor básico |
| Colecciones | `list`, `set`, `map` | Elementos de un tipo común |
| Estructurales | `tuple`, `object` | Estructura definida |
| Valores especiales | `null` y desconocidos | Ausencia o información pendiente |

`null` no es una palabra que sustituya cualquier error.

Un valor desconocido tampoco equivale a un valor nulo.

### 4.2. Tipos parametrizados

Una colección necesita un tipo de elemento:

```hcl
list(string)
set(string)
map(string)
```

### 4.3. Estructuras explícitas

```hcl
object({
  name    = string
  enabled = bool
})
```

```hcl
tuple([string, number, bool])
```

### 4.4. Primera regla

No elijas el tipo solo porque acepte el ejemplo actual.

Elige el tipo que represente el contrato de la entrada.

---

## 5. Cadenas: `string`

Las cadenas representan texto.

### 5.1. Ejemplos

```hcl
project     = "curso-tipos"
environment = "dev"
region      = "us-east-1"
```

Las cadenas utilizan comillas dobles.

### 5.2. Texto y números

Estos valores no expresan inicialmente lo mismo:

```hcl
3
```

```hcl
"3"
```

El primero es un número.

El segundo es texto.

### 5.3. Transformaciones

```hcl
upper("localstack")
lower("TERRAFORM")
trimspace("  curso  ")
replace("curso_tipos", "_", "-")
```

### 5.4. Interpolación

```hcl
"${var.project}-${var.environment}"
```

La interpolación incorpora expresiones dentro de una cadena.

### 5.5. Referencia directa

Si solo necesitas una variable:

```hcl
var.project
```

No necesitas envolverla en una interpolación.

---

## 6. Números: `number`

Los números representan cantidades y resultados aritméticos.

### 6.1. Ejemplos

```hcl
copies  = 2
minutes = 45
ratio   = 0.5
```

Terraform no obliga a declarar por separado enteros y decimales.

### 6.2. Operaciones

```hcl
2 + 3
10 - 4
3 * 2
12 / 3
7 % 3
```

### 6.3. Conversión explícita

```hcl
tonumber("12")
```

Resultado:

```hcl
12
```

### 6.4. Conversión inválida

```hcl
tonumber("doce")
```

Produce un error.

Terraform no interpreta palabras como cantidades.

### 6.5. Validación

Si necesitas un entero, exprésalo mediante una condición:

```hcl
var.copies == floor(var.copies)
```

El tipo `number` por sí solo no establece esa regla.

---

## 7. Booleanos: `bool`

Los booleanos representan decisiones de verdadero o falso.

### 7.1. Valores

```hcl
true
false
```

No llevan comillas.

### 7.2. Ejemplo de variable

```hcl
variable "enabled" {
  type    = bool
  default = true
}
```

### 7.3. Operadores

```hcl
true && false
true || false
!true
```

Resultados:

```hcl
false
true
false
```

### 7.4. Comparación

```hcl
var.environment == "dev"
```

La comparación produce un booleano.

### 7.5. Buena práctica

Si ya tienes un booleano, utiliza:

```hcl
var.enabled
```

Evita comparaciones innecesarias:

```hcl
var.enabled == true
```

---

## 8. El valor `null`

`null` representa ausencia de valor.

### 8.1. Ejemplo

```hcl
description = null
```

Su interpretación depende del contexto.

En un argumento de recurso, suele comportarse como si el argumento no se hubiese establecido.

Si el argumento es obligatorio, puede producir un error.

### 8.2. No es una cadena vacía

Estos valores son distintos:

```hcl
null
```

```hcl
""
```

### 8.3. No es una colección vacía

También son distintos:

```hcl
null
```

```hcl
[]
```

### 8.4. Nulabilidad de variables

```hcl
variable "project" {
  type     = string
  nullable = false
}
```

La variable completa no puede recibir `null`.

Esta propiedad no elimina automáticamente valores nulos dentro de estructuras anidadas.

---

## 9. Valores desconocidos

Terraform puede conocer un tipo sin conocer todavía el valor definitivo.

### 9.1. Durante el plan

Puedes observar:

```text
(known after apply)
```

Significa que el valor estará disponible posteriormente.

### 9.2. Ejemplo

```hcl
aws_s3_bucket.lab["docs"].arn
```

El proveedor puede completar ciertos atributos durante la aplicación.

### 9.3. Diferencia con `null`

- `null`: el valor está ausente.
- Desconocido: el valor todavía no se conoce.
- Error: la expresión no puede evaluarse correctamente.

### 9.4. Consecuencia práctica

Las claves de `for_each` deben conocerse al construir el plan.

No las derives de identificadores que solo aparecen después de crear recursos.

### 9.5. Propagación

Una expresión que utiliza un valor desconocido puede producir otro valor desconocido.

Eso no implica necesariamente un fallo.

---

## 10. Listas: `list`

Las listas representan secuencias de elementos de un tipo común.

### 10.1. Declaración

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "test", "prod"]
}
```

### 10.2. Acceso

```hcl
var.environments[0]
```

El primer índice es cero.

### 10.3. Características

Las listas:

- Conservan el orden.
- Admiten elementos repetidos.
- Se consultan mediante índices.
- Necesitan elementos compatibles con el tipo declarado.

### 10.4. Funciones

```hcl
length(["dev", "test"])
concat(["dev"], ["test"])
reverse(["dev", "test"])
```

### 10.5. Índice inválido

```hcl
["dev", "test"][2]
```

Produce un error.

La lista solo tiene los índices cero y uno.

---

## 11. Conjuntos: `set`

Los conjuntos representan elementos únicos sin un orden significativo.

### 11.1. Conversión

```hcl
toset(["dev", "test", "dev"])
```

El duplicado desaparece.

### 11.2. Declaración

```hcl
variable "selected_environments" {
  type    = set(string)
  default = ["dev", "test"]
}
```

Terraform convierte el valor si es compatible.

### 11.3. Sin índices posicionales

No utilices:

```hcl
var.selected_environments[0]
```

Un conjunto no es una lista indexada.

### 11.4. Uso habitual

Los conjuntos de cadenas son útiles para `for_each`.

Cada cadena puede actuar como clave de instancia.

### 11.5. Orden para presentación

Si necesitas una lista ordenada:

```hcl
sort(tolist(var.selected_environments))
```

No dependas del orden incidental de un conjunto.

---

## 12. Mapas: `map`

Los mapas relacionan claves de texto con valores de un tipo común.

### 12.1. Ejemplo

```hcl
variable "tags" {
  type = map(string)

  default = {
    Owner = "formacion"
    Group = "grupo-a"
  }
}
```

### 12.2. Acceso

```hcl
var.tags["Owner"]
```

### 12.3. Clave ausente

Acceder directamente a una clave que no existe produce un error.

Puedes proporcionar un valor alternativo:

```hcl
lookup(var.tags, "Department", "sin-departamento")
```

### 12.4. Funciones

```hcl
keys(var.tags)
values(var.tags)
length(var.tags)
```

### 12.5. Uso habitual

Las etiquetas son un buen ejemplo de `map(string)`.

Todas sus claves son texto.

Todos sus valores deben ser texto compatible.

---

## 13. Objetos: `object`

Los objetos describen atributos conocidos que pueden tener tipos diferentes.

### 13.1. Declaración

```hcl
variable "project_config" {
  type = object({
    name        = string
    environment = string
    copies      = number
    enabled     = bool
  })
}
```

### 13.2. Valor

```hcl
project_config = {
  name        = "curso-tipos"
  environment = "dev"
  copies      = 2
  enabled     = true
}
```

### 13.3. Acceso

```hcl
var.project_config.name
var.project_config.copies
```

### 13.4. Diferencia con un mapa

El objeto tiene un esquema de atributos.

El mapa permite claves variables con valores de un tipo común.

### 13.5. Conversión

Al convertir un objeto a un esquema más reducido, Terraform puede descartar atributos adicionales.

No dependas de atributos que tu contrato no declara.

---

## 14. Tuplas: `tuple`

Las tuplas representan posiciones conocidas con tipos definidos.

### 14.1. Declaración

```hcl
variable "example_tuple" {
  type = tuple([
    string,
    number,
    bool
  ])
}
```

### 14.2. Valor válido

```hcl
example_tuple = [
  "laboratorio",
  45,
  true
]
```

### 14.3. Acceso

```hcl
var.example_tuple[0]
var.example_tuple[1]
var.example_tuple[2]
```

### 14.4. Diferencia con lista

Una lista utiliza un tipo de elemento común.

Una tupla establece el tipo de cada posición.

### 14.5. Cuándo utilizarla

Una tupla puede representar una estructura posicional.

Si los campos tienen significado propio, un objeto suele ser más legible.

---

## 15. Tipos literales y conversiones

La sintaxis literal no siempre coincide con el tipo final esperado.

### 15.1. Corchetes

```hcl
["dev", "test"]
```

Esta expresión produce una tupla.

Terraform puede convertirla a una lista o conjunto compatible.

### 15.2. Llaves

```hcl
{
  Owner = "formacion"
}
```

Esta expresión produce un objeto.

Puede convertirse a un mapa compatible.

### 15.3. Conversión explícita

```hcl
tolist(["dev", "test"])
toset(["dev", "test"])
tomap({ Owner = "formacion" })
```

### 15.4. Conversión automática

Una variable `list(string)` puede aceptar números convertibles a texto.

Eso puede ocultar un error de intención.

### 15.5. Regla práctica

Utiliza tipos explícitos en las entradas.

Revisa las conversiones cuando mezcles datos de distintas clases.

---

## 16. El marcador `any`

`any` no significa que Terraform ignore los tipos.

### 16.1. Ejemplo

```hcl
variable "payload" {
  type = any
}
```

Terraform busca un tipo concreto compatible con el valor recibido.

### 16.2. Riesgo

Si tu configuración necesita atributos específicos, `any` debilita el contrato.

Los errores pueden aparecer más tarde.

### 16.3. Preferencia

En lugar de:

```hcl
type = any
```

Utiliza un esquema cuando conozcas la estructura:

```hcl
type = object({
  name    = string
  enabled = bool
})
```

### 16.4. Uso razonable

`any` puede ser adecuado para pasar un valor opaco a `jsonencode`.

No debe convertirse en la solución habitual a errores de tipos.

---

## 17. Atributos opcionales

Los objetos pueden incluir atributos que el usuario no necesita proporcionar.

### 17.1. Ejemplo

```hcl
variable "document" {
  type = object({
    content      = string
    content_type = optional(string, "text/plain")
    enabled      = optional(bool, true)
  })
}
```

### 17.2. Valor mínimo

```hcl
document = {
  content = "Laboratorio."
}
```

Terraform completa los valores predeterminados.

### 17.3. Opcional sin predeterminado

```hcl
description = optional(string)
```

Si se omite, el atributo recibe `null`.

### 17.4. Predeterminado no nulo

Con `optional(string, "text/plain")`, tanto la omisión como un `null` explícito utilizan el valor predeterminado.

### 17.5. Contrato

Los atributos opcionales reducen repetición.

No deben ocultar decisiones de seguridad importantes.

---

## 18. Operadores y condicionales

Las expresiones combinan valores siguiendo reglas de tipo.

### 18.1. Comparaciones

```hcl
3 > 2
"dev" == "prod"
length(["a", "b"]) == 2
```

### 18.2. Condicional

```hcl
var.enabled ? "activo" : "inactivo"
```

### 18.3. Ramas compatibles

Esto es fácil de interpretar:

```hcl
var.enabled ? ["docs"] : []
```

Esto exige revisar conversiones:

```hcl
var.enabled ? 1 : "desactivado"
```

Terraform puede buscar un tipo común y convertir valores.

### 18.4. Lógica y accesos inválidos

No utilices `&&` o `||` como garantía de protección ante un acceso inválido.

Terraform no debe tratarse como un lenguaje imperativo con cortocircuito garantizado.

### 18.5. Alternativa

Utiliza una estructura condicional o una función apropiada para el caso.

Mantén expresiones pequeñas y comprensibles.

---

## 19. Funciones para tratar ausencias y errores

Cada función resuelve un problema diferente.

### 19.1. `lookup`

Consulta una clave de mapa con alternativa:

```hcl
lookup({ Owner = "docente" }, "Group", "sin-grupo")
```

### 19.2. `try`

Devuelve la primera expresión que no produce un error dinámico:

```hcl
try(local.external.owner, "sin-owner")
```

No captura errores estructurales como referencias a nombres inexistentes.

### 19.3. `can`

Comprueba si una expresión puede evaluarse:

```hcl
can(tonumber("12"))
can(tonumber("doce"))
```

### 19.4. `coalesce`

Selecciona el primer argumento que no sea nulo ni una cadena vacía:

```hcl
coalesce(null, "", "formacion")
```

### 19.5. Precaución

`try` no sustituye un contrato de entrada bien definido.

No utilices valores alternativos para ocultar configuraciones defectuosas.

---

## 20. Funciones de colecciones

Estas funciones permiten construir estructuras reutilizables.

### 20.1. Combinar mapas

```hcl
merge(
  { Owner = "docente" },
  { Environment = "dev" }
)
```

### 20.2. Claves repetidas

```hcl
merge(
  { Owner = "equipo-a" },
  { Owner = "equipo-b" }
)
```

Prevalece `equipo-b`.

### 20.3. Aplanar listas

```hcl
flatten([
  ["dev", "test"],
  ["prod"]
])
```

### 20.4. Eliminar repetidos

```hcl
distinct(["dev", "dev", "test"])
```

### 20.5. Unir y separar

```hcl
join("-", ["curso", "tipos", "dev"])
split("-", "curso-tipos-dev")
```

### 20.6. Aplicación

Utilizaremos `merge`, `flatten` y expresiones `for` para construir las entradas de los objetos S3.

---

## 21. Expresiones `for`

Una expresión `for` transforma una colección en un nuevo valor.

### 21.1. Lista transformada

```hcl
[
  for name in ["docs", "reports"] :
  upper(name)
]
```

### 21.2. Objeto transformado

```hcl
{
  for name in ["docs", "reports"] :
  name => upper(name)
}
```

### 21.3. Filtro

```hcl
[
  for name in ["docs", "reports", "tmp"] :
  name
  if name != "tmp"
]
```

### 21.4. Clave y valor

```hcl
{
  for key, value in {
    docs    = true
    reports = false
  } :
  key => value
  if value
}
```

### 21.5. Resultado

La expresión produce un valor.

No crea recursos por sí misma.

---

## 22. `for_each` e identidad de recursos

`for_each` utiliza una colección para crear instancias identificables.

### 22.1. Ejemplo

```hcl
resource "aws_s3_bucket" "example" {
  for_each = {
    docs    = {}
    reports = {}
  }

  bucket = "ejemplo-${each.key}"
}
```

Este fragmento es conceptual.

No lo añadas al laboratorio.

### 22.2. Direcciones

```text
aws_s3_bucket.example["docs"]
aws_s3_bucket.example["reports"]
```

### 22.3. Valores admitidos

Para recursos, `for_each` utiliza:

- Un mapa.
- Un conjunto de cadenas.

No convierte automáticamente una lista en conjunto.

### 22.4. Restricciones

Las claves deben conocerse durante el plan.

Los valores sensibles no pueden utilizarse como argumento de `for_each`.

### 22.5. Recomendación

Elige claves estables que expresen identidad lógica.

No utilices un nombre remoto cambiante como clave sin analizar las consecuencias.

---

## 23. JSON y valores estructurados

Terraform puede convertir estructuras en documentos JSON.

### 23.1. Generación

```hcl
jsonencode({
  project = "curso-tipos"
  enabled = true
  copies  = 2
})
```

### 23.2. Ventaja

No necesitas gestionar manualmente:

- Comillas.
- Comas.
- Escapes.
- Booleanos.
- Valores nulos.

### 23.3. Lectura

```hcl
jsondecode("{\"enabled\":true,\"copies\":2}")
```

### 23.4. Tipos resultantes

`jsondecode` produce valores compatibles con:

- Objetos.
- Tuplas.
- Cadenas.
- Números.
- Booleanos.
- Nulos.

### 23.5. Limitación

Una conversión de ida y vuelta a JSON no conserva necesariamente todos los tipos originales de Terraform.

Por ejemplo, JSON no distingue listas y conjuntos.

---

## 24. Preparación del laboratorio

Crearemos un proyecto independiente.

### 24.1. Directorio

```bash
mkdir -p terraform-tipos-localstack
cd terraform-tipos-localstack
```

### 24.2. Archivos

```text
terraform-tipos-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
└── outputs.tf
```

### 24.3. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
documento-descargado.txt
manifest-descargado.json
```

### 24.4. Imagen

El docente debe indicar una etiqueta o digest validado:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

Sustituye el marcador antes de continuar.

---

## 25. Arranque de LocalStack

Solo necesitamos S3 para este laboratorio.

### 25.1. `compose.yaml`

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

### 25.2. Arrancar

```bash
docker compose up -d
docker compose ps
```

### 25.3. Credenciales ficticias

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 25.4. Verificar

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

Espera a que la consulta responda correctamente.

---

## 26. Requisitos y proveedor

Estos archivos conectan Terraform con el S3 local.

### 26.1. `versions.tf`

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

### 26.2. `providers.tf`

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

### 26.3. Alcance

Terraform se ejecuta en el host.

Si se ejecuta en otro contenedor, revisa la dirección del endpoint.

El backend permanece local.

---

## 27. Variable estructurada del proyecto

Utilizaremos un objeto para agrupar la configuración general.

### 27.1. Añadir a `variables.tf`

```hcl
variable "project" {
  description = "Configuración general del laboratorio."

  type = object({
    name        = string
    environment = string
    suffix      = string
    owner       = optional(string, "formacion")
  })

  nullable = false

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{2,19}$",
      var.project.name
    ))
    error_message = "El nombre debe tener entre 3 y 20 caracteres válidos."
  }

  validation {
    condition = contains(
      ["dev", "test", "prod"],
      var.project.environment
    )
    error_message = "El entorno debe ser dev, test o prod."
  }

  validation {
    condition = can(regex(
      "^[a-z0-9]{4,8}$",
      var.project.suffix
    ))
    error_message = "El sufijo debe tener entre 4 y 8 caracteres."
  }
}
```

### 27.2. Decisión de diseño

El objeto agrupa valores relacionados.

Las validaciones comprueban convenciones del laboratorio.

No reproducen todas las reglas de AWS.

---

## 28. Variables de buckets y documentos

El mapa permite definir varias instancias con atributos propios.

### 28.1. Añadir a `variables.tf`

```hcl
variable "buckets" {
  description = "Buckets lógicos y sus documentos."

  type = map(object({
    enabled = optional(bool, true)
    tags    = optional(map(string), {})

    documents = optional(map(object({
      content      = string
      content_type = optional(string, "text/plain")
      enabled      = optional(bool, true)
    })), {})
  }))

  nullable = false

  validation {
    condition = alltrue([
      for key in keys(var.buckets) :
      can(regex("^[a-z][a-z0-9]{2,11}$", key))
    ])
    error_message = "Las claves deben tener entre 3 y 12 caracteres."
  }
}

variable "extra_tags" {
  description = "Etiquetas comunes adicionales."
  type        = map(string)
  default     = {}
  nullable    = false
}
```

### 28.2. Niveles

Tenemos:

1. Un mapa de buckets.
2. Un objeto por bucket.
3. Un mapa de documentos.
4. Un objeto por documento.

---

## 29. Valores de entrada del laboratorio

Crea `terraform.tfvars` con datos ficticios.

### 29.1. Configuración

```hcl
project = {
  name        = "curso-tipos"
  environment = "dev"
  suffix      = "alumno01"
}

extra_tags = {
  Group = "grupo-a"
}

buckets = {
  docs = {
    tags = {
      Purpose = "documentation"
    }

    documents = {
      "README.txt" = {
        content = "Introducción a tipos y expresiones."
      }

      "NOTAS.txt" = {
        content = "Documento pendiente."
        enabled = false
      }
    }
  }

  reports = {
    documents = {
      "INFORME.txt" = {
        content = "Laboratorio ejecutado en LocalStack."
      }
    }
  }
}
```

### 29.2. Predeterminados

`owner`, `enabled`, `tags` y `content_type` pueden completarse mediante sus valores predeterminados.

---

## 30. Valores locales y filtrado

Crea `locals.tf`.

### 30.1. Nombres y etiquetas

```hcl
locals {
  prefix = "${var.project.name}-${var.project.environment}-${var.project.suffix}"

  base_tags = {
    Project     = var.project.name
    Environment = var.project.environment
    Owner       = var.project.owner
    ManagedBy   = "Terraform"
    Laboratory  = "LocalStack"
  }

  active_buckets = {
    for key, config in var.buckets :
    key => config
    if config.enabled
  }

  bucket_tags = {
    for key, config in local.active_buckets :
    key => merge(
      var.extra_tags,
      config.tags,
      local.base_tags
    )
  }
}
```

### 30.2. Precedencia

Las etiquetas base se colocan al final.

Por tanto, prevalecen ante claves repetidas.

### 30.3. Filtrado

Los buckets deshabilitados no aparecen en `active_buckets`.

Esto afectará a las instancias gestionadas.

---

## 31. Transformación de documentos

Añade otro bloque `locals` al mismo archivo.

### 31.1. Aplanar estructuras

```hcl
locals {
  document_items = flatten([
    for bucket_key, bucket_config in local.active_buckets : [
      for object_key, document in bucket_config.documents : {
        instance_key = jsonencode([bucket_key, object_key])
        bucket_key   = bucket_key
        object_key   = object_key
        content      = document.content
        content_type = document.content_type
      }
      if document.enabled
    ]
  ])

  active_documents = {
    for document in local.document_items :
    document.instance_key => document
  }
}
```

### 31.2. Clave de instancia

Utilizamos `jsonencode` de dos cadenas para construir una clave sin ambigüedad.

Evita colisiones que podrían aparecer al concatenar sin una convención adecuada.

### 31.3. Diferencia de nombres

`instance_key` identifica la instancia en Terraform.

`object_key` identifica el objeto dentro de S3.

No tienen que ser iguales.

---

## 32. Recursos S3 del laboratorio

Crea `main.tf`.

### 32.1. Buckets y documentos

```hcl
resource "aws_s3_bucket" "lab" {
  for_each = local.active_buckets

  bucket = "${local.prefix}-${each.key}"

  # Solo para facilitar la limpieza de datos ficticios.
  force_destroy = true

  tags = local.bucket_tags[each.key]
}

resource "aws_s3_object" "document" {
  for_each = local.active_documents

  bucket = aws_s3_bucket.lab[each.value.bucket_key].id
  key    = each.value.object_key

  content      = each.value.content
  content_type = each.value.content_type
}
```

### 32.2. Dependencia

La referencia al bucket establece la dependencia del objeto.

No necesitamos un `depends_on` adicional.

### 32.3. Identidad

Las claves de instancia proceden de las entradas.

No dependen de identificadores generados después de aplicar.

---

## 33. Manifiestos JSON

Añade a `main.tf` un recurso que genere metadatos por bucket.

### 33.1. Recurso

```hcl
resource "aws_s3_object" "manifest" {
  for_each = local.active_buckets

  bucket       = aws_s3_bucket.lab[each.key].id
  key          = "_lab/manifest.json"
  content_type = "application/json"

  content = jsonencode({
    project     = var.project.name
    environment = var.project.environment
    owner       = var.project.owner
    bucket_key  = each.key

    documents = sort([
      for object_key, document in each.value.documents :
      object_key
      if document.enabled
    ])

    tags = local.bucket_tags[each.key]
  })
}
```

### 33.2. Reserva de clave

No definas un documento con la clave `_lab/manifest.json`.

Está reservada para este recurso.

Dos recursos no deben gestionar el mismo objeto remoto.

---

## 34. Salidas estructuradas

Crea `outputs.tf`.

### 34.1. Información del laboratorio

```hcl
output "bucket_names" {
  description = "Nombres por clave lógica."

  value = {
    for key, bucket in aws_s3_bucket.lab :
    key => bucket.bucket
  }
}

output "lab_summary" {
  description = "Resumen estructurado."

  value = {
    project       = var.project.name
    environment   = var.project.environment
    bucket_count  = length(local.active_buckets)
    document_count = length(local.active_documents)

    buckets = {
      for key, bucket in aws_s3_bucket.lab :
      key => {
        name = bucket.bucket
        arn  = bucket.arn
        tags = local.bucket_tags[key]
      }
    }
  }
}

output "docs_bucket_name" {
  description = "Nombre del bucket docs, si existe."
  value       = try(aws_s3_bucket.lab["docs"].bucket, null)
}
```

### 34.2. Nota

Una salida nula puede no aparecer como salida disponible en el módulo raíz.

No diseñes scripts suponiendo que siempre existirá.

---

## 35. Sesión práctica: consola de tipos

Inicializa antes de abrir la consola.

### 35.1. Preparación

```bash
terraform init
terraform console
```

### 35.2. Tipos básicos

Introduce:

```hcl
type("dev")
type(3)
type(true)
type(["dev", "test"])
type(tolist(["dev", "test"]))
type(toset(["dev", "test"]))
```

`type` es una función especial de la consola.

No la utilices en archivos de configuración.

### 35.3. Objetos

```hcl
type(var.project)
var.project.owner
type(var.buckets)
keys(local.active_buckets)
```

### 35.4. Documentos

```hcl
length(local.active_documents)
keys(local.active_documents)
local.document_items
```

### 35.5. Finalizar

```text
exit
```

Registra tipos y valores por separado.

---

## 36. Sesión práctica: primer despliegue

El objetivo es comprobar cómo las estructuras se convierten en recursos.

### 36.1. Comprobaciones

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=lab.tfplan
```

### 36.2. Recursos esperados

Con los valores originales:

- Dos buckets.
- Dos documentos activos.
- Dos manifiestos.

En total, seis recursos nuevos.

`NOTAS.txt` está deshabilitado y no se crea.

### 36.3. Aplicación

```bash
terraform apply lab.tfplan
terraform output
```

Un plan guardado se aplica sin otra confirmación interactiva.

Revísalo antes.

### 36.4. Resumen JSON

```bash
terraform output -json lab_summary
```

### 36.5. Entregable

Explica cómo el filtro de documentos se refleja en el plan.

---

## 37. Sesión práctica: verificación en LocalStack

Utiliza AWS CLI con el endpoint explícito.

### 37.1. Obtener el bucket

```bash
DOCS_BUCKET="$(terraform output -raw docs_bucket_name)"
```

### 37.2. Listar

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$DOCS_BUCKET"
```

### 37.3. Descargar documento

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${DOCS_BUCKET}/README.txt" \
  ./documento-descargado.txt
```

### 37.4. Descargar manifiesto

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${DOCS_BUCKET}/_lab/manifest.json" \
  ./manifest-descargado.json
```

### 37.5. Comprobar

Lee ambos archivos y verifica que `NOTAS.txt` no aparece como documento activo.

---

## 38. Sesión práctica: modificar entradas

Cambia una variable cada vez.

### 38.1. Activar documento

En `terraform.tfvars`:

```hcl
"NOTAS.txt" = {
  content = "Documento ahora activo."
  enabled = true
}
```

### 38.2. Plan esperado

Ejecuta:

```bash
terraform plan
```

Debería mostrar:

- Creación del documento.
- Actualización del manifiesto correspondiente.

### 38.3. Cambiar etiquetas

Modifica `Group`.

Revisa cómo afecta a etiquetas y manifiestos.

### 38.4. Deshabilitar bucket

Establecer `enabled = false` elimina su entrada de `for_each`.

Si ya existe, Terraform planificará su destrucción y la de los objetos asociados.

### 38.5. Advertencia

Deshabilitar no significa pausar.

En este diseño significa dejar de declarar el recurso.

No apliques sin revisar.

---

## 39. Errores frecuentes

Clasifica el problema antes de corregirlo.

### 39.1. Tipo incompatible

Prueba temporalmente:

```hcl
extra_tags = ["grupo-a"]
```

La variable requiere un mapa, no una lista.

### 39.2. Atributo obligatorio ausente

Elimina temporalmente `content` de un documento.

La entrada no cumple su esquema.

### 39.3. Índice inválido

En consola:

```hcl
["docs"][1]
```

### 39.4. Conversión incompatible

En consola:

```hcl
tolist(["docs", { enabled = true }])
```

Los elementos no tienen un tipo común adecuado para esa conversión.

### 39.5. Referencia incorrecta

`try` no corrige un nombre local que nunca se declaró.

### 39.6. Restauración

Después de cada prueba, restaura la configuración válida.

Ejecuta nuevamente formato y validación.

---

## 40. Diferencias respecto a AWS real

Los tipos pertenecen a Terraform, pero los recursos tienen comportamiento remoto.

### 40.1. Lo que se transfiere

Se mantienen:

- Contratos de entrada.
- Expresiones.
- Conversiones.
- Claves de instancia.
- Dependencias.
- Salidas.

### 40.2. Lo que debes revisar

Cambian:

- Credenciales.
- Endpoints.
- IAM.
- Restricciones del servicio.
- Persistencia.
- Costes.
- Compatibilidad de operaciones.

### 40.3. Datos sensibles

Marcar un valor como `sensitive` no evita que pueda guardarse en el estado.

Además, escribirlo en un objeto S3 lo publica en ese objeto.

### 40.4. Persistencia local

El estado y LocalStack son sistemas independientes.

Si el emulador pierde recursos, el estado puede seguir registrándolos.

### 40.5. Eliminación

`force_destroy = true` es una decisión didáctica.

No es una recomendación general para producción.

---

## 41. Limpieza del laboratorio

Mantén LocalStack activo hasta finalizar la destrucción.

### 41.1. Revisar

```bash
terraform plan -destroy -out=destroy.tfplan
```

El número de recursos depende de los cambios que hayas aplicado.

### 41.2. Destruir

```bash
terraform apply destroy.tfplan
```

### 41.3. Verificar

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 41.4. Apagar

```bash
docker compose down
```

### 41.5. Retirar archivos auxiliares

```bash
rm -f lab.tfplan destroy.tfplan
rm -f documento-descargado.txt manifest-descargado.json
```

Conserva la configuración y el archivo de bloqueo.

No borres el estado como sustituto de la destrucción.

---

## 42. Ejercicios y resumen

Consolida los conceptos antes de pasar a variables avanzadas.

### 42.1. Ejercicios

1. Añade un tercer bucket.
2. Añade un documento JSON mediante `jsonencode`.
3. Define una etiqueta opcional.
4. Construye una lista ordenada de nombres.
5. Calcula el número de documentos por bucket.
6. Explica la diferencia entre mapa y objeto.
7. Explica la diferencia entre lista y tupla.
8. Describe el efecto de deshabilitar un bucket existente.

### 42.2. Lista de comprobación

Debes poder distinguir:

- Texto y número.
- Booleano y cadena.
- Nulo y desconocido.
- Lista y conjunto.
- Mapa y objeto.
- Expresión `for` y metaargumento `for_each`.
- Conversión y validación.
- Generación de JSON y verificación del contenido.

### 42.3. Idea final

Los tipos establecen contratos.

Las expresiones convierten esos contratos en valores útiles.

Una configuración mantenible combina estructuras claras, transformaciones legibles y verificaciones que permiten comprender los cambios antes de aplicarlos.