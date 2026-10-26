# Bloques principales de Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform organiza la configuración en bloques de primer nivel.
Cada bloque tiene una responsabilidad concreta.
Conocerlos permite estructurar proyectos mantenibles y entender qué hace cada parte.

Esta lección recorre los bloques principales: `terraform`, `provider`, `resource`, `variable`, `output`, `locals`, `data`, `module`.
Usaremos S3 en LocalStack para ilustrar cada uno con ejemplos funcionales.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Identificar los bloques de primer nivel en una configuración.
- Explicar la responsabilidad de cada bloque.
- Diferenciar bloques de configuración y bloques de datos.
- Relacionar bloques entre sí (referencias, dependencias).

### 1.2. Objetivos prácticos

También podrás:

- Escribir cada bloque con sintaxis correcta.
- Combinar bloques para crear una configuración completa.
- Usar `terraform console` para inspeccionar valores.
- Verificar recursos creados con `aws_local`.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: HCL básico (lección 03-01), Docker Compose, `aws_local`.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (bloques)              aws_local (verificación)
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

## 4. Bloque `terraform`

Configura el comportamiento del propio Terraform.

### 4.1. Sintaxis

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Otros providers si se necesitan
    # random = { source = "hashicorp/random", version = "~> 3.0" }
  }

  # Backend (opcional, ver módulo 07)
  # backend "s3" { ... }
}
```

### 4.2. Claves principales

| Clave | Propósito |
|-------|-----------|
| `required_version` | Restringe versión de Terraform CLI |
| `required_providers` | Declara providers y versiones |
| `backend` | Configura almacenamiento del estado |
| `experiments` | Habilita características experimentales |

### 4.3. Archivo de bloqueo

`terraform init` genera `.terraform.lock.hcl` con las versiones exactas seleccionadas.
**Debe versionarse en Git** para reproducibilidad.

---

## 5. Bloque `provider`

Configura la conexión a una API (AWS, Azure, GCP, Kubernetes, etc.).

### 5.1. Sintaxis para AWS + LocalStack

```hcl
provider "aws" {
  region     = var.aws_region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
  }
}
```

### 5.2. Provider aliases (múltiples configuraciones)

```hcl
# Provider por defecto (S3 principal)
provider "aws" {
  region = "us-east-1"
  endpoints { s3 = "http://127.0.0.1:4566" }
}

# Provider alias para otra región/servicio
provider "aws" {
  alias  = "secundario"
  region = "us-west-2"
  endpoints { s3 = "http://127.0.0.1:4566" }
}

# Uso en recurso
resource "aws_s3_bucket" "otro" {
  provider = aws.secundario
  bucket   = "bucket-otra-region"
}
```

### 5.3. Herencia en módulos hijos

Los módulos hijos **heredan** la configuración del provider del módulo raíz.
No necesitan (ni deben) redeclarar `provider "aws"` salvo que necesiten alias.

---

## 6. Bloque `resource`

Declara un recurso de infraestructura que Terraform gestionará.

### 6.1. Sintaxis

```hcl
resource "TIPO_RECURSO" "NOMBRE_LOCAL" {
  # Argumentos obligatorios y opcionales
  argumento_requerido = valor
  argumento_opcional  = valor
}
```

### 6.2. Ejemplo: Bucket S3

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = var.bucket_name
  force_destroy = false

  tags = {
    Entorno = "LocalStack"
    Curso   = "Terraform"
  }
}
```

### 6.3. Dirección del recurso

`aws_s3_bucket.principal` identifica este recurso en:
- El estado (`terraform state list`)
- Referencias desde otros bloques (`aws_s3_bucket.principal.arn`)
- Planes y outputs

### 6.4. Meta-argumentos especiales

| Meta-argumento | Uso |
|----------------|-----|
| `depends_on` | Dependencias explícitas |
| `count` | Crear N instancias idénticas |
| `for_each` | Crear instancias por elemento de mapa/set |
| `lifecycle` | Controlar ciclo de vida (`create_before_destroy`, `prevent_destroy`, `ignore_changes`) |
| `provider` | Usar provider alias específico |

