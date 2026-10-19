# Valores locales y funciones en Terraform

Los valores locales permiten asignar nombres a expresiones que se utilizan dentro de una configuración.

Las funciones permiten transformar cadenas, colecciones, números y documentos estructurados.

Combinados, ayudan a escribir configuraciones más claras y a evitar repeticiones.

En esta lección construiremos nombres de buckets, etiquetas y documentos mediante expresiones reutilizables.

La plataforma de referencia es AWS.

Los recursos se crearán únicamente en S3 emulado con LocalStack.

> **Curso de Terraform para AWS.**
>
> Los ejemplos y prácticas se ejecutan localmente con LocalStack.
>
> Utiliza credenciales ficticias y revisa los endpoints antes de aplicar.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos

Esta lección combina fundamentos del lenguaje y sesiones de práctica.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Declarar bloques `locals`.
- Referenciar valores mediante `local.nombre`.
- Diferenciar variables, locales y salidas.
- Utilizar funciones de cadenas.
- Combinar y transformar colecciones.
- Generar JSON correctamente.
- Utilizar archivos y plantillas.
- Reconocer expresiones inestables.
- Diagnosticar errores de funciones.

### 1.2. Resultado práctico

Crearás dos buckets y documentos calculados a partir de entradas.

También verificarás nombres, etiquetas y contenido desde AWS CLI.

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
jq --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se mantiene en la serie 5.x por compatibilidad didáctica.

La imagen de LocalStack debe ser común para todos los alumnos.

### 2.2. Conocimientos recomendados

Debes reconocer variables, mapas, recursos y salidas.

También debes saber interpretar un plan antes de aplicarlo.

---

## 3. Qué es un valor local

Un valor local asigna un nombre a una expresión interna.

### 3.1. Ejemplo básico

```hcl
locals {
  project = "curso-locales"
}
```

Puedes utilizarlo mediante:

```hcl
local.project
```

### 3.2. Significado

El nombre facilita reutilizar y explicar el valor.

No crea un recurso remoto.

No representa una entrada externa.

### 3.3. Regla de escritura

El bloque utiliza `locals`, en plural.

La referencia utiliza `local`, en singular.

---

## 4. Variables, locales y outputs

Estos mecanismos tienen responsabilidades diferentes.

### 4.1. Comparación

| **Elemento** | **Responsabilidad** | **Referencia** |
|--------------|---------------------|----------------|
| Variable | Recibir una entrada | `var.project` |
| Local | Nombrar una expresión interna | `local.prefix` |
| Output | Publicar un resultado | `module.storage.bucket_name` |

Los outputs raíz se consultan mediante Terraform CLI.

No existe una referencia general `output.nombre` para reutilizarlos internamente.

### 4.2. Flujo habitual

```text
Entradas → Locales → Recursos → Salidas
```

Este esquema representa relaciones conceptuales.

No establece una ejecución estrictamente secuencial.

Terraform construye un grafo de dependencias.

---

## 5. Declaración de varios locales

Un bloque puede contener varias expresiones relacionadas.

### 5.1. Ejemplo

```hcl
locals {
  project     = "curso-locales"
  environment = "dev"
  prefix      = "${local.project}-${local.environment}"
}
```

### 5.2. Referencias internas

Un local puede utilizar otro local.

También puede utilizar variables y atributos de recursos.

### 5.3. Orden visual

El orden de las declaraciones no determina su evaluación.

Terraform utiliza las dependencias entre expresiones.

### 5.4. Límite

No crees dependencias circulares entre locales.

---

## 6. Varios bloques `locals`

Puedes repartir locales entre varios archivos o bloques.

### 6.1. Primer bloque

```hcl
locals {
  project = "curso-locales"
}
```

### 6.2. Segundo bloque

```hcl
locals {
  prefix = "${local.project}-dev"
}
```

### 6.3. Comportamiento

Ambos pertenecen al mismo espacio de nombres del módulo.

No representan fases independientes.

### 6.4. Restricción

No declares dos locales con el mismo nombre.

Las declaraciones duplicadas no actúan como sobrescrituras.

---

## 7. Alcance de los valores locales

Cada módulo dispone de sus propios locales.

### 7.1. Dentro del módulo

```hcl
local.prefix
```

La referencia solo accede a un local del módulo actual.

### 7.2. Módulos hijos

Un módulo hijo no hereda los locales del módulo raíz.

Debes transmitir los valores mediante entradas.

