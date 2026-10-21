# LocalStack en pipelines CI/CD con Terraform

Integrar LocalStack en un pipeline permite comprobar infraestructura y recorridos funcionales antes de promover cambios a otros entornos.

El objetivo no es reproducir todas las garantías de AWS, sino disponer de una etapa de verificación local, automatizada y reproducible.

Un pipeline fiable debe preparar herramientas, arrancar el emulador, esperar su disponibilidad, ejecutar comprobaciones y limpiar los recursos creados.

También debe distinguir un fallo de prueba de un fallo de limpieza.

En esta lección construirás un laboratorio Terraform con S3 y SQS y un ejecutor reutilizable desde la terminal y GitHub Actions.

Las sesiones incluyen pruebas positivas, fallos controlados, evidencias sanitizadas y verificación del teardown.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La etapa LocalStack no requiere credenciales de producción.
>
> Superar este pipeline no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección transforma un laboratorio local en una etapa de integración continua.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Organizar fases de verificación.
- Utilizar identificadores únicos.
- Configurar servicios emulados.
- Esperar disponibilidad sin pausas arbitrarias.
- Ejecutar pruebas Terraform y funcionales.
- Conservar resultados y limpiar tras fallos.
- Publicar únicamente evidencias seleccionadas.

### 1.2. Resultado práctico

Ejecutarás el mismo procedimiento desde tu equipo y desde un runner CI.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Terraform, Docker y pruebas de infraestructura.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
git --version
```

### 2.2. Conocimientos recomendados

Revisa estado, proveedores locales, `terraform test` y limpieza de laboratorios.

---

## 3. Versiones y compatibilidad

La reproducibilidad requiere identificar las dependencias utilizadas.

### 3.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

La imagen LocalStack debe fijarse mediante etiqueta validada o digest.

### 3.2. Antes de distribuir

El docente debe validar herramientas, comandos, códigos de salida y recorrido completo.

### 3.3. Regla

**No presentes una combinación de versiones no comprobada como un entorno validado.**

---

## 4. Qué aporta LocalStack a CI

El emulador permite ejecutar determinadas operaciones AWS sin una cuenta real.

### 4.1. Beneficios

Reduce dependencias de cuentas compartidas.

Permite crear recursos efímeros.

Facilita reproducir fallos localmente.

Evita costes AWS del laboratorio.

### 4.2. Límite

No reproduce necesariamente IAM, propagación, rendimiento ni cuotas de forma equivalente.

### 4.3. Regla

Cada conclusión debe indicar qué propiedad se comprobó y en qué entorno.

---

## 5. CI y CD son responsabilidades distintas

Esta práctica implementa una etapa de CI, no un despliegue de producción.

### 5.1. Comparación

| **Etapa** | **Responsabilidad** | **Credenciales AWS reales** |
|-----------|--------------------|-----------------------------|
| CI local | Revisar y probar | No necesarias |
| Pruebas LocalStack | Crear recursos emulados | No necesarias |
| Promoción posterior | Entregar a otro entorno | Fuera de esta práctica |

La promoción debe tener controles independientes.

### 5.2. Regla

Un resultado positivo en LocalStack puede ser una condición de promoción, no su única autorización.

---

## 6. Arquitectura del pipeline

El flujo debe ser explícito y observable.

### 6.1. Recorrido

```text
Checkout
    ↓
Herramientas y dependencias
    ↓
Formato, inicialización y validación
    ↓
LocalStack y disponibilidad
    ↓
Pruebas de contrato
    ↓
Plan, apply y prueba funcional
    ↓
Limpieza de datos y recursos
    ↓
