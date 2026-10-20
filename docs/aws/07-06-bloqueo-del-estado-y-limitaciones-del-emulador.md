# Bloqueo del estado y limitaciones del emulador con Terraform y LocalStack

El bloqueo del estado evita que dos operaciones compatibles intenten modificar simultáneamente una misma relación de gestión.

Sin ese control, distintas ejecuciones pueden partir de observaciones similares y terminar sobrescribiendo información importante.

Terraform delega parte de este mecanismo en el backend seleccionado.

Por eso, configurar un backend no equivale automáticamente a demostrar que su bloqueo funciona correctamente.

En esta lección utilizarás un backend S3 en LocalStack y observarás un bloqueo real durante una aplicación controlada.

Después practicarás contención, espera, liberación normal, diagnóstico y desbloqueo excepcional.

También separarás las garantías de Terraform de las propiedades que debe reproducir el almacenamiento emulado.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Nunca elimines un bloqueo sin comprobar que ningún proceso continúa escribiendo.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento verificable para estudiar concurrencia sobre el estado.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar qué protege un bloqueo.
- Diferenciar bloqueo y versionado.
- Configurar bloqueo nativo del backend S3.
- Mantener una operación activa de forma controlada.
- Observar el archivo `.tflock`.
- Comprobar contención entre dos ejecuciones.
- Interpretar `-lock-timeout`.
- Investigar un bloqueo aparentemente abandonado.
- Documentar las limitaciones del emulador.

### 1.2. Resultado práctico

Construirás una prueba reproducible con dos directorios conectados al mismo backend y una aplicación temporalmente detenida.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de estado y backends.

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

Utilizaremos Terraform 1.10 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

AWS CLI debe admitir las operaciones S3 utilizadas durante las pruebas.

### 2.3. Motivo

El bloqueo nativo mediante `use_lockfile` requiere Terraform 1.10 o superior.

---

## 3. Compatibilidad que debe validar el docente

El laboratorio depende de comportamientos que deben comprobarse antes de distribuirlo.

### 3.1. Operaciones obligatorias

Valida:

- Escritura y lectura del estado en S3.
- Creación condicional de objetos.
- Creación y eliminación del archivo de bloqueo.
- Versionado y consulta de versiones.
- Contención entre dos procesos.
- Liberación normal.
- Lectura del estado después de una aplicación.
- Creación y eliminación de una cola SQS.

### 3.2. Registro del entorno

Documenta Terraform, AWS CLI, proveedor, Docker e imagen o digest de LocalStack.

### 3.3. Regla

Una API disponible no demuestra por sí sola que su semántica de concurrencia sea equivalente a AWS.

---

## 4. El problema de los escritores concurrentes

Dos procesos pueden tomar decisiones distintas sobre un mismo estado.

### 4.1. Secuencia conceptual

```text
Proceso A lee revisión inicial.
Proceso B lee revisión inicial.
Proceso A aplica y guarda cambios.
Proceso B intenta guardar su resultado.
```

### 4.2. Riesgos

Sin coordinación pueden aparecer:

- Actualizaciones perdidas.
- Relaciones incompletas.
- Planes basados en información antigua.
- Operaciones incompatibles sobre los mismos recursos.

### 4.3. Límite

No todos esos problemas se resuelven únicamente con un archivo de bloqueo.

---

## 5. Qué protege el bloqueo

El bloqueo coordina operaciones sobre un estado concreto cuando todas respetan el mecanismo.

### 5.1. Protección principal

Impide que una segunda operación compatible adquiera el mismo bloqueo mientras la primera lo conserva.

### 5.2. No protege automáticamente

- Otros estados independientes.
- Cambios mediante AWS CLI.
- Aplicaciones que modifican datos.
- Escrituras directas sobre el objeto del estado.
- Configuraciones HCL divergentes.

### 5.3. Regla principal

**El bloqueo protege el acceso coordinado al estado; no convierte toda la infraestructura en una transacción.**

