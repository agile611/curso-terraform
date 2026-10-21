# Aislamiento y limpieza de entornos CI con Terraform y LocalStack

Un entorno de integración continua debe poder crear recursos, ejecutar pruebas y desaparecer sin afectar a otras ejecuciones.

Utilizar nombres diferentes ayuda, pero no basta.

También necesitas separar estados Terraform, directorios de trabajo, contenedores, puertos, datos de prueba y evidencias.

La limpieza debe conocer qué recursos pertenecen a cada ejecución y distinguir una eliminación correcta de un error de conectividad.

En esta lección construirás entornos LocalStack independientes con puertos dinámicos.

Cada ejecución tendrá su propio proyecto Docker Compose, configuración Terraform, estado y registro de recuperación.

Las sesiones incluyen aislamiento entre ejecuciones, fallos controlados, limpieza repetible y tratamiento de recursos pendientes.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No utilices limpiezas globales del host Docker.
>
> Una limpieza fallida debe conservar la información necesaria para recuperar el entorno.

---

## 1. Objetivos de aprendizaje

Esta lección convierte el aislamiento y el teardown en propiedades verificables.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Separar recursos y estados por ejecución.
- Utilizar puertos dinámicos de Docker.
- Registrar la propiedad de cada entorno.
- Limpiar objetos antes de destruir buckets.
- Verificar ausencia de recursos.
- Recuperar un entorno después de un fallo.
- Diseñar procedimientos para runners persistentes.

### 1.2. Resultado práctico

Crearás dos entornos independientes y eliminarás uno sin afectar al otro.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Terraform, Docker y pipelines.

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

Revisa las lecciones sobre estado, pruebas funcionales y pipelines LocalStack.

---

## 3. Versiones y compatibilidad

El docente debe validar las herramientas antes de distribuir la práctica.

### 3.1. Referencias

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

LocalStack debe utilizar una imagen fija validada.

### 3.2. Comprobaciones obligatorias

Valida puertos dinámicos, S3, SQS, actualización del manifiesto y limpieza.

### 3.3. Regla

**La documentación debe identificar las versiones realmente comprobadas.**

---

## 4. Qué significa aislamiento

El aislamiento evita que una ejecución lea, modifique o elimine recursos de otra.

### 4.1. Dimensiones

Consideraremos:

- Identidad de recursos.
- Estado Terraform.
- Directorio de trabajo.
- Contenedores y redes.
- Endpoint del emulador.
- Datos y evidencias.

### 4.2. Regla

Un identificador único no sustituye la separación de estado y endpoint.

---

## 5. Aislamiento lógico y físico

No todos los mecanismos ofrecen las mismas garantías.

### 5.1. Comparación

| **Mecanismo** | **Qué separa** | **Límite** |
|---------------|---------------|------------|
| Prefijos únicos | Nombres | Mismo servicio subyacente |
| Estados separados | Gestión Terraform | Puede apuntar al mismo recurso |
| LocalStack independiente | Recursos emulados | Host Docker compartido |
| Runner efímero | Entorno de ejecución | Depende de la plataforma |

La práctica combina varios mecanismos.

### 5.2. Regla

Los contenedores de este laboratorio no son una frontera frente al administrador del host.

---

## 6. Riesgos habituales en CI

La concurrencia y los fallos pueden dejar residuos difíciles de atribuir.

### 6.1. Ejemplos

Dos jobs utilizan el mismo bucket.

Un destroy elimina recursos de otra prueba.

Un puerto fijo conecta al emulador incorrecto.

Un estado se pierde antes de limpiar.

Un runner conserva archivos de un job anterior.

### 6.2. Regla

La propiedad de los recursos debe conocerse antes de crearlos.

---

## 7. Arquitectura del laboratorio

Cada ejecución dispondrá de un entorno completo independiente.

### 7.1. Organización

