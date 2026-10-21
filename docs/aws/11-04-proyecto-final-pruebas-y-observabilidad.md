# Proyecto final: pruebas y observabilidad con Terraform y LocalStack

Una infraestructura que se despliega correctamente todavía necesita demostrar que funciona, que detecta fallos y que conserva información suficiente para investigar lo ocurrido.

En esta lección completarás el proyecto final con pruebas de configuración, pruebas unitarias, comprobaciones HTTP y observabilidad del procesamiento asíncrono.

La arquitectura de referencia utiliza API Gateway, Lambda, S3 y SQS, emulados mediante LocalStack.

La API acepta documentos ficticios, el worker procesa mensajes y el cliente consulta los resultados.

Las prácticas permiten relacionar una solicitud HTTP con su trabajo, sus intentos de procesamiento y sus evidencias.

También aprenderás a distinguir una prueba negativa esperada de un error del laboratorio.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas documentos reales ni secretos en solicitudes o logs.
>
> Una observación positiva en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección convierte el comportamiento del proyecto en propiedades verificables.

### 1.1. Competencias

Al finalizar podrás:

- Diseñar una matriz de pruebas.
- Aislar lógica mediante mocks.
- Verificar contratos Terraform.
- Comprobar aceptación y finalización.
- Correlacionar eventos mediante identificadores.
- Investigar reintentos y mensajes fallidos.
- Publicar evidencias seleccionadas.
- Verificar limpieza después de las pruebas.

### 1.2. Resultado práctico

Entregarás pruebas reproducibles y un procedimiento de diagnóstico.

---

## 2. Relación con el proyecto anterior

Utilizaremos la arquitectura de API y procesamiento asíncrono de la lección anterior.

### 2.1. Componentes existentes

Debes disponer de:

- `POST /jobs`.
- `GET /jobs/{job_id}`.
- Lambda API.
- Lambda worker.
- Bucket de solicitudes y resultados.
- Cola de trabajo y DLQ.
- Event source mapping SQS.

### 2.2. Regla

Esta lección amplía las pruebas y los logs; no crea una arquitectura alternativa.

---

## 3. Requisitos previos

Necesitas el proyecto desplegable y las herramientas habituales del curso.

