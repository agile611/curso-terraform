# Credenciales locales y prevención de despliegues accidentales en AWS

Un laboratorio con LocalStack debe mantener una separación explícita respecto a cualquier cuenta real de AWS.

Esa separación no depende únicamente de utilizar una contraseña ficticia.

También depende de los endpoints, la cadena de credenciales, los perfiles disponibles, el backend de Terraform y el entorno desde el que ejecutas los comandos.

En esta lección construirás un procedimiento que reduce errores accidentales mediante varias capas de protección.

Configurarás credenciales ficticias, endpoints locales y un ejecutor que prepara un entorno controlado para Terraform y AWS CLI.

Después comprobarás el comportamiento ante perfiles heredados, variables inesperadas y una interrupción de LocalStack.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Ningún script de esta página sustituye una política de red ni una frontera de seguridad del sistema operativo.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento reproducible para reducir despliegues accidentales.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar credenciales y endpoints.
- Reconocer fuentes de credenciales heredadas.
- Configurar Terraform exclusivamente para el laboratorio.
- Utilizar AWS CLI con un endpoint explícito.
- Separar configuración local y configuración personal.
- Comprobar fallos sin utilizar AWS real.
- Documentar las garantías y limitaciones del procedimiento.

### 1.2. Resultado práctico

Crearás un bucket S3 y una cola SQS usando un entorno de ejecución preparado para LocalStack.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Terraform.

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

## 3. Compatibilidad del laboratorio

El docente debe validar el entorno antes de distribuir la práctica.

### 3.1. Comprobaciones obligatorias

Valida:

- Publicación de LocalStack en la interfaz local.
- Creación y consulta de buckets S3.
- Creación y consulta de colas SQS.
- Uso de credenciales ficticias.
- Ejecución del wrapper Python.
- Fallo controlado cuando LocalStack no está disponible.
- Destrucción y limpieza.

### 3.2. Registro

Documenta Terraform, proveedor, AWS CLI, Docker e imagen o digest de LocalStack.

### 3.3. Alcance

La práctica evalúa prevención de errores, no resistencia frente a código malicioso.

---

## 4. El riesgo que queremos reducir

Una configuración local puede ejecutarse desde una terminal que conserva acceso a AWS real.

### 4.1. Fuentes habituales de confusión

Pueden existir:

- Un perfil AWS seleccionado.
- Credenciales temporales exportadas.
- Un backend remoto del trabajo.
- Endpoints sin configurar.
- Scripts auxiliares con comandos diferentes.
- Proveedores adicionales o alias.

### 4.2. Consecuencia

Una operación que parecía local puede intentar acceder a servicios externos.

### 4.3. Regla principal

**Comprueba identidad, destino y contexto antes de aplicar cambios.**

---

## 5. Credenciales y endpoints son decisiones diferentes

Las credenciales identifican al cliente; el endpoint determina el destino de la solicitud.

### 5.1. Comparación

| **Elemento** | **Pregunta que responde** | **Valor del laboratorio** |
|--------------|---------------------------|---------------------------|
| Access key | ¿Qué identidad presenta el cliente? | `test` |
| Secret key | ¿Con qué dato firma? | `test` |
| Región | ¿Qué región lógica utiliza? | `us-east-1` |
| Endpoint | ¿Dónde envía solicitudes? | `http://127.0.0.1:4566` |

Estas decisiones deben revisarse conjuntamente.

### 5.2. Precaución

Una región localmente simulada no modifica automáticamente el endpoint.

### 5.3. Regla

`us-east-1` no significa LocalStack.

---

## 6. Qué aportan las credenciales ficticias

Las credenciales ficticias evitan utilizar deliberadamente una identidad AWS real.

### 6.1. Valor didáctico

Utilizaremos:

