# Logs y diagnóstico de funciones Lambda con Terraform y LocalStack

Los logs permiten reconstruir lo que ocurrió durante una ejecución, pero solo resultan útiles cuando contienen información suficiente, coherente y segura.

Una función Lambda puede fallar antes de entrar en el handler, durante la validación, al ejecutar su lógica o al comunicarse con otro servicio.

También puede devolver un resultado de negocio negativo sin que la invocación haya fallado técnicamente.

En esta lección construirás una función Python con logs estructurados y varios escenarios de diagnóstico.

Terraform gestionará la función, el grupo de logs, su retención y los permisos de ejecución.

LocalStack permitirá practicar invocaciones, consultas, actualizaciones y recuperación del laboratorio.

Las sesiones enseñan a relacionar configuración, metadatos, respuesta de aplicación y registros de ejecución.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas secretos ni datos personales en los eventos de prueba.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento de diagnóstico reproducible.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un grupo de logs con Terraform.
- Configurar permisos de escritura para Lambda.
- Emitir registros JSON desde Python.
- Correlacionar solicitudes y ejecuciones.
- Diferenciar errores técnicos y rechazos de negocio.
- Consultar logs mediante AWS CLI.
- Interpretar errores de importación y timeout.
- Recuperar una configuración funcional.
- Exportar evidencias de manera controlada.

### 1.2. Resultado práctico

Construirás una función de diagnóstico con escenarios correctos, inválidos, excepcionales y lentos.

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
jq --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, paquetes ZIP, roles, variables de entorno y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Ejecución del runtime Python seleccionado.
- Creación del grupo de logs.
- Creación de streams y publicación de eventos.
- Invocación síncrona con metadatos.
- Obtención de `LogResult`.
- Consulta mediante `filter-log-events`.
- Consulta mediante `get-log-events`.
- Actualización del código y configuración.
- Comportamiento ante excepción y timeout.

### 3.2. Registro del entorno

Documenta Terraform, proveedores, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Una API disponible no demuestra comportamiento idéntico al de AWS real.

---

## 4. Qué información aporta un log

Un log describe un acontecimiento observado por un componente.

### 4.1. Preguntas habituales

Los registros pueden ayudar a responder:

- ¿Entró la solicitud en el handler?
- ¿Qué operación se intentó ejecutar?
- ¿Falló la validación?
- ¿Qué etapa produjo una excepción?
- ¿Terminó el procesamiento?
- ¿Cuánto duró la lógica observada?

### 4.2. Límite

Un log no representa automáticamente una transacción ni una prueba de persistencia.

### 4.3. Regla principal

**Los logs explican el recorrido; las verificaciones independientes comprueban sus efectos.**

---

## 5. Fuentes de evidencia

El diagnóstico necesita combinar varias fuentes.

### 5.1. Comparación

| **Fuente** | **Qué muestra** | **Limitación** |
|------------|----------------|----------------|
| Configuración Lambda | Runtime, handler y estado | No demuestra ejecución correcta |
| Metadatos de invocación | Resultado de la API | No equivalen al resultado de negocio |
| Respuesta del handler | Resultado de aplicación | Puede omitir contexto interno |
| Logs de función | Recorrido y errores | Pueden llegar con retraso |
| Logs de LocalStack | Problemas de emulación | No sustituyen los logs de aplicación |

Cada fuente responde a preguntas distintas.

### 5.2. Orden recomendado

Empieza por configuración, invocación y respuesta; después profundiza en los logs.

### 5.3. Evidencia conservada

Las sesiones guardarán archivos separados para cada componente.

---

## 6. Grupo de logs, stream y evento

CloudWatch Logs organiza los registros en varios niveles.

### 6.1. Jerarquía

```text
Grupo de logs
└── Stream
    ├── Evento
    ├── Evento
    └── Evento
```

### 6.2. Grupo del laboratorio

Utilizaremos `/aws/lambda/` seguido del nombre de la función.

### 6.3. Streams

Una función puede escribir en varios streams a lo largo del tiempo.

### 6.4. Precaución

