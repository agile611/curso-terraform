# Proyecto final: automatización CI/CD con Terraform y LocalStack

El proyecto final debe poder validarse, desplegarse, probarse y limpiarse sin depender de una secuencia de instrucciones ejecutadas de memoria.

La automatización convierte ese recorrido en un procedimiento repetible.

También permite detectar cambios incompatibles, conservar evidencias seleccionadas y preparar una entrega asociada a una revisión concreta del código.

En esta lección integrarás Terraform, las funciones Python, las pruebas y LocalStack en un pipeline reutilizable.

La misma lógica se ejecutará desde tu terminal y desde GitHub Actions.

La etapa de entrega generará un paquete del proyecto después de superar las comprobaciones.

No se realizará ningún despliegue en una cuenta AWS real.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas documentos reales ni secretos en solicitudes, logs o artifacts.
>
> La ejecución de Lambda requiere un entorno Docker adecuado.
>
> Superar el pipeline local no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección automatiza el ciclo de vida completo del proyecto.

### 1.1. Competencias

Al finalizar podrás:

- Separar integración continua y entrega continua.
- Preparar dependencias reproducibles.
- Empaquetar funciones de forma controlada.
- Revisar y aplicar un plan guardado.
- Ejecutar pruebas unitarias y HTTP.
- Limpiar después de fallos.
- Publicar únicamente evidencias seleccionadas.
- Asociar una entrega a un commit.

### 1.2. Resultado práctico

Entregarás un pipeline local y un workflow que ejecutan el mismo procedimiento.

---

## 2. Relación con las lecciones anteriores

La automatización utiliza la arquitectura asíncrona y las pruebas ya desarrolladas.

### 2.1. Componentes existentes

El repositorio debe contener:

- API Gateway REST.
- Lambda API.
- Lambda worker.
- Bucket S3.
- Cola de trabajo y DLQ.
- Event source mapping.
- Pruebas unitarias y HTTP.
- Logs estructurados.

### 2.2. Regla

Esta página no sustituye el código funcional del proyecto: automatiza su preparación y comprobación.

---

## 3. Qué significa CI/CD en esta práctica

La integración continua comprueba cambios; la entrega continua prepara una versión utilizable.

### 3.1. Distinción

| **Etapa** | **Responsabilidad** | **Resultado** |
|-----------|--------------------|---------------|
| CI | Validar código e infraestructura | Resultado de comprobaciones |
| Integración | Ejecutar el recorrido LocalStack | Evidencias observadas |
| Entrega | Preparar un paquete revisado | Archivo asociado al commit |
| Despliegue real | Promover a AWS | Fuera de esta práctica |

La entrega no implica despliegue automático en producción.

### 3.2. Regla

Un paquete generado no equivale a una autorización para desplegarlo en AWS real.

---

## 4. Requisitos previos

Necesitas un proyecto funcional y herramientas compatibles.

### 4.1. Comprobación

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
git --version
```

### 4.2. Conocimientos recomendados

Revisa pruebas, observabilidad, aislamiento CI y recuperación del estado.

### 4.3. Restricción

Los comandos de esta página están orientados a Linux y runners Ubuntu.

---

## 5. Versiones y validación docente

La reproducibilidad exige fijar las dependencias realmente utilizadas.

### 5.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS permanecerá en la serie 5.x.

La versión Python del runner debe coincidir con el runtime elegido para las funciones.

### 5.2. LocalStack

Selecciona una etiqueta fija o un digest validado.

### 5.3. Regla

**Una restricción compatible no significa que todas sus versiones hayan sido comprobadas.**

---

## 6. Matriz de compatibilidad

Antes de distribuir el laboratorio, valida el recorrido completo.

### 6.1. Operaciones necesarias

Comprueba:

- Arranque de LocalStack.
- Ejecución Lambda mediante Docker.
- Acceso de las funciones al emulador.
- API Gateway REST.
- Consumo automático de SQS.
- Respuestas parciales de lotes.
- Deshabilitación del consumidor.
- Destrucción y ausencia de recursos.

### 6.2. Evidencia

Registra herramientas, edición, imagen y resultados de las comprobaciones.

---

## 7. Arquitectura del pipeline

El flujo separará comprobaciones sin recursos de pruebas con infraestructura.

### 7.1. Recorrido

```text
Checkout
   ↓
Herramientas y dependencias
   ↓