---

## 7. Bloque `variable`

Define entradas parametrizables para la configuración.

### 7.1. Sintaxis completa

```hcl
variable "nombre" {
  type        = string          # Tipo: string, number, bool, list, map, object, tuple, set, any
  default     = "valor"         # Opcional: hace la variable opcional
  description = "Descripción"   # Recomendado: documenta el propósito
  validation {                  # Opcional: reglas de validación
    condition     = expresion_booleana
    error_message = "Mensaje si falla"
  }
  sensitive = false             # true = oculta en salida (pero guarda en estado)
  nullable  = true              # false = no permite null
}
```

### 7.2. Ejemplos de tipos

```hcl
variable "region"       { type = string }
variable "replicas"     { type = number }
variable "enabled"      { type = bool }
variable "puertos"      { type = list(number) }
variable "tags"         { type = map(string) }
variable "config"       { type = object({ nombre = string, puerto = number }) }
variable "opciones"     { type = tuple([string, number, bool]) }
variable "conjunto"     { type = set(string) }
```

---

## 8. Bloque `output`

Expone valores calculados tras aplicar la configuración.

### 8.1. Sintaxis

```hcl
output "nombre" {
  value       = expresion           # Referencia a recurso, variable, local, etc.
  description = "Qué expone"        # Recomendado
  sensitive   = false               # true = oculta en salida (pero guarda en estado)
  precondition {                    # Validación del valor (Terraform 1.7+)
    condition     = expresion
    error_message = "Mensaje"
  }
}
```

### 8.2. Ejemplos

```hcl
output "bucket_name" {
  value       = aws_s3_bucket.principal.bucket
  description = "Nombre del bucket creado"
}

output "bucket_arn" {
  value       = aws_s3_bucket.principal.arn
  description = "ARN del bucket"
}

output "all_buckets" {
  value       = { for k, v in aws_s3_bucket.multiples : k => v.bucket }
  description = "Mapa de todos los buckets gestionados"
}
```

### 8.3. Consulta de outputs

```bash
terraform output                    # Todos
terraform output bucket_name        # Uno solo
terraform output -raw bucket_name   # Sin comillas, para scripts
terraform output -json              # Formato JSON
```

---

## 9. Bloque `locals`

Define valores calculados reutilizables dentro del módulo.

### 9.1. Sintaxis

```hcl
locals {
  nombre = expresion
  mapa   = { clave = valor }
  lista  = [for x in var.lista : x * 2]
}
```

### 9.2. Ejemplo práctico

```hcl
locals {
  project_name = "mi-app"
  environment  = var.env
  prefix       = "${local.project_name}-${local.environment}"
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
  
  bucket_names = {
    data  = "${local.prefix}-data"
    logs  = "${local.prefix}-logs"
    backup = "${local.prefix}-backup"
  }
}
```

### 9.3. Diferencia con `variable`

| Aspecto | `variable` | `locals` |
|---------|------------|----------|
| Entrada externa | Sí (CLI, tfvars, env) | No |
| Valor calculado | No (solo literales) | Sí (expresiones) |
| Reutilización | En todo el módulo | En todo el módulo |
| Validación | Sí (`validation`) | No |

---

## 10. Bloque `data` (Data Sources)

Lee información de recursos existentes (no gestionados por esta configuración).

### 10.1. Sintaxis

```hcl
data "TIPO_RECURSO" "NOMBRE_LOCAL" {
  # Argumentos de búsqueda (filtros, IDs, etc.)
  filtro = valor
}
```

### 10.2. Ejemplo: Bucket existente

```hcl
data "aws_s3_bucket" "existente" {
  bucket = "bucket-creado-fuera-de-terraform"
}

# Uso en otro recurso
resource "aws_s3_object" "ejemplo" {
  bucket = data.aws_s3_bucket.existente.bucket
  key    = "archivo.txt"
  content = "Hola"
}
```

### 10.3. Casos de uso comunes

