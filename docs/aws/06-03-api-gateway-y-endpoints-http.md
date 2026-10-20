# API Gateway y endpoints HTTP con Terraform y LocalStack

API Gateway permite exponer operaciones HTTP y dirigir las solicitudes hacia componentes que implementan la lógica de la aplicación.

En esta lección construirás una API que invoca una función Lambda escrita en Python.

Terraform gestionará la API, sus rutas, sus integraciones, el despliegue y los permisos necesarios.

LocalStack emulará los servicios para que puedas practicar sin utilizar una cuenta real de AWS.

El laboratorio incluye un endpoint de salud y otro que calcula resultados sobre una lista de números.

También comprobarás contratos de entrada, códigos HTTP, errores, logs y actualizaciones de configuración.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> La API utiliza el producto **API Gateway REST API**.
>
> Un endpoint HTTP no implica necesariamente utilizar el producto **HTTP API**.

---

## 1. Objetivos de aprendizaje

Esta lección conecta solicitudes HTTP, funciones Lambda e infraestructura declarativa.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar API, recurso, método, integración, deployment y stage.
- Crear rutas HTTP mediante Terraform.
- Configurar una integración Lambda proxy.
- Autorizar a API Gateway para invocar Lambda.
- Implementar respuestas compatibles con la integración.
- Probar endpoints mediante `curl`.
- Interpretar errores de cliente y servidor.
- Gestionar cambios que requieren otro deployment.
- Destruir y verificar el laboratorio.

### 1.2. Resultado práctico

Construirás los endpoints `GET /health` y `POST /sum`.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Lambda e IAM.

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, paquetes ZIP, roles IAM, referencias y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación de REST APIs.
- Creación de recursos y métodos.
- Integración Lambda proxy.
- Deployment y stage.
- Permisos de invocación Lambda.
- Ejecución del runtime Python elegido.
- Invocación HTTP mediante la URL local seleccionada.
- Consulta de logs.
- Actualización y destrucción.

### 3.2. Registro de versiones

Documenta Terraform, proveedores, Docker, AWS CLI e imagen de LocalStack.

### 3.3. Alcance

Las versiones propuestas son una base didáctica, no una identificación de las versiones más recientes.

---

## 4. Qué representa API Gateway

API Gateway recibe solicitudes y las conecta con una integración.

### 4.1. Recorrido del laboratorio

```text
Cliente HTTP → API Gateway → Lambda → Respuesta HTTP
```

### 4.2. Responsabilidades

API Gateway identifica la ruta y el método.

Lambda interpreta los datos y ejecuta la lógica.

### 4.3. Operaciones de negocio

El gateway no calcula automáticamente el resultado de una lista de números.

### 4.4. Consecuencia

Una integración correctamente creada puede seguir devolviendo errores de aplicación.

### 4.5. Regla

Verifica infraestructura y comportamiento como capas diferentes.

---

## 5. REST API y HTTP API

API Gateway ofrece productos distintos que pueden exponer endpoints HTTP.

### 5.1. Comparación

| **Producto** | **Recursos Terraform principales** | **Aspecto relevante** |
|--------------|-------------------------------------|----------------------|
| REST API | `aws_api_gateway_*` | Recursos, métodos y deployments explícitos |
| HTTP API | `aws_apigatewayv2_*` | Rutas e integraciones con otro modelo |
| WebSocket API | `aws_apigatewayv2_*` | Comunicación basada en conexiones |

No mezcles recursos de ambos modelos en una misma configuración sin una arquitectura explícita.

### 5.2. Elección didáctica

Utilizaremos REST API para estudiar las relaciones de forma detallada.

### 5.3. Contratos Lambda

El formato del evento puede variar según producto e integración.

### 5.4. Precaución

No copies un handler de payload HTTP API v2 esperando que funcione sin cambios.

---

## 6. Componentes de una REST API

La configuración divide responsabilidades en recursos separados.

### 6.1. Comparación

| **Componente** | **Responsabilidad** | **Ejemplo** |
|----------------|---------------------|-------------|
| API | Contenedor de configuración | Calculadora |
| Recurso | Segmento de ruta | `/sum` |
| Método | Operación HTTP | `POST` |
| Integración | Destino de la operación | Lambda |
| Deployment | Instantánea desplegable | Configuración revisada |

Cada componente ocupa una dirección propia en Terraform.

