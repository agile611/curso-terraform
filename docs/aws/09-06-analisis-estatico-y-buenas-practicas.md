# Análisis estático y buenas prácticas con Terraform y LocalStack

El análisis estático permite detectar errores y decisiones arriesgadas antes de modificar la infraestructura.

Terraform incorpora comprobaciones de formato y consistencia, pero esas comprobaciones no cubren todos los problemas de calidad, mantenimiento o seguridad.

Herramientas como TFLint y Checkov complementan ese trabajo mediante reglas adicionales.

LocalStack permite continuar la verificación con recursos emulados, sin utilizar una cuenta real de AWS.

En esta lección construirás un laboratorio S3 y SQS, analizarás su configuración y practicarás un flujo de corrección antes del despliegue.

También aprenderás a distinguir un hallazgo relevante, una limitación del analizador y una excepción justificada.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los analizadores no certifican la seguridad de la infraestructura.
>
> Las configuraciones negativas se analizan, pero no se despliegan.

---

## 1. Objetivos de aprendizaje

Esta lección establece un procedimiento reproducible para revisar configuración Terraform.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar formato, validación, linting y análisis de seguridad.
- Ejecutar comprobaciones antes de crear recursos.
- Configurar una selección explícita de reglas.
- Interpretar hallazgos y códigos de salida.
- Corregir problemas sin introducir excepciones indiscriminadas.
- Automatizar una puerta de calidad.
- Verificar recursos mediante LocalStack.
- Documentar limitaciones y riesgos pendientes.

### 1.2. Resultado práctico