- Leer recursos creados manualmente o por otro equipo.
- Consultar AMIs, zonas de disponibilidad, políticas IAM.
- Importar recursos existentes (ver módulo 07).

---

## 11. Bloque `module`

Incorpora un módulo hijo (reutilizable) en la configuración actual.

### 11.1. Sintaxis

```hcl
module "nombre_instancia" {
  source = "./modulos/mi-modulo"  # Ruta local, registry, Git, HTTP, S3
  
  # Argumentos = variables del módulo hijo
  variable_hija = valor
}
```

### 11.2. Ejemplo

```hcl
module "bucket_datos" {
  source = "./modules/s3-bucket"
  
  bucket_name = "tf-aula-datos-001"
  versioning  = true
  tags = local.common_tags
}
```

### 11.3. Bloque `moved` (refactorización)

```hcl
moved {
  from = aws_s3_bucket.antiguo
  to   = module.bucket_datos.aws_s3_bucket.principal
}
```

Permite renombrar/mover recursos sin recrearlos (ver módulo 07).

---

## 12. Relaciones entre bloques

```
terraform { required_providers { aws = ... } }
       │
       ▼
provider "aws" { ... }  ◄── Configura conexión
       │
       ▼
variable "x" { ... }    ◄── Entradas
       │
       ▼
locals { y = var.x }    ◄── Valores calculados
       │
       ▼
resource "aws_s3_bucket" "r" { bucket = local.y }  ◄── Recursos gestionados
       │
       ▼
data "aws_s3_bucket" "d" { ... }  ◄── Lectura externa
       │
       ▼
output "z" { value = resource.r.attr }  ◄── Salidas
       │
       ▼
module "m" { source = "..." }  ◄── Composición
```

---

## 13. Práctica guiada: Configuración completa con todos los bloques

### Paso 1: Preparar

```bash
mkdir -p bloques-principales/evidencias
cd bloques-principales
docker compose up -d
source .env.localstack
```

### Paso 2: Escribir configuración completa

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

# variables.tf
variable "project" { type = string, default = "bloques" }
variable "env"     { type = string, default = "demo" }
variable "create_extra" { type = bool, default = true }

# locals.tf
locals {
  prefix = "${var.project}-${var.env}"
  tags = { Project = var.project, Env = var.env }
}

# main.tf
resource "aws_s3_bucket" "principal" {
  bucket = "${local.prefix}-principal"
  tags = local.tags
}

resource "aws_s3_bucket" "extra" {
  count  = var.create_extra ? 1 : 0
  bucket = "${local.prefix}-extra"
  tags = local.tags
}

# data.tf (leer bucket principal)
data "aws_s3_bucket" "principal_data" {
  bucket = aws_s3_bucket.principal.bucket
}

# outputs.tf
output "principal_bucket" { value = aws_s3_bucket.principal.bucket }
output "extra_bucket"     { value = var.create_extra ? aws_s3_bucket.extra[0].bucket : "no creado" }
output "data_source_arn"  { value = data.aws_s3_bucket.principal_data.arn }
```

### Paso 3: Desplegar y verificar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=full.tfplan
terraform apply full.tfplan

# Verificar con aws_local
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
aws_local s3api get-bucket-tagging --bucket bloques-demo-principal
```

### Paso 4: Experimentar con consola

```bash
terraform console
> var.create_extra
> local.prefix
> aws_s3_bucket.principal.arn
> data.aws_s3_bucket.principal_data.arn
```

### Paso 5: Modificar variable y reaplicar

```bash
# Cambiar create_extra = false
terraform plan -out=update.tfplan
terraform apply update.tfplan

# Verificar: bucket extra destruido
aws_local s3api list-buckets
```

### Paso 5: Limpiar

```bash
terraform destroy
aws_local s3api list-buckets
docker compose down
```

---

## 14. Sesiones guiadas para el alumnado

### 14.1. Sesión 1: Bloques básicos (25 min)