---

## 6. Backend, proveedor y almacenamiento

La prueba necesita distinguir responsabilidades.

### 6.1. Comparación

| **Componente** | **Responsabilidad** | **Ejemplo del laboratorio** |
|---------------|---------------------|-----------------------------|
| Terraform | Coordinar operaciones | Adquirir y liberar bloqueo |
| Backend S3 | Persistir estado y bloqueo | Key y archivo `.tflock` |
| LocalStack | Emular operaciones de servicio | S3 y SQS |
| Proveedor AWS | Administrar recursos | Cola SQS |

Cada componente aporta una parte del comportamiento observado.

### 6.2. Consecuencia

Una lectura correcta de SQS no demuestra que el bloqueo S3 funcione.

### 6.3. Verificación

Las sesiones evaluarán ambas capas por separado.

---

## 7. Bloqueo y versionado no son equivalentes

Estos mecanismos resuelven problemas diferentes.

### 7.1. Comparación

| **Mecanismo** | **Propósito** | **No garantiza** |
|---------------|---------------|------------------|
| Bloqueo | Coordinar operaciones concurrentes | Recuperación de datos |
| Versionado | Conservar revisiones de objetos | Exclusión mutua |
| Copia externa | Conservar una referencia recuperable | Estado actualizado |
| Revisión del plan | Evaluar acciones propuestas | Ausencia de cambios externos |

Conviene combinar estos controles, no intercambiarlos.

### 7.2. Ejemplo

Un bucket versionado puede conservar dos escrituras incompatibles si no existe coordinación adecuada.

### 7.3. Regla

Tener historial no significa que la última versión sea correcta.

---

## 8. Bloqueo nativo del backend S3

Terraform puede utilizar un objeto asociado a la key del estado.

### 8.1. Configuración

```hcl
use_lockfile = true
```

### 8.2. Nombre habitual

Si el estado utiliza:

```text
curso/locking/terraform.tfstate
```

el bloqueo utiliza:

```text
curso/locking/terraform.tfstate.tflock
```

### 8.3. Alcance

La adquisición depende de operaciones de almacenamiento que deben impedir una creación incompatible.

---

## 9. Alternativa histórica con DynamoDB

El backend S3 también ha utilizado una tabla DynamoDB para coordinar bloqueos.

### 9.1. Diferencia

Ese mecanismo incorpora un servicio adicional y una configuración diferente.

### 9.2. Situación del laboratorio

Esta página utiliza exclusivamente bloqueo nativo S3.

No crearás una tabla de bloqueo.

### 9.3. Compatibilidad

La configuración histórica con DynamoDB está deprecada en el backend S3 actual.

### 9.4. Regla

No elimines `use_lockfile` para adaptar silenciosamente la práctica a Terraform antiguo.

### 9.5. Enseñanza

Estudia la alternativa histórica en una práctica separada con versiones y objetivos explícitos.

---

## 10. Diseño de la prueba controlada

Mantendremos una aplicación activa durante un intervalo conocido.

### 10.1. Arquitectura

```text
Directorio A ──→ Backend S3 ──→ Estado compartido
                    │
Directorio B ────────┘
                    │
                    └── Archivo de bloqueo

Proveedor AWS ──→ Cola SQS
```

### 10.2. Pausa didáctica

Un recurso `terraform_data` ejecutará un script local que espera unos segundos.

### 10.3. Precaución

El provisioner existe únicamente para controlar la duración de la prueba.

---

## 11. Preparación del directorio

Trabaja en una carpeta independiente.

### 11.1. Estructura

```bash
mkdir -p terraform-state-locking/app-a
mkdir -p terraform-state-locking/scripts
mkdir -p terraform-state-locking/planes
mkdir -p terraform-state-locking/resultados
mkdir -p terraform-state-locking/copias
cd terraform-state-locking
```

### 11.2. Ejecución

Salvo indicación expresa, ejecuta los comandos desde esta raíz.

### 11.3. Aislamiento

