# Sintaxis del lenguaje HCL en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

HCL (HashiCorp Configuration Language) es el lenguaje que utilizamos para escribir configuraciones de Terraform.
En esta lección aprenderás a leerlo, escribirlo y comprobarlo mediante prácticas progresivas.
Los ejemplos utilizan el proveedor AWS y ejecutan los despliegues en LocalStack.
La infraestructura de práctica se limita a buckets y objetos S3.
Esto permite concentrarse en el lenguaje sin introducir redes, máquinas virtuales o funciones Lambda.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

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

### 1.2. Objetivos prácticos

También podrás:

- Escribir configuraciones HCL válidas.
- Usar `terraform console` para experimentar.
- Depurar errores de sintaxis.
- Aplicar buenas prácticas de formato.

---

## 2. Requisitos previos

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

- Un editor con soporte para HCL (VS Code con extensión Terraform recomendado).
- Una terminal.
- Una carpeta nueva.
- Un documento para registrar resultados.

### 2.4. Advertencia

No mezcles este laboratorio con un proyecto de producción.
El estado local puede contener información sensible en otros escenarios.
En esta práctica solo utilizaremos datos ficticios.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (HCL)      │  │  (verificación)  │                    │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│              http://127.0.0.1:4566                          │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  Buckets y objetos S3 para practicar HCL       │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 3.3. `aws_local`

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://127.0.0.1:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 3.3. Configuración base Terraform

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# providers.tf
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true
  endpoints { s3 = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}
```

---

## 4. Qué es HCL

HCL significa **HashiCorp Configuration Language**.

### 4.1. HCL y Terraform

HCL ofrece una sintaxis para expresar configuraciones.
Terraform interpreta esa sintaxis con sus propias reglas.
Por ejemplo, Terraform define el significado de:

- `resource`
- `variable`
- `locals`
- `output`
- `terraform`
- `provider`

### 4.2. Dos sintaxis: nativa y JSON

HCL tiene una sintaxis nativa (`.tf`) y una equivalente en JSON (`.tf.json`).
La nativa es más legible para humanos.
La JSON es más fácil de generar programáticamente.
En este curso usamos la sintaxis nativa.

### 4.3. Codificación y finales de línea

Los archivos HCL usan codificación UTF-8.
Los finales de línea pueden ser LF (Unix) o CRLF (Windows).
Terraform acepta ambos.
Se recomienda LF y un salto de línea final en el archivo.

---

## 5. Estructura básica: bloques y argumentos

### 5.1. Bloques

Un bloque es un contenedor con un tipo, cero o más etiquetas y un cuerpo entre llaves.

```hcl
tipo_bloque "etiqueta1" "etiqueta2" {
  # cuerpo: argumentos y bloques anidados
  argumento = valor
}
```

Ejemplos de bloques de primer nivel:

```hcl
terraform { ... }
provider "aws" { ... }
resource "aws_s3_bucket" "ejemplo" { ... }
variable "nombre" { ... }
output "resultado" { ... }
locals { ... }
data "aws_s3_bucket" "existente" { ... }
module "hijo" { ... }
```

### 5.2. Argumentos

Un argumento asigna un valor a un nombre dentro de un bloque.

```hcl
argumento = expresion
```

La expresión puede ser un literal, una referencia, una llamada a función, etc.

### 5.3. Identificadores

Nombres de bloques, argumentos, variables, locales, outputs, módulos:
- Empiezan por letra o `_`.
- Continúan con letras, dígitos, `_`, `-`.
- Sensibles a mayúsculas/minúsculas.
- Convención: `snake_case` para todo.

---

## 6. Tipos de datos literales

### 6.1. Cadenas (string)

```hcl
# Comillas dobles (interpolación permitida)
"hola mundo"
"bucket-${var.nombre}"

# Heredoc (multilínea, sin interpolación automática)
<<-EOF
  línea 1
  línea 2
