# Estrategia de pruebas de infraestructura con Terraform y LocalStack

Una infraestructura que se despliega sin errores no está necesariamente lista para utilizarse.

También necesitas comprobar que su configuración cumple el contrato, que los recursos existen y que las operaciones previstas funcionan.

Terraform, AWS CLI y LocalStack permiten construir una estrategia de pruebas por capas.

Cada capa responde a preguntas diferentes y aporta evidencias con límites concretos.

En esta lección crearás un módulo con un bucket S3 y una cola SQS.

Después combinarás análisis estático, pruebas de Terraform, consultas independientes y pruebas funcionales con datos ficticios.

El laboratorio también incluye aislamiento, tiempos de espera, pruebas negativas, diagnóstico y limpieza verificable.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Las pruebas crean y eliminan recursos.
>
> Una ejecución correcta en LocalStack no certifica equivalencia completa con AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección establece un procedimiento reproducible para comprobar infraestructura.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diseñar pruebas por capas.
- Definir contratos verificables.
- Separar pruebas de plan y aplicación.
- Comprobar recursos mediante AWS CLI.
- Probar escritura, lectura y confirmación.
- Evitar dependencias del orden de mensajes.
- Investigar fallos sin perder evidencias.
- Destruir y verificar los recursos creados.

### 1.2. Resultado práctico

Construirás una matriz de pruebas para un módulo S3 y SQS.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, estado y recursos.

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

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

---

## 3. Compatibilidad obligatoria

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones necesarias

Comprueba:

- Ejecución de `terraform test`.
- Creación y destrucción de buckets y colas.
- Consulta de atributos y etiquetas.
- Escritura, lectura y eliminación de objetos.
- Envío, recepción y eliminación de mensajes.
- Funcionamiento de los scripts Python.
- Disponibilidad del endpoint de salud.

### 3.2. Registro

Documenta versiones, edición e imagen o digest de LocalStack.

---

## 4. Qué significa probar infraestructura

Una prueba compara una propiedad observada con una expectativa explícita.

### 4.1. Componentes mínimos

Toda prueba necesita:

- Una preparación.
- Una operación.
- Una expectativa.
- Una evidencia.
- Un criterio de fallo.
- Una limpieza.

### 4.2. Regla principal

**Un comando ejecutado no equivale a una propiedad comprobada.**

---

## 5. Preguntas antes de escribir pruebas

La estrategia debe empezar por el contrato de la infraestructura.

### 5.1. Preguntas de diseño

Determina qué recursos necesita la aplicación.

Define sus atributos importantes y operaciones previstas.

Identifica qué errores deben rechazarse antes de aplicar.

Establece qué garantías quedan fuera del entorno emulado.

### 5.2. Ejemplo

Para una cola, crearla y enviar mensajes son propiedades distintas.

### 5.3. Regla

No diseñes la cobertura contando comandos; diseña propiedades verificables.

---

## 6. Pruebas por capas

La estrategia combina evidencias con costes y límites diferentes.

### 6.1. Comparación

| **Capa** | **Herramienta** | **Pregunta principal** |
|----------|----------------|------------------------|
| Estática | fmt, validate, analizadores | ¿La configuración es consistente? |
| Contrato | `terraform test` con plan | ¿Las entradas producen el contrato esperado? |
| Aprovisionamiento | apply y consultas | ¿Los recursos existen con atributos previstos? |
| Funcional | AWS CLI y Python | ¿Funcionan las operaciones del consumidor? |
| Limpieza | destroy y consultas | ¿Desaparecieron los recursos creados? |

Cada capa cubre propiedades diferentes.

### 6.2. Regla

Una capa superada no elimina la necesidad de las demás.

---

## 7. Una pirámide práctica

Las pruebas baratas deben ejecutarse antes que las que crean recursos.

### 7.1. Orden recomendado

1. Formato.
2. Validación.
3. Análisis estático.
4. Pruebas de plan.
5. Pruebas de aplicación.
6. Pruebas funcionales.
7. Verificación de limpieza.

### 7.2. Beneficio

Los errores simples se detectan antes de consumir tiempo de despliegue.

