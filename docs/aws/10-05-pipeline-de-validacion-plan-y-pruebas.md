# Pipeline de validación, plan y pruebas con Terraform y LocalStack

Un pipeline de infraestructura fiable no se limita a ejecutar `terraform apply`.

Antes de modificar recursos debe comprobar la configuración, evaluar el plan y verificar que las acciones propuestas cumplen una política explícita.

Después debe comprobar el resultado, ejecutar pruebas y revisar si la configuración ha convergido.

La limpieza también forma parte del contrato del pipeline.

En esta lección construirás un recorrido automatizado para una cola SQS y su cola de mensajes fallidos.

Terraform administrará los recursos y LocalStack emulará los servicios AWS.

El pipeline combinará validación, pruebas de contrato, análisis de un plan guardado, aplicación controlada, prueba funcional y verificación de ausencia.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los planes y estados necesitan protección.
>
> Una ejecución correcta en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección convierte decisiones de infraestructura en puertas de calidad verificables.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Separar validación, planificación y pruebas.
- Interpretar `-detailed-exitcode`.
- Evaluar acciones propuestas.
- Aplicar el mismo plan revisado.
- Comprobar atributos y mensajería.
- Detectar falta de convergencia.
- Limpiar después de fallos.
- Publicar evidencias limitadas.

### 1.2. Resultado práctico

Ejecutarás un pipeline local reutilizable desde CI.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de estado, SQS y pruebas Terraform.

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

### 2.2. Lecciones recomendadas

Revisa proveedores locales, análisis estático, `terraform test` y LocalStack en CI/CD.

---

## 3. Versiones de referencia

La reproducibilidad depende de herramientas y dependencias identificadas.

### 3.1. Terraform y proveedor

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

### 3.2. LocalStack

El docente debe seleccionar una imagen con etiqueta fija o digest.

### 3.3. Regla

**No distribuyas referencias sin validar como si fueran una combinación comprobada.**

---

## 4. Compatibilidad obligatoria

El recorrido completo debe validarse antes de utilizarlo en evaluación.

### 4.1. Operaciones necesarias

Comprueba:

- Creación y eliminación SQS.
- Configuración de redrive.
- Lectura de atributos.
- Envío, recepción y eliminación.
- Exportación JSON de planes.
- Pruebas de plan con Terraform.
- Destrucción tras un apply parcial.

### 4.2. Registro

Documenta versiones, edición e imagen del emulador.

---

## 5. Qué representa este pipeline

El laboratorio implementa una etapa de CI con recursos efímeros.

### 5.1. Incluye

Revisión de configuración.

Contrato de entrada y salida.

Política sobre acciones propuestas.

Prueba operacional.

Comprobación de limpieza.

### 5.2. No incluye

Promoción a AWS real ni aprobación de producción.

---

## 6. Fases y responsabilidades

Cada fase responde a una pregunta diferente.

### 6.1. Comparación

| **Fase** | **Pregunta** | **Efecto principal** |
|----------|--------------|---------------------|
| Validación | ¿La configuración es consistente? | Sin aplicación |
| Contrato | ¿Produce valores esperados? | Plan de prueba |
| Plan | ¿Qué acciones se proponen? | Artefacto operativo |
| Pruebas | ¿Funciona lo creado? | Mensaje ficticio |
| Limpieza | ¿Desaparecieron los recursos? | Eliminación |

Las fases se complementan.

### 6.2. Regla

Una fase superada no demuestra automáticamente las propiedades de las demás.

---

## 7. Arquitectura del laboratorio

Crearemos dos colas estándar relacionadas mediante una política de redrive.

### 7.1. Recorrido

```text
Pipeline
    ├── Valida configuración
    ├── Evalúa plan
    ├── Aplica recursos
    │      ├── Cola principal
    │      └── DLQ
    ├── Prueba envío y recepción
    └── Destruye y verifica ausencia
```

### 7.2. Alcance

No probaremos el traslado funcional a la DLQ.

---

## 8. Contrato de la infraestructura

El contrato define propiedades importantes para el laboratorio.

### 8.1. Expectativas

Existirán exactamente dos recursos administrados.

La cola principal tendrá visibilidad 30.