### 3.1. Comprobación

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
curl --version
jq --version
```

### 3.2. Conocimientos recomendados

Revisa contratos HTTP, respuestas parciales SQS, módulos y limpieza dirigida.

---

## 4. Versiones y compatibilidad

El docente debe validar las herramientas utilizadas para ejecutar y observar el proyecto.

### 4.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se mantiene en la serie 5.x.

Boto3 debe fijarse después de comprobar su compatibilidad.

### 4.2. LocalStack

Registra la imagen, su edición y las operaciones verificadas.

### 4.3. Regla

**Una capacidad documentada no equivale a una capacidad comprobada en tu laboratorio.**

---

## 5. Qué significa observabilidad

La observabilidad permite investigar el sistema a partir de sus señales.

### 5.1. Señales utilizadas

Trabajaremos principalmente con logs estructurados.

Consultaremos atributos de colas y configuración Lambda.

Mediremos tiempos observados desde el cliente.

### 5.2. Límite

No implementaremos un sistema completo de trazas distribuidas.

### 5.3. Regla

Un identificador de correlación ayuda a investigar, pero no sustituye una traza distribuida.

---

## 6. Qué demuestra cada tipo de prueba

Las capas responden a preguntas diferentes.

### 6.1. Comparación

| **Capa** | **Pregunta** | **Límite principal** |
|----------|-------------|---------------------|
| Validación Terraform | ¿La configuración es consistente? | No ejecuta el recorrido |
| Contrato de plan | ¿Los valores previstos son correctos? | Hay valores desconocidos |
| Prueba unitaria | ¿La lógica responde correctamente? | Dependencias simuladas |
| Prueba HTTP | ¿Funciona la integración observada? | Entorno y muestra limitados |
| Diagnóstico | ¿Qué señales explican el resultado? | Señales incompletas |

Las capas se complementan.

### 6.2. Regla

Ninguna capa debe presentarse como sustituta de todas las demás.

---

## 7. Matriz de pruebas del proyecto

Cada requisito debe tener un procedimiento y una evidencia.

### 7.1. Catálogo mínimo

| **ID** | **Propiedad** | **Evidencia** |
|--------|---------------|---------------|
| PT-01 | Rechazo de entrada inválida | HTTP 400 |
| PT-02 | Aceptación de trabajo válido | HTTP 202 y `job_id` |
| PT-03 | Resultado correcto | HTTP 200 y contenido |
| PT-04 | Fallo parcial de lote | Identificadores fallidos |
| PT-05 | Logs correlacionables | Eventos del mismo trabajo |
| PT-06 | Mensaje fallido en DLQ | Identidad observada |
| PT-07 | Convergencia | Plan sin cambios |
| PT-08 | Limpieza | Recursos ausentes |

La matriz debe actualizarse cuando cambie el contrato.

---

## 8. Evidencia y conclusión

Una evidencia debe sostener una afirmación concreta.

### 8.1. Ejemplo correcto

“Un trabajo válido terminó con cinco unidades y dos artículos en el entorno indicado.”

### 8.2. Ejemplo incorrecto

“El sistema siempre funciona y nunca pierde mensajes.”

### 8.3. Contexto necesario

Registra versión, escenario, plazo y resultado.

### 8.4. Regla

No generalices una observación limitada a garantías universales.

---

## 9. Casos positivos y negativos

Los fallos previstos deben distinguirse de los errores del laboratorio.

### 9.1. Positivos

Documento válido y resultado correcto.

Lote completamente procesado.

Contrato Terraform con valores esperados.

### 9.2. Negativos

Entrada inválida, fallo didáctico y elemento incompatible.

### 9.3. Regla

Un timeout de Docker no demuestra que la API rechazó correctamente una entrada.

---

## 10. Identificadores de correlación

Los identificadores deben relacionar fronteras sin exponer documentos.

### 10.1. Campos utilizados

`job_id`: identidad del trabajo.

`request_id`: invocación Lambda.

`message_id`: mensaje SQS.

`receive_count`: número declarado de recepciones.

### 10.2. Diferencia

Un mensaje puede procesarse en varias invocaciones.

### 10.3. Regla

No uses únicamente `request_id` para seguir un trabajo asíncrono.

---

## 11. Contrato de logs

Los logs tendrán una estructura JSON pequeña y estable.

### 11.1. Ejemplo

```json
{
  "schema_version": 1,
  "event": "job_completed",
  "job_id": "IDENTIFICADOR",
  "message_id": "IDENTIFICADOR_SQS",
  "request_id": "INVOCACION",
  "duration_ms": 18
}
```

### 11.2. Regla

No imprimas cuerpos de mensajes, documentos ni variables de entorno completas.

---

## 12. Tiempos y mediciones

Los tiempos necesitan una definición antes de interpretarse.

### 12.1. Mediciones diferentes

Tiempo HTTP de aceptación.

Tiempo observado hasta resultado.

Tiempo de procesamiento del worker.

Tiempo de espera entre reintentos.

### 12.2. Precaución

El tiempo observado por polling incluye su intervalo de consulta.

### 12.3. Regla

No presentes una medición local como latencia productiva de AWS.

---

## 13. Preparación de directorios

Amplía el repositorio existente sin duplicar su infraestructura.

### 13.1. Directorios

```bash
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p scripts
mkdir -p resultados/private
mkdir -p resultados/public
mkdir -p docs
```

### 13.2. Permisos

```bash
umask 077
chmod 700 resultados resultados/private resultados/public
```

### 13.3. Regla

Los ejemplos de permisos asumen un sistema POSIX.

---

## 14. Política de archivos

Los resultados privados no deben entrar en Git.

### 14.1. Añade a `.gitignore`

```gitignore
resultados/
**/__pycache__/
.venv/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
```

### 14.2. Conserva

Código de pruebas, scripts, documentación y archivos de bloqueo.

### 14.3. Regla

No publiques todo el checkout como artifact de diagnóstico.

---

## 15. Contexto local

Prepara credenciales ficticias y un endpoint explícito.

### 15.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 15.2. Regla

No utilices un perfil real como alternativa ante un fallo local.

---

## 16. Dependencias de pruebas

Los tests unitarios utilizan `unittest`, incluido en Python.

### 16.1. Entorno virtual

```bash
python3 -m venv .venv
source .venv/bin/activate
export BOTO3_VERSION='SUSTITUIR_POR_VERSION_VALIDADA'
python -m pip install "boto3==${BOTO3_VERSION}"
python -m pip freeze > resultados/private/python-dependencies.txt
```

### 16.2. Preparación docente

Sustituye el marcador por una versión concreta comprobada.

### 16.3. Regla

Registra también las dependencias transitivas.

---

## 17. Instrumentación compartida

Crea `functions/telemetry.py`.

### 17.1. Emisión controlada

```python
import json
import re