```text
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### 6.2. Limitación

Esos valores no impiden por sí solos enviar tráfico a Internet.

### 6.3. Otra limitación

Un componente distinto podría seleccionar otra fuente de credenciales.

### 6.4. Regla

Las credenciales ficticias son una capa, no una garantía completa de aislamiento.

---

## 7. Qué aportan los endpoints locales

Un endpoint explícito dirige las solicitudes del cliente correspondiente a LocalStack.

### 7.1. Dirección utilizada

```text
http://127.0.0.1:4566
```

### 7.2. Alcance

El endpoint debe configurarse para cada herramienta y servicio utilizado.

### 7.3. Precaución

Configurar S3 no configura automáticamente SQS.

### 7.4. Regla

No añadas recursos de otros servicios sin revisar su configuración de acceso.

---

## 8. Qué no aporta una región

La región participa en la configuración y firma de solicitudes.

### 8.1. Error frecuente

Suponer que una región ficticia evita cualquier conexión externa.

### 8.2. Problema

El cliente puede seguir construyendo destinos externos o producir errores diferentes.

### 8.3. Laboratorio

Utilizamos una región conocida con endpoints locales explícitos.

### 8.4. Regla

No uses una región inválida como mecanismo principal de prevención.

---

## 9. Cadena de credenciales

Las herramientas AWS pueden buscar credenciales en varias fuentes.

### 9.1. Fuentes posibles

Incluyen variables de entorno, perfiles, archivos compartidos y mecanismos de identidad temporal.

### 9.2. Otros mecanismos

Pueden intervenir SSO, procesos externos, web identity y credenciales de contenedor o instancia.

### 9.3. Diferencias

La precedencia concreta depende de la herramienta y sus versiones.

### 9.4. Regla

No presupongas que todas las herramientas seleccionan credenciales exactamente igual.

---

## 10. Archivos personales de AWS

Una máquina de trabajo puede conservar perfiles válidos.

### 10.1. Archivos habituales

```text
~/.aws/config
~/.aws/credentials
```

### 10.2. Riesgo

Un comando sin configuración suficiente puede utilizar esos archivos.

### 10.3. Laboratorio

No los editaremos ni los eliminaremos.

### 10.4. Regla

Aísla la práctica sin destruir la configuración personal del alumno.

---

## 11. Variables que merecen revisión

La terminal puede conservar decisiones de ejecuciones anteriores.

### 11.1. Ejemplos

```text
AWS_PROFILE
AWS_DEFAULT_PROFILE
AWS_SESSION_TOKEN
AWS_ROLE_ARN
AWS_WEB_IDENTITY_TOKEN_FILE
AWS_ENDPOINT_URL
TF_WORKSPACE
TF_CLI_ARGS
```

### 11.2. Precaución

No imprimas todos los valores para investigar.

### 11.3. Regla

Inspecciona nombres y presencia; evita revelar secretos.

---

## 12. Credenciales temporales

Las credenciales temporales suelen incorporar un token de sesión.

### 12.1. Confusión posible

Sobrescribir access key y secret key sin retirar un token heredado produce un contexto incoherente.

### 12.2. Laboratorio

El entorno preparado no incluirá un token de sesión.

### 12.3. Regla

Configura el conjunto de identidad de forma coherente.

### 12.4. Precaución

No copies tokens reales a archivos del laboratorio.

---

## 13. Proveedor y backend

Terraform utiliza mecanismos diferentes para administrar recursos y conservar estado.

### 13.1. Comparación

| **Componente** | **Responsabilidad** | **Decisión del laboratorio** |
|---------------|---------------------|------------------------------|
| Proveedor AWS | Administrar S3 y SQS | Endpoints locales |
| Backend | Conservar el estado | Local |
| AWS CLI | Verificar recursos | Endpoint explícito |
| Docker | Ejecutar LocalStack | Puerto local |

Cada componente necesita una revisión independiente.

### 13.2. Consecuencia

El endpoint del proveedor no configura un backend S3.

### 13.3. Regla

Un backend olvidado puede contactar AWS aunque los recursos apunten a LocalStack.

---

## 14. Alias de proveedores

Una configuración puede declarar varias instancias del proveedor AWS.

### 14.1. Riesgo

Un alias puede conservar credenciales o endpoints diferentes.

### 14.2. Módulos

Una llamada puede recibir un proveedor mediante el argumento `providers`.

### 14.3. Laboratorio

Utilizaremos una única configuración AWS predeterminada.

### 14.4. Regla

Revisa todos los proveedores utilizados, no solo el primer bloque del archivo.

---

## 15. Scripts y provisioners

No todas las operaciones de una ejecución pasan por el proveedor AWS.

### 15.1. Ejemplos

Un provisioner puede ejecutar AWS CLI.

Un data source externo puede lanzar un programa.

Un script de limpieza puede utilizar otras credenciales.

### 15.2. Laboratorio

No utilizaremos provisioners ni programas externos desde Terraform.

### 15.3. Regla

El endpoint del proveedor no controla automáticamente comandos arbitrarios.

---

## 16. Defensa por capas

La prevención debe combinar controles que cubren riesgos diferentes.

### 16.1. Capas utilizadas

Aplicaremos:

- Credenciales ficticias.
- Endpoints explícitos.
- Archivos AWS dedicados.
- Entorno reconstruido.
- Backend local.
- Comprobación de conectividad.
- Revisión del plan.

### 16.2. Capa adicional

El aislamiento de red puede reforzar el procedimiento.

---

## 17. Garantías y límites

Debes explicar con precisión qué protege cada control.

### 17.1. Comparación

| **Control** | **Aporta** | **No demuestra** |
|-------------|------------|------------------|
| Credenciales `test` | Identidad ficticia | Ausencia de tráfico externo |
| Endpoint explícito | Destino del cliente configurado | Seguridad de otro cliente |
| Wrapper | Entorno preparado | Aislamiento de código arbitrario |
| Backend local | Estado sin backend AWS | Ausencia de recursos externos |
| Política de red | Restricción de conectividad | Corrección de la configuración |

Los controles se complementan.

### 17.2. Regla

No describas el wrapper como una sandbox de seguridad.

### 17.3. Alcance

Esta página prioriza errores accidentales en código revisado.

---

## 18. Arquitectura del laboratorio

La práctica utilizará dos servicios emulados y estado local.

### 18.1. Recorrido

```text
Wrapper Python
    ├── Terraform ──→ S3 y SQS en LocalStack
    │      └── Estado local
    └── AWS CLI ────→ Endpoint local explícito
