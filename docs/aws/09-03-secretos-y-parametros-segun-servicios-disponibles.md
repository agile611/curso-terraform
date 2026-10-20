# Secretos y parámetros según los servicios disponibles en LocalStack

Una aplicación necesita configuración, pero no todos sus valores requieren el mismo tratamiento.

Una dirección de servicio puede ser pública dentro del proyecto.

Una contraseña, un token o una clave de API necesitan controles adicionales de acceso, almacenamiento y exposición.

AWS ofrece servicios como Systems Manager Parameter Store y Secrets Manager para cubrir necesidades diferentes.

LocalStack permite practicar parte de esos flujos, siempre que compruebes las capacidades de la versión y edición utilizadas.

En esta lección construirás un laboratorio que puede utilizar Parameter Store, Secrets Manager o ambos.

También comprobarás qué información conserva Terraform, cómo recuperar valores sin imprimirlos y por qué una limitación del emulador nunca debe provocar una degradación silenciosa de seguridad.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Todos los valores secretos de esta práctica son ficticios.
>
> La emulación no certifica las garantías criptográficas ni de autorización de AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección combina selección de servicios, configuración sensible y verificación operacional.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Clasificar configuración y secretos.
- Seleccionar servicios según capacidades comprobadas.
- Crear parámetros `String` y `SecureString`.
- Crear secretos y versiones en Secrets Manager.
- Explicar la presencia de valores sensibles en el estado.
- Recuperar valores sin mostrarlos en la consola.
- Actualizar valores y verificar versiones.
- Limpiar recursos y artefactos locales.

### 1.2. Resultado práctico

Publicarás configuración y una clave ficticia mediante un modo de laboratorio explícito.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de variables, outputs y estado.

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

### 2.3. Conocimientos recomendados

Revisa las lecciones de credenciales locales, IAM y protección del estado.

---

## 3. Compatibilidad obligatoria

El docente debe validar las operaciones que utilizará el grupo.

### 3.1. Servicios candidatos

Comprueba por separado:

- Systems Manager Parameter Store.
- Secrets Manager.
- Operaciones de lectura y escritura.
- Comportamiento de versiones.
- Eliminación de recursos.
- Soporte de parámetros `SecureString`.

### 3.2. Registro del entorno

Documenta versiones, edición, imagen o digest y servicios habilitados.

### 3.3. Regla principal

**Una API disponible no demuestra que toda su semántica reproduzca AWS real.**

---

## 4. Configuración y secretos

La clasificación debe realizarse antes de elegir el servicio.

### 4.1. Comparación

| **Dato** | **Clasificación inicial** | **Ejemplo ficticio** |
|----------|---------------------------|---------------------|
| Dirección interna | Configuración | `http://service.local` |
| Nivel de logs | Configuración | `INFO` |
| Clave de API | Secreto | Valor introducido durante la sesión |
| Contraseña | Secreto | Valor ficticio de laboratorio |
| Identificador del secreto | Metadato | Nombre o ARN |

Estos ejemplos orientan el diseño, pero el contexto puede cambiar la clasificación.

### 4.2. Precaución

Un identificador puede revelar nombres de aplicaciones o entornos.

### 4.3. Regla

No marques como público un dato únicamente porque no sea una contraseña.

---

## 5. Parameter Store

Parameter Store permite organizar parámetros mediante nombres y rutas.

### 5.1. Tipos habituales

Encontrarás:

- `String`.
- `StringList`.
- `SecureString`.

### 5.2. Laboratorio

Utilizaremos `String` para una dirección de servicio.

Utilizaremos `SecureString` para una clave ficticia.

### 5.3. Regla

No conviertas un secreto en `String` para evitar una incompatibilidad del emulador.

---

## 6. Secrets Manager

Secrets Manager está orientado al almacenamiento y ciclo de vida de secretos.

### 6.1. Elementos del laboratorio

Crearemos:

- Un contenedor de secreto.
- Una versión con contenido JSON.
- Una referencia estable para consumidores.

### 6.2. Contenido

El JSON tendrá una clave de API ficticia y una versión de esquema.

### 6.3. Regla

El nombre del secreto no debe incorporar su valor.

---

## 7. Comparación entre servicios

La elección debe responder a requisitos, no únicamente a disponibilidad.

### 7.1. Orientación

