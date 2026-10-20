# Integración de Lambda y DynamoDB con Terraform y LocalStack

Lambda ejecuta la lógica de aplicación y DynamoDB conserva los datos que deben sobrevivir a una invocación.

Terraform permite declarar ambos servicios, conectar sus configuraciones y limitar los permisos de acceso.

LocalStack permite practicar esta integración mediante una emulación local de las API de AWS.

En esta lección construirás una función Python que crea, consulta y actualiza pedidos ficticios.

La aplicación utilizará escrituras condicionales para evitar sobrescrituras accidentales y detectar cambios concurrentes.

También distinguirás una repetición compatible de una solicitud de un conflicto de identidad.

Las sesiones incluyen pruebas locales, empaquetado, despliegue, invocaciones y verificación independiente de los datos.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los ejemplos no constituyen una aplicación lista para producción.

---

## 1. Objetivos de aprendizaje

Esta lección conecta código, almacenamiento persistente y permisos de ejecución.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una tabla y una función Lambda.
- Configurar el acceso mediante variables de entorno.
- Declarar permisos IAM de alcance limitado.
- Utilizar Boto3 desde el runtime.
- Crear elementos sin sobrescribir existentes.
- Consultar elementos mediante su clave.
- Aplicar control de concurrencia mediante revisiones.
- Interpretar resultados y errores.
- Verificar los datos mediante AWS CLI.

### 1.2. Resultado práctico

Construirás una aplicación de pedidos con operaciones `create`, `get` y `transition`.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de las lecciones anteriores.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, paquetes ZIP, roles IAM, claves DynamoDB y condiciones de escritura.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de tablas.
- Ejecución de Lambda con Python 3.12.
- Acceso a DynamoDB desde el contenedor de ejecución.
- Lecturas consistentes de tabla.
- Escrituras condicionales.
- Actualizaciones condicionales.
- Escritura y consulta de logs.
- Actualización y destrucción de recursos.

### 3.2. Registro del entorno

Documenta Terraform, proveedores, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Advertencia

Una configuración escrita no demuestra que esa combinación haya sido probada.

---

## 4. Arquitectura de la integración

La función será el punto de entrada para las operaciones de aplicación.

### 4.1. Flujo principal

```text
AWS CLI → Lambda → DynamoDB
             │
             └──→ CloudWatch Logs
```

### 4.2. Invocación

AWS CLI enviará eventos JSON directamente a Lambda.

### 4.3. Persistencia

DynamoDB almacenará pedidos que permanecerán entre invocaciones.

### 4.4. Alcance

No utilizaremos API Gateway, DynamoDB Streams ni eventos SQS en esta página.

### 4.5. Ventaja didáctica

Podremos estudiar la integración sin añadir otros contratos de entrada.

---

## 5. Responsabilidades de cada componente

El diseño separa infraestructura, operaciones y datos.

### 5.1. Comparación

| **Componente** | **Responsabilidad** | **No garantiza por sí solo** |
|----------------|---------------------|-----------------------------|
| Terraform | Gestionar infraestructura | Corrección de negocio |
| Lambda | Validar y ejecutar operaciones | Persistencia de variables globales |
| DynamoDB | Conservar elementos | Validez de todos sus atributos |
| IAM | Autorizar llamadas | Corrección del código |
| AWS CLI | Invocar y verificar | Procesamiento exitoso |
| LocalStack | Emular servicios | Comportamiento idéntico a AWS |

Estas responsabilidades facilitan el diagnóstico.

### 5.2. Regla principal

**Una invocación aceptada no demuestra que la operación de negocio haya terminado correctamente.**

### 5.3. Evidencia

Comprobaremos metadatos, respuesta de aplicación y datos persistidos.

---

## 6. Modelo de datos

Cada elemento representará un pedido completo.

### 6.1. Clave primaria

Utilizaremos una clave simple:

```text
order_id = ORDER#1001
```

### 6.2. Atributos principales

El elemento incluirá:

- `customer_id`.
- `total_cents`.
- `currency`.
- `status`.
- `revision`.

### 6.3. Decisión didáctica

No necesitaremos clave de ordenación ni índices.

### 6.4. Precaución

Este modelo no sustituye el diseño por patrones de acceso de una aplicación real.

---

## 7. Operaciones de aplicación