Crearás un bucket S3 y una cola SQS después de superar controles estáticos seleccionados.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de recursos, variables y estado.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
tflint --version
checkov --version
jq --version
```

### 2.2. Conocimientos recomendados

Revisa las lecciones sobre credenciales locales, IAM, estado y validaciones.

---

## 3. Versiones y reproducibilidad

Una misma configuración puede producir hallazgos diferentes con versiones distintas.

### 3.1. Referencias del laboratorio

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

Las versiones de TFLint y Checkov deben fijarse después de validarlas.

### 3.2. Registro mínimo

Conserva:

- Versión de cada herramienta.
- Versión seleccionada del proveedor.
- Imagen o digest de LocalStack.
- Configuración de reglas.
- Fecha de ejecución.

### 3.3. Regla principal

**Un informe reproducible necesita código, herramientas y reglas identificables.**

---

## 4. Compatibilidad que debe validar el docente

Las herramientas deben comprobarse antes de distribuir la práctica.

### 4.1. Comprobaciones obligatorias

Valida:

- Disponibilidad de las reglas TFLint seleccionadas.
- Identificadores Checkov utilizados.
- Códigos de salida ante hallazgos.
- Análisis de los ejemplos negativos.
- Creación y consulta de recursos S3 y SQS.
- Destrucción del laboratorio.
- Ejecución del script de calidad.

### 4.2. Alcance

La instalación de herramientas puede requerir Internet.

El despliegue no requiere AWS real.

---

## 5. Qué significa análisis estático

El análisis estático examina configuración sin ejecutar el flujo completo de la aplicación.

### 5.1. Puede detectar

- Formato inconsistente.
- Declaraciones sin utilizar.
- Construcciones problemáticas.
- Ausencia de controles declarados.
- Patrones de permisos amplios.
- Incumplimientos de convenciones.

### 5.2. No demuestra automáticamente

Disponibilidad, autorización efectiva ni comportamiento real de consumidores.

### 5.3. Regla

Interpreta el informe como evidencia sobre configuración, no como una prueba integral.

---

## 6. Capas de verificación

Cada herramienta observa una parte diferente del proyecto.

### 6.1. Comparación

| **Capa** | **Herramienta** | **Propósito principal** |
|----------|----------------|------------------------|
| Formato | `terraform fmt` | Consistencia de escritura |
| Consistencia | `terraform validate` | Validez interna |
| Calidad | TFLint | Reglas de uso y mantenimiento |
| Seguridad declarada | Checkov | Patrones y controles |
| Cambios propuestos | `terraform plan` | Acciones previstas |

Estas capas se complementan.

### 6.2. Verificación adicional

AWS CLI y pruebas funcionales comprueban propiedades observables en LocalStack.

### 6.3. Regla

No sustituyas todas las capas por una sola herramienta.

---

## 7. Formato no equivale a seguridad

Una configuración bien formateada puede seguir siendo peligrosa.

### 7.1. Ejemplo

Un permiso con acciones y recursos globales puede superar `terraform fmt`.

### 7.2. Motivo

El formateador no decide si el permiso es adecuado para la aplicación.

### 7.3. Uso correcto

Emplea formato para reducir ruido en revisiones.

Después analiza comportamiento, acceso y ciclo de vida.

### 7.4. Regla

Un archivo ordenado facilita revisar; no garantiza que esté bien diseñado.

---

## 8. Validación no equivale a despliegue seguro

`terraform validate` revisa la consistencia de la configuración.

### 8.1. Puede detectar

Argumentos no admitidos.

Referencias incorrectas.

Incompatibilidades de tipos.

### 8.2. No debes asumir

Que todas las entradas operacionales son correctas.

Que los endpoints son locales.

Que IAM se aplica correctamente.

### 8.3. Regla

Valida primero, pero conserva plan y verificación independiente.

---

## 9. Qué aporta TFLint

TFLint aplica reglas de calidad y uso sobre configuración Terraform.

### 9.1. Laboratorio básico

Utilizaremos reglas del ruleset Terraform integrado.

### 9.2. Ampliación opcional

El ruleset AWS puede comprobar propiedades específicas del proveedor.

### 9.3. Precaución

Los plugins tienen su propia versión y proceso de instalación.

### 9.4. Regla

No añadas un plugin sin registrar su procedencia y versión.

---

## 10. Qué aporta Checkov

Checkov analiza configuración de infraestructura mediante comprobaciones seleccionadas.

### 10.1. Laboratorio

Utilizaremos una selección pequeña de controles S3.

### 10.2. Motivo

Permite relacionar cada hallazgo con un recurso y una corrección concreta.

### 10.3. Límite

Superar esos controles no equivale a superar todos los controles disponibles.

### 10.4. Regla

Publica el alcance de reglas junto con el resultado.

---

## 11. Hallazgos y contexto

Un hallazgo describe una posible discrepancia con una regla.

### 11.1. Preguntas de revisión

Determina:

- Qué recurso afecta.
- Qué propiedad falta.
- Qué riesgo intenta reducir.
- Si la configuración está completa.
- Si la regla interpreta correctamente el contexto.
- Qué corrección o excepción procede.

### 11.2. Regla

No corrijas por número de hallazgos sin entender su significado.

---

## 12. Falsos positivos y falsos negativos

Los analizadores pueden equivocarse o no observar toda la configuración.

### 12.1. Falso positivo

La herramienta señala un problema que no existe en el contexto evaluado.

### 12.2. Falso negativo

La herramienta no señala un riesgo que sí existe.

### 12.3. Otros límites

Una expresión desconocida o un módulo no analizado puede reducir visibilidad.

### 12.4. Regla

Una excepción necesita evidencia; un resultado limpio necesita alcance explícito.

---

## 13. Arquitectura del laboratorio

Separaremos infraestructura desplegable y configuraciones negativas.

### 13.1. Organización

```text
app/
    ├── Bucket S3 con controles seleccionados
    └── Cola SQS

negative/
    ├── unused/      → Hallazgo TFLint
    └── s3/          → Hallazgo Checkov

scripts/
    └── quality-gate.py

resultados/
    └── Informes y evidencias