ALLOWED = {
    "job_id", "message_id", "request_id",
    "receive_count", "duration_ms", "error_type",
}

def emit(event, **fields):
    payload = {"schema_version": 1, "event": event}
    payload.update({key: value for key, value in fields.items()
                    if key in ALLOWED})
    print(json.dumps(payload, sort_keys=True))

def valid_job_id(value):
    return isinstance(value, str) and bool(
        re.fullmatch(r"[a-f0-9]{32}", value)
    )
```

### 17.2. Límite

La lista permitida reduce exposición accidental; no constituye un sanitizador universal.

---

## 18. Instrumentación del worker

Conserva `process()` de la lección anterior y sustituye únicamente su handler.

### 18.1. Handler instrumentado

Añade estos imports y reemplaza el handler:

```python
import time
from telemetry import emit, valid_job_id

def handler(event, context):
    failures = []
    for record in event["Records"]:
        started = time.monotonic()
        fields = {
            "request_id": context.aws_request_id,
            "message_id": record["messageId"],
            "receive_count": record.get("attributes", {}).get(
                "ApproximateReceiveCount", "unknown"
            ),
        }
        try:
            candidate = json.loads(record["body"]).get("job_id")
            if valid_job_id(candidate):
                fields["job_id"] = candidate
        except Exception:
            pass
        emit("job_started", **fields)
        try:
            process(record)
        except Exception as error:
            failures.append({"itemIdentifier": record["messageId"]})
            emit("job_failed", **fields, error_type=type(error).__name__,
                 duration_ms=round((time.monotonic() - started) * 1000))
        else:
            emit("job_completed", **fields,
                 duration_ms=round((time.monotonic() - started) * 1000))
    return {"batchItemFailures": failures}
```

---

## 19. Evitar eventos duplicados

La instrumentación debe tener un único responsable por evento.

### 19.1. Ajuste necesario

Retira el `print()` de `job_completed` que estaba dentro de `process()`.

El handler instrumentado emitirá ese evento.

### 19.2. Motivo

Dos logs de finalización por intento dificultan el conteo.

### 19.3. Regla

Contar logs no permite deducir trabajos únicos sin aplicar identidad y semántica.

---

## 20. Instrumentación de aceptación

La API debe registrar la aceptación después del envío SQS.

### 20.1. Ajustes en `functions/api.py`

Añade el import:

```python
from telemetry import emit
```

Después de `sqs.send_message(...)`, añade:

```python
emit("job_accepted", job_id=job_id)
```

### 20.2. Fallo incierto

Sustituye el log anterior por:

```python
emit("acceptance_uncertain", job_id=job_id)
```

### 20.3. Regla

No registres aceptación confirmada antes de obtener la respuesta de SQS.

---

## 21. Empaquetado actualizado

El helper debe incluirse en ambos paquetes Lambda.

### 21.1. Comandos

```bash
python3 -m py_compile functions/api.py functions/worker.py functions/telemetry.py

python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
for name in ("api", "worker"):
    with ZipFile(Path("build") / f"{name}.zip", "w", ZIP_DEFLATED) as archive:
        for module in (name, "telemetry"):
            source = Path("functions") / f"{module}.py"
            archive.write(source, arcname=f"{module}.py")