El evento indicará qué operación debe ejecutar el handler.

### 7.1. Contrato

| **Operación** | **Entrada principal** | **Resultado** |
|---------------|----------------------|---------------|
| `create` | Pedido y atributos iniciales | Pedido creado o repetición compatible |
| `get` | Identificador de pedido | Pedido existente |
| `transition` | Pedido, revisión y estado nuevo | Pedido actualizado |

No implementaremos eliminación como operación de aplicación.

### 7.2. Motivo

Conservar los elementos facilita observar revisiones y conflictos.

### 7.3. Limpieza

La destrucción final eliminará la tabla completa.

### 7.4. Separación

Las operaciones de datos no se declararán como recursos Terraform individuales.

---

## 8. Estados y transiciones

El código limitará las transiciones de negocio permitidas.

### 8.1. Máquina de estados

```text
PENDING ──→ PAID ──→ SHIPPED
    │
    └─────→ CANCELLED
```

### 8.2. Estados terminales

`SHIPPED` y `CANCELLED` no permitirán otras transiciones.

### 8.3. Revisión

Cada transición correcta incrementará `revision`.

### 8.4. Restricción

No permitiremos asignar cualquier estado sin revisar el estado anterior.

### 8.5. Alcance

La transición modifica un elemento; no ejecuta cobros ni envíos reales.

---

## 9. Importes y tipos numéricos

Utilizaremos importes enteros para evitar ambigüedades de representación.

### 9.1. Ejemplo

```text
total_cents = 12500
currency = EUR
```

### 9.2. Validación

El importe será un entero positivo dentro de un límite didáctico.

### 9.3. Booleanos

`true` y `false` no se aceptarán como importes ni revisiones.

### 9.4. Python

Un booleano pertenece a una subclase de `int`.

### 9.5. Regla

Utilizaremos `type(value) is int` cuando el contrato exija un entero real.

---

## 10. JSON de aplicación y atributos DynamoDB

Boto3 ofrece interfaces con formatos diferentes.

### 10.1. Comparación

| **Interfaz** | **Formato numérico** | **Ejemplo** |
|--------------|----------------------|-------------|
| JSON de aplicación | Número JSON | `12500` |
| Cliente DynamoDB de bajo nivel | Atributo `N` | `{"N":"12500"}` |
| Recurso de alto nivel | Tipos Python compatibles | Enteros y `Decimal` |

La práctica utilizará el cliente de bajo nivel.

### 10.2. Ventaja

El mismo formato puede inspeccionarse fácilmente con AWS CLI.

### 10.3. Conversión

El código transformará los atributos DynamoDB en un resultado JSON ordinario.

### 10.4. Precaución

No devuelvas estructuras de SDK sin revisar su compatibilidad con JSON.

---

## 11. Creación condicional e identidad

Una creación no debe sustituir silenciosamente un pedido existente.

### 11.1. Condición

Utilizaremos:

```text
attribute_not_exists(order_id)
```

### 11.2. Repetición compatible

Si el pedido existe con los mismos atributos iniciales de negocio, devolveremos una respuesta compatible.

### 11.3. Conflicto

Si el identificador existe con otro cliente, importe o moneda, devolveremos un conflicto.

### 11.4. Límite

La identidad utilizada es la del pedido.

### 11.5. Producción

Una API con idempotencia de solicitudes puede necesitar una clave de solicitud independiente.

---

## 12. Control de concurrencia

La revisión permite detectar que otra operación modificó el pedido.

### 12.1. Secuencia

```text
Leer revisión → Validar transición → Actualizar si sigue igual
```

### 12.2. Condición final

La escritura comprobará revisión y estado observados.

### 12.3. Conflicto

Si otro proceso cambió el elemento, la actualización condicional debe fallar.

### 12.4. Atomicidad

La condición y la actualización se evalúan conjuntamente sobre ese elemento.

### 12.5. Precaución

La lectura previa y la escritura no son una transacción separada que bloquee a otros procesos.

---

## 13. Contrato de respuesta

Las invocaciones directas devolverán un objeto de aplicación.

### 13.1. Respuesta correcta

```json
{
  "ok": true,
  "code": "created",
  "order": {
    "order_id": "ORDER#1001",
    "status": "PENDING",
    "revision": 1
  }
}
```

