# Lambda: funciones y empaquetado con Terraform y LocalStack

AWS Lambda ejecuta código cuando recibe una invocación, sin exigir que administres directamente el servidor donde se ejecuta.

Terraform permite declarar la función, su configuración, sus permisos y la referencia al paquete de código.

LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección construirás una función Python, generarás su paquete ZIP y la desplegarás mediante Terraform.

Después comprobarás invocaciones correctas, errores de aplicación, logs, actualizaciones de código, versiones y alias.

La práctica distingue el código fuente, el artefacto desplegable y la configuración de infraestructura.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La ejecución local de Lambda requiere revisar la configuración de Docker.

---

## 1. Objetivos de aprendizaje

Esta lección combina desarrollo, empaquetado y gestión declarativa.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar qué representa una función Lambda.
- Definir un handler Python.
- Crear un paquete ZIP con estructura válida.
- Gestionar el paquete mediante `archive_file`.
- Configurar runtime, memoria y timeout.
- Declarar el rol de ejecución.
- Invocar la función mediante AWS CLI.
- Distinguir errores de servicio y de aplicación.
- Consultar logs.
- Publicar versiones y gestionar un alias.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Desplegarás una función que valida una lista de enteros y devuelve resultados calculados.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Python y Terraform.

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

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba en la imagen y edición elegidas:

- Creación de roles IAM.
- Creación de grupos de logs.
- Creación de funciones Lambda.
- Ejecución del runtime Python seleccionado.
- Invocación síncrona.
- Consulta de logs.
- Actualización de código.
- Publicación de versiones.
- Creación de alias.
- Eliminación de funciones y contenedores asociados.

### 3.2. Registro del entorno

Documenta Terraform, proveedores, AWS CLI, Docker e imagen de LocalStack.

### 3.3. Alcance

Las versiones propuestas son una base didáctica, no una afirmación sobre las versiones más recientes.

---

## 4. Qué es una función Lambda

Una función combina código ejecutable y configuración de ejecución.

### 4.1. Componentes principales

Incluye:

- Un paquete de código.
- Un runtime.
- Un handler.
- Memoria asignada.
- Tiempo máximo de ejecución.
- Variables de entorno.
- Un rol de ejecución.
- Opciones de observabilidad.

### 4.2. Invocación

La función recibe un evento y un contexto de ejecución.

### 4.3. Resultado

En una invocación síncrona puede devolver un resultado serializable.

### 4.4. Límite

Lambda no convierte automáticamente el código en una API HTTP.

---

## 5. Responsabilidades del laboratorio

Separaremos código, artefactos, infraestructura y comprobaciones.

### 5.1. Comparación

| **Elemento** | **Responsabilidad** | **Ubicación** |
|--------------|---------------------|---------------|
| Código Python | Validar y procesar eventos | `src/` |
| Pruebas | Comprobar comportamiento local | `tests/` |
| Paquete ZIP | Transportar código desplegable | `build/` |
| Terraform | Gestionar infraestructura | Raíz |
| AWS CLI | Invocar y consultar | Terminal |
| LocalStack | Emular servicios AWS | Docker |

Esta separación facilita localizar errores.

### 5.2. Regla principal

**Un código correcto puede fallar si el paquete o la configuración son incorrectos.**

### 5.3. Verificación

Comprobaremos cada capa antes de pasar a la siguiente.

---

## 6. Runtime y arquitectura

El runtime define el entorno de lenguaje utilizado para ejecutar el código.

### 6.1. Runtime de la práctica

Utilizaremos:

```text
python3.12
```

### 6.2. Arquitectura

La función se configurará con:

```text
x86_64
```

### 6.3. Compatibilidad

El docente debe verificar que LocalStack y Docker pueden ejecutar esta combinación.

### 6.4. Hosts ARM

Un equipo ARM puede necesitar emulación para ejecutar una imagen `x86_64`.

### 6.5. Regla

No confundas la arquitectura del portátil con la arquitectura declarada para Lambda.

---