PY
```

### 21.2. Regla

Una modificación del helper también debe modificar el hash del ZIP.

---

## 22. Aplicación de la instrumentación

Revisa el plan antes de actualizar las funciones.

### 22.1. Secuencia

```bash
terraform -chdir=app plan -out=../planes/telemetry.tfplan
terraform -chdir=app show ../planes/telemetry.tfplan
terraform -chdir=app apply ../planes/telemetry.tfplan
terraform -chdir=app output -json project > resultados/private/project.json
```

### 22.2. Resultado esperado

Cambios de código en las funciones, no creación de una arquitectura distinta.

### 22.3. Regla

Investiga reemplazos inesperados antes de aplicar.

---

## 23. Aislamiento de pruebas unitarias

Las pruebas importarán los módulos sin acceder al emulador.

### 23.1. Estrategia

Configuraremos variables ficticias antes de importar.

Sustituiremos `boto3.client` durante la importación.

Asignaremos mocks a los clientes utilizados.

### 23.2. Ventaja

Los tests pueden ejecutarse sin Docker.

### 23.3. Regla

Un test unitario no debe hacer llamadas de red inadvertidas.

---

## 24. Helper de pruebas unitarias

Crea `tests/unit/support.py`.

### 24.1. Implementación

```python
import importlib
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "functions"))

def load_function(name):
    environment = {
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_EC2_METADATA_DISABLED": "true",
        "LOCAL_ENDPOINT": "http://localstack:4566",
        "BUCKET_NAME": "unit-test-bucket",
        "QUEUE_URL": "http://localstack:4566/queue/unit",
        "ENABLE_FAILURE_TEST": "true",
    }
    with patch.dict(os.environ, environment), patch(
        "boto3.client", return_value=MagicMock()
    ):
        sys.modules.pop(name, None)
        module = importlib.import_module(name)
    return module
```

### 24.2. Regla

Los mocks son dependencias de prueba, no evidencia de permisos AWS efectivos.

---

## 25. Pruebas de validación

Crea `tests/unit/test_api.py`.

### 25.1. Casos principales

```python
import unittest
from unittest.mock import patch
from support import load_function

class ApiValidationTests(unittest.TestCase):
    def setUp(self):
        self.api = load_function("api")

    def test_valid_document(self):
        self.api.validate({
            "items": [{"sku": "DEMO-001", "quantity": 2}]
        })

    def test_boolean_quantity_is_rejected(self):
        with self.assertRaises(ValueError):
            self.api.validate({
                "items": [{"sku": "DEMO-001", "quantity": True}]
            })

    def test_empty_items_is_rejected(self):
        with self.assertRaises(ValueError):
            self.api.validate({"items": []})

    def test_unexpected_field_is_rejected(self):
        with self.assertRaises(ValueError):
            self.api.validate({"items": [], "secret": "fictitious"})
```

### 25.2. Continuación

Añade los casos siguientes al mismo archivo.

---

## 26. Pruebas de frontera de la API

Comprueba que el rechazo ocurre antes de escribir o enviar.

### 26.1. Casos adicionales

```python
class ApiAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.api = load_function("api")

    def test_invalid_body_has_no_side_effects(self):
        result = self.api.create({"body": "not-json"})
        self.assertEqual(result["statusCode"], 400)
        self.api.s3.put_object.assert_not_called()
        self.api.sqs.send_message.assert_not_called()

    def test_valid_body_is_accepted(self):
        result = self.api.create({
            "body": '{"items":[{"sku":"DEMO-001","quantity":2}]}'
        })
        self.assertEqual(result["statusCode"], 202)
        self.api.s3.put_object.assert_called_once()
        self.api.sqs.send_message.assert_called_once()

    def test_send_failure_is_uncertain(self):
        self.api.sqs.send_message.side_effect = RuntimeError("test")
        result = self.api.create({
            "body": '{"items":[{"sku":"DEMO-001","quantity":2}]}'
        })
        self.assertEqual(result["statusCode"], 503)
        self.api.s3.put_object.assert_called_once()
```

---

## 27. Pruebas de respuestas parciales

Crea `tests/unit/test_worker.py`.

### 27.1. Lote mixto

```python
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from support import load_function

