# Data sources y referencias a recursos en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Las data sources (`data`) permiten leer información de recursos existentes (creados fuera de Terraform, por otro módulo, o por AWS).
A diferencia de los `resource`, no gestionan el ciclo de vida: solo consultan.
Esta lección enseña a usar data sources para AWS, referenciar sus atributos, y combinarlas con recursos gestionados.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar `resource` (gestiona) vs `data` (lee).
- Explicar cuándo usar data sources vs variables vs outputs.
- Entender que las data sources se evalúan en `plan` y `apply`.
- Identificar data sources comunes de AWS (AMI, VPC, bucket, IAM, etc.).

### 1.2. Objetivos prácticos

También podrás:

- Declarar data sources para S3, IAM, SSM, etc.
- Referenciar atributos de data sources en recursos y outputs.
- Usar data sources para evitar hardcodear valores (AMI IDs, ARNs, nombres).
- Manejar data sources que pueden no encontrar resultados (`count` condicional).

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: recursos, variables, outputs, referencias.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (data sources)           aws_local (verificación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3, IAM, SSM)
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,iam,ssm
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

## 4. Data sources vs Resources

| Aspecto | `resource` | `data` |
|---------|------------|--------|
| **Propósito** | Gestiona ciclo de vida (crea/actualiza/destruye) | Solo lee (consulta) |
| **Estado** | Guarda en `terraform.tfstate` | No guarda (solo en memoria durante plan/apply) |
| **Idempotencia** | Sí (convergencia) | N/A (solo lectura) |
| **Drivers** | Proveedor implementa CRUD | Proveedor implementa READ |
| **Ejemplos** | `aws_s3_bucket`, `aws_iam_role` | `aws_s3_bucket`, `aws_ami`, `aws_iam_policy` |

### 4.1. Sintaxis

```hcl
data "aws_s3_bucket" "existente" {
  bucket = "bucket-creado-fuera"
}

# Uso en recurso
resource "aws_s3_object" "doc" {
  bucket = data.aws_s3_bucket.existente.bucket
  key    = "archivo.txt"
  content = "Hola"
}
```

---

## 5. Data sources comunes de AWS

### 5.1. S3

```hcl
# Bucket existente por nombre
data "aws_s3_bucket" "por_nombre" {
  bucket = "mi-bucket-existente"
}

# Bucket existente por ID (arn)
data "aws_s3_bucket" "por_arn" {
  bucket = "arn:aws:s3:::mi-bucket"
}
```

### 5.2. IAM

```hcl
# Política AWS gestionada
data "aws_iam_policy" "readonly_s3" {
  arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Rol existente
data "aws_iam_role" "lambda_exec" {
  name = "mi-rol-lambda"
}

# Usuario actual (caller identity)
data "aws_caller_identity" "actual" {}
```

### 5.3. SSM Parameter Store

```hcl
# Parámetro string
data "aws_ssm_parameter" "db_password" {
  name = "/mi-app/prod/db/password"
}

# Parámetro SecureString (descifrado automático con with_decryption)
data "aws_ssm_parameter" "api_key" {
  name = "/mi-app/prod/api-key"
  with_decryption = true
}
```

### 5.4. Otros útiles

```hcl
# Regiones disponibles
data "aws_regions" "disponibles" {}

# Partición AWS (aws, aws-cn, aws-us-gov)
data "aws_partition" "actual" {}

# Documento de política IAM (construir JSON)
data "aws_iam_policy_document" "s3_read" {
  statement {
    actions = ["s3:GetObject", "s3:ListBucket"]
    resources = ["arn:aws:s3:::mi-bucket", "arn:aws:s3:::mi-bucket/*"]
  }
}
```

---

## 6. Referenciando atributos

### 6.1. Sintaxis

```hcl
data "TIPO" "NOMBRE" { ... }

# Atributos: data.TIPO.NOMBRE.ATRIBUTO
data.aws_s3_bucket.existente.bucket
data.aws_s3_bucket.existente.arn
data.aws_s3_bucket.existente.bucket_domain_name
data.aws_iam_policy.readonly_s3.arn
data.aws_ssm_parameter.db_password.value
```

### 6.2. En recursos

```hcl
resource "aws_s3_object" "doc" {
  bucket = data.aws_s3_bucket.existente.bucket
  key    = "docs/archivo.txt"
  content = "Contenido"
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.lambda.name
  policy_arn = data.aws_iam_policy.readonly_s3.arn
}
```

### 6.3. En outputs

```hcl
output "bucket_arn" { value = data.aws_s3_bucket.existente.arn }
output "caller_account" { value = data.aws_caller_identity.actual.account_id }
```

---

## 7. Data sources condicionales

### 7.1. `count` para data source opcional

```hcl
variable "bucket_existente" { type = string, default = "" }

data "aws_s3_bucket" "opcional" {
  count = var.bucket_existente \!= "" ? 1 : 0
  bucket = var.bucket_existente
}

# Uso condicional
resource "aws_s3_object" "doc" {
  bucket = var.bucket_existente \!= "" ? data.aws_s3_bucket.opcional[0].bucket : aws_s3_bucket.nuevo.bucket
}
```