La DLQ tendrá retención de 14 días.

La política principal apuntará a esa DLQ.

### 8.2. Identidad

Los nombres incluirán un identificador único de ejecución.

### 8.3. Regla

No compartas nombres ni estados entre ejecuciones.

---

## 9. Política del plan

El primer plan se ejecutará sobre un estado vacío.

### 9.1. Acciones permitidas

Solo aceptaremos creación de:

- `aws_sqs_queue.main`.
- `aws_sqs_queue.dlq`.

### 9.2. Acciones rechazadas

Actualización, eliminación, reemplazo y recursos adicionales.

### 9.3. Regla

Esta política es específica de un laboratorio efímero, no una política universal de Terraform.

---

## 10. Por qué guardar el plan

Un plan guardado permite aplicar una decisión previamente evaluada.

### 10.1. Flujo

Genera el plan.

Exporta su representación JSON.

Evalúa la política.

Aplica el archivo binario original.

### 10.2. Precaución

No reconstruyas un plan desde JSON.

### 10.3. Regla

Protege ambos artefactos y evita modificar el contexto entre revisión y aplicación.

---

## 11. Códigos de planificación

`-detailed-exitcode` distingue tres resultados.

### 11.1. Interpretación

| **Código** | **Significado** | **Decisión del laboratorio** |
|------------|-----------------|------------------------------|
| 0 | Sin cambios | Esperado tras aplicar |
| 1 | Error | Detener |
| 2 | Cambios propuestos | Esperado en creación inicial |

El código 2 no es un error operacional.

### 11.2. Regla

El primer plan debe devolver 2; el plan de convergencia debe devolver 0.

---

## 12. Convergencia

Después de aplicar, un nuevo plan debería quedar sin cambios.

### 12.1. Propiedad comprobada

La configuración y el estado refrescado convergen bajo el contexto de ejecución.

### 12.2. Límite

Eso no certifica funcionamiento de consumidores ni ausencia de cambios futuros.

### 12.3. Regla

Comprueba convergencia después de las pruebas funcionales.

### 12.4. Mensajes

La presencia de mensajes no debe confundirse con cambios de configuración Terraform.

---

## 13. Estado y aislamiento

El pipeline utiliza un backend local dentro del directorio de trabajo.

### 13.1. Restricción

La configuración debe comenzar sin recursos administrados.

### 13.2. Motivo

La política inicial acepta únicamente creación.

### 13.3. Concurrencia

No ejecutes dos instancias sobre el mismo directorio.

### 13.4. Regla

Un identificador único no elimina el riesgo de compartir estado.

---

## 14. Preparación del proyecto

Trabaja en una carpeta independiente.

### 14.1. Directorios

```bash
mkdir -p terraform-plan-pipeline/app/tests
mkdir -p terraform-plan-pipeline/scripts
mkdir -p terraform-plan-pipeline/resultados
mkdir -p terraform-plan-pipeline/.github/workflows
cd terraform-plan-pipeline
```

### 14.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 14.3. Aislamiento

No copies `.terraform` ni estados anteriores.

---

## 15. Protección de archivos

Separa configuración y artefactos operativos.

### 15.1. `.gitignore`

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

### 15.2. Qué conservar

Versiona código, pruebas y `.terraform.lock.hcl`.

---

## 16. Permisos locales

Los informes pueden contener contexto operativo sensible.

### 16.1. Preparación

```bash
umask 077
chmod 700 resultados
```

### 16.2. Alcance

Estas instrucciones utilizan permisos POSIX.

Configura ACL equivalentes en otros sistemas.

### 16.3. Regla

Los permisos locales no protegen frente al administrador del host.

---

## 17. Imagen LocalStack

Selecciona una imagen validada por el docente.

### 17.1. Configuración

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. Reproducibilidad

Prefiere una referencia fija.

### 17.3. Regla

Sustituye el marcador antes de distribuir el laboratorio.

### 17.4. Edición

Comprueba que la edición seleccionada admite las operaciones SQS utilizadas.

---

## 18. Docker Compose

El servicio se publica únicamente en loopback.

### 18.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 18.2. Restricción

El puerto fijo exige ejecución local secuencial o runners aislados.

---