No reutilices el bucket ni el estado de otra lección.

### 11.4. Datos

Utilizaremos únicamente nombres y metadatos ficticios.

---

## 12. Protección de archivos

El estado, los planes y los registros operativos pueden contener información sensible.

### 12.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
backend.local.hcl
app-b/
planes/
resultados/
copias/
crash.log
```

### 12.2. Qué conservar

Versiona configuración, scripts y `.terraform.lock.hcl`.

### 12.3. Precaución

Los metadatos del bloqueo pueden revelar nombres de usuario, rutas y máquinas.

---

## 13. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 13.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 13.2. `compose.yaml`

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

### 13.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 14. Credenciales y conectividad

Configura cada terminal que participe en la práctica.

### 14.1. Preparación

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_SQS

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 14.2. Comprobación

Consulta `s3api list-buckets` y `sqs list-queues` mediante `aws_local`.

---

## 15. Identidad operacional

Define las mismas variables en todas las terminales.

### 15.1. Valores

```bash
export SUFFIX=alumno01
export STATE_BUCKET="curso-locking-state-${SUFFIX}"
export STATE_KEY="curso/locking/terraform.tfstate"
export LOCK_KEY="${STATE_KEY}.tflock"
export QUEUE_NAME="curso-locking-work-${SUFFIX}"
```

### 15.2. Entorno compartido

Cada alumno necesita un sufijo distinto.

### 15.3. Regla

La misma combinación de bucket, key y workspace identifica el estado compartido.

### 15.4. Precaución

Dos keys diferentes no proporcionan un bloqueo común para los mismos objetos remotos.

---

## 16. Sesión 1: preparar el backend

Duración orientativa: 15 minutos.

### 16.1. Bucket y versionado

```bash
aws_local s3api create-bucket \
  --bucket "$STATE_BUCKET"

aws_local s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws_local s3api get-bucket-versioning \
  --bucket "$STATE_BUCKET"
```

### 16.2. Resultado esperado

El bucket existe y el versionado está habilitado.

### 16.3. Propiedad

El bucket pertenece exclusivamente a este laboratorio.

---

## 17. Configuración parcial del backend

Crea `app-a/backend.tf` y el archivo de parámetros.

### 17.1. Declaración

```hcl
terraform {
  backend "s3" {}
}
```

### 17.2. `backend.local.hcl`

```bash
cat > backend.local.hcl <<EOF
bucket = "${STATE_BUCKET}"
key    = "${STATE_KEY}"
region = "us-east-1"

endpoints = {
  s3 = "http://localhost:4566"
}

use_path_style              = true
use_lockfile                = true
skip_credentials_validation = true
skip_metadata_api_check     = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_s3_checksum            = true
EOF
```

---

## 18. Interpretar la configuración local

Las opciones de compatibilidad no son una recomendación general para AWS real.

### 18.1. Endpoint

El backend utiliza explícitamente LocalStack.

La configuración del proveedor no lo sustituye.

### 18.2. Credenciales

Se obtienen de las variables ficticias de la terminal.

### 18.3. Comprobaciones omitidas

Las opciones `skip_*` adaptan el laboratorio y evitan determinadas validaciones.

### 18.4. Regla

Revisa cada opción al trasladar el diseño a otro entorno.

### 18.5. Versiones

El soporte del backend depende de Terraform, no de la versión del proveedor AWS.

---

## 19. Requisitos y proveedor

Crea `app-a/versions.tf` y `app-a/providers.tf`.

### 19.1. Requisitos

```hcl
terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 19.2. Proveedor

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://localhost:4566"
  }
}
```

---

## 20. Variables de la prueba

Crea `app-a/variables.tf`.

### 20.1. Declaraciones

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "probe_generation" {
  type    = string
  default = "baseline"
}

variable "hold_seconds" {
  type    = number
  default = 0

  validation {
    condition = (
      var.hold_seconds >= 0 &&
      var.hold_seconds <= 300 &&
      floor(var.hold_seconds) == var.hold_seconds
    )
    error_message = "Usa un entero entre 0 y 300."
  }
}
```