## 7. Handler Python

El handler es el punto de entrada que Lambda invoca.

### 7.1. Formato

```text
módulo.función
```

### 7.2. Configuración del laboratorio

```text
app.handler
```

### 7.3. Interpretación

Lambda buscará:

- Un módulo llamado `app`.
- Una función llamada `handler`.

### 7.4. Ubicación

El archivo `app.py` debe estar disponible en la raíz del paquete ZIP.

### 7.5. Error habitual

Empaquetar `src/app.py` dentro del ZIP sin ajustar el handler.

---

## 8. Evento y contexto

El handler recibe dos argumentos con responsabilidades diferentes.

### 8.1. Evento

Contiene los datos entregados por el invocador.

En esta práctica será un objeto JSON.

### 8.2. Contexto

Publica información de la ejecución, como el identificador de solicitud.

### 8.3. Firma

```python
def handler(event, context):
    ...
```

### 8.4. Precaución

La estructura del evento depende del origen de la invocación.

### 8.5. Alcance

No utilizaremos todavía eventos de SQS, S3 ni API Gateway.

---

## 9. Contrato del evento

El evento contendrá una lista de números enteros.

### 9.1. Ejemplo correcto

```json
{
  "request_id": "exercise-001",
  "values": [2, 4, 6]
}
```

### 9.2. Reglas

El consumidor aceptará:

- Entre uno y cincuenta valores.
- Números enteros.
- Valores entre menos un millón y un millón.
- Un `request_id` opcional de tipo cadena.

### 9.3. Booleanos

No aceptaremos `true` ni `false` como números.

### 9.4. Motivo

En Python, los booleanos pertenecen a una subclase de `int`.

---

## 10. Contrato de la respuesta

La respuesta describirá el resultado y la versión de aplicación.

### 10.1. Ejemplo conceptual

```json
{
  "request_id": "exercise-001",
  "count": 3,
  "total": 12,
  "minimum": 2,
  "maximum": 6,
  "app_version": "1",
  "environment": "local",
  "aws_request_id": "identificador-de-ejecucion"
}
```

### 10.2. Serialización

Utilizaremos cadenas y números compatibles con JSON.

### 10.3. Distinción

`app_version` es una etiqueta de la aplicación.

No es necesariamente el número de versión publicado por Lambda.

---

## 11. Paquetes ZIP y paquetes de imagen

Lambda admite modalidades de empaquetado diferentes.

### 11.1. Comparación

| **Modalidad** | **Artefacto** | **Responsabilidad adicional** |
|---------------|---------------|-------------------------------|
| ZIP | Archivo comprimido | Estructura y dependencias |
| Imagen | Imagen de contenedor | Imagen base, runtime y registro |

La práctica utiliza ZIP.

### 11.2. Ventaja didáctica

Podemos inspeccionar directamente el archivo generado.

### 11.3. Precaución

Un ZIP válido como archivo no garantiza una función ejecutable.

### 11.4. Continuación

Primero construiremos un paquete sin dependencias externas.

---

## 12. Docker y ejecución de Lambda

LocalStack necesita ejecutar el código en un entorno compatible.

### 12.1. Contenedores de ejecución

La configuración habitual utiliza contenedores Docker para los runtimes Lambda.

### 12.2. Acceso al daemon

LocalStack necesitará comunicarse con Docker.

### 12.3. Socket

Montaremos:

```text
/var/run/docker.sock
```

### 12.4. Advertencia de seguridad

El acceso al socket concede un control amplio sobre Docker y el host.

### 12.5. Regla

Utiliza únicamente imágenes confiables y un entorno de laboratorio aislado.

---

## 13. Red de Docker

Los contenedores de ejecución deben conectarse a una red adecuada.

### 13.1. Nombre del laboratorio

Utilizaremos una red llamada:

```text
curso-lambda-lab
```

### 13.2. Configuración

LocalStack recibirá el nombre mediante `LAMBDA_DOCKER_NETWORK`.

### 13.3. Coincidencia