```

### 18.2. Recursos

Crearemos un bucket y una cola.

### 18.3. Datos

Cargaremos un archivo ficticio y enviaremos un mensaje de prueba.

---

## 19. Preparación del directorio

Trabaja en una carpeta independiente.

### 19.1. Estructura

```bash
mkdir -p terraform-local-credentials/app
mkdir -p terraform-local-credentials/scripts
mkdir -p terraform-local-credentials/planes
mkdir -p terraform-local-credentials/resultados
mkdir -p terraform-local-credentials/copias
mkdir -p terraform-local-credentials/archivos
cd terraform-local-credentials
```

### 19.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 19.3. Aislamiento

No copies `.terraform` ni estados de otros proyectos.

---

## 20. Protección de archivos

Separa configuración y artefactos operativos.

### 20.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.sandbox/
.env
planes/
resultados/
copias/
archivos/
crash.log
```

### 20.2. Qué conservar

Versiona código, scripts y `.terraform.lock.hcl`.

---

## 21. Imagen validada

Selecciona una imagen reproducible.

### 21.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 21.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 21.3. Edición

Verifica las capacidades requeridas en la edición utilizada.

### 21.4. Regla

No confíes en una etiqueta flotante para reproducir resultados de seguridad.

---

## 22. Docker Compose

Publica LocalStack únicamente en la interfaz local.

### 22.1. `compose.yaml`

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

### 22.2. Arranque

Ejecuta `docker compose up -d`.

### 22.3. Alcance

No montaremos el socket Docker dentro de LocalStack.

---

## 23. Interfaz local y red

Publicar en loopback reduce exposición directa del puerto.

### 23.1. Qué aporta

Otros equipos no deberían acceder mediante ese enlace publicado como si fuera una interfaz pública.

### 23.2. Qué no aporta

No bloquea el tráfico saliente de Terraform.

No impide que otros procesos locales contacten LocalStack.

### 23.3. Regla

La dirección de escucha y la política de salida son decisiones distintas.

---

## 24. Requisitos de Terraform

Crea `app/versions.tf`.

### 24.1. Configuración

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

### 24.2. Estado

La práctica no necesita un backend S3.

---

## 25. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 25.1. Configuración

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

### 25.2. Decisión deliberada

No permitiremos introducir credenciales reales mediante variables Terraform.

---

## 26. Opciones de omisión

