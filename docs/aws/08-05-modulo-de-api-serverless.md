# Módulo de API serverless con Terraform y LocalStack

Una API serverless combina una interfaz HTTP con funciones que ejecutan la lógica de aplicación sin administrar servidores de forma directa.

En AWS, API Gateway y Lambda permiten construir ese recorrido.

Terraform puede agrupar funciones, permisos, rutas, integraciones y despliegues en un módulo reutilizable.

Sin embargo, crear los recursos no demuestra que una petición HTTP llegue correctamente al código.

También debes comprobar el empaquetado, el formato de eventos, la respuesta proxy y la publicación de los cambios.

En esta lección construirás un módulo personalizado de API REST con dos rutas y una función Lambda Python.

Las sesiones incluyen invocación directa, pruebas HTTP, diagnóstico, actualización de código y limpieza.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La disponibilidad de API Gateway y la ejecución Lambda deben validarse para la versión y edición de LocalStack elegidas.

---

## 1. Objetivos de aprendizaje

Esta lección combina diseño de módulos, integración entre servicios y verificación funcional.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diseñar un contrato de API.
- Empaquetar una función Python.
- Crear una API REST y sus rutas.
- Configurar integración Lambda proxy.
- Autorizar invocaciones desde API Gateway.
- Publicar un deployment y un stage.
- Consultar logs e investigar errores.
- Actualizar código sin recrear toda la infraestructura.

### 1.2. Resultado práctico

Publicarás `GET /health` y `POST /echo` en una API local.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, HTTP e IAM.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
curl --version
jq --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

---

## 3. Compatibilidad obligatoria

El docente debe validar el recorrido completo antes de distribuir la práctica.

### 3.1. Operaciones necesarias

Comprueba:

- Creación de funciones Lambda desde ZIP.
- Ejecución del runtime Python seleccionado.
- Creación de API Gateway REST.
- Integraciones de tipo `AWS_PROXY`.
- Creación de deployments y stages.
- Invocación HTTP desde el host.
- Consulta de logs.
- Eliminación de los recursos.

### 3.2. Registro

Documenta versiones, edición, imagen o digest y runtime utilizados.

---

## 4. Advertencia sobre edición y runtime

No todas las combinaciones de LocalStack ofrecen las mismas capacidades.

### 4.1. Validación previa

Verifica que la edición elegida admite el tipo de API y las operaciones utilizadas.

### 4.2. Runtime

Esta práctica utiliza `python3.12`.

El docente debe confirmar su soporte en la imagen validada.

### 4.3. Continuación

No sustituyas un fallo de compatibilidad por una llamada a AWS real.

### 4.4. Regla principal

**La creación de una función no demuestra que su runtime pueda ejecutarse.**

---

## 5. Arquitectura del laboratorio

La API recibirá peticiones HTTP y las enviará a una función Lambda.

### 5.1. Recorrido

```text
curl en el host
    │
    ▼
API Gateway REST en LocalStack
    ├── GET /health
    └── POST /echo
             │
             ▼
       Función Lambda Python
             │
             ▼
       Respuesta proxy HTTP
```

### 5.2. Observabilidad

La función utilizará un grupo de logs dedicado.

---

## 6. Responsabilidad del módulo

El módulo representará una API pequeña con un backend Lambda único.

### 6.1. Recursos incluidos

Creará:

- Rol y política de logs.
- Grupo de logs.
- Función Lambda.
- API REST y rutas.
- Métodos e integraciones.
- Permiso de invocación.
- Deployment y stage.

### 6.2. Fuera de alcance

No implementará autenticación, dominios personalizados ni bases de datos.

---

## 7. REST API frente a HTTP API

API Gateway ofrece modelos de API distintos.

### 7.1. Comparación

| **Modelo** | **Recursos Terraform habituales** | **Uso en esta práctica** |
|------------|-----------------------------------|--------------------------|
| REST API | `aws_api_gateway_*` | Sí |
| HTTP API | `aws_apigatewayv2_*` | No |
| WebSocket API | `aws_apigatewayv2_*` | No |

Estos modelos tienen diferencias en configuración y formato de eventos.