| **Necesidad** | **Parameter Store** | **Secrets Manager** |
|---------------|---------------------|---------------------|
| Configuración simple | Opción habitual | Posible, no siempre necesaria |
| Jerarquía de parámetros | Característica útil | Organización mediante nombres |
| Secreto protegido | `SecureString` | Valor de secreto |
| Rotación integrada | No equivalente a Secrets Manager | Funciones específicas de rotación |
| Versiones | Versiones de parámetros | Versiones y etiquetas de staging |

Ambos servicios pueden almacenar información sensible, pero no son sustitutos idénticos.

### 7.2. Laboratorio

No configuraremos rotación automática.

### 7.3. Regla

Actualizar un valor manualmente no equivale a implementar un sistema completo de rotación.

---

## 8. Disponibilidad y seguridad

La disponibilidad del servicio modifica el ejercicio, no la sensibilidad del dato.

### 8.1. Decisiones admitidas

Puedes ejecutar:

- Solo Parameter Store validado.
- Solo Secrets Manager validado.
- Ambos servicios validados.

### 8.2. Decisión no admitida

No almacenarás un secreto en texto plano como fallback automático.

### 8.3. Regla

Si falta una capacidad necesaria, registra el límite y cambia el alcance de la práctica.

---

## 9. Modos del laboratorio

La configuración seleccionará un modo explícito.

### 9.1. Comparación

| **Modo** | **Recursos creados** | **Uso previsto** |
|----------|----------------------|-----------------|
| `ssm` | Dos parámetros | Parameter Store validado |
| `secretsmanager` | Secreto y versión | Secrets Manager validado |
| `both` | Todos los anteriores | Comparación completa |

El modo forma parte de la configuración Terraform.

### 9.2. Precaución

Cambiar el modo después del despliegue puede eliminar recursos.

### 9.3. Regla

Revisa siempre un plan antes de modificarlo.

---

## 10. Capas de protección

La protección de secretos requiere controles distintos en varios puntos.

### 10.1. Capas relevantes

Considera:

- Código fuente.
- Entrada del valor.
- Transporte.
- Almacenamiento del servicio.
- Estado Terraform.
- Logs.
- Acceso de la aplicación.
- Artefactos de diagnóstico.

### 10.2. Regla

Guardar un secreto en un servicio especializado no protege automáticamente todas sus copias.

---

## 11. Qué hace `sensitive`

Terraform permite marcar entradas y outputs como sensibles.

### 11.1. Efecto principal

Reduce su exposición en determinadas salidas de consola.

### 11.2. Lo que no hace

No cifra automáticamente el estado.

No evita todas las filtraciones mediante logs o herramientas externas.

No impide que comandos específicos revelen outputs sensibles.

### 11.3. Regla principal

**`sensitive = true` protege presentación, no elimina la persistencia del valor.**

---

## 12. Estado y planes

Terraform puede conservar valores sensibles cuando administra su contenido.

### 12.1. Estado

Los recursos de esta práctica almacenan sus valores administrados en el estado.

### 12.2. Plan guardado

Un plan binario puede contener información sensible necesaria para la aplicación.

### 12.3. Copias

Backups, estados anteriores y versiones remotas pueden conservar valores antiguos.

### 12.4. Regla

Protege estado, planes y copias como material confidencial.

---

## 13. Outputs sensibles

Los outputs no son un canal seguro de distribución por sí solos.

### 13.1. Comportamiento relevante

`terraform output` oculta outputs sensibles en su listado general.

Consultar un output concreto puede revelar su valor.

Los formatos `-raw` y `-json` pueden exponer valores sensibles.

### 13.2. Decisión del laboratorio

Publicaremos identificadores, no el contenido secreto.

### 13.3. Regla

No utilices un output de contraseña como mecanismo habitual de entrega a aplicaciones.

---

## 14. Arquitectura del laboratorio

Terraform administrará metadatos y valores ficticios.

### 14.1. Recorrido

```text
Entrada interactiva de clave ficticia
    │
    ▼
Terraform
    ├── Parameter Store
    │    ├── base-url: String
    │    └── api-key: SecureString
    └── Secrets Manager
         └── credentials: JSON
                  │
                  ▼
         Consumidor Python
         sin impresión del valor
```

### 14.2. Alcance