Formato, validación y pruebas unitarias
   ↓
Empaquetado de funciones
   ↓
LocalStack y disponibilidad
   ↓
Plan guardado y política
   ↓
Apply y pruebas HTTP
   ↓
Convergencia
   ↓
Deshabilitación del consumidor
   ↓
Limpieza de datos y destroy
   ↓
Verificación y resumen
   ↓
Paquete de entrega
```

### 7.2. Regla

La limpieza debe intentarse aunque falle una prueba posterior al despliegue.

---

## 8. Contrato de resultado

El pipeline debe distinguir prueba, limpieza y entrega.

### 8.1. Resultados separados

`execution_passed`: las comprobaciones principales terminaron correctamente.

`cleanup_passed`: se verificó la limpieza correspondiente.

`pipeline_passed`: ambas propiedades son verdaderas.

`delivery_created`: se generó el paquete después del éxito.

### 8.2. Regla

La limpieza correcta no convierte una prueba fallida en una ejecución correcta.

---

## 9. Aislamiento de la ejecución

Esta implementación utiliza un checkout dedicado y un emulador por job.

### 9.1. Separaciones

Identificador único.

Proyecto Compose único.

Estado local de ese checkout.

Directorio privado de resultados.

Nombres de recursos derivados del identificador.

### 9.2. Límite

El puerto y la red Docker son fijos en esta referencia.

### 9.3. Regla

No ejecutes dos instancias simultáneas en el mismo host Docker sin adaptar puertos y redes.

---

## 10. Seguridad del runner

Ejecutar Lambda localmente implica acceso al entorno Docker.

### 10.1. Precauciones

Utiliza runners efímeros o dedicados.

No expongas credenciales productivas.

No ejecutes cambios no confiables en hosts sensibles.

No utilices `pull_request_target` para ejecutar código de la propuesta.

### 10.2. Socket Docker

Montarlo permite operaciones privilegiadas sobre el host Docker.

### 10.3. Regla

Un contenedor no constituye una sandbox suficiente frente a código malicioso con acceso a ese socket.

---

## 11. Estructura del repositorio

Conserva el código anterior y añade las herramientas de automatización.

### 11.1. Organización

```text
terraform-final-async/
├── app/
├── modules/
├── functions/
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/
├── docs/
├── requirements-ci.in
├── requirements-ci.lock
├── compose.yaml
├── build/
├── planes/
├── resultados/
└── .github/workflows/
```

### 11.2. Regla

Los directorios operativos no deben convertirse en entradas implícitas de la siguiente ejecución.

---

## 12. Política de archivos

Los artifacts deben seleccionarse, no publicarse por conveniencia.

### 12.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.venv/
.env
build/
planes/
resultados/
crash.log
```

### 12.2. Conserva

Código, documentación, pruebas, configuración Compose y archivos de bloqueo.

### 12.3. Regla

No publiques el checkout completo después de ejecutar Terraform.

---

## 13. Dependencias Python

Las pruebas y las funciones deben utilizar dependencias identificadas.

### 13.1. Archivo de entrada

Crea `requirements-ci.in` con una versión concreta validada:

```text
boto3==SUSTITUIR_POR_VERSION_VALIDADA
```

### 13.2. Preparación docente

Utiliza una versión validada de `pip-tools` para generar el bloqueo.

```bash
pip-compile --generate-hashes \
  --output-file=requirements-ci.lock \
  requirements-ci.in
```

### 13.3. Regla

El marcador debe sustituirse antes de distribuir el proyecto.

---

## 14. Instalación readonly de dependencias

El pipeline utilizará el bloqueo sin resolver versiones nuevas.

### 14.1. Preparación local

```bash
python3 -m venv .venv
source .venv/bin/activate

python -m pip install \
  --require-hashes \
  -r requirements-ci.lock
```

### 14.2. Alcance

Los hashes verifican los archivos admitidos por el bloqueo.

No sustituyen la revisión de las dependencias.

### 14.3. Regla

No generes un archivo de bloqueo nuevo durante una ejecución ordinaria de CI.

---

## 15. Archivo de bloqueo Terraform

La raíz debe conservar la selección del proveedor AWS.

### 15.1. Preparación docente

```bash
terraform -chdir=app init
terraform -chdir=app validate
git add app/.terraform.lock.hcl
```

### 15.2. Plataformas

Prepara checksums adicionales cuando cambie la plataforma del runner.