## 19. Requisitos Terraform

Crea `app/versions.tf`.

### 19.1. Configuración

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

### 19.2. Regla

El pipeline no utiliza un backend AWS real.

---

## 20. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 20.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 20.2. Regla

Las opciones de omisión no sustituyen endpoints explícitos.

---

## 21. Variables

Crea `app/variables.tf`.

### 21.1. Identidad

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

### 21.2. Generación

El ejecutor generará el identificador.

### 21.3. Regla

No incluyas un identificador fijo compartido en el repositorio.

---

## 22. Cola de mensajes fallidos

Crea `app/main.tf`.

### 22.1. Primer recurso

```hcl
resource "aws_sqs_queue" "dlq" {
  name                      = "curso-pipeline-${var.run_id}-dlq"
  message_retention_seconds = 1209600

  tags = {
    Laboratory = "LocalStack"
    Role       = "DLQ"
  }
}
```

### 22.2. Alcance

La DLQ permite comprobar una dependencia entre recursos.

### 22.3. Regla

Su existencia no demuestra redrive funcional.

---

## 23. Cola principal

Completa `app/main.tf`.

### 23.1. Configuración

```hcl
resource "aws_sqs_queue" "main" {
  name                       = "curso-pipeline-${var.run_id}-main"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Laboratory = "LocalStack"
    Role       = "Main"
  }
}
```

### 23.2. Dependencia

La referencia al ARN establece la relación en el grafo Terraform.

---

## 24. Contrato de salida

Crea `app/outputs.tf`.

### 24.1. Referencias

```hcl
output "contract" {
  value = {
    version            = 1
    queue_url          = aws_sqs_queue.main.id
    queue_arn          = aws_sqs_queue.main.arn
    dlq_arn            = aws_sqs_queue.dlq.arn
    visibility_seconds = aws_sqs_queue.main.visibility_timeout_seconds
    retention_seconds  = aws_sqs_queue.main.message_retention_seconds
  }
}
```

### 24.2. Regla

Las pruebas utilizarán referencias publicadas, no nombres adivinados.

---

## 25. Prueba de contrato

Crea `app/tests/contract.tftest.hcl`.

### 25.1. Plan positivo

```hcl
run "defaults_plan" {
  command = plan

  assert {
    condition     = output.contract.version == 1
    error_message = "El contrato debe publicar la versión 1."
  }

  assert {
    condition     = output.contract.visibility_seconds == 30
    error_message = "La visibilidad prevista debe ser 30."
  }

  assert {
    condition     = output.contract.retention_seconds == 86400
    error_message = "La retención prevista debe ser 86400."
  }
}
```

---

## 26. Prueba negativa

Añade otra ejecución al mismo archivo.

### 26.1. Rechazo previsto

```hcl
run "reject_invalid_identifier" {
  command = plan

  variables {
    run_id = "invalid"
  }

  expect_failures = [var.run_id]
}
```

### 26.2. Regla

Un fallo de red no equivale al rechazo correcto de una variable.

---

## 27. Preparación del archivo de bloqueo

La inicialización CI utilizará modo readonly.

### 27.1. Preparación docente

```bash
terraform fmt -recursive
terraform -chdir=app init
terraform -chdir=app validate
git add app/.terraform.lock.hcl
```

### 27.2. Plataformas

Prepara checksums adicionales con `terraform providers lock` cuando corresponda.

### 27.3. Regla

No utilices `init -upgrade` durante una ejecución ordinaria del pipeline.

---

## 28. Diseño del evaluador de planes

La política evaluará acciones, no texto presentado para humanos.

### 28.1. Entrada

Utilizaremos JSON generado por `terraform show -json`.

### 28.2. Comprobaciones

Rechazaremos JSON incompleto o sin estructura esperada.

Exigiremos exactamente los dos recursos permitidos.

Aceptaremos únicamente acciones `["create"]`.

### 28.3. Regla

Una política sin recursos evaluados no debe pasar silenciosamente.

---

## 29. Evaluador de planes

Crea `scripts/plan_policy.py`.

### 29.1. Implementación

