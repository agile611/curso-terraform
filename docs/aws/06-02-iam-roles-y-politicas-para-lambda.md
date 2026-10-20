# IAM: roles y políticas para Lambda con Terraform y LocalStack

Una función Lambda necesita permisos para acceder a otros servicios, pero esos permisos no deben confundirse con la autorización para invocar la función.

El rol de ejecución define qué puede hacer el código durante su ejecución.

La política de confianza define quién puede asumir ese rol.

Los permisos del invocador y la política de recursos de Lambda controlan otras relaciones de acceso.

En esta lección construirás una función que lee documentos de un prefijo S3 y escribe logs.

Terraform declarará la infraestructura y los documentos de política.

LocalStack permitirá practicar las API y comprobar la integración funcional.

También distinguirás entre verificar una configuración IAM y demostrar que una autorización se aplica realmente.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución local exitosa no demuestra que una política sea segura en AWS real.

---

## 1. Objetivos de aprendizaje

Esta lección conecta identidades, políticas y operaciones realizadas por una función.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar confianza, permisos de ejecución y permisos de invocación.
- Crear un rol IAM para Lambda.
- Limitar lectura S3 a un prefijo.
- Autorizar escritura de logs.
- Generar políticas mediante Terraform.
- Inspeccionar permisos y relaciones.
- Diseñar pruebas positivas y negativas.
- Reconocer límites de aplicación IAM en LocalStack.

### 1.2. Resultado práctico

Construirás una función lectora con un rol de ejecución de alcance limitado.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Lambda, S3 y Terraform.

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer handlers, ZIP, referencias, ARN, outputs y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de roles IAM.
- Creación y asociación de políticas.
- Ejecución de Lambda con el runtime elegido.
- Lectura S3 desde el contenedor de ejecución.
- Escritura y consulta de logs.
- Actualización y eliminación de recursos.
- Comportamiento de autorización si la edición lo permite.

### 3.2. Registro del entorno

Documenta Terraform, proveedores, Docker, AWS CLI e imagen de LocalStack.

### 3.3. Advertencia

No presupongas que todas las ediciones aplican las políticas IAM de la misma forma.

---

## 4. Tres preguntas de autorización

La autorización de Lambda requiere separar relaciones diferentes.

### 4.1. Comparación

| **Pregunta** | **Mecanismo relevante** | **Ejemplo** |
|--------------|------------------------|-------------|
| ¿Quién puede asumir el rol? | Política de confianza | Servicio Lambda |
| ¿Qué puede hacer la función? | Políticas del rol | Leer objetos S3 |
| ¿Quién puede invocar la función? | Permisos del invocador y política de recursos | Usuario o servicio autorizado |

Ninguna de estas preguntas sustituye a las otras.

### 4.2. Error habitual

Añadir `lambda:InvokeFunction` al rol para solucionar una lectura S3.

### 4.3. Regla principal

**Identifica primero quién realiza la operación y sobre qué recurso.**

### 4.4. Consecuencia

Los permisos deben corresponder a una relación concreta, no a una lista genérica.

---

## 5. Identidad del desplegador

La identidad que ejecuta Terraform también necesita permisos.

### 5.1. Responsabilidad

El desplegador crea y modifica recursos.

### 5.2. Operaciones posibles

En AWS real puede necesitar:

- Crear roles.
- Crear políticas.
- Asociar políticas.
- Crear funciones.
- Pasar un rol a Lambda.
- Gestionar recursos auxiliares.

### 5.3. LocalStack

Utilizaremos credenciales ficticias para operar contra endpoints locales.

### 5.4. Distinción

Los permisos del desplegador no son los permisos del código de la función.

---

## 6. Qué representa un rol IAM

Un rol es una identidad que puede asumirse bajo determinadas condiciones.

### 6.1. Credenciales

Un rol no equivale a un usuario con claves estáticas almacenadas en el código.

### 6.2. Lambda

El servicio utiliza el rol de ejecución para proporcionar credenciales temporales al entorno.

### 6.3. Aplicación

Los clientes SDK pueden utilizar esas credenciales mediante su cadena habitual de proveedores.

### 6.4. Regla

No introduzcas claves reales dentro del handler.

### 6.5. Laboratorio

El código configurará un endpoint local, pero no definirá manualmente credenciales IAM.

---

## 7. Política de confianza

La confianza establece quién puede asumir el rol.