El valor debe coincidir con el nombre real de la red Docker.

### 13.4. Laboratorios simultáneos

Si ejecutas varias copias, utiliza nombres de red distintos en cada una.

### 13.5. Alcance

La función de esta página no realizará llamadas a otros servicios AWS.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Crear estructura

```bash
mkdir -p terraform-lambda-localstack/src
mkdir -p terraform-lambda-localstack/tests
mkdir -p terraform-lambda-localstack/build
mkdir -p terraform-lambda-localstack/eventos
mkdir -p terraform-lambda-localstack/resultados
mkdir -p terraform-lambda-localstack/planes
cd terraform-lambda-localstack
```

### 14.2. Directorio de build

Debe existir antes de generar el ZIP.

### 14.3. Aislamiento

No reutilices el estado de otra práctica.

---

## 15. Protección de archivos

Separa código versionable y artefactos generados.

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

### 15.2. Qué versionar

Versiona código, pruebas, eventos ficticios y `.terraform.lock.hcl`.

### 15.3. Precaución

Los planes y logs pueden contener información sensible.

---

## 16. Selección de LocalStack

Utiliza una imagen validada por el docente.

### 16.1. Referencia

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 16.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 16.3. Dependencias de ejecución

La primera invocación puede requerir descargar una imagen de runtime.

### 16.4. Entorno sin conexión

El docente debe preparar y comprobar las imágenes necesarias con antelación.

---

## 17. Docker Compose

La configuración publica LocalStack únicamente en la interfaz local.

### 17.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: lambda,iam,sts,logs
      AWS_DEFAULT_REGION: us-east-1
      LAMBDA_DOCKER_NETWORK: curso-lambda-lab
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lambda_lab

networks:
  lambda_lab:
    name: curso-lambda-lab
```

### 17.2. Compatibilidad

Revisa la ruta del socket si utilizas Docker rootless u otra instalación.

---

## 18. Arranque y comprobaciones Docker

Comprueba el entorno antes de desplegar Terraform.

### 18.1. Comandos

```bash
docker compose up -d
docker compose ps
docker network inspect curso-lambda-lab
docker compose logs --tail=100 localstack
```

### 18.2. Resultado esperado

LocalStack debe estar disponible y conectado a la red configurada.

### 18.3. Diagnóstico

Revisa permisos del socket y disponibilidad del daemon.

### 18.4. Precaución

No cambies permisos globales del socket sin comprender sus consecuencias.

---

## 19. Credenciales ficticias y conexión

Configura AWS CLI en la terminal actual.

### 19.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 19.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 lambda list-functions
aws --endpoint-url=http://localhost:4566 --region us-east-1 iam list-roles
aws --endpoint-url=http://localhost:4566 --region us-east-1 logs describe-log-groups
```

### 19.3. Continuación

Espera respuestas válidas antes de desplegar recursos.

---

## 20. Código de validación

Crea `src/app.py` con la validación del contrato.

### 20.1. Primera parte

```python
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def validate_event(event):
    if not isinstance(event, dict):
        raise ValueError("El evento debe ser un objeto JSON.")

    values = event.get("values")
    if not isinstance(values, list):
        raise ValueError("values debe ser una lista.")

    if not 1 <= len(values) <= 50:
        raise ValueError("values debe contener entre 1 y 50 elementos.")

    for value in values:
        if type(value) is not int:
            raise ValueError("Todos los valores deben ser enteros.")
        if not -1_000_000 <= value <= 1_000_000:
            raise ValueError("Un valor está fuera del rango permitido.")
```

---

## 21. Código del handler

Completa el mismo archivo con este fragmento.

### 21.1. Segunda parte

```python
    request_id = event.get("request_id", "unspecified")
    if not isinstance(request_id, str):
        raise ValueError("request_id debe ser una cadena.")

    return values, request_id


def handler(event, context):
    values, request_id = validate_event(event)
    logger.info("Evento validado; cantidad=%s", len(values))

    return {
        "request_id": request_id,
        "count": len(values),
        "total": sum(values),
        "minimum": min(values),
        "maximum": max(values),
        "app_version": os.environ.get("APP_VERSION", "unknown"),
        "environment": os.environ.get("APP_ENV", "unknown"),
        "aws_request_id": getattr(context, "aws_request_id", "local-test"),
    }
```

