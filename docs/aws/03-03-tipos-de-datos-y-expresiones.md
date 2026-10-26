# Tipos de datos y expresiones en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform es un lenguaje fuertemente tipado.
Cada valor tiene un tipo que determina qué operaciones son válidas.
Entender los tipos y cómo se combinan en expresiones es esencial para escribir configuraciones correctas y aprovechar la validación estática.

Esta lección recorre los tipos primitivos, complejos, la conversión entre tipos, y las expresiones más útiles.
Usaremos `terraform console` para experimentar y S3 en LocalStack para verificar.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Identificar y usar los tipos primitivos: `string`, `number`, `bool`.
- Construir y manipular tipos complejos: `list`, `set`, `map`, `object`, `tuple`.
- Entender la inferencia de tipos y la conversión implícita/explícita.
- Escribir expresiones condicionales, `for`, y llamadas a funciones.
- Depurar errores de tipo con `terraform console`.

### 1.2. Objetivos prácticos

También podrás:

- Definir variables con tipos precisos y validaciones.
- Usar `locals` para transformar datos entre tipos.
- Escribir outputs que expongan estructuras tipadas.
- Verificar que los tipos coinciden con lo que espera el provider.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: HCL básico (lección 03-01), bloques principales (lección 03-02).

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (tipos/expresiones)    terraform console (experimentación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3)
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

---

## 4. Tipos primitivos

### 4.1. `string` - Cadenas de texto

```hcl
"texto simple"
"interpolación ${var.nombre}"
<<-EOF
  multilínea
  sin interpolación automática
EOF
```

Operaciones: `length()`, `substr()`, `lower()`, `upper()`, `replace()`, `split()`, `join()`, `trim()`, `regex()`, `regexall()`.

### 4.2. `number` - Números (enteros y decimales)

```hcl
42
3.14159
-10
6.022e23
```

Operaciones: `+`, `-`, `*`, `/`, `%`, `pow()`, `log()`, `sqrt()`, `abs()`, `min()`, `max()`, `floor()`, `ceil()`.

> **Nota**: Terraform no distingue `int` vs `float`. Todo es `number`.

### 4.3. `bool` - Booleanos

```hcl
true
false
```

Operaciones: `&&`, `||`, `\!`, `==`, `\!=`.

---

## 5. Tipos complejos (colecciones y estructurados)

### 5.1. `list(T)` - Lista ordenada, permite duplicados

```hcl
["a", "b", "c"]           # list(string)
[1, 2, 3]                 # list(number)
[true, false, true]       # list(bool)
```

- Índice base 0: `lista[0]`
- Longitud: `length(lista)`
- Concatenación: `concat(lista1, lista2)`

### 5.2. `set(T)` - Conjunto sin orden, sin duplicados

```hcl
toset(["a", "b", "a"])    # set(string) con valores ["a", "b"]
```

- No se accede por índice.
- Operaciones: `contains()`, `setunion()`, `setintersection()`, `setdifference()`, `setsymmetricdifference()`.

### 5.3. `map(T)` - Mapa clave-valor, valores del mismo tipo

```hcl
{ "clave1" = "valor1", "clave2" = "valor2" }  # map(string)
{ "a" = 1, "b" = 2 }                          # map(number)
```

- Acceso: `mapa["clave"]` o `mapa.clave` (si clave es identificador válido).
- Claves siempre `string`.
- Funciones: `keys()`, `values()`, `lookup()`, `merge()`.

### 5.4. `object({ ... })` - Estructura con campos de tipos distintos

```hcl
{
  nombre   = "bucket"
  versionado = true
  replicas = 3
  tags     = { "env" = "dev" }
}
# Tipo: object({ nombre=string, versionado=bool, replicas=number, tags=map(string) })
```

- Acceso: `objeto.campo`
- Campos obligatorios por defecto.
- Opcionales: `optional(atributo, valor_default)` en definición de variable.

### 5.5. `tuple([ ... ])` - Tupla: secuencia de tipos fijos

```hcl
["texto", 42, true]  # tuple([string, number, bool])
```

- Longitud y tipos fijos por posición.
- Acceso por índice: `tupla[0]`

---

## 6. Inferencia y conversión de tipos

### 6.1. Inferencia automática