---

## 8. Qué demuestra un plan

Un plan representa decisiones propuestas bajo un contexto concreto.

### 8.1. Puede comprobar

Nombres conocidos.

Valores configurados.

Cantidad y tipo de acciones.

Validaciones de entradas.

### 8.2. No demuestra

Que un recurso pueda crearse o que su consumidor funcione.

### 8.3. Regla

Los atributos desconocidos pueden necesitar una prueba de aplicación.

---

## 9. Qué demuestra una aplicación

Una aplicación comprueba que el proveedor pudo ejecutar determinadas operaciones.

### 9.1. Evidencia útil

Recursos creados y atributos publicados.

Condiciones evaluadas tras obtener resultados.

Relaciones registradas en el estado.

### 9.2. Límite

No demuestra automáticamente lectura, escritura o procesamiento de mensajes.

### 9.3. Regla

Añade operaciones funcionales independientes cuando formen parte del contrato.

---

## 10. Qué demuestra LocalStack

LocalStack permite practicar interfaces y flujos sin una cuenta AWS real.

### 10.1. Propiedades comprobables

Puedes observar creación, lectura, actualización y eliminación.

También puedes comprobar ciertos recorridos entre servicios.

### 10.2. Límites relevantes

IAM, cifrado, propagación, cuotas y rendimiento pueden diferir de AWS.

### 10.3. Regla

Relaciona cada conclusión con la versión y modalidad utilizadas.

---

## 11. Arquitectura del laboratorio

El módulo representará un almacenamiento y una cola de trabajo.

### 11.1. Recorrido

```text
Terraform
    └── Módulo channel
         ├── Bucket S3
         └── Cola SQS

Prueba funcional
    ├── Escribe y recupera un objeto
    └── Envía, recibe y elimina un mensaje
```

### 11.2. Alcance

No crearemos aplicaciones, funciones Lambda ni consumidores permanentes.

---

## 12. Contrato del módulo

La interfaz debe contener propiedades que puedan comprobarse.

### 12.1. Entradas

Utilizaremos nombre, visibilidad y retención.

### 12.2. Salidas

Publicaremos nombre del bucket, URL de cola y ARN de cola.

### 12.3. Responsabilidad

El módulo creará recursos, no ejecutará la prueba funcional.

### 12.4. Regla

Mantén separados código de infraestructura y código de comprobación.

---

## 13. Matriz inicial de pruebas

La matriz transforma expectativas en tareas observables.

### 13.1. Casos previstos

| **Propiedad** | **Prueba** | **Expectativa** |
|---------------|------------|-----------------|
| Identidad válida | Plan negativo | Rechazo de entrada |
| Visibilidad | Plan y consulta SQS | 60 segundos |
| Retención | Plan y consulta SQS | 86400 segundos |
| Almacenamiento | Escritura y lectura | Contenido idéntico |
| Mensajería | Envío y recepción | Evento identificado |
| Limpieza | Consultas finales | Recursos ausentes |

Esta matriz será la base de la entrega.

### 13.2. Regla

Registra resultado observado, no únicamente resultado esperado.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Estructura

```bash
mkdir -p terraform-infra-tests/app/tests
mkdir -p terraform-infra-tests/modules/channel
mkdir -p terraform-infra-tests/scripts
mkdir -p terraform-infra-tests/planes
mkdir -p terraform-infra-tests/resultados
mkdir -p terraform-infra-tests/copias
cd terraform-infra-tests
```

### 14.2. Ejecución

Los comandos se ejecutan desde esta raíz salvo indicación expresa.

---

## 15. Protección de artefactos

Los planes, estados e informes necesitan acceso controlado.

