# Valores locales y funciones en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Los valores locales (`locals`) permiten calcular y reutilizar expresiones dentro de un módulo.
Las funciones integradas transforman datos: cadenas, números, colecciones, codificación, sistema de archivos.
Esta lección combina `locals` y funciones para construir configuraciones expresivas y sin repetición.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la diferencia entre `variable`, `locals` y `output`.
- Identificar cuándo usar `locals` vs variables de entrada.
- Conocer las categorías de funciones disponibles.
- Entender que las funciones se evalúan en plan/apply, no en runtime de la aplicación.

### 1.2. Objetivos prácticos

También podrás:

- Declarar `locals` con referencias a variables, otros locals y funciones.
- Usar funciones de strings, colecciones, codificación, filesystem.
- Construir nombres, tags, configuraciones derivadas sin duplicar lógica.
- Experimentar en `terraform console` antes de escribir en archivos.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: HCL (03-01), bloques (03-02), tipos y expresiones (03-03), variables (03-04).

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (locals + funciones)    terraform console (experimentación)
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

## 4. Bloque `locals`

### 4.1. Sintaxis

```hcl
locals {
  nombre = expresion
  mapa   = { clave = valor }
  lista  = [for x in var.lista : x * 2]
}
```

### 4.2. Diferencias clave

| Aspecto | `variable` | `locals` |
|---------|------------|----------|
| Entrada externa | Sí (CLI, tfvars, env) | No |
| Valor calculado | No (solo literales) | Sí (expresiones) |
| Reutilización | En todo el módulo | En todo el módulo |
| Validación | Sí (`validation`) | No |
| Propósito | Parametrizar | Calcular/derivar |

### 4.3. Ejemplo práctico

```hcl
locals {
  # Valores simples
  project_name = "mi-app"
  environment  = var.env
  
  # Derivados de variables
  prefix       = "${local.project_name}-${local.environment}"
  
  # Tags comunes
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
  }
  
  # Configuración condicional
  is_prod = var.env == "prod"
  replicas = local.is_prod ? 3 : 1
  
  # Transformación de colecciones
  bucket_names = {
    data  = "${local.prefix}-data"
    logs  = "${local.prefix}-logs"
    backup = "${local.prefix}-backup"
  }
  
  # Uso de funciones
  timestamp = timestamp()
  unique_suffix = substr(md5(local.prefix), 0, 8)
}
```

---

## 5. Funciones integradas por categoría

### 5.1. Cadenas (strings)

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `lower/upper` | Mayúsculas/minúsculas | `lower("HOLA")` → `"hola"` |
| `trim` | Quita espacios extremos | `trim("  hola  ")` → `"hola"` |
| `trimprefix/trimsuffix` | Quita prefijo/sufijo | `trimprefix("prefijo_valor", "prefijo_")` → `"valor"` |
| `replace` | Reemplaza patrón | `replace("a-b-c", "-", "_")` → `"a_b_c"` |
| `split` | Divide por separador | `split(",", "a,b,c")` → `["a","b","c"]` |
| `join` | Une con separador | `join("-", ["a","b"])` → `"a-b"` |
| `substr` | Subcadena | `substr("hola", 1, 3)` → `"ola"` |
| `strlen` | Longitud | `strlen("hola")` → `4` |
| `regex` | Coincide regex | `regex("^b.*", "bucket")` → `true` |
| `regexall` | Todas coincidencias | `regexall("[0-9]+", "v1.2.3")` → `["1","2","3"]` |
| `format` | Formato printf | `format("bucket-%03d", 1)` → `"bucket-001"` |
| `indent` | Indenta líneas | `indent(2, "a\nb")` → `"  a\n  b"` |

### 5.2. Números

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `min/max` | Mínimo/máximo | `min(3, 7, 2)` → `3` |
| `abs` | Valor absoluto | `abs(-5)` → `5` |
| `floor/ceil` | Redondeo | `floor(3.7)` → `3` |
| `log/pow/sqrt` | Matemáticas | `pow(2, 3)` → `8` |
| `signum` | Signo | `signum(-5)` → `-1` |

### 5.3. Colecciones

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `length` | Longitud | `length([1,2,3])` → `3` |
| `contains` | Contiene elemento | `contains([1,2], 2)` → `true` |
| `reverse` | Invierte | `reverse([1,2,3])` → `[3,2,1]` |
| `sort` | Ordena | `sort(["c","a","b"])` → `["a","b","c"]` |
| `distinct` | Elimina duplicados | `distinct([1,2,2,3])` → `[1,2,3]` |
| `chunklist` | Divide en chunks | `chunklist([1,2,3,4], 2)` → `[[1,2],[3,4]]` |
| `flatten` | Aplana | `flatten([[1],[2,3]])` → `[1,2,3]` |
| `compact` | Quita vacíos | `compact(["a","", "b"])` → `["a","b"]` |
| `zipmap` | Listas → mapa | `zipmap(["a","b"], [1,2])` → `{a=1,b=2}` |
| `keys/values` | Claves/valores mapa | `keys({a=1,b=2})` → `["a","b"]` |
| `lookup` | Valor con default | `lookup({a=1}, "c", 99)` → `99` |
| `merge` | Fusiona mapas | `merge({a=1}, {b=2})` → `{a=1,b=2}` |
| `setunion/intersection/difference` | Operaciones set | `setunion([1,2], [2,3])` → `[1,2,3]` |