### 7.3. Publicación

Para entregar un valor calculado a otro módulo, utiliza un output.

### 7.4. Recomendación

Mantén los locales como detalles internos.

Publica únicamente los resultados que necesita el consumidor.

---

## 8. Los locales no son variables mutables

Terraform no utiliza asignaciones sucesivas como un programa imperativo.

### 8.1. Patrón incorrecto

```hcl
# No utilizar:
# counter = 1
# counter = counter + 1
```

### 8.2. Patrón declarativo

```hcl
locals {
  initial_count = 1
  final_count   = local.initial_count + 1
}
```

### 8.3. Interpretación

Cada nombre describe una expresión.

No describe una operación que modifica una celda de memoria.

### 8.4. Consecuencia

No diseñes locales como pasos ejecutados de arriba hacia abajo.

---

## 9. Cuándo utilizar locales

Los locales deben aportar claridad o reutilización.

### 9.1. Buenos candidatos

- Prefijos de nombres.
- Etiquetas comunes.
- Colecciones filtradas.
- Documentos generados.
- Parámetros derivados.
- Normalización de entradas.

### 9.2. Uso excesivo

Crear un local para cada literal puede dificultar la lectura.

### 9.3. Ejemplo innecesario

```hcl
locals {
  text_plain = "text/plain"
}
```

Puede ser útil si se reutiliza o expresa una convención.

No es obligatorio para un único argumento evidente.

---

## 10. Qué es una función

Una función recibe argumentos y devuelve un valor.

### 10.1. Sintaxis

```hcl
nombre_funcion(argumento_1, argumento_2)
```

### 10.2. Ejemplo

```hcl
upper("terraform")
```

Resultado:

```hcl
"TERRAFORM"
```

### 10.3. Tipos

Cada función espera argumentos compatibles.

Una función no corrige automáticamente cualquier entrada.

### 10.4. Funciones disponibles

Esta lección utiliza funciones integradas en Terraform.

No necesitas instalar una biblioteca adicional para ellas.

---

## 11. Consola de Terraform

La consola permite probar expresiones antes de utilizarlas en recursos.

### 11.1. Directorio de práctica

```bash
mkdir -p practica-consola-locales
cd practica-consola-locales
terraform console
```

No necesitas LocalStack para evaluar cadenas y colecciones.

### 11.2. Primera prueba

```hcl
upper("localstack")
```

### 11.3. Tipos

```hcl
type(upper("localstack"))
```

`type` es una función especial de la consola.

No la utilices en archivos `.tf`.

### 11.4. Salida

Escribe `exit` para cerrar la consola.

---

## 12. Funciones de mayúsculas y minúsculas

Estas funciones transforman texto.

### 12.1. Ejemplos

```hcl
lower("CURSO-LOCALES")
upper("terraform")
title("curso de terraform")
```

### 12.2. Resultados orientativos

```text
curso-locales
TERRAFORM
Curso De Terraform
```

### 12.3. Aplicación

`lower` ayuda a construir nombres que requieren minúsculas.

### 12.4. Precaución

Cambiar el caso no valida todas las reglas del servicio.

Tampoco garantiza que un nombre esté disponible.

---

## 13. Limpieza y sustitución de texto

Estas funciones ayudan a normalizar entradas.

### 13.1. Ejemplos

```hcl
trimspace("  Curso_Locales  ")
replace("curso_locales", "_", "-")
trimprefix("curso-dev", "curso-")
trimsuffix("README.txt", ".txt")
```

### 13.2. Composición

```hcl
replace(lower(trimspace("  Curso_Locales  ")), "_", "-")
```

Resultado:

```hcl
"curso-locales"
```

### 13.3. Decisión de diseño

Normaliza únicamente variaciones que consideres aceptables.

### 13.4. Advertencia

No conviertas silenciosamente entradas peligrosas en nombres aparentemente válidos.

---

## 14. Construcción de cadenas

Puedes utilizar interpolación, `format` y `join`.

### 14.1. Interpolación

```hcl
"${var.project}-${var.environment}"
```

### 14.2. Formato

```hcl
format("%s-%s", "curso", "dev")
```

### 14.3. Unión

```hcl
join("-", ["curso", "dev", "alumno01"])
```

### 14.4. Criterio

Elige la expresión más legible.

`format` es útil cuando existe una plantilla con varios valores.

`join` resulta adecuado cuando ya tienes una colección.

---

## 15. Funciones numéricas

