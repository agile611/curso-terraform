# Versionado y reutilización de módulos con Terraform y LocalStack

Un módulo reutilizable necesita algo más que una carpeta compartida.

También necesita una identidad, una política de versiones y un procedimiento que permita actualizar consumidores sin perder el control de la infraestructura.

Terraform puede descargar módulos desde rutas locales, repositorios Git y registros compatibles.

Cada mecanismo tiene reglas diferentes para seleccionar revisiones y conservar dependencias.

En esta lección crearás un repositorio Git local con tres versiones de un módulo SQS.

Después utilizarás esas versiones desde dos proyectos Terraform independientes.

Las sesiones incluyen publicación, fijación de revisiones, actualizaciones compatibles, cambios incompatibles, migraciones de estado y recuperación operacional.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> El repositorio de módulos será local y no necesitarás publicar código en Internet.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento verificable para distribuir y actualizar módulos.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar versiones de módulos y proveedores.
- Seleccionar módulos mediante tags o commits.
- Explicar los límites del archivo de bloqueo.
- Reutilizar una versión desde varios consumidores.
- Publicar cambios compatibles e incompatibles.
- Migrar direcciones mediante bloques `moved`.
- Revisar planes de actualización.
- Documentar procedimientos de recuperación.

### 1.2. Resultado práctico

Crearás tres versiones de un módulo y actualizarás dos consumidores de forma independiente.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, estado y planes.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
git --version
python3 --version
jq --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir esta práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Descarga de módulos desde Git local.
- Selección de tags y commits.
- Creación y actualización de colas SQS.
- Lectura de atributos y etiquetas.
- Aplicación de bloques `moved`.
- Ejecución de planes guardados.
- Destrucción desde ambos consumidores.

### 3.2. Registro del entorno

Documenta Terraform, Git, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Git distribuye el módulo; LocalStack emula los recursos administrados.

---

## 4. Qué significa reutilizar un módulo

Reutilizar significa consumir una implementación mediante una interfaz definida.

### 4.1. No significa

- Compartir automáticamente el estado.
- Compartir credenciales.
- Actualizar todos los consumidores a la vez.
- Administrar el mismo recurso remoto desde varios estados.

### 4.2. Laboratorio

Dos proyectos utilizarán el mismo módulo.

Cada proyecto creará una cola diferente y conservará su propio estado.

### 4.3. Regla principal

**Compartir código no equivale a compartir la relación de gestión con los recursos.**

---

## 5. Tres dimensiones de una actualización

Una actualización puede afectar más que la sintaxis de una llamada.

### 5.1. Comparación

| **Dimensión** | **Pregunta** | **Ejemplo** |
|---------------|--------------|-------------|
| Interfaz | ¿La llamada sigue siendo válida? | Renombrar una variable |
| Comportamiento | ¿Cambia la infraestructura? | Modificar un default |
| Estado | ¿Cambian las direcciones? | Renombrar un recurso interno |

Estas dimensiones deben revisarse por separado.

### 5.2. Consecuencia

Un cambio interno puede conservar la interfaz y aun así necesitar una migración.

### 5.3. Regla

No declares compatibilidad únicamente porque `terraform validate` termina correctamente.

---

## 6. Versionado semántico

Una convención habitual utiliza versiones con tres componentes.

### 6.1. Ejemplo

```text
1.2.3
│ │ └── PATCH
│ └──── MINOR
└────── MAJOR
```

### 6.2. Interpretación convencional

PATCH suele identificar correcciones compatibles.

MINOR suele identificar nuevas capacidades compatibles.

MAJOR suele identificar cambios incompatibles.

### 6.3. Límite

Terraform no demuestra automáticamente que una publicación respete esa convención.

---

## 7. Versiones previstas para la práctica

Publicaremos tres revisiones con objetivos diferentes.

### 7.1. Plan de versiones

| **Versión** | **Cambio** | **Impacto principal** |
|-------------|------------|----------------------|
| `v1.0.0` | Cola y outputs básicos | Implementación inicial |
| `v1.1.0` | Etiquetas opcionales | Ampliación compatible |
| `v2.0.0` | Entrada renombrada y recurso reorganizado | Adaptación y migración |

Las versiones serán tags del repositorio Git local.

### 7.2. Publicación

Cada tag apuntará a un commit concreto.

### 7.3. Regla

Un número de versión comunica intención; el commit identifica contenido.

---

## 8. Fuentes de módulos

Terraform admite varios mecanismos de distribución.

### 8.1. Comparación