### 15.3. Regla

El pipeline utilizará `-lockfile=readonly`, no `init -upgrade`.

### 15.4. Dependencias

Una actualización de proveedor debe revisarse como un cambio explícito.

---

## 16. Control del consumidor

La limpieza necesita detener nuevas invocaciones desde SQS.

### 16.1. Variable de la raíz

Añade a `app/variables.tf`:

```hcl
variable "worker_enabled" {
  description = "Habilita el consumo automático de SQS."
  type        = bool
  default     = true
  nullable    = false
}
```

### 16.2. Conexión

Añade a la llamada de `module "runtime"`:

```hcl
worker_enabled = var.worker_enabled
```

### 16.3. Regla

No añadas un segundo bloque del mismo módulo: modifica el existente.

---

## 17. Variable dentro del módulo runtime

El módulo debe recibir la decisión de habilitación.

### 17.1. Entrada

Añade a `modules/runtime`:

```hcl
variable "worker_enabled" {
  type     = bool
  default  = true
  nullable = false
}
```

### 17.2. Mapping

Sustituye el valor fijo de `enabled`:

```hcl
enabled = var.worker_enabled
```

### 17.3. Regla

Deshabilitar el mapping no cancela las invocaciones ya iniciadas.

---

## 18. Contrato operacional de salida

La automatización necesita referencias calculadas y tiempos acordados.

### 18.1. Salida adicional del módulo runtime

```hcl
output "operations" {
  value = {
    mapping_uuid = aws_lambda_event_source_mapping.work.uuid
    api_name     = aws_lambda_function.function["api"].function_name
    worker_name  = aws_lambda_function.function["worker"].function_name
    api_timeout  = aws_lambda_function.function["api"].timeout
    worker_timeout = aws_lambda_function.function["worker"].timeout
  }
}
```

### 18.2. Salida de la raíz

```hcl
output "operations" {
  value = module.runtime.operations
}
```

### 18.3. Regla

Los tiempos publicados deben corresponder a recursos, no a constantes duplicadas en scripts.

---

## 19. Compose para CI

La configuración debe mantener endpoints locales y una red conocida.

### 19.1. Referencia

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs,lambda,apigateway,iam,logs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
      LAMBDA_DOCKER_NETWORK: course-final-async-net
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
    networks:
      laboratory:
        aliases:
          - localstack

networks:
  laboratory:
    name: course-final-async-net
```

### 19.2. Regla

Esta red fija exige un host aislado por ejecución.

---

## 20. Empaquetado reproducible

El código fuente no debe depender de ZIP generados manualmente.

### 20.1. Diseño

El pipeline creará los ZIP antes del plan.

Usará un orden fijo y marcas temporales constantes.

Incluirá `telemetry.py` en ambas funciones.

### 20.2. SDK

Esta referencia utiliza el SDK incluido en el runtime Lambda validado.

### 20.3. Regla

El bloqueo Python del runner no fija automáticamente el SDK del runtime Lambda.

---

## 21. Script de empaquetado

Crea `scripts/package_functions.py`.

### 21.1. Implementación

```python
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
BUILD.mkdir(parents=True, exist_ok=True)

for function in ("api", "worker"):
    destination = BUILD / f"{function}.zip"
    with ZipFile(destination, "w") as archive:
        for module in sorted((function, "telemetry")):
            source = ROOT / "functions" / f"{module}.py"
            info = ZipInfo(f"{module}.py", date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())
```

### 21.2. Regla

La reproducibilidad del ZIP depende también de la herramienta y biblioteca utilizadas.

---

## 22. Política del plan inicial

El laboratorio comenzará con un estado sin recursos.

### 22.1. Acciones aceptadas

Solo aceptaremos creación de los recursos del proyecto.

Rechazaremos eliminación, actualización y reemplazo.

También rechazaremos recursos fuera de los módulos permitidos.

### 22.2. Alcance

Esta política es específica de un despliegue efímero.

### 22.3. Regla

No la utilices como política universal para proyectos con infraestructura persistente.

---

## 23. Evaluador del plan

Crea `scripts/plan_policy.py`.

### 23.1. Implementación

```python
ALLOWED_TYPES = {
    "aws_s3_bucket", "aws_s3_bucket_public_access_block",
    "aws_sqs_queue", "aws_iam_role", "aws_iam_role_policy",
    "aws_cloudwatch_log_group", "aws_lambda_function",
    "aws_lambda_event_source_mapping", "aws_lambda_permission",
    "aws_api_gateway_rest_api", "aws_api_gateway_resource",
    "aws_api_gateway_method", "aws_api_gateway_integration",
    "aws_api_gateway_deployment", "aws_api_gateway_stage",
}