### 15.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.sandbox/
.env
planes/
resultados/
copias/
crash.log
```

### 15.2. Regla

Versiona código y archivos de bloqueo, no estados ni planes.

---

## 16. Permisos y datos ficticios

La práctica no necesita información personal ni secretos reales.

### 16.1. Preparación

```bash
umask 077
chmod 700 planes resultados copias
```

### 16.2. Alcance

Estas instrucciones utilizan permisos POSIX.

En otros sistemas, configura ACL equivalentes.

### 16.3. Regla

Los permisos locales reducen exposición, pero no son una frontera frente al administrador del host.

---

## 17. Imagen y Docker Compose

Selecciona una imagen validada por el docente.

### 17.1. Preparación

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
      SERVICES: s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

---

## 18. Contexto local

Prepara la terminal antes de ejecutar Terraform o AWS CLI.

### 18.1. Configuración

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_SQS
unset TF_WORKSPACE TF_CLI_ARGS

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 18.2. Regla

No utilices endpoints AWS como fallback.

---

## 19. Identificador único de ejecución

Cada ejecución necesita nombres que no colisionen con otras pruebas.

### 19.1. Generación

```bash
RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" > app/terraform.tfvars
printf '%s\n' "$RUN_ID" > resultados/run-id.txt
```

### 19.2. Separación

Las pruebas Terraform utilizarán un identificador con sufijo `-test`.

### 19.3. Regla

No regeneres el identificador del despliegue mientras sus recursos sigan administrados.

---

## 20. Requisitos del módulo

Crea `modules/channel/versions.tf`.

### 20.1. Configuración

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

### 20.2. Proveedor

La configuración AWS se heredará desde la raíz.

---

## 21. Entradas del módulo

Crea `modules/channel/variables.tf`.

### 21.1. Declaraciones

```hcl
variable "name" {
  type     = string
  nullable = false
}

variable "visibility_seconds" {
  type    = number
  default = 60

  validation {
    condition = (
      var.visibility_seconds >= 0 &&
      var.visibility_seconds <= 43200 &&
      floor(var.visibility_seconds) == var.visibility_seconds
    )
    error_message = "La visibilidad debe ser un entero válido para SQS."
  }
}

variable "retention_seconds" {
  type    = number
  default = 86400
}
```

### 21.2. Ejercicio posterior

Añadirás una validación completa de retención.

---

## 22. Recursos del módulo

Crea `modules/channel/main.tf`.

### 22.1. Configuración

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "${var.name}-data"
  force_destroy = false

  tags = {
    Laboratory = "LocalStack"
  }
}

resource "aws_sqs_queue" "work" {
  name                       = "${var.name}-work"
  visibility_timeout_seconds = var.visibility_seconds
  message_retention_seconds  = var.retention_seconds

  tags = {
    Laboratory = "LocalStack"
  }
}
```

### 22.2. Alcance

Este fixture mínimo no representa una configuración completa de producción.

---

## 23. Outputs del módulo

Crea `modules/channel/outputs.tf`.

### 23.1. Contrato público

```hcl
output "contract" {
  value = {
    contract_version   = 1
    bucket_name        = aws_s3_bucket.data.id
    queue_name         = aws_sqs_queue.work.name
    queue_url          = aws_sqs_queue.work.id
    queue_arn          = aws_sqs_queue.work.arn
    visibility_seconds = aws_sqs_queue.work.visibility_timeout_seconds
    retention_seconds  = aws_sqs_queue.work.message_retention_seconds
  }
}
```

### 23.2. Regla

Los scripts consumirán este contrato, no nombres reconstruidos de forma independiente.

---

## 24. Requisitos y proveedor raíz

Crea `app/versions.tf` y `app/providers.tf`.

### 24.1. Requisitos

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

### 24.2. Proveedor

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

---

## 25. Composición raíz

Crea `app/main.tf`.

### 25.1. Entrada y llamada

```hcl
variable "run_id" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{5,31}$", var.run_id))
    error_message = "run_id debe tener entre 6 y 32 caracteres: minúsculas, dígitos y guiones."
  }
}

module "channel" {
  source             = "../modules/channel"
  name               = "curso-tests-${var.run_id}"
  visibility_seconds = 60
  retention_seconds  = 86400
}

output "channel" {
  value = module.channel.contract
}
```

---

## 26. Sesión 1: controles previos

Duración orientativa: 20 minutos.

### 26.1. Comandos

```bash
terraform -chdir=app init
terraform fmt -recursive
terraform fmt -check -diff -recursive
terraform -chdir=app validate

aws_local s3api list-buckets
aws_local sqs list-queues
```