No presupongas que todas las invocaciones aparecen en un único stream.

---

## 7. Logs de plataforma y aplicación

No todos los registros proceden del código del alumno.

### 7.1. Comparación

| **Origen** | **Contenido habitual** | **Control del alumno** |
|------------|------------------------|------------------------|
| Plataforma Lambda | Inicio, fin e información de ejecución | Parcial |
| Runtime | Importación y excepciones no controladas | Indirecto |
| Aplicación | Etapas y resultados propios | Directo |
| LocalStack | Arranque, integración y contenedores | Configuración local |

Los formatos exactos pueden variar según runtime y configuración.

### 7.2. Registros conocidos

En AWS puedes encontrar registros como `START`, `END` y `REPORT`.

### 7.3. Emulación

No exijas una reproducción exacta de todos esos campos en LocalStack.

---

## 8. Logs estructurados

Un registro estructurado utiliza campos identificables en lugar de una frase libre.

### 8.1. Ejemplo

```json
{
  "level": "INFO",
  "event": "request_completed",
  "correlation_id": "SESSION-001",
  "aws_request_id": "identificador-de-ejecucion",
  "duration_ms": 3.5
}
```

### 8.2. Ventaja

Los campos facilitan búsqueda, agrupación y correlación.

### 8.3. Regla

Utiliza nombres de eventos estables, aunque cambie el texto explicativo.

### 8.4. Laboratorio

Emitiremos una línea JSON por registro de aplicación.

---

## 9. Niveles de severidad

La severidad ayuda a expresar la importancia de un acontecimiento.

### 9.1. Convención

| **Nivel** | **Uso previsto** | **Ejemplo** |
|-----------|------------------|-------------|
| `DEBUG` | Detalle técnico controlado | Inicio del cálculo |
| `INFO` | Recorrido normal | Solicitud completada |
| `WARNING` | Situación esperada que requiere atención | Validación rechazada |
| `ERROR` | Fallo de ejecución | Excepción inesperada |

La severidad no sustituye al campo `event`.

### 9.2. Precaución

No marques todas las solicitudes inválidas como incidentes críticos.

### 9.3. Coste

Un nivel detallado puede aumentar volumen y coste en AWS real.

---

## 10. Identificadores de correlación

Utilizaremos identificadores con responsabilidades diferentes.

### 10.1. Identificador de aplicación

`correlation_id` será proporcionado por el evento.

### 10.2. Identificador de ejecución

`aws_request_id` será proporcionado por el contexto Lambda.

### 10.3. Reintentos

Una misma solicitud lógica puede generar varias ejecuciones.

### 10.4. Consecuencia

El mismo `correlation_id` puede aparecer con distintos identificadores Lambda.

### 10.5. Seguridad

Validaremos longitud y caracteres antes de registrar el identificador recibido.

---

## 11. Protección de información

La observabilidad no debe convertirse en una filtración de datos.

### 11.1. No registrar

Evita imprimir:

- Credenciales.
- Tokens.
- Cabeceras de autorización.
- Contraseñas.
- Documentos personales.
- Variables de entorno completas.
- Eventos completos sin clasificación previa.

### 11.2. Estrategia

Registra una lista explícita de campos permitidos.

### 11.3. Límite

La redacción por nombre de campo no elimina todos los posibles secretos.

---

## 12. Contrato del evento

La función recibirá una operación y un identificador de correlación.

### 12.1. Ejemplo correcto

```json
{
  "correlation_id": "SESSION-001",
  "scenario": "success",
  "values": [2, 4, 6]
}
```

### 12.2. Escenarios

Implementaremos `success`, `reject`, `exception` y `slow`.

### 12.3. Validación

La operación correcta aceptará entre uno y cincuenta enteros.

### 12.4. Alcance

Los escenarios son herramientas de enseñanza, no funcionalidades de producción.

---

## 13. Arquitectura del laboratorio

La práctica reduce servicios para concentrarse en observabilidad.

### 13.1. Recorrido

```text
AWS CLI → Lambda → Respuesta de aplicación
             │
             └──→ CloudWatch Logs
```

