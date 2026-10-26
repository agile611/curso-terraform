# Salidas (outputs) en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Las salidas (`outputs`) exponen valores calculados tras aplicar la configuración.
Son la interfaz de un módulo: lo que consumen otros módulos, scripts, CI/CD o humanos.
Esta lección cubre declaración, tipos, valores sensibles, precondiciones y consulta programática.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar el propósito de los outputs en módulos raíz e hijos.
- Diferenciar output, variable y local.
- Entender cuándo marcar `sensitive = true`.
- Conocer las precondiciones (`precondition`) para validar salidas.

### 1.2. Objetivos prácticos

También podrás:

- Declarar outputs con valor, descripción, sensitive y precondition.
- Consultar outputs via CLI (`terraform output`), JSON y scripts.
- Exponer referencias a recursos, locales, variables y data sources.
- Validar que las salidas cumplen contratos esperados.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: HCL (03-01), bloques (03-02), variables (03-04), locals (03-05).

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (outputs)              aws_local (verificación)
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

## 4. Bloque `output`

### 4.1. Sintaxis completa

```hcl
output "nombre" {
  value       = expresion           # Referencia a recurso, variable, local, data, etc.
  description = "Qué expone"        # Recomendado: documenta el propósito
  sensitive   = false               # true = oculta en salida (pero guarda en estado)
  precondition {                    # Validación del valor (Terraform 1.7+)
    condition     = expresion_booleana
    error_message = "Mensaje si falla"
  }
}
```

### 4.2. Qué puede exponer un output

```hcl
# Atributo de recurso
output "bucket_arn" { value = aws_s3_bucket.demo.arn }

# Valor de variable
output "region" { value = var.aws_region }

# Valor de local
output "prefix" { value = local.prefix }

# Atributo de data source
output "ami_id" { value = data.aws_ami.latest.id }

# Expresión compleja
output "all_buckets" {
  value = { for k, v in aws_s3_bucket.multiples : k => v.bucket }
}

# Lista de IDs
output "queue_urls" { value = [for q in aws_sqs_queue.multiples : q.id] }
```

---

## 5. Outputs sensibles

### 5.1. Declaración

```hcl
output "db_password" {
  value       = var.db_password
  sensitive   = true
  description = "Contraseña BD (sensible)"
}
```

### 5.2. Comportamiento

| Comando | Comportamiento |
|---------|----------------|
| `terraform plan` | Muestra `(sensitive value)` |
| `terraform apply` | Muestra `(sensitive value)` |
| `terraform output` | Oculta valor (muestra `<sensitive>`) |
| `terraform output -raw` | **Muestra valor real** |
| `terraform output -json` | Incluye `"sensitive": true` |

> **Importante**: `sensitive` oculta en consola, **NO en el estado**. El archivo `terraform.tfstate` guarda el valor real.

### 5.3. Referenciar output sensible en otro módulo

```hcl
# Módulo hijo
output "db_password" { value = var.db_password, sensitive = true }

# Módulo raíz
module "db" { source = "./modules/db" }
# module.db.db_password es sensible automáticamente
```

---

## 6. Precondiciones (Terraform 1.7+)

### 6.1. Sintaxis

```hcl
output "bucket_name" {
  value = aws_s3_bucket.demo.bucket
  precondition {
    condition     = length(aws_s3_bucket.demo.bucket) > 0
    error_message = "Nombre de bucket no puede estar vacío."
  }
}
```

### 6.2. Cuándo se evalúan

- Durante `apply` (tras crear/actualizar recursos).
- Si fallan, `apply` aborta y muestra el mensaje.
- No se evalúan en `plan` (los valores pueden ser unknown).

### 6.3. Ejemplos útiles

```hcl
# Validar ARN no vacío
output "function_arn" {
  value = aws_lambda_function.demo.arn
  precondition {
    condition     = can(regex("^arn:aws:lambda:", aws_lambda_function.demo.arn))
    error_message = "ARN Lambda inválido."
  }
}

# Validar lista no vacía
output "queue_urls" {
  value = [for q in aws_sqs_queue.multiples : q.id]
  precondition {
    condition     = length([for q in aws_sqs_queue.multiples : q.id]) > 0
    error_message = "Debe crearse al menos una cola."
  }
}

# Validar formato
output "endpoint_url" {
  value = "https://${aws_s3_bucket.demo.bucket}.s3.amazonaws.com"
  precondition {
    condition     = can(regex("^https://.*\\.s3\\.amazonaws\\.com$", "https://${aws_s3_bucket.demo.bucket}.s3.amazonaws.com"))
    error_message = "URL endpoint S3 inválida."
  }
}
```