Resumen sanitizado
```

### 6.2. Regla

El teardown debe ejecutarse aunque una fase anterior falle.

---

## 7. Contrato del laboratorio

Crearemos un bucket y una cola estándar.

### 7.1. Propiedades

El bucket almacenará un documento ficticio.

La cola transportará una referencia a ese documento.

El consumidor de prueba recuperará y comparará el contenido.

### 7.2. Alcance

No configuraremos notificaciones automáticas S3 ni consumidores permanentes.

### 7.3. Regla

El productor de prueba enviará explícitamente el mensaje.

---

## 8. Matriz de fases

Cada fase necesita un criterio de éxito.

### 8.1. Matriz

| **Fase** | **Expectativa** | **Efectos** |
|----------|------------------|-------------|
| Formato | Código consistente | Sin recursos |
| Contrato | Aserciones correctas | Plan |
| Aplicación | Recursos creados | S3 y SQS |
| Funcional | Documento recuperado | Objeto y mensaje |
| Teardown | Recursos ausentes | Eliminación |

El resultado global debe considerar prueba y limpieza.

### 8.2. Regla

No conviertas una limpieza correcta en éxito de una prueba fallida.

---

## 9. Estructura del repositorio

Mantén código, herramientas y evidencias separados.

### 9.1. Directorios

```bash
mkdir -p terraform-localstack-ci/app/tests
mkdir -p terraform-localstack-ci/scripts
mkdir -p terraform-localstack-ci/resultados
mkdir -p terraform-localstack-ci/.github/workflows
cd terraform-localstack-ci
```

### 9.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 9.3. Aislamiento

Cada job utilizará su propio checkout y estado local.

---

## 10. Archivos que no debes publicar

Los artefactos operativos pueden contener información sensible.

### 10.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.sandbox/
.env
resultados/
crash.log
```

### 10.2. Qué conservar

Versiona código, pruebas, scripts y `.terraform.lock.hcl`.

### 10.3. Regla

No subas estados, planes ni directorios completos de trabajo como artifacts rutinarios.

---

## 11. Imagen de LocalStack

Selecciona una imagen validada antes de ejecutar la práctica.

### 11.1. Configuración local

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 11.2. Configuración CI

Guarda la misma referencia como variable de repositorio `LOCALSTACK_IMAGE`.

### 11.3. Regla

Sustituye el marcador antes de distribuir el laboratorio.

---

## 12. Docker Compose

El laboratorio publica únicamente un endpoint local.

### 12.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 12.2. Alcance

No necesitamos persistencia ni montar el socket Docker dentro del contenedor.

### 12.3. Regla

Un puerto fijo requiere un runner aislado o ejecución local secuencial.

---

## 13. Requisitos Terraform

Crea `app/versions.tf`.

### 13.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 13.2. Estado

La etapa CI no utiliza un backend AWS real.

---

## 14. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 14.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 14.2. Regla

Las opciones de omisión no sustituyen endpoints explícitos.

---

## 15. Identidad de ejecución

Crea `app/variables.tf`.

### 15.1. Entrada

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}
```

### 15.2. Generación

El ejecutor creará un identificador nuevo por ejecución.

### 15.3. Regla

No compartas estado entre ejecuciones concurrentes.

---

## 16. Recursos del laboratorio

Crea `app/main.tf`.

### 16.1. Infraestructura

```hcl
resource "aws_s3_bucket" "documents" {
  bucket        = "curso-ci-${var.run_id}-documents"
  force_destroy = false
  tags          = { Laboratory = "LocalStack" }
}

resource "aws_sqs_queue" "work" {
  name                       = "curso-ci-${var.run_id}-work"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  tags                       = { Laboratory = "LocalStack" }
}
```

### 16.2. Alcance

Este fixture mínimo no representa una configuración completa de producción.

---

## 17. Contrato de salida

Crea `app/outputs.tf`.

### 17.1. Referencias

```hcl
output "contract" {
  value = {
    version            = 1
    bucket_name        = aws_s3_bucket.documents.id
    queue_url          = aws_sqs_queue.work.id
    visibility_seconds = aws_sqs_queue.work.visibility_timeout_seconds
  }
}
```

### 17.2. Regla

La prueba utilizará las referencias publicadas, no nombres adivinados.

---

## 18. Prueba de contrato

Crea `app/tests/contract.tftest.hcl`.

### 18.1. Plan positivo

```hcl
run "contract_plan" {
  command = plan

  assert {
    condition     = output.contract.version == 1
    error_message = "El contrato debe publicar la versión 1."
  }

  assert {
    condition     = output.contract.visibility_seconds == 30
    error_message = "La visibilidad prevista debe ser 30."
  }
}
```

### 18.2. Regla

No comprobaremos una URL calculada mediante una aserción de plan.

---

## 19. Prueba negativa

Añade otra ejecución al mismo archivo.

### 19.1. Rechazo esperado

```hcl
run "reject_invalid_identifier" {
  command = plan

  variables {
    run_id = "invalid"
  }

  expect_failures = [var.run_id]
}
```

### 19.2. Interpretación

La prueba pasa cuando falla la validación prevista.

### 19.3. Regla

Un error de red no equivale al rechazo correcto de una entrada.

---

## 20. Preparación del archivo de bloqueo

El pipeline utilizará inicialización readonly.

### 20.1. Preparación docente

```bash
terraform fmt -recursive
terraform -chdir=app init
terraform -chdir=app validate
git add app/.terraform.lock.hcl
```

### 20.2. Plataformas

Si necesitas otras plataformas, prepara los checksums mediante `terraform providers lock`.

### 20.3. Regla

No actualices proveedores automáticamente durante una ejecución ordinaria de CI.

---

## 21. Contexto del ejecutor

El script centralizará credenciales ficticias y archivos operativos.

### 21.1. Diseño

Eliminará variables AWS heredadas.

Eliminará argumentos Terraform inyectados mediante entorno.

Utilizará archivos AWS vacíos.

Guardará logs localmente, pero publicará solo un resumen seleccionado.

### 21.2. Regla

El script no constituye una sandbox frente a código arbitrario.

---

## 22. Ejecutor: imports y rutas

Crea `scripts/pipeline.py`.

### 22.1. Código inicial

```python
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "resultados"
PRIVATE = REPORTS / "private"
SANDBOX = ROOT / ".sandbox"