| **Fuente** | **Selección** | **Consideración** |
|------------|---------------|-------------------|
| Ruta local | Directorio actual | Cambios visibles directamente |
| Git | `ref` | Tag, rama o commit |
| Registro | `version` | Restricciones de versiones |
| Archivo distribuido | Dirección del paquete | Integridad y procedencia |

Esta práctica utiliza Git local.

### 8.2. Motivo

Permite estudiar revisiones sin depender de servicios externos.

### 8.3. Regla

No mezcles las reglas de selección de un registro con las de Git.

---

## 9. Rutas locales frente a fuentes Git

Ambas pueden residir en la misma máquina, pero no se comportan igual.

### 9.1. Ruta local

Una llamada con `source = "../modules/queue"` utiliza los archivos locales correspondientes.

### 9.2. Fuente Git

Terraform instala una revisión del repositorio en su directorio de módulos.

### 9.3. Consecuencia

Editar el repositorio después no modifica automáticamente una instalación Git ya seleccionada.

### 9.4. Regla

Distingue directorio de desarrollo y copia instalada para el consumidor.

---

## 10. Tags, ramas y commits

Una referencia Git puede tener diferentes grados de estabilidad.

### 10.1. Comparación

| **Referencia** | **Ventaja** | **Riesgo** |
|----------------|-------------|-----------|
| Rama | Sigue desarrollo | Puede cambiar |
| Tag | Nombre de publicación | Puede moverse si se permite |
| Commit completo | Identifica contenido concreto | Menos legible |
| Sin `ref` | Configuración breve | Sigue la referencia predeterminada |

Para publicaciones, evita referencias ambiguas.

### 10.2. Laboratorio

Usaremos tags y después fijaremos un commit completo.

### 10.3. Regla

Trata los tags publicados como inmutables aunque Git permita modificarlos.

---

## 11. El argumento `version`

El argumento `version` se utiliza con fuentes de registro compatibles.

### 11.1. No utilizar con Git

Una fuente Git selecciona su revisión mediante `ref`.

### 11.2. Ejemplo conceptual

```hcl
module "queue" {
  source = "git::file:///ruta/repositorio//modules/queue?ref=v1.0.0"
}
```

### 11.3. Restricción

`source` debe declararse con una cadena literal compatible con la versión utilizada.

### 11.4. Laboratorio

Un script generará esa cadena antes de ejecutar Terraform.

---

## 12. El archivo `.terraform.lock.hcl`

El archivo de bloqueo registra selecciones y verificaciones de proveedores.

### 12.1. Qué conserva

Incluye versiones seleccionadas y hashes de paquetes de proveedores.

### 12.2. Qué no conserva automáticamente

No fija todas las revisiones de módulos Git ni todas las versiones de módulos remotos.

### 12.3. Consecuencia

Un consumidor necesita declarar una fuente suficientemente precisa.

### 12.4. Regla principal

**Versionar `.terraform.lock.hcl` no sustituye fijar las dependencias de módulos.**

---

## 13. Arquitectura del laboratorio

Separaremos repositorio de módulos y proyectos consumidores.

### 13.1. Organización

```text
Repositorio Git del módulo
    ├── v1.0.0
    ├── v1.1.0
    └── v2.0.0
         │
         ├── Consumidor orders ──→ Cola orders
         └── Consumidor audit  ──→ Cola audit
```

### 13.2. Estado

Cada consumidor tendrá un estado local independiente.

### 13.3. Aislamiento

Las dos colas utilizarán nombres diferentes.

---

## 14. Preparación del directorio

Trabaja en una carpeta independiente.

### 14.1. Estructura

```bash
mkdir -p terraform-module-releases/module-repository/modules/queue
mkdir -p terraform-module-releases/consumers/orders
mkdir -p terraform-module-releases/consumers/audit
mkdir -p terraform-module-releases/scripts
mkdir -p terraform-module-releases/planes
mkdir -p terraform-module-releases/resultados
mkdir -p terraform-module-releases/copias
cd terraform-module-releases
```

### 14.2. Ejecución

Salvo indicación expresa, ejecuta comandos desde esta raíz.

### 14.3. Alcance

No reutilices estados de otras lecciones.

---

## 15. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 15.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
planes/
resultados/
copias/
crash.log
```

### 15.2. Qué conservar

Versiona módulos, consumidores, scripts y archivos de bloqueo de proveedores.

### 15.3. Precaución

Los estados y planes pueden contener información sensible.

---

## 16. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 16.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 16.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs
      AWS_DEFAULT_REGION: us-east-1
```

### 16.3. Alcance

No necesitas montar el socket Docker para esta práctica SQS.

---

## 17. Credenciales y conectividad

Configura la terminal antes de utilizar Terraform o AWS CLI.