```python
def evaluate(document):
    if not isinstance(document, dict):
        raise ValueError("El plan no es un objeto JSON.")

    if "resource_changes" not in document:
        raise ValueError("El plan no contiene cambios evaluables.")

    expected = {"aws_sqs_queue.main", "aws_sqs_queue.dlq"}
    observed = set()

    for item in document["resource_changes"]:
        if item.get("mode") != "managed":
            raise ValueError("El fixture no admite otros modos de recurso.")

        address = item.get("address")
        actions = item.get("change", {}).get("actions")

        if address not in expected or address in observed:
            raise ValueError("Recurso adicional o duplicado.")
        if actions != ["create"]:
            raise ValueError("Acción no permitida.")

        observed.add(address)

    if observed != expected:
        raise ValueError("No aparecen exactamente los recursos esperados.")

    return {"managed_resources": len(observed), "policy_passed": True}
```

---

## 30. Pruebas del evaluador

Crea `scripts/test_plan_policy.py`.

### 30.1. Casos mínimos

```python
import unittest
from plan_policy import evaluate

def fixture(actions=None):
    return {
        "resource_changes": [
            {
                "mode": "managed",
                "address": address,
                "change": {"actions": actions or ["create"]},
            }
            for address in ("aws_sqs_queue.main", "aws_sqs_queue.dlq")
        ]
    }

class PolicyTests(unittest.TestCase):
    def test_create(self):
        self.assertTrue(evaluate(fixture())["policy_passed"])

    def test_delete(self):
        with self.assertRaises(ValueError):
            evaluate(fixture(["delete"]))

    def test_empty(self):
        with self.assertRaises(ValueError):
            evaluate({"resource_changes": []})

if __name__ == "__main__":
    unittest.main()
```

---

## 31. Sesión 1: preparar y probar la política

Duración orientativa: 25 minutos.

### 31.1. Comandos

```bash
python3 scripts/test_plan_policy.py
python3 -m py_compile scripts/plan_policy.py
terraform fmt -check -diff -recursive app
terraform -chdir=app validate
```

### 31.2. Resultado esperado

La política acepta creación y rechaza eliminación y ausencia de recursos.

### 31.3. Regla

Prueba también las herramientas que deciden si un despliegue puede continuar.

---

## 32. Diseño del ejecutor

El script centralizará comandos, estado de fases y limpieza.

### 32.1. Responsabilidades

Preparar contexto ficticio.

Registrar logs privados.

Interpretar códigos específicos.

Aplicar el plan aceptado.

Conservar resultados separados.

### 32.2. Regla

Los bloques siguientes completan un único archivo en el orden indicado.

---

## 33. Ejecutor: imports y rutas

Crea `scripts/pipeline.py`.

### 33.1. Código inicial

```python
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from plan_policy import evaluate

ROOT = Path(__file__).resolve().parents[1]
run_id = uuid.uuid4().hex[:12]
REPORT = ROOT / "resultados" / run_id
PRIVATE = REPORT / "private"
SANDBOX = ROOT / ".sandbox" / run_id

for path in (REPORT, PRIVATE, SANDBOX):
    path.mkdir(parents=True, exist_ok=True)
    path.chmod(0o700)

project = f"course-plan-{run_id}"
phases = []
sequence = 0
```

---

## 34. Ejecutor: contexto ficticio

Añade el entorno utilizado por procesos hijos.

### 34.1. Implementación

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

## 35. Ejecutor: comandos y logs

Añade una función con códigos aceptados explícitos.

### 35.1. Implementación

```python
def command(name, arguments, accepted=(0,), timeout=180, record=True):
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

    passed = result.returncode in accepted
    if record:
        phases.append({
            "phase": name, "passed": passed,
            "exit_code": result.returncode,
        })
    if not passed:
        raise RuntimeError(f"Falló {name}.")
    return result
```

---

## 36. Ejecutor: wrappers

Añade comandos comunes sin destinos remotos alternativos.

### 36.1. Implementación

```python
terraform = ["terraform", f"-chdir={ROOT / 'app'}"]
compose = ["docker", "compose", "-p", project]

def tf(name, *arguments, accepted=(0,)):
    return command(name, [*terraform, *arguments], accepted=accepted)

def aws(operation, *arguments):
    result = command(
        f"aws-{operation}",
        [
            "aws", "--endpoint-url=http://127.0.0.1:4566",
            "--region=us-east-1", "--output=json",
            "sqs", operation, *arguments,
        ],
        timeout=20, record=False,
    )
    return json.loads(result.stdout) if result.stdout.strip() else {}
```