### 7.1. Principal del laboratorio

```text
lambda.amazonaws.com
```

### 7.2. Acción

```text
sts:AssumeRole
```

### 7.3. Ubicación

La política se asocia al rol como `assume_role_policy`.

### 7.4. Lo que no concede

No concede por sí sola acceso a S3, DynamoDB ni CloudWatch Logs.

### 7.5. Regla

Confianza y permisos de servicio son documentos con responsabilidades diferentes.

---

## 8. Políticas basadas en identidad

Las políticas del rol autorizan operaciones realizadas utilizando esa identidad.

### 8.1. Elementos principales

Un statement puede incluir:

- `Effect`.
- `Action`.
- `Resource`.
- `Condition`.
- `Sid`.

### 8.2. Principal

Una política de identidad no necesita declarar un `Principal`.

La identidad se determina mediante su asociación.

### 8.3. Laboratorio

Asociaremos una política administrada por nosotros para lectura S3.

### 8.4. Logs

Utilizaremos otra política, integrada en el rol, para escritura de logs.

---

## 9. Políticas basadas en recursos

Algunos recursos también tienen políticas propias.

### 9.1. Ejemplos

Puedes encontrar políticas en:

- Buckets S3.
- Colas SQS.
- Topics SNS.
- Funciones Lambda.

### 9.2. Responsabilidad

Describen qué principales pueden acceder al recurso bajo determinadas condiciones.

### 9.3. Lambda

`aws_lambda_permission` permite gestionar una autorización en la política de la función.

### 9.4. Distinción

No modifica los permisos de ejecución del rol.

---

## 10. Evaluación de permisos

La evaluación real depende del contexto completo de autorización.

### 10.1. Reglas orientativas

- La ausencia de autorización suele producir denegación implícita.
- Una denegación explícita aplicable prevalece sobre permisos.
- Pueden intervenir políticas de identidad y de recurso.
- También pueden intervenir límites de permisos y controles organizativos.

### 10.2. Precaución

No reduzcas todos los escenarios a una suma sencilla de políticas.

### 10.3. Entre cuentas

El acceso puede requerir autorizaciones coordinadas en varias partes.

### 10.4. Laboratorio

Trabajaremos con una relación sencilla y local.

### 10.5. Producción

Revisa siempre el contexto completo del principal y del recurso.

---

## 11. Principio de mínimo privilegio

La política debe permitir solamente las operaciones necesarias.

### 11.1. Caso práctico

La función necesita:

- Leer documentos.
- Leer solamente un prefijo.
- Escribir logs.
- No escribir ni eliminar objetos.

### 11.2. No necesita

No concederemos `s3:*`, `iam:*` ni `AdministratorAccess`.

### 11.3. Recomendación

Empieza por las llamadas que realiza el código.

### 11.4. Evidencia

Relaciona cada llamada API con su acción IAM y recurso correspondiente.

---

## 12. ARN de bucket y ARN de objeto

S3 distingue operaciones sobre el contenedor y sobre sus objetos.

### 12.1. Comparación

| **Recurso** | **Forma conceptual** | **Acción habitual** |
|-------------|----------------------|---------------------|
| Bucket | `arn:aws:s3:::bucket` | `s3:ListBucket` |
| Objeto | `arn:aws:s3:::bucket/clave` | `s3:GetObject` |
| Prefijo de objetos | `arn:aws:s3:::bucket/input/*` | `s3:GetObject` |

Utiliza el recurso adecuado para cada acción.

### 12.2. Error habitual

Autorizar `s3:GetObject` solamente sobre el ARN del bucket.

### 12.3. Laboratorio

La función leerá objetos bajo `input/`.

### 12.4. Regla

Una barra y un comodín pueden cambiar considerablemente el alcance.

---

## 13. Lectura no implica listado

Una función puede leer una clave conocida sin listar el bucket.

### 13.1. Operación del código

Utilizaremos `GetObject`.

### 13.2. Acción IAM

```text
s3:GetObject
```

### 13.3. Sin listado

No añadiremos `s3:ListBucket` al rol inicial.

### 13.4. Diagnóstico

Leer un objeto inexistente sin permiso de listado puede producir una respuesta distinta a la esperada.

### 13.5. Regla

No interpretes todo `AccessDenied` como evidencia de un único problema.

---

## 14. Logs y permisos mínimos

La función necesita escribir en su grupo de logs.

### 14.1. Operaciones