EOF
```

### 6.2. Números (number)

```hcl
42
3.14
-10
```

### 6.3. Booleanos (bool)

```hcl
true
false
```

### 6.4. Valores nulos

```hcl
null
```

---

## 7. Tipos de datos complejos

### 7.1. Listas (list) - ordenadas, permiten duplicados

```hcl
["a", "b", "c"]
[1, 2, 3]
[true, false]
```

Acceso por índice (base 0): `lista[0]`

### 7.2. Conjuntos (set) - sin orden, sin duplicados

```hcl
toset(["a", "b", "a"])  # resultado: ["a", "b"] (orden no garantizado)
```

### 7.3. Mapas (map) / Objetos (object) - clave-valor

```hcl
# Mapa: valores del mismo tipo
{ "clave1" = "valor1", "clave2" = "valor2" }

# Objeto: valores de tipos distintos
{ nombre = "bucket", versionado = true, replicas = 3 }
```

Acceso: `mapa["clave"]` o `objeto.atributo`

### 7.4. Tuplas (tuple) - secuencia de tipos fijos

```hcl
["texto", 42, true]  # tuple(string, number, bool)
```

---

## 8. Expresiones y operadores

### 8.1. Aritméticos

```hcl
1 + 2    # 3
10 - 3   # 7
4 * 5    # 20
20 / 3   # 6 (división entera)
20 % 3   # 2 (módulo)
```

### 8.2. Comparación

```hcl
1 == 1   # true
1 \!= 2   # true
1 < 2    # true
1 <= 1   # true
```

### 8.3. Lógicos

```hcl
true && false  # false
true || false  # true
\!true          # false
```

### 8.4. Condicional (ternario)

```hcl
condicion ? valor_si_verdadero : valor_si_falso

# Ejemplo
var.entorno == "prod" ? "alta" : "baja"
```

---

## 9. Referencias e interpolación

### 9.1. Referencias a atributos

```hcl
resource "aws_s3_bucket" "ejemplo" {
  bucket = "mi-bucket"
}

# En otro recurso o output:
output "arn" {
  value = aws_s3_bucket.ejemplo.arn
}
```

### 9.2. Interpolación en cadenas

```hcl
"El bucket es ${aws_s3_bucket.ejemplo.bucket}"
"La región es ${var.region}"
```

### 9.3. Directivas en heredoc

```hcl
<<-EOF
  Bucket: ${aws_s3_bucket.ejemplo.bucket}
  ARN: ${aws_s3_bucket.ejemplo.arn}
EOF
```

---

## 10. Variables de entrada

### 10.1. Declaración básica

```hcl
variable "region" {
  type        = string
  default     = "us-east-1"
  description = "Región AWS para los recursos"
}
```

### 10.2. Tipos y validaciones

```hcl
variable "bucket_name" {
  type        = string
  description = "Nombre del bucket (3-63 chars, minúsculas, números, guiones)"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Formato inválido para nombre de bucket S3."
  }
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Etiquetas adicionales"
}
```

### 10.3. Sensibles

```hcl
variable "secret_key" {
  type      = string
  sensitive = true
}
```

> **Nota**: `sensitive = true` oculta el valor en la salida de `plan` y `apply`, **pero se guarda en el estado**.

---

## 11. Valores locales (locals)

### 11.1. Declaración

```hcl
locals {
  project_name = "mi-proyecto"
  environment  = var.environment
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
  bucket_name = "${local.project_name}-${local.environment}-data"
}
```

### 11.2. Uso

```hcl
resource "aws_s3_bucket" "main" {
  bucket = local.bucket_name
  tags   = local.common_tags
}
```

---

## 12. Funciones integradas

Terraform incluye muchas funciones. Algunas útiles:

### 12.1. Cadenas

```hcl
lower("HOLA")        # "hola"
upper("hola")        # "HOLA"
trim("  hola  ")     # "hola"
replace("a-b-c", "-", "_")  # "a_b_c"
split(",", "a,b,c")  # ["a", "b", "c"]
join("-", ["a","b"]) # "a-b"
substr("hola", 1, 3) # "ola"
strlen("hola")       # 4
```

### 12.2. Colecciones

```hcl
length([1,2,3])           # 3
contains(["a","b"], "a")  # true
reverse([1,2,3])          # [3,2,1]
sort(["c","a","b"])       # ["a","b","c"]
distinct([1,2,2,3])       # [1,2,3]
```

### 12.3. Mapas/Objetos

```hcl
keys({a=1,b=2})           # ["a","b"]
values({a=1,b=2})         # [1,2]
lookup({a=1}, "a", 0)     # 1
merge({a=1}, {b=2})       # {a=1,b=2}
```

### 12.4. Sistema de archivos

```hcl
file("archivo.txt")           # contenido como string
fileexists("archivo.txt")     # true/false
templatefile("plantilla.tftpl", {var = "valor"})
```

### 12.5. Codificación

```hcl
base64encode("hola")          # "aG9sYQ=="
base64decode("aG9sYQ==")      # "hola"
jsonencode({a=1})             # "{\"a\":1}"
jsondecode("{\"a\":1}")       # {a=1}
```

### 12.6. Consola interactiva

```bash
terraform console
# Permite evaluar expresiones interactivamente
> lower("HOLA")
"hola"
> local.common_tags
{...}
```

---

## 13. Expresiones `for` (transformación de colecciones)

### 13.1. Sintaxis básica

```hcl
# Para lista -> lista
[for item in lista : item * 2]