### 5.4. Codificación

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `jsonencode` | Valor → JSON string | `jsonencode({a=1})` → `"{\"a\":1}"` |
| `jsondecode` | JSON string → valor | `jsondecode("{\"a\":1}")` → `{a=1}` |
| `base64encode/decode` | Base64 | `base64encode("hola")` → `"aG9sYQ=="` |
| `yamlencode/decode` | YAML | `yamlencode({a=1})` → `"a: 1\n"` |
| `file` | Lee archivo | `file("archivo.txt")` |
| `filebase64` | Archivo → base64 | `filebase64("img.png")` |
| `filesha256` | Hash archivo | `filesha256("archivo.txt")` |
| `templatefile` | Renderiza plantilla | `templatefile("tpl.tftpl", {x=1})` |

### 5.5. Sistema / Hash / Tiempo

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `uuid` | UUID v4 aleatorio | `uuid()` → `"550e8400-e29b-41d4-a716-446655440000"` |
| `timestamp` | RFC3339 now | `timestamp()` → `"2024-01-15T10:30:00Z"` |
| `md5/sha256/sha512` | Hash string | `md5("hola")` → `"5d41402abc4b2a76b9719d911017c592"` |
| `base64sha256` | Hash base64 | `base64sha256("hola")` → `"...base64..."` |
| `filemd5/filesha256` | Hash archivo | `filesha256("archivo.txt")` |

---

## 6. `terraform console` - REPL interactivo

```bash
terraform console
```

Permite evaluar expresiones interactivamente:

```hcl
> local.prefix
"mi-app-dev"

> [for k, v in local.bucket_names : "${k}=${v}"]
["data=mi-app-dev-data", "logs=mi-app-dev-logs", "backup=mi-app-dev-backup"]

> format("bucket-%03d", 42)
"bucket-042"

> jsonencode({buckets = local.bucket_names})
"{\"buckets\":{\"data\":\"mi-app-dev-data\",\"logs\":\"mi-app-dev-logs\",\"backup\":\"mi-app-dev-backup\"}}"

> substr(md5("mi-app-dev"), 0, 8)
"a1b2c3d4"
```

> **Consejo**: Usa `terraform console` ANTES de escribir en archivos. Ahorra ciclos plan/apply.

---

## 7. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p locals-funciones/evidencias
cd locals-funciones
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con locals y funciones

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "project" { type = string, default = "locals-demo" }
variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "Entorno: dev, staging, prod."
  }
}
variable "owner" { type = string, default = "equipo-plataforma" }
variable "extra_buckets" { type = list(string), default = [] }

# locals.tf
locals {
  # Base
  project_name = var.project
  environment  = var.env
  is_prod      = var.env == "prod"
  
  # Derivados
  prefix = "${local.project_name}-${local.environment}"
  
  # Tags
  common_tags = merge({
    Project     = local.project_name
    Environment = local.environment
    Owner       = var.owner
    ManagedBy   = "Terraform"
  }, var.env == "prod" ? { Critical = "true" } : {})
  
  # Configuración condicional
  replicas = local.is_prod ? 3 : 1
  versioning_enabled = local.is_prod
  
  # Buckets base + extra
  base_buckets = {
    data  = "${local.prefix}-data"
    logs  = "${local.prefix}-logs"
  }
  extra_buckets_map = { for i, name in var.extra_buckets : name => "${local.prefix}-${name}" }
  all_buckets = merge(local.base_buckets, local.extra_buckets_map)
  
  # Funciones útiles
  timestamp = timestamp()
  unique_id = substr(md5(local.prefix), 0, 8)
  bucket_count = length(local.all_buckets)
}

# main.tf
resource "aws_s3_bucket" "buckets" {
  for_each = local.all_buckets
  bucket   = each.value
  versioning {
    enabled = local.versioning_enabled
  }
  tags = local.common_tags
}

# outputs.tf
output "all_buckets" { value = local.all_buckets }
output "common_tags" { value = local.common_tags }
output "replicas"    { value = local.replicas }
output "bucket_count" { value = local.bucket_count }
output "unique_id"   { value = local.unique_id }
```

### Paso 3: Experimentar en consola

```bash
terraform init
terraform console

# Probar:
> local.all_buckets
> local.common_tags
> local.replicas
> [for k, v in local.all_buckets : upper(k)]
> merge(local.base_buckets, {extra = "tf-extra"})
> length(local.all_buckets)
> local.unique_id
```

### Paso 4: Desplegar y verificar

```bash
terraform fmt
terraform validate
terraform plan -out=locals.tfplan
terraform apply locals.tfplan