def evaluate(document):
    changes = document.get("resource_changes")
    if not isinstance(changes, list) or not changes:
        raise ValueError("El plan no contiene cambios evaluables.")
    observed = set()
    for item in changes:
        address = item.get("address", "")
        if item.get("mode") != "managed":
            raise ValueError("Modo de recurso no permitido.")
        if item.get("type") not in ALLOWED_TYPES:
            raise ValueError("Tipo de recurso no permitido.")
        if not address.startswith((
            "module.storage.", "module.queue.",
            "module.runtime.", "module.api."
        )):
            raise ValueError("Dirección fuera del proyecto.")
        if address in observed:
            raise ValueError("Dirección duplicada.")
        if item.get("change", {}).get("actions") != ["create"]:
            raise ValueError("El primer plan solo admite creación.")
        observed.add(address)
    return len(observed)
```

### 23.2. Límite

Esta política no demuestra que estén presentes todos los recursos requeridos.

---

## 24. Contratos que complementan la política

Las pruebas deben verificar propiedades que la lista de acciones no comprueba.

### 24.1. Propiedades

Dos funciones con handlers correctos.

Una cola principal y una DLQ.

Mapping con respuestas parciales.

API con rutas de creación y consulta.

Retención de logs configurada.

### 24.2. Recomendación

Publica outputs explícitos para los valores que quieras comprobar con `terraform test`.

### 24.3. Regla

No dependas de referencias internas no admitidas por tu versión de Terraform.

---

## 25. Preparación del ejecutor

El script centralizará contexto, comandos, fases y limpieza.

### 25.1. Diseño

Todos los bloques siguientes pertenecen a `scripts/pipeline.py`.

Cópialos en el orden indicado.

Los logs permanecerán en un directorio privado.

El resumen solo incluirá información seleccionada.

### 25.2. Restricción

El script exige una ejecución exclusiva sobre el directorio y el host Docker.

### 25.3. Regla

No ejecutes create y cleanup externos mientras el pipeline está activo.

---

## 26. Ejecutor: imports y rutas

Crea `scripts/pipeline.py`.

### 26.1. Código inicial

```python
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit

from plan_policy import evaluate

ROOT = Path(__file__).resolve().parents[1]
run_id = uuid.uuid4().hex[:12]
project = f"course-final-{run_id}"
PRIVATE = ROOT / "resultados" / "private" / run_id
PUBLIC = ROOT / "resultados" / "public"
for path in (PRIVATE, PUBLIC):
    path.mkdir(parents=True, exist_ok=True)
    path.chmod(0o700)

phases = []
sequence = 0
```

---

## 27. Ejecutor: entorno ficticio

Añade la construcción del contexto de procesos hijos.

### 27.1. Implementación

```python
env = os.environ.copy()
for key in list(env):
    if key.startswith(("AWS_", "TF_VAR_", "TF_CLI_ARGS")):
        env.pop(key, None)
for key in ("TF_WORKSPACE", "TF_DATA_DIR", "TF_LOG", "TF_LOG_PATH"):
    env.pop(key, None)

for name in ("config", "credentials"):
    path = PRIVATE / name
    path.write_text("", encoding="utf-8")
    path.chmod(0o600)

env.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_CONFIG_FILE": str(PRIVATE / "config"),
    "AWS_SHARED_CREDENTIALS_FILE": str(PRIVATE / "credentials"),
    "AWS_PAGER": "",
    "AWS_CLI_AUTO_PROMPT": "off",
    "TF_IN_AUTOMATION": "true",
    "TF_VAR_run_id": run_id,
    "TF_VAR_worker_enabled": "true",
    "NO_PROXY": "127.0.0.1,localhost,localstack",
})
```

---

## 28. Ejecutor: comandos y registros

Añade una función con códigos aceptados explícitos.

### 28.1. Implementación

```python
def command(name, arguments, accepted=(0,), timeout=300, record=True):
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
        phases.append({"phase": name, "passed": passed,
                       "exit_code": result.returncode})
    if not passed:
        raise RuntimeError(f"Falló la fase {name}.")
    return result.stdout