### 7.2. Elección

Utilizaremos REST API para hacer explícitos recursos, métodos y deployments.

### 7.3. Regla

No mezcles ejemplos de payload HTTP API v2 con esta integración REST proxy.

---

## 8. Contrato HTTP de la aplicación

Las rutas tendrán comportamientos deliberadamente sencillos.

### 8.1. Endpoints

| **Ruta** | **Entrada** | **Respuesta esperada** |
|----------|-------------|------------------------|
| `GET /health` | Sin cuerpo | Estado y versión |
| `POST /echo` | JSON válido | JSON recibido |
| `POST /echo` | JSON inválido | HTTP 400 |
| Ruta no publicada | Petición HTTP | Error de API Gateway |

El módulo creará únicamente las dos rutas previstas.

### 8.2. Limitación

La raíz `/` no tendrá un método publicado.

### 8.3. Regla

Una ruta inexistente puede ser rechazada antes de invocar Lambda.

---

## 9. Integración Lambda proxy

API Gateway entrega un evento que representa la petición.

### 9.1. Información habitual

La función podrá recibir:

- Método HTTP.
- Ruta.
- Headers.
- Parámetros.
- Cuerpo como cadena.
- Indicador de Base64.
- Contexto de la petición.

### 9.2. Responsabilidad

La función interpreta ese evento y construye la respuesta.

### 9.3. Regla

El cuerpo no llega automáticamente convertido en un objeto Python.

---

## 10. Respuesta proxy

La función debe devolver una estructura compatible con API Gateway.

### 10.1. Ejemplo

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"status\":\"ok\"}",
  "isBase64Encoded": false
}
```

### 10.2. Precaución

`body` debe ser una cadena en esta respuesta.

### 10.3. Consecuencia

Una respuesta incompatible puede producir un error de integración.

---

## 11. Deployment y stage

Crear métodos no equivale a publicar automáticamente su configuración.

### 11.1. Deployment

Representa una revisión publicable de la configuración de la API REST.

### 11.2. Stage

Apunta a un deployment y permite invocarlo mediante un nombre.

### 11.3. Laboratorio

Utilizaremos el stage `lab`.

### 11.4. Regla

Distingue actualización de código Lambda y publicación de configuración API Gateway.

---

## 12. Preparación del directorio

Trabaja en una carpeta independiente.

### 12.1. Estructura

```bash
mkdir -p terraform-serverless-api/modules/api
mkdir -p terraform-serverless-api/app
mkdir -p terraform-serverless-api/scripts
mkdir -p terraform-serverless-api/tests
mkdir -p terraform-serverless-api/build
mkdir -p terraform-serverless-api/planes
mkdir -p terraform-serverless-api/resultados
mkdir -p terraform-serverless-api/copias
cd terraform-serverless-api
```

### 12.2. Ejecución

Los comandos se ejecutan desde esta raíz.

---

## 13. Protección de archivos

Separa configuración y artefactos operativos.

### 13.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
build/
planes/
resultados/
copias/
crash.log
```

### 13.2. Qué conservar

Versiona código, módulo, scripts, pruebas y `.terraform.lock.hcl`.

---

## 14. Imagen validada

Selecciona una imagen reproducible.

### 14.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 14.2. Recomendación

Utiliza una etiqueta fija o un digest.

### 14.3. Edición

Si la edición requiere activación, utiliza el mecanismo indicado por el docente.

### 14.4. Seguridad

No publiques tokens de activación ni los añadas al repositorio.

---

## 15. Docker Compose

Lambda necesita un entorno de ejecución adecuado.

### 15.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: lambda,apigateway,iam,logs
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### 15.2. Advertencia

Montar el socket Docker concede capacidades importantes sobre el host.

### 15.3. Alcance

Utiliza exclusivamente una imagen confiable en un entorno de laboratorio.

---

## 16. Docker y ejecución Lambda

LocalStack puede utilizar contenedores adicionales para ejecutar funciones.

### 16.1. Requisitos

Docker debe estar disponible y el socket debe ser accesible.

### 16.2. Primera ejecución

La descarga de imágenes de runtime puede aumentar el tiempo inicial.