Terraform incluye operaciones para cantidades y límites.

### 15.1. Ejemplos

```hcl
min(3, 5, 2)
max(3, 5, 2)
ceil(2.3)
floor(2.8)
abs(-4)
```

### 15.2. Usos

Pueden servir para calcular tamaños o validar cantidades.

### 15.3. Validación de enteros

```hcl
var.copies == floor(var.copies)
```

### 15.4. Precaución

No limites automáticamente una entrada si el usuario necesita conocer que era inválida.

Una validación explícita puede ser más apropiada que corregirla silenciosamente.

---

## 16. Funciones de listas

Las listas conservan un orden significativo.

### 16.1. Ejemplos

```hcl
length(["docs", "reports"])
concat(["docs"], ["reports"])
reverse(["docs", "reports"])
distinct(["docs", "docs", "reports"])
sort(["reports", "docs"])
```

### 16.2. Resultado útil

```hcl
sort(distinct(["reports", "docs", "docs"]))
```

Produce una lista ordenada sin duplicados.

### 16.3. Aplicación

Utilizaremos ordenación en los documentos generados.

### 16.4. Beneficio

Una presentación estable facilita revisar cambios.

---

## 17. Funciones de conjuntos

Los conjuntos expresan pertenencia, no posición.

### 17.1. Conversión

```hcl
toset(["docs", "reports", "docs"])
```

### 17.2. Operaciones

```hcl
setunion(toset(["docs"]), toset(["reports"]))
setintersection(toset(["docs", "reports"]), toset(["docs"]))
setsubtract(toset(["docs", "reports"]), toset(["reports"]))
```

### 17.3. Presentación ordenada

```hcl
sort(tolist(toset(["reports", "docs"])))
```

### 17.4. Precaución

No accedas a un conjunto mediante índices numéricos.

### 17.5. Uso práctico

Un conjunto de cadenas puede utilizarse con `for_each`.

---

## 18. Mapas y `merge`

`merge` combina mapas u objetos.

### 18.1. Ejemplo

```hcl
merge(
  { Group = "grupo-a" },
  { ManagedBy = "Terraform" }
)
```

### 18.2. Claves repetidas

```hcl
merge(
  { Owner = "equipo-a" },
  { Owner = "equipo-b" }
)
```

Prevalece `equipo-b`.

### 18.3. Regla

El último argumento prevalece ante claves repetidas.

### 18.4. Laboratorio

Colocaremos las etiquetas obligatorias al final para conservar sus valores.

---

## 19. `merge` no realiza una fusión profunda

Las estructuras anidadas requieren una estrategia explícita.

### 19.1. Ejemplo

```hcl
merge(
  { settings = { color = "blue", size = "small" } },
  { settings = { size = "large" } }
)
```

### 19.2. Resultado conceptual

```hcl
{
  settings = {
    size = "large"
  }
}
```

### 19.3. Explicación

El segundo valor de `settings` sustituye al primero.

### 19.4. Recomendación

No presupongas que atributos anidados se conservan automáticamente.

---

## 20. Consultas de mapas

Varias funciones permiten inspeccionar claves y valores.

### 20.1. Ejemplos

```hcl
keys({ docs = "a", reports = "b" })
values({ docs = "a", reports = "b" })
lookup({ Owner = "docente" }, "Owner", "sin-owner")
lookup({ Owner = "docente" }, "Group", "sin-grupo")
```

### 20.2. Acceso directo

```hcl
local.tags["Owner"]
```

### 20.3. Diferencia

El acceso directo falla si la clave no existe.

`lookup` permite proporcionar una alternativa para una clave ausente.

### 20.4. Criterio

No uses alternativas para ocultar entradas que deberían ser obligatorias.

---

## 21. `try`, `can` y `coalesce`

Estas funciones resuelven problemas diferentes.

### 21.1. `try`

```hcl
try(jsondecode("{\"owner\":\"docente\"}").owner, "sin-owner")
```

Selecciona la primera expresión sin error dinámico.

### 21.2. `can`

```hcl
can(tonumber("12"))
can(tonumber("doce"))
```

Devuelve un booleano.

### 21.3. `coalesce`

```hcl
coalesce(null, "", "formacion")
```

Selecciona el primer valor no nulo ni cadena vacía.

### 21.4. Límite

`try` no captura referencias a identificadores que nunca fueron declarados.

---

## 22. Expresiones `for` y funciones

Las funciones pueden utilizarse dentro de transformaciones.

