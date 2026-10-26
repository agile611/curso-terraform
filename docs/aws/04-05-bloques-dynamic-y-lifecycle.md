# Bloques `dynamic` y `lifecycle` en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Los bloques `dynamic` generan bloques anidados repetidos a partir de una colección (similar a `for_each` pero para bloques internos).
El meta-argumento `lifecycle` controla el ciclo de vida de un recurso: creación antes de destrucción, prevención de destrucción, ignorar cambios.
Esta lección enseña a usar ambos para configuraciones flexibles y seguras.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la diferencia entre `for_each` (recursos) y `dynamic` (bloques anidados).
- Identificar cuándo usar `lifecycle` para proteger recursos críticos.
- Entender `create_before_destroy`, `prevent_destroy`, `ignore_changes`.
- Combinar `dynamic` con `for_each`/`count` para configuraciones complejas.

### 1.2. Objetivos prácticos

También podrás:

- Generar bloques `lifecycle_rule` de S3 dinámicamente desde una variable.
- Crear `ingress` rules de Security Group dinámicamente.
- Proteger recursos críticos con `prevent_destroy`.
- Forzar recreación ordenada con `create_before_destroy`.
- Ignorar cambios externos (drift) con `ignore_changes`.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: recursos, `for_each`, expresiones `for`, referencias.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (dynamic + lifecycle)    aws_local (verificación)
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

## 4. Bloque `dynamic`

### 4.1. Qué es

`dynamic` genera **bloques anidados** repetidos dentro de un recurso.
Es análogo a `for_each` pero para bloques internos (no recursos de primer nivel).

### 4.2. Sintaxis

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "tf-dynamic-001"

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      id      = lifecycle_rule.value.id
      enabled = lifecycle_rule.value.enabled
      expiration {
        days = lifecycle_rule.value.expiration_days
      }
      transition {
        days          = lifecycle_rule.value.transition_days
        storage_class = lifecycle_rule.value.transition_class
      }
    }
  }
}
```

### 4.3. Estructura

```hcl
dynamic "NOMBRE_BLOQUE" {
  for_each = COLECCION      # mapa, lista, set
  iterator = NOMBRE_OPCIONAL # default: nombre del bloque
  labels   = [ETIQUETAS]    # opcional, para bloques con etiquetas
  content {
    # Argumentos del bloque generado
    argumento = dynamic_bloque.value.campo
  }
}
```

### 4.4. `iterator` y `labels`

```hcl
# iterator personalizado (evita colisión con variable externa)
dynamic "rule" {
  for_each = var.rules
  iterator = r
  content {
    priority = r.value.priority
    action   = r.value.action
  }
}

# labels para bloques que requieren etiqueta (ej. security_group_rule)
dynamic "ingress" {
  for_each = var.ingress_rules
  labels   = [ingress.value.protocol]  # etiqueta del bloque
  content {
    from_port   = ingress.value.from_port
    to_port     = ingress.value.to_port
    protocol    = ingress.value.protocol
    cidr_blocks = ingress.value.cidr_blocks
  }
}
```

---

## 5. Meta-argumento `lifecycle`

### 5.1. `create_before_destroy`

Crea el recurso nuevo **antes** de destruir el viejo.
Útil para: recursos que no pueden tener downtime (ELB, DNS, IPs elásticas).

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "tf-lifecycle-001"
  lifecycle {
    create_before_destroy = true
  }
}
```

### 5.2. `prevent_destroy`

Bloquea la destrucción accidental. `terraform destroy` falla si intenta borrar este recurso.

```hcl
resource "aws_s3_bucket" "critico" {
  bucket = "tf-critico-001"
  lifecycle {
    prevent_destroy = true
  }
}
```

> Para destruir: quitar `prevent_destroy` o usar `terraform state rm` + `import`.

### 5.3. `ignore_changes`

Ignora cambios en atributos específicos (drift externo aceptado).
Útil para: atributos gestionados externamente (tags por otro equipo, tags AWS managed).

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "tf-ignore-001"
  tags = { Gestionado = "Terraform" }
  lifecycle {
    ignore_changes = [
      tags,           # Ignora todos los cambios en tags
      # tags["Externo"],  # Solo tag específico (Terraform 1.7+)
      versioning,     # Ignora cambios en versioning
    ]
  }
}
```

### 5.4. `replace_triggered_by` (Terraform 1.6+)

Fuerza recreación cuando otro recurso cambia.

```hcl
resource "aws_lambda_function" "demo" {
  # ...
  lifecycle {
    replace_triggered_by = [aws_iam_role.lambda_exec]
  }
}
```

---

## 6. Combinando `dynamic` y `lifecycle`

### 6.1. Ejemplo completo: Bucket S3 con reglas de ciclo de vida dinámicas y protección

```hcl
variable "lifecycle_rules" {
  type = map(object({
    id                 = string
    enabled            = bool
    expiration_days    = number
    transition_days    = number
    transition_class   = string
  }))
  default = {
    "logs_30d" = {
      id = "logs-30d"
      enabled = true
      expiration_days = 30
      transition_days = 7
      transition_class = "STANDARD_IA"
    }
    "backup_365d" = {
      id = "backup-365d"
      enabled = true
      expiration_days = 365
      transition_days = 30
      transition_class = "GLACIER"
    }
  }
}