---

## 37. Ejecutor: disponibilidad y URL

Añade la espera y validación de destino.

### 37.1. Implementación

```python
def ready():
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            aws("list-queues")
            phases.append({"phase": "readiness", "passed": True})
            return
        except (RuntimeError, json.JSONDecodeError):
            time.sleep(2)
    raise RuntimeError("LocalStack no quedó disponible.")

def local_url(value):
    parsed = urlsplit(value)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {
            "127.0.0.1", "localhost", "localhost.localstack.cloud"
        }
        or parsed.port != 4566
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query or parsed.fragment
    ):
        raise RuntimeError("La URL SQS no es local.")
    return urlunsplit(("http", "127.0.0.1:4566", parsed.path, "", ""))
```

---

## 38. Ejecutor: atributos observados

Añade la comprobación operacional de configuración.

### 38.1. Implementación

```python
def configuration(contract):
    queue = local_url(contract["queue_url"])
    attributes = aws(
        "get-queue-attributes", "--queue-url", queue,
        "--attribute-names",
        "QueueArn", "VisibilityTimeout", "MessageRetentionPeriod", "RedrivePolicy",
    )["Attributes"]

    if attributes["QueueArn"] != contract["queue_arn"]:
        raise RuntimeError("ARN inesperado.")
    if attributes["VisibilityTimeout"] != "30":
        raise RuntimeError("Visibilidad inesperada.")
    if attributes["MessageRetentionPeriod"] != "86400":
        raise RuntimeError("Retención inesperada.")

    policy = json.loads(attributes["RedrivePolicy"])
    if (
        policy["deadLetterTargetArn"] != contract["dlq_arn"]
        or int(policy["maxReceiveCount"]) != 3
    ):
        raise RuntimeError("Redrive incompatible.")
```

---

## 39. Ejecutor: prueba funcional

Añade envío, recepción y confirmación de un evento ficticio.

### 39.1. Implementación

```python
def smoke(contract):
    queue = local_url(contract["queue_url"])
    event = {"event_id": uuid.uuid4().hex, "purpose": "plan-pipeline"}

    aws("send-message", "--queue-url", queue,
        "--message-body", json.dumps(event))

    deadline = time.monotonic() + 30
    found = False

    while time.monotonic() < deadline and not found:
        response = aws(
            "receive-message", "--queue-url", queue,
            "--wait-time-seconds", "2", "--max-number-of-messages", "10",
        )
        for message in response.get("Messages", []):
            if json.loads(message["Body"]) != event:
                raise RuntimeError("Evento inesperado.")
            aws("delete-message", "--queue-url", queue,
                "--receipt-handle", message["ReceiptHandle"])
            found = True

    if not found:
        raise RuntimeError("No se observó el evento esperado.")
```

---

## 40. Ejecutor: fase principal

Añade el recorrido desde formato hasta aplicación.

### 40.1. Implementación

```python
owns_state = False
compose_attempted = False
execution_passed = False
cleanup_passed = True

try:
    command("fmt", ["terraform", "fmt", "-check", "-diff", "-recursive", "app"])
    tf("init", "init", "-input=false", "-lockfile=readonly")
    existing = tf("state-list", "state", "list").stdout.strip()
    if existing:
        raise RuntimeError("El laboratorio exige un estado sin recursos.")
    owns_state = True

    tf("validate", "validate", "-no-color")
    command("policy-tests", [sys.executable, str(ROOT / "scripts/test_plan_policy.py")])

    compose_attempted = True
    command("compose-up", [*compose, "up", "-d"])
    ready()
    tf("contract-tests", "test", "-no-color")

    plan_path = PRIVATE / "create.tfplan"
    tf("initial-plan", "plan", "-input=false", "-detailed-exitcode",
       f"-out={plan_path}", accepted=(2,))
    plan = json.loads(tf("plan-json", "show", "-json", str(plan_path)).stdout)
    policy_result = evaluate(plan)
    phases.append({"phase": "plan-policy", **policy_result})
    tf("apply", "apply", "-input=false", str(plan_path))
```