### 16.3. Diferencia

Ese tiempo no representa necesariamente un cold start de AWS real.

### 16.4. Entornos alternativos

Docker rootless o sockets personalizados requieren adaptar Compose.

### 16.5. Regla

Valida ejecución, red y permisos del runtime antes de probar la API.

---

## 17. Credenciales y conectividad

Prepara la terminal antes de ejecutar herramientas AWS.

### 17.1. Configuración

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_LAMBDA
unset AWS_ENDPOINT_URL_APIGATEWAY TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 17.2. Comprobación

Consulta `lambda list-functions` y `apigateway get-rest-apis`.

---

## 18. Funciones auxiliares Python

Crea `app/handler.py`.

### 18.1. Imports y respuesta

```python
import base64
import binascii
import json
import os

def response(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, ensure_ascii=False),
        "isBase64Encoded": False,
    }

def body_text(event):
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        return base64.b64decode(body, validate=True).decode("utf-8")
    return body
```

### 18.2. Continuación

Añade el handler de la sección siguiente al mismo archivo.

---

## 19. Handler de aplicación

La función interpretará método, ruta y cuerpo.

### 19.1. Implementación

```python
def handler(event, context):
    method = event.get("httpMethod", "")
    path = event.get("path", "")
    request_id = getattr(context, "aws_request_id", "local-test")

    print(json.dumps({
        "request_id": request_id,
        "method": method,
        "path": path,
    }))

    if method == "GET" and path == "/health":
        return response(200, {
            "status": "ok",
            "service": os.environ.get("SERVICE_NAME", "api"),
            "version": os.environ.get("APP_VERSION", "1"),
        })

    if method == "POST" and path == "/echo":
        try:
            payload = json.loads(body_text(event))
        except (ValueError, UnicodeError, binascii.Error):
            return response(400, {"error": "invalid_json"})
        return response(200, {"received": payload, "request_id": request_id})

    return response(404, {"error": "not_found"})
```

### 19.2. Logs

No imprimimos el cuerpo completo ni headers sensibles.

---

## 20. Alcance del código

La aplicación es un ejemplo de contrato HTTP, no un framework completo.

### 20.1. JSON aceptado

`/echo` acepta cualquier valor JSON válido.

Puede recibir objetos, listas, cadenas, números o `null`.

### 20.2. Seguridad

No implementa autenticación ni límites adicionales de negocio.

### 20.3. Base64

El handler interpreta el indicador proporcionado por el evento.

### 20.4. Regla

No atribuyas al código garantías que no valida explícitamente.

---

## 21. Empaquetado reproducible

Crea `scripts/package.py`.

### 21.1. Script

```python
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / "app" / "handler.py"
target = root / "build" / "api.zip"
target.parent.mkdir(parents=True, exist_ok=True)

info = ZipInfo("handler.py", date_time=(2024, 1, 1, 0, 0, 0))
info.compress_type = ZIP_DEFLATED
info.create_system = 3
info.external_attr = 0o100644 << 16

with ZipFile(target, "w") as archive:
    archive.writestr(info, source.read_bytes())

print(target)
```

### 21.2. Propósito

La fecha fija evita diferencias debidas únicamente al timestamp del ZIP.

---

## 22. Verificar el paquete

El handler debe quedar en la raíz del archivo ZIP.

### 22.1. Comandos

```bash
python3 -m py_compile app/handler.py
python3 scripts/package.py
python3 -m zipfile -l build/api.zip
```

### 22.2. Resultado esperado

Debe aparecer:

```text
handler.py
```

### 22.3. Handler configurado

Utilizaremos `handler.handler`.

### 22.4. Regla

`app/handler.py` dentro del ZIP no equivale a `handler.py` en su raíz.

---

## 23. Requisitos del módulo

Crea `modules/api/versions.tf`.

### 23.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 23.2. Proveedor

La configuración AWS será heredada de la raíz.

### 23.3. Regla

El módulo no debe fijar credenciales ni endpoints locales.

---

## 24. Variables de identidad

Crea `modules/api/variables.tf`.

### 24.1. Nombre y stage