### 17.1. Preparación

```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SQS TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 17.2. Comprobación

Ejecuta `aws_local sqs list-queues` y espera una respuesta válida.

---

## 18. Inicializar el repositorio Git

El repositorio del módulo tendrá su propia historia.

### 18.1. Comandos

```bash
git -C module-repository init
git -C module-repository config user.name "Alumno Terraform"
git -C module-repository config user.email "alumno@example.invalid"
```

### 18.2. Identidad

Utilizamos una identidad ficticia de laboratorio.

### 18.3. Rama

Los comandos posteriores no dependen de un nombre concreto de rama.

### 18.4. Regla

No crees commits en otro repositorio por ejecutar Git desde un directorio equivocado.

---

## 19. Requisitos del módulo v1

Crea `module-repository/modules/queue/versions.tf`.

### 19.1. Configuración

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

### 19.2. Proveedor

El módulo declara su dependencia y hereda configuración desde el consumidor.

### 19.3. Alcance

No incluye credenciales ni endpoints locales.

---

## 20. Variables de v1.0.0

Crea `module-repository/modules/queue/variables.tf`.

### 20.1. Contrato inicial

```hcl
variable "name" {
  description = "Nombre de la cola estándar."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,59}$", var.name))
    error_message = "Usa entre 3 y 60 caracteres: minúsculas, dígitos y guiones."
  }
}

variable "visibility_timeout_seconds" {
  description = "Visibilidad de un mensaje recibido."
  type        = number
  default     = 60
}
```

### 20.2. Simplificación

La validación completa de visibilidad se deja como ejercicio de ampliación.

---

## 21. Recursos y outputs de v1

Crea `main.tf` y `outputs.tf` dentro del módulo.

### 21.1. Recurso

```hcl
resource "aws_sqs_queue" "this" {
  name                       = var.name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = 86400
}
```

### 21.2. Outputs

```hcl
output "queue_name" {
  value = aws_sqs_queue.this.name
}

output "queue_url" {
  value = aws_sqs_queue.this.id
}

output "queue_arn" {
  value = aws_sqs_queue.this.arn
}
```

---

## 22. Documentar la publicación inicial

Crea `module-repository/CHANGELOG.md`.

### 22.1. Contenido

```markdown
# Changelog

## v1.0.0

- Crea una cola SQS estándar.
- Recibe name y visibility_timeout_seconds.
- Publica queue_name, queue_url y queue_arn.
- Utiliza retención de 86400 segundos.
- No configura consumidores ni DLQ.
```

### 22.2. README

Añade `modules/queue/README.md` con propósito, entradas, outputs y límites.

### 22.3. Regla

El changelog explica cambios; el README explica uso vigente.

---

## 23. Sesión 1: publicar v1.0.0

Duración orientativa: 20 minutos.

### 23.1. Secuencia

```bash
terraform fmt -recursive module-repository

git -C module-repository add .
git -C module-repository commit -m "Publicar modulo queue v1.0.0"
git -C module-repository tag -a v1.0.0 -m "Release v1.0.0"

git -C module-repository log --oneline --decorate -3
git -C module-repository status --short
```

### 23.2. Resultado esperado

El tag apunta al commit inicial y no quedan cambios pendientes.

### 23.3. Regla

No etiquetes una revisión sin comprobar su contenido.

---

## 24. Preparar consumidores independientes

Ambos consumidores utilizarán archivos raíz similares.

### 24.1. Requisitos compartidos

Crea `consumers/orders/versions.tf`:

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

### 24.2. Copia

Copia este archivo a `consumers/audit/versions.tf`.

### 24.3. Backend

Ambos utilizarán su propio backend local predeterminado.

---

## 25. Proveedor de los consumidores

Crea `consumers/orders/providers.tf`.

### 25.1. Configuración

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

### 25.2. Copia

Copia el archivo a `consumers/audit/providers.tf`.

### 25.3. Regla

La fuente Git del módulo no configura el proveedor del consumidor.

---

## 26. Variables y outputs raíz

Crea estos archivos en ambos consumidores.

### 26.1. Variable

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 26.2. Resultados

```hcl
output "queue" {
  value = {
    name = module.queue.queue_name
    url  = module.queue.queue_url
    arn  = module.queue.queue_arn
  }
}
```

---

## 27. Entradas del alumno

Crea `terraform.tfvars` en cada consumidor.

### 27.1. Valor

```hcl
suffix = "alumno01"
```

### 27.2. Entorno compartido

Cada alumno debe utilizar un sufijo diferente si comparte LocalStack.

### 27.3. Nombres previstos

Las colas serán:

```text
curso-release-alumno01-orders
curso-release-alumno01-audit
```

### 27.4. Regla

Dos estados independientes no deben administrar deliberadamente una misma cola.

---

## 28. Generar fuentes Git locales

Crea `scripts/select-release.py`.

### 28.1. Implementación

```python
import argparse
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("consumer", choices=["orders", "audit"])
parser.add_argument("ref")
parser.add_argument("--v2", action="store_true")
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
repository = root / "module-repository"