Autorizaremos:

- `logs:CreateLogStream`.
- `logs:PutLogEvents`.

### 14.2. Grupo precreado

Terraform creará el grupo antes de la función.

### 14.3. Consecuencia

El rol del laboratorio no necesita crear cualquier grupo de logs.

### 14.4. Alcance

La política se limitará al grupo de esta función y sus streams.

### 14.5. Seguridad

No registres documentos completos que puedan contener información sensible.

---

## 15. Políticas integradas y administradas

IAM ofrece formas diferentes de asociar permisos a una identidad.

### 15.1. Comparación

| **Modalidad** | **Recurso Terraform** | **Característica** |
|---------------|------------------------|--------------------|
| Integrada en el rol | `aws_iam_role_policy` | Ligada a ese rol |
| Administrada por el cliente | `aws_iam_policy` | Política independiente |
| Asociación de política | `aws_iam_role_policy_attachment` | Conecta política y rol |

Las modalidades pueden coexistir con responsabilidades claras.

### 15.2. Laboratorio

S3 utilizará una política administrada por el cliente.

Logs utilizará una política integrada en el rol.

### 15.3. Precaución

Evita gestionar la misma asociación desde configuraciones Terraform que compitan entre sí.

---

## 16. Diseño de la práctica

Construiremos una función lectora y dos objetos ficticios.

### 16.1. Recursos de datos

El bucket contendrá:

```text
input/allowed.json
private/blocked.json
```

### 16.2. Autorización prevista

El rol permitirá lectura de `input/*`.

No concederá lectura de `private/*`.

### 16.3. Aplicación

El handler también validará el prefijo como defensa adicional.

### 16.4. Prueba negativa

Desactivaremos temporalmente esa validación para investigar la autorización del servicio.

---

## 17. Preparación del directorio

Trabaja en una carpeta independiente.

### 17.1. Crear estructura

```bash
mkdir -p terraform-iam-lambda-localstack/src
mkdir -p terraform-iam-lambda-localstack/build
mkdir -p terraform-iam-lambda-localstack/eventos
mkdir -p terraform-iam-lambda-localstack/planes
mkdir -p terraform-iam-lambda-localstack/resultados
cd terraform-iam-lambda-localstack
```

### 17.2. Aislamiento

No reutilices estados de las páginas anteriores.

### 17.3. Ejecución

Terraform y AWS CLI se ejecutarán desde este directorio.

### 17.4. Datos

Todos los objetos contendrán información ficticia.

---

## 18. Protección de archivos

Separa código y configuración de los artefactos generados.

### 18.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
build/
planes/
resultados/
__pycache__/
*.pyc
crash.log
```

### 18.2. Qué versionar

Conserva configuración, código, eventos ficticios y `.terraform.lock.hcl`.

### 18.3. Precaución

Estados, planes y logs pueden contener información sensible.

---

## 19. Docker y seguridad del socket

La ejecución de Lambda necesita un entorno compatible.

### 19.1. Daemon Docker

LocalStack utilizará Docker para ejecutar contenedores de runtime.

### 19.2. Montaje

La práctica montará `/var/run/docker.sock`.

### 19.3. Advertencia

Ese acceso concede un control amplio sobre Docker y el host.

### 19.4. Recomendación

Utiliza imágenes confiables y un equipo de laboratorio aislado.

### 19.5. Compatibilidad

Docker rootless u otras instalaciones pueden requerir una ruta diferente.

---

## 20. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 20.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: lambda,iam,sts,logs,s3
      AWS_DEFAULT_REGION: us-east-1
      LAMBDA_DOCKER_NETWORK: curso-iam-lambda
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - lab

networks:
  lab:
    name: curso-iam-lambda
```

---

## 21. Endpoints desde host y contenedores

El significado de `localhost` depende de dónde se ejecuta el proceso.

### 21.1. Host

Terraform y AWS CLI utilizarán:

```text
http://localhost:4566
```

### 21.2. Runtime Lambda

El código utilizará:

```text
http://localstack:4566
```

### 21.3. Red

El contenedor de ejecución debe estar conectado a `curso-iam-lambda`.

### 21.4. Precaución

Dentro del runtime, `localhost` no representa automáticamente al contenedor LocalStack.

---

## 22. Credenciales ficticias y conectividad

Prepara la terminal y arranca LocalStack.

