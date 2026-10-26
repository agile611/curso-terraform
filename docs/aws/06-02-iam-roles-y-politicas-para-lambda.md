# IAM: roles y políticas para Lambda con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Las funciones Lambda necesitan un rol de ejecución (execution role) con permisos para acceder a otros servicios.
Este rol define qué puede hacer la función: escribir logs, leer colas, consultar bases de datos, etc.
Terraform permite declarar el rol, sus políticas y adjuntarlas de forma declarativa.
LocalStack permite practicar la creación y validación de roles y políticas IAM localmente.

En esta lección construirás un rol de ejecución para Lambda con permisos mínimos (least privilege).
Practicarás políticas inline, managed policies, y condiciones.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un rol de ejecución para Lambda (`aws_iam_role`).
- Definir política de confianza (`assume_role_policy`) para `lambda.amazonaws.com`.
- Escribir políticas inline (`aws_iam_role_policy`) con least privilege.
- Usar políticas managed de AWS (`aws_iam_policy` + `aws_iam_role_policy_attachment`).
- Aplicar condiciones en políticas (ej. `StringEquals`, `ArnLike`).
- Validar permisos efectivos con `aws_local iam simulate-principal-policy`.

### 1.2. Resultado práctico

Un rol Lambda con políticas para: Logs, SQS, DynamoDB, S3, con condiciones de origen.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

Conocimientos: Lambda básico (06-01), recursos Terraform, JSON policy documents.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (IAM)                    aws_local (validación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack IAM)
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: iam,sts,lambda,logs,sqs,dynamodb,s3
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

---

## 4. Conceptos IAM para Lambda

### 4.1. Rol de ejecución (Execution Role)

Es un rol IAM que Lambda asume al ejecutar la función.
Debe tener política de confianza (`assume_role_policy`) permitiendo `lambda.amazonaws.com`.

### 4.2. Tipos de políticas

| Tipo | Recurso Terraform | Uso |
|------|-------------------|-----|
| **Confianza** | `assume_role_policy` en `aws_iam_role` | Quién puede asumir el rol |
| **Inline** | `aws_iam_role_policy` | Permisos específicos del rol |
| **Managed** | `aws_iam_policy` + `aws_iam_role_policy_attachment` | Políticas reutilizables (AWS o custom) |

### 4.3. Principio de menor privilegio (Least Privilege)

- Otorgar solo permisos necesarios.
- Restringir recursos (ARNs específicos, no `*`).
- Usar condiciones (`Condition`) para limitar contexto.

---

## 5. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p iam-lambda/evidencias
cd iam-lambda
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Configuración Terraform - Rol básico

```hcl
# versions.tf, providers.tf (estándar + iam endpoint)

# variables.tf
variable "project" { type = string, default = "iam-lambda" }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "IAM-Lambda" }
}

# main.tf
# 1. Rol de ejecución para Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "${local.prefix}-lambda-exec-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  
  tags = local.tags
}

# 2. Política inline: Logs (básico obligatorio)
resource "aws_iam_role_policy" "logs" {
  name = "${local.prefix}-logs-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

# 3. Política inline: SQS (leer/eliminar mensajes)
resource "aws_iam_role_policy" "sqs" {
  name = "${local.prefix}-sqs-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ]
      Resource = "arn:aws:sqs:*:*:*"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}

# 4. Política inline: DynamoDB (PutItem, GetItem, Query)
resource "aws_iam_role_policy" "dynamodb" {
  name = "${local.prefix}-dynamodb-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ]
      Resource = "arn:aws:dynamodb:*:*:table/*"
      Condition = {
        StringEquals = {
          "dynamodb:LeadingKeys" = ["*"]
        }
      }
    }]
  })
}

# 5. Política inline: S3 (GetObject en bucket específico)
resource "aws_iam_role_policy" "s3" {
  name = "${local.prefix}-s3-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::mi-bucket-especifico/*"
      Condition = {
        StringEquals = {
          "s3:ExistingObjectTag/Procesado" = "true"
        }
      }
    }]
  })
}

# Data source para account ID
data "aws_caller_identity" "current" {}

# outputs.tf
output "role_arn" { value = aws_iam_role.lambda_exec.arn }
output "role_name" { value = aws_iam_role.lambda_exec.name }
```

### Paso 3: Desplegar y validar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=iam.tfplan
terraform show iam.tfplan
# Verificar: rol + 4 políticas inline

terraform apply iam.tfplan
```

### Paso 4: Validar con aws_local

```bash
# Ver rol
aws_local iam get-role --role-name iam-lambda-lambda-exec-role

# Listar políticas adjuntas
aws_local iam list-role-policies --role-name iam-lambda-lambda-exec-role

# Ver política específica
aws_local iam get-role-policy --role-name iam-lambda-lambda-exec-role --policy-name iam-lambda-logs-policy

# Simular permisos (simulate-principal-policy)
aws_local iam simulate-principal-policy \
  --policy-source-arn $(terraform output -raw role_arn) \
  --action-names logs:CreateLogGroup sqs:ReceiveMessage dynamodb:PutItem s3:GetObject \
  --resource-arns "arn:aws:logs:us-east-1:000000000000:log-group:*" "arn:aws:sqs:us-east-1:000000000000:mi-cola" "arn:aws:dynamodb:us-east-1:000000000000:table/mi-tabla" "arn:aws:s3:::mi-bucket/objeto.txt"
```

### Paso 5: Políticas Managed (alternativa)

```hcl
# Política managed personalizada (reutilizable)
resource "aws_iam_policy" "lambda_basica" {
  name = "${local.prefix}-lambda-basica"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "*"
    }]
  })
}

# Adjuntar al rol
resource "aws_iam_role_policy_attachment" "attach_basica" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_basica.arn
}