class WorkerBatchTests(unittest.TestCase):
    def setUp(self):
        self.worker = load_function("worker")
        self.context = SimpleNamespace(aws_request_id="unit-request")

    def test_only_failed_record_is_returned(self):
        records = [
            {"messageId": "ok", "body": "{}"},
            {"messageId": "bad", "body": "{}"},
        ]
        with patch.object(
            self.worker, "process",
            side_effect=[None, RuntimeError("test")]
        ):
            result = self.worker.handler(
                {"Records": records}, self.context
            )
        self.assertEqual(result, {
            "batchItemFailures": [{"itemIdentifier": "bad"}]
        })
```

### 27.2. Propiedad

Un fallo no obliga a devolver como fallidos los elementos correctos.

---

## 28. Prueba del contenido procesado

Añade al mismo archivo una comprobación del resultado.

### 28.1. Caso determinista

```python
import io
import json
import os

class WorkerContentTests(unittest.TestCase):
    def setUp(self):
        self.worker = load_function("worker")

    def test_result_has_expected_totals(self):
        document = {"items": [
            {"sku": "DEMO-001", "quantity": 2},
            {"sku": "DEMO-002", "quantity": 3},
        ]}
        self.worker.s3.get_object.return_value = {
            "Body": io.BytesIO(json.dumps(document).encode())
        }
        identity = "a" * 32
        record = {"body": json.dumps({
            "schema_version": 1,
            "job_id": identity,
            "request_key": f"requests/{identity}.json",
        })}
        with patch.dict(os.environ, {"ENABLE_FAILURE_TEST": "true"}):
            self.worker.process(record)
        arguments = self.worker.s3.put_object.call_args.kwargs
        result = json.loads(arguments["Body"])
        self.assertEqual(result["total_units"], 5)
        self.assertEqual(result["item_count"], 2)
        self.assertEqual(arguments["Key"], f"results/{identity}.json")
```

---

## 29. Sesión 1: ejecutar pruebas unitarias

Duración orientativa: 30 minutos.

### 29.1. Comando

```bash
python -m unittest discover \
  -s tests/unit \
  -p 'test_*.py' \
  -v
```

### 29.2. Resultado esperado

Los tests terminan correctamente sin LocalStack.

### 29.3. Ejercicio

Introduce una suma incorrecta en el worker y comprueba que el test falla.

### 29.4. Regla

Restaura el código antes de empaquetar y desplegar.

---

## 30. Pruebas Terraform de configuración

Crea `app/tests/observability.tftest.hcl`.

### 30.1. Contratos conocidos en plan

```hcl
run "runtime_contract" {
  command = plan

  assert {
    condition = (
      module.runtime.aws_lambda_function.function["worker"].timeout == 10
    )
    error_message = "El timeout esperado del worker debe ser 10."
  }

  assert {
    condition = (
      module.queue.aws_sqs_queue.work.visibility_timeout_seconds >=
      6 * module.runtime.aws_lambda_function.function["worker"].timeout
    )
    error_message = "La visibilidad debe respetar el margen acordado."
  }

  assert {
    condition = contains(
      module.runtime.aws_lambda_event_source_mapping.work.function_response_types,
      "ReportBatchItemFailures"
    )
    error_message = "Las respuestas parciales deben estar habilitadas."
  }
}
```

### 30.2. Regla

Si tu versión no permite esas referencias internas en tests, publica salidas explícitas y comprueba sus contratos.

---

## 31. Disponibilidad antes de integración

Un contenedor arrancado no garantiza un recorrido HTTP disponible.

### 31.1. Comprobaciones

Consulta funciones Lambda.

Consulta el event source mapping.

Verifica el stage de API Gateway.

Realiza una solicitud de prueba controlada.

### 31.2. Precaución

Una solicitud válida crea un trabajo y debe registrarse.

### 31.3. Regla

No conviertas una comprobación de disponibilidad en una fuente ilimitada de trabajos.

---

## 32. Helper HTTP

Crea `tests/integration/http_support.py`.

### 32.1. Cliente con destino validado

```python
import json
import os
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, ProxyHandler