### 6.2. Stage

Un stage expone un deployment bajo un nombre.

### 6.3. Laboratorio

El stage se llamará `lab`.

### 6.4. Resultado

La URL incluirá ese stage antes de la ruta.

---

## 7. Métodos HTTP

El método forma parte del contrato de una operación.

### 7.1. Operaciones previstas

| **Método y ruta** | **Entrada** | **Respuesta correcta** |
|------------------|-------------|------------------------|
| `GET /health` | Sin cuerpo requerido | Estado de aplicación |
| `POST /sum` | Objeto JSON con `values` | Resumen numérico |

La ruta sola no identifica completamente la operación.

### 7.2. Ejemplo

`GET /sum` no equivale a `POST /sum`.

### 7.3. Métodos no configurados

API Gateway puede rechazar la solicitud antes de invocar Lambda.

### 7.4. Regla

Las pruebas deben comprobar combinación de método y ruta.

---

## 8. Integración Lambda proxy

La modalidad proxy entrega información de la solicitud al handler.

### 8.1. Configuración

Utilizaremos:

```text
AWS_PROXY
```

### 8.2. Evento

Lambda recibirá campos como:

- `httpMethod`.
- `path`.
- `headers`.
- `body`.
- `isBase64Encoded`.
- `requestContext`.

### 8.3. Cuerpo

En esta modalidad, `body` suele ser una cadena.

### 8.4. Consecuencia

Un cuerpo JSON necesita decodificarse antes de tratarlo como objeto Python.

---

## 9. Respuesta de una integración proxy

El handler debe devolver una estructura compatible con API Gateway.

### 9.1. Ejemplo

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"total\":12}",
  "isBase64Encoded": false
}
```

### 9.2. Distinción

`body` contiene texto JSON, no un diccionario Python.

### 9.3. Error habitual

Devolver directamente `{"total": 12}` sin el contrato de integración.

### 9.4. Consecuencia

Una respuesta inválida puede producir un error de gateway.

---

## 10. Códigos HTTP del laboratorio

Los códigos comunican el resultado de la operación.

### 10.1. Contrato

| **Código** | **Significado en esta práctica** | **Ejemplo** |
|------------|----------------------------------|-------------|
| `200` | Operación completada | Suma calculada |
| `400` | Solicitud incompatible | JSON inválido |
| `415` | Tipo de contenido no admitido | `text/plain` |
| `404` | Ruta no reconocida por el handler | Evento de prueba directo |
| `500` | Error inesperado | Fallo interno |

Los errores del gateway pueden seguir otro contrato.

### 10.2. Diferencia

Una ruta inexistente puede no alcanzar Lambda.

### 10.3. Observación

En REST API puedes encontrar respuestas como `403` con un mensaje de ruta no encontrada.

### 10.4. Regla

No deduzcas la causa solamente a partir del número HTTP.

---

## 11. Autorización y alcance local

La práctica no configura autenticación para clientes HTTP.

### 11.1. Método

Utilizaremos:

```hcl
authorization = "NONE"
```

### 11.2. Significado

El método no exige un autorizador ni firma IAM del cliente.

### 11.3. Aislamiento

El puerto de LocalStack se publicará en `127.0.0.1`.

### 11.4. Advertencia

Una API sin autenticación no es una configuración general adecuada para producción.

### 11.5. AWS real

Revisa autorizadores, IAM y controles de acceso según el caso.

---

## 12. Dos relaciones de permisos

Invocar Lambda y ejecutar su código son relaciones diferentes.

### 12.1. Comparación

| **Relación** | **Mecanismo** | **Responsabilidad** |
|--------------|---------------|--------------------|
| Lambda asume un rol | Política de confianza | Permitir ejecución bajo el rol |
| Código escribe logs | Política del rol | Autorizar operaciones de logs |
| API Gateway invoca Lambda | Política de función | Autorizar al servicio invocador |

El rol de ejecución no sustituye el permiso de invocación.

### 12.2. Principal invocador

Utilizaremos `apigateway.amazonaws.com`.

### 12.3. Restricción

Cada permiso se limitará a la API, stage, método y ruta.

### 12.4. Terraform

Gestionaremos estas autorizaciones mediante `aws_lambda_permission`.

---

## 13. Arquitectura del laboratorio

Construiremos una función compartida por las dos operaciones.

### 13.1. Flujo

```text
GET  /lab/health ─┐
                  ├→ Lambda http-handler → CloudWatch Logs