### 13.2. Terraform

Gestionará función, rol, política y grupo de logs.

### 13.3. Sin almacenamiento de negocio

No utilizaremos DynamoDB ni S3.

### 13.4. Ventaja

Los errores podrán asociarse al runtime, al handler o a la infraestructura local.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Crear estructura

```bash
mkdir -p terraform-lambda-logs/src
mkdir -p terraform-lambda-logs/tests
mkdir -p terraform-lambda-logs/scripts
mkdir -p terraform-lambda-logs/eventos
mkdir -p terraform-lambda-logs/resultados
mkdir -p terraform-lambda-logs/build
mkdir -p terraform-lambda-logs/planes
cd terraform-lambda-logs
```

### 14.2. Aislamiento

No reutilices el estado de otra práctica.

### 14.3. Artefactos

Los resultados guardados serán evidencias locales de las sesiones.

---

## 15. Protección de archivos

Separa código versionable y artefactos operativos.

### 15.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
build/
planes/
resultados/
__pycache__/
*.pyc
crash.log
```

### 15.2. Qué conservar

Versiona configuración, código, pruebas, eventos ficticios y `.terraform.lock.hcl`.

### 15.3. Precaución

Los logs exportados también pueden contener información sensible.

---

## 16. Docker y seguridad del socket

LocalStack necesita ejecutar el código en un entorno compatible.

### 16.1. Runtime

Utilizaremos Python 3.12 y arquitectura `x86_64`.

### 16.2. Docker

La configuración habitual utiliza contenedores para los runtimes Lambda.

### 16.3. Montaje

LocalStack tendrá acceso a `/var/run/docker.sock`.

### 16.4. Advertencia

Ese acceso concede un control amplio sobre Docker y el host.

### 16.5. Recomendación

Utiliza imágenes confiables y un entorno de laboratorio aislado.

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
      SERVICES: lambda,iam,sts,logs
      AWS_DEFAULT_REGION: us-east-1
      LAMBDA_DOCKER_NETWORK: curso-lambda-logs
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-lambda-logs
```

---

## 18. Arranque y credenciales ficticias

Prepara la terminal antes de utilizar AWS CLI.

### 18.1. Configuración

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 18.2. Comprobaciones

Ejecuta `aws_local lambda list-functions` y `aws_local logs describe-log-groups`.

### 18.3. Continuación

Espera respuestas válidas y revisa `docker compose logs --tail=100 localstack`.

---

## 19. Código: logger estructurado

Crea `src/app.py`.

### 19.1. Primera parte

```python
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone

logger = logging.getLogger("course.lambda")
logger.handlers.clear()
stream = logging.StreamHandler(sys.stdout)
stream.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(stream)
logger.propagate = False

configured_level = os.environ.get("APP_LOG_LEVEL", "INFO").upper()
logger.setLevel(getattr(logging, configured_level, logging.INFO))


def emit(level, event_name, correlation_id, context, **fields):
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": logging.getLevelName(level),
        "event": event_name,
        "correlation_id": correlation_id,
        "aws_request_id": getattr(context, "aws_request_id", "local-test"),
        "app_version": os.environ.get("APP_VERSION", "unknown"),
    }
    record.update(fields)
    logger.log(level, json.dumps(record, ensure_ascii=False))
```

---

## 20. Código: validación segura

Completa el mismo archivo con los helpers.

### 20.1. Segunda parte

```python
def safe_correlation(event):
    value = event.get("correlation_id") if isinstance(event, dict) else None
    if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
        return value
    return "invalid-or-missing"


def validate(event):
    if not isinstance(event, dict):
        raise ValueError("invalid_event")

    correlation_id = safe_correlation(event)
    if correlation_id == "invalid-or-missing":
        raise ValueError("invalid_correlation_id")

    scenario = event.get("scenario")
    if scenario not in {"success", "reject", "exception", "slow"}:
        raise ValueError("invalid_scenario")

    if scenario == "success":
        values = event.get("values")
        if not isinstance(values, list) or not 1 <= len(values) <= 50:
            raise ValueError("invalid_values")
        if any(type(value) is not int or abs(value) > 1_000_000 for value in values):
            raise ValueError("invalid_values")

    return scenario
```