BASE = os.environ["API_BASE"].rstrip("/")
parsed = urlsplit(BASE)
if (
    parsed.scheme != "http"
    or parsed.hostname != "127.0.0.1"
    or parsed.port != 4566
    or parsed.username is not None
    or parsed.password is not None
    or parsed.query
    or parsed.fragment
):
    raise ValueError("API_BASE debe apuntar al laboratorio local.")

opener = build_opener(ProxyHandler({}))

def request(method, path, document=None):
    body = None if document is None else json.dumps(document).encode()
    message = Request(BASE + path, data=body, method=method,
                      headers={"Content-Type": "application/json"})
    try:
        result = opener.open(message, timeout=10)
    except HTTPError as error:
        result = error
    with result:
        return result.code, json.loads(result.read())
```

---

## 33. Prueba HTTP de recorrido

Crea `tests/integration/test_http.py`.

### 33.1. Aceptación y resultado

```python
import json
import time
import unittest
from pathlib import Path
from http_support import request

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "resultados/private/jobs.jsonl"

def register(job_id):
    with REGISTRY.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps({"job_id": job_id}) + "\n")

class HttpTests(unittest.TestCase):
    def test_valid_job_completes(self):
        started = time.monotonic()
        code, accepted = request("POST", "/jobs", {
            "items": [{"sku": "DEMO-001", "quantity": 2},
                      {"sku": "DEMO-002", "quantity": 3}]
        })
        if "job_id" in accepted:
            register(accepted["job_id"])
        self.assertEqual(code, 202)
        identity = accepted["job_id"]
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            code, result = request("GET", f"/jobs/{identity}")
            if code == 200:
                break
            self.assertEqual(code, 202)
            time.sleep(2)
        else:
            self.fail("No se observó finalización dentro del plazo.")
        self.assertEqual(result["job_id"], identity)
        self.assertEqual(result["total_units"], 5)
        self.assertEqual(result["item_count"], 2)
        print(json.dumps({"event": "test_completed", "job_id": identity,
                          "observed_ms": round(
                              (time.monotonic() - started) * 1000)}))
```

---

## 34. Pruebas HTTP negativas

Completa el archivo anterior con casos independientes.

### 34.1. Rechazo y consulta inválida

```python
    def test_boolean_quantity_is_rejected(self):
        code, result = request("POST", "/jobs", {
            "items": [{"sku": "DEMO-001", "quantity": True}]
        })
        self.assertEqual(code, 400)
        self.assertNotIn("job_id", result)

    def test_invalid_identifier_is_rejected(self):
        code, result = request("GET", "/jobs/not-valid")
        self.assertEqual(code, 400)
        self.assertIn("error", result)
```

### 34.2. Límites

Estos casos no prueban todas las entradas inválidas.

### 34.3. Regla

Un test HTTP no debe depender del orden de ejecución de otro test.

---

## 35. Sesión 2: pruebas de integración

Duración orientativa: 35 minutos.

### 35.1. Preparación

```bash
API_ID="$(jq -er '.api.api_id' resultados/private/project.json)"
STAGE="$(jq -er '.api.stage' resultados/private/project.json)"
export API_BASE="http://127.0.0.1:4566/_aws/execute-api/${API_ID}/${STAGE}"
```

### 35.2. Ejecución

```bash
python -m unittest discover \
  -s tests/integration \
  -p 'test_*.py' \
  -v
```

### 35.3. Compatibilidad

Valida el formato de URL de API Gateway con la imagen elegida.

---

## 36. Recolección de logs

Los logs pueden tardar en aparecer después de finalizar una invocación.

### 36.1. Preparación

Obtén un trabajo registrado:

```bash
JOB_ID="$(tail -n 1 resultados/private/jobs.jsonl | jq -er '.job_id')"
WORKER="$(jq -er '.runtime.worker_name' resultados/private/project.json)"
```

### 36.2. Consulta

```bash
aws_local logs filter-log-events \
  --log-group-name "/aws/lambda/${WORKER}" \
  --filter-pattern "\"${JOB_ID}\"" \
  > resultados/private/worker-log-events.json
