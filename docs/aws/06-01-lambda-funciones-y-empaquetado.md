# Lambda: funciones y empaquetado con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

AWS Lambda ejecuta código cuando recibe una invocación, sin exigir que administres directamente el servidor donde se ejecuta.
Terraform permite declarar la función, su configuración, sus permisos y la referencia al paquete de código.
LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección construirás una función Python, generarás su paquete ZIP y la desplegarás mediante Terraform.
Después comprobarás invocaciones correctas, errores de aplicación, logs, actualizaciones de código, versiones y alias.
La práctica distingue el código fuente, el artefacto desplegable y la configuración de infraestructura.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar qué representa una función Lambda.
- Definir un handler Python.
- Crear un paquete ZIP con estructura válida.
- Gestionar el paquete mediante `archive_file`.
- Configurar runtime, memoria y timeout.
- Declarar el rol de ejecución.
- Invocar la función mediante `aws_local`.
- Distinguir errores de servicio y de aplicación.
- Consultar logs.
- Publicar versiones y gestionar un alias.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Desplegarás una función que valida una lista de enteros y devuelve resultados calculados.

---

## 2. Requisitos previos

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
```

La práctica utiliza Terraform 1.6 o superior dentro de la serie 1.x.
El proveedor AWS se limita a la serie 5.x como base didáctica.
También utilizaremos el proveedor `archive` de HashiCorp.

### 2.2. Conocimientos recomendados

Debes reconocer variables, recursos, outputs, referencias y planes guardados.
Los comandos se ejecutan desde una terminal compatible con Bash.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (gestión)  │  │  (invocar/verif) │                    │
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
│  │  │  Lambda (Python) + Logs + IAM (simulado)       │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. `compose.yaml` (requiere socket Docker para Lambda)

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: lambda,iam,logs,sts,s3
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
      LAMBDA_EXECUTOR: docker-reuse
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  localstack_data:
```

> **Importante**: El montaje de `/var/run/docker.sock` es necesario para que LocalStack ejecute contenedores Lambda. `LAMBDA_EXECUTOR: docker-reuse` mejora rendimiento reutilizando contenedores.

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