POST /lab/sum ────┘
```

### 13.2. Función

El handler seleccionará la operación mediante método y ruta.

### 13.3. Ventaja

La práctica reduce recursos de código para concentrarse en el gateway.

### 13.4. Producción

Una función por operación o por dominio puede ser más adecuada en otros sistemas.

### 13.5. Regla

La elección debe responder al diseño de la aplicación.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Crear estructura

```bash
mkdir -p terraform-api-gateway-localstack/src
mkdir -p terraform-api-gateway-localstack/tests
mkdir -p terraform-api-gateway-localstack/build
mkdir -p terraform-api-gateway-localstack/eventos
mkdir -p terraform-api-gateway-localstack/resultados
mkdir -p terraform-api-gateway-localstack/planes
cd terraform-api-gateway-localstack
```

### 14.2. Artefactos

`build/` contendrá el ZIP.

### 14.3. Aislamiento

No reutilices el estado de otra práctica.

---

## 15. Protección de archivos

Separa material versionable y resultados operativos.

### 15.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
build/
resultados/
planes/
__pycache__/
*.pyc
crash.log
```

### 15.2. Qué conservar

Versiona código, pruebas y `.terraform.lock.hcl`.

### 15.3. Precaución

Estados, planes y logs pueden contener información sensible.

---

## 16. Docker y seguridad del runtime

LocalStack necesita un entorno compatible para ejecutar Lambda.

### 16.1. Contenedores

La configuración habitual utiliza Docker para los runtimes.

### 16.2. Socket

Montaremos `/var/run/docker.sock`.

### 16.3. Advertencia

Ese acceso concede un control amplio sobre Docker y el host.

### 16.4. Recomendación

Utiliza imágenes confiables y un entorno aislado.

### 16.5. Arquitectura

La función utilizará Python 3.12 y `x86_64`.

### 16.6. Compatibilidad

Un equipo ARM puede requerir emulación.

---

## 17. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 17.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: apigateway,lambda,iam,sts,logs
      AWS_DEFAULT_REGION: us-east-1
      LAMBDA_DOCKER_NETWORK: curso-api-gateway
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-api-gateway
```

---

## 18. Arranque y credenciales ficticias

Prepara los servicios antes de desplegar Terraform.

### 18.1. Comandos

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 18.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 apigateway get-rest-apis
aws --endpoint-url=http://localhost:4566 --region us-east-1 lambda list-functions
```

### 18.3. Continuación

Espera respuestas válidas y comprueba la red Docker.

---

## 19. Código: respuesta y validación numérica

Crea `src/app.py`.

### 19.1. Primera parte

```python
import base64
import binascii
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def response(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, ensure_ascii=False),
        "isBase64Encoded": False,
    }


def validate_values(document):
    if not isinstance(document, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON.")
    values = document.get("values")
    if not isinstance(values, list) or not 1 <= len(values) <= 50:
        raise ValueError("values debe contener entre 1 y 50 elementos.")
    if any(type(value) is not int for value in values):
        raise ValueError("Todos los valores deben ser enteros.")
    if any(abs(value) > 1_000_000 for value in values):
        raise ValueError("Un valor está fuera del rango permitido.")
    return values
```

---

## 20. Código: selección de operación

Completa el mismo archivo con este fragmento.

### 20.1. Segunda parte

```python
def handler(event, context):
    if not isinstance(event, dict):
        return response(400, {"error": "invalid_event"})

    method = event.get("httpMethod")
    path = event.get("path")
    request_id = getattr(context, "aws_request_id", "local-test")

    logger.info("Solicitud recibida; method=%s path=%s", method, path)

    if method == "GET" and path == "/health":
        return response(200, {
            "status": "ok",
            "app_version": os.environ.get("APP_VERSION", "unknown"),
        })

    if method != "POST" or path != "/sum":
        return response(404, {"error": "route_not_found"})

    headers = {
        str(key).lower(): str(value)
        for key, value in (event.get("headers") or {}).items()
    }
    media_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if media_type != "application/json":
        return response(415, {"error": "unsupported_media_type"})
```

---

## 21. Código: cuerpo y resultado

Añade esta tercera parte al handler.

### 21.1. Procesamiento

