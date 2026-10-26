# `count`, `for_each` y condicionales en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform permite crear múltiples instancias de un recurso sin duplicar código.
`count` crea N instancias idénticas indexadas numéricamente.
`for_each` crea instancias por elemento de un mapa o conjunto, con claves significativas.
Los condicionales (`count` con ternario, `for_each` con filtrado) permiten recursos opcionales.
Esta lección enseña a elegir entre ambos, combinarlos con condicionales, y evitar errores comunes.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar `count` vs `for_each`: cuándo usar cada uno.
- Entender la indexación numérica vs claves de mapa/set.
- Explicar cómo los condicionales afectan la creación de recursos.
- Identificar limitaciones: `count` no permite referencias a atributos por índice en algunos contextos.

### 1.2. Objetivos prácticos

También podrás:

- Crear múltiples buckets/colas con `for_each` sobre mapa de configuración.
- Usar `count` para recursos idénticos (ej. réplicas).
- Hacer recursos opcionales con `count = condition ? 1 : 0`.
- Filtrar `for_each` con cláusula `if`.
- Referenciar instancias correctamente (`resource.nombre[clave]`, `resource.nombre[indice]`).

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: recursos, variables, locals, expresiones `for` (lección 03-05).

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (count/for_each)         aws_local (verificación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3, SQS)
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs
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

## 4. Meta-argumento `count`

### 4.1. Sintaxis

```hcl
resource "aws_s3_bucket" "replicas" {
  count = 3
  bucket = "tf-replica-${count.index}"
  tags = { Replica = "true", Index = count.index }
}
```

### 4.2. Características

- `count.index`: índice base 0 (0, 1, 2...).
- Crea instancias idénticas (mismos argumentos salvo `count.index`).
- Referencia: `aws_s3_bucket.replicas[0]`, `aws_s3_bucket.replicas[1]`, etc.
- Output: `aws_s3_bucket.replicas[*].bucket` → lista de valores.

### 4.3. Condicional con `count` (recurso opcional)

```hcl
variable "crear_bucket_extra" { type = bool, default = false }

resource "aws_s3_bucket" "extra" {
  count = var.crear_bucket_extra ? 1 : 0
  bucket = "tf-extra-001"
}
```

- Si `true`: crea 1 instancia (índice 0).
- Si `false`: crea 0 instancias (recurso no existe).
- Referencia: `aws_s3_bucket.extra[0]` (solo si existe).

### 4.4. Limitaciones de `count`

- Índice numérico frágil: insertar/eliminar en medio desplaza índices.
- No permite claves semánticas.
- Referencia a atributos por índice puede fallar si la lista cambia.

---

## 5. Meta-argumento `for_each`

### 5.1. Sintaxis con mapa

```hcl
variable "buckets_config" {
  type = map(object({
    versionado = bool
    tags       = map(string)
  }))
  default = {
    "datos"  = { versionado = true,  tags = { Tipo = "datos" } }
    "logs"   = { versionado = false, tags = { Tipo = "logs" } }
    "backup" = { versionado = true,  tags = { Tipo = "backup" } }
  }
}

resource "aws_s3_bucket" "configurados" {
  for_each = var.buckets_config
  bucket   = "tf-${each.key}-001"
  versioning { enabled = each.value.versionado }
  tags = each.value.tags
}
```

### 5.2. Sintaxis con conjunto (set)

```hcl
variable "nombres_buckets" { type = set(string), default = ["a", "b", "c"] }

resource "aws_s3_bucket" "set" {
  for_each = var.nombres_buckets
  bucket   = "tf-${each.key}-001"
}
```

### 5.3. Características

- `each.key`: clave del mapa/set (string).
- `each.value`: valor (objeto para mapa, string para set).
- Claves estables: añadir/eliminar entradas no afecta a otras.
- Referencia: `aws_s3_bucket.configurados["datos"]`, `aws_s3_bucket.set["a"]`.
- Output: `aws_s3_bucket.configurados[*].bucket` → mapa clave→valor.

### 5.4. Filtrado en `for_each` (condicional)

```hcl
variable "entorno" { type = string }

resource "aws_s3_bucket" "condicionales" {
  for_each = {
    for k, v in var.buckets_config : k => v
    if v.versionado || var.entorno == "prod"  # Solo versionados o si prod
  }
  bucket = "tf-${each.key}-001"
  versioning { enabled = each.value.versionado }
}
```

---

## 6. Comparativa: `count` vs `for_each`

| Aspecto | `count` | `for_each` |
|---------|---------|------------|
| **Entrada** | Número | Mapa o Set |
| **Identificador** | Índice numérico (0,1,2) | Clave string (`each.key`) |
| **Estabilidad** | Frágil (insertar desplaza) | Estable (claves) |
| **Valores por instancia** | Solo via `count.index` | `each.key` + `each.value` (objeto) |
| **Referencia** | `recurso[0]`, `recurso[1]` | `recurso["clave"]` |
| **Condicional** | `count = cond ? 1 : 0` | Filtrado en `for_each` |
| **Casos de uso** | Réplicas idénticas, recurso opcional simple | Configuraciones distintas, claves semánticas |