```text
Ejecución A
├── Proyecto Compose A
├── Puerto dinámico A
├── LocalStack A
└── Directorio Terraform A

Ejecución B
├── Proyecto Compose B
├── Puerto dinámico B
├── LocalStack B
└── Directorio Terraform B
```

### 7.2. Propiedad comprobada

Eliminar A no debe impedir consultar B.

---

## 8. Contrato de propiedad

Un manifiesto relacionará la ejecución con sus recursos.

### 8.1. Campos principales

| **Campo** | **Propósito** | **Ejemplo conceptual** |
|-----------|---------------|------------------------|
| `run_id` | Identidad | Cadena hexadecimal |
| `project` | Proyecto Compose | `course-isolated-...` |
| `endpoint` | Destino local | Loopback con puerto |
| `workspace` | Estado y configuración | Directorio de ejecución |
| `status` | Situación operacional | `ready`, `cleanup_failed` |

El manifiesto se guarda antes del aprovisionamiento.

### 8.2. Regla

El manifiesto es información operacional, no una autorización para ejecutar código arbitrario.

---

## 9. Ciclo de vida del entorno

La limpieza depende de conocer la fase alcanzada.

### 9.1. Estados del laboratorio

Utilizaremos:

- `created`.
- `starting`.
- `provisioning`.
- `ready`.
- `test_failed`.
- `cleaning`.
- `cleanup_failed`.
- `cleaned`.

### 9.2. Regla

Un estado `ready` no significa que el entorno ya esté limpio.

---

## 10. Política ante fallos

El laboratorio prioriza recuperación y evidencias.

### 10.1. Comportamiento

Una prueba fallida deja el entorno disponible para investigación.

La limpieza se ejecuta mediante un comando explícito.

Si destroy falla, el emulador se conserva.

### 10.2. Motivo

Eliminar el contenedor antes de recuperar puede hacer inaccesibles los recursos emulados.

### 10.3. Regla

En CI, intenta limpiar siempre, pero no ocultes el fallo original.

---

## 11. Preparación del proyecto

Trabaja en una carpeta independiente.

### 11.1. Directorios

```bash
mkdir -p terraform-ci-isolation/template
mkdir -p terraform-ci-isolation/scripts
mkdir -p terraform-ci-isolation/runs
cd terraform-ci-isolation
```

### 11.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 11.3. Aislamiento

El directorio `template` no se utiliza para aplicar infraestructura.

---

## 12. Archivos que no debes publicar

Los directorios de ejecución contienen estado y datos operativos.

### 12.1. `.gitignore`

```gitignore
runs/
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
crash.log
```

### 12.2. Qué conservar

Versiona scripts, plantilla y archivo de bloqueo del proveedor.

### 12.3. Regla

No publiques `runs/` como artifact completo.

---

## 13. Permisos locales

Reduce la exposición accidental de estados y registros.

### 13.1. Preparación

```bash
umask 077
chmod 700 runs
```

### 13.2. Alcance

Estas instrucciones utilizan permisos POSIX.

En otros sistemas, configura ACL equivalentes.

### 13.3. Regla

Los permisos no protegen frente al administrador del host.

---

## 14. Imagen LocalStack

Selecciona una imagen reproducible.

### 14.1. Configuración

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
```

### 14.2. Distribución

El docente debe sustituir el marcador por una referencia concreta.

### 14.3. Recomendación

Prefiere un digest o una etiqueta fija validada.

### 14.4. Regla

No cambies la imagen de un entorno durante su recuperación.

---

## 15. Docker Compose con puerto dinámico

Docker asignará un puerto disponible a cada proyecto.

### 15.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1::4566"
    environment:
      SERVICES: s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
    labels:
      course.lab: "terraform-ci-isolation"
```

### 15.2. Compatibilidad

Valida esta sintaxis con la versión de Compose seleccionada.

### 15.3. Regla

No añadas `container_name`: impediría reutilizar la configuración con proyectos independientes.