---

## 21. Recurso remoto y pausa controlada

Crea `app-a/main.tf`.

### 21.1. Configuración

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-locking-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
}

resource "terraform_data" "lock_probe" {
  triggers_replace = [var.probe_generation]

  provisioner "local-exec" {
    command = "python3 \"${abspath(path.module)}/../scripts/hold.py\" ${var.hold_seconds}"
  }
}

output "queue_url" {
  value = aws_sqs_queue.work.id
}
```

### 21.2. Distinción

`terraform_data` no crea un servicio AWS.

Su reemplazo permite repetir la pausa sin reemplazar la cola.

---

## 22. Script de espera

Crea `scripts/hold.py`.

### 22.1. Código

```python
import json
import os
import sys
import time
from pathlib import Path

seconds = int(sys.argv[1])
if not 0 <= seconds <= 300:
    raise SystemExit("Duración fuera del límite del laboratorio.")

root = Path(__file__).resolve().parents[1]
marker = root / "resultados" / "hold-active.json"

record = {
    "pid": os.getpid(),
    "seconds": seconds,
    "started_unix": time.time(),
}
marker.write_text(json.dumps(record), encoding="utf-8")
print(f"Pausa didáctica activa durante {seconds} segundos.", flush=True)

try:
    time.sleep(seconds)
finally:
    marker.unlink(missing_ok=True)
```

### 22.2. Seguridad

No utiliza entrada libre como comando de shell ni modifica el estado directamente.

---

## 23. Sesión 2: aplicación inicial

Primero crea una base estable sin pausa prolongada.

### 23.1. `app-a/terraform.tfvars`

```hcl
suffix           = "alumno01"
probe_generation = "baseline"
hold_seconds     = 0
```

### 23.2. Secuencia

```bash
terraform -chdir=app-a init \
  -backend-config=../backend.local.hcl

terraform -chdir=app-a fmt
terraform -chdir=app-a validate
terraform -chdir=app-a plan -out=../planes/baseline.tfplan
terraform -chdir=app-a apply ../planes/baseline.tfplan
```

### 23.3. Resultado

Se registran dos recursos: una cola SQS y un `terraform_data`.

---

## 24. Preparar el segundo directorio

El directorio B utilizará el mismo backend y la misma configuración.

### 24.1. Copia e inicialización

```bash
mkdir -p app-b