---

## 7. Referenciando instancias

### 7.1. `count`

```hcl
resource "aws_s3_bucket" "r" { count = 3, bucket = "b-${count.index}" }

# En otro recurso/output:
output "primer_bucket" { value = aws_s3_bucket.r[0].bucket }
output "todos" { value = aws_s3_bucket.r[*].bucket }
```

### 7.2. `for_each`

```hcl
resource "aws_s3_bucket" "r" { for_each = {a={}, b={}}, bucket = "b-${each.key}" }

# En otro recurso/output:
output "bucket_a" { value = aws_s3_bucket.r["a"].bucket }
output "todos" { value = aws_s3_bucket.r[*].bucket }  # mapa clave→bucket
```

### 7.3. En `depends_on`

```hcl
resource "aws_s3_bucket" "a" { for_each = {x={}, y={}}, bucket = "a-${each.key}" }
resource "aws_s3_bucket" "b" {
  for_each = {x={}, y={}}
  bucket = "b-${each.key}"
  depends_on = [aws_s3_bucket.a]  # Todas las instancias de a antes que b
  # O por clave:
  # depends_on = [aws_s3_bucket.a["x"]]  # Solo instancia x
}
```

---

## 8. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p count-foreach/evidencias
cd count-foreach
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con `count` (réplicas)

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "project" { type = string, default = "cf-demo" }
variable "replicas" { type = number, default = 3 }
variable "crear_extra" { type = bool, default = true }

# locals.tf
locals { prefix = var.project, tags = { Leccion = "CountForEach" } }

# main.tf - count para réplicas idénticas
resource "aws_s3_bucket" "replicas" {
  count = var.replicas
  bucket = "${local.prefix}-replica-${count.index}"
  tags = merge(local.tags, { Replica = "true", Index = count.index })
}

# count condicional (recurso opcional)
resource "aws_s3_bucket" "extra" {
  count = var.crear_extra ? 1 : 0
  bucket = "${local.prefix}-extra"
  tags = local.tags
}

# outputs.tf
output "replica_buckets" { value = aws_s3_bucket.replicas[*].bucket }
output "extra_bucket"    { value = var.crear_extra ? aws_s3_bucket.extra[0].bucket : "no creado" }
```

### Paso 3: Desplegar y verificar `count`

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=count.tfplan
terraform apply count.tfplan

# Verificar
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
# Debe mostrar: cf-demo-replica-0, cf-demo-replica-1, cf-demo-replica-2, cf-demo-extra
```

### Paso 4: Configuración con `for_each` (configuraciones distintas)

```hcl
# Añadir a variables.tf
variable "buckets_config" {
  type = map(object({
    versionado = bool
    tags       = map(string)
  }))
  default = {
    "datos"  = { versionado = true,  tags = { Tipo = "datos",  Critico = "true" } }
    "logs"   = { versionado = false, tags = { Tipo = "logs" } }
    "backup" = { versionado = true,  tags = { Tipo = "backup" } }
  }
```

```hcl
# Añadir a main.tf - for_each con mapa
resource "aws_s3_bucket" "configurados" {
  for_each = var.buckets_config
  bucket   = "${local.prefix}-${each.key}"
  versioning { enabled = each.value.versionado }
  tags = merge(local.tags, each.value.tags)
}

# for_each con filtrado condicional
resource "aws_s3_bucket" "solo_versionados" {
  for_each = {
    for k, v in var.buckets_config : k => v
    if v.versionado  # Solo los que tienen versionado=true
  }
  bucket = "${local.prefix}-v-${each.key}"
  versioning { enabled = true }
  tags = merge(local.tags, each.value.tags, { Filtrado = "versionado" })
}
```

```hcl
# Añadir a outputs.tf
output "config_buckets" { value = { for k, v in aws_s3_bucket.configurados : k => v.bucket } }
output "versioned_buckets" { value = { for k, v in aws_s3_bucket.solo_versionados : k => v.bucket } }
```

### Paso 4: Desplegar y verificar `for_each`

```bash
terraform plan -out=foreach.tfplan
terraform show foreach.tfplan
# Observar: 3 instancias en configurados, 2 en solo_versionados (datos, backup)

terraform apply foreach.tfplan

# Verificar
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
aws_local s3api get-bucket-versioning --bucket cf-demo-datos
aws_local s3api get-bucket-versioning --bucket cf-demo-logs
aws_local s3api get-bucket-tagging --bucket cf-demo-datos
```

### Paso 5: Referenciar instancias específicas

```bash
# Outputs
terraform output config_buckets
terraform output versioned_buckets

# Referencia en consola
terraform console
> aws_s3_bucket.configurados["datos"].bucket
> aws_s3_bucket.configurados["logs"].arn
> aws_s3_bucket.replicas[1].bucket
```

### Paso 6: Cambios en `for_each` (estabilidad)