subprocess.run(
    ["git", "-C", str(repository), "rev-parse", "--verify", f"{args.ref}^{{commit}}"],
    check=True,
    stdout=subprocess.DEVNULL,
)

source = f"git::{repository.as_uri()}//modules/queue?ref={args.ref}"
input_name = "queue_name" if args.v2 else "name"
queue_name = f"curso-release-${{var.suffix}}-{args.consumer}"

content = (
    'module "queue" {\n'
    f"  source = {json.dumps(source)}\n"
    f"  {input_name} = {json.dumps(queue_name)}\n"
    "}\n"
)

target = root / "consumers" / args.consumer / "main.tf"
target.write_text(content, encoding="utf-8")
print(target)
```

---

## 29. Alcance del generador

El script escribe una configuración literal antes de inicializar Terraform.

### 29.1. No hace

No aplica infraestructura.

No decide automáticamente si una actualización es segura.

### 29.2. Compatibilidad

Está diseñado para este repositorio y sus nombres de publicación.

### 29.3. Portabilidad

La dirección `file` contiene una ruta absoluta de la máquina del alumno.

### 29.4. Regla

Regenera la fuente al mover el laboratorio a otro equipo.

---

## 30. Sesión 2: consumir v1.0.0

Prepara ambos proyectos con la misma publicación.

### 30.1. Generación e inicialización

```bash
python3 scripts/select-release.py orders v1.0.0
python3 scripts/select-release.py audit v1.0.0

terraform -chdir=consumers/orders init
terraform -chdir=consumers/audit init

terraform -chdir=consumers/orders validate
terraform -chdir=consumers/audit validate
```

### 30.2. Resultado

Terraform instala el módulo en el contexto de cada consumidor.

### 30.3. Regla

No copies manualmente `.terraform` entre los proyectos.

---

## 31. Sesión 3: desplegar orders

Revisa el primer consumidor antes de aplicar.

### 31.1. Secuencia

```bash
terraform -chdir=consumers/orders plan \
  -out=../../planes/orders-v1.tfplan

terraform -chdir=consumers/orders show \
  ../../planes/orders-v1.tfplan

terraform -chdir=consumers/orders apply \
  ../../planes/orders-v1.tfplan

terraform -chdir=consumers/orders output -json queue \
  > resultados/orders-v1.json
```

### 31.2. Resultado esperado

Se crea una cola.

### 31.3. Dirección

El estado registra `module.queue.aws_sqs_queue.this`.

---

## 32. Sesión 4: desplegar audit

El segundo proyecto conserva una relación de gestión independiente.

### 32.1. Secuencia

```bash
terraform -chdir=consumers/audit plan \
  -out=../../planes/audit-v1.tfplan

terraform -chdir=consumers/audit show \
  ../../planes/audit-v1.tfplan

terraform -chdir=consumers/audit apply \
  ../../planes/audit-v1.tfplan

terraform -chdir=consumers/audit output -json queue \
  > resultados/audit-v1.json
```

### 32.2. Resultado esperado

Existe una segunda cola con otro nombre.

### 32.3. Regla

Compartir versión no sincroniza estados ni despliegues.

---

## 33. Verificar identidad y aislamiento

Conserva los identificadores antes de actualizar.

### 33.1. Comandos

```bash
ORDERS_URL="$(jq -er '.url' resultados/orders-v1.json)"
AUDIT_URL="$(jq -er '.url' resultados/audit-v1.json)"

aws_local sqs get-queue-attributes \
  --queue-url "$ORDERS_URL" \
  --attribute-names QueueArn VisibilityTimeout

aws_local sqs get-queue-attributes \
  --queue-url "$AUDIT_URL" \
  --attribute-names QueueArn VisibilityTimeout