---

## 16. Redes y volúmenes

El proyecto Compose separa contenedores y su red predeterminada.

### 16.1. Decisiones del laboratorio

No utilizamos volúmenes persistentes.

No montamos el socket Docker dentro de LocalStack.

No reutilizamos una red externa compartida.

### 16.2. Consecuencia

Eliminar el contenedor elimina su almacenamiento efímero.

### 16.3. Regla

Verifica recursos antes de retirar el emulador.

---

## 17. Requisitos Terraform

Crea `template/versions.tf`.

### 17.1. Configuración

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

### 17.2. Estado

Cada copia tendrá su propio archivo de estado.

---

## 18. Variables de la plantilla

Crea `template/variables.tf`.

### 18.1. Contrato de entrada

```hcl
variable "run_id" {
  type = string

  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}

variable "endpoint" {
  type = string

  validation {
    condition     = can(regex("^http://127\\.0\\.0\\.1:[0-9]+$", var.endpoint))
    error_message = "El endpoint debe utilizar loopback."
  }
}
```

### 18.2. Regla

La validación HCL complementa las comprobaciones del ejecutor.

---

## 19. Proveedor local

Crea `template/providers.tf`.

### 19.1. Configuración

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
    s3  = var.endpoint
    sqs = var.endpoint
  }
}
```

### 19.2. Regla

Nunca utilices AWS real como fallback cuando falle el endpoint local.

---

## 20. Recursos del laboratorio

Crea `template/main.tf`.

### 20.1. Infraestructura

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "curso-isolated-${var.run_id}"
  force_destroy = false

  tags = {
    Laboratory = "LocalStack"
    RunId      = var.run_id
  }
}

resource "aws_sqs_queue" "work" {
  name = "curso-isolated-${var.run_id}"

  tags = {
    Laboratory = "LocalStack"
    RunId      = var.run_id
  }
}
```

### 20.2. Alcance

Este fixture mínimo no representa una configuración completa de producción.

---

## 21. Contrato de salida

Crea `template/outputs.tf`.

### 21.1. Referencias

```hcl
output "contract" {
  value = {
    version     = 1
    bucket_name = aws_s3_bucket.data.id
    queue_url   = aws_sqs_queue.work.id
  }
}
```

### 21.2. Regla

Los datos creados por las pruebas deben registrarse independientemente del estado Terraform.

### 21.3. Motivo

Terraform no administrará el objeto escrito mediante AWS CLI.

---

## 22. Archivo de bloqueo

Prepara dependencias antes de copiar la plantilla.

### 22.1. Preparación docente

```bash
terraform fmt -recursive template
terraform -chdir=template init -backend=false
terraform -chdir=template validate
git add template/.terraform.lock.hcl
```

### 22.2. Plataformas

Prepara checksums adicionales cuando los runners utilicen otra plataforma.

### 22.3. Regla

Las ejecuciones ordinarias utilizarán `-lockfile=readonly`.

---

## 23. Diseño de los scripts

Utilizaremos tres comandos con responsabilidades separadas.

### 23.1. Organización

| **Script** | **Responsabilidad** | **Efecto** |
|------------|--------------------|------------|
| `create.py` | Preparar y probar | Crea entorno |
| `cleanup.py` | Retirar datos y recursos | Elimina entorno |
| `check_isolation.py` | Comparar dos ejecuciones | Solo consulta |

Un helper compartirá validaciones y ejecución.

### 23.2. Regla

Los bloques siguientes deben copiarse completos en los archivos indicados.

---

## 24. Helper: rutas y manifiesto

Crea `scripts/common.py`.

### 24.1. Código inicial

```python
import json
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

def directory(run_id):
    if not re.fullmatch(r"[a-f0-9]{12}", run_id):
        raise ValueError("Identificador inválido.")
    return RUNS / run_id

def save(record):
    path = directory(record["run_id"]) / "manifest.json"
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(record, indent=2), encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(path)
```