1. Crear configuración con `terraform`, `provider`, `resource`, `variable`, `output`
2. `init` → `fmt` → `validate` → `plan` → `apply`
3. `terraform console` → inspeccionar cada bloque
4. **Entrega**: Configuración + salida consola + verificación `aws_local`

### 14.2. Sesión 2: Locals, data, module, count (30 min)

1. Añadir `locals` para tags y prefijos
2. Añadir `data` source para leer bucket
3. Añadir `count` condicional en recurso extra
4. `plan` → `apply` → verificar cambios
5. **Entrega**: Configuración actualizada + evidencias de cada bloque

### 14.3. Sesión 3: Provider alias y module (25 min)

1. Añadir provider alias (opcional)
2. Crear módulo hijo simple (`modules/bucket/`)
3. Usar `module` + `moved` para refactorizar
6. **Entrega**: Estructura con módulo + plan con `moved`

---

## 15. Ejercicios de refuerzo

### 15.1. Ejercicio de identificación

Relaciona cada bloque con su propósito:

| Bloque | Propósito |
|--------|-----------|
| `terraform` | |
| `provider` | |
| `resource` | |
| `variable` | |
| `output` | |
| `locals` | |
| `data` | |
| `module` | |

### 15.2. Ejercicio de interpretación

¿Qué pasa si:
1. Quitas `required_providers` de `terraform`?
2. Pones `provider "aws"` dentro de un módulo hijo?
3. Cambias `variable` por `local` para una entrada?
4. Usas `data` en lugar de `resource` para un bucket nuevo?

### 15.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una plantilla de configuración Terraform con TODOS los bloques principales.
Incluye comentarios explicando cada uno.
Usa S3 en LocalStack como ejemplo.
No inventes argumentos. Usa la documentación del provider AWS.
```

---

## 16. Limitaciones de LocalStack

| Bloque | LocalStack | AWS Real |
|--------|------------|----------|
| `terraform` | ✅ | ✅ |
| `provider` | ✅ (con endpoints) | ✅ |
| `resource` (S3) | ✅ | ✅ |
| `variable` | ✅ | ✅ |
| `output` | ✅ | ✅ |
| `locals` | ✅ | ✅ |
| `data` | ✅ | ✅ |
| `module` | ✅ | ✅ |
| `moved` | ✅ | ✅ |

---

## 17. Diagnóstico de errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `Provider not initialized` | Falta `terraform init` | Ejecutar `terraform init` |
| `Provider configuration not present` | Módulo hijo sin provider heredado | Verificar herencia o pasar alias |
| `Resource not found` en data source | Recurso no existe en API | Verificar nombre/ID, usar `depends_on` |
| `Output references sensitive value` | Output referencia atributo sensitive | Marcar output como `sensitive = true` |
| `Module not found` | Ruta `source` incorrecta | Verificar ruta relativa/absoluta |

---

## 18. Evaluación y cierre

### 18.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Bloques básicos | Faltan bloques | Todos presentes | Todos + meta-argumentos |
| Variables/Outputs | No usados | Básicos | Con validaciones, sensitive, precondition |
| Locals/Data | No usados | Uno de los dos | Ambos + expresiones útiles |
| Module/Moved | No probados | Entendidos | Creados y refactorizados |
| Verificación | Sin aws_local | Básica | Completa + consola |

### 18.2. Checklist final

- [ ] Bloque `terraform` con versiones
- [ ] Bloque `provider` con endpoints LocalStack
- [ ] Al menos un `resource` S3
- [ ] Variables con tipo y validación
- [ ] Outputs con descripción
- [ ] Locals para valores calculados
- [ ] Data source para lectura externa
- [ ] Module (opcional) + moved (opcional)
- [ ] Verificación con `aws_local` y `terraform console`
- [ ] Limpieza completa

### 18.3. Idea principal

> **Cada bloque tiene UNA responsabilidad.**
> `terraform` = motor, `provider` = conexión, `resource` = gestión, `variable` = entrada, `output` = salida, `locals` = cálculo, `data` = lectura, `module` = composición.
> **Combínalos para construir configuraciones claras y mantenibles.**