for path in (REPORTS, PRIVATE, SANDBOX):
    path.mkdir(parents=True, exist_ok=True)
    path.chmod(0o700)

run_id = uuid.uuid4().hex[:12]
project = f"course-ci-{run_id}"
```

### 22.2. Continuación

Los bloques siguientes completan el mismo archivo, en orden.

---

## 23. Ejecutor: entorno ficticio

Añade la construcción del entorno.

### 23.1. Configuración

```python
env = os.environ.copy()
for key in list(env):
    if key.startswith(("AWS_", "TF_VAR_", "TF_CLI_ARGS")):
        env.pop(key, None)

for key in ("TF_WORKSPACE", "TF_DATA_DIR", "TF_LOG", "TF_LOG_PATH"):
    env.pop(key, None)

for name in ("config", "credentials"):
    path = SANDBOX / name
    path.write_text("", encoding="utf-8")
    path.chmod(0o600)

env.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_CONFIG_FILE": str(SANDBOX / "config"),
    "AWS_SHARED_CREDENTIALS_FILE": str(SANDBOX / "credentials"),
    "AWS_PAGER": "",
    "AWS_CLI_AUTO_PROMPT": "off",
    "TF_IN_AUTOMATION": "true",
    "TF_VAR_run_id": run_id,
    "NO_PROXY": "127.0.0.1,localhost,localhost.localstack.cloud",
})
```

---

## 24. Ejecutor: fases y logs

Añade el mecanismo de ejecución.

### 24.1. Implementación

```python
phases = []
sequence = 0