Las opciones `skip_*` adaptan este laboratorio, no autorizan una configuración insegura universal.

### 26.1. Validación de credenciales

Se omite la comprobación inicial correspondiente.

### 26.2. Metadata

Se evita la comprobación de metadata configurada por el proveedor.

### 26.3. Cuenta

Se evita solicitar el identificador de cuenta en ese paso.

### 26.4. Regla

Estas opciones no convierten automáticamente todos los endpoints en locales.

---

## 27. Variables y recursos

Crea `app/variables.tf` y `app/main.tf`.

### 27.1. Identidad

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 27.2. Recursos

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "curso-local-only-${var.suffix}"
  force_destroy = false
}

resource "aws_sqs_queue" "work" {
  name                       = "curso-local-only-${var.suffix}"
  visibility_timeout_seconds = 30
}
```

---

## 28. Entradas y outputs

Crea `app/terraform.tfvars` y `app/outputs.tf`.

### 28.1. Entradas

```hcl
suffix = "alumno01"
```

### 28.2. Salidas

```hcl
output "bucket_name" {
  value = aws_s3_bucket.data.id
}

output "queue_url" {
  value = aws_sqs_queue.work.id
}
```

### 28.3. Entorno compartido

Cada alumno debe utilizar un sufijo diferente.

---

## 29. Diseñar el ejecutor local

El wrapper reconstruirá el entorno de los procesos hijos.

### 29.1. Objetivos

Evitará heredar directamente perfiles, tokens y argumentos Terraform del shell.

Proporcionará archivos AWS dedicados.

Fijará endpoint y región para AWS CLI.

### 29.2. Límite

No interpretará exhaustivamente el HCL ni bloqueará código arbitrario.

### 29.3. Regla

Utilízalo únicamente con la configuración revisada de esta práctica.

---

## 30. Wrapper: estructura inicial

Crea `scripts/lab.py`.

### 30.1. Imports y constantes

```python
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
SANDBOX = ROOT / ".sandbox"
ENDPOINT = "http://127.0.0.1:4566"
REGION = "us-east-1"
```

### 30.2. Continuación

Añade las siguientes secciones al mismo archivo.

---

## 31. Wrapper: archivos dedicados

El proceso hijo no utilizará los archivos AWS personales del alumno.

### 31.1. Preparación

```python
def prepare_files():
    SANDBOX.mkdir(mode=0o700, parents=True, exist_ok=True)
    home = SANDBOX / "home"
    home.mkdir(mode=0o700, exist_ok=True)

    credentials = SANDBOX / "credentials"
    config = SANDBOX / "config"
    terraform_config = SANDBOX / "terraform.rc"

    credentials.write_text(
        "[default]\naws_access_key_id = test\naws_secret_access_key = test\n",
        encoding="utf-8",
    )
    config.write_text(
        "[default]\nregion = us-east-1\noutput = json\n",
        encoding="utf-8",
    )
    terraform_config.write_text(
        "disable_checkpoint = true\n",
        encoding="utf-8",
    )

    for file in (credentials, config, terraform_config):
        file.chmod(0o600)

    return home, credentials, config, terraform_config
```

---

## 32. Wrapper: entorno reconstruido

Se copiará una lista limitada de variables del sistema.

### 32.1. Implementación

```python
def child_environment():
    home, credentials, config, terraform_config = prepare_files()

    keep = ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR"]
    environment = {
        key: os.environ[key]
        for key in keep
        if key in os.environ
    }

    environment.update({
        "HOME": str(home),
        "USERPROFILE": str(home),
        "LANG": "C.UTF-8",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test",
        "AWS_DEFAULT_REGION": REGION,
        "AWS_REGION": REGION,
        "AWS_CONFIG_FILE": str(config),
        "AWS_SHARED_CREDENTIALS_FILE": str(credentials),
        "AWS_EC2_METADATA_DISABLED": "true",
        "AWS_PAGER": "",
        "AWS_CLI_AUTO_PROMPT": "off",
        "TF_CLI_CONFIG_FILE": str(terraform_config),
        "TF_IN_AUTOMATION": "true",
    })
    return environment