El consumidor es un script didáctico, no una aplicación de producción.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente.

### 15.1. Estructura

```bash
mkdir -p terraform-secrets-services/app
mkdir -p terraform-secrets-services/scripts
mkdir -p terraform-secrets-services/planes
mkdir -p terraform-secrets-services/resultados
mkdir -p terraform-secrets-services/copias
cd terraform-secrets-services
```

### 15.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 15.3. Aislamiento

No copies estados de otras lecciones.

---

## 16. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 16.1. `.gitignore`

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

### 16.2. Qué conservar

Versiona configuración, scripts y `.terraform.lock.hcl`.

### 16.3. Precaución

`.gitignore` no elimina contenido que ya fue publicado.

---

## 17. Imagen validada

Selecciona una imagen reproducible.

### 17.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. Recomendación

Utiliza una etiqueta fija o un digest.

### 17.3. Edición

Configura cualquier requisito de activación mediante el procedimiento del docente.

### 17.4. Regla

No publiques tokens de activación en el repositorio.

---

## 18. Docker Compose

Habilita únicamente los servicios utilizados por el grupo.

### 18.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: ${LAB_SERVICES:-ssm,secretsmanager}
      AWS_DEFAULT_REGION: us-east-1
```

### 18.2. Selección

Define `LAB_SERVICES=ssm`, `secretsmanager` o `ssm,secretsmanager`.

### 18.3. Arranque

Ejecuta `docker compose up -d`.

---

## 19. Credenciales y conectividad

Utiliza un contexto local y ficticio.

### 19.1. Preparación

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SSM
unset AWS_ENDPOINT_URL_SECRETS_MANAGER TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 19.2. Regla

No ejecutes comandos AWS sin el endpoint local.

---

## 20. Comprobaciones iniciales

Verifica únicamente los servicios seleccionados.

### 20.1. Parameter Store

```bash
aws_local ssm describe-parameters --max-results 5
```

### 20.2. Secrets Manager

```bash
aws_local secretsmanager list-secrets --max-results 5
```

### 20.3. Interpretación

Una respuesta válida demuestra disponibilidad básica de la operación.

### 20.4. Regla

Todavía debes comprobar escritura, lectura y tipo de valor.

---

## 21. Requisitos de Terraform

Crea `app/versions.tf`.

### 21.1. Configuración

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

### 21.2. Estado

El backend local es suficiente para esta práctica ficticia.

---

## 22. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 22.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ssm            = "http://127.0.0.1:4566"
    secretsmanager = "http://127.0.0.1:4566"
  }
}
```

### 22.2. Precaución

No añadimos recursos KMS en este laboratorio básico.

---

## 23. Variables de identidad y modo

Crea `app/variables.tf`.

### 23.1. Declaraciones

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "mode" {
  type    = string
  default = "both"

  validation {
    condition     = contains(["ssm", "secretsmanager", "both"], var.mode)
    error_message = "Selecciona ssm, secretsmanager o both."
  }
}
```

---

## 24. Variables de configuración y secreto

Añade las declaraciones al mismo archivo.

### 24.1. Entradas

```hcl
variable "base_url" {
  type    = string
  default = "http://service.local"
}