def command(name, arguments, timeout=180, record=True):
    global sequence
    sequence += 1
    try:
        result = subprocess.run(
            arguments, cwd=ROOT, env=env,
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        if record:
            phases.append({"phase": name, "passed": False})
        raise RuntimeError(f"Timeout en {name}.")

    prefix = PRIVATE / f"{sequence:03d}-{name}"
    prefix.with_suffix(".stdout.txt").write_text(result.stdout)
    prefix.with_suffix(".stderr.txt").write_text(result.stderr)

    if record:
        phases.append({"phase": name, "passed": result.returncode == 0})
    if result.returncode != 0:
        raise RuntimeError(f"Falló la fase {name}.")
    return result.stdout
```

---

## 25. Ejecutor: comandos comunes

Añade wrappers para Docker, Terraform y AWS CLI.

### 25.1. Implementación

```python
compose = ["docker", "compose", "-p", project]
terraform = ["terraform", f"-chdir={ROOT / 'app'}"]

def tf(name, *arguments, timeout=180):
    return command(name, [*terraform, *arguments], timeout=timeout)

def aws(service, operation, *arguments):
    text = command(
        f"aws-{service}-{operation}",
        [
            "aws", "--endpoint-url=http://127.0.0.1:4566",
            "--region=us-east-1", "--output=json",
            service, operation, *arguments,
        ],
        timeout=20, record=False,
    )
    return json.loads(text) if text.strip() else {}
```

### 25.2. Regla

No añadas un destino remoto como alternativa ante errores locales.

---

## 26. Ejecutor: disponibilidad

Añade una espera basada en operaciones reales.

### 26.1. Implementación

```python
def wait_ready():
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            aws("s3api", "list-buckets")
            aws("sqs", "list-queues")
            phases.append({"phase": "readiness", "passed": True})
            return
        except (RuntimeError, json.JSONDecodeError):
            time.sleep(2)

    phases.append({"phase": "readiness", "passed": False})
    raise RuntimeError("LocalStack no quedó disponible.")
```

### 26.2. Límite

Una llamada en curso puede extender ligeramente el plazo global.

### 26.3. Regla

Un contenedor arrancado no equivale a servicios disponibles.

---

## 27. Ejecutor: validación de URL

Añade una comprobación cerrada del destino SQS.

### 27.1. Implementación

```python
def local_queue(value):
    parsed = urlsplit(value)
    allowed = {"127.0.0.1", "localhost", "localhost.localstack.cloud"}

    if (
        parsed.scheme != "http"
        or parsed.hostname not in allowed
        or parsed.port != 4566
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError("La URL de cola no es local.")

    return urlunsplit(("http", "127.0.0.1:4566", parsed.path, "", ""))
```

### 27.2. Compatibilidad

El docente debe validar la normalización con `SQS_ENDPOINT_STRATEGY=path`.

---

## 28. Ejecutor: prueba funcional

Añade la preparación y publicación de datos.

### 28.1. Primera parte

```python
fixture = None

def smoke(contract):
    global fixture
    bucket = contract["bucket_name"]
    queue = local_queue(contract["queue_url"])
    event_id = uuid.uuid4().hex
    key = f"ci/{event_id}.json"
    payload = {"event_id": event_id, "purpose": "ci-laboratory"}
    event = {"event_id": event_id, "bucket": bucket, "key": key}

    source = PRIVATE / "document.json"
    source.write_text(json.dumps(payload))
    fixture = {"bucket": bucket, "key": key}

    aws("s3api", "put-object", "--bucket", bucket, "--key", key,
        "--body", str(source))
    aws("sqs", "send-message", "--queue-url", queue,
        "--message-body", json.dumps(event))
```

### 28.2. Continuación

El bloque siguiente permanece dentro de `smoke`.

---

## 29. Ejecutor: recepción y comparación

Completa la función `smoke`.

### 29.1. Segunda parte

```python
    deadline = time.monotonic() + 30
    found = False

    while time.monotonic() < deadline and not found:
        response = aws(
            "sqs", "receive-message", "--queue-url", queue,
            "--wait-time-seconds", "2", "--max-number-of-messages", "10",
        )
        for message in response.get("Messages", []):
            if json.loads(message["Body"]) != event:
                raise RuntimeError("Se recibió un evento inesperado.")

            target = PRIVATE / "recovered.json"
            aws("s3api", "get-object", "--bucket", bucket,
                "--key", key, str(target))
            if json.loads(target.read_text()) != payload:
                raise RuntimeError("El documento recuperado no coincide.")

            aws("sqs", "delete-message", "--queue-url", queue,
                "--receipt-handle", message["ReceiptHandle"])
            found = True

    if not found:
        raise RuntimeError("No se observó el evento esperado.")
```

---

## 30. Ejecutor: verificación de ausencia

Añade una función para consultar los inventarios finales.

### 30.1. Implementación

```python
def verify_absence():
    bucket_name = f"curso-ci-{run_id}-documents"
    queue_prefix = f"curso-ci-{run_id}-"

    buckets = aws("s3api", "list-buckets").get("Buckets", [])
    queues = aws(
        "sqs", "list-queues", "--queue-name-prefix", queue_prefix
    ).get("QueueUrls", [])

    if any(item["Name"] == bucket_name for item in buckets) or queues:
        raise RuntimeError("Persisten recursos del laboratorio.")

    phases.append({"phase": "absence", "passed": True})
```

### 30.2. Regla

Una consulta fallida no se convierte en evidencia de ausencia.

---

## 31. Ejecutor: fase principal

Añade el recorrido controlado.

### 31.1. Implementación

```python
initialized = False
compose_attempted = False
test_passed = False
cleanup_passed = True

try:
    command("fmt", ["terraform", "fmt", "-check", "-diff", "-recursive", "app"])
    tf("init", "init", "-input=false", "-lockfile=readonly")
    initialized = True
    tf("validate", "validate", "-no-color")

    compose_attempted = True
    command("compose-up", [*compose, "up", "-d"], timeout=180)
    wait_ready()

    tf("contract", "test", "-no-color")
    tf("plan", "plan", "-input=false", "-out=../resultados/private/create.tfplan")
    tf("apply", "apply", "-input=false", "../resultados/private/create.tfplan")
    contract = json.loads(tf("outputs", "output", "-json", "contract"))

    smoke(contract)
    phases.append({"phase": "smoke", "passed": True})
    test_passed = True
except Exception:
    phases.append({"phase": "execution", "passed": False})
finally:
```

### 31.2. Continuación

La limpieza siguiente pertenece al bloque `finally`.

---

## 32. Ejecutor: limpieza tras cualquier resultado

Añade este bloque con la indentación indicada.

### 32.1. Implementación

```python
    if fixture is not None:
        try:
            aws("s3api", "delete-object", "--bucket", fixture["bucket"],
                "--key", fixture["key"])
            phases.append({"phase": "fixture-cleanup", "passed": True})
        except Exception:
            cleanup_passed = False
            phases.append({"phase": "fixture-cleanup", "passed": False})

    if initialized and compose_attempted:
        try:
            tf("destroy", "destroy", "-auto-approve", "-input=false", "-no-color")
            verify_absence()
        except Exception:
            cleanup_passed = False
            phases.append({"phase": "infrastructure-cleanup", "passed": False})

    if compose_attempted:
        try:
            command("compose-down", [*compose, "down", "--remove-orphans"])
        except Exception:
            cleanup_passed = False
```

### 32.2. Regla

Se intenta destroy incluso si apply terminó parcialmente con error.

---

## 33. Ejecutor: resumen y resultado global

Completa el archivo fuera del bloque `finally`.

### 33.1. Implementación

```python
summary = {
    "schema_version": 1,
    "run_id": run_id,
    "compose_project": project,
    "tests_passed": test_passed,
    "cleanup_passed": cleanup_passed,
    "pipeline_passed": test_passed and cleanup_passed,
    "phases": phases,
}

(REPORTS / "summary.json").write_text(
    json.dumps(summary, indent=2), encoding="utf-8"
)

print(json.dumps({
    "pipeline_passed": summary["pipeline_passed"],
    "cleanup_passed": cleanup_passed,
}))

sys.exit(0 if summary["pipeline_passed"] else 1)
```

### 33.2. Regla

El resumen no incorpora stdout, stderr, cuerpos ni estado Terraform.

---

## 34. Límites del ejecutor

La automatización reduce errores operativos, pero no garantiza aislamiento absoluto.

### 34.1. No controla

Configuraciones HCL arbitrarias.

Integridad de herramientas.

Todos los destinos de red.

Procesos externos.

Cancelaciones abruptas del runner.

### 34.2. Regla

Utiliza runners efímeros y herramientas confiables para ejecutar código no confiable.

---

## 35. Sesión 1: ejecutar localmente

Duración orientativa: 35 minutos.

### 35.1. Comandos

```bash
python3 -m py_compile scripts/pipeline.py
python3 scripts/pipeline.py
cat resultados/summary.json
```

### 35.2. Resultado esperado

Pruebas correctas, datos retirados, recursos ausentes y Compose detenido.

### 35.3. Precaución

No ejecutes otra instancia local mientras el puerto 4566 esté ocupado.

---

## 36. Sesión 2: repetir el pipeline

La segunda ejecución debe mantener el aislamiento.

### 36.1. Comando

```bash
python3 scripts/pipeline.py
```

### 36.2. Resultado esperado

Se genera otro identificador y otro proyecto Compose.

### 36.3. Interpretación

La repetición demuestra el recorrido local observado.

No certifica idempotencia de una aplicación externa.

### 36.4. Regla

Una repetición no debe depender de recursos anteriores.

---

## 37. GitHub Actions como ejemplo CI

El mismo ejecutor puede utilizarse desde un workflow.

### 37.1. Requisitos del runner

Docker Engine y Compose.

Python.

AWS CLI compatible.

Terraform fijado por configuración.

### 37.2. Alcance

Utilizaremos un runner Ubuntu hospedado.

### 37.3. Regla

Comprueba las herramientas disponibles; las imágenes del runner evolucionan.

---

## 38. Variables del repositorio

Configura referencias antes de activar el workflow.

### 38.1. Variables necesarias

| **Variable** | **Contenido** | **Tipo** |
|--------------|---------------|----------|
| `TERRAFORM_VERSION` | Versión concreta validada | Variable |
| `LOCALSTACK_IMAGE` | Etiqueta o digest validado | Variable |

Ninguna requiere ser una credencial AWS.

### 38.2. Ediciones con licencia

Si tu edición requiere autenticación, utiliza un secreto dedicado de LocalStack.

### 38.3. Regla

Ese token no es una credencial AWS y no debe aparecer en informes.

---

## 39. Workflow: eventos y permisos

Crea `.github/workflows/localstack-ci.yml`.

### 39.1. Inicio

```yaml
name: Terraform LocalStack CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  integration:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    env:
      LOCALSTACK_IMAGE: ${{ vars.LOCALSTACK_IMAGE }}
      TF_IN_AUTOMATION: "true"
```

### 39.2. Seguridad

No utilizaremos `pull_request_target` para ejecutar código del cambio con privilegios.

---

## 40. Workflow: checkout y herramientas

Continúa dentro del job.

### 40.1. Pasos

```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ vars.TERRAFORM_VERSION }}
          terraform_wrapper: false

      - name: Verify tools
        run: |
          test -n "${LOCALSTACK_IMAGE}"
          terraform version
          docker version
          docker compose version
          aws --version
          python3 --version