```

---

## 33. Wrapper: comprobar disponibilidad

El ejecutor comprobará un destino local antes de continuar.

### 33.1. Función

```python
def check_localstack():
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({})
    )
    url = ENDPOINT + "/_localstack/health"

    try:
        with opener.open(url, timeout=3) as response:
            if response.status != 200:
                raise RuntimeError("Respuesta inesperada.")
            json.loads(response.read().decode("utf-8"))
    except Exception as error:
        raise SystemExit(
            "LocalStack no está disponible. No se ejecuta la operación."
        ) from error
```

### 33.2. Límite

La comprobación no identifica criptográficamente al proceso que escucha en el puerto.

---

## 34. Wrapper: selección de herramientas

El ejecutor utilizará binarios disponibles en el sistema.

### 34.1. Función auxiliar

```python
def executable(name):
    result = shutil.which(name)
    if result is None:
        raise SystemExit(f"No se encuentra la herramienta {name}.")
    return result
```

### 34.2. Precaución

El `PATH` sigue siendo una dependencia de confianza.

### 34.3. Entorno gestionado

El docente puede fijar rutas absolutas de herramientas verificadas.

### 34.4. Regla

El wrapper no verifica firmas ni integridad de los binarios instalados.

---

## 35. Wrapper: limitar comandos AWS

La CLI utilizará únicamente los servicios del laboratorio.

### 35.1. Construcción del comando

```python
def aws_command(arguments):
    if not arguments or arguments[0] not in {"s3api", "sqs"}:
        raise SystemExit("Solo se permiten s3api y sqs en esta práctica.")

    forbidden = {
        "--endpoint-url", "--region", "--profile",
        "--no-sign-request", "--ca-bundle",
    }
    for argument in arguments:
        if argument.split("=", 1)[0] in forbidden:
            raise SystemExit("No se permite sobrescribir el contexto AWS.")

    return [
        executable("aws"),
        "--endpoint-url", ENDPOINT,
        "--region", REGION,
        "--output", "json",
        *arguments,
    ]
```

### 35.2. Alcance

La lista restringe servicios, no constituye una política granular de autorización.

---

## 36. Wrapper: limitar comandos Terraform

La ejecución utilizará siempre el directorio `app`.

### 36.1. Construcción

```python
def terraform_command(arguments):
    allowed = {
        "init", "fmt", "validate", "plan", "apply",
        "show", "output", "state", "providers", "workspace",
    }
    if not arguments or arguments[0] not in allowed:
        raise SystemExit("Comando Terraform no previsto.")

    for argument in arguments:
        if argument.startswith(("-chdir", "-backend-config")):
            raise SystemExit("No se permite alterar directorio o backend.")

    if arguments[0] == "state":
        if len(arguments) < 2 or arguments[1] not in {"list", "pull", "show"}:
            raise SystemExit("Solo se permiten consultas del estado.")

    if arguments[0] == "workspace" and arguments[1:] != ["show"]:
        raise SystemExit("Solo se permite consultar el workspace.")

    return [executable("terraform"), f"-chdir={APP}", *arguments]
```

---

## 37. Wrapper: punto de entrada

Completa `scripts/lab.py`.

### 37.1. Ejecución

```python
def main():
    if len(sys.argv) < 2:
        raise SystemExit("Uso: python3 scripts/lab.py terraform|aws|context ...")

    tool = sys.argv[1]
    arguments = sys.argv[2:]
    environment = child_environment()

    if tool == "context":
        print(json.dumps({
            "endpoint": ENDPOINT,
            "region": REGION,
            "credentials": "fictitious",
            "aws_files": "dedicated",
            "backend": "local-in-reviewed-configuration",
        }, indent=2))
        return

    command = (
        aws_command(arguments) if tool == "aws"
        else terraform_command(arguments) if tool == "terraform"
        else None
    )
    if command is None:
        raise SystemExit("Herramienta no permitida.")

    check_localstack()
    raise SystemExit(subprocess.call(command, cwd=ROOT, env=environment))

if __name__ == "__main__":
    main()