```python
    try:
        body = event.get("body")
        if not isinstance(body, str):
            raise ValueError("El cuerpo debe contener texto JSON.")

        if event.get("isBase64Encoded"):
            body = base64.b64decode(body, validate=True).decode("utf-8")

        document = json.loads(body)
        values = validate_values(document)

        return response(200, {
            "count": len(values),
            "total": sum(values),
            "minimum": min(values),
            "maximum": max(values),
            "app_version": os.environ.get("APP_VERSION", "unknown"),
        })

    except (ValueError, UnicodeError, binascii.Error):
        return response(400, {"error": "invalid_request"})

    except Exception:
        logger.exception("Error inesperado; request_id=%s", request_id)
        return response(500, {"error": "internal_error"})
```

### 21.2. Seguridad

Los errores enviados al cliente no contienen una traza interna.

---

## 22. Pruebas unitarias

Las pruebas locales comprueban el contrato del handler.

### 22.1. `tests/test_app.py`

```python
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from app import handler


class HandlerTests(unittest.TestCase):
    def setUp(self):
        self.context = SimpleNamespace(aws_request_id="test")

    def test_health(self):
        result = handler({"httpMethod": "GET", "path": "/health"}, self.context)
        self.assertEqual(result["statusCode"], 200)

    def test_sum(self):
        event = {
            "httpMethod": "POST", "path": "/sum",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"values": [2, 4, 6]}),
        }
        result = handler(event, self.context)
        self.assertEqual(json.loads(result["body"])["total"], 12)
```

---

## 23. Sesión 1: verificar el handler

Duración orientativa: 15 minutos.

### 23.1. Ejecución

```bash
python3 -m unittest discover -s tests -v
```

### 23.2. Resultado esperado

Las dos pruebas deben finalizar correctamente.

### 23.3. Ampliaciones

Añade pruebas para:

- JSON inválido.
- Lista vacía.
- Booleanos.
- Tipo de contenido incorrecto.
- Cuerpo codificado en Base64.

### 23.4. Límite

Las pruebas locales no comprueban la integración real con API Gateway.

---

## 24. Requisitos de Terraform

Crea `versions.tf`.

### 24.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
```

### 24.2. Bloqueo

Conserva las versiones concretas seleccionadas durante `init`.

---

## 25. Proveedor con endpoints locales

Crea `providers.tf`.

### 25.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway = "http://localhost:4566"
    lambda     = "http://localhost:4566"
    iam        = "http://localhost:4566"
    sts        = "http://localhost:4566"
    logs       = "http://localhost:4566"
  }
}
```

### 25.2. Alcance

Todos los servicios utilizados tienen un endpoint explícito.

---

## 26. Variables y nombres

Crea los archivos de entrada.

### 26.1. `variables.tf`

```hcl
variable "suffix" {
  type     = string
  nullable = false

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

### 26.2. `terraform.tfvars`

```hcl
suffix      = "alumno01"
app_version = "1"
```

---

## 27. Colección de rutas

Crea `locals.tf`.

### 27.1. Configuración

```hcl
locals {
  function_name = "curso-api-handler-${var.suffix}"
  stage_name    = "lab"

  routes = {
    health = {
      path_part = "health"
      method    = "GET"
    }
    sum = {
      path_part = "sum"
      method    = "POST"
    }
  }
}
```

### 27.2. Claves estables

`health` y `sum` identifican las instancias Terraform.

### 27.3. Alcance

Esta colección modela un método por recurso.

---

## 28. Paquete y grupo de logs

Crea `lambda.tf`.

### 28.1. Recursos iniciales

```hcl
data "archive_file" "function" {
  type        = "zip"
  source_file = "${path.module}/src/app.py"
  output_path = "${path.module}/build/function.zip"
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
```

### 28.2. Estructura

El ZIP debe contener `app.py` en su raíz.

### 28.3. Retención

Los logs tendrán una retención explícita de siete días.

---

## 29. Rol de ejecución y logs

Crea `iam.tf`.

### 29.1. Configuración

```hcl
resource "aws_iam_role" "function" {
  name = "curso-api-role-${var.suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "logs" {
  name = "write-function-logs"
  role = aws_iam_role.function.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = [
        aws_cloudwatch_log_group.function.arn,
        "${aws_cloudwatch_log_group.function.arn}:*"
      ]
    }]
  })
}
```

---

## 30. Función Lambda

Añade la función a `lambda.tf`.

### 30.1. Configuración

```hcl
resource "aws_lambda_function" "http" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn

  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256

  memory_size = 128
  timeout     = 10

  environment {
    variables = {
      APP_VERSION = var.app_version
    }
  }

  depends_on = [aws_iam_role_policy.logs]
}
```

---

## 31. API, recursos y métodos

Crea `api.tf`.

### 31.1. Configuración

```hcl
resource "aws_api_gateway_rest_api" "lab" {
  name = "curso-api-${var.suffix}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "route" {
  for_each = local.routes

  rest_api_id = aws_api_gateway_rest_api.lab.id
  parent_id   = aws_api_gateway_rest_api.lab.root_resource_id
  path_part   = each.value.path_part
}

