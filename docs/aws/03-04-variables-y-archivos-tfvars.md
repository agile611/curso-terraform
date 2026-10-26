# Variables y archivos tfvars en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Las variables permiten parametrizar la configuración para reutilizarla en distintos entornos.
Los archivos `.tfvars` separan los valores de la lógica, facilitando la gestión de múltiples entornos.
Esta lección cubre declaración, validación, precedencia, archivos tfvars y variables sensibles.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar el propósito de las variables de entrada.
- Diferenciar variable, local y output.
- Entender la precedencia de valores (default, tfvars, CLI, env).
- Identificar cuándo usar `sensitive = true`.
- Distinguir validación de tipo vs validación de negocio.

### 1.2. Objetivos prácticos

También podrás:

- Declarar variables con tipo, descripción, validación y default.
- Crear archivos `.tfvars` para entornos (dev, staging, prod).
- Cargar variables via `-var-file`, `-var` y variables de entorno.
- Proteger valores sensibles en outputs y logs.
- Validar formatos (nombres, CIDR, puertos, etc.).

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
Terraform (variables)            aws_local (verificación)
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

## 4. Declaración de variables

### 4.1. Sintaxis completa

```hcl
variable "nombre" {
  type        = string           # Tipo: string, number, bool, list, map, object, tuple, set, any
  default     = "valor"          # Opcional: hace la variable opcional
  description = "Descripción"    # Recomendado: documenta el propósito
  validation {                   # Opcional: reglas de validación
    condition     = expresion_booleana
    error_message = "Mensaje si falla"
  }
  sensitive = false              # true = oculta en salida (pero guarda en estado)
  nullable  = true               # false = no permite null
}
```

### 4.2. Tipos comunes

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

### 4.3. Validaciones útiles

```hcl
# Nombre bucket S3
variable "bucket_name" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Nombre bucket inválido: 3-63 chars, minúsculas, números, guiones."
  }
}

# Puerto TCP
variable "puerto" {
  type = number
  validation {
    condition     = var.puerto > 0 && var.puerto <= 65535
    error_message = "Puerto debe estar entre 1 y 65535."
  }
}

# CIDR válido
variable "vpc_cidr" {
  type = string
  validation {
    condition     = can(regex("^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(/([0-9]|[1-2][0-9]|3[0-2]))?$", var.vpc_cidr))
    error_message = "CIDR inválido (ej. 10.0.0.0/16)."
  }
}

# Enum (valores permitidos)
variable "entorno" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.entorno)
    error_message = "Entorno debe ser: dev, staging o prod."
  }
}
```

---

## 5. Archivos `.tfvars`

### 5.1. Sintaxis

```hcl
# dev.tfvars
bucket_name = "tf-dev-datos-001"
entorno     = "dev"
replicas    = 1
tags = {
  Entorno = "dev"
  Equipo  = "plataforma"
}
```

```hcl
# prod.tfvars
bucket_name = "tf-prod-datos-001"
entorno     = "prod"
replicas    = 3
tags = {
  Entorno = "prod"
  Equipo  = "plataforma"
  Critico = "true"
}
```

### 5.2. Carga automática

Terraform carga automáticamente:
- `terraform.tfvars`
- `terraform.tfvars.json`
- `*.auto.tfvars`
- `*.auto.tfvars.json`

### 5.3. Carga explícita

```bash
terraform plan -var-file=dev.tfvars
terraform apply -var-file=prod.tfvars
terraform plan -var-file=dev.tfvars -var-file=common.tfvars
```

---

## 6. Precedencia de valores

Orden de mayor a menor prioridad:

1. **Variables de entorno** `TF_VAR_nombre`
2. **Línea de comandos** `-var="nombre=valor"` / `-var-file=archivo`
3. **Archivos `.tfvars`** (explícitos o automáticos)
4. **Default** en la declaración `variable "x" { default = "y" }`
5. **Error** si no hay default y no se proporciona valor

### 6.1. Variables de entorno

```bash
export TF_VAR_bucket_name="tf-env-datos-001"
export TF_VAR_entorno="staging"
terraform plan  # Usa TF_VAR_*
```

### 6.2. Línea de comandos

```bash
terraform plan -var="bucket_name=tf-cli-001" -var="replicas=2"
```

---

## 7. Variables sensibles

### 7.1. Declaración

```hcl
variable "db_password" {
  type      = string
  sensitive = true
  description = "Contraseña base de datos (no hardcodear en tfvars)"
}
```

### 7.2. Comportamiento

- `terraform plan` / `apply`: muestra `(sensitive value)` en lugar del valor.
- `terraform output`: oculta valor salvo `-raw` (pero sigue en estado).
- **El estado (`terraform.tfstate`) SÍ guarda el valor real**.

> **Advertencia**: `sensitive` no cifra ni protege en el estado. Solo oculta en salida de consola.

### 7.3. Outputs sensibles

```hcl
output "db_password" {
  value       = var.db_password
  sensitive   = true
  description = "Contraseña BD (sensible)"
}
```

---

## 8. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p variables-tfvars/evidencias
cd variables-tfvars
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con variables

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "project" { type = string, default = "tfvars-demo" }
variable "entorno" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.entorno)
    error_message = "Entorno: dev, staging, prod."
  }
}
variable "replicas" { type = number, default = 1 }
variable "bucket_name" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Nombre bucket inválido."
  }
}
variable "db_password" { type = string, sensitive = true }

# locals.tf
locals {
  prefix = "${var.project}-${var.entorno}"
  tags = { Project = var.project, Entorno = var.entorno }
}