```

### 36.3. Regla

Una consulta vacía inmediata no demuestra ausencia definitiva de logs.

---

## 37. Interpretación de logs

La investigación debe relacionar eventos y no limitarse a contar líneas.

### 37.1. Recorrido esperado

`job_started` identifica un intento.

`job_completed` identifica su terminación correcta.

`job_failed` identifica una excepción de procesamiento.

### 37.2. Correlación

Agrupa por `job_id`, `message_id` y `request_id`.

### 37.3. Regla

Un mismo trabajo puede tener varios eventos `job_started` por reintentos o duplicados.

---

## 38. Sesión 3: fallo didáctico

El SKU `DEMO-FAIL` permite observar un fallo reproducible.

### 38.1. Creación

```bash
curl --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"sku":"DEMO-FAIL","quantity":1}]}' \
  "${API_BASE}/jobs" \
  > resultados/private/failure-job.json

FAILURE_ID="$(jq -er '.job_id' resultados/private/failure-job.json)"
printf '{"job_id":"%s"}\n' "$FAILURE_ID" \
  >> resultados/private/jobs.jsonl
```

### 38.2. Resultado esperado

La API acepta el trabajo, pero el worker registra fallos.

### 38.3. Regla

El plazo de DLQ debe considerar visibilidad, recepciones y retrasos del emulador.

---

## 39. Observación de la DLQ

La cola fallida debe contener el mensaje del escenario, no cualquier mensaje.

### 39.1. Consulta inicial

```bash
DLQ_URL="$(jq -er '.queue.dlq_url' resultados/private/project.json)"

aws_local sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages
```

### 39.2. Identidad

Después, recibe desde la DLQ y compara el `job_id` del cuerpo.

### 39.3. Regla

Un contador aproximado mayor que cero no demuestra que llegó el trabajo esperado.

---

## 40. Sesión 4: recepción diagnóstica

Recibir desde una DLQ también cambia la visibilidad del mensaje.

### 40.1. Comando

```bash
aws_local sqs receive-message \
  --queue-url "$DLQ_URL" \
  --wait-time-seconds 5 \
  --max-number-of-messages 10 \
  > resultados/private/dlq-messages.json
```

### 40.2. Comparación

```bash
jq --arg identity "$FAILURE_ID" \
  '[.Messages[]? | select(
    (.Body | fromjson | .job_id) == $identity
  )] | length' \
  resultados/private/dlq-messages.json
```

### 40.3. Regla

No elimines el mensaje durante el diagnóstico salvo que la actividad lo requiera explícitamente.

---

## 41. Restaurar visibilidad de mensajes consultados

La investigación no debe ocultar innecesariamente otros mensajes.

### 41.1. Procedimiento

```bash
jq -r '.Messages[]?.ReceiptHandle' \
  resultados/private/dlq-messages.json |
while IFS= read -r receipt; do
  aws_local sqs change-message-visibility \
    --queue-url "$DLQ_URL" \
    --receipt-handle "$receipt" \
    --visibility-timeout 0