```hcl
variable "name" {
  type        = string
  description = "Nombre de la API y función."
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,39}$", var.name))
    error_message = "Usa entre 3 y 40 caracteres: minúsculas, dígitos y guiones."
  }
}

variable "stage_name" {
  type        = string
  default     = "lab"
  description = "Stage publicado."

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{1,15}$", var.stage_name))
    error_message = "Usa un nombre de stage corto y alfanumérico."
  }
}
```

---

## 25. Variables del artefacto

Añade las entradas de despliegue al mismo archivo.

### 25.1. Configuración

```hcl
variable "package_path" {
  type        = string
  nullable    = false
  description = "Ruta del ZIP construido antes de planificar."
}

variable "package_hash" {
  type        = string
  nullable    = false
  description = "SHA-256 Base64 del ZIP."
}

variable "app_version" {
  type        = string
  default     = "1"
  description = "Versión de aplicación publicada por /health."
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

---

## 26. Rol de ejecución Lambda

Crea `modules/api/iam.tf`.

### 26.1. Trust policy

```hcl
data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
  tags               = var.tags
}
```

### 26.2. Distinción

El rol permite ejecutar la función; no autoriza por sí solo a API Gateway a invocarla.

---

## 27. Grupo y permisos de logs

Completa `modules/api/iam.tf`.

### 27.1. Recursos

```hcl
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 7
  tags              = var.tags
}

data "aws_iam_policy_document" "logs" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }
}

resource "aws_iam_role_policy" "logs" {
  name   = "${var.name}-logs"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.logs.json
}
```

### 27.2. Precreación

Terraform crea el grupo; el rol no necesita crearlo dinámicamente.

---

## 28. Función Lambda

Crea `modules/api/lambda.tf`.

### 28.1. Configuración

```hcl
resource "aws_lambda_function" "this" {
  function_name    = var.name
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.12"
  handler          = "handler.handler"
  filename         = var.package_path
  source_code_hash = var.package_hash

  timeout     = 10
  memory_size = 128

  environment {
    variables = {
      SERVICE_NAME = var.name
      APP_VERSION  = var.app_version
    }
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy.logs,
    aws_cloudwatch_log_group.lambda,
  ]
}
```

---

## 29. API REST y rutas

Crea `modules/api/gateway.tf`.

### 29.1. Estructura

```hcl
locals {
  routes = {
    health = { path = "health", method = "GET" }
    echo   = { path = "echo", method = "POST" }
  }
}