---

## 25. Helper: carga validada

Completa la lectura del manifiesto.

### 25.1. Implementación

```python
def load(run_id):
    record = json.loads(
        (directory(run_id) / "manifest.json").read_text()
    )
    expected_project = f"course-isolated-{run_id}"

    if (
        record.get("schema_version") != 1
        or record.get("run_id") != run_id
        or record.get("project") != expected_project
        or record.get("workspace") != "workspace"
    ):
        raise ValueError("Manifiesto incompatible.")

    endpoint = record.get("endpoint")
    if endpoint is not None:
        parsed = urlsplit(endpoint)
        if (
            parsed.scheme != "http"
            or parsed.hostname != "127.0.0.1"
            or parsed.port is None
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username is not None
        ):
            raise ValueError("Endpoint inválido.")
    return record
```

---

## 26. Helper: entorno ficticio

Añade el contexto de los procesos hijos.

### 26.1. Implementación

```python
def environment(record):
    env = os.environ.copy()
    for key in list(env):
        if key.startswith(("AWS_", "TF_VAR_", "TF_CLI_ARGS")):
            env.pop(key, None)

    for key in ("TF_WORKSPACE", "TF_DATA_DIR", "TF_LOG", "TF_LOG_PATH"):
        env.pop(key, None)

    base = directory(record["run_id"])
    for name in ("aws-config", "aws-credentials"):
        path = base / name
        if not path.exists():
            path.write_text("")
            path.chmod(0o600)

    env.update({
        "LOCALSTACK_IMAGE": record["image"],
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_EC2_METADATA_DISABLED": "true",
        "AWS_CONFIG_FILE": str(base / "aws-config"),
        "AWS_SHARED_CREDENTIALS_FILE": str(base / "aws-credentials"),
        "AWS_PAGER": "",
        "AWS_CLI_AUTO_PROMPT": "off",
        "TF_IN_AUTOMATION": "true",
        "NO_PROXY": "127.0.0.1,localhost,localhost.localstack.cloud",
    })
    return env
```

---

## 27. Helper: comandos y logs

Añade ejecución con timeout y registro privado.

### 27.1. Implementación

```python
def command(record, name, arguments, timeout=180):
    base = directory(record["run_id"])
    logs = base / "logs"
    logs.mkdir(mode=0o700, exist_ok=True)
    stamp = time.time_ns()

    result = subprocess.run(
        arguments, cwd=ROOT, env=environment(record),
        capture_output=True, text=True, timeout=timeout,
    )

    (logs / f"{stamp}-{name}.stdout.txt").write_text(result.stdout)
    (logs / f"{stamp}-{name}.stderr.txt").write_text(result.stderr)

    if result.returncode != 0:
        raise RuntimeError(f"Falló {name}. Revisa logs locales.")
    return result.stdout
```

### 27.2. Regla

Los logs no deben publicarse automáticamente.

---

## 28. Helper: wrappers

Añade comandos comunes.

### 28.1. Implementación

```python
def compose(record, *arguments):
    return command(
        record, "compose",
        [
            "docker", "compose",
            "-f", str(ROOT / "compose.yaml"),
            "-p", record["project"], *arguments,
        ],
    )

def tf(record, *arguments):
    workspace = directory(record["run_id"]) / "workspace"
    return command(
        record, "terraform",
        ["terraform", f"-chdir={workspace}", *arguments],
    )

def aws(record, service, operation, *arguments):
    text = command(
        record, f"aws-{operation}",
        [
            "aws", f"--endpoint-url={record['endpoint']}",
            "--region=us-east-1", "--output=json",
            service, operation, *arguments,
        ],
        timeout=20,
    )
    return json.loads(text) if text.strip() else {}
```

---

## 29. Helper: URL de cola

Normaliza únicamente destinos locales validados.

