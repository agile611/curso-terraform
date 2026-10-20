# IAM y principio de mínimo privilegio con Terraform y LocalStack

El principio de mínimo privilegio consiste en conceder únicamente los permisos necesarios para realizar una tarea concreta.

En AWS, IAM permite expresar esos permisos mediante identidades, políticas, recursos y condiciones.

Terraform puede crear esa configuración de forma reproducible, pero una política correctamente escrita no demuestra por sí sola que su aplicación efectiva haya sido verificada.

En LocalStack debes distinguir entre crear recursos IAM, obtener credenciales temporales y comprobar decisiones de autorización.

Esta lección desarrolla esas tres capas mediante un laboratorio con S3, SQS, roles y sesiones STS.

Las prácticas incluyen permisos permitidos, denegaciones implícitas, denegaciones explícitas, revisión de políticas y diagnóstico del emulador.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> La aplicación efectiva de IAM depende de la versión, edición y configuración de LocalStack.

---

## 1. Objetivos de aprendizaje

Esta lección convierte el mínimo privilegio en un procedimiento de diseño y verificación.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar identidad, autenticación y autorización.
- Diseñar políticas limitadas por acción y recurso.
- Separar trust policy y políticas de permisos.
- Utilizar roles mediante sesiones temporales STS.
- Explicar denegaciones implícitas y explícitas.
- Probar operaciones permitidas y prohibidas.
- Documentar limitaciones de la emulación.

### 1.2. Resultado práctico

Crearás un lector S3 y un productor SQS con permisos diferentes.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de Terraform, S3 y SQS.

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

- Creación de roles IAM.
- Creación de políticas inline.
- Obtención de sesiones con STS.
- Identificación de sesiones asumidas.
- Consulta y escritura de objetos S3.
- Envío de mensajes SQS.
- Aplicación de permisos cuando esté disponible.
- Destrucción mediante la identidad de bootstrap.

### 3.2. Registro

Documenta versiones, edición, imagen o digest y modalidad de IAM utilizada.

---

## 4. Dos modalidades del laboratorio

La práctica admite dos modalidades con conclusiones diferentes.

### 4.1. Comparación

| **Modalidad** | **Objetivo** | **Conclusión admisible** |
|---------------|-------------|--------------------------|
| Configuración | Crear y consultar políticas | La configuración existe |
| Autorización validada | Evaluar operaciones con roles | Se observaron decisiones concretas |

La segunda modalidad requiere capacidades de enforcement comprobadas.

### 4.2. Regla

No presentes una prueba de configuración como una prueba de seguridad efectiva.

### 4.3. Entrega

El alumno debe indicar qué modalidad ejecutó.

---

## 5. Identidad, autenticación y autorización

Estos conceptos participan en el acceso, pero resuelven problemas diferentes.

### 5.1. Identidad

Describe quién realiza una operación.

### 5.2. Autenticación

Permite demostrar o presentar esa identidad ante el servicio.

### 5.3. Autorización

Determina qué operaciones puede realizar sobre qué recursos.

### 5.4. Regla principal

**Reconocer una identidad no significa concederle acceso a todos los recursos.**

---

## 6. Qué representa IAM

IAM permite definir identidades y políticas de acceso dentro del modelo AWS.

### 6.1. Elementos principales

Trabajaremos con:

- Roles.
- Trust policies.
- Políticas de permisos.
- Acciones.
- ARN de recursos.
- Condiciones.
- Sesiones temporales.

### 6.2. Fuera de alcance

No configuraremos acceso humano mediante SSO ni organizaciones AWS.

---

## 7. Usuarios y roles

Un usuario y un rol no son intercambiables en su ciclo de credenciales.

### 7.1. Usuarios

Pueden disponer de credenciales de larga duración.

### 7.2. Roles

Se utilizan normalmente mediante credenciales temporales obtenidas al asumirlos.

### 7.3. Laboratorio

No crearemos access keys permanentes para usuarios IAM.

### 7.4. Motivo

Queremos practicar sesiones temporales y reducir la exposición de credenciales en el estado.

---

## 8. Credenciales ficticias y credenciales temporales

LocalStack puede aceptar credenciales ficticias para operar sobre servicios emulados.

### 8.1. Bootstrap

Utilizaremos `test` como access key y secret key locales.

### 8.2. Sesiones STS

El emulador devolverá credenciales temporales para los roles del laboratorio.

### 8.3. Precaución

Esas credenciales corresponden al entorno emulado.

### 8.4. Regla

No sustituyas los valores por credenciales reales para conseguir que una prueba funcione.

---

## 9. El principio de mínimo privilegio

El mínimo privilegio limita capacidad, alcance y contexto.

### 9.1. Preguntas de diseño

Define:

- Qué tarea realiza el componente.
- Qué acciones necesita.
- Qué recursos utiliza.
- Qué condiciones deben cumplirse.
- Durante cuánto tiempo necesita acceso.
- Cómo verificarás la denegación.

### 9.2. Regla

Empieza por el flujo de trabajo, no por una política administrativa amplia.

---

## 10. Acciones específicas

Una política debe expresar las operaciones necesarias.

### 10.1. Ejemplos

```text
s3:GetObject
s3:ListBucket
sqs:SendMessage
```

### 10.2. Acciones diferentes

Leer un objeto no equivale a listar un bucket.

Enviar un mensaje no equivale a recibirlo.

### 10.3. Regla

No concedas familias completas como `s3:*` para evitar investigar una acción concreta.

---

## 11. Recursos específicos

El mismo permiso puede tener un alcance muy distinto según `Resource`.

### 11.1. Ejemplos

```text
arn:aws:s3:::bucket-ejemplo
arn:aws:s3:::bucket-ejemplo/public/*
```

### 11.2. Distinción

El primer ARN representa el bucket.

El segundo representa objetos bajo un prefijo.

### 11.3. Regla

Una política correcta necesita el tipo de recurso correspondiente a cada acción.

---

## 12. Condiciones

Una condición restringe cuándo se aplica una declaración.

### 12.1. Laboratorio

Utilizaremos `s3:prefix` para limitar listados.

### 12.2. Otras condiciones

En AWS real pueden intervenir origen, identidad, etiquetas y contexto de sesión.

### 12.3. Precaución

Las condiciones disponibles dependen de la acción y del servicio.

### 12.4. Regla

No inventes una condición que el servicio no proporciona para esa operación.

---

## 13. Allow y Deny

Las declaraciones de una política pueden permitir o denegar acciones.

### 13.1. Denegación implícita

Si no existe un permiso aplicable, la operación normalmente no queda autorizada.

### 13.2. Denegación explícita

Una declaración `Deny` aplicable puede impedir una operación aunque exista un `Allow`.

### 13.3. Laboratorio

Incluiremos una denegación explícita de eliminación para el lector.

### 13.4. Regla

No necesitas añadir `Deny` para cada acción que no deseas permitir.

---

## 14. Evaluación simplificada de políticas

El siguiente modelo ayuda a interpretar las pruebas, pero no cubre todo AWS.

### 14.1. Secuencia conceptual

```text
¿Existe un Deny explícito aplicable?
    Sí → Denegar.
    No → Revisar permisos aplicables.

¿Existe una autorización suficiente para el contexto?
    Sí → Permitir.
    No → Denegar.
```

### 14.2. Límite

Políticas de recursos, sesiones, boundaries y organizaciones añaden reglas relevantes.

### 14.3. Regla

No conviertas este esquema simplificado en una descripción completa de todos los accesos entre cuentas.

---

## 15. Políticas de identidad y de recursos

El permiso puede asociarse a diferentes elementos del modelo.

### 15.1. Comparación

| **Tipo** | **Asociación** | **Ejemplo** |
|----------|---------------|-------------|
| Política de identidad | Rol o usuario | Leer determinados objetos |
| Política de recurso | Recurso compatible | Autorizar acceso a una cola |
| Trust policy | Rol | Determinar quién puede asumirlo |
| Política de sesión | Sesión temporal | Restringir permisos de la sesión |

Esta práctica utiliza políticas de identidad y trust policies.

### 15.2. Recursos

No añadiremos políticas públicas a los buckets.

### 15.3. Regla

Documenta qué capas participan en cada prueba.

---

## 16. Trust policy

La trust policy define quién puede asumir un rol.

### 16.1. Pregunta que responde

```text
¿Quién puede solicitar una sesión de este rol?
```

### 16.2. No responde

```text
¿Qué objetos S3 puede leer esa sesión?
```

### 16.3. Laboratorio

Delegaremos la asunción a la cuenta local identificada durante el bootstrap.

### 16.4. Precaución

Confiar en una cuenta no equivale a autorizar automáticamente a todas sus identidades en AWS real.

---

## 17. Política de permisos del rol

La política de permisos define qué puede hacer una sesión del rol.

### 17.1. Lector

Permitirá leer objetos bajo `public/`.

### 17.2. Productor

Permitirá enviar mensajes a una sola cola.

### 17.3. Separación

El lector no recibirá permisos SQS.

El productor no recibirá permisos S3.

### 17.4. Regla

Las responsabilidades distintas deben poder verificarse de forma independiente.

---

## 18. Identidad de bootstrap

Terraform necesita una identidad capaz de crear y eliminar la infraestructura.

### 18.1. Laboratorio

Utilizaremos el contexto local preparado por el docente.

### 18.2. Diferencia