### 22.1. Comandos

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 22.2. Consultas iniciales

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 iam list-roles
aws --endpoint-url=http://localhost:4566 --region us-east-1 lambda list-functions
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
```

### 22.3. Continuación

Espera respuestas válidas antes de desplegar Terraform.

---

## 23. Código de la función

Crea `src/app.py`.

### 23.1. Primera parte

```python
import json
import logging
import os

import boto3
from botocore.config import Config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["LOCAL_ENDPOINT"],
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
    config=Config(s3={"addressing_style": "path"}),
)


def handler(event, context):
    if not isinstance(event, dict):
        raise ValueError("El evento debe ser un objeto JSON.")

    key = event.get("key")
    if not isinstance(key, str) or not key:
        raise ValueError("key debe ser una cadena no vacía.")
```

---

## 24. Lectura y respuesta del handler

Completa el mismo archivo con este fragmento.

### 24.1. Segunda parte

```python
    validate_prefix = os.environ.get("VALIDATE_PREFIX", "true") == "true"
    if validate_prefix and not key.startswith("input/"):
        raise ValueError("La aplicación solo acepta el prefijo input/.")

    response = s3.get_object(
        Bucket=os.environ["BUCKET_NAME"],
        Key=key,
    )
    body = response["Body"]
    try:
        document = json.loads(body.read().decode("utf-8"))
    finally:
        body.close()

    logger.info("Documento leído correctamente; bytes=%s", response["ContentLength"])

    return {
        "key": key,
        "document": document,
        "aws_request_id": context.aws_request_id,
    }
```

### 24.2. Alcance

El código no lista, escribe ni elimina objetos.

---

## 25. SDK y credenciales del runtime

El handler utiliza clientes de AWS sin introducir claves estáticas.

### 25.1. Credenciales

Boto3 utiliza la cadena habitual de proveedores de credenciales.

### 25.2. Lambda

El entorno proporciona las credenciales correspondientes al rol de ejecución.

### 25.3. Runtime seleccionado

La práctica presupone que el runtime Python validado incluye Boto3.

### 25.4. Producción

Empaquetar versiones concretas del SDK y sus dependencias mejora el control del artefacto.

### 25.5. Seguridad

No añadas `aws_access_key_id` ni `aws_secret_access_key` reales al código.

---

## 26. Requisitos de Terraform

Crea `versions.tf`.

### 26.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
```

### 26.2. Bloqueo

Conserva las versiones seleccionadas en `.terraform.lock.hcl`.

---

## 27. Proveedor con endpoints locales

Crea `providers.tf`.

### 27.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style            = true

  endpoints {
    lambda = "http://localhost:4566"
    iam    = "http://localhost:4566"
    sts    = "http://localhost:4566"
    logs   = "http://localhost:4566"
    s3     = "http://localhost:4566"
  }
}
```

### 27.2. Alcance

Todos los servicios utilizados tienen un endpoint explícito.

---

## 28. Variables, entradas y nombres

Crea los archivos de configuración de entradas.

### 28.1. `variables.tf`

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "validate_prefix" {
  type    = bool
  default = true
}
```

### 28.2. `terraform.tfvars`

```hcl
suffix          = "alumno01"
validate_prefix = true
```

### 28.3. `locals.tf`

```hcl
locals {
  function_name = "curso-iam-reader-${var.suffix}"
}
```

---

## 29. Bucket y documentos ficticios

Crea `storage.tf`.

### 29.1. Recursos

```hcl
resource "aws_s3_bucket" "documents" {
  bucket        = "curso-iam-documents-${var.suffix}"
  force_destroy = true
}

resource "aws_s3_object" "allowed" {
  bucket       = aws_s3_bucket.documents.id
  key          = "input/allowed.json"
  content_type = "application/json"
  content = jsonencode({
    classification = "training"
    message        = "Documento del prefijo permitido."
  })
}

resource "aws_s3_object" "blocked" {
  bucket       = aws_s3_bucket.documents.id
  key          = "private/blocked.json"
  content_type = "application/json"
  content = jsonencode({
    classification = "training"
    message        = "Documento fuera del prefijo autorizado."
  })
}
```

---

## 30. Grupo de logs y paquete

Crea `logs.tf` y `package.tf`.

### 30.1. Grupo de logs

```hcl
resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
```

### 30.2. Paquete

```hcl
data "archive_file" "function" {
  type        = "zip"
  source_file = "${path.module}/src/app.py"
  output_path = "${path.module}/build/function.zip"
}
```