### 21.2. Logs

El código no imprime el evento completo.

---

## 22. Pruebas unitarias

Las pruebas locales comprueban comportamiento sin desplegar infraestructura.

### 22.1. `tests/test_app.py`

```python
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from app import handler


class HandlerTests(unittest.TestCase):
    def setUp(self):
        self.context = SimpleNamespace(aws_request_id="test-request")

    def test_valid_values(self):
        result = handler({"values": [2, 4, 6]}, self.context)
        self.assertEqual(result["total"], 12)
        self.assertEqual(result["count"], 3)

    def test_boolean_rejected(self):
        with self.assertRaises(ValueError):
            handler({"values": [True]}, self.context)

    def test_empty_list_rejected(self):
        with self.assertRaises(ValueError):
            handler({"values": []}, self.context)
```

---

## 23. Sesión 1: comprobar el código local

Duración orientativa: 15 minutos.

### 23.1. Ejecución

```bash
python3 -m unittest discover -s tests -v
```

### 23.2. Resultado esperado

Las tres pruebas deben finalizar correctamente.

### 23.3. Alcance

Estas pruebas no comprueban:

- Estructura del ZIP.
- Permisos IAM.
- Ejecución del runtime Lambda.
- Integración con CloudWatch Logs.

### 23.4. Entregable

Añade una prueba que rechace un número fuera del rango permitido.

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

Conserva el archivo de bloqueo generado durante `init`.

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
    lambda = "http://localhost:4566"
    iam    = "http://localhost:4566"
    sts    = "http://localhost:4566"
    logs   = "http://localhost:4566"
  }
}
```

### 25.2. Alcance

No añadas otros servicios sin revisar sus endpoints.

---

## 26. Variables del proyecto

Crea `variables.tf`.

### 26.1. Declaraciones

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

variable "memory_size" {
  type    = number
  default = 128
}
```

### 26.2. Memoria

La configuración inicial es suficiente para este procesamiento pequeño.

---

## 27. Entradas y nombre de función

Crea `terraform.tfvars` y `locals.tf`.

### 27.1. Entradas

```hcl
suffix       = "alumno01"
app_version  = "1"
memory_size  = 128
```

### 27.2. Local

```hcl
locals {
  function_name = "curso-lambda-calculator-${var.suffix}"
}
```

### 27.3. Identidad

Alumnos que compartan LocalStack necesitan sufijos diferentes.

### 27.4. Precaución

El sufijo de función no cambia automáticamente el nombre de la red Docker.

---

## 28. Generación del paquete ZIP

Crea `package.tf`.

### 28.1. Configuración

```hcl
data "archive_file" "function" {
  type        = "zip"
  source_file = "${path.module}/src/app.py"
  output_path = "${path.module}/build/function.zip"
}
```

### 28.2. Resultado

El paquete contendrá `app.py` en su raíz.

### 28.3. Alcance

La generación se ejecuta localmente mediante el proveedor `archive`.

No representa una consulta a AWS.

### 28.4. Precaución

No borres el archivo generado entre el plan guardado y su aplicación.

---

## 29. Grupo de logs

Crea `logs.tf`.

### 29.1. Configuración