```

### 13.2. Regla

Los directorios negativos nunca se aplican.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Estructura

```bash
mkdir -p terraform-static-analysis/app
mkdir -p terraform-static-analysis/negative/unused
mkdir -p terraform-static-analysis/negative/s3
mkdir -p terraform-static-analysis/scripts
mkdir -p terraform-static-analysis/planes
mkdir -p terraform-static-analysis/resultados
mkdir -p terraform-static-analysis/copias
cd terraform-static-analysis
```

### 14.2. Ejecución

Los comandos se ejecutan desde esta raíz.

---

## 15. Protección de artefactos

Los informes pueden contener contexto operativo y, en determinados casos, información sensible.

### 15.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
planes/
resultados/
copias/
crash.log
```

### 15.2. Qué conservar

Versiona configuración, scripts, reglas y `.terraform.lock.hcl`.

### 15.3. Precaución

Excluir archivos no elimina contenido ya publicado.

---

## 16. Permisos locales

Reduce exposición accidental de informes y planes.

### 16.1. Preparación

```bash
umask 077
chmod 700 planes resultados copias
```

### 16.2. Alcance

Estas instrucciones utilizan permisos POSIX.

### 16.3. Otros sistemas

Configura ACL equivalentes cuando corresponda.

### 16.4. Regla

No publiques informes completos sin revisar su contenido.

---

## 17. Imagen validada

Selecciona una imagen reproducible de LocalStack.

### 17.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. Recomendación

Utiliza una etiqueta fija o un digest.

### 17.3. Servicios

La práctica necesita S3 y SQS.

### 17.4. Regla

No uses una etiqueta flotante como única referencia de reproducibilidad.

---

## 18. Docker Compose

Publica LocalStack únicamente en la interfaz local.

### 18.1. `compose.yaml`

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

### 18.2. Alcance

No necesitas montar el socket Docker.

### 18.3. Arranque

Ejecuta `docker compose up -d`.

---

## 19. Credenciales y conectividad

Prepara un contexto ficticio y local.

### 19.1. Configuración

```bash
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

### 19.2. Regla

Todas las consultas AWS deben utilizar el endpoint local.

---

## 20. Requisitos de Terraform

Crea `app/versions.tf`.

### 20.1. Configuración

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

### 20.2. Estado

El laboratorio no necesita un backend AWS remoto.

---

## 21. Proveedor local

Crea `app/providers.tf`.

### 21.1. Configuración

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

### 21.2. Regla

Las opciones de omisión no convierten automáticamente un destino en local.

---

## 22. Variables y etiquetas

Crea `app/variables.tf`.

### 22.1. Contrato de entrada

```hcl
variable "suffix" {
  description = "Identificador del alumno."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

locals {
  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
    Course     = "TerraformAWS"
  }
}
```

### 22.2. Regla

Cada alumno debe utilizar un sufijo diferente.

---

## 23. Bucket y bloqueo público

Crea `app/storage.tf`.

### 23.1. Recursos

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "curso-static-${var.suffix}"
  force_destroy = false
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 23.2. Propósito

El bloqueo público declara restricciones adicionales de acceso.

### 23.3. Límite

La declaración no demuestra enforcement equivalente a AWS.

---

## 24. Versionado y cifrado declarados

Completa `app/storage.tf`.

### 24.1. Recursos adicionales

```hcl
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 24.2. Regla

Consultar esta configuración no certifica cifrado físico del almacenamiento de LocalStack.

---

## 25. Cola SQS

Crea `app/messaging.tf`.