```

### 28.2. Regla

Los detalles del error se investigan en logs privados, no se copian al resumen.

---

## 29. Ejecutor: wrappers

Añade comandos comunes con destinos locales explícitos.

### 29.1. Implementación

```python
terraform = ["terraform", f"-chdir={ROOT / 'app'}"]
compose = ["docker", "compose", "-p", project]

def tf(name, *arguments, accepted=(0,)):
    return command(name, [*terraform, *arguments], accepted=accepted)

def aws(service, operation, *arguments):
    text = command(
        f"aws-{operation}",
        [
            "aws", "--endpoint-url=http://127.0.0.1:4566",
            "--region=us-east-1", "--output=json",
            service, operation, *arguments,
        ],
        timeout=30, record=False,
    )
    return json.loads(text) if text.strip() else {}

def wait_ready():
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        try:
            aws("s3api", "list-buckets")
            aws("sqs", "list-queues")
            aws("lambda", "list-functions")
            return
        except RuntimeError:
            time.sleep(2)
    raise RuntimeError("LocalStack no quedó disponible.")
```

---

## 30. Ejecutor: manifiesto privado

El registro debe existir antes de crear infraestructura.

### 30.1. Implementación

```python
manifest = {
    "schema_version": 1,
    "run_id": run_id,
    "compose_project": project,
    "created_at": time.time(),
    "status": "prepared",
}

def save_manifest(status):
    manifest["status"] = status
    temporary = PRIVATE / "manifest.tmp"
    temporary.write_text(json.dumps(manifest, indent=2))
    temporary.replace(PRIVATE / "manifest.json")

save_manifest("prepared")
```

### 30.2. Regla

El manifiesto facilita recuperación, pero no es una autorización para borrar recursos arbitrarios.

---

## 31. Ejecutor: protección del estado

El pipeline no debe adoptar recursos de una práctica anterior.

### 31.1. Implementación

```python
def require_clean_inputs():
    app = ROOT / "app"
    if (app / "terraform.tfvars").exists():
        raise RuntimeError(
            "Utiliza un checkout CI sin terraform.tfvars local."
        )
    if list(app.glob("*.auto.tfvars")) or list(app.glob("*.auto.tfvars.json")):
        raise RuntimeError("Existen entradas automáticas no autorizadas.")
    state = app / "terraform.tfstate"
    if state.exists():
        document = json.loads(state.read_text())
        if document.get("resources"):
            raise RuntimeError("El checkout contiene recursos previos.")
```

### 31.2. Preparación local

Utiliza un checkout dedicado sin las variables de las sesiones manuales anteriores.

---

## 32. Ejecutor: fases iniciales

Añade el comienzo del recorrido principal.

### 32.1. Implementación

```python
initialized = False
compose_attempted = False
apply_attempted = False
execution_passed = False
cleanup_passed = True
contract = None
operations = None

try:
    require_clean_inputs()
    command("fmt", ["terraform", "fmt", "-check", "-diff", "-recursive",
                    "app", "modules"])
    command("unit-tests", [
        sys.executable, "-m", "unittest", "discover",
        "-s", "tests/unit", "-p", "test_*.py", "-v"
    ])
    command("package", [sys.executable, "scripts/package_functions.py"])
    tf("init", "init", "-input=false", "-lockfile=readonly")
    initialized = True
    if tf("state-list", "state", "list").strip():
        raise RuntimeError("El backend contiene recursos previos.")
    tf("validate", "validate", "-no-color")
```

---

## 33. Ejecutor: despliegue y política

Continúa dentro del mismo bloque `try`.

### 33.1. Implementación

```python
    compose_attempted = True
    save_manifest("starting")
    command("compose-up", [*compose, "up", "-d"])
    wait_ready()
    save_manifest("planning")

    plan_path = PRIVATE / "create.tfplan"
    tf("plan", "plan", "-input=false", "-detailed-exitcode",
       f"-out={plan_path}", accepted=(2,))
    document = json.loads(tf("plan-json", "show", "-json", str(plan_path)))
    count = evaluate(document)
    phases.append({"phase": "plan-policy", "passed": True,
                   "resource_count": count})

    apply_attempted = True
    save_manifest("applying")
    tf("apply", "apply", "-input=false", str(plan_path))
    contract = json.loads(tf("project-output", "output", "-json", "project"))
    operations = json.loads(tf("operations-output", "output", "-json", "operations"))
    (PRIVATE / "project.json").write_text(json.dumps(contract))
    (PRIVATE / "operations.json").write_text(json.dumps(operations))