---

## 41. Ejecutor: pruebas y convergencia

Continúa dentro del mismo bloque `try`.

### 41.1. Implementación

```python
    contract = json.loads(tf("outputs", "output", "-json", "contract").stdout)
    configuration(contract)
    phases.append({"phase": "configuration", "passed": True})

    smoke(contract)
    phases.append({"phase": "smoke", "passed": True})

    if os.environ.get("LAB_FAIL_AFTER_APPLY") == "1":
        raise RuntimeError("Fallo didáctico después de apply.")

    tf("convergence", "plan", "-input=false", "-detailed-exitcode",
       "-no-color", accepted=(0,))
    execution_passed = True

except Exception:
    phases.append({"phase": "execution", "passed": False})

finally:
```

### 41.2. Regla

La limpieza siguiente pertenece al bloque `finally`.

---

## 42. Ejecutor: limpieza y resumen

Completa el archivo con teardown y resultado global.

### 42.1. Implementación

```python
    if owns_state and compose_attempted:
        try:
            tf("destroy", "destroy", "-auto-approve", "-input=false", "-no-color")
            queues = aws(
                "list-queues", "--queue-name-prefix", f"curso-pipeline-{run_id}-"
            ).get("QueueUrls", [])
            if queues:
                raise RuntimeError("Persisten colas.")
            phases.append({"phase": "absence", "passed": True})
        except Exception:
            cleanup_passed = False
            phases.append({"phase": "resource-cleanup", "passed": False})

    if compose_attempted:
        try:
            command("compose-down", [*compose, "down", "--remove-orphans"])
        except Exception:
            cleanup_passed = False

summary = {
    "schema_version": 1,
    "run_id": run_id,
    "compose_project": project,
    "execution_passed": execution_passed,
    "cleanup_passed": cleanup_passed,
    "pipeline_passed": execution_passed and cleanup_passed,
    "phases": phases,
}
(REPORT / "summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps({"pipeline_passed": summary["pipeline_passed"], "run_id": run_id}))
sys.exit(0 if summary["pipeline_passed"] else 1)
```

---

## 43. Límites de la implementación

El ejecutor es didáctico y requiere herramientas y código confiables.

### 43.1. No garantiza

Aislamiento total de red.

Integridad de binarios.

Limpieza tras terminación forzada.

Seguridad de configuración arbitraria.

Protección frente al administrador del runner.

### 43.2. Regla

No ejecutes código no confiable en runners con credenciales o acceso de producción.

---

## 44. Sesión 2: pipeline positivo

Duración orientativa: 30 minutos.

### 44.1. Comandos

```bash
python3 -m py_compile scripts/pipeline.py
python3 scripts/pipeline.py
```

### 44.2. Resultado esperado

Plan inicial con código 2.

Política aceptada.

Pruebas correctas.

Convergencia con código 0.

Limpieza verificada.

---

## 45. Sesión 3: fallo después de apply

El teardown debe ejecutarse también cuando la infraestructura ya existe.

### 45.1. Comando

```bash
LAB_FAIL_AFTER_APPLY=1 python3 scripts/pipeline.py
```

### 45.2. Resultado esperado

La ejecución termina con código no nulo.

`execution_passed` es falso.

`cleanup_passed` puede ser verdadero si la limpieza funciona.

### 45.3. Regla

El resultado global sigue siendo negativo.

---

## 46. Sesión 4: recurso adicional

La política debe detectar ampliaciones fuera del contrato.

### 46.1. Ejercicio

En una copia de trabajo, añade una tercera cola.

Formatea y ejecuta el pipeline.

### 46.2. Resultado esperado

El plan se genera, pero la política lo rechaza antes de apply.

### 46.3. Recuperación

Retira el recurso adicional.

### 46.4. Regla

No amplíes la lista permitida sin revisar el contrato del laboratorio.

---

## 47. Sesión 5: falta de convergencia

Un plan posterior con cambios debe bloquear el pipeline.

### 47.1. Ejercicio

En una copia del ejecutor, modifica mediante AWS CLI la visibilidad después de la prueba funcional.