```

---

## 38. Revisar límites del wrapper

El script es una ayuda operacional, no una frontera absoluta.

### 38.1. Limitaciones deliberadas

No analiza todos los argumentos Terraform.

No impide editar la configuración.

No bloquea binarios maliciosos ni plugins arbitrarios.

No aplica una política de red.

### 38.2. Uso previsto

Código revisado, herramientas confiables y alumnos que desean evitar errores.

### 38.3. Regla

No ejecutes configuraciones de terceros suponiendo que este wrapper las vuelve seguras.

---

## 39. Sesión 1: inspeccionar contexto

Duración orientativa: 15 minutos.

### 39.1. Comandos

```bash
python3 -m py_compile scripts/lab.py
python3 scripts/lab.py context

docker compose ps
curl --silent --show-error \
  http://127.0.0.1:4566/_localstack/health
```

### 39.2. Resultado esperado

El contexto indica endpoint local y credenciales ficticias.

### 39.3. Precaución

La salida de contexto describe el procedimiento, no certifica una configuración modificada posteriormente.

---

## 40. Sesión 2: inicializar Terraform

La inicialización descarga el proveedor requerido.

### 40.1. Comandos

```bash
python3 scripts/lab.py terraform init
python3 scripts/lab.py terraform fmt
python3 scripts/lab.py terraform validate
python3 scripts/lab.py terraform workspace show
python3 scripts/lab.py terraform providers
```

### 40.2. Resultado esperado

El workspace es `default` y solo se necesita el proveedor AWS declarado.

### 40.3. Red externa

La descarga del proveedor puede necesitar Internet, aunque no una cuenta AWS.

---

## 41. Instalación y despliegue son fases diferentes

No toda conexión externa corresponde a un despliegue AWS.

### 41.1. Instalación

Terraform puede consultar registros y descargar paquetes.

### 41.2. Operación

El proveedor utiliza los endpoints configurados para los servicios.

### 41.3. Entorno sin Internet

Necesita proveedores preparados mediante un mirror o procedimiento equivalente.

### 41.4. Regla

Define qué tráfico permites en cada fase y por qué.

---

## 42. Sesión 3: revisar el plan

La revisión confirma recursos, nombres y acciones.

### 42.1. Comandos

```bash
python3 scripts/lab.py terraform plan \
  -out=../planes/create.tfplan

python3 scripts/lab.py terraform show \
  ../planes/create.tfplan
```

### 42.2. Resultado esperado

El plan crea un bucket y una cola.

### 42.3. Límite

El plan no muestra necesariamente todas las decisiones de endpoint de cada cliente.

### 42.4. Regla

La revisión de configuración sigue siendo necesaria.

---

## 43. Sesión 4: aplicar y verificar

La aplicación debe operar exclusivamente sobre los servicios locales configurados.

### 43.1. Comandos

```bash
python3 scripts/lab.py terraform apply ../planes/create.tfplan
python3 scripts/lab.py terraform state list

python3 scripts/lab.py terraform output -json \
  > resultados/outputs.json

BUCKET="$(jq -er '.bucket_name.value' resultados/outputs.json)"
QUEUE_URL="$(jq -er '.queue_url.value' resultados/outputs.json)"
```

### 43.2. Resultado esperado

Existen dos recursos administrados.

### 43.3. Identidad

Los nombres deben contener el sufijo del alumno.

---

## 44. Sesión 5: consultar con AWS CLI

Las consultas utilizan el mismo contexto local preparado.

### 44.1. Comandos

```bash
python3 scripts/lab.py aws s3api head-bucket \
  --bucket "$BUCKET"

python3 scripts/lab.py aws sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn VisibilityTimeout
```

### 44.2. Resultado

La consulta confirma el bucket y la cola.

### 44.3. Regla

No sustituyas el comando por un `aws` sin endpoint para comparar resultados.

---

## 45. Sesión 6: datos ficticios

Comprueba escritura y lectura sin utilizar información personal.

### 45.1. Carga

```bash
printf 'Archivo ficticio del laboratorio\n' > archivos/example.txt

python3 scripts/lab.py aws s3api put-object \
  --bucket "$BUCKET" \
  --key example.txt \
  --body archivos/example.txt