### 13.2. Rechazo esperado

Utilizaremos `ok = false` y un código descriptivo.

### 13.3. Distinción

No son respuestas Lambda proxy ni códigos HTTP.

### 13.4. Consecuencia

Una respuesta de negocio negativa no tiene por qué incluir `FunctionError`.

---

## 14. Errores esperados e inesperados

El código distinguirá validación, conflictos y errores del servicio.

### 14.1. Comparación

| **Situación** | **Respuesta prevista** | **Interpretación** |
|---------------|------------------------|--------------------|
| Evento inválido | `invalid_request` | Error del contrato |
| Pedido ausente | `not_found` | Resultado de negocio |
| Revisión obsoleta | `conflict` | Cambio concurrente o repetición |
| Transición prohibida | `invalid_transition` | Regla de negocio |
| Servicio inaccesible | Excepción | Fallo de integración |

No convertiremos cualquier excepción en una respuesta exitosa.

### 14.2. Logs

Los fallos inesperados dejarán evidencia de diagnóstico.

### 14.3. Seguridad

La respuesta no debe exponer credenciales ni documentos internos de configuración.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente.

### 15.1. Crear estructura

```bash
mkdir -p terraform-lambda-dynamodb/src
mkdir -p terraform-lambda-dynamodb/tests
mkdir -p terraform-lambda-dynamodb/build
mkdir -p terraform-lambda-dynamodb/eventos
mkdir -p terraform-lambda-dynamodb/resultados
mkdir -p terraform-lambda-dynamodb/planes
cd terraform-lambda-dynamodb
```

### 15.2. Organización

`src/` contendrá validación y acceso a datos.

### 15.3. Aislamiento

No reutilices el estado de otra lección.

---

## 16. Protección de archivos

Separa material versionable y artefactos operativos.

### 16.1. `.gitignore`

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

### 16.2. Qué conservar

Versiona código, pruebas, eventos ficticios y `.terraform.lock.hcl`.

### 16.3. Precaución

Los planes, estados y logs pueden contener información sensible.

---

## 17. Docker y ejecución de Lambda

LocalStack necesita un entorno compatible para ejecutar el runtime.

### 17.1. Contenedores

La configuración habitual utiliza Docker para los runtimes Lambda.

### 17.2. Socket

Montaremos `/var/run/docker.sock`.

### 17.3. Advertencia

Ese acceso concede un control amplio sobre Docker y el host.

### 17.4. Recomendación

Utiliza imágenes confiables y un entorno aislado.

### 17.5. Arquitectura

La función utilizará Python 3.12 y `x86_64`.

### 17.6. Compatibilidad

Un equipo ARM puede necesitar emulación y una validación adicional.

---

## 18. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 18.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 18.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: lambda,dynamodb,iam,sts,logs
      AWS_DEFAULT_REGION: us-east-1
      LAMBDA_DOCKER_NETWORK: curso-lambda-dynamodb
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-lambda-dynamodb
```

---

## 19. Endpoints y credenciales ficticias

El endpoint depende del proceso que realiza la llamada.

### 19.1. Direcciones

Desde el host utilizaremos `http://localhost:4566`.

Desde el runtime utilizaremos `http://localstack:4566`.

### 19.2. Terminal

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 19.3. Verificación

Consulta `dynamodb list-tables` y `lambda list-functions` con el endpoint local.

### 19.4. Regla

Dentro del contenedor, `localhost` no representa automáticamente a LocalStack.

---

## 20. Código de dominio: identificadores

Crea `src/domain.py` para mantener la validación independiente del SDK.

### 20.1. Primera parte

```python
import re

TRANSITIONS = {
    "PENDING": {"PAID", "CANCELLED"},
    "PAID": {"SHIPPED"},
    "SHIPPED": set(),
    "CANCELLED": set(),
}


def identifier(value, prefix):
    pattern = rf"{prefix}#[A-Z0-9-]{{1,32}}"
    if not isinstance(value, str) or not re.fullmatch(pattern, value):
        raise ValueError(f"Identificador {prefix} inválido.")
    return value


def positive_integer(value, name, maximum):
    if type(value) is not int or not 1 <= value <= maximum:
        raise ValueError(f"{name} debe ser un entero positivo válido.")
    return value
```

---

## 21. Código de dominio: eventos