```

---

## 34. Ejecutor: integración y convergencia

Completa las fases principales antes del teardown.

### 34.1. Implementación

```python
    api = contract["api"]
    env["API_BASE"] = (
        f"http://127.0.0.1:4566/_aws/execute-api/"
        f"{api['api_id']}/{api['stage']}"
    )
    save_manifest("testing")
    command("http-tests", [
        sys.executable, "-m", "unittest", "discover",
        "-s", "tests/integration", "-p", "test_*.py", "-v"
    ])

    if os.environ.get("LAB_FAIL_AFTER_TESTS") == "1":
        raise RuntimeError("Fallo didáctico después de las pruebas.")

    tf("convergence", "plan", "-input=false", "-detailed-exitcode",
       "-no-color", accepted=(0,))
    execution_passed = True

except Exception:
    phases.append({"phase": "execution", "passed": False})

finally:
```

### 34.2. Regla

Los bloques siguientes pertenecen a la limpieza del `finally`.

---

## 35. Ejecutor: detener el consumidor

La limpieza debe impedir nuevas escrituras desde SQS.

### 35.1. Implementación

```python
    if initialized and apply_attempted:
        try:
            save_manifest("cleaning")
            if operations is not None:
                tf("disable-worker", "apply", "-auto-approve",
                   "-input=false", "-var=worker_enabled=false", "-no-color")
                deadline = time.monotonic() + 120
                while time.monotonic() < deadline:
                    mapping = aws(
                        "lambda", "get-event-source-mapping",
                        "--uuid", operations["mapping_uuid"]
                    )
                    if mapping.get("State") == "Disabled":
                        break
                    time.sleep(2)
                else:
                    raise RuntimeError("El consumidor no quedó deshabilitado.")
                time.sleep(operations["worker_timeout"] + 5)
```

### 35.2. Alcance

El margen presupone que no hay clientes externos enviando solicitudes durante el teardown.

---

## 36. Ejecutor: limpiar datos conocidos

Continúa dentro del bloque de limpieza.

### 36.1. Implementación

```python
            if contract is not None:
                bucket = contract["storage"]["name"]
                expected = f"curso-async-{run_id}-data"
                if bucket != expected:
                    raise RuntimeError("Bucket incompatible con la ejecución.")

                command("data-cleanup", [
                    "aws", "--endpoint-url=http://127.0.0.1:4566",
                    "--region=us-east-1", "s3", "rm",
                    f"s3://{bucket}/", "--recursive"
                ])

                remaining = aws(
                    "s3api", "list-objects-v2", "--bucket", bucket,
                    "--max-keys", "1"
                )
                if remaining.get("Contents"):
                    raise RuntimeError("El bucket todavía contiene objetos.")

            tf("destroy", "destroy", "-auto-approve", "-input=false",
               "-var=worker_enabled=false", "-no-color")
            if tf("empty-state", "state", "list").strip():
                raise RuntimeError("El estado todavía administra recursos.")
```

### 36.2. Regla

Esta eliminación completa solo es válida para el bucket dedicado de la ejecución.

---

## 37. Ejecutor: inventario y fallo de limpieza

Completa el bloque `try` de limpieza.

### 37.1. Implementación

```python
            prefix = f"curso-async-{run_id}"
            buckets = aws("s3api", "list-buckets").get("Buckets", [])
            queues = aws(
                "sqs", "list-queues", "--queue-name-prefix", prefix
            ).get("QueueUrls", [])
            functions = aws("lambda", "list-functions").get("Functions", [])
            apis = aws("apigateway", "get-rest-apis").get("items", [])
            if (
                any(item["Name"].startswith(prefix) for item in buckets)
                or queues
                or any(item["FunctionName"].startswith(prefix)
                       for item in functions)
                or any(item["name"].startswith(prefix) for item in apis)
            ):
                raise RuntimeError("Persisten recursos principales.")
            phases.append({"phase": "absence", "passed": True})
        except Exception:
            cleanup_passed = False
            phases.append({"phase": "cleanup", "passed": False})
            save_manifest("cleanup_failed")