resource "aws_api_gateway_rest_api" "this" {
  name = var.name
  tags = var.tags

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "route" {
  for_each = local.routes

  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = each.value.path
}
```

---

## 30. Métodos e integraciones

Añade a `modules/api/gateway.tf` los recursos del recorrido HTTP.

### 30.1. Configuración

```hcl
resource "aws_api_gateway_method" "route" {
  for_each = local.routes

  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.route[each.key].id
  http_method   = each.value.method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "route" {
  for_each = local.routes

  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.route[each.key].id
  http_method = aws_api_gateway_method.route[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.this.invoke_arn
}
```

### 30.2. Distinción

El método cliente puede ser GET; la invocación de Lambda utiliza POST.

---

## 31. Permiso de invocación

Añade el permiso basado en recursos de Lambda.

### 31.1. Configuración

```hcl
resource "aws_lambda_permission" "gateway" {
  statement_id  = "AllowApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.this.execution_arn}/*/*/*"
}
```

### 31.2. Alcance

El permiso queda limitado a esta API, pero admite sus stages, métodos y rutas.

### 31.3. Producción

Puede requerir condiciones más específicas.

### 31.4. Regla

La trust policy del rol y este permiso resuelven problemas diferentes.

---

## 32. Deployment reproducible

Añade el deployment a `modules/api/gateway.tf`.

### 32.1. Publicación

```hcl
resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    configuration = sha1(jsonencode({
      routes = local.routes
      resources = {
        for key, resource in aws_api_gateway_resource.route :
        key => resource.id
      }
      integrations = {
        for key, integration in aws_api_gateway_integration.route :
        key => integration.uri
      }
      authorization = "NONE"
      type          = "AWS_PROXY"
    }))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.route,
    aws_lambda_permission.gateway,
  ]
}
```

---

## 33. Stage publicado

Completa `modules/api/gateway.tf`.

### 33.1. Recurso

```hcl
resource "aws_api_gateway_stage" "this" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  deployment_id = aws_api_gateway_deployment.this.id
  stage_name    = var.stage_name
  tags          = var.tags
}
```

### 33.2. Cambios futuros

Si añades parámetros, modelos o configuración adicional, incorpóralos al cálculo del deployment.

### 33.3. Regla

`depends_on` establece orden; no sustituye un trigger de republicación.

---

## 34. Outputs del módulo

Crea `modules/api/outputs.tf`.

### 34.1. Contrato

```hcl
output "contract" {
  description = "Contrato v1 de la API REST."

  value = {
    contract_version = 1
    api_id           = aws_api_gateway_rest_api.this.id
    execution_arn    = aws_api_gateway_rest_api.this.execution_arn
    stage_name       = aws_api_gateway_stage.this.stage_name
    function_name    = aws_lambda_function.this.function_name
    function_arn     = aws_lambda_function.this.arn
    log_group_name   = aws_cloudwatch_log_group.lambda.name

    routes = {
      health = "GET /health"
      echo   = "POST /echo"
    }
  }
}
```

### 34.2. Endpoint local

La raíz construirá la dirección específica de LocalStack.

---

## 35. Proveedor raíz

Crea `versions.tf` y `providers.tf`.

### 35.1. Requisitos

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 35.2. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    lambda     = "http://localhost:4566"
    apigateway = "http://localhost:4566"
    iam        = "http://localhost:4566"
    cloudwatchlogs = "http://localhost:4566"
  }
}
```

---

## 36. Composición raíz

Crea `variables.tf`, `main.tf` y `terraform.tfvars`.

### 36.1. Entradas

```hcl
# variables.tf
variable "suffix" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "app_version" {
  type    = string
  default = "1"
}
```

### 36.2. Llamada

```hcl
# main.tf
module "api" {
  source       = "./modules/api"
  name         = "curso-api-${var.suffix}"
  stage_name   = "lab"
  package_path = abspath("${path.module}/build/api.zip")
  package_hash = filebase64sha256("${path.module}/build/api.zip")
  app_version  = var.app_version
  tags         = { Laboratory = "LocalStack" }
}
```

### 36.3. Valores

En `terraform.tfvars`, declara `suffix = "alumno01"` y `app_version = "1"`.

---

## 37. Outputs locales

Crea `outputs.tf`.

### 37.1. Resultados

```hcl
output "api" {
  value = module.api.contract
}

output "local_base_url" {
  description = "Endpoint local por ruta; validar con la imagen elegida."

  value = join("", [
    "http://localhost:4566/_aws/execute-api/",
    module.api.contract.api_id,
    "/",
    module.api.contract.stage_name,
  ])
}
```

### 37.2. Compatibilidad

El docente debe validar este formato de invocación en la imagen seleccionada.

### 37.3. Regla

La URL local no es el endpoint regional de AWS real.

---

## 38. Sesión 1: validar y desplegar

Duración orientativa: 30 minutos.

### 38.1. Secuencia

```bash
python3 scripts/package.py
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 38.2. Resultado esperado

El plan inicial crea catorce recursos administrados.

### 38.3. Revisión

Los documentos IAM son data sources, no recursos remotos adicionales.

---

## 39. Sesión 2: identificar recursos

Conserva el contrato y prepara variables operativas.

### 39.1. Comandos

```bash
terraform output -json api > resultados/api.json

BASE_URL="$(terraform output -raw local_base_url)"
FUNCTION_NAME="$(jq -er '.function_name' resultados/api.json)"
LOG_GROUP="$(jq -er '.log_group_name' resultados/api.json)"
API_ID="$(jq -er '.api_id' resultados/api.json)"

aws_local lambda wait function-active-v2 \
  --function-name "$FUNCTION_NAME"