# Verificar
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
aws_local s3api get-bucket-tagging --bucket locals-demo-dev-data
aws_local s3api get-bucket-versioning --bucket locals-demo-dev-data
```

### Paso 5: Cambiar entorno y reaplicar

```bash
# Cambiar env = "prod" (en variables.tf o -var)
terraform plan -var="env=prod" -out=prod.tfplan
# Observar: replicas=3, versioning=true, tag Critical=true, nombres tf-locals-demo-prod-*
terraform apply prod.tfplan

# Verificar cambios
aws_local s3api get-bucket-versioning --bucket locals-demo-prod-data
aws_local s3api get-bucket-tagging --bucket locals-demo-prod-data
```

### Paso 6: Limpiar

```bash
terraform destroy -var="env=prod" -auto-approve
aws_local s3api list-buckets
docker compose down
```

---

## 8. Sesiones guiadas

### 8.1. Sesión 1: Locals y consola (30 min)

1. Declarar `locals` con referencias a variables, funciones, condicionales
2. `terraform console` → evaluar cada local, probar funciones
3. **Entrega**: Capturas consola + `locals.tf` documentado

### 8.2. Sesión 2: Funciones por categorías (30 min)

1. Usar funciones: strings (`format`, `replace`), colecciones (`merge`, `zipmap`, `for`), codificación (`jsonencode`, `base64encode`), hash (`md5`, `sha256`)
2. Construir configuración compleja solo con locals
4. `plan` → `apply` → verificar
5. **Entrega**: `locals.tf` usando 10+ funciones + verificación

### 8.3. Sesión 3: Cambio de entorno y limpieza (20 min)

1. Cambiar `env` a prod → `plan` → `apply`
2. Verificar diferencias (replicas, versioning, tags, nombres)
3. `destroy` → limpiar
4. **Entrega**: Comparativa dev vs prod + limpieza

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Para cada necesidad, indica qué función usar:

1. Generar nombre único: `bucket-${random}`
2. Convertir lista `["a","b"]` a mapa `{"a"=1,"b"=2}` (índice)
3. Leer archivo `config.json` y parsear como objeto
4. Hash SHA256 de string para ETag
5. Timestamp actual para tag de versión

### 9.2. Ejercicio de interpretación

¿Qué produce cada expresión? Verifica en `terraform console`.

```hcl
format("sg-%04d", 7)
replace("a_b_c", "_", "-")
split(".", "a.b.c")
join(",", ["a","b","c"])
zipmap(["x","y"], [10,20])
merge({a=1}, {b=2}, {c=3})
lookup({a=1}, "z", 0)
flatten([[1,2],[3],[4,5]])
chunklist([1,2,3,4,5], 2)
```

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un bloque locals que, dado:
- variable "project" (string)
- variable "env" (string, dev/staging/prod)
- variable "components" (list(string), ej. ["api", "worker", "db"])

Produzca:
- prefix = "project-env"
- tags comunes (Project, Env, ManagedBy=Terraform)
- mapa "resources" con claves = components, valores = "prefix-component"
- replica_count = 3 si prod, 1 si no
- unique_suffix = primeros 6 chars de md5(prefix)
Usa: merge, for, condicional, md5, substr, length.
```

---

## 10. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| `locals` | ✅ Idéntico | ✅ |
| Funciones | ✅ Idénticas | ✅ |
| `terraform console` | ✅ | ✅ |

---

## 11. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `Reference to undeclared local` | Nombre mal escrito | Verificar nombre en `locals {}` |
| `Function not found` | Función no existe | Consultar docs: `terraform console` ayuda |
| `Invalid function argument` | Tipo incorrecto | Verificar tipos: `typeof()` en consola |
| `Recursive local reference` | Ciclo en locals | Reordenar, separar en múltiples locals |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Locals | No usados | Simples | Complejos + referencias cruzadas + condicionales |
| Funciones | No usadas | 1-2 categorías | 4+ categorías (strings, colecciones, encoding, hash) |
| Consola | No usa | Básica | Experimenta, depura, valida antes de escribir |
| Expresiones `for` | No usadas | Simples | Transformaciones map/list/set + filtrado |

### 12.2. Checklist final

- [ ] `locals` con valores simples, derivados, condicionales
- [ ] Funciones de al menos 4 categorías usadas
- [ ] `terraform console` usado para experimentar
- [ ] Expresiones `for` transformando colecciones
- [ ] Cambio de entorno (dev→prod) verificado
- [ ] Limpieza completa

### 12.3. Idea principal

> **`locals` = lógica de presentación; `variables` = lógica de configuración.**
> Calcula una vez, usa muchas veces. Evita repetir `format()`, `merge()`, `for` en recursos.
> **`terraform console` es tu REPL: úsalo ANTES de escribir en archivos.**
> **Funciones puras = deterministas = testables en consola.**