Completa `src/domain.py` con la validación de operaciones.

### 21.1. Segunda parte

```python
def validate_event(event):
    if not isinstance(event, dict):
        raise ValueError("El evento debe ser un objeto JSON.")

    action = event.get("action")
    if action not in {"create", "get", "transition"}:
        raise ValueError("action no está soportada.")

    result = {
        "action": action,
        "order_id": identifier(event.get("order_id"), "ORDER"),
    }

    if action == "create":
        result["customer_id"] = identifier(event.get("customer_id"), "CUSTOMER")
        result["total_cents"] = positive_integer(
            event.get("total_cents"), "total_cents", 100_000_000
        )
        if event.get("currency") != "EUR":
            raise ValueError("La moneda del laboratorio debe ser EUR.")
        result["currency"] = "EUR"

    if action == "transition":
        result["expected_revision"] = positive_integer(
            event.get("expected_revision"), "expected_revision", 1_000_000
        )
        status = event.get("new_status")
        if not isinstance(status, str) or status not in TRANSITIONS:
            raise ValueError("new_status no está soportado.")
        result["new_status"] = status

    return result
```

---

## 22. Código de integración: cliente y conversiones

Crea `src/app.py`.

### 22.1. Primera parte

```python
import logging
import os

import boto3
from botocore.exceptions import ClientError

from domain import TRANSITIONS, validate_event

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ddb = boto3.client(
    "dynamodb",
    endpoint_url=os.environ["LOCAL_ENDPOINT"],
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
)
TABLE = os.environ["TABLE_NAME"]


def key(order_id):
    return {"order_id": {"S": order_id}}


def decode(item):
    return {
        "order_id": item["order_id"]["S"],
        "customer_id": item["customer_id"]["S"],
        "total_cents": int(item["total_cents"]["N"]),
        "currency": item["currency"]["S"],
        "status": item["status"]["S"],
        "revision": int(item["revision"]["N"]),
    }
```

---

## 23. Código de integración: lectura y creación

Añade los helpers y la operación de creación.

### 23.1. Segunda parte

```python
def get_order(order_id):
    result = ddb.get_item(
        TableName=TABLE, Key=key(order_id), ConsistentRead=True
    )
    return decode(result["Item"]) if "Item" in result else None


def condition_failed(error):
    return error.response["Error"]["Code"] == "ConditionalCheckFailedException"


def create_order(command):
    item = {
        "order_id": {"S": command["order_id"]},
        "customer_id": {"S": command["customer_id"]},
        "total_cents": {"N": str(command["total_cents"])},
        "currency": {"S": command["currency"]},
        "status": {"S": "PENDING"},
        "revision": {"N": "1"},
    }
    try:
        ddb.put_item(
            TableName=TABLE, Item=item,
            ConditionExpression="attribute_not_exists(order_id)",
        )
        return {"ok": True, "code": "created", "order": decode(item)}
    except ClientError as error:
        if not condition_failed(error):
            raise
```

---

## 24. Código de integración: repetición compatible

Completa la función `create_order` con este fragmento.

### 24.1. Tercera parte

```python
        existing = get_order(command["order_id"])
        fields = ("order_id", "customer_id", "total_cents", "currency")

        if existing and all(existing[name] == command[name] for name in fields):
            return {
                "ok": True,
                "code": "already_exists",
                "order": existing,
            }

        return {"ok": False, "code": "identity_conflict"}
```

### 24.2. Decisión

La repetición no devuelve el estado inicial si el pedido ya avanzó.

### 24.3. Resultado

Devuelve el pedido actual sin restablecer su estado.

### 24.4. Límite

No conservamos una respuesta histórica por identificador de solicitud.

---

## 25. Código de integración: transición

Añade la operación de actualización condicional.

### 25.1. Cuarta parte