### 25.1. Configuración

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-static-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  sqs_managed_sse_enabled     = true

  tags = local.tags
}
```

### 25.2. Alcance

No crearemos DLQ ni consumidores.

### 25.3. Regla

El cifrado declarado no sustituye permisos mínimos ni tratamiento seguro del mensaje.

---

## 26. Entradas y outputs

Crea `app/terraform.tfvars` y `app/outputs.tf`.

### 26.1. Entrada

```hcl
suffix = "alumno01"
```

### 26.2. Resultados

```hcl
output "lab" {
  description = "Identificadores de los recursos del laboratorio."

  value = {
    bucket_name = aws_s3_bucket.data.id
    queue_url   = aws_sqs_queue.work.id
  }
}
```

### 26.3. Regla

Los outputs publican referencias, no contenido de mensajes.

---

## 27. Configuración TFLint

Crea `.tflint.hcl` en la raíz.

### 27.1. Ruleset básico

```hcl
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}
```

### 27.2. Compatibilidad

El docente debe verificar este esquema con la versión fijada.

### 27.3. Regla

Los resultados pueden cambiar al actualizar el ruleset.

---

## 28. Plugin AWS opcional

El laboratorio básico no depende del plugin AWS de TFLint.

### 28.1. Ampliación

Puedes incorporarlo después de validar su versión y reglas.

### 28.2. Instalación

`TFLint --init` instala plugins configurados que lo requieren.

El comando real utiliza `tflint --init` en minúsculas.

### 28.3. Procedencia

Revisa origen y política de verificación de plugins.

### 28.4. Regla

No mezcles una actualización de plugin con otras correcciones sin registrar ambos cambios.

---

## 29. Selección de controles Checkov

La práctica utiliza controles S3 concretos.

### 29.1. Alcance seleccionado

| **Identificador** | **Propiedad esperada** | **Recurso relacionado** |
|------------------|------------------------|--------------------------|
| `CKV_AWS_21` | Versionado habilitado | Bucket S3 |
| `CKV_AWS_53` | Bloqueo de ACL públicas | Bloqueo público S3 |
| `CKV_AWS_54` | Bloqueo de políticas públicas | Bloqueo público S3 |
| `CKV_AWS_55` | Ignorar ACL públicas | Bloqueo público S3 |
| `CKV_AWS_56` | Restringir buckets públicos | Bloqueo público S3 |

Los identificadores deben comprobarse en la versión instalada.

### 29.2. Alcance excluido

Esta selección no evalúa todos los controles S3 ni toda la configuración SQS.

### 29.3. Regla

No denomines “seguridad completa” a cinco comprobaciones seleccionadas.

---

## 30. Sesión 1: formato y validación

Duración orientativa: 20 minutos.

### 30.1. Comandos

```bash
terraform -chdir=app init
terraform fmt -recursive app

terraform fmt -check -diff -recursive app
terraform -chdir=app validate
```

### 30.2. Resultado esperado

La comprobación de formato y la validación terminan correctamente.

### 30.3. Regla

Utiliza `fmt` sin `-check` para corregir; utiliza `-check` para evaluar.

---

## 31. Sesión 2: linting

Ejecuta TFLint sobre el proyecto desplegable.

### 31.1. Comandos

```bash
ROOT="$(pwd)"

tflint \
  --chdir=app \
  --config="$ROOT/.tflint.hcl" \
  --format=compact
```

### 31.2. Resultado esperado

No aparecen declaraciones sin utilizar.

### 31.3. Diagnóstico

Si aparecen otras reglas, revisa el preset y la versión.

### 31.4. Regla

No desactives el preset completo para eliminar un hallazgo aislado.

---

## 32. Sesión 3: análisis de seguridad

Ejecuta únicamente los controles seleccionados.

### 32.1. Comando

```bash
checkov \
  --directory app \
  --framework terraform \
  --check CKV_AWS_21,CKV_AWS_53,CKV_AWS_54,CKV_AWS_55,CKV_AWS_56
```

### 32.2. Resultado esperado

Los controles aplicables se satisfacen con la configuración validada.

### 32.3. Revisión

Comprueba también cuántos controles y recursos se analizaron.

### 32.4. Regla

Un resultado sin fallos y sin controles ejecutados no demuestra conformidad.

---

## 33. Ejemplo negativo TFLint

Crea `negative/unused/main.tf`.

### 33.1. Configuración de contraste

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
}

variable "unused_name" {
  description = "Entrada deliberadamente sin uso."
  type        = string
  default     = "fictitious"
}
```