---

## 21. Código: entrada y rechazo esperado

Añade el inicio del handler.

### 21.1. Tercera parte

```python
def handler(event, context):
    started = time.perf_counter()
    correlation_id = safe_correlation(event)

    emit(logging.INFO, "request_started", correlation_id, context)

    try:
        scenario = validate(event)
    except ValueError as error:
        emit(
            logging.WARNING, "validation_rejected", correlation_id, context,
            reason=str(error),
        )
        return {"ok": False, "code": "invalid_request"}

    if scenario == "reject":
        emit(
            logging.WARNING, "business_rejected", correlation_id, context,
            reason="exercise_rule",
        )
        return {"ok": False, "code": "business_rejected"}

    emit(
        logging.DEBUG, "processing_started", correlation_id, context,
        scenario=scenario,
    )
```

---

## 22. Código: ejecución, excepción y duración

Completa el handler con este fragmento.

### 22.1. Cuarta parte

```python
    try:
        if scenario == "exception":
            raise RuntimeError("Controlled failure for diagnostics.")

        if scenario == "slow":
            emit(logging.INFO, "sleep_started", correlation_id, context)
            time.sleep(8)
            result = {"ok": True, "code": "slow_completed"}
        else:
            result = {
                "ok": True,
                "code": "completed",
                "count": len(event["values"]),
                "total": sum(event["values"]),
            }

        duration_ms = round((time.perf_counter() - started) * 1000, 3)
        emit(
            logging.INFO, "request_completed", correlation_id, context,
            duration_ms=duration_ms,
        )
        return result

    except Exception as error:
        emit(
            logging.ERROR, "request_failed", correlation_id, context,
            error_type=type(error).__name__,
        )
        raise
```

---

## 23. Decisiones de instrumentación

El código registra campos seleccionados en lugar del evento completo.

### 23.1. Excepciones

El registro propio incluye el tipo de excepción.

La excepción vuelve a lanzarse para conservar el fallo técnico de la invocación.

### 23.2. Traza del runtime

El runtime puede publicar el mensaje y la traza de la excepción no controlada.

### 23.3. Seguridad

El mensaje del fallo simulado es fijo y no incorpora entrada del usuario.

### 23.4. Timeout

Una terminación por timeout puede impedir ejecutar bloques de manejo de errores.

### 23.5. Duración

`duration_ms` mide la lógica observada, no toda la latencia del servicio.

---

## 24. Pruebas unitarias

Crea `tests/test_app.py`.

### 24.1. Código

```python
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from app import handler, safe_correlation


class HandlerTests(unittest.TestCase):
    def setUp(self):
        self.context = SimpleNamespace(aws_request_id="test-request")

    def test_success(self):
        result = handler({
            "correlation_id": "TEST-001",
            "scenario": "success", "values": [2, 4, 6],
        }, self.context)
        self.assertEqual(result["total"], 12)

    def test_rejection(self):
        result = handler({
            "correlation_id": "TEST-002", "scenario": "reject",
        }, self.context)
        self.assertFalse(result["ok"])

    def test_invalid_correlation_is_not_logged_verbatim(self):
        self.assertEqual(
            safe_correlation({"correlation_id": "line\nbreak"}),
            "invalid-or-missing",
        )
```

---

## 25. Requisitos de Terraform

Crea `versions.tf`.

### 25.1. Configuración

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

### 25.2. Bloqueo

Conserva las versiones concretas seleccionadas en `.terraform.lock.hcl`.

### 25.3. Reproducibilidad

No actualices proveedores durante una sesión de diagnóstico sin registrar el cambio.

---

## 26. Proveedor con endpoints locales

Crea `providers.tf`.

### 26.1. Configuración

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

### 26.2. Alcance

No añadas servicios nuevos sin revisar sus endpoints.

---

## 27. Variables e identidad

Crea `variables.tf`.