```hcl
resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

### 29.2. Ventaja

Terraform gestiona el grupo y su retención explícitamente.

### 29.3. Producción

Ajusta retención, clasificación de datos y permisos según las necesidades reales.

---

## 30. Rol de ejecución

Crea `iam.tf`.

### 30.1. Política de confianza

```hcl
resource "aws_iam_role" "function" {
  name = "curso-lambda-role-${var.suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}
```

### 30.2. Responsabilidad

La confianza permite que el servicio Lambda asuma el rol.

---

## 31. Permisos de escritura de logs

Añade la política al mismo archivo.

### 31.1. Configuración

```hcl
resource "aws_iam_role_policy" "logs" {
  name = "write-function-logs"
  role = aws_iam_role.function.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = [
        aws_cloudwatch_log_group.function.arn,
        "${aws_cloudwatch_log_group.function.arn}:*"
      ]
    }]
  })
}
```

### 31.2. Alcance

No concedemos acceso general a S3, SQS ni DynamoDB.

---

## 32. Función Lambda

Crea `main.tf`.

### 32.1. Configuración

```hcl
resource "aws_lambda_function" "calculator" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn

  package_type = "Zip"
  filename     = data.archive_file.function.output_path

  source_code_hash = data.archive_file.function.output_base64sha256

  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  memory_size = var.memory_size
  timeout     = 10
  publish     = true

  environment {
    variables = {
      APP_ENV     = "local"
      APP_VERSION = var.app_version
    }
  }

  depends_on = [aws_iam_role_policy.logs]
}
```

---

## 33. Alias y outputs

Añade el alias y crea `outputs.tf`.

### 33.1. Alias

```hcl
resource "aws_lambda_alias" "lab" {
  name             = "lab"
  function_name    = aws_lambda_function.calculator.function_name
  function_version = aws_lambda_function.calculator.version
}
```

### 33.2. Outputs

```hcl
output "function_name" {
  value = aws_lambda_function.calculator.function_name
}

output "published_version" {
  value = aws_lambda_function.calculator.version
}

output "alias_name" {
  value = aws_lambda_alias.lab.name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.function.name
}
```

---

## 34. Sesión 2: inicializar y revisar el paquete

Duración orientativa: 20 minutos.

### 34.1. Comandos

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
python3 -m zipfile -l build/function.zip
terraform show planes/create.tfplan
```

### 34.2. Resultado esperado

El ZIP debe contener `app.py`.

### 34.3. Recursos

El plan inicial debe crear cinco recursos gestionados.

### 34.4. Distinción

La fuente `archive_file` no añade un recurso remoto de AWS.

---

## 35. Sesión 3: aplicar y esperar disponibilidad

La creación del recurso no debe confundirse con cualquier comprobación funcional.

### 35.1. Aplicación

```bash
terraform apply planes/create.tfplan
FUNCTION="$(terraform output -raw function_name)"
ALIAS="$(terraform output -raw alias_name)"
VERSION_1="$(terraform output -raw published_version)"
LOG_GROUP="$(terraform output -raw log_group_name)"
```

### 35.2. Espera

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda wait function-active-v2 --function-name "$FUNCTION"
```

### 35.3. Compatibilidad

Comprueba que la versión de AWS CLI dispone de este waiter.

---

## 36. Sesión 4: consultar configuración

Verifica handler, runtime y versión antes de invocar.

### 36.1. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda get-function-configuration \
  --function-name "$FUNCTION" \
  > resultados/configuration.json
```

### 36.2. Lectura

```bash
python3 -m json.tool resultados/configuration.json
```

### 36.3. Comprobaciones

Busca `Runtime`, `Handler`, `MemorySize`, `Timeout` y `State`.

### 36.4. Precaución

Una función activa puede seguir fallando por errores de código.

---

## 37. Sesión 5: invocación correcta

Crea `eventos/valid.json` con el ejemplo de la sección 9.

### 37.1. Invocación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda invoke \
  --function-name "$FUNCTION" \
  --qualifier "$ALIAS" \
  --invocation-type RequestResponse \
  --cli-binary-format raw-in-base64-out \
  --payload file://eventos/valid.json \
  --log-type Tail \
  resultados/response.json \
  > resultados/invoke-metadata.json