```python
def transition_order(command):
    existing = get_order(command["order_id"])
    if existing is None:
        return {"ok": False, "code": "not_found"}

    expected = command["expected_revision"]
    if existing["revision"] != expected:
        return {"ok": False, "code": "conflict"}

    new_status = command["new_status"]
    if new_status not in TRANSITIONS[existing["status"]]:
        return {"ok": False, "code": "invalid_transition"}

    try:
        result = ddb.update_item(
            TableName=TABLE,
            Key=key(command["order_id"]),
            UpdateExpression="SET #status = :new, #revision = :next",
            ConditionExpression="#revision = :expected AND #status = :old",
            ExpressionAttributeNames={
                "#status": "status", "#revision": "revision",
            },
            ExpressionAttributeValues={
                ":new": {"S": new_status},
                ":next": {"N": str(expected + 1)},
                ":expected": {"N": str(expected)},
                ":old": {"S": existing["status"]},
            },
            ReturnValues="ALL_NEW",
        )
        return {"ok": True, "code": "updated", "order": decode(result["Attributes"])}
    except ClientError as error:
        if condition_failed(error):
            return {"ok": False, "code": "conflict"}
        raise
```

---

## 26. Código de integración: handler

Completa `src/app.py` con el punto de entrada.

### 26.1. Quinta parte

```python
def handler(event, context):
    try:
        command = validate_event(event)
    except ValueError:
        return {"ok": False, "code": "invalid_request"}

    logger.info("Operación validada; action=%s", command["action"])

    try:
        if command["action"] == "create":
            return create_order(command)

        if command["action"] == "transition":
            return transition_order(command)

        order = get_order(command["order_id"])
        if order is None:
            return {"ok": False, "code": "not_found"}
        return {"ok": True, "code": "found", "order": order}

    except Exception:
        logger.exception("Fallo de integración durante la operación.")
        raise
```

### 26.2. Seguridad

El log no imprime el evento completo ni los datos del cliente.

---

## 27. Pruebas locales del dominio

Crea `tests/test_domain.py`.

### 27.1. Código

```python
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from domain import validate_event


class DomainTests(unittest.TestCase):
    def test_get(self):
        result = validate_event({"action": "get", "order_id": "ORDER#1001"})
        self.assertEqual(result["order_id"], "ORDER#1001")

    def test_boolean_revision_rejected(self):
        with self.assertRaises(ValueError):
            validate_event({
                "action": "transition", "order_id": "ORDER#1001",
                "expected_revision": True, "new_status": "PAID",
            })

    def test_unknown_action_rejected(self):
        with self.assertRaises(ValueError):
            validate_event({"action": "delete", "order_id": "ORDER#1001"})
```

### 27.2. Ejecución

Utiliza `python3 -m unittest discover -s tests -v`.

---

## 28. Requisitos y proveedor Terraform

Crea `versions.tf` y `providers.tf`.

### 28.1. Requisitos

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

### 28.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    lambda   = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    iam      = "http://localhost:4566"
    sts      = "http://localhost:4566"
    logs     = "http://localhost:4566"
  }
}
```

---

## 29. Variables y tabla

Crea los archivos de identidad y almacenamiento.

### 29.1. `variables.tf`

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 29.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
```

### 29.3. `storage.tf`

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "curso-lambda-orders-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }
}
```

---

## 30. Paquete, nombre y logs

Crea `lambda.tf` con los componentes iniciales.

### 30.1. Configuración

```hcl
locals {
  function_name = "curso-lambda-orders-${var.suffix}"
}

data "archive_file" "function" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/function.zip"

  excludes = [
    "__pycache__"
  ]
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
```

### 30.2. Estructura

`app.py` y `domain.py` deben quedar en la raíz del ZIP.

### 30.3. Verificación

Inspecciona el paquete; elimina cachés locales si aparecen en el artefacto.

---

## 31. Rol y permisos de ejecución

Crea `iam.tf`.

### 31.1. Configuración

```hcl
resource "aws_iam_role" "function" {
  name = "curso-lambda-orders-role-${var.suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "execution" {
  name = "orders-and-logs"
  role = aws_iam_role.function.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.orders.arn
      },
      {
        Effect = "Allow"
        Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.function.arn}:*"
      }
    ]
  })
}
```

---

## 32. Función y outputs

Completa `lambda.tf` y crea `outputs.tf`.

### 32.1. Función

```hcl
resource "aws_lambda_function" "orders" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn
  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256
  memory_size      = 128
  timeout          = 15

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.orders.name
      LOCAL_ENDPOINT = "http://localstack:4566"
    }
  }

  depends_on = [aws_iam_role_policy.execution]
}
```

### 32.2. Outputs

```hcl
output "function_name" {
  value = aws_lambda_function.orders.function_name
}