### 27.1. Entradas

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "app_log_level" {
  type    = string
  default = "INFO"

  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR"], var.app_log_level)
    error_message = "Selecciona un nivel admitido."
  }
}

variable "function_timeout" {
  type    = number
  default = 4
}

variable "app_version" {
  type    = string
  default = "1"
}
```

---

## 28. Entradas, paquete y logs

Crea `terraform.tfvars` y `main.tf`.

### 28.1. Entradas

```hcl
suffix           = "alumno01"
app_log_level    = "INFO"
function_timeout = 4
app_version      = "1"
```

### 28.2. Componentes iniciales

```hcl
locals {
  function_name = "curso-lambda-diagnostics-${var.suffix}"
}

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

---

## 29. Rol y permisos de logs

Crea `iam.tf`.

### 29.1. Configuración

```hcl
resource "aws_iam_role" "function" {
  name = "curso-lambda-diagnostics-role-${var.suffix}"

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

## 30. Función y outputs

Completa `main.tf` y crea `outputs.tf`.

### 30.1. Función

```hcl
resource "aws_lambda_function" "diagnostics" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn
  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256
  memory_size      = 128
  timeout          = var.function_timeout

  environment {
    variables = {
      APP_LOG_LEVEL = var.app_log_level
      APP_VERSION   = var.app_version
    }
  }

  depends_on = [aws_iam_role_policy.logs]
}
```

### 30.2. Outputs

```hcl
output "function_name" {
  value = aws_lambda_function.diagnostics.function_name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.function.name
}
```

---

## 31. Sesión 1: pruebas y despliegue

Duración orientativa: 25 minutos.

### 31.1. Secuencia

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

### 31.2. Resultado esperado

Deben crearse cuatro recursos gestionados.

### 31.3. Identificadores

```bash
FUNCTION="$(terraform output -raw function_name)"
LOG_GROUP="$(terraform output -raw log_group_name)"
```

### 31.4. Condición

Espera a que la función esté activa antes de invocarla.

---

## 32. Script de invocación reproducible

Crea `scripts/invoke.sh` para conservar resultados separados.

### 32.1. Código

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1 AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

FILE="${1:?Indica el evento}"
LABEL="${2:?Indica una etiqueta de salida}"
[[ "$LABEL" =~ ^[A-Za-z0-9_-]+$ ]] || exit 1

FUNCTION="$(terraform output -raw function_name)"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda invoke --function-name "$FUNCTION" \
  --invocation-type RequestResponse \
  --cli-binary-format raw-in-base64-out \
  --payload "file://$FILE" --log-type Tail \
  "resultados/${LABEL}-response.json" \
  > "resultados/${LABEL}-metadata.json"

jq '.' "resultados/${LABEL}-metadata.json"
jq '.' "resultados/${LABEL}-response.json"
```

---

## 33. Sesión 2: primera invocación correcta

Crea un evento con correlación reconocible.

### 33.1. `eventos/success.json`

```json
{
  "correlation_id": "SESSION-SUCCESS-001",
  "scenario": "success",
  "values": [2, 4, 6]
}
```

### 33.2. Ejecución

```bash
bash -n scripts/invoke.sh
bash scripts/invoke.sh eventos/success.json success
```

### 33.3. Resultado esperado

La respuesta debe contener `ok = true`, cantidad tres y total doce.

### 33.4. Logs

Deben aparecer `request_started` y `request_completed`, sujetos a la disponibilidad validada.

---

## 34. Sesión 3: interpretar metadatos y tail

La respuesta de la API y la respuesta del handler tienen funciones diferentes.

### 34.1. Comprobaciones

```bash
jq '{StatusCode, FunctionError, ExecutedVersion}' \
  resultados/success-metadata.json

jq -r '.LogResult // empty' resultados/success-metadata.json \
  > resultados/success-tail-base64.txt
```

### 34.2. Decodificación

```bash
python3 - <<'PY'
import base64
from pathlib import Path

encoded = Path("resultados/success-tail-base64.txt").read_text().strip()
if encoded:
    print(base64.b64decode(encoded).decode("utf-8", errors="replace"))
else:
    print("La respuesta no incluye LogResult.")
PY
```