```

### 37.2. Respuesta

Ejecuta `python3 -m json.tool resultados/response.json`.

### 37.3. Resultado esperado

La suma debe ser doce y la cantidad debe ser tres.

---

## 38. Sesión 6: distinguir respuesta y metadatos

AWS CLI separa el resultado de aplicación de la respuesta de la API.

### 38.1. Archivos

| **Archivo** | **Contenido** | **Comprobación** |
|-------------|---------------|------------------|
| `response.json` | Resultado del handler | Valores calculados |
| `invoke-metadata.json` | Metadatos de invocación | Estado y versión |

Ambos son necesarios para interpretar correctamente la prueba.

### 38.2. `StatusCode`

Un valor exitoso no demuestra por sí solo que el handler terminó correctamente.

### 38.3. Error de aplicación

Revisa si aparece `FunctionError`.

### 38.4. Versión

`ExecutedVersion` ayuda a identificar la versión realmente ejecutada.

---

## 39. Sesión 7: consultar logs

La invocación puede devolver un fragmento final de los logs.

### 39.1. Decodificar `LogResult`

```bash
python3 - <<'PY'
import base64
import json

with open("resultados/invoke-metadata.json", encoding="utf-8") as file:
    metadata = json.load(file)

encoded = metadata.get("LogResult")
if encoded:
    print(base64.b64decode(encoded).decode("utf-8", errors="replace"))
else:
    print("La respuesta no contiene LogResult.")
PY
```

### 39.2. Consulta adicional

Utiliza `aws logs tail` con el endpoint local y el nombre del grupo.

---

## 40. Sesión 8: provocar un error de aplicación

Crea `eventos/invalid.json`:

```json
{
  "request_id": "exercise-invalid",
  "values": [2, true, 6]
}
```

### 40.1. Invocación

Repite el comando de invocación utilizando este evento y archivos de salida distintos.

### 40.2. Resultado esperado

El runtime debe devolver un error relacionado con `ValueError`.

### 40.3. Interpretación

La API de invocación puede responder correctamente aunque la aplicación falle.

### 40.4. Entregable

Identifica `FunctionError`, el cuerpo del error y el registro de logs correspondiente.

---

## 41. Sesión 9: actualizar código y configuración

Realizaremos un cambio observable sin modificar el contrato de entrada.

### 41.1. Código

Añade al diccionario de respuesta:

```python
"operation": "integer-summary",
```

### 41.2. Configuración

Cambia `app_version` a `"2"` en `terraform.tfvars`.

### 41.3. Plan

```bash
python3 -m unittest discover -s tests -v
terraform plan -out=planes/update.tfplan
terraform show planes/update.tfplan
terraform apply planes/update.tfplan
```

### 41.4. Resultado

Terraform actualiza la función, publica una versión y mueve el alias.

---

## 42. Sesión 10: comparar versiones y alias

Una versión publicada representa una instantánea de código y configuración.

### 42.1. Identificadores

```bash
VERSION_2="$(terraform output -raw published_version)"
```

### 42.2. Práctica

Invoca utilizando:

- `--qualifier "$VERSION_1"`.
- `--qualifier "$VERSION_2"`.
- `--qualifier "$ALIAS"`.

### 42.3. Resultado esperado

La versión inicial conserva el comportamiento anterior.

La nueva versión devuelve `app_version = "2"` y el campo añadido.

### 42.4. Alias

El alias `lab` apunta a la versión gestionada actualmente por Terraform.

---

## 43. Sesión 11: comprobar estabilidad y hashes

El hash permite detectar cambios en el artefacto.

### 43.1. Plan sin cambios

```bash
terraform plan
```

### 43.2. Resultado esperado

No debe proponer cambios si código y configuración permanecen iguales.

### 43.3. `source_code_hash`

Terraform compara la referencia declarada al contenido del paquete.

### 43.4. Precaución

No demuestra que el código sea seguro ni que supere las pruebas.

### 43.5. Reproducibilidad

Metadatos y herramientas de empaquetado pueden afectar los bytes del ZIP.

---

## 44. Dependencias Python y estructura del paquete

La función inicial utiliza solamente la biblioteca estándar.

### 44.1. Dependencias externas

Si añades bibliotecas, deben estar disponibles en el paquete o en una capa compatible.

### 44.2. Estructura habitual

```text
function.zip
├── app.py
├── paquete_externo/
└── metadatos_de_distribucion/
```

### 44.3. Instalación

Construye un directorio de staging y empaquétalo, no todo el entorno virtual.

### 44.4. Binarios

Dependencias nativas deben ser compatibles con Linux, runtime y arquitectura Lambda.

### 44.5. Regla

No copies automáticamente bibliotecas compiladas para macOS o Windows.

---

## 45. Pipeline, artefactos y secretos

Un proyecto de producción necesita controles adicionales.

### 45.1. Flujo recomendado

```text
Código → Pruebas → Build → Artefacto identificado → Plan → Aplicación
```

### 45.2. Artefacto

Conserva el ZIP exacto revisado y su hash.

### 45.3. Plan guardado

El paquete debe seguir disponible en la ruta esperada durante el apply.

### 45.4. Secretos

No introduzcas credenciales reales en código ni variables Terraform versionadas.

### 45.5. Estado

Las variables de entorno declaradas pueden aparecer en estado y planes.

---

## 46. Memoria, timeout y reutilización

Estos parámetros afectan al comportamiento de ejecución.

### 46.1. Memoria

En AWS real influye también en recursos de cómputo disponibles.

### 46.2. Timeout

Limita la duración máxima de una invocación.

No equivale al timeout HTTP del cliente.

### 46.3. Reutilización

Un entorno de ejecución puede reutilizarse entre invocaciones.

### 46.4. Estado global

No utilices variables globales como almacenamiento persistente fiable.

### 46.5. LocalStack

No extrapoles latencia, cold starts ni rendimiento desde la emulación.

---

## 47. Diagnóstico de errores frecuentes

Clasifica el fallo antes de cambiar configuración al azar.

### 47.1. Lista de revisión

Comprueba:

- Handler incorrecto.
- Archivo fuera de la raíz del ZIP.
- Runtime incompatible.
- Dependencia ausente.
- Arquitectura incorrecta.
- Docker sin permisos.
- Imagen de runtime no disponible.
- Función todavía pendiente.
- Error del contrato de entrada.
- Grupo de logs o permisos incorrectos.

### 47.2. Herramientas

Consulta configuración, logs de función y logs de LocalStack.

### 47.3. Regla

Un error de importación y un error de validación requieren soluciones diferentes.

---

## 48. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 48.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
```