### 30.3. Estructura

El ZIP debe contener `app.py` en su raíz.

### 30.4. Precaución

Mantén disponible el ZIP durante la aplicación del plan guardado.

---

## 31. Documento de confianza y rol

Crea `iam.tf`.

### 31.1. Configuración

```hcl
data "aws_iam_policy_document" "trust" {
  statement {
    sid     = "AllowLambdaService"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "function" {
  name               = "curso-iam-lambda-role-${var.suffix}"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}
```

### 31.2. Generación

`aws_iam_policy_document` construye JSON localmente mediante el proveedor.

---

## 32. Política de lectura S3

Añade el documento y la política administrada.

### 32.1. Configuración

```hcl
data "aws_iam_policy_document" "read_documents" {
  statement {
    sid     = "ReadInputDocuments"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    resources = [
      "${aws_s3_bucket.documents.arn}/input/*"
    ]
  }
}

resource "aws_iam_policy" "read_documents" {
  name   = "curso-iam-read-input-${var.suffix}"
  policy = data.aws_iam_policy_document.read_documents.json
}

resource "aws_iam_role_policy_attachment" "read_documents" {
  role       = aws_iam_role.function.name
  policy_arn = aws_iam_policy.read_documents.arn
}
```

---

## 33. Política integrada de logs

Añade los permisos de observabilidad.

### 33.1. Configuración

```hcl
data "aws_iam_policy_document" "logs" {
  statement {
    sid    = "WriteFunctionLogs"
    effect = "Allow"

    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      aws_cloudwatch_log_group.function.arn,
      "${aws_cloudwatch_log_group.function.arn}:*"
    ]
  }
}

resource "aws_iam_role_policy" "logs" {
  name   = "write-function-logs"
  role   = aws_iam_role.function.id
  policy = data.aws_iam_policy_document.logs.json
}
```

---

## 34. Función y dependencias

Crea `main.tf`.

### 34.1. Configuración

```hcl
resource "aws_lambda_function" "reader" {
  function_name = local.function_name
  role          = aws_iam_role.function.arn
  runtime       = "python3.12"
  handler       = "app.handler"
  architectures = ["x86_64"]

  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256
  memory_size      = 128
  timeout          = 15

  environment {
    variables = {
      BUCKET_NAME     = aws_s3_bucket.documents.bucket
      LOCAL_ENDPOINT  = "http://localstack:4566"
      VALIDATE_PREFIX = tostring(var.validate_prefix)
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.read_documents,
    aws_iam_role_policy.logs
  ]
}
```

---

## 35. Outputs e inicialización

Crea `outputs.tf` y prepara el proyecto.

### 35.1. Resultados

```hcl
output "function_name" {
  value = aws_lambda_function.reader.function_name
}

output "role_name" {
  value = aws_iam_role.function.name
}

output "read_policy_arn" {
  value = aws_iam_policy.read_documents.arn
}

output "bucket_name" {
  value = aws_s3_bucket.documents.bucket
}
```

### 35.2. Preparación

Ejecuta `terraform init`, `terraform fmt -recursive` y `terraform validate`.

---

## 36. Sesión 1: revisar y desplegar

Duración orientativa: 25 minutos.

### 36.1. Plan

```bash
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
python3 -m zipfile -l build/function.zip
terraform apply planes/create.tfplan
```

### 36.2. Resultado esperado

Deben crearse nueve recursos gestionados.

### 36.3. Identificadores

```bash
FUNCTION="$(terraform output -raw function_name)"
ROLE="$(terraform output -raw role_name)"
POLICY="$(terraform output -raw read_policy_arn)"
BUCKET="$(terraform output -raw bucket_name)"
```

### 36.4. Continuación

Espera a que la función esté activa antes de invocarla.

---

## 37. Sesión 2: inspeccionar confianza y asociaciones

Comprueba los documentos que Terraform creó.

### 37.1. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  iam get-role --role-name "$ROLE" > resultados/role.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  iam list-attached-role-policies --role-name "$ROLE" \
  > resultados/attachments.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  iam list-role-policies --role-name "$ROLE" \
  > resultados/inline-policies.json