### 26.2. Resultado esperado

Configuración consistente y servicios locales disponibles.

### 26.3. Regla

Incorpora TFLint y análisis de seguridad conforme a la lección anterior.

---

## 27. Prueba de contrato con plan

Crea `app/tests/channel.tftest.hcl`.

### 27.1. Primera ejecución

```hcl
run "contract_plan" {
  command = plan

  assert {
    condition     = output.channel.contract_version == 1
    error_message = "El contrato debe publicar la versión 1."
  }

  assert {
    condition     = output.channel.visibility_seconds == 60
    error_message = "La visibilidad prevista debe ser 60."
  }

  assert {
    condition     = output.channel.retention_seconds == 86400
    error_message = "La retención prevista debe ser 86400."
  }
}
```

### 27.2. Alcance

Estas propiedades se conocen durante la planificación.

---

## 28. Prueba negativa de entrada

Añade otra ejecución al mismo archivo.

### 28.1. Rechazo esperado

```hcl
run "reject_invalid_identifier" {
  command = plan

  variables {
    run_id = "INVALID"
  }

  expect_failures = [var.run_id]
}
```

### 28.2. Interpretación

La prueba pasa cuando Terraform rechaza la entrada mediante la validación prevista.

### 28.3. Regla

Un error no relacionado no debe clasificarse como rechazo correcto.

---

## 29. Prueba de aplicación

Añade la ejecución que obtiene atributos calculados.

### 29.1. Aprovisionamiento

```hcl
run "resources_apply" {
  command = apply

  assert {
    condition     = length(output.channel.queue_url) > 0
    error_message = "La cola debe publicar una URL."
  }

  assert {
    condition = (
      startswith(output.channel.queue_arn, "arn:aws:sqs:us-east-1:") &&
      endswith(output.channel.queue_arn, ":${output.channel.queue_name}")
    )
    error_message = "El ARN debe corresponder a la cola creada."
  }
}
```

### 29.2. Advertencia

Esta ejecución crea recursos y requiere limpieza de Terraform test.

---

## 30. Sesión 2: ejecutar Terraform test

Utiliza nombres diferentes de los del despliegue manual.

### 30.1. Comando

```bash
terraform -chdir=app test \
  -var="run_id=${RUN_ID}-test"
```

### 30.2. Resultado esperado

Las tres ejecuciones pasan.

Terraform intenta destruir los recursos administrados por las pruebas al finalizar.

### 30.3. Regla

Comprueba el resumen y los mensajes de limpieza, no solo las aserciones.

### 30.4. Aislamiento

No ejecutes simultáneamente esta prueba con el mismo identificador.

---

## 31. Estado de pruebas y estado normal

Terraform test mantiene estados de prueba separados del estado habitual del proyecto.

### 31.1. Consecuencia

El estado normal no administra los recursos temporales creados por las pruebas.

### 31.2. Verificación

```bash
terraform -chdir=app state list
aws_local s3api list-buckets
aws_local sqs list-queues
```

### 31.3. Regla

Si la limpieza falla, sigue las instrucciones de recuperación emitidas por Terraform.

---

## 32. Sesión 3: despliegue manual controlado

El despliegue manual permitirá ejecutar pruebas funcionales independientes.

### 32.1. Secuencia

```bash
terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan

terraform -chdir=app output -json channel \
  > resultados/channel.json
```

### 32.2. Resultado esperado

Se crean dos recursos con nombres asociados al `RUN_ID` original.

### 32.3. Regla

No apliques configuraciones mientras reutilizas un estado desde otra ejecución.

---

## 33. Helper AWS para las pruebas

Un helper centralizará endpoint, entorno y tiempo máximo por comando.

### 33.1. Propósito

Los scripts no necesitarán perfiles personales ni credenciales reales.

### 33.2. Archivos dedicados

Utilizaremos archivos AWS vacíos dentro de `.sandbox`.

### 33.3. Regla

La configuración de herramientas sigue siendo una dependencia de confianza.

### 33.4. Límite