### 33.2. Seguridad

Este ejemplo no contiene recursos AWS.

### 33.3. Regla

Su finalidad es demostrar que una entrada válida puede resultar innecesaria.

---

## 34. Sesión 4: observar el hallazgo TFLint

La prueba debe terminar con un diagnóstico identificable.

### 34.1. Comando

```bash
tflint \
  --chdir=negative/unused \
  --config="$ROOT/.tflint.hcl" \
  --format=compact
```

### 34.2. Resultado esperado

La regla de declaraciones sin utilizar identifica `unused_name`.

### 34.3. Corrección

Elimina la variable o incorpora un uso justificado en una copia de trabajo.

### 34.4. Regla

No añadas un uso artificial solo para silenciar la herramienta.

---

## 35. Ejemplo negativo Checkov

Crea `negative/s3/main.tf`.

### 35.1. Configuración de contraste

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
}

resource "aws_s3_bucket" "example" {
  bucket = "curso-negative-not-for-deployment"
}
```

### 35.2. Propósito

El ejemplo omite intencionadamente la configuración de versionado.

### 35.3. Regla

No inicialices ni apliques este directorio para demostrar el hallazgo.

---

## 36. Sesión 5: observar el hallazgo Checkov

Analiza la configuración negativa sin crear infraestructura.

### 36.1. Comando

```bash
checkov \
  --directory negative/s3 \
  --framework terraform \
  --check CKV_AWS_21
```

### 36.2. Resultado esperado

El control de versionado identifica una discrepancia.

### 36.3. Corrección

Añade un recurso de versionado en una copia del ejemplo y repite.

### 36.4. Regla

Conserva el ejemplo negativo original como fixture de prueba.

---

## 37. Capturar códigos de salida

La automatización necesita diferenciar éxito, hallazgo y error operacional.

### 37.1. Ejemplo Bash

```bash
set +e
checkov --directory negative/s3 --framework terraform \
  --check CKV_AWS_21 \
  > resultados/negative-checkov.stdout.txt \
  2> resultados/negative-checkov.stderr.txt
CODE=$?
set -e

printf '%s\n' "$CODE" > resultados/negative-checkov.exit.txt
```

### 37.2. Regla

Un código no nulo también puede indicar argumentos incorrectos o fallos de ejecución.

### 37.3. Interpretación

Revisa el diagnóstico antes de clasificarlo como hallazgo esperado.

---

## 38. Diseñar una puerta de calidad

La puerta de calidad ejecutará las comprobaciones del proyecto desplegable.

### 38.1. Orden

Utilizaremos:

1. Comprobación de formato.
2. Inicialización controlada.
3. Validación.
4. TFLint.
5. Checkov.

### 38.2. Comportamiento

Un fallo detiene las fases siguientes.

### 38.3. Regla

La puerta no modifica automáticamente la configuración ni aplica recursos.

---

## 39. Script de calidad: estructura

Crea `scripts/quality-gate.py`.

### 39.1. Código inicial

```python
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
REPORTS = ROOT / "resultados" / "quality"
REPORTS.mkdir(parents=True, exist_ok=True)

def executable(name):
    binary = shutil.which(name)
    if binary is None:
        raise SystemExit(f"No se encuentra {name}.")
    return binary