variable "api_key" {
  type        = string
  sensitive   = true
  nullable    = false
  description = "Clave exclusivamente ficticia para el laboratorio."

  validation {
    condition     = length(var.api_key) >= 12
    error_message = "Introduce una clave ficticia de al menos 12 caracteres."
  }
}
```

### 24.2. Regla

No escribas la clave en `terraform.tfvars`.

---

## 25. Valores no sensibles

Crea `app/terraform.tfvars`.

### 25.1. Configuración

```hcl
suffix   = "alumno01"
mode     = "both"
base_url = "http://service.local"
```

### 25.2. Adaptación

Selecciona un modo compatible con los servicios validados.

### 25.3. Entorno compartido

Cada alumno debe utilizar un sufijo diferente.

### 25.4. Regla

La selección del modo no debe depender de un fallback silencioso.

---

## 26. Selección de recursos

Crea `app/main.tf`.

### 26.1. Valores locales

```hcl
locals {
  use_ssm     = contains(["ssm", "both"], var.mode)
  use_secrets = contains(["secretsmanager", "both"], var.mode)

  prefix = "/curso/${var.suffix}/app"

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

### 26.2. Comportamiento

La selección es determinista y visible en el plan.

---

## 27. Parámetro de configuración

Añade el recurso a `app/main.tf`.

### 27.1. Declaración

```hcl
resource "aws_ssm_parameter" "base_url" {
  count = local.use_ssm ? 1 : 0

  name  = "${local.prefix}/base-url"
  type  = "String"
  value = var.base_url
  tier  = "Standard"

  tags = local.tags
}
```

### 27.2. Clasificación

La dirección del ejemplo se considera configuración no secreta.

### 27.3. Regla

Revisa esa clasificación si el valor cambia de naturaleza.

---

## 28. Parámetro sensible

Añade el parámetro protegido al mismo archivo.

### 28.1. Declaración

```hcl
resource "aws_ssm_parameter" "api_key" {
  count = local.use_ssm ? 1 : 0

  name  = "${local.prefix}/api-key"
  type  = "SecureString"
  value = var.api_key
  tier  = "Standard"

  tags = local.tags
}
```

### 28.2. AWS real

`SecureString` utiliza KMS según la configuración correspondiente.

### 28.3. Límite

El valor administrado sigue presente en el estado Terraform.

---

## 29. Contenedor del secreto

Añade el recurso Secrets Manager.

### 29.1. Declaración

```hcl
resource "aws_secretsmanager_secret" "credentials" {
  count = local.use_secrets ? 1 : 0

  name        = "curso/${var.suffix}/app/credentials"
  description = "Credenciales ficticias del laboratorio."

  recovery_window_in_days = 0
  tags                    = local.tags
}
```

### 29.2. Advertencia

El valor cero solicita eliminación sin ventana de recuperación.

### 29.3. Alcance

Esta decisión es exclusivamente didáctica y simplifica la limpieza.

---

## 30. Versión del secreto

Completa `app/main.tf`.

### 30.1. Declaración

```hcl
resource "aws_secretsmanager_secret_version" "credentials" {
  count = local.use_secrets ? 1 : 0

  secret_id = aws_secretsmanager_secret.credentials[0].id

  secret_string = jsonencode({
    schema_version = 1
    api_key        = var.api_key
  })
}
```

### 30.2. Comparación didáctica

En modo `both`, el mismo valor permite comparar ambos servicios.

### 30.3. Regla

No conviertas esa duplicación en una recomendación general de producción.

---

## 31. Outputs sin valores secretos

Crea `app/outputs.tf`.

### 31.1. Contrato

```hcl
output "lab" {
  value = {
    mode = var.mode

    parameter_config_name = try(
      aws_ssm_parameter.base_url[0].name, null
    )
    parameter_secret_name = try(
      aws_ssm_parameter.api_key[0].name, null
    )
    secret_id = try(
      aws_secretsmanager_secret.credentials[0].arn, null
    )
  }
}
```

### 31.2. Precaución

Publicar identificadores reduce exposición, pero no elimina el secreto del estado.

---

## 32. Entrada interactiva del valor

Un script evitará escribir la clave como argumento del shell.

### 32.1. Objetivos

Solicitar el valor sin eco en terminal.

Pasarlo a Terraform mediante el entorno del proceso hijo.

Evitar conservarlo en un archivo de variables.

### 32.2. Límite

Las variables de entorno no son un almacén seguro absoluto.

### 32.3. Regla

Utiliza exclusivamente una clave ficticia.

---

## 33. Ejecutor Terraform

Crea `scripts/tf-lab.py`.

### 33.1. Implementación

```python
import getpass
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
arguments = sys.argv[1:]
allowed = {"init", "fmt", "validate", "plan", "apply", "show", "output", "state"}

if not arguments or arguments[0] not in allowed:
    raise SystemExit("Comando Terraform no previsto.")

binary = shutil.which("terraform")
if binary is None:
    raise SystemExit("No se encuentra Terraform.")

environment = os.environ.copy()

for key in list(environment):
    if key.startswith(("AWS_", "TF_VAR_", "TF_CLI_ARGS")):
        environment.pop(key, None)
environment.pop("TF_WORKSPACE", None)

environment.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_PAGER": "",
})

if arguments[0] == "plan":
    environment["TF_VAR_api_key"] = getpass.getpass(
        "Clave ficticia del laboratorio: "
    )

command = [binary, f"-chdir={root / 'app'}", *arguments]
raise SystemExit(subprocess.call(command, env=environment))
```

---

## 34. Límites del ejecutor

El script facilita la práctica, pero no sustituye el aislamiento de la lección anterior.

### 34.1. Consideraciones

Hereda variables del sistema no retiradas.

No analiza exhaustivamente argumentos o configuración Terraform.

No restringe la red.

### 34.2. Aplicación

Utilizaremos siempre un plan guardado.

El valor necesario para aplicar ya forma parte de ese plan.

### 34.3. Regla

No ejecutes configuraciones de terceros suponiendo que este script las vuelve seguras.

---

## 35. Sesión 1: inicializar y planificar

Duración orientativa: 25 minutos.

### 35.1. Secuencia

```bash
python3 -m py_compile scripts/tf-lab.py
python3 scripts/tf-lab.py init
python3 scripts/tf-lab.py fmt
python3 scripts/tf-lab.py validate

umask 077
python3 scripts/tf-lab.py plan -out=../planes/create.tfplan
python3 scripts/tf-lab.py show ../planes/create.tfplan
```

### 35.2. Expectativa

`both` crea cuatro recursos; cada modo individual crea dos.

### 35.3. Regla

Comprueba que el valor no aparece en la salida normal revisada.

---

## 36. Sesión 2: aplicar e identificar

La aplicación utiliza el plan sensible guardado.

### 36.1. Comandos

```bash
python3 scripts/tf-lab.py apply ../planes/create.tfplan
python3 scripts/tf-lab.py state list

python3 scripts/tf-lab.py output -json lab \
  > resultados/lab.json
```

### 36.2. Resultado esperado

Los recursos corresponden al modo seleccionado.

### 36.3. Evidencia

El contrato publica nombres y ARN, no la clave.

### 36.4. Regla

Mantén permisos restrictivos en el directorio de planes.

---

## 37. Sesión 3: verificar metadatos

Consulta configuración sin recuperar innecesariamente el valor sensible.

### 37.1. Parameter Store

```bash
aws_local ssm describe-parameters \
  --parameter-filters \
  "Key=Name,Option=BeginsWith,Values=/curso/alumno01/app/"
```

### 37.2. Secrets Manager

Utiliza `describe-secret` con el `secret_id` del contrato.

### 37.3. Revisión

Comprueba nombres, tipos, etiquetas y referencias.

### 37.4. Regla

Ejecuta solo las consultas correspondientes a tu modo.

---

## 38. Recuperación sin impresión

El consumidor debe utilizar el valor sin publicarlo como diagnóstico.

### 38.1. Objetivo del script

Recuperar una clave desde un backend seleccionado.

Validar su formato básico.

Mostrar únicamente el backend y el resultado de la validación.

### 38.2. Límite

El proceso necesita recibir el valor en memoria.

### 38.3. Regla

No imprimir el valor reduce exposición, pero no equivale a no procesarlo.

---

## 39. Consumidor: estructura y entorno

Crea `scripts/read-secret.py`.

### 39.1. Código inicial

```python
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
if sys.argv[1:] not in [["ssm"], ["secretsmanager"]]:
    raise SystemExit("Selecciona explícitamente ssm o secretsmanager.")

backend = sys.argv[1]
lab = json.loads((root / "resultados" / "lab.json").read_text())

environment = os.environ.copy()
for key in list(environment):
    if key.startswith("AWS_"):
        environment.pop(key, None)

environment.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_PAGER": "",
})

binary = shutil.which("aws")
if binary is None:
    raise SystemExit("No se encuentra AWS CLI.")
```

---

## 40. Consumidor: seleccionar operación

Añade la operación correspondiente al backend explícito.

### 40.1. Implementación

```python
if backend == "ssm":
    identifier = lab["parameter_secret_name"]
    operation = [
        "ssm", "get-parameter",
        "--name", identifier or "",
        "--with-decryption",
    ]
else:
    identifier = lab["secret_id"]
    operation = [
        "secretsmanager", "get-secret-value",
        "--secret-id", identifier or "",
    ]

if not identifier:
    raise SystemExit("El backend seleccionado no fue desplegado.")

command = [
    binary,
    "--endpoint-url", "http://127.0.0.1:4566",
    "--region", "us-east-1",
    "--output", "json",
    *operation,
]
```

---

## 41. Consumidor: validar y resumir

Completa `scripts/read-secret.py`.

### 41.1. Implementación

```python
result = subprocess.run(
    command, env=environment, capture_output=True, text=True
)
if result.returncode != 0:
    raise SystemExit("No se pudo recuperar el valor del backend local.")

try:
    payload = json.loads(result.stdout)
    if backend == "ssm":
        value = payload["Parameter"]["Value"]
    else:
        document = json.loads(payload["SecretString"])
        if document["schema_version"] != 1:
            raise ValueError("Esquema no admitido.")
        value = document["api_key"]

    if not isinstance(value, str) or len(value) < 12:
        raise ValueError("Formato no válido.")
except (ValueError, KeyError, TypeError):
    raise SystemExit("La respuesta no cumple el contrato esperado.")

print(json.dumps({
    "backend": backend,
    "retrieved": True,
    "format_valid": True,
    "value_printed": False,
}))
```

---

## 42. Sesión 4: ejecutar el consumidor

Comprueba recuperación sin exposición visual.

### 42.1. Comandos

```bash
python3 -m py_compile scripts/read-secret.py
python3 scripts/read-secret.py ssm
python3 scripts/read-secret.py secretsmanager
```

### 42.2. Adaptación

Ejecuta únicamente el backend disponible en tu modo.

### 42.3. Resultado esperado

La salida indica recuperación y validación correctas.

### 42.4. Regla

El script no cambia automáticamente de backend si una lectura falla.

---

## 43. Desencriptación y emulación

La opción de desencriptación tiene un significado específico en Parameter Store.

### 43.1. AWS real

Recuperar un `SecureString` con desencriptación implica controles y operaciones KMS correspondientes.

### 43.2. LocalStack

El comportamiento observable depende de su implementación y configuración.

### 43.3. Precaución

Recibir el valor no demuestra aislamiento de claves ni cifrado físico del almacenamiento local.

### 43.4. Regla

Documenta recuperación funcional y garantías criptográficas como propiedades distintas.

---

## 44. Sesión 5: comprobar persistencia

La prueba debe confirmar exposición en estado sin imprimir la clave.

### 44.1. Script de inspección

Crea `scripts/check-state.py`:

```python
import getpass
from pathlib import Path

root = Path(__file__).resolve().parents[1]
value = getpass.getpass("Misma clave ficticia aplicada: ")
if len(value) < 12:
    raise SystemExit("Introduce el valor ficticio completo.")

state = (root / "app" / "terraform.tfstate").read_text()
print({"value_found_in_state": value in state})
```

### 44.2. Ejecución

Ejecuta el script utilizando la misma clave ficticia.

### 44.3. Límite

La búsqueda literal es didáctica y puede no detectar representaciones escapadas.

---

## 45. Interpretar la inspección

El resultado confirma una propiedad importante del diseño administrado.

### 45.1. Si encuentra el valor

Terraform conserva una copia recuperable en el estado local.

### 45.2. Si no lo encuentra

No demuestra ausencia de información sensible.

Revisa representación JSON y recursos presentes.

### 45.3. Regla

No subas el estado a Git aunque la búsqueda no encuentre una cadena concreta.

### 45.4. Producción

Necesitas protección de almacenamiento, acceso, historial y copias.

---

## 46. Sesión 6: actualizar la clave

La actualización cambia contenido sin cambiar deliberadamente sus identificadores.

### 46.1. Secuencia

```bash
python3 scripts/tf-lab.py plan -out=../planes/update.tfplan
python3 scripts/tf-lab.py show ../planes/update.tfplan
python3 scripts/tf-lab.py apply ../planes/update.tfplan
```

### 46.2. Entrada

Introduce una segunda clave ficticia distinta.

### 46.3. Expectativa

El parámetro cambia de valor.

Secrets Manager crea una nueva versión administrada.

---

## 47. Sesión 7: verificar versiones

Consulta metadatos sin imprimir versiones de contenido.

### 47.1. Secrets Manager

```bash
SECRET_ID="$(jq -er '.secret_id' resultados/lab.json)"

aws_local secretsmanager list-secret-version-ids \
  --secret-id "$SECRET_ID"
```

### 47.2. Parameter Store

Utiliza `describe-parameters` para observar la versión actual.

### 47.3. Precaución

`get-parameter-history` puede devolver valores; no publiques su respuesta completa.

### 47.4. Regla

Un número de versión no demuestra rotación del sistema consumidor.

---

## 48. Versiones y etiquetas de staging

Secrets Manager utiliza identificadores y etiquetas para organizar versiones.

### 48.1. Etiqueta habitual

`AWSCURRENT` identifica la versión considerada actual.

### 48.2. Actualización

Una versión nueva puede cambiar la asociación de etiquetas.

### 48.3. Límite

No asumiremos idéntico historial o limpieza interna entre AWS y todas las imágenes LocalStack.

### 48.4. Regla

Verifica etiquetas y contenido recuperado mediante operaciones separadas.

---

## 49. Cambios fuera de Terraform

Editar un valor mediante CLI introduce una segunda fuente de escritura.

### 49.1. Parameter Store

Una modificación externa puede detectarse y revertirse al reaplicar el valor declarado.

### 49.2. Secrets Manager

Una nueva versión externa puede cambiar `AWSCURRENT` sin producir el plan que intuitivamente esperabas.

### 49.3. Motivo

Terraform administra recursos y versiones concretas, no una promesa universal de gobernar cada escritura futura.

### 49.4. Regla

Define un único responsable del contenido y comprueba el comportamiento del proveedor utilizado.

---

## 50. Separar infraestructura y contenido

Una arquitectura alternativa deja el valor fuera de Terraform.

### 50.1. División de responsabilidades

Terraform crea el contenedor y sus metadatos.

Un proceso autorizado publica el contenido.

La aplicación recupera el valor durante ejecución.

### 50.2. Ventaja

El contenido no entra en el estado si Terraform nunca lo recibe ni lo consulta.

### 50.3. Regla

Esta propiedad desaparece si añades un data source que recupera el secreto.

---

## 51. Ejemplo de contenedor sin versión

El siguiente patrón es una alternativa, no un bloque para añadir al laboratorio actual sin planificación.

### 51.1. Configuración conceptual

```hcl
resource "aws_secretsmanager_secret" "external" {
  name                    = "curso/ejemplo-external/credentials"
  recovery_window_in_days = 0
}

output "external_secret_id" {
  value = aws_secretsmanager_secret.external.arn
}
```

### 51.2. Diferencia

No existe un recurso `aws_secretsmanager_secret_version`.

### 51.3. Regla

Utiliza otro directorio y otro estado si practicas esta variante.

---

## 52. Publicación externa del contenido

El proceso externo también necesita evitar filtraciones.

### 52.1. Diseño recomendado

Solicita el valor sin eco.

Construye el documento en memoria.

Envía la petición mediante un SDK o entrada estándar cuando la herramienta lo permita.

### 52.2. Evitar

No pongas el valor en argumentos visibles del proceso.

No guardes respuestas completas en logs.

### 52.3. Regla

Sacar el secreto del estado no lo protege automáticamente en el pipeline.

---

## 53. Capacidades recientes de Terraform

Terraform dispone de mecanismos más recientes para determinados flujos sensibles.

### 53.1. Valores efímeros

Su disponibilidad comienza en versiones posteriores al mínimo de esta práctica.

### 53.2. Argumentos write-only

Requieren versiones compatibles de Terraform y soporte específico del proveedor y recurso.

### 53.3. Laboratorio

No asumiremos esas capacidades con Terraform 1.6 y cualquier proveedor AWS 5.x.

### 53.4. Regla

Comprueba compatibilidad exacta antes de afirmar que un valor no se conserva en estado.

---

## 54. Acceso mínimo de la aplicación

La aplicación necesita permisos de lectura concretos, no permisos administrativos.

### 54.1. Parameter Store

Puede necesitar `ssm:GetParameter` sobre el parámetro utilizado.

### 54.2. Secrets Manager

Puede necesitar `secretsmanager:GetSecretValue` sobre el secreto correspondiente.

### 54.3. KMS

En AWS real pueden intervenir permisos adicionales según claves y configuración.

### 54.4. Regla

No concedas `ssm:*` o `secretsmanager:*` para simplificar la recuperación.

---

## 55. Caché y rotación del consumidor

Una aplicación puede conservar el valor recuperado en memoria.

### 55.1. Beneficio

Reduce llamadas, latencia y dependencia inmediata del servicio.

### 55.2. Riesgo

Puede seguir utilizando una versión antigua después de una actualización.

### 55.3. Diseño

Define caducidad, refresco y tratamiento de errores.

### 55.4. Regla

Actualizar el secreto no actualiza automáticamente conexiones o credenciales activas de todos los consumidores.

---

## 56. Diagnóstico de errores

Investiga servicio, identificador, modalidad y contrato antes de modificar permisos.

### 56.1. Lista de revisión

Comprueba disponibilidad del endpoint local.

Revisa nombre, ARN y modo desplegado.

Verifica formato JSON y esquema esperado.

### 56.2. Autorización

Distingue denegación de acceso, recurso inexistente y fallo de desencriptación.

### 56.3. Regla

No imprimas el secreto completo para investigar un error de formato.

---

## 57. Limpieza de infraestructura

Mantén LocalStack disponible y utiliza un plan de destrucción revisado.

### 57.1. Secuencia

```bash
umask 077
python3 scripts/tf-lab.py state pull > copias/before-destroy.tfstate

python3 scripts/tf-lab.py plan -destroy \
  -out=../planes/destroy.tfplan

python3 scripts/tf-lab.py show ../planes/destroy.tfplan
python3 scripts/tf-lab.py apply ../planes/destroy.tfplan
python3 scripts/tf-lab.py state list
```

### 57.2. Entrada

El ejecutor solicita una clave ficticia al planificar, también durante este flujo.

### 57.3. Regla

No elimines el estado antes de completar la destrucción.

---

## 58. Verificación y rastros locales

Destruir recursos no elimina todas las copias del valor.

### 58.1. Comprobación

Consulta parámetros y secretos del laboratorio mediante sus servicios.

Después ejecuta `docker compose down`.

### 58.2. Artefactos

Revisa planes, backups, resultados y persistencia de LocalStack si la configuraste.

### 58.3. Precaución

Eliminar archivos no garantiza borrado físico irrecuperable en SSD, snapshots o backups.

### 58.4. Regla

La limpieza educativa no sustituye una política de retención y eliminación segura.

---

## 59. Diferencias respecto a AWS real

La emulación permite practicar interfaces y determinados ciclos de vida.

### 59.1. Aspectos adicionales

En AWS real revisa KMS, IAM, auditoría, costes, cuotas y recuperación.

### 59.2. Seguridad

La lectura local no certifica cifrado físico ni controles equivalentes de autorización.

### 59.3. Disponibilidad

La pérdida del contenedor puede afectar recursos aunque Terraform conserve su estado.

### 59.4. Regla

Documenta qué comprobaste y qué garantías permanecen fuera del laboratorio.

---

## 60. Ejercicios y evaluación

La evaluación debe comprobar selección, exposición y recuperación controlada.

### 60.1. Ejercicios

1. Clasifica cinco valores de una aplicación.
2. Justifica el modo seleccionado.
3. Compara `String`, `SecureString` y Secrets Manager.
4. Recupera sin imprimir la clave.
5. Comprueba persistencia en el estado.
6. Actualiza y observa versiones.
7. Diseña la separación de infraestructura y contenido.
8. Destruye y revisa copias locales.

### 60.2. Entrega

Incluye configuración, scripts, versiones del entorno y evidencias sin contenido secreto.

---

## 61. Resumen de la lección

La gestión de secretos combina selección de servicios y control de todas las copias del valor.

### 61.1. Ideas esenciales

- Configuración y secretos requieren clasificaciones explícitas.
- La disponibilidad no justifica un fallback inseguro.
- Parameter Store y Secrets Manager no son equivalentes.
- `sensitive` no elimina valores del estado.
- Los planes y backups también necesitan protección.
- El consumidor debe evitar imprimir el valor.
- Actualizar contenido no completa toda la rotación.
- Separar contenido e infraestructura exige responsabilidades claras.

### 61.2. Procedimiento recomendado

Clasifica, selecciona, valida, despliega, recupera, actualiza y limpia con evidencias limitadas a lo necesario.

### 61.3. Idea final

**Un laboratorio fiable no solo demuestra que puede almacenar un secreto: explica dónde existen sus copias, quién puede recuperarlo y qué garantías todavía no puede demostrar el entorno emulado.**