El helper no constituye una sandbox ni una política de red.

---

## 34. Helper: contexto local

Crea `scripts/local_aws.py`.

### 34.1. Preparación

```python
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SANDBOX = ROOT / ".sandbox"
SANDBOX.mkdir(mode=0o700, parents=True, exist_ok=True)

for name in ("config", "credentials"):
    path = SANDBOX / name
    path.write_text("", encoding="utf-8")
    path.chmod(0o600)

ENV = {
    key: os.environ[key]
    for key in ("PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR")
    if key in os.environ
}
ENV.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_CONFIG_FILE": str(SANDBOX / "config"),
    "AWS_SHARED_CREDENTIALS_FILE": str(SANDBOX / "credentials"),
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_PAGER": "",
    "AWS_CLI_AUTO_PROMPT": "off",
})
```

---

## 35. Helper: ejecución y errores

Completa `scripts/local_aws.py`.

### 35.1. Implementación

```python
def aws(*operation):
    binary = shutil.which("aws")
    if binary is None:
        raise RuntimeError("AWS CLI no está disponible.")

    command = [
        binary, "--endpoint-url", "http://127.0.0.1:4566",
        "--region", "us-east-1", "--output", "json", *operation,
    ]
    result = subprocess.run(
        command, env=ENV, capture_output=True, text=True, timeout=20
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Operación local fallida: {operation[0]} {operation[1]}"
        )
    return json.loads(result.stdout) if result.stdout.strip() else {}
```

### 35.2. Diagnóstico

El helper evita publicar respuestas completas, pero simplifica el detalle de errores.

---

## 36. Prueba de configuración observada

Crea `scripts/check-configuration.py`.

### 36.1. Comprobaciones

```python
import json
from local_aws import ROOT, aws

contract = json.loads((ROOT / "resultados" / "channel.json").read_text())

aws("s3api", "head-bucket", "--bucket", contract["bucket_name"])

attributes = aws(
    "sqs", "get-queue-attributes",
    "--queue-url", contract["queue_url"],
    "--attribute-names", "QueueArn", "VisibilityTimeout", "MessageRetentionPeriod",
)["Attributes"]

expected = {
    "QueueArn": contract["queue_arn"],
    "VisibilityTimeout": "60",
    "MessageRetentionPeriod": "86400",
}

if any(attributes.get(key) != value for key, value in expected.items()):
    raise SystemExit("Los atributos observados no cumplen el contrato.")

print(json.dumps({"configuration_verified": True}))
```

---

## 37. Sesión 4: consultas independientes

Comprueba que el servicio publica los atributos previstos.

### 37.1. Comandos

```bash
python3 -m py_compile scripts/local_aws.py
python3 -m py_compile scripts/check-configuration.py

python3 scripts/check-configuration.py \
  > resultados/configuration-check.json
```

### 37.2. Resultado esperado

La configuración observada satisface el contrato.

### 37.3. Regla

Esta prueba comprueba atributos, no procesamiento de datos ni seguridad integral.

---

## 38. Prueba funcional de almacenamiento

Crea `scripts/test-storage.py`.

### 38.1. Escritura, lectura y limpieza

```python
import json
import tempfile
import uuid
from pathlib import Path
from local_aws import ROOT, aws

contract = json.loads((ROOT / "resultados" / "channel.json").read_text())
bucket = contract["bucket_name"]
key = f"tests/{uuid.uuid4().hex}.json"
payload = {"event_id": uuid.uuid4().hex, "purpose": "storage-test"}

try:
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / "input.json"
        target = Path(directory) / "output.json"
        source.write_text(json.dumps(payload), encoding="utf-8")

        aws("s3api", "put-object", "--bucket", bucket, "--key", key,
            "--body", str(source))
        aws("s3api", "get-object", "--bucket", bucket, "--key", key,
            str(target))

        if json.loads(target.read_text()) != payload:
            raise RuntimeError("El contenido recuperado no coincide.")
finally:
    aws("s3api", "delete-object", "--bucket", bucket, "--key", key)

print(json.dumps({"storage_roundtrip": True}))
```

---