### 29.1. Implementación

```python
def queue_url(record, value):
    parsed = urlsplit(value)
    allowed = {"127.0.0.1", "localhost", "localhost.localstack.cloud"}

    if (
        parsed.scheme != "http"
        or parsed.hostname not in allowed
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or not parsed.path.startswith("/")
    ):
        raise ValueError("URL de cola no local.")

    endpoint = urlsplit(record["endpoint"])
    return urlunsplit((
        endpoint.scheme, endpoint.netloc, parsed.path, "", ""
    ))
```

### 29.2. Compatibilidad

Valida la conservación de la ruta con la estrategia `path` utilizada.

---

## 30. Creación: preparación del registro

Crea `scripts/create.py`.

### 30.1. Código inicial

```python
import json
import os
import shutil
import time
import uuid
from urllib.parse import urlsplit

from common import directory, save, compose, tf, aws, queue_url

run_id = uuid.uuid4().hex[:12]
base = directory(run_id)
base.mkdir(mode=0o700, parents=True, exist_ok=False)
workspace = base / "workspace"
workspace.mkdir(mode=0o700)

record = {
    "schema_version": 1,
    "run_id": run_id,
    "project": f"course-isolated-{run_id}",
    "workspace": "workspace",
    "image": os.environ["LOCALSTACK_IMAGE"],
    "endpoint": None,
    "status": "created",
    "created_at": time.time(),
    "fixture": None,
}
save(record)
print(json.dumps({"run_id": run_id}), flush=True)
```

---

## 31. Creación: copia y arranque

Continúa el mismo archivo.

### 31.1. Implementación

```python
try:
    for source in (base.parents[1] / "template").iterdir():
        if source.is_file() and (
            source.suffix == ".tf"
            or source.name == ".terraform.lock.hcl"
        ):
            shutil.copy2(source, workspace / source.name)

    record["status"] = "starting"
    save(record)
    compose(record, "up", "-d")

    binding = compose(record, "port", "localstack", "4566").strip()
    parsed = urlsplit(f"http://{binding}")

    if parsed.hostname != "127.0.0.1" or parsed.port is None:
        raise RuntimeError("Docker no publicó el binding esperado.")

    record["endpoint"] = f"http://127.0.0.1:{parsed.port}"
    save(record)
```

---

## 32. Creación: disponibilidad e inicialización

Continúa dentro del bloque `try`.

### 32.1. Implementación

```python
    deadline = time.monotonic() + 90
    while True:
        try:
            aws(record, "s3api", "list-buckets")
            aws(record, "sqs", "list-queues")
            break
        except RuntimeError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)

    variables = {
        "run_id": run_id,
        "endpoint": record["endpoint"],
    }
    (workspace / "terraform.auto.tfvars.json").write_text(
        json.dumps(variables), encoding="utf-8"
    )

    record["status"] = "provisioning"
    save(record)
    tf(record, "init", "-input=false", "-lockfile=readonly")
    tf(record, "validate", "-no-color")
    tf(record, "apply", "-auto-approve", "-input=false", "-no-color")
```

---

## 33. Creación: fixture y prueba

Completa la fase principal.

### 33.1. Implementación

```python
    contract = json.loads(tf(record, "output", "-json", "contract"))
    record["contract"] = contract

    key = f"tests/{run_id}.json"
    record["fixture"] = {
        "bucket": contract["bucket_name"],
        "key": key,
    }
    save(record)

    payload = {"run_id": run_id, "purpose": "isolation-test"}
    source = base / "payload.json"
    source.write_text(json.dumps(payload))

    aws(record, "s3api", "put-object",
        "--bucket", contract["bucket_name"],
        "--key", key, "--body", str(source))

    target = base / "recovered.json"
    aws(record, "s3api", "get-object",
        "--bucket", contract["bucket_name"],
        "--key", key, str(target))

    if json.loads(target.read_text()) != payload:
        raise RuntimeError("El contenido recuperado no coincide.")

    if os.environ.get("LAB_FAIL_AFTER_APPLY") == "1":
        raise RuntimeError("Fallo didáctico después de aplicar.")

    record["status"] = "ready"
    save(record)
    print(json.dumps({"ready": True, "run_id": run_id}))

except Exception:
    record["status"] = "test_failed"
    save(record)
    raise
```