# Para lista -> mapa
{for item in lista : item => item * 2}

# Con filtrado
[for item in lista : item * 2 if item > 2]
```

### 13.2. Ejemplos prácticos

```hcl
variable "numeros" { default = [1,2,3,4,5] }

locals {
  duplicados = [for n in var.numeros : n * 2]
  pares      = [for n in var.numeros : n if n % 2 == 0]
  mapa_cuadrados = {for n in var.numeros : n => n * n}
}
```

---

## 14. Expresiones condicionales avanzadas

### 14.1. Condicional en atributos

```hcl
resource "aws_s3_bucket" "ejemplo" {
  bucket = var.bucket_name
  versioning {
    enabled = var.enable_versioning  # bool
  }
}
```

### 14.2. Recursos condicionales con `count`

```hcl
resource "aws_s3_bucket" "opcional" {
  count  = var.crear_bucket_adicional ? 1 : 0
  bucket = "${var.bucket_name}-extra"
}
```

### 14.3. `for_each` con condicional

```hcl
variable "buckets" {
  type = map(object({ versionado = bool }))
  default = {}
}

resource "aws_s3_bucket" "multiples" {
  for_each = var.buckets
  bucket   = each.key
  versioning {
    enabled = each.value.versionado
  }
}
```

---

## 15. Práctica guiada: Experimentando con HCL

### Paso 1: Preparar entorno

```bash
mkdir -p hcl-practice/evidencias
cd hcl-practice
docker compose up -d
source .env.localstack
```

### Paso 2: Crear configuración base

```hcl
# versions.tf, providers.tf (sección 3.3)

# variables.tf
variable "project" { type = string, default = "hcl-demo" }
variable "env"     { type = string, default = "dev" }
variable "buckets" {
  type = map(object({ versionado = bool }))
  default = {
    "datos"     = { versionado = true }
    "logs"      = { versionado = false }
    "temporal"  = { versionado = false }
  }
}

# locals.tf
locals {
  prefix = "${var.project}-${var.env}"
  tags = { Project = var.project, Env = var.env }
}

# main.tf
resource "aws_s3_bucket" "buckets" {
  for_each = var.buckets
  bucket   = "${local.prefix}-${each.key}"
  versioning {
    enabled = each.value.versionado
  }
  tags = local.tags
}

# outputs.tf
output "bucket_names" {
  value = { for k, v in aws_s3_bucket.buckets : k => v.bucket }
}
```

### Paso 3: Experimentar en consola

```bash
terraform init
terraform console

# En consola:
> var.buckets
> local.prefix
> [for k, v in var.buckets : "${local.prefix}-${k}"]
> {for k, v in var.buckets : k => v.versionado}
```

### Paso 4: Desplegar y verificar

```bash
terraform fmt
terraform validate
terraform plan -out=hcl.tfplan
terraform apply hcl.tfplan

# Verificar con aws_local
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
aws_local s3api get-bucket-versioning --bucket hcl-demo-dev-datos
```

### Paso 5: Modificar y volver a aplicar

```hcl
# En variables.tf, cambiar:
"temporal" = { versionado = true }  # era false
```

```bash
terraform plan -out=update.tfplan
terraform apply update.tfplan