```

### 37.2. Límite

Esta comprobación no inventaría todavía roles IAM y grupos de logs; añádelos para una auditoría completa.

---

## 38. Ejecutor: retirar Compose y publicar resumen

Completa `pipeline.py`.

### 38.1. Implementación

```python
    if compose_attempted and cleanup_passed:
        try:
            command("compose-down", [*compose, "down", "--remove-orphans"])
        except Exception:
            cleanup_passed = False

summary = {
    "schema_version": 1,
    "run_id": run_id,
    "execution_passed": execution_passed,
    "cleanup_passed": cleanup_passed,
    "pipeline_passed": execution_passed and cleanup_passed,
    "phases": phases,
}
(PUBLIC / "summary.json").write_text(json.dumps(summary, indent=2))
save_manifest("cleaned" if cleanup_passed else "cleanup_failed")
print(json.dumps({
    "pipeline_passed": summary["pipeline_passed"],
    "cleanup_passed": cleanup_passed,
    "run_id": run_id,
}))
sys.exit(0 if summary["pipeline_passed"] else 1)
```

### 38.2. Regla

Si la limpieza falla, el emulador se conserva cuando el runner sigue disponible.

---

## 39. Límites del ejecutor

La implementación es una referencia didáctica, no una sandbox ni un reconciliador universal.

### 39.1. Casos relevantes

Una cancelación abrupta puede impedir `finally`.

Un timeout puede dejar operaciones parcialmente completadas.

Un apply parcial puede no publicar outputs.

Un fallo de limpieza puede requerir inspección manual del estado.

### 39.2. Inventarios

Las consultas amplias deben incorporar paginación y cobertura completa si adaptas el script a entornos mayores.

### 39.3. Regla

No prometas teardown infalible: diseña detección y recuperación de residuos.

---

## 40. Sesión 1: ejecutar localmente

Duración orientativa: 45 minutos.

### 40.1. Preparación

Utiliza un checkout dedicado.

Configura `LOCALSTACK_IMAGE`.

Instala dependencias desde `requirements-ci.lock`.

Comprueba que no existen variables locales de sesiones anteriores.

### 40.2. Comandos

```bash
python -m py_compile scripts/pipeline.py scripts/plan_policy.py
python scripts/pipeline.py
cat resultados/public/summary.json
```

### 40.3. Resultado esperado

Pruebas correctas, convergencia y limpieza observada.

---

## 41. Sesión 2: fallo controlado

El pipeline debe conservar el fallo original y ejecutar el teardown.

### 41.1. Comando

```bash
LAB_FAIL_AFTER_TESTS=1 python scripts/pipeline.py
```

### 41.2. Resultado esperado

`execution_passed` es falso.

`cleanup_passed` puede ser verdadero.

`pipeline_passed` es falso.

### 41.3. Regla

No evalúes el resultado únicamente por la existencia de un resumen.

---

## 42. Preparación de GitHub Actions

El workflow debe ejecutar la misma lógica que la terminal.

### 42.1. Variables de repositorio

| **Variable** | **Contenido** | **Tipo** |
|--------------|---------------|----------|
| `TERRAFORM_VERSION` | Versión concreta validada | Variable |
| `PYTHON_VERSION` | Versión compatible con runtime | Variable |
| `LOCALSTACK_IMAGE` | Imagen fija validada | Variable |

No necesitas credenciales AWS reales.

### 42.2. Acciones

Los tags del ejemplo son didácticos; para endurecimiento utiliza SHA completos revisados.

### 42.3. Regla

Valida también las herramientas disponibles en la imagen del runner.

---

## 43. Workflow: eventos y permisos

Crea `.github/workflows/final-project.yml`.

### 43.1. Inicio

```yaml
name: Final project LocalStack

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  integration:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      LOCALSTACK_IMAGE: ${{ vars.LOCALSTACK_IMAGE }}
      TF_IN_AUTOMATION: "true"
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false
```

### 43.2. Regla

Los pull requests no deben recibir secretos de producción.

---

## 44. Workflow: herramientas y dependencias

Continúa dentro de `steps`.

### 44.1. Preparación

```yaml
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ vars.PYTHON_VERSION }}

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
          python --version

      - name: Install locked dependencies
        run: python -m pip install --require-hashes -r requirements-ci.lock

      - name: Execute project pipeline
        run: python scripts/pipeline.py