---

## 34. Limpieza: preparación

Crea `scripts/cleanup.py`.

### 34.1. Código inicial

```python
import json
import sys

from common import directory, load, save, compose, tf, aws

record = load(sys.argv[1])
base = directory(record["run_id"])

if record["status"] == "cleaned":
    print(json.dumps({"already_cleaned": True}))
    raise SystemExit(0)

record["status"] = "cleaning"
save(record)

try:
    fixture = record.get("fixture")
    if fixture:
        expected = f"curso-isolated-{record['run_id']}"
        if (
            fixture["bucket"] != expected
            or fixture["key"] != f"tests/{record['run_id']}.json"
        ):
            raise RuntimeError("Fixture incompatible con la ejecución.")

        aws(record, "s3api", "delete-object",
            "--bucket", fixture["bucket"], "--key", fixture["key"])
```

---

## 35. Limpieza: recursos e inventario

Continúa dentro del bloque `try`.

### 35.1. Implementación

```python
    workspace = base / "workspace"
    variables = workspace / "terraform.auto.tfvars.json"

    if variables.exists():
        tf(record, "init", "-input=false", "-lockfile=readonly")
        tf(record, "destroy", "-auto-approve", "-input=false", "-no-color")

        if tf(record, "state", "list").strip():
            raise RuntimeError("El estado todavía administra recursos.")

    if record.get("endpoint") is not None:
        bucket = f"curso-isolated-{record['run_id']}"
        buckets = aws(record, "s3api", "list-buckets").get("Buckets", [])
        queues = aws(
            record, "sqs", "list-queues",
            "--queue-name-prefix", bucket,
        ).get("QueueUrls", [])

        if any(item["Name"] == bucket for item in buckets) or queues:
            raise RuntimeError("Persisten recursos de la ejecución.")
```

---

## 36. Limpieza: retirada del emulador

Completa el script.

### 36.1. Implementación

```python
    compose(record, "down", "--remove-orphans")

    remaining = compose(record, "ps", "-aq").strip()
    if remaining:
        raise RuntimeError("Persisten contenedores del proyecto.")

    record["status"] = "cleaned"
    record["fixture"] = None
    save(record)

    print(json.dumps({
        "run_id": record["run_id"],
        "cleanup_verified": True,
    }))

except Exception:
    record["status"] = "cleanup_failed"
    save(record)
    raise
```

### 36.2. Regla

Si la limpieza de recursos falla, no se ejecuta automáticamente `compose down`.

---

## 37. Comprobación de aislamiento

Crea `scripts/check_isolation.py`.

### 37.1. Implementación

```python
import json
import sys

from common import load, aws, queue_url

first = load(sys.argv[1])
second = load(sys.argv[2])

if (
    first["run_id"] == second["run_id"]
    or first["project"] == second["project"]
    or first["endpoint"] == second["endpoint"]
):
    raise SystemExit("Las ejecuciones no están separadas.")

for own, other in ((first, second), (second, first)):
    buckets = aws(own, "s3api", "list-buckets").get("Buckets", [])
    names = {item["Name"] for item in buckets}

    if own["contract"]["bucket_name"] not in names:
        raise SystemExit("Falta el bucket propio.")
    if other["contract"]["bucket_name"] in names:
        raise SystemExit("Se observa el bucket de otra ejecución.")

    aws(
        own, "sqs", "get-queue-attributes",
        "--queue-url", queue_url(own, own["contract"]["queue_url"]),
        "--attribute-names", "QueueArn",
    )

print(json.dumps({"isolation_verified": True}))
```