output "table_name" {
  value = aws_dynamodb_table.orders.name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.function.name
}
```

---

## 33. Sesión 1: pruebas y despliegue

Duración orientativa: 25 minutos.

### 33.1. Secuencia

```bash
python3 -m unittest discover -s tests -v
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
python3 -m zipfile -l build/function.zip
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 33.2. Resultado esperado

Deben crearse cinco recursos gestionados.

### 33.3. Identificadores

```bash
FUNCTION="$(terraform output -raw function_name)"
TABLE="$(terraform output -raw table_name)"
```

---

## 34. Sesión 2: verificar disponibilidad

Comprueba los servicios antes de invocar operaciones.

### 34.1. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb describe-table --table-name "$TABLE" \
  > resultados/table.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda get-function-configuration --function-name "$FUNCTION" \
  > resultados/function.json
```

### 34.2. Condiciones

La tabla debe estar activa.

La función debe estar activa y sin actualización pendiente.

### 34.3. Red

Verifica que el runtime puede resolver el nombre `localstack`.

### 34.4. Precaución

Una función activa puede seguir fallando por configuración de cliente o permisos.

---

## 35. Sesión 3: crear el primer pedido

Crea `eventos/create.json`.

### 35.1. Evento

```json
{
  "action": "create",
  "order_id": "ORDER#1001",
  "customer_id": "CUSTOMER#001",
  "total_cents": 12500,
  "currency": "EUR"
}
```

### 35.2. Invocación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda invoke --function-name "$FUNCTION" \
  --invocation-type RequestResponse \
  --cli-binary-format raw-in-base64-out \
  --payload file://eventos/create.json \
  resultados/create-response.json > resultados/create-metadata.json
```

### 35.3. Resultado

Debe devolver `created`, estado `PENDING` y revisión uno.

---

## 36. Sesión 4: verificar persistencia independiente

AWS CLI puede comprobar el elemento sin utilizar el handler.

### 36.1. Consulta

```bash
jq -n '{order_id:{S:"ORDER#1001"}}' > eventos/key.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb get-item --table-name "$TABLE" \
  --key file://eventos/key.json --consistent-read \
  > resultados/item.json

jq '.Item' resultados/item.json
```

### 36.2. Comprobaciones

Busca cliente, importe, estado y revisión.

### 36.3. Formato

El resultado de AWS CLI utiliza atributos DynamoDB.

### 36.4. Evidencia

Conserva esta respuesta junto con la respuesta de aplicación.

---

## 37. Sesión 5: repetir y provocar un conflicto

La repetición permite estudiar la creación condicional.

### 37.1. Repetición exacta

Invoca otra vez `eventos/create.json`.

Debe devolver `already_exists` sin sustituir el elemento.

### 37.2. Identidad incompatible

Crea otra solicitud con el mismo pedido y un importe diferente.

### 37.3. Resultado esperado

Debe devolver:

```json
{
  "ok": false,
  "code": "identity_conflict"
}
```

### 37.4. Verificación

El importe persistido debe permanecer en `12500`.

### 37.5. Límite

No existe una actualización implícita por repetir `create`.

---

## 38. Sesión 6: consultar pedidos

Crea un evento de lectura.

### 38.1. `eventos/get.json`

```json
{
  "action": "get",
  "order_id": "ORDER#1001"
}
```

### 38.2. Prueba positiva

Invoca y comprueba `code = "found"`.

### 38.3. Pedido inexistente

Repite con `ORDER#9999`.

### 38.4. Resultado esperado

Debe devolver `not_found`.

### 38.5. Distinción

La ausencia de un elemento es un resultado previsto, no una caída de DynamoDB.

---

## 39. Sesión 7: aplicar una transición

Crea `eventos/pay.json`.

### 39.1. Evento

```json
{
  "action": "transition",
  "order_id": "ORDER#1001",
  "expected_revision": 1,
  "new_status": "PAID"
}
```

### 39.2. Resultado esperado

La primera ejecución debe devolver `updated`.

El estado será `PAID` y la revisión será dos.

### 39.3. Verificación

Consulta DynamoDB directamente para confirmar los valores.

### 39.4. Regla

No cambies manualmente el estado antes de completar las pruebas.

---

## 40. Sesión 8: revisiones obsoletas y reglas de negocio