### 34.3. Límite

El tail devuelve un fragmento final limitado, no el historial completo del grupo.

---

## 35. Sesión 4: consultar logs por correlación

Busca la solicitud sin depender únicamente del fragmento de invocación.

### 35.1. Consulta

```bash
aws_local logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --filter-pattern '"SESSION-SUCCESS-001"' \
  > resultados/success-log-events.json

jq -r '.events[]?.message' resultados/success-log-events.json
```

### 35.2. Interpretación

Relaciona inicio y final mediante `aws_request_id`.

### 35.3. Retraso

Si no aparecen eventos, espera y repite dentro de una ventana acotada.

### 35.4. Precaución

Una consulta vacía aislada no demuestra que la función no haya emitido logs.

### 35.5. Paginación

AWS CLI pagina automáticamente esta operación salvo que se desactive ese comportamiento.

---

## 36. Sesión 5: distinguir rechazos y fallos técnicos

Un resultado negativo puede formar parte del contrato de aplicación.

### 36.1. Evento

```bash
jq -n '{
  correlation_id:"SESSION-REJECT-001",
  scenario:"reject"
}' > eventos/reject.json

bash scripts/invoke.sh eventos/reject.json reject
```

### 36.2. Resultado esperado

El handler devuelve `ok = false` y `business_rejected`.

### 36.3. Metadatos

No debería aparecer `FunctionError` por este rechazo controlado.

### 36.4. Logs

El registro `business_rejected` tendrá nivel `WARNING`.

### 36.5. Regla

No clasifiques todos los resultados `ok = false` como fallos del runtime.

---

## 37. Sesión 6: entrada inválida y protección de datos

La validación debe rechazar solicitudes sin registrar el documento completo.

### 37.1. Evento de prueba

```bash
jq -n '{
  correlation_id:"SESSION-INVALID-001",
  scenario:"success",
  values:[true],
  training_marker:"FAKE-NOT-A-SECRET-123"
}' > eventos/invalid.json

bash scripts/invoke.sh eventos/invalid.json invalid
```

### 37.2. Resultado

Debe devolver `invalid_request` y emitir `validation_rejected`.

### 37.3. Revisión

Exporta los logs de esa correlación y busca el marcador ficticio.

### 37.4. Límite

Su ausencia comprueba esta ruta de código, no certifica ausencia universal de filtraciones.

---

## 38. Sesión 7: excepción no controlada

Una excepción debe conservar su naturaleza de fallo técnico.

### 38.1. Evento

```bash
jq -n '{
  correlation_id:"SESSION-EXCEPTION-001",
  scenario:"exception"
}' > eventos/exception.json

bash scripts/invoke.sh eventos/exception.json exception
```

### 38.2. Resultado esperado

Los metadatos deben indicar `FunctionError`, según el contrato de invocación soportado.

### 38.3. Logs

Busca `request_started`, `request_failed` y la información publicada por el runtime.

### 38.4. Distinción

AWS CLI puede terminar con código de salida cero aunque el handler haya fallado.

### 38.5. Automatización

Un pipeline debe comprobar explícitamente los metadatos y la respuesta de aplicación.

---

## 39. Sesión 8: timeout de ejecución

El escenario lento supera deliberadamente el timeout inicial.

### 39.1. Evento

```bash
jq -n '{
  correlation_id:"SESSION-TIMEOUT-001",
  scenario:"slow"
}' > eventos/slow.json

bash scripts/invoke.sh eventos/slow.json timeout
```

### 39.2. Resultado esperado

La invocación debe fallar por superar los cuatro segundos configurados.

### 39.3. Recorrido

Puede aparecer `sleep_started` sin `request_completed`.

### 39.4. Precaución

No esperes que el bloque `except` capture una terminación forzada del runtime.

### 39.5. Diagnóstico

Comprueba timeout configurado, metadatos y registros de plataforma disponibles.

---

## 40. Sesión 9: recuperar el escenario lento

Modifica una sola variable para aislar la causa.

### 40.1. Cambio