### 22.1. Transformación

```hcl
[
  for name in ["docs", "reports"] :
  upper(name)
]
```

### 22.2. Filtrado

```hcl
[
  for name in ["docs", "reports", "tmp"] :
  name
  if length(name) > 3
]
```

### 22.3. Objeto calculado

```hcl
{
  for name in ["docs", "reports"] :
  name => upper(name)
}
```

### 22.4. Distinción

Una expresión `for` produce un valor; `for_each` crea instancias.

---

## 23. Aplanar colecciones con `flatten`

`flatten` transforma listas anidadas en una lista.

### 23.1. Ejemplo

```hcl
flatten([
  ["docs", "reports"],
  ["archive"]
])
```

### 23.2. Resultado

```hcl
["docs", "reports", "archive"]
```

### 23.3. Aplicación

Es útil cuando una expresión `for` produce una lista por cada elemento.

### 23.4. Límite

No atraviesa arbitrariamente todos los objetos y mapas.

Aplana las listas anidadas directamente relacionadas con la lista recibida.

---

## 24. JSON con `jsonencode` y `jsondecode`

Estas funciones conectan valores de Terraform con documentos JSON.

### 24.1. Generación

```hcl
jsonencode({
  project = "curso-locales"
  local   = true
})
```

### 24.2. Lectura

```hcl
jsondecode("{\"project\":\"curso-locales\",\"local\":true}")
```

### 24.3. Ventaja

No necesitas construir manualmente comillas y comas.

### 24.4. Precaución

JSON no distingue todos los tipos de Terraform.

Por ejemplo, no conserva una distinción específica entre lista y conjunto.

---

## 25. Archivos y plantillas

Estas funciones utilizan archivos disponibles al evaluar la configuración.

### 25.1. Lectura

```hcl
file("${path.module}/templates/intro.txt")
```

### 25.2. Plantilla

```hcl
templatefile("${path.module}/templates/readme.tftpl", {
  project = var.project
})
```

### 25.3. `path.module`

Identifica el directorio del módulo donde aparece la expresión.

### 25.4. Restricción

El archivo debe existir al comenzar la ejecución.

No utilices estas funciones para leer un archivo que otro recurso creará durante el mismo apply.

---

## 26. Hashes y expresiones inestables

No todas las funciones son apropiadas para cualquier argumento.

### 26.1. Hash estable

```hcl
sha256("contenido")
```

El mismo texto produce el mismo hash.

### 26.2. Hora actual

```hcl
timestamp()
```

Introduce un valor que cambia entre ejecuciones.

### 26.3. Identificador no estable

```hcl
uuid()
```

Tampoco es adecuado para construir claves estables de `for_each`.

### 26.4. Regla

No utilices funciones variables como nombres de recursos sin analizar reemplazos y cambios continuos.

---

## 27. Preparación del laboratorio

Crearemos un proyecto independiente.

### 27.1. Directorios

```bash
mkdir -p terraform-locales-localstack/templates
cd terraform-locales-localstack
```

### 27.2. Estructura

```text
terraform-locales-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
├── outputs.tf
└── templates/
```

Todos los comandos siguientes se ejecutan desde este directorio.

---

## 28. LocalStack y credenciales ficticias

El docente debe proporcionar una imagen validada para S3.

### 28.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 28.2. `compose.yaml`

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

### 28.3. Arranque

```bash
docker compose up -d
```

---

## 29. Verificación inicial

Configura AWS CLI en la terminal actual.

### 29.1. Credenciales

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 29.2. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 29.3. Condición para continuar

Espera a recibir una respuesta válida.

Terraform se ejecuta en el host; desde otro contenedor debes revisar el endpoint.

---

## 30. Requisitos y conexión del proveedor

Crea los archivos del proyecto.

### 30.1. `versions.tf`

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

### 30.2. `providers.tf`

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

## 31. Variables del laboratorio

Crea `variables.tf`.

### 31.1. Entradas

```hcl
variable "project" {
  type    = string
  default = "Curso_Locales"

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{2,19}$",
      replace(lower(trimspace(var.project)), "_", "-")
    ))
    error_message = "El proyecto normalizado debe tener entre 3 y 20 caracteres válidos."
  }
}

variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}
```

La validación acepta únicamente la normalización prevista.

---

## 32. Colección de almacenamientos

Añade a `variables.tf`.

### 32.1. Variable estructurada