```

### 33.2. Resultado

Las URLs y ARN deben ser distintos.

### 33.3. Regla

La dirección Terraform necesita contexto de estado para identificar un objeto remoto.

---

## 34. Inspeccionar módulos instalados

Terraform conserva metadatos locales de instalación.

### 34.1. Consulta

```bash
jq '.' consumers/orders/.terraform/modules/modules.json
jq '.' consumers/audit/.terraform/modules/modules.json
```

### 34.2. Alcance

Puedes observar fuentes y directorios instalados.

### 34.3. Precaución

El archivo es un detalle operativo, no un manifiesto universal de integridad del contenido.

### 34.4. Regla

No lo edites para actualizar una dependencia; modifica la configuración y reinicializa.

---

## 35. Preparar v1.1.0

La nueva versión añadirá etiquetas opcionales.

### 35.1. Variable adicional

Añade a `module-repository/modules/queue/variables.tf`:

```hcl
variable "tags" {
  description = "Etiquetas adicionales del consumidor."
  type        = map(string)
  default     = {}
  nullable    = false
}
```

### 35.2. Compatibilidad

Las llamadas existentes no necesitan proporcionar la nueva entrada.

### 35.3. Regla

Un atributo opcional con default facilita compatibilidad, pero no demuestra ausencia de cambios operacionales.

---

## 36. Implementación de v1.1.0

Actualiza `module-repository/modules/queue/main.tf`.

### 36.1. Recurso

```hcl
resource "aws_sqs_queue" "this" {
  name                       = var.name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = 86400

  tags = merge(var.tags, {
    ManagedBy = "Terraform"
  })
}
```

### 36.2. Consecuencia

Los consumidores existentes recibirán una etiqueta adicional al actualizar y aplicar.

### 36.3. Documentación

Indica que `ManagedBy` queda reservado por el módulo.

---

## 37. Sesión 5: publicar v1.1.0

La publicación debe incluir código y documentación.

### 37.1. Secuencia

```bash
terraform fmt -recursive module-repository
git -C module-repository diff

git -C module-repository add .
git -C module-repository commit -m "Agregar etiquetas opcionales"
git -C module-repository tag -a v1.1.0 -m "Release v1.1.0"

git -C module-repository show v1.1.0 --stat
```

### 37.2. Changelog

Añade previamente una sección con la nueva entrada y la etiqueta predeterminada.

### 37.3. Regla

No modifiques el tag `v1.0.0` para incorporar esta mejora.

---

## 38. Sesión 6: actualizar solo orders

Un consumidor puede adoptar una publicación sin actualizar al otro.

### 38.1. Preparación

```bash
python3 scripts/select-release.py orders v1.1.0

terraform -chdir=consumers/orders init
terraform -chdir=consumers/orders validate

terraform -chdir=consumers/orders plan \
  -out=../../planes/orders-v1-1.tfplan

terraform -chdir=consumers/orders show \
  ../../planes/orders-v1-1.tfplan
```

### 38.2. Resultado esperado

El plan añade etiquetas sin reemplazar la cola.

### 38.3. Regla

El cambio de fuente requiere inicialización; no edites la copia instalada.

---

## 39. Aplicar y contrastar consumidores

Verifica el efecto operacional de la actualización.

### 39.1. Comandos

```bash
terraform -chdir=consumers/orders apply \
  ../../planes/orders-v1-1.tfplan

aws_local sqs list-queue-tags --queue-url "$ORDERS_URL"
aws_local sqs list-queue-tags --queue-url "$AUDIT_URL"

terraform -chdir=consumers/audit plan
```

### 39.2. Resultado esperado

Orders tiene `ManagedBy`.

Audit continúa en v1.0.0 y su plan no debe proponer esa mejora.

### 39.3. Regla

Publicar un módulo no actualiza automáticamente sus consumidores.

---

## 40. `init` frente a `init -upgrade`

La intención de ambos comandos es diferente.

### 40.1. Inicialización normal

Una fuente modificada necesita inicializarse para instalar el módulo seleccionado.

### 40.2. Actualización

`init -upgrade` puede reconsiderar módulos y proveedores dentro de las restricciones declaradas.

### 40.3. Riesgo

Puede introducir cambios de proveedores además de la actualización que pretendías revisar.

### 40.4. Regla

Separa actualizaciones cuando necesites atribuir claramente el origen de un cambio.

---

## 41. Fijar un commit completo

Una referencia completa permite identificar exactamente una revisión Git.

### 41.1. Comandos

```bash
V1_1_COMMIT="$(git -C module-repository rev-parse 'v1.1.0^{commit}')"

printf '%s\n' "$V1_1_COMMIT" \
  > resultados/v1-1-commit.txt

python3 scripts/select-release.py orders "$V1_1_COMMIT"