terraform = executable("terraform")
tflint = executable("tflint")
checkov = executable("checkov")
```

### 39.2. Continuación

Añade las fases de la siguiente sección.

---

## 40. Script de calidad: fases

Añade la lista de comandos.

### 40.1. Configuración

```python
phases = [
    ("fmt", [terraform, "fmt", "-check", "-diff", "-recursive", str(APP)]),
    ("init", [
        terraform, f"-chdir={APP}", "init",
        "-backend=false", "-input=false", "-lockfile=readonly",
    ]),
    ("validate", [terraform, f"-chdir={APP}", "validate", "-no-color"]),
    ("tflint", [
        tflint, f"--chdir={APP}",
        f"--config={ROOT / '.tflint.hcl'}", "--format=compact",
    ]),
    ("checkov", [
        checkov, "--directory", str(APP),
        "--framework", "terraform",
        "--check", "CKV_AWS_21,CKV_AWS_53,CKV_AWS_54,CKV_AWS_55,CKV_AWS_56",
        "--output", "json",
    ]),
]
```

### 40.2. Requisito

El archivo de bloqueo debe existir antes de ejecutar la fase readonly.

---

## 41. Script de calidad: ejecución

Completa `scripts/quality-gate.py`.

### 41.1. Implementación

```python
summary = []