done
```

### 41.2. Precaución

Este procedimiento solo afecta a las recepciones recién obtenidas.

### 41.3. Regla

Un ReceiptHandle es información operacional y no debe publicarse como artifact.

---

## 42. Estado HTTP de trabajos fallidos

La API de referencia no mantiene un estado terminal de error.

### 42.1. Comportamiento esperado

Un trabajo en DLQ puede seguir devolviendo HTTP 202.

Existe la solicitud, pero no existe resultado.

### 42.2. Interpretación

La respuesta describe ausencia de resultado, no actividad del worker.

### 42.3. Ejercicio

Diseña un registro explícito de estados terminales.

### 42.4. Regla

No cambies la prueba para esperar `failed` sin implementar primero ese contrato.

---

## 43. Métricas y alarmas

Los logs son útiles, pero no sustituyen métricas y alertas.

### 43.1. Señales recomendadas

Número de errores.

Duración de procesamiento.

Antigüedad de mensajes.

Mensajes pendientes en DLQ.

Respuestas HTTP 5xx.

### 43.2. LocalStack

Valida por separado emisión de métricas y evaluación de alarmas.

### 43.3. Regla

Crear una alarma con Terraform no demuestra que su evaluación funcione igual que en AWS.

---

## 44. Informes públicos seleccionados

Las evidencias públicas deben excluir respuestas operativas completas.

### 44.1. Resumen sugerido

```json
{
  "schema_version": 1,
  "unit_tests_passed": true,
  "http_tests_passed": true,
  "correlation_observed": true,
  "dlq_scenario_observed": true,
  "convergence_passed": true,
  "cleanup_passed": true
}
```

### 44.2. Regla

Genera el resumen a partir de resultados reales; no utilices esta muestra como evidencia ejecutada.

---

## 45. Sesión 5: convergencia

Las pruebas funcionales no deben modificar configuración administrada.

### 45.1. Comando

```bash
terraform -chdir=app plan -detailed-exitcode
```

### 45.2. Interpretación

Código 0: sin cambios.

Código 2: cambios propuestos.

Código 1: error operacional.

### 45.3. Regla

Objetos S3 escritos por la aplicación no son automáticamente recursos administrados por Terraform.

---

## 46. Orden del pipeline

La automatización debe separar preparación, pruebas y limpieza.

### 46.1. Secuencia recomendada

Tests unitarios.

Formato y validación Terraform.

Empaquetado.

Plan, revisión y aplicación.

Pruebas HTTP.

Diagnóstico y evidencias.

Convergencia.

Limpieza y ausencia.

### 46.2. Regla

Un teardown correcto no convierte una prueba fallida en una ejecución correcta.

---

## 47. Limpieza sin carreras

Antes de retirar objetos, impide nuevas escrituras.

### 47.1. Preparación

Detén el envío de solicitudes.

Deshabilita el event source mapping.

Espera a que terminen invocaciones activas.

Confirma que no continúa el procesamiento.

### 47.2. Terraform

Introduce una variable de habilitación y aplica `enabled = false` mediante la configuración.

### 47.3. Regla

Deshabilitar el mapping no cancela invocaciones que ya estaban ejecutándose.

---

## 48. Sesión 6: datos y recursos

Utiliza un entorno dedicado únicamente a esta ejecución.

### 48.1. Limpieza dirigida

```bash
BUCKET="$(jq -er '.storage.name' resultados/private/project.json)"
RUN_ID="$(jq -er '.run_id' resultados/private/project.json)"
test "$BUCKET" = "curso-async-${RUN_ID}-data"

aws_local s3 rm "s3://${BUCKET}/requests/" --recursive
aws_local s3 rm "s3://${BUCKET}/results/" --recursive

terraform -chdir=app plan -destroy -out=../planes/destroy.tfplan
terraform -chdir=app show ../planes/destroy.tfplan
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list
```

### 48.2. Regla

Si la limpieza falla, conserva estado y diagnóstico antes de detener LocalStack.

---

## 49. Verificación de ausencia y límites

La ausencia debe comprobarse con consultas correctas y exitosas.

### 49.1. Inventarios

```bash
aws_local lambda list-functions
aws_local apigateway get-rest-apis
aws_local sqs list-queues
aws_local s3api list-buckets
aws_local logs describe-log-groups
```

### 49.2. Contexto

Busca los identificadores del contrato y los nombres de esta ejecución.

### 49.3. Diferencias respecto a AWS real

Quedan pendientes IAM efectivo, rendimiento, cuotas, propagación y resiliencia productiva.

### 49.4. Regla

Un endpoint inaccesible no constituye evidencia de ausencia.

---

## 50. Ejercicios y resumen

La evaluación debe demostrar comportamiento, diagnóstico y recuperación.

### 50.1. Ejercicios

1. Añade límites máximos a los tests de validación.
2. Comprueba un lote con varios fallos.
3. Prueba un duplicado del mismo trabajo.
4. Verifica que los logs no contienen documentos.
5. Observa un trabajo fallido en DLQ.
6. Implementa un estado terminal de error.
7. Automatiza un resumen seleccionado.
8. Demuestra limpieza después de una prueba fallida.

### 50.2. Entrega

Incluye código, versiones, matriz de pruebas y evidencias revisadas.

Excluye estados, planes, cuerpos completos y ReceiptHandles.

### 50.3. Idea final

**El proyecto final es verificable cuando sus pruebas explican qué funciona, sus señales permiten investigar qué falló y su limpieza demuestra qué recursos permanecen al terminar.**