# Adjuntar política AWS managed (ej. AWSLambdaBasicExecutionRole)
resource "aws_iam_role_policy_attachment" "aws_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

### Paso 6: Condiciones avanzadas

```hcl
# Ejemplo: Condición por tag de recurso
resource "aws_iam_role_policy" "s3_condicional" {
  name = "${local.prefix}-s3-condicional"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject"]
      Resource = "arn:aws:s3:::mi-bucket/*"
      Condition = {
        StringEquals = {
          "s3:ExistingObjectTag/Ambiente" = "produccion"
        }
      }
    }]
  })
}

# Ejemplo: Condición por IP de origen (si Lambda en VPC)
resource "aws_iam_role_policy" "ip_condition" {
  name = "${local.prefix}-ip-condition"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["dynamodb:*"]
      Resource = "*"
      Condition = {
        IpAddress = { "aws:SourceIp" = ["10.0.0.0/8"] }
      }
    }]
  })
}
```

### Paso 7: Limpiar

```bash
terraform destroy -auto-approve
aws_local iam list-roles | jq '.Roles[] | select(.RoleName | startswith("iam-lambda"))'
docker compose down
```

---

## 6. Sesiones guiadas

### 6.1. Sesión 1: Rol y políticas básicas (30 min)

1. Crear rol + assume_role_policy
2. Añadir políticas inline: Logs, SQS, DynamoDB
3. `apply` → validar con `aws_local iam get-role-policy`
4. **Entrega**: Rol + 3 políticas inline + validación

### 6.2. Sesión 2: Condiciones y managed policies (30 min)

1. Añadir condiciones (StringEquals, ArnLike) a políticas
2. Crear política managed + attachment
3. Adjuntar AWS managed policy
4. **Entrega**: Políticas con condiciones + managed policy

### 6.3. Sesión 3: Simulación y limpieza (25 min)

1. `simulate-principal-policy` para validar permisos
2. Probar acciones permitidas/denegadas
3. `destroy` → limpiar
4. **Entrega**: Resultado simulación + limpieza

---

## 7. Ejercicios de refuerzo

### 7.1. Ejercicio de identificación

Diferencia entre:
- `assume_role_policy` vs `policy` en `aws_iam_role`
- `aws_iam_role_policy` vs `aws_iam_policy` + `aws_iam_role_policy_attachment`
- `Condition` con `StringEquals` vs `ArnLike` vs `IpAddress`

### 7.2. Ejercicio de interpretación

Una política permite `s3:GetObject` en `arn:aws:s3:::mi-bucket/*` con condición `StringEquals: { "s3:ExistingObjectTag/Procesado": "true" }`.
¿Qué pasa si el objeto no tiene tag? ¿Y si tiene tag `Procesado=false`?

### 7.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un rol Lambda con políticas para:
- Logs (básico)
- SQS: ReceiveMessage, DeleteMessage en cola "procesamiento-*"
- DynamoDB: PutItem, Query en tabla "procesados" con PK=documento_id
- S3: GetObject en bucket "documentos-entrada" solo si tag "Origen=web"
Incluye: assume_role_policy, 4 políticas inline con condiciones, outputs.
```

---

## 8. Limitaciones LocalStack en IAM

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Roles y políticas | ✅ | ✅ |
| `simulate-principal-policy` | ⚠️ Básico | ✅ Completo |
| Evaluación de condiciones | ⚠️ Parcial | ✅ Completa |
| Políticas AWS Managed | ⚠️ Pocas disponibles | ✅ Todas |
| Evaluation de boundaries | ❌ | ✅ |
| Access Analyzer | ❌ | ✅ |
| IAM Access Advisor | ❌ | ✅ |

---

## 9. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `AccessDenied` en Lambda | Permisos en rol, `assume_role_policy` | Usar `AdministratorAccess` |
| `MalformedPolicyDocument` | JSON inválido en policy | Validar JSON con `jq` |
| `EntityAlreadyExists` | Rol/política ya existe | Usar nombres únicos o `terraform import` |
| `simulate-principal-policy` falla | ARN rol correcto, acciones válidas | Verificar ARN y acciones |
| Permisos no aplicados | Propagación eventual (en AWS real) | En LocalStack es inmediato |

---

## 10. Evaluación y cierre

### 10.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Rol + confianza | No crea | Crea sin confianza | Rol + assume_role_policy correcta |
| Políticas inline | No crea | 1-2 básicas | 3+ con least privilege |
| Condiciones | No usa | 1 básica | Múltiples (StringEquals, ArnLike, tags) |
| Managed policies | No usa | Entiende concepto | Crea managed + attach + AWS managed |
| Simulación | No usa | Ejecuta básica | Valida permisos/denegaciones |

### 10.2. Checklist final

- [ ] Rol con `assume_role_policy` para `lambda.amazonaws.com`
- [ ] Política inline: Logs (CreateLogGroup/Stream/PutLogEvents)
- [ ] Política inline: SQS (ReceiveMessage, DeleteMessage) con condición cuenta
- [ ] Política inline: DynamoDB (PutItem, Query) con condición LeadingKeys
- [ ] Política inline: S3 (GetObject) con condición tag
- [ ] (Opcional) Política managed + attachment
- [ ] `simulate-principal-policy` valida permisos
- [ ] `terraform destroy` limpia todo

### 10.3. Idea principal

> **IAM = quién puede hacer qué, sobre qué, bajo qué condiciones.**
> Rol de ejecución = identidad de la Lambda. Políticas = permisos.
> Least privilege = solo lo necesario, con condiciones.
> **`simulate-principal-policy` = prueba de permisos antes de desplegar.**
> **En AWS real: boundaries, access analyzer, access advisor. En LocalStack: básico.**