terraform -chdir=consumers/orders init
terraform -chdir=consumers/orders plan
```

### 41.2. Resultado esperado

No hay cambios de infraestructura respecto a la misma revisión etiquetada.

### 41.3. Regla

No combines `depth` con un commit arbitrario sin revisar las restricciones de clonación Git.

---

## 42. Tags inmutables y procedencia

La integridad de una publicación depende también del proceso de distribución.

### 42.1. Prácticas recomendadas

Protege tags y ramas de publicación.

Conserva notas de release y resultados de pruebas.

### 42.2. Firmas

Los tags firmados pueden aportar verificación adicional si existe una política de confianza.

### 42.3. Laboratorio

No configuraremos firmas ni una infraestructura de claves.

### 42.4. Regla

Un nombre de tag conocido no demuestra por sí solo quién publicó su contenido.

---

## 43. Preparar v2.0.0

La nueva versión cambiará una entrada pública y una dirección interna.

### 43.1. Cambios

Renombraremos la variable `name` a `queue_name`.

Renombraremos el recurso `this` a `main`.

### 43.2. Consecuencias

El consumidor debe adaptar su llamada.

El estado necesita una migración de dirección.

### 43.3. Outputs

Conservaremos `queue_name`, `queue_url` y `queue_arn`.

### 43.4. Regla

Una versión mayor no exige destruir recursos si existe una migración adecuada.

---

## 44. Variables e implementación v2

Actualiza los archivos del repositorio.

### 44.1. Cambios de identidad

En `variables.tf`, renombra la declaración de `name` y sus referencias a `queue_name`.

### 44.2. Nuevo recurso

```hcl
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = 86400

  tags = merge(var.tags, {
    ManagedBy = "Terraform"
  })
}
```

### 44.3. Outputs

Cambia sus referencias internas de `aws_sqs_queue.this` a `aws_sqs_queue.main`.

---

## 45. Migración incluida en el módulo

Crea `module-repository/modules/queue/moved.tf`.

### 45.1. Bloque

```hcl
moved {
  from = aws_sqs_queue.this
  to   = aws_sqs_queue.main
}
```

### 45.2. Alcance

El bloque se interpreta dentro de la instancia del módulo consumidor.

### 45.3. Resultado esperado

Terraform conserva la relación con la cola existente bajo la dirección nueva.

### 45.4. Regla

El bloque no renombra la cola en SQS ni transforma atributos incompatibles.

---

## 46. Sesión 7: publicar v2.0.0

La documentación debe incluir instrucciones de actualización.

### 46.1. Secuencia

```bash
terraform fmt -recursive module-repository
git -C module-repository diff

git -C module-repository add .
git -C module-repository commit -m "Publicar contrato v2 con migracion"
git -C module-repository tag -a v2.0.0 -m "Release v2.0.0"

git -C module-repository log --oneline --decorate -5
```

### 46.2. Changelog

Explica entrada renombrada, outputs conservados y migración incorporada.

### 46.3. Regla

No elimines migraciones anteriores sin estudiar consumidores que todavía pueden necesitarlas.

---

## 47. Sesión 8: demostrar incompatibilidad

Seleccionar una versión mayor no adapta automáticamente la llamada.

### 47.1. Prueba negativa

```bash
python3 scripts/select-release.py orders v2.0.0
terraform -chdir=consumers/orders init
terraform -chdir=consumers/orders validate
```

### 47.2. Resultado esperado

Terraform informa una entrada no admitida y una entrada obligatoria ausente.

### 47.3. Estado

La validación no debe cambiar la relación con la cola existente.

### 47.4. Regla

No resuelvas el error modificando archivos dentro de `.terraform/modules`.

---

## 48. Sesión 9: adaptar y planificar

Ahora actualiza la llamada conforme al contrato v2.

### 48.1. Secuencia

```bash
umask 077
terraform -chdir=consumers/orders state pull \
  > copias/orders-before-v2.tfstate

python3 scripts/select-release.py orders v2.0.0 --v2
terraform -chdir=consumers/orders init

terraform -chdir=consumers/orders plan \
  -out=../../planes/orders-v2.tfplan
```

### 48.2. Revisión

El plan debe mostrar el movimiento de dirección.

### 48.3. Condición

No continúes si propone destruir y recrear la cola sin una razón prevista.

---

## 49. Sesión 10: aplicar la migración

La aplicación registra la dirección nueva conservando identidad remota.

### 49.1. Comandos

```bash
terraform -chdir=consumers/orders show \
  ../../planes/orders-v2.tfplan

terraform -chdir=consumers/orders apply \
  ../../planes/orders-v2.tfplan

terraform -chdir=consumers/orders state list

terraform -chdir=consumers/orders output -json queue \
  > resultados/orders-v2.json