resource "aws_s3_bucket" "datos" {
  bucket = "tf-dynamic-lifecycle-001"
  versioning { enabled = true }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      id      = lifecycle_rule.value.id
      enabled = lifecycle_rule.value.enabled
      expiration {
        days = lifecycle_rule.value.expiration_days
      }
      transition {
        days          = lifecycle_rule.value.transition_days
        storage_class = lifecycle_rule.value.transition_class
      }
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [lifecycle_rule]  # Drift externo en reglas aceptado
  }
}
```

---

## 7. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p dynamic-lifecycle/evidencias
cd dynamic-lifecycle
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con `dynamic` (reglas S3)

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "project" { type = string, default = "dl-demo" }
variable "lifecycle_rules" {
  type = map(object({
    id                 = string
    enabled            = bool
    expiration_days    = number
    transition_days    = number
    transition_class   = string
  }))
  default = {
    "logs_30d" = {
      id = "logs-30d"
      enabled = true
      expiration_days = 30
      transition_days = 7
      transition_class = "STANDARD_IA"
    }
    "backup_365d" = {
      id = "backup-365d"
      enabled = true
      expiration_days = 365
      transition_days = 30
      transition_class = "GLACIER"
    }
  }
```

```hcl
# main.tf
resource "aws_s3_bucket" "datos" {
  bucket = "tf-dl-datos-001"
  versioning { enabled = true }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      id      = lifecycle_rule.value.id
      enabled = lifecycle_rule.value.enabled
      expiration {
        days = lifecycle_rule.value.expiration_days
      }
      transition {
        days          = lifecycle_rule.value.transition_days
        storage_class = lifecycle_rule.value.transition_class
      }
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [lifecycle_rule]
  }
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.datos.bucket }
output "lifecycle_rules" { value = aws_s3_bucket.datos.lifecycle_rule }
```

### Paso 3: Desplegar y verificar `dynamic`

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=dynamic.tfplan
terraform show dynamic.tfplan
# Observar: 2 lifecycle_rule generadas

terraform apply dynamic.tfplan

# Verificar
aws_local s3api get-bucket-lifecycle-configuration --bucket tf-dl-datos-001 | jq .
```

### Paso 4: Probar `lifecycle` - `prevent_destroy`

```bash
# Intentar destruir (debe fallar)
terraform destroy -auto-approve
# Error: Resource tf-dl-datos-001 is protected by prevent_destroy
```

### Paso 5: Probar `ignore_changes` (drift externo)

```bash
# Drift externo: modificar lifecycle rule via aws_local
aws_local s3api put-bucket-lifecycle-configuration \
  --bucket tf-dl-datos-001 \
  --lifecycle-configuration 'Rules=[{ID:"externo",Status:"Enabled",Expiration:{Days:999}}]'

# Terraform plan: NO propone cambios en lifecycle_rule (ignorado)
terraform plan
# No changes. Infrastructure is up-to-date.
```

### Paso 6: Probar `create_before_destroy` (simulado)

```hcl
# Añadir a main.tf (nuevo bucket para probar)
resource "aws_s3_bucket" "cb" {
  bucket = "tf-cb-001"
  lifecycle {
    create_before_destroy = true
  }
}
```

```bash
terraform plan -out=cb.tfplan
terraform apply cb.tfplan

# Cambiar nombre del bucket (fuerza recreación)
# bucket = "tf-cb-002"
terraform plan -out=cb2.tfplan
terraform show cb2.tfplan
# Observar: create_before_destroy = true → crea nuevo ANTES de destruir viejo
```

### Paso 7: Limpiar (quitar prevent_destroy primero)

```bash
# Editar main.tf: comentar prevent_destroy
# lifecycle { ignore_changes = [lifecycle_rule] }

terraform plan -out=destroy.tfplan
terraform apply destroy.tfplan