---

## 38. Sesión 1: crear dos entornos

Duración orientativa: 35 minutos.

### 38.1. Comandos

```bash
python3 -m py_compile scripts/common.py
python3 -m py_compile scripts/create.py
python3 -m py_compile scripts/cleanup.py
python3 -m py_compile scripts/check_isolation.py

python3 scripts/create.py
python3 scripts/create.py
```

### 38.2. Registro

Anota los dos identificadores publicados como `RUN_A` y `RUN_B`.

---

## 39. Sesión 2: comprobar independencia

Los entornos deben tener proyectos y endpoints diferentes.

### 39.1. Comando

```bash
python3 scripts/check_isolation.py "$RUN_A" "$RUN_B"
```

### 39.2. Resultado esperado

Cada endpoint observa su bucket y no el del otro entorno.

Ambas colas propias pueden consultarse.

### 39.3. Regla

Esta observación no demuestra una frontera de seguridad frente al host compartido.

---

## 40. Sesión 3: eliminar un entorno

Eliminar A no debe interrumpir B.

### 40.1. Comandos

```bash
python3 scripts/cleanup.py "$RUN_A"
docker compose ls
```

### 40.2. Verificación de B

Consulta su endpoint mediante AWS CLI y credenciales ficticias.

Comprueba que su bucket y cola siguen disponibles.

### 40.3. Regla

No uses el endpoint retirado de A para concluir nada sobre B.

---

## 41. Sesión 4: limpieza repetida

Una limpieza repetible debe reconocer un entorno ya retirado.

### 41.1. Comandos

```bash
python3 scripts/cleanup.py "$RUN_A"
python3 scripts/cleanup.py "$RUN_B"
```

### 41.2. Resultado esperado

La segunda limpieza de A informa `already_cleaned`.

B se limpia y queda registrado como `cleaned`.

### 41.3. Límite

El estado registrado no sustituye una auditoría posterior del host si hubo modificaciones externas.

---

## 42. Sesión 5: fallo después de apply

La recuperación necesita conservar entorno y estado.

### 42.1. Comando

```bash
LAB_FAIL_AFTER_APPLY=1 python3 scripts/create.py
```

### 42.2. Resultado esperado

La creación termina con error y registra `test_failed`.

El manifiesto conserva el identificador y el fixture.

### 42.3. Recuperación

Ejecuta `cleanup.py` con ese identificador.

---

## 43. Sesión 6: objeto no registrado

Un bucket con objetos ajenos debe impedir una limpieza silenciosa.

### 43.1. Ejercicio

Crea un entorno nuevo.

Añade mediante AWS CLI un objeto ficticio con otra clave.

Ejecuta la limpieza.

### 43.2. Resultado esperado

Destroy falla porque el bucket no está vacío.

El estado queda como `cleanup_failed` y el emulador se conserva.

### 43.3. Recuperación

Investiga y elimina el objeto concreto antes de repetir.

---

## 44. Sesión 7: interrupción del emulador

La conectividad fallida no demuestra ausencia de recursos.

### 44.1. Ejercicio

Detén temporalmente LocalStack con `compose stop`.

Ejecuta la limpieza.

### 44.2. Resultado esperado

La limpieza falla y conserva el registro.

### 44.3. Recuperación

Arranca el mismo proyecto con `compose start` y repite.

### 44.4. Regla

No recrees el contenedor mientras investigas datos efímeros que necesitas conservar.

---

## 45. Integración en CI

El pipeline debe registrar el identificador antes de crear recursos.

### 45.1. Diseño recomendado

Genera identidad.

Guarda el manifiesto.

Ejecuta preparación y pruebas.

Intenta limpieza aunque haya fallos.

Publica un resumen seleccionado.

### 45.2. Adaptación