Terraform infiere el tipo de:
- Literales: `"hola"` → `string`, `42` → `number`
- Variables sin `type`: inferido del `default`
- Expresiones: resultado de funciones/operadores

### 6.2. Conversión implícita (coerción)

Terraform convierte automáticamente en ciertos contextos:

```hcl
# number → string (en interpolación)
"El puerto es ${var.puerto}"  # var.puerto: number → string

# bool → number (en aritmética)
true + 1   # 2 (true → 1)
false + 1  # 1 (false → 0)

# list → set (en funciones de conjunto)
setunion(["a", "b"], ["b", "c"])  # listas convertidas a set
```

### 6.3. Conversión explícita (casting)

```hcl
tostring(42)           # "42"
tonumber("3.14")       # 3.14
tobool(1)              # true
tobool(0)              # false
tolist({a=1,b=2})      # [{a=1,b=2}] (map → list de objects)
tomap([{k="a",v=1}])   # {a=1} (list de objects → map)
toset(["a","b","a"])   # ["a","b"] (list → set)
```

---

## 7. Expresiones avanzadas

### 7.1. Condicional ternario

```hcl
condicion ? valor_verdadero : valor_falso

# Ejemplos
var.env == "prod" ? "alta" : "baja"
length(var.lista) > 0 ? var.lista[0] : "vacío"
```

### 7.2. Expresiones `for` (transformación)

```hcl
# list → list
[for x in var.numeros : x * 2]

# list → map
{for x in var.numeros : x => x * 2}

# map → list
[for k, v in var.mapa : "${k}=${v}"]

# map → map (transformar valores)
{for k, v in var.mapa : k => upper(v)}

# Con filtrado (if)
[for x in var.numeros : x * 2 if x > 5]

# Agrupación (group by)
{ for k, v in var.mapa : v => k ... }  # requiere valores únicos
```

### 7.3. Expresiones `for` anidadas (flatten)

```hcl
variable "matriz" { default = [[1,2],[3,4]] }

locals {
  aplanada = flatten([for fila in var.matriz : fila])
  # resultado: [1,2,3,4]
}
```

### 7.4. Operador `...` (expansión)

```hcl
# En llamadas a funciones que aceptan varargs
concat(lista1, lista2, lista3)  # concat(list1, list2, list3)

# Equivalente a:
concat(lista1, lista2, lista3...)
```

---

## 8. Funciones útiles por categoría

### 8.1. Cadenas

| Función | Ejemplo | Resultado |
|---------|---------|-----------|
| `lower/upper` | `lower("HOLA")` | `"hola"` |
| `trim` | `trim("  hola  ")` | `"hola"` |
| `replace` | `replace("a-b", "-", "_")` | `"a_b"` |
| `split` | `split(",", "a,b,c")` | `["a","b","c"]` |
| `join` | `join("-", ["a","b"])` | `"a-b"` |
| `substr` | `substr("hola", 1, 3)` | `"ola"` |
| `regex` | `regex("^b.*", "bucket")` | `true` |
| `format` | `format("bucket-%03d", 1)` | `"bucket-001"` |

### 8.2. Colecciones

| Función | Ejemplo | Resultado |
|---------|---------|-----------|
| `length` | `length([1,2,3])` | `3` |
| `contains` | `contains([1,2], 2)` | `true` |
| `reverse` | `reverse([1,2,3])` | `[3,2,1]` |
| `sort` | `sort(["c","a","b"])` | `["a","b","c"]` |
| `distinct` | `distinct([1,2,2,3])` | `[1,2,3]` |
| `chunklist` | `chunklist([1,2,3,4], 2)` | `[[1,2],[3,4]]` |
| `flatten` | `flatten([[1],[2,3]])` | `[1,2,3]` |

### 8.3. Mapas/Objetos

| Función | Ejemplo | Resultado |
|---------|---------|-----------|
| `keys` | `keys({a=1,b=2})` | `["a","b"]` |
| `values` | `values({a=1,b=2})` | `[1,2]` |
| `lookup` | `lookup({a=1}, "a", 0)` | `1` |
| `merge` | `merge({a=1}, {b=2})` | `{a=1,b=2}` |
| `zipmap` | `zipmap(["a","b"], [1,2])` | `{a=1,b=2}` |

### 8.4. Codificación