resource "aws_api_gateway_method" "route" {
  for_each = local.routes

  rest_api_id   = aws_api_gateway_rest_api.lab.id
  resource_id   = aws_api_gateway_resource.route[each.key].id
  http_method   = each.value.method
  authorization = "NONE"
}
```

---

## 32. Integraciones Lambda

Añade las integraciones a `api.tf`.

### 32.1. Configuración

```hcl
resource "aws_api_gateway_integration" "route" {
  for_each = local.routes

  rest_api_id = aws_api_gateway_rest_api.lab.id
  resource_id = aws_api_gateway_resource.route[each.key].id
  http_method = aws_api_gateway_method.route[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.http.invoke_arn
}
```

### 32.2. Dos métodos diferentes

El método público puede ser `GET`.

La llamada de integración a Lambda utiliza `POST`.

### 32.3. Regla

No copies el método público en `integration_http_method`.

---

## 33. Permisos de invocación

Añade las autorizaciones de API Gateway hacia Lambda.

### 33.1. Configuración

```hcl
resource "aws_lambda_permission" "api" {
  for_each = local.routes

  statement_id  = "AllowApi-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.http.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = join("/", [
    aws_api_gateway_rest_api.lab.execution_arn,
    local.stage_name,
    each.value.method,
    each.value.path_part
  ])
}
```

### 33.2. Restricción

El permiso está limitado a la API, stage, método y ruta.

### 33.3. Precaución

Las pruebas internas del gateway pueden utilizar otro stage de ejecución.

---

## 34. Deployment y stage

Crea `deployment.tf`.

### 34.1. Configuración

```hcl
resource "aws_api_gateway_deployment" "lab" {
  rest_api_id = aws_api_gateway_rest_api.lab.id

  triggers = {
    configuration = sha1(jsonencode({
      routes       = local.routes
      resources    = { for k, v in aws_api_gateway_resource.route : k => v.id }
      methods      = { for k, v in aws_api_gateway_method.route : k => v.http_method }
      integrations = { for k, v in aws_api_gateway_integration.route : k => v.uri }
      integration_type = "AWS_PROXY"
      authorization    = "NONE"
    }))
  }

  depends_on = [
    aws_api_gateway_integration.route,
    aws_lambda_permission.api
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "lab" {
  rest_api_id   = aws_api_gateway_rest_api.lab.id
  deployment_id = aws_api_gateway_deployment.lab.id
  stage_name    = local.stage_name
}
```

---

## 35. Outputs y URL local

Crea `outputs.tf`.

### 35.1. Configuración

```hcl
output "api_id" {
  value = aws_api_gateway_rest_api.lab.id
}

output "function_name" {
  value = aws_lambda_function.http.function_name
}

output "base_url" {
  value = "http://localhost:4566/_aws/execute-api/${aws_api_gateway_rest_api.lab.id}/${aws_api_gateway_stage.lab.stage_name}"
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.function.name
}
```

### 35.2. Compatibilidad

El docente debe validar esta forma de invocación en la imagen seleccionada.

### 35.3. Alternativas

Otras versiones pueden admitir formatos adicionales de URL local.

---

## 36. Sesión 2: desplegar infraestructura

Duración orientativa: 25 minutos.

### 36.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
python3 -m zipfile -l build/function.zip
terraform apply planes/create.tfplan
```

### 36.2. Resultado esperado

Deben crearse quince recursos gestionados.

### 36.3. Identificadores

```bash
BASE_URL="$(terraform output -raw base_url)"
FUNCTION="$(terraform output -raw function_name)"
```

---

## 37. Sesión 3: comprobar el endpoint de salud

El primer endpoint permite comprobar el recorrido básico.

### 37.1. Solicitud

```bash
curl --silent --show-error \
  --dump-header resultados/health-headers.txt \
  --output resultados/health-body.json \
  --write-out '%{http_code}\n' \
  "$BASE_URL/health"
```

### 37.2. Resultado esperado

El código HTTP debe ser `200`.

### 37.3. Cuerpo

Ejecuta `jq '.' resultados/health-body.json`.

### 37.4. Verificación

Debe contener `status = "ok"` y la versión de aplicación configurada.

---

## 38. Sesión 4: publicar una solicitud correcta

Crea `eventos/sum-valid.json`.

### 38.1. Documento

```json
{
  "values": [2, 4, 6]
}
```

### 38.2. Solicitud

```bash
curl --silent --show-error \
  --request POST \
  --header 'Content-Type: application/json' \
  --data-binary @eventos/sum-valid.json \
  --dump-header resultados/sum-headers.txt \
  --output resultados/sum-body.json \
  --write-out '%{http_code}\n' \
  "$BASE_URL/sum"
```

### 38.3. Resultado

La respuesta debe indicar total doce y cantidad tres.

---

## 39. Sesión 5: comprobar errores de cliente

Utiliza solicitudes distintas para separar las causas.

### 39.1. JSON inválido

Envía:

```bash
curl --silent --show-error -i \
  -X POST -H 'Content-Type: application/json' \
  --data '{"values":' "$BASE_URL/sum"
```

### 39.2. Tipo de contenido incorrecto

Repite con `Content-Type: text/plain`.

### 39.3. Valores incompatibles

Envía `{"values":[true]}` con tipo JSON.

### 39.4. Resultados esperados

JSON o valores inválidos producen `400`.

Tipo de contenido incompatible produce `415`.

---

## 40. Sesión 6: comprobar rutas y métodos

Una solicitud puede fallar antes de alcanzar el handler.

### 40.1. Pruebas

```bash
curl --silent --show-error -i "$BASE_URL/missing"
curl --silent --show-error -i "$BASE_URL/sum"
curl --silent --show-error -i -X POST "$BASE_URL/health"
```

### 40.2. Interpretación

Estas combinaciones no están declaradas como operaciones válidas.

### 40.3. Mensajes del gateway

El cuerpo y código pueden diferir del `404` definido dentro del handler.

### 40.4. Entregable

Relaciona cada respuesta con una operación configurada o ausente.

---

## 41. Sesión 7: comprobar logs

Los logs ayudan a distinguir gateway y aplicación.

### 41.1. Consulta

```bash
LOG_GROUP="$(terraform output -raw log_group_name)"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  logs tail "$LOG_GROUP" --since 10m
```

### 41.2. Resultado

Las solicitudes que alcanzan Lambda deben dejar el registro de método y ruta.

### 41.3. Precaución

Los logs pueden aparecer con retraso.

### 41.4. Diferencia

Un rechazo anterior a Lambda puede no generar ese registro.

### 41.5. Seguridad

No imprimas cuerpos completos como estrategia habitual de diagnóstico.

---

## 42. Sesión 8: actualizar la aplicación

Cambiar código Lambda no siempre requiere otro deployment del gateway.

### 42.1. Cambio

Establece `app_version = "2"`.

### 42.2. Plan y aplicación

```bash
terraform plan -out=planes/app-v2.tfplan
terraform show planes/app-v2.tfplan
terraform apply planes/app-v2.tfplan
curl --silent --show-error "$BASE_URL/health" | jq '.'
```

### 42.3. Resultado esperado

El endpoint devuelve la nueva versión.

### 42.4. Motivo

La integración sigue apuntando a la misma función no cualificada.

---

## 43. Sesión 9: estudiar deployments

El deployment representa una instantánea de la configuración de API Gateway.

### 43.1. Cambios relevantes

Modificar rutas, métodos o integraciones puede requerir otro deployment.

### 43.2. Referencia del stage

El stage debe apuntar a la instantánea nueva.

### 43.3. Terraform

Los triggers del laboratorio detectan determinados cambios declarados.

### 43.4. Precaución

Si añades nuevas opciones, incorpóralas también al mecanismo de detección.

### 43.5. Regla

`depends_on` ordena creación; no provoca por sí solo reemplazo ante cualquier cambio.

### 43.6. Verificación

Revisa el plan y comprueba la API desplegada, no solamente la configuración editable.

---

## 44. CORS y clientes de navegador

CORS es una restricción aplicada por navegadores, no por todos los clientes HTTP.

### 44.1. `curl`

Una solicitud exitosa mediante `curl` no demuestra compatibilidad CORS.

### 44.2. Preflight

Un navegador puede enviar `OPTIONS` antes de un `POST` JSON entre orígenes.

### 44.3. Laboratorio inicial

No configuraremos CORS en los recursos obligatorios.

### 44.4. Ampliación

Añade manejo de `OPTIONS` y encabezados CORS en las respuestas.

### 44.5. Seguridad

Restringe los orígenes permitidos según el caso.

### 44.6. Distinción

CORS no sustituye autenticación ni autorización.

---

## 45. Seguridad, límites y observabilidad

La práctica enseña integración, no una API completa de producción.

### 45.1. Controles adicionales

Revisa:

- Autenticación.
- Autorización por operación.
- Validación de solicitudes.
- Throttling y cuotas.
- Límites de payload.
- Timeout de integración.
- Logs de acceso.
- Protección de datos.

### 45.2. API keys

No utilices una API key como sustituto general de autenticación de usuarios.

### 45.3. HTTPS

La URL local HTTP no reproduce la terminación TLS de un endpoint real.

---

## 46. Pruebas internas y permisos restringidos

Las pruebas de consola o API pueden utilizar un contexto de ejecución distinto.

### 46.1. Stage de prueba

API Gateway puede utilizar `test-invoke-stage`.

### 46.2. Política del laboratorio

Los permisos están limitados a `lab`.

### 46.3. Consecuencia

Una prueba interna puede fallar aunque la URL desplegada funcione correctamente.

### 46.4. Diagnóstico

Comprueba el ARN de origen utilizado en la invocación.

### 46.5. Recomendación

No amplíes a todos los stages sin necesidad.

### 46.6. Alcance

Las sesiones obligatorias utilizan la URL desplegada mediante `curl`.

---

## 47. Diagnóstico de problemas frecuentes

Clasifica el fallo antes de modificar configuración.

### 47.1. Lista de revisión

Comprueba:

- URL y stage correctos.
- Método y ruta declarados.
- Deployment actualizado.
- Integración `AWS_PROXY`.
- Método de integración `POST`.
- ARN de invocación Lambda.
- Permiso de función.
- Estado de Lambda.
- Docker y runtime.
- Formato de respuesta proxy.

### 47.2. Evidencia

Conserva código HTTP, encabezados, cuerpo y logs.

### 47.3. Regla

Una respuesta `5xx` no identifica por sí sola qué componente falló.

---

## 48. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 48.1. Plan revisado

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
```

### 48.2. Verificación

Consulta REST APIs, funciones y el grupo de logs del laboratorio.

### 48.3. Docker

Después ejecuta `docker compose down`.

### 48.4. Precaución

Revisa contenedores de runtime residuales sin eliminar recursos ajenos.

### 48.5. Estado

Borrar el estado no equivale a destruir la infraestructura.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar API y contratos, no certificar seguridad ni rendimiento.

### 49.1. Aspectos adicionales

En AWS real revisa:

- IAM y políticas de recursos.
- Autorizadores.
- Dominios personalizados.
- Certificados.
- Logs y métricas.
- Costes.
- Cuotas.
- Propagación.
- Límites de integración.

### 49.2. URL

El formato local de invocación no es el formato del endpoint público real.

### 49.3. Seguridad

Una invocación local exitosa no demuestra aplicación completa de permisos IAM.

---

## 50. Ejercicios y resumen

Consolida el contrato antes de añadir más rutas.

### 50.1. Ejercicios

1. Añade pruebas para errores de entrada.
2. Comprueba método, ruta, cuerpo y encabezados.
3. Añade una nueva operación con su integración y permiso.
4. Actualiza los triggers del deployment.
5. Implementa CORS para un origen de prueba.
6. Compara rechazo del gateway y rechazo del handler.
7. Documenta permisos de ejecución e invocación.
8. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

La integración proxy exige contratos de evento y respuesta.

Las rutas necesitan integración, autorización de invocación y deployment.

### 50.3. Idea final

**Una API mantenible conecta método, ruta, permisos y lógica mediante contratos explícitos que pueden comprobarse de extremo a extremo.**