Para CI, resulta preferible que el identificador se genere en una etapa previa y se pase explícitamente al ejecutor.

### 45.3. Regla

No dependas de analizar logs humanos para descubrir qué entorno debes limpiar.

---

## 46. Resultado de prueba y limpieza

La automatización debe conservar ambos resultados.

### 46.1. Matriz

| **Prueba** | **Limpieza** | **Resultado global** |
|------------|--------------|---------------------|
| Correcta | Correcta | Correcto |
| Fallida | Correcta | Fallido |
| Correcta | Fallida | Fallido |
| Fallida | Fallida | Fallido con recuperación pendiente |

La limpieza no cambia la historia de la prueba.

### 46.2. Regla

No ocultes un fallo original detrás de un teardown exitoso.

---

## 47. Runners persistentes y residuos

Un runner autogestionado necesita inventario periódico.

### 47.1. Qué revisar

Proyectos Compose del laboratorio.

Manifiestos no limpiados.

Directorios de ejecución antiguos.

Estados pendientes.

Puertos y contenedores remanentes.

### 47.2. Regla

La antigüedad de un entorno no demuestra que esté abandonado.

### 47.3. Concurrencia

Un job largo puede seguir utilizando un entorno aparentemente antiguo.

---

## 48. Diseño de un recolector de residuos

Un recolector debe ser conservador y observable.

### 48.1. Requisitos

Verificar propiedad.

Consultar el job asociado.

Comprobar ausencia de actividad.

Aplicar una política de caducidad.

Registrar candidatos antes de eliminar.

### 48.2. Laboratorio

No implementaremos eliminación automática basada únicamente en tiempo.

### 48.3. Regla

Primero inventario y simulación; después eliminación autorizada.

---

## 49. Qué no debes utilizar para limpiar

Las limpiezas globales afectan a otros proyectos.

### 49.1. Evita

`docker system prune` como teardown de una prueba.

Eliminar todos los contenedores.

Borrar todos los buckets visibles.

Purgar colas compartidas.

Retirar estados antes de destruir.

### 49.2. Regla

La limpieza debe operar sobre recursos identificados y pertenecientes a una ejecución concreta.

---

## 50. Retención de archivos

Destruir recursos no elimina los rastros locales.

### 50.1. Artefactos restantes

Manifiestos.

Estados y backups.

Logs.

Documentos ficticios.

Archivos AWS vacíos.

### 50.2. Política

Conserva evidencias mínimas durante el plazo definido y retira los directorios solo cuando no sean necesarios para recuperar.

### 50.3. Regla

Eliminar un archivo no garantiza borrado físico irrecuperable.

---

## 51. Límites y diferencias respecto a AWS real

La práctica comprueba aislamiento operacional de entornos emulados.

### 51.1. Límites de los scripts

No incluyen bloqueo de manifiestos.

No soportan create y cleanup simultáneos sobre una ejecución.

No protegen frente a manipulación maliciosa del directorio.

### 51.2. AWS real

Añade cuentas, roles, IAM efectivo, auditoría, cuotas y costes.

### 51.3. Regla

Separar contenedores no equivale a separar cuentas AWS ni tenants de producción.

---

## 52. Ejercicios y resumen

La evaluación debe demostrar aislamiento, recuperación y limpieza verificable.

### 52.1. Ejercicios

1. Crea dos entornos y compara endpoints.
2. Elimina uno sin afectar al otro.
3. Repite una limpieza.
4. Recupera un fallo después de apply.
5. Investiga un objeto no registrado.
6. Diseña bloqueo por ejecución.
7. Define una política de retención.
8. Diseña un recolector con modo simulación.

### 52.2. Entrega

Incluye código, versiones y evidencias revisadas; excluye estados y logs completos.

### 52.3. Idea final

**Un entorno CI fiable conoce qué posee, evita interferir con otros trabajos y conserva información suficiente para recuperar una limpieza que no pudo completarse.**