| Función | Ejemplo | Resultado |
|---------|---------|-----------|
| `jsonencode` | `jsonencode({a=1})` | `"{\"a\":1}"` |
| `jsondecode` | `jsondecode("{\"a\":1}")` | `{a=1}` |
| `base64encode` | `base64encode("hola")` | `"aG9sYQ=="` |
| `base64decode` | `base64decode("aG9sYQ==")` | `"hola"` |
| `file` | `file("archivo.txt")` | contenido |
| `templatefile` | `templatefile("tpl.tftpl", {x=1})` | renderizado |

### 8.5. Sistema/Hash

| Función | Ejemplo | Resultado |
|---------|---------|-----------|
| `filebase64` | `filebase64("img.png")` | base64 |
| `filesha256` | `filesha256("archivo.txt")` | hash |
| `uuid` | `uuid()` | UUID v4 aleatorio |
| `timestamp` | `timestamp()` | RFC3339 timestamp |

---

## 9. Validación de tipos en variables

### 9.1. Tipo simple

```hcl
variable "puerto" {
  type        = number
  validation {
    condition     = var.puerto > 0 && var.puerto <= 65535
    error_message = "Puerto debe estar entre 1 y 65535."
  }
}
```

### 9.2. Tipo complejo

```hcl
variable "buckets_config" {
  type = map(object({
    versionado = bool
    replicas   = number
    tags       = map(string)
  }))
  default = {}
}
```

### 9.3. `optional()` en object (Terraform 1.7+)

```hcl
variable "config" {
  type = object({
    nombre     = string
    versionado = optional(bool, false)
    replicas   = optional(number, 1)
  })
}
```

---

## 10. Práctica guiada: Experimentando con tipos y expresiones

### Paso 1: Preparar

```bash
mkdir -p tipos-expresiones/evidencias
cd tipos-expresiones
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración base

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "entorno" {
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.entorno)
    error_message = "Entorno debe ser dev, staging o prod."
  }
}

variable "puertos" {
  type = list(number)
  default = [80, 443, 8080]
}

variable "tags_base" {
  type = map(string)
  default = { Proyecto = "tipos-demo" }
}

# locals.tf
locals {
  es_prod = var.entorno == "prod"
  
  puertos_https = [for p in var.puertos : p == 80 ? 443 : p]
  
  tags_completas = merge(var.tags_base, {
    Entorno = var.entorno
    Gestionado = "Terraform"
  })
  
  config_bucket = {
    nombre     = "tf-${var.entorno}-datos"
    versionado = local.es_prod
    replicas   = local.es_prod ? 3 : 1
    tags       = local.tags_completas
  }
}

# main.tf
resource "aws_s3_bucket" "demo" {
  bucket = local.config_bucket.nombre
  versioning {
    enabled = local.config_bucket.versionado
  }
  tags = local.config_bucket.tags
}

# outputs.tf
output "config_bucket" { value = local.config_bucket }
output "puertos_https" { value = local.puertos_https }
output "es_prod"       { value = local.es_prod }
```

### Paso 3: Experimentar en consola

```bash
terraform init
terraform console

# Prueba tipos y expresiones:
> typeof(var.puertos)
> typeof(local.config_bucket)
> local.es_prod
> local.puertos_https
> [for p in var.puertos : p * 2]
> {for p in var.puertos : p => p == 80 ? "http" : "https"}
> merge(var.tags_base, {Nueva = "tag"})
> local.config_bucket.versionado ? "sí" : "no"
```

### Paso 4: Desplegar y verificar

```bash
terraform fmt
terraform validate
terraform plan -out=tipos.tfplan
terraform apply tipos.tfplan

# Verificar
aws_local s3api head-bucket --bucket tf-dev-datos
aws_local s3api get-bucket-versioning --bucket tf-dev-datos
aws_local s3api get-bucket-tagging --bucket tf-dev-datos
```

### Paso 5: Cambiar entorno y reaplicar

```bash
# En variables.tf o -var:
# entorno = "prod"

terraform plan -out=prod.tfplan
# Observar: versionado = true, replicas = 3, nombre = tf-prod-datos
terraform apply prod.tfplan

# Verificar cambios
aws_local s3api get-bucket-versioning --bucket tf-prod-datos
```

### Paso 6: Limpiar

```bash
terraform destroy
aws_local s3api list-buckets
docker compose down
```