```

### 49.2. Resultado esperado

Aparece `module.queue.aws_sqs_queue.main`.

### 49.3. Identidad

La URL debe coincidir con `ORDERS_URL`.

---

## 50. Verificación independiente de migración

La migración debe conservar tanto estado como objeto remoto.

### 50.1. Comandos

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$ORDERS_URL" \
  --attribute-names QueueArn VisibilityTimeout

terraform -chdir=consumers/orders plan
terraform -chdir=consumers/audit plan
```

### 50.2. Resultado

Orders permanece estable en v2.

Audit continúa estable con su llamada v1.

### 50.3. Regla

Una migración aplicada en orders no cambia el estado de audit.

---

## 51. Sesión 11: actualización directa de audit

Un consumidor puede saltar una versión si existe una ruta de actualización válida.

### 51.1. Secuencia

```bash
terraform -chdir=consumers/audit state pull \
  > copias/audit-before-v2.tfstate

python3 scripts/select-release.py audit v2.0.0 --v2
terraform -chdir=consumers/audit init

terraform -chdir=consumers/audit plan \
  -out=../../planes/audit-v2.tfplan
```

### 51.2. Expectativa

El plan mueve la dirección y añade las etiquetas introducidas en v1.1.0.

### 51.3. Regla

Saltar versiones requiere revisar cambios acumulados, no solo el último changelog.

---

## 52. Aplicar y verificar audit

Revisa el segundo consumidor con la misma disciplina.

### 52.1. Comandos

```bash
terraform -chdir=consumers/audit show \
  ../../planes/audit-v2.tfplan

terraform -chdir=consumers/audit apply \
  ../../planes/audit-v2.tfplan

terraform -chdir=consumers/audit state list
aws_local sqs list-queue-tags --queue-url "$AUDIT_URL"
```

### 52.2. Resultado esperado

La cola conserva URL y ARN.

### 52.3. Inventario

Ambos consumidores utilizan ahora la dirección interna `main`.

---

## 53. Rollback no es cambiar un tag

Volver a una fuente anterior no garantiza volver a una infraestructura anterior.

### 53.1. Riesgo del ejemplo

v1 espera la dirección `this`.

Después de aplicar v2, el estado registra `main`.

### 53.2. Consecuencia

Volver directamente a v1 puede proponer acciones no deseadas.

### 53.3. Procedimiento

Necesitas una ruta explícita de migración inversa o una corrección hacia delante.

### 53.4. Regla

No apliques un rollback únicamente porque la versión anterior funcionaba antes.

---

## 54. Estado, código y datos

La recuperación requiere separar tres elementos.

### 54.1. Comparación

| **Elemento** | **Referencia recuperable** | **No representa** |
|--------------|---------------------------|-------------------|
| Código | Commit Git | Estado actualizado |
| Estado | Copia protegida | Backup de mensajes |
| Datos | Exportación específica | Configuración Terraform |
| Plan | Decisiones preparadas | Garantía de vigencia |

Cada elemento necesita su propio procedimiento.

### 54.2. Precaución

Restaurar un estado antiguo puede desalinearlo de cambios ya aplicados.

### 54.3. Regla

No uses `state push -force` como sustituto de una investigación.

---

## 55. Pruebas antes de publicar

Una publicación debe incluir evidencias de uso y actualización.

### 55.1. Casos mínimos

Comprueba creación desde cero y actualización desde una versión admitida.

Verifica llamadas antiguas cuando declares compatibilidad.

### 55.2. Migraciones

Prueba conservación de identificadores y ausencia de reemplazos imprevistos.

### 55.3. Proveedores

Registra la combinación validada y sus restricciones.

### 55.4. Regla

Un plan vacío sobre una instalación nueva no demuestra una migración correcta desde una instalación antigua.

---

## 56. Reutilización mediante registros

Un registro añade descubrimiento y selección de versiones.

### 56.1. Diferencia

Las fuentes de registro pueden utilizar restricciones como `~> 1.1`.

### 56.2. Riesgo

Una restricción permite varias publicaciones; no equivale necesariamente a una revisión exacta.

### 56.3. Resolución

La versión seleccionada depende de instalación, restricciones y operaciones de actualización.

### 56.4. Regla

Conserva evidencias de la versión consumida y revisa cambios antes de promoverla.

---

## 57. Caché e instalaciones reproducibles

Los directorios de trabajo pueden conservar instalaciones anteriores.

### 57.1. No hacer

No versionar `.terraform`.

No editar módulos descargados.

No deducir la fuente efectiva únicamente del contenido del repositorio de desarrollo.

### 57.2. Comprobación

Utiliza una instalación limpia controlada para probar reproducibilidad.

### 57.3. Precaución