### 3.4. Configuración Terraform base

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
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
  endpoints {
    lambda = "http://127.0.0.1:4566"
    iam    = "http://127.0.0.1:4566"
    logs   = "http://127.0.0.1:4566"
    sts    = "http://127.0.0.1:4566"
    s3     = "http://127.0.0.1:4566"
  }
}
```

---

## 4. Qué es una función Lambda

### 4.1. Componentes principales

Una función combina código ejecutable y configuración de ejecución:

- **Paquete de código** (ZIP): contiene el handler y dependencias.
- **Runtime**: Python 3.9, 3.10, 3.11, 3.12, Node.js, Java, Go, .NET, Custom.
- **Handler**: punto de entrada (ej. `lambda_function.handler`).
- **Memoria**: 128 MB - 10 GB (afecta CPU proporcional).
- **Timeout**: 1 - 900 segundos.
- **Variables de entorno**: configuración externa.
- **Rol de ejecución (IAM)**: permisos para acceder a otros servicios.
- **Observabilidad**: CloudWatch Logs, X-Ray.

### 4.2. Invocación

La función recibe un **evento** (JSON) y un **contexto** (metadatos de ejecución).
En invocación síncrona (`RequestResponse`), devuelve respuesta directamente.
En asíncrona (`Event`), se encola y devuelve 202 Accepted.

### 4.3. Resultado

En invocación síncrona puede devolver un resultado serializable a JSON.
Errores de aplicación (excepciones no capturadas) devuelven 502 / error JSON.
Errores de servicio (timeout, OOM, throttling) devuelven códigos de servicio.

### 4.4. Límite

Lambda no convierte automáticamente el código en una API HTTP.
Para eso se necesita API Gateway (lección 06-03).

---

## 5. Empaquetado: código fuente → artefacto ZIP

### 5.1. Estructura del ZIP

```
function.zip
├── lambda_function.py      # Handler principal
├── requirements.txt        # (opcional) dependencias Python
└── lib/                    # (opcional) dependencias instaladas
```

### 5.2. Proveedor `archive_file`

Terraform puede generar el ZIP automáticamente:

```hcl
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"  # Directorio con código
  output_path = "${path.module}/function.zip"
}
```

### 5.3. Código fuente Python (src/lambda_function.py)

```python
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Valida una lista de enteros y devuelve estadísticas.
    Event esperado: {"numbers": [1, 2, 3, ...]}
    """
    logger.info(f"Evento recibido: {json.dumps(event)}")
    
    # Validar entrada
    numbers = event.get("numbers")
    if not isinstance(numbers, list):
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Campo 'numbers' debe ser una lista"})
        }
    
    # Validar que todos son enteros
    for i, n in enumerate(numbers):
        if not isinstance(n, int):
            return {
                "statusCode": 400,
                "body": json.dumps({"error": f"Elemento {i} no es entero: {n}"})
            }
    
    if len(numbers) == 0:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Lista vacía"})
        }
    
    # Calcular estadísticas
    result = {
        "count": len(numbers),
        "sum": sum(numbers),
        "min": min(numbers),
        "max": max(numbers),
        "avg": sum(numbers) / len(numbers),
        "sorted": sorted(numbers)
    }
    
    logger.info(f"Resultado: {result}")
    
    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }
```

---

## 6. Rol de ejecución (IAM)

### 6.1. Rol básico para Lambda + Logs

```hcl
resource "aws_iam_role" "lambda_exec" {
  name = "tf-lambda-exec-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_logs" {
  name = "tf-lambda-logs"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Effect   = "Allow"
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}
```

> **Nota**: En LocalStack, IAM es simplificado. Las políticas se aceptan pero no se evalúan estrictamente.

---

## 7. Función Lambda completa

```hcl
# main.tf
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/function.zip"
}

resource "aws_lambda_function" "validador" {
  function_name = "tf-lambda-validador"
  runtime       = "python3.11"
  handler       = "lambda_function.handler"
  role          = aws_iam_role.lambda_exec.arn
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  memory_size = 256
  timeout     = 30
  
  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }
}

# Log Group (explícito para control)
resource "aws_cloudwatch_log_group" "lambda" {
  name = "/aws/lambda/tf-lambda-validador"
  retention_in_days = 7
}

# outputs.tf
output "function_name" { value = aws_lambda_function.validador.function_name }
output "function_arn"  { value = aws_lambda_function.validador.arn }
output "function_url"  { value = "N/A (requiere Lambda Function URL o API Gateway)" }
```

---

## 8. Práctica guiada paso a paso

### Paso 1: Preparar estructura

```bash
mkdir -p lambda-funcion/{src,evidencias}
cd lambda-funcion
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Crear código fuente

```bash
# src/lambda_function.py (código de sección 5.3)
cat > src/lambda_function.py << 'PYEOF'
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    logger.info(f"Evento recibido: {json.dumps(event)}")
    
    numbers = event.get("numbers")
    if not isinstance(numbers, list):
        return {"statusCode": 400, "body": json.dumps({"error": "Campo 'numbers' debe ser una lista"})}
    
    for i, n in enumerate(numbers):
        if not isinstance(n, int):
            return {"statusCode": 400, "body": json.dumps({"error": f"Elemento {i} no es entero: {n}"})}
    
    if len(numbers) == 0:
        return {"statusCode": 400, "body": json.dumps({"error": "Lista vacía"})}
    
    result = {
        "count": len(numbers),
        "sum": sum(numbers),
        "min": min(numbers),
        "max": max(numbers),
        "avg": sum(numbers) / len(numbers),
        "sorted": sorted(numbers)
    }
    
    logger.info(f"Resultado: {result}")
    return {"statusCode": 200, "body": json.dumps(result)}
PYEOF
```

### Paso 3: Desplegar infraestructura

```bash
# Crear archivos Terraform (versions, providers, main, outputs)
terraform init
terraform fmt
terraform validate
terraform plan -out=lambda.tfplan
terraform show lambda.tfplan
terraform apply lambda.tfplan
```

### Paso 4: Invocar función (éxito)

```bash
aws_local lambda invoke \
  --function-name tf-lambda-validador \
  --payload '{"numbers": [5, 2, 9, 1, 7]}' \
  /tmp/response.json

cat /tmp/response.json | jq .
# Debe mostrar statusCode 200 y body con estadísticas
```

### Paso 5: Invocar función (error de validación)

```bash
# Lista vacía
aws_local lambda invoke --function-name tf-lambda-validador --payload '{"numbers": []}' /tmp/err1.json
cat /tmp/err1.json | jq .

# Elemento no entero
aws_local lambda invoke --function-name tf-lambda-validador --payload '{"numbers": [1, "dos", 3]}' /tmp/err2.json
cat /tmp/err2.json | jq .

# Campo incorrecto
aws_local lambda invoke --function-name tf-lambda-validador --payload '{"data": [1,2,3]}' /tmp/err3.json
cat /tmp/err3.json | jq .
```

### Paso 6: Consultar logs

```bash
# Logs de CloudWatch (LocalStack)
aws_local logs describe-log-streams --log-group-name /aws/lambda/tf-lambda-validador --order-by LastEventTime --descending --limit 1

STREAM=$(aws_local logs describe-log-streams --log-group-name /aws/lambda/tf-lambda-validador --order-by LastEventTime --descending --limit 1 | jq -r '.logStreams[0].logStreamName')

aws_local logs get-log-events --log-group-name /aws/lambda/tf-lambda-validador --log-stream-name "$STREAM" | jq '.events[] | .message'
```

### Paso 7: Actualizar código y redespachar

```bash
# Modificar src/lambda_function.py: añadir campo "median" al resultado
# (código omitido por brevedad)

# Terraform detecta cambio en source_code_hash
terraform plan -out=update.tfplan
terraform apply update.tfplan

# Verificar nueva versión
aws_local lambda invoke --function-name tf-lambda-validador --payload '{"numbers": [3,1,4]}' /tmp/v2.json
cat /tmp/v2.json | jq .
```

### Paso 8: Publicar versión y alias

```bash
# Publicar versión inmutable
aws_local lambda publish-version --function-name tf-lambda-validador --description "Versión inicial con mediana"

# Crear alias PROD apuntando a versión 1
aws_local lambda create-alias --function-name tf-lambda-validador --name PROD --function-version 1

# Invocar via alias
aws_local lambda invoke --function-name tf-lambda-validador:PROD --payload '{"numbers": [10,20,30]}' /tmp/alias.json
cat /tmp/alias.json | jq .
```

### Paso 9: Limpiar

```bash
# Eliminar alias
aws_local lambda delete-alias --function-name tf-lambda-validador --name PROD

# Destruir recursos Terraform
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan

# Verificar limpieza
aws_local lambda list-functions
aws_local iam list-roles | jq '.Roles[] | select(.RoleName | startswith("tf-"))'
aws_local logs describe-log-groups --log-group-name-prefix /aws/lambda/tf-lambda

docker compose down
```

---

## 9. Sesiones guiadas para el alumnado

### 9.1. Sesión 1: Código, empaquetado y despliegue (35 min)

1. Crear `src/lambda_function.py` con handler Python
2. Configurar `archive_file` + `aws_lambda_function` + IAM role
3. `terraform init` → `plan` → `apply`
4. Invocar con `aws_local` → verificar respuesta exitosa
5. **Entrega**: Código fuente + plan Terraform + evidencia invocación exitosa

### 9.2. Sesión 2: Errores, logs y actualización (30 min)

1. Probar casos de error (lista vacía, tipo incorrecto, campo faltante)
2. Consultar logs en CloudWatch Logs via `aws_local`
3. Modificar código → `terraform plan` → `apply` → verificar cambio
4. **Entrega**: Evidencias de errores 400 + logs + evidencia actualización

### 9.3. Sesión 3: Versiones, alias y limpieza (25 min)

1. `publish-version` → `create-alias PROD`
2. Invocar via alias → verificar
3. `terraform destroy` → limpiar alias, función, rol, log group
4. `docker compose down`
5. **Entrega**: Evidencia alias + registro limpieza completa

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Explica la diferencia entre:
- Código fuente (`src/`) vs artefacto (`function.zip`) vs recurso (`aws_lambda_function`)
- `source_code_hash` vs `filename` en `aws_lambda_function`
- Error de aplicación (4xx/5xx en body) vs error de servicio (timeout, OOM)
- Versión (`$LATEST`) vs versión publicada (`1`, `2`, ...) vs alias (`PROD`)

### 10.2. Ejercicio de interpretación

Una función Lambda tiene `timeout = 30` y `memory = 256`.
El código tiene un bucle infinito accidental.
¿Qué ocurre tras 30 segundos? ¿Qué ve el invocador? ¿Qué aparece en logs?
¿Cómo se soluciona sin redeploy? (pista: no se puede, requiere nuevo deploy)

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una función Lambda Python que:
- Reciba evento con "operation": "sum"|"avg"|"min"|"max" y "values": [numbers]
- Valide operación válida y lista no vacía de números
- Devuelva resultado o error 400
Incluye: handler, logging, validaciones, docstring.
No uses librerías externas (solo stdlib).
```

---

## 11. Limitaciones de LocalStack en Lambda

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Python runtime | ✅ 3.9-3.12 | ✅ 3.9-3.12 |
| Invocación síncrona | ✅ | ✅ |
| Invocación asíncrona | ⚠️ Parcial | ✅ |
| Logs CloudWatch | ✅ Básico | ✅ Completo |
| Variables de entorno | ✅ | ✅ |
| Capas (Layers) | ⚠️ Parcial | ✅ |
| VPC / ENI | ❌ | ✅ |
| Provisioned Concurrency | ❌ | ✅ |
| SnapStart | ❌ | ✅ (Java) |
| Function URLs | ⚠️ Parcial | ✅ |
| Alias / Versiones | ✅ | ✅ |
| IAM evaluation | ⚠️ Simplificado | ✅ Estricto |

> **Nota**: Lambda en LocalStack requiere Docker socket montado. Sin él, las invocaciones fallan o timeout.

---

## 12. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `Task timed out` | Timeout configurado vs tiempo real | Aumentar timeout sin optimizar código |
| `Cannot find module` / `ImportError` | ZIP mal estructurado, handler incorrecto | Verificar `handler = "archivo.funcion"` y ZIP |
| `AccessDenied` al invocar | Rol IAM, permisos `lambda:InvokeFunction` | Usar credenciales reales en LocalStack |
| Logs no aparecen | Log group no creado, permisos logs | Crear `aws_cloudwatch_log_group` explícito |
| `source_code_hash` no cambia | `archive_file` no detecta cambios | Usar `output_base64sha256`, verificar `source_dir` |
| Function URL no funciona | No soportado en Community | Usar API Gateway (lección 06-03) |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Código + ZIP | No funciona | Funciona pero manual | `archive_file` + source_dir correcto |
| Despliegue Terraform | No crea función | Crea sin IAM/Logs | Función + Role + Log Group + source_code_hash |
| Invocación | No invoca | Invoca éxito solo | Éxito + errores 400 + logs |
| Actualización | No actualiza | Actualiza sin plan | Plan → apply → verifica cambio |
| Versiones/Alias | No usa | Publica versión | Publica + alias + invoca via alias |
| Limpieza | No limpia | Parcial | Destroy + alias + logs + roles |

### 13.2. Checklist final

- [ ] Código Python en `src/lambda_function.py` con handler válido
- [ ] `archive_file` genera ZIP desde `source_dir`
- [ ] Rol IAM con `AssumeRole` para `lambda.amazonaws.com`
- [ ] Política IAM para `logs:CreateLogGroup/Stream/PutLogEvents`
- [ ] `aws_lambda_function` con runtime, handler, role, filename, source_code_hash
- [ ] `aws_cloudwatch_log_group` explícito
- [ ] Invocación exitosa con `aws_local lambda invoke`
- [ ] Casos de error 400 probados y verificados
- [ ] Logs consultados via `aws_local logs get-log-events`
- [ ] Código modificado → `plan` → `apply` → verificado
- [ ] Versión publicada + alias `PROD` creado e invocado
- [ ] Limpieza: alias → destroy → logs → roles → `docker compose down`

### 13.3. Idea principal

> **Lambda = código + configuración + permisos.**
> Terraform gestiona los tres: `archive_file` (código), `aws_lambda_function` (config), `aws_iam_role/policy` (permisos).
> `source_code_hash` es la clave para actualizaciones: cambia → redeploy.
> **`aws_local` invoca y verifica; CloudWatch Logs revela el interior.**
> **Versiones inmutables + alias mutables = despliegues seguros.**