La condición protege contra actualizaciones basadas en datos antiguos.

### 40.1. Repetición

Invoca otra vez `eventos/pay.json`.

Debe devolver `conflict` porque la revisión uno ya no es actual.

### 40.2. Transición prohibida

Con revisión dos, intenta pasar de `PAID` a `CANCELLED`.

Debe devolver `invalid_transition`.

### 40.3. Transición válida

Con revisión dos, solicita `SHIPPED`.

### 40.4. Resultado

El pedido debe alcanzar revisión tres.

### 40.5. Límite

Repetir una transición no tiene la misma semántica que repetir una creación.

---

## 41. Sesión 9: errores y concurrencia

Amplía las pruebas utilizando identificadores distintos.

### 41.1. Entradas inválidas

Prueba:

- Operación desconocida.
- Importe booleano.
- Moneda incompatible.
- Revisión cero.
- Identificador con formato incorrecto.

### 41.2. Resultado esperado

La aplicación devuelve `invalid_request`.

### 41.3. Concurrencia

Crea otro pedido y lanza dos transiciones con la misma revisión esperada.

### 41.4. Observación

Como máximo una debe actualizar el elemento bajo este protocolo.

### 41.5. Interpretación

La condición de escritura protege incluso si ambas operaciones leyeron la revisión inicial.

---

## 42. Logs, SDK y errores de integración

Los logs complementan la respuesta, pero no sustituyen la verificación persistente.

### 42.1. Consulta

```bash
LOG_GROUP="$(terraform output -raw log_group_name)"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  logs tail "$LOG_GROUP" --since 10m
```

### 42.2. SDK

El runtime validado debe incluir Boto3 o el paquete debe incorporarlo.

### 42.3. Producción

Empaquetar versiones concretas del SDK mejora el control del artefacto.

### 42.4. Credenciales

El código utiliza credenciales del rol; no incluye claves estáticas.

### 42.5. Diagnóstico

Revisa endpoint, tabla, permisos, tipos de atributos y `FunctionError`.

---

## 43. Límites de idempotencia y evolución

El diseño protege ciertas operaciones, no cualquier efecto distribuido.

### 43.1. Creación

Una repetición compatible conserva el pedido existente.

### 43.2. Transición

Una revisión obsoleta produce conflicto, aunque la solicitud anterior haya tenido éxito.

### 43.3. Respuesta perdida

El cliente debe consultar el estado antes de decidir cómo reintentar.

### 43.4. Efectos externos

Cobros, emails y publicaciones requieren estrategias adicionales.

### 43.5. Ampliaciones

Considera claves de idempotencia, transacciones y un patrón outbox según el caso.

### 43.6. Importante

La tabla no impone automáticamente todas las reglas que implementa Lambda.

---

## 44. Limpieza y diferencias respecto a AWS real

Mantén LocalStack disponible durante la destrucción.

### 44.1. Secuencia

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 dynamodb list-tables
aws --endpoint-url=http://localhost:4566 --region us-east-1 lambda list-functions
docker compose down
```

### 44.2. Datos

Eliminar la tabla elimina también los pedidos ficticios.

### 44.3. AWS real

Revisa IAM, cifrado, backups, cuotas, throttling, costes y concurrencia.

### 44.4. Seguridad

Una ejecución local exitosa no demuestra aplicación completa de permisos ni rendimiento equivalente.

---

## 45. Ejercicios y resumen

Consolida las garantías antes de añadir otros servicios.

### 45.1. Ejercicios

1. Añade pruebas unitarias para creación inválida.
2. Comprueba una repetición compatible.
3. Provoca un conflicto de identidad.
4. Ejecuta dos actualizaciones con la misma revisión.
5. Añade otra transición con pruebas.
6. Diseña consultas por cliente antes de crear un índice.
7. Documenta la recuperación tras una respuesta perdida.
8. Destruye y verifica el laboratorio.

### 45.2. Ideas esenciales

Lambda valida y ejecuta; DynamoDB conserva y evalúa condiciones.

Las revisiones protegen contra cambios concurrentes, no contra todos los efectos duplicados.

### 45.3. Idea final

**Una integración mantenible define claves, permisos, condiciones y contratos de respuesta, y verifica sus resultados más allá de la aceptación de una invocación.**