for name, command in phases:
    result = subprocess.run(
        command, cwd=ROOT, capture_output=True, text=True
    )

    (REPORTS / f"{name}.stdout.txt").write_text(
        result.stdout, encoding="utf-8"
    )
    (REPORTS / f"{name}.stderr.txt").write_text(
        result.stderr, encoding="utf-8"
    )

    summary.append({"phase": name, "exit_code": result.returncode})
    (REPORTS / "summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    print(f"{name}: exit_code={result.returncode}")
    if result.returncode != 0:
        raise SystemExit("Puerta de calidad detenida. Revisa los informes.")

print("Puerta de calidad superada para el alcance configurado.")
```

---

## 42. Límites del script

La puerta ejecuta herramientas; no crea una frontera de seguridad.

### 42.1. No garantiza

Aislamiento de red.

Integridad de binarios.

Ausencia de secretos en informes.

Análisis completo de módulos externos.

Seguridad de configuración arbitraria.

### 42.2. Regla

Utilízala con herramientas confiables y código revisado.

### 42.3. Mejora

Un entorno CI puede fijar binarios, permisos y dependencias de forma adicional.

---

## 43. Sesión 6: ejecutar la puerta

La aplicación debe permanecer sin desplegar hasta superar las comprobaciones.

### 43.1. Comandos

```bash
python3 -m py_compile scripts/quality-gate.py
python3 scripts/quality-gate.py

cat resultados/quality/summary.json
```

### 43.2. Resultado esperado

Todas las fases registran código cero.

### 43.3. Revisión

Consulta el informe Checkov y verifica controles ejecutados.

### 43.4. Regla

No interpretes una fase omitida como una fase superada.

---

## 44. Sesión 7: demostrar un bloqueo

Introduce un cambio de calidad reversible en `app`.

### 44.1. Ejercicio

Añade una variable sin utilizar.

Formatea el archivo.

Ejecuta la puerta de calidad.

### 44.2. Resultado esperado

TFLint detiene la ejecución.

Checkov no se ejecuta en ese recorrido.

### 44.3. Recuperación

Elimina la declaración y repite la puerta.

### 44.4. Regla

No corrijas el bloqueo desactivando la regla.

---

## 45. Sesión 8: planificar y desplegar

El despliegue utiliza una decisión revisada después del análisis.

### 45.1. Secuencia

```bash
terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan

terraform -chdir=app output -json lab > resultados/lab.json
```

### 45.2. Resultado esperado

Se crean cinco recursos administrados.

### 45.3. Regla

No reutilices un plan si cambió la configuración relevante después de su generación.

---

## 46. Sesión 9: verificar S3

Consulta controles declarados mediante el servicio emulado.

### 46.1. Comandos

```bash
BUCKET="$(jq -er '.bucket_name' resultados/lab.json)"

aws_local s3api get-bucket-versioning --bucket "$BUCKET"
aws_local s3api get-public-access-block --bucket "$BUCKET"
aws_local s3api get-bucket-encryption --bucket "$BUCKET"
```

### 46.2. Resultado esperado

Versionado habilitado, cuatro restricciones públicas y configuración AES256.

### 46.3. Regla

Estas respuestas verifican configuración observable, no aislamiento criptográfico ni autorización completa.

---

## 47. Sesión 10: verificar SQS

Comprueba atributos y una operación funcional sencilla.

### 47.1. Comandos

```bash
QUEUE_URL="$(jq -er '.queue_url' resultados/lab.json)"

aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names VisibilityTimeout MessageRetentionPeriod SqsManagedSseEnabled

aws_local sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body '{"event_id":"STATIC-001","purpose":"functional-check"}'
```

### 47.2. Regla

La prueba de envío no demuestra procesamiento de consumidores ni ausencia de duplicados.

---

## 48. Comparar evidencia estática y operacional

Ambas evidencias deben conservar sus límites.

### 48.1. Comparación

| **Evidencia** | **Demuestra** | **No demuestra** |
|---------------|--------------|------------------|
| Checkov | Controles seleccionados declarados | Enforcement |
| TFLint | Reglas de calidad satisfechas | Funcionamiento HTTP o de mensajes |
| Plan | Acciones previstas | Resultado final completo |
| AWS CLI | Configuración consultada | Seguridad integral |
| Mensaje enviado | Operación funcional concreta | Procesamiento exactamente una vez |

El conjunto ofrece más información que cualquiera de sus partes.

### 48.2. Regla

Relaciona cada conclusión con la evidencia que realmente la sostiene.

---

## 49. Excepciones documentadas

Una excepción puede ser válida, pero necesita revisión y caducidad.

### 49.1. Registro mínimo

Incluye regla, recurso, motivo y riesgo residual.

Añade responsable, fecha de revisión y control compensatorio.

### 49.2. Evitar

No justifiques una excepción únicamente con “es LocalStack”.

### 49.3. Regla

La sintaxis exacta de supresión debe validarse para la herramienta utilizada.

### 49.4. Preferencia

Corrige el diseño cuando resulte viable.

---

## 50. No convertir avisos en ruido permanente

Una lista extensa de hallazgos ignorados reduce utilidad de la revisión.

### 50.1. Procedimiento

Clasifica problemas.

Prioriza según impacto.

Define tareas de corrección.

Revisa excepciones vencidas.

### 50.2. Regla

No uses opciones de soft-fail o supresiones globales sin documentar el cambio de política.

### 50.3. Distinción

Un escaneo informativo y una puerta bloqueante son políticas diferentes.

---

## 51. Análisis de planes y datos sensibles

Algunos analizadores pueden examinar representaciones JSON de planes.

### 51.1. Ventaja

Pueden observar valores resueltos y cambios propuestos.

### 51.2. Riesgo

La exportación JSON puede contener valores sensibles anteriores y nuevos.

### 51.3. Laboratorio

La puerta utiliza configuración, no exportaciones del plan.

### 51.4. Regla

Añade análisis de planes solo con protección de acceso, retención y revisión de compatibilidad.

---

## 52. Buenas prácticas de mantenimiento

La calidad también depende de decisiones que no cubren las reglas seleccionadas.

### 52.1. Recomendaciones

Separa proveedores, recursos y outputs de forma comprensible.

Describe entradas y restricciones.

Fija versiones compatibles.

Versiona el archivo de bloqueo.

Mantén módulos con responsabilidades claras.

### 52.2. Regla

Evita reorganizaciones que cambien direcciones de recursos sin una migración planificada.

---

## 53. Dependencias y cadena de suministro

Los analizadores y plugins también son dependencias ejecutables.

### 53.1. Controles recomendados

Fija versiones y orígenes.

Utiliza métodos de instalación verificados.

Revisa cambios de reglas.

Protege caches y entornos de ejecución.

### 53.2. Regla

No descargues y ejecutes scripts arbitrarios como atajo para instalar herramientas.

### 53.3. Reproducibilidad

Un entorno virtual Python puede aislar dependencias de Checkov, pero no sustituye su verificación.

---

## 54. Integración en CI

La puerta puede ejecutarse automáticamente antes de aceptar cambios.

### 54.1. Flujo recomendado

Instala herramientas fijadas.

Comprueba dependencias.

Ejecuta formato, validación y análisis.

Publica un resumen limitado.

Bloquea promoción cuando corresponda.

### 54.2. Credenciales

La fase estática no necesita credenciales AWS reales.

### 54.3. Regla

Separa análisis, pruebas LocalStack y promoción a otros entornos.

---

## 55. Diagnóstico de fallos de herramientas

No todos los errores corresponden a la configuración analizada.

### 55.1. Lista de revisión

Comprueba versión, plugin y sintaxis de argumentos.

Verifica directorio analizado y reglas habilitadas.

Revisa inicialización y archivo de bloqueo.

### 55.2. Regla

No clasifiques un fallo de instalación como un hallazgo de seguridad.

### 55.3. Evidencia

Conserva stdout, stderr y código de salida con acceso restringido.

---

## 56. Preparar la limpieza

El bucket del ejemplo permanece vacío y no administra objetos.

### 56.1. Copia y revisión

```bash
umask 077
terraform -chdir=app state pull > copias/before-destroy.tfstate

terraform -chdir=app plan -destroy \
  -out=../planes/destroy.tfplan

terraform -chdir=app show ../planes/destroy.tfplan
```

### 56.2. Precaución

Si cargaste objetos, elimina también sus versiones antes de destruir.

### 56.3. Regla

Versionado implica que borrar solo la versión actual puede dejar contenido histórico.

---

## 57. Destruir y verificar

Mantén LocalStack disponible durante la destrucción.

### 57.1. Secuencia

```bash
terraform -chdir=app apply ../planes/destroy.tfplan
terraform -chdir=app state list

aws_local s3api list-buckets
aws_local sqs list-queues
docker compose down
```

### 57.2. Resultado esperado

Desaparecen los recursos del laboratorio.

### 57.3. Artefactos

Revisa informes, planes y copias antes de conservarlos o compartirlos.

---

## 58. Diferencias respecto a AWS real

La emulación permite validar integración y configuración observable.

### 58.1. Aspectos adicionales

En AWS real revisa IAM, KMS, auditoría, costes y protección de datos.

### 58.2. Controles declarados

LocalStack puede no reproducir completamente cada mecanismo de seguridad.

### 58.3. Análisis

Las herramientas estáticas no conocen automáticamente todas las políticas externas.

### 58.4. Regla

No declares un despliegue listo para producción por superar esta práctica.

---

## 59. Ejercicios y evaluación

La evaluación debe demostrar detección, corrección y comprensión del alcance.

### 59.1. Ejercicios

1. Corrige un problema de formato.
2. Detecta una declaración sin utilizar.
3. Identifica el control de versionado.
4. Demuestra bloqueo de la puerta.
5. Corrige sin desactivar reglas.
6. Verifica atributos en LocalStack.
7. Documenta una excepción hipotética.
8. Destruye y revisa artefactos.

### 59.2. Entrega

Incluye código, versiones, resumen de fases y evidencias revisadas; excluye estados y planes.

---

## 60. Resumen de la lección

El análisis estático ayuda a detectar problemas antes del despliegue, siempre que su alcance sea explícito.

### 60.1. Ideas esenciales

Formato, validación, calidad y seguridad declarada son capas diferentes.

Las reglas seleccionadas deben identificarse y mantenerse.

Un resultado limpio necesita controles realmente ejecutados.

Las excepciones requieren justificación y revisión.

LocalStack complementa el análisis con observación operacional.

Los informes también necesitan protección.

### 60.2. Procedimiento recomendado

Formatea, valida, analiza, revisa el plan, despliega, verifica y limpia.

### 60.3. Idea final

**Una puerta de calidad fiable no promete encontrar todos los riesgos: detecta problemas concretos de forma reproducible y deja claras las comprobaciones que todavía deben realizarse.**