Ejecuta el plan de convergencia.

### 47.2. Resultado esperado

Terraform propone restaurar la configuración y devuelve 2.

### 47.3. Regla

El pipeline no aplica esa reparación silenciosamente; registra la discrepancia y limpia.

---

## 48. Integración con GitHub Actions

El mismo ejecutor puede utilizarse desde un runner aislado.

### 48.1. Configuración previa

Define variables de repositorio:

- `TERRAFORM_VERSION`: versión concreta validada.
- `LOCALSTACK_IMAGE`: referencia concreta validada.

### 48.2. Credenciales

No configures credenciales AWS reales.

### 48.3. Regla

Los siguientes tags de acciones son didácticos; en entornos endurecidos fija SHA completos revisados.

---

## 49. Workflow de ejemplo

Crea `.github/workflows/terraform-pipeline.yml`.

### 49.1. Configuración

```yaml
name: Terraform validation plan tests

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  localstack:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    env:
      LOCALSTACK_IMAGE: ${{ vars.LOCALSTACK_IMAGE }}
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ vars.TERRAFORM_VERSION }}
          terraform_wrapper: false
      - name: Verify tools
        run: |
          docker compose version
          aws --version
          python3 --version
      - name: Execute pipeline
        run: python3 scripts/pipeline.py
      - name: Upload limited summaries
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pipeline-summary
          path: resultados/*/summary.json
          retention-days: 7
          if-no-files-found: warn
```

---

## 50. Evidencias y seguridad

La publicación debe seleccionar archivos explícitamente.

### 50.1. Publica

Versión de esquema.

Identificador de ejecución.

Resultado de fases.

Resultado independiente de limpieza.

### 50.2. No publiques

Planes, estados, JSON completo del plan ni logs privados.

### 50.3. Regla

El enmascaramiento de CI no sustituye una política de artifacts.

---

## 51. Limpieza y recuperación

`finally` cubre fallos normales, no todos los incidentes.

### 51.1. Casos especiales

Pérdida del runner.

Cancelación abrupta.

Caída de Docker.

Timeout que deja una operación parcialmente ejecutada.

### 51.2. Recuperación

Conserva estado, identificador y diagnóstico para investigar.

### 51.3. Regla

No borres el estado ni ejecutes limpiezas globales para ocultar recursos pendientes.

---

## 52. Diferencias respecto a AWS real

El laboratorio comprueba configuración y operaciones emuladas.

### 52.1. Comprobaciones adicionales

IAM efectivo y KMS.

Propagación y cuotas.

Auditoría, costes y resiliencia.

Red y disponibilidad.

### 52.2. Alcance

La prueba funcional no demuestra redrive ni procesamiento exactamente una vez.

### 52.3. Regla

La promoción requiere controles independientes del pipeline local.

---

## 53. Ejercicios y evaluación

La evaluación debe demostrar detección, interpretación y limpieza.

### 53.1. Actividades

1. Ejecuta el recorrido positivo.
2. Demuestra rechazo de un recurso adicional.
3. Añade un caso de reemplazo al evaluador.
4. Introduce un fallo después de apply.
5. Demuestra falta de convergencia.
6. Comprueba ausencia de colas.
7. Publica únicamente resúmenes.
8. Explica los límites respecto a AWS real.

### 53.2. Entrega

Incluye código, versiones y resultados revisados; excluye material operativo privado.

---

## 54. Resumen de la lección

Un pipeline fiable separa consistencia, acciones propuestas, funcionamiento y limpieza.

### 54.1. Ideas esenciales

El plan inicial debe tener cambios esperados.

La política debe rechazar acciones fuera del contrato.

La aplicación utiliza el mismo plan evaluado.

Las consultas independientes comprueban atributos observables.

El plan posterior verifica convergencia.

La limpieza tiene un resultado propio.

### 54.2. Procedimiento recomendado

Valida, prueba el contrato, evalúa el plan, aplica, verifica, comprueba convergencia y limpia.

### 54.3. Idea final

**Un pipeline de infraestructura fiable no solo decide cuándo continuar: explica qué aceptó, detecta qué salió mal y verifica qué recursos permanecen al finalizar.**