## 39. Interpretar la prueba S3

La comparación utiliza el documento original, no solo la existencia del objeto.

### 39.1. Demuestra

Escritura aceptada y lectura del contenido esperado.

Eliminación intentada del objeto concreto.

### 39.2. No demuestra

Durabilidad equivalente a AWS.

Cifrado físico.

Autorización de otras identidades.

### 39.3. Regla

Si la limpieza falla, investiga el objeto antes de destruir el bucket.

---

## 40. Prueba funcional de mensajería

SQS necesita tratamiento de identidad, espera y confirmación.

### 40.1. Diseño

Utilizaremos un `event_id` único.

Consultaremos repetidamente durante una ventana acotada.

Confirmaremos mediante el `ReceiptHandle` recibido.

### 40.2. Precaución

Una cola estándar puede entregar duplicados y no garantiza orden estricto.

### 40.3. Regla

No compares “el primer mensaje” con “el último enviado” como garantía general.

---

## 41. Script de mensajería

Crea `scripts/test-messaging.py`.

### 41.1. Envío y recepción

```python
import json
import time
import uuid
from local_aws import ROOT, aws

contract = json.loads((ROOT / "resultados" / "channel.json").read_text())
queue = contract["queue_url"]
event = {"event_id": uuid.uuid4().hex, "purpose": "messaging-test"}

aws("sqs", "send-message", "--queue-url", queue,
    "--message-body", json.dumps(event))

deadline = time.monotonic() + 30
found = False

while time.monotonic() < deadline and not found:
    response = aws(
        "sqs", "receive-message", "--queue-url", queue,
        "--wait-time-seconds", "2", "--max-number-of-messages", "10",
    )
    for message in response.get("Messages", []):
        body = json.loads(message["Body"])
        if body.get("event_id") != event["event_id"]:
            raise RuntimeError("La cola contiene tráfico ajeno a esta prueba.")
        if body != event:
            raise RuntimeError("El mensaje no cumple el contrato.")
        aws("sqs", "delete-message", "--queue-url", queue,
            "--receipt-handle", message["ReceiptHandle"])
        found = True

if not found:
    raise SystemExit("No se observó el evento dentro de la ventana.")

print(json.dumps({"messaging_roundtrip": True}))
```

---

## 42. Límites de la prueba SQS

La prueba está diseñada para una cola aislada y una ejecución a la vez.

### 42.1. Consideraciones

Un duplicado puede aparecer después de finalizar.

Eliminar un mensaje no certifica una transacción de negocio.

La ventana total puede superar ligeramente el plazo por comandos en curso.

### 42.2. Tráfico inesperado

La prueba falla en lugar de eliminar mensajes ajenos.

### 42.3. Regla

No ejecutes este script contra una cola compartida con consumidores reales.

---

## 43. Sesión 5: ejecutar pruebas funcionales

Comprueba ambos recorridos después de verificar configuración.

### 43.1. Comandos

```bash
python3 -m py_compile scripts/test-storage.py
python3 -m py_compile scripts/test-messaging.py

python3 scripts/test-storage.py > resultados/storage-test.json
python3 scripts/test-messaging.py > resultados/messaging-test.json
```

### 43.2. Resultado esperado

Ambas pruebas publican un resultado positivo.

### 43.3. Regla

Ejecuta secuencialmente las pruebas que utilizan la misma cola.

---

## 44. Tiempos de espera y reintentos

Una espera debe tener propósito, duración y criterio de finalización.

### 44.1. Buenas prácticas

Utiliza un reloj monotónico para plazos.

Define timeout por llamada.

Reintenta ausencia temporal de resultados cuando corresponda.

No reintentes indefinidamente errores de contrato.

### 44.2. Regla

Un `sleep` fijo no sustituye una condición de disponibilidad observada.

### 44.3. Límite

Los tiempos locales no representan garantías de AWS real.

---

## 45. Pruebas negativas adicionales

Los casos negativos deben verificar un rechazo o una detección concreta.

### 45.1. Ejemplos seguros

Identificador inválido.

Contrato capturado con visibilidad incorrecta.

Endpoint local indisponible.