---

## 7. Consulta de outputs

### 7.1. CLI interactiva

```bash
terraform output                    # Todos, formato tabla
terraform output bucket_name        # Uno solo
terraform output -raw bucket_name   # Sin comillas, para scripts
terraform output -json              # JSON completo (incluye sensitive, type)
```

### 7.2. En scripts (Bash)

```bash
# Capturar valor simple
BUCKET=$(terraform output -raw bucket_name)
aws_local s3api head-bucket --bucket "$BUCKET"

# Capturar JSON complejo
CONFIG=$(terraform output -json all_buckets)
echo "$CONFIG" | jq -r '.value | to_entries[] | "\(.key)=\(.value)"'
```

### 7.3. En CI/CD (GitHub Actions, GitLab CI, etc.)

```yaml
# GitHub Actions ejemplo
- name: Terraform Outputs
  id: tf-output
  run: |
    echo "bucket_name=$(terraform output -raw bucket_name)" >> $GITHUB_OUTPUT
    echo "bucket_arn=$(terraform output -raw bucket_arn)" >> $GITHUB_OUTPUT

- name: Use outputs
  run: |
    aws s3api head-bucket --bucket ${{ steps.tf-output.outputs.bucket_name }}
```

---

## 8. Outputs en módulos hijos

### 8.1. Módulo hijo expone

```hcl
# modules/s3-bucket/outputs.tf
output "bucket_name" { value = aws_s3_bucket.main.bucket }
output "bucket_arn"  { value = aws_s3_bucket.main.arn }
output "bucket_domain_name" { value = aws_s3_bucket.main.bucket_domain_name }
```

### 8.2. Módulo raíz consume

```hcl
module "data_bucket" {
  source = "./modules/s3-bucket"
  bucket_name = "tf-data-001"
}

# Referencia: module.data_bucket.bucket_name
output "data_bucket_arn" { value = module.data_bucket.bucket_arn }
```

### 8.3. Sensibilidad heredada

Si el output del hijo tiene `sensitive = true`, la referencia en el padre también es sensible automáticamente.

---

## 9. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p outputs-demo/evidencias
cd outputs-demo
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con outputs variados

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "project" { type = string, default = "outputs-demo" }
variable "env" { type = string, default = "dev" }
variable "db_password" { type = string, sensitive = true }

# locals.tf
locals {
  prefix = "${var.project}-${var.env}"
  tags = { Project = var.project, Env = var.env }
}

# main.tf
resource "aws_s3_bucket" "main" {
  bucket = "${local.prefix}-data"
  tags = local.tags
  versioning { enabled = true }
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.prefix}-logs"
  tags = local.tags
}

resource "aws_sqs_queue" "events" {
  name = "${local.prefix}-events"
}

# outputs.tf
output "data_bucket_name" {
  value       = aws_s3_bucket.main.bucket
  description = "Nombre bucket datos"
}

output "data_bucket_arn" {
  value       = aws_s3_bucket.main.arn
  description = "ARN bucket datos"
  precondition {
    condition     = can(regex("^arn:aws:s3:::", aws_s3_bucket.main.arn))
    error_message = "ARN S3 inválido."
  }
}

output "logs_bucket_name" {
  value       = aws_s3_bucket.logs.bucket
  description = "Nombre bucket logs"
}

output "queue_url" {
  value       = aws_sqs_queue.events.id
  description = "URL cola eventos"
}

output "all_resources" {
  description = "Resumen de recursos creados"
  value = {
    buckets = {
      data  = aws_s3_bucket.main.bucket
      logs  = aws_s3_bucket.logs.bucket
    }
    queue = aws_sqs_queue.events.id
  }
}

output "db_password" {
  value       = var.db_password
  sensitive   = true
  description = "Contraseña BD (sensible)"
  precondition {
    condition     = length(var.db_password) >= 8
    error_message = "Contraseña debe tener al menos 8 caracteres."
  }
}

output "deployment_info" {
  description = "Info de despliegue"
  value = {
    project     = var.project
    environment = var.env
    timestamp   = timestamp()
    deployed_by = "Terraform"
  }
}
```

### Paso 3: Desplegar y consultar outputs

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=outputs.tfplan
terraform apply outputs.tfplan
```

### Paso 4: Consultar outputs (CLI)

```bash
# Todos
terraform output

# Uno solo
terraform output data_bucket_name
terraform output -raw data_bucket_name

# JSON (para scripts)
terraform output -json | jq '.data_bucket_name.value'
terraform output -json data_bucket_arn | jq -r '.value'

# Sensible
terraform output db_password          # Muestra <sensitive>
terraform output -raw db_password     # Muestra valor real
```