# main.tf
resource "aws_s3_bucket" "demo" {
  bucket = var.bucket_name \!= "" ? var.bucket_name : "${local.prefix}-datos"
  tags = local.tags
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.demo.bucket }
output "db_password" { value = var.db_password, sensitive = true }
```

### Paso 3: Crear archivos tfvars

```bash
# dev.tfvars
cat > dev.tfvars << 'EOF'
entorno     = "dev"
replicas    = 1
bucket_name = "tf-dev-datos-001"
db_password = "dev-password-123"
EOF

# prod.tfvars
cat > prod.tfvars << 'EOF'
entorno     = "prod"
replicas    = 3
bucket_name = "tf-prod-datos-001"
db_password = "prod-secret-456"
EOF
```

### Paso 4: Probar precedencia

```bash
terraform init
terraform fmt
terraform validate

# 1. Solo defaults
terraform plan

# 2. Con dev.tfvars (carga automática si se llama terraform.tfvars)
cp dev.tfvars terraform.tfvars
terraform plan

# 3. Explícito prod.tfvars
terraform plan -var-file=prod.tfvars

# 4. Sobrescribir con -var
terraform plan -var-file=prod.tfvars -var="replicas=5"

# 5. Variable de entorno
export TF_VAR_bucket_name="tf-env-001"
terraform plan -var-file=prod.tfvars
```

### Paso 5: Desplegar y verificar

```bash
terraform apply -var-file=dev.tfvars -auto-approve
aws_local s3api head-bucket --bucket tf-dev-datos-001

terraform apply -var-file=prod.tfvars -auto-approve
aws_local s3api head-bucket --bucket tf-prod-datos-001
```

### Paso 6: Limpiar

```bash
terraform destroy -var-file=prod.tfvars -auto-approve
terraform destroy -var-file=dev.tfvars -auto-approve
aws_local s3api list-buckets
docker compose down
```

---

## 9. Sesiones guiadas

### 9.1. Sesión 1: Declaración y validación (25 min)

1. Declarar variables con tipos, validaciones, sensitive
2. `terraform validate` → probar validaciones con valores inválidos
3. **Entrega**: `variables.tf` + evidencia validaciones funcionando

### 9.2. Sesión 2: Archivos tfvars y precedencia (30 min)

1. Crear `dev.tfvars`, `staging.tfvars`, `prod.tfvars`
2. Probar carga automática, explícita, `-var`, `TF_VAR_`
3. Documentar precedencia observada
4. **Entrega**: Tabla de precedencia + evidencias

### 9.3. Sesión 3: Sensibles y limpieza (20 min)

1. Variable `sensitive` + output `sensitive`
2. Verificar ocultamiento en `plan`/`apply`/`output`
3. `terraform destroy` → limpiar
4. **Entrega**: Evidencia valor sensible oculto en salida pero en estado

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Para cada caso, indica qué mecanismo usar:

1. Valor por defecto para variable opcional
2. Valores por entorno (dev/staging/prod)
3. Sobrescribir un valor en CI/CD pipeline
4. Contraseña que no debe aparecer en logs
5. Validar que un string es un email válido

### 10.2. Ejercicio de interpretación

Dado:
- `variable "x" { default = "A" }`
- `terraform.tfvars`: `x = "B"`
- `prod.tfvars`: `x = "C"`
- `TF_VAR_x="D"`
- `terraform apply -var-file=prod.tfvars -var="x=E"`

¿Cuál es el valor final de `x`? Explica la precedencia.

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un conjunto de variables para configurar un bucket S3 con:
- Nombre (validación S3)
- Versionado (bool, default false)
- Tags obligatorios: Project, Environment, Owner
- Tags opcionales: CostCenter, BackupPolicy
- KMS key ARN (opcional, validación ARN)
Incluye: types, validations, descriptions, sensitive donde corresponda.
```

---

## 11. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Variables Terraform | ✅ Idéntico | ✅ |
| Validaciones | ✅ | ✅ |
| `sensitive` | ✅ (oculta en salida) | ✅ |
| Estado guarda sensibles | ✅ | ✅ |

---

## 12. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `Variable not found` | Referencia a variable no declarada | Declarar variable o corregir nombre |
| `Validation failed` | Valor no pasa `validation` | Corregir valor o ajustar regex |
| `Value for undeclared variable` | `-var` para variable inexistente | Declarar variable o quitar `-var` |
| `Required variable not set` | Sin default ni valor proporcionado | Proveer valor o añadir default |
| `sensitive value` en output | Output referencia variable sensible | Marcar output `sensitive = true` |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Declaración | Sin tipo/validación | Tipo básico | Tipo + validación + descripción + sensitive |
| tfvars | No usa | Un archivo | Múltiples entornos + precedencia demostrada |
| Precedencia | No entiende | Entiende básica | Demuestra 4+ niveles |
| Sensibles | No usa | Marca variable | Marca variable + output + explica límite estado |

### 13.2. Checklist final

- [ ] Variables con `type`, `description`, `validation`, `default`
- [ ] Archivos `dev.tfvars`, `staging.tfvars`, `prod.tfvars`
- [ ] Precedencia probada: default < tfvars < -var < TF_VAR
- [ ] Variable `sensitive = true` + output `sensitive = true`
- [ ] Validaciones regex para nombres, CIDR, puertos, enums
- [ ] `terraform plan` con diferentes combinaciones
- [ ] Limpieza completa

### 13.3. Idea principal

> **Variables = parámetros; tfvars = entornos; precedencia = control.**
> Valida en la declaración, no en el apply.
> **`sensitive` oculta en consola, NO en el estado. Protege el estado.**