```hcl
variable "storages" {
  type = map(object({
    enabled = optional(bool, true)
    tags    = optional(map(string), {})
  }))

  default = {
    docs    = {}
    reports = {}
  }

  validation {
    condition = alltrue([
      for key in keys(var.storages) :
      can(regex("^[a-z][a-z0-9]{2,11}$", key))
    ])
    error_message = "Las claves deben tener entre 3 y 12 caracteres válidos."
  }
}
```

### 32.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
extra_tags = {
  Group = "grupo-a"
}
```

---

## 33. Nombres, filtros y etiquetas

Crea `locals.tf`.

### 33.1. Valores derivados

```hcl
locals {
  project_name = replace(lower(trimspace(var.project)), "_", "-")
  prefix       = format("%s-dev-%s", local.project_name, var.suffix)

  active_storages = {
    for key, config in var.storages :
    key => config
    if config.enabled
  }

  bucket_names = {
    for key in keys(local.active_storages) :
    key => format("%s-%s", local.prefix, key)
  }

  storage_tags = {
    for key, config in local.active_storages :
    key => merge(var.extra_tags, config.tags, {
      Project    = local.project_name
      Purpose    = key
      ManagedBy  = "Terraform"
      Laboratory = "LocalStack"
    })
  }
}
```

Las etiquetas obligatorias prevalecen porque aparecen al final.

---

## 34. Archivos de plantilla

Crea dos archivos antes de ejecutar Terraform.

### 34.1. `templates/intro.txt`

```text
Este documento pertenece al laboratorio de valores locales y funciones.
La plataforma de referencia es AWS.
Los recursos se ejecutan en LocalStack.
```

### 34.2. `templates/readme.tftpl`

```text
${intro}
Proyecto: ${project}
Almacenamiento: ${storage}
Bucket: ${bucket_name}

Almacenamientos activos:
%{ for name in storage_names ~}
- ${name}
%{ endfor ~}
```

### 34.3. Escape

Para escribir una interpolación literal dentro de una plantilla, utiliza `$${...}`.

Las directivas de plantilla utilizan `%{...}`.

---

## 35. Generación de documentos locales

Añade otro bloque a `locals.tf`.

### 35.1. Contenido calculado

```hcl
locals {
  intro         = trimspace(file("${path.module}/templates/intro.txt"))
  storage_names = sort(keys(local.active_storages))

  readme_contents = {
    for key in local.storage_names :
    key => templatefile("${path.module}/templates/readme.tftpl", {
      intro         = local.intro
      project       = local.project_name
      storage       = key
      bucket_name   = local.bucket_names[key]
      storage_names = local.storage_names
    })
  }

  manifest_contents = {
    for key in local.storage_names :
    key => jsonencode({
      project       = local.project_name
      storage       = key
      bucket_name   = local.bucket_names[key]
      tags          = local.storage_tags[key]
      readme_sha256 = sha256(local.readme_contents[key])
    })
  }
}
```

---

## 36. Recursos del laboratorio

Crea `main.tf`.

### 36.1. Buckets y objetos

```hcl
resource "aws_s3_bucket" "storage" {
  for_each = local.active_storages

  bucket        = local.bucket_names[each.key]
  force_destroy = true
  tags          = local.storage_tags[each.key]
}

resource "aws_s3_object" "readme" {
  for_each = local.active_storages

  bucket       = aws_s3_bucket.storage[each.key].id
  key          = "README.txt"
  content      = local.readme_contents[each.key]
  content_type = "text/plain"
}

resource "aws_s3_object" "manifest" {
  for_each = local.active_storages

  bucket       = aws_s3_bucket.storage[each.key].id
  key          = "_lab/manifest.json"
  content      = local.manifest_contents[each.key]
  content_type = "application/json"
}
```

`force_destroy` se utiliza únicamente para limpiar datos ficticios.

---

## 37. Outputs y protección de archivos

Crea `outputs.tf`.

### 37.1. Resultados

```hcl
output "bucket_names" {
  value = {
    for key, bucket in aws_s3_bucket.storage :
    key => bucket.bucket
  }
}