```

### 39.2. Condición

Espera a que la función esté activa antes de invocarla.

### 39.3. Límite

Un timeout del waiter requiere diagnóstico, no un endpoint AWS alternativo.

---

## 40. Sesión 3: invocación directa

La invocación directa permite aislar el código de API Gateway.

### 40.1. Evento

```bash
printf '%s\n' \
  '{"httpMethod":"GET","path":"/health","body":null,"isBase64Encoded":false}' \
  > resultados/direct-event.json

aws_local lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload file://resultados/direct-event.json \
  resultados/direct-response.json \
  > resultados/direct-metadata.json
```

### 40.2. Interpretación

Revisa `FunctionError` en metadatos y `statusCode` dentro del payload.

### 40.3. Regla

El éxito de la llamada Invoke no garantiza éxito lógico de la aplicación.

---

## 41. Sesión 4: HTTP de salud

Ahora comprueba el recorrido completo.

### 41.1. Petición

```bash
curl --silent --show-error \
  --max-time 60 \
  -D resultados/health-headers.txt \
  -o resultados/health-body.json \
  -w '%{http_code}\n' \
  "$BASE_URL/health"

jq '.' resultados/health-body.json
```

### 41.2. Resultado esperado

HTTP 200 con `status = ok` y `version = 1`.

### 41.3. Evidencia

Esta prueba verifica gateway, integración, permiso y código conjuntamente.

---

## 42. Sesión 5: POST de eco

Utiliza un archivo JSON para evitar errores de comillas.

### 42.1. Petición

```bash
printf '%s\n' '{"event_id":"API-001","message":"hola"}' \
  > resultados/echo-input.json

curl --silent --show-error \
  --max-time 60 \
  -H 'Content-Type: application/json' \
  --data-binary @resultados/echo-input.json \
  -o resultados/echo-body.json \
  -w '%{http_code}\n' \
  "$BASE_URL/echo"
```

### 42.2. Resultado esperado

HTTP 200 y el objeto enviado dentro de `received`.

### 42.3. Distinción

El request ID identifica una ejecución, no el evento de negocio.

---

## 43. Sesión 6: JSON inválido

Una entrada incorrecta debe producir un error controlado.

### 43.1. Petición

```bash
curl --silent --show-error \
  --max-time 60 \
  -H 'Content-Type: application/json' \
  --data-binary '{json-invalido' \
  -o resultados/invalid-body.json \
  -w '%{http_code}\n' \
  "$BASE_URL/echo"

jq '.' resultados/invalid-body.json
```

### 43.2. Resultado esperado

HTTP 400 con `error = invalid_json`.

### 43.3. Regla

No confundir un 400 de aplicación con un fallo de invocación Lambda.

---

## 44. Sesión 7: ruta inexistente

API Gateway puede rechazar una petición sin ejecutar el handler.

### 44.1. Prueba

```bash
curl --silent --show-error \
  --max-time 60 \
  -o resultados/missing-route.json \
  -w '%{http_code}\n' \
  "$BASE_URL/missing"
```

### 44.2. Interpretación

El código y mensaje concretos deben documentarse para la imagen validada.

### 44.3. AWS REST

Una ruta o método no configurados pueden devolver un error como `Missing Authentication Token`.

### 44.4. Regla

Ese mensaje no demuestra necesariamente que falte autenticación.

---

## 45. Sesión 8: consultar logs

Los logs ayudan a localizar la capa que falló.

### 45.1. Comando

```bash
aws_local logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  > resultados/lambda-log-events.json

jq -r '.events[]?.message' \
  resultados/lambda-log-events.json
```

### 45.2. Información

Busca método, ruta y request ID registrados por el handler.

### 45.3. Límite

La publicación de logs puede requerir una espera acotada.

### 45.4. Seguridad

No amplíes logs con tokens o cuerpos sensibles para facilitar el diagnóstico.

---

## 46. Sesión 9: actualizar versión

Un cambio de entorno puede actualizar Lambda sin republicar rutas.

### 46.1. Cambio

Establece `app_version = "2"` en `terraform.tfvars`.

### 46.2. Secuencia

```bash
terraform plan -out=planes/version-2.tfplan
terraform show planes/version-2.tfplan
terraform apply planes/version-2.tfplan