### 7.2. Manejo de "no encontrado"

Si la data source no encuentra el recurso, Terraform falla en `plan`/`apply`.
Para hacerlo opcional sin fallar, usar `count` como arriba o `try()` en expresiones (Terraform 1.7+):

```hcl
# Terraform 1.7+
locals {
  bucket_arn = try(data.aws_s3_bucket.opcional.arn, "no-encontrado")
}
```

---

## 8. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p data-sources/evidencias
cd data-sources
docker compose up -d
source .env.localstack
```

### Paso 2: Crear recursos "externos" con aws_local (simulan recursos preexistentes)

```bash
# Bucket externo
aws_local s3api create-bucket --bucket externo-preexistente-001
aws_local s3api put-bucket-tagging --bucket externo-preexistente-001 --tagging 'TagSet=[{Key=Origen,Value=Externo}]'

# Parámetro SSM externo
aws_local ssm put-parameter --name /externo/db/password --value "secret-externo-123" --type SecureString

# Política IAM AWS (simulada - en LocalStack puede no existir todas)
# Usaremos data source de caller_identity que siempre existe
```

### Paso 3: Configuración con data sources

```hcl
# versions.tf, providers.tf (estándar + iam, ssm endpoints)

# variables.tf
variable "project" { type = string, default = "ds-demo" }

# main.tf
# 1. Data source: bucket externo
data "aws_s3_bucket" "externo" {
  bucket = "externo-preexistente-001"
}

# 2. Data source: caller identity (siempre disponible)
data "aws_caller_identity" "actual" {}

# 3. Data source: política AWS gestionada (puede no existir en LocalStack)
# data "aws_iam_policy" "s3_readonly" {
#   arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
# }

# 4. Data source: parámetro SSM (simulado - en LocalStack SSM básico)
# data "aws_ssm_parameter" "externo_pass" {
#   name = "/externo/db/password"
#   with_decryption = true
# }

# 5. Data source: documento de política IAM (construcción local)
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "AllowS3Read"
    actions = ["s3:GetObject", "s3:ListBucket"]
    resources = [
      data.aws_s3_bucket.externo.arn,
      "${data.aws_s3_bucket.externo.arn}/*"
    ]
  }
}

# 5. Recurso que usa data sources
resource "aws_s3_bucket" "demo" {
  bucket = "tf-ds-demo-001"
  tags = {
    Leccion = "DataSources"
    Owner   = data.aws_caller_identity.actual.account_id
  }
}

resource "aws_s3_object" "desde_externo" {
  bucket = data.aws_s3_bucket.externo.bucket
  key    = "copiado-desde-externo.txt"
  content = "Copiado desde bucket externo: ${data.aws_s3_bucket.externo.bucket}"
}

# outputs.tf
output "externo_bucket_name" { value = data.aws_s3_bucket.externo.bucket }
output "externo_bucket_arn"  { value = data.aws_s3_bucket.externo.arn }
output "caller_account"      { value = data.aws_caller_identity.actual.account_id }
output "caller_user"         { value = data.aws_caller_identity.actual.user_id }
output "policy_doc_json"     { value = data.aws_iam_policy_document.s3_access.json }
output "demo_bucket"         { value = aws_s3_bucket.demo.bucket }
```

### Paso 4: Desplegar y verificar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=ds.tfplan
terraform show ds.tfplan
# Observar: data sources consultados en plan

terraform apply ds.tfplan

# Verificar
aws_local s3api head-bucket --bucket tf-ds-demo-001
aws_local s3api get-object --bucket externo-preexistente-001 --key copiado-desde-externo.txt /tmp/copiado.txt
cat /tmp/copiado.txt

# Verificar outputs
terraform output
terraform output -json | jq .
```

### Paso 5: Data source condicional

```hcl
# Añadir a variables.tf
variable "bucket_opcional" { type = string, default = "" }

# Añadir a main.tf
data "aws_s3_bucket" "opcional" {
  count = var.bucket_opcional \!= "" ? 1 : 0
  bucket = var.bucket_opcional
}

# Output condicional
output "opcional_bucket" {
  value = var.bucket_opcional \!= "" ? data.aws_s3_bucket.opcional[0].bucket : "no proporcionado"
}
```

```bash
# Probar sin bucket opcional
terraform plan -out=ds2.tfplan
terraform apply ds2.tfplan

# Probar con bucket opcional
terraform plan -var="bucket_opcional=externo-preexistente-001" -out=ds3.tfplan
terraform apply ds3.tfplan
```

### Paso 6: Data source `aws_iam_policy_document` (construcción local)

```bash
# Verificar output policy_doc_json
terraform output -raw policy_doc_json | jq .
# Debe mostrar JSON de política con statement referenciando ARN del bucket externo
```

### Paso 7: Limpiar