Esa identidad no representa los permisos de la aplicación.

### 18.3. Enforcement

Su comportamiento con IAM activado debe comprobarse antes de la clase.

### 18.4. Regla

No utilices una prueba administrativa como evidencia de permisos mínimos del lector.

---

## 19. Arquitectura del laboratorio

Crearemos recursos autorizados y recursos de contraste.

### 19.1. Organización

```text
Rol reader
    └── Bucket data
         ├── public/hello.txt     → Lectura permitida
         └── private/internal.txt → Lectura denegada

Rol producer
    └── Cola allowed             → Envío permitido

Recursos de contraste
    ├── Bucket other             → Lectura denegada
    └── Cola other               → Envío denegado
```

### 19.2. Estado

Terraform conservará todas las relaciones en un estado local.

---

## 20. Preparación del directorio

Trabaja en una carpeta independiente.

### 20.1. Estructura

```bash
mkdir -p terraform-iam-local/app
mkdir -p terraform-iam-local/scripts
mkdir -p terraform-iam-local/planes
mkdir -p terraform-iam-local/resultados
mkdir -p terraform-iam-local/copias
mkdir -p terraform-iam-local/archivos
cd terraform-iam-local
```

### 20.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 20.3. Aislamiento

No copies estados ni metadatos de otras prácticas.

---

## 21. Protección de archivos

Separa configuración y evidencias operativas.

### 21.1. `.gitignore`

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

### 21.2. Qué conservar

Versiona configuración, scripts y `.terraform.lock.hcl`.

---

## 22. Selección de imagen

Utiliza una imagen validada por el docente.

### 22.1. Preparación

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 22.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 22.3. Edición

Verifica las capacidades IAM y STS de la edición seleccionada.

### 22.4. Regla

No presupongas enforcement por disponer de una API IAM accesible.

---

## 23. Docker Compose

La configuración permite seleccionar la modalidad validada por el docente.

### 23.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: iam,sts,s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
      ENFORCE_IAM: ${LAB_ENFORCE_IAM:-0}