Eliminar metadatos locales exige reinicializar, pero no debe eliminar el estado administrado.

### 57.4. Regla

Separa caché, configuración y estado antes de limpiar archivos.

---

## 58. Seguridad de la cadena de suministro

Consumir módulos implica confiar en código que Terraform evaluará.

### 58.1. Revisión

Inspecciona recursos, proveedores, data sources y posibles provisioners.

### 58.2. Procedencia

Fija referencias, protege publicaciones y aplica revisión de cambios.

### 58.3. Acceso

No incluyas tokens Git ni claves privadas en `source`.

### 58.4. Regla

Una dependencia fijada puede ser reproducible y aun así contener un diseño inseguro.

---

## 59. Diagnóstico de errores frecuentes

Investiga configuración, instalación y estado antes de aplicar correcciones.

### 59.1. Lista de revisión

Comprueba referencia inexistente, ruta absoluta incorrecta y subdirectorio del módulo.

Revisa inicialización pendiente y contrato de la versión seleccionada.

### 59.2. Migración

Comprueba origen y destino del bloque `moved`.

### 59.3. Recursos

Distingue una dirección nueva de un nombre remoto cambiado.

### 59.4. Regla

No desvincules una cola del estado para corregir una variable renombrada.

---

## 60. Limpieza de los consumidores

Cada proyecto debe destruir los recursos que administra.

### 60.1. Orders

```bash
terraform -chdir=consumers/orders plan -destroy \
  -out=../../planes/orders-destroy.tfplan

terraform -chdir=consumers/orders show \
  ../../planes/orders-destroy.tfplan

terraform -chdir=consumers/orders apply \
  ../../planes/orders-destroy.tfplan
```

### 60.2. Audit

Repite la secuencia con su directorio y un plan `audit-destroy.tfplan`.

### 60.3. Datos

Destruir las colas elimina sus mensajes pendientes.

---

## 61. Verificación y cierre

Mantén LocalStack disponible hasta completar ambas destrucciones.

### 61.1. Comandos

```bash
terraform -chdir=consumers/orders state list
terraform -chdir=consumers/audit state list
aws_local sqs list-queues
docker compose down
```

### 61.2. Resultado esperado

Desaparecen las dos colas del laboratorio.

### 61.3. Repositorio

Puedes conservar publicaciones y documentación como evidencia educativa.

### 61.4. Regla

Borrar el repositorio del módulo no destruye automáticamente la infraestructura consumidora.

---

## 62. Diferencias respecto a AWS real

La emulación permite practicar actualización y conservación de identidad.

### 62.1. Aspectos adicionales

En AWS real revisa permisos, auditoría, costes, propagación y protección de datos.

### 62.2. Distribución

Un Git remoto añade autenticación, disponibilidad y políticas de acceso.

### 62.3. Persistencia

Eliminar LocalStack puede hacer desaparecer las colas mientras Terraform conserva sus relaciones.

### 62.4. Regla

Las garantías de versionado Git y las garantías del servicio AWS son responsabilidades diferentes.

---

## 63. Ejercicios y evaluación

La evaluación debe demostrar publicaciones reproducibles y actualizaciones controladas.

### 63.1. Ejercicios

1. Identifica commits asociados a los tres tags.
2. Fija un consumidor a un commit completo.
3. Actualiza únicamente un consumidor.
4. Explica el cambio compatible de v1.1.0.
5. Demuestra el rechazo de la llamada antigua en v2.
6. Conserva la URL durante la migración.
7. Diseña un rollback sin aplicarlo improvisadamente.
8. Destruye y verifica ambos consumidores.

### 63.2. Entrega

Incluye repositorio, changelog, fuentes, planes y evidencias de identidad.

---

## 64. Resumen de la lección

El versionado permite reutilizar módulos sin confundir publicación y actualización.

### 64.1. Ideas esenciales

- Git identifica revisiones; Terraform consume fuentes.
- Los tags publicados deben tratarse como inmutables.
- El archivo de bloqueo fija proveedores, no todos los módulos.
- Cada consumidor decide cuándo actualizar.
- Compatibilidad incluye interfaz, comportamiento y estado.
- Los bloques `moved` conservan relaciones cuando son aplicables.
- Un rollback necesita un procedimiento explícito.
- Las verificaciones independientes complementan el plan.

### 64.2. Procedimiento recomendado

Publica una revisión comprobada, fija su referencia, revisa la actualización y verifica identidad después de aplicar.

### 64.3. Idea final

**Un módulo reutilizable fiable no solo tiene versiones: ofrece publicaciones identificables, contratos documentados y rutas de actualización que protegen la infraestructura y los datos de sus consumidores.**