```bash
terraform destroy -auto-approve

# Limpiar recursos externos creados con aws_local
aws_local s3api delete-bucket --bucket externo-preexistente-001
aws_local ssm delete-parameter --name /externo/db/password

aws_local s3api list-buckets
docker compose down
```

---

## 9. Sesiones guiadas

### 9.1. Sesión 1: Data sources básicos (25 min)

1. Declarar `data.aws_s3_bucket`, `data.aws_caller_identity`, `data.aws_iam_policy_document`
2. `plan` → observar consultas en plan
3. `apply` → verificar outputs y uso en recursos
4. **Entrega**: Configuración + plan + outputs + verificación

### 9.2. Sesión 2: Data sources condicionales y SSM/IAM (30 min)

1. `data` con `count` condicional
2. `data.aws_iam_policy_document` construyendo JSON
3. (Opcional) `data.aws_ssm_parameter` si SSM disponible
4. **Entrega**: Data source condicional + policy document JSON

### 9.3. Sesión 3: Referencias y limpieza (20 min)

1. Usar atributos de data sources en recursos, outputs, locals
2. Verificar que data sources NO aparecen en `terraform state list`
3. Limpiar
4. **Entrega**: Evidencia data sources solo en plan, no en estado

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Para cada caso, ¿`resource` o `data`?

1. Crear bucket S3 nuevo
2. Leer ARN de bucket existente
3. Crear rol IAM
4. Leer ARN de política AWS gestionada
5. Crear parámetro SSM
6. Leer parámetro SSM existente
7. Construir documento de política IAM (JSON)

### 10.2. Ejercicio de interpretación

Dado:
```hcl
data "aws_s3_bucket" "b" { bucket = "existe" }
resource "aws_s3_object" "o" { bucket = data.aws_s3_bucket.b.bucket, key = "x", content = "y" }
```
1. ¿Aparece `data.aws_s3_bucket.b` en `terraform state list`?
2. Si el bucket "existe" se borra externamente, ¿qué pasa en `terraform plan`?
3. ¿Se puede usar `data.aws_s3_bucket.b.arn` en `lifecycle { ignore_changes }`?

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración que:
- Use data source para leer bucket existente (nombre por variable)
- Use data source para caller_identity
- Use data source aws_iam_policy_document para crear política que permita PutObject en ese bucket
- Cree un recurso aws_iam_policy con ese documento
- Cree un recurso aws_iam_role con assume_role para lambda.amazonaws.com
- Adjunte la política al rol
Incluye: outputs para ARN de política, ARN de rol, nombre de bucket.
```

---

## 11. Limitaciones LocalStack

| Data Source | LocalStack | AWS Real |
|-------------|------------|----------|
| `aws_s3_bucket` | ✅ | ✅ |
| `aws_caller_identity` | ✅ | ✅ |
| `aws_iam_policy` | ⚠️ Parcial (pocas managed policies) | ✅ |
| `aws_iam_policy_document` | ✅ (local) | ✅ |
| `aws_ssm_parameter` | ⚠️ Básico | ✅ |
| `aws_ami` | ❌ | ✅ |
| `aws_vpc` | ⚠️ Parcial | ✅ |
| `aws_availability_zones` | ⚠️ Parcial | ✅ |

---

## 12. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `data source not found` | Tipo incorrecto | Verificar nombre: `aws_s3_bucket`, no `aws_s3_bucket_v2` |
| `no matching resource found` | Recurso no existe | Verificar nombre/ID, usar `count` condicional |
| `data source reads during apply` | Valor unknown en plan | Normal para data sources; usar `-refresh-only` si necesario |
| `InvalidParameter` en SSM | Parámetro no existe o sin decrypt | Verificar nombre, `with_decryption = true` para SecureString |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Data sources básicos | No usa | 1-2 básicos | 3+ (S3, IAM, SSM, caller, policy_doc) |
| Referencias | No referencia | Básicas | En recursos, outputs, locals, policy_doc |
| Condicionales | No usa | `count` simple | `count` + `try()` (1.7+) |
| Diferencia resource/data | Confunde | Entiende básico | Explica: estado, ciclo de vida, drift |

### 13.2. Checklist final

- [ ] `data.aws_s3_bucket` leyendo bucket externo
- [ ] `data.aws_caller_identity` para account_id
- [ ] `data.aws_iam_policy_document` construyendo JSON
- [ ] (Opcional) `data.aws_ssm_parameter` con `with_decryption`
- [ ] Atributos de data sources usados en recursos y outputs
- [ ] Data source condicional con `count`
- [ ] Verificación: data sources NO en `terraform state list`
- [ ] Limpieza completa

### 13.3. Idea principal

> **`resource` = escribe (gestiona). `data` = lee (consulta).**
> Data sources evitan hardcodear: AMI IDs, ARNs, nombres, parámetros.
> Se evalúan en `plan` y `apply`. No dejan rastro en el estado.
> **Úsalas para conectar lo que Terraform gestiona con lo que ya existe.**