```

---

## 45. Workflow: evidencias seleccionadas

Publica únicamente el resumen público.

### 45.1. Paso

```yaml
      - name: Upload selected summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: summary-${{ github.run_id }}-${{ github.run_attempt }}
          path: resultados/public/summary.json
          if-no-files-found: warn
          retention-days: 7
```

### 45.2. Límite

`always()` no garantiza ejecución si desaparece el runner.

### 45.3. Regla

No publiques `resultados/private`, estados ni planes para facilitar una depuración rutinaria.

---

## 46. Paquete de entrega

La entrega debe contener código seleccionado, no residuos de ejecución.

### 46.1. Contenido

Configuración Terraform.

Funciones Python.

Tests.

Scripts de automatización.

Documentación.

Bloqueos de dependencias.

Compose.

### 46.2. Exclusiones

Estado, planes, resultados, ZIP generados, archivos AWS y secretos.

### 46.3. Regla

El paquete debe indicar el commit probado.

---

## 47. Generación del paquete

Crea `scripts/create_delivery.py`.

### 47.1. Implementación

```python
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
summary = json.loads(
    (ROOT / "resultados/public/summary.json").read_text()
)
if not summary.get("pipeline_passed"):
    raise SystemExit("No se permite entregar un pipeline fallido.")

commit = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
).strip()
destination = ROOT / "resultados/public/project-source.tar.gz"
allowed = ("app/", "modules/", "functions/", "tests/", "scripts/", "docs/")
files = subprocess.check_output(
    ["git", "ls-files", "-z"], cwd=ROOT
).decode().split("\0")

with tarfile.open(destination, "w:gz") as archive:
    for name in sorted(filter(None, files)):
        if name.startswith(allowed) or name in {
            "compose.yaml", "requirements-ci.in", "requirements-ci.lock"
        }:
            archive.add(ROOT / name, arcname=name, recursive=False)

digest = hashlib.sha256(destination.read_bytes()).hexdigest()
(ROOT / "resultados/public/delivery.json").write_text(json.dumps({
    "schema_version": 1, "commit": commit,
    "sha256": digest, "pipeline_passed": True,
}, indent=2))
```

---

## 48. Publicación de entrega desde main

La entrega solo debe generarse después del éxito del job.

### 48.1. Pasos finales del workflow

```yaml
      - name: Create delivery
        if: success() && github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: python scripts/create_delivery.py

      - name: Upload delivery
        if: success() && github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: project-${{ github.sha }}
          path: |
            resultados/public/project-source.tar.gz
            resultados/public/delivery.json
          retention-days: 14
          if-no-files-found: error
```

### 48.2. Regla

El SHA del paquete comprueba integridad; no sustituye firma, procedencia ni revisión del contenido.

---

## 49. Sesiones de evaluación y recuperación

El alumno debe demostrar resultados positivos y negativos.

### 49.1. Actividades

Introduce un error de formato.

Modifica una expectativa unitaria.

Provoca un fallo HTTP.

Ejecuta el fallo controlado después de las pruebas.

Investiga un bucket que no puede limpiarse.

Comprueba que una ejecución fallida no genera entrega.

### 49.2. Recuperación

Utiliza manifiesto, estado y logs privados para identificar recursos pendientes.

### 49.3. Regla

No borres el estado ni utilices `docker system prune` como recuperación del proyecto.

---

## 50. Diferencias, ejercicios y resumen

El pipeline local comprueba un recorrido acotado y prepara una entrega reproducible.

### 50.1. Diferencias respecto a AWS real

Quedan pendientes IAM efectivo, cuotas, propagación, rendimiento y resiliencia.

La entrega a producción requiere credenciales temporales, aprobaciones, políticas y pruebas independientes.

LocalStack no sustituye esos controles.

### 50.2. Ejercicios finales

1. Añade pruebas al evaluador de planes.
2. Completa inventarios IAM y logs.
3. Implementa puertos y redes dinámicos.
4. Empaqueta dependencias Lambda fijadas.
5. Añade una prueba automatizada de DLQ.
6. Diseña recuperación de un apply parcial.
7. Verifica exclusiones del paquete de entrega.
8. Documenta un procedimiento de promoción sin ejecutarlo en AWS.

### 50.3. Idea final

**Un pipeline fiable demuestra qué comprobó, conserva el fallo original, verifica su limpieza y entrega únicamente el código asociado a una revisión que superó sus controles.**