Contenido esperado distinto al recuperado.

### 45.2. Regla

Utiliza copias de artefactos para pruebas negativas del consumidor.

### 45.3. Seguridad

No pruebes endpoints AWS ni credenciales reales.

---

## 46. Sesión 6: fallo de configuración observada

Demuestra que la prueba independiente puede detectar una discrepancia.

### 46.1. Operación controlada

```bash
QUEUE_URL="$(jq -er '.queue_url' resultados/channel.json)"

aws_local sqs set-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attributes VisibilityTimeout=120

python3 scripts/check-configuration.py
```

### 46.2. Resultado esperado

La prueba informa atributos incompatibles.

### 46.3. Recuperación

Restaura `VisibilityTimeout=60` y repite la comprobación.

---

## 47. Sesión 7: estabilidad del proyecto

Una segunda planificación permite comprobar convergencia.

### 47.1. Comando

```bash
terraform -chdir=app plan -detailed-exitcode
```

### 47.2. Interpretación

Código 0: sin cambios.

Código 2: existen cambios propuestos.

Código 1: ocurrió un error.

### 47.3. Regla

No trates el código 2 como un error operacional ni como un éxito sin cambios.

---

## 48. Idempotencia y convergencia

Estas propiedades necesitan expectativas explícitas.

### 48.1. Infraestructura

Después de aplicar y restaurar la deriva, un plan debería quedar estable.

### 48.2. Pruebas funcionales

Cada ejecución utiliza datos nuevos y elimina sus objetos concretos.

### 48.3. Límite

Una prueba repetible no demuestra idempotencia de una aplicación que todavía no existe.

### 48.4. Regla

Define qué componente debe converger y qué efecto debe ser repetible.

---

## 49. Aislamiento y concurrencia

La paralelización puede introducir errores que no pertenecen al recurso probado.

### 49.1. Riesgos

Nombres compartidos.

Estados utilizados simultáneamente.

Mensajes de otra prueba.

Limpieza de recursos todavía en uso.

### 49.2. Controles

Identificadores únicos y estados separados.

Colas dedicadas y ejecución secuencial cuando corresponda.

### 49.3. Regla

No paralelices antes de demostrar aislamiento.

---

## 50. Evidencias y diagnóstico

Un resultado útil debe ayudar a localizar la capa que falló.

### 50.1. Registro mínimo

Identificador de ejecución.

Herramientas y versiones.

Fase, comando y código de salida.

Expectativa y resultado observado.

Estado de la limpieza.

### 50.2. Regla

No adjuntes estados ni respuestas sensibles completas como diagnóstico rutinario.

### 50.3. Emulador

Consulta `docker compose logs localstack` con revisión antes de compartir.

---

## 51. Fallos de limpieza en Terraform test

La limpieza automática puede fallar por interrupciones o recursos adicionales.

### 51.1. Procedimiento

Lee los diagnósticos completos de Terraform.

Identifica recursos remanentes y archivos de recuperación indicados.

No ejecutes el despliegue manual suponiendo que administra esos recursos.

### 51.2. Recursos externos

Objetos creados fuera del estado pueden impedir destruir un bucket.

### 51.3. Regla

Recupera usando el contexto indicado por la herramienta y verifica ausencia después.

---

## 52. No limpiar a ciegas

Una limpieza agresiva puede eliminar evidencia o recursos de otra ejecución.

### 52.1. Evita

Borrar todos los buckets del emulador.

Purgar colas compartidas.

Eliminar estados antes de destruir.

Usar `force_destroy` para ocultar una prueba que dejó objetos.

### 52.2. Regla

La limpieza debe utilizar identificadores concretos y responsables conocidos.

### 52.3. Diseño

El bucket de esta práctica utiliza deliberadamente `force_destroy = false`.

---

## 53. Automatización en CI

El mismo flujo puede ejecutarse en un entorno gestionado.

### 53.1. Secuencia recomendada

Preparar herramientas fijadas.

Arrancar LocalStack validado.

Esperar disponibilidad.

Ejecutar controles y pruebas.

Conservar resultados limitados.