---

## 11. Sesiones guiadas para el alumnado

### 11.1. Sesión 1: Tipos y consola (30 min)

1. Definir variables con tipos primitivos y complejos
2. `terraform console` → `typeof()`, conversiones, funciones
3. `locals` con expresiones `for` y condicionales
4. **Entrega**: Capturas de consola mostrando tipos y transformaciones

### 11.2. Sesión 2: Expresiones avanzadas (30 min)

1. Escribir `for` con filtrado, transformación map→list, list→map
2. Usar `flatten`, `chunklist`, `zipmap`
3. Condicionales ternarios anidados
4. `plan` → `apply` → verificar con `aws_local`
5. **Entrega**: Configuración con expresiones complejas + verificación

### 11.3. Sesión 3: Validación y depuración (20 min)

1. Introducir error de tipo (pasar string a number) → ver error
2. Usar `validation` en variable
3. `optional()` en object
4. Limpiar
5. **Entrega**: Error de tipo capturado + corrección + validación funcionando

---

## 12. Ejercicios de refuerzo

### 12.1. Ejercicio de identificación

Para cada valor, indica su tipo Terraform:

1. `"hola"`
2. `42`
3. `true`
4. `["a", "b"]`
5. `toset(["a", "b"])`
6. `{x = 1, y = 2}`
7. `{nombre = "x", edad = 25}`
8. `["x", 1, true]`

### 12.2. Ejercicio de interpretación

¿Cuál es el resultado de cada expresión? Verifica en `terraform console`.

```hcl
[for x in [1,2,3,4,5] : x * 2 if x % 2 == 0]
{for k, v in {a=1,b=2,c=3} : v => k}
flatten([[1,2],[3,4,5]])
merge({a=1}, {b=2}, {c=3})
lookup({a=1,b=2}, "c", 99)
```

### 12.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica la diferencia entre list, set, map, object y tuple.
Para cada uno: sintaxis, acceso a elementos, funciones principales, cuándo usarlo.
Da un ejemplo real de configuración Terraform (S3, SG, IAM, etc.) para cada tipo.
No inventes sintaxis. Usa la documentación oficial.
```

---

## 13. Limitaciones de LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Sistema de tipos | ✅ Idéntico | ✅ |
| Funciones | ✅ Idénticas | ✅ |
| Validación provider | ⚠️ Parcial | ✅ Completa |
| `terraform console` | ✅ | ✅ |

---

## 14. Diagnóstico de errores de tipo

| Error | Causa | Solución |
|-------|-------|----------|
| `Invalid type` | Valor no coincide con tipo declarado | Corregir valor o cambiar tipo |
| `Element type mismatch` | Elementos de lista/map con tipos distintos | Homogeneizar o usar `any`/`object` |
| `Missing required attribute` | Object sin campo obligatorio | Añadir campo o usar `optional()` |
| `Cannot convert` | Conversión implícita imposible | Usar conversión explícita (`tostring`, etc.) |
| `Iteration over non-iterable` | `for` sobre valor no iterable | Verificar que es list/set/map |

---

## 15. Evaluación y cierre

### 15.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Tipos primitivos | No usados | Básicos | Con validaciones y conversiones |
| Tipos complejos | Solo list | list + map | list, set, map, object, tuple |
| Expresiones `for` | No usadas | Simples | Con filtrado, anidadas, group by |
| Funciones | No usadas | 1-2 categorías | Múltiples categorías + console |
| Validación | Sin validación | Básica | Completa + optional() |

### 15.2. Checklist final

- [ ] Variables con tipos declarados y validaciones
- [ ] Locals transformando datos entre tipos
- [ ] Expresiones `for` con filtrado y transformación
- [ ] Condicionales ternarios
- [ ] Funciones de al menos 3 categorías usadas
- [ ] `terraform console` usado para experimentar
- [ ] Recursos creados y verificados con `aws_local`
- [ ] Limpieza completa

### 15.3. Idea principal

> **Los tipos no son burocracia: son documentación ejecutable.**
> Tipos precisos + validaciones = errores detectados en `plan`, no en `apply`.
> **`terraform console` es tu REPL: úsalo antes de escribir en archivos.**
> **`optional()` en object = flexibilidad sin sacrificar tipado.**