aws_local lambda wait function-updated-v2 \
  --function-name "$FUNCTION_NAME"
```

### 46.3. Verificación

`GET /health` debe publicar la versión 2.

### 46.4. Regla

La misma URI de integración puede ejecutar el código actualizado de la función.

---

## 47. Sesión 10: actualizar código

La modificación del archivo requiere reconstruir el ZIP.

### 47.1. Ejercicio

Añade un campo didáctico a la respuesta de salud.

### 47.2. Secuencia

```bash
python3 -m py_compile app/handler.py
python3 scripts/package.py

terraform plan -out=planes/update-code.tfplan
terraform show planes/update-code.tfplan
terraform apply planes/update-code.tfplan
```

### 47.3. Verificación

Espera actualización y repite HTTP.

### 47.4. Regla

Editar Python sin reconstruir el paquete no actualiza el artefacto desplegado.

---

## 48. Pruebas de planificación

Crea `tests/api.tftest.hcl`.

### 48.1. Contrato

```hcl
run "contract_plan" {
  command = plan

  variables {
    suffix      = "test01"
    app_version = "1"
  }

  assert {
    condition     = output.api.contract_version == 1
    error_message = "El contrato debe publicar su versión."
  }

  assert {
    condition     = output.api.stage_name == "lab"
    error_message = "El stage esperado es lab."
  }

  assert {
    condition     = output.api.routes.echo == "POST /echo"
    error_message = "La ruta de eco no coincide."
  }
}
```

### 48.2. Preparación

Construye el ZIP antes de ejecutar `terraform test`.

---

## 49. Sesión 11: ejecutar pruebas

Las pruebas del plan complementan las peticiones HTTP.

### 49.1. Comandos

```bash
python3 scripts/package.py
terraform fmt -recursive
terraform validate
terraform test
```

### 49.2. Alcance

Estas pruebas no invocan la función ni prueban el runtime.

### 49.3. Proveedor

No utilizamos mocks; conserva LocalStack disponible.

### 49.4. Regla

Una aserción de rutas no demuestra que su deployment sea invocable.

---

## 50. Diagnóstico por capas

Un error HTTP puede originarse en varios componentes.

### 50.1. Comparación

| **Síntoma** | **Primera comprobación** | **Evidencia** |
|-------------|--------------------------|---------------|
| No conecta | Puerto y contenedor | Compose y curl |
| Ruta rechazada | Método, stage y deployment | API Gateway |
| Lambda no ejecuta | Runtime, rol y permiso | Configuración y logs |
| Respuesta 5xx | Error o respuesta proxy | Payload y logs |
| Código antiguo | ZIP y hash | Plan y configuración |

Investiga desde la conectividad hasta la aplicación.

### 50.2. Regla

No elimines relaciones del estado para corregir una ruta mal escrita.

---

## 51. Seguridad y autenticación

Las rutas del laboratorio utilizan `authorization = "NONE"`.

### 51.1. Alcance

No implementan una API segura para producción.

### 51.2. Controles adicionales

Una solución real puede necesitar autenticación, autorización, cuotas y validación.

### 51.3. Red local

Publicar LocalStack en `127.0.0.1` reduce exposición directa, pero no convierte el laboratorio en una frontera absoluta.

### 51.4. Regla

No confundas credenciales de administración AWS con autenticación de clientes HTTP.

---

## 52. CORS y navegadores

Las pruebas con curl no necesitan una configuración CORS equivalente a un navegador.

### 52.1. Laboratorio

No crearemos rutas OPTIONS ni headers CORS adicionales.

### 52.2. Navegador

Una aplicación web de otro origen puede realizar una petición preflight.

### 52.3. Ampliación

Diseña explícitamente métodos, orígenes y headers permitidos.

### 52.4. Regla

Una prueba correcta con curl no demuestra compatibilidad automática con clientes web.

---

## 53. Límites operacionales

La API utiliza valores pequeños para facilitar la práctica.

### 53.1. Configuración

Lambda tiene 128 MB y timeout de diez segundos.

### 53.2. Producción

La memoria afecta CPU disponible y rendimiento.

Los timeouts de Lambda y API Gateway son controles distintos.

### 53.3. Observabilidad

Una aplicación real necesita métricas, alarmas y gestión de errores.

### 53.4. Regla

No extrapoles rendimiento del emulador a AWS.

---

## 54. Versiones y alias Lambda

La práctica invoca la función sin un alias de aplicación dedicado.

### 54.1. Consecuencia

Las actualizaciones afectan la función referenciada por la integración.

### 54.2. Producción

Versiones y alias pueden ayudar a controlar promoción y rollback.

### 54.3. Cambios necesarios

La URI de integración y permisos deben corresponder al destino elegido.

### 54.4. Regla

Un stage de API Gateway no equivale a una versión inmutable de Lambda.

---

## 55. Documentación del módulo

Crea `modules/api/README.md`.

### 55.1. Contenido mínimo

Documenta entradas, outputs, runtime y formato del ZIP.

Incluye las rutas y su contrato HTTP.

### 55.2. Publicación

Explica triggers de deployment y actualización de código.

### 55.3. Límites

Declara ausencia de autenticación, CORS, aliases y dominio personalizado.

### 55.4. Regla

Documenta consecuencias operacionales, no solo nombres de variables.

---

## 56. Preparar la limpieza

La destrucción elimina función, API y grupo de logs.

### 56.1. Evidencias

```bash
umask 077
terraform state pull > copias/before-destroy.tfstate
terraform output -json api > resultados/api-before-destroy.json