output "local_summary" {
  value = {
    project = local.project_name
    count   = length(local.active_storages)
    names   = local.storage_names
  }
}
```

### 37.2. `.gitignore`

```gitignore
.terraform/
*.tfstate*
*.tfplan
.env
descargas/
```

Versiona `.terraform.lock.hcl` en el proyecto raíz.

---

## 38. Sesión práctica: consola del proyecto

Duración orientativa: 20 minutos.

### 38.1. Preparación

```bash
terraform init
terraform console
```

### 38.2. Consultas

```hcl
local.project_name
local.prefix
local.bucket_names
local.storage_tags["docs"]
local.readme_contents["docs"]
jsondecode(local.manifest_contents["docs"])
```

### 38.3. Entregable

Registra qué función participa en cada resultado.

Distingue los datos originales de los valores calculados.

Escribe `exit` al finalizar.

---

## 39. Sesión práctica: primer despliegue

Duración orientativa: 25 minutos.

### 39.1. Comprobaciones

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=lab.tfplan
```

### 39.2. Recursos esperados

Con las entradas originales se crean seis recursos.

Dos buckets, dos documentos y dos manifiestos.

### 39.3. Aplicación

```bash
terraform apply lab.tfplan
terraform output
```

Revisa el plan antes de aplicar.

Un plan guardado no solicita otra aprobación interactiva.

---

## 40. Sesión práctica: verificar contenido y etiquetas

Utiliza outputs y AWS CLI.

### 40.1. Obtener nombre

```bash
BUCKET="$(terraform output -json bucket_names | jq -er '.docs')"
mkdir -p descargas
```

### 40.2. Descargar documentos

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/README.txt" descargas/README.txt

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/_lab/manifest.json" descargas/manifest.json
```

### 40.3. Consultar

```bash
cat descargas/README.txt
jq '.' descargas/manifest.json
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-bucket-tagging --bucket "$BUCKET"
```

---

## 41. Sesión práctica: verificar el hash

El manifiesto incluye un hash del documento generado.

### 41.1. Linux

```bash
ACTUAL="$(sha256sum descargas/README.txt | awk '{print $1}')"
EXPECTED="$(jq -er '.readme_sha256' descargas/manifest.json)"
test "$ACTUAL" = "$EXPECTED"
```

### 41.2. macOS

Puedes obtener el hash con:

```bash
shasum -a 256 descargas/README.txt
```

### 41.3. Interpretación

La coincidencia comprueba que los bytes descargados corresponden al contenido identificado.

### 41.4. Límite

Un hash sin autenticación no demuestra quién creó el archivo.

No representa una firma digital.

---

## 42. Sesión práctica: cambios controlados

Modifica una entrada cada vez.

### 42.1. Nueva etiqueta

Añade `Department = "formacion"` a `extra_tags`.

Genera un plan.

Observa las etiquetas y los manifiestos.

### 42.2. Proyecto equivalente

Cambia `project` a `"  CURSO_LOCALES  "`.

La normalización debería conservar el mismo nombre calculado.

### 42.3. Deshabilitar almacenamiento

Asigna `enabled = false` a `reports`.

Terraform planificará la eliminación de sus recursos si ya existen.

### 42.4. Advertencia

Deshabilitar significa dejar de declarar, no pausar.

No apliques sin revisar y restaura las entradas al terminar.

---

## 43. Diagnóstico y límites

Los errores deben clasificarse antes de corregirse.

### 43.1. Local inexistente

Una referencia a `local.bucket_name` falla si solo declaraste `bucket_names`.

`try` no corrige un identificador inexistente.

### 43.2. Archivo ausente

`file` y `templatefile` fallan si el archivo no existe.

Revisa rutas y nombres exactos.

### 43.3. Sensibilidad

Un local puede heredar sensibilidad de una variable.

No elimina secretos del estado ni de documentos publicados.

### 43.4. AWS real

Las funciones son transferibles, pero debes revisar permisos, endpoints, costes y reglas del servicio.

LocalStack no valida toda una arquitectura de producción.

---

## 44. Limpieza, ejercicios y resumen

Finaliza destruyendo recursos antes de apagar LocalStack.

### 44.1. Limpieza

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
docker compose down
rm -f lab.tfplan destroy.tfplan
```

### 44.2. Ejercicios

1. Añade un tercer almacenamiento.
2. Publica una lista ordenada de nombres.
3. Añade una etiqueta obligatoria.
4. Modifica la plantilla y verifica el nuevo hash.
5. Explica por qué `merge` no fusiona estructuras profundamente.
6. Describe cuándo conviene validar en lugar de normalizar.

### 44.3. Idea final

Los locales organizan cálculos; las funciones transforman valores.

Una configuración mantenible utiliza ambos para expresar decisiones claras, producir resultados estables y facilitar la revisión antes de aplicar.