```

### 45.2. Mensaje

Publica un mensaje ficticio mediante `sqs send-message`.

### 45.3. Alcance

Los datos se eliminarán durante la limpieza.

---

## 46. Sesión 7: variables heredadas ficticias

Demuestra aislamiento sin introducir credenciales reales.

### 46.1. Prueba

```bash
AWS_PROFILE=perfil-inexistente \
AWS_SESSION_TOKEN=TOKEN-FICTICIO \
AWS_ENDPOINT_URL=http://127.0.0.1:9999 \
TF_WORKSPACE=workspace-inexistente \
TF_CLI_ARGS=-input=false \
python3 scripts/lab.py terraform plan
```

### 46.2. Resultado esperado

El wrapper reconstruye el entorno y la configuración revisada continúa usando LocalStack.

### 46.3. Regla

No utilices una cuenta real para demostrar este comportamiento.

---

## 47. Sesión 8: rechazar sobrescrituras

El ejecutor debe impedir cambios explícitos del contexto AWS.

### 47.1. Prueba segura

```bash
python3 scripts/lab.py aws s3api list-buckets \
  --endpoint-url=http://127.0.0.1:9999
```

### 47.2. Resultado esperado

El wrapper rechaza el argumento antes de ejecutar AWS CLI.

### 47.3. Otra prueba

Repite con `--profile=perfil-inexistente`.

### 47.4. Regla

Utiliza destinos locales inexistentes; no pruebes apuntando a AWS real.

---

## 48. Sesión 9: fallo cerrado

La indisponibilidad de LocalStack no debe activar un destino alternativo.

### 48.1. Comandos

```bash
docker compose stop localstack
python3 scripts/lab.py terraform plan
docker compose start localstack
```

### 48.2. Resultado esperado

El wrapper informa que LocalStack no está disponible.

### 48.3. Precaución

Espera disponibilidad antes de continuar.

### 48.4. Regla

No implementes un fallback hacia endpoints AWS.

---

## 49. El servicio puede caer después del preflight

Una comprobación inicial no mantiene el servicio disponible.

### 49.1. Situación

LocalStack puede detenerse durante un plan o una aplicación.

### 49.2. Comportamiento esperado

Los clientes configurados con endpoints locales fallan contra ese destino.

### 49.3. Límite

Puede quedar infraestructura parcial o una actualización de estado pendiente.

### 49.4. Regla

Investiga el resultado y vuelve a planificar; no presupongas rollback automático.

---

## 50. Revisar el backend

El backend local es una decisión explícita del laboratorio.

### 50.1. Comprobación

Inspecciona `app/versions.tf` y los mensajes de inicialización.

### 50.2. Riesgo heredado

Un directorio copiado puede conservar metadatos de otro backend.

### 50.3. Prevención

Empieza desde un directorio nuevo sin `.terraform`.

### 50.4. Regla

No uses `init -reconfigure` como sustituto de localizar y proteger un estado existente.

---

## 51. Revisar credenciales sin revelarlas

La investigación debe evitar filtraciones.

### 51.1. No ejecutar rutinariamente

Evita publicar `env`, archivos de credenciales o logs completos.

### 51.2. Alternativa

Registra presencia de variables y rutas utilizadas, no sus valores secretos.

### 51.3. Laboratorio

Los únicos valores de identidad requeridos son `test`.

### 51.4. Regla

En una máquina compartida, trata capturas y logs como posibles fuentes de exposición.

---

## 52. Restricción de red como capa adicional

La red puede reforzar la prevención cuando necesitas mayores garantías.

### 52.1. Objetivo

Permitir la conexión con LocalStack y bloquear destinos AWS no autorizados.

### 52.2. Implementación

Puede utilizar políticas del host, una máquina virtual o un entorno de ejecución gestionado.

### 52.3. Precaución

No existe una regla universal segura para todos los sistemas del alumno.

### 52.4. Regla

El docente debe probar conectividad, DNS y descarga de dependencias antes de aplicar restricciones.

---

## 53. Límites de bloquear dominios

Una lista de dominios no siempre constituye aislamiento completo.

### 53.1. Problemas

Existen endpoints regionales, variantes, proxies y direcciones resueltas.

### 53.2. Alternativa

Un entorno con salida denegada por defecto puede aportar una frontera más clara.

### 53.3. Preparación

Necesita permitir explícitamente los servicios locales y preparar dependencias.

### 53.4. Regla

No presentes un archivo hosts como garantía completa contra despliegues AWS.

---

## 54. Contenedores y direcciones locales

`127.0.0.1` depende del lugar donde ejecutas el proceso.

### 54.1. En esta página

Terraform y AWS CLI se ejecutan en el host.

### 54.2. Dentro de Docker

La misma dirección puede identificar el contenedor del cliente.

### 54.3. Adaptación

Necesitas un endpoint accesible mediante la red correspondiente.

### 54.4. Regla

Adapta y valida el procedimiento completo; no cambies una dirección sin revisar su alcance.

---

## 55. Diferencias respecto a AWS real

LocalStack permite practicar API y configuración, no demostrar todas las garantías de AWS.

### 55.1. Identidad

Las credenciales ficticias no representan permisos reales.

### 55.2. Autorización

La aplicación de IAM depende de capacidades y configuración del emulador.

### 55.3. Persistencia

Detener o eliminar el entorno puede afectar recursos y datos.

### 55.4. Regla

No extrapoles una operación local permitida a una cuenta real.

---

## 56. Preparar la limpieza

La destrucción debe utilizar el mismo contexto local.

### 56.1. Copia y vaciado

```bash
umask 077
python3 scripts/lab.py terraform state pull \
  > copias/before-destroy.tfstate