```

### 23.2. Precaución

El uso y soporte de `ENFORCE_IAM` deben validarse para la imagen elegida.

---

## 24. Seleccionar modalidad

La modalidad debe quedar registrada antes del despliegue.

### 24.1. Configuración

Para practicar creación y consulta:

```bash
export LAB_ENFORCE_IAM=0
docker compose up -d
```

### 24.2. Autorización

El docente puede seleccionar `LAB_ENFORCE_IAM=1` cuando haya validado soporte y bootstrap.

### 24.3. Regla

No cambies silenciosamente de modalidad después de observar un resultado inesperado.

---

## 25. Credenciales y endpoints

Prepara un contexto local sin utilizar perfiles personales.

### 25.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_IAM AWS_ENDPOINT_URL_STS
unset AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_SQS TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 25.2. Continuación

Utiliza siempre `aws_local` para las operaciones de bootstrap.

---

## 26. Verificar servicios

Las consultas iniciales comprueban disponibilidad y contexto.

### 26.1. Comandos

```bash
aws_local iam list-roles
aws_local sts get-caller-identity
aws_local s3api list-buckets
aws_local sqs list-queues
```

### 26.2. Resultado

Registra la identidad local y las respuestas válidas.

### 26.3. Límite

`GetCallerIdentity` no demuestra autorización para operaciones S3 o SQS.

### 26.4. Regla

Si el bootstrap falla, detén la práctica y revisa la modalidad validada.

---

## 27. Requisitos de Terraform

Crea `app/versions.tf`.

### 27.1. Configuración

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

### 27.2. Estado

No utilizaremos un backend AWS remoto.

---

## 28. Proveedor local

Crea `app/providers.tf`.

### 28.1. Configuración

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
    iam = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
    s3  = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 28.2. Regla

Las omisiones no sustituyen la configuración explícita de endpoints.

---

## 29. Variables e identidad local

Crea `app/variables.tf` y `app/identity.tf`.

### 29.1. Sufijo

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 29.2. Cuenta emulada

```hcl
data "aws_caller_identity" "bootstrap" {}
```

### 29.3. Entradas

En `app/terraform.tfvars`, declara `suffix = "alumno01"`.

---

## 30. Buckets del laboratorio

Crea `app/storage.tf`.

### 30.1. Recursos

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "curso-iam-${var.suffix}-data"
  force_destroy = false
}

resource "aws_s3_bucket" "other" {
  bucket        = "curso-iam-${var.suffix}-other"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### 30.2. Continuación

Añade el bloqueo público del segundo bucket en la siguiente sección.

---

## 31. Datos ficticios y bloqueo adicional

Completa `app/storage.tf`.

### 31.1. Recursos

```hcl
resource "aws_s3_bucket_public_access_block" "other" {
  bucket                  = aws_s3_bucket.other.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "public" {
  bucket  = aws_s3_bucket.data.id
  key     = "public/hello.txt"
  content = "Contenido ficticio permitido."
}

resource "aws_s3_object" "private" {
  bucket  = aws_s3_bucket.data.id
  key     = "private/internal.txt"
  content = "Contenido ficticio restringido."
}

resource "aws_s3_object" "other" {
  bucket  = aws_s3_bucket.other.id
  key     = "public/hello.txt"
  content = "Contenido ficticio de otro bucket."
}
```

---

## 32. Colas de contraste

Crea `app/messaging.tf`.

### 32.1. Recursos

```hcl
resource "aws_sqs_queue" "allowed" {
  name                       = "curso-iam-${var.suffix}-allowed"
  visibility_timeout_seconds = 30
}

resource "aws_sqs_queue" "other" {
  name                       = "curso-iam-${var.suffix}-other"
  visibility_timeout_seconds = 30
}
```

### 32.2. Función

La primera cola recibe mensajes del productor.

La segunda permite probar una denegación por recurso.

### 32.3. Regla

Mantén los nombres distintos y registra sus URLs.

---

## 33. Trust policy compartida

Crea `app/trust.tf`.

### 33.1. Documento

```hcl
data "aws_iam_policy_document" "trust" {
  statement {
    sid     = "TrustLocalAccount"
    actions = ["sts:AssumeRole"]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.bootstrap.account_id}:root"
      ]
    }
  }
}
```

### 33.2. Laboratorio

Esta confianza simplifica el bootstrap local.

### 33.3. Producción

Debe restringirse según el componente que realmente asumirá el rol.

---

## 34. Roles de aplicación

Crea `app/roles.tf`.

### 34.1. Recursos

```hcl
resource "aws_iam_role" "reader" {
  name               = "curso-iam-${var.suffix}-reader"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

resource "aws_iam_role" "producer" {
  name               = "curso-iam-${var.suffix}-producer"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}
```

### 34.2. Separación

Ambos roles pueden compartir una trust policy y tener permisos completamente diferentes.

### 34.3. Regla

La confianza compartida no debe confundirse con privilegios compartidos.

---

## 35. Permiso de lectura S3

Crea `app/reader.tf`.

### 35.1. Declaraciones permitidas

```hcl
data "aws_iam_policy_document" "reader" {
  statement {
    sid       = "ReadPublicObjects"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.data.arn}/public/*"]
  }

  statement {
    sid       = "ListPublicPrefix"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.data.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["public/*"]
    }
  }
```

### 35.2. Continuación

Completa el documento con la denegación siguiente.

---

## 36. Denegación explícita del lector

Añade el bloque y la política inline a `app/reader.tf`.

### 36.1. Configuración

```hcl
  statement {
    sid       = "NeverDeleteDataObjects"
    effect    = "Deny"
    actions   = ["s3:DeleteObject"]
    resources = ["${aws_s3_bucket.data.arn}/*"]
  }
}

resource "aws_iam_role_policy" "reader" {
  name   = "read-public-data"
  role   = aws_iam_role.reader.id
  policy = data.aws_iam_policy_document.reader.json
}
```

### 36.2. Interpretación

La eliminación ya carecería de permiso positivo.

El `Deny` añade una restricción explícita para estudiar su precedencia.

---

## 37. Permiso del productor SQS

Crea `app/producer.tf`.

### 37.1. Configuración

```hcl
data "aws_iam_policy_document" "producer" {
  statement {
    sid       = "SendOnlyToAllowedQueue"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.allowed.arn]
  }
}

resource "aws_iam_role_policy" "producer" {
  name   = "send-allowed-queue"
  role   = aws_iam_role.producer.id
  policy = data.aws_iam_policy_document.producer.json
}
```

### 37.2. Alcance

No necesita permiso para listar colas si utiliza una URL conocida.

---

## 38. Outputs del laboratorio

Crea `app/outputs.tf`.

### 38.1. Contrato operativo

```hcl
output "lab" {
  value = {
    account_id        = data.aws_caller_identity.bootstrap.account_id
    data_bucket       = aws_s3_bucket.data.id
    other_bucket      = aws_s3_bucket.other.id
    allowed_queue_url = aws_sqs_queue.allowed.id
    other_queue_url   = aws_sqs_queue.other.id

    reader_role_name   = aws_iam_role.reader.name
    reader_role_arn    = aws_iam_role.reader.arn
    producer_role_name = aws_iam_role.producer.name
    producer_role_arn  = aws_iam_role.producer.arn
  }
}
```

### 38.2. Seguridad

No publicaremos credenciales temporales en outputs Terraform.

---

## 39. Sesión 1: revisar y desplegar

Duración orientativa: 30 minutos.

### 39.1. Secuencia

```bash
terraform -chdir=app init
terraform -chdir=app fmt
terraform -chdir=app validate

terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan
```

### 39.2. Resultado esperado

El plan inicial crea trece recursos administrados.

### 39.3. Revisión

Los documentos IAM y la identidad de bootstrap son data sources.

---

## 40. Sesión 2: conservar identificadores

Prepara las referencias necesarias para las pruebas.

### 40.1. Comandos

```bash
terraform -chdir=app output -json lab > resultados/lab.json

DATA_BUCKET="$(jq -er '.data_bucket' resultados/lab.json)"
OTHER_BUCKET="$(jq -er '.other_bucket' resultados/lab.json)"
ALLOWED_QUEUE="$(jq -er '.allowed_queue_url' resultados/lab.json)"
OTHER_QUEUE="$(jq -er '.other_queue_url' resultados/lab.json)"
READER_NAME="$(jq -er '.reader_role_name' resultados/lab.json)"
PRODUCER_NAME="$(jq -er '.producer_role_name' resultados/lab.json)"
```

### 40.2. Regla

Usa el fichero publicado, no ARN escritos a mano.

### 40.3. Modalidad

Registra también el valor de `LAB_ENFORCE_IAM`.

---

## 41. Sesión 3: consultar políticas

Verifica que las políticas creadas corresponden al diseño.

### 41.1. Comandos

```bash
aws_local iam get-role-policy \
  --role-name "$READER_NAME" \
  --policy-name read-public-data \
  > resultados/reader-policy.json

aws_local iam get-role-policy \
  --role-name "$PRODUCER_NAME" \
  --policy-name send-allowed-queue \
  > resultados/producer-policy.json
```

### 41.2. Revisión

Comprueba acciones, recursos, condición de prefijo y denegación explícita.

### 41.3. Límite

La consulta demuestra configuración, no enforcement.

---

## 42. Ejecutar comandos con sesiones temporales

Un script obtendrá una sesión y ejecutará un comando con esas credenciales.

### 42.1. Objetivos

No exportar credenciales temporales a la terminal general.

No guardarlas como outputs.

No imprimir la respuesta completa de `AssumeRole`.

### 42.2. Alcance

El script utiliza exclusivamente el endpoint local.

### 42.3. Regla

La sesión pertenece al proceso hijo, no al contexto de bootstrap del alumno.

---

## 43. Script: estructura y entorno

Crea `scripts/as-role.py`.

### 43.1. Código inicial

```python
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "http://127.0.0.1:4566"
SANDBOX = ROOT / ".sandbox"
SANDBOX.mkdir(parents=True, exist_ok=True)

config = SANDBOX / "config"
credentials_file = SANDBOX / "credentials"
config.write_text("[default]\nregion = us-east-1\n", encoding="utf-8")
credentials_file.write_text("", encoding="utf-8")

for file in (config, credentials_file):
    file.chmod(0o600)
```

---

## 44. Script: preparar bootstrap

Añade el entorno controlado al mismo archivo.

### 44.1. Implementación

```python
keep = ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR"]
environment = {
    key: os.environ[key]
    for key in keep
    if key in os.environ
}
environment.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_REGION": "us-east-1",
    "AWS_CONFIG_FILE": str(config),
    "AWS_SHARED_CREDENTIALS_FILE": str(credentials_file),
    "AWS_EC2_METADATA_DISABLED": "true",
    "AWS_PAGER": "",
    "AWS_CLI_AUTO_PROMPT": "off",
})

aws_binary = shutil.which("aws")
if aws_binary is None:
    raise SystemExit("No se encuentra AWS CLI.")
```

---

## 45. Script: seleccionar rol y comando

Añade las validaciones de argumentos.

### 45.1. Implementación

```python
if len(sys.argv) < 4 or sys.argv[1] not in {"reader", "producer"}:
    raise SystemExit("Uso: as-role.py reader|producer servicio operacion ...")

role_key = sys.argv[1]
operation = sys.argv[2:]

if operation[0] not in {"s3api", "sqs", "sts"}:
    raise SystemExit("Servicio no previsto en esta práctica.")

for argument in operation:
    if argument.split("=", 1)[0] in {
        "--endpoint-url", "--region", "--profile", "--no-sign-request"
    }:
        raise SystemExit("No se permite sobrescribir el contexto.")

lab = json.loads((ROOT / "resultados" / "lab.json").read_text())
role_arn = lab[f"{role_key}_role_arn"]

base = [
    aws_binary, "--endpoint-url", ENDPOINT,
    "--region", "us-east-1", "--output", "json",
]
```

---

## 46. Script: obtener la sesión

Añade la solicitud STS sin imprimir sus credenciales.

### 46.1. Implementación

```python
assume = subprocess.run(
    base + [
        "sts", "assume-role",
        "--role-arn", role_arn,
        "--role-session-name", f"lab-{role_key}",
        "--duration-seconds", "900",
    ],
    env=environment,
    capture_output=True,
    text=True,
)

if assume.returncode != 0:
    sys.stderr.write(assume.stderr)
    raise SystemExit("No se obtuvo una sesión local del rol.")

session = json.loads(assume.stdout)["Credentials"]

environment.update({
    "AWS_ACCESS_KEY_ID": session["AccessKeyId"],
    "AWS_SECRET_ACCESS_KEY": session["SecretAccessKey"],
    "AWS_SESSION_TOKEN": session["SessionToken"],
})
```

---

## 47. Script: ejecutar la operación

Completa `scripts/as-role.py`.

### 47.1. Código

```python
result = subprocess.run(
    base + operation,
    env=environment,
    cwd=ROOT,
)

raise SystemExit(result.returncode)
```

### 47.2. Alcance

Cada ejecución obtiene una sesión nueva.

### 47.3. Limitación

El script no es una sandbox ni una herramienta de autorización granular.

### 47.4. Regla

No amplíes sus servicios o argumentos sin revisar el procedimiento.

---

## 48. Sesión 4: identificar la sesión

Comprueba que los comandos utilizan una identidad asumida.

### 48.1. Comandos

```bash
python3 -m py_compile scripts/as-role.py

python3 scripts/as-role.py reader sts get-caller-identity \
  > resultados/reader-identity.json

python3 scripts/as-role.py producer sts get-caller-identity \
  > resultados/producer-identity.json
```

### 48.2. Resultado esperado

Los ARN corresponden a sesiones de los roles respectivos.

### 48.3. Regla

La identidad correcta es necesaria, pero no demuestra permisos mínimos efectivos.

---

## 49. Matriz de autorización esperada

La matriz expresa el objetivo del diseño.

### 49.1. Casos principales

| **Rol** | **Operación** | **Resultado esperado con enforcement validado** |
|---------|---------------|-----------------------------------------------|
| Reader | Leer `public/hello.txt` | Permitido |
| Reader | Leer `private/internal.txt` | Denegado |
| Reader | Leer el otro bucket | Denegado |
| Reader | Listar `public/` | Permitido |
| Producer | Enviar a allowed | Permitido |
| Producer | Enviar a other | Denegado |
| Producer | Recibir de allowed | Denegado |

Las expectativas deben contrastarse con resultados observados.

### 49.2. Configuración sin enforcement

Puede devolver resultados distintos sin invalidar la creación de las políticas.

### 49.3. Regla

Clasifica esos resultados como límites de la modalidad, no como garantías de seguridad.

---

## 50. Sesión 5: lectura permitida

Comienza por una operación positiva.

### 50.1. Comando

```bash
python3 scripts/as-role.py reader s3api get-object \
  --bucket "$DATA_BUCKET" \
  --key public/hello.txt \
  resultados/reader-public.txt \
  > resultados/reader-public-metadata.json

cat resultados/reader-public.txt
```

### 50.2. Resultado esperado

La lectura devuelve el contenido ficticio permitido.

### 50.3. Interpretación

Si falla, revisa sesión, ARN, política, existencia y enforcement.

---

## 51. Sesión 6: lectura privada

Ahora prueba una denegación implícita por recurso.

### 51.1. Comando

```bash
python3 scripts/as-role.py reader s3api get-object \
  --bucket "$DATA_BUCKET" \
  --key private/internal.txt \
  resultados/reader-private-unexpected.txt
```

### 51.2. Resultado esperado

Con enforcement validado, la operación se deniega.

### 51.3. Si tiene éxito

Registra una discrepancia y no declares mínimo privilegio efectivo.

### 51.4. Regla

No confundas ausencia del objeto con una denegación de acceso.

---

## 52. Sesión 7: bucket no autorizado

La misma key no implica el mismo recurso autorizado.

### 52.1. Comando

```bash
python3 scripts/as-role.py reader s3api get-object \
  --bucket "$OTHER_BUCKET" \
  --key public/hello.txt \
  resultados/reader-other-unexpected.txt
```

### 52.2. Resultado esperado

La lectura se deniega con enforcement validado.

### 52.3. Explicación

La política del lector limita el ARN al bucket `data`.

### 52.4. Regla

Un prefijo permitido en un bucket no concede acceso al mismo prefijo de todos los buckets.

---

## 53. Sesión 8: listado condicionado

Comprueba la acción de bucket y su condición.

### 53.1. Comandos

```bash
python3 scripts/as-role.py reader s3api list-objects-v2 \
  --bucket "$DATA_BUCKET" \
  --prefix public/

python3 scripts/as-role.py reader s3api list-objects-v2 \
  --bucket "$DATA_BUCKET" \
  --prefix private/
```

### 53.2. Resultado esperado

El primer listado se permite.

El segundo se deniega con enforcement validado.

### 53.3. Regla

Listar nombres de objetos y leer su contenido requieren permisos diferentes.

---

## 54. Sesión 9: escritura y eliminación

Estas pruebas negativas pueden ser destructivas si el emulador no aplica IAM.

### 54.1. Precaución previa

Utiliza únicamente archivos ficticios recuperables del laboratorio.

### 54.2. Escritura

Intenta cargar `public/attempt.txt` con el lector.

### 54.3. Eliminación

Intenta eliminar `public/hello.txt` con el lector.

### 54.4. Expectativa

La escritura carece de `Allow`; la eliminación tiene un `Deny` explícito.

### 54.5. Regla

Si una operación inesperadamente tiene éxito, registra y restaura el laboratorio antes de continuar.

---

## 55. Sesión 10: envío permitido

El productor utiliza una URL conocida y una sola acción.

### 55.1. Comando

```bash
python3 scripts/as-role.py producer sqs send-message \
  --queue-url "$ALLOWED_QUEUE" \
  --message-body '{"event_id":"IAM-001","source":"producer"}' \
  > resultados/producer-send.json
```

### 55.2. Resultado esperado

El mensaje se envía a la cola autorizada.

### 55.3. Verificación independiente

El bootstrap puede recibirlo para comprobar su contenido.

### 55.4. Regla

Esa recepción administrativa no atribuye permiso de recepción al productor.

---

## 56. Sesión 11: operaciones SQS denegadas

Comprueba acción y recurso por separado.

### 56.1. Comandos

```bash
python3 scripts/as-role.py producer sqs send-message \
  --queue-url "$OTHER_QUEUE" \
  --message-body '{"event_id":"IAM-NEGATIVE"}'

python3 scripts/as-role.py producer sqs receive-message \
  --queue-url "$ALLOWED_QUEUE" \
  --wait-time-seconds 1
```

### 56.2. Resultado esperado

Ambas operaciones se deniegan con enforcement validado.

### 56.3. Regla

La primera falla por alcance del recurso; la segunda por ausencia de permiso de acción.

---

## 57. Capturar códigos y errores

Un código no nulo no basta para demostrar una denegación IAM.

### 57.1. Ejemplo

```bash
set +e
python3 scripts/as-role.py producer sqs receive-message \
  --queue-url "$ALLOWED_QUEUE" \
  > resultados/receive-negative.stdout.txt \
  2> resultados/receive-negative.stderr.txt
CODE=$?
set -e

printf '%s\n' "$CODE" > resultados/receive-negative.exit.txt
```

### 57.2. Revisión

Distingue denegación, error de red, recurso inexistente y fallo al asumir el rol.

### 57.3. Regla

Registra el motivo concreto observado.

---

## 58. Interpretar resultados inesperados

Una prueba puede fallar por razones distintas al diseño de la política.

### 58.1. Lista de revisión

Comprueba modalidad, soporte, sesión y credenciales efectivas.

Revisa ARN, condiciones, nombres y existencia de recursos.

### 58.2. Bootstrap

Distingue un fallo STS de una denegación S3 o SQS.

### 58.3. Emulador

Revisa logs y documentación de la imagen validada.

### 58.4. Regla

No añadas `Action = "*"` y `Resource = "*"` para hacer pasar la prueba.

---

## 59. Simuladores de políticas

Una simulación puede aportar información adicional, pero no sustituye una operación real.

### 59.1. Disponibilidad

Las API de simulación IAM deben validarse por separado en LocalStack.

### 59.2. Límite

Un simulador puede no reproducir todo el contexto de políticas de recursos o servicios.

### 59.3. Laboratorio

No depende de esas API para ejecutar sus sesiones.

### 59.4. Regla

No interpretes una respuesta simulada como certificación completa de autorización.

---

## 60. Permisos de sesión y boundaries

AWS permite añadir límites adicionales al permiso de un rol.

### 60.1. Política de sesión

Puede restringir la sesión obtenida mediante STS.

### 60.2. Permissions boundary

Limita permisos máximos de una identidad en el modelo correspondiente.

### 60.3. Organizaciones

Las SCP añaden restricciones organizativas, pero no conceden permisos por sí solas.

### 60.4. Regla

Estos mecanismos no se implementan en esta práctica ni deben inferirse de sus resultados.

---

## 61. Mínimo privilegio de Terraform

La identidad que aplica infraestructura también merece una política diseñada.

### 61.1. Diferencia

Terraform necesita crear, leer, modificar y eliminar recursos.

La aplicación puede necesitar únicamente leer o enviar.

### 61.2. Diseño

Una política de despliegue requiere revisar operaciones del proveedor y recursos auxiliares.

### 61.3. Laboratorio

No intentaremos derivarla automáticamente de dos permisos de aplicación.

### 61.4. Regla

No confundas mínimo privilegio del consumidor con mínimo privilegio del proceso de aprovisionamiento.

---

## 62. Estado y material sensible

Terraform puede conservar documentos IAM e identificadores en el estado.

### 62.1. Credenciales

Crear access keys mediante recursos Terraform puede introducir material sensible en ese estado.

### 62.2. Decisión del laboratorio

Las credenciales STS se obtienen fuera de Terraform y se mantienen en memoria del proceso.

### 62.3. Límite

Logs, capturas y programas de diagnóstico todavía pueden revelar datos si se configuran incorrectamente.

### 62.4. Regla

Protege estados, planes y evidencias independientemente de su contenido previsto.

---

## 63. Preparar la limpieza

La limpieza debe utilizar el bootstrap, no los roles restringidos.

### 63.1. Evidencias

```bash
umask 077
terraform -chdir=app state pull > copias/before-destroy.tfstate

aws_local iam get-role \
  --role-name "$READER_NAME" \
  > resultados/reader-before-destroy.json
```

### 63.2. Datos adicionales

Elimina `public/attempt.txt` si una prueba negativa lo creó inesperadamente.

### 63.3. Regla

Detén operaciones de aplicación antes de destruir.

---

## 64. Reconciliar antes de destruir

Una prueba inesperadamente permitida puede haber cambiado los datos.

### 64.1. Procedimiento

Revisa un plan completo con el bootstrap.

Comprueba objetos eliminados y contenido adicional.

### 64.2. Estado

Terraform administra los tres objetos originales.

No administra automáticamente archivos adicionales creados mediante CLI.

### 64.3. Regla

No presupongas que `destroy` limpiará contenido ajeno al estado con `force_destroy = false`.

---

## 65. Destruir y verificar

Mantén LocalStack disponible durante la destrucción.

### 65.1. Secuencia revisada

```bash
terraform -chdir=app plan -destroy -out=../planes/destroy.tfplan
terraform -chdir=app show ../planes/destroy.tfplan
terraform -chdir=app apply ../planes/destroy.tfplan

terraform -chdir=app state list
aws_local s3api list-buckets
aws_local sqs list-queues
aws_local iam list-roles
docker compose down
```

### 65.2. Resultado esperado

Desaparecen los recursos del laboratorio, no necesariamente todos los recursos del emulador.

---

## 66. Diferencias respecto a AWS real

La emulación permite practicar diseño y determinadas decisiones de autorización.

### 66.1. Aspectos adicionales

En AWS real revisa políticas de recursos, organizaciones, boundaries y acceso entre cuentas.

### 66.2. Propagación

Los cambios IAM pueden requerir tiempo para hacerse efectivos.

### 66.3. Enforcement

La cobertura del emulador puede variar por acción, condición y servicio.

### 66.4. Regla

Una matriz local correcta no constituye una certificación de seguridad para producción.

---

## 67. Ejercicios y evaluación

La evaluación debe demostrar diseño, observación y límites explícitos.

### 67.1. Ejercicios

1. Explica trust policy y permisos.
2. Justifica cada acción concedida.
3. Comprueba recursos y condiciones.
4. Ejecuta pruebas positivas y negativas.
5. Distingue denegación implícita y explícita.
6. Documenta una discrepancia del emulador.
7. Diseña un rol consumidor SQS sin implementarlo.
8. Destruye y verifica los recursos.

### 67.2. Entrega

Incluye configuración, políticas, matriz observada y modalidad utilizada.

---

## 68. Resumen de la lección

El mínimo privilegio combina diseño explícito y verificación de decisiones de acceso.

### 68.1. Ideas esenciales

- Identidad y autorización son conceptos diferentes.
- La trust policy permite asumir; la política define operaciones.
- Acciones y ARN deben corresponder.
- Las condiciones limitan contexto.
- Un `Deny` explícito tiene consecuencias importantes.
- Las sesiones temporales reducen credenciales persistentes.
- Crear IAM no demuestra enforcement.
- Las pruebas negativas necesitan interpretación precisa.

### 68.2. Procedimiento recomendado

Define responsabilidades, limita permisos, utiliza sesiones y contrasta resultados con el servicio.

### 68.3. Idea final

**Un diseño de mínimo privilegio fiable concede únicamente lo necesario y aporta evidencias claras de lo permitido, lo denegado y lo que el entorno de prueba todavía no puede demostrar.**