```

### 37.2. Entregable

Identifica confianza, política administrada y política integrada.

### 37.3. Distinción

Inspeccionar asociación no demuestra aplicación efectiva de permisos.

---

## 38. Sesión 3: inspeccionar la versión de política

Las políticas administradas tienen versiones de documento.

### 38.1. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  iam get-policy --policy-arn "$POLICY" > resultados/policy.json

POLICY_VERSION="$(jq -er '.Policy.DefaultVersionId' resultados/policy.json)"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  iam get-policy-version --policy-arn "$POLICY" \
  --version-id "$POLICY_VERSION" > resultados/policy-version.json

jq '.PolicyVersion.Document' resultados/policy-version.json
```

### 38.2. Verificación

Busca únicamente `s3:GetObject` y el prefijo `input/*`.

### 38.3. Precaución

La versión de política IAM no es una versión de función Lambda.

---

## 39. Sesión 4: invocación permitida

Crea `eventos/allowed.json`.

### 39.1. Evento

```json
{
  "key": "input/allowed.json"
}
```

### 39.2. Invocación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  lambda invoke --function-name "$FUNCTION" \
  --invocation-type RequestResponse \
  --cli-binary-format raw-in-base64-out \
  --payload file://eventos/allowed.json \
  resultados/allowed-response.json > resultados/allowed-metadata.json
```

### 39.3. Resultado esperado

La respuesta contiene el documento ficticio del prefijo permitido.

---

## 40. Sesión 5: rechazo de la aplicación

Crea `eventos/blocked.json`.

### 40.1. Evento

```json
{
  "key": "private/blocked.json"
}
```

### 40.2. Prueba

Invoca la función con este archivo y nombres de salida distintos.

### 40.3. Resultado esperado

El handler rechaza el prefijo antes de llamar a S3.

### 40.4. Interpretación

Este rechazo demuestra una validación del código.

**No demuestra una denegación IAM.**

### 40.5. Entregable

Localiza `FunctionError` y el mensaje de validación.

---

## 41. Sesión 6: prueba negativa de autorización

Para investigar IAM, la llamada debe llegar al servicio.

### 41.1. Cambio temporal

Establece `validate_prefix = false` en `terraform.tfvars`.

### 41.2. Aplicación revisada

```bash
terraform plan -out=planes/disable-validation.tfplan
terraform show planes/disable-validation.tfplan
terraform apply planes/disable-validation.tfplan
```

### 41.3. Prueba

Invoca nuevamente `private/blocked.json`.

### 41.4. Interpretación

Si existe aplicación IAM compatible, debería denegarse la lectura.

Si se permite, documenta la limitación del entorno; no amplíes la política.

---

## 42. Aplicación IAM en LocalStack

La autorización debe evaluarse según la versión y edición realmente utilizadas.

### 42.1. Configuración

Algunas combinaciones ofrecen modos de aplicación IAM.

La opción y su cobertura deben verificarse en la documentación de la versión seleccionada.

### 42.2. Precaución

No añadas una variable de entorno supuesta y des por validada la seguridad.

### 42.3. Cobertura

Una opción disponible no garantiza cobertura idéntica para todas las API.

### 42.4. Evidencia

Registra si cada prueba negativa fue denegada, permitida o no soportada.

### 42.5. Restauración

Vuelve a establecer `validate_prefix = true` y aplica el cambio.

---

## 43. Simulación y revisión de políticas

La revisión estática complementa las pruebas funcionales.

### 43.1. Matriz prevista

| **Acción** | **Recurso** | **Resultado IAM esperado** |
|------------|-------------|---------------------------|
| `s3:GetObject` | `input/allowed.json` | Permitido |
| `s3:GetObject` | `private/blocked.json` | Denegado |
| `s3:PutObject` | `input/new.json` | Denegado |
| `s3:ListBucket` | Bucket | Denegado |

La matriz documenta intención, no evidencia automática.

### 43.2. Simuladores

Si la combinación local soporta simulación IAM, comprueba su alcance antes de utilizarla.

### 43.3. AWS real

Los simuladores tampoco sustituyen todas las pruebas del contexto efectivo.

### 43.4. Regla

No declares una prueba superada si la operación de comprobación no está soportada.

---

## 44. Permisos para invocar Lambda

El rol de ejecución no autoriza automáticamente a todos los invocadores.

### 44.1. Invocación directa

Un principal necesita permisos adecuados para `lambda:InvokeFunction`.

### 44.2. Invocación por servicio

Puede requerirse una política de recursos en la función.

### 44.3. Terraform

`aws_lambda_permission` administra una autorización de ese tipo.

### 44.4. Restricciones

Utiliza `source_arn` y, cuando corresponda, `source_account`.

### 44.5. Ejemplo conceptual

Una autorización para un topic SNS no debe abrir invocación a todos los topics.

### 44.6. Alcance

No añadiremos un disparador ni permisos de servicio innecesarios a esta práctica.

---

## 45. `iam:PassRole` y permisos del desplegador

Pasar un rol a Lambda es una autorización distinta de asumirlo.

### 45.1. Desplegador

La identidad que configura Lambda puede necesitar `iam:PassRole`.

### 45.2. Alcance recomendado

Limita ese permiso al rol o conjunto de roles necesarios.

### 45.3. Servicio de destino

Una condición sobre `iam:PassedToService` puede restringir el uso previsto.

### 45.4. Riesgo

Permitir pasar roles muy privilegiados puede facilitar escalada de privilegios.

### 45.5. Distinción

No añadas `iam:PassRole` al rol de ejecución para solucionar el despliegue.

### 45.6. LocalStack

Las credenciales ficticias no representan una validación de este control en AWS.

---

## 46. Ampliaciones con otros servicios

Añade permisos solamente cuando el código necesite nuevas operaciones.

### 46.1. Comparación

| **Necesidad** | **Acciones orientativas** | **Recurso que revisar** |
|---------------|--------------------------|------------------------|
| Leer DynamoDB | `dynamodb:GetItem` | Tabla |
| Consultar un índice | `dynamodb:Query` | Tabla o índice correspondiente |
| Enviar SQS | `sqs:SendMessage` | Cola |
| Publicar SNS | `sns:Publish` | Topic |

La acción exacta depende de la llamada utilizada.

### 46.2. Cifrado

Recursos cifrados con claves KMS administradas por el cliente pueden requerir permisos adicionales.

### 46.3. Red

Una función conectada a VPC puede necesitar permisos asociados a interfaces de red.

### 46.4. Regla

No copies políticas de servicios que la función no utiliza.

---

## 47. Diagnóstico y propagación

Un fallo de acceso puede tener varias causas.

### 47.1. Lista de revisión

Comprueba:

- Principal que realiza la llamada.
- Rol configurado en Lambda.
- Confianza del rol.
- Política realmente asociada.
- Acción y ARN utilizados.
- Condiciones aplicables.
- Política del recurso.
- Permisos de cifrado.
- Endpoint y red.
- Aplicación IAM disponible en LocalStack.

### 47.2. Propagación

IAM puede presentar retrasos de propagación en AWS real.

### 47.3. Terraform

`depends_on` ordena operaciones, pero no garantiza propagación instantánea.

---

## 48. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 48.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
```