### Paso 5: Verificar con aws_local

```bash
# Usar outputs en verificación
BUCKET=$(terraform output -raw data_bucket_name)
aws_local s3api head-bucket --bucket "$BUCKET"
aws_local s3api get-bucket-versioning --bucket "$BUCKET"

QUEUE=$(terraform output -raw queue_url)
aws_local sqs get-queue-attributes --queue-url "$QUEUE" --attribute-names All
```

### Paso 6: Probar precondición fallida

```bash
# Cambiar db_password a valor corto
terraform apply -var="db_password=short" -auto-approve
# Debe fallar en precondición del output db_password
```

### Paso 7: Limpiar

```bash
terraform destroy -auto-approve
aws_local s3api list-buckets
aws_local sqs list-queues
docker compose down
```

---

## 10. Sesiones guiadas

### 10.1. Sesión 1: Outputs básicos y consulta (25 min)

1. Declarar outputs: recurso, local, expresión compleja, mapa
2. `terraform output`, `-raw`, `-json`
3. Usar outputs en script Bash para verificación `aws_local`
4. **Entrega**: Script que usa outputs + verificación exitosa

### 10.2. Sesión 2: Sensibles y precondiciones (30 min)

1. Variable + output `sensitive = true` → verificar ocultamiento
2. Output con `precondition` válida → apply OK
3. Output con `precondition` inválida → apply falla con mensaje
4. **Entrega**: Evidencia output sensible + precondición fallando/éxito

### 10.3. Sesión 3: Módulos y CI/CD (25 min)

1. Crear módulo hijo con outputs
2. Módulo raíz consume outputs del hijo
3. Simular uso en CI/CD (capturar outputs en variables)
4. Limpiar
5. **Entrega**: Estructura módulo padre/hijo + script CI simulado

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Para cada caso, ¿output, variable o local?

1. Valor que el usuario provee al ejecutar
2. Valor calculado a partir de variables
3. ARN del bucket para que lo use otro módulo
4. Contraseña que no debe verse en logs
5. Nombre del bucket para script de verificación

### 11.2. Ejercicio de interpretación

Dado:
```hcl
output "x" { value = aws_s3_bucket.demo.bucket, sensitive = true }
output "y" { value = output.x }
```
¿Es `output.y` sensible? ¿Por qué?

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera outputs para un módulo que crea:
- Bucket S3 (nombre, ARN, domain_name, versioning_enabled)
- Cola SQS (URL, ARN)
- Función Lambda (nombre, ARN, invoke_arn)
Incluye: descriptions, precondiciones válidas (ARN format, no vacío), sensitive donde corresponda.
```

---

## 12. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Outputs | ✅ Idéntico | ✅ |
| `sensitive` | ✅ | ✅ |
| `precondition` | ✅ (Terraform 1.7+) | ✅ |
| Consulta CLI/JSON | ✅ | ✅ |

---

## 13. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `Output references sensitive value` | Output usa valor sensible sin `sensitive=true` | Añadir `sensitive = true` al output |
| `Precondition failed` | Condición `precondition` falsa | Corregir valor o ajustar condición |
| `Output value not known` | Valor `known after apply` en precondition | Precondiciones no se evalúan en plan |
| `Output not found` | Nombre incorrecto al consultar | Verificar nombre exacto en `terraform output` |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Outputs básicos | No declara | Declara simples | Declara recurso, local, expresión, mapa |
| Consulta CLI | No usa | `output` básico | `-raw`, `-json`, scripts, CI |
| Sensibles | No usa | Marca variable | Marca output + explica límite estado |
| Precondiciones | No usa | Una simple | Múltiples + mensajes claros + falla/éxito |
| Módulos | No usa | Entiende concepto | Padre/hijo + sensibilidad heredada |

### 14.2. Checklist final

- [ ] Outputs para recursos, locals, expresiones complejas
- [ ] `description` en todos los outputs
- [ ] `sensitive = true` donde corresponde + output sensible
- [ ] `precondition` en al menos 2 outputs con mensajes claros
- [ ] Consulta via `terraform output -raw` y `-json`
- [ ] Script usa outputs para verificación `aws_local`
- [ ] Módulo hijo expone outputs, padre consume
- [ ] Limpieza completa

### 14.3. Idea principal

> **Outputs = contrato de la configuración.**
> Documentan qué expone el módulo. `description` es obligatoria.
> `sensitive` protege la consola, `precondition` protege la integridad.
> **Consulta programática (`-json`, `-raw`) = integración con CI/CD y scripts.**