python3 scripts/lab.py aws s3api delete-object \
  --bucket "$BUCKET" \
  --key example.txt
```

### 56.2. Condición

El bucket no utiliza versionado en esta práctica.

### 56.3. Regla

Si añadiste objetos, elimínalos todos antes de destruir.

---

## 57. Destruir y verificar

Mantén LocalStack disponible durante la destrucción.

### 57.1. Secuencia

```bash
python3 scripts/lab.py terraform plan -destroy \
  -out=../planes/destroy.tfplan

python3 scripts/lab.py terraform show ../planes/destroy.tfplan
python3 scripts/lab.py terraform apply ../planes/destroy.tfplan

python3 scripts/lab.py terraform state list
python3 scripts/lab.py aws s3api list-buckets
python3 scripts/lab.py aws sqs list-queues
docker compose down
```

### 57.2. Resultado esperado

Desaparecen los dos recursos del laboratorio.

---

## 58. Ejercicios de consolidación

Las actividades deben reforzar prevención y comprensión de límites.

### 58.1. Ejercicios

1. Explica credenciales y endpoints.
2. Identifica fuentes heredadas sin mostrar secretos.
3. Demuestra una ejecución con variables ficticias inesperadas.
4. Rechaza una sobrescritura del endpoint.
5. Comprueba fallo cuando LocalStack está detenido.
6. Explica por qué el backend necesita revisión.
7. Diseña una capa de red adicional.
8. Destruye utilizando el contexto local preparado.

### 58.2. Seguridad

Todas las pruebas negativas deben utilizar valores ficticios y destinos locales.

---

## 59. Criterios de evaluación

La evaluación debe comprobar procedimiento y límites, no solo un `apply` correcto.

### 59.1. Entrega

Incluye configuración, wrapper y versiones del entorno.

Adjunta plan, consultas de servicio y resultados negativos.

### 59.2. Explicación

Justifica qué controla el wrapper y qué queda fuera.

### 59.3. Limpieza

Demuestra eliminación de recursos y conservación responsable de evidencias.

### 59.4. Regla

No se aceptan pruebas realizadas contra una cuenta AWS real.

---

## 60. Resumen de la lección

La prevención de despliegues accidentales necesita varias capas coherentes.

### 60.1. Ideas esenciales

- Credenciales ficticias y endpoints resuelven problemas diferentes.
- La terminal puede conservar identidad y contexto inesperados.
- Proveedores, backend y scripts necesitan revisión independiente.
- Un entorno reconstruido reduce herencia accidental.
- El preflight no sustituye una frontera de red.
- El wrapper no vuelve seguro código arbitrario.
- Las pruebas negativas no necesitan AWS real.
- La limpieza debe mantener el mismo contexto local.

### 60.2. Procedimiento recomendado

Aísla, configura, revisa, ejecuta, verifica y limpia sin cambiar de destino.

### 60.3. Idea final

**Un laboratorio fiable hace evidente dónde se ejecutan las operaciones, qué identidad utilizan y qué controles impiden que un error de contexto se convierta en un despliegue no previsto.**