# Verificar cambio
aws_local s3api get-bucket-versioning --bucket hcl-demo-dev-temporal
```

### Paso 6: Limpiar

```bash
terraform destroy
aws_local s3api list-buckets
docker compose down
```

---

## 16. Sesiones guiadas para el alumnado

### 16.1. Sesión 1: Sintaxis básica y consola (30 min)

1. Crear configuración con variables, locals, outputs
2. `terraform console` → evaluar expresiones (strings, listas, mapas, funciones)
3. `terraform fmt` → `validate`
3. **Entrega**: Capturas de consola + configuración formateada

### 16.2. Sesión 2: Expresiones `for` y condicionales (30 min)

1. Añadir `for_each` para múltiples buckets
2. Usar `for` en locals para transformar datos
3. Añadir recurso condicional con `count`
4. `plan` → `apply` → verificar
5. **Entrega**: Configuración con `for_each` + evidencia de buckets creados

### 16.3. Sesión 3: Depuración y buenas prácticas (20 min)

1. Introducir error de sintaxis intencional → `validate` → corregir
2. `fmt -check` en CI simulado
3. Revisar `.terraform.lock.hcl`
4. Limpiar
5. **Entrega**: Error detectado + corrección + checklist de estilo

---

## 17. Ejercicios de refuerzo

### 17.1. Ejercicio de identificación

Escribe en HCL:
- Una variable `puertos` tipo `list(number)` con validación (1-65535)
- Un local `endpoints` que genere mapa `{"http" = "puerto80", "https" = "puerto443"}`
- Un output que muestre solo los buckets con versionado habilitado

### 17.2. Ejercicio de interpretación

Dada esta expresión:

```hcl
[for k, v in {a=1,b=2,c=3} : upper(k) if v > 1]
```

¿Cuál es el resultado? Verifica en `terraform console`.

### 17.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica la diferencia entre list, set, map, object y tuple en HCL.
Da un ejemplo de cuándo usar cada uno en configuración Terraform.
Incluye: acceso a elementos, restricciones, funciones útiles.
No inventes sintaxis. Usa la documentación oficial como referencia.
```

---

## 18. Limitaciones de LocalStack en HCL

| Característica HCL | LocalStack | AWS Real |
|--------------------|------------|----------|
| Sintaxis completa | ✅ | ✅ |
| Funciones | ✅ | ✅ |
| `for_each` / `count` | ✅ | ✅ |
| `dynamic` blocks | ✅ | ✅ |
| `terraform console` | ✅ | ✅ |
| Validación provider | ⚠️ Parcial | ✅ Completa |

---

## 19. Diagnóstico de errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `Invalid character` | Comilla mal cerrada, carácter especial | Revisar comillas, escapar `$` `{} ` |
| `Unsupported argument` | Argumento no existe en ese bloque | Consultar docs del recurso/provider |
| `Invalid template interpolation` | Sintaxis `${...}` incorrecta | Verificar llaves, referencias válidas |
| `Variable not found` | Referencia a variable no declarada | Declarar variable o corregir nombre |
| `Cycle detected` | Referencia circular entre recursos | Revisar dependencias, usar `depends_on` |

---

## 20. Evaluación y cierre

### 20.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Sintaxis | Errores de sintaxis | Funciona pero sin formatear | `fmt` + `validate` limpios |
| Variables | No usa variables | Variables básicas | Variables + validaciones + sensitive |
| Locals | No usa locals | Locals simples | Locals + funciones + expresiones `for` |
| Expresiones | Solo literales | Interpolación básica | `for`, condicionales, funciones |
| Consola | No usa | Usa básico | Experimenta y depura en consola |

### 20.2. Checklist final

- [ ] Configuración HCL válida (`fmt` + `validate`)
- [ ] Variables con tipo, descripción, validación
- [ ] Locals para valores calculados y tags comunes
- [ ] Expresiones `for` para transformar colecciones
- [ ] Condicionales (`count`, `for_each`, ternario)
- [ ] `terraform console` usado para experimentar
- [ ] Recursos creados y verificados con `aws_local`
- [ ] Limpieza completa

### 20.3. Idea principal

> **HCL es declarativo: describes QUÉ, no CÓMO.**
> Variables, locals, funciones y expresiones `for` reducen repetición.
> **`terraform console` es tu mejor amigo para aprender y depurar.**
> **`fmt` y `validate` son obligatorios antes de cualquier plan.**