aws_local logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  > resultados/logs-before-destroy.json
```

### 56.2. Condición

Detén pruebas y peticiones antes de destruir.

### 56.3. Regla

Una copia del estado no conserva el contenido completo de los logs ni el ZIP externo.

---

## 57. Destruir la infraestructura

Mantén LocalStack y Docker disponibles.

### 57.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan

terraform state list
aws_local lambda list-functions
aws_local apigateway get-rest-apis
docker compose down
```

### 57.2. Resultado esperado

Desaparecen todos los recursos creados por el módulo.

### 57.3. Precaución

No borres el estado antes de completar la destrucción.

---

## 58. Diferencias respecto a AWS real

La emulación permite estudiar integración, no certificar producción.

### 58.1. Aspectos adicionales

Revisa IAM, TLS, costes, cuotas, auditoría y protección de la API.

### 58.2. Ejecución

Red, arranque de contenedores y tiempos locales difieren de Lambda real.

### 58.3. Persistencia

Eliminar LocalStack puede hacer desaparecer recursos mientras Terraform conserva sus relaciones.

### 58.4. Regla

Documenta garantías observadas y capacidades todavía no verificadas.

---

## 59. Ejercicios y evaluación

La evaluación debe demostrar configuración y recorrido funcional.

### 59.1. Ejercicios

1. Documenta el contrato completo.
2. Comprueba el contenido del ZIP.
3. Invoca Lambda directamente.
4. Verifica salud, eco y JSON inválido.
5. Explica un error de ruta no publicada.
6. Actualiza código y versión.
7. Diseña una ampliación con autenticación.
8. Destruye y verifica todos los recursos.

### 59.2. Entrega

Incluye módulo, código, pruebas, logs y resultados HTTP.

---

## 60. Resumen de la lección

Una API serverless reutilizable necesita más que una función y una URL.

### 60.1. Ideas esenciales

- El ZIP y el handler deben corresponder.
- API Gateway entrega un evento proxy.
- La función debe responder con una estructura válida.
- El rol y el permiso de invocación tienen funciones distintas.
- Deployment y stage publican configuración REST.
- Actualizar código exige reconstruir el paquete.
- Las pruebas HTTP complementan las pruebas del plan.
- LocalStack requiere compatibilidad validada.

### 60.2. Procedimiento recomendado

Empaqueta, valida, despliega, invoca, observa y verifica antes de limpiar.

### 60.3. Idea final

**Un módulo de API serverless fiable hace explícitos los contratos de despliegue y HTTP, y permite comprobar cada tramo del recorrido sin depender accidentalmente de los detalles internos.**