aws_local s3api list-buckets
docker compose down
```

---

## 8. Sesiones guiadas

### 8.1. Sesión 1: `dynamic` para bloques repetidos (30 min)

1. Definir variable mapa con reglas de ciclo de vida
2. `dynamic "lifecycle_rule"` generando bloques
3. `plan` → verificar bloques generados
4. `apply` → verificar con `aws_local get-bucket-lifecycle-configuration`
5. **Entrega**: Variable + dynamic + verificación reglas creadas

### 8.2. Sesión 2: `lifecycle` protectores (30 min)

1. `prevent_destroy` → intentar `destroy` → falla
2. `ignore_changes` → drift externo → `plan` sin cambios
3. `create_before_destroy` → cambio que fuerza recreación → orden create→destroy
4. **Entrega**: Evidencias de cada comportamiento

### 8.3. Sesión 3: Combinación y limpieza (20 min)

1. Combinar `dynamic` + `lifecycle` en bucket único
2. Probar drift en bloques generados dinámicamente
3. Limpiar (quitar `prevent_destroy` antes de `destroy`)
4. **Entrega**: Configuración combinada + limpieza ordenada

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Para cada caso, ¿`dynamic` o `for_each`?

1. Crear 3 buckets S3 con nombres distintos
2. Generar 5 `lifecycle_rule` dentro de UN bucket
3. Crear 4 `ingress` rules en UN security group
4. Crear 3 instancias EC2 con misma config
5. Generar múltiples `cors_rule` en UN bucket

### 9.2. Ejercicio de interpretación

Dado:
```hcl
resource "aws_s3_bucket" "b" {
  bucket = "test"
  dynamic "cors_rule" {
    for_each = [{allowed_origin=["*"], allowed_method=["GET"]}]
    content { allowed_origin = cors_rule.value.allowed_origin }
  }
  lifecycle { ignore_changes = [cors_rule] }
}
```
1. ¿Cuántas `cors_rule` se crean?
2. Si externamente se añade otra CORS rule via AWS CLI, ¿qué hace `plan`?
3. Si se cambia la lista en `for_each` a 2 elementos, ¿qué pasa?

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un recurso aws_s3_bucket con:
- dynamic "lifecycle_rule" desde variable mapa (id, enabled, expiration_days, transition_days, transition_class)
- dynamic "cors_rule" desde variable lista (allowed_origins, allowed_methods, max_age_seconds)
- lifecycle { prevent_destroy = true, ignore_changes = [lifecycle_rule, cors_rule] }
Incluye: variables con validación, outputs para verificar reglas creadas.
```

---

## 10. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| `dynamic` | ✅ Idéntico | ✅ |
| `lifecycle` (create_before_destroy) | ✅ | ✅ |
| `lifecycle` (prevent_destroy) | ✅ | ✅ |
| `lifecycle` (ignore_changes) | ✅ | ✅ |
| `replace_triggered_by` | ✅ | ✅ |

---

## 11. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `dynamic` block not allowed | Bloque no soporta dynamic | Verificar docs del recurso |
| `for_each` not allowed in dynamic | `for_each` en dynamic | Usar `for_each` en dynamic, no `count` |
| `prevent_destroy` blocks destroy | Intento destruir recurso protegido | Quitar `prevent_destroy` o `state rm` + `import` |
| `ignore_changes` not working | Atributo no existe o mal escrito | Verificar nombre exacto del atributo |
| `create_before_destroy` not supported | Recurso no soporta | Verificar docs del recurso |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| `dynamic` | No usa | Genera bloques simples | Genera bloques complejos + iterator/labels |
| `prevent_destroy` | No usa | Entiende concepto | Prueba destroy falla + explica cuándo usar |
| `ignore_changes` | No usa | Entiende concepto | Drift externo + plan sin cambios |
| `create_before_destroy` | No usa | Entiende concepto | Verifica orden create→destroy |
| Combinación | No combina | Uno solo | Dynamic + lifecycle en mismo recurso |

### 12.2. Checklist final

- [ ] `dynamic` generando bloques anidados (lifecycle_rule, cors_rule, etc.)
- [ ] `iterator` y/o `labels` usados correctamente
- [ ] `prevent_destroy` probado (destroy falla)
- [ ] `ignore_changes` probado (drift externo ignorado)
- [ ] `create_before_destroy` verificado (orden create→destroy)
- [ ] `replace_triggered_by` entendido (opcional)
- [ ] Limpieza: quitar `prevent_destroy` antes de `destroy`

### 12.3. Idea principal

> **`dynamic` = `for_each` para bloques internos. `lifecycle` = guardias de seguridad.**
> `dynamic` evita repetir bloques anidados. `lifecycle` protege contra accidentes y drift.
> **`prevent_destroy` = "piénsalo dos veces". `ignore_changes` = "esto lo gestiona otro". `create_before_destroy` = "cero downtime".**
> **Úsalos juntos: `dynamic` genera, `lifecycle` protege.**