Establece `function_timeout = 12` en `terraform.tfvars`.

### 40.2. Aplicación

```bash
terraform plan -out=planes/timeout-12.tfplan
terraform show planes/timeout-12.tfplan
terraform apply planes/timeout-12.tfplan

bash scripts/invoke.sh eventos/slow.json slow-recovered
```

### 40.3. Resultado esperado

El escenario debe devolver `slow_completed`.

### 40.4. Evidencia

Compara la ejecución fallida y la correcta mediante sus identificadores Lambda.

### 40.5. Restauración

Vuelve a cuatro segundos y aplica un plan revisado al terminar la prueba.

---

## 41. Sesión 10: activar detalle de diagnóstico

El nivel de aplicación permite controlar volumen y detalle.

### 41.1. Cambio

Establece `app_log_level = "DEBUG"`.

### 41.2. Aplicación y prueba

```bash
terraform plan -out=planes/debug.tfplan
terraform show planes/debug.tfplan
terraform apply planes/debug.tfplan

bash scripts/invoke.sh eventos/success.json debug
```

### 41.3. Resultado esperado

Debe aparecer `processing_started` además de los registros de nivel `INFO`.

### 41.4. Distinción

`APP_LOG_LEVEL` controla nuestro logger, no todos los registros de plataforma.

### 41.5. Restauración

Vuelve a `INFO` después de recopilar la evidencia necesaria.

---

## 42. Sesión 11: error de importación

Un fallo puede ocurrir antes de entrar en el handler.

### 42.1. Preparación y cambio

```bash
cp src/app.py resultados/app-good.py

python3 - <<'PY'
from pathlib import Path

path = Path("src/app.py")
path.write_text(
    "import module_missing_for_training\n" + path.read_text(),
    encoding="utf-8",
)
PY
```

### 42.2. Prueba

Revisa y aplica el cambio; después invoca el evento correcto.

### 42.3. Resultado esperado

Debe aparecer un error de importación sin el registro propio `request_started`.

### 42.4. Recuperación

Restaura con `cp resultados/app-good.py src/app.py`, ejecuta pruebas y aplica otro plan revisado.

---

## 43. Sesión 12: streams y consulta temporal

Las consultas deben considerar tiempo, paginación y múltiples streams.

### 43.1. Listado de streams

```bash
aws_local logs describe-log-streams \
  --log-group-name "$LOG_GROUP" \
  --order-by LastEventTime --descending \
  > resultados/streams.json
```

### 43.2. Consulta temporal

```bash
START_MS="$(python3 -c 'import time; print(int((time.time()-900)*1000))')"

aws_local logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_MS" \
  > resultados/last-15-minutes.json
```

### 43.3. Precaución

El stream más reciente no necesariamente contiene toda la solicitud investigada.

### 43.4. Seguimiento

Para observación interactiva utiliza `aws_local logs tail "$LOG_GROUP" --since 15m --follow`.

---

## 44. Consultar un stream y exportar registros

La consulta individual resulta útil cuando ya has localizado el stream relevante.

### 44.1. Lectura

```bash
STREAM="$(jq -er '.logStreams[0].logStreamName' resultados/streams.json)"

aws_local logs get-log-events \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --start-from-head \
  > resultados/stream-events.json
```

### 44.2. Registros JSON de aplicación

```bash
jq -c '
  .events[]?.message |
  fromjson? |
  select(type == "object" and has("event"))
' resultados/last-15-minutes.json > resultados/application.ndjson
```

### 44.3. Alcance

`get-log-events` utiliza tokens propios; una respuesta no debe asumirse como historial completo.

### 44.4. Exportación

El parsing anterior presupone mensajes JSON sin prefijos añadidos por otra configuración.

---

## 45. Procedimiento de diagnóstico

Utiliza una secuencia estable para reducir cambios innecesarios.

### 45.1. Pasos

1. Identifica la solicitud y el intervalo temporal.
2. Comprueba estado y configuración de Lambda.
3. Revisa metadatos de invocación.
4. Revisa respuesta de aplicación.
5. Busca la correlación en todos los streams relevantes.
6. Localiza la última etapa registrada.
7. Formula una hipótesis concreta.
8. Modifica una sola causa.
9. Repite y compara.
10. Restaura la configuración prevista.