```bash
# Modificar variable: añadir "archive" y quitar "logs"
# En variables.tf o -var:
# buckets_config = { datos={...}, backup={...}, archive={versionado=true, tags={Tipo="archive"}} }

terraform plan -out=change.tfplan
terraform show change.tfplan
# Observar: crea archive, destruye logs, datos y backup SIN CAMBIOS (claves estables)

terraform apply change.tfplan
```

### Paso 7: Limpiar

```bash
terraform destroy -auto-approve
aws_local s3api list-buckets
docker compose down
```

---

## 9. Sesiones guiadas

### 9.1. Sesión 1: `count` para réplicas y opcionales (25 min)

1. Crear 3 réplicas con `count` + 1 opcional con `count = cond ? 1 : 0`
2. `plan` → verificar índices y condicional
3. `apply` → verificar con `aws_local`
4. **Entrega**: Plan + lista buckets + explicación índice vs clave

### 9.2. Sesión 2: `for_each` para configuraciones (30 min)

1. Definir mapa de configuraciones (buckets con versionado/tags distintos)
2. `for_each` sobre mapa + filtrado condicional
3. `plan` → verificar claves `each.key`, valores `each.value`
4. **Entrega**: Configuración + plan + verificación tags/versionado por clave

### 9.3. Sesión 3: Cambios y estabilidad (25 min)

1. Añadir/quitar entradas en mapa `for_each` → `plan` → verificar estabilidad
2. Cambiar `count` (añadir en medio) → `plan` → observar desplazamiento índices
3. Comparar: `for_each` estable vs `count` frágil
4. **Entrega**: Comparativa + recomendación cuándo usar cada uno

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Para cada caso, ¿`count` o `for_each`?

1. 5 buckets idénticos, solo cambia nombre por índice
2. 3 buckets: datos (versionado), logs (sin versionado), backup (versionado + tags extra)
3. Recurso opcional: crear bucket de auditoría solo si `enable_audit = true`
3. 4 colas SQS con nombres fijos: "cola-a", "cola-b", "cola-c", "cola-d"
4. N réplicas de una Lambda (misma config, distinto nombre por índice)

### 10.2. Ejercicio de interpretación

Dado:
```hcl
variable "entorno" { type = string }
resource "aws_s3_bucket" "x" {
  for_each = { for k, v in {a={}, b={}, c={}} : k => v if var.entorno == "prod" }
  bucket = "x-${each.key}"
}
```
- Si `entorno = "prod"`: ¿cuántas instancias? ¿claves?
- Si `entorno = "dev"`: ¿cuántas instancias? ¿qué pasa en plan?

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración que cree:
- N buckets réplica (count) con nombres "app-replica-0".."app-replica-N-1"
- M buckets configurados (for_each) desde variable mapa con claves = nombre, valores = {versionado, tags}
- 1 bucket opcional "audit" solo si variable bool enable_audit
Incluye: outputs para listar todos los buckets por tipo.
```

---

## 11. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| `count` | ✅ Idéntico | ✅ |
| `for_each` | ✅ Idéntico | ✅ |
| Condicionales | ✅ Idéntico | ✅ |

---

## 12. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `count` cannot be used with `for_each` | Ambos en mismo recurso | Elegir uno |
| `for_each` value must be map or set | Lista pasada a `for_each` | Convertir: `toset(lista)` o `{for i,v in lista: i=>v}` |
| `each.key` not allowed here | Usado fuera de recurso `for_each` | Solo dentro del recurso con `for_each` |
| `count.index` not allowed here | Usado fuera de recurso `count` | Solo dentro del recurso con `count` |
| Duplicate key in `for_each` | Claves repetidas en mapa | Claves únicas en mapa/set |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| `count` | No usa | Réplicas básicas | Réplicas + condicional opcional |
| `for_each` | No usa | Mapa simple | Mapa + filtrado + claves estables |
| Condicionales | No usa | `count` ternario | `count` ternario + filtrado `for_each` |
| Referencias | No referencia | Índice/Clave básica | Outputs con `[*]` y referencias específicas |
| Comparativa | No compara | Diferencia básica | Justifica elección por caso |

### 13.2. Checklist final

- [ ] `count` para réplicas idénticas
- [ ] `count` condicional para recurso opcional
- [ ] `for_each` sobre mapa con configuraciones distintas
- [ ] `for_each` con filtrado `if`
- [ ] Outputs usando `[*]` y referencias por clave/índice
- [ ] Cambio en mapa `for_each` verifica estabilidad (no recrea otros)
- [ ] Cambio en `count` muestra fragilidad de índices
- [ ] Limpieza completa

### 13.3. Idea principal

> **`count` = "cuántos"; `for_each` = "cuáles".**
> Réplicas idénticas → `count`. Configuraciones distintas → `for_each`.
> Recurso opcional simple → `count = cond ? 1 : 0`. Filtrado complejo → `for_each` con `if`.
> **Claves estables (`for_each`) > índices frágiles (`count`) para configuraciones que evolucionan.**