```

### 40.2. Endurecimiento

Antes de producción, fija las acciones mediante SHA completos revisados.

---

## 41. Workflow: ejecución y evidencias

Completa la lista de pasos.

### 41.1. Pasos finales

```yaml
      - name: Run LocalStack pipeline
        run: python3 scripts/pipeline.py

      - name: Upload sanitized summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: localstack-summary-${{ github.run_id }}-${{ github.run_attempt }}
          path: resultados/summary.json
          if-no-files-found: warn
          retention-days: 7
```

### 41.2. Regla

No publiques `resultados/private`, `.terraform` ni el checkout completo.

### 41.3. Límite

`always()` no garantiza ejecución si el runner desaparece.

---

## 42. Sesión 3: activar CI

La primera ejecución debe realizarse en una rama de laboratorio.

### 42.1. Secuencia

Añade las variables del repositorio.

Confirma el archivo de bloqueo.

Publica una rama con código y workflow.

Abre una solicitud de cambios.

### 42.2. Resultado esperado

El job ejecuta el mismo script utilizado localmente.

### 42.3. Regla

Descarga y revisa el resumen, no únicamente el indicador verde.

---

## 43. Sesión 4: fallo de formato

Una puerta útil debe detectar errores antes del despliegue.

### 43.1. Ejercicio

Introduce un cambio de formato en `app`.

Ejecuta el pipeline o publica una rama.

### 43.2. Resultado esperado

La fase fmt falla antes de arrancar LocalStack.

### 43.3. Recuperación

Ejecuta `terraform fmt -recursive app` y repite.

### 43.4. Regla

No elimines `-check` para convertir una comprobación en una corrección silenciosa.

---

## 44. Sesión 5: fallo de contrato

Comprueba que las aserciones bloquean el recorrido.

### 44.1. Ejercicio

Cambia temporalmente la expectativa de visibilidad de 30 a 31.

Ejecuta el pipeline.

### 44.2. Resultado esperado

La prueba falla y se ejecuta el teardown.

### 44.3. Evidencia

`tests_passed` es falso aunque la limpieza termine correctamente.

### 44.4. Recuperación

Restaura la aserción antes de continuar.

---

## 45. Sesión 6: fallo funcional

La prueba funcional debe distinguir transporte y contenido.

### 45.1. Ejercicio

En una copia del script, modifica el contenido esperado tras escribir el documento.

Ejecuta el pipeline.

### 45.2. Resultado esperado

La comparación falla después de crear recursos.

### 45.3. Limpieza

Se intenta retirar el objeto y destruir la infraestructura.

### 45.4. Regla

El fallo original no debe desaparecer del resultado global.

---

## 46. Sesión 7: imagen incorrecta

Comprueba que un error operacional no se clasifica como fallo de contrato.

### 46.1. Ejercicio

Utiliza temporalmente una referencia de imagen inexistente.

### 46.2. Resultado esperado

Falla el arranque del emulador.

El pipeline termina con error y conserva un resumen limitado.

### 46.3. Recuperación

Restaura la referencia validada.

### 46.4. Regla

No cambies a una imagen flotante como recuperación permanente.

---

## 47. Cache de proveedores

Una cache puede acelerar inicialización, pero necesita límites.

### 47.1. Buen diseño

Cachea plugins con claves que incluyan plataforma y archivo de bloqueo.

Conserva verificación de checksums.

Separa caches confiables de escrituras no confiables.

### 47.2. Evita

No cachees estados, planes ni todo `.terraform` indiscriminadamente.

### 47.3. Regla

Una cache es una optimización, no la fuente de verdad de dependencias.

---

## 48. Runners hospedados y autogestionados

El aislamiento cambia según el tipo de runner.

### 48.1. Comparación

| **Runner** | **Ventaja** | **Riesgo relevante** |
|------------|-------------|----------------------|
| Hospedado efímero | Menor persistencia entre jobs | Imagen cambiante |
| Autogestionado | Control de herramientas | Recursos y credenciales residuales |
| Contenedor dedicado | Entorno definido | Acceso al Docker host |

Selecciona según confianza y mantenimiento.

### 48.2. Regla

No ejecutes cambios no confiables en un runner con acceso a credenciales de producción.

---

## 49. Logs y evidencias

Los informes privados no deben publicarse automáticamente.

### 49.1. Política

El script guarda detalles en `resultados/private`.

El workflow publica únicamente `summary.json`.

Los detalles se revisan localmente o mediante un procedimiento de diagnóstico autorizado.

### 49.2. Regla

El enmascaramiento de CI no reconoce necesariamente todas las transformaciones de un secreto.

### 49.3. Retención

Define duración y acceso para cada categoría de evidencia.

---

## 50. Limpieza y cancelaciones

La limpieza en `finally` cubre fallos normales del proceso, no todos los incidentes.

### 50.1. Casos fuera de garantía

Terminación forzada.

Pérdida del runner.

Caída de Docker.

Cancelación abrupta del job.

### 50.2. Autogestionados

Añade inventario y recuperación de proyectos Compose abandonados.

### 50.3. Regla

No prometas teardown infalible; diseña detección de residuos.

---

## 51. Recuperación local

Si quedan recursos, utiliza el estado y los identificadores correctos.

### 51.1. Procedimiento

Consulta `summary.json`.

Identifica `compose_project`.

Revisa los logs privados sin publicarlos.

Restablece el emulador correspondiente cuando sea posible.

Retira el objeto concreto y ejecuta destroy con el identificador original.

### 51.2. Regla

No borres el estado para evitar un error de limpieza.

---

## 52. Diferencias respecto a AWS real

La etapa local necesita comprobaciones complementarias antes de producción.

### 52.1. Aspectos adicionales

IAM efectivo, KMS y auditoría.

Red, cuotas y propagación.

Disponibilidad, costes y resiliencia.

### 52.2. Alcance

El fixture de esta página no implementa controles completos de seguridad S3 o SQS.

### 52.3. Regla

Una prueba local positiva no autoriza por sí sola un despliegue real.

---

## 53. Ejercicios y evaluación

La evaluación debe demostrar resultados positivos, negativos y limpieza.

### 53.1. Ejercicios

1. Ejecuta el pipeline localmente.
2. Demuestra un fallo de formato.
3. Demuestra una aserción fallida.
4. Introduce un fallo funcional.
5. Comprueba ausencia de recursos.
6. Publica solo el resumen sanitizado.
7. Diseña recuperación para un runner autogestionado.
8. Explica qué pruebas faltan para AWS real.

### 53.2. Entrega

Incluye código, versiones y resúmenes; excluye estados, planes y logs privados completos.

---

## 54. Resumen de la lección

LocalStack permite incorporar pruebas de infraestructura a CI sin utilizar una cuenta AWS real.

### 54.1. Ideas esenciales

Las herramientas y la imagen deben fijarse.

La disponibilidad necesita una comprobación observable.

Pruebas y limpieza tienen resultados independientes.

El estado CI debe ser local y aislado.

Los artifacts deben seleccionarse explícitamente.

La promoción necesita controles adicionales.

### 54.2. Procedimiento recomendado

Prepara, valida, arranca, espera, prueba, registra, limpia y verifica.

### 54.3. Idea final

**Un pipeline fiable no solo termina en verde: demuestra qué comprobó, conserva evidencias proporcionadas y detecta cuándo la infraestructura temporal no se ha limpiado correctamente.**