### 45.2. Evidencia mínima

Conserva evento ficticio, versión de código, configuración relevante y resultados.

### 45.3. Regla

No cambies simultáneamente permisos, runtime, memoria y código para resolver un único fallo.

---

## 46. Problemas de infraestructura y permisos

La ausencia de logs puede tener causas ajenas a la lógica de negocio.

### 46.1. Lista de revisión

Comprueba:

- Grupo correcto.
- Región correcta.
- Endpoint correcto.
- Intervalo temporal.
- Función realmente invocada.
- Permisos `CreateLogStream` y `PutLogEvents`.
- Disponibilidad de CloudWatch Logs.
- Runtime y contenedor.
- Retrasos de publicación.

### 46.2. IAM local

Una ejecución local no demuestra aplicación completa de permisos IAM.

### 46.3. Pruebas negativas

Eliminar permisos solo sirve como prueba de autorización si la combinación local aplica ese control.

---

## 47. Logs de LocalStack y límites del diagnóstico

Los registros de infraestructura ayudan cuando la función no llega a ejecutarse.

### 47.1. Consultas

```bash
docker compose ps
docker compose logs --since=15m --tail=300 localstack
docker network inspect curso-lambda-logs
docker ps --format '{{.ID}}\t{{.Image}}\t{{.Names}}'
```

### 47.2. Qué investigar

Busca fallos de descarga del runtime, permisos del socket o arranque de contenedores.

### 47.3. Precaución

Los contenedores de ejecución pueden reutilizarse o desaparecer.

### 47.4. Seguridad

No exportes indiscriminadamente logs de otros laboratorios.

### 47.5. Distinción

Reiniciar LocalStack no explica por sí solo la causa original del incidente.

---

## 48. Retención, métricas y trazas

Los logs forman parte de una estrategia de observabilidad más amplia.

### 48.1. Retención

Terraform establece siete días, pero la expiración no debe interpretarse como eliminación instantánea.

### 48.2. Métricas

Los registros no crean automáticamente alarmas ni métricas personalizadas.

### 48.3. Duración

El campo de aplicación no equivale necesariamente a duración facturada ni latencia de extremo a extremo.

### 48.4. Trazas

Una integración de tracing requiere configuración e instrumentación adicionales.

### 48.5. Compatibilidad

Logs Insights, filtros métricos, alarmas y tracing deben validarse separadamente en LocalStack.

### 48.6. Producción

Combina logs, métricas, trazas y verificaciones de negocio.

---

## 49. Limpieza y diferencias respecto a AWS real

Mantén LocalStack disponible durante la destrucción.

### 49.1. Secuencia

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local lambda list-functions
aws_local logs describe-log-groups
docker compose down
```

### 49.2. Evidencias

Exporta los registros necesarios antes de eliminar el grupo de logs.

### 49.3. AWS real

Revisa costes, IAM, cifrado, retención, cuotas, latencia y auditoría.

### 49.4. Límite

LocalStack no certifica rendimiento, cold starts ni equivalencia completa de registros de plataforma.

---

## 50. Ejercicios y resumen

Consolida el procedimiento antes de añadir más servicios.

### 50.1. Ejercicios

1. Añade una prueba que verifique un registro JSON válido.
2. Compara rechazo de negocio y excepción técnica.
3. Correlaciona dos ejecuciones de la misma solicitud.
4. Diagnostica un timeout sin modificar el código.
5. Recupera un error de importación.
6. Comprueba que el marcador ficticio no aparece en los logs.
7. Exporta registros de un intervalo acotado.
8. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

Los logs deben ser estructurados, correlacionables y seguros.

El diagnóstico requiere combinar configuración, metadatos, respuesta y registros.

### 50.3. Idea final

**Una función observable permite explicar su recorrido sin exponer datos innecesarios y ofrece evidencias suficientes para reproducir, aislar y corregir sus fallos.**