cp app-a/*.tf app-b/
cp app-a/terraform.tfvars app-b/
cp app-a/.terraform.lock.hcl app-b/

terraform -chdir=app-b init \
  -backend-config=../backend.local.hcl

terraform -chdir=app-b state list
terraform -chdir=app-b plan
```

### 24.2. Resultado esperado

B debe leer los dos recursos existentes.

### 24.3. Precaución

No copies `.terraform` ni un archivo de estado local.

---

## 25. Inventario antes de la contención

Conserva una referencia antes de iniciar pruebas concurrentes.

### 25.1. Comandos

```bash
umask 077

terraform -chdir=app-a state pull \
  > copias/before-lock-tests.tfstate

terraform -chdir=app-a output -json \
  > resultados/outputs-before-lock-tests.json

QUEUE_URL="$(terraform -chdir=app-a output -raw queue_url)"
```

### 25.2. Comprobación

Ambos directorios deben seleccionar `default`.

### 25.3. Regla

No comienza la prueba si A y B utilizan keys, workspaces o configuraciones diferentes.

---

## 26. Sesión 3: preparar una aplicación larga

La pausa se activa mediante un reemplazo del recurso didáctico.

### 26.1. Actualizar entradas

En `app-a/terraform.tfvars` utiliza:

```hcl
suffix           = "alumno01"
probe_generation = "hold-001"
hold_seconds     = 120
```

### 26.2. Sincronizar y planificar

```bash
cp app-a/terraform.tfvars app-b/terraform.tfvars

terraform -chdir=app-a plan \
  -out=../planes/hold-001.tfplan

terraform -chdir=app-a show ../planes/hold-001.tfplan
```

### 26.3. Resultado esperado

Solo debe reemplazar `terraform_data.lock_probe`; la cola debe permanecer sin cambios.

---

## 27. Iniciar la operación en la terminal A

La aplicación mantiene una operación real activa durante la espera.

### 27.1. Comando

```bash
terraform -chdir=app-a apply \
  ../planes/hold-001.tfplan
```

### 27.2. Comportamiento

El script imprime el inicio de la pausa.

Terraform continúa ejecutando una aplicación, no está simplemente detenido antes de adquirir el bloqueo.

### 27.3. Terminal B

Utiliza otra terminal situada en la raíz del mismo laboratorio.

### 27.4. Regla

No hagas comprobaciones concurrentes hasta confirmar la existencia del bloqueo real.

---

## 28. Observar el archivo de bloqueo

La terminal B puede consultar el objeto mediante AWS CLI.

### 28.1. Descarga

```bash
aws_local s3api get-object \
  --bucket "$STATE_BUCKET" \
  --key "$LOCK_KEY" \
  resultados/active-lock.json \
  > resultados/active-lock-metadata.json

jq '.' resultados/active-lock.json
```

### 28.2. Condición

La operación debe completarse mientras A sigue esperando.

### 28.3. Si no existe

Comprueba duración, key, workspace y configuración efectiva.

### 28.4. Regla

La ausencia del archivo impide interpretar esta ejecución como una prueba válida de contención.

---

## 29. Interpretar los metadatos

El contenido del bloqueo ayuda a investigar qué operación lo mantiene.

### 29.1. Información habitual

Puedes encontrar:

- ID del bloqueo.
- Operación.
- Información adicional.
- Usuario y equipo.
- Versión de Terraform.
- Fecha de creación.
- Ruta del estado.

### 29.2. Identificador

Conserva el ID mostrado; no inventes otro a partir del nombre del objeto.

### 29.3. Límite

La fecha y el usuario son indicios, no una demostración de que el proceso continúa vivo.

---

## 30. Sesión 4: probar contención

La segunda operación debe respetar el bloqueo existente.

### 30.1. Terminal B

```bash
terraform -chdir=app-b plan \
  -lock-timeout=5s
```

### 30.2. Resultado esperado

B debe esperar y terminar con un error de adquisición si A sigue manteniendo el bloqueo.

### 30.3. Evidencia

Guarda salida, código de salida e ID de bloqueo informado.

### 30.4. Distinción

El error de adquisición no significa que SQS esté fallando.

### 30.5. Regla

Si B consigue operar mientras A conserva el mismo bloqueo, investiga antes de continuar.

---

## 31. Capturar el resultado sin perder el código

La automatización debe distinguir un fallo esperado de otros errores.

### 31.1. Comandos

```bash
set +e

terraform -chdir=app-b plan -lock-timeout=5s \
  > resultados/contender.stdout.txt \
  2> resultados/contender.stderr.txt

CONTENDER_CODE=$?
set -e

printf '%s\n' "$CONTENDER_CODE" \
  > resultados/contender.exit-code.txt
```

### 31.2. Interpretación

Un código no nulo es necesario, pero no suficiente.

### 31.3. Verificación

Comprueba que el motivo es adquisición de bloqueo, no configuración inválida o falta de conectividad.

---

## 32. Sesión 5: comprobar liberación normal

Espera a que la aplicación A termine correctamente.

### 32.1. Comprobaciones

```bash
terraform -chdir=app-b plan

terraform -chdir=app-a state pull \
  > copias/after-hold-001.tfstate

aws_local s3api head-object \
  --bucket "$STATE_BUCKET" \
  --key "$LOCK_KEY"
```

### 32.2. Resultado esperado

El plan B debe funcionar sin cambios.

La consulta del bloqueo actual debe indicar ausencia del objeto.

### 32.3. Precaución

Distingue `Not Found` de errores de autorización o conexión.

---

## 33. Versiones históricas del bloqueo

Eliminar un archivo actual no elimina necesariamente su historial.

### 33.1. Consulta

```bash
aws_local s3api list-object-versions \
  --bucket "$STATE_BUCKET" \
  --prefix "$LOCK_KEY" \
  > resultados/lock-history.json

jq --arg key "$LOCK_KEY" '
  {
    versions: [.Versions[]? | select(.Key == $key)],
    markers: [.DeleteMarkers[]? | select(.Key == $key)]
  }
' resultados/lock-history.json
```

### 33.2. Interpretación

Una versión histórica no significa que exista un bloqueo activo.

### 33.3. Regla

Evalúa el objeto actual, los procesos y la operación, no solamente el historial.

---

## 34. Sesión 6: comprobar espera suficiente

Ahora B esperará más tiempo que la duración restante de A.

### 34.1. Nueva generación

Cambia las entradas de ambos directorios a:

```hcl
probe_generation = "hold-002"
hold_seconds     = 30
```

Conserva también el sufijo.

### 34.2. Terminal A

Revisa un plan nuevo y aplícalo.

### 34.3. Terminal B

Después de observar el bloqueo, ejecuta:

```bash
terraform -chdir=app-b plan -lock-timeout=90s
```

### 34.4. Resultado

B debe poder continuar cuando A termine y libere el bloqueo.

---

## 35. Qué significa `-lock-timeout`

Esta opción define cuánto tiempo está dispuesta a esperar una operación por el bloqueo.

### 35.1. No significa

- Duración máxima del bloqueo.
- Caducidad del archivo.
- Timeout de creación de recursos.
- Tiempo máximo del proveedor.
- Permiso para quitar un bloqueo existente.

### 35.2. Ejemplo

`-lock-timeout=90s` no obliga al primer proceso a terminar en 90 segundos.

### 35.3. Regla

Un bloqueo antiguo no se vuelve seguro de eliminar porque otro proceso haya agotado su espera.

---

## 36. Prueba separada de escritura condicional

Puedes evaluar una propiedad del emulador sin escribir sobre el bloqueo de Terraform.

### 36.1. Key independiente

Utiliza:

```text
probes/conditional-create.txt
```

### 36.2. Comprobar AWS CLI

```bash
aws_local s3api put-object \
  --generate-cli-skeleton input \
  > resultados/put-object-skeleton.json

jq -e 'has("IfNoneMatch")' \
  resultados/put-object-skeleton.json
```

### 36.3. Condición

Si tu CLI no admite esa entrada, actualiza la herramienta validada antes de realizar la prueba.

---

## 37. Sesión 7: creación condicional secuencial

La segunda creación no debe sobrescribir un objeto actual existente.

### 37.1. Preparación y primer envío

```bash
printf 'writer-A\n' > resultados/conditional-a.txt
printf 'writer-B\n' > resultados/conditional-b.txt

aws_local s3api put-object \
  --bucket "$STATE_BUCKET" \
  --key probes/conditional-create.txt \
  --body resultados/conditional-a.txt \
  --if-none-match '*'
```

### 37.2. Segundo envío

Repite con `conditional-b.txt` y la misma condición.

### 37.3. Resultado esperado

Debe rechazarse porque ya existe una versión actual del objeto.

### 37.4. Evidencia

Descarga el objeto y comprueba que sigue conteniendo `writer-A`.

---

## 38. Interpretar la prueba condicional

Un rechazo solo es útil si corresponde a la condición evaluada.

### 38.1. Errores diferentes

No confundas un rechazo condicional con:

- CLI incompatible.
- Bucket inexistente.
- Endpoint incorrecto.
- Falta de permisos.
- Error de red.
- Archivo local inexistente.

### 38.2. Concurrencia

Una prueba secuencial no demuestra el comportamiento ante dos solicitudes simultáneas.

### 38.3. Regla

Documenta exactamente qué propiedad comprobaste y cuál permanece sin evaluar.

---

## 39. Prueba concurrente como ampliación

El docente puede añadir dos creaciones condicionales sobre una key nueva por ronda.

### 39.1. Diseño

Lanza dos procesos casi simultáneamente.

Cada proceso envía un cuerpo diferente con `If-None-Match: *`.

Conserva salida, error y código de cada uno.

### 39.2. Criterio

Para una exclusión correcta no deben completarse dos creaciones incompatibles sobre la misma versión actual.

### 39.3. Respuestas

Un conflicto concurrente puede necesitar interpretación o reintento, no equivaler exactamente al rechazo secuencial.

### 39.4. Límite

Superar varias rondas no constituye una certificación general de atomicidad bajo cualquier carga.

---

## 40. Limitaciones relevantes del emulador

La emulación puede diferir en semántica, latencia y recuperación.

### 40.1. Aspectos a revisar

Comprueba:

- Escrituras condicionales.
- Manejo de conflictos.
- Errores devueltos.
- Visibilidad de objetos.
- Versionado.
- Comportamiento al reiniciar.
- Persistencia.
- Aplicación de políticas.

### 40.2. Regla

Describe resultados observados para una combinación concreta; evita afirmar equivalencia total con AWS.

---

## 41. Diagnóstico de un bloqueo aparentemente abandonado

La investigación debe comenzar sin modificar el archivo.

### 41.1. Lista de comprobación

Identifica:

- Bucket, key y workspace.
- ID del bloqueo.
- Operación informada.
- Terminal o proceso propietario.
- Host o agente de ejecución.
- Último mensaje de Terraform.
- Posibles procesos hijos.
- Cambios pendientes en el servicio.

### 41.2. Precaución

Un PID de otro equipo no puede validarse consultando únicamente tu máquina.

---

## 42. Interrupción segura de una operación

No utilices una terminación forzada como primera herramienta de diagnóstico.

### 42.1. Procedimiento

En una sesión opcional, inicia otra pausa y envía una única interrupción normal a Terraform.

Espera a que el programa gestione la cancelación.

Observa si el script termina y si el bloqueo se libera.

### 42.2. Precaución

Una segunda interrupción puede forzar la salida y aumentar la incertidumbre.

### 42.3. Estado parcial

La cancelación puede dejar recursos creados o un provisioner fallido.

### 42.4. Regla

Revisa estado y plan completo después; no presupongas una reversión automática.

---

## 43. `force-unlock`: procedimiento excepcional

Este comando solicita liberar un bloqueo del backend seleccionado.

### 43.1. Ejemplo conceptual

```bash
terraform -chdir=app-a force-unlock ID_REAL_DEL_BLOQUEO
```

### 43.2. Condiciones previas

El ID debe coincidir con el bloqueo investigado.

Debes haber demostrado que ningún proceso sigue escribiendo sobre ese estado.

Conserva metadatos y una copia recuperable cuando sea posible.

### 43.3. No ejecutar rutinariamente

La práctica principal libera los bloqueos de forma normal.

### 43.4. Regla

No utilices `-force` para evitar una confirmación que todavía necesitas revisar.

---

## 44. Por qué no eliminar `.tflock` manualmente

Una eliminación directa puede saltarse parte del procedimiento de Terraform.

### 44.1. Riesgo

Un escritor activo podría continuar mientras otro adquiere un nuevo bloqueo.

### 44.2. Resultado posible

Ambos procesos tendrían expectativas incompatibles sobre la exclusividad de la operación.

### 44.3. Versionado

Recuperar una versión antigua del bloqueo tampoco restaura automáticamente su propiedad legítima.

### 44.4. Regla

No edites su contenido ni lo fabriques sobre la key real para simular una operación activa.

### 44.5. Enseñanza

Utiliza una operación real o una key de pruebas independiente.

---

## 45. Seguridad y coordinación en AWS real

El bloqueo necesita permisos y procesos operativos coherentes.

### 45.1. Permisos

Revisa lectura y escritura del estado.

El archivo de bloqueo también necesita permisos adecuados de creación, lectura y eliminación.

### 45.2. Controles adicionales

Utiliza políticas de mínimo privilegio, historial, cifrado y auditoría.

### 45.3. Equipos

Coordina configuración mediante control de versiones y ejecución supervisada.

### 45.4. Límite

Dos configuraciones diferentes pueden generar decisiones contradictorias aunque sus aplicaciones se ejecuten una después de otra.

---

## 46. Verificación final y recuperación operacional

Antes de limpiar, deja una configuración estable y sin escritores activos.

### 46.1. Comandos

```bash
terraform -chdir=app-a state list
terraform -chdir=app-a plan

terraform -chdir=app-a state pull \
  > copias/final-before-destroy.tfstate

aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn VisibilityTimeout
```

### 46.2. Resultado

La cola conserva su identidad y los recursos están reconciliados.

### 46.3. Precaución

Un marcador local antiguo no demuestra actividad; comprueba procesos y bloqueo actual.

---

## 47. Destruir la aplicación con el backend disponible

El estado debe seguir accesible durante la destrucción.

### 47.1. Secuencia

```bash
terraform -chdir=app-a plan -destroy \
  -out=../planes/destroy-app.tfplan

terraform -chdir=app-a show ../planes/destroy-app.tfplan
terraform -chdir=app-a apply ../planes/destroy-app.tfplan

terraform -chdir=app-a state list
aws_local sqs list-queues
```

### 47.2. Resultado

Se retiran la cola y el recurso didáctico.

### 47.3. Precaución

No operes simultáneamente desde B durante esta secuencia.

---

## 48. Desconectar el backend antes de eliminarlo

Conserva el estado final y migra A hacia un backend local.

### 48.1. Configuración final de `app-a/backend.tf`

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 48.2. Migración

```bash
terraform -chdir=app-a init -migrate-state
terraform -chdir=app-a state list
```

### 48.3. Directorio B

No vuelvas a utilizarlo después de retirar el backend S3.

### 48.4. Regla

Eliminar el bucket antes de completar destrucción y exportación rompe el procedimiento.

---

## 49. Limpiar versiones y cerrar LocalStack

El bucket dedicado puede contener estado, bloqueos históricos y objetos de prueba.

### 49.1. Inventario

```bash
aws_local s3api list-object-versions \
  --bucket "$STATE_BUCKET" \
  > resultados/final-bucket-inventory.json
```

### 49.2. Eliminación controlada

Revisa todas las entradas.

Elimina cada versión y cada delete marker utilizando su key y `VersionId` exactos.

### 49.3. Cierre

Cuando el bucket esté vacío, ejecuta `delete-bucket` y después `docker compose down`.

### 49.4. Precaución

No apliques limpieza masiva sobre un bucket compartido o con contenido ajeno.

---

## 50. Ejercicios, evaluación y resumen

La práctica se completa cuando puedes explicar qué prueba cada evidencia.

### 50.1. Ejercicios

1. Observa un bloqueo durante una aplicación real.
2. Demuestra un rechazo por contención.
3. Comprueba espera suficiente y liberación normal.
4. Distingue bloqueo actual e historial versionado.
5. Evalúa una escritura condicional sobre una key independiente.
6. Documenta un procedimiento de investigación de bloqueos abandonados.
7. Explica por qué `-lock=false` no resuelve la concurrencia.
8. Destruye y limpia en el orden correcto.

### 50.2. Criterio de evaluación

Entrega versiones del entorno, metadatos, resultados de contención y límites explícitos de la emulación.

### 50.3. Idea final

**Un bloqueo solo aporta seguridad cuando todos los escritores lo respetan y el almacenamiento reproduce sus condiciones: observar, verificar y coordinar importa tanto como activar una opción.**