Limpiar aunque una fase falle.

### 53.2. Regla

La fase LocalStack no necesita credenciales AWS reales.

---

## 54. Política de fallo y limpieza

La automatización debe conservar el fallo original y el resultado del teardown.

### 54.1. Diseño

Registra por separado:

- Resultado de la prueba.
- Resultado de la limpieza.
- Recursos pendientes.
- Acción de recuperación.

### 54.2. Precaución

Un bloque `finally` puede ejecutar limpieza, pero un error allí puede ocultar el fallo previo si no se gestiona.

### 54.3. Regla

No conviertas una limpieza correcta en un resultado global positivo de una prueba fallida.

---

## 55. Preparar destrucción manual

El despliegue manual requiere su propio teardown.

### 55.1. Comandos

```bash
umask 077
terraform -chdir=app state pull > copias/before-destroy.tfstate

terraform -chdir=app plan -destroy \
  -out=../planes/destroy.tfplan

terraform -chdir=app show ../planes/destroy.tfplan
```

### 55.2. Condición

El bucket debe estar vacío tras la prueba funcional.

### 55.3. Regla

Investiga cualquier objeto restante antes de eliminarlo.

---

## 56. Sesión 8: destruir infraestructura

Mantén LocalStack disponible durante la operación.

### 56.1. Secuencia

```bash
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local s3api list-buckets > resultados/buckets-after-destroy.json
aws_local sqs list-queues > resultados/queues-after-destroy.json
```

### 56.2. Resultado esperado

El estado normal queda sin recursos administrados.

### 56.3. Regla

Eso no demuestra por sí solo ausencia de recursos remotos o de pruebas anteriores.

---

## 57. Verificación de ausencia

Compara los identificadores anteriores con inventarios del servicio.

### 57.1. Propiedades

El bucket publicado no debe aparecer en `list-buckets`.

La cola publicada no debe aparecer en `list-queues`.

También deben estar ausentes los nombres temporales con sufijo `-test`.

### 57.2. Finalización

Ejecuta `docker compose down` después de verificar.

### 57.3. Regla

Una consulta fallida por red no demuestra que el recurso haya desaparecido.

---

## 58. Diferencias respecto a AWS real

La estrategia local necesita complementos antes de utilizarse en producción.

### 58.1. Aspectos adicionales

IAM efectivo, KMS, auditoría, cuotas y costes.

Red, rendimiento, propagación y fallos regionales.

Integraciones administradas y políticas externas.

### 58.2. Alcance

La práctica no incorpora pruebas destructivas de resiliencia ni certificaciones de seguridad.

### 58.3. Regla

Utiliza una matriz separada para propiedades no reproducidas por el emulador.

---

## 59. Ejercicios y evaluación

La evaluación debe demostrar estrategia, no únicamente comandos correctos.

### 59.1. Ejercicios

1. Añade una validación completa de retención.
2. Incorpora una prueba negativa relacionada.
3. Verifica la etiqueta `Laboratory`.
4. Demuestra un fallo por deriva.
5. Explica el tratamiento de duplicados.
6. Diseña aislamiento para ejecución paralela.
7. Registra una limpieza fallida y su recuperación.
8. Verifica ausencia de recursos al finalizar.

### 59.2. Entrega

Incluye código, matriz observada, versiones y resultados resumidos; excluye estados y planes.

---

## 60. Resumen de la lección

Una estrategia de pruebas fiable relaciona cada propiedad con una evidencia y un límite.

### 60.1. Ideas esenciales

El análisis estático detecta problemas antes del despliegue.

Las pruebas de plan comprueban contratos conocidos.

Las aplicaciones obtienen resultados calculados.

Las consultas independientes verifican configuración observable.

Las pruebas funcionales ejercitan operaciones concretas.

La limpieza también debe probarse.

### 60.2. Procedimiento recomendado

Aísla, valida, planifica, crea, consulta, ejercita, registra y destruye.

### 60.3. Idea final

**Una infraestructura bien probada no es la que acumula más comandos: es la que demuestra sus propiedades importantes de forma reproducible y explica con precisión qué garantías siguen pendientes.**