### 48.2. Verificación remota

Consulta `lambda list-functions` y el grupo de logs del laboratorio.

### 48.3. Docker

Después ejecuta `docker compose down`.

### 48.4. Precaución

Revisa posibles contenedores de ejecución residuales sin eliminar contenedores ajenos.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar API y empaquetado, no certificar producción.

### 49.1. Aspectos adicionales

En AWS real revisa:

- IAM y políticas de recursos.
- Límites de paquetes.
- Runtime y calendario de soporte.
- Concurrencia y throttling.
- Costes y observabilidad.
- Cifrado de configuración.
- Redes VPC cuando correspondan.
- Reintentos según origen de invocación.

### 49.2. Permisos

El rol de ejecución no sustituye los permisos del invocador.

### 49.3. Seguridad

Una ejecución local exitosa no valida completamente las restricciones IAM reales.

---

## 50. Ejercicios y resumen

Consolida código, paquete y configuración antes de añadir disparadores.

### 50.1. Ejercicios

1. Añade pruebas para tipos y rangos inválidos.
2. Inspecciona la estructura del ZIP.
3. Invoca eventos correctos e incorrectos.
4. Consulta logs sin imprimir datos sensibles.
5. Publica otra versión y compara resultados.
6. Explica la diferencia entre versión y alias.
7. Documenta el hash del artefacto desplegado.
8. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

El handler debe coincidir con el paquete y el runtime.

El resultado de invocación debe comprobarse junto con sus metadatos.

### 50.3. Idea final

**Una función desplegable requiere código probado, un artefacto correcto y una configuración de ejecución explícita y verificable.**