### 48.2. Verificación

Consulta función, rol, política y bucket del laboratorio.

### 48.3. Docker

Después ejecuta `docker compose down`.

### 48.4. Precaución

Revisa posibles contenedores de runtime residuales sin eliminar recursos ajenos.

### 48.5. Datos

`force_destroy` se utiliza exclusivamente para objetos ficticios.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar configuración e integración, no certificar autorización de producción.

### 49.1. Aspectos adicionales

En AWS real revisa:

- Políticas de recursos.
- Límites de permisos.
- Políticas de sesión.
- Controles organizativos.
- Acceso entre cuentas.
- Claves KMS.
- Credenciales temporales.
- Auditoría y propagación.

### 49.2. Seguridad

Una lectura permitida localmente no invalida el diseño del documento IAM.

### 49.3. Evidencia

Tampoco demuestra que la misma lectura estará autorizada en AWS real.

---

## 50. Ejercicios y resumen

Consolida las relaciones de autorización antes de ampliar la función.

### 50.1. Ejercicios

1. Explica confianza, ejecución e invocación con tres ejemplos.
2. Inspecciona la versión activa de la política S3.
3. Comprueba lectura permitida y rechazo de aplicación.
4. Documenta la prueba negativa IAM y sus limitaciones.
5. Diseña permiso de listado limitado a un prefijo.
6. Añade otra operación con mínimo privilegio.
7. Revisa qué permisos necesitaría el desplegador.
8. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

La confianza permite asumir; las políticas autorizan operaciones.

Los permisos de invocación pertenecen a otra relación.

### 50.3. Idea final

**Una configuración IAM mantenible identifica principal, acción, recurso y condiciones, y distingue siempre la intención de política de la evidencia real de autorización.**